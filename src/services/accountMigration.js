
import { getDatabase } from './database';

const MIGRATION_KEY = 'account_ownership_v1';

const OWNED_TABLES = [
  'products',
  'purchases',
  'sales',
  'sale_items',
  'expenses',
];

// ========================================
// VERIFY ACCOUNT OWNERSHIP COLUMN
// ========================================

const ensureOwnerColumn = async (db, tableName) => {
  const columns = await db.getAllAsync(
    `PRAGMA table_info(${tableName})`
  );

  if (columns.length === 0) {
    throw new Error(
      `Required database table is missing: ${tableName}`
    );
  }

  const hasOwnerColumn = columns.some(
    (column) => column.name === 'owner_user_id'
  );

  if (!hasOwnerColumn) {
    await db.execAsync(
      `ALTER TABLE ${tableName}
       ADD COLUMN owner_user_id INTEGER`
    );

    console.log(
      `Account ownership column added: ${tableName}`
    );
  }
};

// ========================================
// CREATE ACCOUNT PROFILE TABLES
// ========================================

const ensureAccountProfileTables = async (db) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS account_user_profiles (
      owner_user_id INTEGER PRIMARY KEY,
      full_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS account_shop_profiles (
      owner_user_id INTEGER PRIMARY KEY,
      shop_name TEXT NOT NULL DEFAULT '',
      owner_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      registration_number TEXT NOT NULL DEFAULT '',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

// ========================================
// CHECK UNASSIGNED BUSINESS DATA
// ========================================

const countUnassignedRecords = async (db) => {
  let total = 0;

  for (const tableName of OWNED_TABLES) {
    const result = await db.getFirstAsync(
      `SELECT COUNT(*) AS total
       FROM ${tableName}
       WHERE owner_user_id IS NULL`
    );

    total += result?.total ?? 0;
  }

  return total;
};

// ========================================
// CHECK LEGACY PROFILE TABLES
// ========================================

const hasLegacyProfiles = async (db) => {
  const tables = await db.getAllAsync(
    `SELECT name
     FROM sqlite_master
     WHERE type = 'table'
       AND name IN ('user_profile', 'shop_profile')`
  );

  for (const table of tables) {
    const profile = await db.getFirstAsync(
      `SELECT 1 AS found
       FROM ${table.name}
       LIMIT 1`
    );

    if (profile) {
      return true;
    }
  }

  return false;
};

// ========================================
// VERIFY EXISTING OWNER REFERENCES
// ========================================

const verifyOwnerReferences = async (db) => {
  for (const tableName of OWNED_TABLES) {
    const invalid = await db.getFirstAsync(
      `SELECT COUNT(*) AS total
       FROM ${tableName} AS business
       WHERE business.owner_user_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
           FROM auth_users AS account
           WHERE account.id = business.owner_user_id
         )`
    );

    if ((invalid?.total ?? 0) > 0) {
      console.warn(
        `Ownership warning: ${tableName} contains ` +
        `${invalid.total} records with missing local accounts.`
      );
    }
  }
};

// ========================================
// MAIN ACCOUNT MIGRATION
// ========================================

export const migrateAccountOwnership = async () => {
  const db = await getDatabase();

  await db.withExclusiveTransactionAsync(
    async (txn) => {
      // Step 1: Create migration tracking table.
      await txn.execAsync(`
        CREATE TABLE IF NOT EXISTS app_migrations (
          migration_key TEXT PRIMARY KEY,
          completed_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Step 2: Ensure every business table
      // has an owner_user_id column.
      for (const tableName of OWNED_TABLES) {
        await ensureOwnerColumn(txn, tableName);
      }

      // Step 3: Create separate account profiles.
      await ensureAccountProfileTables(txn);

      // Step 4: Verify existing ownership.
      await verifyOwnerReferences(txn);

      // Step 5: Check migration status.
      const completed = await txn.getFirstAsync(
        `SELECT migration_key
         FROM app_migrations
         WHERE migration_key = ?`,
        [MIGRATION_KEY]
      );

      if (completed) {
        console.log(
          'Account ownership schema verified. ' +
          'Migration already completed.'
        );

        return;
      }

      // Step 6: Check for legacy data.
      const unassignedCount =
        await countUnassignedRecords(txn);

      const legacyProfiles =
        await hasLegacyProfiles(txn);

      // Step 7: Fresh installation.
      if (
        unassignedCount === 0 &&
        !legacyProfiles
      ) {
        await txn.runAsync(
          `INSERT OR IGNORE INTO app_migrations
           (migration_key)
           VALUES (?)`,
          [MIGRATION_KEY]
        );

        console.log(
          'Fresh database verified. ' +
          'Account ownership ready.'
        );

        return;
      }

      // Step 8: Existing legacy data.
      //
      // Do not guess which account owns it.
      // Do not assign records based on account count.
      // Do not copy profiles to another account.
      // Do not delete existing records.
      // Do not mark migration complete.

      console.warn(
        'Legacy business data or profiles detected. ' +
        'Ownership could not be verified automatically. ' +
        'Existing records remain unchanged.'
      );

      console.log(
        'Unassigned business records:',
        unassignedCount
      );
    }
  );
};
