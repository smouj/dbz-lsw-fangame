import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
// mano enemiga = 4×124 (Shockwave, Avoid Damage) — el AI decide solo
for (const delay of [0, 13, 29, 43, 61, 79, 97, 113, 131, 149, 167, 181, 197, 211, 229]) {
  await d.loadstate('r31a/gohan-offense-base.ss0');
  const orig = await d.read(0xCB6E, 4);
  await d.write(0xCB6E, 124); await d.write(0xCB6F, 124);
  await d.write(0xCB70, 124); await d.write(0xCB71, 124);
  await d.write(0xCB41, 29); await d.write(0xCA3E, 30);
  await d.frames(8, 0x10); await d.frames(40, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
  await d.frames(delay, 0);
  await d.frames(8, 0x01);
  for (let i = 0; i < 16; i++) await d.frames(10, 0);
  const hp = await d.read(0xC18D, 4);
  const r = await d.read(0xCA82, 1);
  const cur = hp[2] | hp[3]<<8;
  const st = await d.state();
  console.log(`delay=${String(delay).padStart(3)} → CA82=${r[0].toString(16)} CA53=${(st.CA53??0).toString(16)} Piccolo=${cur} ${cur < 768 ? '← ¡¡DAÑO!!' : ''}`);
  await d.write(0xCB6E, orig[0]); await d.write(0xCB6F, orig[1]);
  await d.write(0xCB70, orig[2]); await d.write(0xCB71, orig[3]);
}
await d.quit();
