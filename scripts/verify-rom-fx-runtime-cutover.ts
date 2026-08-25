import { existsSync, readFileSync } from 'node:fs';
import { CARDS } from '../src/data/cards';
import { ROM_FX_CORPUS_BUNDLES, ROM_FX_CORPUS_SUMMARY } from '../src/data/generated/romFxCorpus.generated';
import type { BattlePresentation } from '../src/renderer/pixi/presentation/BattlePresentation';
import { ProductionRomPresentationAdapter } from '../src/renderer/pixi/presentation/ProductionRomPresentationAdapter';
import { RomDisplayPresenter } from '../src/battle/romDisplay/RomDisplayPresenter';
import { compileRomPresentationProfile } from '../src/battle/romPresentationCompiler';
import { romPresentationProfileForCard } from '../src/battle/romPresentationProfiles';
import { romActionExecutionDescriptorForCard } from '../src/battle/romActionExecutionDescriptors';
import { romFxWindowRuntimeSummary } from '../src/battle/romFxWindow';

let failures = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function publicPath(assetUrl: string): string {
  return assetUrl.startsWith('/assets/') ? `public${assetUrl}` : assetUrl;
}

const FX_BUNDLE_KEYS = new Set(ROM_FX_CORPUS_BUNDLES.map(bundle => `${bundle.fxResource}:${bundle.paletteIndex}`));
const FX_RESOURCE_IDS = new Set(ROM_FX_CORPUS_BUNDLES.map(bundle => bundle.fxResource));
const BEAM_RUNTIME_KINDS = new Set(['BEAM_BASE', 'BEAM_VARIANT', 'PROJECTILE_SCROLL']);
const summary = romFxWindowRuntimeSummary();
const runtimeJsonPath = 'generated/rom-fx/runtime_cutover.json';
const runtimeMdPath = 'generated/rom-fx/runtime_cutover.md';
const runtimeFilmstripPath = 'generated/rom-fx/runtime_filmstrip.png';
const sideSelectionPath = 'generated/rom-fx/side_selection.json';
const publicRuntimeJsonPath = 'public/assets/rom-fx/runtime_cutover.json';
const publicRuntimeFilmstripPath = 'public/assets/rom-fx/runtime_filmstrip.png';
const publicSideSelectionPath = 'public/assets/rom-fx/side_selection.json';

const runtimeCards = CARDS
  .map(card => ({ card, profile: romPresentationProfileForCard(card), descriptor: romActionExecutionDescriptorForCard(card) }))
  .filter(item =>
    BEAM_RUNTIME_KINDS.has(item.profile.kind)
    && item.profile.dependencies.fxResource != null
    && item.profile.dependencies.palette != null
    && FX_BUNDLE_KEYS.has(`${item.profile.dependencies.fxResource}:${item.profile.dependencies.palette}`),
  );

const supportWithBeamWindow = CARDS
  .map(card => ({ card, profile: romPresentationProfileForCard(card) }))
  .filter(item => item.card.type === 'support')
  .filter(item => compileRomPresentationProfile(item.profile, { actorSide: 'player' }).timeline.entries.some(entry => entry.cue.type === 'ROM_FX_WINDOW'));

const allRuntimeWindows = runtimeCards.flatMap(({ profile }) =>
  compileRomPresentationProfile(profile, { actorSide: 'player', selectedResultFamily: 'HIT' }).timeline.entries
    .filter(entry => entry.cue.type === 'ROM_FX_WINDOW')
    .map(entry => entry.cue),
);

const staticCompleteWindows = allRuntimeWindows.filter(cue => cue.status === 'ROM_FX_WINDOW_STATIC_COMPLETE');
const dynamicCompleteWindows = allRuntimeWindows.filter(cue => cue.status === 'ROM_FX_WINDOW_DYNAMIC_COMPLETE');
const completeWindows = allRuntimeWindows.filter(cue => cue.status === 'ROM_FX_WINDOW_COMPLETE');
const partialWindows = allRuntimeWindows.filter(cue => cue.status === 'ROM_FX_WINDOW_PARTIAL');
const fallbackWindows = allRuntimeWindows.filter(cue => cue.status === 'REMAKE_FALLBACK');
const missingImages = allRuntimeWindows.filter(cue => !existsSync(publicPath(cue.sourceImage)));
const malformedWindows = allRuntimeWindows.filter(cue =>
  cue.viewport.width !== 256
  || cue.viewport.height !== 64
  || cue.screen.bgMap !== '$9800'
  || cue.screen.bgRow !== 4
  || cue.screen.bgCol !== 0
);

