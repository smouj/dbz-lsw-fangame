// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ROM PROBE ADDRESS MAP (WRAM battle memory) SSOT
// ═══════════════════════════════════════════════════════════════════════
// Single source of truth for the WRAM addresses the H0/SameBoy tracer must
// sample per-frame to turn the ~3-5% dynamic/spatial remainder into evidence.
//
// Recovered from the commercial ROMs (Spain primary, USA secondary) during
// the 2026-08-29 static re-pass. Most of battle is CLOSED STATIC; the entries
// below are the runtime addresses that matter for observation.
//
// The runtime core that still benefits from frame-level evidence:
//   base position vs frame offset vs committed movement vs HBlank viewport,
//   LEFT/RIGHT × HIT/MISS/GUARD differentials, and special ownership cleanup.
// ═══════════════════════════════════════════════════════════════════════

export type ProbeEvidence =
  | 'ROM_EXACT'            // measured directly from ROM VM execution
  | 'ROM_STATIC_VERIFIED'  // derived from ROM data structures / static re-pass
  | 'ROM_HANDLER_VERIFIED' // derived from ROM handler grammar
  | 'INFERRED_LEGACY'      // placeholder, needs replacement
  | 'PENDING_DYNAMIC';     // only observable at runtime (the 3-5%)

export type ProbeGroup =
  | 'BATTLE_BLOCK'
  | 'ACTION_SELECT'
  | 'TURN'
  | 'FIGHTER_STATE'
  | 'CC'
  | 'POWER_WINDOW'
  | 'CPU'
  | 'LIMIT'
  | 'ACTION_OBJECT'
  | 'TRANSITION_JOB'
  | 'VIEWPORT_SCROLL'
  | 'RNG'
  | 'STAGE'
  | 'SPECIAL'
  | 'RESOLUTION';

export type ProbeSide = 'PLAYER' | 'ENEMY' | 'CPU' | 'NEUTRAL';

export interface RomProbeAddress {
  address: number;        // WRAM address (0xCA01 …)
  name: string;
  width: 1 | 2;
  group: ProbeGroup;
  side: ProbeSide;
  evidence: ProbeEvidence;
  description: string;
}

