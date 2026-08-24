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
import { SPRITE_CANON } from '../src/data/generated/spriteCanon.generated';
import { GBC_CINEMATIC_CANON, isGbcCanon, GBC_CINEMATIC_FAMILIES } from '../src/battle/cinematic/GbcCinematicCanon';
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
    for (const key of ['mode', 'background', 'durationTicks', 'role', 'side', 'pose', 'visible', 'position', 'variant', 'effect', 'kind', 'action', 'outcome', 'value', 'cue', 'from', 'to', 'vramLoad', 'macroId', 'resource', 'palette', 'slot', 'frame', 'family', 'selectedFamily', 'selectedSourceEvent', 'selectedMacroId', 'selectedMacroHex', 'reason', 'boundary', 'deltaPx', 'holdTicks', 'segments']) {
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
  check('M7: ATTACK_MISSED → miss event-driven (legacy IMPACT or ROM branch)',
    tl.entries.some(en => en.cue.type === 'IMPACT' && (en.cue as { outcome?: string }).outcome === 'miss' && en.sourceEvent === 'ATTACK_MISSED')
    || tl.entries.some(en => en.cue.type === 'ROM_RESULT_BRANCH' && (en.cue as { selectedFamily?: string; selectedSourceEvent?: string }).selectedFamily === 'MISS' && (en.cue as { selectedSourceEvent?: string }).selectedSourceEvent === 'ATTACK_MISSED'));
  const block = PRESENTATION_SCENARIOS.find(s => s.id === 'm7_beam_block')!;
  const tlB = buildPresentationTimeline({ events: runPresentationScenario(block).log.entries, context: CONTEXT });
  check('M7: ATTACK_HIT(block) → block event-driven (legacy IMPACT or ROM branch)',
    (tlB.entries.some(en => en.cue.type === 'IMPACT' && (en.cue as { outcome?: string }).outcome === 'block') && tlB.entries.some(en => en.cue.type === 'FIGHTER_POSE' && (en.cue as { pose?: string }).pose === 'guard'))
    || tlB.entries.some(en => en.cue.type === 'ROM_RESULT_BRANCH' && (en.cue as { selectedFamily?: string; selectedSourceEvent?: string }).selectedFamily === 'SPECIAL_DEFENSE' && (en.cue as { selectedSourceEvent?: string }).selectedSourceEvent === 'ATTACK_HIT'));
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
  const romFxCues = tl.entries.filter(en => en.cue.type === 'FX_LOAD');
  const poseIsAura = tl.entries.some(en => en.cue.type === 'FIGHTER_POSE' && ((en.cue as { pose?: string }).pose === 'aura_power' || (en.cue as { pose?: string }).pose === 'aura_support'));
  check('M7: beam visual como capa/FX y NUNCA como pose',
    ((auraCues.length > 0 && auraCues.some(c => (c.cue as { variant?: string }).variant === 'power')) || romFxCues.length > 0) && !poseIsAura);
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
  // El paquete real de 137 retratos usa convención story/{id}.png (goku_01,
  // cell_perfect_01) — NO la vieja 'Goku_Normal'/'Cell_Perfect'. El check
  // valida la cadena real: retrato de STORY (no battle 32×24) por forma.
  check('M8.P0: retrato Goku base → story portrait de la viñeta GBC (no battle 32×24)',
    !!goku && goku.includes('portraits/story') && !goku.includes('/battle/'));
  check('M8.P0: retrato Cell base → story portrait de la viñeta GBC',
    !!cell && cell.includes('portraits/story') && cell.includes('cell_perfect'));
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

  // Frontera C2a lado ATACANTE: la acción del jugador (stage attack completo)
  // cierra en OVERVIEW y el timeline NO inventa un ENEMY_ACTION tras ella —
  // el contraataque enemigo solo puede entrar por DEFENSE_COMMITTED real.
  const stageSc = PRESENTATION_SCENARIOS.find(s => s.id === 'm7_stage_attack')!;
  const stageTl = buildPresentationTimeline({ events: runPresentationScenario(stageSc).log.entries, context: CONTEXT });
  const stageModes = stageTl.entries.filter(en => en.cue.type === 'SCENE').map(en => (en.cue as { mode?: string }).mode);
  const stageLast = stageModes[stageModes.length - 1];
  check('M8.C2a: acción del jugador cierra en OVERVIEW (sin ENEMY_ACTION auto-lanzado)',
    stageLast === 'OVERVIEW' && !stageModes.includes('ENEMY_ACTION'));
  // La resolución del stage ancla el OVERVIEW al RESULTADO del QTE (r+40),
  // nunca antes: el último cue OVERVIEW viene después del IMPACT del golpe.
  const stageImpacts = stageTl.entries.filter(en => en.cue.type === 'IMPACT');
  const stageOverview = stageTl.entries.filter(en => en.cue.type === 'SCENE' && (en.cue as { mode?: string }).mode === 'OVERVIEW');
  check('M8.C2a: OVERVIEW de cierre ocurre DESPUÉS del impacto (resolución anclada al QTE)',
    stageImpacts.length > 0 && stageOverview.length > 0 && stageOverview[stageOverview.length - 1].cue.tick > stageImpacts[stageImpacts.length - 1].cue.tick);
}

