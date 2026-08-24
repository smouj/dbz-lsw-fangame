// verify-defense-slot8-global.ts — auditoría negativa global del AnimationSlot8
// (V6.5). Prueba que en TODA la ROM:
//   1) el loader de recursos de Defense en slot8 existe exactamente 1 vez:
//        LD C,$08; CALL $3702            -> 01:76E8 (defense preload)
//   2) el arranque de ActionObject slot8 existe exactamente 2 veces:
//        LD D,$08; LD E,$A0; CALL $3EBD  -> 03:59F9 (BEAM) y 03:60AE (STANDARD_DAMAGE)
//   3) ninguna macro de la tabla Bank30:$5D00 contiene opcode $01 con slot $08
//        (0 arranques de slot8 desde Presentation macros)
// Si pasa, Teleport $28 y Time Freeze $2A quedan promovidos a
// PRELOADED_NOT_STARTED_GLOBAL_STATIC.
//
// Uso: npm run verify:defense-slot8-global
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'node:crypto';

const EXPECTED_ROM_SHA = '8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee';

function findRom(): string | null {
  const candidates = [
    resolve(process.cwd(), '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc'),
    resolve(process.cwd(), 'dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc'),
    new URL('../../dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc', import.meta.url).pathname,
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  return null;
}

function romOffset(bank: number, address: number): number {
  return bank * 0x4000 + (bank === 0 ? address : address - 0x4000);
}

function findAll(haystack: Uint8Array, needle: Uint8Array): number[] {
  const out: number[] = [];
  let pos = 0;
  while (pos <= haystack.length - needle.length) {
    const i = haystack.indexOf(needle[0], pos);
    if (i < 0 || i > haystack.length - needle.length) break;
    let ok = true;
    for (let k = 1; k < needle.length; k++) {
      if (haystack[i + k] !== needle[k]) { ok = false; break; }
    }
    if (ok) out.push(i);
    pos = i + 1;
  }
  return out;
}

function bankLabel(bank: number, offset: number): string {
  return `${bank.toString(16).padStart(2, '0')}:${(bank === 0 ? offset : 0x4000 + offset).toString(16).padStart(4, '0').toUpperCase()}`;
}

function main() {
  const romPath = findRom();
  if (!romPath) {
    console.log('⚠ ROM .gbc ausente — se omite (los .gbc no se versionan; ver extract_v6_support_physicals.py)');
    process.exit(0);
  }
  const rom = new Uint8Array(readFileSync(romPath));
  const sha = createHash('sha256').update(rom).digest('hex');
  if (sha !== EXPECTED_ROM_SHA) {
    console.log(`FAIL sha256 de la ROM no esperada: ${sha}`);
    process.exit(1);
  }

  let failures = 0;
  const check = (name: string, ok: boolean, detail?: string) => {
    if (!ok) {
      failures++;
      console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    } else {
      console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
    }
  };

  // 1) loader slot8: LD C,$08; CALL $3702
  const loaderPat = new Uint8Array([0x0e, 0x08, 0xcd, 0x02, 0x37]);
  const loaderHits: string[] = [];
  for (let bank = 0; bank < 0x80; bank++) {
    const base = bank === 0 ? 0 : romOffset(bank, 0x4000);
    const data = rom.subarray(base, base + 0x4000);
    for (const i of findAll(data, loaderPat)) loaderHits.push(bankLabel(bank, i));
  }
  check(
    'slot8 loader count == 1',
    loaderHits.length === 1 && loaderHits[0] === '01:76E8',
    loaderHits.join(', ') || 'none',
  );

  // 2) start slot8: LD D,$08; LD E,$A0; CALL $3EBD
  const startPat = new Uint8Array([0x16, 0x08, 0x1e, 0xa0, 0xcd, 0xbd, 0x3e]);
  const startHits: string[] = [];
  for (let bank = 0; bank < 0x80; bank++) {
    const base = bank === 0 ? 0 : romOffset(bank, 0x4000);
    const data = rom.subarray(base, base + 0x4000);
    for (const i of findAll(data, startPat)) startHits.push(bankLabel(bank, i));
  }
  const startOk =
    startHits.length === 2 &&
    startHits.includes('03:59F9') &&
    startHits.includes('03:60AE');
  check('slot8 start count == 2 ($59F9 BEAM, $60AE STANDARD_DAMAGE)', startOk, startHits.join(', ') || 'none');

  // 3) macros con opcode $01 + slot $08 (0 esperado)
  let macroSlot8Refs = 0;
  for (let mid = 0x00; mid < 0x60; mid++) {
    const t = romOffset(0x30, 0x5d00 + mid * 2);
    const rel = rom[t] | (rom[t + 1] << 8);
    const prog = 0x5d00 + rel;
    if (prog > 0x7ff0) continue;
    const o = romOffset(0x30, prog);
    const count = rom[o];
    if (count > 30) continue; // no es un programa VM
    for (let ci = 0; ci < count; ci++) {
      const cmd = rom[o + 1 + ci * 5];
      const slot = rom[o + 1 + ci * 5 + 1];
      if (cmd === 0x01 && slot === 0x08) macroSlot8Refs++;
    }
  }
  check('macros con opcode $01 slot8 == 0', macroSlot8Refs === 0, `refs=${macroSlot8Refs}`);

  if (failures === 0) {
    console.log(
      '\n✅ defense-slot8-global: 1 loader (01:76E8), 2 starts (03:59F9/03:60AE), 0 macro refs. ' +
        'Teleport $28 / Time Freeze $2A -> PRELOADED_NOT_STARTED_GLOBAL_STATIC.',
    );
    process.exit(0);
  }
  process.exit(1);
}

main();
