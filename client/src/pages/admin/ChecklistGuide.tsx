import { useQuery } from '@tanstack/react-query';
import { CheckSquare, Info } from 'lucide-react';
import { CHECKLIST_LABELS, CHECKLIST_KEYS, type SchemeSummary } from '@mandal/shared';
import { SchemeCard } from '../../components/SchemeCards';
import { Spinner } from '../../components/ui';
import { api } from '../../lib/api';
import { AdminPage } from './AdminLayout';

/** Reference panel: the reusable scheme card plus the publishing checklist. */
export function ChecklistGuidePage() {
  const featured = useQuery({ queryKey: ['featured', 'guide'], queryFn: () => api<{ items: SchemeSummary[] }>('/schemes/featured', { query: { limit: 1 } }) });
  const half = Math.ceil(CHECKLIST_KEYS.length / 2);
  return (
    <AdminPage title="Scheme card & checklist">
      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="ex-h">
          <h2 id="ex-h" className="mb-3 text-sm font-semibold text-ink-soft">
            Scheme card example (live data)
          </h2>
          {featured.isLoading ? <Spinner /> : featured.data?.items[0] ? <SchemeCard scheme={featured.data.items[0]} /> : <p className="text-sm text-ink-muted">Publish a scheme to see the card.</p>}
        </section>
        <section className="card p-5" aria-labelledby="cl-h">
          <h2 id="cl-h" className="flex items-center gap-2 text-base font-bold text-navy-900">
            <CheckSquare className="h-6 w-6 text-emerald-700" aria-hidden="true" />
            Scheme Details Checklist
          </h2>
          <p className="mt-1 text-sm text-ink-soft">Make sure to include the following for each scheme:</p>
          <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {[CHECKLIST_KEYS.slice(0, half), CHECKLIST_KEYS.slice(half)].map((col, i) => (
              <ul key={i} className="space-y-2">
                {col.map((k) => (
                  <li key={k} className="flex items-center gap-2 text-sm">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-emerald-700 text-[10px] text-white" aria-hidden="true">
                      ✓
                    </span>
                    {CHECKLIST_LABELS[k]}
                  </li>
                ))}
              </ul>
            ))}
          </div>
          <p className="mt-5 flex items-start gap-2 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-sky-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              If any detail or official link isn’t confirmed, label it <strong>“To be confirmed”</strong> rather than guessing. Name, description, category, department, status,
              mandal availability, verification source and last-verified date are always required to publish; links must be HTTPS on an approved official domain.
            </span>
          </p>
        </section>
      </div>
    </AdminPage>
  );
}
