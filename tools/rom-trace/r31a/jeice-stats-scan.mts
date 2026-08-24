import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/jeice-battle-base.ss0');
await d.frames(30, 0);
await d.memdump('r31a/js-battle.json', 0xC000, 0x2000);
await d.quit();
