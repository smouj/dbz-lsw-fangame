import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
const TEST = 99; // Life Preserver — distintivo
// estado inicial
await d.shot('r31a/patch-pre.ppm');
const pre = await d.read(0xCB40, 8);
console.log('hand antes:', pre.map(v => v.toString(16).padStart(2,'0')).join(' '));
// parchear CADA slot de 0xCB40..0xCB45 y verificar readback + UI
for (let slot = 0; slot < 6; slot++) {
  const addr = 0xCB40 + slot;
  const orig = (await d.read(addr, 1))[0];
  await d.write(addr, TEST);
  const rb = (await d.read(addr, 1))[0];
  await d.frames(20, 0); // reanudar: la UI debe reflejar el cambio si es mano
  await d.shot(`r31a/patch-slot${slot}.ppm`);
  await d.write(addr, orig); // restaurar
  await d.frames(10, 0);
  console.log(`slot${slot} @0x${addr.toString(16)}: orig=${orig.toString(16)} write=${TEST.toString(16)} readback=${rb.toString(16)}`);
}
await d.shot('r31a/patch-post.ppm');
await d.quit();
