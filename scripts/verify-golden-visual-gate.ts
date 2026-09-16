#!/usr/bin/env node
/**
 * ROM Visual Master gate.
 *
 * This deliberately verifies emulator framebuffer captures, not historical
 * sprite manifests. A pass proves the ROM side is immutable, hash-pinned and
 * backed by the verified Spain ROM. It does not claim ROM↔Pixi parity while
 * remake captures remain pending.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';

const ROOT = process.cwd();
const MASTER_DIR = resolve(ROOT, 'docs/rom/generated/visual-master/kamehameha-left');
const TIMELINE = resolve(MASTER_DIR, 'timeline.json');
const SPAIN_ROM_SHA256 = 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804';
let pass = 0;
let fail = 0;

function check(condition: unknown, label: string, detail = '') {
  if (condition) { pass++; console.log(`PASS ${label}${detail ? ` — ${detail}` : ''}`); }
  else { fail++; console.error(`FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
}

const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');

// ── Coordinate/scale contract the gate REFUSES to drift from ───────────
// ROM reference is the native 160×144 framebuffer; its battle world is rows
// 24..103. The remake renders a 320×180 output with the ROM world 320×160
// centred at y=10 (BATTLE_OUTPUT_Y). A naive full-page diff would be dominated
// by framing/letterbox, so the comparison is contract-bound.
const EXPECTED_CONTRACT = {
  romNative: { width: 160, height: 144 },
  romWorldCrop: { x: 0, y: 24, width: 160, height: 80 },
  remakeOutput: { width: 320, height: 180 },
  remakeWorldCrop: { x: 0, y: 10, width: 320, height: 160 },
  compareScale: 0.5,
  compareWidth: 160,
  compareHeight: 80,
  compareSpace: 'gbc-5bit',
};

// ── Minimal dependency-free PNG decoder (8-bit, non-interlaced, RGB/RGBA) ──
interface DecodedPng { width: number; height: number; channels: number; data: Uint8Array }

function decodePng(buffer: Buffer): DecodedPng {
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
 * Sample the battle world of a PNG into 160×80 GBC 5-bit RGB.
 * Both sides are quantised to 5 bits so the 5-bit→8-bit expansion convention
 * (ROM PNGs: round(v*255/31); remake: v<<3) cannot masquerade as a difference.
 */
function sampleWorld(png: DecodedPng, crop: { x: number; y: number }, step: number): Uint8Array {
  const out = new Uint8Array(160 * 80 * 3);
  for (let y = 0; y < 80; y++) {
    for (let x = 0; x < 160; x++) {
      const sx = crop.x + x * step;
      const sy = crop.y + y * step;
      const index = (sy * png.width + sx) * png.channels;
      const target = (y * 160 + x) * 3;
      for (let ch = 0; ch < 3; ch++) {
        const value = png.data[index + ch];
        out[target + ch] = step === 1
          ? Math.round((value * 31) / 255)   // ROM PNG: 8-bit → 5-bit (round)
          : value >> 3;                      // remake Pixi output: already v<<3
      }
    }
  }
  return out;
}

interface FrameDiff {
  mismatchPixels: number;
  mismatchPercent: number;
  bbox: { x0: number; y0: number; x1: number; y1: number } | null;
  rowSpread: number;
  colSpread: number;
  classification: 'IDENTICAL' | 'GLOBAL' | 'HORIZONTAL_BAND' | 'VERTICAL_BAND' | 'LOCALIZED';
  dominantAxis: 'none' | 'horizontal' | 'vertical';
}

