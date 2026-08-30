// ═══════════════════════════════════════════════════════════════════════
// VERIFY: ROM SpecialHandlers + PaletteTransition SSOT
// Uso: npm run verify:rom-special-handlers
// ═══════════════════════════════════════════════════════════════════════
import {
  ROM_SPECIAL_HANDLERS,
  VBALL_CRASH_MACROS,
  specialHandlerById,
} from '../src/battle/romSpecialHandlers';
import {
  PALETTE_TRANSITION_ROUTINES,
  PALETTE_TRANSITION_CALL_SIGNATURE,
  PALETTE_TRANSITION_BUFFERS,
  PALETTE_TRANSITION_PARAMETERS,
  PALETTE_TRANSITION_KNOWN_MASKS,
  PALETTE_TRANSITION_EXAMPLE_CALL,
  PALETTE_TRANSITION_MODES,
  PALETTE_TRANSITION_STANDARD,
  PALETTE_TRANSITION_CALLSITE_DURATIONS,
  PALETTE_TRANSITION_WORKER,
  PALETTE_TRANSITION_CLOSURE,
} from '../src/battle/romPaletteTransition';

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

// ── Special handlers ──
{
  check('handlers: 5 entries', ROM_SPECIAL_HANDLERS.length === 5, `got ${ROM_SPECIAL_HANDLERS.length}`);

  const rocket = specialHandlerById(0x05);
  check('Rocket Punch: delegates beam $02', rocket?.delegatesTo === 'beam $02');
  check('Rocket Punch: wait frame 4, scroll -6×19', rocket?.launch?.waitFrame === 4 && rocket?.launch?.scrollPerTick === -6 && rocket?.launch?.scrollTicks === 19);
  check('Rocket Punch: STANDARD_ATTACK state $14 override only', rocket?.standardAttackOverride?.overrideState === 0x14 && rocket.standardAttackOverride.returnsToCommonWorker);
  check('Rocket Punch: resource $1D seq0 = 9 frames / 82t', rocket?.physicalAnimation?.animationResource === 0x1d && rocket.physicalAnimation.sequence === 0 && rocket.physicalAnimation.frameInstances === 9 && rocket.physicalAnimation.totalTicks === 82);
  check('Rocket Punch: hold 60', rocket?.holdTicks === 60);

  const potbelly = specialHandlerById(0x06);
  check('Potbelly: wait frame 7, scroll -6×16', potbelly?.launch?.waitFrame === 7 && potbelly?.launch?.scrollTicks === 16);
  check('Potbelly: STANDARD_ATTACK state $14 override only', potbelly?.standardAttackOverride?.overrideState === 0x14 && potbelly.standardAttackOverride.setupResultCleanupShared);
  check('Potbelly: resource $1F seq0 = 12 frames / 183t', potbelly?.physicalAnimation?.animationResource === 0x1f && potbelly.physicalAnimation.sequence === 0 && potbelly.physicalAnimation.frameInstances === 12 && potbelly.physicalAnimation.totalTicks === 183);

  const pcomet = specialHandlerById(0x0d);
  check('Purple Comet: seq0/seq1, wait frame $4B', pcomet?.activatedObjects?.sequences[0] === 0 && pcomet?.activatedObjects?.sequences[1] === 1 && pcomet?.activatedObjects?.waitSecondFrame === 0x4b);
  check('Purple Comet: partner = attackerFormId XOR 1', pcomet?.ownership?.partnerForm === 'attackerFormId XOR 1');
  check('Purple Comet: reuses target object, no third AO', pcomet?.ownership?.secondaryObject.includes('temporary target-object') && pcomet?.ownership?.note.includes('No third ActionObject'));

  const pcometZ = specialHandlerById(0x0e);
  check('P.Comet Z: seq2/seq3', pcometZ?.activatedObjects?.sequences[0] === 2 && pcometZ?.activatedObjects?.sequences[1] === 3);
  check('P.Comet Z: scroll -6×42, WAIT 20', pcometZ?.launch?.scrollTicks === 42 && pcometZ?.holdTicks === 20);
  check('P.Comet Z: ownership physical-object based', pcometZ?.ownership?.note.includes('physical-object'));

  const vball = specialHandlerById(0x0c);
  check('V-ball: FSM 0x32→0x38', vball?.fsm === '0x32 → 0x38');
  check('V-ball: 3 macros', vball?.macros?.length === 3, `got ${vball?.macros?.length}`);
}

