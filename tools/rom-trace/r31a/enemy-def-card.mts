import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
// mano enemiga CB6E..: parchear hand[0] (CB6E) con 125 (Avoiding) y probar delays
for (const delay of [0, 17, 33, 53, 71, 97, 113, 149, 197, 233]) {
  await d.loadstate('r31a/tail_left_base.ss0');
  const orig = (await d.read(0xCB6E, 1))[0];
  await d.write(0xCB6E, 125);
  await d.frames(delay, 0);
  await d.frames(8, 0x01);
  await d.frames(150, 0);
  const s = await d.state();
  const ca53 = s.CA53 ?? 0;
  await d.shot(`r31a/edc-${String(delay).padStart(3)}.ppm`);
  await d.write(0xCB6E, orig);
  console.log(`delay=${String(delay).padStart(3)} → CA53=${ca53.toString(16)} ${ca53 === 0 ? '← POSIBLE HIT' : ''}`);
}
await d.quit();
