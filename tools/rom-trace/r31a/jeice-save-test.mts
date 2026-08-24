import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
// equipo Jeice (flujo conocido) → SAVE → Exit → battle
await d.loadstate('r31a/list-gohan.ss0');
await d.frames(30, 0);
for (let i = 0; i < 3; i++) { await d.frames(3, 0x02); await d.frames(30, 0); }
await d.frames(60, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(8, 0x01); await d.frames(50, 0);
await d.frames(8, 0x01); await d.frames(50, 0);
await d.frames(10, 0x10); await d.frames(25, 0);
await d.frames(10, 0x10); await d.frames(25, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(8, 0x01); await d.frames(50, 0); // A en Jeice
await d.frames(12, 0x02); await d.frames(60, 0);
await d.frames(12, 0x02); await d.frames(60, 0); // B×2 → SYSTEM
// DOWN hasta Save (cursor donde esté: verificar)
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.shot('r31a/jst-0.ppm');
await d.frames(8, 0x01); await d.frames(50, 0); // A (Save? si cursor en Save)
await d.shot('r31a/jst-1-dialog.ppm');
await d.frames(8, 0x01); await d.frames(50, 0); // A en Yes (GUARDAR)
await d.frames(60, 0);
await d.shot('r31a/jst-2-saved.ppm');
console.log('save intentado');
await d.quit();
