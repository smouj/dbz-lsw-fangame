import { RomDriver } from '../nav.ts';
const [rom, sav, cardHex] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const card = parseInt(cardHex, 16);
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(20, 0);
await d.write(0xCB1D, [card]);
await d.frames(6, 0x01); await d.frames(50, 0);  // abrir select
console.log('=== select abierto; START ===');
await d.frames(1, 0x08);
for (let i = 0; i < 30; i++) {
  const r = await d.read(0xCA00, 8);
  const c55 = await d.read(0xCA55, 4);
  const c2 = await d.read(0xC2D0, 3);
  console.log(`f${String(i).padStart(2,'0')} CA03=${r[3].toString(16)} CA07=${r[7].toString(16)} CA55-58=[${c55.map(v=>v.toString(16)).join(' ')}] C2D0-2=[${c2.map(v=>v.toString(16)).join(' ')}]`);
  if (i === 5) await d.frames(1, 0x00);
  else await d.frames(1, 0x08);
}
await d.shot('r31a/r5-6-start.ppm');
await d.quit();
