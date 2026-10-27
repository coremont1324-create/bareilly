import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import type pg from 'pg';
import { config } from './config';
import { errorHandler, notFound } from './lib/errors';
import { loadSession } from './middleware/auth';
import { csrfProtection, noStore } from './middleware/security';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { publicRouter } from './routes/public';
import { mountClient } from './seo';

export function createApp(pool: pg.Pool, opts: { serveClient?: boolean } = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:'],
          'font-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
          'frame-ancestors': ["'none'"],
          'form-action': ["'self'"],
          'upgrade-insecure-requests': config.isProduction ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  app.use('/api', loadSession(pool), csrfProtection);
  app.use('/api', publicRouter(pool));
  app.use('/api/auth', noStore, authRouter(pool));
  app.use('/api/admin', noStore, adminRouter(pool));
  app.use('/api', (_req, _res, next) => next(notFound('API endpoint not found')));

  if (opts.serveClient !== false) mountClient(app, pool);

  app.use(errorHandler);
  return app;
}
