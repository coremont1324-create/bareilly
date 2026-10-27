import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, CircleDashed, HelpCircle, Info, X } from 'lucide-react';
import type { ChecklistResult, PublicationStatus } from '@mandal/shared';
import { useEffect, useId, useRef, type ReactNode } from 'react';

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(d);
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' }).format(d);
}

const PUB: Record<PublicationStatus, string> = {
  draft: 'bg-slate-100 text-slate-800 ring-slate-300',
  published: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  archived: 'bg-stone-100 text-stone-700 ring-stone-300',
};

export function PubBadge({ status }: { status: PublicationStatus }) {
  return <span className={clsx('chip ring-1 capitalize', PUB[status])}>{status}</span>;
}

export function Field({
  label,
  required,
  error,
  hint,
  children,
  htmlFor,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && (
          <span className="text-red-600" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function Banner({ tone, children, onClose }: { tone: 'error' | 'success' | 'info' | 'warning'; children: ReactNode; onClose?: () => void }) {
  const styles = {
    error: 'bg-red-50 text-red-900 ring-red-200',
    success: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
    info: 'bg-sky-50 text-sky-900 ring-sky-200',
    warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  }[tone];
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'info' ? Info : AlertTriangle;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={clsx('flex items-start gap-2 rounded-lg px-4 py-3 text-sm ring-1', styles)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="rounded p-0.5 hover:bg-black/5" aria-label="Dismiss">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** Accessible modal dialog using the native <dialog> element. */
export function Dialog({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="w-[min(36rem,calc(100vw-2rem))] rounded-xl p-0 shadow-lift backdrop:bg-navy-950/50"
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between border-b border-surface-line px-5 py-4">
            <h2 id={id} className="text-base font-bold text-navy-900">
              {title}
            </h2>
            <button type="button" onClick={onClose} className="rounded p-1 hover:bg-surface-muted" aria-label="Close">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-surface-line px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function ChecklistPanel({ result, compact = false }: { result: ChecklistResult; compact?: boolean }) {
  const total = result.items.length;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-navy-900">
          {result.completeCount}/{total} complete
          {result.tbc.length > 0 && <span className="font-normal text-amber-800"> · {result.tbc.length} to be confirmed</span>}
        </p>
        <span className={clsx('chip ring-1', result.canPublish ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-red-50 text-red-800 ring-red-200')}>
          {result.canPublish ? 'Ready to publish' : `${result.missing.length} missing`}
        </span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div className="h-full bg-emerald-600" style={{ width: `${((result.completeCount + result.tbc.length) / total) * 100}%` }} />
      </div>
      <ul className={clsx('grid gap-1.5 text-sm', !compact && 'sm:grid-cols-2')}>
        {result.items.map((i) => (
          <li key={i.key} className="flex items-start gap-2">
            {i.state === 'complete' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Complete" />
            ) : i.state === 'tbc' ? (
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label="To be confirmed" />
            ) : (
              <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-label="Missing" />
            )}
            <span>
              <span className={clsx(i.state === 'missing' ? 'text-red-800' : 'text-ink')}>{i.label}</span>
              {i.state === 'tbc' && <span className="text-xs text-amber-800"> — To be confirmed</span>}
              {i.message && i.state === 'missing' && <span className="block text-xs text-red-700">{i.message}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
