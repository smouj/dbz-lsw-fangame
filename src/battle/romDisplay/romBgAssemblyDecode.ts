// ═══════════════════════════════════════════════════════════════════════
// P0.4R — ROM BG ASSEMBLY SSOT ($19 / $1A)
// ═══════════════════════════════════════════════════════════════════════
// Decoder PURO (sin fs, sin Pixi, sin DOM) del ensamblado de BG auxiliar ROM
// usado por Support ($19) y CHARA/Gather ($1A).
//
// Evidencia: research V5 (`docs/rom/research-v5-support-defense/`), estado
// ROM_BG_FORMAT_VERIFIED. Re-validado contra la ROM Spain del runtime:
// descriptores y row tables son byte-idénticos a los de la ROM USA del
// research, y el decode reproduce 16/16 samples oficiales.
//
// Contrato ROM:
//   $19  descriptor Bank68:$7A0C · row table Bank03:$6834
//        16 tiles · 7 rows × 6 cols = 48×56 px · BG row 4 col 7 · palette slot 5
//        consumidor: Support handlers $00/$02 (Bank03:$66D1)
//   $1A  descriptor Bank68:$7B10 · row table Bank03:$688F
//        23 tiles · 7 rows × 8 cols = 64×56 px · BG row 4 col 6 · palette slot 5
//        consumidores: CHARA (CC15=$31) · Gather Power (CC15=$33) (Bank03:$6750)
//
// Reglas:
//   - Determinista: misma entrada ROM → misma salida.
//   - Nada de nombres de carta ni heurísticas de presentación.
//   - Lo que la ROM no demuestra queda PENDING_ROM_TRACE, nunca se rellena.
// ═══════════════════════════════════════════════════════════════════════

export type RomBgResource = 0x19 | 0x1a;

import type { PresentationCue } from '../engine/presentation/PresentationCue';

/** Offset absoluto en ROM para (bank, dirección relativa). */
export function romOffset(bank: number, address: number): number {
  return bank * 0x4000 + (address - (bank === 0 ? 0 : 0x4000));
}

export interface RomBgAssemblySpec {
  resource: RomBgResource;
  /** Descriptor de tiles (count byte + count×16 bytes 2bpp). */
  descriptorOffset: number;
  /** Row table: por fila, count byte + count×(attr, tileId). */
  rowTableOffset: number;
  rows: number;
  cols: number;
  /** Fila/columna BG destino (en tiles de 8×8). */
  bgRowStart: number;
  bgCol: number;
  paletteSlot: number;
  /** Helper ROM que itera las filas. */
  helperAddress: number;
  /** Consumidores ROM probados (handler/familia). */
  consumers: readonly string[];
  evidence: 'ROM_BG_FORMAT_VERIFIED';
}

/**
 * Programas ROM-verificados. Las direcciones son las del descriptor real; el
 * decoder no acepta variantes inventadas.
 */
export const ROM_BG_ASSEMBLY_SPECS: Readonly<Record<RomBgResource, RomBgAssemblySpec>> = {
  0x19: {
    resource: 0x19,
    descriptorOffset: romOffset(0x68, 0x7a0c),
    rowTableOffset: romOffset(0x03, 0x6834),
    rows: 7,
    cols: 6,
    bgRowStart: 4,
    bgCol: 7,
    paletteSlot: 5,
    helperAddress: 0x66d1,
    consumers: ['SUPPORT_HANDLER_00', 'SUPPORT_HANDLER_02'],
    evidence: 'ROM_BG_FORMAT_VERIFIED',
  },
  0x1a: {
    resource: 0x1a,
    descriptorOffset: romOffset(0x68, 0x7b10),
    rowTableOffset: romOffset(0x03, 0x688f),
    rows: 7,
    cols: 8,
    bgRowStart: 4,
    bgCol: 6,
    paletteSlot: 5,
    helperAddress: 0x6750,
    consumers: ['CHARA_CC15_31', 'GATHER_POWER_CC15_33'],
    evidence: 'ROM_BG_FORMAT_VERIFIED',
  },
} as const;

