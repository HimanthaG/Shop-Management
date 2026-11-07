
import * as SQLite from 'expo-sqlite';

import {
  getActiveUserId,
} from './accountSession';

let databasePromise = null;

// ========================================
// DATABASE CONNECTION
// ========================================

export const getDatabase = () => {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(
      'shopmanagement.db'
    ).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
};

export const closeDatabase = async () => {
  if (!databasePromise) return;

  const db = await databasePromise;
  await db.closeAsync();

  databasePromise = null;
};

// ========================================
// DATABASE INITIALIZATION
// ========================================

export const initializeDatabase = async () => {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0
        CHECK (quantity >= 0),
      cost_price REAL NOT NULL DEFAULT 0
        CHECK (cost_price >= 0),
      selling_price REAL NOT NULL DEFAULT 0
        CHECK (selling_price >= 0),
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_cost REAL NOT NULL CHECK (unit_cost >= 0),
      total_cost REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_amount REAL NOT NULL,
      total_cost REAL NOT NULL,
      profit REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      selling_price REAL NOT NULL,
      cost_price REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount >= 0),
      category TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      full_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shop_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      shop_name TEXT NOT NULL DEFAULT '',
      owner_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      registration_number TEXT NOT NULL DEFAULT '',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const columns = await db.getAllAsync(
    'PRAGMA table_info(products)'
  );

  const hasDeletedColumn = columns.some(
    (column) => column.name === 'is_deleted'
  );

  if (!hasDeletedColumn) {
    await db.execAsync(`
      ALTER TABLE products
      ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0
    `);
  }

  console.log('Shop database initialized successfully');

  return db;
};

// ========================================
// ACCOUNT OWNERSHIP CHECKS
// ========================================

// The existing accountMigration.js is responsible
// for adding owner_user_id and assigning legacy data.
//
// We do not create or reassign ownership here.
// Missing ownership columns cause an error instead
// of allowing access to shared records.

const OWNED_TABLES = [
  'products',
  'purchases',
  'sales',
  'sale_items',
  'expenses',
];

const verifyOwnershipSchema = async (db) => {
  for (const table of OWNED_TABLES) {
    const columns = await db.getAllAsync(
      `PRAGMA table_info(${table})`
    );

    const hasOwnerColumn = columns.some(
      (column) => column.name === 'owner_user_id'
    );

    if (!hasOwnerColumn) {
      throw new Error(
        `Account migration is incomplete for ${table}. ` +
        'Please complete the database migration before using entries.'
      );
    }
  }
};

const getAccountDatabase = async () => {
  const userId = getActiveUserId();
  const db = await getDatabase();

  const account = await db.getFirstAsync(
    'SELECT id FROM auth_users WHERE id = ?',
    [userId]
  );

  if (!account) {
    throw new Error(
      'Active account was not found. Please log in again.'
    );
  }

  await verifyOwnershipSchema(db);

  return { db, userId };
};

const verifyTransactionAccount = async (
  transaction,
  userId
) => {
  if (getActiveUserId() !== userId) {
    throw new Error(
      'The active account changed. Please try again.'
    );
  }

  const account = await transaction.getFirstAsync(
    'SELECT id FROM auth_users WHERE id = ?',
    [userId]
  );

  if (!account) {
    throw new Error('Account not found.');
  }
};

