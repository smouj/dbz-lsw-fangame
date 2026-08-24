// R3.1A — valida un trace: decodifica ActionObjects por frame con el slot apuntado por el AO.
// Gate: ningún UNKNOWN_ACTIVE_PHYSICAL_FRAME (objeto activo sin resourceId/frame).
//   npx tsx tools/rom-trace/validate-trace.ts <trace.json>
import { readFileSync } from 'fs';
import { decodeActionObjectFull, resourceIndex } from './physical-decode.ts';

const path = process.argv[2];
const trace = JSON.parse(readFileSync(path, 'utf8'));
const idx = resourceIndex();
console.log(`resourceIndex: ${idx.size} entradas`);

let active = 0, unknownActive = 0, resolved = 0;
const unknownFrames: Array<{ frame: number; obj: number; reason: string }> = [];
const resourceCounts = new Map<string, number>();
const byPhase = new Map<number, { active: number; resolved: number; unknown: number }>();

for (const f of trace.frames) {
  const phase = f.battle.C0A0;
  for (let o = 0; o < 2; o++) {
    const raw = f.actionObjects[o].bytes;
    const activeBit = (raw[0] & 0x80) !== 0;
    if (!activeBit) continue;
    active++;
    // slot apuntado por el AO (+1/+2 = 0xCA0D + slotIdx*3)
    const aoPtr = raw[1] | (raw[2] << 8);
    let slotIdx = Math.floor((aoPtr - 0xCA0D) / 3);
    let slot = f.slots[slotIdx];
    if (!slot) { slotIdx = o; slot = f.slots[slotIdx] ?? f.slots[0]; }
    const slotBase = (slot.anim[1] | (slot.anim[2] << 8)) & 0x3fff;
    const ctx = { slotBank: slot.anim[0], slotBase, graphicsBank: slot.gfx[0] };
    const dec = decodeActionObjectFull(o as 0 | 1, raw, ctx);
    const key = `${dec.resourceId ?? 'NULL'}`;
    resourceCounts.set(key, (resourceCounts.get(key) ?? 0) + 1);
    const st = byPhase.get(phase) ?? { active: 0, resolved: 0, unknown: 0 };
    st.active++;
    if (dec.resourceId === null) {
      st.unknown++;
      unknownActive++;
      if (unknownFrames.length < 8) unknownFrames.push({ frame: f.frame, obj: o, reason: `resourceId=null slot=${slotIdx} (${slot.anim[0].toString(16)},${slotBase.toString(16)}) ptr=${aoPtr.toString(16)}` });
    } else {
      st.resolved++;
      resolved++;
    }
    byPhase.set(phase, st);
  }
}
console.log(`objetos activos: ${active} · resueltos: ${resolved} · UNKNOWN_ACTIVE: ${unknownActive}`);
console.log('por resourceId:', [...resourceCounts.entries()].map(([k, v]) => `${k}:${v}`).join(' '));
console.log('por fase C0A0:', [...byPhase.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k.toString(16)}:${v.resolved}/${v.active}${v.unknown ? ' UNKNOWN=' + v.unknown : ''}`).join(' '));
if (unknownFrames.length) {
  console.log('ejemplos UNKNOWN:');
  for (const u of unknownFrames) console.log(`  frame ${u.frame} obj${u.obj}: ${u.reason}`);
}
console.log(unknownActive === 0 ? 'GATE PASS: sin UNKNOWN_ACTIVE_PHYSICAL_FRAME' : 'GATE FAIL');
