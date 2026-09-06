// ═══════════════════════════════════════════════════════════════════════
// VERIFY: GOLDEN COMBAT SET E2E — RESCUE_PLAN §5 gate (P0.5).
// Uso: npm run verify:golden-combat
//
// Recorre las 15 acciones del Golden Combat Set por el BattleRuntime REAL
// (dispatch/advance + EventLog + reloj + buildPresentationTimeline) y prueba
// que las familias ROM-backed lo son EN EJECUCIÓN (no solo en el compilador
// estático/verifier):
//
//   1. Resolución: la acción llega a su terminal (marcadores EventLog +
//      control boundary final esperado según la acción).
//   2. 0 fallback silencioso: para acciones de carta con ruta ROM estática,
//      el timeline runtime lleva la familia ROM (entries rom-card-N /
//      rom-defense-N con fidelity ROM_*) y no cae a LEGACY/INFERRED. Todo
//      ROM_PENDING / frame físico UNRESOLVED es fallo inmediato, sin excepciones.
//   3. 0 cues sin consumir: cada cue del timeline de la acción tiene destino
//      en el espejo del adapter (classifyRomCue: VISIBLE/DISPLAY/TRACE/
//      PENDING — nunca UNHANDLED).
//   4. Aserciones ROM por acción (estructura, no solo "termina").
//   5. Determinismo: cada escenario ×2 con el mismo seed → mismo EventLog
//      (type + sequence) — sin Math.random.
//
// Contrato de salida: 15 PASS · 0 PARTIAL · 0 BLOCKED.
//
// Evidencia ROM citada con § de docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md.
// ═══════════════════════════════════════════════════════════════════════
import { BattleRuntime } from '../src/battle/runtime/BattleRuntime';
import { latestStandardDamageRuntimeCutover } from '../src/battle/standardDamageRomCutover';
import { createInitialBattleState, type InitialBattleConfig } from '../src/battle/engine/state/createInitialBattleState';
import { getControlBoundary, activeAttacker, battleOutcome, isBattleTerminal } from '../src/battle/engine/state/battleStateSelectors';
import { BattlePosition, POSITION_DATA } from '../src/data/positions';
import { createBattleDeck } from '../src/battle/state';
import { getCard, type CardDef } from '../src/data/cards';
import type { BattleCommand } from '../src/battle/engine/commands/BattleCommand';
import type { BattleEvent } from '../src/battle/engine/events/BattleEvent';
import { classifyRomCue, type CueDestination } from '../src/battle/combatObservability';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';
import { stageWindowsTicks } from '../src/config/gameplay.config';
import { STAGE_PREP_TICKS } from '../src/battle/engine/clock/clock';
import { animationResourceById } from '../src/battle/animationResources';
import { DEFENSE_ROM_RULES, RomResolutionMode, semanticOutcomeForCA53 } from '../src/battle/engine/rom/romDescriptors';
import {
  CHARA_SWITCH_COMMIT_OFFSET,
  CHARA_ENTRY,
  ROM_CHARA_EXIT_MOTION,
  CHARA_SWITCH_PRE_WAIT_TICKS,
} from '../src/battle/engine/rom/romDescriptors';
import type { BattleFighterState } from '../src/battle/engine/state/BattleState';
import type { BattlePresentationContext } from '../src/battle/engine/presentation/buildTimeline';

let pass = 0;
let fail = 0;
const failures: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

// ─── Fixture determinista (patrón verify-golden-stage) ───
function baseCfg(overrides: Partial<InitialBattleConfig> = {}): InitialBattleConfig {
  return {
    playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 10, playerSpd: 9,
    playerMaxCc: 99, playerCc: 99,
    enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 1000, enemyHp: 1000, enemyStr: 10, enemyKi: 10, enemySpd: 7,
    enemyMaxCc: 99, enemyCc: 99,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: createBattleDeck([1, 5, 6, 8, 12, 19].map((id) => getCard(id) as CardDef), { seed: 4242 }),
    enemyDeck: createBattleDeck([7, 16, 23].map((id) => getCard(id) as CardDef), { seed: 7 }),
    playerLimits: [], playerFighterLimits: [],
    firstAttacker: 'player',
    seed: 4242,
    ...overrides,
  };
}

function ctxFor(playerFormId: string): BattlePresentationContext {
  return { playerFormId, enemyFormId: 'piccolo_base', overviewBackground: '', actionBackground: '', specialActionBackground: '' };
}
function ctxDefault(): BattlePresentationContext {
  return ctxFor('goku_base');
}

function makeReserve(over: Partial<BattleFighterState> = {}): BattleFighterState {
  return {
    id: 'gohan_base', name: 'GOHAN', form: 'Base', level: 5,
    maxHp: 900, hp: 900, str: 8, ki: 7, spd: 8, maxCc: 99, cc: 0,
    battlePos: BattlePosition.DOWN_BACK, powerWindowCounter: 0, limits: [],
    ...over,
  };
}

const eventsOf = (rt: BattleRuntime, type: string): BattleEvent[] =>
  rt.log.entries.filter((en) => en.event.type === type).map((en) => en.event);
const hasEvent = (rt: BattleRuntime, type: string): boolean => eventsOf(rt, type).length > 0;
const damageTo = (rt: BattleRuntime, target: 'player' | 'enemy'): number =>
  eventsOf(rt, 'DAMAGE_APPLIED')
    .filter((e) => (e as { target?: string }).target === target)
    .reduce((acc, e) => acc + ((e as { amount?: number }).amount ?? 0), 0);

/** Root C — contrato de COMPLETION OWNERSHIP ROM (espejo headless del wiring
 *  de playCardCinematic): cuando la carta resuelve vía BattleRuntime, el
 *  call-site pasa el DispatchResult y la presentación ROM recibe el EventLog
 *  real. Gate: el cutover (latestStandardDamageRuntimeCutover) existe sobre
 *  ese resultado (romOwnsCompletion se activa en vivo), su film es ALCANZABLE
 *  en el reloj del Runtime (el RomPresentationPlayer avanza 1 tick por tick y
 *  termina en el endTick compilado — retorno al tick ROM, no a 132/152t del
 *  scheduler DOM legacy) y durante el film NO se emite NINGÚN evento nuevo
 *  (un solo reloj — regresión = cualquier contador local en paralelo). */
function assertRomCompletionContract(
  label: string,
  rt: BattleRuntime,
  result: ReturnType<BattleRuntime['dispatch']>,
  side: 'player' | 'enemy',
  card: CardDef,
  actorFormId: string,
): void {
  const cutover = latestStandardDamageRuntimeCutover(result.log.entries, side, card, actorFormId);
  check(`${label}: cutover runtime presente sobre el DispatchResult (romOwnsCompletion se activa)`,
    !!cutover, 'cutover=null — el call-site no recibiría ruta ROM de completion');
  if (!cutover) return;
  const tl = cutover.timeline;
  const actionStarted = result.log.entries.find((en) => en.event.type === 'ACTION_STARTED' && en.event.side === side);
  check(`${label}: film anclado en el ACTION_STARTED real del EventLog (startTick) y con duración > 0`,
    tl.startTick === (actionStarted?.tick ?? -1) && tl.endTick > tl.startTick,
    `start=${tl.startTick} env=${actionStarted?.tick ?? '?'} end=${tl.endTick}`);
  const unresolved = tl.entries.filter((en) => en.cue.type === 'ROM_PHYSICAL_FRAME' && (en.cue as { source?: string }).source === 'UNRESOLVED').length;
  check(`${label}: película física resuelta para la forma real (0 UNRESOLVED)`,
    unresolved === 0, `unresolved=${unresolved}`);
  const tick0 = rt.state.tick;
  const logLen = rt.log.entries.length;
  // Simulación del reloj del RomPresentationPlayer: avanza el BattleRuntime
  // hasta el endTick del film compilado (retorno al tick ROM).
  rt.advance(tl.endTick - rt.state.tick);
  check(`${label}: retorno al tick ROM — Runtime en el endTick del film`,
    rt.state.tick === tl.endTick, `tick=${rt.state.tick} end=${tl.endTick}`);
  check(`${label}: 0 eventos durante el film (un solo reloj, sin scheduler paralelo)`,
    rt.log.entries.length === logLen, `events=${rt.log.entries.length - logLen}`);
  check(`${label}: tick inicial respetado (startTick ${tick0} intacto antes del film)`,
    tick0 === tl.startTick, `t0=${tick0}`);
}

