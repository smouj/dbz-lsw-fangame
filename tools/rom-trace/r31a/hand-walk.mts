import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.frames(8, 0x20); await d.frames(40, 0); // LEFT → JOINT
await d.frames(6, 0x01); await d.frames(50, 0); // A → abrir lista
await d.shot('r31a/hw-0.ppm');
for (let i = 1; i <= 6; i++) {
  await d.frames(8, 0x10); await d.frames(30, 0); // RIGHT: siguiente carta
  await d.shot(`r31a/hw-${i}.ppm`);
}
await d.quit();
