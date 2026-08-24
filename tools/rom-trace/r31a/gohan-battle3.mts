import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/list-base.ss0');
await d.frames(30, 0);
for (let i = 0; i < 3; i++) { await d.frames(3, 0x02); await d.frames(30, 0); }
await d.frames(60, 0);
await d.frames(10, 0x80); await d.frames(20, 0); // DOWN con hold largo ×2 → Team
await d.frames(10, 0x80); await d.frames(20, 0);
await d.shot('r31a/gb3-0.ppm');
await d.frames(8, 0x01); await d.frames(50, 0); // A → TEAM
await d.frames(8, 0x01); await d.frames(50, 0); // A → CHARA
await d.frames(8, 0x01); await d.frames(50, 0); // A → form
await d.frames(8, 0x01); await d.frames(50, 0); // A → Normal
await d.frames(8, 0x02); await d.frames(50, 0); // B → SYSTEM (cursor Team)
await d.shot('r31a/gb3-1.ppm');
await d.frames(10, 0x80); await d.frames(20, 0); // DOWN → List
await d.frames(10, 0x80); await d.frames(20, 0); // DOWN → Save
await d.frames(10, 0x80); await d.frames(20, 0); // DOWN → Exit
await d.shot('r31a/gb3-2-exit.ppm');
await d.frames(8, 0x01); await d.frames(50, 0); // A → Save? dialog
await d.shot('r31a/gb3-3-dialog.ppm');
await d.frames(10, 0x10); await d.frames(20, 0); // RIGHT → No?
await d.frames(10, 0x10); await d.frames(20, 0);
await d.shot('r31a/gb3-4-no.ppm');
await d.frames(8, 0x01); await d.frames(50, 0); // A
let s = await d.state();
for (let f = 0; f < 80; f++) {
  await d.frames(30, 0);
  s = await d.state();
  const c = s.C0A0 ?? 0;
  if (f % 10 === 0) console.log(`f+${(f+1)*30} C0A0=${c.toString(16)}`);
  if (c >= 6) break;
}
await d.frames(120, 0);
await d.shot('r31a/gb3-5-battle.ppm');
await d.savestate('r31a/gohan-battle-base.ss0');
const roster = await d.read(0xCB1A, 3);
const deck = await d.read(0xCB2C, 20);
const cc = await d.read(0xCA3E, 1);
console.log(`C0A0=${(s.C0A0??0).toString(16)} roster=[${roster.map(v=>v.toString(16).padStart(2,'0')).join(' ')}] cc=${cc[0]}`);
console.log(`deck=[${deck.map(v=>v.toString(16).padStart(2,'0')).join(' ')}]`);
await d.quit();
