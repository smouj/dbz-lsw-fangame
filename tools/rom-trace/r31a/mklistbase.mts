import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
for (let i = 0; i < 1000; i += 16) { await d.frames(8, 0x01); await d.frames(8, 0); }
await d.savestate('r31a/list-base.ss0');
const s = await d.state();
console.log('LIST_BASE C0A0=' + (s.C0A0 ?? 0).toString(16));
await d.quit();
