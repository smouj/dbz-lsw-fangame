import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const TEST = 99;
const addrs = [0xC182, 0xC401, 0xC424, 0xC44A, 0xC5AC, 0xCA46, 0xCB1D, 0xCC56, 0xCD96, 0xCDD0];
// baseline: JOINT abierto sin patch
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.frames(8, 0x20); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
await d.shot('r31a/pc-base.ppm');
for (const a of addrs) {
  await d.loadstate('r31a/battle-base.ss0');
  await d.frames(30, 0);
  await d.frames(8, 0x20); await d.frames(40, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
  const orig = (await d.read(a, 1))[0];
  await d.write(a, TEST);
  await d.frames(20, 0);
  await d.shot(`r31a/pc-${a.toString(16)}.ppm`);
  await d.write(a, orig);
  console.log(`tested 0x${a.toString(16)} orig=${orig.toString(16)}`);
}
await d.quit();
