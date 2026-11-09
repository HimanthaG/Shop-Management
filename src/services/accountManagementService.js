
import * as FileSystem from 'expo-file-system/legacy';

import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';

import { getDatabase } from './database';

import {
  getActiveUserId,
  clearActiveUser,
} from './accountSession';

import {
  getCurrentUser,
  logoutUser,
} from './authService';

import {
  createSafetyBackup,
} from './backupService';

// ========================================
// CONFIGURATION
// ========================================

const ITERATIONS = 100000;
const KEY_LENGTH = 32;

const BUSINESS_TABLES = [
  'sale_items',
  'purchases',
  'sales',
  'expenses',
  'products',
];

const LOGO_DIRECTORY =
  FileSystem.documentDirectory + 'shop-logo/';

// ========================================
// PASSWORD HELPERS
// ========================================

const hexToBytes = (hex) => {
  if (
    typeof hex !== 'string' ||
    hex.length % 2 !== 0 ||
    !/^[0-9a-f]*$/i.test(hex)
  ) {
    throw new Error('Invalid password data.');
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(
      hex.slice(i * 2, i * 2 + 2),
      16
    );
  }

  return bytes;
};

const safeCompare = (left, right) => {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let i = 0; i < left.length; i++) {
    difference |= left[i] ^ right[i];
  }

  return difference === 0;
};

// ========================================
// DATABASE HELPERS
// ========================================

const tableExists = async (db, tableName) => {
  const result = await db.getFirstAsync(
    `SELECT name
     FROM sqlite_master
     WHERE type = 'table'
       AND name = ?`,
    [tableName]
  );

  return Boolean(result);
};

const verifyOwnership = async (db) => {
  for (const table of BUSINESS_TABLES) {
    const columns = await db.getAllAsync(
      `PRAGMA table_info(${table})`
    );

    if (
      !columns.some(
        (column) => column.name === 'owner_user_id'
      )
    ) {
      throw new Error(
        `Account ownership is missing in ${table}.`
      );
    }
  }
};

// ========================================
// VERIFY CURRENT ACCOUNT
// ========================================

const verifyCurrentAccount = async () => {
  const userId = getActiveUserId();
  const sessionUser = await getCurrentUser();

  if (
    !sessionUser ||
    Number(sessionUser.id) !== userId
  ) {
    throw new Error(
      'Account session is invalid. Please log in again.'
    );
  }

  const db = await getDatabase();

  const account = await db.getFirstAsync(
    'SELECT id FROM auth_users WHERE id = ?',
    [userId]
  );

  if (!account) {
    throw new Error('Account not found.');
  }

  await verifyOwnership(db);

  return { db, userId };
};

// ========================================
// VERIFY LOGIN PASSWORD
// ========================================

const verifyPassword = async (
  db,
  userId,
  password
) => {
  if (
    typeof password !== 'string' ||
    !password
  ) {
    throw new Error('Password is required.');
  }

  const account = await db.getFirstAsync(
    `SELECT password_hash, password_salt
     FROM auth_users
     WHERE id = ?`,
    [userId]
  );

  if (!account) {
    throw new Error('Account not found.');
  }

  const salt = hexToBytes(
    account.password_salt
  );

  const enteredHash = pbkdf2(
    sha256,
    password,
    salt,
    {
      c: ITERATIONS,
      dkLen: KEY_LENGTH,
    }
  );

  const savedHash = hexToBytes(
    account.password_hash
  );

  if (!safeCompare(enteredHash, savedHash)) {
    throw new Error('Incorrect password.');
  }
};

// ========================================
// TRANSACTION HELPERS
// ========================================

const verifyTransactionAccount = async (
  tx,
  userId
) => {
  if (getActiveUserId() !== userId) {
    throw new Error(
      'Active account changed. Operation cancelled.'
    );
  }

  const account = await tx.getFirstAsync(
    'SELECT id FROM auth_users WHERE id = ?',
    [userId]
  );

  if (!account) {
    throw new Error('Account not found.');
  }
};

const deleteBusinessRecords = async (
  tx,
  userId
) => {
  for (const table of BUSINESS_TABLES) {
    await tx.runAsync(
      `DELETE FROM ${table}
       WHERE owner_user_id = ?`,
      [userId]
    );
  }
};

const deleteBackupImportHistory = async (
  tx,
  userId,
  historyTableExists
) => {
  if (!historyTableExists) {
    return;
  }

  await tx.runAsync(
    `DELETE FROM business_backup_imports
     WHERE owner_user_id = ?`,
    [userId]
  );
};

// ========================================
// RESET ACCOUNT DATA
// ========================================

export const resetAccountData = async (
  password
) => {
  const { db, userId } =
    await verifyCurrentAccount();

  // Password must be correct before backup
  // or any destructive database operation.
  await verifyPassword(
    db,
    userId,
    password
  );

  const hasImportHistory = await tableExists(
    db,
    'business_backup_imports'
  );

  const safetyBackup =
    await createSafetyBackup();

  if (
    !safetyBackup.success ||
    safetyBackup.size <= 0
  ) {
    throw new Error(
      'Safety backup failed. Reset cancelled.'
    );
  }

  await db.withExclusiveTransactionAsync(
    async (tx) => {
      await verifyTransactionAccount(
        tx,
        userId
      );

      await deleteBusinessRecords(
        tx,
        userId
      );

      await deleteBackupImportHistory(
        tx,
        userId,
        hasImportHistory
      );
    }
  );

  return {
    success: true,
    message:
      'Account business data reset successfully.',
  };
};

// ========================================
// DELETE ACCOUNT
// ========================================

export const deleteCurrentAccount = async (
  password
) => {
  const { db, userId } =
    await verifyCurrentAccount();

  await verifyPassword(
    db,
    userId,
    password
  );

  const hasImportHistory = await tableExists(
    db,
    'business_backup_imports'
  );

  const safetyBackup =
    await createSafetyBackup();

  if (
    !safetyBackup.success ||
    safetyBackup.size <= 0
  ) {
    throw new Error(
      'Safety backup failed. Account deletion cancelled.'
    );
  }

  await db.withExclusiveTransactionAsync(
    async (tx) => {
      await verifyTransactionAccount(
        tx,
        userId
      );

      await deleteBusinessRecords(
        tx,
        userId
      );

      await deleteBackupImportHistory(
        tx,
        userId,
        hasImportHistory
      );

      await tx.runAsync(
        `DELETE FROM account_shop_profiles
         WHERE owner_user_id = ?`,
        [userId]
      );

      await tx.runAsync(
        `DELETE FROM account_user_profiles
         WHERE owner_user_id = ?`,
        [userId]
      );

      const result = await tx.runAsync(
        `DELETE FROM auth_users
         WHERE id = ?`,
        [userId]
      );

      if (result.changes !== 1) {
        throw new Error(
          'Account deletion failed.'
        );
      }
    }
  );

  // Delete only the current account logo.

  const logoPath =
    LOGO_DIRECTORY +
    `shop-logo-${userId}.jpg`;

  try {
    await FileSystem.deleteAsync(
      logoPath,
      { idempotent: true }
    );
  } catch (error) {
    console.log(
      'Account deleted, but logo cleanup failed:',
      error.message
    );
  }

  clearActiveUser();

  await logoutUser();

  return {
    success: true,
    message: 'Account deleted successfully.',
  };
};
