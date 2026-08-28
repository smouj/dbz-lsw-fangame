// Auditoría sheets vs manifests — usa los datos reales del roster
import { FORMS } from '../src/data/roster';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../src/data/generated/romPhysicalCorpus.generated';

const ROOT = process.cwd();
const sheetsDir = join(ROOT, 'public', 'assets', 'sheets');
const romPhysicalComplete =
  ROM_PHYSICAL_CORPUS_SUMMARY.totals.forms === 48
  && ROM_PHYSICAL_CORPUS_SUMMARY.totals.formsIndexed === 48
  && ROM_PHYSICAL_CORPUS_SUMMARY.totals.physicalIdentities === 809
  && ROM_PHYSICAL_CORPUS_SUMMARY.totals.frameInstances === 5767;

// Agrupar forms por sheet
const bySheet: Record<string, string[]> = {};
for (const [fid, f] of Object.entries(FORMS)) {
  if (!f.sheet) continue;
  (bySheet[f.sheet] ??= []).push(fid);
}

let worst: Array<{ sheet: string; forms: string; json: number; manifest: number; ratio: number }> = [];
console.log('sheet'.padEnd(30), 'forms'.padEnd(30), 'png', 'jsonFr', 'manifFr', 'ratio');
console.log('-'.repeat(105));
for (const [sheet, forms] of Object.entries(bySheet)) {
  const jsonPath = join(sheetsDir, sheet.replace('.png', '.json'));
  if (!existsSync(jsonPath)) { console.log(sheet.padEnd(30), forms.join(',').padEnd(30), 'NO JSON'); continue; }
  const s = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const jsonFrames = s.frame_count ?? s.frames?.length ?? 0;
  let mf = 0;
  for (const fid of forms) {
    const mp = join(ROOT, 'public', 'assets', 'sprites', fid, 'manifest.json');
    if (existsSync(mp)) {
      const m = JSON.parse(readFileSync(mp, 'utf8'));
      mf += Object.values(m).reduce((acc: number, v: any) => acc + (v.frame_count ?? v.frames?.length ?? 0), 0);
    }
  }
  mf = Math.round(mf / forms.length);
  const ratio = mf ? jsonFrames / mf : 0;
  const png = existsSync(join(sheetsDir, sheet)) ? '✓' : '✗';
  const flag = ratio < 0.85 ? (romPhysicalComplete ? ' ⚠️ LEGACY SHEET SUPERSEDIDA' : ' ⚠️ FALTAN FRAMES') : '';
  console.log(sheet.padEnd(30), forms.join(',').padEnd(30), png, String(jsonFrames).padEnd(6), String(mf).padEnd(8), ratio.toFixed(2), flag);
  if (ratio < 0.85) worst.push({ sheet, forms: forms.join(','), json: jsonFrames, manifest: mf, ratio });
}
console.log(romPhysicalComplete
  ? '\n=== SHEETS LEGACY SUPERSEDIDAS POR CORPUS ROM FÍSICO (ratio < 0.85) ==='
  : '\n=== SHEETS CON FALLOS (ratio < 0.85) ===', worst.length);
for (const w of worst) console.log(w.sheet, '→', w.forms, `(${w.json}/${w.manifest})`);
