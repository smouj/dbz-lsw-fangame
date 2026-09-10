// ═══════════════════════════════════════════════════════════════════════
// P0.5 — verify:dynamic-rom-trace
// ═══════════════════════════════════════════════════════════════════════
// Gate: tracker dinámico como contrato vivo.
//
// Invariantes:
//   UNKNOWN_REASON cues                    0
//   AnimationSlot8 PENDING cues            0
//   DRAW_ORDER_ROM consumed                PASS (was TRACE_ONLY)
//   CONSUMED cues ≥ previous               PASS
//   PARTIAL profiles have no stale refs    PASS
//   SPECIAL scene_set classified           6 PENDING_ROM_TRACE
//   BEAM SCX/SCY classified               PENDING_ROM_TRACE
//   ACTION_OBJECT_VISIBILITY remediation   tracked
//   ACTION_ANCHOR_TABLE remediation        tracked
//   BRIDGE cues documented                 2
//   TRACE_ONLY cues documented             2
// ═══════════════════════════════════════════════════════════════════════

import { ROM_PRESENTATION_PROFILES } from '../src/battle/romPresentationProfiles';
import { ROM_SCENE_CUES } from '../src/battle/romSceneCue';

const failures: string[] = [];
let checks = 0;
const check = (condition: boolean, message: string): void => {
  checks++;
  if (!condition) failures.push(message);
};

// ── 1. UNKNOWN_REASON cues = 0 ──

const unknownReason = ROM_SCENE_CUES.filter(c => !(c as any).evidence || (c as any).evidence === 'UNKNOWN');
check(unknownReason.length === 0, `${unknownReason.length} cues with UNKNOWN evidence`);

// ── 2. AnimationSlot8 PENDING cues = 0 ──

const slot8Cues = ROM_SCENE_CUES.filter(c => c.id.includes('SLOT8') || c.id.includes('ACTOR_SELECT'));
check(slot8Cues.length === 0, `AnimationSlot8 PENDING cues: ${slot8Cues.length}`);

// ── 3. DRAW_ORDER_ROM consumed ──

const drawOrderCue = ROM_SCENE_CUES.find(c => c.id === 'DRAW_ORDER_ROM');
check(drawOrderCue !== undefined, 'DRAW_ORDER_ROM cue not found');
check(drawOrderCue?.consumed === 'CONSUMED', `DRAW_ORDER_ROM consumed=${drawOrderCue?.consumed}, expected CONSUMED`);

// ── 4. CONSUMED cues ≥ 49 (baseline from P0.4 closure) ──

const consumedCues = ROM_SCENE_CUES.filter(c => c.consumed === 'CONSUMED').length;
check(consumedCues >= 49, `CONSUMED cues: ${consumedCues}, expected ≥ 49`);

// ── 5. SPECIAL scene_set classified ──

const specialCues = ROM_SCENE_CUES.filter(c => c.family === 'SPECIAL' && c.consumed !== 'CONSUMED');
check(specialCues.length === 6, `SPECIAL PENDING cues: ${specialCues.length}, expected 6`);
for (const c of specialCues) {
  check(c.evidence === 'PENDING_ROM_TRACE', `SPECIAL cue ${c.id} evidence=${c.evidence}, expected PENDING_ROM_TRACE`);
  check(c.operation === 'SCENE_SET', `SPECIAL cue ${c.id} operation=${c.operation}, expected SCENE_SET`);
}

// ── 6. BEAM SCX/SCY classified ──

const beamPending = ROM_SCENE_CUES.filter(c => c.family === 'BEAM' && c.consumed !== 'CONSUMED');
check(beamPending.length >= 2, `BEAM PENDING/TRACE_ONLY cues: ${beamPending.length}, expected ≥ 2`);
const beamBgLayer = ROM_SCENE_CUES.find(c => c.id === 'BEAM_BG_LAYER');
check(beamBgLayer !== undefined, 'BEAM_BG_LAYER cue not found');
check(beamBgLayer?.consumed === 'PENDING', `BEAM_BG_LAYER consumed=${beamBgLayer?.consumed}, expected PENDING`);

// ── 7. ACTION_OBJECT_VISIBILITY remediation tracked ──

