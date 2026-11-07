
import * as SQLite from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { getDatabase } from './database';
import { getActiveUserId } from './accountSession';
import { createSafetyBackup } from './backupService';

const BACKUP_VERSION = 1;

const TABLES = [
  'products',
  'purchases',
  'sales',
  'sale_items',
  'expenses',
];

const COLUMNS = {
  products: [
    'id', 'name', 'quantity', 'cost_price',
    'selling_price', 'is_deleted', 'created_at',
  ],
  purchases: [
    'id', 'product_id', 'quantity',
    'unit_cost', 'total_cost', 'created_at',
  ],
  sales: [
    'id', 'total_amount', 'total_cost',
    'profit', 'created_at',
  ],
  sale_items: [
    'id', 'sale_id', 'product_id',
    'quantity', 'selling_price', 'cost_price',
  ],
  expenses: [
    'id', 'title', 'amount',
    'category', 'created_at',
  ],
};

let pendingBackup = null;
let validationInProgress = false;
let restoreInProgress = false;

const getDatabaseDirectory = () => {
  return FileSystem.documentDirectory + 'SQLite/';
};

const deleteTemporaryFile = async (uri) => {
  if (!uri) return;

  try {
    await FileSystem.deleteAsync(uri, {
      idempotent: true,
    });
  } catch (error) {
    console.warn('Temporary cleanup:', error.message);
  }
};

export const clearPendingRestore = () => {
  if (restoreInProgress) return;

  const previous = pendingBackup;
  pendingBackup = null;

  if (previous?.uri) {
    void deleteTemporaryFile(previous.uri);
  }
};

const validateBackup = async (db) => {
  const integrity = await db.getFirstAsync(
    'PRAGMA integrity_check'
  );

  if (integrity?.integrity_check !== 'ok') {
    throw new Error('Backup integrity check failed.');
  }

  const tables = await db.getAllAsync(
    `SELECT name FROM sqlite_master WHERE type = 'table'`
  );

  const names = new Set(tables.map((row) => row.name));

  for (const table of [...TABLES, 'backup_metadata']) {
    if (!names.has(table)) {
      throw new Error('Missing backup table: ' + table);
    }
  }

  const metadata = await db.getFirstAsync(
    'SELECT * FROM backup_metadata WHERE id = 1'
  );

  if (
    typeof metadata?.backup_id !== 'string' ||
    !metadata.backup_id.trim() ||
    metadata.format_version !== BACKUP_VERSION
  ) {
    throw new Error('Unsupported business backup version.');
  }

  for (const table of TABLES) {
    const columns = await db.getAllAsync(
      `PRAGMA table_info(${table})`
    );

    const available = new Set(
      columns.map((column) => column.name)
    );

    for (const column of COLUMNS[table]) {
      if (!available.has(column)) {
        throw new Error(
          `Invalid ${table} structure: ${column}`
        );
      }
    }
  }

  const records = {};

  for (const table of TABLES) {
    records[table] = await db.getAllAsync(
      `SELECT * FROM ${table}`
    );
  }

  const validateIds = (rows, table) => {
    const ids = new Set();

    for (const row of rows) {
      if (
        !Number.isSafeInteger(row.id) ||
        row.id <= 0 ||
        ids.has(row.id)
      ) {
        throw new Error('Invalid IDs in ' + table);
      }

      ids.add(row.id);
    }
  };

  for (const table of TABLES) {
    validateIds(records[table], table);
  }

  const productIds = new Set(
    records.products.map((p) => p.id)
  );

  const saleIds = new Set(
    records.sales.map((s) => s.id)
  );

  const salesWithItems = new Set(
    records.sale_items.map((item) => item.sale_id)
  );

  for (const p of records.purchases) {
    if (!productIds.has(p.product_id)) {
      throw new Error('Purchase references missing product.');
    }
  }

  for (const item of records.sale_items) {
    if (
      !productIds.has(item.product_id) ||
      !saleIds.has(item.sale_id)
    ) {
      throw new Error('Invalid sale item relationship.');
    }
  }

  for (const sale of records.sales) {
    if (!salesWithItems.has(sale.id)) {
      throw new Error('Sale has no items.');
    }
  }

  const validNumber = (n, min = 0) =>
    typeof n === 'number' &&
    Number.isFinite(n) &&
    n >= min;

  for (const p of records.products) {
    if (
      typeof p.name !== 'string' ||
      !p.name.trim() ||
      !Number.isSafeInteger(p.quantity) ||
      p.quantity < 0 ||
      !validNumber(p.cost_price) ||
      !validNumber(p.selling_price) ||
      ![0, 1].includes(p.is_deleted)
    ) {
      throw new Error('Invalid product data.');
    }
  }

  for (const p of records.purchases) {
    if (
      !Number.isSafeInteger(p.quantity) ||
      p.quantity <= 0 ||
      !validNumber(p.unit_cost) ||
      !validNumber(p.total_cost)
    ) {
      throw new Error('Invalid purchase data.');
    }
  }

  for (const s of records.sales) {
    if (
      !validNumber(s.total_amount) ||
      !validNumber(s.total_cost) ||
      !Number.isFinite(s.profit)
    ) {
      throw new Error('Invalid sale data.');
    }
  }

  for (const item of records.sale_items) {
    if (
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0 ||
      !validNumber(item.selling_price) ||
      !validNumber(item.cost_price)
    ) {
      throw new Error('Invalid sale item data.');
    }
  }

  for (const e of records.expenses) {
    if (
      typeof e.title !== 'string' ||
      !e.title.trim() ||
      !validNumber(e.amount)
    ) {
      throw new Error('Invalid expense data.');
    }
  }

  return {
    backupId: metadata.backup_id,
    records,
    counts: {
      products: records.products.length,
      purchases: records.purchases.length,
      sales: records.sales.length,
      expenses: records.expenses.length,
    },
  };
};

