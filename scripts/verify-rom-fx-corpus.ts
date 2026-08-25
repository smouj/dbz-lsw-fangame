import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';
import { CARDS } from '../src/data/cards';
import { ROM_FX_CORPUS_SUMMARY } from '../src/data/generated/romFxCorpus.generated';

const ROOT = process.cwd();
const OUT = join(ROOT, 'generated/rom-fx');
const OUT_PUBLIC = join(ROOT, 'public/assets/rom-fx');
const SUMMARY_TS = join(ROOT, 'src/data/generated/romFxCorpus.generated.ts');

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function pngOk(path: string): boolean {
  if (!existsSync(path)) return false;
  const png = PNG.sync.read(readFileSync(path));
  return png.width > 0 && png.height > 0;
}

interface FxCompletion {
  phase: string;
  source: string;
  totals: {
    fxResourcesTotalNonFF: number;
    offensiveFxResources: number;
    normalOffensiveBundles: number;
    paletteBundles: number;
    sideMapsByResource: number;
    sidePhaseRenders: number;
    consumingCards: number;
    errors: number;
    supportOrCategorySpecificResources: number;
  };
  statuses: {
    offensive: string;
    runtimeCutover: string;
    supportVisuals: string;
    supportAuraBlue: string;
    gatherPowerAuraOrange: string;
  };
  resources: Array<{
    fxHex: string;
    status: string;
    paletteBundles: number;
    consumingCards: Array<{ cardId: number; category: string; handler: string }>;
    errors: string[];
  }>;
  bundles: Array<{
    physicalId: string;
    fxHex: string;
    paletteHex: string;
    consumingCards: Array<{ cardId: number; category: string; handler: string }>;
    images: Array<{ file: string; publicFile: string; sha256: string; mapSize: [number, number] }>;
    errors: string[];
  }>;
}

check('generated TS summary exists', existsSync(SUMMARY_TS));
check('generated/rom-fx completion exists', existsSync(join(OUT, 'completion.json')));
check('generated/rom-fx manifest exists', existsSync(join(OUT, 'manifest.json')));
check('generated/rom-fx completion markdown exists', existsSync(join(OUT, 'completion.md')));
check('generated/rom-fx contact sheet exists', pngOk(join(OUT, 'contact_sheet.png')));
check('public rom-fx completion exists', existsSync(join(OUT_PUBLIC, 'completion.json')));
check('public rom-fx contact sheet exists', pngOk(join(OUT_PUBLIC, 'contact_sheet.png')));

const completion = readJson<FxCompletion>(join(OUT, 'completion.json'));
const publicCompletion = readJson<FxCompletion>(join(OUT_PUBLIC, 'completion.json'));
const totals = completion.totals;

check('summary source is ROM_RESEARCH_V4_FX', completion.source === 'ROM_RESEARCH_V4_FX');
check('summary phase is P0.1A offensive FX', completion.phase === 'P0.1A_OFFENSIVE_FX_PHYSICAL_CORPUS');
check('public completion mirrors generated completion', JSON.stringify(publicCompletion.totals) === JSON.stringify(completion.totals));
check('31 physical non-FF FX IDs retained', totals.fxResourcesTotalNonFF === 31, `${totals.fxResourcesTotalNonFF}/31`);
check('28 offensive FXResource IDs materialized', totals.offensiveFxResources === 28 && completion.resources.length === 28, `${completion.resources.length}/${totals.offensiveFxResources}`);
check('38 FX/palette bundles materialized', totals.paletteBundles === 38 && completion.bundles.length === 38, `${completion.bundles.length}/${totals.paletteBundles}`);
check('56 resource SIDE maps represented', totals.sideMapsByResource === 56, `${totals.sideMapsByResource}/56`);
check('152 side/phase renders represented', totals.sidePhaseRenders === 152, `${totals.sidePhaseRenders}/152`);
check('3 support/category-specific FX IDs are not promoted as offensive', totals.supportOrCategorySpecificResources === 3, `${totals.supportOrCategorySpecificResources}/3`);
check('offensive FX errors = 0', totals.errors === 0, `${totals.errors}`);
check('runtime cutover remains explicit pending', completion.statuses.runtimeCutover === 'PENDING_ROM_FX_WINDOW', completion.statuses.runtimeCutover);
check('support visuals remain separate domain', completion.statuses.supportVisuals === 'SEPARATE_DOMAIN', completion.statuses.supportVisuals);
check('auras remain unresolved/classification pending', completion.statuses.supportAuraBlue === 'UNRESOLVED' && completion.statuses.gatherPowerAuraOrange === 'UNRESOLVED');

