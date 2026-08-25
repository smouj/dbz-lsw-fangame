import { readFileSync } from 'node:fs';
import { CARDS, getCard } from '../src/data/cards';
import { SCENARIOS } from '../src/data/scenarios';
import { actionDescriptorForCard } from '../src/battle/engine/commands/buildActionDescriptor';
import type { BattleEventEnvelope } from '../src/battle/engine/events';
import { buildPresentationTimeline, type BattleTimeline } from '../src/battle/engine/presentation';
import { createCuePresenter } from '../src/battle/runtime/BattlePresenter';
import { romActionExecutionDescriptorForCard } from '../src/battle/romActionExecutionDescriptors';
import { compileRomPresentationProfile } from '../src/battle/romPresentationCompiler';
import { romPresentationProfileForCard } from '../src/battle/romPresentationProfiles';
import {
  BEAM_BASE_ROM_HANDLER,
  beamBaseProfileForAction,
  beamBaseRuntimeCutoverSummary,
  compileBeamBaseRuntimeCutover,
} from '../src/battle/beamBaseRomCutover';
import { PRESENTATION_SCENARIOS, runPresentationScenario } from '../src/devtools/presentationScenarios';

let failures = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const CONTEXT = {
  playerFormId: 'goku_base',
  enemyFormId: 'piccolo_base',
  overviewBackground: SCENARIOS[0].overviewBackground,
  actionBackground: SCENARIOS[0].actionBackground,
  specialActionBackground: SCENARIOS[0].actionBackground,
};

function firstActionStarted(events: BattleEventEnvelope[]) {
  const index = events.findIndex(entry => entry.event.type === 'ACTION_STARTED');
  const env = events[index];
  if (!env || env.event.type !== 'ACTION_STARTED') throw new Error('scenario has no ACTION_STARTED');
  return { index, env };
}

function branchCue(timeline: BattleTimeline) {
  return timeline.entries.find(entry => entry.cue.type === 'ROM_RESULT_BRANCH')?.cue as Extract<BattleTimeline['entries'][number]['cue'], { type: 'ROM_RESULT_BRANCH' }> | undefined;
}

function motionCue(timeline: BattleTimeline) {
  return timeline.entries.find(entry => entry.cue.type === 'FIGHTER_MOTION' && entry.cue.kind === 'BEAM_SETUP')?.cue as Extract<BattleTimeline['entries'][number]['cue'], { type: 'FIGHTER_MOTION' }> | undefined;
}

function animationCue(timeline: BattleTimeline) {
  return timeline.entries.find(entry => entry.cue.type === 'ANIMATION_START')?.cue as Extract<BattleTimeline['entries'][number]['cue'], { type: 'ANIMATION_START' }> | undefined;
}

function fxCue(timeline: BattleTimeline) {
  return timeline.entries.find(entry => entry.cue.type === 'FX_LOAD')?.cue as Extract<BattleTimeline['entries'][number]['cue'], { type: 'FX_LOAD' }> | undefined;
}

function reducedState(value: unknown): string {
  return JSON.stringify(value);
}

function manualTimeline(cardId: number, outcome: 'HIT' | 'MISS' | 'SPECIAL_DEFENSE', side: 'player' | 'enemy' = 'player') {
  const card = getCard(cardId);
  if (!card) throw new Error(`card ${cardId} missing`);
  const action = actionDescriptorForCard(card);
  const target = side === 'player' ? 'enemy' : 'player';
  const resultEvent =
    outcome === 'MISS'
      ? { type: 'ATTACK_MISSED' as const, source: side, target }
      : { type: 'ATTACK_HIT' as const, source: side, target, outcome: outcome === 'HIT' ? 'hit' as const : 'block' as const };
  const events: BattleEventEnvelope[] = [
    { sequence: 0, tick: 10, event: { type: 'ACTION_STARTED', side, action } },
    { sequence: 1, tick: 10, event: resultEvent },
    { sequence: 2, tick: 10, event: { type: 'ACTION_RESOLVED', side, action } },
  ];
  return buildPresentationTimeline({ events, context: CONTEXT });
}

