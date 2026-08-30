// ═══════════════════════════════════════════════════════════════════════
// VERIFY: STORY ROM SSOT
// Uso: npm run verify:story-rom
//
// Self-consistency + golden checks for src/data/storyRom.ts:
//   A) opcode registry: no dup bytes, named/unmapped counts, evidence dist,
//      choice/battle/link/save/credits/map/card families, goldens.
//   B) evaluator ops: corrected $85..$8B + pending bitwise/bool.
//   C) USA charset: 26 upper + 26 lower + 13 punct, no dup bytes, gaps honored.
//   D) speaker table: 48 entries, ids 00..47 continuous, no dup id/name.
//   E) story locations: 32 entries, ids 01..30 + 33,34, no dup bank:address.
//   F) registers: C501..C50A + choice temps C50C/C50E + referenced temps.
//   G) container constants + banks well-formed.
//   H) map entity / scene modes / camera clamp / runtime memory / persistence / bgm.
// ═══════════════════════════════════════════════════════════════════════
import {
  STORY_OPCODES,
  STORY_EVALUATOR_OPS,
  EVALUATOR_UNASSIGNED,
  STORY_VM_REGISTERS,
  STORY_VM_DISPATCH,
  STORY_CHUNK_CONTAINER,
  STORY_BANKS,
  STORY_LOCATIONS,
  SPEAKER_NAMEPLATES,
  USA_CHARSET,
  PORTRAIT_RESOLUTION,
  STORY_MAP_ENTITY_RECORD,
  STORY_MAP_SCENE_MODES,
  STORY_MAP_CAMERA_CLAMP,
  STORY_MAP_TRIGGER_TABLE,
  STORY_MAP_TRIGGER_RECORD,
  ENEMY_MEMBER_RECORD,
  STORY_RUNTIME_MEMORY,
  STORY_PERSISTENCE_OPS,
  BGM_KNOWN_SEMANTICS,
  BGM_TABLE,
  BGM_ARCHITECTURE,
  BGM_EXTERNAL_CORRELATION,
  SFX_CATALOG,
  SFX_KNOWN_SEMANTICS,
  VEGITO_PERSISTENT_PROGRESSION_PRESET,
  PERSISTENT_RECORD,
  PERSISTENT_LEVEL_EXP_THRESHOLDS,
  STORY_BATTLE_LOADOUT_PRESET,
  STORY_SESSION_LOAD_MODES,
  STORY_MAP_SPRITE_RESOURCE_TABLE,
  storyOpcodeByByte,
  namedStoryOpcodes,
  unmappedStoryOpcodes,
  decodeUsaGlyphs,
  speakerById,
  storyLocationById,
} from '../src/data/storyRom';