const visibilityCue = ROM_SCENE_CUES.find(c => c.id === 'ACTION_OBJECT_VISIBILITY_PRIMITIVE');
check(visibilityCue !== undefined, 'ACTION_OBJECT_VISIBILITY_PRIMITIVE cue not found');
check(visibilityCue?.consumed === 'CONSUMED', `ACTION_OBJECT_VISIBILITY_PRIMITIVE consumed=${visibilityCue?.consumed}, expected CONSUMED`);
check(visibilityCue?.evidence === 'ROM_STATIC_VERIFIED', `ACTION_OBJECT_VISIBILITY_PRIMITIVE evidence=${visibilityCue?.evidence}, expected ROM_STATIC_VERIFIED`);

// ── 8. ACTION_ANCHOR_TABLE remediation tracked ──

const anchorCue = ROM_SCENE_CUES.find(c => c.id === 'ACTION_ANCHOR_TABLE_ROM');
check(anchorCue !== undefined, 'ACTION_ANCHOR_TABLE_ROM cue not found');
check(anchorCue?.consumed === 'CONSUMED', `ACTION_ANCHOR_TABLE_ROM consumed=${anchorCue?.consumed}, expected CONSUMED`);
check(anchorCue?.evidence === 'ROM_STATIC_VERIFIED', `ACTION_ANCHOR_TABLE_ROM evidence=${anchorCue?.evidence}, expected ROM_STATIC_VERIFIED`);

// ── 9. BRIDGE cues documented ──

const bridgeCues = ROM_SCENE_CUES.filter(c => c.consumed === 'BRIDGE');
check(bridgeCues.length === 2, `BRIDGE cues: ${bridgeCues.length}, expected 2`);
for (const c of bridgeCues) {
  check(c.description !== undefined && c.description.length > 0, `BRIDGE cue ${c.id} missing description`);
}

// ── 10. TRACE_ONLY cues documented ──

const traceOnlyCues = ROM_SCENE_CUES.filter(c => c.consumed === 'TRACE_ONLY');
check(traceOnlyCues.length === 2, `TRACE_ONLY cues: ${traceOnlyCues.length}, expected 2`);
for (const c of traceOnlyCues) {
  check(c.evidence !== undefined, `TRACE_ONLY cue ${c.id} missing evidence`);
  check((c as any)?.remediation !== undefined, `TRACE_ONLY cue ${c.id} missing remediation`);
}

// ── 11. No stale refs in PARTIAL profiles ──

const partialProfiles = ROM_PRESENTATION_PROFILES.filter(p => p.completion?.static === 'PARTIAL');
for (const p of partialProfiles) {
  const deps = p.dependencies;
  if (deps) {
    if (deps.animationResource && typeof deps.animationResource === 'number') {
      check(deps.animationResource > 0, `Profile ${(p as any).cardName}: invalid animationResource ${deps.animationResource}`);
    }
  }
}

// ── 12. COMPLETE profiles have valid completion ──

const completeProfiles = ROM_PRESENTATION_PROFILES.filter(p => p.completion?.static === 'COMPLETE');
check(completeProfiles.length >= 63, `COMPLETE profiles: ${completeProfiles.length}, expected ≥ 63`);

// ── Summary ──

if (failures.length === 0) {
  console.log(`\n═══ RESULTADO: ${checks} passed · 0 failed ═══`);
  console.log('PASS — dynamic film tracker: no UNKNOWN_REASON, no stale AnimationSlot8, DRAW_ORDER_ROM consumed.');
  console.log('');
  console.log('Items requiring additional ROM trace coverage:');
  console.log('  - 6 SPECIAL SCENE_SET (Hell Flash, Big Bang, S.Beam Cannon, Spirit Bomb, Destructo Disk, Tail)');
  console.log('  - BEAM BG_LAYER: LEFT Kamehameha captured; RIGHT + handlers $02-$07 remain');
  console.log('  - 2 TRACE_ONLY (CAMERA_TRACK, BEAM_FX_LOAD)');
  console.log('  - 2 BRIDGE (BEAM_PROJECTILE_BRIDGE, STAGE_SCENE_PREP)');
  console.log('');
  console.log('Ready for immediate promotion:');
  console.log('  - ACTION_OBJECT_VISIBILITY_PRIMITIVE (ROM_STATIC_VERIFIED, needs adapter consumption)');
  console.log('  - ACTION_ANCHOR_TABLE_ROM (ROM_STATIC_VERIFIED, needs anchor table consumption in presenter)');
} else {
  console.log(`\n═══ RESULTADO: ${checks - failures.length} passed · ${failures.length} failed ═══`);
  for (const f of failures) {
    console.log(`  - ${f}`);
  }
  process.exit(1);
}
