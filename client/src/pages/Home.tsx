import clsx from 'clsx';
import { ArrowRight, MapPin, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTitle } from '../components/Layout';
import { FeaturedRow, NoticeItem } from '../components/SchemeCards';
import { CategoryIcon, categoryStyle, ErrorState, Skeleton } from '../components/ui';
import { useI18n } from '../i18n';
import { HeroLandscape } from '../illustrations/HeroLandscape';
import { usePrefs } from '../lib/prefs';
import { useFeatured, useMeta, useNotices } from '../lib/queries';

const QUICK_CATEGORIES = ['agriculture', 'education', 'health', 'housing', 'pensions', 'employment'];

export function HomePage() {
  const { t } = useI18n();
  useTitle(t('nav.home'));
  const navigate = useNavigate();
  const { mandal, mandalSlug } = usePrefs();
  const meta = useMeta();
  const featured = useFeatured(mandalSlug ?? undefined);
  const notices = useNotices(3);
  const [q, setQ] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    navigate(`/schemes${params.toString() ? `?${params}` : ''}`);
  };

  const categories = (meta.data?.categories ?? []).filter((c) => QUICK_CATEGORIES.includes(c.slug));

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-navy-900 text-white" aria-labelledby="hero-title">
        <HeroLandscape className="absolute inset-0 -z-10 h-full w-full" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/90 via-navy-900/55 to-transparent" aria-hidden="true" />
        <div className="page py-12 sm:py-16 lg:py-20">
          <h1 id="hero-title" className="max-w-xl text-3xl font-extrabold leading-tight tracking-tight drop-shadow sm:text-4xl lg:text-[2.75rem]">
            {t('home.heroTitle1')}
            <br />
            {t('home.heroTitle2')}
          </h1>
          <p className="mt-4 max-w-lg text-base text-white/90 sm:text-lg">{t('home.heroText')}</p>
          <form role="search" onSubmit={submit} className="mt-7 flex max-w-xl items-center gap-2 rounded-xl bg-white p-1.5 shadow-lift">
            <label htmlFor="hero-search" className="sr-only">
              {t('nav.search')}
            </label>
            <Search className="ml-2 h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
            <input
              id="hero-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('home.searchPlaceholder')}
              className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-0"
              maxLength={120}
            />
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">
              <Search className="h-4 w-4 sm:hidden" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{t('home.searchButton')}</span>
            </button>
          </form>
          {mandal && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5 text-sm text-white/90 backdrop-blur-sm">
              <MapPin className="h-4 w-4 text-amber-300" aria-hidden="true" />
              <span>
                {t('home.showingFor')}: <strong className="font-semibold">{mandal.name} Mandal</strong>, {mandal.district}
              </span>
            </p>
          )}
        </div>
      </section>

      {/* Quick links */}
      <section aria-labelledby="cat-title" className="page -mt-0 pt-8">
        <h2 id="cat-title" className="sr-only">
          {t('home.categories')}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {meta.isLoading &&
            QUICK_CATEGORIES.map((c) => (
              <li key={c}>
                <Skeleton className="h-28" />
              </li>
            ))}
          {categories.map((c) => {
            const s = categoryStyle(c.color);
            return (
              <li key={c.slug}>
                <Link
                  to={`/schemes?category=${c.slug}`}
                  className={clsx(
                    'group flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-surface-line px-3 py-5 text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-lift',
                    s.soft,
                  )}
                >
                  <CategoryIcon icon={c.icon} color={c.color} size="lg" className="transition group-hover:scale-105" />
                  <span className={clsx('text-sm font-semibold', s.text)}>{c.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Featured + notices */}
      <section className="page grid grid-cols-1 gap-6 py-8 lg:grid-cols-2">
        <div className="card min-w-0 p-5" aria-labelledby="featured-title">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="featured-title" className="section-title">
              {t('home.featured')}
            </h2>
            <Link to="/schemes" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              {t('home.viewAll')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {featured.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : featured.isError ? (
            <ErrorState onRetry={() => featured.refetch()} />
          ) : featured.data?.items.length ? (
            <ul className="space-y-3">
              {featured.data.items.map((s) => (
                <FeaturedRow key={s.id} scheme={s} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">{t('home.noFeatured')}</p>
          )}
        </div>

        <div className="card min-w-0 p-5" aria-labelledby="notices-title">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="notices-title" className="section-title">
              {t('home.notices')}
            </h2>
            <Link to="/notices" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              {t('home.viewAll')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {notices.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : notices.isError ? (
            <ErrorState onRetry={() => notices.refetch()} />
          ) : notices.data?.items.length ? (
            <ul className="divide-y divide-surface-line">
              {notices.data.items.map((n) => (
                <NoticeItem key={n.id} notice={n} compact />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">{t('home.noNotices')}</p>
          )}
        </div>
      </section>
    </>
  );
}
