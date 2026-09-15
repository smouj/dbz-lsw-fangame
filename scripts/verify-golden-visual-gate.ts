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

console.log(`\nROM Visual Master: ${pass} checks passed · ${fail} failed`);
console.log(`ROM frames: ${timeline.frames.length} · remake frames: ${remakeCaptures}`);
if (remakeCaptures === 0) console.log('PENDING: Pixi capture + pixel heatmap. ROM reference is closed; parity is not yet claimed.');
if (fail) process.exitCode = 1;
