import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/pc_left_base.ss0');
await d.frames(10, 0);
const cc = await d.read(0xCA3E, 1);
const hand = await d.read(0xCB41, 2);
const sel = await d.read(0xCC01, 1);
console.log(`CA3E=${cc[0]} (0x${cc[0].toString(16)}) hand[0]=${hand[0].toString(16)} select=${sel[0].toString(16)}`);
await d.shot('r31a/pcc-0.ppm');
// ¿el display del CC? leer zona del HUD
await d.frames(8, 0x01); // A → confirmar
for (let i = 0; i < 10; i++) {
  await d.frames(10, 0);
  const st = await d.state();
  console.log(`f+${(i+1)*10+18}: C0A0=${(st.C0A0??0).toString(16)}`);
}
await d.quit();
