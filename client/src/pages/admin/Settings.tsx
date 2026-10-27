import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import type { MandalOffice, MetaResponse, PortalSettings } from '@mandal/shared';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ErrorState, Spinner } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { AdminPage, type Me } from './AdminLayout';
import { Banner, Field, formatDateTime } from './components';

export function SettingsPage() {
  const me = useOutletContext<Me>();
  const canEdit = me.role === 'super_admin';
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => api<PortalSettings>('/admin/settings') });
  const meta = useQuery({ queryKey: ['meta'], queryFn: () => api<MetaResponse>('/meta') });
  const offices = useQuery({ queryKey: ['admin', 'offices'], queryFn: () => api<{ items: MandalOffice[] }>('/admin/offices') });

  const [form, setForm] = useState<{ phone: string; email: string; hours: string; supportUrl: string; verified: boolean; domains: string; defaultMandalSlug: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (settings.data && !form) {
      const h = settings.data.helpdesk;
      setForm({
        phone: h.phone ?? '',
        email: h.email ?? '',
        hours: h.hours,
        supportUrl: h.supportUrl ?? '',
        verified: h.verified,
        domains: settings.data.officialDomains.join('\n'),
        defaultMandalSlug: settings.data.defaultMandalSlug ?? '',
      });
    }
  }, [settings.data, form]);

  if (settings.isLoading || !form) return settings.isError ? <ErrorState onRetry={() => settings.refetch()} /> : <Spinner />;

  const save = async () => {
    setErrors({});
    setBanner(null);
    try {
      await api('/admin/settings', {
        method: 'PUT',
        body: {
          helpdesk: { phone: form.phone || null, email: form.email || null, hours: form.hours, supportUrl: form.supportUrl || null, verified: form.verified },
          officialDomains: form.domains
            .split(/[\n,]/)
            .map((d) => d.trim())
            .filter(Boolean),
          defaultMandalSlug: form.defaultMandalSlug || null,
        },
      });
      setBanner({ tone: 'success', text: 'Settings saved.' });
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      qc.invalidateQueries({ queryKey: ['meta'] });
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.details?.fields ?? {});
        setBanner({ tone: 'error', text: e.message });
      }
    }
  };

  const fieldErr = (prefix: string) => Object.entries(errors).find(([k]) => k === prefix || k.startsWith(`${prefix}.`))?.[1];

  return (
    <AdminPage
      title="Settings"
      actions={
        canEdit && (
          <button type="button" className="btn-primary" onClick={save}>
            <Save className="h-4 w-4" aria-hidden="true" /> Save settings
          </button>
        )
      }
    >
      {!canEdit && (
        <div className="mb-4">
          <Banner tone="info">Only super administrators can change settings.</Banner>
        </div>
      )}
      {banner && (
        <div className="mb-4">
          <Banner tone={banner.tone} onClose={() => setBanner(null)}>
            {banner.text}
          </Banner>
        </div>
      )}
      <fieldset disabled={!canEdit} className="grid gap-5 lg:grid-cols-2">
        <section className="card space-y-4 p-5" aria-labelledby="hd-h">
          <h2 id="hd-h" className="text-base font-bold text-navy-900">
            Portal help desk
          </h2>
          <p className="text-sm text-ink-soft">Shown in the “Need help?” band and the Help page only after you tick “verified”. Never enter placeholder numbers.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="s-phone" error={fieldErr('helpdesk.phone')}>
              <input id="s-phone" type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email" htmlFor="s-email" error={fieldErr('helpdesk.email')}>
              <input id="s-email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          </div>
          <Field label="Office hours" htmlFor="s-hours" error={fieldErr('helpdesk.hours')}>
            <input id="s-hours" className="input" placeholder="e.g. Mon–Fri, 10 AM – 5 PM" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
          </Field>
          <Field label="Support page link" htmlFor="s-url" error={fieldErr('helpdesk.supportUrl')}>
            <input id="s-url" type="url" className="input" value={form.supportUrl} onChange={(e) => setForm({ ...form, supportUrl: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 rounded text-brand" checked={form.verified} onChange={(e) => setForm({ ...form, verified: e.target.checked })} />
            These contact details are verified and may be published
          </label>
        </section>

        <section className="card space-y-4 p-5" aria-labelledby="dom-h">
          <h2 id="dom-h" className="text-base font-bold text-navy-900">
            Link safety &amp; defaults
          </h2>
          <Field label="Approved official domains" htmlFor="s-domains" error={fieldErr('officialDomains')} hint="One per line. Links must be HTTPS and on one of these domains (or a subdomain) to be shown as official.">
            <textarea id="s-domains" rows={5} className="input font-mono" value={form.domains} onChange={(e) => setForm({ ...form, domains: e.target.value })} />
          </Field>
          <Field label="Default mandal for new visitors" htmlFor="s-mandal">
            <select id="s-mandal" className="input" value={form.defaultMandalSlug} onChange={(e) => setForm({ ...form, defaultMandalSlug: e.target.value })}>
              <option value="">First mandal in the list</option>
              {(meta.data?.mandals ?? []).map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name} ({m.district})
                </option>
              ))}
            </select>
          </Field>
        </section>
      </fieldset>

      <section className="card mt-5 p-5" aria-labelledby="off-h">
        <h2 id="off-h" className="text-base font-bold text-navy-900">
          Mandal office contacts
        </h2>
        <p className="mt-1 text-sm text-ink-soft">Citizens only see offices marked as verified.</p>
        {offices.isLoading ? (
          <Spinner />
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {(offices.data?.items ?? []).map((o) => (
              <OfficeEditor key={o.mandalId} office={o} canEdit={canEdit} onSaved={() => qc.invalidateQueries({ queryKey: ['admin', 'offices'] })} />
            ))}
          </ul>
        )}
      </section>
    </AdminPage>
  );
}

