import { keepPreviousData, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Eye, Pencil, Plus, Search } from 'lucide-react';
import type { Paginated } from '@mandal/shared';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DemoBadge, EmptyState, ErrorState, Pagination, Spinner, StatusBadge } from '../../components/ui';
import { api } from '../../lib/api';
import { AdminPage } from './AdminLayout';
import { formatDateTime, PubBadge } from './components';

interface Item {
  id: string;
  slug: string;
  name: string;
  categoryName: string | null;
  applicationStatus: 'open' | 'closed' | 'year_round' | 'tbc';
  publicationStatus: 'draft' | 'published' | 'archived';
  verification: 'verified' | 'review_due' | 'unverified';
  isDemo: boolean;
  tbcCount: number;
  updatedAt: string;
  updatedBy: string | null;
}

const TABS = [
  { v: '', label: 'All' },
  { v: 'draft', label: 'Drafts' },
  { v: 'published', label: 'Published' },
  { v: 'archived', label: 'Archived' },
];

export function SchemesListPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const page = Number(params.get('page')) || 1;
  const [q, setQ] = useState(params.get('q') ?? '');
  const list = useQuery({
    queryKey: ['admin', 'schemes', status, params.get('q') ?? '', page],
    queryFn: () => api<Paginated<Item>>('/admin/schemes', { query: { status, q: params.get('q') ?? '', page } }),
    placeholderData: keepPreviousData,
  });
  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  return (
    <AdminPage
      title="Schemes"
      actions={
        <Link to="/admin/schemes/new" className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add scheme
        </Link>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Publication status" className="inline-flex rounded-lg border border-surface-line bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.v}
              role="tab"
              aria-selected={status === t.v}
              onClick={() => set({ status: t.v })}
              className={clsx('rounded-md px-3 py-1.5 text-sm font-medium', status === t.v ? 'bg-brand text-white' : 'text-ink-soft hover:bg-surface-muted')}
            >
              {t.label}
            </button>
          ))}
        </div>
        <form role="search" className="relative sm:w-72" onSubmit={(e) => (e.preventDefault(), set({ q }))}>
          <label htmlFor="admin-q" className="sr-only">
            Search schemes
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input id="admin-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => set({ q })} placeholder="Search by name…" className="input pl-9" />
        </form>
      </div>

      {list.isLoading ? (
        <Spinner />
      ) : list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.data!.items.length === 0 ? (
        <EmptyState title="No schemes here yet" text="Create a scheme or change the filter." />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <caption className="sr-only">Schemes</caption>
              <thead className="border-b border-surface-line bg-surface-muted text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">Scheme</th>
                  <th scope="col" className="px-4 py-3">Publication</th>
                  <th scope="col" className="px-4 py-3">Application</th>
                  <th scope="col" className="px-4 py-3">Verification</th>
                  <th scope="col" className="px-4 py-3">Last updated</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-line">
                {list.data!.items.map((s) => (
                  <tr key={s.id} className="align-top">
                    <td className="px-4 py-3">
                      <Link to={`/admin/schemes/${s.id}`} className="font-semibold text-navy-900 hover:underline">
                        {s.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                        {s.categoryName ?? 'No category'}
                        {s.isDemo && <DemoBadge />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PubBadge status={s.publicationStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.applicationStatus} />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={clsx('font-medium', s.verification === 'verified' ? 'text-emerald-700' : 'text-amber-800')}>
                        {s.verification === 'verified' ? 'Verified' : s.verification === 'review_due' ? 'Review due' : 'Not verified'}
                      </span>
                      {s.tbcCount > 0 && <span className="block text-amber-800">{s.tbcCount} to be confirmed</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {formatDateTime(s.updatedAt)}
                      {s.updatedBy && <span className="block">by {s.updatedBy}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link to={`/admin/schemes/${s.id}`} className="btn-ghost px-2 py-1" aria-label={`Edit ${s.name}`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <Link to={`/admin/schemes/${s.id}/preview`} className="btn-ghost px-2 py-1" aria-label={`Preview ${s.name}`}>
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={list.data!.totalPages} onChange={(p) => set({ page: String(p) })} />
        </>
      )}
    </AdminPage>
  );
}
