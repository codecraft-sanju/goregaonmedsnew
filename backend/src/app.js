//src/app.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createPublicController } from './controllers/publicController.js';
import { createAdminController } from './controllers/adminController.js';
import { createPublicRouter } from './routes/publicRoutes.js';
import { createAdminRouter } from './routes/adminRoutes.js';
import { createRateLimiters } from './middleware/rateLimits.js';
import { createErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createTelegramNotifier } from './services/telegramService.js';

export function createApp({ env, notifier, logger = console }) {
  const app = express();
  const telegram =
    notifier ?? createTelegramNotifier({ botToken: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_ADMIN_CHAT_ID, logger });
  const limiters = createRateLimiters();

  app.set('trust proxy', env.TRUST_PROXY);
  app.use(helmet());
  app.use(cors({ origin: env.frontendOrigin, credentials: true, methods: ['GET', 'POST', 'PATCH'] }));
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok' }));
  app.use('/api', createPublicRouter({ controller: createPublicController({ env, notifier: telegram, logger }), limiters }));
  
  //Passed notifier (telegram) to admin controller here
  app.use('/api/admin', createAdminRouter({ env, controller: createAdminController({ env, notifier: telegram }), limiters }));

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}