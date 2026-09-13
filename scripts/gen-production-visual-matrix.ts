// ═══════════════════════════════════════════════════════════════════════
// P0.4R-B8A — genera docs/audits/PRODUCTION_VISUAL_MATRIX.md
// ═══════════════════════════════════════════════════════════════════════
// SSOT generada. No editar el .md a mano: se regenera con
//   npm run gen:production-visual-matrix
// ═══════════════════════════════════════════════════════════════════════
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildVisualMatrix, MATRIX_FAMILIES, type VisualMatrixRow } from './production-visual-matrix';

const rows = buildVisualMatrix();

function cell(v: string | number | null): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v).replace(/\|/g, '\\|');
}

function count(f: VisualMatrixRow['fidelity']): number {
  return rows.filter(r => r.fidelity === f).length;
}

const covered = new Set(rows.map(r => r.family));
const missing = MATRIX_FAMILIES.filter(f => !covered.has(f));

const lines: string[] = [];
lines.push('# PRODUCTION VISUAL MATRIX (P0.4R-B8)');
lines.push('');
lines.push('**GENERADO — no editar a mano.** Regenerar con `npm run gen:production-visual-matrix`.');
lines.push('');
lines.push('Cadena auditada: `ROM evidence → compiler/timeline → adapter → ActionObjects /');
lines.push('Display / FX / palette / camera → Pixi Production → cleanup FIELD`.');
lines.push('');
lines.push('## Estados');
lines.push('');
lines.push('| Estado | Significado | Filas |');
lines.push('| --- | --- | ---: |');
lines.push(`| VERIFIED | evidencia ROM + cadena de producción observada | ${count('VERIFIED')} |`);
lines.push(`| PENDING | la cadena existe pero falta cerrar evidencia | ${count('PENDING')} |`);
lines.push(`| DEFERRED_TO_TRACE | sin driver determinista; requiere traza dinámica | ${count('DEFERRED_TO_TRACE')} |`);
lines.push('');
lines.push('La ausencia de evidencia se clasifica explícitamente. Nunca se degrada a');
lines.push('«fallo visual genérico».');
lines.push('');
lines.push('## Cobertura de familias representativas');
lines.push('');
lines.push(`Familias exigidas: **${MATRIX_FAMILIES.length}** · cubiertas: **${MATRIX_FAMILIES.length - missing.length}**`);
if (missing.length) lines.push(`\nFaltan: ${missing.join(', ')}`);
lines.push('');
lines.push('## Matriz');
lines.push('');
lines.push('| Familia | Carta | Handler | Entry | Binding | Slots | 1er physicalId | Visibilidad | Draw order | BG | Palette | FX | Camera | Impact | Exit | Residual | Fidelidad |');
lines.push('| --- | ---: | --- | ---: | --- | --- | ---: | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |');
for (const r of rows) {
  lines.push(`| ${cell(r.family)} | ${cell(r.cardId)} | ${cell(r.handler)} | ${cell(r.entryTick)} | ${cell(r.binding)} | ${cell(r.slots)} | ${cell(r.firstPhysicalId)} | ${cell(r.visibility)} | ${cell(r.drawOrder)} | ${cell(r.bg)} | ${cell(r.palette)} | ${cell(r.fx)} | ${cell(r.camera)} | ${cell(r.impactTick)} | ${cell(r.exitTick)} | ${cell(r.residual)} | ${r.fidelity} |`);
}
lines.push('');
lines.push('### Notas por familia');
lines.push('');
for (const r of rows) {
  if (r.note) lines.push(`- **${r.family}** — ${r.note}`);
}
lines.push('');
lines.push('## Consumidores de Production');
lines.push('');
lines.push('La matriz no se mantiene a mano. La consume el gate');
lines.push('`verify:production-visual-matrix` y el **Dev ROM Asset Explorer**');
lines.push('(sección dentro de ROM Display Lab 2.0), para no crear una fuente de verdad paralela.');
lines.push('');

mkdirSync('docs/audits', { recursive: true });
const out = 'docs/audits/PRODUCTION_VISUAL_MATRIX.md';
writeFileSync(out, lines.join('\n'));
console.log(`═══ ${out} ═══`);
console.log(`  filas: ${rows.length} · VERIFIED ${count('VERIFIED')} · PENDING ${count('PENDING')} · DEFERRED ${count('DEFERRED_TO_TRACE')}`);
console.log(`  familias: ${MATRIX_FAMILIES.length - missing.length}/${MATRIX_FAMILIES.length}`);

// ── Segunda proyección del MISMO modelo: datos importables por el Dev Studio ──
// No es duplicar verdad: son dos outputs generados de las mismas filas en la
// misma ejecución. El tab `assets` importa esto; nunca parsea el .md ni mantiene
// una tabla manual paralela.
const genLines: string[] = [];
genLines.push('// GENERADO — no editar a mano. `npm run gen:production-visual-matrix`.');
genLines.push('// Proyección importable de docs/audits/PRODUCTION_VISUAL_MATRIX.md (mismas filas).');
genLines.push('// Autocontenido: define su propio tipo de fila para no importar desde scripts/.');
genLines.push('');
genLines.push('export type MatrixFidelity = \'VERIFIED\' | \'PENDING\' | \'DEFERRED_TO_TRACE\';');
genLines.push('');
genLines.push('export interface VisualMatrixRow {');
genLines.push('  family: string;');
genLines.push('  cardId: number | null;');
genLines.push('  handler: string;');
genLines.push('  entryTick: number | null;');
genLines.push("  binding: 'OFFENSE' | 'DEFENSE_REACTION' | null;");
genLines.push('  slots: string;');
genLines.push('  firstPhysicalId: number | null;');
genLines.push('  visibility: string;');
genLines.push('  drawOrder: string;');
genLines.push('  bg: string;');
genLines.push('  palette: string;');
genLines.push('  fx: string;');
genLines.push('  camera: string;');
genLines.push('  impactTick: number | null;');
genLines.push('  exitTick: number | null;');
genLines.push('  residual: number;');
genLines.push('  fidelity: MatrixFidelity;');
genLines.push('  note: string;');
genLines.push('}');
genLines.push('');
genLines.push(`export const PRODUCTION_VISUAL_MATRIX_GENERATED_AT = ${JSON.stringify(new Date().toISOString())};`);
genLines.push('');
genLines.push('export const PRODUCTION_VISUAL_MATRIX_ROWS: VisualMatrixRow[] = [');
for (const r of rows) genLines.push(`  ${JSON.stringify(r)},`);
genLines.push('];');
genLines.push('');
genLines.push('export const PRODUCTION_VISUAL_MATRIX_FAMILIES = [');
for (const f of MATRIX_FAMILIES) genLines.push(`  ${JSON.stringify(f)},`);
genLines.push('] as const;');
genLines.push('');
genLines.push('export const PRODUCTION_VISUAL_MATRIX_COUNTS = {');
genLines.push(`  verified: ${count('VERIFIED')},`);
genLines.push(`  pending: ${count('PENDING')},`);
genLines.push(`  deferred: ${count('DEFERRED_TO_TRACE')},`);
genLines.push(`  familiesTotal: ${MATRIX_FAMILIES.length},`);
genLines.push(`  familiesCovered: ${MATRIX_FAMILIES.length - missing.length},`);
genLines.push('} as const;');
genLines.push('');
const genOut = 'src/devtools/romdisplay2/productionVisualMatrix.generated.ts';
writeFileSync(genOut, genLines.join('\n'));
console.log(`═══ ${genOut} (bridge del Dev Studio) ═══`);
