// ═══════════════════════════════════════════════════════════════════════
// TOOLTIP STRUCTURE — constructores canónicos de tooltips HTML
// Formato estructurado para TODOS los elementos (spec UI 2026-08-18):
//   [tt-title]  → nombre/acción (negro carbón, uppercase, centrado)
//   [tt-sep]    → divisor
//   [tt-stats]  → líneas de datos (CC · ATK · HP …)
//   [tt-desc]   → descripción (varias líneas permitidas)
//   [tt-effect] → consecuencia/resultado
//   [tt-compat] → compatibilidad
// El renderer (.global-tooltip) pinta HTML cuando el tip incluye tt-title.
// ═══════════════════════════════════════════════════════════════════════

export type TipPartKind = 'stats' | 'desc' | 'effect' | 'compat';
export type TipPart = [TipPartKind, string] | null | false | undefined;

/** Escapa texto para inyectarlo en el HTML del tooltip. */
export function escTip(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Tooltip estructurado genérico: título + líneas ordenadas por tipo. */
export function tipBlock(title: string, parts: TipPart[] = []): string {
  const out = [`<span class="tt-title">${escTip(title)}</span>`, `<span class="tt-sep"></span>`];
  for (const p of parts) {
    if (!p) continue;
    const [kind, text] = p;
    const cls = kind === 'stats' ? 'tt-stats' : kind === 'effect' ? 'tt-effect' : kind === 'compat' ? 'tt-compat' : 'tt-desc';
    out.push(`<span class="${cls}">${escTip(text)}</span>`);
  }
  return out.join('');
}

/** Título con el tipo de carta coloreado (CARD_COLORS_ON_LIGHT) — solo para
 *  tooltips de carta: el nombre va en negro carbón y el TIPO en su color. */
export function tipCardTitle(name: string, typeName: string, typeColor: string, rarity: number): string {
  return `<span class="tt-title">${escTip(name)} — <span class="tt-type" style="color:${typeColor}">${escTip(typeName)}</span> ★${rarity}</span>`;
}

/** Tooltip completo de CARTA: título con tipo coloreado + divisor + partes. */
export function tipCard(name: string, typeName: string, typeColor: string, rarity: number, parts: TipPart[] = []): string {
  const out = [tipCardTitle(name, typeName, typeColor, rarity), `<span class="tt-sep"></span>`];
  for (const p of parts) {
    if (!p) continue;
    const [kind, text] = p;
    const cls = kind === 'stats' ? 'tt-stats' : kind === 'effect' ? 'tt-effect' : kind === 'compat' ? 'tt-compat' : 'tt-desc';
    out.push(`<span class="${cls}">${escTip(text)}</span>`);
  }
  return out.join('');
}