const playerSideBad = runtimeCards.filter(({ profile }) =>
  compileRomPresentationProfile(profile, { actorSide: 'player', selectedResultFamily: 'HIT' }).timeline.entries
    .some(entry => entry.cue.type === 'ROM_FX_WINDOW' && (entry.cue.side !== 'LEFT' || entry.cue.sourceMap !== 'SIDE_1')),
);
const enemySideBad = runtimeCards.filter(({ profile }) =>
  compileRomPresentationProfile(profile, { actorSide: 'enemy', selectedResultFamily: 'HIT' }).timeline.entries
    .some(entry => entry.cue.type === 'ROM_FX_WINDOW' && (entry.cue.side !== 'RIGHT' || entry.cue.sourceMap !== 'SIDE_2')),
);

const missingPrefixWindow = runtimeCards.filter(({ profile }) => {
  const timeline = compileRomPresentationProfile(profile, { actorSide: 'player', selectedResultFamily: 'HIT' }).timeline;
  const fxLoad = timeline.entries.find(entry => entry.cue.type === 'FX_LOAD');
  const prefix = timeline.entries.find(entry => entry.cue.type === 'ROM_FX_WINDOW' && entry.cue.phase === 'PREFIX');
  return !fxLoad || !prefix || fxLoad.cue.tick !== prefix.cue.tick;
});

const branchCards = runtimeCards.filter(({ profile }) => profile.resultBranches.length > 0);
const missingResultWindow = branchCards.filter(({ profile }) => {
  const timeline = compileRomPresentationProfile(profile, { actorSide: 'player', selectedResultFamily: 'HIT' }).timeline;
  return !timeline.entries.some(entry => entry.cue.type === 'ROM_FX_WINDOW' && entry.cue.phase === 'RESULT');
});
const windowCueDistribution = runtimeCards.map(({ card, profile }) => {
  const windows = compileRomPresentationProfile(profile, { actorSide: 'player', selectedResultFamily: 'HIT' }).timeline.entries
    .filter(entry => entry.cue.type === 'ROM_FX_WINDOW')
    .map(entry => entry.cue);
  const phases = windows.map(window => window.phase);
  const reason = windows.length === 1 && phases[0] === 'PREFIX'
    ? 'SINGLE_PREFIX_FX_LOAD'
    : windows.length === 2 && phases.includes('PREFIX') && phases.includes('RESULT') && profile.resultBranches.length > 0
      ? 'PREFIX_PLUS_RESULT_BRANCH_WINDOW'
      : 'UNCLASSIFIED_WINDOW_DISTRIBUTION';
  return {
    card,
    profile,
    windows,
    phases,
    reason,
  };
});
const extraWindowRows = windowCueDistribution.filter(row => row.windows.length > 1);
const unclassifiedWindowRows = windowCueDistribution.filter(row => row.reason === 'UNCLASSIFIED_WINDOW_DISTRIBUTION');

const proceduralLeak = runtimeCards.filter(({ profile }) =>
  compileRomPresentationProfile(profile, { actorSide: 'player', selectedResultFamily: 'HIT' }).timeline.entries
    .some(entry => entry.cue.type === 'PROJECTILE'),
);

const fakePresentation: BattlePresentation = {
  setScene() {},
  setActorPose() {},
  setTargetPose() {},
  moveActor() {},
  spawnProjectile() {},
  setProjectileProgress() {},
  impact() {},
  camera() {},
  returnToField() {},
  sync() {},
};

let adapterFxWindows = 0;
let displayFxWindowEvents = 0;
for (const { profile } of runtimeCards) {
  const display = new RomDisplayPresenter();
  const adapter = new ProductionRomPresentationAdapter(fakePresentation, display);
  adapter.reset('ROM');
  const timeline = compileRomPresentationProfile(profile, { actorSide: 'player', selectedResultFamily: 'HIT' }).timeline;
  for (const entry of timeline.entries) adapter.consume(entry.cue);
  adapterFxWindows += adapter.snapshot.fxWindows;
  displayFxWindowEvents += display.state.events.filter(event => event.kind === 'FX_WINDOW_APPLIED').length;
}

