// Escanea bank 0x61 con el resolver de physical-decode y lista candidatos de resource base
import { resourceIndex, decodeActionObjectFull } from './physical-decode.ts';
import { readFileSync } from 'fs';

const ROM = readFileSync('rom-research/13_raw_rom/dbz-lsw-usa.gbc');
const bank = 0x61;
const off = bank * 0x4000;
const u16 = (a: number) => ROM[off + a] | (ROM[off + a + 1] << 8);
const u8 = (a: number) => ROM[off + a];

// resolver local (igual que physical-decode pero para este banco)
function resolveBase(candidate: number, seqAddrs: number[]): boolean {
  const w0 = u16(candidate);
  const T = (candidate + w0) & 0x3fff;
  if (T + 2 >= 0x4000) return false;
  if (u8(T) !== seqAddrs.length) return false;
  for (let sel = 0; sel < seqAddrs.length; sel++) {
    const sOff = u16(T + 1 + sel * 2);
    if (((T + 1 + sel * 2 + sOff) & 0x3fff) !== (seqAddrs[sel] & 0x3fff)) return false;
  }
  return true;
}

// Buscar bases candidatas: para cada base, w0 y T plausibles
const found: Array<{ base: number; count: number }> = [];
for (let base = 0x40; base < 0x4000 - 8; base++) {
  const w0 = u16(base);
  const T = (base + w0) & 0x3fff;
  if (T + 2 >= 0x4000) continue;
  const count = u8(T);
  if (count < 1 || count > 40) continue;
  // comprobar que los punteros de secuencia apuntan dentro del banco y plausibles
  let ok = true;
  for (let sel = 0; sel < count; sel++) {
    const sOff = u16(T + 1 + sel * 2);
    const target = (T + 1 + sel * 2 + sOff) & 0x3fff;
    if (target < 0x100 || target >= 0x4000) { ok = false; break; }
  }
  if (ok) found.push({ base, count });
}
console.log(`candidatos en bank 0x61: ${found.length}`);
for (const f of found.slice(0, 40)) console.log(`  base=0x${f.base.toString(16)} count=${f.count}`);
