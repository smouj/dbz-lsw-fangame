import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
async function test(addr: number, label: string) {
  await d.loadstate('r31a/battle-base.ss0');
  await d.frames(30, 0);
  const orig = (await d.read(addr, 1))[0];
  await d.write(addr, 29);
  await d.frames(30, 0);
  await d.shot(`r31a/ljb-${label}.ppm`);
  await d.write(addr, orig);
  console.log(`ljb ${label} @0x${addr.toString(16)} orig=${orig.toString(16)}`);
}
await test(0xCB1D, 'lim0');
await test(0xCB41, 'hand0');
await test(0xCB1E, 'lim1');
await test(0xCB42, 'hand1');
await d.quit();
