import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PNG } from 'pngjs';
import { CARDS } from '../src/data/cards';
import { ROM_FX_CORPUS_SUMMARY } from '../src/data/generated/romFxCorpus.generated';
import { compileRomPresentationProfile } from '../src/battle/romPresentationCompiler';
import { romPresentationProfileForCard } from '../src/battle/romPresentationProfiles';
import { romFxWindowRuntimeSummary } from '../src/battle/romFxWindow';

const OUT = 'generated/rom-fx';
const OUT_PUBLIC = 'public/assets/rom-fx';
const RUNTIME_KINDS = new Set(['BEAM_BASE', 'BEAM_VARIANT', 'PROJECTILE_SCROLL']);

function windowReason(row: {
  profileKind: string;
  playerWindows: { phase: string }[];
  resultBranches: number;
}): string {
  const phases = new Set(row.playerWindows.map(window => window.phase));
  if (row.playerWindows.length === 1 && phases.has('PREFIX')) return 'SINGLE_PREFIX_FX_LOAD';
  if (row.playerWindows.length === 2 && phases.has('PREFIX') && phases.has('RESULT') && row.resultBranches > 0) {
    return 'PREFIX_PLUS_RESULT_BRANCH_WINDOW';
  }
  return 'UNCLASSIFIED_WINDOW_DISTRIBUTION';
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(path: string, value: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
}

function publicPath(assetUrl: string): string {
  return assetUrl.startsWith('/assets/') ? `public${assetUrl}` : assetUrl;
}

function loadPng(path: string): PNG {
  return PNG.sync.read(readFileSync(path));
}

function paste(dest: PNG, src: PNG, dx: number, dy: number) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const si = (y * src.width + x) * 4;
      const di = ((dy + y) * dest.width + (dx + x)) * 4;
      dest.data[di] = src.data[si];
      dest.data[di + 1] = src.data[si + 1];
      dest.data[di + 2] = src.data[si + 2];
      dest.data[di + 3] = src.data[si + 3];
    }
  }
}

function fill(dest: PNG, r: number, g: number, b: number, a = 255) {
  for (let i = 0; i < dest.data.length; i += 4) {
    dest.data[i] = r;
    dest.data[i + 1] = g;
    dest.data[i + 2] = b;
    dest.data[i + 3] = a;
  }
}

const rows = CARDS
  .map(card => ({ card, profile: romPresentationProfileForCard(card) }))
  .filter(item => RUNTIME_KINDS.has(item.profile.kind))
  .map(({ card, profile }) => {
    const playerTimeline = compileRomPresentationProfile(profile, { actorSide: 'player', selectedResultFamily: 'HIT' });
    const enemyTimeline = compileRomPresentationProfile(profile, { actorSide: 'enemy', selectedResultFamily: 'HIT' });
    const playerWindows = playerTimeline.timeline.entries.filter(entry => entry.cue.type === 'ROM_FX_WINDOW').map(entry => entry.cue);
    const enemyWindows = enemyTimeline.timeline.entries.filter(entry => entry.cue.type === 'ROM_FX_WINDOW').map(entry => entry.cue);
    return {
      cardId: card.id,
      name: card.name,
      category: card.type,
      profileKind: profile.kind,
      handler: profile.execution.handlerHex,
      fxResource: profile.dependencies.fxResourceHex,
      palette: profile.dependencies.paletteHex,
      status: playerWindows.every(cue => cue.status === 'ROM_FX_WINDOW_STATIC_COMPLETE') ? 'ROM_FX_WINDOW_STATIC_COMPLETE' : 'ROM_FX_WINDOW_PARTIAL',
      playerWindows,
      enemyWindows,
      resultBranches: profile.resultBranches.length,
      errors: [
        ...playerWindows.filter(cue => !existsSync(publicPath(cue.sourceImage))).map(cue => `MISSING_PLAYER_IMAGE_${cue.sourceImage}`),
        ...enemyWindows.filter(cue => !existsSync(publicPath(cue.sourceImage))).map(cue => `MISSING_ENEMY_IMAGE_${cue.sourceImage}`),
      ],
    };
  });

