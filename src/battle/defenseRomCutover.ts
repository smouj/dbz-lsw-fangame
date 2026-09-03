// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — DEFENSE runtime cutover (V7.7 — Paso 3 Combat Fidelity Rescue)
// Enruta la presentación de las 11 Defense Cards keyed por DEFENSE_ROM_RULES
// (type 'defense': Taiyoken 19 · Teleport 26 · Barrier 45 · Time Freeze 52 ·
// Breath 53 · Energy Absorb 76 · Endurance 121 · Telepathy 122 · Foresight
// 123 · Shockwave 124 · Avoiding 125) por el perfil/compilador ROM.
//
// Regla ROM (§58-67): la defensa NUNCA se ejecuta aislada — la ofensiva
// entrante la consume (slot8 preload consumido desde la ruta ofensiva,
// CA83 → CA53). Este módulo NO rueda accuracy, NO computa daño, NO muta
// BattleState: traduce el DEFENSE_COMMITTED + el contacto del ataque
// (ATTACK_HIT del otro lado en el mismo EventLog) al timeline ROM del perfil
// (romDefensePresentationProfile V7.6).
//
// Anclaje (decisión M8.C2a): DEFENSE_FX y compañía se emiten en el CONTACTO
// del ataque entrante, no al comprometer la elección. Si el contacto aún no
// está en el log (el commit y la resolución enemiga son dispatches distintos
// del BattleRuntime), compileDefenseRomRuntimeCutover devuelve null — el
// timeline se reconstruye entero en cada dispatch, así que la emisión aparece
// en el rebuild que ya contiene el ATTACK_HIT. Determinista.
// ═══════════════════════════════════════════════════════════════════════
import { CARDS, type CardDef } from '../data/cards';
import type { BattleActionDescriptor } from './engine/events/BattleEvent';
import type { BattleEventEnvelope } from './engine/events/EventLog';
import type {
  BattleTimeline,
  PresentationCue,
  TimelineEntry,
} from './engine/presentation/PresentationCue';
import { DEFENSE_ROM_RULES, type RomCA53 } from './engine/rom/romDescriptors';
import type { BattleSide, DefenseChoice } from './engine/state/BattleState';
import {
  romDefensePresentationProfile,
  type RomDefensePresentationProfile,
  type RomDefenseProfileOptions,
} from './romDefensePresentationProfile';

/** Las 11 Defense Cards con regla ROM (keys de DEFENSE_ROM_RULES §62). */
export function defenseCards(): CardDef[] {
  return Object.keys(DEFENSE_ROM_RULES)
    .map((id) => Number(id))
    .map((id) => CARDS.find((c) => c.id === id))
    .filter((c): c is CardDef => Boolean(c));
}

/** Resuelve la carta defensiva ROM para un descriptor de acción, o null. */
export function defenseCardForAction(action: BattleActionDescriptor): CardDef | null {
  const card = CARDS.find((c) => c.name === action.label);
  if (!card) return null;
  return DEFENSE_ROM_RULES[card.id] ? card : null;
}

/** Resuelve la carta defensiva ROM para una DefenseChoice CARD, o null. */
export function defenseCardForChoice(choice: DefenseChoice): CardDef | null {
  if (choice.type !== 'CARD') return null;
  if (!DEFENSE_ROM_RULES[choice.cardId]) return null;
  return CARDS.find((c) => c.id === choice.cardId) ?? null;
}

export interface DefenseRomCutover {
  card: CardDef;
  profile: RomDefensePresentationProfile;
  /** romCA53 de la regla (§59 taxonomía: 1 AVOID · 2 PARTIAL · 3 NULL · 4 ABSORB). */
  romCA53: RomCA53;
  timeline: BattleTimeline;
  pendingCues: number;
  /** Evento de contacto del ataque entrante que ancla la emisión runtime. */
  contactEvent: 'ATTACK_HIT' | null;
  contactTick: number | null;
}

export interface DefenseRomCutoverOptions extends RomDefenseProfileOptions {
  /** Tick absoluto de anclaje (default 0). En runtime = tick del contacto. */
  startTick?: number;
  /** Marcador de origen de los entries (honesto: no finge un evento no emitido). */
  sourceEvent?: string;
}

const ENTRY_FIDELITY = 'ROM_STATIC_VERIFIED' as const;
const PROFILE_FAMILY = 'DEFENSE_RULE' as const;

function entry(
  cue: PresentationCue,
  cardId: number,
  sourceEvent: string,
  pendingCues: number,
): TimelineEntry {
  return {
    cue,
    logicalTick: cue.tick,
    sourceEvent,
    profileId: `rom-defense-${cardId}`,
    fidelity: ENTRY_FIDELITY,
    romSource: {
      kind: 'ROM_PRESENTATION',
      cardId,
      handler: 0x00,
      profileFamily: PROFILE_FAMILY,
      staticCompletion: pendingCues === 0 ? 'COMPLETE' : 'PARTIAL',
      dynamicPending: false,
      pendingCues,
    },
  };
}

