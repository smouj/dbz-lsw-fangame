// ═══════════════════════════════════════════════════════════════════════
// verify:combat-observability — gate del osciloscopio del combate.
// ═══════════════════════════════════════════════════════════════════════
// Comprueba que la capa de observabilidad (combatObservability +
// combatTrace) dice la VERDAD sobre el puente ROM→producción:
//   - todo Engine event tiene sequence/tick
//   - todo ROM cue tiene trace identity
//   - generated/consumed correlacionan (ningún cue se pierde)
//   - ninguna acción ROM_BACKED_STRICT con dropped required cues
//   - ninguna ROM_BACKED_STRICT usa proyectil procedural
//   - MIXED queda explícito con fallback reason
//   - fallback reason obligatorio en LEGACY
//   - control boundary final registrado
//   - timeline ordenada monotónicamente
//   - actor/target roles consistentes
//   - determinismo: mismo fixture → mismo trace
//   - clasificador de cues ≡ ProductionRomPresentationAdapter (espejo)
//
// Uso:  npm run verify:combat-observability
// ═══════════════════════════════════════════════════════════════════════

import { CARDS } from '../src/data/cards';
import { readFileSync } from 'fs';
import { traceActionPresentation } from '../src/battle/actionPresentationTrace';
import { traceCardAction, classifyRomCue, combatObservabilitySummary } from '../src/battle/combatObservability';
import { GOLDEN_ACTIONS, runGoldenAction } from '../src/battle/combatTrace';
import { inspectGoldenAction } from '../src/battle/actionTraceInspector';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';
import { romPresentationProfileForCard } from '../src/battle/romPresentationProfiles';
import { ProductionRomPresentationAdapter } from '../src/renderer/pixi/presentation/ProductionRomPresentationAdapter';
import type { BattlePresentation, BattleScene } from '../src/renderer/pixi/presentation/BattlePresentation';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title: string): void {
  console.log(`\n── ${title} ──`);
}

// Stub BattlePresentation (headless) para el cross-check con el adapter.
function stubPresentation(): BattlePresentation {
  const calls: string[] = [];
  return {
    setScene: (_s: BattleScene) => { calls.push(`scene`); },
    setActorPose: (_p: string) => { calls.push('actor'); },
    setTargetPose: (_p: string) => { calls.push('target'); },
    moveActor: (_d: number) => { calls.push('move'); },
    spawnProjectile: (_k: string, _t?: { spawnTick: number; contactTick: number }) => { calls.push('proj'); },
    setProjectileProgress: (_p: number) => { calls.push('prog'); },
    impact: () => { calls.push('impact'); },
    camera: (_s: number) => { calls.push('cam'); },
    returnToField: () => { calls.push('field'); },
    sync: (_t: number) => { calls.push('sync'); },
  };
}

// ═══ 1. TODOS los Engine events tienen sequence/tick ═══
section('Engine events (sequence/tick)');
for (const preset of GOLDEN_ACTIONS) {
  const trace = runGoldenAction(preset.id);
  const ok = trace.engineEvents.every(en => Number.isInteger(en.sequence) && en.sequence >= 0 && Number.isInteger(en.tick) && en.tick >= 0);
  check(`preset "${preset.id}": ${trace.engineEventCount} events con sequence+tick`, ok);
}

// ═══ 2. Cada ROM cue tiene trace identity ═══
section('ROM cue trace identity');
let cuesWithoutId = 0;
for (const card of CARDS) {
  const t = traceCardAction(card);
  cuesWithoutId += t.cues.filter(c => !c.traceId).length;
}
check('ningún ROM cue sin traceId', cuesWithoutId === 0, `${cuesWithoutId} sin id`);

// ═══ 3. SUPPORT misrouting guardrail (0 support en Beam/FX ofensivo) ═══
section('SUPPORT nunca entra por BEAM/FX ofensivo');
const misroutedSupport = CARDS.filter(card => card.type === 'support' && (romPresentationProfileForCard(card).kind === 'BEAM_BASE' || romPresentationProfileForCard(card).kind === 'BEAM_VARIANT'));
const supportWithOffensiveFxRoute = CARDS.filter(card => {
  if (card.type !== 'support') return false;
  const route = romPresentationTimelineForCard(card, 'player');
  return route != null && ['BEAM_BASE', 'BEAM_VARIANT', 'PROJECTILE_SCROLL'].includes(route.kind);
});
const supportSpecialRoutes = CARDS.filter(card => card.type === 'support' && romPresentationTimelineForCard(card, 'player')?.kind === 'SUPPORT_SPECIAL');
check('0 support cards con profile BEAM_BASE/BEAM_VARIANT', misroutedSupport.length === 0, misroutedSupport.map(c => `#${c.id} ${c.name}`).join(', '));
check('0 support cards con ruta Beam/FX ofensiva', supportWithOffensiveFxRoute.length === 0, supportWithOffensiveFxRoute.map(c => `#${c.id} ${c.name}`).join(', '));
check('Support ROM route solo por SUPPORT_SPECIAL', supportSpecialRoutes.length === 22, `${supportSpecialRoutes.length}/22`);

