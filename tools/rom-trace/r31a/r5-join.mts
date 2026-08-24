import { RomDriver } from '../nav.ts';
const [rom, sav, cardHex] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const card = parseInt(cardHex, 16);
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(20, 0);
// mano jugador = block+39 = 0xCB41: poner card en hand[0]
await d.write(0xCB41, [card]);
await d.frames(15, 0x10); await d.frames(40, 0);  // RIGHT → JOIN
console.log('=== JOIN; A ===');
await d.frames(1, 0x01);
for (let i = 0; i < 40; i++) {
  const r = await d.read(0xCA00, 8);
  const c55 = await d.read(0xCA55, 4);
  const c2 = await d.read(0xC2D0, 3);
  console.log(`f${String(i).padStart(2,'0')} CA03=${r[3].toString(16)} CA07=${r[7].toString(16)} C0A0=${(await d.read(0xC0A0,1))[0].toString(16)} CA55-58=[${c55.map(v=>v.toString(16)).join(' ')}] C2D0-2=[${c2.map(v=>v.toString(16)).join(' ')}]`);
  if (i === 5) await d.frames(1, 0x00);
  else await d.frames(1, 0x01);
}
await d.shot('r31a/r5-7-join.ppm');
await d.quit();
