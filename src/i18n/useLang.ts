// ═══════════════════════════════════════════════════════════
// DBZ LSW — useLang hook (separado para Fast Refresh)
// ═══════════════════════════════════════════════════════════
import { useContext } from 'react';
import { LangContext, LangContextValue } from './LanguageContext';

export function useLang(): LangContextValue {
  return useContext(LangContext);
}
