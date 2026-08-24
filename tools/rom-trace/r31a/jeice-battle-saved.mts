import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
// boot fresco con el save (ahora equipo Jeice)
for (let i = 0; i < 1000; i += 16) { await d.frames(8, 0x01); await d.frames(8, 0); }
await d.frames(30, 0);
for (let i = 0; i < 3; i++) { await d.frames(3, 0x02); await d.frames(30, 0); }
await d.frames(60, 0);
await d.frames(15, 0x80); await d.frames(25, 0);
await d.frames(15, 0x80); await d.frames(25, 0);
await d.frames(15, 0x80); await d.frames(25, 0);
await d.frames(15, 0x80); await d.frames(25, 0);
await d.frames(15, 0x80); await d.frames(25, 0);
await d.shot('r31a/jbs-0-exit.ppm');
await d.frames(8, 0x01); await d.frames(50, 0); // A en Exit
await d.shot('r31a/jbs-1-dialog.ppm');
await d.frames(15, 0x10); await d.frames(25, 0);
await d.frames(15, 0x10); await d.frames(25, 0); // No
await d.shot('r31a/jbs-2-no.ppm');
await d.frames(8, 0x01); await d.frames(50, 0);
let s = await d.state();
for (let f = 0; f < 80; f++) {
  await d.frames(30, 0);
  s = await d.state();
  if ((s.C0A0 ?? 0) >= 6) break;
}
await d.frames(120, 0);
await d.shot('r31a/jbs-3-battle.ppm');
const roster = await d.read(0xCB1A, 3);
const st = await d.read(0xCA3C, 0x18);
const cc = await d.read(0xCA3E, 1);
console.log(`C0A0=${(s.C0A0??0).toString(16)} roster=[${roster.map(v=>v.toString(16)).join(' ')}] CC=${cc[0]}`);
console.log(`CA3C: ${st.map(v=>v.toString(16).padStart(2,'0')).join(' ')}`);
await d.savestate('r31a/jeice-battle-saved.ss0');
await d.quit();
