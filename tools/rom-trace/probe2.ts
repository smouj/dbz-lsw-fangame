// ROM R3.1A — probe2.ts: probador de menú DESDE savestate.
//   npx tsx probe2.ts <rom> <sav> <stateFile> <outDir> [pasos...]
// Cada paso: "keys:hold:wait" ej "1:8:120" (A 8f + 120f idle)
import { RomDriver } from './nav.ts';
import { mkdirSync } from 'fs';
import { join } from 'path';

const [rom, sav, stateFile, outDir, ...steps] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const d = new RomDriver(rom, sav);
await d.loadstate(stateFile);
await d.frames(30, 0);
let n = 0;
for (const step of steps) {
  const [keysStr, holdStr, waitStr] = step.split(':');
  const keys = Number(keysStr), hold = Number(holdStr ?? 8), wait = Number(waitStr ?? 60);
  console.log(`--- paso keys=${keys.toString(16)} hold=${hold} wait=${wait} ---`);
  await d.frames(hold, keys);
  await d.frames(8, 0);
  await d.frames(wait, 0);
  const label = `p${n}-k${keys.toString(16)}`;
  await d.shot(join(outDir, `${label}.ppm`));
  const s = await d.state();
  console.log(`${label}: C0A0=${(s.C0A0 ?? 0).toString(16)} CA06=${(s.CA06 ?? 0).toString(16)} C3C6=${(s.C3C6 ?? 0).toString(16)}`);
  n++;
}
await d.quit();
