import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const TEST = 99;
async function test(addr: number, val: number, label: string) {
  await d.loadstate('r31a/battle-base.ss0');
  await d.frames(30, 0);
  const orig = (await d.read(addr, 1))[0];
  await d.write(addr, val);
  await d.frames(6, 0x01); await d.frames(50, 0);
  await d.shot(`r31a/hp2-${label}.ppm`);
  await d.write(addr, orig);
  console.log(`hp2 ${label} @0x${addr.toString(16)} orig=${orig.toString(16)} val=${val}`);
}
// slots de mano CB41..CB46 (drawIndex en CB40)
for (let s = 0; s < 6; s++) await test(0xCB41 + s, TEST, `h${s}`);
// Tail (29) en hand[0]
await test(0xCB41, 29, 'tail0');
// Tail en limit[0] (CB1D) para ver Tail en select
await test(0xCB1D, 29, 'taillim');
await d.quit();
