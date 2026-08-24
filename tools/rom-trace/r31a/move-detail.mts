import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/gohan-offense-base.ss0');
await d.write(0xCA56, 2);       // enemigo: MOVE
await d.write(0xCB41, 29); await d.write(0xCA3E, 30);
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
const c56 = (await d.read(0xCA56, 1))[0];
console.log(`CA56=${c56.toString(16)}`);
await d.frames(8, 0x01);
for (let i = 0; i < 36; i++) {
  await d.frames(10, 0);
  const hp = await d.read(0xC180, 26);
  const st = await d.state();
  const p1 = hp[2]|hp[3]<<8, p2 = hp[15]|hp[16]<<8;
  if (i % 6 === 0 || (st.CA53??0) !== 1 || p2 !== 768)
    console.log(`f+${(i+1)*10+48}: C0A0=${(st.C0A0??0).toString(16)} CA53=${(st.CA53??0).toString(16)} CA82=${(st.CA82??0).toString(16)} Gohan=${p1} Piccolo=${p2}`);
}
await d.shot('r31a/mv-end.ppm');
await d.quit();
