#!/usr/bin/env node
/**
 * analyze-rom-visual-master.ts
 * ═══════════════════════════════════════════════════════════════════════
 * Phase 2b — turn the 100 captured remake frames into a CAUSE-GROUPED failure
 * inventory for the ROM Visual Master (Kamehameha · LEFT).
 *
 * It measures; it does not fix. The project rule is "group by cause, never fix
 * one cue at a time", so the deliverable is the groups.
 *
 * Reads  : docs/rom/generated/visual-master/kamehameha-left/{timeline.json,remake/*}
 * Writes : docs/rom/generated/visual-master/kamehameha-left/remake/divergence.json
 * Prints : the grouped table with the adapter/runtime readout that proves each cause
 *
 * The diff contract AND the cause rules come from scripts/lib/visual-master-diff.ts,
 * shared with the verify gate, so the gate and this inventory cannot drift.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  EXPECTED_CONTRACT,
  causesFor,
  diffCaptureFiles,
  groupFrames,
  type CauseFrameView,
} from './lib/visual-master-diff';

const ROOT = process.cwd();
const MASTER_DIR = resolve(ROOT, 'docs/rom/generated/visual-master/kamehameha-left');
const TIMELINE = resolve(MASTER_DIR, 'timeline.json');
const CAPTURE = resolve(MASTER_DIR, 'remake/capture.json');
const OUTPUT = resolve(MASTER_DIR, 'remake/divergence.json');

if (!existsSync(TIMELINE)) throw new Error(`missing ${TIMELINE}`);
if (!existsSync(CAPTURE)) throw new Error(`missing ${CAPTURE} — run scripts/capture-pixi-visual-master.mjs first`);
const timeline = JSON.parse(readFileSync(TIMELINE, 'utf8'));
const capture = JSON.parse(readFileSync(CAPTURE, 'utf8'));

const captureByRomFrame = new Map<number, any>();
for (const frame of capture.frames ?? []) captureByRomFrame.set(frame.romFrame, frame);

const frames: Array<CauseFrameView & { adapter: Record<string, any> | null; causes: string[] }> = [];
for (const frame of timeline.frames) {
  if (!frame.remake?.image) continue;
  const diff = diffCaptureFiles(MASTER_DIR, frame.romImage, frame.remake.image, readFileSync);
  const captureFrame = captureByRomFrame.get(frame.frame);
  const view = {
    romFrame: frame.frame,
    phase: frame.phase,
    remakeTick: frame.remake.remakeTick,
    counterpart: captureFrame?.counterpart ?? 'UNKNOWN',
    mismatchPixels: diff.mismatchPixels,
    mismatchPercent: diff.mismatchPercent,
    bbox: diff.bbox,
    pixelClass: diff.pixelClass,
    census: diff.census,
    adapter: captureFrame?.stats ?? null,
    // extra record fields (not part of the rule inputs)
    dominantAxis: diff.dominantAxis,
    classification: diff.classification,
    regions: diff.regions,
  } as CauseFrameView & Record<string, unknown>;
  frames.push({ ...view, causes: causesFor(view) });
}

const groups = groupFrames(frames);
const totalMismatchPx = frames.reduce((sum, frame) => sum + frame.mismatchPixels, 0);

const output = {
  schema: 'dbzlsw.rom.visual-master.divergence.v1',
  id: timeline.id,
  generator: 'scripts/analyze-rom-visual-master.ts',
  contract: EXPECTED_CONTRACT,
  tickMapping: capture.tickMapping,
  determinism: capture.determinism,
  summary: {
    frames: frames.length,
    captured: capture.frames?.length ?? 0,
    captureFailures: (capture.failures ?? []).length,
    totalMismatchPx,
    meanMismatchPercent: frames.reduce((sum, frame) => sum + frame.mismatchPercent, 0) / frames.length,
    identicalFrames: frames.filter((frame) => frame.mismatchPixels === 0).length,
    distinctRemakeFrames: new Set(frames.map((frame) => frame.remakeTick)).size,
    groupedPx: groups.reduce((sum, group) => sum + group.totalMismatchPx, 0),
  },
  groups,
  frames,
};
writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);

console.log(`ROM Visual Master divergence — ${timeline.id}`);
console.log(
  `frames=${output.summary.frames} captured=${output.summary.captured} failures=${output.summary.captureFailures} ` +
  `distinctRemakeFrames=${output.summary.distinctRemakeFrames}`,
);
console.log(
  `total mismatch=${totalMismatchPx}px · mean=${output.summary.meanMismatchPercent.toFixed(2)}% · ` +
  `identical=${output.summary.identicalFrames} · grouped=${output.summary.groupedPx}px`,
);
console.log('\nCAUSE GROUPS');
for (const group of groups) {
  console.log(`\n▸ ${group.id}`);
  console.log(`  frames ${group.frameCount} · rom ${JSON.stringify(group.frameRanges)} · ${group.totalMismatchPx}px · mean ${group.meanMismatchPercent.toFixed(2)}%`);
  console.log(`  representative rom ${group.representativeFrame} (remake tick ${group.representativeRemakeTick})`);
  console.log(`  proof: ${group.provingReadout}`);
}
console.log(`\nwritten → ${OUTPUT}`);
