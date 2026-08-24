import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/jeice-battle-base.ss0');
await d.frames(30, 0);
await d.write(0xCB41, 57);
await d.write(0xCA3E, 30);
await d.frames(15, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
const sel = (await d.read(0xCC01, 1))[0];
console.log(`select=${sel.toString(16)}`);
await d.frames(8, 0x01); // confirmar defensa
let s = await d.state();
let lastC = -1;
for (let f = 0; f < 120; f++) {
  await d.frames(15, 0);
  s = await d.state();
  const c = s.C0A0 ?? 0;
  if (c !== lastC) { console.log(`f+${(f+1)*15}: C0A0=${c.toString(16)} C3C6=${(s.C3C6??0).toString(16)}`); lastC = c; }
  if (c === 0xb || c === 8 || c === 9) break;
}
await d.shot('r31a/pcdf-end.ppm');
await d.quit();
