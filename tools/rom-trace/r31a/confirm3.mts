import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
// A → START → esperar 15s
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
await d.frames(6, 0x08); await d.frames(50, 0);
for (let f = 0; f < 30; f++) {
  await d.frames(30, 0);
  const s = await d.state();
  if (f % 5 === 0) console.log(`wait+${(f+1)*30} C0A0=${(s.C0A0??0).toString(16)}`);
}
await d.shot('r31a/cf3-start15s.ppm');
await d.quit();
