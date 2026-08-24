import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const TEST = 99;
// baseline: JOINT abierto sin patch
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.frames(8, 0x20); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
await d.shot('r31a/hp-base.ppm');
// patch slot por slot de la mano candidata CB40..CB45
for (let slot = 0; slot < 6; slot++) {
  const a = 0xCB40 + slot;
  await d.loadstate('r31a/battle-base.ss0');
  await d.frames(30, 0);
  await d.frames(8, 0x20); await d.frames(40, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
  const orig = (await d.read(a, 1))[0];
  await d.write(a, TEST);
  await d.frames(30, 0);
  await d.shot(`r31a/hp-slot${slot}.ppm`);
  await d.write(a, orig);
  console.log(`hand slot${slot} @0x${a.toString(16)} orig=${orig.toString(16)}`);
}
await d.quit();
