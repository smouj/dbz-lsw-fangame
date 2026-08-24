import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const delays = [0, 7, 13, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 107, 113, 121, 127, 131, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199];
let hits = 0;
for (const delay of delays) {
  await d.loadstate('r31a/gohan-offense-base.ss0');
  await d.write(0xCA56, 1);
  await d.write(0xCA58, 124);
  await d.write(0xCB6E, 124);
  await d.write(0xCB41, 29); await d.write(0xCA3E, 30);
  await d.frames(8, 0x10); await d.frames(40, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
  await d.frames(delay, 0);
  await d.frames(8, 0x01);
  for (let i = 0; i < 16; i++) await d.frames(10, 0);
  const hp = await d.read(0xC18D, 4);
  const cur = hp[2] | hp[3]<<8;
  const st = await d.state();
  const ca53 = st.CA53 ?? 0;
  if (cur < 768) {
    hits++;
    console.log(`delay=${String(delay).padStart(3)} → ¡¡DAÑO!! Piccolo cur=${cur} CA53=${ca53.toString(16)}`);
  }
  if (hits > 6) break;
}
console.log(hits ? `HITs encontrados: ${hits}` : 'sin daño en el barrido');
await d.quit();
