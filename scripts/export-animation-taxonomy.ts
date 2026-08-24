import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { CARD_ANIMATION_TAXONOMY, animationTaxonomySummary } from '../src/battle/animationTaxonomy';

function fmt(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  return String(value).replace(/\|/g, '\\|');
}

const summary = animationTaxonomySummary();
const lines: string[] = [
  '# DBZ LSW — Animation Taxonomy Canon',
  '',
  'Estado: `ANIMATION TAXONOMY ACTIVE` · `ROM TRACE NAVIGATION PARKED / READY` · `L10 DYNAMIC BLOCKED BY REAL TRACES`.',
  '',
  'Esta matriz separa tres capas que no deben mezclarse:',
  '',
  '- `EXECUTION FAMILY`: handler/rutina que ejecuta la ROM (byte 5 de la tabla de cartas).',
  '- `ACTOR ANIMATION`: ActionProfile, AnimationResource, secuencias y frames físicos del actor cuando están extraídos.',
  '- `VISUAL EFFECT`: visual runtime, FXResource, paleta y aura.',
  '',
  'TRACE DYNAMIC solo vuelve para `BASE_X / BASE_Y`, `anchors`, `slot binding`, FSM especiales incompletos y coordenadas absolutas.',
  '',
  '## Summary',
  '',
  `- Cartas cubiertas: ${summary.cards}/125`,
  `- Con AnimationResource estático: ${summary.withAnimationResource}`,
  `- Con FXResource estático: ${summary.withFxResource}`,
  `- Con secuencias físicas ROM ya extraídas: ${summary.withPhysicalFrames}`,
  `- AnimationResources con frame decode ROM: ${summary.romSequenceResources}`,
  `- Execution families: ${Object.entries(summary.byExecutionFamily).map(([k, v]) => `${k}=${v}`).join(' · ')}`,
  `- Visual effects: ${Object.entries(summary.byVisual).map(([k, v]) => `${k}=${v}`).join(' · ')}`,
  '',
  '## Matrix 125/125',
  '',
  '| ID | Card | Exec Family | Handler | AnimationResource | Actor Profile | Actor Seq | Physical Frames | FXResource | Palette | Visual Effect | Aura | Template | Evidence |',
  '|---:|---|---|---|---|---|---|---:|---|---|---|---|---|---|',
];

for (const row of CARD_ANIMATION_TAXONOMY) {
  lines.push([
    row.card.id,
    fmt(row.card.name),
    fmt(row.execution.family),
    fmt(row.execution.handlerHex),
    fmt(row.actorAnimation.animationResourceHex),
    fmt(row.actorAnimation.actionProfileId ?? `generic_${row.runtimeMapping.animationKind}`),
    fmt(row.actorAnimation.actorSequence.join(' > ')),
    row.actorAnimation.physicalFrameCount,
    fmt(row.visualEffect.fxResourceHex),
    fmt(row.visualEffect.paletteHex),
    fmt(row.visualEffect.visual),
    fmt(row.visualEffect.aura),
    fmt(row.visualEffect.template),
    fmt(`${row.execution.evidence}/${row.actorAnimation.evidence}/${row.visualEffect.evidence}`),
  ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
}

lines.push(
  '',
  '## Dynamic Boundary',
  '',
  'Los campos anteriores son canon estático derivado de ROM/decomp y runtime. Los siguientes NO se bloquean ni se inventan aquí:',
  '',
  '- BASE_X / BASE_Y',
  '- anchors',
  '- slot binding',
  '- FSM especiales incompletos',
  '- coordenadas absolutas',
  '',
  'Fuente de datos: `src/data/cards.ts`, `src/data/romCardData.ts`, `src/data/cardsCinematic.ts`, `src/battle/actionProfiles.ts`, `src/battle/animationCanon.ts`, `src/data/romAnimationData.ts`.',
  '',
);

writeFileSync(resolve(process.cwd(), 'docs/ANIMATION_TAXONOMY_CANON.md'), lines.join('\n'));
console.log('✅ docs/ANIMATION_TAXONOMY_CANON.md');
