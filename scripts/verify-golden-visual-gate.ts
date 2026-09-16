#!/usr/bin/env node
/**
 * ROM Visual Master gate.
 *
 * This deliberately verifies emulator framebuffer captures, not historical
 * sprite manifests. A pass proves the ROM side is immutable, hash-pinned and
 * backed by the verified Spain ROM.
 *
 * The remake side is verified only as far as it is CAPTURED: the gate decodes
 * both PNGs under the shared coordinate/scale contract and prints the measured
 * pixel diff per frame plus the cause-grouped roll-up. It never invents a
 * comparison and never claims ROM↔Pixi parity — parity is a per-frame verdict
 * reported as data, not a gate constant.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  COMPARE_SCALE,
  EXPECTED_CONTRACT,
  REMAKE_WORLD_CROP,
  ROM_WORLD_CROP,
  causesFor,
  decodePng,
  diffWorlds,
  groupFrames,
  sampleWorld,
  type CauseFrameView,
} from './lib/visual-master-diff';

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

// ── Remake capture: contract, hashes and the REAL pixel diff ───────────
// The gate never invents a comparison. Without captures it prints PENDING;
// with captures it reports the measured diff of exactly those frames and
// still refuses to claim ROM↔Pixi parity — the cause-grouped inventory is
// data, and it is only as complete as the captures behind it.
const frameViews: Array<CauseFrameView & { causes: string[] }> = [];
const capturePath = resolve(MASTER_DIR, 'remake/capture.json');
const capture = existsSync(capturePath) ? JSON.parse(readFileSync(capturePath, 'utf8')) : null;
const captureByRomFrame = new Map<number, any>();
for (const frame of capture?.frames ?? []) captureByRomFrame.set(frame.romFrame, frame);

if (remakeCaptures > 0) {
  const block = timeline.remakeCapture;
  check(!!block, 'remake capture block present when frames are captured');
  if (block) {
    check(block.schema === 'dbzlsw.rom.visual-master.capture.v1', 'remake capture schema canonical');
    const contractMismatch = Object.entries(EXPECTED_CONTRACT)
      .filter(([key, value]) => JSON.stringify((block.contract as Record<string, unknown>)?.[key]) !== JSON.stringify(value))
      .map(([key]) => key);
    check(
      contractMismatch.length === 0,
      'remake coordinate/scale contract matches the gate',
      contractMismatch.length ? `drifted keys: ${contractMismatch.join(', ')}` : 'crop+scale bound',
    );
    check(block.determinism?.failures === 0, 'remake capture determinism failures = 0', `failures=${block.determinism?.failures}`);
    check(block.determinism?.framesVerified === block.determinism?.framesExpected,
      'every mapped frame was verified for determinism (full set, not a sample)',
      `${block.determinism?.framesVerified}/${block.determinism?.framesExpected}`);
    check((block.pageErrors ?? []).length === 0, 'remake capture page errors = 0', `errors=${(block.pageErrors ?? []).length}`);
    check(Array.isArray(block.tickMapping?.anchors) && block.tickMapping.anchors.length > 0, 'ROM→remake tick mapping is explicit');
    check((capture?.failures ?? []).length === 0, 'no frame failed to capture', `failures=${(capture?.failures ?? []).length}`);
  }

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
      sampleWorld(romDecoded, ROM_WORLD_CROP, 1),
      sampleWorld(decoded, REMAKE_WORLD_CROP, 1 / COMPARE_SCALE),
    );
    const captureFrame = captureByRomFrame.get(frame.frame);
    const view = {
      romFrame: frame.frame,
      phase: frame.phase,
      remakeTick: frame.remake.remakeTick ?? null,
      counterpart: captureFrame?.counterpart ?? 'UNKNOWN',
      mismatchPixels: diff.mismatchPixels,
      mismatchPercent: diff.mismatchPercent,
      bbox: diff.bbox,
      pixelClass: diff.pixelClass,
      census: diff.census,
      adapter: captureFrame?.stats ?? null,
    } as CauseFrameView;
    frameViews.push({ ...view, causes: causesFor(view) });
  }
}

const groups = groupFrames(frameViews);
const totalMismatchPx = frameViews.reduce((sum, frame) => sum + frame.mismatchPixels, 0);

if (groups.length) {
  for (const group of groups) {
    check(
      group.frameCount === 0 || group.frameRanges.length > 0,
      `cause group ${group.id} has frame ranges`,
      `${group.frameCount} frames`,
    );
  }
}

const captured = remakeCaptures;
const totalFrames = timeline.frames.length;

console.log('\n── ROM ↔ REMAKE pixel diff (160×80 world, GBC 5-bit space) ──');
console.log(`captured ${captured}/${totalFrames} · total mismatch ${totalMismatchPx}px · mean ${frameViews.length ? (frameViews.reduce((s, f) => s + f.mismatchPercent, 0) / frameViews.length).toFixed(2) : '0'}%`);
for (const frame of frameViews) {
  if (captured === totalFrames && !process.env.VM_GATE_FULL) {
    // Full-set runs print groups instead of 100 identical-looking lines; set
    // VM_GATE_FULL=1 to force the per-frame dump.
    break;
  }
  const bbox = frame.bbox ? `bbox x${frame.bbox.x0}..${frame.bbox.x1} y${frame.bbox.y0}..${frame.bbox.y1}` : 'bbox —';
  console.log(
    `frame ${String(frame.romFrame).padStart(3)} · remake tick ${String(frame.remakeTick ?? '?').padStart(3)} · ` +
    `mismatch ${frame.mismatchPercent.toFixed(2)}% (${frame.mismatchPixels} px) · ${bbox} · ` +
    `axis=${frame.pixelClass.remakeExtra > frame.pixelClass.romMissing ? 'plane-extra' : 'rom-missing'} · causes=[${frame.causes.join(', ')}]`,
  );
}

if (groups.length) {
  console.log('\n── CAUSE GROUPS (must partition the mismatch: grouped == total) ──');
  for (const group of groups) {
    console.log(
      `▸ ${group.id} · ${group.frameCount} frames · rom ${JSON.stringify(group.frameRanges)} · ` +
      `${group.totalMismatchPx}px · mean ${group.meanMismatchPercent.toFixed(2)}% · rep rom ${group.representativeFrame} (tick ${group.representativeRemakeTick})`,
    );
    console.log(`   proof: ${group.provingReadout}`);
  }
  const groupedPx = groups.reduce((sum, group) => sum + group.totalMismatchPx, 0);
  check(groupedPx === totalMismatchPx, 'cause groups partition the measured mismatch', `${groupedPx}/${totalMismatchPx}`);
}

console.log(`\nROM Visual Master: ${pass} checks passed · ${fail} failed`);
console.log(`ROM frames: ${totalFrames} · remake frames: ${captured}/${totalFrames}`);
if (captured === 0) {
  console.log('PENDING: Pixi capture + pixel heatmap. ROM reference is closed; parity is not yet claimed.');
} else if (captured < totalFrames) {
  console.log(`PENDING: ${captured}/${totalFrames} remake frames captured. Diffs above are real measurements of those frames only; ROM↔Pixi parity is not claimed.`);
} else {
  console.log('Captured 100/100. The diffs and cause groups above are measured, not asserted: parity is a per-frame verdict, not a gate constant.');
}
if (fail) process.exitCode = 1;
