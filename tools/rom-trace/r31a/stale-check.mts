import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
// estado Gohan offense (donde SÍ confirma Tail)
await d.loadstate('r31a/gohan-offense-base.ss0');
await d.frames(5, 0);
let r = await d.read(0xCA55, 4);
console.log('Gohan offense CA55-58:', r.map(v=>v.toString(16)).join(' '));
// estado Jeice offense
await d.loadstate('r31a/jeice-offense-base.ss0');
await d.frames(5, 0);
r = await d.read(0xCA55, 4);
console.log('Jeice offense CA55-58:', r.map(v=>v.toString(16)).join(' '));
// probar: limpiar CA56/CA58 en pc_left_base antes de A
await d.loadstate('r31a/pc_left_base.ss0');
await d.frames(5, 0);
await d.write(0xCA56, 0); await d.write(0xCA58, 0);
await d.frames(8, 0x01);
for (let i = 0; i < 10; i++) {
  await d.frames(10, 0);
  const st = await d.state();
  const c = st.C0A0 ?? 0;
  if (c !== 5) { console.log(`limpio→A: C0A0=${c.toString(16)} en f+${(i+1)*10+13}`); break; }
}
await d.quit();
