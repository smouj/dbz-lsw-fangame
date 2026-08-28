// ═══════════════════════════════════════════════════════════════════════
// C0 — ROM → RUNTIME CONSUMPTION AUDIT
// ═══════════════════════════════════════════════════════════════════════
// Responde, con datos generados desde código, la pregunta central:
//
//   "¿Qué partes de todo lo ROM-ya-desentrañado llegan REALMENTE a
//    producción, y cuáles siguen teniendo una segunda implementación manual?"
//
// NO es documentación narrativa. Es una MATRIZ + SCOREBOARD calculados en
// vivo cruzando las SSOT existentes:
//   - combatObservability.traceCardAction  (cues generated/consumed/dropped)
//   - romPresentationTimelineForCard       (route != null → ROM bridge)
//   - romPresentationProfileForCard        (kind + completion)
//   - ROM_SCENE_CUES                       (scene/camera/motion/visibility)
//   - ROM_CINEMATIC_BEATS                  (beats correctlyUsed)
//   - ROM_BANK61_ANIMATION_CORE + ANIMATION_RESOURCE_CATALOG (frames timed)
//
// Estados finales por carta (grade estricto):
//   ROM_FULL        enrutada ROM y 0 cues dropped → toda evidencia llega
//   ROM_MIXED       enrutada ROM pero con gaps (PENDING/REMAKE_FALLBACK)
//   LEGACY          cae a buildTimeline legacy (route == null)
//   PENDING_DYNAMIC handler FSM/runtime congelado (PENDING_ROM_TRACE, no bridge)
//   NOT_APPLICABLE  sin programa de presentación ROM (kind NONE)
//
// Uso:  npm run audit:rom-consumption
// ═══════════════════════════════════════════════════════════════════════

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CARDS, type CardDef } from '../src/data/cards';
import {
  traceCardAction,
  combatObservabilitySummary,
} from '../src/battle/combatObservability';
import {
  romPresentationProfileForCard,
  type RomPresentationProfileKind,
} from '../src/battle/romPresentationProfiles';
import { romActionExecutionDescriptorForCard } from '../src/battle/romActionExecutionDescriptors';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';
import {
  ROM_SCENE_CUES,
  cuesByFamily,
  hardcodedSceneSwitches,
  type SceneCueFamily,
} from '../src/battle/romSceneCue';
import { ROM_CINEMATIC_BEATS, incorrectlyUsedBeats } from '../src/battle/romCinematicBeat';
import { ROM_BANK61_ANIMATION_CORE } from '../src/data/generated/romAnimationCore.generated';
import { ANIMATION_RESOURCE_CATALOG } from '../src/battle/animationResources';

// ── Tipos ──────────────────────────────────────────────────────────────

type ConsumptionState = 'ROM_FULL' | 'ROM_MIXED' | 'LEGACY' | 'PENDING_DYNAMIC' | 'NOT_APPLICABLE';
type TimingSource = 'ROM_TICKS' | 'LEGACY_FPS' | 'NO_ANIMATION';
type SceneStatus = 'CLEAN' | 'PARTIAL' | 'PENDING';

interface CardRow {
  id: number;
  name: string;
  type: CardDef['type'];
  handler: string;
  kind: RomPresentationProfileKind;
  evidenceStatic: 'COMPLETE' | 'PARTIAL';
  evidenceDynamic: 'NOT_REQUIRED' | 'PENDING_ROM_TRACE';
  compiler: 'ROM' | 'LEGACY';
  runtime: string;
  frames: TimingSource;
  ticks: number;
  scene: SceneStatus;
  motion: 'ROM' | 'NONE';
  camera: 'CONSUMED' | 'PARTIAL' | 'N/A';
  fxBg: 'CONSUMED' | 'BRIDGE' | 'PENDING' | 'N/A';
  cuesGen: number;
  cuesConsumed: number;
  cuesDropped: number;
  pendingStatic: number;
  pendingDynamic: number;
  state: ConsumptionState;
  reason: string;
}

