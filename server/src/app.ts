import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/error';
import routes from './routes';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.clientUrl.split(',').map((s) => s.trim()), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 1000,
      standardHeaders: true,
      legacyHeaders: false,
      skip: () => env.nodeEnv === 'test',
      message: { success: false, message: 'Too many requests, please try again later', errors: [] },
    }),
  );
  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
