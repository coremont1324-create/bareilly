import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  FlaskConical,
  Info,
  LayoutGrid,
  LifeBuoy,
  Mail,
  MapPin,
  Phone,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { verificationState, type SchemeDetail, type TbcField } from '@mandal/shared';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTitle } from '../components/Layout';
import { DeadlineText, NoticeItem } from '../components/SchemeCards';
import { CategoryIcon, EmptyState, ErrorState, OfficialLink, Skeleton, StatusBadge } from '../components/ui';
import { useI18n, type MessageKey } from '../i18n';
import { FieldBanner } from '../illustrations/Scenes';
import type { ApiError } from '../lib/api';
import { usePrefs } from '../lib/prefs';
import { useScheme } from '../lib/queries';

const SECTIONS: { id: string; key: MessageKey }[] = [
  { id: 'overview', key: 'detail.overview' },
  { id: 'eligibility', key: 'detail.eligibility' },
  { id: 'benefits', key: 'detail.benefits' },
  { id: 'documents', key: 'detail.documentsShort' },
  { id: 'how-to-apply', key: 'detail.howToApply' },
  { id: 'help', key: 'detail.help' },
  { id: 'updates', key: 'detail.updates' },
];

function useScrollSpy(ids: string[]): string {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-90px 0px -55% 0px' },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  return active;
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 border-b border-surface-line pb-6 last:border-0">
      <h2 id={`${id}-h`} className="mb-3 text-base font-bold text-navy-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ListBlock({ items, tbc, ordered = false }: { items: string[]; tbc: boolean; ordered?: boolean }) {
  const { t } = useI18n();
  const List = ordered ? 'ol' : 'ul';
  return (
    <>
      {tbc && (
        <p className="mb-3 inline-flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {items.length ? `${t('detail.awaiting')}. ${t('detail.tbcSection')}` : t('detail.tbcSection')}
        </p>
      )}
      {items.length > 0 && (
        <List className={clsx('space-y-2 text-sm text-ink-soft', ordered ? 'list-none' : 'list-disc pl-5 marker:text-emerald-600')}>
          {items.map((item, i) =>
            ordered ? (
              <li key={i} className="flex gap-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
                <span className="pt-0.5">{item}</span>
              </li>
            ) : (
              <li key={i}>{item}</li>
            ),
          )}
        </List>
      )}
    </>
  );
}

function InfoTile({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 p-4">
      <span className="mt-0.5 text-emerald-700">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-ink-muted">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-ink">{children}</div>
      </div>
    </div>
  );
}

