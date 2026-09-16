// ═══════════════════════════════════════════════════════════════════════
// ROM Visual Master — pixel diff core (pure, dependency-free)
// ═══════════════════════════════════════════════════════════════════════
// Single authority for the ROM↔remake comparison used by
//   · scripts/verify-golden-visual-gate.ts
//   · scripts/analyze-rom-visual-master.ts
//
// Contract (also written into timeline.json → remakeCapture.contract):
//   ROM    : native 160×144 framebuffer, battle world = rows 24..103
//   remake : 320×180 output, ROM world 320×160 centred at y=10
//   compare: remake world cropped and scaled ×0.5 → 160×80, GBC 5-bit space
//
// 5-bit space neutralises the 5-bit→8-bit expansion convention (ROM PNGs use
// round(v*255/31), the Pixi output uses v<<3), which would otherwise show as a
// uniform 100% difference that is not a fidelity signal.
// ═══════════════════════════════════════════════════════════════════════
import { inflateSync } from 'node:zlib';
import { resolve } from 'node:path';

export const COMPARE_W = 160;
export const COMPARE_H = 80;

export interface CropRect { x: number; y: number; width: number; height: number }

export const ROM_NATIVE = { width: 160, height: 144 };
export const ROM_WORLD_CROP: CropRect = { x: 0, y: 24, width: 160, height: 80 };
export const REMAKE_OUTPUT = { width: 320, height: 180 };
export const REMAKE_WORLD_CROP: CropRect = { x: 0, y: 10, width: 320, height: 160 };
export const COMPARE_SCALE = 0.5;
export const COMPARE_SPACE = 'gbc-5bit';

/** The contract the gate refuses to drift from. */
export const EXPECTED_CONTRACT = {
  romNative: ROM_NATIVE,
  romWorldCrop: ROM_WORLD_CROP,
  remakeOutput: REMAKE_OUTPUT,
  remakeWorldCrop: REMAKE_WORLD_CROP,
  compareScale: COMPARE_SCALE,
  compareWidth: COMPARE_W,
  compareHeight: COMPARE_H,
  compareSpace: COMPARE_SPACE,
};

export interface DecodedPng { width: number; height: number; channels: number; data: Uint8Array }