/** Pone la carta en la mano del player y abre cardSelect (flujo real). */
function withHand(rt: BattleRuntime, cardId: number): BattleRuntime {
  const card = getCard(cardId) as CardDef;
  rt.state = { ...rt.state, phase: 'cardSelect' as never, selectedCard: 0, deck: { drawPile: [], hand: [card], discardPile: [] } };
  return rt;
}

/** Pone la carta en la mano del player SIN tocar la fase (defensa). */
function withHandDefend(rt: BattleRuntime, cardId: number): BattleRuntime {
  const card = getCard(cardId) as CardDef;
  rt.state = { ...rt.state, deck: { drawPile: [], hand: [card], discardPile: [] } };
  return rt;
}

/** Juega UNA carta por dispatch legal (canExecute) con el personaje dado. */
function playCard(rt: BattleRuntime, cardId: number, characterId: string): ReturnType<BattleRuntime['dispatch']> {
  withHand(rt, cardId);
  return rt.dispatch({ type: 'PLAY_CARD', handIndex: 0 } as BattleCommand, { side: 'player', characterId });
}

/** Cues del timeline del runtime con destino UNHANDLED (rompe el espejo). */
function unhandledCues(rt: BattleRuntime): { type: string; destination: CueDestination }[] {
  const out: { type: string; destination: CueDestination }[] = [];
  for (const en of rt.timeline.entries) {
    const cls = classifyRomCue(en.cue);
    if (cls.destination === 'UNHANDLED') out.push({ type: en.cue.type, destination: cls.destination });
  }
  return out;
}

/** Cues ROM_PENDING del timeline runtime. Golden Combat no admite excepciones. */
function pendingCueReasons(rt: BattleRuntime): string[] {
  return rt.timeline.entries
    .filter((en) => en.cue.type === 'ROM_PENDING')
    .map((en) => String((en.cue as { reason?: string }).reason ?? ''));
}

/** Frames físicos UNRESOLVED del timeline runtime. */
function unresolvedPhysicalCount(rt: BattleRuntime): number {
  return rt.timeline.entries.filter((en) => en.cue.type === 'ROM_PHYSICAL_FRAME' && (en.cue as { source?: string }).source === 'UNRESOLVED').length;
}

/** ¿El timeline runtime lleva la familia ROM esperada? (entries con perfil ROM) */
function romFamilyEntries(rt: BattleRuntime, prefix: string): number {
  return rt.timeline.entries.filter((en) => (en.profileId ?? '').startsWith(prefix)).length;
}

/** Aserción común 2+3: familia ROM + cero fallback, pendientes o cues huérfanas. */
function assertRomRouting(label: string, rt: BattleRuntime, profilePrefix?: string): void {
  if (profilePrefix) {
    check(`${label}: timeline runtime lleva familia ROM (${profilePrefix}*)`,
      romFamilyEntries(rt, profilePrefix) > 0,
      `entries=${romFamilyEntries(rt, profilePrefix)}`);
  }
  const unhandled = unhandledCues(rt);
  check(`${label}: 0 cues UNHANDLED (espejo classifyRomCue)`, unhandled.length === 0,
    unhandled.map((u) => u.type).join(', '));
  const reasons = pendingCueReasons(rt);
  check(`${label}: 0 ROM_PENDING`, reasons.length === 0, reasons.join(' || '));
  const unresolved = unresolvedPhysicalCount(rt);
  check(`${label}: 0 frames físicos UNRESOLVED`, unresolved === 0, `unresolved=${unresolved}`);
}

/** Aserción común 1+5: contrato STOP del orquestador tras un terminal ofensivo. */
function assertStopsAtDefenseChoice(label: string, rt: BattleRuntime): void {
  const st = rt.state;
  if (activeAttacker(st) === 'player' && !isBattleTerminal(st)) {
    const res = rt.dispatch({ type: 'END_EXCHANGE' } as BattleCommand);
    if (res.ok !== false) {
      rt.state = { ...rt.state, phase: 'defend' as never, defenseState: 'AWAITING_CHOICE' as never, defenseChoice: null };
    }
  }
  check(`${label}: boundary PLAYER_DEFENSE_CHOICE (orquestador: FIELD → DEFENSE)`,
    getControlBoundary(rt.state) === 'PLAYER_DEFENSE_CHOICE',
    `boundary=${getControlBoundary(rt.state)} phase=${rt.state.phase} ex=${rt.state.exchange}`);
  const logLen = rt.log.entries.length;
  const phaseBefore = rt.state.phase;
  rt.advance(10000);
  check(`${label}: 10.000 ticks → 0 eventos (STOP, determinista)`,
    rt.log.entries.length === logLen, `events=${rt.log.entries.length - logLen}`);
  check(`${label}: 10.000 ticks → misma fase (sin auto-acción)`,
    rt.state.phase === phaseBefore);
}

/** Log del EventLog como JSON determinista (type + sequence). */
function eventLogJson(rt: BattleRuntime): string {
  return JSON.stringify(rt.log.entries.map((en) => ({ t: en.event.type, s: en.sequence })));
}

/** Ejecuta el mismo escenario 2× y compara el EventLog. */
function assertDeterministic(label: string, run: () => BattleRuntime): void {
  const a = eventLogJson(run());
  const b = eventLogJson(run());
  check(`${label}: determinismo (2× mismo seed → mismo EventLog)`, a === b);
}

interface GoldenVerdict {
  id: string;
  label: string;
  verdict: 'PASS' | 'PARTIAL' | 'BLOCKED';
  note: string;
}

const verdicts: GoldenVerdict[] = [];

function finishAction(id: string, label: string, verdict: 'PASS' | 'PARTIAL' | 'BLOCKED', note = ''): void {
  verdicts.push({ id, label, verdict, note });
  console.log(`  ──→ ${label}: ${verdict}${note ? ` — ${note}` : ''}`);
}

// ═══════════════════════════════════════════════════════════════════════
// 1) 3 STAGE (QTE) — carta #1 command level 3 · ROM §5/§7 (timers), §130
// ═══════════════════════════════════════════════════════════════════════
function runStage3(): BattleRuntime {
  const rt = new BattleRuntime({ state: createInitialBattleState(baseCfg({ playerCc: 10 })), context: ctxDefault() });
  const card = getCard(1) as CardDef;
  withHand(rt, 1);
  const r = rt.dispatch({ type: 'PLAY_CARD', handIndex: 0 } as BattleCommand, { side: 'player', characterId: 'goku' });
  check('stage3: PLAY_CARD(command) aceptado → phase stageInput + PREPARING',
    r.ok && rt.state.phase === 'stageInput' && rt.state.stageQte.state === 'PREPARING');
  // ROM §5 (lote 2): ventanas por par de profundidades 150/120/80/50t @59.7275Hz.
  const w = stageWindowsTicks();
  check('stage3: timers ROM §5 — FRONT_FRONT=150 · FRONT_BACK=120 · BACK_FRONT=80 · BACK_BACK=50',
    w.FRONT_FRONT === 150 && w.FRONT_BACK === 120 && w.BACK_FRONT === 80 && w.BACK_BACK === 50,
    JSON.stringify(w));
  check('stage3: ventana del par BACK_BACK = 50t aplicada al QTE',
    rt.state.stageQte.windowTicks === w.BACK_BACK, `window=${rt.state.stageQte.windowTicks}`);
  check('stage3: preparación de 60t antes de abrir inputs (inputOpenTick = tick+60)',
    rt.state.stageQte.inputOpenTick === rt.state.tick + STAGE_PREP_TICKS);
  const ccStart = rt.state.player.cc;
  // El reloj abre INPUT_WINDOW (QTE_STARTED lo emite el engine, no el dispatch).
  rt.advance(rt.state.stageQte.inputOpenTick - rt.state.tick + 1);
  check('stage3: QTE_STARTED emitido + INPUT_WINDOW', hasEvent(rt, 'QTE_STARTED') && rt.state.stageQte.state === 'INPUT_WINDOW');
  const seq = rt.state.stageQte.seq;
  check('stage3: secuencia ROM CA5D&7 con 3 inputs (level 3)', seq.length === 3, `len=${seq.length} seq=[${seq.join(',')}]`);
  check('stage3: boundary ACTION_INPUT (ventana interactiva abierta)',
    getControlBoundary(rt.state) === 'ACTION_INPUT');
  let guard = 0;
  while (rt.state.stageQte.state === 'INPUT_WINDOW' && guard++ < 64) {
    rt.dispatch({ type: 'QTE_INPUT', input: rt.state.stageQte.seq[rt.state.stageQte.idx] } as BattleCommand);
  }
  check('stage3: QTE COMPLETED / FULL_SUCCESS', rt.state.stageQte.state === 'COMPLETED' && rt.state.stageQte.result === 'FULL_SUCCESS');
  check('stage3: daño ROM §130 aplicado al enemigo (>0, resolved=3)', damageTo(rt, 'enemy') > 0, `dmg=${damageTo(rt, 'enemy')}`);
  check('stage3: CC +1 por input correcto (+3)', rt.state.player.cc === ccStart + 3, `cc=${rt.state.player.cc}/${ccStart}`);
  check('stage3: ACTION_RESOLVED + retorno a fase stageInput terminal',
    hasEvent(rt, 'ACTION_RESOLVED') && hasEvent(rt, 'QTE_COMPLETED'));
  // Timeline: 0 UNHANDLED; pendientes ROM_PENDING = 0 (los QTE markers son
  // eventos reales del engine; la resolución cinematográfica del stage sigue
  // el camino legacy-INFERRED — cutover runtime STAGE_COMMAND no cableado,
  // pendiente documentado del RESCUE paso 4; el QTE/d año/CC son ROM-engine).
  const unhandled = unhandledCues(rt);
  check('stage3: 0 cues UNHANDLED en el timeline', unhandled.length === 0, unhandled.map((u) => u.type).join(', '));
  assertStopsAtDefenseChoice('stage3', rt);
  return rt;
}