/**
 * B6E — Selección ROM del BG `$1A` (CHARA / Gather Power).
 *
 * NO es una regla `CHARA => $31, Gather => $33`. La causalidad demostrada es:
 *
 *   el handler ROM escribe `$cc15`            → el display path LEE `$cc15`
 *   CHARA  est. 9  bank_001:8934  $31         → jr_003_67cc: ld a,[$cc15]
 *   Gather         bank_001:10315 $33            ; ld e,a ; ld b,$05
 *
 * y la CARGA del resource la dispara `Call_000_3abd` (bank_000:11553:
 * `ld a,$03` → bank-switch → `call $6750`), que en Bank03 con `[$ca03]==$00`
 * entra en `jr_003_67a3` (bank_003:6529): `ld b,$68 ; ld de,$001a ;
 * call Call_000_1266 ; ld c,$01 ; ld hl,$8800 ; call Call_000_051d`.
 *
 * El resource viaja como INMEDIATO `DE` a `Call_000_1266`; `$19` y `$1A` son
 * callsites hermanos (`jr_003_6711` vs `jr_003_67a3`), idénticos salvo ese DE.
 * Por eso la selección se expresa por RUTA, nunca por nombre de carta/acción.
 *
 * Provenance: ROM_STATIC_VERIFIED (ver docs/rom/B6E_BG_1A_AUTHORITY.md).
 */
export interface RomBg1aSelection {
  /** Resource ROM cargado. */
  resource: 0x1a;
  /** Rutina que dispara la carga (direcciones ROM). */
  loadAuthority: { symbol: 'Call_000_3abd'; address: string; bankSwitchTo: 0x03; target: string };
  /** Bloque efectivo que copia a VRAM. */
  loader: { symbol: 'jr_003_67a3'; address: string; vram: string; resourceImmediate: string };
  /** Selector hermano que carga `$19` (anti-confusión / anti-regresión). */
  sibling: { symbol: 'jr_003_6711'; resourceImmediate: string };
  /** Escribe la paleta; el loader NO la elige. */
  paletteWriter: { register: '$cc15'; reader: { symbol: 'jr_003_67cc'; address: string } };
  /** Consumidores con su escritura de `$cc15` (causalidad, no nombre→color). */
  consumers: readonly [
    { id: 'CHARA_CC15_31'; writer: { symbol: 'Jump_001_7364'; address: string; state: string }; cc15: 0x31 },
    { id: 'GATHER_POWER_CC15_33'; writer: { symbol: 'Call_001_7b2c'; address: string }; cc15: 0x33 },
  ];
  evidence: 'ROM_STATIC_VERIFIED';
}

export const ROM_BG_1A_SELECTION: RomBg1aSelection = {
  resource: 0x1a,
  loadAuthority: { symbol: 'Call_000_3abd', address: 'bank_000:11553', bankSwitchTo: 0x03, target: 'Bank03:$6750' },
  loader: { symbol: 'jr_003_67a3', address: 'bank_003:6529', vram: '$8800', resourceImmediate: '$001a' },
  sibling: { symbol: 'jr_003_6711', resourceImmediate: '$0019' },
  paletteWriter: { register: '$cc15', reader: { symbol: 'jr_003_67cc', address: 'bank_003:6553' } },
  consumers: [
    { id: 'CHARA_CC15_31', writer: { symbol: 'Jump_001_7364', address: 'bank_001:8934', state: '$ca04==$09' }, cc15: 0x31 },
    { id: 'GATHER_POWER_CC15_33', writer: { symbol: 'Call_001_7b2c', address: 'bank_001:10315' }, cc15: 0x33 },
  ],
  evidence: 'ROM_STATIC_VERIFIED',
} as const;

/**
 * B6E — emisión del cue físico para un consumidor de `$1A`.
 *
 * La paleta NO se inventa aquí: sale del `$cc15` que el handler ROM escribió
 * (CHARA `$31` / Gather `$33`). El emisor solo materializa lo que la evidencia
 * demuestra; el tick lo aporta el programa ROM que ejecuta la carga.
 */
