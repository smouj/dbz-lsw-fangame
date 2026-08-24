import { writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  CARD_PHYSICAL_ANIMATION_COVERAGE,
  cardPhysicalCoverageByType,
  cardPhysicalCoverageSummary,
} from '../src/battle/cardPhysicalCoverage';

function fmt(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  return String(value).replace(/\|/g, '\\|');
}

const summary = cardPhysicalCoverageSummary();
const byType = cardPhysicalCoverageByType();
const lines: string[] = [
  '# DBZ LSW — Card Physical Animation Coverage',
  '',
  'Estado: `CARD PHYSICAL ANIMATION COVERAGE ACTIVE` · `TRACE DYNAMIC PARKED`.',
  '',
  'Esta matriz baja la reconciliacion fisica a nivel carta. Cada fila deriva de `CARD -> ROM card record -> AnimationResource -> physical reconciliation`.',
  '',
  '## Contract',
  '',
  '- No usa V9 ni comparacion visual.',
  '- Una carta con `RESOURCE_DECODED_COMPLETE` no implica coordenadas runtime ni anchors cerrados.',
  '- `RESOURCE_DECODED_PARTIAL` conserva mappings conocidos y deja el resto como `UNRESOLVED`.',
  '- `RESOURCE_PARTIAL`, `RESOURCE_SPECIAL` y `RESOURCE_UNKNOWN` son pendientes estaticos explicitos por recurso.',
  '- `NO_ROM_ANIMATION` es valido para cartas sin actor animation ROM.',
  '',
  '## Summary',
  '',
  `- Cards: ${summary.cards}/125`,
  `- With AnimationResource: ${summary.withAnimationResource}`,
  `- Cards using DECODED resources: ${summary.decodedResourceCards}`,
  `- Complete physical coverage: ${summary.complete}`,
  `- Partial physical coverage: ${summary.partial}`,
  `- Decoded but unresolved physical coverage: ${summary.unresolvedDecoded}`,
  `- Pending static resource decode: ${summary.pendingStatic}`,
  `- No ROM actor animation: ${summary.noRomAnimation}`,
  `- Missing resources: ${summary.missingResource}`,
  `- ROM frames counted through card usage: ${summary.romFrames}`,
  `- Mapped frames through card usage: ${summary.mappedFrames}`,
  `- Unresolved frames through card usage: ${summary.unresolvedFrames}`,
  '',
  '## By Card Type',
  '',
  '| Type | Cards | AnimResource | Decoded | Complete | Partial | Unresolved Decoded | Pending Static | No ROM Animation |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
];

for (const [type, item] of Object.entries(byType)) {
  lines.push([
    type,
    item.cards,
    item.withAnimationResource,
    item.decodedResourceCards,
    item.complete,
    item.partial,
    item.unresolvedDecoded,
    item.pendingStatic,
    item.noRomAnimation,
  ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
}

lines.push(
  '',
  '## Matrix 125/125',
  '',
  '| ID | Card | Type | Effect | AnimationResource | Resource Status | Physical Status | Gap Cause | ROM Frames | EXACT | SHARED | COMPOSITE | UNRESOLVED |',
  '|---:|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|',
);

for (const row of CARD_PHYSICAL_ANIMATION_COVERAGE) {
  lines.push([
    row.card.id,
    fmt(row.card.name),
    fmt(row.card.type),
    fmt(row.card.effect),
    fmt(row.animationResourceHex),
    fmt(row.resourceStatus),
    fmt(row.physicalStatus),
    fmt(row.gapCause),
    row.romFrames,
    row.exact,
    row.shared,
    row.composite,
    row.unresolved,
  ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
}

lines.push(
  '',
  'Verificador: `npm run verify:card-physical-coverage`.',
  '',
);

writeFileSync(resolve(process.cwd(), 'docs/CARD_PHYSICAL_ANIMATION_COVERAGE.md'), lines.join('\n'));
console.log('✅ docs/CARD_PHYSICAL_ANIMATION_COVERAGE.md');