export function SchemeDetailView({ scheme, preview = false }: { scheme: SchemeDetail; preview?: boolean }) {
  const { t, formatDate } = useI18n();
  const { mandal } = usePrefs();
  const tbc = new Set<TbcField>(scheme.tbcFields);
  const active = useScrollSpy(SECTIONS.map((s) => s.id));
  const [shareMsg, setShareMsg] = useState('');
  const vState = verificationState(scheme.lastVerifiedOn, scheme.reviewDueOn);
  const applyLink = scheme.applicationLink;
  const officialLink = scheme.officialLink;
  const backTo = preview ? '/admin/schemes' : '/schemes';

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: scheme.name, text: scheme.shortDescription, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMsg(t('detail.copied'));
      window.setTimeout(() => setShareMsg(''), 2500);
    } catch {
      /* user cancelled */
    }
  };

  const availability = scheme.availableAllMandals
    ? t('detail.availableAll')
    : scheme.availableInMandal === false
      ? t('detail.notAvailableHere')
      : scheme.availableInMandal
        ? t('detail.availableHere')
        : scheme.mandals.map((m) => m.name).join(', ');

  return (
    <div className="page py-6 sm:py-8">
      <Link to={backTo} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('detail.back')}
      </Link>

      {/* Header */}
      <header className="card relative overflow-hidden">
        <FieldBanner className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[42%] lg:block" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:p-6">
          <CategoryIcon icon={scheme.category?.icon} color={scheme.category?.color} size="lg" />
          <div className="min-w-0 flex-1 lg:max-w-[56%]">
            <div className="flex flex-wrap items-start gap-3">
              <h1 className="text-2xl font-extrabold text-navy-900">{scheme.name}</h1>
              <StatusBadge status={scheme.applicationStatus} className="mt-1 lg:hidden" />
            </div>
            {scheme.department && <p className="mt-2 inline-block rounded-md bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-soft">{scheme.department}</p>}
            <p className="mt-3 text-ink-soft">{scheme.shortDescription}</p>
          </div>
          <StatusBadge status={scheme.applicationStatus} className="absolute right-5 top-5 hidden text-sm lg:inline-flex" />
        </div>
        <div className="relative grid grid-cols-1 divide-y divide-surface-line border-t border-surface-line bg-white sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          <InfoTile icon={<LayoutGrid className="h-5 w-5" />} label={t('detail.category')}>
            {scheme.category?.name ?? '—'}
          </InfoTile>
          <InfoTile icon={<Building2 className="h-5 w-5" />} label={t('detail.department')}>
            {scheme.department ?? '—'}
          </InfoTile>
          <InfoTile icon={<CalendarDays className="h-5 w-5" />} label={t('detail.lastDate')}>
            <DeadlineText scheme={scheme} prefix={false} />
          </InfoTile>
          <InfoTile icon={<MapPin className="h-5 w-5" />} label={t('detail.mandal')}>
            <span className={clsx('inline-flex items-center gap-1.5', scheme.availableInMandal === false ? 'text-amber-800' : 'text-emerald-800')}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {availability}
              {mandal && scheme.availableInMandal !== null && scheme.availableInMandal !== undefined && !scheme.availableAllMandals && ` (${mandal.name})`}
            </span>
          </InfoTile>
        </div>
      </header>

      {/* Trust warnings */}
      <div className="mt-4 space-y-2" role="note">
        {scheme.tbcFields.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t('detail.incompleteWarning')}
          </p>
        )}
        {vState !== 'verified' && (
          <p className="flex items-start gap-2 rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-900 ring-1 ring-orange-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t('detail.reviewDue')}
          </p>
        )}
        {scheme.isDemo && (
          <p className="flex items-start gap-2 rounded-lg bg-violet-50 px-4 py-3 text-sm text-violet-900 ring-1 ring-violet-200">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t('detail.demoWarning')}
          </p>
        )}
      </div>

      {/* On small screens, surface the primary action before the long content. */}
      <div className="mt-4 lg:hidden">
        {applyLink ? (
          <OfficialLink link={applyLink} className="btn-green w-full">
            {t('detail.goOfficial')}
          </OfficialLink>
        ) : officialLink ? (
          <OfficialLink link={officialLink} className="btn-green w-full">
            {t('detail.visitOfficial')}
          </OfficialLink>
        ) : (
          <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2.5 text-center text-sm font-medium text-amber-800">{t('card.linkTbc')}</p>
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[12rem_minmax(0,1fr)_19rem]">
        {/* Section nav */}
        <nav aria-label={t('detail.sections')} className="hidden lg:block">
          <ul className="card sticky top-24 space-y-0.5 p-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={active === s.id ? 'location' : undefined}
                  className={clsx(
                    'block rounded-lg border-l-[3px] px-3 py-2 text-sm',
                    active === s.id ? 'border-brand bg-brand-soft font-semibold text-brand' : 'border-transparent text-ink-soft hover:bg-surface-muted',
                  )}
                >
                  {t(s.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        {/* Mobile section chips */}
        <nav aria-label={t('detail.sections')} className="-mx-4 overflow-x-auto px-4 lg:hidden">
          <ul className="flex w-max gap-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="inline-block rounded-full border border-surface-line bg-white px-3 py-1.5 text-sm text-ink-soft">
                  {t(s.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="card space-y-6 p-5 sm:p-6">
          <Section id="overview" title={t('detail.overview')}>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{scheme.overview || scheme.shortDescription}</p>
            {scheme.beneficiaryGroups.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label={t('schemes.eligibility')}>
                {scheme.beneficiaryGroups.map((g) => (
                  <li key={g.slug} className="chip bg-surface-muted text-ink-soft">
                    {g.name}
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section id="eligibility" title={t('detail.eligibility')}>
            <ListBlock items={scheme.eligibility} tbc={tbc.has('eligibility')} />
          </Section>
          <Section id="benefits" title={t('detail.benefits')}>
            <ListBlock items={scheme.benefits} tbc={tbc.has('benefits')} />
          </Section>
          <Section id="documents" title={t('detail.documents')}>
            <ListBlock items={scheme.requiredDocuments} tbc={tbc.has('required_documents')} />
          </Section>
          <Section id="how-to-apply" title={t('detail.howToApply')}>
            <ListBlock items={scheme.applicationSteps} tbc={tbc.has('application_steps')} ordered />
          </Section>
          <Section id="help" title={t('detail.help')}>
            {tbc.has('help_contact') && !scheme.helpNotes ? (
              <ListBlock items={[]} tbc />
            ) : (
              <div className="space-y-2 text-sm text-ink-soft">
                {scheme.helpNotes && <p>{scheme.helpNotes}</p>}
                {scheme.helpPhone && (
                  <p>
                    <a className="inline-flex items-center gap-2 font-semibold text-brand hover:underline" href={`tel:${scheme.helpPhone.replace(/[^0-9+]/g, '')}`}>
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      {scheme.helpPhone}
                    </a>
                  </p>
                )}
                {scheme.helpEmail && (
                  <p>
                    <a className="inline-flex items-center gap-2 font-semibold text-brand hover:underline" href={`mailto:${scheme.helpEmail}`}>
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      {scheme.helpEmail}
                    </a>
                  </p>
                )}
                {tbc.has('help_contact') && <p className="text-amber-800">{t('detail.helpTbc')}</p>}
              </div>
            )}
          </Section>
          <Section id="updates" title={t('detail.updates')}>
            {scheme.notices.length ? (
              <ul className="divide-y divide-surface-line">
                {scheme.notices.map((n) => (
                  <NoticeItem key={n.id} notice={n} compact />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">{t('detail.noUpdates')}</p>
            )}
          </Section>
        </article>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="text-base font-bold text-navy-900">{t('detail.applyNow')}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t('detail.applyText')}</p>
            <div className="mt-4 flex flex-col gap-2">
              {applyLink ? (
                <OfficialLink link={applyLink} className="btn-green w-full">
                  {t('detail.goOfficial')}
                </OfficialLink>
              ) : officialLink ? (
                <OfficialLink link={officialLink} className="btn-green w-full">
                  {t('detail.visitOfficial')}
                </OfficialLink>
              ) : (
                <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2.5 text-center text-sm font-medium text-amber-800">{t('card.linkTbc')}</p>
              )}
              {applyLink && !tbc.has('official_link') && officialLink && officialLink.url !== applyLink.url && (
                <OfficialLink link={officialLink} className="btn-outline w-full">
                  {t('detail.visitOfficial')}
                </OfficialLink>
              )}
              {scheme.guidelinesLink ? (
                <OfficialLink link={scheme.guidelinesLink} className="btn-outline w-full">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {t('detail.downloadGuidelines')}
                </OfficialLink>
              ) : (
                <p className="text-center text-xs text-ink-muted">{t('detail.guidelinesTbc')}</p>
              )}
              {(applyLink || officialLink) && (
                <p className="text-center text-xs text-ink-muted">
                  {t('detail.externalNote')}: <span className="font-medium">{(applyLink ?? officialLink)!.host}</span>
                </p>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-base font-bold text-navy-900">{t('detail.needHelp')}</h2>
            <ul className="mt-3 space-y-2.5 text-sm">
              {scheme.helpPhone && (
                <li>
                  <a href={`tel:${scheme.helpPhone.replace(/[^0-9+]/g, '')}`} className="inline-flex items-center gap-2 text-brand hover:underline">
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    {scheme.helpPhone}
                  </a>
                </li>
              )}
              {scheme.helpEmail && (
                <li>
                  <a href={`mailto:${scheme.helpEmail}`} className="inline-flex items-center gap-2 text-brand hover:underline">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    {scheme.helpEmail}
                  </a>
                </li>
              )}
              <li>
                <Link to="/help#contacts" className="inline-flex items-center gap-2 text-brand hover:underline">
                  <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                  {t('detail.contactSupport')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
              <ShieldCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              {t('detail.trust')}
            </h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div>
                <dt className="text-xs font-semibold text-ink-muted">{t('detail.lastVerified')}</dt>
                <dd className="font-medium text-ink">{scheme.lastVerifiedOn ? formatDate(scheme.lastVerifiedOn) : t('card.notVerified')}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-ink-muted">{t('detail.lastUpdated')}</dt>
                <dd className="font-medium text-ink">{formatDate(scheme.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-ink-muted">{t('schemes.status')}</dt>
                <dd>
                  <StatusBadge status={scheme.applicationStatus} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-ink-muted">{t('detail.source')}</dt>
                <dd className="flex items-start gap-1.5 text-ink-soft">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {scheme.verificationSource || '—'}
                    {scheme.verificationSourceUrl && /^https:\/\//.test(scheme.verificationSourceUrl) && (
                      <>
                        {' '}
                        <a href={scheme.verificationSourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
                          ({t('detail.verificationSource')})
                        </a>
                      </>
                    )}
                  </span>
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center justify-end">
              <button type="button" onClick={share} className="btn-ghost px-2 py-1 text-brand">
                <Share2 className="h-4 w-4" aria-hidden="true" />
                {t('detail.share')}
              </button>
            </div>
            <p className="text-right text-xs text-emerald-700" aria-live="polite">
              {shareMsg}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function SchemeDetailPage() {
  const { slug = '' } = useParams();
  const { t } = useI18n();
  const { mandalSlug } = usePrefs();
  const q = useScheme(slug, mandalSlug ?? undefined);
  useTitle(q.data?.name ?? (q.isError ? t('detail.notFound') : undefined));

  if (q.isLoading) {
    return (
      <div className="page space-y-4 py-8">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (q.isError) {
    const status = (q.error as ApiError).status;
    return (
      <div className="page py-12">
        {status === 404 ? (
          <EmptyState
            title={t('detail.notFound')}
            text={t('detail.notFoundText')}
            action={
              <Link to="/schemes" className="btn-primary">
                {t('detail.back')}
              </Link>
            }
          />
        ) : (
          <ErrorState onRetry={() => q.refetch()} />
        )}
      </div>
    );
  }
  return <SchemeDetailView scheme={q.data!} />;
}
