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
await d.frames(6, 0x01); await d.frames(50, 0); // A → CHARA
await d.frames(6, 0x01); await d.frames(50, 0); // A → form popup
await d.frames(6, 0x01); await d.frames(50, 0); // A → Normal (Gohan)
await d.frames(6, 0x02); await d.frames(50, 0); // B → SYSTEM (cursor Team)
await d.frames(8, 0x80); await d.frames(10, 0); // DOWN ×3 → Exit
await d.frames(8, 0x80); await d.frames(10, 0);
await d.frames(8, 0x80); await d.frames(10, 0);
await d.shot('r31a/gb-0-exit.ppm');
await d.frames(6, 0x01); await d.frames(50, 0); // A en Exit
let s = await d.state();
for (let f = 0; f < 60; f++) {
  await d.frames(30, 0);
  s = await d.state();
  if ((s.C0A0 ?? 0) >= 6) break;
}
await d.frames(120, 0);
await d.shot('r31a/gb-1-battle.ppm');
await d.savestate('r31a/gohan-battle-base.ss0');
const roster = await d.read(0xCB1A, 3);
const lims = await d.read(0xCB1D, 15);
console.log(`C0A0=${(s.C0A0??0).toString(16)} roster=[${roster.map(v=>v.toString(16).padStart(2,'0')).join(' ')}] limits=[${lims.map(v=>v.toString(16).padStart(2,'0')).join(' ')}]`);
await d.quit();
