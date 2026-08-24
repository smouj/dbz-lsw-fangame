import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/pc_left_base.ss0');
// pre-roll 60 → A hold 8 → acción (~700 frames)
await d.trace('r31a/pc-trace-01.json', 760, '60:1:8');
console.log('pc-trace-01.json ok');
await d.quit();