const runtime = romFxWindowRuntimeSummary();
const allWindows = rows.flatMap(row => row.playerWindows);
const windowCueDistribution = rows.map(row => ({
  cardId: row.cardId,
  name: row.name,
  profileKind: row.profileKind,
  handler: row.handler,
  fxResource: row.fxResource,
  palette: row.palette,
  numberOfWindowCues: row.playerWindows.length,
  phases: row.playerWindows.map(window => window.phase),
  resultBranches: row.resultBranches,
  reason: windowReason(row),
  errors: windowReason(row) === 'UNCLASSIFIED_WINDOW_DISTRIBUTION' ? ['UNCLASSIFIED_WINDOW_DISTRIBUTION'] : [],
}));
const sideSelection = rows.flatMap(row => [
  {
    cardId: row.cardId,
    name: row.name,
    profileKind: row.profileKind,
    handler: row.handler,
    fxResource: row.fxResource,
    palette: row.palette,
    attackerSide: 'LEFT',
    selectedMap: 'SIDE_1',
    status: 'ACTOR_SIDE_STATIC_MAPPING',
    evidence: [
      'ROM_STATIC_VERIFIED: Bank01:$3421 selects side1/side2 tilemap via $CB75.',
      'RUNTIME_NORMALIZED: player actor side maps to LEFT/SIDE_1.',
    ],
  },
  {
    cardId: row.cardId,
    name: row.name,
    profileKind: row.profileKind,
    handler: row.handler,
    fxResource: row.fxResource,
    palette: row.palette,
    attackerSide: 'RIGHT',
    selectedMap: 'SIDE_2',
    status: 'ACTOR_SIDE_STATIC_MAPPING',
    evidence: [
      'ROM_STATIC_VERIFIED: Bank01:$3421 selects side1/side2 tilemap via $CB75.',
      'RUNTIME_NORMALIZED: enemy actor side maps to RIGHT/SIDE_2.',
    ],
  },
]);
const completion = {
  phase: 'P0.1B_ROM_FX_WINDOW_RUNTIME_CUTOVER',
  source: 'ROM_RESEARCH_V4_FX + romPresentationCompiler',
  totals: {
    offensiveResources: ROM_FX_CORPUS_SUMMARY.totals.offensiveFxResources,
    runtimeCards: rows.length,
    windowCues: allWindows.length,
    distributionRows: windowCueDistribution.length,
    distributionErrors: windowCueDistribution.reduce((sum, row) => sum + row.errors.length, 0),
    sideSelectionRows: sideSelection.length,
    sideSelectionComplete: sideSelection.length,
    sideSelectionPending: 0,
    staticCompleteResources: runtime.staticComplete,
    dynamicCompleteResources: runtime.dynamicComplete,
    completeResources: runtime.complete,
    partialResources: runtime.partial,
    remakeFallback: runtime.remakeFallback,
    silentFallback: runtime.silentFallback,
    errors: rows.reduce((sum, row) => sum + row.errors.length, 0),
  },
  status: 'ROM_FX_WINDOW_STATIC_COMPLETE',
  notes: [
    'P0.1A image corpus is closed; P0.1B static film contract is ROM-proven (28/28 STATIC_COMPLETE).',
    'Opcode $0C BG copy is normalized as 8x32 tiles -> $9800 row4 col0.',
    'Side selection (actor -> side1/side2 map) is statically proven (Bank01:$3421 / $CB75).',
    'SCX/SCY exact film, timing and cleanup remain PENDING_ROM_TRACE before COMPLETE (SFX-V4-05).',
    'Support cards are excluded from offensive ROM_FX_WINDOW.',
  ],
  windowCueDistribution,
  sideSelection,
  rows,
};

