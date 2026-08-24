import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.shot('r31a/battle-reload.ppm');
const s = await d.state();
console.log(`C0A0=${(s.C0A0??0).toString(16)} CA06=${(s.CA06??0).toString(16)} C3C6=${(s.C3C6??0).toString(16)} CA53=${(s.CA53??0).toString(16)}`);
await d.quit();