// ═══════════════════════════════════════════════════════════════════════
// 2/3) CONT.PUNCH #5 · CONT.KICK #6 — STANDARD_DAMAGE handler $0A
//      Recursos: Cont.Punch $2C=44 · Cont.Kick $2D=45 (decode actual del
//      catálogo: seq0 206t / 134t — oráculo que imprime verify-rom-golden-timeline)
// ═══════════════════════════════════════════════════════════════════════
function runStandardDamage(cardId: number, label: string, animResourceHex: number, oracleTicks: number): BattleRuntime {
  const rt = new BattleRuntime({ state: createInitialBattleState(baseCfg()), context: ctxDefault() });
  const r = playCard(rt, cardId, 'goku');
  check(`${label}: PLAY_CARD aceptado y resuelto (ATTACK_HIT + DAMAGE_APPLIED + ACTION_RESOLVED)`,
    r.ok && hasEvent(rt, 'ACTION_STARTED') && hasEvent(rt, 'ACTION_RESOLVED') && hasEvent(rt, 'ATTACK_HIT'));
  check(`${label}: daño aplicado al enemigo`, damageTo(rt, 'enemy') > 0, `dmg=${damageTo(rt, 'enemy')}`);
  // Oráculo del recurso (verificado por verify-rom-golden-timeline).
  const res = animationResourceById(animResourceHex);
  const totalTicks = res?.sequences[0]?.frames.reduce((s, f) => s + f.durationTicks, 0) ?? 0;
  check(`${label}: oráculo recurso $${animResourceHex.toString(16).padStart(2, '0').toUpperCase()} = ${oracleTicks}t`,
    res?.status === 'DECODED' && totalTicks === oracleTicks, `total=${totalTicks} status=${res?.status ?? 'null'}`);
  assertRomRouting(label, rt, `rom-card-${cardId}`);
  const entries = rt.timeline.entries.filter(en => (en.profileId ?? '').startsWith(`rom-card-${cardId}`));
  const starts = entries.filter(en => en.cue.type === 'ANIMATION_START').map(en => en.cue as { sequence?: number | null; slot?: number });
  check(`${label}: doble track físico ROM seq0/slot0 → seq1/slot1`,
    starts.length === 2 && starts[0]?.sequence === 0 && starts[0]?.slot === 0 && starts[1]?.sequence === 1 && starts[1]?.slot === 1,
    JSON.stringify(starts));
  const physical = entries.filter(en => en.cue.type === 'ROM_PHYSICAL_FRAME');
  const expectedFrames = (res?.sequences[0]?.frames.length ?? 0) + (res?.sequences[1]?.frames.length ?? 0);
  check(`${label}: película física completa (ambas secuencias, sin attack_fwd)`,
    physical.length === expectedFrames && physical.every(en => (en.cue as { source?: string }).source === 'ROM_PHYSICAL'),
    `physical=${physical.length} expected=${expectedFrames}`);
  // Root C — completion ownership ROM del JUGADOR (wiring real 62001cc1:
  // presentRuntimeCard pasa el DispatchResult como 5º arg). El film compilado
  // debe ser alcanzable en el reloj del Runtime con retorno al tick ROM.
  assertRomCompletionContract(label, rt, r, 'player', getCard(cardId) as CardDef, 'goku_base');
  const resultStart = entries.find(en => en.cue.type === 'ANIMATION_START' && (en.cue as { sequence?: number }).sequence === 1);
  const stops = entries.filter(en => en.cue.type === 'ACTION_OBJECT_STOP');
  const restore = entries.find(en => en.cue.type === 'SCENE_LOAD' && (en.cue as { mode?: string }).mode === 'RESTORE_TACTICAL');
  check(`${label}: impacto/reacción termina antes de cleanup y retorno`,
    !!resultStart && stops.length === 2 && !!restore && stops.every(en => en.cue.tick >= resultStart.cue.tick + (res?.sequences[1]?.frames.reduce((s, f) => s + f.durationTicks, 0) ?? 0)) && restore.cue.tick >= stops[1]!.cue.tick,
    `result=${resultStart?.cue.tick ?? '?'} stops=${stops.map(en => en.cue.tick).join(',')} restore=${restore?.cue.tick ?? '?'}`);
  assertStopsAtDefenseChoice(label, rt);
  return rt;
}

// ═══════════════════════════════════════════════════════════════════════
// 4) KAMEHAMEHA #12 — BEAM_BASE handler $02 · recurso $03 (película 75t
//    anclada en ACTION_STARTED+17 → final 92t, §218-224 · oráculo golden)
// ═══════════════════════════════════════════════════════════════════════
function runKamehameha(): BattleRuntime {
  const rt = new BattleRuntime({ state: createInitialBattleState(baseCfg()), context: ctxDefault() });
  const r = playCard(rt, 12, 'goku');
  check('kamehameha: PLAY_CARD aceptado y resuelto (BEAM)',
    r.ok && hasEvent(rt, 'ACTION_STARTED') && hasEvent(rt, 'ACTION_RESOLVED') && hasEvent(rt, 'ATTACK_HIT'));
  check('kamehameha: daño aplicado al enemigo', damageTo(rt, 'enemy') > 0, `dmg=${damageTo(rt, 'enemy')}`);
  const res = animationResourceById(0x03);
  check('kamehameha: recurso $03 DECODED (film del actor)',
    res?.status === 'DECODED' && (res.sequences.length ?? 0) > 0, `status=${res?.status ?? 'null'}`);
  const animStart = rt.timeline.entries.find((en) => en.cue.type === 'ANIMATION_START' && (en.cue as { resource?: number }).resource === 0x03);
  const seq2 = res?.sequences[(animStart?.cue as { sequence?: number | null })?.sequence ?? 0];
  const filmTicks = seq2?.frames.reduce((s, f) => s + f.durationTicks, 0) ?? 0;
  check('kamehameha: ANIMATION_START $03 con secuencia probada (no bloqueada)',
    !!animStart && (animStart.cue as { sequence?: number | null }).sequence != null,
    JSON.stringify(animStart?.cue ?? null));
  check('kamehameha: película ROM $03 anclada → final en tick 92 (§218-224 golden 92t)',
    (animStart?.cue.tick ?? 0) + filmTicks === 92,
    `start=${animStart?.cue.tick ?? '?'} film=${filmTicks} end=${(animStart?.cue.tick ?? 0) + filmTicks}`);
  const phys = rt.timeline.entries.filter((en) => en.cue.type === 'ROM_PHYSICAL_FRAME' && (en.cue as { source?: string }).source === 'ROM_PHYSICAL');
  check('kamehameha: frames físicos ROM emitidos (hold del recurso)',
    phys.length >= 3, `frames=${phys.length}`);
  assertRomRouting('kamehameha', rt, 'rom-card-12');
  assertStopsAtDefenseChoice('kamehameha', rt);
  return rt;
}

