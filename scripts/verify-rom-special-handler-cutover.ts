// ═══════════════════════════════════════════════════════════════════════
// verify:rom-special-handler-cutover — SPECIAL_HANDLER STATIC CUTOVER gate
//
// Valida que los 4 golden handlers ($0B Tail, $0C V-Ball, $0D Purple Comet,
// $0E P.Comet Z) emiten sus fases físicas FIXED (SSOT) como START_ANIMATION
// multi-fase con sequence+slot, que cada sequence es alcanzable en su
// AnimationResource, y que la rama de resultado permanece PENDING_ROM_TRACE
// (sin fabricar HIT/MISS/GUARD). Guardrails: 0 secuencias inválidas,
// 0 fallback silencioso, 0 rama fabricada.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS } from '../src/data/cards';
import { romPresentationProfileForCard } from '../src/battle/romPresentationProfiles';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';
import { compileRomPresentationProfile } from '../src/battle/romPresentationCompiler';
import { romActionExecutionDescriptorForCard } from '../src/battle/romActionExecutionDescriptors';
import { animationResourceById } from '../src/battle/animationResources';
import { ROM_SPECIAL_HANDLER_SEQUENCE_BINDINGS } from '../src/data/generated/romSpecialHandlerSequenceBindings.generated';

let passes = 0;
let fails = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) { passes++; console.log(`  PASS ${label}${detail ? ` (${detail})` : ''}`); }
  else { fails++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
}

console.log('\n══ SPECIAL_HANDLER STATIC CUTOVER ══');

// ── 1. Los 4 golden handlers: fases SSOT → START_ANIMATION multi-fase ──
for (const binding of ROM_SPECIAL_HANDLER_SEQUENCE_BINDINGS) {
  const hexHandler = `$${binding.handler.toString(16).toUpperCase().padStart(2, '0')}`;
  const signature = CARDS
    .map((card) => ({ card, d: romActionExecutionDescriptorForCard(card) }))
    .filter(({ d }) => d.execution.handler === binding.handler && d.actorAnimation.sequenceBinding != null);

  check(`${hexHandler} ${binding.cardName}: exactly 1 signature card`, signature.length === 1, signature.map(s => `#${s.card.id}`).join(','));
  if (signature.length !== 1) continue;
  const { card, d } = signature[0];
  const profile = romPresentationProfileForCard(card);

  const anims = profile.program.filter((s) => s.kind === 'START_ANIMATION');
  check(`#${card.id} ${binding.cardName}: ${binding.phases.length} START_ANIMATION phases emitted`, anims.length === binding.phases.length, `got ${anims.length}`);

  binding.phases.forEach((phase, i) => {
    const step = anims[i];
    check(
      `#${card.id} phase ${i}: seq=${phase.sequence} slot=${phase.slot} (resource $${binding.actorResource.toString(16).toUpperCase().padStart(2, '0')})`,
      !!step && step.sequence === phase.sequence && step.slot === phase.slot,
      step ? `got seq=${step.sequence} slot=${step.slot}` : 'missing step',
    );
  });

  const entry = animationResourceById(binding.actorResource);
  const seqCount = entry?.sequenceCount ?? 0;
  const allInRange = binding.phases.every((p) => p.sequence >= 0 && p.sequence < seqCount);
  check(`#${card.id}: all sequences reachable (resource seqCount=${seqCount})`, allInRange);

  check(`#${card.id}: result branch pending (dynamic=PENDING_ROM_TRACE)`, profile.completion.dynamic === 'PENDING_ROM_TRACE');
  check(`#${card.id}: 0 fabricated result branches`, profile.resultBranches.length === 0, `got ${profile.resultBranches.length}`);

  const route = romPresentationTimelineForCard(card, 'player', null);
  check(`#${card.id}: routed via ROM bridge (non-null route)`, route != null);
  if (route) {
    const animCues = route.timeline.entries.filter((e) => e.cue.type === 'ANIMATION_START');
    check(`#${card.id}: ANIMATION_START cues = ${binding.phases.length}`, animCues.length === binding.phases.length, `got ${animCues.length}`);
    const dynPending = route.timeline.entries.filter(
      (e) => e.cue.type === 'ROM_PENDING' && (e.cue as { boundary?: string }).boundary === 'DYNAMIC',
    );
    check(`#${card.id}: result branch DYNAMIC pending cue present`, dynPending.length >= 1, `got ${dynPending.length}`);
  }
}

// ── 2. 0 secuencias fuera de rango en TODO programa SPECIAL_HANDLER ──
let outOfRangeCount = 0;
for (const card of CARDS) {
  const profile = romPresentationProfileForCard(card);
  if (profile.kind !== 'SPECIAL_HANDLER') continue;
  for (const step of profile.program) {
    if (step.kind === 'START_ANIMATION' && step.sequence != null && step.resource != null) {
      const entry = animationResourceById(step.resource);
      const seqCount = entry?.sequenceCount ?? 0;
      if (step.sequence < 0 || step.sequence >= seqCount) outOfRangeCount++;
    }
  }
}
check('0 out-of-range sequences across all SPECIAL_HANDLER programs', outOfRangeCount === 0, `${outOfRangeCount} found`);

// ── 3. Guardrail compiler: secuencia fuera de rango → ROM_PENDING (no fallback silencioso) ──
{
  const tail = CARDS.find((c) => c.id === 29)!;
  const profile = romPresentationProfileForCard(tail);
  const sabotaged = {
    ...profile,
    program: profile.program.map((s) =>
      s.kind === 'START_ANIMATION' && s.sequence === 0 ? { ...s, sequence: 999 } : s,
    ),
  };
  const compiled = compileRomPresentationProfile(sabotaged, {
    actorFormId: 'goku_base',
    sequenceSelector: null,
    actorSide: 'player',
  });
  const outOfRangeCues = compiled.timeline.entries.filter(
    (e) => e.cue.type === 'ROM_PENDING' && (e.cue as { reason?: string }).reason.includes('out of range'),
  );
  check('compiler guardrail: out-of-range sequence surfaces ROM_PENDING (no silent seq0 fallback)', outOfRangeCues.length === 1, `got ${outOfRangeCues.length}`);
}

// ── 4. Suicide ($08): honesto — sin secuencia fabricada, rama dinámica ──
{
  const suicide = CARDS
    .map((card) => ({ card, d: romActionExecutionDescriptorForCard(card) }))
    .filter(({ d }) => d.execution.handler === 0x08);
  if (suicide.length > 0) {
    const { card, d } = suicide[0];
    check(`#${card.id} Suicide ($08): no SSOT sequence binding (honest dynamic)`, d.actorAnimation.sequenceBinding == null);
    const profile = romPresentationProfileForCard(card);
    const anims = profile.program.filter((s) => s.kind === 'START_ANIMATION');
    const withSeq = anims.filter((s) => s.sequence != null);
    check(`#${card.id} Suicide: no fabricated per-phase sequence`, withSeq.length === 0, `${withSeq.length} with sequence`);
    check(`#${card.id} Suicide: result branch pending`, profile.completion.dynamic === 'PENDING_ROM_TRACE');
  } else {
    check('Suicide ($08) card located', false, 'no card with handler 0x08');
  }
}

console.log(`\nRESULT: ${passes} passed · ${fails} failed`);
process.exit(fails > 0 ? 1 : 0);