// ── Derivaciones ───────────────────────────────────────────────────────

function timingSourceFor(card: CardDef): TimingSource {
  const profile = romPresentationProfileForCard(card);
  if (profile.kind === 'NONE') return 'NO_ANIMATION';
  if (profile.kind === 'SUPPORT_OR_FIELD_EFFECT' || profile.kind === 'DEFENSE_RULE') return 'LEGACY_FPS';
  return 'ROM_TICKS';
}

function sceneFamilyForCard(card: CardDef): SceneCueFamily {
  switch (card.type) {
    case 'command': return 'STAGE';
    case 'damage': return 'STANDARD_DAMAGE';
    case 'beam': return 'BEAM';
    case 'support': return 'SUPPORT';
    case 'defense': return 'DEFENSE';
    case 'special': return 'SPECIAL';
  }
}

function sceneStatusFor(family: SceneCueFamily): SceneStatus {
  const cues = cuesByFamily(family);
  if (cues.some(c => c.consumed === 'PENDING')) return 'PENDING';
  if (cues.some(c => c.consumed === 'TRACE_ONLY' || c.consumed === 'BRIDGE')) return 'PARTIAL';
  return 'CLEAN';
}

function motionFor(kind: RomPresentationProfileKind): 'ROM' | 'NONE' {
  return ['STANDARD_DAMAGE', 'BEAM_BASE', 'BEAM_VARIANT', 'PROJECTILE_SCROLL'].includes(kind)
    ? 'ROM'
    : 'NONE';
}

function fxBgFor(card: CardDef): 'CONSUMED' | 'BRIDGE' | 'PENDING' | 'N/A' {
  switch (card.type) {
    case 'beam': return 'PENDING';       // BEAM_BG_LAYER PENDING + BRIDGE procedural
    case 'support': return 'CONSUMED';   // DISPLAY_COMPOSE/CLEAR
    case 'defense': return 'CONSUMED';   // DEFENSE_FX
    case 'special': return 'PENDING';    // PENDING_ROM_TRACE
    case 'damage': return 'N/A';
    case 'command': return 'N/A';
  }
}

function cameraFor(family: SceneCueFamily): 'CONSUMED' | 'PARTIAL' | 'N/A' {
  const cameraOps = new Set(['CAMERA_TRACK', 'CAMERA_TRANSLATE', 'CAMERA_SHAKE',
    'CAMERA_FLASH', 'CAMERA_CUT', 'CAMERA_RESET', 'SCREEN_SCROLL']);
  const cameraCues = ROM_SCENE_CUES.filter(c => cameraOps.has(c.operation));
  const familyCamera = cameraCues.filter(c => c.family === family);
  const relevant = familyCamera.length > 0 ? familyCamera : cameraCues.filter(c => c.family === 'SHARED');
  if (relevant.some(c => c.consumed === 'TRACE_ONLY')) return 'PARTIAL';
  if (relevant.length === 0) return 'N/A';
  return 'CONSUMED';
}

function pendingBoundaryCounts(card: CardDef): { static: number; dynamic: number } {
  const route = romPresentationTimelineForCard(card, 'player', null);
  let s = 0;
  let d = 0;
  if (route) {
    for (const en of route.timeline.entries) {
      if (en.cue.type === 'ROM_PENDING') {
        const boundary = (en.cue as { boundary?: string }).boundary ?? 'STATIC';
        if (boundary === 'DYNAMIC') d++;
        else s++;
      }
    }
  }
  return { static: s, dynamic: d };
}

