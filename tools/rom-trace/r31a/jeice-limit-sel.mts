import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/jeice-battle-base.ss0');
await d.frames(30, 0);
await d.shot('r31a/jls-0.ppm');
await d.frames(6, 0x01); await d.frames(50, 0); // A en LIMIT
await d.shot('r31a/jls-1.ppm');
const sel = (await d.read(0xCC01, 1))[0];
console.log(`LIMIT select byte=${sel.toString(16)}`);
// y RIGHT→JOIN con hold largo + verificación
await d.loadstate('r31a/jeice-battle-base.ss0');
await d.frames(30, 0);
await d.frames(15, 0x10); await d.frames(40, 0); // RIGHT largo
await d.shot('r31a/jls-2-join.ppm');
await d.frames(6, 0x01); await d.frames(50, 0);
await d.shot('r31a/jls-3-open.ppm');
const sel2 = (await d.read(0xCC01, 1))[0];
console.log(`tras RIGHT+A select=${sel2.toString(16)}`);
await d.quit();