export const ROM_PROBE_ADDRESSES: readonly RomProbeAddress[] = [
  // ── BATTLE BLOCK ──
  { address: 0xca01, name: 'BATTLE_BLOCK_0', width: 1, group: 'BATTLE_BLOCK', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Battle block byte 0 (CA01..CA06 = 6-byte battle block).' },
  { address: 0xca02, name: 'BATTLE_BLOCK_1', width: 1, group: 'BATTLE_BLOCK', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Battle block byte 1.' },
  { address: 0xca03, name: 'BATTLE_BLOCK_2', width: 1, group: 'BATTLE_BLOCK', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Battle block byte 2. Defense LIMIT path: CA36=0 → CA03=$0A → LIMIT.' },
  { address: 0xca04, name: 'BATTLE_BLOCK_3', width: 1, group: 'BATTLE_BLOCK', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Battle block byte 3.' },
  { address: 0xca05, name: 'BATTLE_BLOCK_4', width: 1, group: 'BATTLE_BLOCK', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Battle block byte 4.' },
  { address: 0xca06, name: 'BATTLE_BLOCK_5', width: 1, group: 'BATTLE_BLOCK', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Battle block byte 5.' },

  // ── ACTION SELECT ──
  { address: 0xca55, name: 'ACTION_SOURCE_0', width: 1, group: 'ACTION_SELECT', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Action source/selection byte 0 (CA55..CA5A = 6-byte action selection block).' },
  { address: 0xca56, name: 'CPU_ATTACK_SOURCE', width: 1, group: 'ACTION_SELECT', side: 'CPU', evidence: 'ROM_STATIC_VERIFIED', description: 'CPU attack source (enemy-side equivalent). e.g. Gather Power → CA56=4, CA58=0.' },
  { address: 0xca57, name: 'ACTION_SOURCE_2', width: 1, group: 'ACTION_SELECT', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Action source/selection byte 2.' },
  { address: 0xca58, name: 'CPU_ATTACK_SELECTION', width: 1, group: 'ACTION_SELECT', side: 'CPU', evidence: 'ROM_STATIC_VERIFIED', description: 'CPU attack selection result.' },
  { address: 0xca59, name: 'VBALL_VARIANT_SELECTOR', width: 1, group: 'ACTION_SELECT', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'V-ball variant selector (C3C6 = CA59>>1).' },
  { address: 0xca5a, name: 'ACTION_SOURCE_5', width: 1, group: 'ACTION_SELECT', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Action source/selection byte 5.' },

  // ── TURN ──
  { address: 0xca34, name: 'BATTLE_TURN_COUNTER', width: 1, group: 'TURN', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Battle progression / turn counter (init 1, ++ at cycle boundary).' },
  { address: 0xca35, name: 'TURN_DERIVED', width: 1, group: 'TURN', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Turn-derived (recomputed from CA34 + fighter comparison).' },

  // ── FIGHTER STATE ──
  { address: 0xca3c, name: 'PLAYER_FIGHTER_STATE', width: 1, group: 'FIGHTER_STATE', side: 'PLAYER', evidence: 'ROM_STATIC_VERIFIED', description: 'Player fighter runtime state.' },
  { address: 0xca44, name: 'ENEMY_FIGHTER_STATE', width: 1, group: 'FIGHTER_STATE', side: 'ENEMY', evidence: 'ROM_STATIC_VERIFIED', description: 'Enemy fighter runtime state.' },

  // ── CC ──
  { address: 0xca3e, name: 'PLAYER_CC', width: 1, group: 'CC', side: 'PLAYER', evidence: 'ROM_STATIC_VERIFIED', description: 'Player CC.' },
  { address: 0xca46, name: 'ENEMY_CC', width: 1, group: 'CC', side: 'ENEMY', evidence: 'ROM_STATIC_VERIFIED', description: 'Enemy CC.' },

  // ── POWER WINDOW ──
  { address: 0xca40, name: 'PLAYER_POWER_WINDOW', width: 1, group: 'POWER_WINDOW', side: 'PLAYER', evidence: 'ROM_STATIC_VERIFIED', description: 'Player powerWindow.' },
  { address: 0xca48, name: 'ENEMY_POWER_WINDOW', width: 1, group: 'POWER_WINDOW', side: 'ENEMY', evidence: 'ROM_STATIC_VERIFIED', description: 'Enemy powerWindow.' },

  // ── CPU ──
  { address: 0xc0a4, name: 'CPU_POLICY_MODE', width: 1, group: 'CPU', side: 'CPU', evidence: 'ROM_STATIC_VERIFIED', description: 'CPU_POLICY_MODE / CPU_POLICY_TIER (NOT "difficulty"). Writer: C043>=5 → C0A4 policy escalates; C043>=10 → third reward-card candidate enabled.' },
  { address: 0xc043, name: 'BATTLE_MODE_CONSECUTIVE_WINS', width: 1, group: 'CPU', side: 'CPU', evidence: 'ROM_STATIC_VERIFIED', description: 'Battle Mode consecutive wins (ROM_STATIC_VERIFIED). Victory → C043++; clamp 250. Drives C0A4 policy + reward candidate count.' },
  { address: 0xc0a3, name: 'BATTLE_RESULT', width: 1, group: 'CPU', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Battle result: 1 = DEFEAT, 2 = VICTORY. Drives C043++ (Battle Mode consecutive wins).' },

  // ── LIMIT ──
  { address: 0xca36, name: 'DEFENSE_LIMIT_SELECTOR', width: 1, group: 'LIMIT', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Defense LIMIT selector (0 → CA03=$0A → LIMIT pipeline).' },

  // ── ACTION OBJECT ──
  { address: 0xc3c6, name: 'ACTION_OBJECT_CONTEXT', width: 1, group: 'ACTION_OBJECT', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'ActionObject context (V-ball). C3C6 = CA59>>1.' },
  { address: 0xc3c7, name: 'ACTION_OBJECT_POINT', width: 1, group: 'ACTION_OBJECT', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'ActionObject explicit point (=0).' },
  { address: 0xc3c8, name: 'ACTION_OBJECT0_BASE_Y', width: 1, group: 'ACTION_OBJECT', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Canonical base position outside object0 state record: object0.baseY.' },
  { address: 0xc3c9, name: 'ACTION_OBJECT0_BASE_X', width: 1, group: 'ACTION_OBJECT', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Canonical base position outside object0 state record: object0.baseX.' },
  { address: 0xc3ca, name: 'ACTION_OBJECT1_BASE_Y', width: 1, group: 'ACTION_OBJECT', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Canonical base position outside object1 state record: object1.baseY.' },
  { address: 0xc3cb, name: 'ACTION_OBJECT1_BASE_X', width: 1, group: 'ACTION_OBJECT', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Canonical base position outside object1 state record: object1.baseX.' },

  // ── TRANSITION JOB ──
  { address: 0xc41d, name: 'TRANSITION_JOB_MODE', width: 1, group: 'TRANSITION_JOB', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Transition job descriptor byte 0 (mode). C41D..C422 = job descriptor (mode/BC/E/D/counter).' },
  { address: 0xc41e, name: 'TRANSITION_JOB_MASK_LO', width: 1, group: 'TRANSITION_JOB', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Transition job paletteMask16 low byte.' },
  { address: 0xc41f, name: 'TRANSITION_JOB_MASK_HI', width: 1, group: 'TRANSITION_JOB', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Transition job paletteMask16 high byte.' },
  { address: 0xc420, name: 'TRANSITION_JOB_MAX_COUNTER', width: 1, group: 'TRANSITION_JOB', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Transition job maxCounter (E). $10→17 transform executions, $20→33.' },
  { address: 0xc421, name: 'TRANSITION_JOB_CHANNEL_STEP', width: 1, group: 'TRANSITION_JOB', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Transition job channelStep (D), integer BGR555 per-channel increment/decrement.' },
  { address: 0xc422, name: 'TRANSITION_JOB_CURRENT_COUNTER', width: 1, group: 'TRANSITION_JOB', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Transition job currentCounter. Worker applies transform, increments, finishes when currentCounter > maxCounter.' },

  // ── VIEWPORT / SCROLL ──
  { address: 0xc405, name: 'CINEMATIC_DELTA_Y', width: 1, group: 'VIEWPORT_SCROLL', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: '$0D writes cinematicDeltaY; used only inside STAT/HBlank viewport.' },
  { address: 0xc406, name: 'CINEMATIC_DELTA_X', width: 1, group: 'VIEWPORT_SCROLL', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: '$0D writes cinematicDeltaX; side/path motion mutates this domain.' },
  { address: 0xc407, name: 'BASE_SCROLL_Y', width: 2, group: 'VIEWPORT_SCROLL', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'C407/C408 baseScrollY 16-bit; outside viewport SCY=low(C407).' },
  { address: 0xc409, name: 'BASE_SCROLL_X', width: 2, group: 'VIEWPORT_SCROLL', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'C409/C40A baseScrollX 16-bit; outside viewport SCX=low(C409).' },
  { address: 0xc234, name: 'CINEMATIC_VIEWPORT_TOP', width: 1, group: 'VIEWPORT_SCROLL', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: '$0D param3 selects top scanline: 0→23, nonzero→31.' },

  // ── RNG ──
  { address: 0xc230, name: 'FREE_COUNTER_8', width: 1, group: 'RNG', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Free 8-bit counter.' },
  { address: 0xc231, name: 'ROLL_0_99', width: 1, group: 'RNG', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Roll counter 0..99 (confirm actions).' },

  // ── STAGE ──
  { address: 0xca5d, name: 'STAGE_RANDOM', width: 1, group: 'STAGE', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Stage random (CA5D & 7).' },

  // ── SPECIAL ──
  { address: 0xc7d7, name: 'TAIL_MARKER', width: 1, group: 'SPECIAL', side: 'NEUTRAL', evidence: 'ROM_STATIC_VERIFIED', description: 'Tail marker ($1D).' },

  // ── RESOLUTION ──
  { address: 0xca53, name: 'RESOLUTION_BRANCH', width: 1, group: 'RESOLUTION', side: 'NEUTRAL', evidence: 'ROM_HANDLER_VERIFIED', description: 'Physical resolution branch: HIT($2F)/MISS($30)/SPECIAL_DEFENSE($31). Suicide: 0/4→$32, 2→$46, else→$3C. Also referenced by romCinematicBeat.ts.' },
] as const;

// ── Per-frame probe list (what the legacy tracer already sampled) ──

export const PER_FRAME_PROBES = {
  battleBlock: ['CA01..CA06'] as readonly string[],
  actionSelect: ['CA55..CA5A'] as readonly string[],
  actionObjects: ['C3A0..C3B2', 'C3B3..C3C5'] as readonly string[],
  actionObjectBasePositions: ['C3C8..C3CB'] as readonly string[],
  viewportScroll: ['C405', 'C406', 'C407/C408', 'C409/C40A', 'C234'] as readonly string[],
  hardware: ['SCX', 'SCY', 'LCDC', 'STAT', 'LY'] as readonly string[],
} as const;

// ── Equipped-card / Limit slot structure ──

export const EQUIPPED_CARD_LAYOUT = {
  // battleBlock + 3 + activeMemberIndex × 5 + limitSlot
  // → +03..+17 = 3 members × 5 Limits each
  slotBase: 'battleBlock + 3 + activeMemberIndex × 5 + limitSlot',
  limitRange: '+03..+17 (3 members × 5 Limits)',
} as const;

// ═══════════════════════════════════════════════════════════════════════
// Queries
// ═══════════════════════════════════════════════════════════════════════

export function probeByAddress(address: number): RomProbeAddress | undefined {
  return ROM_PROBE_ADDRESSES.find(p => p.address === address);
}

export function probesByGroup(group: ProbeGroup): readonly RomProbeAddress[] {
  return ROM_PROBE_ADDRESSES.filter(p => p.group === group);
}

export function probesBySide(side: ProbeSide): readonly RomProbeAddress[] {
  return ROM_PROBE_ADDRESSES.filter(p => p.side === side);
}

export function pendingDynamicProbes(): readonly RomProbeAddress[] {
  return ROM_PROBE_ADDRESSES.filter(p => p.evidence === 'PENDING_DYNAMIC');
}

export function probeGroupSummary(): Record<ProbeGroup, number> {
  const counts: Record<string, number> = {};
  for (const p of ROM_PROBE_ADDRESSES) counts[p.group] = (counts[p.group] || 0) + 1;
  return counts as Record<ProbeGroup, number>;
}