const validateRecordId = (id, label = 'Record') => {
  const value = Number(id);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Invalid ${label.toLowerCase()} ID.`);
  }

  return value;
};

// ========================================
// PRODUCT FUNCTIONS
// ========================================

export const getProducts = async () => {
  const { db, userId } = await getAccountDatabase();

  return db.getAllAsync(
    `SELECT *
     FROM products
     WHERE owner_user_id = ?
       AND is_deleted = 0
     ORDER BY id DESC`,
    [userId]
  );
};

export const addProduct = async (
  name,
  quantity,
  costPrice,
  sellingPrice
) => {
  const { db, userId } = await getAccountDatabase();

  const cleanName = String(name || '').trim();

  if (!cleanName) {
    throw new Error('Product name is required.');
  }

  const cleanQuantity = Number(quantity);
  const cleanCost = Number(costPrice);
  const cleanSellingPrice = Number(sellingPrice);

  if (
    !Number.isSafeInteger(cleanQuantity) ||
    cleanQuantity < 0
  ) {
    throw new Error('Enter a valid product quantity.');
  }

  if (
    !Number.isFinite(cleanCost) ||
    cleanCost < 0 ||
    !Number.isFinite(cleanSellingPrice) ||
    cleanSellingPrice < 0
  ) {
    throw new Error('Enter valid product prices.');
  }

  return db.runAsync(
    `INSERT INTO products
     (
       name,
       quantity,
       cost_price,
       selling_price,
       owner_user_id
     )
     SELECT ?, ?, ?, ?, id
     FROM auth_users
     WHERE id = ?`,
    [
      cleanName,
      cleanQuantity,
      cleanCost,
      cleanSellingPrice,
      userId,
    ]
  );
};

export const updateProduct = async (
  id,
  name,
  quantity,
  costPrice,
  sellingPrice
) => {
  const { db, userId } = await getAccountDatabase();

  const productId = validateRecordId(id, 'Product');
  const cleanName = String(name || '').trim();

  const cleanQuantity = Number(quantity);
  const cleanCost = Number(costPrice);
  const cleanSellingPrice = Number(sellingPrice);

  if (!cleanName) {
    throw new Error('Product name is required.');
  }

  if (
    !Number.isSafeInteger(cleanQuantity) ||
    cleanQuantity < 0
  ) {
    throw new Error('Enter a valid quantity.');
  }

  if (
    !Number.isFinite(cleanCost) ||
    cleanCost < 0 ||
    !Number.isFinite(cleanSellingPrice) ||
    cleanSellingPrice < 0
  ) {
    throw new Error('Enter valid prices.');
  }

  const result = await db.runAsync(
    `UPDATE products
     SET name = ?,
         quantity = ?,
         cost_price = ?,
         selling_price = ?
     WHERE id = ?
       AND owner_user_id = ?
       AND is_deleted = 0`,
    [
      cleanName,
      cleanQuantity,
      cleanCost,
      cleanSellingPrice,
      productId,
      userId,
    ]
  );

  if (result.changes !== 1) {
    throw new Error(
      'Product not found in the current account.'
    );
  }

  return result;
};

export const deleteProduct = async (id) => {
  const { db, userId } = await getAccountDatabase();

  const productId = validateRecordId(id, 'Product');

  const result = await db.runAsync(
    `UPDATE products
     SET is_deleted = 1
     WHERE id = ?
       AND owner_user_id = ?
       AND is_deleted = 0`,
    [productId, userId]
  );

  if (result.changes !== 1) {
    throw new Error(
      'Product not found or already deleted.'
    );
  }

  return result;
};

// ========================================
// SALES FUNCTIONS
// ========================================

export const createSale = async (
  productId,
  quantity
) => {
  const { db, userId } = await getAccountDatabase();

  const validProductId = validateRecordId(
    productId,
    'Product'
  );

  const validQuantity = Number(quantity);

  if (
    !Number.isSafeInteger(validQuantity) ||
    validQuantity <= 0
  ) {
    throw new Error('Enter a valid sale quantity.');
  }

  let saleResult = null;

  await db.withExclusiveTransactionAsync(
    async (txn) => {
      await verifyTransactionAccount(txn, userId);

      const product = await txn.getFirstAsync(
        `SELECT *
         FROM products
         WHERE id = ?
           AND owner_user_id = ?
           AND is_deleted = 0`,
        [validProductId, userId]
      );

      if (!product) {
        throw new Error(
          'Product not found in the current account.'
        );
      }

      if (product.quantity < validQuantity) {
        throw new Error(
          `Insufficient stock. Available: ${product.quantity}`
        );
      }

      const totalAmount =
        Math.round(
          product.selling_price * validQuantity * 100
        ) / 100;

      const totalCost =
        Math.round(
          product.cost_price * validQuantity * 100
        ) / 100;

      const profit =
        Math.round(
          (totalAmount - totalCost) * 100
        ) / 100;

      const sale = await txn.runAsync(
        `INSERT INTO sales
         (
           total_amount,
           total_cost,
           profit,
           owner_user_id
         )
         VALUES (?, ?, ?, ?)`,
        [
          totalAmount,
          totalCost,
          profit,
          userId,
        ]
      );

      await txn.runAsync(
        `INSERT INTO sale_items
         (
           sale_id,
           product_id,
           quantity,
           selling_price,
           cost_price,
           owner_user_id
         )
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          sale.lastInsertRowId,
          validProductId,
          validQuantity,
          product.selling_price,
          product.cost_price,
          userId,
        ]
      );

      const stockUpdate = await txn.runAsync(
        `UPDATE products
         SET quantity = quantity - ?
         WHERE id = ?
           AND owner_user_id = ?
           AND quantity >= ?
           AND is_deleted = 0`,
        [
          validQuantity,
          validProductId,
          userId,
          validQuantity,
        ]
      );

      if (stockUpdate.changes !== 1) {
        throw new Error('Unable to update stock.');
      }

      saleResult = {
        saleId: sale.lastInsertRowId,
        productName: product.name,
        quantity: validQuantity,
        totalAmount,
        totalCost,
        profit,
      };
    }
  );

  return saleResult;
};

