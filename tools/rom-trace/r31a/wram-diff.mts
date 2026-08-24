import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.memdump('r31a/wd-closed.json', 0xC000, 0x2000);
await d.frames(8, 0x20); await d.frames(40, 0); // LEFT → JOINT
await d.frames(6, 0x01); await d.frames(50, 0); // A → lista
await d.memdump('r31a/wd-open.json', 0xC000, 0x2000);
await d.quit();
