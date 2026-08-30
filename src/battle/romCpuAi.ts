// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ROM CPU AI SSOT (special-card eligibility, Bank7E:$6F23)
// ═══════════════════════════════════════════════════════════════════════
// Static rules the ORIGINAL ROM CPU uses to decide whether a special card is
// a valid candidate. Recovered from the 2026-08-29 re-pass.
//
// Routine: Bank7E:$6F23 — caller interprets carry=1 → reject / carry=0 → accept.
// The CPU reuses the SAME validator as the player; these rules are the EXTRA
// eligibility gates the CPU applies on top (saturation, one-shot state, etc.).
//
// This SSOT describes the ROM knowledge. It does NOT (yet) wire into the
// REMAKE's deterministic enemyController.ts, which is a separate legacy path.
// ═══════════════════════════════════════════════════════════════════════

export type CpuCardConditionKind =
  | 'SATURATION'    // buff/debuff already at max → don't waste the card
  | 'ONE_SHOT'      // one-shot state already active → don't replay
  | 'CLEANSE'       // only when there is a debuff/persistent state to clear
  | 'OCCUPANCY'     // shared protection occupancy gate
  | 'TARGET_RANGE'  // target identity must fall in a range
  | 'UNKNOWN';      // handled by $6F23 but condition not yet detailed

export interface CpuCardEligibilityRule {
  cardId: number;        // catalog id (1-based, e.g. #051)
  cardName: string;
  condition: string;     // byte-level condition (e.g. "fighter+9 & $30")
  rejectWhen: string;    // when the CPU rejects the card
  kind: CpuCardConditionKind;
  sharedGate?: string;   // label when sharing an occupancy gate with another card
  evidence: 'ROM_STATIC_VERIFIED';
  description: string;
}

export const CPU_ELIGIBILITY_ROUTINE = {
  bank: 0x7e,
  address: 0x6f23,
  contract: 'carry=1 → reject; carry=0 → acceptable candidate',
} as const;

export const CPU_POLICY = {
  /** CPU_POLICY_MODE / CPU_POLICY_TIER (NOT "difficulty"). */
  policyModeAddress: 0xc0a4,
  /** BATTLE_MODE_CONSECUTIVE_WINS (ROM_STATIC_VERIFIED). Victory → C043++; clamp 250. */
  consecutiveWinsAddress: 0xc043,
  progressionTier: 'C043 >= 5 → C0A4 policy escalates; C043 >= 10 → third reward-card candidate enabled',
} as const;

/** Battle result flag that drives C043. 1 = DEFEAT, 2 = VICTORY. */
export const BATTLE_MODE_RESULT = {
  address: 0xc0a3,
  defeat: 1,
  victory: 2,
} as const;

