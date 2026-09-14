import { readFileSync } from 'node:fs';
import { romSequenceRegistrySummary } from '../src/data/romSequenceRegistry';
import { getBindingSummary, getRomActionSequenceBindings } from '../src/data/romActionSequenceBinding';
import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../src/data/generated/romPhysicalCorpus.generated';
import { getDevProjectSnapshot } from '../src/devtools/devSnapshot';
import { BATTLE_PRESENTATION_DEPLOYMENT } from '../src/renderer/pixi/flag';

let passed = 0;
const failures: string[] = [];
function check(label: string, condition: boolean, detail = ''): void {
  if (condition) { passed++; console.log(`  ✓ ${label}`); return; }
  failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
}

const registry = romSequenceRegistrySummary();
const bindings = getBindingSummary();
const corpus = ROM_PHYSICAL_CORPUS_SUMMARY.totals;
const animationCore = readFileSync('src/battle/animationStudio.ts', 'utf8');
const animationUi = readFileSync('src/devtools/animationStudio.tsx', 'utf8');
const cardsUi = readFileSync('src/devtools/cards.tsx', 'utf8');
const charactersUi = readFileSync('src/devtools/characters.tsx', 'utf8');
const summaryUi = readFileSync('src/devtools/PhysicalReconciliationSummary.tsx', 'utf8');
const validationUi = readFileSync('src/devtools/validation.tsx', 'utf8');
const dashboardUi = readFileSync('src/devtools/dashboard.tsx', 'utf8');
const timelineUi = readFileSync('src/devtools/timeline.tsx', 'utf8');
const battleLabUi = readFileSync('src/devtools/battlelab.tsx', 'utf8');
const gameConfigUi = readFileSync('src/devtools/gameconfig.tsx', 'utf8');
const attackPreviewUi = readFileSync('src/devtools/AttackPreview.tsx', 'utf8');
const hudUi = readFileSync('src/devtools/hud.tsx', 'utf8');
const canonBattleFieldUi = readFileSync('src/devtools/CanonBattleField.tsx', 'utf8');
const formPreviewUi = readFileSync('src/devtools/FormPreview.tsx', 'utf8');
const mainUi = readFileSync('src/main.tsx', 'utf8');
const snapshot = getDevProjectSnapshot();

check('registry keeps all 66 catalog slots', registry.total === 66);
check('registry closes 62 physical resources', registry.physicalResourceFullyClosed === 62);
check('only four ROM slots are empty', registry.emptyResourceSlots === 4
  && registry.emptyResourceIds.join(',') === '40,41,42,64', registry.emptyResourceIds.join(','));
check('all 125 cards have a ROM action binding', bindings.totalBindings === 125);
check('every binding has an explicit actor track', getRomActionSequenceBindings().every(binding =>
  binding.tracks.some(track => track.trackId === 'actor')));
check('physical corpus indexes 48 forms without blockers', corpus.formsIndexed === 48
  && corpus.formsPaletteBlocked === 0 && corpus.formsResourceBlocked === 0);
check('Animation Studio reads current registry authority', animationCore.includes('getRomSequenceRegistry'));
check('Standard Damage golden context uses actor resource $2C', animationCore.includes('resourceId: 0x2c'));
check('Animation Studio names Bank $61 handler tracks', animationCore.includes('ROM_HANDLER_TRACK') && animationUi.includes('Bank $61'));
check('stale decode claims removed from golden contexts', !animationCore.includes('frame stream no extraído aún')
  && !animationCore.includes('sin recurso ROM decodificado dedicado'));
check('Cards exposes one coherent ROM Truth Card', cardsUi.includes('ROM Truth Card')
  && cardsUi.includes('NONE — ROM byte[6] = $FF') && cardsUi.includes('ROM_STANDARD_DAMAGE_RESULT_PHYSICAL'));
check('Characters keeps $FF actor actions visible', charactersUi.includes('return cardBindings;')
  && charactersUi.includes('NO ACTOR (ROM)'));
check('current summary has no historical OPEN milestones', !summaryUi.includes('V7 OPEN')
  && !summaryUi.includes('runtime cutover pending') && !summaryUi.includes('Legacy Tail'));
check('physical summary separates rendered and renderer-pending resources', summaryUi.includes('Fighter rendered')
  && summaryUi.includes('Fighter renderer pending') && summaryUi.includes('Stage Bank $61 rendered'));
