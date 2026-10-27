import clsx from 'clsx';
import { ArrowRight, Building2, CalendarDays, ChevronRight, HandCoins, ShieldCheck, UserRound } from 'lucide-react';
import type { NoticeSummary, SchemeSummary } from '@mandal/shared';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { FieldBanner } from '../illustrations/Scenes';
import { CategoryChip, CategoryIcon, DemoBadge, OfficialLink, StatusBadge, TbcText } from './ui';

/** Deadline line shared by all cards: never shows an unconfirmed date. */
export function DeadlineText({ scheme, prefix = true }: { scheme: Pick<SchemeSummary, 'deadline' | 'deadlineTbc' | 'applicationStatus'>; prefix?: boolean }) {
  const { t, formatDate } = useI18n();
  let value: React.ReactNode;
  if (scheme.deadline) value = formatDate(scheme.deadline);
  else if (scheme.applicationStatus === 'year_round') value = t('status.year_round');
  else if (scheme.deadlineTbc || scheme.applicationStatus === 'tbc') value = <TbcText />;
  else value = '—';
  return (
    <>
      {prefix && `${t('card.lastDate')}: `}
      {value}
    </>
  );
}

/**
 * "Apply on official site" only when a verified application URL exists; otherwise a
 * "Visit official website" link, or an explicit "Official link to be confirmed".
 */
export function OfficialActions({ scheme }: { scheme: Pick<SchemeSummary, 'applicationLink' | 'officialLink'> }) {
  const { t } = useI18n();
  if (scheme.applicationLink) {
    return (
      <OfficialLink link={scheme.applicationLink} className="btn-outline whitespace-nowrap py-2">
        {t('card.applyOfficial')}
      </OfficialLink>
    );
  }
  return (
    <>
      {scheme.officialLink && (
        <OfficialLink link={scheme.officialLink} className="btn-outline whitespace-nowrap py-2">
          {t('detail.visitOfficial')}
        </OfficialLink>
      )}
      <span className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-1.5 text-center text-xs font-medium text-amber-800">
        {scheme.officialLink ? t('card.applyLinkTbc') : t('card.linkTbc')}
      </span>
    </>
  );
}

/** Directory card (Schemes page). */
export function SchemeListCard({ scheme }: { scheme: SchemeSummary }) {
  const { t, formatDate } = useI18n();
  return (
    <article className="card flex flex-col gap-4 p-4 sm:flex-row sm:p-5" aria-labelledby={`s-${scheme.id}`}>
      <div className="flex min-w-0 flex-1 gap-4">
        <CategoryIcon icon={scheme.category?.icon} color={scheme.category?.color} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`s-${scheme.id}`} className="text-base font-bold text-navy-900">
              <Link to={`/schemes/${scheme.slug}`} className="hover:underline">
                {scheme.name}
              </Link>
            </h3>
            {scheme.category && <CategoryChip name={scheme.category.name} color={scheme.category.color} />}
            {scheme.isDemo && <DemoBadge />}
          </div>
          <p className="mt-1.5 text-sm text-ink-soft">{scheme.shortDescription}</p>
          {scheme.eligibilitySummary && (
            <p className="mt-1.5 text-sm text-ink-soft">
              <span className="font-semibold text-ink">{t('schemes.eligibility')}: </span>
              {scheme.eligibilitySummary}
            </p>
          )}
          <ul className="mt-3 space-y-1.5 text-xs text-ink-muted">
            {scheme.department && (
              <li className="flex items-start gap-2">
                <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{scheme.department}</span>
              </li>
            )}
            <li className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                <DeadlineText scheme={scheme} />
              </span>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {scheme.lastVerifiedOn ? `${t('card.verified')}: ${formatDate(scheme.lastVerifiedOn)}` : t('card.notVerified')}
              </span>
            </li>
          </ul>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-56 sm:items-end">
        <StatusBadge status={scheme.applicationStatus} className="self-start sm:self-end" />
        <div className="mt-auto flex flex-col gap-2 sm:w-full">
          <Link to={`/schemes/${scheme.slug}`} className="btn-primary py-2">
            {t('card.viewDetails')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <OfficialActions scheme={scheme} />
        </div>
      </div>
    </article>
  );
}

