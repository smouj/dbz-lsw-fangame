// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — STORY ROM SSOT
// ═══════════════════════════════════════════════════════════════════════
// Single source of truth for the Story-mode bytecode VM and its ROM data,
// recovered from the commercial ROMs (USA primary, Spain secondary).
//
// This SUPERSEDES storyScript.ts (PDF V2) as the AUTHORITY of story text:
// the ROM now yields exact dialogue via the $10 literal-text opcode, plus
// exact speaker/portrait/scene/audio/battle/choice/map/credits/save programs.
//
// The Story VM is a real bytecode interpreter with a nested STORY MAP RUNTIME
// ($29-$2F): entities, positions, input, collision, triggers. That does NOT
// mean the remake must recover RPG exploration; it means we now know what the
// cartridge physically executed.
//
// Pass 5 (2026-08-29) closed: link/system family ($0F/$1C/$1F), text-window
// lifecycle ($12/$13/$14), link-battle sync ($26), card trade ($28), enemy
// tuning ($23), map trigger/zone ($2C) + player actor ($2D), persistence
// dispatcher ($39), SRAM save/load ($3B/$3C/$3D), pre-battle system screen
// ($3F), speaker exclusivity ($42/$44), Battle Mode win-streak ($45), and
// credits ($46/$47). Also CORRECTED the VM evaluator (opcodes shifted +1).
//
// Pass 6 (2026-08-29) closed: $23 per-stat growth levels (C0F9..C0FC = HP/STR/
// KI/SPD_GROWTH_LEVEL + 13-byte ENEMY_MEMBER_RECORD); $2C Story Map trigger
// table (CA6A 8×4: tileY/tileX/c1xxGateOffset/eventId; modes $0A clear / $14
// register); $2D modes $0A sprite / $19 tile position / $1E direction; $2E NPC
// record layout (flags/worldY/worldX/animTimer/animDisplayState/directionState)
// + modes $0A/$14/$19/$1E; $3C(1) → SAVE_SESSION_TRANSITION_FLOW (ends at SRAM
// LOAD, C009=1 if C022!=0); CCBE..CCC4 = persistent save region CC1D..CE6F;
// $39($11) source Bank7E:$4DFB. Also CORRECTED map-mode bytes: $2C/$2D/$2E
// modes were recorded decimal ($10/$20/$25/$30) — real hex $0A/$14/$19/$1E.
//
// Pass 8 (2026-08-29) closed: C009/C008 main-loop reinit flags; $3C = LOAD + soft
// restart (mode 0 = LOAD_SRAM_IMMEDIATE, nonzero = RUN_INTERACTIVE_SESSION_LOAD_AND_
// SOFT_RESTART, ends C009=1); $2E NPC record accessor corrected (CA06 + entityId×10,
// entityId 1..7 → CA10..CA55; +08 baseTileIndex / +09 baseOamAttributes); NPC flags
// bit7 active+anim / bit1 dir-override / bit0 collidable; $2E($0A) sprite-resource
// handler (Bank3:$6CA8, $0B = async gfx-transfer continuation); CCBE..CCC4 = Vegito
// persistent progression preset (record 10 offsets +1..+7: level/exp/hp/str/ki/spd
// growth; EXP cap 500, max level 4); BGM table Bank7E:$42B8/$42CC (20 IDs); SFX
// Bank79:$5000 ("SE" header, 85 IDs) + $1B queue pipeline; ActionObject logical→
// physical binding static-closed (C7D5/C7D6 + CA59/CA5A>>1). Cross-ROM: USA/Spain/
// Reskin identical for all of the above.
//
// Pass 9 (2026-08-29) closed: persistent fighter record +08..+13 = limitCount +
// 5 limitAttackId slots; CDCD..CDF2 is NOT a 38-byte deck but a battle-loadout
// preset (3 fighter IDs + 15 Limit IDs + 20 deck IDs); C4 palette worker closed
// as integer BGR555 white-flash/restore with mask16; C5 corrected to base camera/
// BG scroll (C407/C409) + cinematic viewport delta (C405/C406) applied only in a
// STAT/HBlank window; $0D param3 selects top scanline 23/31; $0F disables the
// HBlank viewport and preserves C405/C406; $11 SCREEN_PATH has one implicit fixed
// path, no pathId family. Cross-ROM status still expected identical pending final
// pass audit.
//
// Rules:
//   - Every opcode carries evidence provenance. No "guessed" semantics.
//   - Unmapped handlers stay in the registry as LOCATED_UNMAPPED stubs
//     (name: null + handler hint), never silently dropped.
//   - Byte values are ROM glyph/opcode bytes ($xx), not ASCII — the USA
//     charset is region-specific and does NOT transfer to Spain (which needs
//     ¡¿áéíóúñü, absent from the USA 7-bit-ish table).
// ═══════════════════════════════════════════════════════════════════════

// ── Evidence classification (Story-specific) ──

export type StoryEvidence =
  | 'ROM_STATIC_VERIFIED'    // Named & confirmed against ROM structures/dispatcher
  | 'HIGH_CONFIDENCE_STATIC' // Provisional name, strong evidence, not final
  | 'SEEN_UNMAPPED'          // Opcode observed in streams, semantics not assigned
  | 'LOCATED_UNMAPPED';      // Handler located, semantics still unknown

// ── Story VM core ──

export interface StoryVmRegister {
  /** WRAM address (hex, e.g. 0xC501) */
  address: number;
  /** Canonical name */
  name: string;
  /** Width in bytes */
  width: 1 | 2;
  description: string;
}

export const STORY_VM_REGISTERS: readonly StoryVmRegister[] = [
  { address: 0xc501, name: 'SCRIPT_BANK',         width: 1, description: 'Active script bank' },
  { address: 0xc502, name: 'SCRIPT_BASE_LO',      width: 1, description: 'Script base (low byte; C502/C503 pair)' },
  { address: 0xc503, name: 'SCRIPT_BASE_HI',      width: 1, description: 'Script base (high byte)' },
  { address: 0xc504, name: 'PROGRAM_COUNTER_LO',  width: 1, description: 'Program counter (low byte)' },
  { address: 0xc505, name: 'PROGRAM_COUNTER_HI',  width: 1, description: 'Program counter (high byte)' },
  { address: 0xc506, name: 'CURRENT_OPCODE',      width: 1, description: 'Current opcode byte' },
  { address: 0xc507, name: 'ACTIVE_HANDLER',      width: 1, description: 'Active handler id' },
  { address: 0xc508, name: 'VM_STACK',            width: 1, description: 'VM stack pointer / stack' },
  { address: 0xc509, name: 'HANDLER_SUBSTATE',    width: 1, description: 'Handler substate (FSM step)' },
  { address: 0xc50a, name: 'TEMP_BASE',           width: 1, description: 'Temporary variables (C50A+)' },
  { address: 0xc50c, name: 'CHOICE_MODE',         width: 1, description: 'Choice mode/config ($15 → C50C)' },
  { address: 0xc50e, name: 'CHOICE_BRANCH_TARGETS', width: 1, description: 'Choice branch targets base ($16: C50E + optionIndex×2)' },
  { address: 0xc517, name: 'TEMP_C517',           width: 1, description: 'Referenced by $35 (arg3)' },
  { address: 0xc51c, name: 'TEMP_C51C',           width: 1, description: 'Referenced by $35 (arg1)' },
  { address: 0xc51d, name: 'TEMP_C51D',           width: 1, description: 'Referenced by $35 (arg2)' },
  { address: 0xc51f, name: 'TEMP_C51F',           width: 1, description: 'Referenced by $3F; also speaker/UI related' },
] as const;

// ── Story VM dispatch ──

export interface StoryVmDispatch {
  dispatcher: number;   // ROM0 address of the opcode dispatcher
  jumpTable: number;    // jump table base (opcode×2 indexed)
  evaluator: number;    // ROM0 address of the operand evaluator
  opcodeMaxObserved: number; // highest opcode observed in streams ($47)
  opcodeMaxDumped: number | null; // true max once jump table is dumped (null = not yet)
}

export const STORY_VM_DISPATCH: StoryVmDispatch = {
  dispatcher: 0x18c9, // ROM0:$18C9 — read opcode → opcode×2 → jump table → handler
  jumpTable: 0xc532,  // jump table base (opcode × 2)
  evaluator: 0x16f2,  // ROM0:$16F2 — operand evaluator (literals/WRAM/expr/cmp/bool)
  opcodeMaxObserved: 0x47,
  opcodeMaxDumped: null, // TODO(H0/user): dump $C532 + opcode×2 over full range
};

// ── Operand evaluator (ROM0:$16F2) ──
//
// ⚠ CORRECTION (pass 5): the earlier encoding was SHIFTED by +1. The correct
// arithmetic/relational block is $85..$8B. $84 (formerly ADD) is now unassigned.
// The bitwise/bool block $8C..$90 was derived from the PRE-SHIFT encoding and is
// PENDING re-verification (its exact placement is not yet re-confirmed).

export type StoryOperandKind =
  | 'LITERAL_16'   // 16-bit literal
  | 'WRAM_C0'      // WRAM $C0xx
  | 'WRAM_C1'      // WRAM $C1xx
  | 'EXPRESSION'   // nested expression
  | 'COMPARISON'   // relational op
  | 'BOOLEAN';     // logical/boolean op

export type StoryEvaluatorEvidence =
  | 'ROM_STATIC_VERIFIED' // confirmed in pass 5 (corrected table)
  | 'PENDING_REVERIFY';   // derived from pre-shift encoding; re-verify

export interface StoryEvaluatorOp {
  opcode: number;   // byte value
  name: string;
  kind: 'ARITHMETIC' | 'RELATIONAL' | 'BITWISE' | 'BOOLEAN';
  operands: 2;
  evidence: StoryEvaluatorEvidence;
}

