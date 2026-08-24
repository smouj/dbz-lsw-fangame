import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { ANIMATION_RESOURCE_CATALOG, animationResourceSummary } from '../src/battle/animationResources';

function fmt(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  return String(value).replace(/\|/g, '\\|');
}

function cardList(names: string[]): string {
  if (names.length === 0) return '—';
  if (names.length <= 4) return names.join(', ');
  return `${names.slice(0, 4).join(', ')} +${names.length - 4}`;
}

const summary = animationResourceSummary();
const lines: string[] = [
  '# DBZ LSW — Animation Resource Decoding',
  '',
  'Estado: `ANIMATION RESOURCE DECODING ACTIVE` · `TRACE DYNAMIC PARKED`.',
  '',
  'La unidad de progreso de este bloque es `AnimationResource`, no carta. El catálogo conserva la separación:',
  '',
  '- `EXECUTION`: handler/familia ROM.',
  '- `ACTOR ANIMATION`: AnimationResource, secuencias y frames físicos.',
  '- `VISUAL EFFECT`: FXResource, paleta, aura y visual runtime.',
  '',
  'No se inventan anchors, BASE_X/BASE_Y, slot binding ni coordenadas absolutas en este documento.',
  '',
  '## Summary',
  '',
  `- AnimationResources inventariados: ${summary.resources}`,
  `- Referenciados por cartas: ${summary.referenced}`,
  `- DECODED: ${summary.decoded}`,
  `- PARTIAL: ${summary.partial}`,
  `- SPECIAL: ${summary.special}`,
  `- UNKNOWN: ${summary.unknown}`,
  `- STATICALLY_CLOSED: ${summary.staticallyClosed}`,
  `- STATICALLY_CLOSABLE: ${summary.staticallyClosable}`,
  `- STATIC_LIMIT_REACHED: ${summary.staticLimitReached}`,
  `- NEEDS_DYNAMIC_TRACE: ${summary.needsDynamicTrace}`,
  `- Cartas cubiertas por recursos decodificados: ${summary.cardsCoveredByDecodedResources}`,
  `- Completion causes: ${Object.entries(summary.byCompletionCause).map(([k, v]) => `${k}=${v}`).join(' · ')}`,
  '',
  '## Catalog',
  '',
  '| Resource | Bank | Local | Cards Using It | Handlers | Sequences | Physical Frames | Timing | Status | Completion | Cause | Evidence | Source Technique |',
  '|---|---|---:|---:|---|---:|---:|---:|---|---|---|---|---|',
];

for (const entry of ANIMATION_RESOURCE_CATALOG) {
  lines.push([
    fmt(entry.resourceHex),
    fmt(entry.bankHex),
    entry.localId,
    entry.cards.length,
    fmt(entry.handlers.map(handler => `0x${handler.toString(16).padStart(2, '0')}`).join(', ')),
    entry.sequenceCount,
    entry.physicalFrameCount,
    entry.totalTicks,
    fmt(entry.status),
    fmt(entry.completion.disposition),
    fmt(entry.completion.cause),
    fmt(entry.evidence),
    fmt(entry.sourceTechnique),
  ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
}

lines.push(
  '',
  '## Resource Notes',
  '',
);

for (const entry of ANIMATION_RESOURCE_CATALOG.filter(resource => resource.cards.length > 0 || resource.status === 'DECODED')) {
  lines.push(
    `### ${entry.resourceHex}`,
    '',
    `- Bank/local: ${entry.bankHex}/${entry.localId}`,
    `- Cards: ${cardList(entry.cards.map(card => card.name))}`,
    `- Handlers: ${entry.handlers.length ? entry.handlers.map(handler => `0x${handler.toString(16).padStart(2, '0')}`).join(', ') : '—'}`,
    `- Status: ${entry.status} · ${entry.format} · ${entry.evidence}`,
    `- Completion: ${entry.completion.disposition} · ${entry.completion.cause}`,
    `- Completion detail: ${entry.completion.detail}`,
    `- Dynamic dependencies: ${entry.completion.dynamicDependencies.length ? entry.completion.dynamicDependencies.join(', ') : '—'}`,
    `- Sequences: ${entry.sequenceCount} · physical frames: ${entry.physicalFrameCount} · total ticks: ${entry.totalTicks}`,
    `- Source technique: ${entry.sourceTechnique ?? '—'}`,
    `- Notes: ${entry.notes.join(' ')}`,
    '',
  );
}

lines.push(
  '## Byte Contract',
  '',
  'Los frames físicos decodificados preservan el registro crudo ROM como `[metasprite, durationTicks, deltaY_u8, deltaX_u8]`.',
  'El runtime canónico expone esos bytes como `visualFrameId`, `durationTicks`, `offsetY = signed(deltaY_u8)` y `offsetX = signed(deltaX_u8)`.',
  '',
  'Verificadores: `npm run verify:animation-resources` · `npm run verify:animation-resource-completion`.',
  '',
);

writeFileSync(resolve(process.cwd(), 'docs/ANIMATION_RESOURCE_DECODING.md'), lines.join('\n'));
console.log('✅ docs/ANIMATION_RESOURCE_DECODING.md');