export function romBg1aAssemblyCue(
  consumerId: RomBg1aSelection['consumers'][number]['id'],
  tick: number,
): Extract<PresentationCue, { type: 'BG_ASSEMBLY' }> {
  const spec = ROM_BG_ASSEMBLY_SPECS[0x1a];
  return {
    type: 'BG_ASSEMBLY',
    tick,
    resource: 0x1a,
    rows: spec.rows,
    cols: spec.cols,
    bgRowStart: spec.bgRowStart,
    bgCol: spec.bgCol,
    paletteSlot: spec.paletteSlot,
    note: 'SINGLE_BG_GRAPHIC',
  };
}

/** `$cc15` que el handler ROM escribe para un consumidor (paleta del display). */
export function romBg1aPaletteFor(consumerId: RomBg1aSelection['consumers'][number]['id']): number {
  const consumer = ROM_BG_1A_SELECTION.consumers.find(c => c.id === consumerId);
  if (!consumer) throw new Error(`B6E: consumidor $1A desconocido: ${consumerId}`);
  return consumer.cc15;
}

export interface RomBgAssemblyCell {
  row: number;
  col: number;
  /** Byte de atributos: bit5 = flip X, bit6 = flip Y. */
  attr: number;
  tileId: number;
  /** Índice dentro del descriptor (tileId - $80, con wrap del banco de tiles). */
  tileIndex: number;
  flipX: boolean;
  flipY: boolean;
}

export interface RomBgAssemblyProgram {
  resource: RomBgResource;
  descriptorOffset: number;
  rowTableOffset: number;
  rows: number;
  cols: number;
  widthPx: number;
  heightPx: number;
  bgRowStart: number;
  bgCol: number;
  paletteSlot: number;
  tileCount: number;
  cells: RomBgAssemblyCell[];
  evidence: 'ROM_BG_FORMAT_VERIFIED';
}

/** Índice de tile dentro del descriptor. El ROM reutiliza tiles con ids < $80. */
export function decodeRomBgTileIndex(tileId: number, tileCount: number): number {
  const raw = tileId - 0x80;
  return ((raw % tileCount) + tileCount) % tileCount;
}

/** Decodifica un tile 2bpp de 16 bytes → 8×8 índices de paleta (0..3). */
export function decodeRomBgTile(bytes: Uint8Array, offset: number): number[][] {
  const out: number[][] = [];
  for (let y = 0; y < 8; y++) {
    const lo = bytes[offset + y * 2];
    const hi = bytes[offset + y * 2 + 1];
    const row: number[] = [];
    for (let x = 0; x < 8; x++) {
      const bit = 7 - x;
      row.push(((hi >> bit) & 1) * 2 + ((lo >> bit) & 1));
    }
    out.push(row);
  }
  return out;
}

/** Decodifica el ensamblado ROM completo desde la ROM. */
export function decodeRomBgAssembly(spec: RomBgAssemblySpec, rom: Uint8Array): RomBgAssemblyProgram {
  const tileCount = rom[spec.descriptorOffset];
  if (tileCount === 0) {
    throw new Error(`BG $${spec.resource.toString(16)}: descriptor sin tiles`);
  }
  const cells: RomBgAssemblyCell[] = [];
  const rowLen = 1 + spec.cols * 2;
  for (let row = 0; row < spec.rows; row++) {
    const rowStart = spec.rowTableOffset + row * rowLen;
    const count = rom[rowStart];
    if (count !== spec.cols) {
      throw new Error(
        `BG $${spec.resource.toString(16)}: fila ${row} declara ${count} tiles, se esperaban ${spec.cols}`,
      );
    }
    for (let col = 0; col < spec.cols; col++) {
      const attr = rom[rowStart + 1 + col * 2];
      const tileId = rom[rowStart + 2 + col * 2];
      cells.push({
        row,
        col,
        attr,
        tileId,
        tileIndex: decodeRomBgTileIndex(tileId, tileCount),
        flipX: (attr & 0x20) !== 0,
        flipY: (attr & 0x40) !== 0,
      });
    }
  }
  return {
    resource: spec.resource,
    descriptorOffset: spec.descriptorOffset,
    rowTableOffset: spec.rowTableOffset,
    rows: spec.rows,
    cols: spec.cols,
    widthPx: spec.cols * 8,
    heightPx: spec.rows * 8,
    bgRowStart: spec.bgRowStart,
    bgCol: spec.bgCol,
    paletteSlot: spec.paletteSlot,
    tileCount,
    cells,
    evidence: 'ROM_BG_FORMAT_VERIFIED',
  };
}

