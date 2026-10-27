import clsx from 'clsx';
import { ChevronDown, Globe, MapPin, Menu, Search, UserRound, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LANGUAGES, useI18n, type Language } from '../i18n';
import { usePrefs } from '../lib/prefs';
import { LogoMark } from './Logo';

export function MandalSelect({ variant = 'pill', id }: { variant?: 'pill' | 'field'; id?: string }) {
  const { t } = useI18n();
  const { mandals, mandalSlug, setMandal } = usePrefs();
  const autoId = useId();
  const selectId = id ?? `mandal-${autoId}`;
  const districts = Array.from(new Set(mandals.map((m) => `${m.district}, ${m.state}`)));
  return (
    <div className={clsx('relative', variant === 'pill' ? 'inline-flex' : 'block')}>
      <label htmlFor={selectId} className="sr-only">
        {t('nav.mandal')}
      </label>
      <MapPin
        className={clsx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', variant === 'pill' ? 'text-white/90' : 'text-brand')}
        aria-hidden="true"
      />
      <select
        id={selectId}
        value={mandalSlug ?? ''}
        onChange={(e) => setMandal(e.target.value)}
        className={clsx(
          'appearance-none rounded-full py-2 pl-9 pr-9 text-sm font-medium',
          variant === 'pill'
            ? 'border border-white/25 bg-white/10 text-white hover:bg-white/15 [&>optgroup]:text-ink [&>option]:text-ink'
            : 'input rounded-lg',
        )}
      >
        {mandals.length === 0 && <option value="">{t('common.loading')}</option>}
        {districts.map((d) => (
          <optgroup key={d} label={d}>
            {mandals
              .filter((m) => `${m.district}, ${m.state}` === d)
              .map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name} Mandal
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown
        className={clsx('pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2', variant === 'pill' ? 'text-white/80' : 'text-ink-muted')}
        aria-hidden="true"
      />
    </div>
  );
}

export function LanguageSelect({ variant = 'dark', id }: { variant?: 'dark' | 'light'; id?: string }) {
  const { t, lang, setLang } = useI18n();
  const autoId = useId();
  const selectId = id ?? `lang-${autoId}`;
  return (
    <div className="relative inline-flex w-full sm:w-auto">
      <label htmlFor={selectId} className="sr-only">
        {t('nav.language')}
      </label>
      <Globe className={clsx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', variant === 'dark' ? 'text-white/90' : 'text-brand')} aria-hidden="true" />
      <select
        id={selectId}
        value={lang}
        onChange={(e) => setLang(e.target.value as Language)}
        className={clsx(
          'w-full appearance-none py-2 pl-9 pr-8 text-sm font-medium',
          variant === 'dark'
            ? 'rounded-full border border-white/25 bg-white/10 text-white hover:bg-white/15 [&>option]:text-ink'
            : 'input',
        )}
      >
        {LANGUAGES.map((l) => (
          <option key={l} value={l}>
            {t(`lang.${l}`)}
          </option>
        ))}
      </select>
      <ChevronDown className={clsx('pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2', variant === 'dark' ? 'text-white/80' : 'text-ink-muted')} aria-hidden="true" />
    </div>
  );
}

const NAV = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/schemes', key: 'nav.schemes', end: false },
  { to: '/help', key: 'nav.help', end: false },
] as const;

export function Header() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'relative px-1 py-2 text-sm font-medium transition-colors',
      isActive ? 'text-white after:absolute after:inset-x-0 after:-bottom-[13px] after:h-[3px] after:rounded-full after:bg-amber-300' : 'text-white/80 hover:text-white',
    );

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-navy-900 via-navy-800 to-ocean-800 text-white shadow-md">
      <div className="page flex h-[68px] items-center gap-4">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label={`${t('app.name')} — ${t('nav.home')}`}>
          <LogoMark className="h-10 w-10 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-base font-bold leading-tight sm:text-lg">{t('app.name')}</span>
            <span className="block truncate text-[11px] leading-tight text-white/75 sm:text-xs">{t('app.tagline')}</span>
          </span>
        </Link>

        <div className="ml-auto hidden items-center gap-5 lg:flex">
          <MandalSelect />
          <nav aria-label={t('nav.primary')} className="flex items-center gap-6">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}>
                {t(n.key)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate('/schemes', { state: { focusSearch: true } })}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
              aria-label={t('nav.search')}
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="w-36">
              <LanguageSelect />
            </div>
            <Link to="/admin" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white/90 hover:bg-white/10" aria-label={t('nav.admin')}>
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <button
          type="button"
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? t('nav.closeMenu') : t('nav.menu')}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-white/10 bg-navy-900 lg:hidden">
          <div className="page flex flex-col gap-3 py-4">
            <nav aria-label={t('nav.primary')} className="flex flex-col">
              {[...NAV, { to: '/notices', key: 'nav.notices', end: false } as const].map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) => clsx('rounded-lg px-3 py-3 text-base font-medium', isActive ? 'bg-white/10 text-white' : 'text-white/85 hover:bg-white/5')}
                >
                  {t(n.key)}
                </NavLink>
              ))}
            </nav>
            <MandalSelect />
            <LanguageSelect />
            <Link to="/admin" className="rounded-lg px-3 py-3 text-sm text-white/80 hover:bg-white/5">
              {t('nav.admin')}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
