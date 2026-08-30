// ═══════════════════════════════════════════════════════════════════════
// VERIFY: ROM ActionObject SSOT (anchors / binding / visibility / conversion)
// Uso: npm run verify:rom-action-object
// ═══════════════════════════════════════════════════════════════════════
import {
  ACTION_ANCHOR_TABLE,
  ACTION_ANCHOR_CALLSITE_GROUPS,
  ACTION_ANCHOR_TABLE_CONSUMER,
  ACTION_ANCHOR_TABLE_WRAPPER,
  ACTION_ANCHOR_RESOLVER,
  ACTION_OBJECT_MEMORY,
  ACTION_OBJECT_BASE_POSITION,
  SET_OBJECT_POSITION_OPCODE,
  ACTION_OBJECT_BINDING,
  ACTION_OBJECT_FRAME_DELTA_COMMIT,
  ACTION_ANCHOR_RUSH_RELATION,
  ACTION_OBJECT_VISIBILITY,
  PRESENTATION_VM_OPCODE_SEMANTICS,
  anchorGroupById,
  presentationVmOpcodeByByte,
  pixiAnchors,
  gbcRawXToPixi,
  gbcRawYToPixi,
} from '../src/battle/romActionObject';

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

// ── Anchor table ──
{
  check('anchors: 4 groups', ACTION_ANCHOR_TABLE.length === 4, `got ${ACTION_ANCHOR_TABLE.length}`);
  check('anchors: consumer $597E', ACTION_ANCHOR_TABLE_CONSUMER === 'Bank7E:$597E');
  check('anchors: wrapper $3764', ACTION_ANCHOR_TABLE_WRAPPER === 'Bank00:$3764');
  check('anchors: resolver mentions slot+side+group', ACTION_ANCHOR_RESOLVER.includes('logical slot') && ACTION_ANCHOR_RESOLVER.includes('participant side'));

  const g0 = anchorGroupById('ANCHOR_GROUP_0');
  check('anchors: GROUP_0 A=(88,96) raw', g0?.sideA.rawX === 88 && g0?.sideA.rawY === 96);
  check('anchors: GROUP_0 B=(88,96) raw', g0?.sideB.rawX === 88 && g0?.sideB.rawY === 96);
  check('anchors: GROUP_0 = CENTER consumed', g0?.semantic === 'CENTER' && g0?.consumed === true);

  const g1 = anchorGroupById('ANCHOR_GROUP_1');
  check('anchors: GROUP_1 A=(71,96) B=(105,96)', g1?.sideA.rawX === 71 && g1?.sideB.rawX === 105 && g1?.sideA.rawY === 96);
  check('anchors: GROUP_1 = INNER_ACTION consumed', g1?.semantic === 'INNER_ACTION' && g1?.consumed === true);

  const g2 = anchorGroupById('ANCHOR_GROUP_2');
  check('anchors: GROUP_2 A=(43,96) B=(133,96)', g2?.sideA.rawX === 43 && g2?.sideB.rawX === 133);
  check('anchors: GROUP_2 = UNUSED_RESERVED no consumer', g2?.semantic === 'UNUSED_RESERVED' && g2?.consumed === false);

  const g3 = anchorGroupById('ANCHOR_GROUP_3_OFFSCREEN');
  check('anchors: GROUP_3 A=(233,96) B=(198,96)', g3?.sideA.rawX === 233 && g3?.sideB.rawX === 198);
  check('anchors: GROUP_3 = OFFSCREEN_ENTRY consumed', g3?.semantic === 'OFFSCREEN_ENTRY' && g3?.consumed === true);
  check('anchors: callsite groups no group2', ACTION_ANCHOR_CALLSITE_GROUPS.join(',') === '3,3,0,1,1,1,3,3,1,1,0,1');
  check('anchors: consumed groups exactly 0/1/3', new Set(ACTION_ANCHOR_CALLSITE_GROUPS).size === 3 && !ACTION_ANCHOR_CALLSITE_GROUPS.includes(2 as never));
}

