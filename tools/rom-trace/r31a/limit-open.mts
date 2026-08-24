import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.shot('r31a/lo-base.ppm');
await d.frames(6, 0x01); await d.frames(50, 0); // A (LIMIT seleccionado al inicio)
await d.shot('r31a/lo-limit.ppm');
const s = await d.read(0xCBF8, 16);
console.log('0xCBF8:', s.map(v=>v.toString(16).padStart(2,'0')).join(' '));
// LEFT/RIGHT en lista de límites
for (let i = 0; i < 4; i++) {
  await d.frames(8, 0x10); await d.frames(30, 0);
  await d.shot(`r31a/lo-lr${i}.ppm`);
}
const s2 = await d.read(0xCBF8, 16);
console.log('0xCBF8 tras LR:', s2.map(v=>v.toString(16).padStart(2,'0')).join(' '));
await d.quit();
