// ═══════════════════════════════════════════════════════════════════════
// P0 — DEV STUDIO PHYSICAL SYNC verifier.
// Ensures the visible Dev Studio artifacts are synchronized with the current
// ROM_PHYSICAL_FIGHTERS corpus: manifests, PNGs, contact sheets and UI wiring.
// ═══════════════════════════════════════════════════════════════════════
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';
import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../src/data/generated/romPhysicalCorpus.generated';

const ROOT = process.cwd();
const PUBLIC_SPRITES = join(ROOT, 'public/assets/sprites');
const EXPORT_ROOT = join(ROOT, 'generated/rom-fighters');

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function pngSize(path: string): { width: number; height: number } {
  const png = PNG.sync.read(readFileSync(path));
  return { width: png.width, height: png.height };
}

const totals = ROM_PHYSICAL_CORPUS_SUMMARY.totals;
check('corpus forms rendered 48/48', totals.forms === 48 && totals.formsIndexed === 48, `${totals.forms}/${totals.formsIndexed}`);
check('corpus has no palette-blocked forms', totals.formsPaletteBlocked === 0, `${totals.formsPaletteBlocked}`);
check('corpus physical IDs > 0', totals.physicalIdentities > 0, `${totals.physicalIdentities}`);
check('corpus frame instances > physical IDs', totals.frameInstances > totals.physicalIdentities, `${totals.frameInstances}/${totals.physicalIdentities}`);

let publicPhysicalPngs = 0;
let publicFrameEntries = 0;
for (const form of ROM_PHYSICAL_CORPUS_SUMMARY.forms) {
  const formDir = join(PUBLIC_SPRITES, form.formId);
  const physicalDir = join(formDir, 'physical');
  const manifestPath = join(formDir, 'rom-physical.manifest.json');
  const provenancePath = join(formDir, 'provenance.json');
  check(`${form.formId}: public ROM manifest exists`, existsSync(manifestPath));
  check(`${form.formId}: public provenance exists`, existsSync(provenancePath));
  check(`${form.formId}: public physical dir exists`, existsSync(physicalDir));
  if (!existsSync(manifestPath) || !existsSync(provenancePath) || !existsSync(physicalDir)) continue;
  const manifest = readJson<{ source: string; schemaVersion: number; physicalRendererSchema?: number; offsetEncoding: string; sequences: Record<string, { physicalRendererSchema?: number; frames: unknown[] }> }>(manifestPath);
  const provenance = readJson<{ source: string; physicalRendererSchema?: number; frames: Array<{ file: string; rawCanvasFile?: string; physicalId: string; physicalRendererSchema?: number }> }>(provenancePath);
  const pngs = readdirSync(physicalDir).filter(name => name.endsWith('.png'));
  publicPhysicalPngs += pngs.length;
  publicFrameEntries += provenance.frames.length;
  check(`${form.formId}: manifest source ROM_PHYSICAL_FIGHTERS`, manifest.source === 'ROM_PHYSICAL_FIGHTERS');
  check(`${form.formId}: manifest schema 2/s8`, manifest.schemaVersion === 2 && manifest.offsetEncoding === 's8');
  check(`${form.formId}: physical renderer schema 3`, manifest.physicalRendererSchema === 3 && provenance.physicalRendererSchema === 3);
  check(`${form.formId}: provenance source ROM_PHYSICAL_FIGHTERS`, provenance.source === 'ROM_PHYSICAL_FIGHTERS');
  check(`${form.formId}: physical PNG count matches provenance`, pngs.length === provenance.frames.length, `${pngs.length}/${provenance.frames.length}`);
  check(`${form.formId}: every sequence has frame instances`, Object.values(manifest.sequences).every(seq => seq.physicalRendererSchema === 3 && seq.frames.length > 0));
  check(`${form.formId}: every provenance PNG exists`, provenance.frames.every(frame => existsSync(join(formDir, frame.file))));
  check(`${form.formId}: every provenance raw canvas exists`, provenance.frames.every(frame => frame.physicalRendererSchema === 3 && frame.rawCanvasFile && existsSync(join(formDir, frame.rawCanvasFile))));
}

check('public physical PNGs match corpus total', publicPhysicalPngs === totals.physicalIdentities, `${publicPhysicalPngs}/${totals.physicalIdentities}`);
check('public provenance frame entries match corpus total', publicFrameEntries === totals.physicalIdentities, `${publicFrameEntries}/${totals.physicalIdentities}`);

