import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type pg from 'pg';
import { config } from '../config';
import { forbidden, unauthorized } from '../lib/errors';
import type { Actor } from '../services/audit';
import { getSessionUser } from '../services/users';

export const SESSION_COOKIE = 'msp_session';

declare module 'express-serve-static-core' {
  interface Request {
    actor?: Actor;
  }
}

export function sessionCookieOptions(expires?: Date) {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax' as const,
    path: '/',
    ...(expires ? { expires } : {}),
  };
}

/** Attach req.actor when a valid session cookie is present. Never throws. */
export function loadSession(pool: pg.Pool): RequestHandler {
  return async (req, _res, next) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token === 'string' && token.length >= 20 && token.length <= 100) {
      try {
        req.actor = (await getSessionUser(pool, token)) ?? undefined;
      } catch (err) {
        return next(err);
      }
    }
    next();
  };
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.actor) return next(unauthorized());
  next();
};

export function requireRole(...roles: Actor['role'][]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.actor) return next(unauthorized());
    if (!roles.includes(req.actor.role)) return next(forbidden());
    next();
  };
}
