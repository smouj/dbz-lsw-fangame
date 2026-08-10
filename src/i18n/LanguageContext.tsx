// ═══════════════════════════════════════════════════════════
// DBZ LSW — Language Context
// ═══════════════════════════════════════════════════════════
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LangCode, TKey, translate, loadLang, saveLang, DEFAULT_LANG } from './index';

interface LangContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: TKey) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => translate(DEFAULT_LANG, key),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(loadLang);

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    saveLang(l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback((key: TKey) => translate(lang, key), [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}
