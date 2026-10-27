import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { completeScheme, ids, login, resetDatabase, SUPER, H } from './helpers';

let ctx: Awaited<ReturnType<typeof resetDatabase>>;

beforeAll(async () => {
  ctx = await resetDatabase();
  // Add extra published schemes so pagination and filters have something to work with.
  const i = await ids(ctx.pool);
  const agent = await login(ctx.app, SUPER);
  for (let n = 1; n <= 7; n++) {
    const body = completeScheme(i, {
      name: `Pagination Test Scheme ${n}`,
      categoryId: n % 2 ? i.agriculture : i.education,
      mandalIds: n === 7 ? [i.otherMandal] : [i.mandal],
      applicationStatus: n === 3 ? 'year_round' : 'open',
      deadline: n === 5 ? '2020-01-01' : '2099-12-31',
    });
    const created = await agent.post('/api/admin/schemes').set(H).send(body);
    expect(created.status).toBe(201);
    const pub = await agent.post(`/api/admin/schemes/${created.body.id}/publish`).set(H).send({ version: created.body.version });
    expect(pub.status).toBe(200);
  }
});
afterAll(async () => ctx.pool.end());

describe('public scheme search', () => {
  it.each(['pm kisan', 'PM-KISAN', '  PM   Kisan ', 'pmkisan', 'PMKisan', 'Kisan Samman'])('finds PM-KISAN for "%s"', async (q) => {
    const res = await request(ctx.app).get('/api/schemes').query({ q });
    expect(res.status).toBe(200);
    expect(res.body.items.map((s: { slug: string }) => s.slug)).toContain('pm-kisan-samman-nidhi');
  });

  it('tolerates a small misspelling', async () => {
    const res = await request(ctx.app).get('/api/schemes').query({ q: 'ayushmaan bharat' });
    expect(res.body.items[0]?.name).toMatch(/Ayushman/);
  });

  it('treats LIKE wildcards literally', async () => {
    const res = await request(ctx.app).get('/api/schemes').query({ q: '%%%' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it('returns an empty result for unknown terms', async () => {
    const res = await request(ctx.app).get('/api/schemes').query({ q: 'zzzz-no-such-scheme' });
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});

describe('filters, sorting and pagination', () => {
  it('filters by category', async () => {
    const res = await request(ctx.app).get('/api/schemes').query({ category: 'health' });
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((s: { category: { slug: string } }) => s.category.slug === 'health')).toBe(true);
  });

  it('combines category + status + search', async () => {
    const res = await request(ctx.app).get('/api/schemes').query({ category: 'agriculture', status: 'open', q: 'pagination', pageSize: 50 });
    const names = res.body.items.map((s: { name: string }) => s.name);
    expect(names.length).toBeGreaterThan(0);
    for (const s of res.body.items) {
      expect(s.category.slug).toBe('agriculture');
      expect(s.applicationStatus).toBe('open');
    }
  });

  it('shows an open scheme with a past deadline as closed', async () => {
    const res = await request(ctx.app).get('/api/schemes').query({ q: 'pagination test scheme 5' });
    const s = res.body.items.find((x: { name: string }) => x.name === 'Pagination Test Scheme 5');
    expect(s.applicationStatus).toBe('closed');
    const open = await request(ctx.app).get('/api/schemes').query({ status: 'open', pageSize: 50 });
    expect(open.body.items.some((x: { name: string }) => x.name === 'Pagination Test Scheme 5')).toBe(false);
  });

  it('filters by eligibility group and department', async () => {
    const g = await request(ctx.app).get('/api/schemes').query({ group: 'students' });
    expect(g.body.items.map((s: { name: string }) => s.name)).toContain('Post Matric Scholarship for Scheduled Caste Students');
    const meta = await request(ctx.app).get('/api/meta');
    const dept = meta.body.departments.find((d: { name: string }) => d.name.startsWith('Ministry of Health'));
    const d = await request(ctx.app).get('/api/schemes').query({ department: dept.id });
    expect(d.body.items.every((s: { department: string }) => s.department === dept.name)).toBe(true);
  });

  it('restricts to schemes available in the selected mandal', async () => {
    const res = await request(ctx.app).get('/api/schemes').query({ mandal: 'kallur', availableOnly: '1', pageSize: 50 });
    const names = res.body.items.map((s: { name: string }) => s.name);
    expect(names).toContain('Pagination Test Scheme 1');
    expect(names).not.toContain('Pagination Test Scheme 7'); // only in Gudur
    expect(names).toContain('PM-KISAN Samman Nidhi'); // available in all mandals
  });

  it('paginates consistently', async () => {
    const p1 = await request(ctx.app).get('/api/schemes').query({ pageSize: 4, page: 1, sort: 'name' });
    const p2 = await request(ctx.app).get('/api/schemes').query({ pageSize: 4, page: 2, sort: 'name' });
    expect(p1.body.total).toBe(11);
    expect(p1.body.totalPages).toBe(3);
    expect(p1.body.items).toHaveLength(4);
    const overlap = p1.body.items.filter((a: { id: string }) => p2.body.items.some((b: { id: string }) => b.id === a.id));
    expect(overlap).toHaveLength(0);
    const sorted = [...p1.body.items.map((s: { name: string }) => s.name)].sort((a, b) => a.localeCompare(b));
    expect(p1.body.items.map((s: { name: string }) => s.name)).toEqual(sorted);
  });

  it('returns category facets that ignore the active category', async () => {
    const res = await request(ctx.app).get('/api/schemes').query({ category: 'health' });
    expect(res.body.facets.categories.agriculture).toBeGreaterThan(1);
    expect(res.body.facets.all).toBe(11);
  });

  it('rejects invalid query parameters', async () => {
    expect((await request(ctx.app).get('/api/schemes').query({ status: 'bogus' })).status).toBe(400);
    expect((await request(ctx.app).get('/api/schemes').query({ pageSize: 1000 })).status).toBe(400);
  });
});

describe('scheme details and data integrity', () => {
  it('returns structured details for a published scheme', async () => {
    const res = await request(ctx.app).get('/api/schemes/pm-kisan-samman-nidhi').query({ mandal: 'kallur' });
    expect(res.status).toBe(200);
    expect(res.body.eligibility.length).toBeGreaterThan(0);
    expect(res.body.benefits).toContain('Paid in three equal instalments of ₹2,000 each.');
    expect(res.body.officialLink).toEqual({ url: 'https://pmkisan.gov.in/', host: 'pmkisan.gov.in' });
    expect(res.body.availableInMandal).toBe(true);
    expect(res.body.isDemo).toBe(true);
    expect(res.body.notices.length).toBeGreaterThan(0);
  });

  it('never exposes links marked To be confirmed or required details as confirmed', async () => {
    const res = await request(ctx.app).get('/api/schemes').query({ q: 'ayushman' });
    const s = res.body.items[0];
    expect(s.applicationLink).toBeNull(); // application_link flagged TBC
    expect(s.officialLink.host).toBe('pmjay.gov.in');
    const pmay = await request(ctx.app).get('/api/schemes').query({ q: 'pmay-g' });
    expect(pmay.body.items[0].deadline).toBeNull();
    expect(pmay.body.items[0].deadlineTbc).toBe(true);
    expect(pmay.body.items[0].applicationStatus).toBe('tbc');
  });

  it('hides drafts from listings and detail pages', async () => {
    const list = await request(ctx.app).get('/api/schemes').query({ q: 'rural employment guarantee' });
    expect(list.body.total).toBe(0);
    const detail = await request(ctx.app).get('/api/schemes/rural-employment-guarantee-draft-awaiting-verification');
    expect(detail.status).toBe(404);
  });

  it('returns 404 for unknown schemes and rejects malformed slugs', async () => {
    expect((await request(ctx.app).get('/api/schemes/does-not-exist')).status).toBe(404);
    expect((await request(ctx.app).get('/api/schemes/BAD_SLUG!')).status).toBe(400);
  });

  it('returns featured schemes and notices from the database', async () => {
    const f = await request(ctx.app).get('/api/schemes/featured').query({ limit: 3, mandal: 'kallur' });
    expect(f.body.items).toHaveLength(3);
    expect(f.body.items.every((s: { isFeatured: boolean }) => s.isFeatured)).toBe(true);
    const n = await request(ctx.app).get('/api/notices').query({ limit: 5 });
    expect(n.body.items.length).toBe(3);
    expect(n.body.items[0].publishedOn >= n.body.items[1].publishedOn).toBe(true);
  });

  it('exposes meta with categories, mandals and no unverified helpdesk', async () => {
    const res = await request(ctx.app).get('/api/meta');
    expect(res.body.categories.map((c: { slug: string }) => c.slug)).toContain('agriculture');
    expect(res.body.mandals.length).toBe(8);
    expect(res.body.helpdesk).toBeNull();
    expect(res.body.defaultMandalSlug).toBe('kurnool-urban');
  });

  it('only returns verified mandal office contacts', async () => {
    const res = await request(ctx.app).get('/api/offices/kallur');
    expect(res.body.office).toBeNull();
  });

  it('returns JSON 404 for unknown API routes', async () => {
    const res = await request(ctx.app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
