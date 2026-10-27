import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type MessageKey } from './en';
import { hi } from './hi';
import { te } from './te';
import { storage } from '../lib/storage';

export const LANGUAGES = ['en', 'hi', 'te'] as const;
export type Language = (typeof LANGUAGES)[number];

const DICTS: Record<Language, Partial<Record<MessageKey, string>>> = { en, hi, te };
export const LOCALES: Record<Language, string> = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' };

export type TFunction = (key: MessageKey, vars?: Record<string, string | number>) => string;

interface I18nValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: TFunction;
  formatDate: (iso: string | null | undefined) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function initialLanguage(): Language {
  const saved = storage.get('msp.lang');
  if (saved && (LANGUAGES as readonly string[]).includes(saved)) return saved as Language;
  return 'en';
}

export function translate(lang: Language, key: MessageKey, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function I18nProvider({ children, initial }: { children: ReactNode; initial?: Language }) {
  const [lang, setLangState] = useState<Language>(initial ?? initialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    storage.set('msp.lang', l);
  }, []);

  const value = useMemo<I18nValue>(() => {
    const opts = { day: 'numeric', month: 'short', year: 'numeric' } as const;
    // Calendar dates are stored without a time zone; timestamps are shown in IST.
    const dateFmt = new Intl.DateTimeFormat(LOCALES[lang], { ...opts, timeZone: 'UTC' });
    const stampFmt = new Intl.DateTimeFormat(LOCALES[lang], { ...opts, timeZone: 'Asia/Kolkata' });
    return {
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      formatDate: (iso) => {
        if (!iso) return '';
        const dateOnly = iso.length === 10;
        const d = new Date(dateOnly ? `${iso}T00:00:00Z` : iso);
        if (Number.isNaN(d.getTime())) return '';
        return (dateOnly ? dateFmt : stampFmt).format(d);
      },
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

export type { MessageKey };
