import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { loadEnv } from '../src/config/env.js';
import { connectDatabase } from '../src/config/db.js';
import { createApp } from '../src/app.js';
import '../src/models/User.js';
import '../src/models/Order.js';
import '../src/models/Settings.js';

export const ADMIN_PASSWORD = 'correct-horse-battery-staple';
export const FRONTEND_URL = 'http://localhost:3000';
export const CLOUD_NAME = 'gmeds-test';

export const env = loadEnv({
  NODE_ENV: 'test',
  MONGODB_URI: process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/goregaonmeds_test',
  JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD_HASH: bcrypt.hashSync(ADMIN_PASSWORD, 4),
  CLOUDINARY_CLOUD_NAME: CLOUD_NAME,
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'secret',
  FRONTEND_URL,
});

export const silentLogger = { log() {}, warn() {}, error() {} };

export async function connect() {
  if (mongoose.connection.readyState !== 1) await connectDatabase(env.MONGODB_URI);
}

export async function resetDatabase() {
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
}

export function buildApp(notifier = { notifyNewOrder: async () => true }) {
  return createApp({ env, notifier, logger: silentLogger });
}

export function manualOrder(overrides = {}) {
  return {
    clientRequestId: crypto.randomUUID(),
    customerName: 'Asha Patil',
    mobileNumber: '+91 98200 18771',
    orderType: 'manual_text',
    medicines: [{ name: 'Dolo 650', quantity: '2 strips' }],
    address: { flat: 'B-204, Sai Darshan', area: 'Aarey Road, Goregaon East', landmark: 'Near Oberoi Mall' },
    offerOptIn: true,
    ...overrides,
  };
}
