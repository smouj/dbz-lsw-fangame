import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  PENDING_CUE_DOC_CSV,
  PENDING_CUE_DOC_JSON,
  PENDING_CUE_DOC_MD,
  buildPendingCueAudit,
  renderPendingCueCsv,
  renderPendingCueJson,
  renderPendingCueMarkdown,
} from './romPendingCueAuditCore';

const report = buildPendingCueAudit();
const root = process.cwd();
for (const [relativePath, content] of [
  [PENDING_CUE_DOC_MD, renderPendingCueMarkdown(report)],
  [PENDING_CUE_DOC_JSON, renderPendingCueJson(report)],
  [PENDING_CUE_DOC_CSV, renderPendingCueCsv(report)],
] as const) {
  const path = `${root}/${relativePath}`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

console.log(`audit:rom-pending-cues → ${report.pendingCues} pending (${report.staticPendingCues} static · ${report.dynamicPendingCues} dynamic) across ${report.cardsWithPendingCues} cards`);
for (const group of report.groups) {
  console.log(`  ${group.cause}: ${group.count} (${group.staticCount} static · ${group.dynamicCount} dynamic)`);
}
