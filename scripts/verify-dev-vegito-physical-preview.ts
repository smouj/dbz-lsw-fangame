// Ensures the Dev Cards preview for Vegito SSJ can never silently render a
// semantic/manifest frame. It only inspects ROM_PHYSICAL_FRAME cues emitted
// by the same route consumed by AttackPreview.

import { readFileSync } from 'fs';
import { join } from 'path';
import { CARDS, type CardDef } from '../src/data/cards';
import { getForm } from '../src/data/roster';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    passed++;
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const form = getForm('vegito_ssj');
check('Vegito SSJ concrete ROM form exists', form?.id === 'vegito_ssj');

const compatible = CARDS.filter(card => {
  if (!form) return false;
  if (card.notCompatible?.includes(form.character)) return false;
  return !card.compatible || card.compatible.includes(form.character);
});
check('Vegito has compatible cards', compatible.length > 0, String(compatible.length));

const physical = compatible.flatMap(card => {
  const route = romPresentationTimelineForCard(card, 'player', 'vegito_ssj');
  if (!route) return [];
  return route.timeline.entries
    .filter(entry => entry.cue.type === 'ROM_PHYSICAL_FRAME')
    .map(entry => ({ card, cue: entry.cue }));
});

check('Vegito physical card preview has ROM frame cues', physical.length > 0, String(physical.length));
const nonPhysical = physical.filter(({ cue }) =>
  cue.source !== 'ROM_PHYSICAL' || !cue.physicalId || !cue.file || !cue.file.startsWith('physical/'));
check('every displayed Vegito card frame is a promoted ROM physical asset', nonPhysical.length === 0,
  nonPhysical.map(({ card, cue }) => `#${card.id}:${cue.source}:${cue.file ?? 'none'}`).join(', '));

const previewSource = readFileSync(join(process.cwd(), 'src/devtools/AttackPreview.tsx'), 'utf8');
check('Cards preview has no semantic sprite URL dependency',
  !previewSource.includes('spriteFrameUrl') && previewSource.includes("cue.type !== 'ROM_PHYSICAL_FRAME'"));
check('Cards preview rejects non-physical frame files', previewSource.includes("!cue.file"));

const studioSource = readFileSync(join(process.cwd(), 'src/devtools/animationStudio.tsx'), 'utf8');
const devStudioSource = readFileSync(join(process.cwd(), 'src/devtools/DevStudio.tsx'), 'utf8');
check('Animation Studio has no semantic sprite URL dependency',
  !studioSource.includes('spriteFrameUrl') && studioSource.includes("file.startsWith('physical/')"));
check('Animation Studio does not render legacy or remake manifest thumbnails',
  !studioSource.includes('CURRENT MANIFEST') && !studioSource.includes('REMAKE MANIFEST'));
check('both animation routes use the physical ROM inspector',
  !devStudioSource.includes("import { AnimationModule }")
  && devStudioSource.includes("module === 'animation' || module === 'animation-studio'"));

console.log(`\nDEV VEGITO PHYSICAL PREVIEW: ${passed}/${passed + failed} ${failed === 0 ? 'PASS' : 'FAIL'} · ${physical.length} ROM frame cues`);
if (failed > 0) process.exit(1);
