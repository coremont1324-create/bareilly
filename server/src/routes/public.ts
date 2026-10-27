import { Router } from 'express';
import type pg from 'pg';
import { z } from 'zod';
import { schemeQuerySchema } from '@mandal/shared';
import { ah, parse } from '../lib/errors';
import { getMeta, getPublicOffice } from '../services/meta';
import { listPublicNotices } from '../services/notices';
import { getPublicScheme, listFeatured, listPublicSchemes } from '../services/schemes';

const slugParam = z.string().regex(/^[a-z0-9-]{1,100}$/, 'Invalid identifier');

export function publicRouter(pool: pg.Pool): Router {
  const r = Router();

  r.use((_req, res, next) => {
    // Always revalidate so citizens never see stale deadlines or withdrawn schemes.
    res.setHeader('Cache-Control', 'no-cache');
    next();
  });

  r.get('/meta', ah(async (_req, res) => res.json(await getMeta(pool))));

  r.get(
    '/schemes',
    ah(async (req, res) => {
      const q = parse(schemeQuerySchema, req.query);
      res.json(await listPublicSchemes(pool, q));
    }),
  );

  r.get(
    '/schemes/featured',
    ah(async (req, res) => {
      const { mandal, limit } = parse(
        z.object({ mandal: z.string().max(80).optional(), limit: z.coerce.number().int().min(1).max(12).optional() }),
        req.query,
      );
      res.json({ items: await listFeatured(pool, { mandal, limit }) });
    }),
  );

  r.get(
    '/schemes/:slug',
    ah(async (req, res) => {
      const slug = parse(slugParam, req.params.slug);
      const mandal = typeof req.query.mandal === 'string' ? req.query.mandal.slice(0, 80) : undefined;
      res.json(await getPublicScheme(pool, slug, mandal));
    }),
  );

  r.get(
    '/notices',
    ah(async (req, res) => {
      const { limit, page } = parse(
        z.object({ limit: z.coerce.number().int().min(1).max(50).optional(), page: z.coerce.number().int().min(1).optional() }),
        req.query,
      );
      res.json(await listPublicNotices(pool, { limit, page }));
    }),
  );

  r.get(
    '/offices/:mandal',
    ah(async (req, res) => {
      const slug = parse(slugParam, req.params.mandal);
      res.json({ office: await getPublicOffice(pool, slug) });
    }),
  );

  return r;
}
