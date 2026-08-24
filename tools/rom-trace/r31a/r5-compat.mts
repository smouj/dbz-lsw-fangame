import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(20, 0);
const c0b1 = await d.read(0xC0B1, 1);
console.log('C0B1 (forma activa):', c0b1[0].toString(16), '=', c0b1[0]);
const form = await d.read(0xCA0A, 2); // CA0A-0B
console.log('CA0A-0B:', form.map(v=>v.toString(16)).join(' '));
await d.quit();