const beamBaseCards = CARDS.filter(card => romActionExecutionDescriptorForCard(card).execution.handler === BEAM_BASE_ROM_HANDLER);
// Beam cards (type 'beam'|'damage') sharing $02 → genuinely BEAM_BASE backed.
const beamBackedCards = beamBaseCards.filter(card => card.type !== 'support');
// Support cards sharing $02 (buff/heal/shield reuse) → MUST NOT be beam-backed.
const supportHandlerCards = beamBaseCards.filter(card => card.type === 'support');
const nonBeamBaseBacked = CARDS.filter(card => romActionExecutionDescriptorForCard(card).execution.handler !== BEAM_BASE_ROM_HANDLER && beamBaseProfileForAction(actionDescriptorForCard(card)));
const beamVariantsBacked = CARDS.filter(card => {
  const descriptor = romActionExecutionDescriptorForCard(card);
  const profile = romPresentationProfileForCard(card);
  return profile.kind === 'BEAM_VARIANT' && descriptor.execution.handler === BEAM_BASE_ROM_HANDLER;
});

check('gate:38 cards share handler $02', beamBaseCards.length === 38, String(beamBaseCards.length));
check('gate:beam cards $02 → BEAM_BASE backed', beamBackedCards.length === 16 && beamBackedCards.every(card => !!beamBaseProfileForAction(actionDescriptorForCard(card))), `beam=${beamBackedCards.length}`);
check('gate:0 SUPPORT cards routed BEAM_BASE (guardrail)', supportHandlerCards.length === 22 && supportHandlerCards.every(card => !beamBaseProfileForAction(actionDescriptorForCard(card))), `support=${supportHandlerCards.length}: ${supportHandlerCards.map(card => card.name).join(', ')}`);
check('gate:0 non-BEAM_BASE cards diverted', nonBeamBaseBacked.length === 0, nonBeamBaseBacked.map(card => card.name).join(', '));
check('gate:0 BEAM_VARIANT diverted', beamVariantsBacked.length === 0, beamVariantsBacked.map(card => card.name).join(', '));

const summary = beamBaseRuntimeCutoverSummary();
check('summary:handler shared count', summary.handlerShared === 38, String(summary.handlerShared));
check('summary:ROM backed count (beams only)', summary.romBacked === 16, String(summary.romBacked));
check('summary:no accidental handlers', summary.nonBeamBaseBacked === 0, String(summary.nonBeamBaseBacked));
check('summary:no beam variants', summary.beamVariantsBacked === 0, String(summary.beamVariantsBacked));

{
  const scenario = PRESENTATION_SCENARIOS.find(item => item.id === 'm7_beam_hit');
  check('beam hit scenario exists', !!scenario);
  if (scenario) {
    const run = runPresentationScenario(scenario);
    const timeline = buildPresentationTimeline({ events: run.log.entries, context: CONTEXT });
    const branch = branchCue(timeline);
    check('beam hit:ROM branch cue', !!branch);
    check('beam hit:selected HIT from EventLog', branch?.selectedFamily === 'HIT' && branch?.selectedSourceEvent === 'ATTACK_HIT', `${branch?.selectedFamily}/${branch?.selectedSourceEvent}`);
    check('beam hit:legacy projectile suppressed', !timeline.entries.some(entry => entry.cue.type === 'PROJECTILE'));
    check('beam hit:legacy impact suppressed', !timeline.entries.some(entry => entry.cue.type === 'IMPACT' && entry.sourceEvent === 'ATTACK_HIT'));
  }
}

{
  const timeline = manualTimeline(12, 'MISS');
  const branch = branchCue(timeline);
  check('beam miss:ROM branch cue', !!branch);
  check('beam miss:selected MISS from EventLog', branch?.selectedFamily === 'MISS' && branch?.selectedSourceEvent === 'ATTACK_MISSED', `${branch?.selectedFamily}/${branch?.selectedSourceEvent}`);
  check('beam miss:legacy miss impact suppressed', !timeline.entries.some(entry => entry.cue.type === 'IMPACT' && entry.sourceEvent === 'ATTACK_MISSED'));
}

