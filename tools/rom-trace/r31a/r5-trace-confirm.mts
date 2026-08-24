import { RomDriver } from '../nav.ts';
const [rom, sav, cardHex] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const card = parseInt(cardHex, 16);
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(20, 0);
await d.write(0xCB1D, [card]);
await d.write(0xCA3E, [30]);
await d.frames(6, 0x01); await d.frames(50, 0);  // abrir select
console.log('=== select abierto, pulso A (12 frames) ===');
await d.frames(1, 0x01);
for (let i = 0; i < 40; i++) {
  const r = await d.read(0xCA00, 8);       // CA00-07
  const s = await d.read(0xC0A0, 1);
  const c55 = await d.read(0xCA55, 4);     // CA55-58
  const c2 = await d.read(0xC2D0, 3);      // C2D0-2
  const c82 = await d.read(0xCA82, 2);
  const c53 = await d.read(0xCA53, 1);
  console.log(`f${String(i).padStart(2,'0')} A=${i<12?1:0} CA03=${r[3].toString(16)} CA07=${r[7].toString(16)} C0A0=${s[0].toString(16)} CA55-58=[${c55.map(v=>v.toString(16)).join(' ')}] C2D0-2=[${c2.map(v=>v.toString(16)).join(' ')}] CA82-3=[${c82.map(v=>v.toString(16)).join(' ')}] CA53=${c53[0].toString(16)}`);
  if (i === 11) { await d.frames(1, 0x00); }
  else await d.frames(1, 0x01);
}
await d.shot('r31a/r5-5-commit.ppm');
await d.quit();
