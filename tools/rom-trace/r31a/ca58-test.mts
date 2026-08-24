import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
for (const v of [0, 1]) {
  await d.loadstate('r31a/jeice-offense-base.ss0');
  await d.frames(5, 0);
  await d.write(0xCB41, 57);
  await d.write(0xCA58, v);
  await d.frames(15, 0x10); await d.frames(40, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
  await d.frames(8, 0x01);
  let r = 'stuck(5)';
  for (let i = 0; i < 14; i++) {
    await d.frames(10, 0);
    const st = await d.state();
    const c = st.C0A0 ?? 0;
    if (c !== 5) { r = `C0A0=${c.toString(16)}`; break; }
  }
  console.log(`CA58=${v} → ${r}`);
}
await d.quit();
