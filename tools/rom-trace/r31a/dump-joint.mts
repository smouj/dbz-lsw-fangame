import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/list-base.ss0');
await d.frames(30, 0);
for (let i = 0; i < 3; i++) { await d.frames(3, 0x02); await d.frames(30, 0); }
await d.frames(60, 0);
await d.frames(6, 0x01); // A en Status
await d.frames(90, 0);
await d.shot('r31a/joint-p1.ppm');
// 5 entradas por página; DOWN×5 -> página siguiente
for (let pg = 2; pg <= 4; pg++) {
  for (let i = 0; i < 5; i++) { await d.frames(8, 0x80); await d.frames(10, 0); }
  await d.frames(30, 0);
  await d.shot(`r31a/joint-p${pg}.ppm`);
}
await d.quit();
