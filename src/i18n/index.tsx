import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import en from './en';
import lt from './lt';

export type Translations = typeof en;

const LANG_KEY = 'discourse_analyzer_lang';

const LANGS: Record<string, Translations> = {
  en,
  lt,
};

export const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'lt', name: 'Lietuvių' },
];

interface I18nContextValue {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: keyof Translations | string, vars?: Record<string, any>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    try {
      return (localStorage.getItem(LANG_KEY) as string) || 'lt';
    } catch (e) {
      return 'lt';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, language);
    } catch (e) {
      /* ignore */
    }
  }, [language]);

  const setLanguage = (lang: string) => {
    if (LANGS[lang]) setLanguageState(lang);
    else console.warn(`Unknown language: ${lang}`);
  };

  const t = (key: keyof Translations | string, vars?: Record<string, any>) => {
    const isDev = typeof process !== 'undefined' && process.env && (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'development');
    const dict = LANGS[language] || LANGS['en'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = (dict as any)[key];
    if (!value) {
      // fallback to English or the key itself
      value = (LANGS['en'] as any)[key] || key;
      if (isDev) console.warn(`Missing translation for key: ${String(key)}`);
    }
    if (vars) {
      Object.keys(vars).forEach((k) => {
        value = value.replace(new RegExp(`\{${k}\}`, 'g'), String(vars[k]));
      });
    }

    // noop

    return value;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