check('Validation has no frozen historical corpus counters', !validationUi.includes('physicalIdentities === 505')
  && !validationUi.includes('frameInstances === 2374') && !validationUi.includes('resourcesRendered === 6'));
check('Validation does not promote legacy maps to blocking authority', validationUi.includes('Legacy manifest pose map (diagnóstico, no autoridad física)')
  && validationUi.includes('Legacy AnimationResource completion taxonomy (diagnóstico)'));
check('Validation reconciles the current resource universe', snapshot.physicalCorpus.resourcesRendered
  + snapshot.physicalCorpus.resourcesRendererPending + snapshot.physicalCorpus.resourcesEmpty
  === snapshot.physicalCorpus.resourcesTotal);
check('Dashboard separates route, adapter and player-visible deployment', dashboardUi.includes('ROM route available')
  && dashboardUi.includes('ROM adapter capable') && dashboardUi.includes('Default player visible'));
check('deployment truth matches current BattleScreen gate', BATTLE_PRESENTATION_DEPLOYMENT.defaultRenderer === 'PIXI_ROM'
  && BATTLE_PRESENTATION_DEPLOYMENT.pixiActivation === 'DEFAULT'
  && BATTLE_PRESENTATION_DEPLOYMENT.pixiActiveByDefault === true
  && BATTLE_PRESENTATION_DEPLOYMENT.domFallbackQuery === 'domField=1'
  && BATTLE_PRESENTATION_DEPLOYMENT.completionOwnership === 'ROUTE_SCOPED'
  && BATTLE_PRESENTATION_DEPLOYMENT.romCompletionRoutes.join(',') === 'PLAYER_STANDARD_DAMAGE,ENEMY_STANDARD_DAMAGE'
  && BATTLE_PRESENTATION_DEPLOYMENT.legacyCompletionFallback === true
  && mainUi.includes('isPixiField()')
  && mainUi.includes('pixiPresentationActive')
  && mainUi.includes('if (romOwnsCompletion) return;'));
check('Card preview renders the card production timeline from physical-ROM files', cardsUi.includes('ROM FRAME PREVIEW')
  && attackPreviewUi.includes('romPresentationTimelineForCard')
  && attackPreviewUi.includes('ROM PHYSICAL')
  && !attackPreviewUi.includes('spriteFrameUrl'));
check('HUD action preview never rewrites another form frame name or opens a legacy URL', hudUi.includes('resolveCharacterVisualSequence')
  && hudUi.includes('romPhysicalAssetUrl')
  && !hudUi.includes("replace(/^goku_base_")
  && !hudUi.includes('spriteFrameUrl'));
check('shared Dev battlefield resolves combat poses through physical ROM evidence', canonBattleFieldUi.includes('resolveCharacterVisualSequence')
  && canonBattleFieldUi.includes('romPhysicalPreviewSequence')
  && !canonBattleFieldUi.includes('spriteFrameUrl')
  && !canonBattleFieldUi.includes('${dir}_${p}_00.png'));
check('Character preview exposes only reconciled physical-ROM frames', formPreviewUi.includes('romPhysicalPreviewSequence')
  && formPreviewUi.includes('sin frame ROM físico reconciliado')
  && !formPreviewUi.includes('spriteFrameUrl')
  && !formPreviewUi.includes('resolvePoseFrameSequence'));
check('Animation Studio exposes closed sequence vs pending PNG', animationUi.includes('ROM SEQUENCE CLOSED')
  && animationUi.includes('PHYSICAL PNG:') && animationUi.includes('RENDERER PENDING'));
check('Timeline live mode is honestly named Runtime Sandbox', timelineUi.includes('Runtime Sandbox')
  && !timelineUi.includes('En vivo (Engine Runtime)'));
check('Combat Lab identifies BattleScreen and completion owner', battleLabUi.includes('BattleScreen real')
  && battleLabUi.includes('Completion owner') && battleLabUi.includes('PLAYER STANDARD_DAMAGE → ROM'));
check('Game Config consumes deployment truth and current corpus', gameConfigUi.includes('presentationDeployment')
  && !gameConfigUi.includes('resourcesRendered === 6'));

console.log(`\nDEV ROM TRUTH: ${passed} passed · ${failures.length} failed`);
if (failures.length) {
  console.error(failures.map(failure => `- ${failure}`).join('\n'));
  process.exit(1);
}