// ── Conversion GBC → Pixi ──
{
  check('convert: gbcRawXToPixi(88) = 160', gbcRawXToPixi(88) === 160, `got ${gbcRawXToPixi(88)}`);
  check('convert: gbcRawYToPixi(96) = 160', gbcRawYToPixi(96) === 160, `got ${gbcRawYToPixi(96)}`);
  check('convert: gbcRawXToPixi(71) = 126', gbcRawXToPixi(71) === 126);
  check('convert: gbcRawXToPixi(105) = 194', gbcRawXToPixi(105) === 194);
  check('convert: gbcRawXToPixi(43) = 70', gbcRawXToPixi(43) === 70);
  check('convert: gbcRawXToPixi(133) = 250', gbcRawXToPixi(133) === 250);

  const pa = pixiAnchors();
  check('pixi: GROUP_0 A=(160,160)', pa.ANCHOR_GROUP_0.sideA.x === 160 && pa.ANCHOR_GROUP_0.sideA.y === 160);
  check('pixi: GROUP_1 A.x=126 B.x=194', pa.ANCHOR_GROUP_1.sideA.x === 126 && pa.ANCHOR_GROUP_1.sideB.x === 194);
  check('pixi: GROUP_2 A.x=70 B.x=250', pa.ANCHOR_GROUP_2.sideA.x === 70 && pa.ANCHOR_GROUP_2.sideB.x === 250);
  check('pixi: all Y = 160', pa.ANCHOR_GROUP_0.sideA.y === 160 && pa.ANCHOR_GROUP_1.sideA.y === 160 && pa.ANCHOR_GROUP_2.sideA.y === 160);
}

// ── Memory layout ──
{
  check('memory: object0 C3A0..C3B2', ACTION_OBJECT_MEMORY.object0.start === 0xc3a0 && ACTION_OBJECT_MEMORY.object0.end === 0xc3b2 && ACTION_OBJECT_MEMORY.object0.sizeBytes === 0x13);
  check('memory: object1 C3B3..C3C5', ACTION_OBJECT_MEMORY.object1.start === 0xc3b3 && ACTION_OBJECT_MEMORY.object1.end === 0xc3c5 && ACTION_OBJECT_MEMORY.object1.sizeBytes === 0x13);
  check('memory: base position starts $C3C8', ACTION_OBJECT_MEMORY.basePositionAddress === 0xc3c8);
  check('memory: baseY @ $C3C8', ACTION_OBJECT_MEMORY.baseY.address === 0xc3c8);
  check('memory: baseX @ $C3C9', ACTION_OBJECT_MEMORY.baseX.address === 0xc3c9);
  check('memory: base position stride 2', ACTION_OBJECT_MEMORY.basePositionStrideBytes === 2);
  check('base-position: object0/object1 C3C8..C3CB', ACTION_OBJECT_BASE_POSITION.object0.baseY === 0xc3c8 && ACTION_OBJECT_BASE_POSITION.object0.baseX === 0xc3c9 && ACTION_OBJECT_BASE_POSITION.object1.baseY === 0xc3ca && ACTION_OBJECT_BASE_POSITION.object1.baseX === 0xc3cb);
  check('base-position: set $0943 add $0955', ACTION_OBJECT_BASE_POSITION.setRoutine === 0x0943 && ACTION_OBJECT_BASE_POSITION.addRoutine === 0x0955);
  check('base-position: render = base + frame offset', ACTION_OBJECT_BASE_POSITION.positionModel.includes('base position + current animation frame offset'));
}

// ── Opcode $0A ──
{
  check('opcode: $0A byte', SET_OBJECT_POSITION_OPCODE.byte === 0x0a);
  check('opcode: name SET_OBJECT_POSITION', SET_OBJECT_POSITION_OPCODE.name === 'SET_OBJECT_POSITION');
  check('opcode: operand order [slot, baseY, baseX]', SET_OBJECT_POSITION_OPCODE.operandOrder[0] === 'slot' && SET_OBJECT_POSITION_OPCODE.operandOrder[1] === 'baseY' && SET_OBJECT_POSITION_OPCODE.operandOrder[2] === 'baseX');
}

// ── Binding (static-closed) ──
{
  const b = ACTION_OBJECT_BINDING;
  check('binding: logicalSlotStore C7D5/C7D6', b.logicalSlotStore[0] === 0xc7d5 && b.logicalSlotStore[1] === 0xc7d6);
  check('binding: logicalWriter $7318', b.logicalWriter === 0x7318);
  check('binding: wrapper $3F05', b.wrapper === 0x3f05);
  check('binding: participantRegisters CA59/CA5A', b.participantRegisters[0] === 0xca59 && b.participantRegisters[1] === 0xca5a, b.participantRegisters.join(','));
  check('binding: binder $6708 slot0=CA59 slot1=CA5A', b.binders[0].address === 0x6708 && b.binders[0].slot0Source === 0xca59 && b.binders[0].slot1Source === 0xca5a);
  check('binding: binder $6750 slot0=CA5A slot1=CA59', b.binders[1].address === 0x6750 && b.binders[1].slot0Source === 0xca5a && b.binders[1].slot1Source === 0xca59);
  check('binding: $6708 OFFENSE slot0 actor slot1 target', b.binders[0].context === 'OFFENSE' && b.binders[0].slot0Semantic === 'ACTOR_ATTACKER' && b.binders[0].slot1Semantic === 'TARGET_DEFENDER');
  check('binding: $6750 DEFENSE slot0 defender slot1 attacker', b.binders[1].context === 'DEFENSE_REACTION' && b.binders[1].slot0Semantic === 'DEFENDER' && b.binders[1].slot1Semantic === 'ATTACKER');
  check('binding: participantShift 1', b.participantShift === 1);
  check('binding: init alternating (1,2)/(2,1)', b.initAlternating[0][0] === 1 && b.initAlternating[0][1] === 2 && b.initAlternating[1][0] === 2 && b.initAlternating[1][1] === 1);
  check('binding: conclusion slot0≠player, semantics by binder', b.conclusion.includes('OFFENSE slot0=actor') && b.conclusion.includes('DEFENSE/REACTION slot0=defender'));
}

