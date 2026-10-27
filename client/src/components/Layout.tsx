import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { Footer, HelpBand } from './Footer';
import { Header } from './Header';

export function PublicLayout() {
  const { t } = useI18n();
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    // Content may still be loading; retry briefly until the anchor exists.
    let tries = 0;
    const id = window.setInterval(() => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el || ++tries > 20) {
        window.clearInterval(id);
        el?.scrollIntoView();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [pathname, hash]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only z-50 rounded-lg bg-amber-300 px-4 py-2 font-semibold text-navy-950 focus:not-sr-only focus:absolute focus:left-4 focus:top-3">
        {t('app.skip')}
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <HelpBand />
      <Footer />
    </div>
  );
}

/** Set the document title for client-side navigations (the server sets it for first loads). */
export function useTitle(title: string | undefined) {
  const { t } = useI18n();
  useEffect(() => {
    if (title) document.title = `${title} | ${t('app.name')}`;
  }, [title, t]);
}
