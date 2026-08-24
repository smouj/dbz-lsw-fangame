import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
for (const [card, cc, label] of [[10, 30, 'masenko+CC30'], [12, 30, 'kame+CC30'], [57, 30, 'gohan+pc57+CC30'], [1, 13, 'stage1+CC13']] as const) {
  await d.loadstate('r31a/gohan-offense-base.ss0');
  await d.frames(5, 0);
  await d.write(0xCB41, card);
  await d.write(0xCA3E, cc);
  await d.frames(15, 0x10); await d.frames(40, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
  await d.frames(8, 0x01);
  let r = 'stuck(5)';
  for (let i = 0; i < 12; i++) {
    await d.frames(10, 0);
    const st = await d.state();
    const c = st.C0A0 ?? 0;
    if (c !== 5) { r = `C0A0=${c.toString(16)}`; break; }
  }
  console.log(`${label}: → ${r}`);
}
await d.quit();
