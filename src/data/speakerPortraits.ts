// ═══════════════════════════════════════════════════════════════════════
// M8.P0 — speakerPortraits: RETRATO CANÓNICO del hablante (diálogo GBC y
// panel de Stage/QTE usan la MISMA cadena → mismo asset, mismo aspecto).
// ═══════════════════════════════════════════════════════════════════════
// Cadena ÚNICA (la del diálogo de la partida):
//   1. storyPortraitUrl(char, form)  — retrato de las viñetas GBC (forma)
//   2. MENU_PORTRAITS[char]          — retrato de menú del personaje
//
// NUNCA BATTLE_PORTRAITS (32×24 del GBC): esos son los retratos pixel de
// batalla y NO encajan en el marco 57×80 del diálogo/Stage (se ven distintos
// al escalar). El diálogo y el Stage deben verse IGUAL para el mismo
// personaje. Módulo LIGERO a propósito: solo storyPortraits + icons (sin
// battleOverworld) para que los verify headless puedan importarlo.

import { storyPortraitUrl } from './storyPortraits';
import { MENU_PORTRAITS } from './icons';

export function resolveSpeakerPortrait(charId: string, formId?: string): string | undefined {
  return storyPortraitUrl(charId, formId)
    || MENU_PORTRAITS[charId]
    || undefined;
}
