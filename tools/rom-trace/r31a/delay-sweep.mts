import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const delays = [0, 10, 20, 30, 40, 50, 60, 80, 100, 120, 150, 180, 200, 240];
for (const delay of delays) {
  await d.loadstate('r31a/tail_left_base.ss0');
  await d.frames(delay, 0);          // pre-roll variable
  await d.frames(8, 0x01);           // A → confirmar Tail
  await d.frames(120, 0);            // esperar resolución
  const s = await d.state();
  const ca53 = s.CA53 ?? 0;
  const c0 = s.C0A0 ?? 0;
  await d.shot(`r31a/ds-${String(delay).padStart(3, '0')}.ppm`);
  console.log(`delay=${String(delay).padStart(3)} → C0A0=${c0.toString(16)} CA53=${ca53.toString(16)}`);
}
await d.quit();
