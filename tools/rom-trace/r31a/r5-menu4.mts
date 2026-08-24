import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(20, 0);
async function cur(label: string) {
  const r = await d.read(0xCA36, 1);
  const cc0d = await d.read(0xCC0D, 1);
  const c0a = await d.read(0xC0A0, 1);
  console.log(`${label}: CA36=${r[0]} CC0D=${cc0d[0].toString(16)} C0A0=${c0a[0].toString(16)}`);
}
await cur('inicio   ');
for (let i = 0; i < 4; i++) {
  await d.frames(15, 0x10); await d.frames(30, 0);
  await cur(`RIGHT #${i+1}`);
}
// y LEFT para volver
for (let i = 0; i < 4; i++) {
  await d.frames(15, 0x20); await d.frames(30, 0);
  await cur(`LEFT #${i+1}`);
}
await d.quit();
