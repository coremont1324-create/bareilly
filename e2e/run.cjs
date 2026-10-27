/**
 * End-to-end browser checks (Playwright library, no test runner needed).
 *   BASE_URL=http://localhost:4000 ADMIN_EMAIL=… ADMIN_PASSWORD=… node e2e/run.cjs
 * Requires a running server with seeded demo data and an admin account.
 * Creates uniquely named records and archives them at the end, so it can be re-run.
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.BASE_URL || 'http://localhost:4000';
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const SHOTS = path.join(__dirname, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`  ✗ ${name}\n    ${String(err && err.message).split('\n').join('\n    ')}`);
  }
}

(async () => {
  if (!EMAIL || !PASSWORD) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
    // 4xx responses are expected in negative tests (401 sign-in check, 404 page, 400 validation).
  page.on('console', (m) => m.type() === 'error' && !/status of 4\d\d/.test(m.text()) && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  const failedRequests = [];
  page.on('response', (r) => {
    if (r.url().includes('/api/') && r.status() >= 500) failedRequests.push(`${r.status()} ${r.url()}`);
  });
  const stamp = Date.now().toString(36);
  const schemeName = `E2E Test Scheme ${stamp}`;

  console.log('Public site');
  await step('home renders hero, categories, featured schemes and notices from the API', async () => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: /Government Schemes/ }).waitFor();
    assert.equal(await page.locator('a[href^="/schemes?category="]').count(), 6);
    await page.getByRole('heading', { name: 'Featured Schemes' }).waitFor();
    assert.ok((await page.locator('a[href^="/schemes/"]').count()) >= 3);
    await page.screenshot({ path: path.join(SHOTS, 'desktop-home.png'), fullPage: true });
  });

  await step('hero search navigates to matching results (case/spacing insensitive)', async () => {
    await page.locator('#hero-search').fill('  PM   kisan ');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.waitForURL(/\/schemes\?q=/);
    await page.getByRole('link', { name: 'PM-KISAN Samman Nidhi' }).first().waitFor();
  });

  await step('category quick link opens a pre-filtered listing', async () => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.locator('a[href="/schemes?category=health"]').click();
    await page.waitForURL(/category=health/);
    await page.getByText(/1 scheme found/).waitFor();
    assert.equal(await page.locator('article').count(), 1);
  });

  await step('filters combine, show an empty state, and reset', async () => {
    await page.goto(BASE + '/schemes', { waitUntil: 'networkidle' });
    await page.getByLabel('Status').selectOption('tbc');
    await page.waitForURL(/status=tbc/);
    await page.getByText(/2 schemes found/).waitFor();
    await page.getByLabel('Category', { exact: true }).selectOption('agriculture');
    await page.getByText('No schemes match your filters').waitFor();
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await page.getByText(/4 schemes found|[0-9]+ schemes found/).waitFor();
    assert.ok(!page.url().includes('status='));
    await page.screenshot({ path: path.join(SHOTS, 'desktop-schemes.png'), fullPage: true });
  });

  await step('scheme details page shows structured sections and safe external links', async () => {
    await page.goto(BASE + '/schemes', { waitUntil: 'networkidle' });
    const card = page.locator('article', { hasText: 'PM-KISAN Samman Nidhi' });
    await card.getByRole('link', { name: 'View details' }).click();
    await page.waitForURL(/\/schemes\/pm-kisan-samman-nidhi/);
    await page.getByRole('heading', { level: 1, name: 'PM-KISAN Samman Nidhi' }).waitFor();
    for (const h of ['Overview', 'Eligibility', 'Benefits', 'Required Documents', 'How to Apply', 'Help & Support', 'Updates']) {
      await page.getByRole('heading', { level: 2, name: h }).waitFor();
    }
    const ext = page.getByRole('link', { name: /Go to Official Site/ }).first();
    assert.equal(await ext.getAttribute('target'), '_blank');
    assert.match(await ext.getAttribute('rel'), /noopener/);
    assert.match(await ext.getAttribute('href'), /^https:\/\/pmkisan\.gov\.in/);
    assert.equal(await page.title(), 'PM-KISAN Samman Nidhi | Mandal Schemes Portal');
    await page.screenshot({ path: path.join(SHOTS, 'desktop-detail.png'), fullPage: true });
  });

  await step('unverified links and details are labelled "To be confirmed"', async () => {
    await page.goto(BASE + '/schemes/post-matric-scholarship-for-scheduled-caste-students', { waitUntil: 'networkidle' });
    await page.getByText('Some details for this scheme are awaiting verification').waitFor();
    assert.equal(await page.getByRole('link', { name: /Go to Official Site/ }).count(), 0);
    await page.getByText(/To be confirmed — check the official website/).first().waitFor();
  });

  await step('unknown scheme shows a not-found state (HTTP 404)', async () => {
    const res = await page.goto(BASE + '/schemes/no-such-scheme', { waitUntil: 'networkidle' });
    assert.equal(res.status(), 404);
    await page.getByRole('heading', { name: 'Scheme not found' }).waitFor();
  });

  await step('language selector translates the interface (Hindi, Telugu)', async () => {
    await page.goto(BASE + '/help', { waitUntil: 'networkidle' });
    await page.locator('#help-lang').selectOption('hi');
    await page.getByRole('heading', { level: 1, name: 'सहायता और जानकारी' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'hi');
    await page.locator('#help-lang').selectOption('te');
    await page.getByRole('heading', { level: 1, name: 'సహాయం & సమాచారం' }).waitFor();
    await page.locator('#help-lang').selectOption('en');
    await page.getByRole('heading', { level: 1, name: 'Help & Information' }).waitFor();
  });

  await step('FAQ accordions are keyboard operable and searchable', async () => {
    const btn = page.getByRole('button', { name: 'How do I check deadlines?' });
    assert.equal(await btn.getAttribute('aria-expanded'), 'false');
    await btn.focus();
    await page.keyboard.press('Enter');
    assert.equal(await btn.getAttribute('aria-expanded'), 'true');
    await page.getByLabel('Search FAQs, guides, or topics...').fill('official link');
    await page.getByRole('button', { name: 'What if the official link is unavailable?' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'How do I find a scheme?' }).count(), 0);
    await page.screenshot({ path: path.join(SHOTS, 'desktop-help.png'), fullPage: true });
  });

  console.log('Admin area');
  await step('admin pages redirect to sign-in and reject wrong passwords', async () => {
    await page.goto(BASE + '/admin/schemes', { waitUntil: 'networkidle' });
    await page.waitForURL(/\/admin\/login\?next=/);
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill('definitely-wrong-123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('alert').getByText('Email or password is incorrect').waitFor();
  });

  await step('admin signs in and sees dashboard metrics', async () => {
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/admin\/schemes$/);
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await page.getByText('Total schemes').waitFor();
    await page.getByText('Awaiting verification').first().waitFor();
    await page.screenshot({ path: path.join(SHOTS, 'desktop-admin-dashboard.png'), fullPage: true });
  });

  let editorUrl = '';
  await step('create a draft; publish is blocked until the checklist is complete', async () => {
    await page.goto(BASE + '/admin/schemes/new', { waitUntil: 'networkidle' });
    await page.locator('#f-name').fill(schemeName);
    await page.getByRole('button', { name: 'Save as draft' }).click();
    await page.waitForURL(/\/admin\/schemes\/[0-9a-f-]{36}$/);
    editorUrl = page.url();
    await page.getByText('Draft saved.').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Publish' }).isDisabled(), true);
  });

  await step('client validation messages come back from the server for invalid input', async () => {
    await page.locator('#f-officialUrl').fill('javascript:alert(1)');
    await page.getByRole('button', { name: 'Save as draft' }).click();
    await page.getByText('Please correct the highlighted fields.').waitFor();
    await page.getByText('Enter a complete URL starting with https://').waitFor();
  });

  await step('complete the form and publish with "To be confirmed" acknowledgement', async () => {
    await page.locator('#f-officialUrl').fill('https://agriwelfare.gov.in/');
    await page.locator('#f-categoryId').selectOption({ label: 'Agriculture' });
    await page.locator('#f-departmentId').selectOption({ index: 1 });
    await page.locator('#f-applicationStatus').selectOption('year_round');
    await page.locator('#f-shortDescription').fill('End-to-end test scheme used to verify the publishing workflow.');
    await page.locator('#f-eligibility').fill('Test criterion one\nTest criterion two');
    await page.locator('#f-benefits').fill('Test benefit');
    await page.locator('#f-applicationSteps').fill('Step one\nStep two');
    await page.locator('details', { hasText: 'Help & Support' }).locator('summary').click();
    await page.locator('#f-helpNotes').fill('Contact the mandal office');
    await page.locator('#f-verificationSource').fill('E2E test source');
    await page.locator('#f-lastVerifiedOn').fill('2026-01-15');
    // Leave documents empty but mark them To be confirmed.
    await page.locator('details', { hasText: 'Required Documents' }).getByLabel(/To be confirmed/).check();
    await page.getByText('Ready to publish').waitFor();
    await page.screenshot({ path: path.join(SHOTS, 'desktop-admin-editor.png'), fullPage: true });
    await page.getByRole('button', { name: 'Publish' }).click();
    const dialog = page.getByRole('dialog', { name: /To be confirmed/ });
    await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Publish with labels' }).click();
    await page.getByText('Published — citizens can now see this scheme.').waitFor();
  });

  await step('published scheme is public and survives a page refresh', async () => {
    const pub = await ctx.newPage();
    await pub.goto(BASE + '/schemes?q=' + encodeURIComponent(stamp), { waitUntil: 'networkidle' });
    await pub.getByRole('link', { name: schemeName }).first().click();
    await pub.getByRole('heading', { level: 1, name: schemeName }).waitFor();
    await pub.reload({ waitUntil: 'networkidle' });
    await pub.getByRole('heading', { level: 1, name: schemeName }).waitFor();
    await pub.getByText(/To be confirmed — check the official website/).first().waitFor();
    await pub.close();
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('Unpublish').first().waitFor(); // still published after reload
  });

  await step('history tab records audit trail and verification', async () => {
    await page.getByRole('tab', { name: 'History & verification' }).click();
    await page.getByText(/publish by/i).waitFor();
    await page.getByText('Verified on 15 Jan 2026').waitFor();
    await page.getByRole('tab', { name: 'Scheme details' }).click();
  });

  await step('archive hides the scheme from citizens', async () => {
    await page.getByRole('button', { name: 'Archive' }).click();
    await page.getByRole('dialog', { name: 'Archive this scheme?' }).getByRole('button', { name: 'Archive' }).click();
    await page.getByText('Archived.').waitFor();
    const res = await page.request.get(BASE + '/api/schemes?q=' + encodeURIComponent(stamp));
    assert.equal((await res.json()).total, 0);
  });

  await step('notices can be created, published and appear publicly', async () => {
    const title = `E2E notice ${stamp}`;
    await page.goto(BASE + '/admin/notices', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Add notice' }).click();
    const d = page.getByRole('dialog', { name: 'Add notice' });
    await d.getByLabel('Title').fill(title);
    await d.getByLabel('Summary').fill('Notice created by the end-to-end test.');
    await d.getByLabel('Official notice link').fill('https://pmkisan.gov.in/');
    await d.getByRole('button', { name: 'Save' }).click();
    const item = page.locator('li', { hasText: title });
    await item.getByRole('button', { name: 'Publish' }).click();
    await page.getByText('Notice published.').waitFor();
    const pub = await ctx.newPage();
    await pub.goto(BASE + '/notices', { waitUntil: 'networkidle' });
    await pub.getByText(title).waitFor();
    await pub.close();
    await item.getByRole('button', { name: 'Archive' }).click();
    await page.getByText('Notice archived.').waitFor();
  });

  await step('admin preview renders drafts without publishing them', async () => {
    await page.goto(BASE + '/admin/schemes?status=draft', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /^Preview / }).first().click();
    await page.getByText('this is how citizens will see the scheme').waitFor();
    await page.screenshot({ path: path.join(SHOTS, 'desktop-admin-preview.png'), fullPage: true });
  });

  await step('sign out ends the session', async () => {
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Sign out' }).first().click();
    await page.waitForURL(/\/admin\/login/);
    const me = await page.request.get(BASE + '/api/auth/me');
    assert.equal(me.status(), 401);
  });

  console.log('Responsive layouts');
  for (const [w, label] of [
    [390, 'mobile'],
    [820, 'tablet'],
  ]) {
    await step(`${label} (${w}px): no horizontal overflow on public pages`, async () => {
      const p = await browser.newPage({ viewport: { width: w, height: 860 } });
      for (const url of ['/', '/schemes', '/schemes/pm-kisan-samman-nidhi', '/help', '/notices', '/admin/login']) {
        await p.goto(BASE + url, { waitUntil: 'networkidle' });
        const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(overflow <= 0, `${url} overflows by ${overflow}px`);
        await p.screenshot({ path: path.join(SHOTS, `${label}${url.replace(/\//g, '_') || '_home'}.png`), fullPage: true });
      }
      if (w < 1024) {
        await p.goto(BASE + '/', { waitUntil: 'networkidle' });
        await p.getByRole('button', { name: 'Menu' }).click();
        await p.locator('#mobile-menu').getByRole('link', { name: 'Schemes' }).click();
        await p.waitForURL(/\/schemes$/);
      }
      await p.close();
    });
  }

  await step('no console errors or failed API requests', async () => {
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(failedRequests, []);
  });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots: ${SHOTS}`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