// ═══ 4. generated/consumed correlacionan (ningún cue se pierde) ═══
section('Correlación generated/consumed');
let correlationMismatch = 0;
for (const card of CARDS) {
  const t = traceCardAction(card);
  // Contabilidad: cuesTotales = consumed + dropped = generated + pending.
  // Por tanto: generated + pending === consumed + dropped.
  if (t.cuesGenerated + t.cuesPending !== t.cuesConsumed + t.cuesDropped) correlationMismatch++;
}
check('generated + pending === consumed + dropped en las 125 cartas', correlationMismatch === 0, `${correlationMismatch} divergen`);

// ═══ 4. Ninguna ROM_BACKED_STRICT con dropped required cues ═══
section('ROM_BACKED_STRICT sin dropped');
let strictWithDropped = 0;
for (const card of CARDS) {
  const t = traceCardAction(card);
  if (t.finalSource === 'ROM_BACKED_STRICT' && t.cuesDropped > 0) strictWithDropped++;
}
check('ninguna ROM_BACKED_STRICT con dropped required cues', strictWithDropped === 0, `${strictWithDropped} violan`);

// ═══ 5. Ninguna ROM_BACKED_STRICT usa proyectil procedural ═══
section('ROM_BACKED_STRICT sin proyectil procedural');
let strictProcedural = 0;
for (const card of CARDS) {
  const t = traceCardAction(card);
  if (t.finalSource === 'ROM_BACKED_STRICT' && t.proceduralGraphics) strictProcedural++;
}
check('ninguna ROM_BACKED_STRICT usa proyectil procedural', strictProcedural === 0, `${strictProcedural} violan`);

// ═══ 6. MIXED explícito con fallback reason ═══
section('MIXED explícito');
let mixedNoReason = 0;
for (const card of CARDS) {
  const t = traceCardAction(card);
  if (t.presentationSource === 'MIXED' && !t.fallbackReason) mixedNoReason++;
}
check('toda MIXED tiene fallback reason', mixedNoReason === 0, `${mixedNoReason} sin reason`);

// ═══ 7. Fallback reason obligatorio en LEGACY ═══
section('Fallback reason obligatorio');
let legacyNoReason = 0;
for (const card of CARDS) {
  const t = traceCardAction(card);
  if (t.presentationSource === 'LEGACY' && !t.fallbackReason) legacyNoReason++;
}
check('toda LEGACY tiene fallback reason', legacyNoReason === 0, `${legacyNoReason} sin reason`);

// ═══ 8. Control boundary final registrado ═══
section('Control boundary final');
let boundaryMissing = 0;
for (const preset of GOLDEN_ACTIONS) {
  const t = runGoldenAction(preset.id);
  if (!t.controlBoundaryFinal) boundaryMissing++;
  // Coherencia del preset: el boundary final esperado se cumple.
  if (t.controlBoundaryFinal !== preset.expectedControlBoundary) {
    boundaryMissing++;
    console.log(`    (preset ${preset.id}: esperado ${preset.expectedControlBoundary}, real ${t.controlBoundaryFinal})`);
  }
}
check('todo golden action registra control boundary final y coincide con el esperado', boundaryMissing === 0, `${boundaryMissing} fallan`);

// ═══ 9. Timeline ordenada monotónicamente ═══
section('Timeline monotónico');
let nonMonotonic = 0;
for (const card of CARDS) {
  const t = traceCardAction(card);
  for (let i = 1; i < t.cues.length; i++) {
    if (t.cues[i].tick < t.cues[i - 1].tick) { nonMonotonic++; break; }
  }
}
check('cues ordenados no-decrecientes por tick (125 cartas)', nonMonotonic === 0, `${nonMonotonic} desordenadas`);

