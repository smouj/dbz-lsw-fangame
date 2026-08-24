import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/jeice-battle-saved.ss0');
await d.frames(30, 0);
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
let s = await d.state();
for (let f = 0; f < 800; f++) {
  await d.frames(15, 0);
  s = await d.state();
  if ((s.C0A0??0) === 6) break;
}
await d.write(0xCB41, 57);
await d.write(0xCA3E, 30);
await d.write(0xCA3E, 30);
const bs = await d.read(0xCA3C, 12);
console.log(`pre-picker CA3C: ${bs.map(v=>v.toString(16).padStart(2,'0')).join(' ')}`);
await d.frames(15, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
const sel = (await d.read(0xCC01, 1))[0];
const cc = (await d.read(0xCA3E, 1))[0];
console.log(`select=${sel.toString(16)} CA3E post-open=${cc}`);
await d.frames(8, 0x01);
let r = 'stuck(5)';
for (let i = 0; i < 14; i++) {
  await d.frames(10, 0);
  const st = await d.state();
  const c = st.C0A0 ?? 0;
  if (c !== 5) { r = `C0A0=${c.toString(16)}`; break; }
}
console.log(`PC confirm → ${r}`);
await d.quit();