check('physical FX corpus available 28/28', ROM_FX_CORPUS_SUMMARY.totals.offensiveFxResources === 28 && FX_RESOURCE_IDS.size === 28, `${FX_RESOURCE_IDS.size}/28`);
check('runtime cutover JSON exists', existsSync(runtimeJsonPath));
check('runtime cutover MD exists', existsSync(runtimeMdPath));
check('runtime filmstrip exists', existsSync(runtimeFilmstripPath));
check('side selection JSON exists', existsSync(sideSelectionPath));
check('public runtime cutover JSON exists', existsSync(publicRuntimeJsonPath));
check('public runtime filmstrip exists', existsSync(publicRuntimeFilmstripPath));
check('public side selection JSON exists', existsSync(publicSideSelectionPath));
if (existsSync(runtimeJsonPath)) {
  const generated = JSON.parse(readFileSync(runtimeJsonPath, 'utf8')) as {
    totals: {
      runtimeCards: number;
      windowCues: number;
      distributionRows: number;
      distributionErrors: number;
      sideSelectionRows: number;
      sideSelectionComplete: number;
      sideSelectionPending: number;
      staticCompleteResources: number;
      dynamicCompleteResources: number;
      completeResources: number;
      partialResources: number;
      silentFallback: number;
      errors: number;
    };
    windowCueDistribution?: Array<{ cardId: number; numberOfWindowCues: number; reason: string; errors: string[] }>;
    sideSelection?: Array<{ attackerSide: string; selectedMap: string; status: string }>;
  };
  check('generated runtime cutover mirrors verifier counts', generated.totals.runtimeCards === runtimeCards.length && generated.totals.windowCues === allRuntimeWindows.length, `${generated.totals.runtimeCards}/${runtimeCards.length} cards · ${generated.totals.windowCues}/${allRuntimeWindows.length} windows`);
  check('generated window cue distribution is explicit', generated.totals.distributionRows === runtimeCards.length && generated.totals.distributionErrors === 0 && generated.windowCueDistribution?.length === runtimeCards.length, `${generated.totals.distributionRows}/${runtimeCards.length} rows · errors=${generated.totals.distributionErrors}`);
  check('generated side selection is statically mapped, not pending', generated.totals.sideSelectionRows === runtimeCards.length * 2 && generated.totals.sideSelectionComplete === runtimeCards.length * 2 && generated.totals.sideSelectionPending === 0 && generated.sideSelection?.every(row => row.status === 'ACTOR_SIDE_STATIC_MAPPING'), `${generated.totals.sideSelectionComplete}/${runtimeCards.length * 2} static`);
  check('generated runtime cutover keeps static/complete honest', generated.totals.staticCompleteResources === 28 && generated.totals.dynamicCompleteResources === 0 && generated.totals.completeResources === 0 && generated.totals.partialResources === 0 && generated.totals.silentFallback === 0 && generated.totals.errors === 0, JSON.stringify(generated.totals));
}
if (existsSync(sideSelectionPath)) {
  const generatedSideSelection = JSON.parse(readFileSync(sideSelectionPath, 'utf8')) as { status: string; totals: { rows: number; complete: number; pending: number; errors: number } };
  check('side selection artifact is static actor mapping', generatedSideSelection.status === 'ACTOR_SIDE_STATIC_MAPPING' && generatedSideSelection.totals.rows === runtimeCards.length * 2 && generatedSideSelection.totals.complete === runtimeCards.length * 2 && generatedSideSelection.totals.pending === 0 && generatedSideSelection.totals.errors === 0, JSON.stringify(generatedSideSelection.totals));
}
check('runtime summary keeps P0.1B static-complete, not complete', summary.staticComplete === 28 && summary.dynamicComplete === 0 && summary.complete === 0 && summary.partial === 0 && summary.silentFallback === 0, `staticComplete=${summary.staticComplete} dynamicComplete=${summary.dynamicComplete} complete=${summary.complete}`);
check('production-relevant offensive cards have ROM FX bundle', runtimeCards.length > 0, String(runtimeCards.length));
check('every runtime card has at least one expected FX window', windowCueDistribution.every(row => row.windows.length >= 1), windowCueDistribution.filter(row => row.windows.length < 1).map(row => `#${row.card.id} ${row.card.name}`).join(', '));
check('extra runtime window has explicit ROM result-branch reason', extraWindowRows.length === 1 && extraWindowRows[0]?.card.id === 12 && extraWindowRows[0]?.reason === 'PREFIX_PLUS_RESULT_BRANCH_WINDOW', extraWindowRows.map(row => `#${row.card.id} ${row.card.name}: ${row.windows.length} ${row.reason}`).join(', '));
check('orphan/accidental runtime window distributions are zero', unclassifiedWindowRows.length === 0, unclassifiedWindowRows.map(row => `#${row.card.id} ${row.card.name}`).join(', '));
check('every runtime FX_LOAD has paired PREFIX ROM_FX_WINDOW', missingPrefixWindow.length === 0, missingPrefixWindow.map(item => `#${item.card.id} ${item.card.name}`).join(', '));
check('result-branch runtime cards emit RESULT ROM_FX_WINDOW', missingResultWindow.length === 0, missingResultWindow.map(item => `#${item.card.id} ${item.card.name}`).join(', '));
check('all emitted windows are STATIC_COMPLETE (film contract ROM-proven)', staticCompleteWindows.length === allRuntimeWindows.length && dynamicCompleteWindows.length === 0 && completeWindows.length === 0 && partialWindows.length === 0 && fallbackWindows.length === 0, `${staticCompleteWindows.length}/${allRuntimeWindows.length}`);
check('window assets resolve to public physical FX renders', missingImages.length === 0, missingImages.map(cue => cue.sourceImage).join(', '));
check('window geometry matches opcode $0C BG copy', malformedWindows.length === 0, `${malformedWindows.length} malformed`);