// ── V-ball macros ──
{
  check('macros: $3B/$3C/$3D', VBALL_CRASH_MACROS.map(m => m.byte).join(',') === '59,60,61', VBALL_CRASH_MACROS.map(m => m.byte).join(','));
  const b = VBALL_CRASH_MACROS[0];
  check('macro $3B: 5 records', b.records.length === 5, `got ${b.records.length}`);
  check('macro $3B: rec0 = slot1 seq15', b.records[0].slot === 1 && b.records[0].sequence === 15 && !b.records[0].wait);
  check('macro $3B: rec1 = wait slot1', b.records[1].slot === 1 && b.records[1].wait);
  const c = VBALL_CRASH_MACROS[1];
  check('macro $3C: 3 records', c.records.length === 3, `got ${c.records.length}`);
  const d = VBALL_CRASH_MACROS[2];
  check('macro $3D: 5 records', d.records.length === 5, `got ${d.records.length}`);
  check('macro $3D: rec3 = slot1 seq19', d.records[3].slot === 1 && d.records[3].sequence === 19 && !d.records[3].wait);
  check('macro $3D: rec4 = wait slot1', d.records[4].slot === 1 && d.records[4].wait);
}

// ── Palette transition ──
{
  check('palette: install $07F4 / poll $080C', PALETTE_TRANSITION_ROUTINES.install === 0x07f4 && PALETTE_TRANSITION_ROUTINES.poll === 0x080c);
  check('palette: call signature A/BC/E/D', PALETTE_TRANSITION_CALL_SIGNATURE.registers.mode === 'A' && PALETTE_TRANSITION_CALL_SIGNATURE.registers.paletteMask16 === 'BC' && PALETTE_TRANSITION_CALL_SIGNATURE.registers.maxCounter === 'E' && PALETTE_TRANSITION_CALL_SIGNATURE.registers.channelStep === 'D');
  check('palette: immediate C0F9..C0FD', PALETTE_TRANSITION_CALL_SIGNATURE.immediateStorage.mode === 0xc0f9 && PALETTE_TRANSITION_CALL_SIGNATURE.immediateStorage.channelStep === 0xc0fd);
  check('palette: worker C41D..C422', PALETTE_TRANSITION_CALL_SIGNATURE.workerStorage.mode === 0xc41d && PALETTE_TRANSITION_CALL_SIGNATURE.workerStorage.currentCounter === 0xc422);
  check('palette: buffers C600/C640/C680/C6C0', PALETTE_TRANSITION_BUFFERS.baseBg.start === 0xc600 && PALETTE_TRANSITION_BUFFERS.baseObj.start === 0xc640 && PALETTE_TRANSITION_BUFFERS.workingBg.start === 0xc680 && PALETTE_TRANSITION_BUFFERS.workingObj.start === 0xc6c0);
  check('palette: buffer layout BGR555 8×4×2', PALETTE_TRANSITION_BUFFERS.format === 'BGR555' && PALETTE_TRANSITION_BUFFERS.groupLayout.includes('8 palettes'));
  check('palette: params mode/mask/maxCounter/channelStep', PALETTE_TRANSITION_PARAMETERS.paletteMask16.includes('BG0') && PALETTE_TRANSITION_PARAMETERS.maxCounter.includes('counter'));
  check('palette: mode 1 = flash to white', PALETTE_TRANSITION_MODES[1].name === 'FADE_FLASH_TO_WHITE');
  check('palette: mode 0 = restore to base', PALETTE_TRANSITION_MODES[0].name === 'RESTORE_FROM_WHITE_TO_BASE');
  check('palette: maxCounter $10 → 17 worker executions', PALETTE_TRANSITION_STANDARD.maxCounter === 0x10 && PALETTE_TRANSITION_STANDARD.workerExecutions === 17);
  check('palette: transform then counter++', PALETTE_TRANSITION_WORKER.transformOrder.includes('transform first'));
  check('palette: known combat masks include $0308/$03BF', PALETTE_TRANSITION_KNOWN_MASKS.includes(0x0308) && PALETTE_TRANSITION_KNOWN_MASKS.includes(0x03bf));
  check('palette: example $0308 = BG3 + OBJ0 + OBJ1', PALETTE_TRANSITION_EXAMPLE_CALL.paletteMask16 === 0x0308 && PALETTE_TRANSITION_EXAMPLE_CALL.meaning.includes('BG3 + OBJ0 + OBJ1'));
  check('palette: callsite durations $1F/$20', PALETTE_TRANSITION_CALLSITE_DURATIONS[0] === 0x1f && PALETTE_TRANSITION_CALLSITE_DURATIONS[1] === 0x20);
  check('palette: algorithm closed, Pixi not ported', PALETTE_TRANSITION_CLOSURE.timingClosed === true && PALETTE_TRANSITION_CLOSURE.bgr555TransformClosed === true && PALETTE_TRANSITION_CLOSURE.bgr555TransformPorted === false);
}

console.log(`\n${passed} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
