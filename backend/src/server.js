// src/server.js
import { loadEnv } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { createApp } from './app.js';
import { redisClient, redisQueueClient } from './config/redis.js'; 
import { createInvoiceQueue } from './services/invoiceService.js'; 
import './models/User.js';
import './models/Order.js';
import './models/Settings.js';
import './models/Product.js';
import './models/Counter.js';


async function start() {
  const env = loadEnv();
  await connectDatabase(env.MONGODB_URI);
  const invoiceQueue = createInvoiceQueue(env);
  const app = createApp({ env, invoiceService: invoiceQueue });
  
  const server = app.listen(env.PORT, () => {
    console.log(`[server] GOREGAONMEDS API listening on port ${env.PORT}`);
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) {
      console.warn('[server] Telegram is not configured: orders will be saved with telegramNotificationSent=false');
    }
  });

  const shutdown = (signal) => {
    console.log(`\n[server] ${signal} received, shutting down gracefully...`);
    server.close(async () => {
      try {
        await invoiceQueue.close(); 
        await disconnectDatabase();
        await redisClient.quit();
        if (redisQueueClient) await redisQueueClient.quit(); 
        console.log('[server] All connections closed successfully.');
        process.exit(0);
      } catch (err) {
        console.error('[server] Error during shutdown:', err);
        process.exit(1);
      }
    });
    setTimeout(() => {
      console.error('[server] Forcing shutdown due to timeout');
      process.exit(1);
    }, 10_000).unref();
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  process.on('uncaughtException', (error) => {
    console.error('[server] CRITICAL - Uncaught Exception:', error);
    process.exit(1); 
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[server] CRITICAL - Unhandled Rejection:', reason);
    process.exit(1); 
  });
}

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});