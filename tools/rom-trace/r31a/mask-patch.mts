import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/jeice-offense-base.ss0');
await d.frames(5, 0);
await d.write(0xCB41, 57);
await d.frames(15, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
const pre = await d.read(0xCC0D, 16);
console.log('record pre:', pre.map(v=>v.toString(16).padStart(2,'0')).join(' '));
// parchear los 6 bytes de máscara (CC0D+9..+14) a FF
await d.write(0xCC16, 0xFF); await d.write(0xCC17, 0xFF); await d.write(0xCC18, 0xFF);
await d.write(0xCC19, 0xFF); await d.write(0xCC1A, 0xFF); await d.write(0xCC1B, 0xFF);
await d.frames(8, 0x01); // A
let r = 'stuck(5)';
for (let i = 0; i < 14; i++) {
  await d.frames(10, 0);
  const st = await d.state();
  const c = st.C0A0 ?? 0;
  if (c !== 5) { r = `C0A0=${c.toString(16)}`; break; }
}
console.log(`mask FF → ${r}`);
await d.quit();
