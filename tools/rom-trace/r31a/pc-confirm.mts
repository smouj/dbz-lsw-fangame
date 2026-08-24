import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/pc_left_base.ss0');
await d.frames(10, 0);
await d.frames(8, 0x08); // START
for (let i = 0; i < 12; i++) {
  await d.frames(10, 0);
  const st = await d.state();
  console.log(`f+${(i+1)*10+18}: C0A0=${(st.C0A0??0).toString(16)}`);
}
await d.shot('r31a/pcf-end.ppm');
await d.quit();
