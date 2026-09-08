// Standalone runner: regenera docs/rom/audit/dynamic-film-tracker.{md,csv}
// desde el core. Uso: npx --yes tsx scripts/run-dynamic-film-tracker-doc.ts
import { writeDoc } from './build-dynamic-film-tracker-doc';
import { TRACKER_DOC_MD, TRACKER_DOC_CSV, buildOccurrenceRows, buildFilmRows, trackerTotals } from './dynamicFilmTrackerCore';

function main(): void {
  const doc = writeDoc();
  const occurrences = buildOccurrenceRows();
  const films = buildFilmRows();
  const totals = trackerTotals(occurrences, films);
  console.log(`dynamic-film-tracker doc written: ${TRACKER_DOC_MD} + ${TRACKER_DOC_CSV}`);
  console.log(`occurrences ${totals.occurrencesTotal} ${JSON.stringify(totals.occurrencesByCause)} · films ${totals.filmsTotal} ${JSON.stringify(totals.filmsByCause)}`);
  console.log(`md ${doc.md.length}B · csv ${doc.csv.length}B`);
}

main();
