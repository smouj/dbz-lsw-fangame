import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/list-gohan.ss0');
await d.frames(30, 0);
for (let i = 0; i < 3; i++) { await d.frames(3, 0x02); await d.frames(30, 0); }
await d.frames(60, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(8, 0x01); await d.frames(50, 0); // A → TEAM
await d.frames(8, 0x01); await d.frames(50, 0); // A → CHARA
await d.frames(10, 0x10); await d.frames(25, 0);
await d.frames(10, 0x10); await d.frames(25, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(8, 0x01); await d.frames(50, 0); // A en Jeice
await d.shot('r31a/tb-0-team.ppm');
await d.frames(12, 0x02); await d.frames(60, 0); // B → SYSTEM
await d.frames(12, 0x02); await d.frames(60, 0);
await d.shot('r31a/tb-1-system.ppm');
// volver a TEAM (DOWN×2 desde Status si el cursor reseteó) — verificar
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.shot('r31a/tb-2.ppm');
await d.frames(8, 0x01); await d.frames(50, 0);
await d.shot('r31a/tb-3-team.ppm');
await d.quit();