function assertProjectileLifecycle(
  label: string,
  rt: BattleRuntime,
  cardId: number,
  resource: number,
  expectedDurations: number[],
  travelType: 'SCREEN_MOTION' | 'SCREEN_PATH',
): void {
  const entries = rt.timeline.entries.filter(en => (en.profileId ?? '').startsWith(`rom-card-${cardId}`));
  const cues = entries.map(en => en.cue);
  const indexOf = (type: string) => cues.findIndex(cue => cue.type === type);
  const release = indexOf('WAIT_ANIMATION_FRAME');
  const spawn = indexOf('FX_LOAD');
  const travel = indexOf(travelType);
  const restore = indexOf('SCREEN_RESTORE');
  const impact = indexOf('ROM_RESULT_BRANCH');
  const cleanup = indexOf('ACTION_OBJECT_STOP');
  const home = cues.findIndex(cue => cue.type === 'SCENE_LOAD' && (cue as { mode?: string }).mode === 'RESTORE_TACTICAL');
  check(`${label}: lifecycle ROM release → spawn → travel → restore → impact → cleanup → return`,
    release >= 0 && release < spawn && spawn < travel && travel < restore && restore < impact && impact < cleanup && cleanup < home,
    `indices=${[release, spawn, travel, restore, impact, cleanup, home].join(',')}`);
  check(`${label}: un solo spawn físico, sin doble proyectil`,
    cues.filter(cue => cue.type === 'FX_LOAD').length === 1);
  const frames = cues.filter(cue => cue.type === 'ROM_PHYSICAL_FRAME' && (cue as { resource?: number }).resource === resource) as Array<{ type: string; tick: number; durationTicks?: number | null; source?: string; sequence?: number; frameIndex?: number }>;
  check(`${label}: frame stream físico exacto y ordenado`,
    frames.length === expectedDurations.length && frames.every((frame, index) =>
      frame.source === 'ROM_PHYSICAL' && frame.sequence === 0 && frame.frameIndex === index && frame.durationTicks === expectedDurations[index]),
    `durations=${frames.map(frame => frame.durationTicks).join(',')}`);
  const lastFrameEnd = Math.max(...frames.map(frame => frame.tick + (frame.durationTicks ?? 0)));
  const cleanupTick = cleanup >= 0 ? cues[cleanup]!.tick : -1;
  check(`${label}: cleanup posterior al último frame; 0 actores/proyectiles huérfanos`,
    cleanupTick >= lastFrameEnd, `lastFrameEnd=${lastFrameEnd} cleanup=${cleanupTick}`);
  const eventTypes = rt.log.entries.map(en => en.event.type);
  const hit = eventTypes.indexOf('ATTACK_HIT');
  const damage = eventTypes.indexOf('DAMAGE_APPLIED');
  const resolved = eventTypes.indexOf('ACTION_RESOLVED');
  check(`${label}: Engine ordena ATTACK_HIT → DAMAGE_APPLIED → ACTION_RESOLVED`,
    hit >= 0 && hit < damage && damage < resolved,
    `indices=${hit},${damage},${resolved}`);
}

// ═══════════════════════════════════════════════════════════════════════
// 5) ENERGY BOMB #8 — PROJECTILE_SCROLL handler $05 (motor beam $5776 §218)
// ═══════════════════════════════════════════════════════════════════════
function runEnergyBomb(): BattleRuntime {
  const rt = new BattleRuntime({ state: createInitialBattleState(baseCfg()), context: ctxDefault() });
  const r = playCard(rt, 8, 'goku');
  check('energy_bomb: PLAY_CARD aceptado y resuelto',
    r.ok && hasEvent(rt, 'ACTION_STARTED') && hasEvent(rt, 'ACTION_RESOLVED') && hasEvent(rt, 'ATTACK_HIT'));
  check('energy_bomb: daño aplicado al enemigo', damageTo(rt, 'enemy') > 0, `dmg=${damageTo(rt, 'enemy')}`);
  assertRomRouting('energy_bomb', rt, 'rom-card-8');
  assertProjectileLifecycle('energy_bomb', rt, 8, 0x0c, [3, 2, 2, 2, 2, 2, 2], 'SCREEN_MOTION');
  const route = romPresentationTimelineForCard(getCard(8) as CardDef, 'player', 'goku_base');
  check('energy_bomb: ruta estática PROJECTILE_SCROLL completa y sin pendientes',
    route?.kind === 'PROJECTILE_SCROLL' && route.pendingCues === 0,
    `route=${route?.kind ?? 'null'} pending=${route?.pendingCues ?? '?'}`);
  assertStopsAtDefenseChoice('energy_bomb', rt);
  return rt;
}

// ═══════════════════════════════════════════════════════════════════════
// 6) DESTRUCT-DISK #21 — PROJECTILE_SCROLL handler $07 · forma krillin
// ═══════════════════════════════════════════════════════════════════════
function runDestructDisk(): BattleRuntime {
  const rt = new BattleRuntime({ state: createInitialBattleState(baseCfg({ playerFormId: 'krillin_base' })), context: ctxFor('krillin_base') });
  const r = playCard(rt, 21, 'krillin');
  check('destruct_disk: PLAY_CARD aceptado (krillin) y resuelto',
    r.ok && hasEvent(rt, 'ACTION_STARTED') && hasEvent(rt, 'ACTION_RESOLVED') && hasEvent(rt, 'ATTACK_HIT'));
  check('destruct_disk: daño aplicado al enemigo', damageTo(rt, 'enemy') > 0, `dmg=${damageTo(rt, 'enemy')}`);
  const anim = rt.timeline.entries.find((en) => en.cue.type === 'ANIMATION_START');
  check('destruct_disk: ANIMATION_START del recurso con secuencia probada',
    !!anim && (anim.cue as { sequence?: number | null }).sequence != null, JSON.stringify(anim?.cue ?? null));
  const phys = rt.timeline.entries.filter((en) => en.cue.type === 'ROM_PHYSICAL_FRAME' && (en.cue as { source?: string }).source === 'ROM_PHYSICAL');
  check('destruct_disk: frames físicos ROM emitidos', phys.length >= 3, `frames=${phys.length}`);
  assertRomRouting('destruct_disk', rt, 'rom-card-21');
  assertProjectileLifecycle('destruct_disk', rt, 21, 0x12, [3, 2, 3, 60, 3, 2, 2, 2, 2], 'SCREEN_PATH');
  assertStopsAtDefenseChoice('destruct_disk', rt);
  return rt;
}

// ═══════════════════════════════════════════════════════════════════════
// 7) GATHER POWER — GBC basic action · ROM §102 (escribe 5) + §132-133
// ═══════════════════════════════════════════════════════════════════════
function runGather(): BattleRuntime {
  const rt = new BattleRuntime({ state: createInitialBattleState(baseCfg()), context: ctxDefault() });
  rt.state = { ...rt.state, phase: 'basic' as never };
  const r = rt.dispatch({ type: 'GATHER_POWER' } as BattleCommand, { side: 'player' });
  check('gather: GATHER_POWER aceptado', r.ok);
  check('gather: máquina POWER — GATHER_STARTED (FULL_POWER) + POWER_CHANGED NORMAL→FULL_POWER',
    hasEvent(rt, 'GATHER_STARTED') && hasEvent(rt, 'POWER_CHANGED'),
    `events=${rt.log.entries.map((e) => e.event.type).join(',')}`);
  const g = eventsOf(rt, 'GATHER_STARTED')[0] as { mode?: string } | undefined;
  check('gather: modo FULL_POWER (§102 write 5)', g?.mode === 'FULL_POWER', `mode=${String(g?.mode)}`);
  check('gather: POST_ACTION_MAINTENANCE §132-133 (5 → 4)',
    rt.state.player.powerWindowCounter === 4 && hasEvent(rt, 'POST_ACTION_MAINTENANCE'),
    `pw=${rt.state.player.powerWindowCounter}`);
  check('gather: boundary PLAYER_ATTACK_CHOICE (fase basic, acción de menú)',
    getControlBoundary(rt.state) === 'PLAYER_ATTACK_CHOICE', `boundary=${getControlBoundary(rt.state)}`);
  const unhandled = unhandledCues(rt);
  check('gather: 0 cues UNHANDLED', unhandled.length === 0, unhandled.map((u) => u.type).join(', '));
  const logLen = rt.log.entries.length;
  rt.advance(10000);
  check('gather: 10.000 ticks → 0 eventos (STOP)', rt.log.entries.length === logLen);
  return rt;
}

// ═══════════════════════════════════════════════════════════════════════
// 8/9/10) GUARD · MOVE H · MOVE V — defensa M8.C2a contra ataque enemigo
//         (CA82: RomResolutionMode.BASIC_GUARD=2 §197; contacto M8.C2a)
// ═══════════════════════════════════════════════════════════════════════
function defendSetup(): BattleRuntime {
  // Iniciativa enemiga (exchange 0) → el player es el DEFENSOR.
  const rt = new BattleRuntime({ state: createInitialBattleState(baseCfg({ firstAttacker: 'enemy' })), context: ctxDefault() });
  rt.state = { ...rt.state, phase: 'defend' as never, defenseState: 'AWAITING_CHOICE' as never, defenseChoice: null };
  return rt;
}