export const STORY_EVALUATOR_OPS: readonly StoryEvaluatorOp[] = [
  // ── CORRECTED (pass 5): arithmetic/relational $85..$8B ──
  { opcode: 0x85, name: 'ADD',      kind: 'ARITHMETIC', operands: 2, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x86, name: 'SUB',      kind: 'ARITHMETIC', operands: 2, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x87, name: 'LT',       kind: 'RELATIONAL', operands: 2, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x88, name: 'LTE',      kind: 'RELATIONAL', operands: 2, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x89, name: 'GT',       kind: 'RELATIONAL', operands: 2, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x8a, name: 'GTE',      kind: 'RELATIONAL', operands: 2, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x8b, name: 'EQ',       kind: 'RELATIONAL', operands: 2, evidence: 'ROM_STATIC_VERIFIED' },
  // ── PENDING re-verification (pre-shift encodings) ──
  { opcode: 0x8c, name: 'AND',      kind: 'BITWISE',    operands: 2, evidence: 'PENDING_REVERIFY' },
  { opcode: 0x8d, name: 'XOR',      kind: 'BITWISE',    operands: 2, evidence: 'PENDING_REVERIFY' },
  { opcode: 0x8e, name: 'OR',       kind: 'BITWISE',    operands: 2, evidence: 'PENDING_REVERIFY' },
  { opcode: 0x8f, name: 'BOOL_AND', kind: 'BOOLEAN',    operands: 2, evidence: 'PENDING_REVERIFY' },
  { opcode: 0x90, name: 'BOOL_OR',  kind: 'BOOLEAN',    operands: 2, evidence: 'PENDING_REVERIFY' },
] as const;

/** $84 was formerly ADD under the pre-shift table; now unassigned. */
export const EVALUATOR_UNASSIGNED = { opcode: 0x84, formerName: 'ADD', note: 'unassigned after +1 shift; identity pending' } as const;

// ── Story opcode grammar ──

export type StoryOpcodeCategory =
  | 'CONTROL'       // flow: set-var / branch / jump / call / return / delay
  | 'CHOICE'        // $15/$16/$17 choice subsystem
  | 'TEXT'          // print / confirm / wait-input / window lifecycle
  | 'AUDIO'         // bgm / sfx / audio-state
  | 'LINK_SYSTEM'   // $0F/$1C/$1F link-cable + system menu/session
  | 'BATTLE'        // $20-$27 battle + reward + opponent + link sync
  | 'CARD_DECK'     // $28/$38 card trade + give-card
  | 'MAP'           // $29-$2F story map runtime
  | 'GFX'           // gfx / tilemap / palette / bg-scroll / scene
  | 'PROGRESSION'   // $39 persistence dispatcher
  | 'SAVE'          // $3B/$3C/$3D SRAM save/load/validate
  | 'PRE_BATTLE'    // $3F pre-battle system screen
  | 'BATTLE_MODE'   // $45 win-streak display
  | 'CREDITS'       // $46/$47
  | 'PORTRAIT'      // portrait load / region transition
  | 'SPEAKER'       // nameplate / speaker UI
  | 'UNKNOWN';      // seen or located but not yet assigned

export interface StoryHandlerHint {
  /** ROM bank where the handler/helper lives (hex) */
  bank: number | null;
  /** ROM address (hex) */
  address: number | null;
  /** Human-readable trail (e.g. FSM step chain) */
  trail: string;
}

export interface StoryOpcode {
  opcode: number;                 // byte value ($xx)
  name: string | null;            // null = unnamed (pending)
  operands: string | null;        // human operand signature (null = unknown)
  category: StoryOpcodeCategory;
  evidence: StoryEvidence;
  handler: StoryHandlerHint | null;
  description: string;
}