function OfficeEditor({ office, canEdit, onSaved }: { office: MandalOffice; canEdit: boolean; onSaved: () => void }) {
  const [f, setF] = useState({ ...office, phone: office.phone ?? '', email: office.email ?? '' });
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const id = `o-${office.mandalId}`;
  const save = async () => {
    setMsg(null);
    try {
      await api(`/admin/offices/${office.mandalId}`, {
        method: 'PUT',
        body: { officeName: f.officeName, address: f.address, phone: f.phone || null, email: f.email || null, hours: f.hours, isVerified: f.isVerified, source: f.source },
      });
      setMsg({ tone: 'success', text: 'Saved' });
      onSaved();
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof ApiError ? Object.values(e.details?.fields ?? {})[0] ?? e.message : 'Failed' });
    }
  };
  return (
    <li className="rounded-xl border border-surface-line p-4">
      <details>
        <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold text-navy-900">
          {office.mandalName}
          <span className={office.isVerified ? 'chip bg-emerald-50 text-emerald-800' : 'chip bg-amber-50 text-amber-800'}>{office.isVerified ? 'Verified' : office.officeName ? 'Unverified' : 'Not set'}</span>
        </summary>
        <fieldset disabled={!canEdit} className="mt-3 space-y-3">
          <Field label="Office name" required htmlFor={`${id}-name`}>
            <input id={`${id}-name`} className="input" value={f.officeName} onChange={(e) => setF({ ...f, officeName: e.target.value })} />
          </Field>
          <Field label="Address" htmlFor={`${id}-addr`}>
            <textarea id={`${id}-addr`} rows={2} className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone" htmlFor={`${id}-phone`}>
              <input id={`${id}-phone`} type="tel" className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            </Field>
            <Field label="Email" htmlFor={`${id}-email`}>
              <input id={`${id}-email`} type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </Field>
          </div>
          <Field label="Working hours" htmlFor={`${id}-hours`}>
            <input id={`${id}-hours`} className="input" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} />
          </Field>
          <Field label="Verification source" htmlFor={`${id}-src`}>
            <input id={`${id}-src`} className="input" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded text-brand" checked={f.isVerified} onChange={(e) => setF({ ...f, isVerified: e.target.checked })} />
            Verified — publish to citizens
          </label>
          <div className="flex items-center gap-3">
            <button type="button" className="btn-outline py-1.5" onClick={save}>
              Save office
            </button>
            {msg && <span className={msg.tone === 'error' ? 'text-sm text-red-700' : 'text-sm text-emerald-700'}>{msg.text}</span>}
            {office.updatedAt && <span className="ml-auto text-xs text-ink-muted">Updated {formatDateTime(office.updatedAt)}</span>}
          </div>
        </fieldset>
      </details>
    </li>
  );
}
