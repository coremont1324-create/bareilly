import { useQuery } from '@tanstack/react-query';
import { Archive, CalendarClock, CheckCircle2, FilePen, FileStack, Megaphone, Plus, ShieldAlert } from 'lucide-react';
import type { DashboardMetrics } from '@mandal/shared';
import { Link } from 'react-router-dom';
import { ErrorState, Spinner } from '../../components/ui';
import { api } from '../../lib/api';
import { AdminPage } from './AdminLayout';
import { formatDateTime, formatDay, PubBadge } from './components';

export function DashboardPage() {
  const q = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => api<DashboardMetrics>('/admin/dashboard') });
  const tiles = q.data
    ? [
        { label: 'Total schemes', value: q.data.totals.total, icon: FileStack, tone: 'text-brand bg-brand-soft', to: '/admin/schemes' },
        { label: 'Published', value: q.data.totals.published, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50', to: '/admin/schemes?status=published' },
        { label: 'Drafts', value: q.data.totals.draft, icon: FilePen, tone: 'text-slate-700 bg-slate-100', to: '/admin/schemes?status=draft' },
        { label: 'Archived', value: q.data.totals.archived, icon: Archive, tone: 'text-stone-700 bg-stone-100', to: '/admin/schemes?status=archived' },
        { label: 'Deadlines in next 30 days', value: q.data.totals.upcomingDeadlines, icon: CalendarClock, tone: 'text-orange-700 bg-orange-50', to: '/admin/schemes?status=published' },
        { label: 'Awaiting verification', value: q.data.totals.awaitingVerification, icon: ShieldAlert, tone: 'text-amber-800 bg-amber-50', to: '/admin/schemes' },
        { label: 'Published notices', value: q.data.totals.publishedNotices, icon: Megaphone, tone: 'text-violet-700 bg-violet-50', to: '/admin/notices' },
      ]
    : [];
  return (
    <AdminPage
      title="Dashboard"
      actions={
        <Link to="/admin/schemes/new" className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add scheme
        </Link>
      }
    >
      {q.isLoading ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            {tiles.map((t) => (
              <li key={t.label}>
                <Link to={t.to} className="card flex h-full flex-col gap-2 p-4 hover:shadow-lift">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${t.tone}`}>
                    <t.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-2xl font-extrabold tabular-nums text-navy-900">{t.value}</span>
                  <span className="text-xs font-medium text-ink-muted">{t.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <section className="card p-5" aria-labelledby="up-h">
              <h2 id="up-h" className="section-title text-base">
                Upcoming deadlines
              </h2>
              {q.data!.upcoming.length ? (
                <ul className="mt-3 divide-y divide-surface-line text-sm">
                  {q.data!.upcoming.map((s) => (
                    <li key={s.id} className="flex justify-between gap-3 py-2">
                      <Link to={`/admin/schemes/${s.id}`} className="font-medium text-brand hover:underline">
                        {s.name}
                      </Link>
                      <span className="shrink-0 text-ink-muted">{formatDay(s.deadline)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-muted">No confirmed deadlines in the next 30 days.</p>
              )}
            </section>
            <section className="card p-5" aria-labelledby="aw-h">
              <h2 id="aw-h" className="section-title text-base">
                Awaiting verification
              </h2>
              {q.data!.awaiting.length ? (
                <ul className="mt-3 divide-y divide-surface-line text-sm">
                  {q.data!.awaiting.map((s) => (
                    <li key={s.id} className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <Link to={`/admin/schemes/${s.id}`} className="font-medium text-brand hover:underline">
                          {s.name}
                        </Link>
                        <PubBadge status={s.publicationStatus} />
                      </div>
                      <p className="text-xs text-amber-800">{s.reason}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-muted">Everything is verified and up to date.</p>
              )}
            </section>
            <section className="card p-5" aria-labelledby="ra-h">
              <h2 id="ra-h" className="section-title text-base">
                Recent activity
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {q.data!.recentActivity.map((a) => (
                  <li key={a.id} className="flex flex-col">
                    <span>
                      <span className="font-medium">{a.actorName ?? a.actorEmail ?? 'System'}</span>{' '}
                      <span className="text-ink-soft">
                        {a.action.replace('_', ' ')} {a.entityType}
                      </span>
                    </span>
                    <span className="text-xs text-ink-muted">{formatDateTime(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </AdminPage>
  );
}
