import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
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
await d.frames(8, 0x01); await d.frames(50, 0); // A → popup form
await d.shot('r31a/jb-0-form.ppm');
await d.frames(8, 0x01); await d.frames(50, 0); // A → Normal
await d.frames(8, 0x02); await d.frames(50, 0); // B → SYSTEM
await d.shot('r31a/jb-1-system.ppm');
// DOWN×3 → Exit (con hold largo)
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.shot('r31a/jb-2-exit.ppm');
await d.frames(8, 0x01); await d.frames(50, 0); // A → Save? dialog
await d.shot('r31a/jb-3-dialog.ppm');
await d.frames(10, 0x10); await d.frames(20, 0); // RIGHT → No
await d.frames(10, 0x10); await d.frames(20, 0);
await d.shot('r31a/jb-4-no.ppm');
await d.frames(8, 0x01); await d.frames(50, 0); // A en No
let s = await d.state();
for (let f = 0; f < 80; f++) {
  await d.frames(30, 0);
  s = await d.state();
  if ((s.C0A0 ?? 0) >= 6) break;
}
await d.frames(120, 0);
await d.shot('r31a/jb-5-battle.ppm');
const roster = await d.read(0xCB1A, 3);
console.log(`C0A0=${(s.C0A0??0).toString(16)} roster=[${roster.map(v=>v.toString(16).padStart(2,'0')).join(' ')}]`);
await d.savestate('r31a/jeice-battle-base.ss0');
await d.quit();
