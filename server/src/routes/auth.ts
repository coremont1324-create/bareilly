import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type pg from 'pg';
import { loginSchema } from '@mandal/shared';
import { config } from '../config';
import { ah, HttpError, parse, unauthorized } from '../lib/errors';
import { SESSION_COOKIE, sessionCookieOptions } from '../middleware/auth';
import { recordAudit } from '../services/audit';
import { createSession, destroySession, verifyCredentials } from '../services/users';

export function authRouter(pool: pg.Pool): Router {
  const r = Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.loginRateLimit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (_req, _res, next) =>
      next(new HttpError(429, 'RATE_LIMITED', 'Too many sign-in attempts. Please wait 15 minutes and try again.')),
  });

  r.post(
    '/login',
    loginLimiter,
    ah(async (req, res) => {
      const { email, password } = parse(loginSchema, req.body);
      const user = await verifyCredentials(pool, email, password);
      if (!user) {
        await recordAudit(pool, { entityType: 'auth', entityId: email, action: 'login_failed', actor: null });
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
      }
      const { token, expiresAt } = await createSession(pool, user.id, { ip: req.ip, userAgent: req.get('user-agent') });
      res.cookie(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
      await recordAudit(pool, { entityType: 'auth', entityId: user.id, action: 'login', actor: { ...user } });
      res.json({ user });
    }),
  );

  r.post(
    '/logout',
    ah(async (req, res) => {
      const token = req.cookies?.[SESSION_COOKIE];
      if (typeof token === 'string') await destroySession(pool, token);
      res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
      res.json({ ok: true });
    }),
  );

  r.get(
    '/me',
    ah(async (req, res) => {
      if (!req.actor) throw unauthorized();
      res.json({ user: req.actor });
    }),
  );

  return r;
}
