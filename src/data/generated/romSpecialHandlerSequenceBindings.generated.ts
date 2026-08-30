// ═══════════════════════════════════════════════════════════════════════
// GENERATED ROM EVIDENCE — special-handler ActionObject sequence bindings.
// Source: Bank03 workers + Bank30:$5D00 presentation macros, cross-checked
// byte-for-byte on Spain / USA / RESKIN ROMs. No visual/pose inference.
// ═══════════════════════════════════════════════════════════════════════

export interface RomSpecialHandlerSequencePhase {
  state: number | null;
  macroId: number | null;
  slot: 0 | 1;
  sequence: number;
  role: 'ACTOR_PRIMARY' | 'ACTOR_SUPPORT' | 'TARGET';
  frameCount: number | null;
  totalTicks: number | null;
  evidence: string;
}

export interface RomSpecialHandlerSequenceBinding {
  handler: 0x0b | 0x0c | 0x0d | 0x0e;
  cardName: 'Tail' | 'V-Ball Crash' | 'Purple Comet' | 'P.Comet Z';
  actorResource: number;
  worker: { bank: 0x03; address: number };
  phases: readonly RomSpecialHandlerSequencePhase[];
  unresolvedActorSequences: readonly number[];
  evidenceHashes: readonly string[];
}

export const ROM_SPECIAL_HANDLER_SEQUENCE_BINDINGS: readonly RomSpecialHandlerSequenceBinding[] = [
  {
    handler: 0x0b,
    cardName: 'Tail',
    actorResource: 0x3f,
    worker: { bank: 0x03, address: 0x61c5 },
    phases: [
      {
        state: 0x07,
        macroId: null,
        slot: 0,
        sequence: 0,
        role: 'ACTOR_PRIMARY',
        frameCount: 1,
        totalTicks: 31,
        evidence: 'Bank03:$625B writes $C3C7=0 and $C3C6=0 immediately before START_ACTION_OBJECT ($3EBD).',
      },
    ],
    // Sequence 1 (25 frames / 225t) exists physically, but the worker reaches
    // animation-state macros ($1C/$36); no direct selector write has yet been
    // proven for seq1. Keep it explicit rather than guessing from appearance.
    unresolvedActorSequences: [1],
    evidenceHashes: [
      'worker-spain-usa-reskin:f46db63b1b6fa4da',
      'macro-1c-spain-usa-reskin:daff5c535f3d0994',
      'macro-36-spain-usa-reskin:6b3aa0cf58477dd9',
    ],
  },
  {
    handler: 0x0c,
    cardName: 'V-Ball Crash',
    actorResource: 0x41,
    worker: { bank: 0x03, address: 0x62d4 },
    phases: [
      {
        state: 0x32,
        macroId: 0x3b,
        slot: 0,
        sequence: 1,
        role: 'ACTOR_PRIMARY',
        frameCount: 17,
        totalTicks: 221,
        evidence: 'Bank30 macro $3B contains opcode $01 [slot0,D=6,seq=1,E=$80].',
      },
      {
        state: 0x34,
        macroId: 0x3c,
        slot: 0,
        sequence: 2,
        role: 'ACTOR_PRIMARY',
        frameCount: 21,
        totalTicks: 112,
        evidence: 'Bank30 macro $3C contains opcode $01 [slot0,D=6,seq=2,E=$80].',
      },
      {
        state: 0x36,
        macroId: 0x3d,
        slot: 0,
        sequence: 3,
        role: 'ACTOR_PRIMARY',
        frameCount: 15,
        totalTicks: 88,
        evidence: 'Bank30 macro $3D contains opcode $01 [slot0,D=6,seq=3,E=$80].',
      },
    ],
    // Sequence 0 (8 frames / 81t) is physically closed but its initial-phase
    // selector path is outside macros $3B-$3D and remains to be promoted.
    unresolvedActorSequences: [0],
    evidenceHashes: [
      'worker-spain-usa-reskin:f88ebc945b0ca061',
      'macro-3b-spain-usa-reskin:729d09cdbe33e58a',
      'macro-3c-spain-usa-reskin:7d21dc1b4eb44ea6',
      'macro-3d-spain-usa-reskin:cc2665eeb3dcd502',
    ],
  },
  {
    handler: 0x0d,
    cardName: 'Purple Comet',
    actorResource: 0x1c,
    worker: { bank: 0x03, address: 0x5c04 },
    phases: [
      {
        state: 0x14,
        macroId: null,
        slot: 0,
        sequence: 0,
        role: 'ACTOR_PRIMARY',
        frameCount: 91,
        totalTicks: 319,
        evidence: 'Bank03:$5C61 path writes $C3C7=0/$C3C6=0 then START_ACTION_OBJECT.',
      },
      {
        state: 0x14,
        macroId: null,
        slot: 1,
        sequence: 1,
        role: 'ACTOR_SUPPORT',
        frameCount: 97,
        totalTicks: 319,
        evidence: 'Same worker writes $C3C7=1/$C3C6=1 then START_ACTION_OBJECT.',
      },
    ],
    unresolvedActorSequences: [],
    evidenceHashes: ['worker-spain-usa-reskin:db5aa354d4a54d4c'],
  },
  {
    handler: 0x0e,
    cardName: 'P.Comet Z',
    actorResource: 0x1c,
    worker: { bank: 0x03, address: 0x5d0c },
    phases: [
      {
        state: 0x14,
        macroId: null,
        slot: 0,
        sequence: 2,
        role: 'ACTOR_PRIMARY',
        frameCount: 8,
        totalTicks: 150,
        evidence: 'Bank03:$5D69 path writes $C3C7=2/$C3C6=0 then START_ACTION_OBJECT.',
      },
      {
        state: 0x14,
        macroId: null,
        slot: 1,
        sequence: 3,
        role: 'ACTOR_SUPPORT',
        frameCount: 17,
        totalTicks: 156,
        evidence: 'Same worker writes $C3C7=3/$C3C6=1 then START_ACTION_OBJECT.',
      },
    ],
    unresolvedActorSequences: [],
    evidenceHashes: ['worker-spain-usa-reskin:362f5773dc519061'],
  },
] as const;

export function romSpecialHandlerBinding(handler: number): RomSpecialHandlerSequenceBinding | undefined {
  return ROM_SPECIAL_HANDLER_SEQUENCE_BINDINGS.find((entry) => entry.handler === handler);
}
