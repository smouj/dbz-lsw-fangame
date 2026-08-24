import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.frames(8, 0x20); await d.frames(40, 0); // LEFT → JOINT
await d.frames(6, 0x01); await d.frames(50, 0); // A → abrir lista
await d.shot('r31a/hw2-0.ppm');
for (let i = 1; i <= 5; i++) {
  await d.frames(8, 0x80); await d.frames(30, 0); // DOWN
  await d.shot(`r31a/hw2-d${i}.ppm`);
}
await d.shot('r31a/hw2-down5.ppm');
await d.frames(8, 0x40); await d.frames(30, 0); // UP
await d.shot('r31a/hw2-up.ppm');
await d.quit();