export const CPU_CARD_ELIGIBILITY_RULES: readonly CpuCardEligibilityRule[] = [
  {
    cardId: 51, cardName: 'Paralysis',
    condition: 'fighter+9 & $30', rejectWhen: '== $30 (Speed debuff already maxed)',
    kind: 'SATURATION',
    evidence: 'ROM_STATIC_VERIFIED',
    description: '+9 bits4-5 = Speed debuff. CPU does not waste Paralysis when Speed debuff is already at max.',
  },
  {
    cardId: 59, cardName: 'Speed Up',
    condition: 'fighter+8 & $30', rejectWhen: '== $30 (Speed buff already maxed)',
    kind: 'SATURATION',
    evidence: 'ROM_STATIC_VERIFIED',
    description: '+8 bits4-5 = Speed buff. CPU does not use Speed Up when its Speed buff is already at max.',
  },
  {
    cardId: 68, cardName: 'Lock On',
    condition: 'fighter+7 & $10', rejectWhen: 'already active',
    kind: 'ONE_SHOT',
    evidence: 'ROM_STATIC_VERIFIED',
    description: 'Conditions the next offensive resolution. CPU skips when already active.',
  },
  {
    cardId: 119, cardName: 'Reading Ki',
    condition: 'fighter+7 & $10', rejectWhen: 'already active',
    kind: 'ONE_SHOT',
    evidence: 'ROM_STATIC_VERIFIED',
    description: 'Same gate as Lock On / Feint ($10). Conditions next offensive resolution.',
  },
  {
    cardId: 120, cardName: 'Feint',
    condition: 'fighter+7 & $10', rejectWhen: 'already active',
    kind: 'ONE_SHOT',
    evidence: 'ROM_STATIC_VERIFIED',
    description: 'Same gate as Lock On / Reading Ki ($10). Conditions next offensive resolution.',
  },
  {
    cardId: 109, cardName: 'Sunglasses',
    condition: 'fighter+7 & $08', rejectWhen: 'already active',
    kind: 'ONE_SHOT',
    evidence: 'ROM_STATIC_VERIFIED',
    description: 'Counters Taiyoken. CPU understands the state and does not replay Sunglasses uselessly.',
  },
  {
    cardId: 118, cardName: 'Afterimage',
    condition: 'fighter+7 & $04', rejectWhen: 'already active',
    kind: 'ONE_SHOT',
    evidence: 'ROM_STATIC_VERIFIED',
    description: 'One-shot: hitThreshold >>= 1. CPU skips when already active.',
  },
  {
    cardId: 92, cardName: 'Kibito',
    condition: 'fighter+7 & $03', rejectWhen: 'protection bit occupied',
    kind: 'OCCUPANCY', sharedGate: 'KIBITO_CHAMPION_BELT',
    evidence: 'ROM_STATIC_VERIFIED',
    description: 'One-shot Beam protection. Shares occupancy gate with Champion Belt (bit not individually closed yet).',
  },
  {
    cardId: 111, cardName: 'Champion Belt',
    condition: 'fighter+7 & $03', rejectWhen: 'protection bit occupied',
    kind: 'OCCUPANCY', sharedGate: 'KIBITO_CHAMPION_BELT',
    evidence: 'ROM_STATIC_VERIFIED',
    description: 'One-shot Damage protection. Shares occupancy gate with Kibito (bit not individually closed yet).',
  },
  {
    cardId: 100, cardName: 'Medical Machine',
    condition: 'fighter+9 != 0', rejectWhen: 'no debuff/negative state to cleanse',
    kind: 'CLEANSE',
    evidence: 'ROM_STATIC_VERIFIED',
    description: 'CPU only considers it when a real debuff/negative state exists.',
  },
  {
    cardId: 114, cardName: 'Heart Medicine',
    condition: 'fighter+9 != 0', rejectWhen: 'no debuff/negative state to cleanse',
    kind: 'CLEANSE',
    evidence: 'ROM_STATIC_VERIFIED',
    description: 'Same cleanse gate as Medical Machine.',
  },
  {
    cardId: 115, cardName: 'Hourglass',
    condition: 'CA0A = 1; fighter+7 & $7F', rejectWhen: 'no cancellable persistent flag',
    kind: 'CLEANSE',
    evidence: 'ROM_STATIC_VERIFIED',
    description: 'CPU does not use it when there is no persistent effect to cancel. Exact subset it cancels depends on the consumer.',
  },
  {
    cardId: 98, cardName: 'Stop Device',
    condition: 'target fighterId >= $22 && < $27 (Android 16..20)', rejectWhen: 'target not an Android (outside $22..$26)',
    kind: 'TARGET_RANGE',
    evidence: 'ROM_STATIC_VERIFIED',
    description: 'Android-only group CONFIRMED (ROM_HANDLER_VERIFIED handler: CP $22 / CP $27). $22=Android16, $23=Android17, $24=Android18, $25=Android19, $26=Android20 (Dr. Gero). Full effect geometry (KO / half-damage / fail) in romCardEffectHandlers.ts.',
  },
] as const;

// Cards known to be handled by $6F23 but whose specific condition is not yet
// detailed in the re-pass (present in the routine's treated set).
export const CPU_ELIGIBILITY_UNDETAILED: readonly { cardId: number; cardName: string }[] = [
  { cardId: 23, cardName: 'Kaio Ken' },
  { cardId: 93, cardName: 'Babidi' },
  { cardId: 95, cardName: 'Yakon' },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// Queries
// ═══════════════════════════════════════════════════════════════════════

export function cpuRuleByCardId(cardId: number): CpuCardEligibilityRule | undefined {
  return CPU_CARD_ELIGIBILITY_RULES.find(r => r.cardId === cardId);
}

export function cpuRulesByKind(kind: CpuCardConditionKind): readonly CpuCardEligibilityRule[] {
  return CPU_CARD_ELIGIBILITY_RULES.filter(r => r.kind === kind);
}

export function cpuRulesBySharedGate(gate: string): readonly CpuCardEligibilityRule[] {
  return CPU_CARD_ELIGIBILITY_RULES.filter(r => r.sharedGate === gate);
}

export function cpuRuleKindSummary(): Record<CpuCardConditionKind, number> {
  const counts: Record<string, number> = {};
  for (const r of CPU_CARD_ELIGIBILITY_RULES) counts[r.kind] = (counts[r.kind] || 0) + 1;
  return counts as Record<CpuCardConditionKind, number>;
}