let passed = 0;
let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    passed++;
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ── A) Opcode registry ──
{
  const seen = new Set<number>();
  for (const o of STORY_OPCODES) {
    if (seen.has(o.opcode)) check(`opcode unique $${o.opcode.toString(16)}`, false, 'duplicate');
    seen.add(o.opcode);
  }
  check('opcodes: no duplicate bytes', seen.size === STORY_OPCODES.length);

  const named = namedStoryOpcodes();
  const unmapped = unmappedStoryOpcodes();
  const locatedUnmapped = STORY_OPCODES.filter(o => o.evidence === 'LOCATED_UNMAPPED');
  const seenUnmapped = STORY_OPCODES.filter(o => o.evidence === 'SEEN_UNMAPPED');
  const highConfidence = STORY_OPCODES.filter(o => o.evidence === 'HIGH_CONFIDENCE_STATIC');

  check('opcodes: 63 total', STORY_OPCODES.length === 63, `got ${STORY_OPCODES.length}`);
  check('opcodes: 59 named', named.length === 59, `got ${named.length}`);
  check('opcodes: 4 name===null', unmapped.length === 4, `got ${unmapped.length}`);
  check('opcodes: 2 LOCATED_UNMAPPED', locatedUnmapped.length === 2, `got ${locatedUnmapped.length}`);
  check('opcodes: 2 SEEN_UNMAPPED', seenUnmapped.length === 2, `got ${seenUnmapped.length}`);
  check('opcodes: 7 HIGH_CONFIDENCE_STATIC', highConfidence.length === 7, `got ${highConfidence.length}`);

  const locatedBytes = locatedUnmapped.map(o => o.opcode).sort((a, b) => a - b);
  const expectedLocated = [0x35, 0x3a];
  check(
    'opcodes: 2 unmapped handlers match expectation',
    locatedBytes.length === expectedLocated.length && locatedBytes.every((b, i) => b === expectedLocated[i]),
    `got ${locatedBytes.map(b => '$' + b.toString(16)).join(',')}`
  );
  const seenBytes = seenUnmapped.map(o => o.opcode).sort((a, b) => a - b);
  const expectedSeen = [0x30, 0x37];
  check(
    'opcodes: 2 SEEN_UNMAPPED match expectation',
    seenBytes.length === expectedSeen.length && seenBytes.every((b, i) => b === expectedSeen[i]),
    `got ${seenBytes.map(b => '$' + b.toString(16)).join(',')}`
  );
  const hcBytes = highConfidence.map(o => o.opcode).sort((a, b) => a - b);
  const expectedHc = [0x0f, 0x12, 0x13, 0x14, 0x1c, 0x1f, 0x26];
  check(
    'opcodes: 7 HIGH_CONFIDENCE match expectation',
    hcBytes.length === expectedHc.length && hcBytes.every((b, i) => b === expectedHc[i]),
    `got ${hcBytes.map(b => '$' + b.toString(16)).join(',')}`
  );

  // Golden semantics (core)
  check('opcode $10 = PRINT_TEXT', storyOpcodeByByte(0x10)?.name === 'PRINT_TEXT');
  check('opcode $40 = PORTRAIT_LOAD', storyOpcodeByByte(0x40)?.name === 'PORTRAIT_LOAD');
  check('opcode $19 = PLAY_BGM', storyOpcodeByByte(0x19)?.name === 'PLAY_BGM');

  // TEXT window lifecycle
  check('opcode $12 = PAGE_ADVANCE (HIGH_CONFIDENCE)', storyOpcodeByByte(0x12)?.name === 'PAGE_ADVANCE');
  check('opcode $13 = OPEN_WINDOW (HIGH_CONFIDENCE)', storyOpcodeByByte(0x13)?.name === 'OPEN_WINDOW');
  check('opcode $14 = CLOSE_WINDOW (HIGH_CONFIDENCE)', storyOpcodeByByte(0x14)?.name === 'CLOSE_WINDOW');

  // CHOICE family
  check('opcode $15 = INIT_CHOICE (ROM0:$1B76)', storyOpcodeByByte(0x15)?.name === 'INIT_CHOICE' && storyOpcodeByByte(0x15)?.handler?.address === 0x1b76);
  check('opcode $16 = ADD_CHOICE_OPTION (ROM0:$1B8A)', storyOpcodeByByte(0x16)?.name === 'ADD_CHOICE_OPTION' && storyOpcodeByByte(0x16)?.handler?.address === 0x1b8a);
  check('opcode $16 consumes N option bytes', storyOpcodeByByte(0x16)?.description.includes('FULL N'));

  // LINK / SYSTEM family
  check('opcode $0F = SYSTEM_MENU (HIGH_CONFIDENCE)', storyOpcodeByByte(0x0f)?.name === 'SYSTEM_MENU');
  check('opcode $1C = LINK_HANDSHAKE (HIGH_CONFIDENCE)', storyOpcodeByByte(0x1c)?.name === 'LINK_HANDSHAKE');
  check('opcode $1F = NEW_SESSION_STATE (HIGH_CONFIDENCE)', storyOpcodeByByte(0x1f)?.name === 'NEW_SESSION_STATE');
  check('opcode $26 = LINK_BATTLE_SYNC (HIGH_CONFIDENCE)', storyOpcodeByByte(0x26)?.name === 'LINK_BATTLE_SYNC');

  // BATTLE family
  check('opcode $20 = INIT_BATTLE', storyOpcodeByByte(0x20)?.name === 'INIT_BATTLE');
  check('opcode $21 = RUN_BATTLE', storyOpcodeByByte(0x21)?.name === 'RUN_BATTLE');
  check('opcode $22 = RESET_ACTION_PRESENTATION_RUNTIME_AFTER_BATTLE', storyOpcodeByByte(0x22)?.name === 'RESET_ACTION_PRESENTATION_RUNTIME_AFTER_BATTLE');
  check('opcode $23 = CONFIGURE_ENEMY_MEMBER_WITH_PER_STAT_GROWTH_LEVELS', storyOpcodeByByte(0x23)?.name === 'CONFIGURE_ENEMY_MEMBER_WITH_PER_STAT_GROWTH_LEVELS');
  check('opcode $24 = ENEMY_PRESET', storyOpcodeByByte(0x24)?.name === 'ENEMY_PRESET');
  check('opcode $25 = RUN_POST_BATTLE_CARD_REWARD', storyOpcodeByByte(0x25)?.name === 'RUN_POST_BATTLE_CARD_REWARD');
  check('opcode $27 = GENERATE_MATCHED_RANDOM_ENEMY_FROM_PLAYER_FORM', storyOpcodeByByte(0x27)?.name === 'GENERATE_MATCHED_RANDOM_ENEMY_FROM_PLAYER_FORM');

  // CARD/DECK family
  check('opcode $28 = RUN_CARD_TRADE_UI (STATIC)', storyOpcodeByByte(0x28)?.name === 'RUN_CARD_TRADE_UI' && storyOpcodeByByte(0x28)?.evidence === 'ROM_STATIC_VERIFIED');
  check('opcode $38 = GIVE_CARD', storyOpcodeByByte(0x38)?.name === 'GIVE_CARD');

  // MAP family
  check('opcode $29 = INIT_STORY_MAP_RUNTIME', storyOpcodeByByte(0x29)?.name === 'INIT_STORY_MAP_RUNTIME');
  check('opcode $2A = RUN_STORY_MAP_RUNTIME_UNTIL_EXIT (Bank3:$6964)', storyOpcodeByByte(0x2a)?.name === 'RUN_STORY_MAP_RUNTIME_UNTIL_EXIT' && storyOpcodeByByte(0x2a)?.handler?.address === 0x6964);
  check('opcode $2B = RESET_STORY_PRESENTATION_RUNTIME', storyOpcodeByByte(0x2b)?.name === 'RESET_STORY_PRESENTATION_RUNTIME');
  check('opcode $2C = CONFIGURE_STORY_MAP_TRIGGER', storyOpcodeByByte(0x2c)?.name === 'CONFIGURE_STORY_MAP_TRIGGER');
  check('opcode $2C mode $14 = register (desc)', storyOpcodeByByte(0x2c)?.description.includes('REGISTER_STORY_MAP_TRIGGER'));
  check('opcode $2C mode $0A = clear (desc)', storyOpcodeByByte(0x2c)?.description.includes('CLEAR_STORY_MAP_TRIGGER_BY_EVENT_ID'));
  check('opcode $2D = CONFIGURE_STORY_MAP_PLAYER_ACTOR', storyOpcodeByByte(0x2d)?.name === 'CONFIGURE_STORY_MAP_PLAYER_ACTOR');
  check('opcode $2D mode $19 = tile position (desc)', storyOpcodeByByte(0x2d)?.description.includes('SET_STORY_PLAYER_TILE_POSITION'));
  check('opcode $2D mode $1E = direction (desc)', storyOpcodeByByte(0x2d)?.description.includes('SET_STORY_PLAYER_DIRECTION'));
  check('opcode $2E = CONFIGURE_STORY_MAP_ENTITY', storyOpcodeByByte(0x2e)?.name === 'CONFIGURE_STORY_MAP_ENTITY');
  check('opcode $2F = CONFIGURE_STORY_MAP_SCENE', storyOpcodeByByte(0x2f)?.name === 'CONFIGURE_STORY_MAP_SCENE');

  // PROGRESSION / SAVE / PRE-BATTLE / BATTLE MODE / CREDITS
  check('opcode $39 = RUN_PERSISTENCE_OPERATION', storyOpcodeByByte(0x39)?.name === 'RUN_PERSISTENCE_OPERATION');
  check('opcode $3B = VALIDATE_SAVE_DATA_AND_STORE_STATUS (ROM0:$12C6)', storyOpcodeByByte(0x3b)?.name === 'VALIDATE_SAVE_DATA_AND_STORE_STATUS' && storyOpcodeByByte(0x3b)?.handler?.address === 0x12c6);
  check('opcode $3C = RUN_SESSION_LOAD_OPERATION', storyOpcodeByByte(0x3c)?.name === 'RUN_SESSION_LOAD_OPERATION');
  check('opcode $3C nonzero = RUN_INTERACTIVE_SESSION_LOAD_AND_SOFT_RESTART (desc)', storyOpcodeByByte(0x3c)?.description.includes('RUN_INTERACTIVE_SESSION_LOAD_AND_SOFT_RESTART'));
  check('opcode $3C mode 0 = LOAD_SRAM_IMMEDIATE (desc)', storyOpcodeByByte(0x3c)?.description.includes('LOAD_SRAM_IMMEDIATE'));
  check('opcode $3D = SAVE_GAME_TO_SRAM (ROM0:$12AE)', storyOpcodeByByte(0x3d)?.name === 'SAVE_GAME_TO_SRAM' && storyOpcodeByByte(0x3d)?.handler?.address === 0x12ae);
  check('opcode $3F = RUN_PRE_BATTLE_SYSTEM_SCREEN (Bank2:$40FF)', storyOpcodeByByte(0x3f)?.name === 'RUN_PRE_BATTLE_SYSTEM_SCREEN' && storyOpcodeByByte(0x3f)?.handler?.address === 0x40ff);
  check('opcode $45 = DRAW_BATTLE_MODE_WIN_STREAK', storyOpcodeByByte(0x45)?.name === 'DRAW_BATTLE_MODE_WIN_STREAK');
  check('opcode $46 = LOAD_CREDITS_FONT (Bank17:$7B00)', storyOpcodeByByte(0x46)?.name === 'LOAD_CREDITS_FONT' && storyOpcodeByByte(0x46)?.handler?.address === 0x7b00);
  check('opcode $47 = DRAW_CREDITS_LINE (Bank10:$7700)', storyOpcodeByByte(0x47)?.name === 'DRAW_CREDITS_LINE' && storyOpcodeByByte(0x47)?.handler?.address === 0x7700);

  // SPEAKER
  check('opcode $42 = SET_SHOW_SPEAKER_EXCLUSIVE', storyOpcodeByByte(0x42)?.name === 'SET_SHOW_SPEAKER_EXCLUSIVE');
  check('opcode $43 = CLEAR_SPEAKER_UI', storyOpcodeByByte(0x43)?.name === 'CLEAR_SPEAKER_UI');
  check('opcode $44 = SHOW_SECOND_SPEAKER_PRESERVE_OTHER (STATIC)', storyOpcodeByByte(0x44)?.name === 'SHOW_SECOND_SPEAKER_PRESERVE_OTHER' && storyOpcodeByByte(0x44)?.evidence === 'ROM_STATIC_VERIFIED');

  // $35 handler hint preserved
  const op35 = storyOpcodeByByte(0x35);
  check('opcode $35 handler hint (Bank1:$4000)', op35?.handler?.bank === 1 && op35?.handler?.address === 0x4000);
}

