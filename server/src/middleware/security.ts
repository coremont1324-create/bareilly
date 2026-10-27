import type { RequestHandler } from 'express';
import { config } from '../config';
import { HttpError } from '../lib/errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie-authenticated API calls:
 *  1. State-changing requests must carry the custom header `X-Requested-With: mandal-portal`.
 *     Browsers cannot add custom headers to cross-site requests without a CORS preflight,
 *     and this API never grants CORS.
 *  2. If an Origin header is present it must match this host or an allowed origin.
 * Combined with SameSite=Lax session cookies this blocks cross-site form posts.
 */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.get('x-requested-with') !== 'mandal-portal') {
    return next(new HttpError(403, 'CSRF', 'Missing request verification header'));
  }
  const origin = req.get('origin');
  if (origin) {
    let ok = false;
    try {
      const o = new URL(origin);
      const host = req.get('host');
      ok =
        o.host === host ||
        config.allowedOrigins.includes(origin) ||
        origin === config.publicBaseUrl ||
        (!config.isProduction && (o.hostname === 'localhost' || o.hostname === '127.0.0.1'));
    } catch {
      ok = false;
    }
    if (!ok) return next(new HttpError(403, 'CSRF', 'Cross-origin request rejected'));
  }
  next();
};

/** Discourage caching of personalised/admin API responses. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};
