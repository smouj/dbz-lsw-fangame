// ═══════════════════════════════════════════════════════════
// DBZ LSW — Tema HUD editable (Dev Studio → HUD Studio)
//
// El juego ya define un sistema de variables CSS en `:root`
// (src/styles.css): colores de carta, acentos, escalas, tipografía.
// Este módulo expone un subconjunto CURADO de esas variables para
// que el HUD Studio las pueda editar en vivo y persistir.
//
// Aplicar el tema = inyectar las variables en `document.documentElement`
// (inline style), lo que SOBRESCRIBE `:root` y afecta a todo el juego
// de inmediato. Reset = limpiar inline → vuelve a los valores de `:root`.
// ═══════════════════════════════════════════════════════════

export interface HudThemeVar {
  key: string;      // nombre de variable CSS, p.ej. '--gold'
  label: string;    // etiqueta humana
  group: string;    // grupo de la UI
  type: 'color' | 'size' | 'number';
  default: string;  // valor por defecto (coincide con :root)
}

export const HUD_THEME_VARS: HudThemeVar[] = [
  // ─── Colores del juego ───
  { key: '--gold', label: 'Acento dorado', group: 'Colores', type: 'color', default: '#d8a830' },
  { key: '--orange', label: 'Ki naranja', group: 'Colores', type: 'color', default: '#f08830' },
  { key: '--hp-red', label: 'HP (rojo)', group: 'Colores', type: 'color', default: '#d04040' },
  { key: '--hp-red-lt', label: 'HP (claro)', group: 'Colores', type: 'color', default: '#f07070' },
  { key: '--hp-green', label: 'Curación (verde)', group: 'Colores', type: 'color', default: '#40b848' },
  { key: '--ki-blue', label: 'KI (azul)', group: 'Colores', type: 'color', default: '#3890d8' },
  // ─── Superficies reales del HUD de combate ───
  { key: '--hud-panel', label: 'Panel HUD', group: 'HUD', type: 'color', default: '#05070c' },
  { key: '--hud-panel-alt', label: 'Panel HUD alt', group: 'HUD', type: 'color', default: '#121927' },
  { key: '--hud-border', label: 'Borde HUD', group: 'HUD', type: 'color', default: '#f6c744' },
  { key: '--hud-text', label: 'Texto HUD', group: 'HUD', type: 'color', default: '#fff4cf' },
  { key: '--hud-muted', label: 'Texto secundario', group: 'HUD', type: 'color', default: '#cdd6e2' },
  { key: '--hud-field', label: 'Fondo campo', group: 'HUD', type: 'color', default: '#050911' },
  // ─── Colores de tipo de carta ───
  { key: '--cmd-color', label: 'Command', group: 'Cartas', type: 'color', default: '#8890a0' },
  { key: '--dmg-color', label: 'Damage', group: 'Cartas', type: 'color', default: '#c04040' },
  { key: '--beam-color', label: 'Beam', group: 'Cartas', type: 'color', default: '#3890d8' },
  { key: '--sup-color', label: 'Support', group: 'Cartas', type: 'color', default: '#40a848' },
  { key: '--def-color', label: 'Defense', group: 'Cartas', type: 'color', default: '#5a7a9a' },
  { key: '--spc-color', label: 'Special', group: 'Cartas', type: 'color', default: '#d8a830' },
  // ─── Escala ───
  { key: '--spr', label: 'Escala sprite', group: 'Escala', type: 'number', default: '8' },
  { key: '--card-w', label: 'Ancho carta', group: 'Escala', type: 'size', default: '128px' },
  { key: '--card-h', label: 'Alto carta', group: 'Escala', type: 'size', default: '174px' },
  // ─── Posición & Detalles (paridad dev ↔ juego: el mockup y el build
  // consumen las MISMAS variables CSS) ───
  { key: '--hud-top-pad-y', label: 'HUD top · padding Y', group: 'Posición', type: 'size', default: '5px' },
  { key: '--hud-gap', label: 'HUD top · separación', group: 'Posición', type: 'size', default: 'clamp(86px,14vw,190px)' },
  { key: '--hud-portrait-s', label: 'Retrato · tamaño', group: 'Posición', type: 'size', default: '28px' },
  { key: '--hp-bar-h', label: 'Barra HP · alto', group: 'Posición', type: 'size', default: '18px' },
  { key: '--cmd-scale', label: 'Botones comando · escala', group: 'Posición', type: 'number', default: '1' },
  { key: '--hand-gap', label: 'Mano · separación', group: 'Posición', type: 'size', default: '10px' },
  { key: '--hud-controls-h', label: 'Zona controles · alto', group: 'Posición', type: 'size', default: 'clamp(104px,17.5vh,136px)' },
  { key: '--gbc-dlg-w', label: 'Diálogo GBC · ancho', group: 'Posición', type: 'size', default: 'min(640px,88%)' },
  // ─── Tipografía ───
  { key: '--fs-hero', label: 'Hero (VS/FIGHT)', group: 'Tipografía', type: 'size', default: '38px' },
  { key: '--fs-title', label: 'Título', group: 'Tipografía', type: 'size', default: '26px' },
  { key: '--fs-body', label: 'Cuerpo', group: 'Tipografía', type: 'size', default: '13px' },
  { key: '--fs-sm', label: 'Small', group: 'Tipografía', type: 'size', default: '11px' },
];

export type HudTheme = Record<string, string>;

const STORE_KEY = 'dbzlsw:hud-theme';

export function loadHudTheme(): HudTheme {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as HudTheme;
  } catch { /* corrupto */ }
  return {};
}

export function saveHudTheme(theme: HudTheme): void {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(theme)); } catch { /* cuota */ }
}

export function clearHudTheme(): void {
  try { localStorage.removeItem(STORE_KEY); } catch { /* noop */ }
}

/** Valores por defecto (fuente de verdad del editor, copiados de :root). */
export function defaultHudTheme(): HudTheme {
  const out: HudTheme = {};
  for (const v of HUD_THEME_VARS) out[v.key] = v.default;
  return out;
}

/** Valores actuales efectivos: guardado ?? por defecto. */
export function currentHudTheme(): HudTheme {
  const saved = loadHudTheme();
  const out = defaultHudTheme();
  for (const [k, val] of Object.entries(saved)) {
    if (val !== undefined && val !== '') out[k] = val;
  }
  return out;
}

/** Inyecta el tema en documentElement (inline) — afecta a todo el juego. */
export function applyHudTheme(theme: HudTheme): void {
  const root = document.documentElement;
  for (const v of HUD_THEME_VARS) root.style.removeProperty(v.key);
  for (const [k, val] of Object.entries(theme)) {
    if (val) root.style.setProperty(k, val);
  }
}

/** Limpia inline vars → vuelve a los valores de :root. */
export function resetHudTheme(): void {
  clearHudTheme();
  const root = document.documentElement;
  for (const v of HUD_THEME_VARS) root.style.removeProperty(v.key);
}
