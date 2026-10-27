/** Lower-case, trim and collapse internal whitespace. */
export function normalizeQuery(input: string): string {
  return input.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Remove everything except letters/digits so "PM-KISAN", "pm kisan" and "PMKisan" compare equal. */
export function compactText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

/** Split a query into meaningful search tokens. */
export function tokenize(input: string): string[] {
  return normalizeQuery(input)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0)
    .slice(0, 8);
}

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'scheme';
}

/** Escape LIKE wildcards so user text is matched literally. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (m) => `\\${m}`);
}
