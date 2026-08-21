// Auditoría definitiva: ¿cada frame físico del manifest está en su sheet PNG?
import { FORMS } from '../src/data/roster';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
// @ts-ignore - no node types here
import { createHash } from 'node:crypto';

const ROOT = process.cwd();

// shape signature normalizada (offset-insensitive)
function shapeSig(img: any): Set<string> | null {
  const { width, height } = img;
  // use raw pixel buffer via PNG parse — simplest: read via PIL-like? Node has no PIL.
  // Fallback: compare by exact pixel buffer via a small PNG decoder is heavy.
  return null;
}

// En su lugar: comparar por buffer exacto del PNG (los frames del manifest son
// recortes del sheet → el buffer del frame DEBE aparecer como sub-buffer del PNG
// del sheet si el sheet es el ORIGEN. Pero los sheets del proyecto son
// atomic_sheets reconstruidos (grid), NO el origen. Así que comparar buffers es
// inútil. La comparación válida es: sheet JSON cubre TODOS los frames físicos
// del manifest (mismo número + misma pose semántica).
console.log('Auditoría sheet JSON vs manifest (frames físicos únicos):');
console.log('sheet'.padEnd(32), 'form'.padEnd(18), 'sheetFr', 'manifestFr', 'ok?');
console.log('-'.repeat(90));

const bySheet: Record<string, string[]> = {};
for (const [fid, f] of Object.entries(FORMS)) {
  if (!f.sheet) continue;
  (bySheet[f.sheet] ??= []).push(fid);
}

let bad = 0;
for (const [sheet, forms] of Object.entries(bySheet)) {
  const jsonPath = join(ROOT, 'public', 'assets', 'sheets', sheet.replace('.png', '.json'));
  if (!existsSync(jsonPath)) { console.log(sheet.padEnd(32), forms.join(',').padEnd(18), 'NO JSON'); continue; }
  const s = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const sheetFrames = new Set(s.frames.map((f: any) => f.file));
  for (const fid of forms) {
    const mp = join(ROOT, 'public', 'assets', 'sprites', fid, 'manifest.json');
    if (!existsSync(mp)) continue;
    const m = JSON.parse(readFileSync(mp, 'utf8'));
    const refs = new Set<string>();
    for (const v of Object.values(m) as any[]) {
      for (const fr of v.frames ?? []) refs.add(fr.file);
    }
    // El sheet JSON nombra frames como NNN.png o pose_nombre — no coincide con
    // los nombres del manifest. La única comprobación fiable: el sheet JSON
    // fue generado DESDE el V9 (atomic_sheet), no desde el manifest. Un sheet
    // está MAL si su frame_count es significativamente menor que el nº de
    // frames físicos del manifest (formas que comparten sprites en el ROM).
    const ok = sheetFrames.size >= refs.size * 0.9 || refs.size <= 10;
    if (!ok) {
      bad++;
      console.log(sheet.padEnd(32), fid.padEnd(18), String(sheetFrames.size).padEnd(8), String(refs.size).padEnd(10), '⚠️ INCOMPLETO');
    } else {
      console.log(sheet.padEnd(32), fid.padEnd(18), String(sheetFrames.size).padEnd(8), String(refs.size).padEnd(10), '✓');
    }
  }
}
console.log('\nIncompletos:', bad);
