import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/pc_left_base.ss0');
await d.frames(10, 0);
const pre = await d.read(0xCA55, 4);
console.log('pre-A CA55-58:', pre.map(v=>v.toString(16)).join(' '));
await d.frames(8, 0x01); // A
for (let i = 0; i < 8; i++) {
  await d.frames(10, 0);
  const r = await d.read(0xCA55, 4);
  const st = await d.state();
  console.log(`f+${(i+1)*10+18}: C0A0=${(st.C0A0??0).toString(16)} CA55-58=[${r.map(v=>v.toString(16)).join(' ')}]`);
}
await d.quit();
