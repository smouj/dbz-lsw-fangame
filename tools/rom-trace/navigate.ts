// ═══════════════════════════════════════════════════════════════════════
// ROM R3.1A — navigate.ts: sesión persistente de navegación.
//
// Bootea una vez, avanza la historia con taps de A, y registra
// frame + registros de batalla + screenshot periódico en un log JSONL.
// Detecta entrada en combate (C0A0 != 0) y guarda un checkpoint.
//
//   npx tsx navigate.ts <rom> <sav> <outDir> <maxFrames> [interval]
// ═══════════════════════════════════════════════════════════════════════
import { RomDriver } from './nav.ts';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const [rom, sav, outDir, maxFramesStr, intervalStr] = process.argv.slice(2);
const maxFrames = Number(maxFramesStr ?? 6000);
const interval = Number(intervalStr ?? 60);

mkdirSync(outDir, { recursive: true });
const d = new RomDriver(rom, sav);
const log: unknown[] = [];
const TAP_HOLD = 8, TAP_RELEASE = 8;

// Primero salir de la pantalla legal (la ROM arranca en el splash legal
// durante ~120 frames; A adelanta igualmente).
let battleSeen = false;
for (let frame = 0; frame < maxFrames; frame += TAP_HOLD + TAP_RELEASE) {
  await d.frames(TAP_HOLD, 0x01); // A
  await d.frames(TAP_RELEASE, 0);
  const s = await d.state();
  const c0a0 = s.C0A0 ?? 0;
  const ca06 = s.CA06 ?? 0;
  const c3c6 = s.C3C6 ?? 0;
  if (!battleSeen && (c0a0 !== 0 || ca06 !== 0)) {
    battleSeen = true;
    console.log(`BATTLE_DETECTED frame=${frame} C0A0=${c0a0.toString(16)} CA06=${ca06.toString(16)}`);
    await d.savestate(join(outDir, 'battle-checkpoint.ss0'));
    console.log('checkpoint: battle-checkpoint.ss0');
  }
  if (frame % interval < TAP_HOLD + TAP_RELEASE) {
    const shot = join(outDir, `nav-f${String(frame).padStart(6, '0')}.ppm`);
    await d.shot(shot);
    log.push({ frame, c0a0, ca06, c3c6, shot: shot.split('/').pop() });
    console.log(`frame=${frame} C0A0=${c0a0.toString(16)} CA06=${ca06.toString(16)} C3C6=${c3c6.toString(16)} shot=${shot.split('/').pop()}`);
  }
}
writeFileSync(join(outDir, 'nav-log.jsonl'), log.map(l => JSON.stringify(l)).join('\n'));
console.log('NAV_DONE');
await d.quit();