function classify(card: CardDef): { state: ConsumptionState; reason: string } {
  const profile = romPresentationProfileForCard(card);
  const t = traceCardAction(card);
  const pend = pendingBoundaryCounts(card);

  if (!t.romBacked) {
    // No enrutada por el bridge ROM → camino manual.
    if (profile.completion.dynamic === 'PENDING_ROM_TRACE') {
      return { state: 'PENDING_DYNAMIC', reason: 'handler FSM/runtime congelado (PENDING_ROM_TRACE)' };
    }
    if (profile.kind === 'NONE') {
      return { state: 'NOT_APPLICABLE', reason: 'sin programa de presentación ROM (kind NONE)' };
    }
    return { state: 'LEGACY', reason: t.fallbackReason ?? `bridge no elegible: ${profile.kind}` };
  }

  // Enrutada por ROM.
  if (t.presentationSource === 'ROM') {
    return { state: 'ROM_FULL', reason: 'ROM_CLEAN (0 dropped, visible, sin procedural)' };
  }
  const parts: string[] = [];
  if (pend.static > 0) parts.push(`${pend.static} PENDING estático (cerrable)`);
  if (pend.dynamic > 0) parts.push(`${pend.dynamic} PENDING dinámico (congelado)`);
  if (t.presentationSource === 'REMAKE_FALLBACK') parts.push('sin efecto visible');
  return { state: 'ROM_MIXED', reason: parts.join(' · ') || (t.fallbackReason ?? 'MIXED') };
}

// ── Matriz ─────────────────────────────────────────────────────────────

function buildRows(): CardRow[] {
  return CARDS.map(card => {
    const profile = romPresentationProfileForCard(card);
    const descriptor = romActionExecutionDescriptorForCard(card);
    const t = traceCardAction(card);
    const family = sceneFamilyForCard(card);
    const cls = classify(card);
    const pend = pendingBoundaryCounts(card);

    return {
      id: card.id,
      name: card.name,
      type: card.type,
      handler: descriptor.execution.handlerHex,
      kind: profile.kind,
      evidenceStatic: profile.completion.static,
      evidenceDynamic: profile.completion.dynamic,
      compiler: t.romBacked ? 'ROM' : 'LEGACY',
      runtime: t.presentationSource,
      frames: timingSourceFor(card),
      ticks: descriptor.actorAnimation.sequenceSource?.totalTicks ?? 0,
      scene: sceneStatusFor(family),
      motion: motionFor(profile.kind),
      camera: cameraFor(family),
      fxBg: fxBgFor(card),
      cuesGen: t.cuesGenerated,
      cuesConsumed: t.cuesConsumed,
      cuesDropped: t.cuesDropped,
      pendingStatic: pend.static,
      pendingDynamic: pend.dynamic,
      state: cls.state,
      reason: cls.reason,
    };
  });
}

// ── Scoreboard ─────────────────────────────────────────────────────────

function countFramesTimed(): number {
  let n = 0;
  for (const res of ROM_BANK61_ANIMATION_CORE) {
    for (const seq of res.sequences) n += seq.frames.length;
  }
  for (const entry of ANIMATION_RESOURCE_CATALOG) {
    if (entry.status !== 'DECODED') continue;
    for (const seq of entry.sequences) n += seq.frames.length;
  }
  return n;
}

function countSequencesTimed(): number {
  let n = 0;
  for (const res of ROM_BANK61_ANIMATION_CORE) n += res.sequences.length;
  for (const entry of ANIMATION_RESOURCE_CATALOG) {
    if (entry.status === 'DECODED') n += entry.sequences.length;
  }
  return n;
}

