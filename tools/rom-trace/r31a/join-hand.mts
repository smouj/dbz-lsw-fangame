import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.frames(8, 0x10); await d.frames(40, 0); // RIGHT → JOIN
await d.shot('r31a/jh-1-join.ppm');
await d.frames(6, 0x01); await d.frames(50, 0); // A → mano
await d.shot('r31a/jh-2-open.ppm');
const r = await d.read(0xCB3C, 20);
console.log('deck tail:', r.map(v=>v.toString(16).padStart(2,'0')).join(' '));
const r2 = await d.read(0xCBF8, 16);
console.log('0xCBF8:', r2.map(v=>v.toString(16).padStart(2,'0')).join(' '));
// RIGHT para ciclar la mano
for (let i = 1; i <= 4; i++) {
  await d.frames(8, 0x10); await d.frames(40, 0);
  await d.shot(`r31a/jh-3-cyc${i}.ppm`);
}
await d.quit();
