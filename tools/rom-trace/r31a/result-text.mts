import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/tail_left_base.ss0');
await d.frames(40, 0);
await d.frames(8, 0x01);
for (let i = 0; i < 50; i++) {
  await d.frames(10, 0);
  const st = await d.state();
  const c = st.C0A0 ?? 0;
  if (c === 0xb && i > 30) {
    const r = await d.read(0xCA02, 3);
    const r2 = await d.read(0xCA7F, 2);
    const r3 = await d.read(0xCA82, 1);
    console.log(`f+${(i+1)*10+48}: CA02=${r[0].toString(16)} CA03=${r[1].toString(16)} CA04=${r[2].toString(16)} CA7F=${r2[0].toString(16)} CA82=${r3[0].toString(16)} CA53=${(st.CA53??0).toString(16)}`);
    await d.shot('r31a/rt-end.ppm');
    break;
  }
}
await d.quit();
