// ═══════════════════════════════════════════════════════════════════════
// ROM MODE (spike) — feedToScene
// ═══════════════════════════════════════════════════════════════════════
// Convierte un NormalizedBattleFeed (estado en vivo leído de la ROM) en una
// escena dibujable: qué sprite nuestro representa a cada luchador, dónde y
// mirando hacia dónde.
//
// El punto del ROM Mode: la POSICIÓN y la ORIENTACIÓN no las decide nuestro
// código — vienen del OAM de la ROM. Nosotros solo resolvemos qué sprite
// nuestro las representa.
//
//   ROM OAM (x, y, flipX, paleta)  →  escena  →  Pixi dibuja NUESTRO sprite ahí
// ═══════════════════════════════════════════════════════════════════════

import type { NormalizedBattleFeed, NormalizedSprite } from './decodeRomFeed';

/** Resuelve la URL de NUESTRO sprite para un id de forma. Se inyecta para no
 *  acoplar el decoder al loader de assets (que es de navegador: Vite resuelve
 *  las rutas `/assets/…`). En la app se pasa `battleOverworldActorUrl`; en
 *  pruebas headless, un stub o un mapa a ficheros locales. */
export type SpriteResolver = (formId: string) => string | undefined;

/** Ancho de la pantalla GBC, en píxeles. */
export const GBC_SCREEN_WIDTH = 160;
export const GBC_SCREEN_HEIGHT = 144;

export interface RomModeFighter {
  role: 'ally' | 'enemy';
  /** Centro del rectángulo que forman sus sprites de OAM (espacio de pantalla GBC). */
  screenX: number;
  screenY: number;
  /** Caja que ocupan los sprites en OAM. */
  box: { x: number; y: number; width: number; height: number };
  /** Hacia dónde mira, derivado del flip de OAM. */
  facing: 'left' | 'right';
  /** Paleta CGB que usa la ROM (0 y 1 distinguen jugador/enemigo). */
  cgbPalette: number;
  /** Nº de entradas de OAM que componen este luchador. */
  spriteCount: number;
  /** Nuestro sprite resuelto para ese luchador/form. */
  spriteUrl?: string;
}

export interface RomModeScene {
  tick: number;
  /** Fase de acción de la ROM (CA03) y estado de menú (C0A0). */
  actionPhase: number;
  menuState: number;
  display: { scx: number; scy: number };
  fighters: RomModeFighter[];
}

/** Agrupa los sprites de OAM por lado (izquierda/derecha) según su X. */
export function groupSpritesBySide(sprites: readonly NormalizedSprite[]): { left: NormalizedSprite[]; right: NormalizedSprite[] } {
  const left: NormalizedSprite[] = [];
  const right: NormalizedSprite[] = [];
  const mid = GBC_SCREEN_WIDTH / 2;
  for (const s of sprites) {
    // El centro del sprite (OAM da la esquina superior izquierda).
    const cx = s.screenX + s.width / 2;
    (cx < mid ? left : right).push(s);
  }
  return { left, right };
}

function boxOf(sprites: readonly NormalizedSprite[]) {
  const x = Math.min(...sprites.map((s) => s.screenX));
  const y = Math.min(...sprites.map((s) => s.screenY));
  const right = Math.max(...sprites.map((s) => s.screenX + s.width));
  const bottom = Math.max(...sprites.map((s) => s.screenY + s.height));
  return { x, y, width: right - x, height: bottom - y };
}

function fighterFrom(role: 'ally' | 'enemy', sprites: readonly NormalizedSprite[], formId: string, resolveSprite: SpriteResolver): RomModeFighter | undefined {
  if (sprites.length === 0) return undefined;
  const box = boxOf(sprites);
  // flipX lo dicta la ROM: con sprites espejados el personaje mira al lado contrario.
  const flipped = sprites.filter((s) => s.flipX).length > sprites.length / 2;
  return {
    role,
    screenX: Math.round(box.x + box.width / 2),
    screenY: Math.round(box.y + box.height / 2),
    box,
    facing: flipped ? 'right' : 'left',
    cgbPalette: sprites[0].cgbPalette,
    spriteCount: sprites.length,
    spriteUrl: resolveSprite(formId),
  };
}

/**
 * Escena de un frame. `formIds` indica qué sprite NUESTRO usar para cada lado
 * (la ROM no conoce nuestros ids de forma: eso sí lo decide el remake).
 */
export function feedToScene(
  feed: NormalizedBattleFeed,
  formIds: { ally: string; enemy: string },
  resolveSprite: SpriteResolver,
): RomModeScene {
  const { left, right } = groupSpritesBySide(feed.sprites);
  const fighters: RomModeFighter[] = [];
  const ally = fighterFrom('ally', left, formIds.ally, resolveSprite);
  const enemy = fighterFrom('enemy', right, formIds.enemy, resolveSprite);
  if (ally) fighters.push(ally);
  if (enemy) fighters.push(enemy);
  return {
    tick: feed.tick,
    actionPhase: feed.battle.CA03 ?? 0,
    menuState: feed.battle.C0A0 ?? 0,
    display: { scx: feed.display.scx, scy: feed.display.scy },
    fighters,
  };
}

export function feedSequenceToScenes(
  feeds: readonly NormalizedBattleFeed[],
  formIds: { ally: string; enemy: string },
  resolveSprite: SpriteResolver,
): RomModeScene[] {
  return feeds.map((f) => feedToScene(f, formIds, resolveSprite));
}
