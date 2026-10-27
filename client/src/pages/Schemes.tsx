import clsx from 'clsx';
import { ChevronDown, LayoutGrid, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTitle } from '../components/Layout';
import { SchemeListCard } from '../components/SchemeCards';
import { categoryIconComponent, EmptyState, ErrorState, Pagination, Skeleton } from '../components/ui';
import { useI18n } from '../i18n';
import { FarmerScene } from '../illustrations/Scenes';
import { usePrefs } from '../lib/prefs';
import { useMeta, useSchemes } from '../lib/queries';

const FILTER_KEYS = ['q', 'category', 'department', 'group', 'status', 'sort', 'page', 'allMandals'] as const;

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input appearance-none py-2 pr-9">
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
      </div>
    </div>
  );
}

export function SchemesPage() {
  const { t } = useI18n();
  useTitle(t('schemes.title'));
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const meta = useMeta();
  const { mandal, mandalSlug } = usePrefs();
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const [showFilters, setShowFilters] = useState(false);

  const get = (k: (typeof FILTER_KEYS)[number]) => params.get(k) ?? '';
  const page = Math.max(1, Number(get('page')) || 1);
  const availableOnly = get('allMandals') !== '1';
  const [qInput, setQInput] = useState(get('q'));

  useEffect(() => setQInput(get('q')), [params]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if ((location.state as { focusSearch?: boolean } | null)?.focusSearch) searchRef.current?.focus();
  }, [location.state]);

  const update = (patch: Partial<Record<(typeof FILTER_KEYS)[number], string>>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (resetPage && !('page' in patch)) next.delete('page');
    setParams(next, { replace: false });
  };

  // Debounce typing into the URL so results update as the user types.
  useEffect(() => {
    if (qInput === get('q')) return;
    const id = window.setTimeout(() => update({ q: qInput.trim() ? qInput : '' }), 350);
    return () => window.clearTimeout(id);
  }, [qInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const filters = {
    q: get('q'),
    category: get('category'),
    department: get('department'),
    group: get('group'),
    status: get('status'),
    sort: get('sort'),
    page,
    mandal: mandalSlug ?? undefined,
    availableOnly: Boolean(mandalSlug) && availableOnly,
  };
  const list = useSchemes(filters);
  const hasFilters = FILTER_KEYS.some((k) => k !== 'page' && k !== 'sort' && get(k));

  const reset = () => {
    setQInput('');
    setParams(new URLSearchParams());
  };

  const cats = meta.data?.categories ?? [];
  const facets = list.data?.facets;

  return (
    <div className="page py-6 sm:py-8">
      {/* Banner */}
      <section className="card relative mb-5 flex items-center overflow-hidden bg-gradient-to-r from-white via-white to-sky-50 p-5 sm:p-7">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{t('schemes.title')}</h1>
          <p className="mt-2 text-ink-soft">{t('schemes.subtitle')}</p>
        </div>
        <FarmerScene className="ml-auto hidden h-28 w-auto md:block" />
      </section>

      {/* Search + sort */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <form role="search" className="relative flex-1" onSubmit={(e) => (e.preventDefault(), update({ q: qInput }))}>
          <label htmlFor="scheme-search" className="sr-only">
            {t('nav.search')}
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            ref={searchRef}
            id="scheme-search"
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={t('schemes.search')}
            maxLength={120}
            className="input pl-9"
          />
        </form>
        <div className="flex items-end gap-2">
          <div className="w-full sm:w-52">
            <FilterSelect label={t('schemes.sortBy')} value={get('sort')} onChange={(v) => update({ sort: v })}>
              <option value="">{filters.q ? t('schemes.sort.relevance') : t('schemes.sort.newest')}</option>
              {filters.q && <option value="newest">{t('schemes.sort.newest')}</option>}
              <option value="name">{t('schemes.sort.name')}</option>
              <option value="deadline">{t('schemes.sort.deadline')}</option>
              <option value="verified">{t('schemes.sort.verified')}</option>
            </FilterSelect>
          </div>
          <button
            type="button"
            className="btn-outline md:hidden"
            aria-expanded={showFilters}
            aria-controls="filter-row"
            onClick={() => setShowFilters((s) => !s)}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {t('schemes.filters')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div id="filter-row" className={clsx('card mb-5 p-4', showFilters ? 'block' : 'hidden md:block')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-[repeat(4,minmax(0,1fr))_auto] md:items-end">
          <FilterSelect label={t('schemes.category')} value={get('category')} onChange={(v) => update({ category: v })}>
            <option value="">{t('schemes.allCategories')}</option>
            {cats.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label={t('schemes.department')} value={get('department')} onChange={(v) => update({ department: v })}>
            <option value="">{t('schemes.allDepartments')}</option>
            {(meta.data?.departments ?? []).map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label={t('schemes.eligibility')} value={get('group')} onChange={(v) => update({ group: v })}>
            <option value="">{t('schemes.allEligibility')}</option>
            {(meta.data?.beneficiaryGroups ?? []).map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label={t('schemes.status')} value={get('status')} onChange={(v) => update({ status: v })}>
            <option value="">{t('schemes.allStatus')}</option>
            <option value="open">{t('status.open')}</option>
            <option value="year_round">{t('status.year_round')}</option>
            <option value="closed">{t('status.closed')}</option>
            <option value="tbc">{t('status.tbc')}</option>
          </FilterSelect>
          <button type="button" onClick={reset} className="btn-ghost justify-self-start text-brand md:justify-self-end">
            {t('schemes.reset')}
          </button>
        </div>
        {mandal && (
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-surface-line text-brand focus:ring-brand"
              checked={availableOnly}
              onChange={(e) => update({ allMandals: e.target.checked ? '' : '1' })}
            />
            {t('schemes.onlyMyMandal', { mandal: `${mandal.name} Mandal` })}
          </label>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-[15rem_1fr]">
        {/* Category sidebar */}
        <aside className="hidden md:block" aria-labelledby="cat-sidebar">
          <div className="card sticky top-24 p-3">
            <h2 id="cat-sidebar" className="px-2 pb-2 pt-1 text-sm font-bold text-navy-900">
              {t('schemes.categories')}
            </h2>
            <ul className="space-y-0.5">
              {[{ slug: '', name: t('schemes.allSchemes'), icon: 'grid' }, ...cats].map((c) => {
                const Icon = categoryIconComponent(c.icon);
                const active = get('category') === c.slug;
                const count = c.slug ? facets?.categories[c.slug] ?? 0 : facets?.all ?? 0;
                return (
                  <li key={c.slug || 'all'}>
                    <button
                      type="button"
                      onClick={() => update({ category: c.slug })}
                      aria-pressed={active}
                      className={clsx(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm',
                        active ? 'bg-brand-soft font-semibold text-brand' : 'text-ink-soft hover:bg-surface-muted',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="flex-1">{c.name}</span>
                      <span className="text-xs tabular-nums text-ink-muted">{facets ? count : ''}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Results */}
        <section aria-labelledby="results-title" aria-busy={list.isFetching}>
          <h2 id="results-title" ref={resultsRef} tabIndex={-1} className="mb-3 text-sm font-semibold text-ink-soft focus:outline-none" aria-live="polite">
            {list.data ? (list.data.total === 1 ? t('schemes.result') : t('schemes.results', { count: list.data.total })) : ' '}
          </h2>
          {list.isLoading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-44" />
              ))}
            </div>
          ) : list.isError ? (
            <ErrorState onRetry={() => list.refetch()} />
          ) : list.data && list.data.items.length === 0 ? (
            <EmptyState
              title={t('schemes.emptyTitle')}
              text={t('schemes.emptyText')}
              action={
                hasFilters || availableOnly ? (
                  <button type="button" className="btn-primary" onClick={reset}>
                    <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                    {t('schemes.resetFilters')}
                  </button>
                ) : null
              }
            />
          ) : (
            <div className={clsx('space-y-4 transition-opacity', list.isFetching && 'opacity-60')}>
              {list.data!.items.map((s) => (
                <SchemeListCard key={s.id} scheme={s} />
              ))}
              <Pagination
                page={list.data!.page}
                totalPages={list.data!.totalPages}
                onChange={(p) => {
                  update({ page: p > 1 ? String(p) : '' }, false);
                  resultsRef.current?.focus();
                  resultsRef.current?.scrollIntoView({ block: 'start' });
                }}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
