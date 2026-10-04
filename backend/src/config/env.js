//src/config/env.js
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ADMIN_USERNAME: z.string().min(1, 'ADMIN_USERNAME is required'),
  ADMIN_PASSWORD_HASH: z
    .string()
    .regex(/^\$2[aby]\$\d{2}\$.{53}$/, 'ADMIN_PASSWORD_HASH must be a bcrypt hash (run npm run hash-password)'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  CLOUDINARY_UPLOAD_FOLDER: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/)
    .default('goregaonmeds/prescriptions'),
  // Telegram is optional at boot: orders must still be accepted when it is missing or down.
  TELEGRAM_BOT_TOKEN: z.string().default(''),
  TELEGRAM_ADMIN_CHAT_ID: z.string().default(''),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a full URL, e.g. https://goregaonmeds.in'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
});

export function loadEnv(source = process.env) {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  const env = parsed.data;
  return Object.freeze({
    ...env,
    isProduction: env.NODE_ENV === 'production',
    frontendOrigin: new URL(env.FRONTEND_URL).origin,
  });
}
