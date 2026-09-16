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
  ACTOR_COLUMN_BAND,
  EXPECTED_CONTRACT,
  bandedRowsFromScroll,
  causesFor,
  diffCaptureFiles,
  groupFrames,
  rangesOf,
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
  // Comparator option (b), interim: rows the ROM composites per scanline are
  // counted and refused, never dropped.
  const bandedRows = bandedRowsFromScroll(frame.scroll);
  const diff = diffCaptureFiles(MASTER_DIR, frame.romImage, frame.remake.image, readFileSync, bandedRows, ACTOR_COLUMN_BAND);
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
    viewport: diff.viewport,
  } as CauseFrameView & Record<string, unknown>;
  frames.push({ ...view, causes: causesFor(view) });
}

const groups = groupFrames(frames);
const totalMismatchPx = frames.reduce((sum, frame) => sum + frame.mismatchPixels, 0);

// Interim verdict (comparator option (b)): the only percentage the record may
// quote is over the region where a tick-framebuffer compare is well-defined.
const viewportTotals = frames.reduce(
  (acc, frame) => {
    const v = (frame as any).viewport as { bandedPixels: number; bandedMismatchPx: number; comparablePixels: number; comparableMismatchPx: number };
    acc.bandedPixels += v.bandedPixels;
    acc.bandedMismatchPx += v.bandedMismatchPx;
    acc.comparablePixels += v.comparablePixels;
    acc.comparableMismatchPx += v.comparableMismatchPx;
    return acc;
  },
  { bandedPixels: 0, bandedMismatchPx: 0, comparablePixels: 0, comparableMismatchPx: 0 },
);

// Frames with no comparable remake beat are EXCLUDED, not scored: the record must
// say what left the comparable set so no total is presented as if it covered all
// 100 ROM frames.
const excludedFrames = timeline.frames
  .filter((frame: any) => !frame.remake?.image)
  .map((frame: any) => frame.frame);

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
    // Distinct RENDERED remake images behind the 100 ROM frames (by capture hash).
    distinctRemakeImages: new Set(timeline.frames.filter((f: any) => f.remake?.image).map((f: any) => f.remake.imageSha256)).size,
    distinctRemakeTicks: new Set(frames.map((frame) => frame.remakeTick)).size,
    comparableSet: {
      compared: frames.length,
      romFramesTotal: timeline.frames.length,
      excludedByMapping: {
        frames: excludedFrames.length,
        romRanges: rangesOf(excludedFrames),
        reason: 'OTHER_ROUTE: the ROM window belongs to another presentation route (defender/result), so it has no comparable remake beat',
      },
    },
    groupedPx: groups.reduce((sum, group) => sum + group.totalMismatchPx, 0),
  },
  groups,
  viewportVerdict: {
    mode: 'INTERIM_NOT_COMPARABLE_BANDED',
    note:
      'Comparator option (b), interim: rows the ROM composites per scanline (differential HBlank ' +
      'viewport, from each frame scroll.bands) are NOT comparable in tick-framebuffer space while the ' +
      'renderer does not apply the viewport program. They are counted and refused, never dropped. ' +
      'totalMismatchPx still covers the whole measured set, so the cause groups keep partitioning it.',
    comparablePixels: viewportTotals.comparablePixels,
    comparableMismatchPx: viewportTotals.comparableMismatchPx,
    comparableMismatchPercent: (viewportTotals.comparableMismatchPx / Math.max(1, viewportTotals.comparablePixels)) * 100,
    notComparableBandedPixels: viewportTotals.bandedPixels,
    notComparableBandedMismatchPx: viewportTotals.bandedMismatchPx,
  },
  frames,
};
writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);

console.log(`ROM Visual Master divergence — ${timeline.id}`);
console.log(
  `frames=${output.summary.frames} captured=${output.summary.captured} failures=${output.summary.captureFailures} ` +
  `distinctRemakeImages=${output.summary.distinctRemakeImages}/${output.summary.distinctRemakeTicks} ticks`,
);
console.log(
  `total mismatch=${totalMismatchPx}px · mean=${output.summary.meanMismatchPercent.toFixed(2)}% · ` +
  `identical=${output.summary.identicalFrames} · grouped=${output.summary.groupedPx}px`,
);
const cs = output.summary.comparableSet;
console.log(
  `comparable set: ${cs.compared}/${cs.romFramesTotal} ROM frames · ` +
  `excludedByMapping=${cs.excludedByMapping.frames} (rom ${JSON.stringify(cs.excludedByMapping.romRanges)})`,
);
const vv = output.viewportVerdict;
console.log(
  `INTERIM VERDICT (comparator b) · comparable region ${vv.comparableMismatchPercent.toFixed(2)}% ` +
  `(${vv.comparableMismatchPx}/${vv.comparablePixels}px) · NOT COMPARABLE banded ` +
  `${vv.notComparableBandedMismatchPx}px of ${vv.notComparableBandedPixels}px`,
);
console.log('\nCAUSE GROUPS');
for (const group of groups) {
  console.log(`\n▸ ${group.id}`);
  console.log(`  frames ${group.frameCount} · rom ${JSON.stringify(group.frameRanges)} · ${group.totalMismatchPx}px · mean ${group.meanMismatchPercent.toFixed(2)}%`);
  console.log(`  representative rom ${group.representativeFrame} (remake tick ${group.representativeRemakeTick})`);
  console.log(`  proof: ${group.provingReadout}`);
}
console.log(`\nwritten → ${OUTPUT}`);
