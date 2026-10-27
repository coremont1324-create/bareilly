import clsx from 'clsx';
import {
  Accessibility,
  ArrowRight,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Clock,
  Contrast,
  Headset,
  Languages,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Type,
} from 'lucide-react';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { LanguageSelect, MandalSelect } from '../components/Header';
import { useTitle } from '../components/Layout';
import { Skeleton } from '../components/ui';
import { useI18n, type MessageKey } from '../i18n';
import { ForestBanner, Sprig } from '../illustrations/Scenes';
import { usePrefs } from '../lib/prefs';
import { useMeta, useOffice } from '../lib/queries';

const FAQ_KEYS = ['find', 'eligibility', 'documents', 'apply', 'deadlines', 'nolink', 'official'] as const;

function Tile({ icon, title, text, href, linkText, children, tone = 'white' }: { icon: ReactNode; title: string; text: string; href?: string; linkText?: string; children?: ReactNode; tone?: 'white' | 'blue' }) {
  return (
    <div className={clsx('card flex gap-4 p-5', tone === 'blue' && 'bg-sky-50')}>
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white">{icon}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold text-navy-900">{title}</h2>
        <p className="mt-1 text-sm text-ink-soft">{text}</p>
        {children}
        {href && linkText && (
          <a href={href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            {linkText} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}

function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const id = useId();
  return (
    <div className="border-b border-surface-line last:border-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-btn`}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-navy-900 hover:text-brand"
        >
          {q}
          <ChevronDown className={clsx('h-5 w-5 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
      </h3>
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-btn`} hidden={!open} className="pb-4 text-sm leading-relaxed text-ink-soft">
        {a}
      </div>
    </div>
  );
}

export function HelpPage() {
  const { t } = useI18n();
  useTitle(t('helpPage.title'));
  const meta = useMeta();
  const helpdesk = meta.data?.helpdesk;
  const { mandal, mandalSlug, textScale, setTextScale, highContrast, setHighContrast } = usePrefs();
  const office = useOffice(mandalSlug ?? undefined);
  const [query, setQuery] = useState('');

  const faqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_KEYS.map((k) => ({ k, q: t(`faq.${k}.q` as MessageKey), a: t(`faq.${k}.a` as MessageKey) })).filter(
      (f) => !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q),
    );
  }, [query, t]);

  const mandalName = mandal ? `${mandal.name} Mandal` : '';

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ocean-900 text-white" aria-labelledby="help-title">
        <ForestBanner className="absolute inset-0 -z-10 h-full w-full" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/85 via-navy-900/50 to-transparent" aria-hidden="true" />
        <div className="page py-12 sm:py-14">
          <h1 id="help-title" className="text-3xl font-extrabold sm:text-4xl">
            {t('helpPage.title')}
          </h1>
          <p className="mt-3 text-white/90">{t('helpPage.subtitle')}</p>
          <form
            role="search"
            className="mt-6 flex max-w-2xl items-center gap-2 rounded-xl bg-white p-1.5 shadow-lift"
            onSubmit={(e) => {
              e.preventDefault();
              document.getElementById('faq')?.scrollIntoView();
            }}
          >
            <label htmlFor="faq-search" className="sr-only">
              {t('helpPage.search')}
            </label>
            <Search className="ml-2 h-5 w-5 text-ink-muted" aria-hidden="true" />
            <input
              id="faq-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('helpPage.search')}
              className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-sm text-ink focus:outline-none focus:ring-0"
            />
            <button type="submit" className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-white hover:bg-emerald-800" aria-label={t('home.searchButton')}>
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </section>

      <div className="page py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Tile icon={<CircleHelp className="h-6 w-6" />} title={t('helpPage.faq')} text={t('helpPage.faqText')} href="#faq" linkText={t('helpPage.viewFaqs')} />
          <Tile icon={<ClipboardList className="h-6 w-6" />} title={t('helpPage.howTo')} text={t('helpPage.howToText')} href="#how-to-apply" linkText={t('helpPage.viewGuide')} />
          <Tile icon={<Phone className="h-6 w-6" />} title={t('helpPage.contacts')} text={t('helpPage.contactsText')} href="#contacts" linkText={t('helpPage.viewContacts')} />
          <Tile icon={<Accessibility className="h-6 w-6" />} title={t('helpPage.accessibility')} text={t('helpPage.accessibilityText')} href="#accessibility" linkText={t('helpPage.learnMore')} />
          <Tile icon={<Languages className="h-6 w-6" />} title={t('helpPage.language')} text={t('helpPage.languageText')}>
            <div className="mt-3 max-w-[14rem]">
              <LanguageSelect variant="light" id="help-lang" />
            </div>
          </Tile>
          <Tile icon={<Headset className="h-6 w-6" />} title={t('helpPage.moreHelp')} text={t('helpPage.moreHelpText')} tone="blue">
            {helpdesk ? (
              <ul className="mt-3 space-y-1.5 text-sm">
                {helpdesk.phone && (
                  <li>
                    <a href={`tel:${helpdesk.phone.replace(/[^0-9+]/g, '')}`} className="inline-flex items-center gap-2 font-medium text-brand hover:underline">
                      <Phone className="h-4 w-4" aria-hidden="true" /> {helpdesk.phone}
                    </a>
                  </li>
                )}
                {helpdesk.email && (
                  <li>
                    <a href={`mailto:${helpdesk.email}`} className="inline-flex items-center gap-2 font-medium text-brand hover:underline">
                      <Mail className="h-4 w-4" aria-hidden="true" /> {helpdesk.email}
                    </a>
                  </li>
                )}
                {helpdesk.hours && (
                  <li className="inline-flex items-center gap-2 text-ink-soft">
                    <Clock className="h-4 w-4" aria-hidden="true" /> {helpdesk.hours}
                  </li>
                )}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">{t('help.contactUnverified')}</p>
            )}
          </Tile>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <section id="faq" aria-labelledby="faq-h" className="card scroll-mt-24 p-5 sm:p-6">
              <h2 id="faq-h" className="section-title">
                {t('helpPage.faq')}
              </h2>
              <div className="mt-2" aria-live="polite">
                {faqs.length ? faqs.map((f, i) => <FaqItem key={`${f.k}-${query ? 'q' : ''}`} q={f.q} a={f.a} defaultOpen={Boolean(query) || i === 0} />) : <p className="py-4 text-sm text-ink-muted">{t('helpPage.noFaqMatch')}</p>}
              </div>
            </section>

            <section id="how-to-apply" aria-labelledby="howto-h" className="card scroll-mt-24 p-5 sm:p-6">
              <h2 id="howto-h" className="section-title">
                {t('helpPage.howTo')}
              </h2>
              <ol className="mt-4 space-y-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <li key={n} className="flex gap-4">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{n}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-navy-900">{t(`howto.${n}.title` as MessageKey)}</h3>
                      <p className="mt-0.5 text-sm text-ink-soft">{t(`howto.${n}.text` as MessageKey)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className="space-y-6">
            <section id="contacts" aria-labelledby="contacts-h" className="card scroll-mt-24 p-5">
              <h2 id="contacts-h" className="section-title">
                {t('helpPage.contacts')}
              </h2>
              <div className="mt-3">
                <MandalSelect variant="field" id="help-mandal" />
              </div>
              <div className="mt-4">
                {office.isLoading ? (
                  <Skeleton className="h-24" />
                ) : office.data?.office ? (
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2 font-semibold text-navy-900">
                      <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                      {office.data.office.officeName}
                    </p>
                    {office.data.office.address && (
                      <p className="flex gap-2 text-ink-soft">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>
                          <span className="sr-only">{t('helpPage.address')}: </span>
                          {office.data.office.address}
                        </span>
                      </p>
                    )}
                    {office.data.office.phone && (
                      <a className="flex items-center gap-2 text-brand hover:underline" href={`tel:${office.data.office.phone.replace(/[^0-9+]/g, '')}`}>
                        <Phone className="h-4 w-4" aria-hidden="true" /> {office.data.office.phone}
                      </a>
                    )}
                    {office.data.office.email && (
                      <a className="flex items-center gap-2 text-brand hover:underline" href={`mailto:${office.data.office.email}`}>
                        <Mail className="h-4 w-4" aria-hidden="true" /> {office.data.office.email}
                      </a>
                    )}
                    {office.data.office.hours && (
                      <p className="flex items-center gap-2 text-ink-soft">
                        <Clock className="h-4 w-4" aria-hidden="true" /> {office.data.office.hours}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">{t('helpPage.officeUnverified', { mandal: mandalName })}</p>
                )}
              </div>
            </section>

            <section id="accessibility" aria-labelledby="a11y-h" className="card scroll-mt-24 p-5">
              <h2 id="a11y-h" className="section-title">
                {t('helpPage.accessibility')}
              </h2>
              <fieldset className="mt-3">
                <legend className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Type className="h-4 w-4" aria-hidden="true" /> {t('helpPage.textSize')}
                </legend>
                <div className="mt-2 inline-flex rounded-lg border border-surface-line bg-white p-1" role="group">
                  {([0, 1, 2] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={textScale === s}
                      aria-label={t(s === 0 ? 'helpPage.textSmaller' : s === 1 ? 'helpPage.textDefault' : 'helpPage.textLarger')}
                      onClick={() => setTextScale(s)}
                      className={clsx('min-w-[3rem] rounded-md px-3 py-1.5 font-semibold', textScale === s ? 'bg-brand text-white' : 'text-ink-soft hover:bg-surface-muted', s === 0 ? 'text-xs' : s === 2 ? 'text-lg' : 'text-sm')}
                    >
                      A{s === 0 ? '−' : s === 2 ? '+' : ''}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="mt-4">
                <button type="button" aria-pressed={highContrast} onClick={() => setHighContrast(!highContrast)} className="btn-outline">
                  <Contrast className="h-4 w-4" aria-hidden="true" />
                  {highContrast ? t('helpPage.contrastOn') : t('helpPage.contrastOff')}
                </button>
              </div>
              <p className="mt-4 text-sm text-ink-soft">{t('helpPage.a11yNotes')}</p>
            </section>

            <section id="language" aria-labelledby="lang-h" className="card scroll-mt-24 p-5">
              <h2 id="lang-h" className="section-title">
                {t('helpPage.language')}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">{t('helpPage.languageText')}</p>
              <div className="mt-3">
                <LanguageSelect variant="light" id="help-lang-2" />
              </div>
              <p className="mt-3 text-xs text-ink-muted">{t('helpPage.translationNote')}</p>
            </section>
          </div>
        </div>

        <section className="card mt-8 flex items-center gap-4 bg-gradient-to-r from-white to-emerald-50 p-5">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-emerald-600 text-emerald-700">
            <Headset className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <h2 className="text-base font-bold text-navy-900">{t('helpPage.weAreHere')}</h2>
            <p className="text-sm text-ink-soft">{t('helpPage.weAreHereText')}</p>
          </div>
          <Sprig className="hidden h-14 w-14 text-emerald-600 sm:block" />
        </section>
      </div>
    </>
  );
}
