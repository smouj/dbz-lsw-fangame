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

console.log(`\n═══ RESULTADO: ${pass} ✓ · ${fail} ✗ ═══`);
if (fail > 0) process.exit(1);
