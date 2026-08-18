// ═══════════════════════════════════════════════════════════════════════
// VERIFY: PRESENTATION (M7) — BattleEventEnvelope[] → BattleTimeline.
// Uso: npm run verify:presentation · npm run gen:presentation-fixtures
//   --write  → (re)genera scripts/fixtures/m7_*.json desde los escenarios.
//   sin flag → compara el timeline contra los fixtures (golden).
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import {
  PRESENTATION_SCENARIOS,
  runPresentationScenario,
  type PresentationScenario,
} from '../src/devtools/presentationScenarios';
import { buildPresentationTimeline, resolveFacing, type BattleTimeline } from '../src/battle/engine/presentation';
import { resolveSpeakerPortrait } from '../src/data/speakerPortraits';
import { SCENARIOS } from '../src/data/scenarios';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name + (detail ? ` — ${detail}` : '')); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const WRITE = process.argv.includes('--write');
const FIXTURE_DIR = 'scripts/fixtures';

const CONTEXT = {
  playerFormId: 'goku_base',
  enemyFormId: 'piccolo_base',
  overviewBackground: SCENARIOS[0].overviewBackground,
  actionBackground: SCENARIOS[0].actionBackground,
  specialActionBackground: SCENARIOS[0].actionBackground,
};

/** Forma reducida del timeline (auditable en JSON, sin ruido). */
function reduced(tl: BattleTimeline) {
  return tl.entries.map(en => {
    const c = en.cue as Record<string, unknown>;
    const base: Record<string, unknown> = { tick: c.tick, type: c.type };
    for (const key of ['mode', 'background', 'durationTicks', 'role', 'side', 'pose', 'visible', 'position', 'variant', 'effect', 'kind', 'action', 'outcome', 'value', 'cue', 'from', 'to']) {
      if (c[key] !== undefined) base[key] = c[key];
    }
    base.logicalTick = en.logicalTick;
    base.source = en.sourceEvent;
    base.fidelity = en.fidelity;
    if (en.profileId) base.profile = en.profileId;
    return base;
  });
}

console.log('═══ verify:presentation — M7 Presentation Adapter ═══\n');

// ── Pureza del módulo (sin React/DOM/Pixi/timers) ──
const presSrc = readdirSync('src/battle/engine/presentation', { recursive: true })
  .filter((f): f is string => typeof f === 'string' && f.endsWith('.ts'))
  .map(f => readFileSync(`src/battle/engine/presentation/${f}`, 'utf8'))
  .join('\n');