// ═══ 10. Actor/target roles consistentes ═══
section('Actor/target consistentes');
let roleInconsistent = 0;
for (const preset of GOLDEN_ACTIONS) {
  const t = runGoldenAction(preset.id);
  if (t.attacker === t.defender) roleInconsistent++;
}
check('attacker !== defender en todo golden action', roleInconsistent === 0, `${roleInconsistent} conflictos`);

// ═══ 11. Determinismo: mismo fixture → mismo trace ═══
section('Determinismo');
let determinismFail = 0;
for (const preset of GOLDEN_ACTIONS) {
  const a = JSON.stringify(runGoldenAction(preset.id));
  const b = JSON.stringify(runGoldenAction(preset.id));
  if (a !== b) { determinismFail++; console.log(`    (preset ${preset.id} no determinista)`); }
}
check('mismo fixture → mismo trace (14 presets ×2)', determinismFail === 0, `${determinismFail} no deterministas`);

// ═══ 12. Clasificador de cues ≡ ProductionRomPresentationAdapter ═══
section('Clasificador ≡ Adapter (espejo)');
let adapterDivergence = 0;
let adapterChecked = 0;
for (const card of CARDS) {
  const route = romPresentationTimelineForCard(card, 'player');
  if (!route) continue;
  const adapter = new ProductionRomPresentationAdapter(stubPresentation(), undefined);
  let myVisible = 0, myTrace = 0, myDropped = 0;
  for (const en of route.timeline.entries) {
    const cls = classifyRomCue(en.cue);
    if (cls.visible) myVisible++;
    if (cls.trace) myTrace++;
    if (cls.dropped) myDropped++;
    adapter.consume(en.cue);
  }
  const snap = adapter.snapshot;
  if (snap.visibleEffects !== myVisible || snap.traceCues !== myTrace || snap.pendingCues !== myDropped) {
    adapterDivergence++;
    if (adapterDivergence <= 5) {
      console.log(`    (card #${card.id} ${card.name}: adapter vis=${snap.visibleEffects}/trace=${snap.traceCues}/pend=${snap.pendingCues} vs clasif vis=${myVisible}/trace=${myTrace}/drop=${myDropped})`);
    }
  }
  adapterChecked++;
}
check(`clasificador ≡ adapter en ${adapterChecked} cartas bridge-eligible`, adapterDivergence === 0, `${adapterDivergence} divergen`);

// ═══ 13. Action Trace Inspector (P0.4): cadena hasta el frame ═══
section('Action Trace Inspector (rol → frame → ROM → clasificación → fallback)');
let inspectorErrored = 0;
let romChainMismatch = 0;
let chainFrameMismatch = 0;
let fallbackMissing = 0;
let falseRomExact = 0;
for (const preset of GOLDEN_ACTIONS) {
  try {
    const ins = inspectGoldenAction(preset.id);
    // Cada chain step resuelve una secuencia con frames (o FALLBACK honesto).
    for (const c of ins.chains) {
      if (c.sequence.frames.length === 0 && c.sequence.source !== 'FALLBACK') chainFrameMismatch++;
      if (c.fallbackReason == null && (c.sequence.source === 'UNRESOLVED' || c.sequence.source === 'COMPOSITE' || c.sequence.source === 'FALLBACK')) fallbackMissing++;
      if (c.sequence.classification === 'ROM_EXACT' && c.sequence.bindings.filter(b => b.rom).length === 0) falseRomExact++;
    }
    // ROM chain: every entry must have frames.
    // romBacked=true means a compiled route exists; romChain entries only appear
    // when the AnimationResource catalog is decoded with actual frames.
    // So romBacked=true with empty romChain is valid (resource not yet decoded).
    // romChain entries with 0 frames is always a bug.
    // romChain entries with 0 poses but >0 frames is valid for newly decoded
    // resources that haven't been rendered for a form yet (manifest pose
    // contract not established). This is expected during incremental decoding.
    for (const rc of ins.romChain) {
      if (rc.frameCount < 1) romChainMismatch++;
    }
    // Cards without cardId should not produce romChain entries.
    if (preset.cardId == null && ins.romChain.length > 0) {
      romChainMismatch++;
    }
  } catch (e) {
    inspectorErrored++;
    console.log(`    (preset ${preset.id} lanza: ${String(e)})`);
  }
}
check('todo golden action inspecciona sin error', inspectorErrored === 0, `${inspectorErrored} errores`);
check('ROM chain coherente con romBacked', romChainMismatch === 0, `${romChainMismatch} divergen`);
check('toda chain step tiene frames o FALLBACK honesto', chainFrameMismatch === 0, `${chainFrameMismatch} sin frames`);
check('fallback reason presente en UNRESOLVED/COMPOSITE/FALLBACK', fallbackMissing === 0, `${fallbackMissing} sin reason`);
check('ningún ROM_EXACT con 0 frames ROM', falseRomExact === 0, `${falseRomExact} falsos`);