const catalogPath = join(EXPORT_ROOT, 'catalog.json');
const physicalCatalogPath = join(EXPORT_ROOT, 'physical_catalog.json');
const globalContactSheetPath = join(EXPORT_ROOT, 'contact_sheet_48_forms.png');
const globalContactSheetHtmlPath = join(EXPORT_ROOT, 'contact_sheet_48_forms.html');
const globalContactSheetJsonPath = join(EXPORT_ROOT, 'contact_sheet_48_forms.json');
check('generated/rom-fighters catalog exists', existsSync(catalogPath));
check('generated/rom-fighters physical catalog exists', existsSync(physicalCatalogPath));
check('generated/rom-fighters 48-form contact sheet exists', existsSync(globalContactSheetPath));
check('generated/rom-fighters 48-form contact sheet html exists', existsSync(globalContactSheetHtmlPath));
check('generated/rom-fighters 48-form contact sheet json exists', existsSync(globalContactSheetJsonPath));
if (existsSync(globalContactSheetPath)) {
  const size = pngSize(globalContactSheetPath);
  check('48-form contact sheet non-empty', statSync(globalContactSheetPath).size > 0 && size.width > 0 && size.height > 0, `${size.width}x${size.height}`);
}
if (existsSync(globalContactSheetJsonPath)) {
  const rows = readJson<Array<{ formId: string; physicalIds: string[] }>>(globalContactSheetJsonPath);
  check('48-form contact sheet has one row per form', rows.length === 48, `${rows.length}/48`);
  check('48-form contact sheet has physical IDs per row', rows.every(row => row.formId && row.physicalIds.length > 0));
}
if (existsSync(catalogPath)) {
  const catalog = readJson<{ forms: number; physicalIds: number; frameInstances: number; formsCatalog: Array<{ formId: string; physicalIds: number; frameInstances: number }> }>(catalogPath);
  check('export catalog forms 48', catalog.forms === 48, `${catalog.forms}`);
  check('export catalog physical IDs match corpus', catalog.physicalIds === totals.physicalIdentities, `${catalog.physicalIds}/${totals.physicalIdentities}`);
  check('export catalog frame instances match corpus', catalog.frameInstances === totals.frameInstances, `${catalog.frameInstances}/${totals.frameInstances}`);
  for (const form of catalog.formsCatalog) {
    const sheet = join(EXPORT_ROOT, form.formId, 'contact_sheet.png');
    const html = join(EXPORT_ROOT, form.formId, 'contact_sheet.html');
    const manifest = join(EXPORT_ROOT, form.formId, 'manifest.json');
    check(`${form.formId}: contact_sheet.html exists`, existsSync(html));
    check(`${form.formId}: contact_sheet.png exists`, existsSync(sheet));
    check(`${form.formId}: generated manifest exists`, existsSync(manifest));
    if (existsSync(sheet)) {
      const size = pngSize(sheet);
      check(`${form.formId}: contact sheet non-empty`, statSync(sheet).size > 0 && size.width > 0 && size.height > 0, `${size.width}x${size.height}`);
    }
  }
}

