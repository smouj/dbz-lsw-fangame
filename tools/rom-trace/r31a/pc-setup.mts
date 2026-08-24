import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/jeice-battle-base.ss0');
await d.frames(30, 0);
await d.shot('r31a/pcs-0-battle.ppm');
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
const cc = (await d.read(0xCA3E, 1))[0];
const hand = await d.read(0xCB41, 4);
console.log(`offense CC=${cc} hand[0..3]=[${hand.map(v=>v.toString(16).padStart(2,'0')).join(' ')}]`);
await d.write(0xCB41, 57); // Purple Comet
await d.write(0xCA3E, 30); // CC suficiente (coste 28)
await d.savestate('r31a/jeice-offense-base.ss0');
// abrir JOIN picker
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
const sel = (await d.read(0xCC01, 1))[0];
await d.shot('r31a/pcs-1-picker.ppm');
console.log(`picker select byte=${sel.toString(16)} (57=0x39 esperado)`);
await d.savestate('r31a/pc_left_base.ss0');
console.log('pc_left_base.ss0 guardado');
await d.quit();
