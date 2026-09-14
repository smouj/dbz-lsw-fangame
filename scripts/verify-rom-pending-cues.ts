import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CARDS } from '../src/data/cards';
import { traceCardAction } from '../src/battle/combatObservability';
import {
  CAUSE_DEFINITIONS,
  PENDING_CUE_DOC_CSV,
  PENDING_CUE_DOC_JSON,
  PENDING_CUE_DOC_MD,
  buildPendingCueAudit,
  renderPendingCueCsv,
  renderPendingCueJson,
  renderPendingCueMarkdown,
} from './romPendingCueAuditCore';

let failures = 0;
function check(label: string, ok: boolean, detail = ''): void {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

function normalizeEol(value: string): string {
  return value.replace(/\r\n?/g, '\n');
}

function main(): void {
  console.log('verify:rom-pending-cues\n');
  const report = buildPendingCueAudit();
  const expectedCauses = new Set(CAUSE_DEFINITIONS.map(definition => definition.cause));

  check('SSOT contains 125 cards', report.cards === 125, String(report.cards));
  check('all pending cues are classified', report.rows.every(row => expectedCauses.has(row.cause)), `${report.rows.length} rows`);
  check('live pending total is stable and derived', report.pendingCues === report.staticPendingCues + report.dynamicPendingCues,
    `${report.pendingCues} = ${report.staticPendingCues} + ${report.dynamicPendingCues}`);
  check('current static/dynamic split is 134/5', report.staticPendingCues === 134 && report.dynamicPendingCues === 5,
    `${report.staticPendingCues}/${report.dynamicPendingCues}`);
  check('every pending row has a concrete ROM boundary', report.rows.every(row => row.boundary === 'STATIC' || row.boundary === 'DYNAMIC'));
  check('every pending row has provenance', report.rows.every(row => row.evidence.length >= 5 && row.sourceEvent.length >= 3));
  check('every pending row has a blocker category and remediation', report.groups.every(group => group.blocker.length >= 20 && group.remediation.length >= 20));
  check('no unknown cause group exists', report.groups.every(group => group.cause !== 'OTHER_STATIC_PENDING'),
    report.groups.some(group => group.cause === 'OTHER_STATIC_PENDING') ? 'unclassified static gap' : 'all current reasons mapped');

  const dynamic = report.rows.filter(row => row.boundary === 'DYNAMIC');
  check('dynamic rows remain PENDING_ROM_TRACE', dynamic.every(row => row.status === 'PENDING_ROM_TRACE'));
  check('dynamic rows are special result branches', dynamic.length === 0 || dynamic.every(row => row.cause === 'SPECIAL_RESULT_BRANCH_DYNAMIC'));
  check('no sequence-0 fallback is used as closure evidence', report.rows.every(row => !/fallback|default sequence 0|sequence=0/i.test(row.reason)));
  check('no card-name selector is present in pending evidence', report.rows.every(row => !/card[- ]name.*(?:if|switch|hardcode)/i.test(row.reason)));

  const traces = CARDS.map(card => traceCardAction(card));
  const notApplicable = traces.filter(trace => !trace.romBacked && trace.kind === 'NONE');
  const legacy = traces.filter(trace => !trace.romBacked && trace.kind !== 'NONE');
  check('card-level LEGACY routes remain zero', legacy.length === 0, legacy.map(trace => `${trace.cardId}:${trace.cardName}`).join(', '));
  check('only the explicit no-program card is NOT_APPLICABLE', notApplicable.length === 1 && notApplicable[0]?.cardId === 9,
    notApplicable.map(trace => `${trace.cardId}:${trace.cardName}`).join(', '));

  const root = process.cwd();
  const rendered = new Map([
    [PENDING_CUE_DOC_MD, renderPendingCueMarkdown(report)],
    [PENDING_CUE_DOC_JSON, renderPendingCueJson(report)],
    [PENDING_CUE_DOC_CSV, renderPendingCueCsv(report)],
  ]);
  for (const [relativePath, expected] of rendered) {
    const path = join(root, relativePath);
    check(`${relativePath} exists`, existsSync(path), path);
    if (existsSync(path)) {
      check(`${relativePath} matches generator`, normalizeEol(readFileSync(path, 'utf8')) === expected,
        'regenerate with npm run audit:rom-pending-cues');
    }
  }

  console.log(failures === 0 ? '\nverify:rom-pending-cues → PASS' : `\nverify:rom-pending-cues → FAIL (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