const cardById = new Map(CARDS.map(card => [card.id, card]));
check('every consuming card exists in card table', completion.bundles.every(bundle => bundle.consumingCards.every(card => cardById.has(card.cardId))));
check('support cards are not in offensive FX corpus', completion.bundles.every(bundle => bundle.consumingCards.every(card => card.category !== 'SUPPORT')), completion.bundles.flatMap(bundle => bundle.consumingCards).filter(card => card.category === 'SUPPORT').map(card => String(card.cardId)).join(','));
check('every bundle has four side/phase renders', completion.bundles.every(bundle => bundle.images.length === 4));
check('every render exists in generated and public trees', completion.bundles.every(bundle => bundle.images.every(image =>
  existsSync(join(OUT, image.file)) &&
  existsSync(join(OUT_PUBLIC, image.file)) &&
  pngOk(join(OUT, image.file)) &&
  pngOk(join(OUT_PUBLIC, image.file)) &&
  image.mapSize[0] === 256 &&
  image.mapSize[1] === 64
)));
check('every bundle has stable physical ID', completion.bundles.every(bundle => /^rom-fx[0-9a-f]{2}-pal[0-9a-f]{2}$/.test(bundle.physicalId)));
check('every resource has at least one palette bundle and consumer', completion.resources.every(resource => resource.paletteBundles > 0 && resource.consumingCards.length > 0));
check('every resource and bundle error list empty', completion.resources.every(resource => resource.errors.length === 0) && completion.bundles.every(bundle => bundle.errors.length === 0));

check('TS summary matches generated totals',
  ROM_FX_CORPUS_SUMMARY.totals.offensiveFxResources === totals.offensiveFxResources &&
  ROM_FX_CORPUS_SUMMARY.totals.paletteBundles === totals.paletteBundles &&
  ROM_FX_CORPUS_SUMMARY.totals.sidePhaseRenders === totals.sidePhaseRenders &&
  ROM_FX_CORPUS_SUMMARY.totals.errors === totals.errors,
  `${ROM_FX_CORPUS_SUMMARY.totals.offensiveFxResources}/${totals.offensiveFxResources}`,
);

const dashboardSrc = readFileSync(join(ROOT, 'src/devtools/dashboard.tsx'), 'utf8');
const validationSrc = readFileSync(join(ROOT, 'src/devtools/validation.tsx'), 'utf8');
const gameConfigSrc = readFileSync(join(ROOT, 'src/devtools/gameconfig.tsx'), 'utf8');
const fxTabSrc = readFileSync(join(ROOT, 'src/devtools/romdisplay2/fxTab.tsx'), 'utf8');
check('Dashboard surfaces snapshot FX corpus', dashboardSrc.includes('fxCorpus') && dashboardSrc.includes('P0.1A'));
check('Validation gates snapshot FX corpus', validationSrc.includes('fxCorpus') && validationSrc.includes('P0.1A Offensive FX physical corpus'));
check('Game Config surfaces snapshot FX corpus state', gameConfigSrc.includes('fxCorpus') && gameConfigSrc.includes('ROM FX: P0.1A'));
check('ROM Display FX tab reads promoted rom-fx public corpus', fxTabSrc.includes('/assets/rom-fx') && fxTabSrc.includes('P0.1A OFFENSIVE FX'));

if (failures === 0) {
  console.log(`\n✅ verify:rom-fx-corpus PASS (${totals.offensiveFxResources} FX resources · ${totals.paletteBundles} bundles · ${totals.sidePhaseRenders} renders)`);
  process.exit(0);
}
console.log(`\n❌ verify:rom-fx-corpus FAIL (${failures})`);
process.exit(1);
