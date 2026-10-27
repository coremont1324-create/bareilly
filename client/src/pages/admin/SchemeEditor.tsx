import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Archive, ArrowLeft, ChevronDown, Eye, RotateCcw, Save, Send, Undo2 } from 'lucide-react';
import {
  evaluateChecklist,
  type AdminScheme,
  type ApplicationStatus,
  type AuditEntry,
  type ChecklistResult,
  type MetaResponse,
  type PortalSettings,
  type TbcField,
  type VerificationRecord,
} from '@mandal/shared';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { ErrorState, Spinner } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { AdminPage } from './AdminLayout';
import { Banner, ChecklistPanel, Dialog, Field, formatDateTime, formatDay, PubBadge } from './components';

interface FormState {
  name: string;
  shortDescription: string;
  overview: string;
  keywords: string;
  categoryId: string;
  departmentId: string;
  targetGroup: string;
  eligibilitySummary: string;
  benefitsSummary: string;
  eligibility: string;
  benefits: string;
  requiredDocuments: string;
  applicationSteps: string;
  applicationStatus: ApplicationStatus;
  deadline: string;
  officialUrl: string;
  applicationUrl: string;
  guidelinesUrl: string;
  helpPhone: string;
  helpEmail: string;
  helpNotes: string;
  availableAllMandals: boolean;
  mandalIds: number[];
  beneficiaryGroupIds: number[];
  tbcFields: TbcField[];
  verificationSource: string;
  verificationSourceUrl: string;
  lastVerifiedOn: string;
  reviewDueOn: string;
  notes: string;
  isFeatured: boolean;
  isDemo: boolean;
}

const EMPTY: FormState = {
  name: '',
  shortDescription: '',
  overview: '',
  keywords: '',
  categoryId: '',
  departmentId: '',
  targetGroup: '',
  eligibilitySummary: '',
  benefitsSummary: '',
  eligibility: '',
  benefits: '',
  requiredDocuments: '',
  applicationSteps: '',
  applicationStatus: 'tbc',
  deadline: '',
  officialUrl: '',
  applicationUrl: '',
  guidelinesUrl: '',
  helpPhone: '',
  helpEmail: '',
  helpNotes: '',
  availableAllMandals: true,
  mandalIds: [],
  beneficiaryGroupIds: [],
  tbcFields: [],
  verificationSource: '',
  verificationSourceUrl: '',
  lastVerifiedOn: '',
  reviewDueOn: '',
  notes: '',
  isFeatured: false,
  isDemo: false,
};

const lines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

function fromScheme(s: AdminScheme): FormState {
  return {
    name: s.name,
    shortDescription: s.shortDescription,
    overview: s.overview,
    keywords: s.keywords,
    categoryId: s.categoryId ? String(s.categoryId) : '',
    departmentId: s.departmentId ? String(s.departmentId) : '',
    targetGroup: s.targetGroup,
    eligibilitySummary: s.eligibilitySummary,
    benefitsSummary: s.benefitsSummary,
    eligibility: s.eligibility.join('\n'),
    benefits: s.benefits.join('\n'),
    requiredDocuments: s.requiredDocuments.join('\n'),
    applicationSteps: s.applicationSteps.join('\n'),
    applicationStatus: s.applicationStatus,
    deadline: s.deadline ?? '',
    officialUrl: s.officialUrl ?? '',
    applicationUrl: s.applicationUrl ?? '',
    guidelinesUrl: s.guidelinesUrl ?? '',
    helpPhone: s.helpPhone ?? '',
    helpEmail: s.helpEmail ?? '',
    helpNotes: s.helpNotes,
    availableAllMandals: s.availableAllMandals,
    mandalIds: s.mandalIds,
    beneficiaryGroupIds: s.beneficiaryGroupIds,
    tbcFields: s.tbcFields,
    verificationSource: s.verificationSource,
    verificationSourceUrl: s.verificationSourceUrl ?? '',
    lastVerifiedOn: s.lastVerifiedOn ?? '',
    reviewDueOn: s.reviewDueOn ?? '',
    notes: s.notes,
    isFeatured: s.isFeatured,
    isDemo: s.isDemo,
  };
}

