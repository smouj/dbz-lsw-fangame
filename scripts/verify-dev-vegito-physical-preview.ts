// Ensures the Dev Cards preview for Vegito SSJ can never silently render a
// semantic/manifest frame. It only inspects ROM_PHYSICAL_FRAME cues emitted
// by the same route consumed by AttackPreview.

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { CARDS, type CardDef } from '../src/data/cards';
import { getForm } from '../src/data/roster';
import { spriteDirFor } from '../src/data/spriteManifest';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';

// Portable guard (sibling pattern: verify-dev-physical-sync). The promoted
// physical PNGs under public/assets/sprites/*/physical are gitignored build
// output regenerated from the local ROM. CI (clean checkout) only has the
// committed metadata, so file-existence checks over those PNGs must SKIP
// unless the strict local exports are present (REQUIRE_ROM_PHYSICAL_EXPORTS=1
// after npm run gen:rom-runtime-assets / sync:rom-physical-public-assets).
const REQUIRE_ROM_PHYSICAL_EXPORTS = process.env.REQUIRE_ROM_PHYSICAL_EXPORTS === '1';

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
const vegitoDirectory = spriteDirFor('vegito_ssj');
// Strict file-existence probe over the gitignored public physical PNGs. In a
// clean checkout (CI) those PNGs are absent by design; only the committed
// metadata remains, so this block runs only when strict exports are present.
const physicalPngsPresent = vegitoDirectory
  && existsSync(join(process.cwd(), 'public/assets/sprites', vegitoDirectory, 'physical'));
const strictPhysicalExports = REQUIRE_ROM_PHYSICAL_EXPORTS || Boolean(physicalPngsPresent);
if (!strictPhysicalExports) {
  console.log('SKIP Vegito public physical PNG presence: physical PNGs are not committed; set REQUIRE_ROM_PHYSICAL_EXPORTS=1 after npm run sync:rom-physical-public-assets for the strict local gate.');
} else {
  const missingFiles = physical.filter(({ cue }) => !vegitoDirectory || !cue.file
    || !existsSync(join(process.cwd(), 'public/assets/sprites', vegitoDirectory, cue.file)));
  check('every displayed Vegito card frame exists in the public physical corpus', missingFiles.length === 0,
    missingFiles.map(({ card, cue }) => `#${card.id}:${cue.file ?? 'none'}`).join(', '));
}

const previewSource = readFileSync(join(process.cwd(), 'src/devtools/AttackPreview.tsx'), 'utf8');
check('Cards preview has no semantic sprite URL dependency',
  !previewSource.includes('spriteFrameUrl') && previewSource.includes("cue.type !== 'ROM_PHYSICAL_FRAME'"));
check('Cards preview accepts only promoted ROM physical frame cues',
  previewSource.includes("cue.source !== 'ROM_PHYSICAL'")
  && previewSource.includes("!cue.file?.startsWith('physical/')")
  && previewSource.includes('!cue.physicalId'));

const charactersSource = readFileSync(join(process.cwd(), 'src/devtools/characters.tsx'), 'utf8');
const formPreviewSource = readFileSync(join(process.cwd(), 'src/devtools/FormPreview.tsx'), 'utf8');
check('Characters has no active legacy manifest frame browser',
  !charactersSource.includes('spriteFrameUrl')
  && !charactersSource.includes('useSheetAnalysis')
  && !charactersSource.includes('FrameBrowser')
  && !charactersSource.includes('Legacy User Manifest'));
check('Character central preview resolves only the physical ROM sequence',
  !formPreviewSource.includes('FrameAnalysis')
  && !formPreviewSource.includes('analysis:')
  && formPreviewSource.includes('romPhysicalPreviewSequence'));

const studioSource = readFileSync(join(process.cwd(), 'src/devtools/animationStudio.tsx'), 'utf8');
const devStudioSource = readFileSync(join(process.cwd(), 'src/devtools/DevStudio.tsx'), 'utf8');
check('Animation Studio has no semantic sprite URL dependency',
  !studioSource.includes('spriteFrameUrl') && studioSource.includes("file.startsWith('physical/')"));
check('Animation Studio does not render legacy or remake manifest thumbnails',
  !studioSource.includes('CURRENT MANIFEST') && !studioSource.includes('REMAKE MANIFEST'));
check('both animation routes use the physical ROM inspector',
  !devStudioSource.includes("import { AnimationModule }")
  && devStudioSource.includes("module === 'animation' && <AnimationStudioModule />")
  && devStudioSource.includes("module === 'animation-studio' && <AnimationStudioModule />"));

console.log(`\nDEV VEGITO PHYSICAL PREVIEW: ${passed}/${passed + failed} ${failed === 0 ? 'PASS' : 'FAIL'} · ${physical.length} ROM frame cues`);
if (failed > 0) process.exit(1);
