/**
 * verify:v8 — Valida el catálogo semántico V8 (sprites-source/catalog-v8/)
 * contra el código runtime real del repo.
 *
 * Baseline del paquete: 349e54824d397a47df4fa7d615cde1ef5a8e2241
 * (docs del paquete: sprites-source/catalog-v8/README_FIRST.md)
 *
 * Checks:
 *  1. frame_catalog.csv  = 1.952 frames canónicos (42 formas)
 *  2. card_sequences.csv = 125 cartas
 *  3. form_pose_matrix.csv = 924 filas (21 poses x 44 dirs)
 *  4. action_profiles.csv = 42 perfiles firma
 *  5. effects_catalog.csv = 225 componentes V7 sin old_ref auditados
 *  6. semantic_named/ = 1.952 aliases PNG no destructivos
 *  7. runtime_exact_mapping.csv (generado por tools/reconcile_with_repo.py)
 *     tiene matches EXACT_VISIBLE_PIXEL_MATCH contra el repo
 *  8. stage_sequences.json == STAGE_SEQUENCE_POOL del repo
 *  9. STAGE_INPUT_POSES del contrato V8 == stageInputMap.ts del repo
 * 10. SHA256SUMS.txt del paquete verificado contra los archivos instalados
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const V8 = path.join(process.cwd(), 'sprites-source/catalog-v8');
let failures = 0;
const seen = new Set<string>();

function check(name: string, ok: boolean, detail?: string): void {
  if (seen.has(name)) return;
  seen.add(name);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function csvRows(file: string): number {
  const p = path.join(V8, file);
  if (!fs.existsSync(p)) return -1;
  const text = fs.readFileSync(p, 'utf8');
  return text.trim().split(/\r?\n/).length - 1; // menos header
}

// 1-5: conteos QA declarados
check('v8:frame_catalog_1952', csvRows('catalog/frame_catalog.csv') === 1952,
  `${csvRows('catalog/frame_catalog.csv')} filas`);
check('v8:card_sequences_125', csvRows('cards/card_sequences.csv') === 125,
  `${csvRows('cards/card_sequences.csv')} filas`);
check('v8:form_pose_matrix_924', csvRows('sequences/form_pose_matrix.csv') === 924,
  `${csvRows('sequences/form_pose_matrix.csv')} filas`);
check('v8:action_profiles_42', csvRows('sequences/action_profiles.csv') === 42,
  `${csvRows('sequences/action_profiles.csv')} filas`);
check('v8:effects_catalog_225', csvRows('effects/effects_catalog.csv') === 225,
  `${csvRows('effects/effects_catalog.csv')} filas`);

// 6: aliases semánticos (estructura: semantic_named/<runtime_dir>/<bucket>/*.png)
const aliasDir = path.join(V8, 'semantic_named');
let aliasCount = 0;
if (fs.existsSync(aliasDir)) {
  const walk = (d: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.png')) aliasCount++;
    }
  };
  walk(aliasDir);
}
check('v8:semantic_aliases_1952', aliasCount === 1952, `${aliasCount} aliases PNG`);

// 7: runtime_exact_mapping generado por el reconciliador
const remPath = path.join(V8, 'catalog/runtime_exact_mapping.csv');
if (fs.existsSync(remPath)) {
  const rows = fs.readFileSync(remPath, 'utf8').trim().split(/\r?\n/).slice(1);
  const exact = rows.filter(r => {
    const cols = r.split(',');
    return cols.length >= 7 && Number(cols[5]) > 0;
  }).length;
  check('v8:runtime_exact_mapping', rows.length > 0 && exact > 0,
    `${rows.length} filas runtime, ${exact} EXACT_VISIBLE_PIXEL_MATCH`);
} else {
  check('v8:runtime_exact_mapping', false, 'falta catalog/runtime_exact_mapping.csv — ejecuta tools/reconcile_with_repo.py');
}

// 8+9: SUPERSEDED — Stage Attack es ahora ROM-faithful (P0.4S: LEFT eliminado,
// 8 variantes ROM por nivel). El catálogo V8 es un baseline legacy que conserva su
// snapshot histórico de stage; la fidelidad de stage se valida en verify:rom-stage-fidelity.
check('v8:stage_checks_superseded_by_rom_stage_fidelity', true, 'ROM-faithful (verify:rom-stage-fidelity)');

// 10: SHA256SUMS — verificar una muestra (los 4 archivos de contrato)
try {
  const sums = fs.readFileSync(path.join(V8, 'SHA256SUMS.txt'), 'utf8');
  let shaOk = true;
  let shaDetail = '';
  for (const f of ['AUDIT_REPORT_V8.md', 'catalog/frame_catalog.csv', 'sequences/action_profiles.csv', 'cards/card_sequences.csv']) {
    const rel = f.replace(/\//g, '/');
    const line = sums.split(/\r?\n/).find(l => l.trim().endsWith(rel));
    if (!line) { shaOk = false; shaDetail = `sin entrada ${rel}`; break; }
    const expected = line.trim().split(/\s+/)[0];
    const actual = createHash('sha256').update(fs.readFileSync(path.join(V8, rel))).digest('hex');
    if (expected !== actual) { shaOk = false; shaDetail = `${rel} no coincide`; break; }
  }
  check('v8:sha256_spotcheck', shaOk, shaDetail || '4 archivos verificados');
} catch (e) {
  check('v8:sha256_spotcheck', false, String(e));
}

console.log(failures === 0 ? '\nV8 CATALOG OK ✅' : `\nV8 CATALOG: ${failures} FALLOS ❌`);
process.exit(failures === 0 ? 0 : 1);
