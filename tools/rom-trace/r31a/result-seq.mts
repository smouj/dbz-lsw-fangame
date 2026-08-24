import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/tail_left_base.ss0');
await d.frames(40, 0);
await d.frames(8, 0x01);
for (let i = 0; i < 60; i++) {
  await d.frames(10, 0);
  const st = await d.state();
  const c = st.C0A0 ?? 0;
  if (c === 0xb) {
    await d.shot(`r31a/rs-${String(i).padStart(2)}.ppm`);
    if (i > 45) break;
  }
}
await d.quit();
