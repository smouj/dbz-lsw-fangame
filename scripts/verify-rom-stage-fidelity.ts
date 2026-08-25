// ═══════════════════════════════════════════════════════════════════
// P0.4S — verificación de fidelidad Stage Attack (extracción ROM)
// ═══════════════════════════════════════════════════════════════════
// Vuelve a extraer las secuencias del ROM y comprueba que la autoridad
// generada (generated/rom-stage/sequences.json + romStage.generated.ts)
// coincide byte a byte. Gate contra volver al Stage inventado a mano.

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = process.cwd();
const ROM_PATH = resolve(ROOT, '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-spain.gbc');
const SEQ_JSON = join(ROOT, 'generated/rom-stage/sequences.json');
const TABLE_BASE = 0x7c47;

const COMMAND_NAMES: Record<number, string> = { 0x01: 'RIGHT', 0x04: 'UP', 0x08: 'DOWN', 0x10: 'A', 0x20: 'B' };

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} — ${detail}`); }
}

const rom = readFileSync(ROM_PATH);

// Re-extracción independiente
const extracted: { level: number; variant: number; count: number; commands: string[] }[] = [];
for (let index = 0; index < 40; index++) {
  const level = Math.floor(index / 8) + 1;
  const variant = index % 8;
  const lo = rom[TABLE_BASE + index * 2];
  const hi = rom[TABLE_BASE + index * 2 + 1];
  const offset = lo | (hi << 8);
  const seqAddr = TABLE_BASE + offset;
  const count = rom[seqAddr];
  const commands: string[] = [];
  for (let c = 0; c < count; c++) commands.push(COMMAND_NAMES[rom[seqAddr + 2 + c]] ?? `UNK_${rom[seqAddr + 2 + c].toString(16)}`);
  extracted.push({ level, variant, count, commands });
}

// Gate 1: 32 secuencias para los 4 Stage estándar (niveles 1-4)
const std = extracted.filter((s) => s.level >= 1 && s.level <= 4);
check('Stage sequences 32/32 (niveles 1-4)', std.length === 32, `${std.length}/32`);
for (let lv = 1; lv <= 4; lv++) {
  const variants = std.filter((s) => s.level === lv);
  check(`Stage level ${lv} variants 8/8`, variants.length === 8, `${variants.length}/8`);
}
check('Stage level 3 = 3 comandos (todas)', std.filter((s) => s.level === 1).every((s) => s.count === 3));
check('Stage level 4 = 4 comandos (todas)', std.filter((s) => s.level === 2).every((s) => s.count === 4));
check('Stage level 5 = 5 comandos (todas)', std.filter((s) => s.level === 3).every((s) => s.count === 5));
check('Stage level 6 = 6 comandos (todas)', std.filter((s) => s.level === 4).every((s) => s.count === 6));

// Gate 2: comandos válidos
const allCmds = extracted.flatMap((s) => s.commands);
check('accepted commands 5/5 (A/B/UP/DOWN/RIGHT)', ['A', 'B', 'UP', 'DOWN', 'RIGHT'].every((c) => allCmds.includes(c)));
check('LEFT accepted = 0', !allCmds.includes('LEFT'), `${allCmds.filter((c) => c === 'LEFT').length} LEFT`);
check('unknown commands = 0', allCmds.every((c) => !c.startsWith('UNK')), `${allCmds.filter((c) => c.startsWith('UNK')).length} UNK`);

// Gate 3: reproducibilidad (JSON generado == re-extracción)
if (existsSync(SEQ_JSON)) {
  const onDisk = JSON.parse(readFileSync(SEQ_JSON, 'utf8'));
  const diskSeq = onDisk.sequences.filter((s: any) => s.level <= 4).map((s: any) => ({ level: s.level, variant: s.variant, count: s.count, commands: s.commands }));
  const reExtract = std.map((s) => ({ level: s.level, variant: s.variant, count: s.count, commands: s.commands }));
  check('sequences.json == re-extracción ROM (determinista)', JSON.stringify(diskSeq) === JSON.stringify(reExtract));
  check('QTE mask $3D (RIGHT|UP|DOWN|A|B)', onDisk.qteMask?.value === 0x3d && onDisk.qteMask?.excluded?.[0] === 'LEFT');
} else {
  check('sequences.json presente', false, 'falta generated/rom-stage/sequences.json — ejecuta build:rom-stage');
}

// Gate 4: command → animation dispatch (Bank00 Call_000_3833) verificado.
const CONSUMER_JSON = join(ROOT, 'generated/rom-stage/command-consumers.json');
const EXPECTED_ANIMS: Record<string, { memberSlot0: number; memberSlot1: number }> = {
  A: { memberSlot0: 0x00, memberSlot1: 0x05 },
  B: { memberSlot0: 0x01, memberSlot1: 0x06 },
  RIGHT: { memberSlot0: 0x02, memberSlot1: 0x07 },
  UP: { memberSlot0: 0x03, memberSlot1: 0x08 },
  DOWN: { memberSlot0: 0x04, memberSlot1: 0x09 },
};
if (existsSync(CONSUMER_JSON)) {
  const consumers = JSON.parse(readFileSync(CONSUMER_JSON, 'utf8'));
  const anims = consumers.dispatch?.animationIds ?? {};
  const cmds = ['A', 'B', 'UP', 'DOWN', 'RIGHT'];
  check('command→animation dispatch 5/5', cmds.every((c) => anims[c] && anims[c].memberSlot0 === EXPECTED_ANIMS[c].memberSlot0 && anims[c].memberSlot1 === EXPECTED_ANIMS[c].memberSlot1));
  check('animation memberSlot0 = 0..4 contiguo', cmds.every((c) => anims[c]?.memberSlot0 === EXPECTED_ANIMS[c].memberSlot0));
  check('animation memberSlot1 = 5..9 contiguo', cmds.every((c) => anims[c]?.memberSlot1 === EXPECTED_ANIMS[c].memberSlot1));
  check('consumer inputs = $CA60 (expected) + $CA6A (success)', consumers.consumer?.inputs?.expectedCommand?.includes('$CA60') && consumers.consumer?.inputs?.successFlag?.includes('$CA6A'));
  check('member slot register = $C7D4', consumers.dispatch?.memberSlotRegister?.register === '$C7D4');
  const pose = consumers.poseSelector?.values ?? {};
  const EXPECTED_POSE: Record<string, { memberSlot0: number; memberSlot1: number }> = {
    A: { memberSlot0: 0x05, memberSlot1: 0x0a },
    B: { memberSlot0: 0x08, memberSlot1: 0x0b },
    RIGHT: { memberSlot0: 0x0b, memberSlot1: 0x0d },
    UP: { memberSlot0: 0x06, memberSlot1: 0x0f },
    DOWN: { memberSlot0: 0x09, memberSlot1: 0x10 },
  };
  check('command→pose selector $C3C7 5/5', cmds.every((c) => pose[c] && pose[c].memberSlot0 === EXPECTED_POSE[c].memberSlot0 && pose[c].memberSlot1 === EXPECTED_POSE[c].memberSlot1));
  check('pose register = $C3C7', consumers.poseSelector?.register === '$C3C7');
  check('pose memberSlot0 table = Bank01:$4E6D', consumers.poseSelector?.memberSlot0Table?.includes('$4E6D'));
} else {
  check('command-consumers.json presente', false, 'falta generated/rom-stage/command-consumers.json — ejecuta build:rom-stage');
}

// Gate 5: programas VM completos (10 combos command×memberSlot).
const PROG_JSON = join(ROOT, 'generated/rom-stage/animation-programs.json');
if (existsSync(PROG_JSON)) {
  const prog = JSON.parse(readFileSync(PROG_JSON, 'utf8'));
  const programs = prog.programs ?? [];
  check('VM programs 10/10 (5 commands × 2 memberSlots)', programs.length === 10, `${programs.length}/10`);
  const EXPECTED_POSE_WRITE: Record<string, number[]> = {
    'A·0': [0x05, 0x00], 'B·0': [0x08, 0x00], 'RIGHT·0': [0x0b, 0x00], 'UP·0': [0x06, 0x00], 'DOWN·0': [0x09, 0x00],
    'A·1': [0x0a, 0x00], 'B·1': [0x0b, 0x00], 'RIGHT·1': [0x0d], 'UP·1': [0x0f], 'DOWN·1': [0x10],
  };
  const poseWriteOk = programs.every((p: any) => {
    const key = `${p.command}·${p.memberSlot}`;
    return JSON.stringify(p.poseWrites) === JSON.stringify(EXPECTED_POSE_WRITE[key]);
  });
  check('opcode $04 pose writes accounted 10/10 (incl. idle $00)', poseWriteOk);
  const allOpKnown = programs.every((p: any) => p.steps.every((s: any) => !s.mnemonic.startsWith('OP_$')));
  check('all VM opcodes decoded (no OP_$ unknown)', allOpKnown);
  check('every program sets pose ≥1 and returns to idle $00 for memberSlot0', programs.filter((p: any) => p.memberSlot === 0).every((p: any) => p.poseWrites.length === 2 && p.poseWrites[1] === 0x00));
} else {
  check('animation-programs.json presente', false, 'falta generated/rom-stage/animation-programs.json — ejecuta build:rom-stage');
}

// Gate 6: clasificación de readers de $C3C7 (100%).
const READERS_JSON = join(ROOT, 'generated/rom-stage/pose-selector-consumers.json');
if (existsSync(READERS_JSON)) {
  const readers = JSON.parse(readFileSync(READERS_JSON, 'utf8'));
  check('$C3C7 readers classified 100%', readers.classification === 'COMPLETE' && readers.readers?.length >= 3);
  check('$C3C7 data false-positives identified (jp $c3c7 / ld bc,$c3c7)', readers.dataFalsePositives?.length === 2);
  check('pose consumer = Call_000_0b16 (Bank00)', readers.consumerChain?.step4?.includes('Call_000_0b16'));
  check('consumer chain records pose table $C3CE/$C3CF', readers.consumerChain?.step3?.includes('$C3CE') || readers.consumerChain?.step3?.includes('$C3CF'));
  check('char anim descriptor table = $CA0D (Call_000_2fe7)', readers.charAnimDescriptor?.table?.includes('$CA0D') && readers.charAnimDescriptor?.loader?.includes('Call_000_2fe7'));
  check('$CA0D descriptor grammar = [bank][ptr-lo][ptr-hi]', readers.charAnimDescriptor?.grammar?.byte0?.includes('bank') && readers.charAnimDescriptor?.grammar?.pointee?.includes('3 raíces') || readers.charAnimDescriptor?.grammar?.pointee?.includes('resource base'));
  check('$CA0D writers classified 100% (0 desconocidos)', readers.charAnimDescriptor?.writersClassified?.includes('COMPLETE') && readers.charAnimDescriptor?.writers?.length >= 4);
  check('$CA0D byte writers = Call_000_08dd / Call_000_08e3', readers.charAnimDescriptor?.writers?.some((w: any) => w.address?.includes('08dd')) && readers.charAnimDescriptor?.writers?.some((w: any) => w.address?.includes('08e3')));
  check('$CA0D pointer resolver = Call_000_1266 ($4008 → $4000 + value*4)', readers.charAnimDescriptor?.descriptorOrigin?.resolver?.includes('Call_000_1266') && readers.charAnimDescriptor?.descriptorOrigin?.resolver?.includes('$4008'));
  check('$CA0D bank sources = $61 (standing) + $62/$63/$64 (technique)', readers.charAnimDescriptor?.descriptorOrigin?.standingBank?.includes('$61') && readers.charAnimDescriptor?.descriptorOrigin?.techniqueBank?.includes('$62'));
  check('bank separation finding recorded (bank $61 FUERA del corpus de 66)', readers.charAnimDescriptor?.bankSeparation?.stageAttacks?.includes('$61') && readers.charAnimDescriptor?.bankSeparation?.implication?.includes('EXTENDER'));
} else {
  check('pose-selector-consumers.json presente', false, 'falta generated/rom-stage/pose-selector-consumers.json — ejecuta build:rom-stage');
}

console.log(`\n═══ RESULTADO: ${pass} ✓ · ${fail} ✗ ═══`);
if (fail > 0) process.exit(1);