{
  const timeline = manualTimeline(12, 'SPECIAL_DEFENSE');
  const branch = branchCue(timeline);
  check('beam special defense:ROM branch cue', !!branch);
  check('beam special defense:selected SPECIAL_DEFENSE from EventLog', branch?.selectedFamily === 'SPECIAL_DEFENSE' && branch?.selectedSourceEvent === 'ATTACK_HIT', `${branch?.selectedFamily}/${branch?.selectedSourceEvent}`);
}

{
  const card = getCard(12)!;
  const profile = romPresentationProfileForCard(card);
  const player = compileRomPresentationProfile(profile, { actorSide: 'player' });
  const enemy = compileRomPresentationProfile(profile, { actorSide: 'enemy' });
  const playerMotion = motionCue(player.timeline);
  const enemyMotion = motionCue(enemy.timeline);
  const expectedPlayerSegments = [
    { dxPerTick: -1, dyPerTick: 0, ticks: 2 },
    { dxPerTick: -2, dyPerTick: 0, ticks: 10 },
    { dxPerTick: -1, dyPerTick: 0, ticks: 5 },
  ];
  const expectedEnemySegments = expectedPlayerSegments.map(segment => ({ ...segment, dxPerTick: -segment.dxPerTick }));
  const playerDelta = expectedPlayerSegments.reduce((sum, segment) => sum + segment.dxPerTick * segment.ticks, 0);
  const enemyDelta = expectedEnemySegments.reduce((sum, segment) => sum + segment.dxPerTick * segment.ticks, 0);
  check('$1E:player segments preserved', JSON.stringify(playerMotion?.segments) === JSON.stringify(expectedPlayerSegments), JSON.stringify(playerMotion?.segments));
  check('$1E:enemy mirrored segments preserved', JSON.stringify(enemyMotion?.segments) === JSON.stringify(expectedEnemySegments), JSON.stringify(enemyMotion?.segments));
  check('$1E:duration 17 ticks', playerMotion?.durationTicks === 17 && enemyMotion?.durationTicks === 17, `${playerMotion?.durationTicks}/${enemyMotion?.durationTicks}`);
  check('$1E:player displacement -27px', playerMotion?.deltaPx === playerDelta && playerDelta === -27, `${playerMotion?.deltaPx}/${playerDelta}`);
  check('$1E:enemy displacement +27px', enemyMotion?.deltaPx === enemyDelta && enemyDelta === 27, `${enemyMotion?.deltaPx}/${enemyDelta}`);
}

{
  const timeline = manualTimeline(12, 'HIT');
  const anim = animationCue(timeline);
  const fx = fxCue(timeline);
  check('Kamehameha:actor AnimationResource $03 preserved', anim?.resource === 0x03, String(anim?.resource));
  check('Kamehameha:FXResource $05 preserved', fx?.resource === 0x05, String(fx?.resource));
  check('Kamehameha:palette $2C preserved', fx?.palette === 0x2c, String(fx?.palette));
  check('Kamehameha:runtime provenance BEAM_BASE', timeline.entries.some(entry => entry.romSource?.profileFamily === 'BEAM_BASE' && entry.romSource.handler === BEAM_BASE_ROM_HANDLER));
}

{
  const scenario = PRESENTATION_SCENARIOS.find(item => item.id === 'm7_beam_hit')!;
  const runA = runPresentationScenario(scenario);
  const stateBeforeTimeline = reducedState(runA.state);
  const logBeforeTimeline = reducedState(runA.log.entries);
  const rngBeforeTimeline = reducedState(runA.state.rngState);
  buildPresentationTimeline({ events: runA.log.entries, context: CONTEXT });
  check('engine state unchanged by BEAM_BASE ROM Presentation', reducedState(runA.state) === stateBeforeTimeline);
  check('EventLog unchanged by BEAM_BASE ROM Presentation', reducedState(runA.log.entries) === logBeforeTimeline);
  check('rngState unchanged by BEAM_BASE ROM Presentation', reducedState(runA.state.rngState) === rngBeforeTimeline);

  const runB = runPresentationScenario(scenario);
  check('golden engine state deterministic', reducedState(runA.state) === reducedState(runB.state));
  check('golden EventLog deterministic', reducedState(runA.log.entries) === reducedState(runB.log.entries));
}

