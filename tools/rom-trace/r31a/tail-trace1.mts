import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/tail_left_base.ss0');
// pre-roll: 40 frames picker abierto → A en frame 40 → acción ~420 frames
await d.trace('r31a/tail-trace-01.json', 460, '40:1');
console.log('trace ok');
await d.quit();
