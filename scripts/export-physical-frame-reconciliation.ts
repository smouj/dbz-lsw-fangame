import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { PHYSICAL_FRAME_RECONCILIATION, physicalFrameReconciliationSummary, staticGapCauseForResourceId } from '../src/battle/physicalFrameReconciliation';
import { ANIMATION_RESOURCE_CATALOG } from '../src/battle/animationResources';

function fmt(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  return String(value).replace(/\|/g, '\\|');
}

const summary = physicalFrameReconciliationSummary();
const lines: string[] = [
  '# DBZ LSW — Physical Frame Reconciliation',
  '',
  'Estado: `PHYSICAL FRAME RECONCILIATION ACTIVE` · `TRACE DYNAMIC PARKED`.',
  '',
  'Este documento enlaza frames ROM ya decodificados con los manifests actuales del proyecto. No usa comparación visual ni V9 como autoridad de pose.',
  '',
  '## Contract',
  '',
  '- `durationTicks`, `offsetX`, `offsetY` y `raw` proceden solo de ROM.',
  '- `manifestPose`, `manifestIndex` y `physicalFrame` proceden solo de `public/assets/sprites/<form>/manifest.json` indexado.',
  '- `EXACT` exige frame de manifest existente sin reutilización detectada.',
  '- `SHARED` es válido cuando el runtime reutiliza un frame/pose para varios frames ROM.',
  '- `COMPOSITE` no se trata como frame físico atómico.',
  '- `UNRESOLVED` es válido y explícito.',
  '',
  '## Summary',
  '',
  `- Resources reconciled: ${summary.resources}`,
  `- ROM frames: ${summary.romFrames}`,
  `- EXACT: ${summary.exact}`,
  `- SHARED: ${summary.shared}`,
  `- COMPOSITE: ${summary.composite}`,
  `- UNRESOLVED: ${summary.unresolved}`,
  '',
  '## Resource Summary',
  '',
  '| Resource | Technique | Forms | ROM Frames | EXACT | SHARED | COMPOSITE | UNRESOLVED | Gap Cause |',
  '|---|---|---:|---:|---:|---:|---:|---:|---|',
];

for (const resource of PHYSICAL_FRAME_RECONCILIATION) {
  lines.push([
    fmt(resource.resourceHex),
    fmt(resource.sourceTechnique),
    resource.compatibleForms.length,
    resource.summary.romFrames,
    resource.summary.exact,
    resource.summary.shared,
    resource.summary.composite,
    resource.summary.unresolved,
    fmt(resource.gapCause),
  ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
}

lines.push(
  '',
  '## Frame Matrix',
  '',
  '| Resource | Seq | Frame | Metasprite | Ticks | Offset | Raw | Mapping | Status | Forms | Sample | Reason |',
  '|---|---:|---:|---:|---:|---|---|---|---|---:|---|---|',
);

for (const resource of PHYSICAL_FRAME_RECONCILIATION) {
  for (const frame of resource.frames) {
    lines.push([
      fmt(resource.resourceHex),
      frame.sequenceIndex,
      frame.frameIndex,
      frame.rom.metasprite,
      frame.rom.durationTicks,
      `${frame.rom.offsetX},${frame.rom.offsetY}`,
      `[${frame.rom.raw.join(',')}]`,
      fmt(frame.assetMapping.physicalFrame),
      fmt(frame.assetMapping.status),
      `${frame.assetMapping.formsMapped}/${frame.assetMapping.formsTotal}`,
      fmt(frame.assetMapping.sampleFiles.slice(0, 2).join(', ')),
      fmt(frame.assetMapping.reason),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }
}

lines.push(
  '',
  '## Non-Decoded Resource Gap Causes',
  '',
  '| Resource | Status | Cards | Handlers | Gap Cause |',
  '|---|---|---:|---|---|',
);

for (const resource of ANIMATION_RESOURCE_CATALOG.filter(entry => entry.status !== 'DECODED')) {
  lines.push([
    fmt(resource.resourceHex),
    fmt(resource.status),
    resource.cards.length,
    fmt(resource.handlers.map(handler => `0x${handler.toString(16).padStart(2, '0')}`).join(', ')),
    fmt(staticGapCauseForResourceId(resource.resourceId)),
  ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
}

lines.push(
  '',
  'Verificador: `npm run verify:physical-animation-mapping`.',
  '',
);

writeFileSync(resolve(process.cwd(), 'docs/PHYSICAL_FRAME_RECONCILIATION.md'), lines.join('\n'));
console.log('✅ docs/PHYSICAL_FRAME_RECONCILIATION.md');
