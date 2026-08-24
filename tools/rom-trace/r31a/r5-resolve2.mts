import { RomDriver } from '../nav.ts';
const [rom, sav, cardHex] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const card = parseInt(cardHex, 16);
async function snap(i: number) {
  const r = await d.read(0xCA00, 8);
  const c55 = await d.read(0xCA55, 4);
  const c82 = await d.read(0xCA82, 2);
  const c53 = await d.read(0xCA53, 1);
  const cc = await d.read(0xCA3E, 1);
  const a0 = await d.read(0xC0A0, 1);
  const hp = await d.read(0xCB54, 2);   // ? HP del jugador (battleStat rival?) — probar
  const slot8 = await d.read(0xCA28 + 8*3, 3);
  console.log(`f${String(i).padStart(3,'0')}: C0A0=${a0[0].toString(16)} CA03=${r[3].toString(16)} CC=${cc[0]} CA55-58=[${c55.map(v=>v.toString(16)).join(' ')}] CA82-3=[${c82.map(v=>v.toString(16)).join(' ')}] CA53=${c53[0].toString(16)} slot8=[${slot8.map(v=>v.toString(16)).join(' ')}]`);
}
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(20, 0);
await d.write(0xCB1D, [card]);
await d.write(0xCA40, [5]);
await d.frames(6, 0x01); await d.frames(50, 0);
await d.frames(6, 0x01); await d.frames(10, 0x00);
for (let i = 0; i < 160; i++) { await d.frames(2, 0x00); await snap(i * 2); }
await d.shot('r31a/r5-11-resolve2.ppm');
await d.quit();