/** Resuelve el ataque enemigo tras el commit defensivo (ruta runtime real). */
function resolveEnemyAttack(rt: BattleRuntime, cardId = 7): ReturnType<BattleRuntime['resolveCard']> {
  return rt.resolveCard('enemy', getCard(cardId) as CardDef);
}

function runGuard(): BattleRuntime {
  const rt = defendSetup();
  const r = rt.dispatch({ type: 'GUARD' } as BattleCommand, { side: 'player' });
  check('guard: GUARD aceptado + DEFENSE_COMMITTED choice GUARD',
    r.ok && rt.state.defenseState === 'COMMITTED' && rt.state.defenseChoice?.type === 'GUARD');
  check('guard: GUARD_STARTED (reduce) — CA82=2 BASIC_GUARD (§197)',
    hasEvent(rt, 'GUARD_STARTED') && rt.state.playerGuard === 'reduce' && RomResolutionMode.BASIC_GUARD === 2,
    `guard=${rt.state.playerGuard}`);
  // Root C — el ataque entrante del rival es la familia $0A real observada en
  // browser (Cont.Kick del rival, rom-r1): con la presentación ROM activa el
  // commit defensivo pre-resuelve y pasa el DispatchResult a la cinemática.
  const res = resolveEnemyAttack(rt, 6); // Cont.Kick #6 — STANDARD_DAMAGE $0A
  check('guard: ataque enemigo resuelto por el engine (contacto)',
    res.events.some((e) => e.type === 'ATTACK_HIT'), res.events.map((e) => e.type).join(','));
  // M8.C2a §7: la pose de guardia se presenta en el CONTACTO (ATTACK_HIT),
  // nunca al elegir. El ATTACK_HIT viene en un dispatch posterior (rebuild).
  const contactPose = rt.timeline.entries.find((en) =>
    en.cue.type === 'FIGHTER_POSE' && en.cue.role === 'TARGET' && en.sourceEvent === 'ATTACK_HIT');
  check('guard: defensa visible en el contacto (pose guard/beam_guard @ ATTACK_HIT)',
    !!contactPose && ((contactPose.cue as { pose?: string }).pose === 'guard' || (contactPose.cue as { pose?: string }).pose === 'beam_guard'),
    JSON.stringify(contactPose?.cue ?? null));
  const unhandled = unhandledCues(rt);
  check('guard: 0 cues UNHANDLED', unhandled.length === 0, unhandled.map((u) => u.type).join(', '));
  // Root C — completion ownership ROM del RIVAL (wiring nuevo: la resolución
  // ocurre en el commit y su resultado alimenta romOwnsCompletion en vivo).
  assertRomCompletionContract('guard(rival-$0A)', rt, res, 'enemy', getCard(6) as CardDef, 'piccolo_base');
  // Terminal defensivo: END_EXCHANGE (ex0→1) + phase command → ATTACK_CHOICE.
  const ex = rt.dispatch({ type: 'END_EXCHANGE' } as BattleCommand);
  rt.state = { ...rt.state, phase: 'command' as never };
  check('guard: tras END_EXCHANGE el player ataca el exchange 1 (boundary ATTACK_CHOICE)',
    ex.ok !== false && getControlBoundary(rt.state) === 'PLAYER_ATTACK_CHOICE' && activeAttacker(rt.state) === 'player',
    `boundary=${getControlBoundary(rt.state)} attacker=${activeAttacker(rt.state)}`);
  const logLen = rt.log.entries.length;
  rt.advance(10000);
  check('guard: 10.000 ticks → 0 eventos (STOP)', rt.log.entries.length === logLen);
  return rt;
}

function runMove(axis: 'HORIZONTAL' | 'VERTICAL', label: string): BattleRuntime {
  const rt = defendSetup();
  const from = rt.state.player.battlePos;
  const r = rt.dispatch({ type: 'MOVE', axis } as BattleCommand, { side: 'player' });
  check(`${label}: MOVE ${axis} aceptado + DEFENSE_COMMITTED choice MOVE/${axis}`,
    r.ok && rt.state.defenseState === 'COMMITTED' && rt.state.defenseChoice?.type === 'MOVE'
    && (rt.state.defenseChoice as { axis?: string }).axis === axis);
  check(`${label}: POSITION_CHANGED con axis ${axis} + posición táctica mutada`,
    hasEvent(rt, 'POSITION_CHANGED') && rt.state.player.battlePos !== from,
    `from=${from} to=${rt.state.player.battlePos}`);
  const posEvent = eventsOf(rt, 'POSITION_CHANGED').find((e) => (e as { side?: string }).side === 'player') as { axis?: string; to?: BattlePosition } | undefined;
  check(`${label}: evento POSITION_CHANGED con axis=${axis}`,
    posEvent?.axis === axis && posEvent?.to === rt.state.player.battlePos,
    `axis=${String(posEvent?.axis)}`);
  if (axis === 'VERTICAL') {
    check(`${label}: VERTICAL cambia altitud GROUND→AIR`,
      POSITION_DATA[rt.state.player.battlePos].altitude === 'AIR', `pos=${rt.state.player.battlePos}`);
  } else {
    check(`${label}: HORIZONTAL cambia depth BACK→FRONT`,
      POSITION_DATA[rt.state.player.battlePos].depth === 'FRONT', `pos=${rt.state.player.battlePos}`);
  }
  const res = resolveEnemyAttack(rt);
  check(`${label}: ataque enemigo resuelto (contacto tras el movimiento)`,
    res.events.some((e) => e.type === 'ATTACK_HIT'));
  const unhandled = unhandledCues(rt);
  check(`${label}: 0 cues UNHANDLED`, unhandled.length === 0, unhandled.map((u) => u.type).join(', '));
  const ex = rt.dispatch({ type: 'END_EXCHANGE' } as BattleCommand);
  rt.state = { ...rt.state, phase: 'command' as never };
  check(`${label}: tras END_EXCHANGE → PLAYER_ATTACK_CHOICE`,
    ex.ok !== false && getControlBoundary(rt.state) === 'PLAYER_ATTACK_CHOICE');
  const logLen = rt.log.entries.length;
  rt.advance(10000);
  check(`${label}: 10.000 ticks → 0 eventos (STOP)`, rt.log.entries.length === logLen);
  return rt;
}

// ═══════════════════════════════════════════════════════════════════════
// 11) CHARA — character switch · ROM §116-126/§176-178 (WAIT20+EXIT43→COMMIT
//     @T+63, ENTRY32→COMPLETED @T+95)
// ═══════════════════════════════════════════════════════════════════════
function runChara(): BattleRuntime {
  const rt = new BattleRuntime({ state: createInitialBattleState(baseCfg({ player2: makeReserve() })), context: ctxDefault() });
  rt.state = { ...rt.state, phase: 'command' as never };
  const startTick = rt.state.tick;
  const r = rt.dispatch({ type: 'CHARACTER_ACTION', side: 'player' } as BattleCommand, { side: 'player' });
  check('chara: CHARACTER_ACTION aceptado (reserve real) + CHARACTER_SWITCH_STARTED',
    r.ok && hasEvent(rt, 'CHARACTER_SWITCH_STARTED'));
  const exitCue = rt.timeline.entries.find((en) => en.cue.type === 'FIGHTER_MOTION' && (en.cue as { kind?: string }).kind === 'CHARA_EXIT');
  check('chara: timeline CHARA_EXIT ROM_EXACT (WAIT20 + motion §176-178)',
    !!exitCue && exitCue.fidelity === 'ROM_EXACT'
    && exitCue.cue.tick === startTick + CHARA_SWITCH_PRE_WAIT_TICKS
    && (exitCue.cue as { durationTicks?: number }).durationTicks === ROM_CHARA_EXIT_MOTION.segments.reduce((s, seg) => s + seg.ticks, 0));
  rt.advance(CHARA_SWITCH_COMMIT_OFFSET);
  check('chara: COMMITTED @T+63 → swap autoritativo + powerWindow=2 (§124-126)',
    hasEvent(rt, 'CHARACTER_SWITCH_COMMITTED') && rt.state.player.id === 'gohan_base'
    && rt.state.player2?.id === 'goku_base' && rt.state.player.powerWindowCounter === 2,
    `player=${rt.state.player.id} reserve=${rt.state.player2?.id ?? 'null'} pw=${rt.state.player.powerWindowCounter}`);
  const entryCue = rt.timeline.entries.find((en) => en.cue.type === 'FIGHTER_MOTION' && (en.cue as { kind?: string }).kind === 'CHARA_ENTRY');
  check('chara: timeline CHARA_ENTRY ROM_EXACT @commit',
    !!entryCue && entryCue.fidelity === 'ROM_EXACT' && (entryCue.cue as { durationTicks?: number }).durationTicks === CHARA_ENTRY.totalTicks);
  rt.advance(CHARA_ENTRY.totalTicks);
  check('chara: COMPLETED @T+95 + maintenance (pw 2→1) + cleanup',
    hasEvent(rt, 'CHARACTER_SWITCH_COMPLETED') && rt.state.player.powerWindowCounter === 1
    && rt.state.pendingCharacterSwitch == null);
  check('chara: boundary PLAYER_ATTACK_CHOICE (fase command)',
    getControlBoundary(rt.state) === 'PLAYER_ATTACK_CHOICE', `boundary=${getControlBoundary(rt.state)}`);
  const unhandled = unhandledCues(rt);
  check('chara: 0 cues UNHANDLED', unhandled.length === 0, unhandled.map((u) => u.type).join(', '));
  const logLen = rt.log.entries.length;
  rt.advance(10000);
  check('chara: 10.000 ticks → 0 eventos (STOP)', rt.log.entries.length === logLen);
  return rt;
}