// ── B) Evaluator ops (CORRECTED) ──
{
  const verified = STORY_EVALUATOR_OPS.filter(o => o.evidence === 'ROM_STATIC_VERIFIED');
  const pending = STORY_EVALUATOR_OPS.filter(o => o.evidence === 'PENDING_REVERIFY');
  check('evaluator: 7 ROM_STATIC_VERIFIED ($85..$8B)', verified.length === 7, `got ${verified.length}`);
  check('evaluator: 5 PENDING_REVERIFY ($8C..$90)', pending.length === 5, `got ${pending.length}`);
  check('evaluator: 12 total', STORY_EVALUATOR_OPS.length === 12, `got ${STORY_EVALUATOR_OPS.length}`);
  check('evaluator: ADD = $85', STORY_EVALUATOR_OPS.find(o => o.opcode === 0x85)?.name === 'ADD');
  check('evaluator: SUB = $86', STORY_EVALUATOR_OPS.find(o => o.opcode === 0x86)?.name === 'SUB');
  check('evaluator: EQ = $8B', STORY_EVALUATOR_OPS.find(o => o.opcode === 0x8b)?.name === 'EQ');
  check('evaluator: LT = $87', STORY_EVALUATOR_OPS.find(o => o.opcode === 0x87)?.name === 'LT');
  check('evaluator: GTE = $8A', STORY_EVALUATOR_OPS.find(o => o.opcode === 0x8a)?.name === 'GTE');
  check('evaluator: $84 unassigned (was ADD)', EVALUATOR_UNASSIGNED.opcode === 0x84 && EVALUATOR_UNASSIGNED.formerName === 'ADD');
  check('evaluator: all 2-operand', STORY_EVALUATOR_OPS.every(o => o.operands === 2));
  check('evaluator: no dup opcode', new Set(STORY_EVALUATOR_OPS.map(o => o.opcode)).size === STORY_EVALUATOR_OPS.length);
}