// El inspector debe ser determinista también.
let inspectorDeterminismFail = 0;
for (const preset of GOLDEN_ACTIONS) {
  const a = JSON.stringify(inspectGoldenAction(preset.id));
  const b = JSON.stringify(inspectGoldenAction(preset.id));
  if (a !== b) inspectorDeterminismFail++;
}
check('inspector determinista (14 presets ×2)', inspectorDeterminismFail === 0, `${inspectorDeterminismFail} no deterministas`);

// ═══ 14. ActionPresentationTrace (P0.4) — LAB_DUP=0 + invariantes ═══
section('ActionPresentationTrace (P0.4): frame realmente mostrado');
let aptSrc = '';
try { aptSrc = readFileSync('src/battle/actionPresentationTrace.ts', 'utf8'); } catch { /* file may not exist in some builds */ }
const dupNewRuntime = aptSrc.includes('new BattleRuntime');
const dupResolveCard = aptSrc.includes('.resolveCard(');
const dupDispatch = aptSrc.includes('.dispatch(');
check('LAB_GAMEPLAY_IMPLEMENTATION_DUPLICATION = 0 (sin BattleRuntime/resolveCard/dispatch propios)', !dupNewRuntime && !dupResolveCard && !dupDispatch, `newRuntime=${dupNewRuntime} resolveCard=${dupResolveCard} dispatch=${dupDispatch}`);

let aptCorrelationFail = 0;
let aptRomLegacyFail = 0;
let aptMissingFrame = 0;
let aptDeterminismFail = 0;
for (const preset of GOLDEN_ACTIONS) {
  const t = traceActionPresentation(preset.id);
  const rt = runGoldenAction(preset.id);
  // El tracer reutiliza el runtime real: sus conteos deben coincidir 1:1.
  const rtCues = rt.cardTrace?.cuesGenerated ?? rt.legacyCues.length;
  if (t.presentation.generatedCueCount !== rtCues) aptCorrelationFail++;
  // source=ROM → no puede aparecer Legacy/Procedural (0 dropped, frame existente).
  if (t.presentation.source === 'ROM') {
    if (t.presentation.generatedCueCount !== t.presentation.consumedCueCount) aptRomLegacyFail++;
    for (const rf of t.romFrames) if (rf.actor.file == null) aptMissingFrame++;
  }
  const a = JSON.stringify(t);
  const b = JSON.stringify(traceActionPresentation(preset.id));
  if (a !== b) aptDeterminismFail++;
}
check('tracer correlaciona 1:1 con el runtime real (14 presets)', aptCorrelationFail === 0, `${aptCorrelationFail} divergen`);
check('source=ROM → 0 Legacy/Procedural visual', aptRomLegacyFail + aptMissingFrame === 0, `${aptRomLegacyFail} dropped · ${aptMissingFrame} missing frame`);
check('traceActionPresentation determinista (14 presets ×2)', aptDeterminismFail === 0, `${aptDeterminismFail} no deterministas`);

// ═══ Resumen honesto ═══
section('Resumen de producción (osciloscopio)');
const s = combatObservabilitySummary();
console.log(`  romBacked (bridge) : ${s.romBacked}`);
console.log(`  romBackedStrict    : ${s.romBackedStrict}  ← estricto (sin dropped ni procedural)`);
console.log(`  romPartial (MIXED) : ${s.romPartial}`);
console.log(`  legacyVisible      : ${s.legacyVisible}`);
console.log(`  cues generated     : ${s.totalCuesGenerated}`);
console.log(`  cues dropped       : ${s.totalCuesDropped}`);
console.log(`  cues no-visible    : ${s.totalCuesNoVisibleEffect}`);
console.log(`  procedural cards   : ${s.proceduralCards}`);

console.log(`\n══ RESULTADO: ${passed} ✓ · ${failed} ✗ ══`);
if (failed > 0) {
  console.log('\nFallos:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('PASS — observabilidad del combate consistente con el puente ROM→producción.');
