import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
async function seq(name: string, keys: number[]) {
  await d.loadstate('r31a/battle-base.ss0');
  await d.frames(30, 0);
  await d.frames(6, 0x01); await d.frames(50, 0); // A → select
  for (const k of keys) {
    await d.frames(6, k); await d.frames(50, 0);
  }
  // esperar acción ~6s
  for (let f = 0; f < 12; f++) await d.frames(30, 0);
  await d.shot(`r31a/cf-${name}.ppm`);
  const s = await d.state();
  console.log(`${name}: C0A0=${(s.C0A0??0).toString(16)} C3C6=${(s.C3C6??0).toString(16)}`);
}
await seq('a-start-start', [0x08, 0x08]);
await seq('a-a', [0x01]);
await seq('a-start-a', [0x08, 0x01]);
await seq('a-b', [0x02]);
await d.quit();
