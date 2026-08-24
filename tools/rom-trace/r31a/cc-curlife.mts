import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/jeice-offense-base.ss0');
await d.frames(5, 0);
const cl = await d.read(0xC182, 1); // CurLife.low (battleStat+2)
console.log(`CurLife.low (0xC182) = ${cl[0]} (0x${cl[0].toString(16)})`);
await d.write(0xC182, 0x1E); // CC → 30
await d.frames(8, 0x10); await d.frames(40, 0); // JOIN
await d.frames(6, 0x01); await d.frames(50, 0); // A → picker
const sel = (await d.read(0xCC01, 1))[0];
console.log(`select=${sel.toString(16)} (0x39=57 esperado)`);
await d.shot('r31a/ccc-0.ppm');
await d.frames(8, 0x01); // A → confirmar
let r = 'stuck';
for (let i = 0; i < 14; i++) {
  await d.frames(10, 0);
  const st = await d.state();
  const c = st.C0A0 ?? 0;
  if (c !== 5) { r = `C0A0=${c.toString(16)}`; break; }
}
console.log(`confirm → ${r}`);
await d.quit();
