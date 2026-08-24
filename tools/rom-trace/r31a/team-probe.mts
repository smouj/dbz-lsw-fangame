import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
async function openTeam() {
  await d.loadstate('r31a/list-base.ss0');
  await d.frames(30, 0);
  for (let i = 0; i < 3; i++) { await d.frames(3, 0x02); await d.frames(30, 0); }
  await d.frames(60, 0);
  await d.frames(8, 0x80); await d.frames(10, 0);
  await d.frames(8, 0x80); await d.frames(10, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
}
await openTeam();
await d.shot('r31a/tp-0.ppm');
await d.frames(6, 0x01); await d.frames(50, 0); // A en "1 Cell"
await d.shot('r31a/tp-a.ppm');
await openTeam();
await d.frames(6, 0x08); await d.frames(50, 0); // START
await d.shot('r31a/tp-start.ppm');
await openTeam();
await d.frames(8, 0x80); await d.frames(40, 0); // DOWN
await d.shot('r31a/tp-down.ppm');
await d.quit();
