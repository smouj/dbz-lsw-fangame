import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.shot('r31a/cy-0.ppm');
// LEFT 4 veces
for (let i = 1; i <= 4; i++) {
  await d.frames(8, 0x20); await d.frames(40, 0);
  await d.shot(`r31a/cy-L${i}.ppm`);
}
// RIGHT 6 veces
for (let i = 1; i <= 6; i++) {
  await d.frames(8, 0x10); await d.frames(40, 0);
  await d.shot(`r31a/cy-R${i}.ppm`);
}
await d.quit();
