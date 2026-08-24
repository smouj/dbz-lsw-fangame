import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/list-base.ss0');
await d.frames(30, 0);
for (let i = 0; i < 3; i++) { await d.frames(3, 0x02); await d.frames(30, 0); }
await d.frames(60, 0);
await d.frames(8, 0x80); await d.frames(10, 0);
await d.frames(8, 0x80); await d.frames(10, 0);
await d.frames(6, 0x01); await d.frames(50, 0); // A → TEAM
await d.shot('r31a/tg-0-team.ppm');
await d.frames(6, 0x01); await d.frames(50, 0); // A → CHARA
await d.shot('r31a/tg-1-chara.ppm');
// cursor: ¿en 01 Gohan? si no, UP hasta arriba
await d.frames(8, 0x40); await d.frames(30, 0);
await d.frames(8, 0x40); await d.frames(30, 0);
await d.frames(8, 0x40); await d.frames(30, 0);
await d.shot('r31a/tg-2-up.ppm');
await d.frames(6, 0x01); await d.frames(50, 0); // A → seleccionar
await d.shot('r31a/tg-3-selected.ppm');
await d.quit();
