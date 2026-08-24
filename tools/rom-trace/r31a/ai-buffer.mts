import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
// 1) natural: ver el buffer AI
await d.loadstate('r31a/gohan-offense-base.ss0');
const nat = await d.read(0xD20C, 3);
console.log('buffer AI natural: D20C-D20E =', nat.map(v=>v.toString(16)).join(' '));
// 2) parchear el buffer: CARD(1) + 124 + flag B0
await d.write(0xD20C, 1); await d.write(0xD20D, 124); await d.write(0xD20E, 0xB0);
await d.write(0xCB6E, 124);
await d.write(0xCB41, 29); await d.write(0xCA3E, 30);
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
await d.frames(30, 0);
const r = await d.read(0xCA56, 3);
console.log('tras abrir: CA56-58 =', r.map(v=>v.toString(16)).join(' '));
await d.frames(8, 0x01);
for (let i = 0; i < 30; i++) {
  await d.frames(10, 0);
  const r2 = await d.read(0xCA82, 2);
  const hp = await d.read(0xC18D, 4);
  const st = await d.state();
  const cur = hp[2]|hp[3]<<8;
  if ((st.C0A0??0) === 0xb && i % 6 === 0)
    console.log(`f+${(i+1)*10+48}: CA82=${r2[0].toString(16)} CA83=${r2[1].toString(16)} CA53=${(st.CA53??0).toString(16)} Piccolo=${cur}`);
}
await d.quit();
