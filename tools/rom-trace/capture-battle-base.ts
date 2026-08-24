// ═══════════════════════════════════════════════════════════════════════
// ROM R3.1A — capture-battle-base.ts
// Navega: boot → menú lista → SYSTEM → Exit → batalla estable.
// Produce: battle-base.ss0 (savestate en batalla), snapshot-A (pre-batalla,
// WRAM completa), snapshot-B (en batalla, WRAM completa) y screenshot.
//   npx tsx capture-battle-base.ts <rom> <sav> <outDir>
// ═══════════════════════════════════════════════════════════════════════
import { RomDriver } from './nav.ts';
import { mkdirSync } from 'fs';
import { join } from 'path';

const [rom, sav, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const d = new RomDriver(rom, sav);

// 1) Boot → menú lista (LIST deck editor): taps de A
for (let i = 0; i < 1000; i += 16) { await d.frames(8, 0x01); await d.frames(8, 0); }
await d.savestate(join(outDir, 'list-base.ss0'));
console.log('list-base.ss0 guardado (menú pre-batalla)');
await d.memdump(join(outDir, 'snapshot-A-pre-battle.json'), 0xC000, 0x2000);
console.log('snapshot-A (WRAM pre-batalla)');

// 2) Abrir SYSTEM (B×3) y pulsar Exit: DOWN×5 → A
for (let i = 0; i < 3; i++) { await d.frames(3, 0x02); await d.frames(30, 0); }
await d.frames(60, 0);
for (let i = 0; i < 5; i++) { await d.frames(8, 0x80); await d.frames(10, 0); }
await d.frames(6, 0x01); // A en Exit
console.log('Exit pulsado');

// 3) Esperar transición a batalla (C0A0 -> 6)
let s = await d.state();
for (let f = 0; f < 50 && (s.C0A0 ?? 0) < 6; f++) {
  await d.frames(30, 0);
  s = await d.state();
  if (f % 5 === 0) console.log(`  frame+${(f + 1) * 30} C0A0=${(s.C0A0 ?? 0).toString(16)} CA06=${(s.CA06 ?? 0).toString(16)}`);
}
if ((s.C0A0 ?? 0) < 6) {
  console.error('No se alcanzó batalla estable');
  await d.quit();
  process.exit(1);
}
await d.frames(120, 0); // estabilizar HUD
await d.savestate(join(outDir, 'battle-base.ss0'));
await d.memdump(join(outDir, 'snapshot-B-in-battle.json'), 0xC000, 0x2000);
await d.shot(join(outDir, 'battle-base.ppm'));
s = await d.state();
console.log(`battle-base.ss0 + snapshot-B guardados. C0A0=${(s.C0A0 ?? 0).toString(16)} C3C6=${(s.C3C6 ?? 0).toString(16)}`);
await d.quit();
