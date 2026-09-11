// ═══════════════════════════════════════════════════════════════════════
// DYNAMIC FILM TRACKER — doc generator
// Escribe docs/rom/audit/dynamic-film-tracker.md + .csv desde el core
// (única fuente: scripts/dynamicFilmTrackerCore.ts sobre datos vivos).
// Uso: npm run build:dynamic-film-tracker-doc
// ═══════════════════════════════════════════════════════════════════════

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import {
  TRACKER_DOC_DIR, TRACKER_DOC_MD, TRACKER_DOC_CSV,
  CAUSE_DEFS,
  buildOccurrenceRows, buildFilmRows, trackerTotals,
  type OccurrenceRow, type FilmRow,
} from './dynamicFilmTrackerCore';

function csvCell(value: string | number | null): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface GeneratedDoc { md: string; csv: string; }

export function buildGenerator(): GeneratedDoc {
  const occurrences = buildOccurrenceRows();
  const films = buildFilmRows();
  const totals = trackerTotals(occurrences, films);
  const md = markdown(occurrences, films, totals);
  const csv = csvContent(occurrences, films);
  return { md, csv };
}

function handlerWorkerSummary(code: string): { handler: string; resource: string; sequence: string } {
  switch (code) {
    case 'A': return { handler: '$02-$07 beams/proyectiles (B3:$5776/$5B38/$5AC7/$5B9E/$5DFE)', resource: 'fx windows (tilebank BG $9800)', sequence: '—' };
    case 'B': return { handler: '$0D/$0E MULTI_ACTOR_SCRIPT (B3:$5C04/$5D0C)', resource: 'fx $01/$04/$27/$6F helper', sequence: '—' };
    case 'C': return { handler: '$0A standard damage (cerrado P0.1)', resource: '—', sequence: '—' };
    case 'D': return { handler: 'filas actor Defense $00 + films $0B/$08/$0C (B3:$61C5/$5E67/$62D4)', resource: 'actor slot8 $24/$26/$27 + fx films', sequence: '0-N cerradas' };
    case 'E': return { handler: 'SCREEN_PATH/motion workers', resource: '—', sequence: '—' };
    case 'F': return { handler: '$00 STAGE_OR_RULE + soportes/items $02-utility (SUPPORT/DEFENSE)', resource: 'fx $01/$02/$04/$06/$08 no-ofensivos', sequence: '—' };
    default: return { handler: '—', resource: '—', sequence: '—' };
  }
}

function blockerShort(code: string): string {
  switch (code) {
    case 'A': return 'SFX-V4-05 per-scanline (LY 23-95) → cablear scroll';
    case 'B': return 'Trace FSM worker $5C04/$5D0C (ownership helper)';
    case 'C': return '—';
    case 'D': return 'Trace FSM/branch por worker → promover selector';
    case 'E': return '—';
    case 'F': return 'Corpus FX soporte: SEPARATE_DOMAIN/UNRESOLVED';
    default: return '—';
  }
}

