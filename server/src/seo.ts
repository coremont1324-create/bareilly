import fs from 'node:fs';
import path from 'node:path';
import type { Express, Request, Response } from 'express';
import express from 'express';
import type pg from 'pg';
import { config } from './config';
import { HttpError } from './lib/errors';
import { getPublicScheme, listPublishedSlugs } from './services/schemes';

const SITE = 'Mandal Schemes Portal';
const DEFAULT_DESC =
  'Find government welfare schemes available in your mandal — eligibility, benefits, documents and links to official application websites.';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

interface PageMeta {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  jsonLd?: unknown;
  status?: number;
}

const STATIC_PAGES: Record<string, Omit<PageMeta, 'path'>> = {
  '/': { title: `${SITE} — Government schemes for your mandal`, description: DEFAULT_DESC },
  '/schemes': { title: `Schemes | ${SITE}`, description: 'Search and filter government schemes by category, department, eligibility and status.' },
  '/notices': { title: `Latest notices | ${SITE}`, description: 'Latest application notices and updates for government schemes.' },
  '/help': { title: `Help & Information | ${SITE}`, description: 'FAQs, how to apply, mandal office contacts, accessibility and language options.' },
};

function render(template: string, meta: PageMeta): string {
  const url = `${config.publicBaseUrl}${meta.path}`;
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    meta.noindex ? `<meta name="robots" content="noindex, nofollow" />` : '',
    meta.jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`
      : '',
  ]
    .filter(Boolean)
    .join('\n    ');
  return template.replace(/<title>[\s\S]*?<\/title>/, '').replace('<!--app-head-->', tags);
}

async function metaFor(pool: pg.Pool, req: Request): Promise<PageMeta> {
  const p = req.path.replace(/\/+$/, '') || '/';
  if (p.startsWith('/admin')) return { title: `Admin | ${SITE}`, description: DEFAULT_DESC, path: p, noindex: true };
  const known = STATIC_PAGES[p];
  if (known) return { ...known, path: p };
  const m = /^\/schemes\/([a-z0-9-]{1,100})$/.exec(p);
  if (m) {
    try {
      const s = await getPublicScheme(pool, m[1]);
      return {
        title: `${s.name} | ${SITE}`,
        description: s.shortDescription || DEFAULT_DESC,
        path: p,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'GovernmentService',
          name: s.name,
          description: s.shortDescription,
          serviceType: s.category?.name,
          provider: s.department ? { '@type': 'GovernmentOrganization', name: s.department } : undefined,
          url: s.officialLink?.url,
          areaServed: 'IN',
        },
      };
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        return { title: `Scheme not found | ${SITE}`, description: DEFAULT_DESC, path: p, noindex: true, status: 404 };
      }
      throw err;
    }
  }
  return { title: `Page not found | ${SITE}`, description: DEFAULT_DESC, path: p, noindex: true, status: 404 };
}

export function mountClient(app: Express, pool: pg.Pool): void {
  const indexPath = path.join(config.clientDist, 'index.html');
  if (!fs.existsSync(indexPath)) {
    app.get('/', (_req, res) =>
      res.type('text').send('API is running. Build the client (npm run build) or use the Vite dev server on port 5173.'),
    );
    return;
  }
  const template = fs.readFileSync(indexPath, 'utf8');

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /api/admin\nSitemap: ${config.publicBaseUrl}/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', async (_req, res, next) => {
    try {
      const slugs = await listPublishedSlugs(pool);
      const urls = [
        ...Object.keys(STATIC_PAGES).map((p) => `<url><loc>${esc(config.publicBaseUrl + p)}</loc></url>`),
        ...slugs.map(
          (s) => `<url><loc>${esc(`${config.publicBaseUrl}/schemes/${s.slug}`)}</loc><lastmod>${s.updatedAt.slice(0, 10)}</lastmod></url>`,
        ),
      ];
      res
        .type('application/xml')
        .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
    } catch (err) {
      next(err);
    }
  });

  app.use(
    '/assets',
    express.static(path.join(config.clientDist, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }),
  );
  app.use(express.static(config.clientDist, { index: false, maxAge: '1h' }));

  app.get('*', async (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api/')) return next();
    try {
      const meta = await metaFor(pool, req);
      res.status(meta.status ?? 200).type('html').setHeader('Cache-Control', 'no-cache').send(render(template, meta));
    } catch (err) {
      next(err);
    }
  });
}
