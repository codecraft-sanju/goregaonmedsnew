import { loadEnv } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { createApp } from './app.js';
import './models/User.js';
import './models/Order.js';
import './models/Settings.js';

async function start() {
  const env = loadEnv();
  await connectDatabase(env.MONGODB_URI);
  const app = createApp({ env });
  const server = app.listen(env.PORT, () => {
    console.log(`[server] GOREGAONMEDS API listening on port ${env.PORT}`);
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) {
      console.warn('[server] Telegram is not configured: orders will be saved with telegramNotificationSent=false');
    }
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