function markdown(occurrences: OccurrenceRow[], films: FilmRow[], totals: ReturnType<typeof trackerTotals>): string {
  const causes = CAUSE_DEFS.map(def => ({
    def,
    occCount: totals.occurrencesByCause[def.code] ?? 0,
    filmCount: totals.filmsByCause[def.code] ?? 0,
  }));

  const lines: string[] = [];
  lines.push('# Dynamic Film Tracker — por causa raíz (P0.2)');
  lines.push('');
  lines.push('> Archivo GENERADO por `scripts/build-dynamic-film-tracker-doc.ts` sobre datos vivos');
  lines.push('> (bindings · profiles · runtime_cutover.json · FX corpus). NO editar a mano.');
  lines.push('> Gate: `npm run verify:dynamic-film-tracker` (en verify:ci). Fuente única: `scripts/dynamicFilmTrackerCore.ts`.');
  lines.push('');
  lines.push('## Invariantes');
  lines.push('');
  lines.push('- Cada **occurrence** (selector de actor o ventana FX realmente pendiente) cae EXACTAMENTE en una causa A-G.');
  lines.push('- Las pistas `NON_SEQUENCE_DISPLAY` no cuentan como selección dinámica: pertenecen a la gramática de display/FX.');
  lines.push('- Cada **film** (profile `completion.dynamic === PENDING_ROM_TRACE`) cae EXACTAMENTE en una causa A-G.');
  lines.push('- `UNKNOWN_REASON == 0` (cause G): 0 pendientes SIN explicación. Una fila sin evidencia');
  lines.push('  clasificatoria sería G genuino — nunca un pendiente genérico sin documentar.');
  lines.push('- `UNTRACKED_DYNAMIC_PENDING == 0`: ningún pending vivo sin fila en este tracker, y viceversa.');
  lines.push('');
  lines.push('## Matriz por causa');
  lines.push('');
  lines.push('| Causa | Nombre | Handler/worker implicado | Resource | Sequence | Blocker (qué cierra) | Films | Occurrences |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const { def, occCount, filmCount } of causes) {
    const hw = handlerWorkerSummary(def.code);
    lines.push(`| **${def.code}** | ${def.name} | ${hw.handler} | ${hw.resource} | ${hw.sequence} | ${blockerShort(def.code)} | ${filmCount} | ${occCount} |`);
  }
  lines.push('');
  lines.push(`**Totales: ${totals.occurrencesTotal} occurrences · ${totals.filmsTotal} films.**`);
  lines.push('');
  lines.push('## Causas — descripción y provenance de evidencia');
  lines.push('');
  for (const def of CAUSE_DEFS) {
    lines.push(`### ${def.code} — ${def.name}`);
    lines.push('');
    lines.push(def.description);
    lines.push('');
    lines.push(`- Evidence provenance: ${def.evidenceProvenance}`);
    lines.push('');
  }
  lines.push('## Regla de clasificación (determinista, en el core)');
  lines.push('');
  lines.push('```');
  lines.push('ROM_FX_WINDOW con scroll/timing PENDING_ROM_TRACE          → A');
  lines.push('actor row (N seqs físicas cerradas, selección por handler) → D');
  lines.push('films SPECIAL_HANDLER: MULTI_ACTOR_SCRIPT → B; restantes → D');
  lines.push('Las pistas FX/display no son selectores de secuencia y no crean occurrences.');
  lines.push('C/E/F sin occurrences en este slice; G = 0 (todo clasificado con evidencia).');
  lines.push('```');
  lines.push('');
  lines.push('## Films dinámicos (26)');
  lines.push('');
  lines.push('| Card | Name | Handler | Worker | Family | Causa | reasonCode |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const f of films) {
    lines.push(`| ${f.cardId} | ${f.cardName} | ${f.handlerHex} | ${f.worker ?? '—'} | ${f.family} | **${f.cause}** | \`${f.reasonCode}\` |`);
  }
  lines.push('');
  lines.push(`## Occurrences (${occurrences.length}) — resumen por causa`);
  lines.push('');
  for (const { def, occCount } of causes) {
    if (occCount === 0) continue;
    const cards = occurrences.filter(r => r.cause === def.code).map(r => `${r.cardId} ${r.cardName} (${r.trackId})`).join(' · ');
    lines.push(`### ${def.code} — ${occCount} occurrences`);
    lines.push('');
    lines.push(cards);
    lines.push('');
  }
  lines.push('Detalle fila a fila (cardId · handler · resource · sequence · reasonCode · evidenceStatus · blocker · evidence):');
  lines.push(`ver \`dynamic-film-tracker.csv\` (${occurrences.length} filas occurrence + ${films.length} filas film) — columnas como exige el gate.`);
  lines.push('');
  lines.push('## Hallazgo causa A (SFX-V4-05 → siguiente paso SFX-V4-06)');
  lines.push('');
  lines.push('La infraestructura nativa Windows ya captura cada cambio de LY durante ejecución real');
  lines.push('de la ROM España. Esto demuestra los deltas que viven dentro de HBlank aunque SCX/SCY');
  lines.push('vuelvan a cero en el boundary del frame. La familia sigue abierta por cobertura, no por tooling.');
  lines.push('');
  lines.push('- Handler $02: Kamehameha LEFT y S.Beam Can. RIGHT demuestran ventanas raster 80f,');
  lines.push('  travel 16f con dirección por lado y restore explícito.');
  lines.push('- Handler $05 LEFT: Energy Bomb demuestra 2f de preparación, screen motion -6×19,');
  lines.push('  restore y travel 16f. Fixture y hash del raw quedan fijados por el gate.');
  lines.push('- Siguiente paso: escenario legal same-card LEFT/RIGHT y representantes $03/$04/$06/$07;');
  lines.push('  solo entonces generalizar familias y retirar las occurrences que cubra la evidencia.');
  lines.push('');
  return lines.join('\n');
}

function csvContent(occurrences: OccurrenceRow[], films: FilmRow[]): string {
  const header = ['kind', 'cause', 'cardId', 'cardName', 'handlerHex', 'family', 'worker', 'trackId', 'resourceHex', 'sequence', 'physicalStatus', 'reasonCode', 'evidenceStatus', 'blocker', 'evidence'];
  const rows: string[][] = [header];
  for (const r of occurrences) {
    rows.push(['occurrence', r.cause, String(r.cardId), r.cardName, r.handlerHex, r.family, r.worker ?? '', r.trackId, r.resourceHex ?? '', r.sequence, r.physicalStatus, r.reasonCode, r.evidenceStatus, r.blocker, r.evidence]);
  }
  for (const f of films) {
    rows.push(['film', f.cause, String(f.cardId), f.cardName, f.handlerHex, f.family, f.worker ?? '', 'film', '', '', '', f.reasonCode, f.evidenceStatus, f.blocker, f.pendingItems.join(' | ')]);
  }
  return rows.map(line => line.map(csvCell).join(',')).join('\n') + '\n';
}

export function writeDoc(): GeneratedDoc {
  const doc = buildGenerator();
  mkdirSync(dirname(join(process.cwd(), TRACKER_DOC_MD)), { recursive: true });
  writeFileSync(join(process.cwd(), TRACKER_DOC_MD), doc.md, 'utf8');
  writeFileSync(join(process.cwd(), TRACKER_DOC_CSV), doc.csv, 'utf8');
  return doc;
}
