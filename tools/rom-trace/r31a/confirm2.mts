import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
async function seq(name: string, steps: Array<[number, number]>) {
  await d.loadstate('r31a/battle-base.ss0');
  await d.frames(30, 0);
  await d.frames(6, 0x01); await d.frames(50, 0); // A → select
  for (const [k, hold] of steps) { await d.frames(hold, k); await d.frames(60, 0); }
  for (let f = 0; f < 10; f++) await d.frames(30, 0);
  await d.shot(`r31a/cf2-${name}.ppm`);
  const s = await d.state();
  console.log(`${name}: C0A0=${(s.C0A0??0).toString(16)}`);
}
await seq('a-hold', [[0x01, 20]]);
await seq('a-start-a', [[0x08, 10], [0x01, 10]]);
await seq('a-start-start', [[0x08, 10], [0x08, 10]]);
await seq('a-sel', [[0x04, 10]]);
await seq('a-start', [[0x08, 20]]);
await d.quit();
