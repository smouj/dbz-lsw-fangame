// ROM R3.1A — probe.ts: sonda de menú. Bootea, avanza a la lista y
// prueba secuencias de teclas con screenshot + state después de cada paso.
//   npx tsx probe.ts <rom> <sav> <outDir> <toListFrames> <paso1:keys> ...
import { RomDriver } from './nav.ts';
import { mkdirSync } from 'fs';
import { join } from 'path';

const [rom, sav, outDir, toListFramesStr, ...steps] = process.argv.slice(2);
const toListFrames = Number(toListFramesStr ?? 1000);
mkdirSync(outDir, { recursive: true });
const d = new RomDriver(rom, sav);
let n = 0;
for (let i = 0; i < toListFrames; i += 16) { await d.frames(8, 0x01); await d.frames(8, 0); }
await shot('to-list');
console.log('en menú lista');
for (const step of steps) {
  const [keysStr, holdStr] = step.split(':');
  const keys = Number(keysStr), hold = Number(holdStr ?? 8);
  console.log(`--- keys=${keys.toString(16)} hold=${hold} ---`);
  await d.frames(hold, keys);
  await d.frames(8, 0);
  await d.frames(120, 0);
  await shot(`after-${keys.toString(16)}-${n++}`);
}
async function shot(label: string) {
  await d.shot(join(outDir, `${label}.ppm`));
  const s = await d.state();
  console.log(`${label}: C0A0=${(s.C0A0 ?? 0).toString(16)} CA06=${(s.CA06 ?? 0).toString(16)} C3C6=${(s.C3C6 ?? 0).toString(16)}`);
}
await d.quit();