export const getSales = async () => {
  const { db, userId } = await getAccountDatabase();

  return db.getAllAsync(
    `SELECT
       s.id,
       s.total_amount,
       s.total_cost,
       s.profit,
       s.created_at,
       si.product_id,
       si.quantity,
       si.selling_price,
       p.name AS product_name
     FROM sales s
     JOIN sale_items si
       ON si.sale_id = s.id
       AND si.owner_user_id = s.owner_user_id
     LEFT JOIN products p
       ON p.id = si.product_id
       AND p.owner_user_id = s.owner_user_id
     WHERE s.owner_user_id = ?
     ORDER BY s.id DESC`,
    [userId]
  );
};

export const getSalesSummary = async () => {
  const { db, userId } = await getAccountDatabase();

  return db.getFirstAsync(
    `SELECT
       COUNT(*) AS total_sales,
       COALESCE(SUM(total_amount), 0) AS revenue,
       COALESCE(SUM(total_cost), 0) AS cost,
       COALESCE(SUM(profit), 0) AS gross_profit
     FROM sales
     WHERE owner_user_id = ?`,
    [userId]
  );
};

// ========================================
// EXPENSE FUNCTIONS
// ========================================

export const addExpense = async (
  title,
  amount,
  category
) => {
  const { db, userId } = await getAccountDatabase();

  const cleanTitle = String(title || '').trim();

  const cleanCategory = String(
    category || 'Other'
  ).trim();

  const cleanAmount = Number(amount);

  if (!cleanTitle) {
    throw new Error('Expense title is required.');
  }

  if (
    !Number.isFinite(cleanAmount) ||
    cleanAmount <= 0
  ) {
    throw new Error('Enter a valid expense amount.');
  }

  return db.runAsync(
    `INSERT INTO expenses
     (
       title,
       amount,
       category,
       owner_user_id
     )
     SELECT ?, ?, ?, id
     FROM auth_users
     WHERE id = ?`,
    [
      cleanTitle,
      cleanAmount,
      cleanCategory || 'Other',
      userId,
    ]
  );
};

export const getExpenses = async () => {
  const { db, userId } = await getAccountDatabase();

  return db.getAllAsync(
    `SELECT *
     FROM expenses
     WHERE owner_user_id = ?
     ORDER BY id DESC`,
    [userId]
  );
};

