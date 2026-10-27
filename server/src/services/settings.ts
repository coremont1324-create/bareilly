import {
  DEFAULT_OFFICIAL_DOMAINS,
  settingsSchema,
  type Helpdesk,
  type PortalSettings,
  type PublicHelpdesk,
} from '@mandal/shared';
import type { DbClient } from '../db/pool';
import { recordAudit, type Actor, diff } from './audit';

export const DEFAULT_SETTINGS: PortalSettings = {
  helpdesk: { phone: null, email: null, hours: '', supportUrl: null, verified: false },
  officialDomains: [...DEFAULT_OFFICIAL_DOMAINS],
  defaultMandalSlug: null,
};

export async function getSettings(db: DbClient): Promise<PortalSettings> {
  const { rows } = await db.query<{ key: string; value: unknown }>('SELECT key, value FROM settings');
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const merged = {
    helpdesk: { ...DEFAULT_SETTINGS.helpdesk, ...((map.helpdesk as object) ?? {}) },
    officialDomains: (map.officialDomains as string[]) ?? DEFAULT_SETTINGS.officialDomains,
    defaultMandalSlug: (map.defaultMandalSlug as string | null) ?? null,
  };
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function getOfficialDomains(db: DbClient): Promise<string[]> {
  const { rows } = await db.query<{ value: string[] }>(`SELECT value FROM settings WHERE key = 'officialDomains'`);
  const v = rows[0]?.value;
  return Array.isArray(v) && v.length ? v : [...DEFAULT_OFFICIAL_DOMAINS];
}

/** Only verified help-desk details are exposed publicly. */
export function publicHelpdesk(h: Helpdesk): PublicHelpdesk | null {
  if (!h.verified) return null;
  if (!h.phone && !h.email && !h.supportUrl) return null;
  return { phone: h.phone, email: h.email, hours: h.hours, supportUrl: h.supportUrl };
}

export async function saveSettings(db: DbClient, next: PortalSettings, actor: Actor): Promise<PortalSettings> {
  const before = await getSettings(db);
  if (next.defaultMandalSlug) {
    const { rowCount } = await db.query('SELECT 1 FROM mandals WHERE slug = $1', [next.defaultMandalSlug]);
    if (!rowCount) next = { ...next, defaultMandalSlug: null };
  }
  for (const [key, value] of Object.entries(next)) {
    await db.query(
      `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [key, JSON.stringify(value), actor.id],
    );
  }
  await recordAudit(db, {
    entityType: 'settings',
    entityId: 'portal',
    action: 'update',
    actor,
    changes: diff(before as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>),
  });
  return getSettings(db);
}