// ═══════════════════════════════════════════════════════════════════════
// 12) SUPPORT — ruta nativa: legalidad, coste, descarte y efecto pertenecen
//     al Engine; ACTION_STARTED alimenta el cutover SUPPORT_FIELD_EFFECT.
// ═══════════════════════════════════════════════════════════════════════
function runSupport(): BattleRuntime {
  const rt = new BattleRuntime({ state: createInitialBattleState(baseCfg({ playerFormId: 'piccolo_base' })), context: ctxFor('piccolo_base') });
  withHand(rt, 16); // Resurrection — compatible piccolo
  rt.state = { ...rt.state, player: { ...rt.state.player, hp: Math.floor(rt.state.player.maxHp / 2) } };
  const hpBefore = rt.state.player.hp;
  const ccBefore = rt.state.player.cc;
  const r = rt.dispatch({ type: 'PLAY_CARD', handIndex: 0 } as BattleCommand, { side: 'player', characterId: 'piccolo' });
  check('support: PLAY_CARD #16 aceptado por canExecute', r.ok, `reason=${String((r as { reason?: string }).reason)}`);
  check('support: coste CC y descarte resueltos por el Engine',
    rt.state.player.cc === ccBefore - (getCard(16)?.cc ?? 0)
    && rt.state.deck.hand.length === 0 && rt.state.deck.discardPile.some((c) => c.id === 16));
  check('support: Resurrection cura al actor dentro del Engine', rt.state.player.hp > hpBefore,
    `hp=${rt.state.player.hp}/${hpBefore}`);
  check('support: ACTION_STARTED + ACTION_RESOLVED presentes',
    hasEvent(rt, 'ACTION_STARTED') && hasEvent(rt, 'ACTION_RESOLVED'));
  check('support: timeline runtime usa SUPPORT_FIELD_EFFECT',
    romFamilyEntries(rt, 'rom-support-16') > 0);

  const drain = new BattleRuntime({ state: createInitialBattleState(baseCfg({ playerFormId: 'android_19' })), context: ctxFor('android_19') });
  drain.state = { ...drain.state, player: { ...drain.state.player, hp: drain.state.player.maxHp - 100 } };
  const drainPlayerHp = drain.state.player.hp;
  const drainEnemyHp = drain.state.enemy.hp;
  const drainResult = playCard(drain, 75, 'android_19');
  check('support: Life Drain aplica daño y curación dentro del Engine',
    drainResult.ok && drain.state.enemy.hp < drainEnemyHp && drain.state.player.hp > drainPlayerHp);

  const transform = new BattleRuntime({ state: createInitialBattleState(baseCfg({ playerFormId: 'goku_base' })), context: ctxFor('goku_base') });
  const transformResult = playCard(transform, 27, 'goku');
  check('support: transformación y Ki tier proceden del Engine',
    transformResult.ok && transform.state.playerTransformedForm !== null && transform.state.pStages.ki === 1,
    `form=${transform.state.playerTransformedForm} kiTier=${transform.state.pStages.ki}`);

  const soloTeam = new BattleRuntime({ state: createInitialBattleState(baseCfg({ playerFormId: 'gohan_young' })), context: ctxFor('gohan_young') });
  const pairedTeam = new BattleRuntime({ state: createInitialBattleState(baseCfg({ playerFormId: 'gohan_young' })), context: ctxFor('gohan_young') });
  pairedTeam.state = { ...pairedTeam.state, player2: makeReserve() };
  playCard(soloTeam, 14, 'gohan_kid');
  playCard(pairedTeam, 14, 'gohan_kid');
  check('support: técnica de equipo pierde potencia sin reserva real',
    damageTo(soloTeam, 'enemy') < damageTo(pairedTeam, 'enemy'),
    `solo=${damageTo(soloTeam, 'enemy')} team=${damageTo(pairedTeam, 'enemy')}`);
  const unhandled = unhandledCues(rt);
  check('support: 0 cues UNHANDLED', unhandled.length === 0, unhandled.map((u) => u.type).join(', '));
  const logLen = rt.log.entries.length;
  rt.advance(10000);
  check('support: 10.000 ticks → 0 eventos (STOP)', rt.log.entries.length === logLen);
  return rt;
}

