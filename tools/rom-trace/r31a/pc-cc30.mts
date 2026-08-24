import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/pc_left_base.ss0');
await d.frames(5, 0);
const cc0 = (await d.read(0xCA3E, 1))[0];
console.log(`CA3E inicial=${cc0}`);
await d.write(0xCA3E, 30); // re-escribir
await d.frames(8, 0x01); // A
let r = 'stuck(5)';
for (let i = 0; i < 14; i++) {
  await d.frames(10, 0);
  const st = await d.state();
  const c = st.C0A0 ?? 0;
  if (c !== 5) { r = `C0A0=${c.toString(16)}`; break; }
}
console.log(`re-write CA3E=30 → ${r}`);
await d.quit();
