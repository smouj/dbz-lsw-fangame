import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
for (const delay of [0, 37, 73, 111, 149, 197, 233]) {
  await d.loadstate('r31a/tail_left_base.ss0');
  await d.frames(delay, 0);
  await d.frames(8, 0x01);
  // leer durante el rush (frames ~10-20 tras confirmar)
  await d.frames(12, 0);
  const c231 = (await d.read(0xC231, 1))[0];
  const ca5d = (await d.read(0xCA5D, 1))[0];
  const ca53 = (await d.read(0xCA53, 1))[0];
  console.log(`delay=${String(delay).padStart(3)} → C231=${c231.toString(16)} CA5D=${ca5d.toString(16)} CA53=${ca53.toString(16)}`);
}
await d.quit();
