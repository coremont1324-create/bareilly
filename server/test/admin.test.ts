import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { completeScheme, EDITOR, H, ids, login, resetDatabase, SUPER } from './helpers';

let ctx: Awaited<ReturnType<typeof resetDatabase>>;
let i: Awaited<ReturnType<typeof ids>>;

beforeAll(async () => {
  ctx = await resetDatabase();
  i = await ids(ctx.pool);
});
afterAll(async () => ctx.pool.end());

describe('authentication', () => {
  it('rejects wrong passwords and unknown users with the same message', async () => {
    const a = await request(ctx.app).post('/api/auth/login').set(H).send({ email: SUPER.email, password: 'wrong-password-1' });
    const b = await request(ctx.app).post('/api/auth/login').set(H).send({ email: 'nobody@test.local', password: 'wrong-password-1' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  it('sets an httpOnly SameSite session cookie and stores only a token hash', async () => {
    const res = await request(ctx.app).post('/api/auth/login').set(H).send(SUPER);
    expect(res.status).toBe(200);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/msp_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    const token = /msp_session=([^;]+)/.exec(cookie)![1];
    const stored = await ctx.pool.query('SELECT id FROM sessions WHERE id = $1', [token]);
    expect(stored.rowCount).toBe(0);
    expect(res.body.user.passwordHash).toBeUndefined();
    const pw = await ctx.pool.query('SELECT password_hash FROM admin_users WHERE email = $1', [SUPER.email]);
    expect(pw.rows[0].password_hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('protects admin API endpoints, not just pages', async () => {
    for (const [method, url] of [
      ['get', '/api/admin/dashboard'],
      ['get', '/api/admin/schemes'],
      ['post', '/api/admin/schemes'],
      ['get', '/api/admin/users'],
      ['put', '/api/admin/settings'],
    ] as const) {
      const res = await request(ctx.app)[method](url).set(H).send({});
      expect(res.status, `${method} ${url}`).toBe(401);
    }
  });

  it('requires the CSRF header on state-changing requests', async () => {
    const agent = await login(ctx.app, SUPER);
    const res = await agent.post('/api/admin/schemes').send({ name: 'No header scheme' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF');
    const evil = await agent.post('/api/admin/schemes').set(H).set('Origin', 'https://evil.example').send({ name: 'Cross origin' });
    expect(evil.status).toBe(403);
  });

  it('logs out and invalidates the session', async () => {
    const agent = await login(ctx.app, EDITOR);
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    expect((await agent.post('/api/auth/logout').set(H)).status).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});

describe('authorization (roles enforced on the server)', () => {
  it('forbids editors from managing users and settings', async () => {
    const editor = await login(ctx.app, EDITOR);
    expect((await editor.get('/api/admin/users')).status).toBe(403);
    expect(
      (await editor.post('/api/admin/users').set(H).send({ email: 'x@test.local', name: 'X Person', role: 'super_admin', password: 'Password-12345' }))
        .status,
    ).toBe(403);
    expect((await editor.put('/api/admin/settings').set(H).send({ helpdesk: {}, officialDomains: ['gov.in'] })).status).toBe(403);
  });

  it('lets editors manage schemes', async () => {
    const editor = await login(ctx.app, EDITOR);
    const res = await editor.post('/api/admin/schemes').set(H).send({ name: 'Editor draft scheme' });
    expect(res.status).toBe(201);
    expect(res.body.publicationStatus).toBe('draft');
    expect(res.body.createdBy.name).toBe(EDITOR.name);
  });

  it('prevents self role change, self deactivation and removing the last super admin', async () => {
    const sup = await login(ctx.app, SUPER);
    const me = (await sup.get('/api/auth/me')).body.user;
    expect((await sup.patch(`/api/admin/users/${me.id}`).set(H).send({ role: 'editor' })).status).toBe(400);
    expect((await sup.patch(`/api/admin/users/${me.id}`).set(H).send({ isActive: false })).status).toBe(400);
  });

  it('creates users with validated passwords and deactivation revokes sessions', async () => {
    const sup = await login(ctx.app, SUPER);
    const weak = await sup.post('/api/admin/users').set(H).send({ email: 'new@test.local', name: 'New Person', role: 'editor', password: 'short' });
    expect(weak.status).toBe(400);
    const created = await sup.post('/api/admin/users').set(H).send({ email: 'New@Test.local', name: 'New Person', role: 'editor', password: 'Long-enough-123' });
    expect(created.status).toBe(201);
    expect(created.body.email).toBe('new@test.local');
    const dup = await sup.post('/api/admin/users').set(H).send({ email: 'new@test.local', name: 'Dup', role: 'editor', password: 'Long-enough-123' });
    expect(dup.status).toBe(409);
    const newbie = await login(ctx.app, { email: 'new@test.local', password: 'Long-enough-123' });
    await sup.patch(`/api/admin/users/${created.body.id}`).set(H).send({ isActive: false });
    expect((await newbie.get('/api/auth/me')).status).toBe(401);
    const relog = await request(ctx.app).post('/api/auth/login').set(H).send({ email: 'new@test.local', password: 'Long-enough-123' });
    expect(relog.status).toBe(401);
  });
});

describe('scheme lifecycle', () => {
  it('creates, edits, publishes, archives and restores a scheme with full audit trail', async () => {
    const agent = await login(ctx.app, SUPER);
    const created = await agent.post('/api/admin/schemes').set(H).send(completeScheme(i, { name: 'Lifecycle Scheme' }));
    expect(created.status).toBe(201);
    expect(created.body.slug).toBe('lifecycle-scheme');
    expect(created.body.checklist.canPublish).toBe(true);
    let s = created.body;

    // Drafts are invisible to citizens
    expect((await request(ctx.app).get('/api/schemes/lifecycle-scheme')).status).toBe(404);

    const edited = await agent
      .put(`/api/admin/schemes/${s.id}`)
      .set(H)
      .send({ ...completeScheme(i, { name: 'Lifecycle Scheme', benefits: ['Subsidy on equipment', 'Training'] }), version: s.version });
    expect(edited.status).toBe(200);
    expect(edited.body.version).toBe(s.version + 1);
    s = edited.body;

    const pub = await agent.post(`/api/admin/schemes/${s.id}/publish`).set(H).send({ version: s.version });
    expect(pub.status).toBe(200);
    expect(pub.body.publicationStatus).toBe('published');
    expect(pub.body.publishedAt).toBeTruthy();
    s = pub.body;

    const pubDetail = await request(ctx.app).get('/api/schemes/lifecycle-scheme');
    expect(pubDetail.status).toBe(200);
    expect(pubDetail.body.benefits).toEqual(['Subsidy on equipment', 'Training']);

    const arch = await agent.post(`/api/admin/schemes/${s.id}/archive`).set(H).send({ version: s.version });
    expect(arch.body.publicationStatus).toBe('archived');
    expect((await request(ctx.app).get('/api/schemes/lifecycle-scheme')).status).toBe(404);
    s = arch.body;

    const restored = await agent.post(`/api/admin/schemes/${s.id}/restore`).set(H).send({ version: s.version });
    expect(restored.body.publicationStatus).toBe('draft');

    const history = await agent.get(`/api/admin/schemes/${s.id}/history`);
    expect(history.body.audit.map((a: { action: string }) => a.action)).toEqual(['restore', 'archive', 'publish', 'update', 'create']);
    expect(history.body.verifications).toHaveLength(1);
    const update = history.body.audit.find((a: { action: string }) => a.action === 'update');
    expect(Object.keys(update.changes)).toEqual(['benefits']);
  });

  it('persists data across new connections (survives refresh/restart)', async () => {
    const { createPool } = await import('../src/db/pool');
    const { TEST_DB_URL } = await import('./helpers');
    const fresh = createPool(TEST_DB_URL);
    const { rows } = await fresh.query(`SELECT publication_status FROM schemes WHERE slug = 'lifecycle-scheme'`);
    await fresh.end();
    expect(rows[0].publication_status).toBe('draft');
  });

  it('generates audit timestamps on the server and ignores client-supplied metadata', async () => {
    const agent = await login(ctx.app, SUPER);
    const res = await agent
      .post('/api/admin/schemes')
      .set(H)
      .send({ name: 'Timestamp Scheme', createdAt: '1999-01-01T00:00:00Z', updatedAt: '1999-01-01T00:00:00Z', createdBy: 'someone', publicationStatus: 'published', version: 99 });
    expect(res.status).toBe(201);
    expect(res.body.createdAt.startsWith('1999')).toBe(false);
    expect(Date.now() - Date.parse(res.body.createdAt)).toBeLessThan(60_000);
    expect(res.body.publicationStatus).toBe('draft');
    expect(res.body.version).toBe(1);
    expect(res.body.createdBy.name).toBe(SUPER.name);
  });

  it('blocks publishing incomplete schemes but allows saving them as drafts', async () => {
    const agent = await login(ctx.app, SUPER);
    const draft = await agent.post('/api/admin/schemes').set(H).send({ name: 'Incomplete Scheme', shortDescription: 'Too short' });
    expect(draft.status).toBe(201);
    const pub = await agent.post(`/api/admin/schemes/${draft.body.id}/publish`).set(H).send({ version: draft.body.version });
    expect(pub.status).toBe(422);
    expect(pub.body.error.code).toBe('CHECKLIST_INCOMPLETE');
    const missing = pub.body.error.details.checklist.missing.map((m: { key: string }) => m.key);
    expect(missing).toEqual(expect.arrayContaining(['short_description', 'category', 'eligibility', 'last_verified', 'verification_source']));
  });

  it('requires acknowledgement before publishing To-be-confirmed details', async () => {
    const agent = await login(ctx.app, SUPER);
    const body = completeScheme(i, { name: 'TBC Scheme', requiredDocuments: [], tbcFields: ['required_documents'] });
    const created = await agent.post('/api/admin/schemes').set(H).send(body);
    const noAck = await agent.post(`/api/admin/schemes/${created.body.id}/publish`).set(H).send({ version: created.body.version });
    expect(noAck.status).toBe(422);
    expect(noAck.body.error.code).toBe('TBC_ACK_REQUIRED');
    const ack = await agent.post(`/api/admin/schemes/${created.body.id}/publish`).set(H).send({ version: created.body.version, acknowledgeTbc: true });
    expect(ack.status).toBe(200);
    const pub = await request(ctx.app).get('/api/schemes/tbc-scheme');
    expect(pub.body.tbcFields).toContain('required_documents');
  });

  it('rejects non-official links for publishing and never shows them publicly', async () => {
    const agent = await login(ctx.app, SUPER);
    const created = await agent
      .post('/api/admin/schemes')
      .set(H)
      .send(completeScheme(i, { name: 'Bad Link Scheme', officialUrl: 'https://example.com/scheme', applicationUrl: null }));
    const item = created.body.checklist.items.find((x: { key: string }) => x.key === 'official_link');
    expect(item.state).toBe('missing');
    const pub = await agent.post(`/api/admin/schemes/${created.body.id}/publish`).set(H).send({ version: created.body.version });
    expect(pub.status).toBe(422);
  });

  it('keeps published schemes complete on edit', async () => {
    const agent = await login(ctx.app, SUPER);
    const created = await agent.post('/api/admin/schemes').set(H).send(completeScheme(i, { name: 'Guarded Scheme' }));
    const pub = await agent.post(`/api/admin/schemes/${created.body.id}/publish`).set(H).send({ version: created.body.version });
    const bad = await agent
      .put(`/api/admin/schemes/${created.body.id}`)
      .set(H)
      .send({ ...completeScheme(i, { name: 'Guarded Scheme', eligibility: [] }), version: pub.body.version });
    expect(bad.status).toBe(422);
  });

  it('detects concurrent edits with version numbers', async () => {
    const agent = await login(ctx.app, SUPER);
    const created = await agent.post('/api/admin/schemes').set(H).send({ name: 'Concurrent Scheme' });
    const first = await agent.put(`/api/admin/schemes/${created.body.id}`).set(H).send({ name: 'Concurrent Scheme A', version: 1 });
    expect(first.status).toBe(200);
    const stale = await agent.put(`/api/admin/schemes/${created.body.id}`).set(H).send({ name: 'Concurrent Scheme B', version: 1 });
    expect(stale.status).toBe(409);
  });

  it('validates inputs', async () => {
    const agent = await login(ctx.app, SUPER);
    const cases = [
      { name: 'ab' },
      { name: 'Valid name', officialUrl: 'javascript:alert(1)' },
      { name: 'Valid name', deadline: '31-12-2026' },
      { name: 'Valid name', applicationStatus: 'maybe' },
      { name: 'Valid name', helpEmail: 'not-an-email' },
      { name: 'Valid name', tbcFields: ['nonsense'] },
    ];
    for (const body of cases) {
      const res = await agent.post('/api/admin/schemes').set(H).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    const badRef = await agent.post('/api/admin/schemes').set(H).send({ name: 'Bad ref', categoryId: 999999 });
    expect(badRef.status).toBe(400);
    const badJson = await agent.post('/api/admin/schemes').set(H).set('Content-Type', 'application/json').send('{bad');
    expect(badJson.status).toBe(400);
    expect((await agent.get('/api/admin/schemes/not-a-uuid')).status).toBe(404);
  });

  it('rejects illegal lifecycle transitions', async () => {
    const agent = await login(ctx.app, SUPER);
    const created = await agent.post('/api/admin/schemes').set(H).send({ name: 'Transition Scheme' });
    const res = await agent.post(`/api/admin/schemes/${created.body.id}/restore`).set(H).send({ version: created.body.version });
    expect(res.status).toBe(409);
  });
});

describe('notices management', () => {
  it('creates, edits, publishes and archives notices', async () => {
    const agent = await login(ctx.app, EDITOR);
    const scheme = (await ctx.pool.query(`SELECT id FROM schemes WHERE slug = 'pm-kisan-samman-nidhi'`)).rows[0].id;
    const created = await agent.post('/api/admin/notices').set(H).send({
      title: 'Test notice for farmers',
      summary: 'A short summary of the notice for testing.',
      publishedOn: '2026-01-10',
      deadline: '2099-01-01',
      schemeId: scheme,
      officialUrl: 'https://pmkisan.gov.in/',
    });
    expect(created.status).toBe(201);
    expect(created.body.publicationStatus).toBe('draft');
    let list = await request(ctx.app).get('/api/notices').query({ limit: 50 });
    expect(list.body.items.some((n: { title: string }) => n.title === 'Test notice for farmers')).toBe(false);

    const pub = await agent.post(`/api/admin/notices/${created.body.id}/publish`).set(H).send({ version: created.body.version });
    expect(pub.status).toBe(200);
    list = await request(ctx.app).get('/api/notices').query({ limit: 50 });
    const n = list.body.items.find((x: { title: string }) => x.title === 'Test notice for farmers');
    expect(n.scheme.slug).toBe('pm-kisan-samman-nidhi');
    expect(n.deadline).toBe('2099-01-01');

    const edited = await agent
      .put(`/api/admin/notices/${created.body.id}`)
      .set(H)
      .send({ title: 'Test notice for farmers (updated)', summary: 'Updated summary text.', publishedOn: '2026-01-10', version: pub.body.version });
    expect(edited.status).toBe(200);

    const arch = await agent.post(`/api/admin/notices/${created.body.id}/archive`).set(H).send({ version: edited.body.version });
    expect(arch.body.publicationStatus).toBe('archived');
    list = await request(ctx.app).get('/api/notices').query({ limit: 50 });
    expect(list.body.items.some((x: { id: string }) => x.id === created.body.id)).toBe(false);
  });

  it('rejects non-official notice links and invalid dates', async () => {
    const agent = await login(ctx.app, EDITOR);
    const bad = await agent.post('/api/admin/notices').set(H).send({ title: 'Bad link notice', publishedOn: '2026-01-10', officialUrl: 'https://example.com' });
    expect(bad.status).toBe(422);
    const badDate = await agent.post('/api/admin/notices').set(H).send({ title: 'Bad date notice', publishedOn: 'yesterday' });
    expect(badDate.status).toBe(400);
  });

  it('does not show future-dated notices yet', async () => {
    const agent = await login(ctx.app, EDITOR);
    const c = await agent.post('/api/admin/notices').set(H).send({ title: 'Future notice title', summary: 'Will appear later on.', publishedOn: '2099-01-01' });
    await agent.post(`/api/admin/notices/${c.body.id}/publish`).set(H).send({ version: c.body.version });
    const list = await request(ctx.app).get('/api/notices').query({ limit: 50 });
    expect(list.body.items.some((x: { id: string }) => x.id === c.body.id)).toBe(false);
  });
});

describe('dashboard, settings and offices', () => {
  it('computes metrics from stored data', async () => {
    const agent = await login(ctx.app, EDITOR);
    const res = await agent.get('/api/admin/dashboard');
    const { rows } = await ctx.pool.query(
      `SELECT count(*)::int total, count(*) FILTER (WHERE publication_status='published')::int published,
              count(*) FILTER (WHERE publication_status='draft')::int draft, count(*) FILTER (WHERE publication_status='archived')::int archived
         FROM schemes`,
    );
    expect(res.body.totals).toMatchObject(rows[0]);
    expect(res.body.totals.upcomingDeadlines).toBe(0);
    expect(res.body.totals.awaitingVerification).toBeGreaterThan(0);
    expect(res.body.recentActivity.length).toBeGreaterThan(0);
  });

  it('only publishes help desk details once marked verified', async () => {
    const sup = await login(ctx.app, SUPER);
    const settings = (await sup.get('/api/admin/settings')).body;
    const unverified = { ...settings, helpdesk: { phone: '0000 000 000', email: 'help@example.org', hours: 'Mon–Fri', verified: false } };
    expect((await sup.put('/api/admin/settings').set(H).send(unverified)).status).toBe(200);
    expect((await request(ctx.app).get('/api/meta')).body.helpdesk).toBeNull();
    const verified = { ...unverified, helpdesk: { ...unverified.helpdesk, verified: true } };
    await sup.put('/api/admin/settings').set(H).send(verified);
    expect((await request(ctx.app).get('/api/meta')).body.helpdesk.email).toBe('help@example.org');
    const invalid = await sup.put('/api/admin/settings').set(H).send({ ...settings, officialDomains: ['not a domain'] });
    expect(invalid.status).toBe(400);
  });

  it('saves mandal offices and exposes only verified ones', async () => {
    const sup = await login(ctx.app, SUPER);
    await sup.put(`/api/admin/offices/${i.mandal}`).set(H).send({ officeName: 'Kallur Mandal Office', address: 'Test address', isVerified: false });
    expect((await request(ctx.app).get('/api/offices/kallur')).body.office).toBeNull();
    await sup.put(`/api/admin/offices/${i.mandal}`).set(H).send({ officeName: 'Kallur Mandal Office', address: 'Test address', isVerified: true, source: 'Test' });
    expect((await request(ctx.app).get('/api/offices/kallur')).body.office.officeName).toBe('Kallur Mandal Office');
  });
});