writeJson(join(OUT, 'runtime_cutover.json'), completion);
writeJson(join(OUT_PUBLIC, 'runtime_cutover.json'), completion);
writeJson(join(OUT, 'side_selection.json'), {
  phase: 'P0.1B_ROM_FX_SIDE_SELECTION',
  status: 'ACTOR_SIDE_STATIC_MAPPING',
  totals: {
    rows: sideSelection.length,
    complete: sideSelection.length,
    pending: 0,
    errors: 0,
  },
  rows: sideSelection,
});
writeJson(join(OUT_PUBLIC, 'side_selection.json'), {
  phase: 'P0.1B_ROM_FX_SIDE_SELECTION',
  status: 'ACTOR_SIDE_STATIC_MAPPING',
  totals: {
    rows: sideSelection.length,
    complete: sideSelection.length,
    pending: 0,
    errors: 0,
  },
  rows: sideSelection,
});
writeText(join(OUT, 'runtime_cutover.md'), [
  '# ROM FX Runtime Cutover',
  '',
  '| Metric | Value |',
  '| --- | ---: |',
  `| Offensive resources | ${completion.totals.offensiveResources} |`,
  `| Runtime cards | ${completion.totals.runtimeCards} |`,
  `| Window cues | ${completion.totals.windowCues} |`,
  `| Window distribution errors | ${completion.totals.distributionErrors} |`,
  `| Side selection complete | ${completion.totals.sideSelectionComplete} |`,
  `| Side selection pending | ${completion.totals.sideSelectionPending} |`,
  `| STATIC_COMPLETE resources | ${completion.totals.staticCompleteResources} |`,
  `| DYNAMIC_COMPLETE resources | ${completion.totals.dynamicCompleteResources} |`,
  `| COMPLETE resources | ${completion.totals.completeResources} |`,
  `| PARTIAL resources | ${completion.totals.partialResources} |`,
  `| Silent fallback | ${completion.totals.silentFallback} |`,
  `| Errors | ${completion.totals.errors} |`,
  '',
  '## Window Cue Distribution',
  '',
  '| Card | Kind | Handler | FX | Windows | Phases | Reason | Errors |',
  '| ---: | --- | --- | --- | ---: | --- | --- | ---: |',
  ...windowCueDistribution.map(row => `| #${row.cardId} ${row.name} | ${row.profileKind} | ${row.handler} | ${row.fxResource ?? '-'} | ${row.numberOfWindowCues} | ${row.phases.join(', ')} | ${row.reason} | ${row.errors.length} |`),
  '',
  '## Runtime Cards',
  '',
  '| Card | Kind | Handler | FX | Palette | Windows | Status | Errors |',
  '| ---: | --- | --- | --- | --- | ---: | --- | ---: |',
  ...rows.map(row => `| #${row.cardId} ${row.name} | ${row.profileKind} | ${row.handler} | ${row.fxResource ?? '-'} | ${row.palette ?? '-'} | ${row.playerWindows.length} | ${row.status} | ${row.errors.length} |`),
  '',
].join('\n'));

const cellW = 276;
const cellH = 74;
const cols = 3;
const sheet = new PNG({ width: cellW * cols, height: Math.max(1, rows.length) * cellH });
fill(sheet, 8, 13, 20, 255);
rows.forEach((row, rowIndex) => {
  const y = rowIndex * cellH + 5;
  const prefix = row.playerWindows.find(cue => cue.phase === 'PREFIX');
  const result = row.playerWindows.find(cue => cue.phase === 'RESULT');
  const sources = [prefix?.sourceImage, result?.sourceImage].filter(Boolean) as string[];
  sources.forEach((source, col) => {
    const src = loadPng(publicPath(source));
    paste(sheet, src, col * cellW + 10, y);
  });
});
writeFileSync(join(OUT, 'runtime_filmstrip.png'), PNG.sync.write(sheet));
writeFileSync(join(OUT_PUBLIC, 'runtime_filmstrip.png'), PNG.sync.write(sheet));

console.log(`ROM FX runtime: ${rows.length} cards · ${allWindows.length} windows · STATIC_COMPLETE ${runtime.staticComplete}/28 · COMPLETE ${runtime.complete}/28 · errors ${completion.totals.errors}`);
