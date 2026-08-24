import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/tail_left_base.ss0');
await d.frames(40, 0);
await d.frames(8, 0x01);
// poll CA02/CA55..58/CA56 durante 120 frames
for (let i = 0; i < 24; i++) {
  await d.frames(5, 0);
  const r = await d.read(0xCA02, 1);
  const r2 = await d.read(0xCA55, 4);
  const st = await d.state();
  console.log(`f+${(i+1)*5+48}: CA02=${r[0].toString(16)} CA55-58=[${r2.map(v=>v.toString(16)).join(' ')}] C0A0=${(st.C0A0??0).toString(16)} CA53=${(st.CA53??0).toString(16)}`);
}
await d.quit();