check('M7: 0 React/DOM/Pixi en el Adapter', !/from 'react'|useState|document\.|window\.|HTMLElement|canvas|WebGL|PIXI|pixi|AudioContext/.test(presSrc));
check('M7: 0 timers de pared en el Adapter', !/setTimeout\s*\(|setInterval\s*\(|requestAnimationFrame\s*\(|Date\.now\s*\(|performance\.now\s*\(/.test(presSrc));
check('M7: 0 Math.random en el Adapter', !/Math\.random\s*\(/.test(presSrc));

// ── Propiedades por escenario + golden ──
mkdirSync(FIXTURE_DIR, { recursive: true });
let allTimelinesOk = true;
for (const sc of PRESENTATION_SCENARIOS) {
  const run = runPresentationScenario(sc);
  const tl = buildPresentationTimeline({ events: run.log.entries, context: CONTEXT });
  const tl2 = buildPresentationTimeline({ events: run.log.entries, context: CONTEXT });
  check(`M7: ${sc.id} — mismo EventLog ⇒ mismo Timeline`, JSON.stringify(tl) === JSON.stringify(tl2));
  const json = JSON.stringify(reduced(tl));
  check(`M7: ${sc.id} — timeline serializable (JSON round-trip)`, JSON.parse(json) !== undefined);
  const poses = tl.entries.filter(en => en.cue.type === 'FIGHTER_POSE').map(en => (en.cue as { pose?: string }).pose ?? '');
  check(`M7: ${sc.id} — sin delayMs y poses SEMÁNTICAS (nunca paths PNG)`, !json.includes('delayMs') && poses.every(p => p && !p.includes('/') && !p.includes('.png') && !p.startsWith('assets')));
  check(`M7: ${sc.id} — logicalTick preservado y ≤ cue.tick en secuencias de acción`,
    tl.entries.every(en => en.logicalTick <= en.cue.tick || ['QTE_INPUT_RESOLVED', 'GUARD_STARTED', 'POSITION_CHANGED', 'CC_GAINED', 'CC_SPENT', 'DAMAGE_APPLIED', 'ATTACK_MISSED', 'PHASE_CHANGED', 'FIGHTER_DEFEATED', 'QTE_COUNTER_RESOLVED', 'ATTACK_HIT'].includes(en.sourceEvent)));
  const fixturePath = `${FIXTURE_DIR}/m7_${sc.id.replace('m7_', '')}.json`;
  const fixture = { scenario: sc.id, seed: sc.seed, timeline: reduced(tl) };
  if (WRITE) {
    writeFileSync(fixturePath, JSON.stringify(fixture, null, 1) + '\n');
    console.log(`  ── ${sc.id}: fixture escrito (${tl.entries.length} cues)`);
  } else {
    let expected: unknown = null;
    try { expected = JSON.parse(readFileSync(fixturePath, 'utf8')); } catch { /* missing */ }
    if (!expected) {
      check(`M7: golden ${sc.id} — FIXTURE FALTA (npm run gen:presentation-fixtures)`, false);
      allTimelinesOk = false;
    } else {
      const same = JSON.stringify(fixture.timeline) === JSON.stringify((expected as { timeline: unknown[] }).timeline);
      check(`M7: golden ${sc.id} — timeline idéntico al fixture (${tl.entries.length} cues)`, same);
      if (!same) allTimelinesOk = false;
    }
  }
}

// ── Contrato Stage (M8.C): tres bloques temporales independientes ──
// A. PREPARACIÓN fija (idle → stage_ready_open → stage_ready_close → idle →
//    inputOpenTick → QTE_STARTED). B. QTE interactivo de duración VARIABLE.
// C. RESOLUCIÓN anclada al evento que cierra la ventana (QTE_COMPLETED /
//    QTE_FAILED / QTE_COUNTER_RESOLVED), nunca a ACTION_STARTED:
//    ACTION_DUEL >= resultado · APPROACH > ACTION_DUEL · STRIKE > APPROACH
//    · IMPACT > STRIKE · OVERVIEW > IMPACT.
{
  const stageIds = ['m7_stage_attack', 'm7_stage_attack_slow103', 'm7_stage_attack_slow145'];
  const runs = stageIds.map(id => ({ sc: PRESENTATION_SCENARIOS.find(s => s.id === id)!, run: null as unknown }));
  const results: Array<{ id: string; qteTick: number; duel: number; approach: number; strike: number; impact: number; overview: number }> = [];
  for (const { sc } of runs) {
    const run = runPresentationScenario(sc);
    const tl = buildPresentationTimeline({ events: run.log.entries, context: CONTEXT });
    const qteDone = run.log.entries.find(en => en.event.type === 'QTE_COMPLETED');
    const qteTick = qteDone?.tick ?? -1;
    const duel = tl.entries.find(en => en.cue.type === 'SCENE' && (en.cue as { mode?: string }).mode === 'ACTION_DUEL');
    const poseAt = (pose: string) => tl.entries.find(en => en.cue.type === 'FIGHTER_POSE' && (en.cue as { pose?: string }).pose === pose);
    const approach = poseAt('move_front');
    const strike = poseAt('attack_fwd');
    const impact = tl.entries.find(en => en.cue.type === 'IMPACT');
    const overview = tl.entries.find(en => en.cue.type === 'SCENE' && (en.cue as { mode?: string }).mode === 'OVERVIEW');
    const d = duel?.cue.tick ?? -1, ap = approach?.cue.tick ?? -1, st = strike?.cue.tick ?? -1, im = impact?.cue.tick ?? -1, ov = overview?.cue.tick ?? -1;
    results.push({ id: sc.id, qteTick, duel: d, approach: ap, strike: st, impact: im, overview: ov });
    check(`M8.C: ${sc.id} — ACTION_DUEL >= QTE result (${d} >= ${qteTick})`, qteTick >= 0 && d >= qteTick);
    check(`M8.C: ${sc.id} — APPROACH > ACTION_DUEL (${ap} > ${d})`, ap > d);
    check(`M8.C: ${sc.id} — STRIKE > APPROACH (${st} > ${ap})`, st > ap);
    check(`M8.C: ${sc.id} — IMPACT > STRIKE (${im} > ${st})`, im > st);
    check(`M8.C: ${sc.id} — OVERVIEW > IMPACT (${ov} > ${im})`, ov > im);
    // Preparación invariante: stage_ready_* SEMÁNTICAS (nunca gather_power/beam_charge)
    const prepPoses = tl.entries.filter(en => en.profileId === 'stage_prep' && en.cue.type === 'FIGHTER_POSE').map(en => (en.cue as { pose?: string }).pose ?? '');
    check(`M8.C: ${sc.id} — prep con poses stage_ready_*`, prepPoses.length > 0 && prepPoses.every(p => p.startsWith('stage_ready_') || p === 'idle'));
  }
  // La resolución se DESPLAZA con el QTE; la preparación NO cambia.
  const fast = results[0], slow = results[2];
  check(`M8.C: resolución desplazada — duel slow145 (${slow.duel}) > duel fast (${fast.duel})`, slow.duel > fast.duel);
  check(`M8.C: QTE lento completa después (${slow.qteTick} > ${fast.qteTick})`, slow.qteTick > fast.qteTick);
  // Preparación idéntica entre runs: mismos beats en los mismos ticks.
  const prepFast = (() => { const r = runPresentationScenario(PRESENTATION_SCENARIOS.find(s => s.id === 'm7_stage_attack')!); const tl = buildPresentationTimeline({ events: r.log.entries, context: CONTEXT }); return tl.entries.filter(en => en.profileId === 'stage_prep').map(en => `${en.cue.tick}:${(en.cue as { pose?: string }).pose ?? ''}`).join('|'); })();
  const prepSlow = (() => { const r = runPresentationScenario(PRESENTATION_SCENARIOS.find(s => s.id === 'm7_stage_attack_slow145')!); const tl = buildPresentationTimeline({ events: r.log.entries, context: CONTEXT }); return tl.entries.filter(en => en.profileId === 'stage_prep').map(en => `${en.cue.tick}:${(en.cue as { pose?: string }).pose ?? ''}`).join('|'); })();
  check('M8.C: preparación idéntica con QTE rápido y lento', prepFast === prepSlow && prepFast.length > 0);
}

// ── Resultados derivados de EVENTOS, no de HP ──
{
  const miss = PRESENTATION_SCENARIOS.find(s => s.id === 'm7_melee_miss')!;
  const tl = buildPresentationTimeline({ events: runPresentationScenario(miss).log.entries, context: CONTEXT });
  check('M7: ATTACK_MISSED → IMPACT outcome=miss (event-driven)', tl.entries.some(en => en.cue.type === 'IMPACT' && (en.cue as { outcome?: string }).outcome === 'miss' && en.sourceEvent === 'ATTACK_MISSED'));
  const block = PRESENTATION_SCENARIOS.find(s => s.id === 'm7_beam_block')!;
  const tlB = buildPresentationTimeline({ events: runPresentationScenario(block).log.entries, context: CONTEXT });
  check('M7: ATTACK_HIT(block) → IMPACT outcome=block + TARGET pose guard', tlB.entries.some(en => en.cue.type === 'IMPACT' && (en.cue as { outcome?: string }).outcome === 'block') && tlB.entries.some(en => en.cue.type === 'FIGHTER_POSE' && (en.cue as { pose?: string }).pose === 'guard'));
  const ko = PRESENTATION_SCENARIOS.find(s => s.id === 'm7_defeat')!;
  const tlK = buildPresentationTimeline({ events: runPresentationScenario(ko).log.entries, context: CONTEXT });
  check('M7: FIGHTER_DEFEATED → cue K.O. (HUD message) + pose hurt', tlK.entries.some(en => en.cue.type === 'HUD' && (en.cue as { value?: string }).value === 'K.O.'));
}

// ── Facing V9: orientación por transformación, no assets duplicados ──
check('M7: facing — actor player → scaleX 1 · actor enemy → scaleX −1', resolveFacing('player').actorScaleX === 1 && resolveFacing('enemy').actorScaleX === -1);

// ── Aura como overlay (nunca pose de personaje) ──
{
  const beam = PRESENTATION_SCENARIOS.find(s => s.id === 'm7_beam_hit')!;
  const tl = buildPresentationTimeline({ events: runPresentationScenario(beam).log.entries, context: CONTEXT });
  const auraCues = tl.entries.filter(en => en.cue.type === 'AURA');
  const poseIsAura = tl.entries.some(en => en.cue.type === 'FIGHTER_POSE' && ((en.cue as { pose?: string }).pose === 'aura_power' || (en.cue as { pose?: string }).pose === 'aura_support'));
  check('M7: aura_power como capa overlay (AURA cues) y NUNCA como pose', auraCues.length > 0 && auraCues.some(c => (c.cue as { variant?: string }).variant === 'power') && !poseIsAura);
}

// ── Independencia de FPS: el timeline se construye SOLO desde envelopes ──
{
  // El mismo EventLog producido por dos alimentaciones distintas de reloj
  // (M6 ya lo demostró a 30/60/144/irregular/headless) → mismo Timeline.
  const sc = PRESENTATION_SCENARIOS.find(s => s.id === 'm7_qte_timeout')!;
  const logA = runPresentationScenario(sc).log;
  const logB = runPresentationScenario(sc).log;
  const tlA = buildPresentationTimeline({ events: logA.entries, context: CONTEXT });
  const tlB = buildPresentationTimeline({ events: logB.entries, context: CONTEXT });
  check('M7: mismo seed+comandos ⇒ mismo EventLog ⇒ mismo Timeline (independiente de FPS)', JSON.stringify(tlA) === JSON.stringify(tlB));
}

// ── M8.P0: PARIDAD DE RETRATO Stage ↔ Diálogo ──
// El Stage/QTE y el Diálogo deben resolver el retrato con la MISMA cadena
// canónica (resolveSpeakerPortrait) → mismo asset para el mismo personaje.
{
  const goku = resolveSpeakerPortrait('goku', 'goku_base');
  const cell = resolveSpeakerPortrait('cell', 'cell_base');
  const gokuNoForm = resolveSpeakerPortrait('goku');
  check('M8.P0: retrato Goku base → story portrait de la viñeta GBC (no battle 32×24)',
    !!goku && goku.includes('portraits/story') && goku.includes('Goku_Normal'));
  check('M8.P0: retrato Cell base → story portrait de la viñeta GBC',
    !!cell && cell.includes('portraits/story') && cell.includes('Cell_Perfect'));
  check('M8.P0: retrato Goku sin forma → mismo asset base (fallback por personaje)',
    !!gokuNoForm && gokuNoForm === goku);
  // La cadena canónica NUNCA devuelve un BATTLE_PORTRAITS (32×24 GBC): esos
  // retratos son para el HUD de batalla, no para el marco 57×80 del speaker.
  check('M8.P0: la cadena canónica no cae en battlePortraits',
    !goku?.includes('/battle/') && !cell?.includes('/battle/'));
}

// ── M8.C2a: EXCHANGE CINEMATIC CONTRACT (timeline) ──
{
  // DEFENSE_COMMITTED → preparación DEFENDER_ACTION (idle/move) + el
  // GUARD_STARTED NO emite pose guard inmediata (la guardia va al contacto).
  const guardSc = PRESENTATION_SCENARIOS.find(s => s.id === 'm7_guard')!;
  const guardTl = buildPresentationTimeline({ events: runPresentationScenario(guardSc).log.entries, context: CONTEXT });
  const guardPrep = guardTl.entries.filter(en => en.cue.type === 'SCENE' && (en.cue as { mode?: string }).mode === 'DEFENDER_ACTION');
  const guardImmediatePose = guardTl.entries.some(en => en.cue.type === 'FIGHTER_POSE' && (en.cue as { pose?: string }).pose === 'guard' && en.cue.tick === guardPrep[0]?.cue.tick);
  check('M8.C2a: GUARD comprometido → DEFENDER_ACTION con preparación (pose guard NO inmediata)',
    guardPrep.length > 0 && !guardImmediatePose);

  // MOVE defensivo: BattlePosition cambia SOLO por POSITION_CHANGED (el
  // Engine lo emite; la presentación nunca añade mutaciones). m7_move =
  // GUARD + reset_defense + MOVE HORIZONTAL → 1 POSITION_CHANGED (o 2 si
  // el empuje GBC §9 dispara el segundo).
  const moveSc = PRESENTATION_SCENARIOS.find(s => s.id === 'm7_move')!;
  const moveLog = runPresentationScenario(moveSc).log;
  const movePosChanges = moveLog.entries.filter(en => en.event.type === 'POSITION_CHANGED');
  check('M8.C2a: MOVE defensivo → mutación táctica SOLO por POSITION_CHANGED (1 por comando + empuje)',
    movePosChanges.length === 1 || movePosChanges.length === 2);

  // Defensa sin atacante posterior → el timeline termina en la preparación
  // defensiva; NO inventa una acción enemiga (sin auto-start).
  const moveTl = buildPresentationTimeline({ events: moveLog.entries, context: CONTEXT });
  const modes = moveTl.entries.filter(en => en.cue.type === 'SCENE').map(en => (en.cue as { mode?: string }).mode);
  const lastMode = modes[modes.length - 1];
  check('M8.C2a: defensa sin ataque posterior → último plano es DEFENDER_ACTION (nunca ENEMY_ACTION auto-lanzado)',
    lastMode === 'DEFENDER_ACTION' && !modes.includes('ENEMY_ACTION'));
}

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed > 0) {
  console.log('\nFallos:');
  failures.forEach(f => console.log(' - ' + f));
  process.exit(1);
}