// ── Frame delta / rush geometry ──
{
  check('frame-delta: opcode $10 APPLY_FRAME_DELTA', ACTION_OBJECT_FRAME_DELTA_COMMIT.opcode === 0x10 && ACTION_OBJECT_FRAME_DELTA_COMMIT.name === 'APPLY_FRAME_DELTA');
  check('frame-delta: final = anchor + movement + frame delta', ACTION_OBJECT_FRAME_DELTA_COMMIT.geometry.includes('base anchor + ROM movement + current physical frame delta'));
  check('rush: group3 → group1 via 98px', ACTION_ANCHOR_RUSH_RELATION.from === 'ANCHOR_GROUP_3_OFFSCREEN' && ACTION_ANCHOR_RUSH_RELATION.toward === 'ANCHOR_GROUP_1' && ACTION_ANCHOR_RUSH_RELATION.rushDeltaPx === 98);
  check('rush: sideA residual +4', ACTION_ANCHOR_RUSH_RELATION.sideA.endAfterRushMod256 === 75 && ACTION_ANCHOR_RUSH_RELATION.sideA.residualPx === 4);
  check('rush: sideB residual -5', ACTION_ANCHOR_RUSH_RELATION.sideB.endAfterRush === 100 && ACTION_ANCHOR_RUSH_RELATION.sideB.residualPx === -5);
  check('anchors: group1 inner, group2 unused', ACTION_ANCHOR_RUSH_RELATION.semanticStatus.includes('GROUP_1 = INNER_ACTION') && ACTION_ANCHOR_RUSH_RELATION.semanticStatus.includes('GROUP_2 = UNUSED_RESERVED'));
}

// ── Visibility ──
{
  check('visibility: bit $80', ACTION_OBJECT_VISIBILITY.visibleBit === 0x80);
  check('visibility: HIDE opcode $08 → $0938', ACTION_OBJECT_VISIBILITY.hideOpcode === 0x08 && ACTION_OBJECT_VISIBILITY.hideRoutine === 0x0938);
  check('visibility: init $80/$A0', ACTION_OBJECT_VISIBILITY.initVisibleValues[0] === 0x80 && ACTION_OBJECT_VISIBILITY.initVisibleValues[1] === 0xa0);
}

// ── Presentation VM opcodes ──
{
  const opcodes = PRESENTATION_VM_OPCODE_SEMANTICS.map(o => o.opcode);
  check('vm-opcodes: 15 gameplay-safe opcodes', PRESENTATION_VM_OPCODE_SEMANTICS.length === 15);
  check('vm-opcodes: no duplicates', new Set(opcodes).size === opcodes.length);
  check('vm-opcodes: covers $01/$04/$05/$06/$07/$08/$0A/$0B/$0D/$0E/$0F/$10/$11/$13/$14',
    [0x01, 0x04, 0x05, 0x06, 0x07, 0x08, 0x0a, 0x0b, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x13, 0x14].every(op => opcodes.includes(op)));
  check('vm-opcodes: $0D is screen/display setup, not fighter motion',
    presentationVmOpcodeByByte(0x0d)?.name === 'SCREEN_DISPLAY_COORD_SETUP' &&
    presentationVmOpcodeByByte(0x0d)?.domain === 'screen' &&
    presentationVmOpcodeByByte(0x0d)?.mutatesFighterPosition === false);
  check('vm-opcodes: $0A/$0B/$10 are the position-mutating opcodes',
    PRESENTATION_VM_OPCODE_SEMANTICS.filter(o => o.mutatesFighterPosition).map(o => o.opcode).join(',') === '10,11,16');
  check('vm-opcodes: $13 is audio/SFX sync event',
    presentationVmOpcodeByByte(0x13)?.domain === 'audio' && presentationVmOpcodeByByte(0x13)?.name === 'SFX');
}

console.log(`\n${passed} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
