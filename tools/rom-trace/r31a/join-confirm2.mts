import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
async function tryJ(patch: number | null, label: string) {
  await d.loadstate('r31a/jeice-offense-base.ss0');
  await d.frames(5, 0);
  if (patch !== null) await d.write(0xCB41, patch);
  await d.frames(15, 0x10); await d.frames(40, 0); // RIGHT largo → JOIN
  await d.frames(6, 0x01); await d.frames(50, 0); // A → picker
  const sel = (await d.read(0xCC01, 1))[0];
  await d.shot(`r31a/jc-${label}-picker.ppm`);
  await d.frames(8, 0x01); // A → confirmar
  let r = 'stuck(5)';
  for (let i = 0; i < 14; i++) {
    await d.frames(10, 0);
    const st = await d.state();
    const c = st.C0A0 ?? 0;
    if (c !== 5) { r = `C0A0=${c.toString(16)}`; break; }
  }
  console.log(`${label}: select=${sel.toString(16)} → ${r}`);
}
await tryJ(null, 'natural124');
await tryJ(57, 'pc57');
await tryJ(0x0A, 'masenko10');
await d.quit();
