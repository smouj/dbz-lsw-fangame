// ═══════════════════════════════════════════════════════════════════════
// HUD LAYOUT — contrato VISUAL ÚNICO del combate (baseline V1 CONGELADA).
// Fuente de verdad de la GEOMETRÍA estructural del HUD. Consumidores:
//   · HUD Studio (define/referencia)
//   · Juego real (CSS vía vars --hud-layout-*)
//   · Combat Lab (mismo CSS → misma geometría)
//
// ⚠️ REGLA: el HUD actual es la BASE VISUAL — no cambiar de dirección.
// Los valores aquí son los que el CSS usa por defecto (fallback último).
// El tema (hudTheme.ts) puede sobreescribir colores/escala/tipografía,
// pero la GEOMETRÍA estructural vive en este contrato.
//
// Separación de responsabilidades:
//   · HUD SYSTEM  (aspecto/layout/assets)  → hudLayout + hudTheme + hudAssets + cardVisuals
//   · BATTLE ENGINE (turnos/fases/reglas)  → battle/state + battle/engine + battle/combat
//   Ambos se encuentran SOLO en la pantalla de combate (presentación).
// ═══════════════════════════════════════════════════════════════════════

export const HUD_LAYOUT = {
  /** Caja inferior de controles (botones 80 + padding). */
  controlsHeight: 96,
  /** Botón GBC (marco 48×40 de la ROM a 2×). */
  buttonWidth: 96,
  buttonHeight: 80,
  /** Carta de la mano / LIMIT / STAGE (misma geometría). */
  cardWidth: 96,
  cardHeight: 80,
  /** Área de arte interior de la carta (centrada en 18,18). */
  cardArtWidth: 64,
  cardArtHeight: 48,
  cardArtX: 18,
  cardArtY: 18,
  /** Cuadro de diálogo GBC: MISMA altura que los botones. */
  dialogueHeight: 80,
  /** Barra de HP (--hp-bar-h) — elemento DOMINANTE del HUD superior. */
  hpBarHeight: 18,
  /** Retrato del luchador (--hud-portrait-s) — cuadrado pixel 28×28. */
  portraitSize: 28,
  /** Fila nombre/forma/LV (min-height de .hud-name). */
  fighterHeaderHeight: 28,
  /** Padding superior del hud-top (--hud-top-pad-y). */
  hudTopPadY: 6,
  /** Altura mínima de los chips de estado (status-chip). */
  statusChipHeight: 16,
  /** Ancho visual del centro VS (ROUND/VS/orden). */
  centerBadgeWidth: 78,
  /** Espaciado entre cartas de la mano (--hand-gap). */
  handGap: 5,
  /** Ancho del diálogo (--gbc-dlg-w). */
  dialogueWidth: 'min(880px, 96%)',
} as const;

export type HudLayoutKey = keyof typeof HUD_LAYOUT;

/** Vars CSS del contrato: --hud-layout-<key>. */
export function hudLayoutCssVars(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(HUD_LAYOUT)) {
    out[`--hud-layout-${k}`] = String(v);
  }
  return out;
}

/** Inyecta el contrato en :root (fallback último del CSS del combate). */
export function applyHudLayout(): void {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(hudLayoutCssVars())) {
    root.style.setProperty(k, v);
  }
}

/** Validación interna del contrato (invariantes de la baseline V1). */
export function validateHudLayout(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const L = HUD_LAYOUT;
  if (L.buttonWidth !== L.cardWidth || L.buttonHeight !== L.cardHeight) {
    errors.push('botones y cartas deben compartir geometría (96×80)');
  }
  if (L.cardArtWidth > L.cardWidth || L.cardArtHeight > L.cardHeight) {
    errors.push('card-art no puede exceder la carta');
  }
  if (L.cardArtX + L.cardArtWidth > L.cardWidth || L.cardArtY + L.cardArtHeight > L.cardHeight) {
    errors.push('card-art sale de la carta (área 64×48 en 18,18)');
  }
  if (L.dialogueHeight !== L.buttonHeight) {
    errors.push('el diálogo debe tener la misma altura que los botones');
  }
  if (L.controlsHeight < L.buttonHeight + 8) {
    errors.push('la caja de controles debe contener los botones con margen');
  }
  if (L.portraitSize !== 28) {
    errors.push('el retrato canónico es 28×28 (baseline refinada)');
  }
  if (L.hpBarHeight < 16) {
    errors.push('la barra de HP debe ser el elemento dominante (≥16px)');
  }
  return { ok: errors.length === 0, errors };
}