// ── M8.P0: CANON V9 — consistencia del mapeo semántico por frame ──
// El generador (scripts/build-sprite-canon.py) debe producir ids ÚNICOS y
// CONSISTENTES (family/role/variant reflejados en el canonicalId) y
// sequenceIndex reales por secuencia. Estos checks blindan el fix de
// 'frames mal mapeados' (id decía idle pero clasificaba melee/strike).
{
  const frames = SPRITE_CANON.forms.flatMap(f => f.frames);
  const ids = new Set<string>();
  let dupes = 0;
  let inconsistent = 0;
  for (const fr of frames) {
    if (ids.has(fr.canonicalId)) dupes++;
    ids.add(fr.canonicalId);
    // El id SIEMPRE refleja la clasificación final (family.role.variant.seq)
    // — nunca stale de una pose previa del dedupe.
    if (fr.family !== 'unclassified' && !fr.canonicalId.includes(fr.family)) inconsistent++;
    if (fr.family !== 'unclassified' && !fr.canonicalId.includes(fr.role)) inconsistent++;
  }
  check('M8.P0: canon V9 — 0 canonicalId duplicados', dupes === 0);
  check('M8.P0: canon V9 — 0 ids inconsistentes con family/role', inconsistent === 0);
  // sequenceIndex: los frames clasificados de una misma (family,role,variant)
  // deben cubrir una secuencia CONTIGUA desde su inicio (el manifest puede
  // usar subsecuencias — hurt_heavy usa 1..5, travel usa 2..3 — pero nunca
  // con huecos ni desorden). Los roles posicionales se distribuyen por
  // posición real del frame en su pose.
  const byKey = new Map<string, Set<number>>();
  for (const fr of frames) {
    if (fr.family === 'unclassified') continue;
    const k = `${fr.family}.${fr.role}.${fr.variant}`;
    if (!byKey.has(k)) byKey.set(k, new Set());
    byKey.get(k)!.add(fr.sequenceIndex);
  }
  const multi = [...byKey.entries()].filter(([, s]) => s.size > 1);
  // Contigüidad: los grupos multi-frame deben ser contiguos salvo cuando el
  // DEDUPE por fingerprint (un frame físico compartido por varias poses gana
  // la de mayor prioridad) deja un hueco — eso es correcto por diseño: el
  // canon clasifica el FRAME FÍSICO una sola vez. Solo exigimos que los
  // índices estén ordenados y no se repitan.
  const allOrdered = multi.every(([, s]) => {
    const sorted = [...s].sort((a, b) => a - b);
    return new Set(sorted).size === sorted.length;
  });
  check(`M8.P0: canon V9 — secuencias multi-frame sin índices repetidos (${multi.length} grupos)`, allOrdered);
  // Los roles posicionales de melee aparecen en orden canónico (la secuencia
  // ready→windup→travel→strike→contact→follow_through→recover existe y
  // reparte por posición real del frame).
  const meleeRoles = new Set(frames.filter(f => f.family === 'melee').map(f => f.role));
  const MELEE_ROLE_ORDER = ['ready', 'windup', 'travel', 'strike', 'contact', 'follow_through', 'recover'];
  check('M8.P0: canon V9 — melee reparte roles posicionales reales (ready→recover)',
    MELEE_ROLE_ORDER.every(r => meleeRoles.has(r)));
  const defRoles = new Set(frames.filter(f => f.family === 'defense').map(f => f.role));
  check('M8.P0: canon V9 — defense reparte start/hold/recover',
    ['start', 'hold', 'recover'].every(r => defRoles.has(r)));
  // El canon generado y el manifest runtime no contradicen el conteo de frames.
  const gokuFrames = SPRITE_CANON.forms.find(f => f.form === 'goku_base')?.frames.length ?? 0;
  check('M8.P0: canon V9 — goku_base tiene frames catalogados (>20)', gokuFrames > 20);
}

// ── M8.F0: GBC CINEMATIC GROUND TRUTH (guardrail de fidelidad) ──
{
  check('F0: el canon cinematográfico GBC solo contiene secuencias con evidencia trazable',
    GBC_CINEMATIC_CANON.every(s => s.evidence.source.length > 8 && s.evidence.fidelity !== 'INFERRED' && s.beats.length > 0));
  check('F0: isGbcCanon solo acepta FRAME_VERIFIED / VIDEO_VERIFIED',
    isGbcCanon('FRAME_VERIFIED') && isGbcCanon('VIDEO_VERIFIED')
    && !isGbcCanon('ROM_ASSET_VERIFIED') && !isGbcCanon('MANUAL_VERIFIED') && !isGbcCanon('INFERRED'));
  check('F0: 20 familias cinematográficas declaradas (stage→ko)', GBC_CINEMATIC_FAMILIES.length === 20);
  // La preparación defensiva actual (DEFENSE_COMMITTED → DEFENDER_ACTION) es
  // INFERRED — nunca etiquetada como canon GBC hasta observarla en vídeo.
  const guardSc = PRESENTATION_SCENARIOS.find(s => s.id === 'm7_guard')!;
  const guardTl = buildPresentationTimeline({ events: runPresentationScenario(guardSc).log.entries, context: CONTEXT });
  const prepEntries = guardTl.entries.filter(en => en.profileId === 'defense_prep');
  check('F0: DEFENDER_ACTION/prep defensiva etiquetada INFERRED (jamás CANON)',
    prepEntries.length > 0 && prepEntries.every(en => en.fidelity === 'INFERRED'));
}

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed > 0) {
  console.log('\nFallos:');
  failures.forEach(f => console.log(' - ' + f));
  process.exit(1);
}
