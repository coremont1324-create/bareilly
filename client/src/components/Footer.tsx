import { CircleHelp, Clock, ExternalLink, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { Sprig } from '../illustrations/Scenes';
import { useMeta } from '../lib/queries';

/** "Need help?" band. Shows only help-desk details an administrator has marked verified. */
export function HelpBand() {
  const { t } = useI18n();
  const meta = useMeta();
  const h = meta.data?.helpdesk;
  return (
    <section aria-labelledby="helpband-title" className="bg-gradient-to-r from-navy-900 via-navy-800 to-ocean-800 text-white">
      <div className="page flex flex-col gap-5 py-7 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/90">
            <CircleHelp className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 id="helpband-title" className="text-lg font-bold">
            {t('help.needHelp')}
          </h2>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-x-8 gap-y-3 text-sm md:pl-6">
          {h ? (
            <>
              {h.phone && (
                <a href={`tel:${h.phone.replace(/[^0-9+]/g, '')}`} className="inline-flex items-center gap-2 hover:underline">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {h.phone}
                </a>
              )}
              {h.email && (
                <a href={`mailto:${h.email}`} className="inline-flex items-center gap-2 hover:underline">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {h.email}
                </a>
              )}
              {h.hours && (
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {h.hours}
                </span>
              )}
              {h.supportUrl && (
                <a href={h.supportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  {t('detail.contactSupport')}
                </a>
              )}
            </>
          ) : (
            <p className="max-w-xl text-white/85">
              {t('help.contactUnverified')}{' '}
              <Link to="/help#contacts" className="font-semibold underline underline-offset-2">
                {t('help.visitHelp')}
              </Link>
            </p>
          )}
        </div>
        <div className="hidden items-center gap-3 text-right md:flex">
          <p className="text-xs leading-tight text-white/85">
            <span className="block font-semibold">{t('help.together')}</span>
            <span className="block text-emerald-300">{t('help.strongerMandal')}</span>
          </p>
          <Sprig className="h-12 w-12 text-emerald-400" />
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  return (
    <footer className="bg-navy-950 text-white/75">
      <div className="page flex flex-col gap-4 py-6 text-xs sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl leading-relaxed">{t('app.disclaimer')}</p>
        <nav aria-label="Footer" className="flex shrink-0 flex-wrap gap-x-5 gap-y-2">
          <Link to="/schemes" className="hover:text-white">
            {t('nav.schemes')}
          </Link>
          <Link to="/notices" className="hover:text-white">
            {t('nav.notices')}
          </Link>
          <Link to="/help" className="hover:text-white">
            {t('nav.help')}
          </Link>
          <span>© {year}</span>
        </nav>
      </div>
    </footer>
  );
}