function buildScoreboard(rows: CardRow[]) {
  const state = (s: ConsumptionState) => rows.filter(r => r.state === s).length;
  const beatsConsumed = ROM_CINEMATIC_BEATS.filter(b => b.correctlyUsed === 'yes').length;
  const beatsIncorrect = incorrectlyUsedBeats().length;
  const sceneConsumed = ROM_SCENE_CUES.filter(c => c.consumed === 'CONSUMED').length;
  const sceneTraceOnly = ROM_SCENE_CUES.filter(c => c.consumed === 'TRACE_ONLY').length;
  const sceneBridge = ROM_SCENE_CUES.filter(c => c.consumed === 'BRIDGE').length;
  const scenePending = ROM_SCENE_CUES.filter(c => c.consumed === 'PENDING').length;

  const cameraCues = ROM_SCENE_CUES.filter(c =>
    c.operation.startsWith('CAMERA_') || c.operation === 'SCREEN_SCROLL');
  const cameraGenerated = cameraCues.length;
  const cameraConsumed = cameraCues.filter(c => c.consumed === 'CONSUMED').length;

  const manualVisibility = hardcodedSceneSwitches().length;
  const hardcodedPositions = ROM_SCENE_CUES.filter(c =>
    c.operation === 'FIGHTER_POSITION' && c.evidence === 'PRESENTATION_DERIVED').length;

  const obs = combatObservabilitySummary();
  const totalPendingStatic = rows.reduce((s, r) => s + r.pendingStatic, 0);
  const totalPendingDynamic = rows.reduce((s, r) => s + r.pendingDynamic, 0);

  // ROM_MIXED breakdown por causa.
  const mixedByNoVisible = rows.filter(r => r.state === 'ROM_MIXED' && r.runtime === 'REMAKE_FALLBACK').length;
  const mixedByStatic = rows.filter(r => r.state === 'ROM_MIXED' && r.pendingStatic > 0).length;
  const mixedByDynamic = rows.filter(r => r.state === 'ROM_MIXED' && r.pendingDynamic > 0).length;

  return {
    cardsTotal: rows.length,
    romFull: state('ROM_FULL'),
    romMixed: state('ROM_MIXED'),
    legacy: state('LEGACY'),
    pendingDynamic: state('PENDING_DYNAMIC'),
    notApplicable: state('NOT_APPLICABLE'),
    framesTimed: countFramesTimed(),
    sequencesTimed: countSequencesTimed(),
    beatsTotal: ROM_CINEMATIC_BEATS.length,
    beatsConsumed,
    beatsIncorrect,
    sceneCuesTotal: ROM_SCENE_CUES.length,
    sceneConsumed,
    sceneTraceOnly,
    sceneBridge,
    scenePending,
    manualSceneVisibilityPaths: manualVisibility,
    hardcodedActionPositions: hardcodedPositions,
    legacyBuildTimelineRoutes: state('LEGACY'),
    cameraCuesGenerated: cameraGenerated,
    cameraCuesConsumed: cameraConsumed,
    romBackedCards: obs.romBacked,
    romBackedStrict: obs.romBackedStrict,
    totalCuesGenerated: obs.totalCuesGenerated,
    totalCuesConsumed: obs.totalCuesConsumed,
    totalCuesDropped: obs.totalCuesDropped,
    totalPendingStatic,
    totalPendingDynamic,
    proceduralCards: obs.proceduralCards,
    mixedByNoVisible,
    mixedByStatic,
    mixedByDynamic,
  };
}

// ── Render ─────────────────────────────────────────────────────────────

function renderMatrixMarkdown(rows: CardRow[]): string {
  const header = [
    'ID', 'Carta', 'Tipo', 'Handler', 'Kind', 'Evid', 'Compiler', 'Runtime',
    'Frames', 'Ticks', 'Scene', 'Motion', 'Camera', 'FX/BG', 'Cues', 'Estado', 'Razón',
  ].join(' | ');
  const sep = header.split(' | ').map(() => '---').join(' | ');
  const lines = [header, sep];
  for (const r of rows) {
    const evid = `${r.evidenceStatic === 'COMPLETE' ? 'C' : 'P'}${r.evidenceDynamic === 'PENDING_ROM_TRACE' ? '/DYN' : ''}`;
    const cues = `${r.cuesGen}/${r.cuesConsumed}/${r.cuesDropped}`;
    lines.push([
      r.id, r.name, r.type, r.handler, r.kind, evid, r.compiler, r.runtime,
      r.frames, r.ticks, r.scene, r.motion, r.camera, r.fxBg, cues, r.state, r.reason,
    ].join(' | '));
  }
  return lines.join('\n');
}

