import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
// avanzar hasta menu (C0A0==6) tras ver >= 1 estado != 6, max 120s
let s = await d.state();
let seen = new Set();
for (let f = 0; f < 800; f++) {
  await d.frames(15, 0);
  s = await d.state();
  const c = s.C0A0 ?? 0;
  seen.add(c);
  if (f % 40 === 0) console.log(`f+${(f+1)*15} C0A0=${c.toString(16)} C3C6=${(s.C3C6??0).toString(16)} seen=${[...seen].map(x=>x.toString(16)).join(',')}`);
  if (c === 6 && seen.size > 2 && f > 30) { console.log('→ menú ofensivo'); break; }
}
await d.shot('r31a/toff2-end.ppm');
await d.memdump('r31a/toff2-wram.json', 0xC000, 0x2000);
console.log(`final C0A0=${(s.C0A0??0).toString(16)} states=${[...seen].map(x=>x.toString(16)).join(',')}`);
await d.quit();