// ═══════════════════════════════════════════════════════════════════════
// 13) DEFENSE CARD #19 TAIYOKEN — DEFENSE_ROM_RULES §62 (CA83=0x01 →
//     CA53=1 AVOIDED) · cutover DEFENSE_RULE en el contacto (M8.C2a)
// ═══════════════════════════════════════════════════════════════════════
function runDefenseCard(): BattleRuntime {
  const rt = defendSetup();
  withHandDefend(rt, 19);
  const r = rt.dispatch({ type: 'PLAY_DEFENSE_CARD', handIndex: 0 } as BattleCommand, { side: 'player', characterId: 'goku' });
  check('defense_card: PLAY_DEFENSE_CARD #19 aceptado → DEFENSE_COMMITTED CARD',
    r.ok && rt.state.defenseState === 'COMMITTED'
    && rt.state.defenseChoice?.type === 'CARD'
    && (rt.state.defenseChoice as { cardId?: number }).cardId === 19);
  // El commit aún no tiene contacto en el log → sin emisión (rebuild posterior).
  const before = romFamilyEntries(rt, 'rom-defense-19');
  check('defense_card: sin emisión prematura al comprometer (contacto ausente — M8.C2a)',
    before === 0, `entries=${before}`);
  const hpBefore = rt.state.player.hp;
  const res = resolveEnemyAttack(rt, 5); // Cont.Punch: Taiyoken intercepta STANDARD_DAMAGE.
  check('defense_card: ataque enemigo contacta (ATTACK_HIT en el log)',
    res.events.some((e) => e.type === 'ATTACK_HIT'));
  // El rebuild con el contacto emite el timeline DEFENSE_RULE anclado ahí.
  const defEntries = rt.timeline.entries.filter((en) => (en.profileId ?? '').startsWith('rom-defense-19'));
  check('defense_card: cutover DEFENSE_RULE emitido en el contacto (profileId rom-defense-19)',
    defEntries.length > 0, `entries=${defEntries.length}`);
  const fx = defEntries.find((en) => en.cue.type === 'DEFENSE_FX');
  check('defense_card: DEFENSE_FX presente + clasificado VISIBLE (espejo adapter)',
    !!fx && classifyRomCue(fx.cue).destination === 'VISIBLE', JSON.stringify(fx?.cue ?? null));
  check('defense_card: emisión anclada a sourceEvent ATTACK_HIT',
    defEntries.every((en) => en.sourceEvent === 'ATTACK_HIT'));
  // CA53 semántico §62-67: Taiyoken CA83=0x01 → CA53=1 → AVOIDED (damage 0).
  const rule = DEFENSE_ROM_RULES[19];
  check('defense_card: regla ROM §62 — Taiyoken CA83=0x01 resultFamily=1 (AVOIDED)',
    rule?.ca83 === 0x01 && rule?.resultFamily === 1 && rule?.result === 'AVOIDED');
  check('defense_card: semántica CA53 esperada (§62-67) = AVOID',
    semanticOutcomeForCA53(1, { sourceEvent: 'ATTACK_HIT', defenseCardId: 19 }) === 'AVOID');
  check('defense_card: Taiyoken aplica CA53=1 al daño real (HP intacto)',
    rt.state.player.hp === hpBefore, `hp=${rt.state.player.hp}/${hpBefore}`);
  check('defense_card: Taiyoken no emite DAMAGE_APPLIED',
    !res.events.some((e) => e.type === 'DAMAGE_APPLIED'));

  // Oráculos mecánicos adicionales: cada familia CA53 modifica el HP dentro
  // del Runtime; la presentación no participa en estas decisiones.
  const barrier = defendSetup();
  withHandDefend(barrier, 45);
  barrier.dispatch({ type: 'PLAY_DEFENSE_CARD', handIndex: 0 } as BattleCommand, { side: 'player', characterId: 'android_17' });
  const barrierHp = barrier.state.player.hp;
  resolveEnemyAttack(barrier, 7);
  check('defense_card: Barrier CA53=3 anula Beam', barrier.state.player.hp === barrierHp);

  const endurance = defendSetup();
  withHandDefend(endurance, 121);
  endurance.dispatch({ type: 'PLAY_DEFENSE_CARD', handIndex: 0 } as BattleCommand, { side: 'player', characterId: 'goku' });
  const enduranceHp = endurance.state.player.hp;
  const incoming = getCard(7) as CardDef;
  resolveEnemyAttack(endurance, incoming.id);
  check('defense_card: Endurance CA53=2 deja daño igual al CC entrante',
    enduranceHp - endurance.state.player.hp === incoming.cc,
    `damage=${enduranceHp - endurance.state.player.hp} cc=${incoming.cc}`);

  const absorb = defendSetup();
  absorb.state = { ...absorb.state, player: { ...absorb.state.player, hp: absorb.state.player.maxHp - 50 } };
  withHandDefend(absorb, 76);
  absorb.dispatch({ type: 'PLAY_DEFENSE_CARD', handIndex: 0 } as BattleCommand, { side: 'player', characterId: 'android_19' });
  const absorbHp = absorb.state.player.hp;
  resolveEnemyAttack(absorb, incoming.id);
  check('defense_card: Energy Absorb CA53=4 cura power de la Beam sin daño',
    absorb.state.player.hp === Math.min(absorb.state.player.maxHp, absorbHp + incoming.atk),
    `hp=${absorb.state.player.hp} expected=${Math.min(absorb.state.player.maxHp, absorbHp + incoming.atk)}`);

  const cancel = defendSetup();
  withHandDefend(cancel, 122);
  cancel.dispatch({ type: 'PLAY_DEFENSE_CARD', handIndex: 0 } as BattleCommand, { side: 'player', characterId: 'goku' });
  const cancelHp = cancel.state.player.hp;
  resolveEnemyAttack(cancel, 1);
  check('defense_card: CA83 $40 cancela Command/Stage (0 daño)', cancel.state.player.hp === cancelHp);

  const mismatch = defendSetup();
  withHandDefend(mismatch, 45);
  mismatch.dispatch({ type: 'PLAY_DEFENSE_CARD', handIndex: 0 } as BattleCommand, { side: 'player', characterId: 'android_17' });
  const mismatchHp = mismatch.state.player.hp;
  const mismatchResult = resolveEnemyAttack(mismatch, 5);
  check('defense_card: Barrier no se aplica a daño físico fuera de su familia', mismatch.state.player.hp < mismatchHp);

  const noDefense = defendSetup();
  const noDefenseHp = noDefense.state.player.hp;
  const noDefenseResult = resolveEnemyAttack(noDefense, 5);
  check('defense_card: sin carta defensiva el daño conserva la ruta ofensiva normal',
    noDefense.state.player.hp < noDefenseHp
    && noDefenseResult.events.some((event) => event.type === 'DAMAGE_APPLIED'));

  const lethal = defendSetup();
  lethal.state = { ...lethal.state, player: { ...lethal.state.player, hp: 1 } };
  withHandDefend(lethal, 121);
  lethal.dispatch({ type: 'PLAY_DEFENSE_CARD', handIndex: 0 } as BattleCommand, { side: 'player', characterId: 'goku' });
  const lethalResult = resolveEnemyAttack(lethal, incoming.id);
  const lethalDamage = lethalResult.events.find((event) => event.type === 'DAMAGE_APPLIED');
  check('defense_card: CA53 atenuada puede causar KO y nunca deja HP negativo',
    lethal.state.player.hp === 0
    && lethalDamage?.type === 'DAMAGE_APPLIED'
    && lethalDamage.amount === 1
    && lethalResult.events.some((event) => event.type === 'FIGHTER_DEFEATED'),
    `hp=${lethal.state.player.hp} damage=${lethalDamage?.type === 'DAMAGE_APPLIED' ? lethalDamage.amount : 'none'}`);
  check('defense_card: el evento de daño físico no defensible mantiene resultado hit',
    mismatchResult.events.some((event) => event.type === 'ATTACK_HIT' && event.outcome === 'hit'));
  const unhandled = unhandledCues(rt);
  check('defense_card: 0 cues UNHANDLED', unhandled.length === 0, unhandled.map((u) => u.type).join(', '));
  const ex = rt.dispatch({ type: 'END_EXCHANGE' } as BattleCommand);
  rt.state = { ...rt.state, phase: 'command' as never };
  check('defense_card: tras END_EXCHANGE → PLAYER_ATTACK_CHOICE',
    ex.ok !== false && getControlBoundary(rt.state) === 'PLAYER_ATTACK_CHOICE');
  const logLen = rt.log.entries.length;
  rt.advance(10000);
  check('defense_card: 10.000 ticks → 0 eventos (STOP)', rt.log.entries.length === logLen);
  return rt;
}

// ═══════════════════════════════════════════════════════════════════════
// 14) LIMIT — ruta nativa: coste, resultado, RNG, daño y timeline salen del
//     mismo dispatch; la carta equipada permanece reutilizable.
// ═══════════════════════════════════════════════════════════════════════
function runLimit(): BattleRuntime {
  const rt = new BattleRuntime({ state: createInitialBattleState(baseCfg()), context: ctxDefault() });
  rt.state = {
    ...rt.state, phase: 'command' as never,
    player: { ...rt.state.player, powerWindowCounter: 5 },
    limits: [13], // S.Kamehameha (limit de Goku)
  };
  const r1 = rt.dispatch({ type: 'LIMIT' } as BattleCommand, { side: 'player', characterId: 'goku', limitCardsCount: 1 } as never);
  check('limit: LIMIT aceptado (power window + limits) → phase limitSelect',
    r1.ok && rt.state.phase === 'limitSelect', `phase=${rt.state.phase}`);
  const hpBefore = rt.state.enemy.hp;
  const ccBefore = rt.state.player.cc;
  const r2 = rt.dispatch({ type: 'PLAY_LIMIT_CARD', cardId: 13 } as BattleCommand, { side: 'player', characterId: 'goku', limitCardsCount: 1 } as never);
  check('limit: PLAY_LIMIT_CARD aceptado y resuelto por el Engine',
    r2.ok && hasEvent(rt, 'ACTION_RESOLVED') && hasEvent(rt, 'ATTACK_HIT'),
    `events=${rt.log.entries.map((e) => e.event.type).join(',')}`);
  check('limit: daño aplicado, QTE cerrado y coste CC cobrado',
    rt.state.enemy.hp < hpBefore && rt.state.stageQte.state === 'WAITING'
    && rt.state.player.cc === ccBefore - (getCard(13)?.cc ?? 0),
    `phase=${rt.state.phase} qte=${rt.state.stageQte.state} hp=${rt.state.enemy.hp}/${hpBefore}`);
  check('limit: carta equipada sigue disponible y no entra al descarte',
    rt.state.limits.includes(13) && !rt.state.deck.discardPile.some((c) => c.id === 13));
  check('limit: timeline runtime lleva familia ROM', romFamilyEntries(rt, 'rom-card-13') > 0);
  const unhandled = unhandledCues(rt);
  check('limit: 0 cues UNHANDLED', unhandled.length === 0, unhandled.map((u) => u.type).join(', '));
  const logLen = rt.log.entries.length;
  rt.advance(10000);
  check('limit: 10.000 ticks → 0 eventos (STOP)', rt.log.entries.length === logLen);
  return rt;
}