export const selectAndValidateBackup = async () => {
  if (validationInProgress || restoreInProgress) {
    throw new Error('Backup operation already in progress.');
  }

  validationInProgress = true;
  clearPendingRestore();

  let sourceDb = null;
  let temporaryUri = null;

  try {
    const picker = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (picker.canceled) {
      return { canceled: true };
    }

    const selected = picker.assets?.[0];

    if (!selected?.name?.toLowerCase().endsWith('.db')) {
      throw new Error('Please select a .db backup file.');
    }

    const sourceInfo = await FileSystem.getInfoAsync(
      selected.uri
    );

    if (!sourceInfo.exists || sourceInfo.size <= 0) {
      throw new Error('Selected backup is empty or missing.');
    }

    const directory = getDatabaseDirectory();

    await FileSystem.makeDirectoryAsync(directory, {
      intermediates: true,
    });

    const name =
      'business_validation_' +
      Date.now() +
      '_' +
      Math.random().toString(36).slice(2, 12) +
      '.db';

    temporaryUri = directory + name;

    await FileSystem.deleteAsync(temporaryUri, {
      idempotent: true,
    });

    console.log('SOURCE SIZE:', sourceInfo.size);
    console.log('COPY DESTINATION:', temporaryUri);

    await FileSystem.copyAsync({
      from: selected.uri,
      to: temporaryUri,
    });

    const copiedInfo = await FileSystem.getInfoAsync(
      temporaryUri
    );

    console.log('COPY EXISTS:', copiedInfo.exists);
    console.log('COPY SIZE:', copiedInfo.size);

    if (!copiedInfo.exists || copiedInfo.size <= 0) {
      throw new Error('Temporary backup copy failed.');
    }

    sourceDb = await SQLite.openDatabaseAsync(
      name,
      { createIfMissing: false },
      directory
    );

    const validated = await validateBackup(sourceDb);

    await sourceDb.closeAsync();
    sourceDb = null;

    const userId = getActiveUserId();
    const targetDb = await getDatabase();

    const account = await targetDb.getFirstAsync(
      'SELECT id FROM auth_users WHERE id = ?',
      [userId]
    );

    if (!account) {
      throw new Error('Current account not found.');
    }

    const importTable = await targetDb.getFirstAsync(
      `SELECT name FROM sqlite_master
       WHERE type = 'table'
       AND name = 'business_backup_imports'`
    );

    if (importTable) {
      const previous = await targetDb.getFirstAsync(
        `SELECT backup_id FROM business_backup_imports
         WHERE owner_user_id = ? AND backup_id = ?`,
        [userId, validated.backupId]
      );

      if (previous) {
        throw new Error(
          'This backup has already been imported into this account.'
        );
      }
    }

    pendingBackup = {
      uri: temporaryUri,
      name,
      directory,
      originalName: selected.name,
      backupId: validated.backupId,
      userId,
      counts: validated.counts,
    };

    temporaryUri = null;

    return {
      canceled: false,
      valid: true,
      fileName: selected.name,
      ...validated.counts,
    };
  } catch (error) {
    console.error('BACKUP VALIDATION ERROR:', error.message);

    throw new Error(
      'Backup validation failed: ' + error.message
    );
  } finally {
    if (sourceDb) {
      await sourceDb.closeAsync().catch(() => {});
    }

    await deleteTemporaryFile(temporaryUri);

    validationInProgress = false;
  }
};

