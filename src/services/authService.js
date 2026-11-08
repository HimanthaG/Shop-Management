import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';

import { getDatabase } from './database';

const SESSION_KEY = 'shopmanagement_session';
const ITERATIONS = 100000;
const KEY_LENGTH = 32;

// ========================================
// HELPERS
// ========================================

const normalizeEmail = (value) =>
  String(value || '').trim().toLowerCase();

const bytesToHex = (bytes) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const hexToBytes = (hex) => {
  if (
    typeof hex !== 'string' ||
    hex.length % 2 !== 0 ||
    !/^[0-9a-f]*$/i.test(hex)
  ) {
    throw new Error('Invalid password hash format.');
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
};

const hashPassword = (password, salt) => {
  return bytesToHex(
    pbkdf2(sha256, password, salt, {
      c: ITERATIONS,
      dkLen: KEY_LENGTH,
    })
  );
};

const safeCompare = (left, right) => {
  if (left.length !== right.length) return false;

  let difference = 0;

  for (let i = 0; i < left.length; i++) {
    difference |= left[i] ^ right[i];
  }

  return difference === 0;
};

// ========================================
// INITIALIZE AUTH DATABASE
// ========================================

export const initializeAuthDatabase = async () => {
  const db = await getDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

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

  const userColumns = await db.getAllAsync(
    'PRAGMA table_info(account_user_profiles)'
  );

  const shopColumns = await db.getAllAsync(
    'PRAGMA table_info(account_shop_profiles)'
  );

  if (
    !userColumns.some(
      (column) => column.name === 'owner_user_id'
    ) ||
    !shopColumns.some(
      (column) => column.name === 'owner_user_id'
    )
  ) {
    throw new Error(
      'Account profile schema is incompatible. Existing data was not changed.'
    );
  }

  await db.runAsync(`
    INSERT OR IGNORE INTO account_user_profiles
      (owner_user_id, full_name, email)
    SELECT id, full_name, email
    FROM auth_users
  `);

  console.log(
    'Authentication database initialized successfully.'
  );

  return db;
};

// ========================================
// REGISTER USER
// ========================================

export const registerUser = async (
  fullName,
  email,
  password,
  confirmPassword,
  shopDetails = null
) => {
  const cleanName = String(fullName || '').trim();
  const cleanEmail = normalizeEmail(email);

  if (!cleanName) {
    throw new Error('Full name is required.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  if (typeof password !== 'string' || password.length < 8) {
    throw new Error(
      'Password must contain at least 8 characters.'
    );
  }

  if (password !== confirmPassword) {
    throw new Error('Passwords do not match.');
  }

  const shopName = String(
    shopDetails?.shopName || ''
  ).trim();

  const ownerName = String(
    shopDetails?.ownerName || cleanName
  ).trim();

  const phone = String(
    shopDetails?.phone || ''
  ).trim();

  const shopEmail = normalizeEmail(
    shopDetails?.shopEmail || cleanEmail
  );

  const address = String(
    shopDetails?.address || ''
  ).trim();

  const registrationNumber = String(
    shopDetails?.registrationNumber || ''
  ).trim();

  if (shopDetails && !shopName) {
    throw new Error('Shop name is required.');
  }

  if (shopDetails && !ownerName) {
    throw new Error('Owner name is required.');
  }

  if (
    shopDetails &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shopEmail)
  ) {
    throw new Error('Invalid shop email.');
  }

  const db = await getDatabase();

  const existingUser = await db.getFirstAsync(
    'SELECT id FROM auth_users WHERE email = ?',
    [cleanEmail]
  );

  if (existingUser) {
    throw new Error(
      'This email address is already registered.'
    );
  }

  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const saltHex = bytesToHex(saltBytes);
  const passwordHash = hashPassword(password, saltBytes);

  let createdUser = null;

  await db.withExclusiveTransactionAsync(async (tx) => {
    const result = await tx.runAsync(
      `INSERT INTO auth_users
        (full_name, email, password_hash, password_salt)
       VALUES (?, ?, ?, ?)`,
      [cleanName, cleanEmail, passwordHash, saltHex]
    );

    const userId = result.lastInsertRowId;

    await tx.runAsync(
      `INSERT INTO account_user_profiles
        (owner_user_id, full_name, email)
       VALUES (?, ?, ?)`,
      [userId, cleanName, cleanEmail]
    );

    if (shopDetails) {
      await tx.runAsync(
        `INSERT INTO account_shop_profiles
          (
            owner_user_id,
            shop_name,
            owner_name,
            phone,
            email,
            address,
            registration_number
          )
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          shopName,
          ownerName,
          phone,
          shopEmail,
          address,
          registrationNumber,
        ]
      );
    }

    createdUser = {
      id: userId,
      fullName: cleanName,
      email: cleanEmail,
    };
  });

  return createdUser;
};

// ========================================
// LOGIN USER
// ========================================

export const loginUser = async (email, password) => {
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail || !password) {
    throw new Error('Email and password are required.');
  }

  const db = await getDatabase();

  const user = await db.getFirstAsync(
    'SELECT * FROM auth_users WHERE email = ?',
    [cleanEmail]
  );

  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const saltBytes = hexToBytes(user.password_salt);
  const enteredHash = hashPassword(password, saltBytes);

  const validPassword = safeCompare(
    hexToBytes(enteredHash),
    hexToBytes(user.password_hash)
  );

  if (!validPassword) {
    throw new Error('Invalid email or password.');
  }

  const sessionUser = {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
  };

  await SecureStore.setItemAsync(
    SESSION_KEY,
    JSON.stringify(sessionUser)
  );

  return sessionUser;
};

// ========================================
// CURRENT USER
// ========================================

export const getCurrentUser = async () => {
  const savedSession = await SecureStore.getItemAsync(
    SESSION_KEY
  );

  if (!savedSession) return null;

  let session;

  try {
    session = JSON.parse(savedSession);
  } catch {
    return null;
  }

  if (!session?.id || !session?.email) {
    return null;
  }

  const db = await getDatabase();

  const user = await db.getFirstAsync(
    `SELECT id, full_name, email
     FROM auth_users
     WHERE id = ? AND email = ?`,
    [
      session.id,
      normalizeEmail(session.email),
    ]
  );

  if (!user) return null;

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
  };
};

// ========================================
// LOGOUT
// ========================================

export const logoutUser = async () => {
  await SecureStore.deleteItemAsync(SESSION_KEY);
};

// ========================================
// COMPATIBILITY ALIASES
// ========================================

export const signUpUser = registerUser;
export const signInUser = loginUser;
export const getLoggedInUser = getCurrentUser;