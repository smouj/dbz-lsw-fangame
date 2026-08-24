import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
// natural: Guard. Sweep delays para rolls altos (83-99). Sin parchear defensa.
const delays: number[] = [];
for (let d0 = 46; d0 <= 70; d0++) delays.push(d0);
for (let d0 = 146; d0 <= 170; d0++) delays.push(d0);
for (let d0 = 246; d0 <= 270; d0++) delays.push(d0);
let hit = 0;
for (const delay of delays) {
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
  if (cur < 768 || ca5d >= 83) {
    hit++;
    console.log(`delay=${String(delay).padStart(3)} roll=${ca5d.toString(16)} (${ca5d}) → Piccolo cur=${cur} ← ¡¡INTERESANTE!!`);
  }
  if (hit > 8) break;
}
console.log(hit ? 'encontrados' : 'ningún roll alto en el barrido — guard bloquea siempre');
await d.quit();
