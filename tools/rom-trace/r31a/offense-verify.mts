import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
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
// en el menú ofensivo: leer CC, drawIndex, mano
const cc = await d.read(0xCA3E, 1);
const di = await d.read(0xCB40, 1);
const hand = await d.read(0xCB41, 6);
const lims = await d.read(0xCB1D, 15);
console.log(`CC=0xCA3E=${cc[0].toString(16)} (${cc[0]}) drawIndex=0xCB40=${di[0].toString(16)} (${di[0]})`);
console.log(`hand CB41-46: [${hand.map(v=>v.toString(16).padStart(2,'0')).join(' ')}]`);
console.log(`limits CB1D-2B: [${lims.map(v=>v.toString(16).padStart(2,'0')).join(' ')}]`);
await d.savestate('r31a/offense-base.ss0');
await d.shot('r31a/offense-base.ppm');
console.log('offense-base.ss0 guardado');
await d.quit();
