import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(20, 0);
// battle block jugador 0xCB1A: roster 0..2, limits +3..17 (5B x3), deck +18..37, hand +39..44
const blk = await d.read(0xCB1A, 45);
console.log('PLAYER block:');
console.log('  roster :', blk.slice(0,3).map(v=>v.toString(16)).join(' '));
console.log('  limits :', Array.from({length:3},(_,i)=>blk.slice(3+i*5, 8+i*5).map(v=>v.toString(16).padStart(2,'0')).join(' ')).join(' | '));
const blk2 = await d.read(0xCB47, 45);
console.log('ENEMY block:');
console.log('  roster :', blk2.slice(0,3).map(v=>v.toString(16)).join(' '));
console.log('  limits :', Array.from({length:3},(_,i)=>blk2.slice(3+i*5, 8+i*5).map(v=>v.toString(16).padStart(2,'0')).join(' ')).join(' | '));
// CC del jugador
const cc = await d.read(0xCA3E, 1);
console.log('CC jugador:', cc[0]);
await d.quit();
