import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Pencil, Plus, RotateCcw, Send, Undo2 } from 'lucide-react';
import type { AdminNotice, Paginated } from '@mandal/shared';
import { useState } from 'react';
import { EmptyState, ErrorState, Spinner } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { AdminPage } from './AdminLayout';
import { Banner, Dialog, Field, formatDateTime, formatDay, PubBadge } from './components';

interface Draft {
  id?: string;
  version?: number;
  title: string;
  summary: string;
  publishedOn: string;
  deadline: string;
  schemeId: string;
  officialUrl: string;
  isDemo: boolean;
}

const today = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const blank = (): Draft => ({ title: '', summary: '', publishedOn: today(), deadline: '', schemeId: '', officialUrl: '', isDemo: false });

export function NoticesAdminPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['admin', 'notices'], queryFn: () => api<{ items: AdminNotice[] }>('/admin/notices') });
  const schemes = useQuery({
    queryKey: ['admin', 'schemes', 'options'],
    queryFn: () => api<Paginated<{ id: string; name: string; publicationStatus: string }>>('/admin/schemes', { query: { page: 1, pageSize: 100 } }),
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'notices'] });
    qc.invalidateQueries({ queryKey: ['notices'] });
    qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setErrors({});
    try {
      const body = {
        title: draft.title,
        summary: draft.summary,
        publishedOn: draft.publishedOn,
        deadline: draft.deadline || null,
        schemeId: draft.schemeId || null,
        officialUrl: draft.officialUrl.trim() || null,
        isDemo: draft.isDemo,
      };
      if (draft.id) await api(`/admin/notices/${draft.id}`, { method: 'PUT', body: { ...body, version: draft.version } });
      else await api('/admin/notices', { method: 'POST', body });
      setDraft(null);
      setBanner({ tone: 'success', text: 'Notice saved as draft. Publish it to make it visible.' });
      refresh();
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.details?.fields ?? { _: e.message });
      }
    } finally {
      setBusy(false);
    }
  };

  const act = async (n: AdminNotice, action: 'publish' | 'unpublish' | 'archive' | 'restore') => {
    setBanner(null);
    try {
      await api(`/admin/notices/${n.id}/${action}`, { method: 'POST', body: { version: n.version } });
      setBanner({ tone: 'success', text: { publish: 'Notice published.', unpublish: 'Notice moved back to draft.', archive: 'Notice archived.', restore: 'Notice restored as draft.' }[action] });
      refresh();
    } catch (e) {
      setBanner({ tone: 'error', text: e instanceof ApiError ? e.message : 'Action failed' });
    }
  };

  return (
    <AdminPage
      title="Notices"
      actions={
        <button type="button" className="btn-primary" onClick={() => (setErrors({}), setDraft(blank()))}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add notice
        </button>
      }
    >
      {banner && (
        <div className="mb-4">
          <Banner tone={banner.tone} onClose={() => setBanner(null)}>
            {banner.text}
          </Banner>
        </div>
      )}
      {list.isLoading ? (
        <Spinner />
      ) : list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.data!.items.length === 0 ? (
        <EmptyState title="No notices yet" />
      ) : (
        <ul className="space-y-3">
          {list.data!.items.map((n) => (
            <li key={n.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-navy-900">{n.title}</h2>
                  <PubBadge status={n.publicationStatus} />
                  {n.isDemo && <span className="chip bg-violet-50 text-violet-800">Demo</span>}
                </div>
                <p className="mt-1 text-sm text-ink-soft">{n.summary}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Publication date {formatDay(n.publishedOn)}
                  {n.deadline && ` · Deadline ${formatDay(n.deadline)}`}
                  {n.schemeName && ` · ${n.schemeName}`} · Updated {formatDateTime(n.updatedAt)}
                  {n.updatedBy && ` by ${n.updatedBy}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {n.publicationStatus !== 'archived' && (
                  <button
                    type="button"
                    className="btn-outline py-1.5"
                    onClick={() => {
                      setErrors({});
                      setDraft({ id: n.id, version: n.version, title: n.title, summary: n.summary, publishedOn: n.publishedOn, deadline: n.deadline ?? '', schemeId: n.schemeId ?? '', officialUrl: n.officialUrl ?? '', isDemo: n.isDemo });
                    }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                  </button>
                )}
                {n.publicationStatus === 'draft' && (
                  <button type="button" className="btn-primary py-1.5" onClick={() => act(n, 'publish')}>
                    <Send className="h-4 w-4" aria-hidden="true" /> Publish
                  </button>
                )}
                {n.publicationStatus === 'published' && (
                  <button type="button" className="btn-outline py-1.5" onClick={() => act(n, 'unpublish')}>
                    <Undo2 className="h-4 w-4" aria-hidden="true" /> Unpublish
                  </button>
                )}
                {n.publicationStatus !== 'archived' ? (
                  <button type="button" className="btn-danger py-1.5" onClick={() => act(n, 'archive')}>
                    <Archive className="h-4 w-4" aria-hidden="true" /> Archive
                  </button>
                ) : (
                  <button type="button" className="btn-outline py-1.5" onClick={() => act(n, 'restore')}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restore
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(draft)}
        title={draft?.id ? 'Edit notice' : 'Add notice'}
        onClose={() => setDraft(null)}
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={busy} onClick={save}>
              Save
            </button>
          </>
        }
      >
        {draft && (
          <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), save())} noValidate>
            {errors._ && <Banner tone="error">{errors._}</Banner>}
            <Field label="Title" required htmlFor="n-title" error={errors.title}>
              <input id="n-title" className="input" value={draft.title} maxLength={200} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>
            <Field label="Summary" htmlFor="n-summary" error={errors.summary} hint="Required (10+ characters) before publishing.">
              <textarea id="n-summary" rows={3} className="input" value={draft.summary} maxLength={600} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Publication date" required htmlFor="n-pub" error={errors.publishedOn}>
                <input id="n-pub" type="date" className="input" value={draft.publishedOn} onChange={(e) => setDraft({ ...draft, publishedOn: e.target.value })} />
              </Field>
              <Field label="Confirmed deadline" htmlFor="n-deadline" error={errors.deadline} hint="Leave empty unless officially confirmed.">
                <input id="n-deadline" type="date" className="input" value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} />
              </Field>
            </div>
            <Field label="Related scheme" htmlFor="n-scheme" error={errors.schemeId}>
              <select id="n-scheme" className="input" value={draft.schemeId} onChange={(e) => setDraft({ ...draft, schemeId: e.target.value })}>
                <option value="">None</option>
                {(schemes.data?.items ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.publicationStatus})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Official notice link" htmlFor="n-url" error={errors.officialUrl} hint="HTTPS on an approved official domain.">
              <input id="n-url" type="url" className="input" value={draft.officialUrl} onChange={(e) => setDraft({ ...draft, officialUrl: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded text-brand" checked={draft.isDemo} onChange={(e) => setDraft({ ...draft, isDemo: e.target.checked })} />
              Demonstration notice
            </label>
          </form>
        )}
      </Dialog>
    </AdminPage>
  );
}
