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
await toOffense();
await d.write(0xCA56, 1); await d.write(0xCA58, 125);
await d.write(0xCB6E, 125);
await d.write(0xCB41, 29); await d.write(0xCA3E, 30);
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
await d.frames(8, 0x01);
// poll durante la resolución
for (let i = 0; i < 40; i++) {
  await d.frames(10, 0);
  const hp = await d.read(0xC180, 26);
  const st = await d.state();
  const p1 = hp[2] | hp[3]<<8, p2 = hp[15] | hp[16]<<8;
  if (i % 4 === 0 || (st.CA53 ?? 0) !== 1)
    console.log(`f+${(i+1)*10+48}: C0A0=${(st.C0A0??0).toString(16)} CA53=${(st.CA53??0).toString(16)} block0 cur=${p1} block1 cur=${p2}`);
}
await d.shot('r31a/hd-end.ppm');
await d.quit();
