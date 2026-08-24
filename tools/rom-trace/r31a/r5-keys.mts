import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
async function readBase() {
  const r = await d.read(0xC2D0, 6);   // C2D0..C2D5
  const s = await d.read(0xCA00, 8);   // CA00..CA07
  const m = await d.read(0xCC0C, 3);   // CC0C..CC0E
  return `C2D0-5=[${r.map(v=>v.toString(16).padStart(2,'0')).join(' ')}] CA00-7=[${s.map(v=>v.toString(16).padStart(2,'0')).join(' ')}] CC0C-E=[${m.map(v=>v.toString(16)).join(' ')}]`;
}
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(30, 0);
console.log('menu       :', await readBase());
const keys: [string, number][] = [['A',0x01],['B',0x02],['START',0x08],['RIGHT',0x10],['LEFT',0x20],['UP',0x40],['DOWN',0x80]];
for (const [name, k] of keys) {
  await d.loadstate('r31a/gohan-battle-base.ss0');
  await d.frames(30, 0);
  await d.frames(12, k);   // mantener 12 frames
  await d.frames(2, 0);    // soltar 2
  console.log(`${name.padEnd(6)}:`, await readBase());
}
await d.quit();
