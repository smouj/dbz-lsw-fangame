// ═══════════════════════════════════════════════════════════
// DBZ LSW — Language Context (contexto + tipos)
// Separado en archivo propio para Fast Refresh: aquí NO hay componentes.
// ═══════════════════════════════════════════════════════════
import { createContext } from 'react';
import { LangCode, TKey, translate, DEFAULT_LANG } from './index';

export interface LangContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: TKey) => string;
}

export const LangContext = createContext<LangContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => translate(DEFAULT_LANG, key),
});