{
  const scenario = PRESENTATION_SCENARIOS.find(item => item.id === 'm7_beam_hit')!;
  const run = runPresentationScenario(scenario);
  const { index, env } = firstActionStarted(run.log.entries);
  const cutover = compileBeamBaseRuntimeCutover(run.log.entries, index, env as BattleEventEnvelope & { event: { type: 'ACTION_STARTED' } });
  check('cutover:compiles directly from ACTION_STARTED', !!cutover);
  check('cutover:profile source BEAM_BASE', cutover?.profile.kind === 'BEAM_BASE');
  check('cutover:timeline deterministic', JSON.stringify(cutover?.timeline) === JSON.stringify(compileBeamBaseRuntimeCutover(run.log.entries, index, env as BattleEventEnvelope & { event: { type: 'ACTION_STARTED' } })?.timeline));
}

{
  const timeline = manualTimeline(12, 'HIT');
  const entries = timeline.entries.filter(entry => entry.romSource?.profileFamily === 'BEAM_BASE');
  check('runtime provenance:ROM source visible', entries.length > 0);
  check('runtime provenance:handler $02', entries.every(entry => entry.romSource?.handler === BEAM_BASE_ROM_HANDLER));
  check('runtime provenance:no legacy profile id', entries.every(entry => entry.profileId?.startsWith('rom-card-')));
  check('runtime:AnimationResource remains resource cue', timeline.entries.some(entry => entry.cue.type === 'ANIMATION_START' && entry.cue.resource === 0x03));
  check('runtime:FXResource remains FX cue', timeline.entries.some(entry => entry.cue.type === 'FX_LOAD' && entry.cue.resource === 0x05 && entry.cue.palette === 0x2c));
  check('runtime:no semantic pose leaks for BEAM_BASE', !entries.some(entry => ['FIGHTER_POSE', 'PROJECTILE', 'IMPACT', 'AURA', 'FIGHTER_POSITION'].includes(entry.cue.type)));
  check('runtime:no invented anchors/coordinates', !/baseX|baseY|anchor|anchors|slotBinding|slotBindings|ROM_ACTOR_HOME|ROM_TARGET_HOME|ROM_CONTACT/.test(JSON.stringify(timeline)));
}

{
  const timeline = manualTimeline(12, 'HIT');
  const consumed: unknown[] = [];
  createCuePresenter({
    onRomMotion(cue) {
      if (cue.kind === 'BEAM_SETUP') consumed.push(cue.segments);
    },
  }).consume({ timeline, state: runPresentationScenario(PRESENTATION_SCENARIOS.find(item => item.id === 'm7_beam_hit')!).state });
  check('Presenter consumes BEAM_SETUP motion segments', consumed.length > 0 && JSON.stringify(consumed[0]) === JSON.stringify(motionCue(timeline)?.segments));
}

const adapterSource = readFileSync('src/battle/engine/presentation/buildTimeline.ts', 'utf8');
const cutoverSource = readFileSync('src/battle/beamBaseRomCutover.ts', 'utf8');
const compilerSource = readFileSync('src/battle/romPresentationCompiler.ts', 'utf8');
check('adapter:0 Math.random', !/Math\.random\s*\(/.test(adapterSource + cutoverSource + compilerSource));
check('adapter:0 cardId switch for cutover', !/switch\s*\([^)]*card/i.test(cutoverSource) && !/card\.id\s*===/.test(cutoverSource));
check('adapter:0 beam visual chosen by name', !/Kamehameha|Masenko|Galick|Final Flash|Special Beam|Finger Beam|Eye Beam/.test(cutoverSource));
check('adapter:0 damage calculation authority', !/calculateDamage|applyDamage|damageReducer|accuracyRoll|resolveAccuracy|rngNext/.test(cutoverSource));

console.log('═══ BEAM_BASE ROM CUTOVER ═══');
console.log(`handler02=${beamBaseCards.length}`);
console.log(`beamBacked=${beamBackedCards.length}`);
console.log(`supportHandlerShared=${supportHandlerCards.length}`);
console.log(`romBacked=${summary.romBacked}`);
console.log(`handlerShared=${summary.handlerShared}`);
console.log(`otherHandlersBacked=${summary.nonBeamBaseBacked}`);
console.log(`beamVariantsBacked=${summary.beamVariantsBacked}`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);