// ── C) USA charset ──
{
  const upper = USA_CHARSET.filter(g => g.kind === 'upper');
  const lower = USA_CHARSET.filter(g => g.kind === 'lower');
  const punct = USA_CHARSET.filter(g => g.kind === 'punct');
  check('charset: 26 uppercase', upper.length === 26, `got ${upper.length}`);
  check('charset: 26 lowercase', lower.length === 26, `got ${lower.length}`);
  check('charset: 13 punctuation', punct.length === 13, `got ${punct.length}`);
  check('charset: 65 total entries', USA_CHARSET.length === 65, `got ${USA_CHARSET.length}`);

  const bytes = new Set<number>();
  for (const g of USA_CHARSET) {
    if (bytes.has(g.glyphByte)) check(`charset byte $${g.glyphByte.toString(16)} unique`, false, 'dup');
    bytes.add(g.glyphByte);
  }
  check('charset: no duplicate bytes', bytes.size === USA_CHARSET.length);

  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const a = 'abcdefghijklmnopqrstuvwxyz';
  for (const c of A) check(`charset upper '${c}' present`, upper.some(g => g.char === c));
  for (const c of a) check(`charset lower '${c}' present`, lower.some(g => g.char === c));

  check('charset: gap $0A absent (upper)', !USA_CHARSET.some(g => g.glyphByte === 0x0a));
  check('charset: gap $1A absent (lower)', !USA_CHARSET.some(g => g.glyphByte === 0x1a));
  check('charset: gap $22 absent (lower)', !USA_CHARSET.some(g => g.glyphByte === 0x22));

  const bang = USA_CHARSET.filter(g => g.char.startsWith('!'));
  check('charset: 4 distinct bang glyphs (!/!!/!!!/!!!!)', bang.length === 4, `got ${bang.length}`);
  check('charset: bang bytes distinct', new Set(bang.map(g => g.glyphByte)).size === 4);

  const goku = decodeUsaGlyphs([0xfd, 0x23, 0x1e, 0x29]);
  check('decode: Goku ($FD $23 $1E $29)', goku === 'Goku', `got "${goku}"`);
  const gohan = decodeUsaGlyphs([0xfd, 0x23, 0x1b, 0x13, 0x21]);
  check('decode: Gohan ($FD $23 $1B $13 $21)', gohan === 'Gohan', `got "${gohan}"`);
}

// ── D) Speaker table ──
{
  check('speakers: 48 entries', SPEAKER_NAMEPLATES.length === 48, `got ${SPEAKER_NAMEPLATES.length}`);
  const ids = SPEAKER_NAMEPLATES.map(s => s.speakerId);
  check('speakers: ids 00..47 continuous', ids.every((id, i) => id === i));
  const names = new Set(SPEAKER_NAMEPLATES.map(s => s.name));
  check('speakers: no duplicate names', names.size === 48, `got ${names.size} unique`);
  check('speakers: id 0 = Gohan', speakerById(0)?.name === 'Gohan');
  check('speakers: id 7 = Goku', speakerById(7)?.name === 'Goku');
  check('speakers: id 47 = Baba', speakerById(47)?.name === 'Baba');
  check('speakers: id 19 = Frieza', speakerById(19)?.name === 'Frieza');
}

// ── E) Story locations ──
{
  check('locations: 32 entries', STORY_LOCATIONS.length === 32, `got ${STORY_LOCATIONS.length}`);
  const main = STORY_LOCATIONS.filter(s => s.kind === 'MAIN');
  const extra = STORY_LOCATIONS.filter(s => s.kind === 'EXTRA');
  check('locations: 30 MAIN', main.length === 30, `got ${main.length}`);
  check('locations: 2 EXTRA', extra.length === 2, `got ${extra.length}`);

  const ids = STORY_LOCATIONS.map(s => s.storyId).sort((a, b) => a - b);
  const expectedIds = [...Array.from({ length: 30 }, (_, i) => i + 1), 33, 34];
  check('locations: ids = 01..30 + 33,34', ids.length === 32 && ids.every((id, i) => id === expectedIds[i]));

  const keys = new Set(STORY_LOCATIONS.map(s => `${s.bank.toString(16)}:${s.address.toString(16)}`));
  check('locations: no duplicate bank:address', keys.size === 32);

  const s1 = storyLocationById(1);
  check('location: story 1 @ Bank04:$444E', s1?.bank === 0x04 && s1?.address === 0x444e);
  const s33 = storyLocationById(33);
  check('location: story 33 (extra) @ Bank0D:$5C84', s33?.bank === 0x0d && s33?.address === 0x5c84 && s33?.kind === 'EXTRA');

  const bankSet = new Set(STORY_BANKS);
  check('locations: all banks within STORY_BANKS', STORY_LOCATIONS.every(s => bankSet.has(s.bank)));
}

