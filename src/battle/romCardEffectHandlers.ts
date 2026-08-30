// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ROM CARD EFFECT HANDLER SSOT
// ═══════════════════════════════════════════════════════════════════════
// Physical effect-handler rules recovered by reading the original ROM's card
// handler code directly (not inferred from tables or strings). This is a
// SEPARATE domain from:
//   - romCpuAi.ts        → CPU eligibility gates (Bank7E:$6F23)
//   - storyRom.ts        → Story VM bytecode / map runtime
//   - actionProfiles.ts  → legacy deterministic REMAKE path
//
// Evidence: 'ROM_HANDLER_VERIFIED' = the handler's machine code was read and
// the branch/arithmetic reconstructed. Higher confidence than a static name.
//
// This SSOT documents ROM knowledge. It does NOT wire into the REMAKE's
// deterministic card effect path (legacy), which is a separate front.
// ═══════════════════════════════════════════════════════════════════════

export type CardEffectEvidence =
  | 'ROM_HANDLER_VERIFIED';   // handler machine code read directly

// ── Tactical state bits (shared by spatial card handlers) ──

export const TACTICAL_BITS = {
  /** bit0: 0 = GROUND, 1 = AIR */
  vertical: { bit: 0, ground: 0, air: 1 },
  /** bit1: 0 = FRONT, 1 = BACK */
  depth: { bit: 1, front: 0, back: 1 },
} as const;

// ── Stop Device (#98) ──

export interface CardEffectHandlerRule {
  cardId: number;
  cardName: string;
  evidence: CardEffectEvidence;
  /** Consequence outcome of the handler (what actually gets applied). */
  outcomes: readonly { condition: string; result: string }[];
  /** ROM addresses touched by the handler. */
  memory: readonly { address: number; name: string; role: string }[];
  description: string;
}

export const ANDROID_TARGET_RANGE = {
  minFormId: 0x22,  // Android 16
  maxFormId: 0x26,  // Android 20 / Dr. Gero
  identities: [
    { formId: 0x22, name: 'Android 16' },
    { formId: 0x23, name: 'Android 17' },
    { formId: 0x24, name: 'Android 18' },
    { formId: 0x25, name: 'Android 19' },
    { formId: 0x26, name: 'Android 20 / Dr. Gero' },
  ],
} as const;

export const CARD_EFFECT_HANDLERS: readonly CardEffectHandlerRule[] = [
  {
    cardId: 98,
    cardName: 'Stop Device',
    evidence: 'ROM_HANDLER_VERIFIED',
    outcomes: [
      { condition: 'target ∉ Android 16..20 ($22..$26)', result: 'FAIL (CA53 = 1)' },
      { condition: 'actor BACK', result: 'FAIL (CA53 = 1)' },
      { condition: 'actor FRONT + target FRONT', result: 'damage = maxLife → guaranteed KO (currentLife saturates at 0)' },
      { condition: 'actor FRONT + target BACK + same vertical plane (GROUND/GROUND or AIR/AIR)', result: 'damage = floor(maxLife / 2)' },
      { condition: 'any other geometry', result: 'FAIL (CA53 = 1)' },
    ],
    memory: [
      { address: 0xca53, name: 'STOP_DEVICE_FAIL_FLAG', role: 'set to 1 on FAIL' },
    ],
    description: 'Handler checks CP $22 / CP $27 for the Android target range, then the tactical bits (bit0 GROUND/AIR, bit1 FRONT/BACK). FRONT→FRONT is a guaranteed KO (damage = target maxLife). FRONT→BACK on the same vertical plane is half maxLife. Everything else fails. Replaces the old "close KO / far reduced" approximation with the physical rule.',
  },
] as const;

// ── Queries ──

export function cardEffectHandlerByCardId(cardId: number): CardEffectHandlerRule | undefined {
  return CARD_EFFECT_HANDLERS.find(h => h.cardId === cardId);
}

export function androidIdentityByFormId(formId: number): string | undefined {
  return ANDROID_TARGET_RANGE.identities.find(i => i.formId === formId)?.name;
}
