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
await d.frames(6, 0x01); await d.frames(50, 0);
await d.frames(6, 0x01); await d.frames(50, 0); // form popup
await d.frames(6, 0x01); await d.frames(50, 0); // Normal
await d.frames(6, 0x02); await d.frames(50, 0); // B → SYSTEM
await d.frames(8, 0x80); await d.frames(10, 0);
await d.frames(8, 0x80); await d.frames(10, 0);
await d.frames(8, 0x80); await d.frames(10, 0); // Exit
await d.frames(6, 0x01); await d.frames(50, 0); // A → Save? dialog
await d.shot('r31a/gb2-0-dialog.ppm');
await d.frames(8, 0x80); await d.frames(30, 0); // DOWN → No
await d.shot('r31a/gb2-1-no.ppm');
await d.frames(6, 0x01); await d.frames(50, 0); // A en No
let s = await d.state();
for (let f = 0; f < 80; f++) {
  await d.frames(30, 0);
  s = await d.state();
  const c = s.C0A0 ?? 0;
  if (f % 10 === 0) console.log(`f+${(f+1)*30} C0A0=${c.toString(16)}`);
  if (c >= 6) break;
}
await d.frames(120, 0);
await d.shot('r31a/gb2-2-battle.ppm');
await d.savestate('r31a/gohan-battle-base.ss0');
const roster = await d.read(0xCB1A, 3);
const lims = await d.read(0xCB1D, 15);
const deck = await d.read(0xCB2C, 20);
console.log(`C0A0=${(s.C0A0??0).toString(16)} roster=[${roster.map(v=>v.toString(16).padStart(2,'0')).join(' ')}]`);
console.log(`limits=[${lims.map(v=>v.toString(16).padStart(2,'0')).join(' ')}]`);
console.log(`deck=[${deck.map(v=>v.toString(16).padStart(2,'0')).join(' ')}]`);
await d.quit();