/**
 * Compila el perfil defensivo ROM (V7.6) a BattleTimeline.
 * Cues del perfil: DEFENSE_FX (30t) + ROM_WAIT / ROM_PENDING / SUPPORT_MACRO
 * según el estado slot8 (§65-67). Ninguna cue inventa poses genéricas ni
 * ANIMATION_START: la defensa se presenta por la regla CA83 → CA53.
 * Determinista: misma carta + mismas opciones → mismo timeline.
 */
export function compileDefenseRomCutover(
  cardId: number,
  options: DefenseRomCutoverOptions = {},
): DefenseRomCutover | null {
  const card = CARDS.find((c) => c.id === cardId);
  const rule = DEFENSE_ROM_RULES[cardId];
  if (!card || !rule) return null;

  const profile = romDefensePresentationProfile(cardId, { side: options.side, sunglasses: options.sunglasses });
  if (!profile) return null;

  const startTick = options.startTick ?? 0;
  const sourceEvent = options.sourceEvent ?? 'DEFENSE_RULE';
  const pendingCues = profile.cues.filter((cue) => cue.type === 'ROM_PENDING').length;

  const entries = profile.cues.map((cue) => {
    const shifted = { ...cue, tick: cue.tick + startTick } as PresentationCue;
    return entry(shifted, cardId, sourceEvent, pendingCues);
  });

  const endTick = Math.max(
    startTick,
    ...entries.map((item) => item.cue.tick + ('durationTicks' in item.cue ? (item.cue.durationTicks ?? 0) : 0)),
  );

  return {
    card,
    profile,
    romCA53: rule.resultFamily,
    timeline: { startTick, endTick, entries },
    pendingCues,
    contactEvent: null,
    contactTick: null,
  };
}

/**
 * Resolución del contacto del ataque entrante desde un DEFENSE_COMMITTED.
 * Escanea hacia delante en el mismo EventLog (patrón de los outcome-scanners
 * de STANDARD_DAMAGE/BEAM): el primer ATTACK_HIT/ATTACK_MISSED que tiene al
 * DEFENSOR como target pertenece a ESTE exchange (la resolución enemiga se
 * abre tras el commit — orden contractual M8.C2a). Un ATTACK_MISSED natural
 * no consume la defensa (la ofensiva no llegó a contacto) → sin anclaje.
 */
export function defenseContactFromEvents(
  events: BattleEventEnvelope[],
  committedIndex: number,
  defender: BattleSide,
): { tick: number; kind: 'ATTACK_HIT' } | null {
  for (let index = committedIndex + 1; index < events.length; index++) {
    const event = events[index].event;
    // Frontera del exchange: una acción nueva o una nueva ventana defensiva
    // cierran la ventana de este commit sin consumirlo.
    if (event.type === 'ACTION_STARTED') break;
    if (event.type === 'DEFENSE_COMMITTED') break;
    if (event.type === 'ATTACK_HIT' && event.target === defender && event.source !== defender) {
      return { tick: events[index].tick, kind: 'ATTACK_HIT' };
    }
    if (event.type === 'ATTACK_MISSED' && event.target === defender && event.source !== defender) {
      return null; // miss natural: la defensa no se consume (§62-64: consume la ofensiva entrante)
    }
  }
  return null;
}

/**
 * Cutover runtime de la carta defensiva: traduce el DEFENSE_COMMITTED al
 * timeline ROM anclado en el CONTACTO del ataque entrante. Si el contacto
 * aún no está en el log (dispatch del commit sin resolución enemiga aún),
 * devuelve null — el rebuild posterior del timeline lo emitirá. Honesto:
 * nunca emite la defensa visual al elegir (M8.C2a: la visual efectiva va en
 * el contacto) y nunca la inventa si la ofensiva no llegó.
 */
export function compileDefenseRomRuntimeCutover(
  events: BattleEventEnvelope[],
  committedIndex: number,
  env: BattleEventEnvelope & { event: { type: 'DEFENSE_COMMITTED' } },
): DefenseRomCutover | null {
  const card = defenseCardForChoice(env.event.choice);
  if (!card) return null;
  const contact = defenseContactFromEvents(events, committedIndex, env.event.side);
  if (!contact) return null;
  const cutover = compileDefenseRomCutover(card.id, {
    side: env.event.side,
    startTick: contact.tick,
    sourceEvent: contact.kind,
  });
  if (!cutover) return null;
  return { ...cutover, contactEvent: contact.kind, contactTick: contact.tick };
}
