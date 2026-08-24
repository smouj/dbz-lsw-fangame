import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
// A) probe clásico
await d.loadstate('r31a/tail_left_base.ss0');
await d.frames(60, 0);
await d.frames(8, 0x01);
await d.frames(20, 0);
let s = await d.state();
console.log(`A) frames: C0A0=${(s.C0A0??0).toString(16)}`);
// B) trace con keyspec
await d.loadstate('r31a/tail_left_base.ss0');
await d.trace('r31a/td.json', 88, '60:1:8');
const t = JSON.parse(await (await import('fs')).promises.readFile('r31a/td.json', 'utf8'));
const cs = new Set(t.frames.map((f: any) => f.battle.C0A0));
console.log(`B) trace: C0A0 set=${[...cs].map(x=>x.toString(16)).join(',')}`);
await d.quit();
