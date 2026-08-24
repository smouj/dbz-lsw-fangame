import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/list-base.ss0');
await d.frames(30, 0);
for (let i = 0; i < 3; i++) { await d.frames(3, 0x02); await d.frames(30, 0); }
await d.frames(60, 0);
await d.frames(8, 0x80); await d.frames(10, 0);
await d.frames(8, 0x80); await d.frames(10, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
await d.frames(6, 0x01); await d.frames(50, 0); // CHARA, cursor Gohan
await d.frames(6, 0x01); await d.frames(50, 0); // A → popup Normal
await d.shot('r31a/tg3-1-form.ppm');
await d.frames(6, 0x01); await d.frames(50, 0); // A → Normal
await d.shot('r31a/tg3-2-done.ppm');
// B ×2: volver a SYSTEM
await d.frames(6, 0x02); await d.frames(50, 0);
await d.frames(6, 0x02); await d.frames(50, 0);
await d.shot('r31a/tg3-3-system.ppm');
await d.quit();
