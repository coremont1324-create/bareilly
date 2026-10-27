import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MandalOption } from '@mandal/shared';
import { useMeta } from './queries';
import { storage } from './storage';

type TextScale = 0 | 1 | 2;

interface PrefsValue {
  mandalSlug: string | null;
  mandal: MandalOption | null;
  mandals: MandalOption[];
  setMandal: (slug: string) => void;
  textScale: TextScale;
  setTextScale: (s: TextScale) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
}

const PrefsContext = createContext<PrefsValue | null>(null);
const SCALE_CLASS = ['text-scale-sm', '', 'text-scale-lg'] as const;

export function PrefsProvider({ children }: { children: ReactNode }) {
  const meta = useMeta();
  const [stored, setStored] = useState<string | null>(() => storage.get('msp.mandal'));
  const [textScale, setScale] = useState<TextScale>(() => {
    const raw = storage.get('msp.textScale');
    return raw === '0' ? 0 : raw === '2' ? 2 : 1;
  });
  const [highContrast, setHC] = useState<boolean>(() => storage.get('msp.contrast') === '1');

  const mandals = meta.data?.mandals ?? [];
  const valid = stored && mandals.some((m) => m.slug === stored) ? stored : null;
  const mandalSlug = valid ?? meta.data?.defaultMandalSlug ?? null;
  const mandal = mandals.find((m) => m.slug === mandalSlug) ?? null;

  const setMandal = useCallback((slug: string) => {
    setStored(slug);
    storage.set('msp.mandal', slug);
  }, []);
  const setTextScale = useCallback((s: TextScale) => {
    setScale(s);
    storage.set('msp.textScale', String(s));
  }, []);
  const setHighContrast = useCallback((v: boolean) => {
    setHC(v);
    storage.set('msp.contrast', v ? '1' : '0');
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove('text-scale-sm', 'text-scale-lg');
    if (SCALE_CLASS[textScale]) el.classList.add(SCALE_CLASS[textScale]);
    el.classList.toggle('high-contrast', highContrast);
  }, [textScale, highContrast]);

  const value = useMemo(
    () => ({ mandalSlug, mandal, mandals, setMandal, textScale, setTextScale, highContrast, setHighContrast }),
    [mandalSlug, mandal, mandals, setMandal, textScale, setTextScale, highContrast, setHighContrast],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside PrefsProvider');
  return ctx;
}
