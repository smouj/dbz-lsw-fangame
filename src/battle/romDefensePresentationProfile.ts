// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ROM Defense Presentation Profile (V7.6)
// Arquitectura: DEFENSE CHOICE -> Engine/EventLog -> CA83/romCA53/incoming
// -> offense worker interaction -> Presentation.
// Defense NUNCA se ejecuta aislada como "play defense card animation":
// slot8 es preload consumido desde la ruta ofensiva (V5), y Teleport/Time
// Freeze ni siquiera arrancan globalmente (V6.5).
// ═══════════════════════════════════════════════════════════════════════
import type { BattleSide } from './engine/state/BattleState';
import {
  DEFENSE_ROM_RULES,
  semanticOutcomeForCA53,
  type RomCA53,
  type RomCA53SemanticOutcome,
} from './engine/rom/romDescriptors';
import { CARDS } from '../data/cards';
import { actionObjectBindingInstructions } from './romActionObject';
import type { PresentationCue } from './engine/presentation/PresentationCue';

export type DefenseSlot8Status =
  | 'CONSUMED_BY_OFFENSE'
  | 'PRELOADED_NOT_STARTED_GLOBAL_STATIC'
  | 'NO_SLOT8';

export interface RomDefensePresentationProfile {
  cardId: number;
  name: string;
  ca83: number;
  resultFamily: RomCA53;
  result: string;
  slot8Status: DefenseSlot8Status;
  /** Dirección del start de slot8 que puede consumirlo (si aplica). */
  slot8StartAddress: '03:60AE' | '03:59F9' | null;
  romCA53: RomCA53;
  semanticOutcome: RomCA53SemanticOutcome;
  cues: PresentationCue[];
}

export interface RomDefenseProfileOptions {
  /** Sunglasses #109 counterea Taiyoken (CA83 $01 -> $81). */
  sunglasses?: boolean;
  /** Lado defensor (el runtime lo resuelve). */
  side?: BattleSide;
}

/** Cards cuyo slot8 puede arrancar la ofensiva (V5/V6.5: 2 starts globales). */
const SLOT8_CONSUMED: Record<number, { address: '03:60AE' | '03:59F9'; via: string }> = {
  19: { address: '03:60AE', via: 'STANDARD_DAMAGE CA83&$01 (sin Sunglasses)' },
  45: { address: '03:59F9', via: 'BEAM CA53=3' },
  53: { address: '03:59F9', via: 'BEAM CA53=3' },
  76: { address: '03:59F9', via: 'BEAM CA53=4' },
};

/** Cards con CA53 que NUNCA implican slot8 start (V6.5 audit: 1 loader / 2 starts / 0 macros). */
const NO_SLOT8_CARDS = new Set<number>([121, 122, 123, 124, 125, 26, 52]);

export function romDefensePresentationProfile(
  cardId: number,
  options: RomDefenseProfileOptions = {},
): RomDefensePresentationProfile | null {
  const rule = DEFENSE_ROM_RULES[cardId];
  const card = CARDS.find((c) => c.id === cardId);
  if (!rule || !card) return null;

  let ca83 = rule.ca83;
  if (cardId === 19 && options.sunglasses) ca83 = 0x81; // Taiyoken + Sunglasses (V5: bypassa cancelación)

  let slot8Status: DefenseSlot8Status;
  let slot8StartAddress: '03:60AE' | '03:59F9' | null = null;
  if (cardId === 19 && options.sunglasses) {
    slot8Status = 'NO_SLOT8'; // $81: STANDARD_DAMAGE $60B2 salta el start (CA83&$80)
  } else if (SLOT8_CONSUMED[cardId]) {
    slot8Status = 'CONSUMED_BY_OFFENSE';
    slot8StartAddress = SLOT8_CONSUMED[cardId].address;
  } else if (NO_SLOT8_CARDS.has(cardId)) {
    slot8Status = cardId === 26 || cardId === 52
      ? 'PRELOADED_NOT_STARTED_GLOBAL_STATIC'
      : 'NO_SLOT8';
  } else {
    slot8Status = 'NO_SLOT8';
  }

  const romCA53 = rule.resultFamily;
  const semanticOutcome = semanticOutcomeForCA53(romCA53, { defenseCardId: cardId });

  const cues: PresentationCue[] = [
    // B7B1 — binding FÍSICO del film defensivo (binder ROM £6750):
    // DEFENSE_REACTION → slot0 = DEFENDER, slot1 = ATTACKER. El contexto ROM
    // decide el slot; nunca "slot0 = jugador".
    ...actionObjectBindingInstructions('DEFENSE_REACTION', {
      attacker: (options.side ?? 'player') === 'player' ? 'enemy' : 'player',
      defender: (options.side ?? 'player') === 'player' ? 'player' : 'enemy',
    }).map((b) => ({
      type: 'ACTION_OBJECT_BIND' as const,
      tick: 0,
      slot: b.slot,
      role: b.role,
      fighterSide: b.fighterSide,
      context: 'DEFENSE_REACTION' as const,
      semantic: b.semantic,
    })),
    {
      type: 'DEFENSE_FX',
      tick: 0,
      durationTicks: 30,
      side: options.side ?? 'player',
      result: rule.result as never,
    },
  ];
  if (slot8Status === 'CONSUMED_BY_OFFENSE') {
    cues.push({
      type: 'ROM_WAIT',
      tick: 30,
      durationTicks: 30,
      reason: `slot8 consumido por la ofensiva (${slot8StartAddress})`,
    });
  } else if (slot8Status === 'PRELOADED_NOT_STARTED_GLOBAL_STATIC') {
    cues.push({
      type: 'ROM_PENDING',
      tick: 30,
      reason: 'slot8 PRELOADED_NOT_STARTED_GLOBAL_STATIC: sin arranque global (V6.5)',
      boundary: 'STATIC',
    });
  } else if (cardId === 124) {
    cues.push({
      type: 'SUPPORT_MACRO',
      tick: 30,
      macroId: 0x38,
      macroHex: '04 01 00 1F A0',
      workerFamily: 'DEFENSE',
      literalProgramStatus: 'COMPLETE_ROM_VERIFIED',
      semanticStatus: 'UNRESOLVED',
    });
  }

  return {
    cardId,
    name: card.name,
    ca83,
    resultFamily: romCA53,
    result: rule.result,
    slot8Status,
    slot8StartAddress,
    romCA53,
    semanticOutcome,
    cues,
  };
}

export function romDefensePresentationProfilesAll(
  options: RomDefenseProfileOptions = {},
): RomDefensePresentationProfile[] {
  return Object.keys(DEFENSE_ROM_RULES)
    .map((id) => Number(id))
    .map((id) => romDefensePresentationProfile(id, options))
    .filter((p): p is RomDefensePresentationProfile => p !== null);
}
