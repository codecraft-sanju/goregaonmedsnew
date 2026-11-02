// src/worker.js
import { loadEnv } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { createInvoiceWorker } from './services/invoiceService.js';
import { createEmailWorker } from './services/emailService.js';
import { createTelegramWorker, createTelegramQueue } from './services/telegramService.js';


async function startWorkers() {
  const env = loadEnv();

  await connectDatabase(env.MONGODB_URI);
  
  console.log('[Workers] Starting background workers...');

  const invoiceWorker = createInvoiceWorker(env);
  const emailWorker = createEmailWorker(env);
  const telegramWorker = createTelegramWorker(env);
  const telegramQueue = createTelegramQueue(env);
  
  console.log('[Workers] Ready and listening for jobs on Redis...');

  const shutdown = async (signal) => {
    console.log(`\n[Workers] ${signal} received, shutting down gracefully...`);
    
    try {
      await invoiceWorker.close();
      await emailWorker.close();
      await telegramWorker.close();
      await telegramQueue.close();
      await disconnectDatabase();
      console.log('[Workers] Shutdown complete.');
      process.exit(0);
    } catch (err) {
      console.error('[Workers] Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startWorkers().catch((error) => {
  console.error('[Workers] Fatal error:', error);
  process.exit(1);
});