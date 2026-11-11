
import { getDatabase } from './database';

const validateUserId = (userId) => {
  const id = Number(userId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('Invalid account ID.');
  }

  return id;
};

const verifyAccount = async (db, userId) => {
  const account = await db.getFirstAsync(
    `SELECT id
     FROM auth_users
     WHERE id = ?`,
    [userId]
  );

  if (!account) {
    throw new Error('Account not found.');
  }
};

// ========================================
// GET ACCOUNT SHOP PROFILE
// ========================================

export const getAccountShopProfile = async (userId) => {
  const id = validateUserId(userId);
  const db = await getDatabase();

  await verifyAccount(db, id);

  return db.getFirstAsync(
    `SELECT
       owner_user_id,
       shop_name,
       owner_name,
       phone,
       email,
       address,
       registration_number,
       updated_at
     FROM account_shop_profiles
     WHERE owner_user_id = ?`,
    [id]
  );
};

// ========================================
// SAVE ACCOUNT SHOP PROFILE
// ========================================

export const saveAccountShopProfile = async (
  userId,
  shopName,
  ownerName,
  phone,
  email,
  address,
  registrationNumber
) => {
  const id = validateUserId(userId);

  const cleanShopName = String(shopName || '').trim();
  const cleanOwnerName = String(ownerName || '').trim();
  const cleanPhone = String(phone || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
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
    throw new Error('Invalid email address.');
  }

  const db = await getDatabase();

  await verifyAccount(db, id);

  await db.runAsync(
    `INSERT INTO account_shop_profiles (
       owner_user_id,
       shop_name,
       owner_name,
       phone,
       email,
       address,
       registration_number,
       updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(owner_user_id)
     DO UPDATE SET
       shop_name = excluded.shop_name,
       owner_name = excluded.owner_name,
       phone = excluded.phone,
       email = excluded.email,
       address = excluded.address,
       registration_number = excluded.registration_number,
       updated_at = CURRENT_TIMESTAMP`,
    [
      id,
      cleanShopName,
      cleanOwnerName,
      cleanPhone,
      cleanEmail,
      cleanAddress,
      cleanRegistrationNumber,
    ]
  );

  return getAccountShopProfile(id);
};