/** Minimal PNG decoder: 8-bit, non-interlaced, colour type 2 (RGB) or 6 (RGBA). */
export function decodePng(buffer: Buffer): DecodedPng {
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('not a PNG');
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat: Buffer[] = [];
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
  if (interlace !== 0) throw new Error('interlaced PNG unsupported');
  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : 0;
  if (channels === 0) throw new Error(`unsupported color type ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = y * stride;
    const prev = line - stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[pos + x];
      const a = x >= channels ? out[line + x - channels] : 0;
      const b = y > 0 ? out[prev + x] : 0;
      const c = x >= channels && y > 0 ? out[prev + x - channels] : 0;
      let result: number;
      switch (filter) {
        case 0: result = value; break;
        case 1: result = value + a; break;
        case 2: result = value + b; break;
        case 3: result = value + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          result = value + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`bad PNG filter ${filter}`);
      }
      out[line + x] = result & 0xff;
    }
    pos += stride;
  }
  return { width, height, channels, data: out };
}

/**
 * Sample the battle world of a PNG into 160×80 GBC 5-bit RGB (Uint8Array w*h*3).
 * `step` is the source-pixel stride of the crop (1 = ROM native, 2 = remake ×2).
 */
export function sampleWorld(png: DecodedPng, crop: CropRect, step: number): Uint8Array {
  const out = new Uint8Array(COMPARE_W * COMPARE_H * 3);
  for (let y = 0; y < COMPARE_H; y++) {
    for (let x = 0; x < COMPARE_W; x++) {
      const sx = crop.x + x * step;
      const sy = crop.y + y * step;
      const index = (sy * png.width + sx) * png.channels;
      const target = (y * COMPARE_W + x) * 3;
      for (let ch = 0; ch < 3; ch++) {
        const value = png.data[index + ch];
        // ROM PNG: 8-bit → 5-bit by round; Pixi output: already v<<3.
        out[target + ch] = step === 1 ? Math.round((value * 31) / 255) : value >> 3;
      }
    }
  }
  return out;
}

export type DiffClassification = 'IDENTICAL' | 'GLOBAL' | 'HORIZONTAL_BAND' | 'VERTICAL_BAND' | 'LOCALIZED';

export interface WorldDiff {
  mismatchPixels: number;
  mismatchPercent: number;
  bbox: { x0: number; y0: number; x1: number; y1: number } | null;
  rowSpread: number;
  colSpread: number;
  classification: DiffClassification;
  dominantAxis: 'none' | 'horizontal' | 'vertical';
  /** Per-region mismatch counts (160×80 world). */
  regions: {
    leftHalf: number; rightHalf: number; topHalf: number; bottomHalf: number;
    quadrants: { tl: number; tr: number; bl: number; br: number };
  };
  /**
   * Cause-oriented pixel classes. `remakeExtra` = the remake paints where the
   * ROM is blank/white; `romMissing` = the ROM has content the remake leaves
   * blank/white; `bothDiffer` = both have content with different values.
   */
  pixelClass: { remakeExtra: number; romMissing: number; bothDiffer: number };
  /** Non-white census of each side over the 160×80 world. */
  census: { romNonWhite: number; remakeNonWhite: number };
  /**
   * Verdict split for the differential HBlank viewport (comparator option (b)).
   * The ROM composites the scrolled bands per scanline; inside them a
   * tick-framebuffer comparison is not well-defined while the renderer does not
   * apply the viewport program. Those pixels are counted and REFUSED, never
   * dropped: `comparableMismatchPercent` is the only percentage the interim
   * verdict may quote.
   */
  viewport: {
    bandedRows: number;
    bandedPixels: number;
    bandedMismatchPx: number;
    comparablePixels: number;
    comparableMismatchPx: number;
    comparableMismatchPercent: number;
  };
}

const WHITE_5BIT = 31;
const isWhite = (world: Uint8Array, i: number) =>
  world[i] === WHITE_5BIT && world[i + 1] === WHITE_5BIT && world[i + 2] === WHITE_5BIT;

export function diffWorlds(rom: Uint8Array, remake: Uint8Array, bandedRows?: readonly boolean[] | null): WorldDiff {
  let mismatchPixels = 0;
  let x0 = COMPARE_W, y0 = COMPARE_H, x1 = -1, y1 = -1;
  const rows = new Uint8Array(COMPARE_H);
  const cols = new Uint8Array(COMPARE_W);
  const regions = {
    leftHalf: 0, rightHalf: 0, topHalf: 0, bottomHalf: 0,
    quadrants: { tl: 0, tr: 0, bl: 0, br: 0 },
  };
  const pixelClass = { remakeExtra: 0, romMissing: 0, bothDiffer: 0 };
  let romNonWhite = 0;
  let remakeNonWhite = 0;
  let bandedMismatchPx = 0;
  let comparableMismatchPx = 0;
  let bandedRowCount = 0;
  for (let y = 0; y < COMPARE_H; y++) if (bandedRows?.[y]) bandedRowCount++;
  const bandedPixels = bandedRowCount * COMPARE_W;

  for (let y = 0; y < COMPARE_H; y++) {
    const isBandedRow = bandedRows?.[y] === true;
    for (let x = 0; x < COMPARE_W; x++) {
      const i = (y * COMPARE_W + x) * 3;
      const same = rom[i] === remake[i] && rom[i + 1] === remake[i + 1] && rom[i + 2] === remake[i + 2];
      const romWhite = isWhite(rom, i);
      const remakeWhite = isWhite(remake, i);
      if (!romWhite) romNonWhite++;
      if (!remakeWhite) remakeNonWhite++;
      if (!romWhite && remakeWhite) pixelClass.romMissing++;
      else if (romWhite && !remakeWhite) pixelClass.remakeExtra++;
      else if (!same) pixelClass.bothDiffer++;
      if (same) continue;
      if (isBandedRow) bandedMismatchPx++; else comparableMismatchPx++;
      mismatchPixels++;
      rows[y] = 1; cols[x] = 1;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x < COMPARE_W / 2) regions.leftHalf++; else regions.rightHalf++;
      if (y < COMPARE_H / 2) regions.topHalf++; else regions.bottomHalf++;
      const top = y < COMPARE_H / 2, left = x < COMPARE_W / 2;
      if (top && left) regions.quadrants.tl++;
      else if (top) regions.quadrants.tr++;
      else if (left) regions.quadrants.bl++;
      else regions.quadrants.br++;
    }
  }

  const total = COMPARE_W * COMPARE_H;
  const rowSpread = rows.reduce((sum, v) => sum + v, 0) / COMPARE_H;
  const colSpread = cols.reduce((sum, v) => sum + v, 0) / COMPARE_W;
  let classification: DiffClassification;
  let dominantAxis: WorldDiff['dominantAxis'];
  if (mismatchPixels === 0) {
    classification = 'IDENTICAL'; dominantAxis = 'none';
  } else if (rowSpread >= 0.75 && colSpread >= 0.75) {
    classification = 'GLOBAL'; dominantAxis = rowSpread >= colSpread ? 'horizontal' : 'vertical';
  } else if (colSpread >= 0.75 && rowSpread < 0.5) {
    classification = 'HORIZONTAL_BAND'; dominantAxis = 'horizontal';
  } else if (rowSpread >= 0.75 && colSpread < 0.5) {
    classification = 'VERTICAL_BAND'; dominantAxis = 'vertical';
  } else {
    classification = 'LOCALIZED';
    dominantAxis = colSpread >= rowSpread ? 'horizontal' : 'vertical';
  }

  return {
    mismatchPixels,
    mismatchPercent: (mismatchPixels / total) * 100,
    bbox: mismatchPixels > 0 ? { x0, y0, x1, y1 } : null,
    rowSpread,
    colSpread,
    classification,
    dominantAxis,
    regions,
    pixelClass,
    census: { romNonWhite, remakeNonWhite },
    viewport: {
      bandedRows: bandedRowCount,
      bandedPixels,
      bandedMismatchPx,
      comparablePixels: COMPARE_W * COMPARE_H - bandedPixels,
      comparableMismatchPx,
      comparableMismatchPercent: (comparableMismatchPx / Math.max(1, COMPARE_W * COMPARE_H - bandedPixels)) * 100,
    },
  };
}

/** Decode both sides of a capture and diff them under the contract. */
export function diffCaptureFiles(
  masterDir: string,
  romImage: string,
  remakeImage: string,
  readFile: (p: string) => Buffer,
  bandedRows?: readonly boolean[] | null,
): WorldDiff {
  const rom = decodePng(readFile(resolve(masterDir, romImage)));
  const remake = decodePng(readFile(resolve(masterDir, remakeImage)));
  return diffWorlds(
    sampleWorld(rom, ROM_WORLD_CROP, 1),
    sampleWorld(remake, REMAKE_WORLD_CROP, 1 / COMPARE_SCALE),
    bandedRows,
  );
}

/**
 * Plane rows that the ROM composites per scanline (differential HBlank viewport),
 * derived from a frame's `scroll.bands`. A band whose scx/scy differ from the
 * unscrolled default is composited off-grid, so it is not comparable in
 * tick-framebuffer space. Rows are returned in plane coordinates (0..79).
 */
export function bandedRowsFromScroll(scroll: { bands?: Array<{ lyStart: number; lyEnd: number; scx: number; scy: number }> } | null | undefined): boolean[] | null {
  const bands = scroll?.bands;
  if (!Array.isArray(bands) || bands.length === 0) return null;
  const rows = new Array<boolean>(COMPARE_H).fill(false);
  let any = false;
  for (const band of bands) {
    if (band.scx === 0 && band.scy === 0) continue;   // unscrolled band: comparable
    for (let ly = band.lyStart; ly <= band.lyEnd; ly++) {
      const planeRow = ly - ROM_WORLD_CROP.y;
      if (planeRow >= 0 && planeRow < COMPARE_H) { rows[planeRow] = true; any = true; }
    }
  }
  return any ? rows : null;
}

// ═══════════════════════════════════════════════════════════════════════
// Cause rules + grouping (pure) — shared by the analyzer and the verify gate
// ═══════════════════════════════════════════════════════════════════════
// A frame may exhibit several causes, but each rule owns a disjoint slice of
// the mismatch, so the groups partition the total instead of double-counting.
// Every rule carries the adapter/runtime readout that proves it.

export interface CauseFrameView {
  romFrame: number;
  phase: string;
  remakeTick: number;
  counterpart: string;
  mismatchPixels: number;
  mismatchPercent: number;
  bbox: { x0: number; y0: number; x1: number; y1: number } | null;
  pixelClass: { remakeExtra: number; romMissing: number; bothDiffer: number };
  census: { romNonWhite: number; remakeNonWhite: number };
  adapter: Record<string, any> | null;
}

export interface CauseRule {
  id: string;
  cause: string;
  matches: (frame: CauseFrameView) => boolean;
  px: (frame: CauseFrameView) => number;
  proof: (frame: CauseFrameView) => string;
}

export const CAUSE_RULES: CauseRule[] = [
  {
    id: 'FIELD_ACTOR_COMPOSITION',
    cause:
      'FIELD tactical composition: the remake shows only the rival and on a different tactical ' +
      'anchor than the ROM, which draws both overworld sprites.',
    matches: (f) => f.phase === 'FIELD_REFERENCE' || f.phase === 'CONFIRM_BOUNDARY',
    px: (f) => f.mismatchPixels,
    proof: (f) =>
      `adapter scenePrepares=${f.adapter?.scenePrepares} sceneChanges=${f.adapter?.sceneChanges} ` +
      `physicalFrames=${f.adapter?.physicalFrames} (the pre-action FIELD carries no ROM film); ` +
      `diff confined to bbox x${f.bbox?.x0}..${f.bbox?.x1} y${f.bbox?.y0}..${f.bbox?.y1}`,
  },
  {
    id: 'ACTION_PLANE_AUTHORITY',
    cause:
      'ACTION plane authority: the remake paints the scenario _action.png where the ROM plane is ' +
      'blank/white. The ROM BG is scrolled by the C5 chain (SCX/$C406=87, SCY/$C405=252 inside the ' +
      'ly36..96 HBlank viewport) and the card-12 ROM selector row carries exactly those deltas ' +
      '(screenXDeltaSide1Byte 87, screenYDeltaByte 252), but the remake emits no BG assembly / ' +
      'display compose / screen-motion cue for this card, so the scenario background remains.',
    matches: (f) => f.phase === 'ACTOR_BEAM_WINDOW' && f.pixelClass.remakeExtra > 0,
    px: (f) => f.pixelClass.remakeExtra,
    proof: (f) =>
      `adapter sceneChanges=${f.adapter?.sceneChanges} (ACTION entered) fxWindows=${f.adapter?.fxWindows}; ` +
      `ROM world non-white=${f.census.romNonWhite}px vs remake=${f.census.remakeNonWhite}px; ` +
      `remake paints ${f.pixelClass.remakeExtra}px where the ROM is blank`,
  },
  {
    id: 'ACTOR_FRAME_POSITION',
    cause:
      'Actor physical-frame/position divergence: the actor IS rendered from ROM physical frames, but ' +
      'the frame chosen and/or its offset differs from the ROM at the same beat.',
    matches: (f) =>
      f.phase === 'ACTOR_BEAM_WINDOW' && (f.pixelClass.romMissing + f.pixelClass.bothDiffer) > 0,
    px: (f) => f.pixelClass.romMissing + f.pixelClass.bothDiffer,
    proof: (f) => {
      const lpf = f.adapter?.lastPhysicalFrame;
      return `adapter physicalFrames=${f.adapter?.physicalFrames} pendingCues=${f.adapter?.pendingCues} ` +
        `seqBySlot=${JSON.stringify(f.adapter?.romSequenceBySlot)} ` +
        `lastPhysicalFrame=${lpf ? `res ${lpf.resource} seq ${lpf.sequence} fi ${lpf.frameIndex} offX ${lpf.offsetX} src ${lpf.source}` : 'none'}; ` +
        `ROM content missing/different=${f.pixelClass.romMissing}+${f.pixelClass.bothDiffer}px`;
    },
  },
  {
    id: 'PROJECTILE_PLANE_ABSENT',
    cause:
      'Projectile plane absent: the ROM renders a travelling beam over a scrolling plane (C406 walks ' +
      '250→160 across 644..659); the remake film declares no projectile beat at all, so every frame ' +
      'in this phase collapses to the post-film state.',
    matches: (f) => f.phase === 'PROJECTILE_TRAVEL',
    px: (f) => f.mismatchPixels,
    proof: (f) =>
      `tickMapping.counterpart=${f.counterpart}; adapter cuesConsumed=${f.adapter?.cuesConsumed} ` +
      `impacts=${f.adapter?.impacts} (the film ends at tick 145 on ACTION_OBJECT_STOP)`,
  },
  {
    id: 'SCREEN_RESTORE_DIVERGENCE',
    cause:
      'Screen restore boundary: the ROM restores the display at 488/660 while the remake is still ' +
      'inside (or already past) its own boundary at the mapped tick.',
    matches: (f) => f.phase === 'SCREEN_RESTORE',
    px: (f) => f.mismatchPixels,
    proof: (f) =>
      `adapter sceneChanges=${f.adapter?.sceneChanges} fxWindows=${f.adapter?.fxWindows} ` +
      `physicalFrames=${f.adapter?.physicalFrames}`,
  },
];

export interface CauseGroup {
  id: string;
  cause: string;
  frameCount: number;
  frameRanges: Array<[number, number]>;
  totalMismatchPx: number;
  meanMismatchPercent: number;
  representativeFrame: number | null;
  representativeRemakeTick: number | null;
  provingReadout: string;
}

export function rangesOf(values: number[]): Array<[number, number]> {
  const sorted = [...values].sort((a, b) => a - b);
  const out: Array<[number, number]> = [];
  if (sorted.length === 0) return out;
  let start = sorted[0], prev = sorted[0];
  for (const value of sorted.slice(1)) {
    if (value === prev + 1) prev = value;
    else { out.push([start, prev]); start = value; prev = value; }
  }
  out.push([start, prev]);
  return out;
}

/** Cause ids a frame contributes to (used to tag each frame record). */
export function causesFor(frame: CauseFrameView): string[] {
  return CAUSE_RULES.filter((rule) => rule.matches(frame)).map((rule) => rule.id);
}

export function groupFrames(frames: CauseFrameView[]): CauseGroup[] {
  return CAUSE_RULES.map((rule) => {
    const members = frames.filter((frame) => rule.matches(frame));
    const representative = members.reduce<CauseFrameView | null>(
      (best, frame) => (!best || rule.px(frame) > rule.px(best) ? frame : best),
      null,
    );
    return {
      id: rule.id,
      cause: rule.cause,
      frameCount: members.length,
      frameRanges: rangesOf(members.map((frame) => frame.romFrame)),
      totalMismatchPx: members.reduce((sum, frame) => sum + rule.px(frame), 0),
      meanMismatchPercent: members.length
        ? members.reduce((sum, frame) => sum + frame.mismatchPercent, 0) / members.length
        : 0,
      representativeFrame: representative?.romFrame ?? null,
      representativeRemakeTick: representative?.remakeTick ?? null,
      provingReadout: representative ? rule.proof(representative) : 'no frames',
    };
  });
}
