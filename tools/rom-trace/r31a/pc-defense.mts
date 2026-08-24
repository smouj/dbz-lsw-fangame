import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/jeice-battle-base.ss0');
await d.frames(30, 0);
await d.write(0xCB41, 57); // mano[0] = Purple Comet
await d.write(0xCA3E, 30); // CC alto
await d.frames(15, 0x10); await d.frames(40, 0); // RIGHT → JOIN
await d.shot('r31a/pcd-0-join.ppm');
await d.frames(6, 0x01); await d.frames(50, 0); // A → picker
const sel = (await d.read(0xCC01, 1))[0];
await d.shot('r31a/pcd-1-picker.ppm');
console.log(`select=${sel.toString(16)}`);
await d.frames(8, 0x01); // A → confirmar
let r = 'stuck(5)';
for (let i = 0; i < 14; i++) {
  await d.frames(10, 0);
  const st = await d.state();
  const c = st.C0A0 ?? 0;
  if (c !== 5) { r = `C0A0=${c.toString(16)}`; break; }
}
console.log(`defensa → ${r}`);
await d.quit();
