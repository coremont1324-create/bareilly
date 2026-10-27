import clsx from 'clsx';
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FlaskConical,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Home,
  LayoutGrid,
  Loader2,
  SearchX,
  Sprout,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { ApplicationStatus, PublicLink } from '@mandal/shared';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n';

// ------------------------------------------------------------ categories

const ICONS: Record<string, LucideIcon> = {
  sprout: Sprout,
  'graduation-cap': GraduationCap,
  'heart-pulse': HeartPulse,
  home: Home,
  'hand-coins': HandCoins,
  users: Users,
  briefcase: Briefcase,
  grid: LayoutGrid,
};

/** Literal class names so Tailwind can see them. */
export const CATEGORY_STYLES: Record<string, { tile: string; soft: string; text: string; chip: string; ring: string }> = {
  green: { tile: 'bg-emerald-600', soft: 'bg-emerald-50', text: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-800', ring: 'ring-emerald-200' },
  blue: { tile: 'bg-blue-600', soft: 'bg-blue-50', text: 'text-blue-700', chip: 'bg-blue-50 text-blue-800', ring: 'ring-blue-200' },
  red: { tile: 'bg-rose-600', soft: 'bg-rose-50', text: 'text-rose-600', chip: 'bg-rose-50 text-rose-800', ring: 'ring-rose-200' },
  orange: { tile: 'bg-orange-500', soft: 'bg-orange-50', text: 'text-orange-600', chip: 'bg-orange-50 text-orange-800', ring: 'ring-orange-200' },
  purple: { tile: 'bg-violet-600', soft: 'bg-violet-50', text: 'text-violet-600', chip: 'bg-violet-50 text-violet-800', ring: 'ring-violet-200' },
  teal: { tile: 'bg-teal-600', soft: 'bg-teal-50', text: 'text-teal-700', chip: 'bg-teal-50 text-teal-800', ring: 'ring-teal-200' },
  slate: { tile: 'bg-slate-600', soft: 'bg-slate-100', text: 'text-slate-700', chip: 'bg-slate-100 text-slate-800', ring: 'ring-slate-200' },
};

export function categoryStyle(color?: string | null) {
  return CATEGORY_STYLES[color ?? 'slate'] ?? CATEGORY_STYLES.slate;
}

export function CategoryIcon({ icon, color, size = 'md', className }: { icon?: string | null; color?: string | null; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const Icon = ICONS[icon ?? 'grid'] ?? LayoutGrid;
  const s = categoryStyle(color);
  const dims = size === 'sm' ? 'h-9 w-9 rounded-lg' : size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-xl';
  const iconDims = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6';
  return (
    <span className={clsx('inline-flex shrink-0 items-center justify-center text-white shadow-sm', s.tile, dims, className)} aria-hidden="true">
      <Icon className={iconDims} strokeWidth={2.2} />
    </span>
  );
}

export function categoryIconComponent(icon?: string | null): LucideIcon {
  return ICONS[icon ?? 'grid'] ?? LayoutGrid;
}

export function CategoryChip({ name, color }: { name: string; color?: string | null }) {
  return <span className={clsx('chip', categoryStyle(color).chip)}>{name}</span>;
}

// ------------------------------------------------------------ status

const STATUS_STYLE: Record<ApplicationStatus, { cls: string; Icon: LucideIcon }> = {
  open: { cls: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200', Icon: BadgeCheck },
  year_round: { cls: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200', Icon: Clock },
  closed: { cls: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300', Icon: XCircle },
  tbc: { cls: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200', Icon: AlertTriangle },
};

export function StatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  const { t } = useI18n();
  const { cls, Icon } = STATUS_STYLE[status];
  return (
    <span className={clsx('chip whitespace-nowrap', cls, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {t(`status.${status}`)}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span className={clsx('chip bg-violet-50 text-violet-800 ring-1 ring-violet-200', className)} title={t('app.demoData')}>
      <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
      Demo
    </span>
  );
}

export function TbcText({ className }: { className?: string }) {
  const { t } = useI18n();
  return <span className={clsx('font-medium text-amber-800', className)}>{t('card.tbc')}</span>;
}

// ------------------------------------------------------------ links

/**
 * Official external link. Only receives links that already passed server-side
 * HTTPS + official-domain validation, and still re-checks the protocol here.
 */
export function OfficialLink({
  link,
  children,
  className,
  showHost = false,
}: {
  link: PublicLink;
  children: ReactNode;
  className?: string;
  showHost?: boolean;
}) {
  const { t } = useI18n();
  if (!link.url.startsWith('https://')) return null;
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer external" className={className} title={`${t('detail.externalNote')}: ${link.host}`}>
      {children}
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only"> {t('common.externalLink')}</span>
      {showHost && <span className="ml-1 text-xs font-normal opacity-80">({link.host})</span>}
    </a>
  );
}

// ------------------------------------------------------------ feedback states

export function Spinner({ label, className }: { label?: string; className?: string }) {
  const { t } = useI18n();
  return (
    <div role="status" className={clsx('flex items-center justify-center gap-2 py-10 text-ink-muted', className)}>
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-slate-200/70', className)} aria-hidden="true" />;
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-amber-600" aria-hidden="true" />
      <p className="text-ink-soft">{message ?? t('common.error')}</p>
      {onRetry && (
        <button type="button" className="btn-outline" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <SearchX className="h-7 w-7" aria-hidden="true" />
      </span>
      <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
      {text && <p className="max-w-md text-ink-soft">{text}</p>}
      {action}
    </div>
  );
}

// ------------------------------------------------------------ pagination

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const { t } = useI18n();
  if (totalPages <= 1) return null;
  const pages: (number | '…')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  const base = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold';
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 pt-2">
      <button type="button" className={clsx(base, 'text-ink-soft hover:bg-white disabled:opacity-40')} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label={t('common.previous')}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-1 text-ink-muted" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={t('common.page', { page: p })}
            className={clsx(base, p === page ? 'bg-brand text-white' : 'text-ink-soft hover:bg-white')}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className={clsx(base, 'text-ink-soft hover:bg-white disabled:opacity-40')} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label={t('common.next')}>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
