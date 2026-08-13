// ═══════════════════════════════════════════════════════════
// DBZ LSW — Language Provider (solo componente)
// Separado del hook y del contexto para Fast Refresh limpio.
// ═══════════════════════════════════════════════════════════
import React, { useState, useCallback, ReactNode } from 'react';
import { LangCode, TKey, translate, loadLang, saveLang } from './index';
import { LangContext } from './LanguageContext';

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
