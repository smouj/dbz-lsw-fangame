import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const TEST = 99;
// El A abre el select (muestra limit[0]). Parchear ANTES del A.
async function test(addr: number, label: string) {
  await d.loadstate('r31a/battle-base.ss0');
  await d.frames(30, 0);
  const orig = (await d.read(addr, 1))[0];
  await d.write(addr, TEST);
  await d.frames(6, 0x01); await d.frames(50, 0); // A → select
  await d.shot(`r31a/pre-${label}.ppm`);
  await d.write(addr, orig);
  console.log(`test ${label} @0x${addr.toString(16)} orig=${orig.toString(16)}`);
}
await test(0xCB1D, 'cb1d-lim0');
await test(0xCB1A, 'cb1a-rost0');
await test(0xCDD0, 'cdd0-lim0');
await test(0xCDCD, 'cdcd-rost0');
await d.quit();
