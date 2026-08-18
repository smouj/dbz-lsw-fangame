// ═══════════════════════════════════════════════════════════════════════
// HUD ASSET REGISTRY — registro ÚNICO de sprites de botones del HUD.
// Compartido por el juego real (main.tsx) y el HUD Studio (hud.tsx).
// BattleAction → sprite GBC.
// ═══════════════════════════════════════════════════════════════════════

export type HudAction =
  | 'LIMIT' | 'JOINT' | 'BASIC' | 'CHARA'
  | 'POWER' | 'GUARD' | 'MOVE' | 'MOVE_H' | 'MOVE_V'
  | 'EXIT' | 'DRAW' | 'TEAM' | 'LIST';

const H = '/assets/ui/hud_buttons';

export const HUD_ASSET_REGISTRY: Record<HudAction, { sprite: string; label: string }> = {
  LIMIT:  { sprite: `${H}/btn_limit.png`,  label: 'LIMIT' },
  JOINT:  { sprite: `${H}/btn_joint.png`,  label: 'JOINT' },
  BASIC:  { sprite: `${H}/btn_basic.png`,  label: 'BASIC' },
  CHARA:  { sprite: `${H}/btn_chara.png`,  label: 'CHARA' },
  POWER:  { sprite: `${H}/btn_power.png`,  label: 'GATHER POWER' },
  GUARD:  { sprite: `${H}/btn_guard.png`,  label: 'GUARD' },
  MOVE:   { sprite: `${H}/btn_move.png`,   label: 'MOVE' },
  MOVE_H: { sprite: `${H}/btn_move_axis_h.png`, label: 'LEFT/RIGHT' },
  MOVE_V: { sprite: `${H}/btn_move_axis_v.png`, label: 'UP/DOWN' },
  EXIT:   { sprite: `${H}/btn_exit.png`,   label: 'EXIT' },
  DRAW:   { sprite: `${H}/btn_draw.png`,   label: 'DRAW' },
  TEAM:   { sprite: `${H}/btn_team.png`,   label: 'TEAM' },
  LIST:   { sprite: `${H}/btn_list.png`,   label: 'LIST' },
};

/** Sprite GBC de una acción del HUD. */
export function hudSprite(action: HudAction): string {
  return HUD_ASSET_REGISTRY[action].sprite;
}

/** Etiqueta legible de una acción. */
export function hudLabel(action: HudAction): string {
  return HUD_ASSET_REGISTRY[action].label;
}

/** Acciones que pinta el command-strip en COMMAND (con CHARA opcional). */
export const COMMAND_ACTIONS: HudAction[] = ['LIMIT', 'JOINT', 'BASIC'];

// ─── Variables CSS de botones (fuente ÚNICA — P1 #6) ───
// El CSS NO hardcodea URLs: estas variables se inyectan en :root desde el
// registro (applyHudButtonVars) y las reglas usan var(--btn-*).
export const HUD_BUTTON_CSS_VARS: Record<string, string> = {
  '--btn-limit': HUD_ASSET_REGISTRY.LIMIT.sprite,
  '--btn-joint': HUD_ASSET_REGISTRY.JOINT.sprite,
  '--btn-basic': HUD_ASSET_REGISTRY.BASIC.sprite,
  '--btn-chara': HUD_ASSET_REGISTRY.CHARA.sprite,
  '--btn-exit': HUD_ASSET_REGISTRY.EXIT.sprite,
  '--btn-power': HUD_ASSET_REGISTRY.POWER.sprite,
  '--btn-guard': HUD_ASSET_REGISTRY.GUARD.sprite,
  '--btn-move': HUD_ASSET_REGISTRY.MOVE.sprite,
  '--btn-move-h': HUD_ASSET_REGISTRY.MOVE_H.sprite,
  '--btn-move-v': HUD_ASSET_REGISTRY.MOVE_V.sprite,
};

/** Inyecta las variables de botones en :root (formato url('...')). */
export function applyHudButtonVars(root: HTMLElement = document.documentElement): void {
  for (const [key, value] of Object.entries(HUD_BUTTON_CSS_VARS)) {
    root.style.setProperty(key, `url('${value}')`);
  }
}