// ── F) Registers ──
{
  const addrs = STORY_VM_REGISTERS.map(r => r.address);
  check('registers: C501..C50A present', [0xc501, 0xc502, 0xc503, 0xc504, 0xc505, 0xc506, 0xc507, 0xc508, 0xc509, 0xc50a].every(a => addrs.includes(a)));
  check('registers: choice temps C50C/C50E present', [0xc50c, 0xc50e].every(a => addrs.includes(a)));
  check('registers: referenced temps present', [0xc517, 0xc51c, 0xc51d, 0xc51f].every(a => addrs.includes(a)));
  check('registers: no duplicate address', new Set(addrs).size === addrs.length);
}

// ── G) Dispatch / container / banks / portrait ──
{
  check('dispatch: dispatcher ROM0:$18C9', STORY_VM_DISPATCH.dispatcher === 0x18c9);
  check('dispatch: jump table $C532', STORY_VM_DISPATCH.jumpTable === 0xc532);
  check('dispatch: evaluator ROM0:$16F2', STORY_VM_DISPATCH.evaluator === 0x16f2);
  check('dispatch: max opcode observed $47', STORY_VM_DISPATCH.opcodeMaxObserved === 0x47);

  check('container: constant = 2', STORY_CHUNK_CONTAINER.constantValue === 2);
  check('container: unit multiplier = 4', STORY_CHUNK_CONTAINER.unitMultiplier === 4);
  check('container: marker prefix 01 02 68 01 00', STORY_CHUNK_CONTAINER.markerPrefix.join(',') === '1,2,104,1,0');

  check('banks: 17 narrative banks', STORY_BANKS.length === 17, `got ${STORY_BANKS.length}`);
  check('banks: no duplicate', new Set(STORY_BANKS).size === 17);

  check('portrait: slot0 $8800 / slot1 $8A30', PORTRAIT_RESOLUTION.slot0Vram === 0x8800 && PORTRAIT_RESOLUTION.slot1Vram === 0x8a30);
}