export const deleteExpense = async (id) => {
  const { db, userId } = await getAccountDatabase();

  const expenseId = validateRecordId(id, 'Expense');

  const result = await db.runAsync(
    `DELETE FROM expenses
     WHERE id = ?
       AND owner_user_id = ?`,
    [expenseId, userId]
  );

  if (result.changes !== 1) {
    throw new Error(
      'Expense not found in the current account.'
    );
  }

  return result;
};

export const getExpenseSummary = async () => {
  const { db, userId } = await getAccountDatabase();

  return db.getFirstAsync(
    `SELECT
       COUNT(*) AS total_expenses,
       COALESCE(SUM(amount), 0) AS total_amount
     FROM expenses
     WHERE owner_user_id = ?`,
    [userId]
  );
};

// ========================================
// LEGACY USER PROFILE FUNCTIONS
// ========================================

// Retained for compatibility with existing
// migration code.
//
// Active account screens should use
// accountProfileService.js instead.

export const getUserProfile = async () => {
  const db = await getDatabase();

  return db.getFirstAsync(
    `SELECT *
     FROM user_profile
     WHERE id = 1`
  );
};

export const saveUserProfile = async (
  fullName,
  phone,
  email,
  address
) => {
  const cleanName = String(fullName || '').trim();
  const cleanPhone = String(phone || '').trim();
  const cleanEmail = String(email || '').trim();
  const cleanAddress = String(address || '').trim();

  if (!cleanName) {
    throw new Error('Full name is required.');
  }

  const db = await getDatabase();

  return db.runAsync(
    `INSERT INTO user_profile
     (
       id,
       full_name,
       phone,
       email,
       address,
       updated_at
     )
     VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       full_name = excluded.full_name,
       phone = excluded.phone,
       email = excluded.email,
       address = excluded.address,
       updated_at = CURRENT_TIMESTAMP`,
    [
      cleanName,
      cleanPhone,
      cleanEmail,
      cleanAddress,
    ]
  );
};

// ========================================
// LEGACY SHOP PROFILE FUNCTIONS
// ========================================

// Retained for compatibility with existing
// migration code.
//
// Active account screens should use
// accountShopService.js instead.

export const getShopProfile = async () => {
  const db = await getDatabase();

  return db.getFirstAsync(
    `SELECT *
     FROM shop_profile
     WHERE id = 1`
  );
};

export const saveShopProfile = async (
  shopName,
  ownerName,
  phone,
  email,
  address,
  registrationNumber
) => {
  const cleanShopName = String(
    shopName || ''
  ).trim();

  const cleanOwnerName = String(
    ownerName || ''
  ).trim();

  const cleanPhone = String(phone || '').trim();
  const cleanEmail = String(email || '').trim();
  const cleanAddress = String(address || '').trim();

  const cleanRegistrationNumber = String(
    registrationNumber || ''
  ).trim();

  if (!cleanShopName) {
    throw new Error('Shop name is required.');
  }

  if (!cleanOwnerName) {
    throw new Error('Owner name is required.');
  }

  if (
    cleanEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    throw new Error('Enter a valid email address.');
  }

  const db = await getDatabase();

  return db.runAsync(
    `INSERT INTO shop_profile
     (
       id,
       shop_name,
       owner_name,
       phone,
       email,
       address,
       registration_number,
       updated_at
     )
     VALUES (1, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       shop_name = excluded.shop_name,
       owner_name = excluded.owner_name,
       phone = excluded.phone,
       email = excluded.email,
       address = excluded.address,
       registration_number = excluded.registration_number,
       updated_at = CURRENT_TIMESTAMP`,
    [
      cleanShopName,
      cleanOwnerName,
      cleanPhone,
      cleanEmail,
      cleanAddress,
      cleanRegistrationNumber,
    ]
  );
};