function diffWorlds(rom: Uint8Array, remake: Uint8Array): FrameDiff {
  let mismatchPixels = 0;
  let x0 = 160, y0 = 80, x1 = -1, y1 = -1;
  const rows = new Uint8Array(80);
  const cols = new Uint8Array(160);
  for (let y = 0; y < 80; y++) {
    for (let x = 0; x < 160; x++) {
      const i = (y * 160 + x) * 3;
      if (rom[i] === remake[i] && rom[i + 1] === remake[i + 1] && rom[i + 2] === remake[i + 2]) continue;
      mismatchPixels++;
      rows[y] = 1; cols[x] = 1;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const total = 160 * 80;
  const rowSpread = rows.reduce((sum, v) => sum + v, 0) / 80;
  const colSpread = cols.reduce((sum, v) => sum + v, 0) / 160;
  let classification: FrameDiff['classification'];
  let dominantAxis: FrameDiff['dominantAxis'];
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
  };
}
const expectedFrames = [0, 60, ...Array.from({ length: 81 }, (_, i) => 408 + i), ...Array.from({ length: 17 }, (_, i) => 644 + i)];

check(existsSync(TIMELINE), 'timeline.json exists');
const timeline = JSON.parse(readFileSync(TIMELINE, 'utf8'));
check(timeline.schema === 'dbzlsw.rom.visual-master.v1', 'canonical visual-master schema');
check(timeline.source.romSha256 === SPAIN_ROM_SHA256, 'capture bound to verified Spain ROM');
check(timeline.source.emulator === 'mGBA' && timeline.source.driver.includes('rom-driver.c'), 'native emulator framebuffer source');
check(timeline.source.identityRebind?.scope === 'mGBA gbAs ROM identity bytes $04..$1f only', 'identity rebind scope explicit');
check(timeline.source.identityRebind?.gameplayPayload?.includes('byte-identical'), 'gameplay payload preservation explicit');
check(JSON.stringify(timeline.frames.map((frame: any) => frame.frame)) === JSON.stringify(expectedFrames), 'captured frame set exact', `${timeline.frames.length}/100`);
check(JSON.stringify(timeline.coverage.activeFrameRanges) === JSON.stringify([[408, 487], [644, 659]]), 'ROM active ranges exact');
check(JSON.stringify(timeline.coverage.restoreFrames) === JSON.stringify([488, 660]), 'ROM restore boundaries exact');

let brokenImages = 0;
let wrongDimensions = 0;
let missingTrace = 0;
let missingRaster = 0;
let remakeCaptures = 0;
for (const frame of timeline.frames) {
  const imagePath = resolve(MASTER_DIR, frame.romImage);
  if (!existsSync(imagePath)) { brokenImages++; continue; }
  const png = readFileSync(imagePath);
  const isPng = png.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  if (!isPng || sha256(png) !== frame.romImageSha256) brokenImages++;
  if (isPng && (png.readUInt32BE(16) !== 160 || png.readUInt32BE(20) !== 144)) wrongDimensions++;
  if (frame.frame >= 408 && frame.frame <= 488 && !frame.actionObjects) missingTrace++;
  if (frame.frame >= 644 && frame.frame <= 659 && !Array.isArray(frame.scroll?.bands)) missingRaster++;
  if (frame.remake?.image) remakeCaptures++;
}
check(brokenImages === 0, 'all ROM framebuffer hashes valid', `broken=${brokenImages}`);
check(wrongDimensions === 0, 'all ROM framebuffers are native 160×144', `wrong=${wrongDimensions}`);
check(missingTrace === 0, 'captured action frames retain ActionObject trace', `missing=${missingTrace}`);
check(missingRaster === 0, 'projectile frames retain per-scanline raster trace', `missing=${missingRaster}`);
check(timeline.frames.every((frame: any) => !/manifest|canonical_frames|out_frames/i.test(frame.romImage)), 'manual/external sprite authority = 0');
check(timeline.frames.filter((frame: any) => frame.phase === 'ACTOR_BEAM_WINDOW').length === 80, 'actor beam window 80 frames');
check(timeline.frames.filter((frame: any) => frame.phase === 'PROJECTILE_TRAVEL').length === 16, 'projectile travel 16 frames');

// ── Remake capture: contract, hashes and the REAL pixel diff ───────────
// The gate never invents a comparison. Without captures it prints PENDING;
// with captures it reports the measured diff of exactly those frames and
// still refuses to claim ROM↔Pixi parity until 100/100 are captured.
interface FrameDiffRow {
  frame: number;
  remakeTick: number | null;
  diff: FrameDiff;
}
const frameDiffs: FrameDiffRow[] = [];

if (remakeCaptures > 0) {
  const capture = timeline.remakeCapture;
  check(!!capture, 'remake capture block present when frames are captured');
  if (capture) {
    check(capture.schema === 'dbzlsw.rom.visual-master.capture.v1', 'remake capture schema canonical');
    const contractMismatch = Object.entries(EXPECTED_CONTRACT)
      .filter(([key, value]) => JSON.stringify((capture.contract as Record<string, unknown>)?.[key]) !== JSON.stringify(value))
      .map(([key]) => key);
    check(
      contractMismatch.length === 0,
      'remake coordinate/scale contract matches the gate',
      contractMismatch.length ? `drifted keys: ${contractMismatch.join(', ')}` : 'crop+scale bound',
    );
    check(capture.determinism?.failures === 0, 'remake capture determinism failures = 0', `failures=${capture.determinism?.failures}`);
    check((capture.pageErrors ?? []).length === 0, 'remake capture page errors = 0', `errors=${(capture.pageErrors ?? []).length}`);
    check(Array.isArray(capture.tickMapping?.anchors) && capture.tickMapping.anchors.length > 0, 'ROM→remake tick mapping is explicit');
  }

  const remakeCrop = EXPECTED_CONTRACT.remakeWorldCrop;
  const romCrop = EXPECTED_CONTRACT.romWorldCrop;
  for (const frame of timeline.frames.filter((candidate: any) => candidate.remake?.image)) {
    const remakePath = resolve(MASTER_DIR, frame.remake.image);
    if (!existsSync(remakePath)) {
      check(false, `frame ${frame.frame}: remake capture exists`, frame.remake.image);
      continue;
    }
    const remakePngBuffer = readFileSync(remakePath);
    check(sha256(remakePngBuffer) === frame.remake.imageSha256, `frame ${frame.frame}: remake PNG hash matches timeline`);
    const decoded = decodePng(remakePngBuffer);
    check(
      decoded.width === EXPECTED_CONTRACT.remakeOutput.width && decoded.height === EXPECTED_CONTRACT.remakeOutput.height,
      `frame ${frame.frame}: remake capture is the 320×180 production output`,
      `${decoded.width}×${decoded.height}`,
    );
    const romDecoded = decodePng(readFileSync(resolve(MASTER_DIR, frame.romImage)));
    const diff = diffWorlds(
      sampleWorld(romDecoded, romCrop, 1),
      sampleWorld(decoded, remakeCrop, 1 / EXPECTED_CONTRACT.compareScale),
    );
    frameDiffs.push({ frame: frame.frame, remakeTick: frame.remake.remakeTick ?? null, diff });
  }
}

const captured = remakeCaptures;
const totalFrames = timeline.frames.length;

console.log('\n── ROM ↔ REMAKE pixel diff (160×80 world, GBC 5-bit space) ──');
for (const row of frameDiffs) {
  const bbox = row.diff.bbox
    ? `bbox x${row.diff.bbox.x0}..${row.diff.bbox.x1} y${row.diff.bbox.y0}..${row.diff.bbox.y1}`
    : 'bbox —';
  console.log(
    `frame ${String(row.frame).padStart(3)} · remake tick ${String(row.remakeTick ?? '?').padStart(3)} · ` +
    `mismatch ${row.diff.mismatchPercent.toFixed(2)}% (${row.diff.mismatchPixels} px) · ${bbox} · ` +
    `axis=${row.diff.dominantAxis} · class=${row.diff.classification}`,
  );
}
if (frameDiffs.length === 0) console.log('(no captured frames to diff)');

console.log(`\nROM Visual Master: ${pass} checks passed · ${fail} failed`);
console.log(`ROM frames: ${totalFrames} · remake frames: ${captured}/${totalFrames}`);
if (captured === 0) {
  console.log('PENDING: Pixi capture + pixel heatmap. ROM reference is closed; parity is not yet claimed.');
} else if (captured < totalFrames) {
  console.log(`PENDING: ${captured}/${totalFrames} remake frames captured. Diffs above are real measurements of those frames only; ROM↔Pixi parity is not claimed.`);
} else {
  console.log('Captured 100/100. Per-frame diffs above are measured, not asserted: parity is a per-frame verdict, not a gate constant.');
}
if (fail) process.exitCode = 1;
