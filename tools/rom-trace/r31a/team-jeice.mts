import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/list-gohan.ss0');
await d.frames(30, 0);
for (let i = 0; i < 3; i++) { await d.frames(3, 0x02); await d.frames(30, 0); }
await d.frames(60, 0);
await d.frames(10, 0x80); await d.frames(20, 0); // DOWN ×2 → Team
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(8, 0x01); await d.frames(50, 0); // A → TEAM
await d.frames(8, 0x01); await d.frames(50, 0); // A → CHARA
await d.shot('r31a/tj-0-chara.ppm');
// página 3 (RIGHT×2), posición 5 (DOWN×4)
await d.frames(10, 0x10); await d.frames(25, 0); // RIGHT → página 2
await d.shot('r31a/tj-1-p2.ppm');
await d.frames(10, 0x10); await d.frames(25, 0); // RIGHT → página 3
await d.shot('r31a/tj-2-p3.ppm');
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0); // DOWN ×4 → posición 5 (Jeice)
await d.shot('r31a/tj-3-jeice.ppm');
await d.frames(8, 0x01); await d.frames(50, 0); // A → form popup
await d.shot('r31a/tj-4-form.ppm');
await d.frames(8, 0x01); await d.frames(50, 0); // A → Normal
await d.shot('r31a/tj-5-done.ppm');
await d.quit();
