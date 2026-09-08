// ═══════════════════════════════════════════════════════════════════════
// VERIFY: DYNAMIC FILM TRACKER (P0.2 slice 1 gate)
// ═══════════════════════════════════════════════════════════════════════
// Invariantes (todas contra datos vivos + tracker, sin literales):
//   1. DYNAMIC_PENDING total (bindings selector-kind) == filas del tracker
//      == 106 (hoy) y la suma por causa == total.
//   2. UNTRACKED_DYNAMIC_PENDING == 0: cada pending vivo tiene SU fila
//      (cardId|trackId|resourceHex) y cada fila corresponde a un pending
//      vivo (sin filas stale). Films: los 26 dynamic films == filas film.
//   3. UNKNOWN_REASON == 0: ninguna fila con cause G ni reasonCode
//      genérico; causa ∈ A-G; evidenceStatus ∈ enum; blocker no vacío.
//   4. Doc bajo docs/rom/audit/dynamic-film-tracker.{md,csv} byte-idéntico
//      al generado desde el core (el tracker documentado no puede derivar).
// Uso: npm run verify:dynamic-film-tracker
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getRomActionSequenceBindings } from '../src/data/romActionSequenceBinding';
import { compileAllRomPresentationProfiles } from '../src/battle/romPresentationCompiler';
import {
  TRACKER_DOC_MD, TRACKER_DOC_CSV,
  CAUSE_DEFS,
  buildOccurrenceRows, buildFilmRows, trackerTotals,
  type EvidenceStatus,
} from './dynamicFilmTrackerCore';
import { buildGenerator } from './build-dynamic-film-tracker-doc';

let failures = 0;
function check(label: string, ok: boolean, detail = ''): void {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

function main(): void {
  console.log('verify:dynamic-film-tracker\n');

  // ── Datos vivos ─────────────────────────────────────────────────────
  const livePending = getRomActionSequenceBindings().flatMap(b =>
    b.tracks
      .filter(t => t.selector.kind === 'DYNAMIC_PENDING')
      .map(t => ({ key: `${b.card.id}|${t.trackId}|${t.resourceId != null ? t.resourceId.toString(16).padStart(2, '0') : '—'}`, cardId: b.card.id })),
  );
  const liveFilms = compileAllRomPresentationProfiles().filter(f => f.completion.dynamic === 'PENDING_ROM_TRACE');

  // ── Tracker ─────────────────────────────────────────────────────────
  const occurrences = buildOccurrenceRows();
  const films = buildFilmRows();
  const totals = trackerTotals(occurrences, films);

  check('invariante 1: DYNAMIC_PENDING total == filas del tracker',
    livePending.length === occurrences.length,
    `live ${livePending.length} · tracker ${occurrences.length}`);
  check('invariante 1: suma por causa == total occurrences',
    Object.values(totals.occurrencesByCause).reduce((a, b) => a + b, 0) === occurrences.length,
    JSON.stringify(totals.occurrencesByCause));

  // ── Coverage (UNTRACKED_DYNAMIC_PENDING == 0, sin stale) ───────────
  const trackerKeys = new Set(occurrences.map(r => r.key));
  const liveKeys = new Set(livePending.map(r => r.key));
  const untracked = livePending.filter(r => !trackerKeys.has(r.key));
  const stale = occurrences.filter(r => !liveKeys.has(r.key));
  check('invariante 2: UNTRACKED_DYNAMIC_PENDING == 0', untracked.length === 0,
    untracked.length ? `sin fila: ${untracked.map(u => u.key).join(', ')}` : '');
  check('invariante 2: sin filas stale en tracker', stale.length === 0,
    stale.length ? `stale: ${stale.map(s => s.key).join(', ')}` : '');

  check('invariante 2: 26 dynamic films == filas film del tracker',
    liveFilms.length === films.length && liveFilms.every(f => films.some(row => row.cardId === f.cardId)),
    `live ${liveFilms.length} · tracker ${films.length}`);

  // ── Well-formed (UNKNOWN_REASON == 0, sin pendiente genérico) ───────
  const causes = new Set(CAUSE_DEFS.map(c => c.code));
  const evidenceStatuses = new Set<EvidenceStatus>(['STATIC_EVIDENCE', 'PARTIAL_DYN_EVIDENCE']);
  const GENERIC = /GENERIC|UNKNOWN_REASON|^TBD$|^TODO$|^$|PENDING(?!_)/i;
  let malformed = 0;
  for (const r of [...occurrences, ...films]) {
    if (!causes.has(r.cause)) malformed++;
    if (GENERIC.test(r.reasonCode)) malformed++;
    if (!evidenceStatuses.has(r.evidenceStatus as EvidenceStatus)) malformed++;
    if (!r.blocker || r.blocker.trim().length < 10) malformed++;
    const hasEvidence = 'evidence' in r
      ? (r.evidence as string).trim().length >= 5
      : (r.pendingItems as string[]).length >= 1;
    if (!hasEvidence) malformed++;
    if (!r.cardName) malformed++;
  }
  check('invariante 3: filas well-formed (cause/reasonCode/evidenceStatus/blocker/evidence)', malformed === 0, `${malformed} malformed`);

  const unknownRows = [...occurrences, ...films].filter(r => r.cause === 'G' || /UNKNOWN_REASON/.test(r.reasonCode));
  check('invariante 3: UNKNOWN_REASON == 0', unknownRows.length === 0,
    unknownRows.length ? `${unknownRows.length} filas cause G/UNKNOWN_REASON` : '(todo clasificado con evidencia; 0 pendientes sin explicación)');

  const causeCounts = new Set([...occurrences, ...films].map(r => r.cause));
  for (const c of causeCounts) {
    if (!causes.has(c)) { check(`causa válida ${c}`, false); }
  }
  console.log(`\noccurrences por causa: ${JSON.stringify(totals.occurrencesByCause)}`);
  console.log(`films por causa:       ${JSON.stringify(totals.filmsByCause)}`);

  // ── Doc freshness ───────────────────────────────────────────────────
  const mdPath = join(process.cwd(), TRACKER_DOC_MD);
  const csvPath = join(process.cwd(), TRACKER_DOC_CSV);
  if (!existsSync(mdPath) || !existsSync(csvPath)) {
    check('invariante 4: doc existe', false, `falta ${!existsSync(mdPath) ? mdPath : csvPath} — regenerar con scripts/build-dynamic-film-tracker-doc.ts`);
  } else {
    const currentMd = readFileSync(mdPath, 'utf8');
    const currentCsv = readFileSync(csvPath, 'utf8');
    const generated = buildGenerator();
    check('invariante 4: dynamic-film-tracker.md byte-idéntico al generado', currentMd === generated.md,
      currentMd === generated.md ? '' : 'doc desactualizado — regenerar con scripts/build-dynamic-film-tracker-doc.ts');
    check('invariante 4: dynamic-film-tracker.csv byte-idéntico al generado', currentCsv === generated.csv,
      currentCsv === generated.csv ? '' : 'csv desactualizado — regenerar con scripts/build-dynamic-film-tracker-doc.ts');
  }

  console.log(failures === 0 ? '\nverify:dynamic-film-tracker → PASS' : `\nverify:dynamic-film-tracker → FAIL (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

// Reproduce el generador en memoria para comparar byte-idéntico.

main();
