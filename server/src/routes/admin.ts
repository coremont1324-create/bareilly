import { Router } from 'express';
import type pg from 'pg';
import { z } from 'zod';
import {
  lifecycleSchema,
  noticeInputSchema,
  noticeUpdateSchema,
  officeSchema,
  schemeInputSchema,
  schemeUpdateSchema,
  settingsSchema,
  userCreateSchema,
  userUpdateSchema,
} from '@mandal/shared';
import { ah, parse } from '../lib/errors';
import { requireAuth, requireRole } from '../middleware/auth';
import { listAudit } from '../services/audit';
import { getDashboard, listOffices, saveOffice } from '../services/meta';
import { createNotice, getAdminNotice, listAdminNotices, transitionNotice, updateNotice } from '../services/notices';
import {
  checklistFor,
  createScheme,
  getAdminScheme,
  getPreview,
  listAdminSchemes,
  listVerifications,
  transitionScheme,
  updateScheme,
} from '../services/schemes';
import { getOfficialDomains, getSettings, saveSettings } from '../services/settings';
import { createUser, listUsers, updateUser } from '../services/users';

const listQuery = z.object({
  status: z.string().max(20).optional(),
  q: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const versionOnly = z.object({ version: z.number().int().positive() });

export function adminRouter(pool: pg.Pool): Router {
  const r = Router();
  r.use(requireAuth);

  // ------------------------------------------------------------ dashboard
  r.get('/dashboard', ah(async (_req, res) => res.json(await getDashboard(pool))));

  // ------------------------------------------------------------ schemes
  r.get(
    '/schemes',
    ah(async (req, res) => {
      const q = parse(listQuery, req.query);
      res.json(await listAdminSchemes(pool, q));
    }),
  );

  r.post(
    '/schemes',
    ah(async (req, res) => {
      const input = parse(schemeInputSchema, req.body);
      res.status(201).json(await createScheme(pool, input, req.actor!));
    }),
  );

  /** Evaluate the publishing checklist for unsaved form data. */
  r.post(
    '/schemes/checklist',
    ah(async (req, res) => {
      const input = parse(schemeInputSchema, req.body);
      res.json(checklistFor(input, await getOfficialDomains(pool)));
    }),
  );

  r.get('/schemes/:id', ah(async (req, res) => res.json(await getAdminScheme(pool, req.params.id))));
  r.get('/schemes/:id/preview', ah(async (req, res) => res.json(await getPreview(pool, req.params.id))));

  r.put(
    '/schemes/:id',
    ah(async (req, res) => {
      const { version, ...input } = parse(schemeUpdateSchema, req.body);
      res.json(await updateScheme(pool, req.params.id, input, version, req.actor!));
    }),
  );

  for (const action of ['publish', 'unpublish', 'archive', 'restore'] as const) {
    r.post(
      `/schemes/:id/${action}`,
      ah(async (req, res) => {
        const body = parse(lifecycleSchema, req.body);
        res.json(await transitionScheme(pool, req.params.id, action, body, req.actor!));
      }),
    );
  }

  r.get(
    '/schemes/:id/history',
    ah(async (req, res) => {
      await getAdminScheme(pool, req.params.id);
      const [audit, verifications] = await Promise.all([
        listAudit(pool, { entityType: 'scheme', entityId: req.params.id, limit: 100 }),
        listVerifications(pool, req.params.id),
      ]);
      res.json({ audit, verifications });
    }),
  );

  // ------------------------------------------------------------ notices
  r.get(
    '/notices',
    ah(async (req, res) => {
      const { status } = parse(listQuery, req.query);
      res.json({ items: await listAdminNotices(pool, { status }) });
    }),
  );
  r.post(
    '/notices',
    ah(async (req, res) => {
      const input = parse(noticeInputSchema, req.body);
      res.status(201).json(await createNotice(pool, input, req.actor!));
    }),
  );
  r.get('/notices/:id', ah(async (req, res) => res.json(await getAdminNotice(pool, req.params.id))));
  r.put(
    '/notices/:id',
    ah(async (req, res) => {
      const { version, ...input } = parse(noticeUpdateSchema, req.body);
      res.json(await updateNotice(pool, req.params.id, input, version, req.actor!));
    }),
  );
  for (const action of ['publish', 'unpublish', 'archive', 'restore'] as const) {
    r.post(
      `/notices/:id/${action}`,
      ah(async (req, res) => {
        const { version } = parse(versionOnly, req.body);
        res.json(await transitionNotice(pool, req.params.id, action, version, req.actor!));
      }),
    );
  }

  // ------------------------------------------------------------ audit
  r.get(
    '/audit',
    ah(async (req, res) => {
      const q = parse(
        z.object({ entityType: z.string().max(30).optional(), entityId: z.string().max(80).optional(), limit: z.coerce.number().int().min(1).max(200).optional() }),
        req.query,
      );
      res.json({ items: await listAudit(pool, q) });
    }),
  );

  // ------------------------------------------------------------ settings (read: all admins, write: super admin)
  r.get('/settings', ah(async (_req, res) => res.json(await getSettings(pool))));
  r.put(
    '/settings',
    requireRole('super_admin'),
    ah(async (req, res) => {
      const input = parse(settingsSchema, req.body);
      res.json(await saveSettings(pool, input, req.actor!));
    }),
  );

  r.get('/offices', ah(async (_req, res) => res.json({ items: await listOffices(pool) })));
  r.put(
    '/offices/:mandalId',
    requireRole('super_admin'),
    ah(async (req, res) => {
      const mandalId = parse(z.coerce.number().int().positive(), req.params.mandalId);
      const input = parse(officeSchema, req.body);
      res.json(await saveOffice(pool, mandalId, input, req.actor!));
    }),
  );

  // ------------------------------------------------------------ users (super admin only)
  r.get('/users', requireRole('super_admin'), ah(async (_req, res) => res.json({ items: await listUsers(pool) })));
  r.post(
    '/users',
    requireRole('super_admin'),
    ah(async (req, res) => {
      const input = parse(userCreateSchema, req.body);
      res.status(201).json(await createUser(pool, input, req.actor!));
    }),
  );
  r.patch(
    '/users/:id',
    requireRole('super_admin'),
    ah(async (req, res) => {
      const input = parse(userUpdateSchema, req.body);
      res.json(await updateUser(pool, req.params.id, input, req.actor!));
    }),
  );

  return r;
}
