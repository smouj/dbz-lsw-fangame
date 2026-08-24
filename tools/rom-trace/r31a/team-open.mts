import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/list-base.ss0');
await d.frames(30, 0);
await d.shot('r31a/tm-0-list.ppm');
for (let i = 0; i < 3; i++) { await d.frames(3, 0x02); await d.frames(30, 0); } // B×3 → SYSTEM
await d.frames(60, 0);
await d.shot('r31a/tm-1-system.ppm');
await d.frames(8, 0x80); await d.frames(10, 0); // DOWN ×2 → Team
await d.frames(8, 0x80); await d.frames(10, 0);
await d.frames(6, 0x01); await d.frames(50, 0); // A → Team menu
await d.shot('r31a/tm-2-team.ppm');
await d.quit();
