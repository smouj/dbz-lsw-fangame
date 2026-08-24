import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/tail_left_base.ss0');
// pre-roll 60f → A hold 8f desde frame 60 → acción hasta frame 620
await d.trace('r31a/tail-trace-01.json', 620, '60:1:8');
console.log('trace ok');
await d.quit();
