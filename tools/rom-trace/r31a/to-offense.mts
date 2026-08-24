import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(8, 0x10); await d.frames(40, 0); // BASIC
await d.frames(6, 0x01); await d.frames(50, 0); // GUARD
await d.frames(6, 0x01); await d.frames(50, 0); // confirmar
// avanzar hasta que C0A0 == 6 de nuevo (menú ofensivo) o 200s
let s = await d.state();
let saw14 = 0;
for (let f = 0; f < 400; f++) {
  await d.frames(15, 0);
  s = await d.state();
  const c = s.C0A0 ?? 0;
  if (c === 14) saw14++;
  if (f % 20 === 0) console.log(`f+${(f+1)*15} C0A0=${c.toString(16)} C3C6=${(s.C3C6??0).toString(16)}`);
  if (c === 6 && saw14 > 0 && f > 20) { console.log('menú de nuevo (fase ofensiva?)'); break; }
}
await d.shot('r31a/toff-end.ppm');
await d.memdump('r31a/toff-wram.json', 0xC000, 0x2000);
console.log(`final C0A0=${(s.C0A0??0).toString(16)} saw14=${saw14}`);
await d.quit();