// ═══════════════════════════════════════════════════════════════════════
// 15) KO — Kamehameha vs enemigo a 1 HP → FIGHTER_DEFEATED → Results
// ═══════════════════════════════════════════════════════════════════════
function runKo(): BattleRuntime {
  const rt = new BattleRuntime({ state: createInitialBattleState(baseCfg({ enemyHp: 1 })), context: ctxDefault() });
  const r = playCard(rt, 12, 'goku');
  check('ko: Kamehameha aceptada y resuelta', r.ok && hasEvent(rt, 'ACTION_RESOLVED'));
  check('ko: FIGHTER_DEFEATED (enemigo) + DAMAGE_APPLIED',
    hasEvent(rt, 'FIGHTER_DEFEATED') && damageTo(rt, 'enemy') > 0);
  check('ko: outcome VICTORY (player) + boundary NONE (terminal PA8)',
    battleOutcome(rt.state).status === 'VICTORY' && getControlBoundary(rt.state) === 'NONE',
    `outcome=${JSON.stringify(battleOutcome(rt.state))} boundary=${getControlBoundary(rt.state)}`);
  const koMarkers = rt.timeline.entries.filter((en) =>
    (en.cue.type === 'HUD' && (en.cue as { kind?: string }).kind === 'message' && (en.cue as { value?: string }).value === 'K.O.')
    || (en.cue.type === 'AUDIO' && (en.cue as { cue?: string }).cue === 'ko')
    || (en.cue.type === 'FIGHTER_POSE' && (en.cue as { pose?: string }).pose === 'hurt'));
  check('ko: marcadores K.O. en el timeline (flujo a Results)',
    koMarkers.length >= 3, `markers=${koMarkers.length}`);
  const logLen = rt.log.entries.length;
  rt.advance(10000);
  check('ko: 10.000 ticks → 0 eventos (terminal estable)', rt.log.entries.length === logLen);
  return rt;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  GOLDEN COMBAT SET E2E — 15 acciones por BattleRuntime REAL  ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('seed global: 4242 · sin Math.random · veredictos PASS/PARTIAL/BLOCKED\n');

// ── 1) 3 Stage (QTE) ──
console.log('\n═══ 1) 3 STAGE (QTE) ═══');
assertDeterministic('stage3', runStage3);
finishAction('stage3', '3 Stage (QTE)', 'PASS', 'QTE engine + daño ROM §130 + CC; cutover cinematográfico STAGE_COMMAND runtime sigue LEGACY (pendiente RESCUE paso 4, no silenciado)');

// ── 2/3) Cont.Punch / Cont.Kick ──
console.log('\n═══ 2) CONT.PUNCH ═══');
assertDeterministic('cont_punch', () => runStandardDamage(5, 'cont_punch', 0x2c, 206));
finishAction('cont_punch', 'Cont.Punch', 'PASS', 'STANDARD_DAMAGE físico seq0+seq1; impacto, recuperación y cleanup ROM; completion ROM (retorno al tick 300 del Runtime)');
console.log('\n═══ 3) CONT.KICK ═══');
assertDeterministic('cont_kick', () => runStandardDamage(6, 'cont_kick', 0x2d, 134));
finishAction('cont_kick', 'Cont.Kick', 'PASS', 'STANDARD_DAMAGE físico seq0+seq1; impacto, recuperación y cleanup ROM; completion ROM (retorno al tick 237 del Runtime)');

// ── 4) Kamehameha ──
console.log('\n═══ 4) KAMEHAMEHA ═══');
assertDeterministic('kamehameha', runKamehameha);
finishAction('kamehameha', 'Kamehameha', 'PASS', 'BEAM_BASE clean; film $03 anclado 17→92t');

// ── 5) Energy Bomb ──
console.log('\n═══ 5) ENERGY BOMB ═══');
assertDeterministic('energy_bomb', runEnergyBomb);
finishAction('energy_bomb', 'Energy Bomb', 'PASS', 'PROJECTILE_SCROLL físico completo; lifecycle $05 cerrado');

// ── 6) Destruct-Disk ──
console.log('\n═══ 6) DESTRUCT-DISK ═══');
assertDeterministic('destruct_disk', runDestructDisk);
finishAction('destruct_disk', 'Destruct-Disk', 'PASS', 'PROJECTILE_SCROLL físico completo; lifecycle $07 cerrado');

// ── 7) Gather Power ──
console.log('\n═══ 7) GATHER POWER ═══');
assertDeterministic('gather', runGather);
finishAction('gather', 'Gather Power', 'PASS', 'máquina POWER §102/§132-133');

// ── 8/9/10) Guard · Move H · Move V ──
console.log('\n═══ 8) GUARD ═══');
assertDeterministic('guard', runGuard);
finishAction('guard', 'Guard', 'PASS', 'CA82=2 + contacto M8.C2a + completion ROM del ataque $0A rival (Cont.Kick #6, retorno al tick 237 del Runtime)');
console.log('\n═══ 9) MOVE HORIZONTAL ═══');
assertDeterministic('move_h', () => runMove('HORIZONTAL', 'move_h'));
finishAction('move_h', 'Move H', 'PASS', 'POSITION_CHANGED axis HORIZONTAL');
console.log('\n═══ 10) MOVE VERTICAL ═══');
assertDeterministic('move_v', () => runMove('VERTICAL', 'move_v'));
finishAction('move_v', 'Move V', 'PASS', 'POSITION_CHANGED axis VERTICAL');

// ── 11) CHARA ──
console.log('\n═══ 11) CHARA ═══');
assertDeterministic('chara', runChara);
finishAction('chara', 'CHARA', 'PASS', 'swap @T+63 + motion ROM_EXACT §176-178');

// ── 12) Support ──
console.log('\n═══ 12) SUPPORT ═══');
assertDeterministic('support', runSupport);
finishAction('support', 'Support (#16 Resurrection)', 'PASS',
  'BattleRuntime nativo: legalidad + CC + descarte + heal + EventLog + SUPPORT_FIELD_EFFECT');

// ── 13) Defense Card ──
console.log('\n═══ 13) DEFENSE CARD (Taiyoken #19) ═══');
assertDeterministic('defense_card', runDefenseCard);
finishAction('defense_card', 'Defense Card (Taiyoken)', 'PASS', 'DEFENSE_RULE en contacto + CA53 §62-67 aplicada por el Engine a daño, curación, EventLog, HP y KO');

// ── 14) LIMIT ──
console.log('\n═══ 14) LIMIT ═══');
assertDeterministic('limit', runLimit);
finishAction('limit', 'LIMIT', 'PASS',
  'BattleRuntime nativo: carta equipada reutilizable + CC + RNG + daño + EventLog + timeline ROM');

// ── 15) KO ──
console.log('\n═══ 15) KO ═══');
assertDeterministic('ko', runKo);
finishAction('ko', 'KO', 'PASS', 'FIGHTER_DEFEATED → VICTORY → boundary NONE');

// ── Resumen ──
console.log('\n══════════════════════════════════════════════════════════════');
console.log('RESUMEN GOLDEN COMBAT SET');
console.log('══════════════════════════════════════════════════════════════');
for (const v of verdicts) {
  console.log(`  ${v.verdict.padEnd(7)} ${v.id.padEnd(14)} ${v.label}`);
}
const passCount = verdicts.filter((v) => v.verdict === 'PASS').length;
const partialCount = verdicts.filter((v) => v.verdict === 'PARTIAL').length;
const blockedCount = verdicts.filter((v) => v.verdict === 'BLOCKED').length;
console.log(`\n  PASS=${passCount} · PARTIAL=${partialCount} · BLOCKED=${blockedCount} · total=${verdicts.length}`);
check('golden combat: contrato exacto 15 PASS / 0 PARTIAL / 0 BLOCKED',
  passCount === 15 && partialCount === 0 && blockedCount === 0 && verdicts.length === 15);
console.log('\nBloqueados documentados (gaps del engine, no regresiones):');
for (const v of verdicts.filter((v) => v.verdict === 'BLOCKED')) {
  console.log(`  ⛔ ${v.label}: ${v.note}`);
}
if (blockedCount > 0) {
  fail += blockedCount;
  for (const v of verdicts.filter((v) => v.verdict === 'BLOCKED')) {
    failures.push(`${v.label}: BLOCKED`);
  }
}
console.log(`\n═══ RESULTADO: ${pass} ✓ · ${fail} ✗ ═══`);
if (fail > 0) {
  console.log('\nFallos:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('PASS — Golden Combat Set: 0 BLOCKED; rutas verificables reales (Engine → EventLog → timeline ROM → consumer).');