const charactersSrc = readFileSync(join(ROOT, 'src/devtools/characters.tsx'), 'utf8');
const cardsSrc = readFileSync(join(ROOT, 'src/devtools/cards.tsx'), 'utf8');
const dashboardSrc = readFileSync(join(ROOT, 'src/devtools/dashboard.tsx'), 'utf8');
const animationStudioSrc = readFileSync(join(ROOT, 'src/devtools/animationStudio.tsx'), 'utf8');
const animationStudioCoreSrc = readFileSync(join(ROOT, 'src/battle/animationStudio.ts'), 'utf8');
const characterRollSrc = readFileSync(join(ROOT, 'src/components/setup/CharacterRoll.tsx'), 'utf8');
const romDisplayFightersSrc = readFileSync(join(ROOT, 'src/devtools/romdisplay2/fightersTab.tsx'), 'utf8');
const romPresentationForCardSrc = readFileSync(join(ROOT, 'src/battle/romPresentationForCard.ts'), 'utf8');
const romSequenceSelectorsSrc = readFileSync(join(ROOT, 'src/battle/romSequenceSelectors.ts'), 'utf8');
const beamBaseCutoverSrc = readFileSync(join(ROOT, 'src/battle/beamBaseRomCutover.ts'), 'utf8');
const standardDamageCutoverSrc = readFileSync(join(ROOT, 'src/battle/standardDamageRomCutover.ts'), 'utf8');
const productionFrameResolverSrc = readFileSync(join(ROOT, 'src/battle/productionFrameResolver.ts'), 'utf8');
const stylesSrc = readFileSync(join(ROOT, 'src/styles.css'), 'utf8');
check('Character Studio reads rom-physical.manifest.json', charactersSrc.includes('rom-physical.manifest.json') && charactersSrc.includes('ROM Physical Fighter Frames'));
check('Character Studio renders physical PNG URLs', charactersSrc.includes('/assets/sprites/${dir}/${frame.file}'));
check('Character Studio renders RAW canvas URLs', charactersSrc.includes('frame.rawCanvasFile') && charactersSrc.includes('raw canvas'));
check('Character Studio separates ROM selected sequences from research sequences', charactersSrc.includes('ROM Selected Sequences') && charactersSrc.includes('All Resource Sequences') && charactersSrc.includes('ROM SELECTED BY CARD'));
check('Character Studio exposes right-facing canonical display preview', charactersSrc.includes('CANONICAL DISPLAY') && charactersSrc.includes('dev-rom-facing-right'));
check('Cards reads romPresentationTimelineForCard', cardsSrc.includes('romPresentationTimelineForCard') && cardsSrc.includes('ROM_PHYSICAL_FRAME'));
check('Dashboard reads physicalMapping/physicalCorpus', dashboardSrc.includes('physicalMapping') && dashboardSrc.includes('physicalCorpus'));
check('Animation Studio core resolves ROM physical via ProductionFrameResolver', animationStudioCoreSrc.includes('resolveProductionFrame') && animationStudioCoreSrc.includes('physical: ProductionFrameBinding'));
check('Animation Studio ROM column renders physical corpus file', animationStudioSrc.includes('view.physical.file') && animationStudioSrc.includes('physicalId · vf · ticks'));
check('Animation Studio inspector exposes physical source and frameInstanceId', animationStudioSrc.includes('frameInstanceId') && animationStudioSrc.includes('fallback reason') && animationStudioSrc.includes('SourceBadge'));
check('ROM Display reads ROM physical corpus PNGs directly', romDisplayFightersSrc.includes('rom-physical.manifest.json') && romDisplayFightersSrc.includes('rawCanvasFile') && !romDisplayFightersSrc.includes('pendiente de reextracción'));
check('ROM Display exposes right-facing display preview without mutating ROM PNG', romDisplayFightersSrc.includes('CANONICAL DISPLAY (right-facing preview)') && romDisplayFightersSrc.includes('The PNG remains ROM raw/trimmed'));
check('ROM presentation compiler does not default selector to seq0', romPresentationForCardSrc.includes('resolveRomSequenceSelector') && !romPresentationForCardSrc.includes('sequenceSelector: actorFormId ? 0 : null'));
check('BEAM_BASE cutover uses ROM selector table, not seq0 shortcut', beamBaseCutoverSrc.includes('resolveRomSequenceSelector') && !beamBaseCutoverSrc.includes('sequenceSelector: 0'));
check('STANDARD_DAMAGE physical frames are pending, not fake seq0', standardDamageCutoverSrc.includes('sequenceSelector: null') && !standardDamageCutoverSrc.includes('sequenceSelector: 0'));
check('Production summary counts only selector-backed ROM_PHYSICAL cards', productionFrameResolverSrc.includes("return kind === 'BEAM_BASE';") && productionFrameResolverSrc.includes('STANDARD_DAMAGE remains ROM-grammatical'));
check('ROM selector helper fails closed when selector is missing', romSequenceSelectorsSrc.includes('No fallback to seq0') && romSequenceSelectorsSrc.includes("evidence: 'UNRESOLVED'"));
check('Game character selector is an overworld roller', characterRollSrc.includes('setup-roll-rail') && characterRollSrc.includes('setup-roll-nav') && characterRollSrc.includes('OW ROM'));
check('Game character roller has stable framed visual CSS', stylesSrc.includes('.setup-roll-stage') && stylesSrc.includes('.setup-roll-rail-dot.active'));
check('ROM physical raw/trimmed/layout/facing CSS exists', stylesSrc.includes('.dev-rom-frame-img-pair') && stylesSrc.includes('.dev-rom-frame-img.raw') && stylesSrc.includes('.dev-rom-facing-right') && stylesSrc.includes('.dev-rom-display-preview'));

if (failures === 0) {
  console.log(`\n✅ verify:dev-physical-sync PASS (${totals.forms}/48 forms · ${totals.physicalIdentities} physical IDs · ${totals.frameInstances} instances)`);
  process.exit(0);
}
console.log(`\n❌ verify:dev-physical-sync FAIL (${failures})`);
process.exit(1);
