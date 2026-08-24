import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.shot('r31a/j1-start.ppm');
await d.frames(8, 0x20); await d.frames(40, 0); // LEFT → JOINT
await d.shot('r31a/j2-joint.ppm');
const pre = await d.read(0xCAC0, 0x60); // dump amplio antes de A
await d.frames(6, 0x01); await d.frames(50, 0); // A → abrir lista
await d.shot('r31a/j3-open.ppm');
console.log('pre-CAC0:', pre.map(v=>v.toString(16).padStart(2,'0')).join(' '));
await d.quit();