/** Compact row used in the home page "Featured Schemes" panel. */
export function FeaturedRow({ scheme }: { scheme: SchemeSummary }) {
  return (
    <li>
      <Link
        to={`/schemes/${scheme.slug}`}
        className="flex items-center gap-3 rounded-xl border border-surface-line bg-white p-3 transition-shadow hover:shadow-card"
      >
        <CategoryIcon icon={scheme.category?.icon} color={scheme.category?.color} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-navy-900">{scheme.name}</span>
          <span className="block truncate text-xs text-ink-muted">
            {scheme.category?.name ? `${scheme.category.name} · ` : ''}
            {scheme.benefitsSummary || scheme.shortDescription}
          </span>
        </span>
        <StatusBadge status={scheme.applicationStatus} />
      </Link>
    </li>
  );
}

/**
 * Reusable scheme card (reference panel 6): icon, name, category, description,
 * who it is for, benefit, deadline and actions.
 */
export function SchemeCard({ scheme, className, actionsDisabled = false }: { scheme: SchemeSummary; className?: string; actionsDisabled?: boolean }) {
  const { t } = useI18n();
  return (
    <article className={clsx('card overflow-hidden', className)} aria-label={scheme.name}>
      <div className="relative flex gap-4 p-5">
        <FieldBanner className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-1/2 opacity-90 sm:block" />
        <CategoryIcon icon={scheme.category?.icon} color={scheme.category?.color} size="lg" className="relative" />
        <div className="relative min-w-0 flex-1 sm:max-w-[60%]">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-navy-900">{scheme.name}</h3>
            <StatusBadge status={scheme.applicationStatus} />
          </div>
          {scheme.category && <CategoryChip name={scheme.category.name} color={scheme.category.color} />}
          <p className="mt-2 text-sm text-ink-soft">{scheme.shortDescription}</p>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-4 border-t border-surface-line px-5 py-4 text-sm sm:grid-cols-3">
        <div className="flex gap-3">
          <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <dt className="text-xs text-ink-muted">{t('card.for')}</dt>
            <dd className="font-medium text-ink">{scheme.targetGroup || scheme.eligibilitySummary || <TbcText />}</dd>
          </div>
        </div>
        <div className="flex gap-3">
          <HandCoins className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <dt className="text-xs text-ink-muted">{t('card.benefit')}</dt>
            <dd className="font-medium text-ink">{scheme.benefitsSummary || <TbcText />}</dd>
          </div>
        </div>
        <div className="flex gap-3">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <dt className="text-xs text-ink-muted">{t('card.deadline')}</dt>
            <dd className="font-medium text-ink">
              <DeadlineText scheme={scheme} prefix={false} />
            </dd>
          </div>
        </div>
      </dl>
      <div className="flex flex-col gap-2 px-5 pb-5 sm:flex-row">
        {actionsDisabled ? (
          <span className="btn-green pointer-events-none opacity-90">{t('card.viewDetails')}</span>
        ) : (
          <Link to={`/schemes/${scheme.slug}`} className="btn-green">
            {t('card.viewDetails')}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
        <OfficialActions scheme={scheme} />
      </div>
    </article>
  );
}

export function NoticeItem({ notice, compact = false }: { notice: NoticeSummary; compact?: boolean }) {
  const { t, formatDate } = useI18n();
  return (
    <li className={clsx('flex gap-3', compact ? 'py-3' : 'card p-4')}>
      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-navy-900">
          {notice.scheme ? (
            <Link to={`/schemes/${notice.scheme.slug}`} className="hover:underline">
              {notice.title}
            </Link>
          ) : (
            notice.title
          )}
        </p>
        {!compact && notice.summary && <p className="mt-1 text-sm text-ink-soft">{notice.summary}</p>}
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span>
            <span className="sr-only">{t('notices.published')}: </span>
            <time dateTime={notice.publishedOn}>{formatDate(notice.publishedOn)}</time>
          </span>
          {notice.deadline && (
            <span className="font-medium text-amber-800">
              {t('notices.deadline')}: <time dateTime={notice.deadline}>{formatDate(notice.deadline)}</time>
            </span>
          )}
          {notice.isDemo && <span className="text-violet-700">Demo</span>}
        </p>
        {!compact && (
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {notice.scheme && (
              <Link to={`/schemes/${notice.scheme.slug}`} className="font-semibold text-brand hover:underline">
                {t('notices.relatedScheme')}: {notice.scheme.name}
              </Link>
            )}
            {notice.officialLink && (
              <OfficialLink link={notice.officialLink} className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:underline">
                {t('notices.officialNotice')}
              </OfficialLink>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
