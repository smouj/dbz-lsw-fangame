import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
async function toOffense() {
  await d.loadstate('r31a/gohan-battle-base.ss0');
  await d.frames(30, 0);
  await d.frames(8, 0x10); await d.frames(40, 0);
  await d.frames(8, 0x10); await d.frames(40, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
  let s = await d.state();
  for (let f = 0; f < 800; f++) {
    await d.frames(15, 0);
    s = await d.state();
    if ((s.C0A0??0) === 6) break;
  }
}
for (const delay of [0, 13, 29, 41, 67, 89, 107, 131, 157, 179, 199, 223]) {
  await toOffense();
  await d.write(0xCA56, 1);       // enemigo: CARD defense
  await d.write(0xCA58, 125);     // su carta = Avoiding
  await d.write(0xCB6E, 125);     // mano[0] enemiga = Avoiding
  await d.write(0xCB41, 29); await d.write(0xCA3E, 30); // Tail + CC
  await d.frames(8, 0x10); await d.frames(40, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
  const c56 = (await d.read(0xCA56, 1))[0];
  await d.frames(delay, 0);
  await d.frames(8, 0x01);        // confirmar Tail
  for (let f = 0; f < 130; f++) await d.frames(15, 0);
  const hp = await d.read(0xC18D, 4);
  const st = await d.state();
  const cur = hp[2] | hp[3]<<8;
  console.log(`delay=${String(delay).padStart(3)} CA56=${c56.toString(16)} → Piccolo cur=${cur} CA53=${(st.CA53??0).toString(16)} ${cur < 768 ? '← ¡DAÑO!' : ''}`);
}
await d.quit();
