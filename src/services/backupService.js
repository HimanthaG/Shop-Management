
import * as SQLite from 'expo-sqlite';
import * as Sharing from 'expo-sharing';
import { File, Directory, Paths } from 'expo-file-system';

import { getDatabase } from './database';
import { getActiveUserId } from './accountSession';

// ========================================
// BACKUP LOCATIONS
// ========================================

const SAFETY_DIRECTORY = new Directory(
  Paths.document,
  'ShopManagementSafetyBackups'
);

const BUSINESS_TABLES = [
  'products',
  'purchases',
  'sales',
  'sale_items',
  'expenses',
];

const BACKUP_VERSION = 1;

// ========================================
// HELPERS
// ========================================

const uniqueName = (prefix) => {
  return (
    prefix +
    new Date().toISOString().replace(/[:.]/g, '-') +
    '_' +
    Math.random().toString(36).slice(2, 10) +
    '.db'
  );
};

const ensureSafetyDirectory = () => {
  if (!SAFETY_DIRECTORY.exists) {
    SAFETY_DIRECTORY.create({
      intermediates: true,
      idempotent: true,
    });
  }
};

const verifyIntegrity = async (db) => {
  const result = await db.getFirstAsync(
    'PRAGMA integrity_check'
  );

  if (result?.integrity_check !== 'ok') {
    throw new Error('Database integrity check failed.');
  }
};

const getTableColumns = async (db, tableName) => {
  return db.getAllAsync(
    `PRAGMA table_info(${tableName})`
  );
};

// ========================================
// SAFETY BACKUP
// ========================================

export const createSafetyBackup = async () => {
  let backupDb = null;

  try {
    ensureSafetyDirectory();

    const backupName = uniqueName(
      'ShopManagement_Safety_'
    );

    const sourceDb = await getDatabase();

    backupDb = await SQLite.openDatabaseAsync(
      backupName,
      { createIfMissing: true },
      SAFETY_DIRECTORY.uri
    );

    await SQLite.backupDatabaseAsync({
      sourceDatabase: sourceDb,
      destDatabase: backupDb,
      sourceDatabaseName: 'main',
      destDatabaseName: 'main',
    });

    await verifyIntegrity(backupDb);

    await backupDb.closeAsync();
    backupDb = null;

    const backupFile = new File(
      SAFETY_DIRECTORY,
      backupName
    );

    if (!backupFile.exists || backupFile.size <= 0) {
      throw new Error('Safety backup file is empty.');
    }

    console.log('Safety backup created:', backupName);

    return {
      success: true,
      fileName: backupName,
      fileUri: backupFile.uri,
      backupType: 'safety',
      size: backupFile.size,
    };
  } catch (error) {
    throw new Error(
      'Safety backup failed: ' + error.message
    );
  } finally {
    if (backupDb) {
      await backupDb.closeAsync().catch(() => {});
    }
  }
};

// ========================================
// BUSINESS BACKUP SCHEMA
// ========================================

const createBusinessBackupSchema = async (db) => {
  await db.execAsync(`
    CREATE TABLE backup_metadata (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      backup_id TEXT NOT NULL UNIQUE,
      format_version INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      cost_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE purchases (
      id INTEGER PRIMARY KEY,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL,
      created_at TEXT
    );

    CREATE TABLE sales (
      id INTEGER PRIMARY KEY,
      total_amount REAL NOT NULL,
      total_cost REAL NOT NULL,
      profit REAL NOT NULL,
      created_at TEXT
    );

    CREATE TABLE sale_items (
      id INTEGER PRIMARY KEY,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      selling_price REAL NOT NULL,
      cost_price REAL NOT NULL
    );

    CREATE TABLE expenses (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      created_at TEXT
    );
  `);
};

// ========================================
// COPY ACCOUNT RECORDS
// ========================================

const copyAccountRecords = async (
  sourceDb,
  backupDb,
  userId
) => {
  for (const tableName of BUSINESS_TABLES) {
    const columns = await getTableColumns(
      backupDb,
      tableName
    );

    const columnNames = columns.map(
      (column) => column.name
    );

    const columnList = columnNames.join(', ');

    const placeholders = columnNames
      .map(() => '?')
      .join(', ');

    const rows = await sourceDb.getAllAsync(
      `SELECT ${columnList}
       FROM ${tableName}
       WHERE owner_user_id = ?`,
      [userId]
    );

    const insertSql =
      `INSERT INTO ${tableName} (${columnList}) ` +
      `VALUES (${placeholders})`;

    for (const row of rows) {
      const values = columnNames.map(
        (column) => row[column] ?? null
      );

      await backupDb.runAsync(
        insertSql,
        values
      );
    }
  }
};

// ========================================
// CREATE ACCOUNT BUSINESS BACKUP
// ========================================

export const createDatabaseBackup = async () => {
  let backupDb = null;
  let backupFile = null;

  try {
    const userId = getActiveUserId();
    const sourceDb = await getDatabase();

    const account = await sourceDb.getFirstAsync(
      'SELECT id FROM auth_users WHERE id = ?',
      [userId]
    );

    if (!account) {
      throw new Error(
        'Active account not found. Please log in again.'
      );
    }

    const backupName = uniqueName(
      'ShopManagement_Business_'
    );

    backupFile = new File(
      Paths.cache,
      backupName
    );

    backupDb = await SQLite.openDatabaseAsync(
      backupName,
      { createIfMissing: true },
      Paths.cache.uri
    );

    await createBusinessBackupSchema(backupDb);

    const backupId =
      'backup_' +
      Date.now() +
      '_' +
      Math.random().toString(36).slice(2, 12);

    await backupDb.runAsync(
      `INSERT INTO backup_metadata
       (id, backup_id, format_version, created_at)
       VALUES (1, ?, ?, ?)`,
      [
        backupId,
        BACKUP_VERSION,
        new Date().toISOString(),
      ]
    );

    await copyAccountRecords(
      sourceDb,
      backupDb,
      userId
    );

    await verifyIntegrity(backupDb);

    await backupDb.closeAsync();
    backupDb = null;

    if (!backupFile.exists || backupFile.size <= 0) {
      throw new Error(
        'Business backup file was not created.'
      );
    }

    const canShare =
      await Sharing.isAvailableAsync();

    if (!canShare) {
      throw new Error(
        'File sharing is unavailable.'
      );
    }

    await Sharing.shareAsync(backupFile.uri, {
      mimeType: 'application/x-sqlite3',
      dialogTitle: 'Save Shop Business Backup',
    });

    console.log(
      'Business backup created:',
      backupName
    );

    return {
      success: true,
      fileName: backupName,
      fileUri: backupFile.uri,
      backupType: 'business',
      size: backupFile.size,
      backupId,
    };
  } catch (error) {
    throw new Error(
      'Business backup failed: ' + error.message
    );
  } finally {
    if (backupDb) {
      await backupDb.closeAsync().catch(() => {});
    }

    // Do not delete the backup immediately.
    // The operating system may still be using
    // the file through the sharing menu.
  }
};
