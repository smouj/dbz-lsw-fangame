// ═══════════════════════════════════════════════════════════════════════
// ROM MODE (spike) — decodeRomFeed
// ═══════════════════════════════════════════════════════════════════════
// Convierte un frame crudo del harness ROM (WRAM + OAM + VRAM + registros,
// capturado con `tools/rom-trace/rom-driver`) en un feed normalizado que
// Pixi puede consumir. NO muta gameplay: es solo lectura.
//
// Cadena del spike:
//   ROM → core → WRAM/VRAM/OAM/registros → decoder → NormalizedBattleFeed → Pixi
//
// Semántica OAM (Game Boy):
//   byte0 = Y + 16   byte1 = X + 8   byte2 = tile   byte3 = attr
//   attr: bit7 prioridad BG · bit6 flip Y · bit5 flip X · bit4 paleta OBJ
//         bit3 banco VRAM (CGB) · bits0-2 paleta CGB
// ═══════════════════════════════════════════════════════════════════════

/** Frame crudo tal como lo emite `rom-driver` (comando `trace`). */
export interface RomRawFrame {
  frame: number;
  battle: Record<string, number>;
  actionObjects: { bytes: number[] }[];
  activeObject: number;
  drawState: number;
  drawOrderFlag: number;
  display: { scx: number; scy: number; lcdc: number; stat: number };
  scroll: Record<string, number>;
  slots: { anim: number[]; gfx: number[] }[];
  oam: number[];
  vram: number[];
}

export interface NormalizedSprite {
  /** Índice en OAM (0..39). */
  index: number;
  /** Posición en pantalla (ya descontado el offset +16/+8 del hardware). */
  screenX: number;
  screenY: number;
  /** Rectángulo en píxeles (8x8 u 8x16 según LCDC bit 2). */
  width: number;
  height: number;
  /** Índice de tile (en modo 8x16 el bit 0 se ignora). */
  tile: number;
  flipX: boolean;
  flipY: boolean;
  /** Paleta OBJ (0 = OBP0, 1 = OBP1). */
  paletteIndex: 0 | 1;
  /** Banco VRAM (CGB). */
  vramBank: 0 | 1;
  /** Paleta CGB (bits 0-2 de attr). */
  cgbPalette: number;
}

export interface NormalizedBattleFeed {
  tick: number;
  /** Registros de batalla de la WRAM (C0A0, CA03, CA06, …). */
  battle: Record<string, number>;
  activeObject: number;
  drawState: number;
  drawOrderFlag: number;
  display: { scx: number; scy: number; lcdc: number; lcdcOn: boolean; objEnabled: boolean; objTall: boolean };
  sprites: NormalizedSprite[];
  /** Slots de animación (3B anim + 3B gfx por slot). */
  slots: { anim: number[]; gfx: number[] }[];
}

/** Ancho de la pantalla GBC, en píxeles. */
export const GBC_SCREEN_WIDTH = 160;
/** Alto de la pantalla GBC, en píxeles. */
export const GBC_SCREEN_HEIGHT = 144;

const OAM_ENTRIES = 40;

/** ¿La entrada de OAM está vacía (los cuatro bytes a cero)? */
export function isOamEntryHidden(y: number, x: number, tile: number, attr: number): boolean {
  return y === 0 && x === 0 && tile === 0 && attr === 0;
}

/**
 * ¿El sprite cae TOTALMENTE fuera de la pantalla?
 *
 * La ROM oculta los sprites que no usa dejándolos en `Y = 0`, o sea
 * `screenY = -16`: por encima del borde superior. Sin este filtro se cuelan
 * como visibles — medido en `tail_left_base`: 20 de 24 sprites eran basura
 * oculta en Y=0 y acabaron agrupados como si fueran el luchador.
 */
export function isSpriteOffScreen(s: {
  screenX: number;
  screenY: number;
  width: number;
  height: number;
}): boolean {
  return (
    s.screenY + s.height <= 0 ||
    s.screenY >= GBC_SCREEN_HEIGHT ||
    s.screenX + s.width <= 0 ||
    s.screenX >= GBC_SCREEN_WIDTH
  );
}

/** Decodifica las 40 entradas de OAM. `objTall` = sprites 8x16 (LCDC bit 2). */
export function decodeSprites(oam: readonly number[], objTall: boolean): NormalizedSprite[] {
  const out: NormalizedSprite[] = [];
  for (let i = 0; i < OAM_ENTRIES; i++) {
    const y = oam[i * 4] ?? 0;
    const x = oam[i * 4 + 1] ?? 0;
    const tile = oam[i * 4 + 2] ?? 0;
    const attr = oam[i * 4 + 3] ?? 0;
    if (isOamEntryHidden(y, x, tile, attr)) continue;
    const sprite: NormalizedSprite = {
      index: i,
      // Offset hardware: X+8, Y+16. Un sprite en Y=0 cae fuera por arriba.
      screenX: x - 8,
      screenY: y - 16,
      width: 8,
      height: objTall ? 16 : 8,
      tile: objTall ? tile & 0xfe : tile,
      flipX: (attr & 0x20) !== 0,
      flipY: (attr & 0x40) !== 0,
      paletteIndex: (attr & 0x10) ? 1 : 0,
      vramBank: (attr & 0x08) ? 1 : 0,
      cgbPalette: attr & 0x07,
    };
    // La ROM aparta los sprites que no usa a Y=0 (fuera de pantalla).
    if (isSpriteOffScreen(sprite)) continue;
    out.push(sprite);
  }
  return out;
}

/** Decodifica un frame crudo → feed normalizado. Función pura, sin efectos. */
export function decodeRomFeed(raw: RomRawFrame): NormalizedBattleFeed {
  const lcdc = raw.display.lcdc;
  const objEnabled = (lcdc & 0x02) !== 0;
  const objTall = (lcdc & 0x04) !== 0;
  return {
    tick: raw.frame,
    battle: raw.battle,
    activeObject: raw.activeObject,
    drawState: raw.drawState,
    drawOrderFlag: raw.drawOrderFlag,
    display: {
      scx: raw.display.scx,
      scy: raw.display.scy,
      lcdc,
      lcdcOn: (lcdc & 0x80) !== 0,
      objEnabled,
      objTall,
    },
    sprites: objEnabled ? decodeSprites(raw.oam, objTall) : [],
    slots: raw.slots.map((s) => ({ anim: [...s.anim], gfx: [...s.gfx] })),
  };
}

/** Decodifica una secuencia completa. */
export function decodeRomFeedSequence(frames: readonly RomRawFrame[]): NormalizedBattleFeed[] {
  return frames.map(decodeRomFeed);
}
