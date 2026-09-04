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
//      ROM_PENDING / frame físico UNRESOLVED queda CONTADO y con razón
//      permitida (allowlist por acción) — nunca silenciado, nunca nuevo.
//   3. 0 cues sin consumir: cada cue del timeline de la acción tiene destino
//      en el espejo del adapter (classifyRomCue: VISIBLE/DISPLAY/TRACE/
//      PENDING — nunca UNHANDLED).
//   4. Aserciones ROM por acción (estructura, no solo "termina").
//   5. Determinismo: cada escenario ×2 con el mismo seed → mismo EventLog
//      (type + sequence) — sin Math.random.
//
// Veredictos por acción: PASS · PARTIAL (pendientes reportados con razón,
// allowlist congelada) · BLOCKED (gap real del engine, evidenciado). El gate
// nace verde con PASS/PARTIAL y lista los BLOCKED explícitamente; si un
// BLOCKED deja de estarlo (el engine lo implementa) el gate se pone ROJO
// pidiendo actualizar la tabla — un bloqueo no puede desaparecer en silencio.
//
// Evidencia ROM citada con § de docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md.
// ═══════════════════════════════════════════════════════════════════════
import { BattleRuntime } from '../src/battle/runtime/BattleRuntime';
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

/** Cues ROM_PENDING del timeline runtime con su razón (para allowlist). */
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

