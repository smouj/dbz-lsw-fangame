import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
async function phase(load: string, label: string, patch: number) {
  await d.loadstate(load);
  await d.frames(5, 0);
  await d.write(0xCB41, patch);
  await d.frames(15, 0x10); await d.frames(40, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
  const r = await d.read(0xCA00, 16);
  console.log(`${label} picker: CA00-CA0F=[${r.map(v=>v.toString(16)).join(' ')}]`);
}
await phase('r31a/gohan-offense-base.ss0', 'GOHAN', 29);
await phase('r31a/jeice-offense-base.ss0', 'JEICE', 57);
await d.quit();
