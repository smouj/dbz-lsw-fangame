import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/tail_left_base.ss0');
await d.frames(40, 0);
await d.frames(8, 0x01);
let s = await d.state();
let lastC = -1;
for (let f = 0; f < 200; f++) {
  await d.frames(15, 0);
  s = await d.state();
  const c = s.C0A0 ?? 0;
  if (c !== lastC) { console.log(`f+${(f+1)*15} C0A0=${c.toString(16)} CA53=${(s.CA53??0).toString(16)} CA55=${(s.CA55??0).toString(16)}`); lastC = c; }
  if (f > 40 && c === 6) break;
}
await d.shot('r31a/of-end.ppm');
await d.memdump('r31a/of-wram.json', 0xC000, 0x2000);
console.log(`final C0A0=${(s.C0A0??0).toString(16)}`);
await d.quit();