export const STORY_OPCODES: readonly StoryOpcode[] = [
  // ── CONTROL ──
  { opcode: 0x01, name: 'SET_VAR', operands: 'var, value', category: 'CONTROL', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Assign a variable (value may be an $16F2-evaluated expression).' },
  { opcode: 0x02, name: 'BRANCH_IF_ZERO', operands: 'cond, target', category: 'CONTROL', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Conditional jump when condition evaluates to zero/false (JUMP_IF_FALSE).' },
  { opcode: 0x03, name: 'JUMP', operands: 'target', category: 'CONTROL', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Unconditional jump.' },
  { opcode: 0x08, name: 'LOAD_SCRIPT', operands: 'bank, addr', category: 'CONTROL', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Script context switch / load another script (SCRIPT_CONTEXT_SWITCH).' },
  { opcode: 0x09, name: 'CALL', operands: 'target', category: 'CONTROL', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Subroutine call (pushes return address onto VM stack).' },
  { opcode: 0x0a, name: 'RETURN', operands: null, category: 'CONTROL', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Return from subroutine (pops VM stack).' },
  { opcode: 0x0b, name: 'DELAY', operands: 'ticks', category: 'CONTROL', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Delay / wait for N ticks.' },

  // ── TEXT ──
  { opcode: 0x0e, name: 'TEXT_CONFIRM_AND_ADVANCE', operands: null, category: 'TEXT', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Poll input, then advance/clear the textbox area.' },
  { opcode: 0x10, name: 'PRINT_TEXT', operands: 'length, glyph[length]', category: 'TEXT', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Literal text: opcode $10 <length> <glyphs...> (exact ROM dialogue bytes).' },
  { opcode: 0x11, name: 'WAIT_CONFIRM_INPUT', operands: null, category: 'TEXT', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Wait for confirm input. Bit NOT yet labeled BUTTON_A (input map pending).' },

  // ── TEXT WINDOW lifecycle ──
  { opcode: 0x12, name: 'PAGE_ADVANCE', operands: null, category: 'TEXT', evidence: 'HIGH_CONFIDENCE_STATIC', handler: null,
    description: 'Advance to next text page. (Behavioral name; not ROM-structure confirmed yet.)' },
  { opcode: 0x13, name: 'OPEN_WINDOW', operands: null, category: 'TEXT', evidence: 'HIGH_CONFIDENCE_STATIC', handler: null,
    description: 'Open the dialogue window. (Behavioral name; not ROM-structure confirmed yet.)' },
  { opcode: 0x14, name: 'CLOSE_WINDOW', operands: null, category: 'TEXT', evidence: 'HIGH_CONFIDENCE_STATIC', handler: null,
    description: 'Close the dialogue window. (Seen closing the trade window before $28.)' },

  // ── CHOICE ──
  { opcode: 0x15, name: 'INIT_CHOICE', operands: 'mode/config', category: 'CHOICE', evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 0, address: 0x1b76, trail: 'jump table → ROM0:$1B76' },
    description: 'Init a choice: mode/config → C50C; optionCount=0; input/UI state reset.' },
  { opcode: 0x16, name: 'ADD_CHOICE_OPTION', operands: 'branchTarget, optionText[N]', category: 'CHOICE', evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 0, address: 0x1b8a, trail: 'jump table → ROM0:$1B8A' },
    description: 'Add option: branchTarget → C50E + optionIndex×2; consumes the FULL N option-text bytes (parser fix: NOT N-1); optionCount++.' },
  { opcode: 0x17, name: 'RUN_CHOICE_AND_BRANCH', operands: null, category: 'CHOICE', evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 0, address: 0x1c18, trail: 'jump table → ROM0:$1C18; branch via $184F' },
    description: 'Open/run choice; C445 = selectedOptionIndex; target = C50E[sel]; $184F sets Story PC.' },

  // ── AUDIO ──
  { opcode: 0x18, name: 'WAIT_AUDIO_STATE', operands: null, category: 'AUDIO', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Wait for an audio state/queue condition.' },
  { opcode: 0x19, name: 'PLAY_BGM', operands: 'musicId', category: 'AUDIO', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Play BGM/jingle: bgmId → Bank7E:$42A9 → BGM_TABLE (bank @ $42B8, pointer @ $42CC, 20 IDs 00..19) → audio engine $40A6 → $4067 enable. See BGM_TABLE. Do NOT assign human track names (Title/Battle) until cross-referenced with callsites.' },
  { opcode: 0x1a, name: 'STOP_BGM', operands: null, category: 'AUDIO', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Stop current BGM: same audio engine with A=0 (stop).' },
  { opcode: 0x1b, name: 'PLAY_SFX', operands: 'sfxId', category: 'AUDIO', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Queue SFX: B=1 (delay), C=sfxId → Bank7A:$5015 → queue C950+ → SE engine. Catalog = Bank79:$5000 ("SE" header, offset table, first resource $50AE → 85 IDs 0..84). See SFX_CATALOG / SFX_KNOWN_SEMANTICS.' },

  // ── LINK / SYSTEM ──
  { opcode: 0x0f, name: 'SYSTEM_MENU', operands: null, category: 'LINK_SYSTEM', evidence: 'HIGH_CONFIDENCE_STATIC', handler: null,
    description: 'System menu (link-cable / system subsystem; named in VM summary table).' },
  { opcode: 0x1c, name: 'LINK_HANDSHAKE', operands: null, category: 'LINK_SYSTEM', evidence: 'HIGH_CONFIDENCE_STATIC', handler: null,
    description: 'Link-cable handshake (named in VM summary table).' },
  { opcode: 0x1f, name: 'NEW_SESSION_STATE', operands: null, category: 'LINK_SYSTEM', evidence: 'HIGH_CONFIDENCE_STATIC', handler: null,
    description: 'New session state (named in VM summary table).' },

  // ── BATTLE ──
  { opcode: 0x20, name: 'INIT_BATTLE', operands: null, category: 'BATTLE', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Initialize battle (Story → battle trigger).' },
  { opcode: 0x21, name: 'RUN_BATTLE', operands: null, category: 'BATTLE', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Run battle until resolution.' },
  { opcode: 0x22, name: 'RESET_ACTION_PRESENTATION_RUNTIME_AFTER_BATTLE', operands: null, category: 'BATTLE', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Post-battle cleanup: ActionObject 0+1 (2×19 bytes), animation state/queues, callback table C240.' },
  { opcode: 0x23, name: 'CONFIGURE_ENEMY_MEMBER_WITH_PER_STAT_GROWTH_LEVELS', operands: 'memberIndex, fighter/formId, hpGrowthLevel, strGrowthLevel, kiGrowthLevel, spdGrowthLevel', category: 'BATTLE', evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 2, address: 0x4000, trail: 'arg1→CA0B; arg2→fighter/form; arg3..6→C0F9..C0FC; Bank2:$4000 builds member record' },
    description: 'Configure enemy member with PER-STAT growth levels (NOT generic tuneA-D). arg1→CA0B (member index); arg2→fighter/form id; arg3→C0F9=HP_GROWTH_LEVEL, arg4→C0FA=STR_GROWTH_LEVEL, arg5→C0FB=KI_GROWTH_LEVEL, arg6→C0FC=SPD_GROWTH_LEVEL. Bank2:$4000 uses each individually to build the 13-byte member record (CB47+memberIndex→CC01). CA52 += hp+str+ki+spd+1 (aggregate level). Proof (Android 16, n=0..4): HP=110+15n (110/125/140/155/170), STR=(16+8n)-floor((16+8n)/4) (12/18/24/30/36), KI=(16+4n)-floor((16+4n)/4) (12/15/18/21/24), SPD=7+4n (7/11/15/19/23) — matches roster curves byte-for-byte.' },
  { opcode: 0x24, name: 'ENEMY_PRESET', operands: 'enemyPresetId', category: 'BATTLE', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Set enemy preset (same preset IDs feed $25 reward generation).' },
  { opcode: 0x25, name: 'RUN_POST_BATTLE_CARD_REWARD', operands: 'enemyPresetId', category: 'BATTLE', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Post-battle card reward: 2/3 candidates → CEA7..CEA9 → selector → CE7B=chosen → cardId=CEA7[idx] → ++CDF3[cardId-1] (max 9 copies).' },
  { opcode: 0x26, name: 'LINK_BATTLE_SYNC', operands: null, category: 'BATTLE', evidence: 'HIGH_CONFIDENCE_STATIC', handler: null,
    description: 'Link-cable battle sync (named in VM summary table).' },
  { opcode: 0x27, name: 'GENERATE_MATCHED_RANDOM_ENEMY_FROM_PLAYER_FORM', operands: null, category: 'BATTLE', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Battle Mode enemy: player form=CB1A → compatible table → RNG → enemy form → CB47=enemyFormId → profile → tuning → stats.' },

  // ── CARD / DECK ──
  { opcode: 0x28, name: 'RUN_CARD_TRADE_UI', operands: null, category: 'CARD_DECK', evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 2, address: 0x55aa, trail: '→ Bank2:$55AA card trade/management FSM' },
    description: 'Link/Card Trade UI FSM (CDF3 inventory, CDDF deck, browser/select, inc/dec, gfx). NOT used by normal campaign — only the Link/Card Trade flow ("Select a card to trade.").' },
  { opcode: 0x38, name: 'GIVE_CARD', operands: null, category: 'CARD_DECK', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Give a card (card/deck subsystem).' },

  // ── STORY MAP ──
  { opcode: 0x29, name: 'INIT_STORY_MAP_RUNTIME', operands: null, category: 'MAP', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Init map runtime: CA00, CA10.., CA5C, C0AE, C0BE, map callbacks, map state, entity/runtime data; loads scene template.' },
  { opcode: 0x2a, name: 'RUN_STORY_MAP_RUNTIME_UNTIL_EXIT', operands: null, category: 'MAP', evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 3, address: 0x6964, trail: '→ Bank3:$6964 map FSM' },
    description: 'Map FSM: input, movement, collision/interactions, entities, coordinates, ActionObjects, exit conditions.' },
  { opcode: 0x2b, name: 'RESET_STORY_PRESENTATION_RUNTIME', operands: null, category: 'MAP', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Full scene teardown: $22 core (ActionObjects + animation + callbacks) + SCX=0 + SCY=0.' },
  { opcode: 0x2c, name: 'CONFIGURE_STORY_MAP_TRIGGER', operands: 'mode, eventId, tileX, tileY, c1xxGateOffset', category: 'MAP', evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 3, address: 0x6f4d, trail: 'mode $0A → Bank3:$6F32 (clear); mode $14 → Bank3:$6F4D (register CA6A record)' },
    description: 'Configure Story Map triggers (8-record × 4-byte table at CA6A). MODE $14 REGISTER_STORY_MAP_TRIGGER: find a free record, write +0=tileY, +1=tileX, +2=c1xxGateOffset, +3=eventId. MODE $0A CLEAR_STORY_MAP_TRIGGER_BY_EVENT_ID: zero the record whose +3==eventId; eventId=0 clears all 32 bytes. Tile→world: tileY<<4, tileX<<4 (16×16 px cells). Gate: record+2!=0 → accept only when WRAM[$C100+record+2]==0; record+2==0 → require C012 & $10. On fire: C0AF=eventId, C0A1=0.' },
  { opcode: 0x2d, name: 'CONFIGURE_STORY_MAP_PLAYER_ACTOR', operands: 'mode, arg, [arg2]', category: 'MAP', evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 3, address: 0x6d9a, trail: 'mode $0A → Bank3:$6D05 (sprite resource); mode $19 → Bank3:$6D9A (tile pos); mode $1E → Bank3:$6DC2 → $6A86 (facing)' },
    description: 'Configure map player actor. MODE $19 SET_STORY_PLAYER_TILE_POSITION: arg1=tileX, arg2=tileY → worldX=tileX<<4, worldY=tileY<<4 → CA65/66=worldX, CA63/64=worldY. MODE $1E SET_STORY_PLAYER_DIRECTION: arg=direction → CA67=direction, C3C7=direction-1 (1=RIGHT 2=LEFT 3=UP 4=DOWN) + gfx/camera update. MODE $0A SET_STORY_PLAYER_MAP_SPRITE_RESOURCE: arg=mapSpriteResourceId → Bank $12 table → avatar gfx load (identity table still pending).' },
  { opcode: 0x2e, name: 'CONFIGURE_STORY_MAP_ENTITY', operands: 'mode, entityId, ...', category: 'MAP', evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 3, address: 0x7048, trail: 'accessor Bank3:$7048: address = CA06 + entityId×10 (entityId 1..7 → CA10..CA55); mode $0A → Bank3:$6CA8 (gfx) + $0B async continuation' },
    description: 'Configure map entity (NPC). 10-byte record at CA06 + entityId×10 (entityId 1..7 → records CA10..CA55; CA06..CA0F is NOT NPC 1, it is other submotor vars). MODE $19 SET_STORY_ENTITY_TILE_POSITION: entityId, tileX, tileY → record+1..2=worldY, +3..4=worldX (×16). MODE $14 MODIFY_STORY_ENTITY_FLAGS: entityId, bitMask, operation → clear/set record+0. MODE $0A SET_STORY_ENTITY_MAP_SPRITE_RESOURCE: entityId, mapSpriteResourceId → Bank3:$6CA8 → Bank $12 descriptor → gfx transfer ($0B = async continuation waiting transfer). MODE $1E SET_STORY_ENTITY_DIRECTION → record+7.' },
  { opcode: 0x2f, name: 'CONFIGURE_STORY_MAP_SCENE', operands: 'mode, ...', category: 'MAP', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Configure map scene/graphics/camera. Modes $10/$20/$25/$30 (see STORY_MAP_SCENE_MODES).' },

  // ── GFX ──
  { opcode: 0x30, name: null, operands: null, category: 'GFX', evidence: 'SEEN_UNMAPPED', handler: null,
    description: 'Wipe/display operation; exact visual direction (slide/fade/wipe) pending.' },
  { opcode: 0x31, name: 'LOAD_GFX_RESOURCE_TO_8800', operands: 'bank, index', category: 'GFX', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Load graphics resource into VRAM $8800.' },
  { opcode: 0x32, name: 'SET_TILEMAP_DESCRIPTOR', operands: 'bank, index', category: 'GFX', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Set active tilemap descriptor.' },
  { opcode: 0x33, name: 'TILEMAP_RECT_TRANSITION', operands: 'x0, y0, x1, y1', category: 'GFX', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Tilemap rectangle transition (rect wipe).' },
  { opcode: 0x34, name: 'SET_BG_SCROLL', operands: 'scx, scy', category: 'GFX', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Set background scroll.' },
  { opcode: 0x35, name: null, operands: 'arg1, arg2, arg3', category: 'GFX', evidence: 'LOCATED_UNMAPPED',
    handler: { bank: 1, address: 0x4000, trail: 'arg1→C51C, arg2→C51D, arg3→C517; expects gfx flags' },
    description: '3 args → Bank1:$4000. Complex scene/display op. NOT named yet.' },
  { opcode: 0x36, name: 'FILL_PALETTE_ENTRIES', operands: 'mask, color', category: 'GFX', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Fill palette entries (mask + color).' },
  { opcode: 0x37, name: null, operands: null, category: 'GFX', evidence: 'SEEN_UNMAPPED', handler: null,
    description: 'Wipe/display family; exact visual direction pending.' },

  // ── PROGRESSION / PERSISTENCE ──
  { opcode: 0x39, name: 'RUN_PERSISTENCE_OPERATION', operands: 'mode, arg', category: 'PROGRESSION', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Persistence dispatcher over persistent progression/flags/presets/unlocks (not a single function). Submodes: $10=INITIALIZE_GIVE_TUTORIAL_CARD_COLLECTION_DECK_PRESET (Bank7E:$4680, STATIC); $11=INSTALL_VEGITO_PERSISTENT_PROGRESSION_PRESET (source Bank7E:$4DFB, schema CCBE..CCC4). See STORY_PERSISTENCE_OPS.' },

  // ── UNKNOWN ──
  { opcode: 0x3a, name: null, operands: null, category: 'UNKNOWN', evidence: 'LOCATED_UNMAPPED',
    handler: { bank: 2, address: 0x5397, trail: '→ Bank2:$5397 (overlaps $3C(1) new-game init FSM)' },
    description: '→ Bank2:$5397. Helper pending; overlaps the $3C(1) new-game initialization FSM.' },

  // ── SAVE (SRAM) ──
  { opcode: 0x3b, name: 'VALIDATE_SAVE_DATA_AND_STORE_STATUS', operands: null, category: 'SAVE', evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 0, address: 0x12c6, trail: '→ ROM0:$12C6 (VALIDATE); SRAM marker/version/checksum' },
    description: 'Validate SRAM save data and store status.' },
  { opcode: 0x3c, name: 'RUN_SESSION_LOAD_OPERATION', operands: 'mode', category: 'SAVE', evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 0, address: 0x12ba, trail: 'mode 0 → ROM0:$12BA (LOAD, returns); nonzero → store mode in C022, C069=0, Bank2:$5397 FSM (UI/transition) → ROM0:$12BA (LOAD) → wait → C009=1 (Bank02:$543D) → soft session restart' },
    description: 'Session LOAD dispatcher (NOT new-game init, NOT full reset). Mode 0 = LOAD_SRAM_IMMEDIATE (ROM0:$12BA, returns). Nonzero = RUN_INTERACTIVE_SESSION_LOAD_AND_SOFT_RESTART: store mode in C022 (SESSION_LOAD_CONTEXT_MODE), C069=0, run Bank2:$5397 FSM (UI/transition), end at ROM0:$12BA (LOAD SRAM), then C009=1 → main loop reads C009 at $01BC → soft session reinit ($0178). C022 controls whether session context fields (C060/C061) are restored. See STORY_SESSION_LOAD_MODES.' },
  { opcode: 0x3d, name: 'SAVE_GAME_TO_SRAM', operands: null, category: 'SAVE', evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 0, address: 0x12ae, trail: '→ ROM0:$12AE (SAVE)' },
    description: 'Save game to SRAM.' },

  // ── SCENE ──
  { opcode: 0x3e, name: 'LOAD_SCENE_RESOURCE', operands: 'bank, index', category: 'GFX', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Load scene resource. Neutral name: background vs composition vs tilemap not yet separated per callsite.' },

  // ── PRE-BATTLE ──
  { opcode: 0x3f, name: 'RUN_PRE_BATTLE_SYSTEM_SCREEN', operands: null, category: 'PRE_BATTLE', evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 2, address: 0x40ff, trail: '→ Bank2:$40FF System Screen FSM' },
    description: 'Pre-battle System Screen FSM: cards / deck / members / pre-battle config / "Check your cards by selecting List". Resolves C070/CDCD persistence/sync vars. Typical flow: PLAY_BGM $0A → $3F → STOP_BGM → $20.' },

  // ── PORTRAIT ──
  { opcode: 0x40, name: 'PORTRAIT_LOAD', operands: 'slot, portraitResourceId', category: 'PORTRAIT', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Load/show portrait. bank=$70+floor(id/$1C), local=id%$1C; slot0→$8800, slot1→$8A30.' },
  { opcode: 0x41, name: 'PORTRAIT_REGION_CLEAR', operands: 'mode', category: 'PORTRAIT', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Portrait region clear/transition (async job). Slide/fade geometry NOT yet named.' },

  // ── SPEAKER ──
  { opcode: 0x42, name: 'SET_SHOW_SPEAKER_EXCLUSIVE', operands: 'side, speakerId', category: 'SPEAKER', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Set/show speaker exclusively: operates first on the OPPOSITE side, then presents the selected speaker. Loads nameplate tiles (Bank10:$5000 + id×$60).' },
  { opcode: 0x43, name: 'CLEAR_SPEAKER_UI', operands: null, category: 'SPEAKER', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Clear/reset BOTH speaker UI sides.' },
  { opcode: 0x44, name: 'SHOW_SECOND_SPEAKER_PRESERVE_OTHER', operands: 'side, speakerId', category: 'SPEAKER', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Show a second speaker WITHOUT clearing the other side (keeps two simultaneous participants). Used as $42(A) then $44(B). Visible motion (slide/fade/wipe) not named.' },

  // ── BATTLE MODE ──
  { opcode: 0x45, name: 'DRAW_BATTLE_MODE_WIN_STREAK', operands: null, category: 'BATTLE_MODE', evidence: 'ROM_STATIC_VERIFIED', handler: null,
    description: 'Converts C043 (BATTLE_MODE_CONSECUTIVE_WINS) to decimal and draws 3 digits.' },

  // ── CREDITS ──
  { opcode: 0x46, name: 'LOAD_CREDITS_FONT', operands: null, category: 'CREDITS', evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 0x17, address: 0x7b00, trail: 'loads credits font Bank17:$7B00 → VRAM' },
    description: 'Load the credits font from Bank17:$7B00 into VRAM.' },
  { opcode: 0x47, name: 'DRAW_CREDITS_LINE', operands: 'x, creditsLineId', category: 'CREDITS', evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 0x10, address: 0x7700, trail: 'line table Bank10:$7700; 20 tiles at X' },
    description: 'Draw a credits line (20 tiles) at X, from table Bank10:$7700 (STAFF/PRODUCER/names...). Bank7D chunk 4 = ending → credits → post-clear unlocks.' },
] as const;

// ── Story map entity record (opcode $2E) ──

export const STORY_MAP_ENTITY_RECORD = {
  sizeBytes: 10,
  /** Accessor Bank3:$7048: address = CA06 + entityId×10 (entityId 1..7 → CA10..CA55). CA06..CA0F is NOT NPC 1. */
  resolver: 'Bank3:$7048: CA06 + entityId × 10 (entityId 1..7 → records CA10..CA55)',
  fields: {
    flags: '+00 (bit7=$80 ACTIVE/VISIBLE + autonomous animation; bit1=$02 direction override → RIGHT; bit0=$01 COLLIDABLE; bits 2..6 no observed consumers)',
    worldY: '+01/+02 (16-bit; set by $2E($19) as tileY<<4)',
    worldX: '+03/+04 (16-bit; set by $2E($19) as tileX<<4)',
    animationTick: '+05 (increments while flags&$80; resets to 0 every 40 ticks)',
    animationTilePhase: '+06 (phase, toggled ^= $04 every 40 ticks; renderer: tileIndex = baseTileIndex + animationTilePhase + directionOffset)',
    direction: '+07 (direction/visual state)',
    baseTileIndex: '+08 (renderer consumes as baseTileIndex)',
    baseOamAttributes: '+09 (renderer consumes as baseOamAttributes)',
  },
  modes: {
    '0x0a': 'SET_STORY_ENTITY_MAP_SPRITE_RESOURCE: entityId, mapSpriteResourceId → Bank3:$6CA8 → Bank $12 descriptor → gfx transfer ($0B = async continuation)',
    '0x14': 'MODIFY_STORY_ENTITY_FLAGS: clear/set record+0 by (bitMask, operation)',
    '0x19': 'SET_STORY_ENTITY_TILE_POSITION: tileX,tileY → worldX/worldY (×16)',
    '0x1e': 'SET_STORY_ENTITY_DIRECTION → record+7',
  },
} as const;

export type MapSpriteResourceKind = 'CHARACTER' | 'OBJECT' | 'EFFECT' | 'MARKER' | 'UNKNOWN';

export const STORY_MAP_SPRITE_RESOURCE_TABLE = {
  bank: 0x12,
  resourceCount: 43,
  normalResourceLayout: {
    paletteCount: 'u8',
    paletteBytes: 'paletteCount × 8 bytes BGR555',
    tileCount: 'u8',
    tileBytes: 'tileCount × 16 bytes 2bpp',
  },
  commonNormalTileCount: 24,
  commonNormalFrames: '24 tiles → 6 frames × 16×16',
  smallResourceTileCount: 8,
  smallResourceFrames: '8 tiles → 2 frames',
  kindModel: 'Bank12 mapSpriteResourceId is a render resource, not necessarily a character identity.',
  allowedKinds: ['CHARACTER', 'OBJECT', 'EFFECT', 'MARKER', 'UNKNOWN'] as readonly MapSpriteResourceKind[],
  identityRule: 'Only CHARACTER resources may receive canonical characterIdentity; high IDs include objects/markers/environment/FX.',
  evidence: 'ROM_STATIC_VERIFIED',
} as const;

// ── Story map scene modes (opcode $2F) ──

export const STORY_MAP_SCENE_MODES = {
  '0x10': 'resourceId → Bank $13 → load gfx $8800 → wait completion → descriptor/tilemap',
  '0x20': 'set C0B1/C0B2 bank/chunk selectors',
  '0x25': 'two 16-bit values → CA02/CA03 (horizontal bound) + CA04/CA05 (vertical bound); consumed by $6A86 camera clamp',
  '0x30': 'finalize/apply map resource + recalc camera/motion state',
} as const;

export const STORY_MAP_CAMERA_CLAMP = {
  x: 'cameraX = clamp(playerWorldX - $48, 0, CA02/CA03)',
  y: 'cameraY = clamp(playerWorldY - $50, 0, CA04/CA05)',
  consumer: '$6A86',
} as const;

// ── Story map trigger table (opcode $2C) ──

export const STORY_MAP_TRIGGER_TABLE = {
  baseAddress: 0xca6a,
  recordCount: 8,
  recordSizeBytes: 4,
  totalBytes: 32,
  resolver: 'CA6A + recordIndex × 4',
} as const;

export const STORY_MAP_TRIGGER_RECORD = {
  fields: {
    tileY: '+0 (tileY; world = tileY << 4)',
    tileX: '+1 (tileX; world = tileX << 4)',
    c1xxGateOffset: '+2 (0 = action/input gate C012 & $10; !=0 = require WRAM[$C100+offset]==0)',
    eventId: '+3 (delivered to Story layer on fire: C0AF=eventId, C0A1=0)',
  },
  modes: {
    '0x0a': 'CLEAR_STORY_MAP_TRIGGER_BY_EVENT_ID (eventId=0 → clear all 8 records)',
    '0x14': 'REGISTER_STORY_MAP_TRIGGER (eventId, tileX, tileY, c1xxGateOffset)',
  },
} as const;

// ── Enemy member record (opcode $23) ──

export const ENEMY_MEMBER_RECORD = {
  sizeBytes: 13,
  resolver: '$23: CB47 + memberIndex → CC01',
  fields: {
    maxLife: '+00/+01 (16-bit)',
    currentLife: '+02/+03 (16-bit; init currentLife = maxLife; KO at currentLife == 0)',
    strength: '+04',
    ki: '+05',
    speed: '+06',
    statusAndOther: '+07..+12 (status/other fields; pending)',
  },
} as const;

// ── Persistence dispatcher submodes (opcode $39) ──

export interface StoryPersistenceSubOp {
  mode: number;      // submode byte ($10 / $11)
  arg: number;       // second arg (0)
  name: string;
  evidence: StoryEvidence;
  handler: StoryHandlerHint | null;
  description: string;
}

export const STORY_PERSISTENCE_OPS: readonly StoryPersistenceSubOp[] = [
  {
    mode: 0x10, arg: 0,
    name: 'INITIALIZE_GIVE_TUTORIAL_CARD_COLLECTION_DECK_PRESET',
    evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 0x7e, address: 0x4680, trail: '→ Bank7E:$4680' },
    description: 'After "You got one!!": copies 38 bytes → CDCD..CDF2 and sets concrete CDF3 quantities. The 38-byte block is a battle-loadout preset: 3 fighter IDs + 15 Limit Attack IDs + 20 deck card IDs (NOT a 38-byte deck).',
  },
  {
    mode: 0x11, arg: 0,
    name: 'INSTALL_VEGITO_PERSISTENT_PROGRESSION_PRESET',
    evidence: 'ROM_STATIC_VERIFIED',
    handler: { bank: 0x7e, address: 0x4dfb, trail: 'source Bank7E:$4DFB; 7 bytes 04 00 00 01 01 01 01 → CCBE..CCC4 (persistent record 10, offsets +1..+7)' },
    description: 'After "Vegito can take lead.": copies 7 bytes from Bank7E:$4DFB → CCBE..CCC4 (persistent record 10, offsets +1..+7). Bytes 04 00 00 01 01 01 01 = level 4, experience 0, hpGrowth 1, strGrowth 1, kiGrowth 1, spdGrowth 1. See VEGITO_PERSISTENT_PROGRESSION_PRESET / PERSISTENT_RECORD.',
  },
] as const;

// ── Persistent progression record (16-byte records at CC1D) ──

export const PERSISTENT_RECORD = {
  baseAddress: 0xcc1d,
  recordSizeBytes: 16,
  /** CCBE = CC1D + 10×16 + 1 → record 10, offsets +1..+7 (the Vegito preset). */
  resolver: 'CC1D + recordIndex × 16',
  fields: {
    flags: '+00',
    level: '+01 (level; max 4)',
    experience: '+02/+03 (16-bit; cap 500)',
    hpGrowthLevel: '+04',
    strGrowthLevel: '+05',
    kiGrowthLevel: '+06',
    spdGrowthLevel: '+07',
    limitCount: '+08 (number of Limit Attack IDs installed for this fighter)',
    limitAttackIds: '+09..+13 (5 Limit Attack ID slots; copied into CDD0/CDD5/CDDA then CB1D..CB2B for 3 fighters)',
    reservedZero: '+14 (observed reserved zero)',
    paddingOrNoConsumer: '+15 (padding / no consumer located)',
  },
} as const;

// CDCD..CDF2 is the 38-byte pre-battle loadout block, not one monolithic deck.
export const STORY_BATTLE_LOADOUT_PRESET = {
  baseAddress: 0xcdcd,
  totalBytes: 38,
  fighterIds: { offset: 0, count: 3, range: 'CDCD..CDCF' },
  limitAttackIds: { offset: 3, count: 15, fighters: 3, slotsPerFighter: 5, range: 'CDD0..CDDE' },
  deckCardIds: { offset: 18, count: 20, range: 'CDDF..CDF2' },
  destinations: {
    limitStage: ['CDD0', 'CDD5', 'CDDA'] as const,
    battleLimitRange: 'CB1D..CB2B',
  },
  evidence: 'ROM_STATIC_VERIFIED',
  source: 'Pass 9 static RE: persistent fighter record +08/+09..+13 feed CDD0/CDD5/CDDA then CB1D..CB2B; CDDF..CDF2 are the 20 deck card IDs.',
} as const;

// EXP curve (ROM code demonstrated): cap 500, max level 4.
export const PERSISTENT_LEVEL_EXP_THRESHOLDS = {
  level0To1: 3,
  level1To2: 15,
  level2To3: 50,
  level3To4: 500,
  expCap: 500,
  maxLevel: 4,
} as const;

// Vegito persistent progression preset = record 10, offsets +1..+7.
export const VEGITO_PERSISTENT_PROGRESSION_PRESET = {
  recordIndex: 10,
  baseAddress: 0xccbe, // CC1D + 10×16 + 1
  bytes: [0x04, 0x00, 0x00, 0x01, 0x01, 0x01, 0x01] as readonly number[],
  schema: {
    level: '+1 = 4',
    experience: '+2/+3 = 0',
    hpGrowthLevel: '+4 = 1',
    strGrowthLevel: '+5 = 1',
    kiGrowthLevel: '+6 = 1',
    spdGrowthLevel: '+7 = 1',
  },
} as const;

// $3C session-load modes.
export const STORY_SESSION_LOAD_MODES = {
  '0x00': 'LOAD_SRAM_IMMEDIATE: ROM0:$12BA (load SRAM, return).',
  nonzero: 'RUN_INTERACTIVE_SESSION_LOAD_AND_SOFT_RESTART: store mode in C022 (SESSION_LOAD_CONTEXT_MODE), C069=0, Bank2:$5397 FSM (UI/transition) → ROM0:$12BA (LOAD) → C009=1 (Bank02:$543D) → soft session reinit.',
} as const;

// ── BGM table (20 IDs) ──

export interface BgmTableEntry {
  bgmId: number;
  bank: number;
  pointer: number;
  kind: 'BGM' | 'JINGLE';
  gbsSubsong: number;
}

// Bank7E:$42B8 = bank table; Bank7E:$42CC = pointer table. 20 resources (16 BGM + 4 jingles).
export const BGM_TABLE: readonly BgmTableEntry[] = [
  { bgmId: 0x00, bank: 0x75, pointer: 0x5000, kind: 'BGM',    gbsSubsong: 1 },
  { bgmId: 0x01, bank: 0x75, pointer: 0x5800, kind: 'BGM',    gbsSubsong: 2 },
  { bgmId: 0x02, bank: 0x75, pointer: 0x6c00, kind: 'BGM',    gbsSubsong: 3 },
  { bgmId: 0x03, bank: 0x76, pointer: 0x5000, kind: 'JINGLE', gbsSubsong: 1 },
  { bgmId: 0x04, bank: 0x78, pointer: 0x5000, kind: 'JINGLE', gbsSubsong: 2 },
  { bgmId: 0x05, bank: 0x75, pointer: 0x7800, kind: 'BGM',    gbsSubsong: 4 },
  { bgmId: 0x06, bank: 0x78, pointer: 0x5200, kind: 'JINGLE', gbsSubsong: 3 },
  { bgmId: 0x07, bank: 0x78, pointer: 0x5400, kind: 'JINGLE', gbsSubsong: 4 },
  { bgmId: 0x08, bank: 0x78, pointer: 0x5600, kind: 'BGM',    gbsSubsong: 5 },
  { bgmId: 0x09, bank: 0x78, pointer: 0x5d00, kind: 'BGM',    gbsSubsong: 6 },
  { bgmId: 0x0a, bank: 0x78, pointer: 0x7280, kind: 'BGM',    gbsSubsong: 7 },
  { bgmId: 0x0b, bank: 0x76, pointer: 0x5300, kind: 'BGM',    gbsSubsong: 8 },
  { bgmId: 0x0c, bank: 0x76, pointer: 0x5d00, kind: 'BGM',    gbsSubsong: 9 },
  { bgmId: 0x0d, bank: 0x76, pointer: 0x62a0, kind: 'BGM',    gbsSubsong: 10 },
  { bgmId: 0x0e, bank: 0x76, pointer: 0x6ea0, kind: 'BGM',    gbsSubsong: 11 },
  { bgmId: 0x0f, bank: 0x77, pointer: 0x5000, kind: 'BGM',    gbsSubsong: 12 },
  { bgmId: 0x10, bank: 0x77, pointer: 0x6000, kind: 'BGM',    gbsSubsong: 13 },
  { bgmId: 0x11, bank: 0x76, pointer: 0x74a0, kind: 'BGM',    gbsSubsong: 14 },
  { bgmId: 0x12, bank: 0x77, pointer: 0x6500, kind: 'BGM',    gbsSubsong: 15 },
  { bgmId: 0x13, bank: 0x77, pointer: 0x6f00, kind: 'BGM',    gbsSubsong: 16 },
] as const;

export const BGM_ARCHITECTURE = {
  count: 20,
  bgmCount: 16,
  jingleCount: 4,
  jingleRomIds: [0x03, 0x04, 0x06, 0x07] as const,
  bankTable: 'Bank7E:$42B8',
  pointerTable: 'Bank7E:$42CC',
  dispatcher: 'Bank7E:$42A9 (bgmId → bank + pointer)',
  engine: '$40A6 (load/play) · $4067 (enable)',
  note: 'Matches public GBS rip (20 subsongs: 16 BGM + 4 jingles). ROM IDs 03/04/06/07 are the four compact jingle resources and map to GBS jingle subsongs 1..4. Do NOT assign human track names (Title/Battle) by gamerip order alone.',
} as const;

export const BGM_EXTERNAL_CORRELATION = {
  zopharGbs: '20 subsongs, 16 BGM + 4 jingles; jingle positions match compact ROM resources 03/04/06/07',
  khinsiderGamerip: '19 human-labeled tracks, useful for names but not a safe ROM-ID table because it does not preserve all four jingles.',
  humanTrackLabels: 'PENDING_CALLSITE_CORRELATION',
} as const;

// ── BGM semantics (growing registry) ──

export interface BgmSemanticHint {
  bgmId: number;
  name: string;
  evidence: StoryEvidence;
  context: string;
}

export const BGM_KNOWN_SEMANTICS: readonly BgmSemanticHint[] = [
  { bgmId: 0x0a, name: 'SYSTEM_SCREEN_PRE_BATTLE_SETUP_MUSIC', evidence: 'ROM_STATIC_VERIFIED',
    context: 'Massively used immediately before $3F (pre-battle system screen).' },
] as const;

// ── SFX catalog (85 IDs) ──

export const SFX_CATALOG = {
  headerBank: 0x79,
  headerAddress: 0x5000,
  headerMagic: '"SE"',
  offsetTableAddress: 0x5004, // after "SE" (2 bytes) + 2 pad bytes
  firstResourceAddress: 0x50ae,
  idCount: 85, // (firstResourceAddress - 4) / 2 = 85 → IDs 0..84
  queueBase: 0xc950,
  pipeline: 'SFX id → Bank7A:$5015 (queue) → C950+ → SE engine; $1B passes B=1 (delay), C=sfxId.',
} as const;

export interface SfxSemanticHint {
  sfxId: number;
  name: string;
  evidence: StoryEvidence;
  context: string;
}

export const SFX_KNOWN_SEMANTICS: readonly SfxSemanticHint[] = [
  { sfxId: 0x00, name: 'CURSOR_MOVE', evidence: 'ROM_STATIC_VERIFIED',
    context: 'Fires on selection/cursor change.' },
  { sfxId: 0x01, name: 'CONFIRM_ACTION', evidence: 'ROM_STATIC_VERIFIED',
    context: 'Accompanies C012 & $10 (action/confirm gate) and Story trigger activation.' },
  { sfxId: 0x02, name: 'CANCEL_BACK', evidence: 'HIGH_CONFIDENCE_STATIC',
    context: 'Accompanies the complementary input bit $20 (cancel/back) — provisional.' },
] as const;

// ── Story runtime memory (map / battle / reward / persistence / choice / save) ──

export type StoryMemoryGroup =
  | 'CHOICE'
  | 'BATTLE'
  | 'REWARD'
  | 'PERSISTENCE'
  | 'MAP'
  | 'CAMERA'
  | 'ENTITY'
  | 'CALLBACK'
  | 'RESULT'
  | 'TUNING'
  | 'ROSTER'
  | 'SAVE';

export interface StoryRuntimeMemory {
  address: number;
  name: string;
  group: StoryMemoryGroup;
  description: string;
}

export const STORY_RUNTIME_MEMORY: readonly StoryRuntimeMemory[] = [
  // choice
  { address: 0xc50c, name: 'CHOICE_MODE', group: 'CHOICE', description: '$15 choice mode/config.' },
  { address: 0xc50e, name: 'CHOICE_BRANCH_TARGETS', group: 'CHOICE', description: '$16 branch targets: C50E + optionIndex×2.' },
  { address: 0xc445, name: 'CHOICE_SELECTED_INDEX', group: 'CHOICE', description: '$17 selected option index.' },
  // battle
  { address: 0xcb1a, name: 'PLAYER_FORM', group: 'BATTLE', description: '$27 player form.' },
  { address: 0xcb47, name: 'ENEMY_FORM_ID', group: 'BATTLE', description: '$27 generated enemy form id.' },
  // result
  { address: 0xc0a3, name: 'BATTLE_RESULT', group: 'RESULT', description: '1 = DEFEAT, 2 = VICTORY; drives C043++ (Battle Mode consecutive wins).' },
  // reward
  { address: 0xcea7, name: 'REWARD_CANDIDATES', group: 'REWARD', description: '$25 reward candidate cards (CEA7..CEA9).' },
  { address: 0xce7b, name: 'REWARD_CHOSEN_INDEX', group: 'REWARD', description: '$25 chosen reward index.' },
  // persistence
  { address: 0xcdf3, name: 'CARD_QUANTITIES', group: 'PERSISTENCE', description: '125 card quantities (CDF3[cardId-1]); $25 ++ with max 9 copies.' },
  { address: 0xcddf, name: 'DECK_CARD_ID_BLOCK', group: 'PERSISTENCE', description: '20 deck card IDs inside the CDCD..CDF2 battle-loadout preset (CDDF..CDF2).' },
  { address: 0xcdcd, name: 'BATTLE_LOADOUT_FIGHTER_ID_BLOCK', group: 'PERSISTENCE', description: '$39($10,0): first 3 bytes of the 38-byte battle-loadout preset (CDCD..CDCF = fighter IDs; CDD0..CDDE = Limit IDs; CDDF..CDF2 = deck card IDs).' },
  { address: 0xcdd0, name: 'BATTLE_LOADOUT_LIMIT_ATTACK_ID_BLOCK', group: 'PERSISTENCE', description: '15 Limit Attack IDs inside the CDCD..CDF2 battle-loadout preset (3 fighters × 5 slots), copied onward to CB1D..CB2B.' },
  // callbacks
  { address: 0xc240, name: 'CALLBACK_TABLE', group: 'CALLBACK', description: 'Callback table; cleared by $22/$2B presentation reset.' },
  // map
  { address: 0xca00, name: 'MAP_STATE', group: 'MAP', description: '$29 map state init.' },
  { address: 0xca5c, name: 'MAP_STATE_5C', group: 'MAP', description: '$29 map state.' },
  { address: 0xc0ae, name: 'MAP_RUNTIME_AE', group: 'MAP', description: '$29 map runtime.' },
  { address: 0xc0be, name: 'MAP_RUNTIME_BE', group: 'MAP', description: '$29 map runtime.' },
  { address: 0xc0b1, name: 'MAP_BANK_SELECTOR', group: 'MAP', description: '$2F mode20: bank selector.' },
  { address: 0xc0b2, name: 'MAP_CHUNK_SELECTOR', group: 'MAP', description: '$2F mode20: chunk selector.' },
  // camera
  { address: 0xca02, name: 'MAP_SCROLL_BOUND_X', group: 'CAMERA', description: '$2F mode25: horizontal scroll bound (CA02/CA03). Dual-use with battle block.' },
  { address: 0xca04, name: 'MAP_SCROLL_BOUND_Y', group: 'CAMERA', description: '$2F mode25: vertical scroll bound (CA04/CA05). Dual-use with battle block.' },
  { address: 0xca63, name: 'MAP_POSITION_X', group: 'CAMERA', description: '$2D mode25: player/map position (CA63..CA66 = 2×16-bit).' },
  { address: 0xca67, name: 'MAP_ACTOR_DIRECTION', group: 'CAMERA', description: '$2D mode30: map actor direction/facing.' },
  { address: 0xc0aa, name: 'MAP_POSITION_AA', group: 'CAMERA', description: '$2D mode25: player/map position.' },
  { address: 0xc0ab, name: 'MAP_POSITION_AB', group: 'CAMERA', description: '$2D mode25: player/map position.' },
  // entity
  { address: 0xca06, name: 'MAP_ENTITY_TABLE_BASE', group: 'ENTITY', description: '$2E entity table base: CA06 + (entitySlot-1)×10. Dual-use with battle block.' },
  // tuning ($23)
  { address: 0xca0b, name: 'ENEMY_MEMBER_INDEX', group: 'TUNING', description: '$23 arg1 → CA0B (enemy member index).' },
  { address: 0xc0f9, name: 'HP_GROWTH_LEVEL', group: 'TUNING', description: '$23 arg3. Per-stat growth level; Bank2:$4000 builds member maxLife/currentLife. Aggregates into CA52.' },
  { address: 0xc0fa, name: 'STR_GROWTH_LEVEL', group: 'TUNING', description: '$23 arg4. Per-stat growth level for strength. Aggregates into CA52.' },
  { address: 0xc0fb, name: 'KI_GROWTH_LEVEL', group: 'TUNING', description: '$23 arg5. Per-stat growth level for ki. Aggregates into CA52.' },
  { address: 0xc0fc, name: 'SPD_GROWTH_LEVEL', group: 'TUNING', description: '$23 arg6. Per-stat growth level for speed. Aggregates into CA52.' },
  { address: 0xca52, name: 'ENEMY_AGGREGATE_LEVEL', group: 'TUNING', description: '$23: CA52 += hpGrowth + strGrowth + kiGrowth + spdGrowth + 1 (aggregate level used by progression/level).' },
  { address: 0xcc01, name: 'ENEMY_MEMBER_RECORD_BASE', group: 'TUNING', description: '$23: CB47 + memberIndex → CC01 (13-byte member record; see ENEMY_MEMBER_RECORD).' },
  // map trigger ($2C)
  { address: 0xca6a, name: 'STORY_MAP_TRIGGER_TABLE_BASE', group: 'MAP', description: '$2C: 8 records × 4 bytes (tileY, tileX, c1xxGateOffset, eventId).' },
  { address: 0xc0af, name: 'STORY_MAP_TRIGGER_EVENT_ID', group: 'MAP', description: 'On trigger fire: C0AF = record+3 eventId (delivered to Story layer).' },
  { address: 0xc0a1, name: 'STORY_MAP_TRIGGER_RESULT_FLAG', group: 'MAP', description: 'On trigger fire: C0A1 = 0.' },
  { address: 0xc012, name: 'STORY_MAP_TRIGGER_ACTION_GATE', group: 'MAP', description: 'When trigger gate offset==0, fire requires C012 & $10 (player action/input gate).' },
  { address: 0xca8a, name: 'MAP_TRIGGER_ARG_A', group: 'MAP', description: '$2C helper arg scratch (a) before Bank3:$6F4D writes the CA6A trigger record.' },
  { address: 0xca8b, name: 'MAP_TRIGGER_ARG_C', group: 'MAP', description: '$2C helper arg scratch (c) before Bank3:$6F4D writes the CA6A trigger record.' },
  { address: 0xca8c, name: 'MAP_TRIGGER_ARG_B', group: 'MAP', description: '$2C helper arg scratch (b) before Bank3:$6F4D writes the CA6A trigger record.' },
  { address: 0xca8d, name: 'MAP_TRIGGER_ARG_D', group: 'MAP', description: '$2C helper arg scratch (d) before Bank3:$6F4D writes the CA6A trigger record.' },
  // roster ($39($11,0)) — Vegito persistent progression preset (record 10, offsets +1..+7)
  { address: 0xccbe, name: 'VEGITO_PERSISTENT_LEVEL', group: 'ROSTER', description: '$39($11): record 10 +1 = level (04 = level 4; max 4).' },
  { address: 0xccbf, name: 'VEGITO_PERSISTENT_EXP_LO', group: 'ROSTER', description: '$39($11): record 10 +2 = experience low byte (00).' },
  { address: 0xccc0, name: 'VEGITO_PERSISTENT_EXP_HI', group: 'ROSTER', description: '$39($11): record 10 +3 = experience high byte (00).' },
  { address: 0xccc1, name: 'VEGITO_PERSISTENT_HP_GROWTH_LEVEL', group: 'ROSTER', description: '$39($11): record 10 +4 = HP growth level (01).' },
  { address: 0xccc2, name: 'VEGITO_PERSISTENT_STR_GROWTH_LEVEL', group: 'ROSTER', description: '$39($11): record 10 +5 = STR growth level (01).' },
  { address: 0xccc3, name: 'VEGITO_PERSISTENT_KI_GROWTH_LEVEL', group: 'ROSTER', description: '$39($11): record 10 +6 = KI growth level (01).' },
  { address: 0xccc4, name: 'VEGITO_PERSISTENT_SPD_GROWTH_LEVEL', group: 'ROSTER', description: '$39($11): record 10 +7 = SPD growth level (01).' },
  // save ($3C) — session load / main-loop reinit flags
  { address: 0xc009, name: 'SOFT_SESSION_REINITIALIZE_REQUEST', group: 'SAVE', description: 'Only 3 direct accesses: Bank00:$017F = 0; Bank00:$01BC read (!=0 → soft session reinit $0178); Bank02:$543D = 1 (set at end of $3C nonzero load flow).' },
  { address: 0xc008, name: 'DEEPER_MAIN_LOOP_REINITIALIZE_REQUEST', group: 'SAVE', description: 'Main loop: C008 != 0 → deep reinit $0171 (deeper than C009 soft reinit $0178).' },
  { address: 0xc022, name: 'SESSION_LOAD_CONTEXT_MODE', group: 'SAVE', description: '$3C(nonzero): stores load mode; controls whether session context fields (C060/C061) are restored.' },
  { address: 0xc069, name: 'SESSION_LOAD_WORK_FLAG', group: 'SAVE', description: '$3C(nonzero): C069 = 0 during load flow (Bank2:$5397). Exact role pending.' },
  { address: 0xcc1d, name: 'PERSISTENT_SAVE_REGION_START', group: 'PERSISTENCE', description: 'SRAM-saved WRAM block start (CC1D..CE6F).' },
  { address: 0xce6f, name: 'PERSISTENT_SAVE_REGION_END', group: 'PERSISTENCE', description: 'SRAM-saved WRAM block end (CC1D..CE6F).' },
] as const;

// ── Story chunk container (physical format) ──

export const STORY_CHUNK_CONTAINER = {
  /** Marker that precedes each story script: 01 02 68 01 00 <storyId> 00 */
  markerPrefix: [0x01, 0x02, 0x68, 0x01, 0x00] as readonly number[],
  /** u32 chunk count (first field of the container header) */
  chunkCountField: 'u32',
  /** u32 constant = 2 (second field; NOT yet proven to be a "shift amount") */
  constantField: 'u32',
  constantValue: 2,
  /** chunk table entry = u16 startUnits + u16 lengthUnits */
  entryField: 'u16 startUnits, u16 lengthUnits',
  /** byteOffset = startUnits × 4 */
  unitMultiplier: 4,
  /** Invariant: firstStartUnits == chunkCount + 2 */
  invariantFirstStart: 'firstStartUnits == chunkCount + 2',
  /** Invariant: (start + length)[N] == start[N+1] */
  invariantChain: '(start + length)[N] == start[N+1]',
} as const;

/** Story narrative banks (17 banks, container-verified). */
export const STORY_BANKS: readonly number[] = [
  0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
  0x2e, 0x6f, 0x7b, 0x7c, 0x7d,
] as const;

// ── Story script locations (30 main + 2 extra) ──

export interface StoryLocation {
  storyId: number;
  bank: number;      // hex
  address: number;   // hex (within bank)
  kind: 'MAIN' | 'EXTRA';
}

export const STORY_LOCATIONS: readonly StoryLocation[] = [
  { storyId: 1,  bank: 0x04, address: 0x444e, kind: 'MAIN' },
  { storyId: 2,  bank: 0x7d, address: 0x63ec, kind: 'MAIN' },
  { storyId: 3,  bank: 0x05, address: 0x4028, kind: 'MAIN' },
  { storyId: 4,  bank: 0x05, address: 0x5608, kind: 'MAIN' },
  { storyId: 5,  bank: 0x06, address: 0x4028, kind: 'MAIN' },
  { storyId: 6,  bank: 0x06, address: 0x6880, kind: 'MAIN' },
  { storyId: 7,  bank: 0x07, address: 0x4028, kind: 'MAIN' },
  { storyId: 8,  bank: 0x07, address: 0x4f84, kind: 'MAIN' },
  { storyId: 9,  bank: 0x08, address: 0x4028, kind: 'MAIN' },
  { storyId: 10, bank: 0x08, address: 0x5054, kind: 'MAIN' },
  { storyId: 11, bank: 0x09, address: 0x402c, kind: 'MAIN' },
  { storyId: 12, bank: 0x09, address: 0x5c3c, kind: 'MAIN' },
  { storyId: 13, bank: 0x0c, address: 0x4024, kind: 'MAIN' },
  { storyId: 14, bank: 0x0a, address: 0x4028, kind: 'MAIN' },
  { storyId: 15, bank: 0x0a, address: 0x69f4, kind: 'MAIN' },
  { storyId: 16, bank: 0x0b, address: 0x4028, kind: 'MAIN' },
  { storyId: 17, bank: 0x0b, address: 0x6028, kind: 'MAIN' },
  { storyId: 18, bank: 0x0c, address: 0x5f38, kind: 'MAIN' },
  { storyId: 19, bank: 0x0e, address: 0x4028, kind: 'MAIN' },
  { storyId: 20, bank: 0x0d, address: 0x4024, kind: 'MAIN' },
  { storyId: 21, bank: 0x7b, address: 0x4030, kind: 'MAIN' },
  { storyId: 22, bank: 0x2e, address: 0x4028, kind: 'MAIN' },
  { storyId: 23, bank: 0x0f, address: 0x4028, kind: 'MAIN' },
  { storyId: 24, bank: 0x2e, address: 0x5348, kind: 'MAIN' },
  { storyId: 25, bank: 0x6f, address: 0x4028, kind: 'MAIN' },
  { storyId: 26, bank: 0x6f, address: 0x6270, kind: 'MAIN' },
  { storyId: 27, bank: 0x0f, address: 0x6768, kind: 'MAIN' },
  { storyId: 28, bank: 0x7b, address: 0x57f4, kind: 'MAIN' },
  { storyId: 29, bank: 0x0e, address: 0x4c74, kind: 'MAIN' },
  { storyId: 30, bank: 0x7c, address: 0x4830, kind: 'MAIN' },
  { storyId: 33, bank: 0x0d, address: 0x5c84, kind: 'EXTRA' },
  { storyId: 34, bank: 0x7c, address: 0x4020, kind: 'EXTRA' },
] as const;

// ── Speaker nameplate table (Bank10:$5000 + id×$60, 6 tiles each) ──

export interface SpeakerNameplate {
  speakerId: number;  // 00..47
  name: string;
}

export const SPEAKER_NAMEPLATES: readonly SpeakerNameplate[] = [
  { speakerId: 0,  name: 'Gohan' },
  { speakerId: 1,  name: 'Piccolo' },
  { speakerId: 2,  name: 'Krillin' },
  { speakerId: 3,  name: 'Vegeta' },
  { speakerId: 4,  name: 'Nappa' },
  { speakerId: 5,  name: 'Yamcha' },
  { speakerId: 6,  name: 'Tien' },
  { speakerId: 7,  name: 'Goku' },
  { speakerId: 8,  name: 'Yajirobe' },
  { speakerId: 9,  name: 'Chi-Chi' },
  { speakerId: 10, name: 'Bulma' },
  { speakerId: 11, name: 'Dende' },
  { speakerId: 12, name: 'Nail' },
  { speakerId: 13, name: 'Guru' },
  { speakerId: 14, name: 'Recoome' },
  { speakerId: 15, name: 'Burter' },
  { speakerId: 16, name: 'Jeice' },
  { speakerId: 17, name: 'Guldo' },
  { speakerId: 18, name: 'Ginyu' },
  { speakerId: 19, name: 'Frieza' },
  { speakerId: 20, name: 'Kaio' },
  { speakerId: 21, name: 'Muri' },
  { speakerId: 22, name: 'Boy' },
  { speakerId: 23, name: 'Trunks' },
  { speakerId: 24, name: 'No.20' },
  { speakerId: 25, name: 'No.19' },
  { speakerId: 26, name: 'No.18' },
  { speakerId: 27, name: 'No.17' },
  { speakerId: 28, name: 'No.16' },
  { speakerId: 29, name: 'Roshi' },
  { speakerId: 30, name: 'Cell' },
  { speakerId: 31, name: 'Hercule' },
  { speakerId: 32, name: 'Cell Jr.' },
  { speakerId: 33, name: 'Videl' },
  { speakerId: 34, name: 'Goten' },
  { speakerId: 35, name: 'Announc.' },
  { speakerId: 36, name: 'Yamu' },
  { speakerId: 37, name: 'Spopov.' },
  { speakerId: 38, name: 'Sup.Kai' },
  { speakerId: 39, name: 'Kibito' },
  { speakerId: 40, name: 'Audience' },
  { speakerId: 41, name: 'Babidi' },
  { speakerId: 42, name: 'Dabura' },
  { speakerId: 43, name: 'PuiPui' },
  { speakerId: 44, name: 'Buu' },
  { speakerId: 45, name: 'Eld.Kai' },
  { speakerId: 46, name: 'Gotenks' },
  { speakerId: 47, name: 'Baba' },
] as const;

// ── Portrait resolution (opcode $40) ──

export const PORTRAIT_RESOLUTION = {
  bankFormula: 'bank = $70 + floor(id / $1C)',
  localFormula: 'local = id % $1C',
  slot0Vram: 0x8800,
  slot1Vram: 0x8a30,
} as const;

// ── USA glyph charset (opcode $10 literal text) ──

export type UsaGlyphKind = 'upper' | 'lower' | 'punct';

export interface UsaGlyph {
  glyphByte: number;  // ROM byte value
  char: string;       // rendered char ('A', '!!', ' ', '…', etc.)
  kind: UsaGlyphKind;
}

// NOTE: this is the USA charset ("largely ROM VERIFIED", NOT complete).
// Known gaps (bytes observed in range but glyph not yet mapped):
//   uppercase $0A (between $09 O and $0B P)
//   lowercase $1A (between $19 g and $1B h), $22 (between $21 n and $23 o)
// The multi-bang !/!!/!!!/!!!! are DISTINCT ROM glyphs, not generated repeats.
// Spain ROM needs its OWN table (¡¿áéíóúñü absent here).
export const USA_CHARSET: readonly UsaGlyph[] = [
  // ── uppercase ──
  { glyphByte: 0x90, char: 'A', kind: 'upper' },
  { glyphByte: 0x91, char: 'B', kind: 'upper' },
  { glyphByte: 0x3f, char: 'C', kind: 'upper' },
  { glyphByte: 0x01, char: 'D', kind: 'upper' },
  { glyphByte: 0x02, char: 'E', kind: 'upper' },
  { glyphByte: 0xfa, char: 'F', kind: 'upper' },
  { glyphByte: 0xfd, char: 'G', kind: 'upper' },
  { glyphByte: 0x03, char: 'H', kind: 'upper' },
  { glyphByte: 0x04, char: 'I', kind: 'upper' },
  { glyphByte: 0x05, char: 'J', kind: 'upper' },
  { glyphByte: 0xfe, char: 'K', kind: 'upper' },
  { glyphByte: 0x06, char: 'L', kind: 'upper' },
  { glyphByte: 0x07, char: 'M', kind: 'upper' },
  { glyphByte: 0x08, char: 'N', kind: 'upper' },
  { glyphByte: 0x09, char: 'O', kind: 'upper' },
  { glyphByte: 0x0b, char: 'P', kind: 'upper' },
  { glyphByte: 0x0c, char: 'Q', kind: 'upper' },
  { glyphByte: 0xfb, char: 'R', kind: 'upper' },
  { glyphByte: 0xfc, char: 'S', kind: 'upper' },
  { glyphByte: 0x0d, char: 'T', kind: 'upper' },
  { glyphByte: 0x0e, char: 'U', kind: 'upper' },
  { glyphByte: 0x0f, char: 'V', kind: 'upper' },
  { glyphByte: 0x10, char: 'W', kind: 'upper' },
  { glyphByte: 0x11, char: 'X', kind: 'upper' },
  { glyphByte: 0x12, char: 'Y', kind: 'upper' },
  { glyphByte: 0xf9, char: 'Z', kind: 'upper' },
  // ── lowercase ──
  { glyphByte: 0x13, char: 'a', kind: 'lower' },
  { glyphByte: 0x14, char: 'b', kind: 'lower' },
  { glyphByte: 0x15, char: 'c', kind: 'lower' },
  { glyphByte: 0x16, char: 'd', kind: 'lower' },
  { glyphByte: 0x17, char: 'e', kind: 'lower' },
  { glyphByte: 0x18, char: 'f', kind: 'lower' },
  { glyphByte: 0x19, char: 'g', kind: 'lower' },
  { glyphByte: 0x1b, char: 'h', kind: 'lower' },
  { glyphByte: 0x1c, char: 'i', kind: 'lower' },
  { glyphByte: 0x1d, char: 'j', kind: 'lower' },
  { glyphByte: 0x1e, char: 'k', kind: 'lower' },
  { glyphByte: 0x1f, char: 'l', kind: 'lower' },
  { glyphByte: 0x20, char: 'm', kind: 'lower' },
  { glyphByte: 0x21, char: 'n', kind: 'lower' },
  { glyphByte: 0x23, char: 'o', kind: 'lower' },
  { glyphByte: 0x24, char: 'p', kind: 'lower' },
  { glyphByte: 0x25, char: 'q', kind: 'lower' },
  { glyphByte: 0x26, char: 'r', kind: 'lower' },
  { glyphByte: 0x27, char: 's', kind: 'lower' },
  { glyphByte: 0x28, char: 't', kind: 'lower' },
  { glyphByte: 0x29, char: 'u', kind: 'lower' },
  { glyphByte: 0x2a, char: 'v', kind: 'lower' },
  { glyphByte: 0x2b, char: 'w', kind: 'lower' },
  { glyphByte: 0x2c, char: 'x', kind: 'lower' },
  { glyphByte: 0x2d, char: 'y', kind: 'lower' },
  { glyphByte: 0x2e, char: 'z', kind: 'lower' },
  // ── punctuation ──
  { glyphByte: 0x30, char: '.', kind: 'punct' },
  { glyphByte: 0x31, char: ',', kind: 'punct' },
  { glyphByte: 0x32, char: "'", kind: 'punct' },
  { glyphByte: 0x33, char: '&', kind: 'punct' },
  { glyphByte: 0x3b, char: ' ', kind: 'punct' },
  { glyphByte: 0x7a, char: '…', kind: 'punct' },
  { glyphByte: 0x8a, char: '!', kind: 'punct' },
  { glyphByte: 0x8b, char: '!!', kind: 'punct' },
  { glyphByte: 0x8c, char: '!!!', kind: 'punct' },
  { glyphByte: 0x8d, char: '!!!!', kind: 'punct' },
  { glyphByte: 0x8e, char: '?', kind: 'punct' },
  { glyphByte: 0x8f, char: '??', kind: 'punct' },
  { glyphByte: 0xdf, char: '-', kind: 'punct' },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// Queries
// ═══════════════════════════════════════════════════════════════════════

export function storyOpcodeByByte(opcode: number): StoryOpcode | undefined {
  return STORY_OPCODES.find(o => o.opcode === opcode);
}

export function namedStoryOpcodes(): readonly StoryOpcode[] {
  return STORY_OPCODES.filter(o => o.name !== null);
}

export function unmappedStoryOpcodes(): readonly StoryOpcode[] {
  return STORY_OPCODES.filter(o => o.name === null);
}

export function storyOpcodesByCategory(category: StoryOpcodeCategory): readonly StoryOpcode[] {
  return STORY_OPCODES.filter(o => o.category === category);
}

export function storyEvidenceSummary(): Record<StoryEvidence, number> {
  const counts: Record<string, number> = {};
  for (const o of STORY_OPCODES) counts[o.evidence] = (counts[o.evidence] || 0) + 1;
  return counts as Record<StoryEvidence, number>;
}

/** Decode a string of USA glyph bytes via $10. Unknown bytes → '\uFFFD'. */
export function decodeUsaGlyphs(bytes: readonly number[]): string {
  let out = '';
  for (const b of bytes) {
    const g = USA_CHARSET.find(e => e.glyphByte === b);
    out += g ? g.char : '\uFFFD';
  }
  return out;
}

/** Build a Map<byte, char> for bulk decoding. */
export function usaGlyphLookup(): ReadonlyMap<number, string> {
  return new Map(USA_CHARSET.map(g => [g.glyphByte, g.char]));
}

export function speakerById(id: number): SpeakerNameplate | undefined {
  return SPEAKER_NAMEPLATES.find(s => s.speakerId === id);
}

export function storyLocationById(storyId: number): StoryLocation | undefined {
  return STORY_LOCATIONS.find(s => s.storyId === storyId);
}
