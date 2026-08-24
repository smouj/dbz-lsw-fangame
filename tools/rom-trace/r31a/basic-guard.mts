import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.memdump('r31a/bg-pre.json', 0xC000, 0x2000);
await d.shot('r31a/bg-0.ppm');
await d.frames(8, 0x10); await d.frames(40, 0); // RIGHT → JOIN
await d.frames(8, 0x10); await d.frames(40, 0); // RIGHT → BASIC
await d.shot('r31a/bg-1-basic.ppm');
await d.frames(6, 0x01); await d.frames(50, 0); // A → ?
await d.shot('r31a/bg-2-a.ppm');
let s = await d.state();
for (let f = 0; f < 60; f++) {
  await d.frames(30, 0);
  s = await d.state();
  if (f % 5 === 0) console.log(`wait+${(f+1)*30} C0A0=${(s.C0A0??0).toString(16)}`);
  if ((s.C0A0??0) > 6) break;
}
await d.shot('r31a/bg-3-after.ppm');
await d.memdump('r31a/bg-post.json', 0xC000, 0x2000);
console.log(`final C0A0=${(s.C0A0??0).toString(16)} C3C6=${(s.C3C6??0).toString(16)}`);
await d.quit();