export const restoreValidatedBackup = async () => {
  if (restoreInProgress || validationInProgress) {
    throw new Error('Backup operation already in progress.');
  }

  if (!pendingBackup) {
    throw new Error('Select a backup first.');
  }

  restoreInProgress = true;

  let sourceDb = null;

  try {
    const selected = pendingBackup;
    const userId = getActiveUserId();

    if (userId !== selected.userId) {
      throw new Error('Active account changed.');
    }

    sourceDb = await SQLite.openDatabaseAsync(
      selected.name,
      { createIfMissing: false },
      selected.directory
    );

    const validated = await validateBackup(sourceDb);

    if (validated.backupId !== selected.backupId) {
      throw new Error('Backup has changed.');
    }

    const safetyBackup = await createSafetyBackup();

    if (!safetyBackup.success) {
      throw new Error('Safety backup failed.');
    }

    const db = await getDatabase();
    const data = validated.records;

    await db.withExclusiveTransactionAsync(async (txn) => {
      if (getActiveUserId() !== userId) {
        throw new Error('Active account changed.');
      }

      const account = await txn.getFirstAsync(
        'SELECT id FROM auth_users WHERE id = ?',
        [userId]
      );

      if (!account) {
        throw new Error('Current account not found.');
      }

      await txn.execAsync(`
        CREATE TABLE IF NOT EXISTS business_backup_imports (
          owner_user_id INTEGER NOT NULL,
          backup_id TEXT NOT NULL,
          imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (owner_user_id, backup_id)
        );
      `);

      const existing = await txn.getFirstAsync(
        `SELECT backup_id FROM business_backup_imports
         WHERE owner_user_id = ? AND backup_id = ?`,
        [userId, validated.backupId]
      );

      if (existing) {
        throw new Error('Backup already imported.');
      }

      const productMap = new Map();
      const saleMap = new Map();

      for (const p of data.products) {
        const result = await txn.runAsync(
          `INSERT INTO products
           (name, quantity, cost_price, selling_price,
            is_deleted, created_at, owner_user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            p.name,
            p.quantity,
            p.cost_price,
            p.selling_price,
            p.is_deleted,
            p.created_at,
            userId,
          ]
        );

        productMap.set(p.id, result.lastInsertRowId);
      }

      for (const p of data.purchases) {
        await txn.runAsync(
          `INSERT INTO purchases
           (product_id, quantity, unit_cost, total_cost,
            created_at, owner_user_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            productMap.get(p.product_id),
            p.quantity,
            p.unit_cost,
            p.total_cost,
            p.created_at,
            userId,
          ]
        );
      }

      for (const s of data.sales) {
        const result = await txn.runAsync(
          `INSERT INTO sales
           (total_amount, total_cost, profit,
            created_at, owner_user_id)
           VALUES (?, ?, ?, ?, ?)`,
          [
            s.total_amount,
            s.total_cost,
            s.profit,
            s.created_at,
            userId,
          ]
        );

        saleMap.set(s.id, result.lastInsertRowId);
      }

      for (const item of data.sale_items) {
        await txn.runAsync(
          `INSERT INTO sale_items
           (sale_id, product_id, quantity,
            selling_price, cost_price, owner_user_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            saleMap.get(item.sale_id),
            productMap.get(item.product_id),
            item.quantity,
            item.selling_price,
            item.cost_price,
            userId,
          ]
        );
      }

      for (const e of data.expenses) {
        await txn.runAsync(
          `INSERT INTO expenses
           (title, amount, category,
            created_at, owner_user_id)
           VALUES (?, ?, ?, ?, ?)`,
          [
            e.title,
            e.amount,
            e.category,
            e.created_at,
            userId,
          ]
        );
      }

      await txn.runAsync(
        `INSERT INTO business_backup_imports
         (owner_user_id, backup_id)
         VALUES (?, ?)`,
        [userId, validated.backupId]
      );
    });

    console.log('BUSINESS DATA MERGED SUCCESSFULLY');

    return {
      success: true,
      fileName: selected.originalName,
      safetyBackupName: safetyBackup.fileName,
      ...validated.counts,
    };
  } catch (error) {
    throw new Error(
      'Business restore failed: ' + error.message
    );
  } finally {
    if (sourceDb) {
      await sourceDb.closeAsync().catch(() => {});
    }

    restoreInProgress = false;
    clearPendingRestore();
  }
};
