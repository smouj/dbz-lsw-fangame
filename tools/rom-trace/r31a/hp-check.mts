import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
// estado battle-base (Gohan vs Piccolo)
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(30, 0);
const pre = await d.read(0xC180, 26);
console.log('pre  Gohan:', pre.slice(0,13).map(v=>v.toString(16).padStart(2,'0')).join(' '), '→ max', pre[0]|pre[1]<<8, 'cur', pre[2]|pre[3]<<8);
console.log('pre  Piccolo:', pre.slice(13).map(v=>v.toString(16).padStart(2,'0')).join(' '), '→ max', pre[13]|pre[14]<<8, 'cur', pre[15]|pre[16]<<8);
// avanzar: defensa GUARD → offense → Tail (con CC parcheado)
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
await d.write(0xCB41, 29); await d.write(0xCA3E, 30);
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
const sel = await d.read(0xCC01, 1);
console.log('select:', sel[0].toString(16));
await d.savestate('r31a/tail_left_base.ss0');
await d.frames(8, 0x01); // confirmar
for (let f = 0; f < 130; f++) await d.frames(15, 0); // ~2s
const mid = await d.read(0xC180, 26);
console.log('mid  Piccolo cur:', mid[15]|mid[16]<<8, '(pre:', pre[15]|pre[16]<<8, ')');
await d.shot('r31a/hpc-mid.ppm');
for (let f = 0; f < 200; f++) await d.frames(15, 0); // más
const post = await d.read(0xC180, 26);
const st = await d.state();
console.log(`post Piccolo cur: ${post[15]|post[16]<<8} (pre: ${pre[15]|pre[16]<<8}) C0A0=${(st.C0A0??0).toString(16)} CA53=${(st.CA53??0).toString(16)}`);
await d.quit();