// ── H) Map entity / scene modes / camera / runtime memory / persistence / bgm ──
{
  check('map-entity: 10-byte record', STORY_MAP_ENTITY_RECORD.sizeBytes === 10);
  check('map-entity: resolver Bank3:$7048 CA06 + entityId×10', STORY_MAP_ENTITY_RECORD.resolver.includes('entityId × 10'));
  check('map-entity: fields include baseTileIndex/baseOamAttributes', 'baseTileIndex' in STORY_MAP_ENTITY_RECORD.fields && 'baseOamAttributes' in STORY_MAP_ENTITY_RECORD.fields);
  check('map-entity: fields include animationTick/animationTilePhase', 'animationTick' in STORY_MAP_ENTITY_RECORD.fields && 'animationTilePhase' in STORY_MAP_ENTITY_RECORD.fields);
  check('map-entity: 4 modes $0A/$14/$19/$1E', Object.keys(STORY_MAP_ENTITY_RECORD.modes).length === 4);
  check('map-entity: mode $0A = SET_STORY_ENTITY_MAP_SPRITE_RESOURCE', STORY_MAP_ENTITY_RECORD.modes['0x0a'].includes('SET_STORY_ENTITY_MAP_SPRITE_RESOURCE'));
  check('map-entity: mode $1E = SET_STORY_ENTITY_DIRECTION', STORY_MAP_ENTITY_RECORD.modes['0x1e'].includes('SET_STORY_ENTITY_DIRECTION'));
  check('map-entity: mode $14 = MODIFY_STORY_ENTITY_FLAGS', STORY_MAP_ENTITY_RECORD.modes['0x14'].includes('MODIFY_STORY_ENTITY_FLAGS'));
  check('map-sprite: Bank12 43 resources', STORY_MAP_SPRITE_RESOURCE_TABLE.bank === 0x12 && STORY_MAP_SPRITE_RESOURCE_TABLE.resourceCount === 43);
  check('map-sprite: resource not always character', STORY_MAP_SPRITE_RESOURCE_TABLE.kindModel.includes('not necessarily a character identity'));
  check('map-sprite: kinds include character/object/effect/marker/unknown', STORY_MAP_SPRITE_RESOURCE_TABLE.allowedKinds.join(',') === 'CHARACTER,OBJECT,EFFECT,MARKER,UNKNOWN');
  check('map-sprite: normal layout BGR555/2bpp', STORY_MAP_SPRITE_RESOURCE_TABLE.normalResourceLayout.paletteBytes.includes('BGR555') && STORY_MAP_SPRITE_RESOURCE_TABLE.normalResourceLayout.tileBytes.includes('2bpp'));
  check('map-sprite: 24 tiles = 6 frames', STORY_MAP_SPRITE_RESOURCE_TABLE.commonNormalTileCount === 24 && STORY_MAP_SPRITE_RESOURCE_TABLE.commonNormalFrames.includes('6 frames'));
  check('map-scene: 4 modes', Object.keys(STORY_MAP_SCENE_MODES).length === 4);
  check('camera: clamp consumer $6A86', STORY_MAP_CAMERA_CLAMP.consumer === '$6A86');

  // trigger table ($2C)
  check('trigger-table: base CA6A', STORY_MAP_TRIGGER_TABLE.baseAddress === 0xca6a);
  check('trigger-table: 8 records × 4 bytes = 32', STORY_MAP_TRIGGER_TABLE.recordCount === 8 && STORY_MAP_TRIGGER_TABLE.recordSizeBytes === 4 && STORY_MAP_TRIGGER_TABLE.totalBytes === 32);
  check('trigger-record: fields tileY/tileX/gateOffset/eventId', ['tileY', 'tileX', 'c1xxGateOffset', 'eventId'].every(f => f in STORY_MAP_TRIGGER_RECORD.fields));
  check('trigger-record: 2 modes $0A/$14', Object.keys(STORY_MAP_TRIGGER_RECORD.modes).length === 2);
  check('trigger-record: $14 = REGISTER', STORY_MAP_TRIGGER_RECORD.modes['0x14'].includes('REGISTER_STORY_MAP_TRIGGER'));
  check('trigger-record: $0A = CLEAR', STORY_MAP_TRIGGER_RECORD.modes['0x0a'].includes('CLEAR_STORY_MAP_TRIGGER_BY_EVENT_ID'));

  // enemy member record ($23)
  check('enemy-member: 13-byte record', ENEMY_MEMBER_RECORD.sizeBytes === 13);
  check('enemy-member: maxLife/currentLife/str/ki/spd fields', ['maxLife', 'currentLife', 'strength', 'ki', 'speed'].every(f => f in ENEMY_MEMBER_RECORD.fields));

  check('runtime-memory: 54 entries', STORY_RUNTIME_MEMORY.length === 54, `got ${STORY_RUNTIME_MEMORY.length}`);
  const memAddrs = new Set(STORY_RUNTIME_MEMORY.map(m => m.address));
  check('runtime-memory: no duplicate addresses', memAddrs.size === STORY_RUNTIME_MEMORY.length);
  check('runtime-memory: all in WRAM $C000..$DFFF', STORY_RUNTIME_MEMORY.every(m => m.address >= 0xc000 && m.address <= 0xdfff));

  const byAddr = (a: number) => STORY_RUNTIME_MEMORY.find(m => m.address === a);
  check('runtime-memory: CEA7 = REWARD_CANDIDATES', byAddr(0xcea7)?.name === 'REWARD_CANDIDATES');
  check('runtime-memory: CDF3 = CARD_QUANTITIES', byAddr(0xcdf3)?.name === 'CARD_QUANTITIES');
  check('runtime-memory: C445 = CHOICE_SELECTED_INDEX', byAddr(0xc445)?.name === 'CHOICE_SELECTED_INDEX');
  check('runtime-memory: C240 = CALLBACK_TABLE', byAddr(0xc240)?.name === 'CALLBACK_TABLE');
  check('runtime-memory: CA06 = MAP_ENTITY_TABLE_BASE', byAddr(0xca06)?.name === 'MAP_ENTITY_TABLE_BASE');
  check('runtime-memory: C0A3 = BATTLE_RESULT', byAddr(0xc0a3)?.name === 'BATTLE_RESULT');
  check('runtime-memory: C0F9 = HP_GROWTH_LEVEL', byAddr(0xc0f9)?.name === 'HP_GROWTH_LEVEL');
  check('runtime-memory: C0FA = STR_GROWTH_LEVEL', byAddr(0xc0fa)?.name === 'STR_GROWTH_LEVEL');
  check('runtime-memory: C0FC = SPD_GROWTH_LEVEL', byAddr(0xc0fc)?.name === 'SPD_GROWTH_LEVEL');
  check('runtime-memory: CA52 = ENEMY_AGGREGATE_LEVEL', byAddr(0xca52)?.name === 'ENEMY_AGGREGATE_LEVEL');
  check('runtime-memory: CC01 = ENEMY_MEMBER_RECORD_BASE', byAddr(0xcc01)?.name === 'ENEMY_MEMBER_RECORD_BASE');
  check('runtime-memory: CA6A = STORY_MAP_TRIGGER_TABLE_BASE', byAddr(0xca6a)?.name === 'STORY_MAP_TRIGGER_TABLE_BASE');
  check('runtime-memory: C0AF = STORY_MAP_TRIGGER_EVENT_ID', byAddr(0xc0af)?.name === 'STORY_MAP_TRIGGER_EVENT_ID');
  check('runtime-memory: C0A1 = STORY_MAP_TRIGGER_RESULT_FLAG', byAddr(0xc0a1)?.name === 'STORY_MAP_TRIGGER_RESULT_FLAG');
  check('runtime-memory: C012 = STORY_MAP_TRIGGER_ACTION_GATE', byAddr(0xc012)?.name === 'STORY_MAP_TRIGGER_ACTION_GATE');
  check('runtime-memory: C009 = SOFT_SESSION_REINITIALIZE_REQUEST', byAddr(0xc009)?.name === 'SOFT_SESSION_REINITIALIZE_REQUEST');
  check('runtime-memory: C008 = DEEPER_MAIN_LOOP_REINITIALIZE_REQUEST', byAddr(0xc008)?.name === 'DEEPER_MAIN_LOOP_REINITIALIZE_REQUEST');
  check('runtime-memory: C022 = SESSION_LOAD_CONTEXT_MODE', byAddr(0xc022)?.name === 'SESSION_LOAD_CONTEXT_MODE');
  check('runtime-memory: C069 = SESSION_LOAD_WORK_FLAG', byAddr(0xc069)?.name === 'SESSION_LOAD_WORK_FLAG');
  check('runtime-memory: CC1D = PERSISTENT_SAVE_REGION_START', byAddr(0xcc1d)?.name === 'PERSISTENT_SAVE_REGION_START');
  check('runtime-memory: CE6F = PERSISTENT_SAVE_REGION_END', byAddr(0xce6f)?.name === 'PERSISTENT_SAVE_REGION_END');
  check('runtime-memory: CA8A = MAP_TRIGGER_ARG_A', byAddr(0xca8a)?.name === 'MAP_TRIGGER_ARG_A');
  check('runtime-memory: CA8D = MAP_TRIGGER_ARG_D', byAddr(0xca8d)?.name === 'MAP_TRIGGER_ARG_D');
  check('runtime-memory: CCBE = VEGITO_PERSISTENT_LEVEL', byAddr(0xccbe)?.name === 'VEGITO_PERSISTENT_LEVEL');
  check('runtime-memory: CCBF = VEGITO_PERSISTENT_EXP_LO', byAddr(0xccbf)?.name === 'VEGITO_PERSISTENT_EXP_LO');
  check('runtime-memory: CCC0 = VEGITO_PERSISTENT_EXP_HI', byAddr(0xccc0)?.name === 'VEGITO_PERSISTENT_EXP_HI');
  check('runtime-memory: CCC1 = VEGITO_PERSISTENT_HP_GROWTH_LEVEL', byAddr(0xccc1)?.name === 'VEGITO_PERSISTENT_HP_GROWTH_LEVEL');
  check('runtime-memory: CCC2 = VEGITO_PERSISTENT_STR_GROWTH_LEVEL', byAddr(0xccc2)?.name === 'VEGITO_PERSISTENT_STR_GROWTH_LEVEL');
  check('runtime-memory: CCC3 = VEGITO_PERSISTENT_KI_GROWTH_LEVEL', byAddr(0xccc3)?.name === 'VEGITO_PERSISTENT_KI_GROWTH_LEVEL');
  check('runtime-memory: CCC4 = VEGITO_PERSISTENT_SPD_GROWTH_LEVEL', byAddr(0xccc4)?.name === 'VEGITO_PERSISTENT_SPD_GROWTH_LEVEL');
  check('runtime-memory: CDCD = BATTLE_LOADOUT_FIGHTER_ID_BLOCK', byAddr(0xcdcd)?.name === 'BATTLE_LOADOUT_FIGHTER_ID_BLOCK');
  check('runtime-memory: CDD0 = BATTLE_LOADOUT_LIMIT_ATTACK_ID_BLOCK', byAddr(0xcdd0)?.name === 'BATTLE_LOADOUT_LIMIT_ATTACK_ID_BLOCK');
  check('runtime-memory: CDDF = DECK_CARD_ID_BLOCK', byAddr(0xcddf)?.name === 'DECK_CARD_ID_BLOCK');

  // persistence ops
  check('persistence: 2 submodes ($10/$11)', STORY_PERSISTENCE_OPS.length === 2, `got ${STORY_PERSISTENCE_OPS.length}`);
  check('persistence: $10 = tutorial deck preset (STATIC)', STORY_PERSISTENCE_OPS.find(p => p.mode === 0x10)?.name === 'INITIALIZE_GIVE_TUTORIAL_CARD_COLLECTION_DECK_PRESET' && STORY_PERSISTENCE_OPS.find(p => p.mode === 0x10)?.evidence === 'ROM_STATIC_VERIFIED');
  check('persistence: $10 handler Bank7E:$4680', STORY_PERSISTENCE_OPS.find(p => p.mode === 0x10)?.handler?.address === 0x4680);
  check('persistence: $11 = vegito progression preset (STATIC)', STORY_PERSISTENCE_OPS.find(p => p.mode === 0x11)?.name === 'INSTALL_VEGITO_PERSISTENT_PROGRESSION_PRESET' && STORY_PERSISTENCE_OPS.find(p => p.mode === 0x11)?.evidence === 'ROM_STATIC_VERIFIED');
  check('persistence: $11 source Bank7E:$4DFB', STORY_PERSISTENCE_OPS.find(p => p.mode === 0x11)?.handler?.address === 0x4dfb);

  // vegito preset + persistent record + exp
  check('vegito: record 10 base CCBE', VEGITO_PERSISTENT_PROGRESSION_PRESET.recordIndex === 10 && VEGITO_PERSISTENT_PROGRESSION_PRESET.baseAddress === 0xccbe);
  check('vegito: bytes 04 00 00 01 01 01 01', VEGITO_PERSISTENT_PROGRESSION_PRESET.bytes.join(',') === '4,0,0,1,1,1,1');
  check('persistent-record: 16 bytes @ CC1D', PERSISTENT_RECORD.recordSizeBytes === 16 && PERSISTENT_RECORD.baseAddress === 0xcc1d);
  check('persistent-record: +08 limitCount', PERSISTENT_RECORD.fields.limitCount.includes('+08'));
  check('persistent-record: +09..+13 limitAttackIds', PERSISTENT_RECORD.fields.limitAttackIds.includes('+09..+13'));
  check('persistent-record: +14 reserved zero', PERSISTENT_RECORD.fields.reservedZero.includes('+14'));
  check('persistent-record: +15 padding/no consumer', PERSISTENT_RECORD.fields.paddingOrNoConsumer.includes('+15'));
  check('battle-loadout: CDCD..CDF2 38 bytes', STORY_BATTLE_LOADOUT_PRESET.baseAddress === 0xcdcd && STORY_BATTLE_LOADOUT_PRESET.totalBytes === 38);
  check('battle-loadout: 3 fighter ids', STORY_BATTLE_LOADOUT_PRESET.fighterIds.count === 3 && STORY_BATTLE_LOADOUT_PRESET.fighterIds.range === 'CDCD..CDCF');
  check('battle-loadout: 15 limit ids = 3×5', STORY_BATTLE_LOADOUT_PRESET.limitAttackIds.count === 15 && STORY_BATTLE_LOADOUT_PRESET.limitAttackIds.fighters === 3 && STORY_BATTLE_LOADOUT_PRESET.limitAttackIds.slotsPerFighter === 5);
  check('battle-loadout: 20 deck ids', STORY_BATTLE_LOADOUT_PRESET.deckCardIds.count === 20 && STORY_BATTLE_LOADOUT_PRESET.deckCardIds.range === 'CDDF..CDF2');
  check('battle-loadout: limits feed CB1D..CB2B', STORY_BATTLE_LOADOUT_PRESET.destinations.battleLimitRange === 'CB1D..CB2B');
  check('exp: cap 500 max level 4', PERSISTENT_LEVEL_EXP_THRESHOLDS.expCap === 500 && PERSISTENT_LEVEL_EXP_THRESHOLDS.maxLevel === 4);
  check('exp: thresholds 3/15/50/500', PERSISTENT_LEVEL_EXP_THRESHOLDS.level0To1 === 3 && PERSISTENT_LEVEL_EXP_THRESHOLDS.level1To2 === 15 && PERSISTENT_LEVEL_EXP_THRESHOLDS.level2To3 === 50 && PERSISTENT_LEVEL_EXP_THRESHOLDS.level3To4 === 500);

  // session load modes
  check('session-load: mode 0 = LOAD_SRAM_IMMEDIATE', STORY_SESSION_LOAD_MODES['0x00'].includes('LOAD_SRAM_IMMEDIATE'));
  check('session-load: nonzero = soft restart', STORY_SESSION_LOAD_MODES.nonzero.includes('SOFT_RESTART'));

  // bgm table + semantics
  check('bgm: table 20 entries', BGM_TABLE.length === 20, `got ${BGM_TABLE.length}`);
  check('bgm: table no dup ids', new Set(BGM_TABLE.map(b => b.bgmId)).size === 20);
  check('bgm: id 00 = Bank75:$5000', BGM_TABLE[0].bank === 0x75 && BGM_TABLE[0].pointer === 0x5000);
  check('bgm: id 19 = Bank77:$6F00', BGM_TABLE[19].bank === 0x77 && BGM_TABLE[19].pointer === 0x6f00);
  check('bgm: 16 BGM + 4 jingles', BGM_TABLE.filter(b => b.kind === 'BGM').length === 16 && BGM_TABLE.filter(b => b.kind === 'JINGLE').length === 4);
  check('bgm: jingle ROM IDs 03/04/06/07', BGM_ARCHITECTURE.jingleRomIds.join(',') === '3,4,6,7');
  check('bgm: ROM 03/04/06/07 map to jingle subsongs 1..4', BGM_TABLE.filter(b => b.kind === 'JINGLE').map(b => b.gbsSubsong).join(',') === '1,2,3,4');
  check('bgm: ROM 0A = BGM subsong 7', BGM_TABLE.find(b => b.bgmId === 0x0a)?.kind === 'BGM' && BGM_TABLE.find(b => b.bgmId === 0x0a)?.gbsSubsong === 7);
  check('bgm: arch bankTable $42B8 / ptrTable $42CC', BGM_ARCHITECTURE.bankTable === 'Bank7E:$42B8' && BGM_ARCHITECTURE.pointerTable === 'Bank7E:$42CC');
  check('bgm: external correlation keeps human labels pending', BGM_EXTERNAL_CORRELATION.humanTrackLabels === 'PENDING_CALLSITE_CORRELATION');
  check('bgm: 1 known semantic', BGM_KNOWN_SEMANTICS.length === 1, `got ${BGM_KNOWN_SEMANTICS.length}`);
  check('bgm: $0A = system screen music', BGM_KNOWN_SEMANTICS.find(b => b.bgmId === 0x0a)?.name === 'SYSTEM_SCREEN_PRE_BATTLE_SETUP_MUSIC');

  // sfx catalog + semantics
  check('sfx: catalog 85 ids', SFX_CATALOG.idCount === 85, `got ${SFX_CATALOG.idCount}`);
  check('sfx: header "SE" @ Bank79:$5000', SFX_CATALOG.headerBank === 0x79 && SFX_CATALOG.headerAddress === 0x5000 && SFX_CATALOG.headerMagic === '"SE"');
  check('sfx: first resource $50AE', SFX_CATALOG.firstResourceAddress === 0x50ae);
  check('sfx: 3 known semantics', SFX_KNOWN_SEMANTICS.length === 3, `got ${SFX_KNOWN_SEMANTICS.length}`);
  check('sfx: $00 = CURSOR_MOVE (STATIC)', SFX_KNOWN_SEMANTICS.find(s => s.sfxId === 0x00)?.name === 'CURSOR_MOVE' && SFX_KNOWN_SEMANTICS.find(s => s.sfxId === 0x00)?.evidence === 'ROM_STATIC_VERIFIED');
  check('sfx: $01 = CONFIRM_ACTION (STATIC)', SFX_KNOWN_SEMANTICS.find(s => s.sfxId === 0x01)?.name === 'CONFIRM_ACTION');
  check('sfx: $02 = CANCEL_BACK (HIGH_CONF)', SFX_KNOWN_SEMANTICS.find(s => s.sfxId === 0x02)?.name === 'CANCEL_BACK' && SFX_KNOWN_SEMANTICS.find(s => s.sfxId === 0x02)?.evidence === 'HIGH_CONFIDENCE_STATIC');
}

// ── Summary ──
console.log(`\n${passed} passed, ${failures} failed`);
if (failures > 0) {
  process.exit(1);
}
