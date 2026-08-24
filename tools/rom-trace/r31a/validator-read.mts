import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
// caso JEICE
await d.loadstate('r31a/jeice-offense-base.ss0');
await d.frames(5, 0);
await d.write(0xCB41, 57);
await d.frames(15, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
const pre = await d.read(0xC2D0, 3);
console.log(`JEICE pre-A: C2D0-C2D2=[${pre.map(v=>v.toString(16)).join(' ')}]`);
await d.frames(8, 0x01);
await d.frames(20, 0);
const post = await d.read(0xC2D0, 3);
const ca55 = await d.read(0xCA55, 4);
const hl = await d.read(0xC182, 1); // CurLife.low
console.log(`JEICE post-A: C2D0-C2D2=[${post.map(v=>v.toString(16)).join(' ')}] CA55-58=[${ca55.map(v=>v.toString(16)).join(' ')}] CurLife.low=${hl[0].toString(16)}`);
// caso GOHAN (Tail — SÍ confirma) para comparar
await d.loadstate('r31a/gohan-offense-base.ss0');
await d.frames(5, 0);
await d.write(0xCB41, 29);
await d.frames(15, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
const pre2 = await d.read(0xC2D0, 3);
console.log(`GOHAN pre-A: C2D0-C2D2=[${pre2.map(v=>v.toString(16)).join(' ')}]`);
await d.frames(8, 0x01);
await d.frames(20, 0);
const post2 = await d.read(0xC2D0, 3);
const ca552 = await d.read(0xCA55, 4);
const hl2 = await d.read(0xC182, 1);
console.log(`GOHAN post-A: C2D0-C2D2=[${post2.map(v=>v.toString(16)).join(' ')}] CA55-58=[${ca552.map(v=>v.toString(16)).join(' ')}] CurLife.low=${hl2[0].toString(16)}`);
await d.quit();