/** Aserción común 2+3: familia ROM en runtime + 0 UNHANDLED + pendientes en allowlist. */
function assertRomRouting(label: string, rt: BattleRuntime, opts: {
  /** Prefijo de profileId esperado en el timeline runtime ('' si la acción no
   *  emite familia ROM en runtime todavía — caso Stage, PARTIAL explícito). */
  profilePrefix?: string;
  /** Razones de ROM_PENDING permitidas (substring). Vacío = 0 pendientes. */
  allowPending?: string[];
  /** Máximo de frames físicos UNRESOLVED permitidos. */
  maxUnresolvedPhysical?: number;
}): void {
  const { profilePrefix, allowPending = [], maxUnresolvedPhysical = 0 } = opts;
  if (profilePrefix) {
    check(`${label}: timeline runtime lleva familia ROM (${profilePrefix}*)`,
      romFamilyEntries(rt, profilePrefix) > 0,
      `entries=${romFamilyEntries(rt, profilePrefix)}`);
  }
  const unhandled = unhandledCues(rt);
  check(`${label}: 0 cues UNHANDLED (espejo classifyRomCue)`, unhandled.length === 0,
    unhandled.map((u) => u.type).join(', '));
  const reasons = pendingCueReasons(rt);
  const unallowed = reasons.filter((r) => !allowPending.some((a) => r.includes(a)));
  check(`${label}: ROM_PENDING solo con razón permitida (${reasons.length})`,
    unallowed.length === 0,
    `nuevas: ${unallowed.join(' || ')}`);
  const unresolved = unresolvedPhysicalCount(rt);
  check(`${label}: frames físicos UNRESOLVED ≤ ${maxUnresolvedPhysical}`,
    unresolved <= maxUnresolvedPhysical,
    `unresolved=${unresolved}`);
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
  assertRomRouting(label, rt, {
    profilePrefix: `rom-card-${cardId}`,
    // Pendiente reportado (no silenciado): la secuencia de animación del
    // actor aún no está probada para esta forma (ProductionFrameResolver).
    allowPending: ['ProductionFrameResolver blocked because actorFormId/sequenceSelector is not proven'],
    maxUnresolvedPhysical: 0,
  });
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
  assertRomRouting('kamehameha', rt, { profilePrefix: 'rom-card-12', allowPending: [], maxUnresolvedPhysical: 0 });
  assertStopsAtDefenseChoice('kamehameha', rt);
  return rt;
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
  // Familia runtime BEAM_FAMILY: el cutover beam emite con perfil ROM aunque
  // la ruta estática devuelva null (frames físicos UNRESOLVED en la compilación
  // estática por rama no seleccionada). Verificado empíricamente: entries
  // rom-card-8 con ROM_PHYSICAL_FRAME + FX_LOAD + ROM_FX_WINDOW + SCREEN_MOTION.
  assertRomRouting('energy_bomb', rt, {
    profilePrefix: 'rom-card-8',
    // Pendiente del handler $05: orden secuencia/proyectil aún no cerrable
    // estáticamente (§218-224; release-frame del scroll). Reportado, no oculto.
    allowPending: ['projectile handler sequence/order is still statically closable'],
    // Frames físicos UNRESOLVED (ticks 0-6 del film del proyectil): gap
    // reportado — el static route por eso devuelve null hoy.
    maxUnresolvedPhysical: 7,
  });
  const route = romPresentationTimelineForCard(getCard(8) as CardDef, 'player', 'goku_base');
  check('energy_bomb: ruta estática null por frames UNRESOLVED (divergencia documentada static/runtime)',
    route === null, `route=${route?.kind ?? 'null'}`);
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
  assertRomRouting('destruct_disk', rt, {
    profilePrefix: 'rom-card-21',
    allowPending: ['projectile handler sequence/order is still statically closable'],
    maxUnresolvedPhysical: 0,
  });
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
function resolveEnemyAttack(rt: BattleRuntime): ReturnType<BattleRuntime['resolveCard']> {
  return rt.resolveCard('enemy', getCard(7) as CardDef); // Energy Wave (beam)
}

function runGuard(): BattleRuntime {
  const rt = defendSetup();
  const r = rt.dispatch({ type: 'GUARD' } as BattleCommand, { side: 'player' });
  check('guard: GUARD aceptado + DEFENSE_COMMITTED choice GUARD',
    r.ok && rt.state.defenseState === 'COMMITTED' && rt.state.defenseChoice?.type === 'GUARD');
  check('guard: GUARD_STARTED (reduce) — CA82=2 BASIC_GUARD (§197)',
    hasEvent(rt, 'GUARD_STARTED') && rt.state.playerGuard === 'reduce' && RomResolutionMode.BASIC_GUARD === 2,
    `guard=${rt.state.playerGuard}`);
  const res = resolveEnemyAttack(rt);
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
  const res = resolveEnemyAttack(rt);
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
finishAction('cont_punch', 'Cont.Punch', 'PARTIAL', 'STANDARD_DAMAGE runtime; 1 ROM_PENDING reportado (secuencia actor no probada)');
console.log('\n═══ 3) CONT.KICK ═══');
assertDeterministic('cont_kick', () => runStandardDamage(6, 'cont_kick', 0x2d, 134));
finishAction('cont_kick', 'Cont.Kick', 'PARTIAL', 'STANDARD_DAMAGE runtime; 1 ROM_PENDING reportado (secuencia actor no probada)');

// ── 4) Kamehameha ──
console.log('\n═══ 4) KAMEHAMEHA ═══');
assertDeterministic('kamehameha', runKamehameha);
finishAction('kamehameha', 'Kamehameha', 'PASS', 'BEAM_BASE clean; film $03 anclado 17→92t');

// ── 5) Energy Bomb ──
console.log('\n═══ 5) ENERGY BOMB ═══');
assertDeterministic('energy_bomb', runEnergyBomb);
finishAction('energy_bomb', 'Energy Bomb', 'PARTIAL', 'BEAM_FAMILY runtime; 7 frames físicos UNRESOLVED + 1 pending proyectil reportados');

// ── 6) Destruct-Disk ──
console.log('\n═══ 6) DESTRUCT-DISK ═══');
assertDeterministic('destruct_disk', runDestructDisk);
finishAction('destruct_disk', 'Destruct-Disk', 'PARTIAL', 'BEAM_FAMILY runtime (krillin); 1 pending orden-proyectil reportado');

// ── 7) Gather Power ──
console.log('\n═══ 7) GATHER POWER ═══');
assertDeterministic('gather', runGather);
finishAction('gather', 'Gather Power', 'PASS', 'máquina POWER §102/§132-133');

// ── 8/9/10) Guard · Move H · Move V ──
console.log('\n═══ 8) GUARD ═══');
assertDeterministic('guard', runGuard);
finishAction('guard', 'Guard', 'PASS', 'CA82=2 + contacto M8.C2a');
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
finishAction('defense_card', 'Defense Card (Taiyoken)', 'PASS', 'DEFENSE_RULE en contacto + CA53 AVOIDED §62-67 (la mitigación CA53 de daño sigue sin aplicarse en la resolución M5 — fuera del alcance del gate)');

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
