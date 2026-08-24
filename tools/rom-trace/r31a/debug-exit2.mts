import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/list-base.ss0');
await d.frames(30, 0);
const shot = async (l: string) => { await d.shot(`r31a/dbg2-${l}.ppm`); const s = await d.state(); console.log(`${l}: C0A0=${(s.C0A0??0).toString(16)}`); };
for (let i = 0; i < 3; i++) { await d.frames(3, 0x02); await d.frames(30, 0); await shot(`b${i+1}`); }
await d.frames(60, 0);
for (let i = 0; i < 5; i++) { await d.frames(8, 0x80); await d.frames(10, 0); }
await shot('d5');
await d.frames(6, 0x01); await d.frames(400, 0);
await shot('afterA400');
const s = await d.state();
console.log(`FINAL C0A0=${(s.C0A0??0).toString(16)} CA06=${(s.CA06??0).toString(16)} C3C6=${(s.C3C6??0).toString(16)}`);
await d.quit();
