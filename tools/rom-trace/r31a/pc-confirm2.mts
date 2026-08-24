import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
// secuencia A→A
await d.loadstate('r31a/pc_left_base.ss0');
await d.frames(10, 0);
await d.frames(8, 0x01);
await d.frames(20, 0);
await d.frames(8, 0x01);
for (let i = 0; i < 10; i++) {
  await d.frames(10, 0);
  const st = await d.state();
  if ((st.C0A0??0) !== 5) { console.log(`A→A: C0A0=${(st.C0A0??0).toString(16)} en f+${(i+1)*10+38}`); break; }
}
await d.shot('r31a/pcc2-aa.ppm');
// secuencia A→START
await d.loadstate('r31a/pc_left_base.ss0');
await d.frames(10, 0);
await d.frames(8, 0x01);
await d.frames(20, 0);
await d.frames(8, 0x08);
for (let i = 0; i < 10; i++) {
  await d.frames(10, 0);
  const st = await d.state();
  if ((st.C0A0??0) !== 5) { console.log(`A→START: C0A0=${(st.C0A0??0).toString(16)} en f+${(i+1)*10+38}`); break; }
}
await d.shot('r31a/pcc2-astart.ppm');
// secuencia START→A
await d.loadstate('r31a/pc_left_base.ss0');
await d.frames(10, 0);
await d.frames(8, 0x08);
await d.frames(20, 0);
await d.frames(8, 0x01);
for (let i = 0; i < 10; i++) {
  await d.frames(10, 0);
  const st = await d.state();
  if ((st.C0A0??0) !== 5) { console.log(`START→A: C0A0=${(st.C0A0??0).toString(16)} en f+${(i+1)*10+38}`); break; }
}
await d.quit();
