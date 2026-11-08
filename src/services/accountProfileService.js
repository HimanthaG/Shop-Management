
import { getDatabase } from './database';

// ========================================
// ACCOUNT VALIDATION
// ========================================

const validateUserId = (userId) => {
  if (
    !Number.isSafeInteger(userId) ||
    userId <= 0
  ) {
    throw new Error('Invalid account ID.');
  }

  return userId;
};

// ========================================
// GET ACCOUNT USER PROFILE
// ========================================

export const getAccountUserProfile = async (
  userId
) => {
  const id = validateUserId(userId);
  const db = await getDatabase();

  return db.getFirstAsync(
    `SELECT
       owner_user_id,
       full_name,
       phone,
       email,
       address,
       updated_at
     FROM account_user_profiles
     WHERE owner_user_id = ?`,
    [id]
  );
};

// ========================================
// SAVE ACCOUNT USER PROFILE
// ========================================

export const saveAccountUserProfile = async (
  userId,
  fullName,
  phone,
  email,
  address
) => {
  const id = validateUserId(userId);

  const cleanName = String(fullName || '').trim();
  const cleanPhone = String(phone || '').trim();
  const cleanEmail = String(email || '').trim();
  const cleanAddress = String(address || '').trim();

  if (!cleanName) {
    throw new Error('Full name is required.');
  }

  if (
    cleanEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    throw new Error('Enter a valid email address.');
  }

  const db = await getDatabase();

  const account = await db.getFirstAsync(
    `SELECT id
     FROM auth_users
     WHERE id = ?`,
    [id]
  );

  if (!account) {
    throw new Error('Account not found.');
  }

  return db.runAsync(
    `INSERT INTO account_user_profiles
     (
       owner_user_id,
       full_name,
       phone,
       email,
       address,
       updated_at
     )
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(owner_user_id)
     DO UPDATE SET
       full_name = excluded.full_name,
       phone = excluded.phone,
       email = excluded.email,
       address = excluded.address,
       updated_at = CURRENT_TIMESTAMP`,
    [
      id,
      cleanName,
      cleanPhone,
      cleanEmail,
      cleanAddress,
    ]
  );
};
