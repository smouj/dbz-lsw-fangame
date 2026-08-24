import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
for (const delay of [0, 11, 23, 37, 53, 71, 97, 113, 149, 197, 233]) {
  await d.loadstate('r31a/tail_left_base.ss0');
  const o1 = (await d.read(0xCB6E, 1))[0];
  await d.write(0xCB6E, 125);   // mano enemiga[0] = Avoiding
  await d.write(0xCA56, 1);     // enemigo: CARD defense
  await d.frames(delay, 0);
  await d.frames(8, 0x01);
  await d.frames(160, 0);
  const r = await d.read(0xCA56, 1);
  const s = await d.state();
  const ca53 = s.CA53 ?? 0;
  await d.shot(`r31a/fcd-${String(delay).padStart(3)}.ppm`);
  await d.write(0xCB6E, o1);
  console.log(`delay=${String(delay).padStart(3)} → CA53=${ca53.toString(16)} CA56=${r[0].toString(16)} ${ca53 === 0 ? '← HIT?' : ''}`);
}
await d.quit();