function toPayload(f: FormState) {
  return {
    ...f,
    categoryId: f.categoryId ? Number(f.categoryId) : null,
    departmentId: f.departmentId ? Number(f.departmentId) : null,
    eligibility: lines(f.eligibility),
    benefits: lines(f.benefits),
    requiredDocuments: lines(f.requiredDocuments),
    applicationSteps: lines(f.applicationSteps),
    deadline: f.deadline || null,
    officialUrl: f.officialUrl.trim() || null,
    applicationUrl: f.applicationUrl.trim() || null,
    guidelinesUrl: f.guidelinesUrl.trim() || null,
    helpPhone: f.helpPhone.trim() || null,
    helpEmail: f.helpEmail.trim() || null,
    verificationSourceUrl: f.verificationSourceUrl.trim() || null,
    lastVerifiedOn: f.lastVerifiedOn || null,
    reviewDueOn: f.reviewDueOn || null,
    mandalIds: f.availableAllMandals ? [] : f.mandalIds,
  };
}

function TbcToggle({ field, form, setForm }: { field: TbcField; form: FormState; setForm: (f: FormState) => void }) {
  const on = form.tbcFields.includes(field);
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-amber-800">
      <input
        type="checkbox"
        className="h-3.5 w-3.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
        checked={on}
        onChange={(e) => setForm({ ...form, tbcFields: e.target.checked ? [...form.tbcFields, field] : form.tbcFields.filter((x) => x !== field) })}
      />
      Mark “To be confirmed”
    </label>
  );
}

function Collapsible({ title, children, defaultOpen }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group card" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-bold text-navy-900 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-4 border-t border-surface-line px-5 py-4">{children}</div>
    </details>
  );
}