function renderScoreboardMarkdown(s: ReturnType<typeof buildScoreboard>): string {
  const pct = (n: number, total: number) => `${n}/${total} (${((n / total) * 100).toFixed(0)}%)`;
  return [
    '# ROM → Runtime Consumption Scoreboard',
    '',
    '## Estados finales (125 cartas)',
    '',
    '| Estado | Cartas |',
    '| --- | --- |',
    `| ROM_FULL | ${s.romFull} |`,
    `| ROM_MIXED | ${s.romMixed} |`,
    `| LEGACY | ${s.legacy} |`,
    `| PENDING_DYNAMIC | ${s.pendingDynamic} |`,
    `| NOT_APPLICABLE | ${s.notApplicable} |`,
    '',
    '> **ROM_FULL = 0** significa que ninguna carta cierra hoy el ciclo completo: toda carta ROM-backed arrastra al menos un cue PENDING.',
    '',
    '## Consumo de evidencia ROM ya desentrañada',
    '',
    '| Métrica | Valor |',
    '| --- | --- |',
    `| Frame sequences timed | ${s.sequencesTimed} |`,
    `| Frame instances timed | ${s.framesTimed} |`,
    `| Cinematic beats correctlyUsed | ${pct(s.beatsConsumed, s.beatsTotal)} (${s.beatsIncorrect} incorrect) |`,
    `| Scene cues CONSUMED | ${pct(s.sceneConsumed, s.sceneCuesTotal)} |`,
    `| Scene cues TRACE_ONLY / BRIDGE / PENDING | ${s.sceneTraceOnly} / ${s.sceneBridge} / ${s.scenePending} |`,
    '',
    '## Implementaciones manuales que quedan (gap real)',
    '',
    '| Métrica | Valor |',
    '| --- | --- |',
    `| Manual scene visibility paths (hardcoded) | ${s.manualSceneVisibilityPaths} |`,
    `| Hardcoded action positions | ${s.hardcodedActionPositions} |`,
    `| Legacy buildTimeline routes | ${s.legacyBuildTimelineRoutes} |`,
    `| Camera cues generated / consumed | ${s.cameraCuesGenerated} / ${s.cameraCuesConsumed} |`,
    `| ROM-backed cards (bridge) | ${s.romBackedCards} (strict ${s.romBackedStrict}) |`,
    `| Cues generated / consumed / dropped | ${s.totalCuesGenerated} / ${s.totalCuesConsumed} / ${s.totalCuesDropped} |`,
    `| PENDING estático (cerrable) / dinámico (congelado) | ${s.totalPendingStatic} / ${s.totalPendingDynamic} |`,
    `| Cards con proyectil procedural | ${s.proceduralCards} |`,
    '',
    '## ROM_MIXED desglose por causa',
    '',
    '| Causa | Cartas |',
    '| --- | --- |',
    `| PENDING estático (cerrable) | ${s.mixedByStatic} |`,
    `| Sin efecto visible (REMAKE_FALLBACK) | ${s.mixedByNoVisible} |`,
    `| PENDING dinámico (congelado) | ${s.mixedByDynamic} |`,
    '',
  ].join('\n');
}

// ── Main ───────────────────────────────────────────────────────────────

