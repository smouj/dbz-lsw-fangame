import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.frames(8, 0x10); await d.frames(40, 0); // RIGHT ×2 → BASIC
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0); // A → GUARD
await d.shot('r31a/gm-0-guard.ppm');
for (const [k, nm] of [[0x10,'right'],[0x20,'left'],[0x80,'down'],[0x40,'up']]) {
  await d.frames(8, k); await d.frames(40, 0);
  await d.shot(`r31a/gm-1-${nm}.ppm`);
  await d.frames(8, 0x20); await d.frames(40, 0); // volver
}
await d.frames(6, 0x01); await d.frames(50, 0); // A en GUARD → confirmar?
await d.shot('r31a/gm-2-confirm.ppm');
let s = await d.state();
for (let f = 0; f < 20; f++) { await d.frames(30, 0); s = await d.state(); }
await d.shot('r31a/gm-3-after.ppm');
console.log(`final C0A0=${(s.C0A0??0).toString(16)}`);
await d.quit();
