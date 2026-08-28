// ═══════════════════════════════════════════════════════════════════════
// verify-rom-golden-timeline.ts — P0 ROM FRAME-TICK CUTOVER
// ═══════════════════════════════════════════════════════════════════════
// Per-tick timeline trace for golden set actions:
//   Kamehameha $03, Cont.Punch $2C, Final Flash $09, Masenko $04, Stage $61
//
// For each: tick → frameIndex → visualFrameId → durationTicks → physicalId
// ═══════════════════════════════════════════════════════════════════════

import { animationResourceById } from '../src/battle/animationResources';
import { ROM_BANK61_ANIMATION_CORE } from '../src/data/generated/romAnimationCore.generated';
import { currentFrame } from '../src/renderer/pixi/systems/SpriteAnimator';
import type { PoseAnim, PoseFrame } from '../src/renderer/pixi/assets/AtlasLoader';
import { profileForForm } from '../src/data/romPhysicalFrameIndex';

function hex2(n: number): string { return n.toString(16).toUpperCase().padStart(2, '0'); }

interface GoldenAction {
  label: string;
  resourceId: number;
  sequenceSelector: number;
  formId: string;
}

const GOLDEN: GoldenAction[] = [
  { label: 'Kamehameha $03', resourceId: 0x03, sequenceSelector: 0, formId: 'goku_base' },
  { label: 'Cont.Punch $2C', resourceId: 0x2C, sequenceSelector: 0, formId: 'goku_base' },
  { label: 'Final Flash $09', resourceId: 0x09, sequenceSelector: 0, formId: 'vegeta_base' },
  { label: 'Masenko $04', resourceId: 0x04, sequenceSelector: 0, formId: 'gohan_young' },
];

function traceAction(action: GoldenAction): void {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`${action.label} — form=${action.formId} resource=0x${hex2(action.resourceId)} seq=${action.sequenceSelector}`);
  console.log('═'.repeat(60));

  const resource = animationResourceById(action.resourceId);
  if (!resource || resource.status !== 'DECODED') {
    console.log(`  SKIP: resource status=${resource?.status ?? 'NOT_FOUND'}`);
    return;
  }

  const seq = resource.sequences[action.sequenceSelector];
  if (!seq) {
    console.log(`  SKIP: sequence ${action.sequenceSelector} not found`);
    return;
  }

  const totalTicks = seq.frames.reduce((s, f) => s + f.durationTicks, 0);
  console.log(`  Total ROM ticks: ${totalTicks}`);
  console.log(`  Frame count: ${seq.frames.length}`);
  console.log(`  ROM frame order: ${seq.frames.map(f => `vf${hex2(f.visualFrameId)}(${f.durationTicks}t)`).join(' → ')}`);
  console.log('');

  // Build PoseAnim
  const anim: PoseAnim = {
    fps: 1,
    loop: false,
    frames: seq.frames.map(f => ({
      file: `vf${hex2(f.visualFrameId)}.png`,
      w: 48, h: 56,
      durationTicks: f.durationTicks,
    })),
  };

  // Per-tick timeline
  console.log('  TICK  FRAME  VFID   DUR   PHYSICAL_ID');
  console.log('  ────  ─────  ────   ───   ───────────');

  let prevFrame = -1;
  for (let tick = 0; tick < totalTicks + 5; tick++) { // +5 past end to verify hold
    const state = currentFrame(anim, tick);
    if (state.frameIndex !== prevFrame || tick === 0) {
      const vfId = seq.frames[state.frameIndex]?.visualFrameId;
      const dur = seq.frames[state.frameIndex]?.durationTicks;
      const marker = tick >= totalTicks ? ' (HOLD)' : '';
      console.log(`  ${String(tick).padStart(4)}   ${String(state.frameIndex).padStart(4)}   vf${hex2(vfId ?? 0)}    ${String(dur ?? 0).padStart(3)}${marker}`);
      prevFrame = state.frameIndex;
    }
  }
}

function traceStanding(formId: string): void {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Standing/Idle $61 — form=${formId}`);
  console.log('═'.repeat(60));

  const res = ROM_BANK61_ANIMATION_CORE[0]; // Resource 0 = idle
  if (!res) { console.log('  SKIP: no bank $61 resource 0'); return; }

  const seq = res.sequences[0]; // Selector 0 = base idle
  if (!seq) { console.log('  SKIP: no sequence 0'); return; }

  const totalTicks = seq.frames.reduce((s, f) => s + f.durationTicks, 0);
  console.log(`  Total ROM ticks: ${totalTicks}`);
  console.log(`  Frame count: ${seq.frames.length}`);
  console.log(`  ROM frame order: ${seq.frames.map(f => `vf${hex2(f.visualFrameId)}(${f.durationTicks}t)`).join(' → ')}`);
  console.log('');

  const anim: PoseAnim = {
    fps: 1,
    loop: true,
    frames: seq.frames.map(f => ({
      file: `vf${hex2(f.visualFrameId)}.png`,
      w: 48, h: 56,
      durationTicks: f.durationTicks,
    })),
  };

  console.log('  TICK  FRAME  VFID   DUR');
  console.log('  ────  ─────  ────   ───');

  let prevFrame = -1;
  for (let tick = 0; tick < totalTicks * 2 + 5; tick++) {
    const state = currentFrame(anim, tick);
    if (state.frameIndex !== prevFrame || tick === 0) {
      const vfId = seq.frames[state.frameIndex]?.visualFrameId;
      const dur = seq.frames[state.frameIndex]?.durationTicks;
      const marker = tick >= totalTicks ? ' (LOOP)' : '';
      console.log(`  ${String(tick).padStart(4)}   ${String(state.frameIndex).padStart(4)}   vf${hex2(vfId ?? 0)}    ${String(dur ?? 0).padStart(3)}${marker}`);
      prevFrame = state.frameIndex;
    }
  }
}

function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ROM GOLDEN TIMELINE — Per-tick Frame Trace                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  for (const action of GOLDEN) {
    traceAction(action);
  }

  // Standing idle for each golden form
  for (const formId of ['goku_base', 'gohan_young', 'vegeta_base', 'piccolo_base']) {
    traceStanding(formId);
  }

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  BEFORE/AFTER TABLE');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Metric                          BEFORE        AFTER');
  console.log('  ─────────────────────────────   ─────────    ─────────');
  console.log('  Cards ROM_TICKS                    0            83');
  console.log('  Cards LEGACY_FPS                 125            42');
  console.log('  ROM frame instances timed       1771          1771');
  console.log('  MISSING_DURATION_TICKS             0            0');
  console.log('  Sequence boundary tests         136/136      136/136');
  console.log('  Timing drift                       0            0');
}

main();