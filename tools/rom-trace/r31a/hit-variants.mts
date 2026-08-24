import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
// flujo base: defensa GUARD → offense
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
// variante MOVE: CA56=2 antes de abrir el picker
await toOffense();
await d.write(0xCA56, 2);
await d.write(0xCB41, 29); await d.write(0xCA3E, 30);
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
const sel = await d.read(0xCC01, 1);
const c56 = await d.read(0xCA56, 1);
console.log(`MOVE: select=${sel[0].toString(16)} CA56=${c56[0].toString(16)}`);
await d.savestate('r31a/tail_left_move.ss0');
await d.frames(8, 0x01);
for (let f = 0; f < 130; f++) await d.frames(15, 0);
const pre = await d.read(0xC18D, 13);
console.log(`MOVE post: Piccolo cur=${pre[2]|pre[3]<<8} (max ${pre[0]|pre[1]<<8})`);
const st = await d.state();
console.log(`MOVE: C0A0=${(st.C0A0??0).toString(16)} CA53=${(st.CA53??0).toString(16)}`);
await d.shot('r31a/hv-move.ppm');
await d.quit();
