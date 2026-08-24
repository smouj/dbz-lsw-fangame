import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
for (let i = 0; i < 1000; i += 16) { await d.frames(8, 0x01); await d.frames(8, 0); }
await d.savestate('r31a/list-gohan.ss0');
await d.shot('r31a/lg-0.ppm');
console.log('list-gohan.ss0 guardado');
await d.quit();
