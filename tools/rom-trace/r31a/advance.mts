import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.shot('r31a/adv-0.ppm');
await d.frames(6, 0x01); await d.frames(50, 0); // A → select
await d.shot('r31a/adv-1-select.ppm');
await d.frames(6, 0x08); await d.frames(50, 0); // START → confirmar?
await d.shot('r31a/adv-2-start.ppm');
let s = await d.state();
for (let f = 0; f < 40; f++) {
  await d.frames(30, 0);
  s = await d.state();
  const c0 = s.C0A0 ?? 0;
  if (f % 4 === 0) console.log(`f+${(f+1)*30} C0A0=${c0.toString(16)} C3C6=${(s.C3C6??0).toString(16)}`);
  if (c0 >= 6 && f > 5) break;
}
await d.shot('r31a/adv-3-after.ppm');
await d.quit();
