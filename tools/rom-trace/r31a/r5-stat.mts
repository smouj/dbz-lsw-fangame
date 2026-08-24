import { RomDriver } from '../nav.ts';
const [rom, sav, cardHex] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const card = parseInt(cardHex, 16);
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(20, 0);
await d.write(0xCB1D, [card]);
await d.frames(6, 0x01); await d.frames(50, 0);
// battleStat jugador (CA0A=1 → CA3C) +8 bytes; también del bloque
const bs = await d.read(0xCA3C, 16);
console.log('battleStat jugador CA3C+16:', bs.map(v=>v.toString(16).padStart(2,'0')).join(' '));
const c0a = await d.read(0xCA0A, 1);
console.log('CA0A:', c0a[0]);
// leer battleStat del rival (CA0A=2 → CA3C+8)
const bs2 = await d.read(0xCA44, 16);
console.log('battleStat rival CA44+16:', bs2.map(v=>v.toString(16).padStart(2,'0')).join(' '));
await d.quit();
