import { DEFAULT_OFFICIAL_DOMAINS } from './constants';

export type LinkCheck =
  | { ok: true; url: string; host: string }
  | { ok: false; reason: 'empty' | 'invalid' | 'not_https' | 'not_official_domain' };

/**
 * Validate that a link is a well-formed HTTPS URL on an official domain.
 * Links that fail this check are never shown to citizens as official links.
 */
export function checkOfficialLink(
  value: string | null | undefined,
  allowedDomains: readonly string[] = DEFAULT_OFFICIAL_DOMAINS,
): LinkCheck {
  if (!value || !value.trim()) return { ok: false, reason: 'empty' };
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'not_https' };
  if (url.username || url.password) return { ok: false, reason: 'invalid' };
  const host = url.hostname.toLowerCase();
  const allowed = allowedDomains.some((d) => {
    const domain = d.toLowerCase().trim().replace(/^\.+/, '');
    return domain.length > 0 && (host === domain || host.endsWith(`.${domain}`));
  });
  if (!allowed) return { ok: false, reason: 'not_official_domain' };
  return { ok: true, url: url.toString(), host };
}

export const LINK_REASON_TEXT: Record<Exclude<LinkCheck, { ok: true }>['reason'], string> = {
  empty: 'No link provided',
  invalid: 'Not a valid URL',
  not_https: 'Link must use HTTPS',
  not_official_domain: 'Link is not on an approved official domain',
};