const windowsWithoutFilmContract = allRuntimeWindows.filter(cue => !cue.filmContract);
const prefixOperandBad = allRuntimeWindows.filter(cue => cue.phase === 'PREFIX' && cue.filmContract && cue.filmContract.prefixOperand !== (cue.handler === 0x07 ? 0x02 : 0x00));
const resultOperandBad = allRuntimeWindows.filter(cue => cue.phase === 'RESULT' && cue.filmContract && cue.filmContract.resultOperand !== 0x0a);
const rowsBad = allRuntimeWindows.filter(cue => cue.filmContract && cue.filmContract.prefixRows[1] - cue.filmContract.prefixRows[0] !== 7 && cue.filmContract.resultRows[1] - cue.filmContract.resultRows[0] !== 7);
const relationBad = allRuntimeWindows.filter(cue => cue.filmContract && cue.filmContract.prefixRelation !== 'DISTINCT_RESULT_GRAPHIC' && cue.filmContract.prefixRelation !== 'PURE_MAP_TRANSLATION');
const attributeStripMissing = allRuntimeWindows.filter(cue => cue.filmContract && !cue.filmContract.attributeStrip);
check('every emitted window carries a ROM-proven film contract', windowsWithoutFilmContract.length === 0, windowsWithoutFilmContract.map(cue => cue.physicalId).join(', '));
check('prefix operand mapping follows handler ($07 → $02, else $00)', prefixOperandBad.length === 0, prefixOperandBad.map(cue => `h=${cue.handler} op=${cue.filmContract?.prefixOperand}`).join(', '));
check('result operand is always $0A (rows 11-18)', resultOperandBad.length === 0, resultOperandBad.map(cue => String(cue.filmContract?.resultOperand)).join(', '));
check('prefix/result windows span 8 source rows', rowsBad.length === 0, String(rowsBad.length));
check('prefix relation is an explicit ROM relation', relationBad.length === 0, String(relationBad.length));
check('every film contract carries the side attribute strip', attributeStripMissing.length === 0, attributeStripMissing.map(cue => cue.physicalId).join(', '));
check('player actor side maps to LEFT/SIDE_1 consistently', playerSideBad.length === 0, playerSideBad.map(item => `#${item.card.id}`).join(', '));
check('enemy actor side maps to RIGHT/SIDE_2 consistently', enemySideBad.length === 0, enemySideBad.map(item => `#${item.card.id}`).join(', '));
check('support cards do not emit offensive ROM_FX_WINDOW', supportWithBeamWindow.length === 0, supportWithBeamWindow.map(item => `#${item.card.id} ${item.card.name}`).join(', '));
check('ROM FX runtime timelines do not emit procedural PROJECTILE', proceduralLeak.length === 0, proceduralLeak.map(item => `#${item.card.id} ${item.card.name}`).join(', '));
check('Production adapter routes ROM_FX_WINDOW to RomDisplayPresenter', adapterFxWindows === allRuntimeWindows.length && displayFxWindowEvents === allRuntimeWindows.length, `adapter=${adapterFxWindows} display=${displayFxWindowEvents} windows=${allRuntimeWindows.length}`);
check('no silent fallback where ROM window cue exists', allRuntimeWindows.every(cue => cue.evidence.some(item => item.includes('PENDING_ROM_TRACE'))), 'pending trace evidence retained');

console.log('');
console.log('═══ ROM FX RUNTIME CUTOVER ═══');
console.log(`offensiveResources=${ROM_FX_CORPUS_SUMMARY.totals.offensiveFxResources}`);
console.log(`runtimeCards=${runtimeCards.length}`);
console.log(`windowCues=${allRuntimeWindows.length}`);
console.log(`windowStaticComplete=${staticCompleteWindows.length}`);
console.log(`windowDynamicComplete=${dynamicCompleteWindows.length}`);
console.log(`windowComplete=${completeWindows.length}`);
console.log(`windowPartial=${partialWindows.length}`);
console.log(`proceduralLeak=${proceduralLeak.length}`);
console.log(`supportBeamWindows=${supportWithBeamWindow.length}`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);