export function SchemeEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const meta = useQuery({ queryKey: ['meta'], queryFn: () => api<MetaResponse>('/meta') });
  const settings = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => api<PortalSettings>('/admin/settings') });
  const scheme = useQuery({ queryKey: ['admin', 'scheme', id], queryFn: () => api<AdminScheme>(`/admin/schemes/${id}`), enabled: !isNew });
  const history = useQuery({
    queryKey: ['admin', 'scheme', id, 'history'],
    queryFn: () => api<{ audit: AuditEntry[]; verifications: VerificationRecord[] }>(`/admin/schemes/${id}/history`),
    enabled: !isNew,
  });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [baseline, setBaseline] = useState<string>(JSON.stringify(EMPTY));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: 'error' | 'success' | 'warning' | 'info'; text: ReactNode } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | { kind: 'publish-tbc' | 'archive'; checklist?: ChecklistResult }>(null);
  const [tab, setTab] = useState<'details' | 'history'>('details');

  useEffect(() => {
    if (scheme.data) {
      const f = fromScheme(scheme.data);
      setForm(f);
      setBaseline(JSON.stringify(f));
    }
  }, [scheme.data]);

  const dirty = JSON.stringify(form) !== baseline;
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !busy && currentLocation.pathname !== nextLocation.pathname);

  const checklist = useMemo(() => {
    const p = toPayload(form);
    return evaluateChecklist({ ...p, helpNotes: form.helpNotes }, settings.data?.officialDomains);
  }, [form, settings.data]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    // Clear a field's server error as soon as the user edits it.
    setErrors((e) => {
      if (!(k in e)) return e;
      const { [k]: _removed, ...rest } = e;
      return rest;
    });
  };
  const err = (k: string) => errors[k];
  const describedBy = (k: string) => (errors[k] ? `${k}-error` : undefined);

  const handleError = (e: unknown) => {
    if (e instanceof ApiError) {
      if (e.details?.fields) setErrors(e.details.fields);
      if (e.status === 409) {
        setBanner({
          tone: 'error',
          text: (
            <>
              {e.message}{' '}
              <button type="button" className="font-semibold underline" onClick={() => scheme.refetch()}>
                Reload latest version
              </button>
            </>
          ),
        });
      } else setBanner({ tone: 'error', text: e.message });
    } else setBanner({ tone: 'error', text: 'Something went wrong.' });
  };

  const save = async (): Promise<AdminScheme | null> => {
    setBusy(true);
    setErrors({});
    setBanner(null);
    try {
      const payload = toPayload(form);
      const saved = isNew
        ? await api<AdminScheme>('/admin/schemes', { method: 'POST', body: payload })
        : await api<AdminScheme>(`/admin/schemes/${id}`, { method: 'PUT', body: { ...payload, version: scheme.data!.version } });
      qc.setQueryData(['admin', 'scheme', saved.id], saved);
      qc.invalidateQueries({ queryKey: ['admin', 'schemes'] });
      qc.invalidateQueries({ queryKey: ['admin', 'scheme', saved.id, 'history'] });
      const f = fromScheme(saved);
      setForm(f);
      setBaseline(JSON.stringify(f));
      if (isNew) navigate(`/admin/schemes/${saved.id}`, { replace: true });
      setBanner({ tone: 'success', text: saved.publicationStatus === 'published' ? 'Changes saved and live.' : 'Draft saved.' });
      return saved;
    } catch (e) {
      handleError(e);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const transition = async (action: 'publish' | 'unpublish' | 'archive' | 'restore', acknowledgeTbc = false) => {
    let current = scheme.data ?? null;
    if (dirty || isNew) {
      current = await save();
      if (!current) return;
    }
    setBusy(true);
    setBanner(null);
    try {
      const res = await api<AdminScheme>(`/admin/schemes/${current!.id}/${action}`, { method: 'POST', body: { version: current!.version, acknowledgeTbc } });
      qc.setQueryData(['admin', 'scheme', res.id], res);
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['schemes'] });
      qc.invalidateQueries({ queryKey: ['featured'] });
      setConfirm(null);
      const messages = { publish: 'Published — citizens can now see this scheme.', unpublish: 'Moved back to draft.', archive: 'Archived.', restore: 'Restored as a draft.' };
      setBanner({ tone: 'success', text: messages[action] });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'TBC_ACK_REQUIRED') {
        setConfirm({ kind: 'publish-tbc', checklist: e.details?.checklist as ChecklistResult });
      } else {
        setConfirm(null);
        handleError(e);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!isNew && scheme.isLoading) return <Spinner />;
  if (!isNew && scheme.isError) return <ErrorState onRetry={() => scheme.refetch()} message={(scheme.error as Error).message} />;

  const pub = scheme.data?.publicationStatus ?? 'draft';
  const categories = meta.data?.categories ?? [];
  const departments = meta.data?.departments ?? [];

  const input = (k: keyof FormState, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      id={`f-${k}`}
      value={form[k] as string}
      onChange={(e) => set(k, e.target.value as never)}
      aria-invalid={Boolean(err(k)) || undefined}
      aria-describedby={describedBy(k) ? `f-${describedBy(k)}` : undefined}
      className={clsx('input', err(k) && 'border-red-400')}
      {...props}
    />
  );
  const textarea = (k: keyof FormState, rows = 4, placeholder?: string) => (
    <textarea
      id={`f-${k}`}
      rows={rows}
      value={form[k] as string}
      placeholder={placeholder}
      onChange={(e) => set(k, e.target.value as never)}
      aria-invalid={Boolean(err(k)) || undefined}
      className={clsx('input', err(k) && 'border-red-400')}
    />
  );
  const fieldError = (k: string) => {
    const direct = errors[k];
    if (direct) return direct;
    const nested = Object.entries(errors).find(([key]) => key.startsWith(`${k}.`));
    return nested?.[1];
  };

  return (
    <AdminPage
      title={isNew ? 'Add Scheme' : 'Edit Scheme'}
      actions={
        <>
          {!isNew && (
            <Link to={`/admin/schemes/${id}/preview`} className={clsx('btn-outline', dirty && 'pointer-events-none opacity-50')} aria-disabled={dirty} title={dirty ? 'Save changes to preview' : undefined}>
              <Eye className="h-4 w-4" aria-hidden="true" /> Preview
            </Link>
          )}
          <button type="button" className="btn-outline" onClick={save} disabled={busy || (!dirty && !isNew)}>
            <Save className="h-4 w-4" aria-hidden="true" /> {pub === 'published' ? 'Save changes' : 'Save as draft'}
          </button>
          {pub === 'draft' && (
            <button type="button" className="btn-primary" onClick={() => transition('publish')} disabled={busy || !checklist.canPublish} title={checklist.canPublish ? undefined : 'Complete the checklist to publish'}>
              <Send className="h-4 w-4" aria-hidden="true" /> Publish
            </button>
          )}
          {pub === 'published' && (
            <button type="button" className="btn-outline" onClick={() => transition('unpublish')} disabled={busy}>
              <Undo2 className="h-4 w-4" aria-hidden="true" /> Unpublish
            </button>
          )}
          {!isNew && pub !== 'archived' && (
            <button type="button" className="btn-danger" onClick={() => setConfirm({ kind: 'archive' })} disabled={busy}>
              <Archive className="h-4 w-4" aria-hidden="true" /> Archive
            </button>
          )}
          {pub === 'archived' && (
            <button type="button" className="btn-primary" onClick={() => transition('restore')} disabled={busy}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restore
            </button>
          )}
        </>
      }
    >
      <Link to="/admin/schemes" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All schemes
      </Link>
      <div className="mb-4 space-y-2">
        {banner && (
          <Banner tone={banner.tone} onClose={() => setBanner(null)}>
            {banner.text}
          </Banner>
        )}
        {Object.keys(errors).length > 0 && <Banner tone="error">Please correct the highlighted fields.</Banner>}
        {pub === 'archived' && <Banner tone="info">This scheme is archived and hidden from citizens. Restore it to edit and republish.</Banner>}
        {dirty && <Banner tone="warning">You have unsaved changes.</Banner>}
      </div>

      {!isNew && (
        <div role="tablist" aria-label="Editor sections" className="mb-4 inline-flex rounded-lg border border-surface-line bg-white p-1">
          {(['details', 'history'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={clsx('rounded-md px-3 py-1.5 text-sm font-medium capitalize', tab === t ? 'bg-brand text-white' : 'text-ink-soft hover:bg-surface-muted')}>
              {t === 'history' ? 'History & verification' : 'Scheme details'}
            </button>
          ))}
        </div>
      )}

      {tab === 'history' && !isNew ? (
        <HistoryPanel audit={history.data?.audit ?? []} verifications={history.data?.verifications ?? []} loading={history.isLoading} />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]"
          noValidate
        >
          <fieldset disabled={pub === 'archived' || busy} className="min-w-0 space-y-5">
            <div className="card p-5">
              <h2 className="mb-4 text-base font-bold text-navy-900">Scheme Details</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Scheme name" required htmlFor="f-name" error={fieldError('name')}>
                  {input('name', { placeholder: 'e.g. PM-KISAN Samman Nidhi', maxLength: 160, required: true })}
                </Field>
                <Field label="Application status" required htmlFor="f-applicationStatus" error={fieldError('applicationStatus')}>
                  <select id="f-applicationStatus" className="input" value={form.applicationStatus} onChange={(e) => set('applicationStatus', e.target.value as ApplicationStatus)}>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="year_round">Year-round</option>
                    <option value="tbc">To be confirmed</option>
                  </select>
                </Field>
                <Field label="Category" required htmlFor="f-categoryId" error={fieldError('categoryId')}>
                  <select id="f-categoryId" className="input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Deadline (last date)"
                  htmlFor="f-deadline"
                  error={fieldError('deadline')}
                  hint={
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      Only enter an officially confirmed date.
                      <TbcToggle field="deadline" form={form} setForm={setForm} />
                    </span>
                  }
                >
                  {input('deadline', { type: 'date' })}
                </Field>
                <Field label="Department / Office" required htmlFor="f-departmentId" error={fieldError('departmentId')}>
                  <select id="f-departmentId" className="input" value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)}>
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Official scheme link"
                  htmlFor="f-officialUrl"
                  error={fieldError('officialUrl')}
                  hint={
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      HTTPS on an approved domain ({(settings.data?.officialDomains ?? ['gov.in', 'nic.in']).join(', ')}).
                      <TbcToggle field="official_link" form={form} setForm={setForm} />
                    </span>
                  }
                >
                  {input('officialUrl', { type: 'url', placeholder: 'https://example.gov.in', inputMode: 'url' })}
                </Field>
                <Field label="Short description" required htmlFor="f-shortDescription" error={fieldError('shortDescription')} hint={`${form.shortDescription.length}/400 — at least 20 characters to publish`}>
                  {textarea('shortDescription', 3)}
                </Field>
                <Field label="Mandal availability" required htmlFor="f-availability" error={fieldError('mandalIds')}>
                  <select
                    id="f-availability"
                    className="input"
                    value={form.availableAllMandals ? 'all' : 'selected'}
                    onChange={(e) => set('availableAllMandals', e.target.value === 'all')}
                  >
                    <option value="all">Available in all mandals</option>
                    <option value="selected">Available in selected mandals</option>
                  </select>
                  {!form.availableAllMandals && (
                    <fieldset className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-surface-line p-2">
                      <legend className="sr-only">Select mandals</legend>
                      {(meta.data?.mandals ?? []).map((m) => (
                        <label key={m.id} className="flex items-center gap-2 py-1 text-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded text-brand"
                            checked={form.mandalIds.includes(m.id)}
                            onChange={(e) => set('mandalIds', e.target.checked ? [...form.mandalIds, m.id] : form.mandalIds.filter((x) => x !== m.id))}
                          />
                          {m.name} <span className="text-xs text-ink-muted">({m.district})</span>
                        </label>
                      ))}
                    </fieldset>
                  )}
                </Field>
                <Field
                  label="Eligibility"
                  required
                  htmlFor="f-eligibility"
                  error={fieldError('eligibility')}
                  hint={
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      One criterion per line, only as stated in official sources.
                      <TbcToggle field="eligibility" form={form} setForm={setForm} />
                    </span>
                  }
                >
                  {textarea('eligibility', 5, 'e.g. Small and marginal farmers')}
                </Field>
                <Field label="Official application link" htmlFor="f-applicationUrl" error={fieldError('applicationUrl')} hint={<TbcToggle field="application_link" form={form} setForm={setForm} />}>
                  {input('applicationUrl', { type: 'url', placeholder: 'https://example.gov.in/apply', inputMode: 'url' })}
                </Field>
                <Field
                  label="Benefits"
                  required
                  htmlFor="f-benefits"
                  error={fieldError('benefits')}
                  hint={
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      One benefit per line. Never estimate amounts.
                      <TbcToggle field="benefits" form={form} setForm={setForm} />
                    </span>
                  }
                >
                  {textarea('benefits', 5, 'e.g. ₹6,000 per year')}
                </Field>
                <div className="space-y-4">
                  <Field label="Eligibility summary (cards)" htmlFor="f-eligibilitySummary" error={fieldError('eligibilitySummary')}>
                    {input('eligibilitySummary', { maxLength: 300 })}
                  </Field>
                  <Field label="Benefit summary (cards)" htmlFor="f-benefitsSummary" error={fieldError('benefitsSummary')}>
                    {input('benefitsSummary', { maxLength: 300, placeholder: 'e.g. ₹6,000 per year in 3 instalments' })}
                  </Field>
                  <Field label="Who it is for (cards)" htmlFor="f-targetGroup" error={fieldError('targetGroup')}>
                    {input('targetGroup', { maxLength: 160, placeholder: 'e.g. Small & marginal farmers' })}
                  </Field>
                </div>
              </div>
            </div>

            <Collapsible title="Required Documents" defaultOpen>
              <Field label="Documents" htmlFor="f-requiredDocuments" error={fieldError('requiredDocuments')} hint={<TbcToggle field="required_documents" form={form} setForm={setForm} />}>
                {textarea('requiredDocuments', 4, 'One document per line')}
              </Field>
            </Collapsible>
            <Collapsible title="How to Apply" defaultOpen>
              <Field label="Application steps" htmlFor="f-applicationSteps" error={fieldError('applicationSteps')} hint={<TbcToggle field="application_steps" form={form} setForm={setForm} />}>
                {textarea('applicationSteps', 5, 'One step per line, in order')}
              </Field>
              <Field label="Guidelines document link" htmlFor="f-guidelinesUrl" error={fieldError('guidelinesUrl')} hint="Only shown if it is an HTTPS link on an approved domain.">
                {input('guidelinesUrl', { type: 'url', placeholder: 'https://example.gov.in/guidelines.pdf' })}
              </Field>
            </Collapsible>
            <Collapsible title="Help & Support">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Helpline phone" htmlFor="f-helpPhone" error={fieldError('helpPhone')} hint="Only an officially published number.">
                  {input('helpPhone', { type: 'tel', inputMode: 'tel' })}
                </Field>
                <Field label="Help email" htmlFor="f-helpEmail" error={fieldError('helpEmail')}>
                  {input('helpEmail', { type: 'email' })}
                </Field>
              </div>
              <Field label="Help desk information" htmlFor="f-helpNotes" error={fieldError('helpNotes')} hint={<TbcToggle field="help_contact" form={form} setForm={setForm} />}>
                {textarea('helpNotes', 3, 'Office, grievance portal, or other official help channel')}
              </Field>
            </Collapsible>
            <Collapsible title="Additional Information">
              <Field label="Overview" htmlFor="f-overview" error={fieldError('overview')}>
                {textarea('overview', 5)}
              </Field>
              <Field label="Search keywords / alternative names" htmlFor="f-keywords" error={fieldError('keywords')} hint="Comma separated, e.g. pm kisan, pmkisan">
                {input('keywords', { maxLength: 300 })}
              </Field>
              <fieldset>
                <legend className="label">Eligible groups (used for the Eligibility filter)</legend>
                <div className="grid gap-1 sm:grid-cols-2">
                  {(meta.data?.beneficiaryGroups ?? []).map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded text-brand"
                        checked={form.beneficiaryGroupIds.includes(g.id)}
                        onChange={(e) => set('beneficiaryGroupIds', e.target.checked ? [...form.beneficiaryGroupIds, g.id] : form.beneficiaryGroupIds.filter((x) => x !== g.id))}
                      />
                      {g.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 rounded text-brand" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />
                  Feature on home page
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 rounded text-brand" checked={form.isDemo} onChange={(e) => set('isDemo', e.target.checked)} />
                  Demonstration record (shows a “Demo” label)
                </label>
              </div>
            </Collapsible>
          </fieldset>

          {/* Status & metadata */}
          <div className="space-y-5">
            <fieldset disabled={pub === 'archived' || busy} className="card space-y-4 p-5">
              <legend className="sr-only">Status and metadata</legend>
              <h2 className="text-base font-bold text-navy-900">Status &amp; Metadata</h2>
              <div>
                <p className="label">Scheme status</p>
                <ul className="space-y-1.5 text-sm" aria-label="Publication status">
                  {(['draft', 'published', 'archived'] as const).map((s) => (
                    <li key={s} className="flex items-center gap-2">
                      <span className={clsx('inline-block h-3.5 w-3.5 rounded-full border-2', pub === s ? 'border-brand bg-brand' : 'border-slate-300')} aria-hidden="true" />
                      <span className={clsx('capitalize', pub === s ? 'font-semibold text-navy-900' : 'text-ink-muted')}>
                        {s}
                        {pub === s && <span className="sr-only"> (current)</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-ink-muted">Change status with the buttons at the top.</p>
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="label mb-0.5">Last updated by</dt>
                  <dd className="rounded-lg bg-surface-muted px-3 py-2 text-ink-soft">{scheme.data?.updatedBy?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="label mb-0.5">Last updated date</dt>
                  <dd className="rounded-lg bg-surface-muted px-3 py-2 text-ink-soft">{formatDateTime(scheme.data?.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="label mb-0.5">Created</dt>
                  <dd className="text-xs text-ink-muted">
                    {formatDateTime(scheme.data?.createdAt)} {scheme.data?.createdBy ? `by ${scheme.data.createdBy.name}` : ''}
                  </dd>
                </div>
              </dl>
              <Field label="Source used to verify" required htmlFor="f-verificationSource" error={fieldError('verificationSource')}>
                {input('verificationSource', { placeholder: 'Official website / Gazette / Circular no.', maxLength: 300 })}
              </Field>
              <Field label="Source link" htmlFor="f-verificationSourceUrl" error={fieldError('verificationSourceUrl')}>
                {input('verificationSourceUrl', { type: 'url', placeholder: 'https://…' })}
              </Field>
              <Field label="Last verified date" required htmlFor="f-lastVerifiedOn" error={fieldError('lastVerifiedOn')}>
                {input('lastVerifiedOn', { type: 'date', max: new Date().toISOString().slice(0, 10) })}
              </Field>
              <Field label="Review reminder date" htmlFor="f-reviewDueOn" error={fieldError('reviewDueOn')} hint="Defaults to 90 days after verification if empty.">
                {input('reviewDueOn', { type: 'date' })}
              </Field>
              <Field label="Notes (internal)" htmlFor="f-notes" error={fieldError('notes')}>
                {textarea('notes', 3, 'Add notes…')}
              </Field>
            </fieldset>
            <div className="card p-5 xl:sticky xl:top-4">
              <h2 className="mb-3 text-base font-bold text-navy-900">Publishing checklist</h2>
              <ChecklistPanel result={checklist} compact />
              <p className="mt-3 text-xs text-ink-muted">If any detail or official link isn’t confirmed, mark it “To be confirmed” rather than guessing.</p>
            </div>
          </div>
        </form>
      )}

      <Dialog
        open={confirm?.kind === 'publish-tbc'}
        title="Publish with “To be confirmed” details?"
        onClose={() => setConfirm(null)}
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => transition('publish', true)}>
              Publish with labels
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">Citizens will see these items labelled “To be confirmed”:</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {(confirm?.checklist?.tbc ?? checklist.tbc).map((i) => (
            <li key={i.key}>{i.label}</li>
          ))}
        </ul>
      </Dialog>
      <Dialog
        open={confirm?.kind === 'archive'}
        title="Archive this scheme?"
        onClose={() => setConfirm(null)}
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button type="button" className="btn-danger" disabled={busy} onClick={() => transition('archive')}>
              Archive
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">Archived schemes are hidden from citizens. You can restore it later as a draft. Nothing is deleted.</p>
      </Dialog>
      <Dialog
        open={blocker.state === 'blocked'}
        title="Leave without saving?"
        onClose={() => blocker.reset?.()}
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => blocker.reset?.()}>
              Stay
            </button>
            <button type="button" className="btn-danger" onClick={() => blocker.proceed?.()}>
              Discard changes
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">You have unsaved changes to this scheme.</p>
      </Dialog>
    </AdminPage>
  );
}

function HistoryPanel({ audit, verifications, loading }: { audit: AuditEntry[]; verifications: VerificationRecord[]; loading: boolean }) {
  if (loading) return <Spinner />;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card p-5" aria-labelledby="audit-h">
        <h2 id="audit-h" className="mb-3 text-base font-bold text-navy-900">
          Audit history
        </h2>
        <ol className="space-y-3 text-sm">
          {audit.map((a) => (
            <li key={a.id} className="border-l-2 border-brand/30 pl-3">
              <p>
                <span className="font-semibold capitalize">{a.action}</span> by {a.actorName ?? a.actorEmail ?? 'System'}
              </p>
              <p className="text-xs text-ink-muted">{formatDateTime(a.createdAt)}</p>
              {a.changes && a.action === 'update' && (
                <p className="mt-1 text-xs text-ink-soft">Changed: {Object.keys(a.changes).join(', ')}</p>
              )}
            </li>
          ))}
        </ol>
      </section>
      <section className="card p-5" aria-labelledby="ver-h">
        <h2 id="ver-h" className="mb-3 text-base font-bold text-navy-900">
          Verification records
        </h2>
        {verifications.length ? (
          <ol className="space-y-3 text-sm">
            {verifications.map((v) => (
              <li key={v.id} className="border-l-2 border-emerald-400 pl-3">
                <p className="font-semibold">Verified on {formatDay(v.verifiedOn)}</p>
                <p className="text-ink-soft">{v.source}</p>
                {v.sourceUrl && (
                  <a href={v.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-brand hover:underline">
                    {v.sourceUrl}
                  </a>
                )}
                <p className="text-xs text-ink-muted">
                  Recorded {formatDateTime(v.createdAt)} {v.verifiedBy ? `by ${v.verifiedBy}` : ''}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink-muted">No verification has been recorded yet.</p>
        )}
      </section>
    </div>
  );
}

export function PubStatus({ status }: { status: 'draft' | 'published' | 'archived' }) {
  return <PubBadge status={status} />;
}