function main(): void {
  const rows = buildRows();
  const scoreboard = buildScoreboard(rows);

  console.log('\n═══ ROM → RUNTIME CONSUMPTION SCOREBOARD ═══\n');
  console.log(`cards total            ${scoreboard.cardsTotal}`);
  console.log(`  ROM_FULL             ${scoreboard.romFull}`);
  console.log(`  ROM_MIXED            ${scoreboard.romMixed}`);
  console.log(`  LEGACY               ${scoreboard.legacy}`);
  console.log(`  PENDING_DYNAMIC      ${scoreboard.pendingDynamic}`);
  console.log(`  NOT_APPLICABLE       ${scoreboard.notApplicable}`);
  console.log(`\nframe sequences timed  ${scoreboard.sequencesTimed}`);
  console.log(`frame instances timed  ${scoreboard.framesTimed}`);
  console.log(`cinematic beats ok     ${scoreboard.beatsConsumed}/${scoreboard.beatsTotal} (${scoreboard.beatsIncorrect} incorrect)`);
  console.log(`scene cues consumed    ${scoreboard.sceneConsumed}/${scoreboard.sceneCuesTotal} (TRACE_ONLY ${scoreboard.sceneTraceOnly} · BRIDGE ${scoreboard.sceneBridge} · PENDING ${scoreboard.scenePending})`);
  console.log(`\nmanual scene visibility ${scoreboard.manualSceneVisibilityPaths}`);
  console.log(`hardcoded positions     ${scoreboard.hardcodedActionPositions}`);
  console.log(`legacy buildTimeline    ${scoreboard.legacyBuildTimelineRoutes}`);
  console.log(`camera cues             ${scoreboard.cameraCuesConsumed}/${scoreboard.cameraCuesGenerated}`);
  console.log(`rom-backed bridge       ${scoreboard.romBackedCards} (strict ${scoreboard.romBackedStrict})`);
  console.log(`cues gen/cons/dropped   ${scoreboard.totalCuesGenerated}/${scoreboard.totalCuesConsumed}/${scoreboard.totalCuesDropped}`);
  console.log(`pending static/dynamic  ${scoreboard.totalPendingStatic}/${scoreboard.totalPendingDynamic}`);
  console.log(`procedural projectiles  ${scoreboard.proceduralCards}`);
  console.log(`\nROM_MIXED: static=${scoreboard.mixedByStatic} · noVisible=${scoreboard.mixedByNoVisible} · dynamic=${scoreboard.mixedByDynamic}`);

  console.log('\n── Familia (scene cues) ──');
  for (const family of ['STANDARD_DAMAGE', 'BEAM', 'STAGE', 'SUPPORT', 'DEFENSE', 'SPECIAL'] as SceneCueFamily[]) {
    const cues = cuesByFamily(family);
    const pending = cues.filter(c => c.consumed === 'PENDING').length;
    const bridge = cues.filter(c => c.consumed === 'BRIDGE').length;
    const trace = cues.filter(c => c.consumed === 'TRACE_ONLY').length;
    console.log(`  ${family.padEnd(16)} ${cues.length} cues · ${pending} PENDING · ${bridge} BRIDGE · ${trace} TRACE_ONLY`);
  }

  const outDir = join(process.cwd(), 'docs/rom/audit');
  mkdirSync(outDir, { recursive: true });
  const md = renderScoreboardMarkdown(scoreboard)
    + '\n\n## Matriz por carta (125)\n\n' + renderMatrixMarkdown(rows) + '\n';
  const csvHeader = 'id,name,type,handler,kind,evidenceStatic,evidenceDynamic,compiler,runtime,frames,ticks,scene,motion,camera,fxBg,cuesGen,cuesConsumed,cuesDropped,pendingStatic,pendingDynamic,state,reason';
  const csv = csvHeader + '\n' + rows.map(r => [
    r.id, `"${r.name}"`, r.type, r.handler, r.kind, r.evidenceStatic, r.evidenceDynamic,
    r.compiler, r.runtime, r.frames, r.ticks, r.scene, r.motion, r.camera, r.fxBg,
    r.cuesGen, r.cuesConsumed, r.cuesDropped, r.pendingStatic, r.pendingDynamic, r.state, `"${r.reason}"`,
  ].join(',')).join('\n') + '\n';

  writeFileSync(join(outDir, 'rom-runtime-consumption.md'), md);
  writeFileSync(join(outDir, 'rom-runtime-consumption.csv'), csv);

  console.log(`\nArtifacts → docs/rom/audit/rom-runtime-consumption.{md,csv}`);
  console.log(`\nRESULT: ${scoreboard.romFull === scoreboard.cardsTotal ? 'ROM_FULL_SWEEP' : 'GAP_REAL'}\n`);
}

main();
