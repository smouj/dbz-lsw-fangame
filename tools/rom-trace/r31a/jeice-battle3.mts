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
await d.frames(8, 0x01); await d.frames(50, 0); // A en Jeice → TEAM view
await d.shot('r31a/jb3-0-team.ppm');
await d.frames(12, 0x02); await d.frames(60, 0); // B
await d.shot('r31a/jb3-1.ppm');
await d.frames(12, 0x02); await d.frames(60, 0); // B
await d.shot('r31a/jb3-2-system.ppm');
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.frames(10, 0x80); await d.frames(20, 0);
await d.shot('r31a/jb3-3-exit.ppm');
await d.frames(8, 0x01); await d.frames(50, 0);
await d.shot('r31a/jb3-4-dialog.ppm');
await d.frames(10, 0x10); await d.frames(20, 0);
await d.frames(10, 0x10); await d.frames(20, 0);
await d.shot('r31a/jb3-5-no.ppm');
await d.frames(8, 0x01); await d.frames(50, 0);
let s = await d.state();
for (let f = 0; f < 80; f++) {
  await d.frames(30, 0);
  s = await d.state();
  if ((s.C0A0 ?? 0) >= 6) break;
}
await d.frames(120, 0);
await d.shot('r31a/jb3-6-battle.ppm');
const roster = await d.read(0xCB1A, 3);
console.log(`C0A0=${(s.C0A0??0).toString(16)} roster=[${roster.map(v=>v.toString(16).padStart(2,'0')).join(' ')}]`);
await d.savestate('r31a/jeice-battle-base.ss0');
await d.quit();
