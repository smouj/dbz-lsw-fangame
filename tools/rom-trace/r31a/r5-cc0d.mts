import { RomDriver } from '../nav.ts';
const [rom, sav, cardId] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const card = parseInt(cardId || '83', 16);
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(20, 0);
await d.write(0xCB1D, [card]);
await d.write(0xCA3E, [30]);
await d.frames(6, 0x01); await d.frames(50, 0);  // abrir select LIMIT
const rec = await d.read(0xCC0D, 16);
console.log(`CC0D record (card ${card}): [${rec.map(v=>v.toString(16).padStart(2,'0')).join(' ')}]`);
const c2 = await d.read(0xC2D0, 3);
console.log(`C2D0-2: [${c2.map(v=>v.toString(16)).join(' ')}]`);
const cc = await d.read(0xCA3E, 1);
console.log('CC:', cc[0]);
await d.quit();
