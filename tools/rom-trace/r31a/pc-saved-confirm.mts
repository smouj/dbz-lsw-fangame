import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/jeice-battle-saved.ss0');
await d.frames(30, 0);
// defensa GUARD → offense
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
let s = await d.state();
for (let f = 0; f < 800; f++) {
  await d.frames(15, 0);
  s = await d.state();
  if ((s.C0A0??0) === 6) break;
}
await d.write(0xCB41, 57); await d.write(0xCA3E, 30);
await d.frames(15, 0x10); await d.frames(40, 0); // JOIN
await d.frames(6, 0x01); await d.frames(50, 0);
const sel = (await d.read(0xCC01, 1))[0];
console.log(`select=${sel.toString(16)}`);
await d.frames(8, 0x01); // A → confirmar
let r = 'stuck(5)';
for (let i = 0; i < 14; i++) {
  await d.frames(10, 0);
  const st = await d.state();
  const c = st.C0A0 ?? 0;
  if (c !== 5) { r = `C0A0=${c.toString(16)}`; break; }
}
console.log(`confirm → ${r}`);
if (r !== 'stuck(5)') await d.savestate('r31a/pc_left_base.ss0');
await d.quit();