/** Paleta CGB física (Bank30:$6E00 + índice×8, 4 words BGR555) → RGBA. */
export function decodeCgbPaletteRgba(rom: Uint8Array, paletteIndex: number): Array<[number, number, number, number]> {
  const base = romOffset(0x30, 0x6e00) + paletteIndex * 8;
  const out: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 4; i++) {
    const value = rom[base + i * 2] | (rom[base + i * 2 + 1] << 8);
    out.push([
      ((value & 31) * 255 / 31) | 0,
      (((value >> 5) & 31) * 255 / 31) | 0,
      (((value >> 10) & 31) * 255 / 31) | 0,
      255,
    ]);
  }
  return out;
}

/**
 * Mapa de ÍNDICES de paleta (0..3) del ensamblado ROM, en orden de píxel.
 * Permite re-colorear por paso de transición sin volver a leer la ROM.
 */
export function decodeRomBgAssemblyIndices(program: RomBgAssemblyProgram, rom: Uint8Array): Uint8Array {
  const width = program.widthPx;
  const out = new Uint8Array(width * program.heightPx);
  const tiles: number[][][] = [];
  for (let i = 0; i < program.tileCount; i++) {
    tiles.push(decodeRomBgTile(rom, program.descriptorOffset + 1 + i * 16));
  }
  for (const cell of program.cells) {
    const tile = tiles[cell.tileIndex];
    for (let yy = 0; yy < 8; yy++) {
      for (let xx = 0; xx < 8; xx++) {
        const sx = cell.flipX ? 7 - xx : xx;
        const sy = cell.flipY ? 7 - yy : yy;
        out[cell.col * 8 + xx + (cell.row * 8 + yy) * width] = tile[sy][sx];
      }
    }
  }
  return out;
}

/** Paleta CGB física → 4 words BGR555 (16 bits). */
export function decodeCgbPaletteWords(rom: Uint8Array, paletteIndex: number): number[] {
  const base = romOffset(0x30, 0x6e00) + paletteIndex * 8;
  return [0, 1, 2, 3].map(i => rom[base + i * 2] | (rom[base + i * 2 + 1] << 8));
}

/** Compone el programa a RGBA (widthPx × heightPx). Determinista. */
export function decodeRomBgAssemblyRgba(
  program: RomBgAssemblyProgram,
  rom: Uint8Array,
  palette: ReadonlyArray<readonly [number, number, number, number]>,
  transparentIndex0 = false,
): Uint8Array {
  const width = program.widthPx;
  const height = program.heightPx;
  const rgba = new Uint8Array(width * height * 4);
  const colors = transparentIndex0 ? palette.map((c, i) => (i === 0 ? [c[0], c[1], c[2], 0] : c)) : palette;
  const tiles: number[][][] = [];
  for (let i = 0; i < program.tileCount; i++) {
    tiles.push(decodeRomBgTile(rom, program.descriptorOffset + 1 + i * 16));
  }
  for (const cell of program.cells) {
    const tile = tiles[cell.tileIndex];
    for (let yy = 0; yy < 8; yy++) {
      for (let xx = 0; xx < 8; xx++) {
        const sx = cell.flipX ? 7 - xx : xx;
        const sy = cell.flipY ? 7 - yy : yy;
        const color = colors[tile[sy][sx]];
        const px = (cell.col * 8 + xx + (cell.row * 8 + yy) * width) * 4;
        rgba[px] = color[0];
        rgba[px + 1] = color[1];
        rgba[px + 2] = color[2];
        rgba[px + 3] = color[3];
      }
    }
  }
  return rgba;
}
