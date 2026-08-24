import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/gohan-offense-base.ss0');
await d.write(0xCA56, 1); await d.write(0xCA58, 124); await d.write(0xCB6E, 124);
await d.write(0xCB41, 29); await d.write(0xCA3E, 30);
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
await d.frames(23, 0);
await d.frames(8, 0x01);
for (let i = 0; i < 30; i++) {
  await d.frames(10, 0);
  const r = await d.read(0xCA82, 2); // CA82, CA83
  const st = await d.state();
  if ((st.C0A0??0) === 0xb && i % 5 === 0)
    console.log(`f+${(i+1)*10+48}: C0A0=b CA53=${(st.CA53??0).toString(16)} CA82=${r[0].toString(16)} CA83=${r[1].toString(16)}`);
}
await d.quit();
