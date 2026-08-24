import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
for (const delay of [89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,110,115,120,130,140,150]) {
  await d.loadstate('r31a/gohan-offense-base.ss0');
  await d.write(0xCB41, 29); await d.write(0xCA3E, 30);
  await d.frames(8, 0x10); await d.frames(40, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
  await d.frames(delay, 0);
  await d.frames(8, 0x01);
  await d.frames(10, 0);
  const ca5d = (await d.read(0xCA5D, 1))[0];
  await d.frames(120, 0);
  const hp = await d.read(0xC18D, 4);
  const cur = hp[2] | hp[3]<<8;
  const mark = cur < 768 ? ' ← ¡¡DAÑO!!' : (ca5d >= 96 ? ' ← roll alto' : '');
  console.log(`delay=${String(delay).padStart(3)} roll=${ca5d} → cur=${cur}${mark}`);
}
await d.quit();
