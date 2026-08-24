import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
async function test(addr: number, label: string) {
  await d.loadstate('r31a/battle-base.ss0');
  await d.frames(30, 0);
  await d.frames(8, 0x20); await d.frames(40, 0); // LEFT → JOINT
  const orig = (await d.read(addr, 1))[0];
  await d.write(addr, 99);
  await d.frames(6, 0x01); await d.frames(50, 0); // A → select
  await d.shot(`r31a/jp-${label}.ppm`);
  await d.write(addr, orig);
  console.log(`jp ${label} @0x${addr.toString(16)} orig=${orig.toString(16)}`);
}
// baseline JOINT select sin patch
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.frames(8, 0x20); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
await d.shot('r31a/jp-base.ppm');
for (let s = 0; s < 6; s++) await test(0xCB41 + s, `h${s}`);
await test(0xCB40, 'di');
await test(0xCB2C, 'deck0');
await test(0xCB1D, 'lim0');
await d.quit();
