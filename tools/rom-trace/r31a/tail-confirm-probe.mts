import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/tail_left_base.ss0');
await d.frames(10, 0);
await d.shot('r31a/tcp-0.ppm');
await d.frames(8, 0x01); await d.frames(60, 0); // A → confirmar?
await d.shot('r31a/tcp-1-a.ppm');
let s = await d.state();
for (let f = 0; f < 30; f++) {
  await d.frames(15, 0);
  s = await d.state();
  const c = s.C0A0 ?? 0;
  if (f % 4 === 0) console.log(`f+${(f+1)*15} C0A0=${c.toString(16)} C3C6=${(s.C3C6??0).toString(16)}`);
}
await d.shot('r31a/tcp-2-after.ppm');
await d.quit();
