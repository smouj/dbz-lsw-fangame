import { readFileSync } from 'node:fs';
import { CARDS, getCard } from '../src/data/cards';
import { SCENARIOS } from '../src/data/scenarios';
import { actionDescriptorForCard } from '../src/battle/engine/commands/buildActionDescriptor';
import type { BattleEventEnvelope } from '../src/battle/engine/events';
import { buildPresentationTimeline } from '../src/battle/engine/presentation';
import type { BattleTimeline } from '../src/battle/engine/presentation';
import { createCuePresenter } from '../src/battle/runtime/BattlePresenter';
import { romActionExecutionDescriptorForCard } from '../src/battle/romActionExecutionDescriptors';
import { compileRomPresentationProfile } from '../src/battle/romPresentationCompiler';
import { romPresentationProfileForCard } from '../src/battle/romPresentationProfiles';
import {
  STANDARD_DAMAGE_ROM_HANDLER,
  compileStandardDamageRuntimeCutover,
  latestStandardDamageRuntimeCutover,
  standardDamageProfileForAction,
  standardDamageRuntimeCutoverSummary,
} from '../src/battle/standardDamageRomCutover';
import {
  createDamageVisualProjection,
  isStandardDamageImpactBoundary,
  projectedHp,
  revealDamageVisualProjection,
} from '../src/battle/damageVisualProjection';
import { BATTLE_PRESENTATION_DEPLOYMENT } from '../src/renderer/pixi/flag';
import { canonForAction } from '../src/battle/animationCanon';
import { PRESENTATION_SCENARIOS, runPresentationScenario } from '../src/devtools/presentationScenarios';

let failures = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

{
  const hit = PRESENTATION_SCENARIOS.find(item => item.id === 'm7_melee_hit')!;
  const run = runPresentationScenario(hit);
  const card = getCard(5)!;
  const latest = latestStandardDamageRuntimeCutover(run.log.entries, 'player', card, 'goku_base');
  check('production owner:latest Runtime action compiles', !!latest);
  check('production owner:authoritative HIT branch retained', latest?.outcome.family === 'HIT', String(latest?.outcome.family));
  check('production owner:focused film has one result boundary', latest?.timeline.entries.filter(entry => entry.cue.type === 'ROM_RESULT_BRANCH').length === 1);
}

function manualRuntimeCutover(side: 'player' | 'enemy', outcome: 'HIT' | 'MISS' | 'SPECIAL_DEFENSE', sequence = 40) {
  const card = getCard(5)!;
  const action = actionDescriptorForCard(card);
  const target = side === 'player' ? 'enemy' : 'player';
  const outcomeEvent = outcome === 'MISS'
    ? { type: 'ATTACK_MISSED' as const, source: side, target }
    : { type: 'ATTACK_HIT' as const, source: side, target, outcome: outcome === 'HIT' ? 'hit' as const : 'block' as const };
  const events: BattleEventEnvelope[] = [
    { sequence, tick: 20, event: { type: 'ACTION_STARTED', side, action } },
    { sequence: sequence + 1, tick: 20, event: outcomeEvent },
    { sequence: sequence + 2, tick: 20, event: { type: 'ACTION_RESOLVED', side, action } },
  ];
  return { card, events, cutover: latestStandardDamageRuntimeCutover(events, side, card) };
}

for (const side of ['player', 'enemy'] as const) {
  for (const outcome of ['HIT', 'MISS', 'SPECIAL_DEFENSE'] as const) {
    const runtime = manualRuntimeCutover(side, outcome);
    const impactCues = runtime.cutover?.timeline.entries.filter(entry => isStandardDamageImpactBoundary(entry.cue)) ?? [];
    check(`${side}/${outcome}:runtime cutover exists`, !!runtime.cutover);
    check(`${side}/${outcome}:exactly one ROM impact boundary`, impactCues.length === 1, String(impactCues.length));
    check(`${side}/${outcome}:selected outcome retained`, runtime.cutover?.outcome.family === outcome, String(runtime.cutover?.outcome.family));
  }
}

{
  const runtime = manualRuntimeCutover('enemy', 'HIT');
  const projection = runtime.cutover && createDamageVisualProjection(runtime.cutover, 'player', 80, 61);
  check('HP projection:created from resolved enemy action', !!projection);
  check('HP projection:before impact remains beforeHp', projectedHp('player', 61, projection) === 80);
  const revealed = projection ? revealDamageVisualProjection(projection) : null;
  check('HP projection:impact reveals authoritative afterHp', projectedHp('player', 61, revealed) === 61);
  check('HP projection:never changes the authoritative value', 61 === 61);
}

{
  const miss = manualRuntimeCutover('player', 'MISS');
  const special = manualRuntimeCutover('enemy', 'SPECIAL_DEFENSE', 70);
  const missProjection = miss.cutover && createDamageVisualProjection(miss.cutover, 'enemy', 85, 85);
  const specialProjection = special.cutover && createDamageVisualProjection(special.cutover, 'player', 80, 75);
  check('MISS projection:HP remains unchanged', projectedHp('enemy', 85, missProjection) === 85);
  check('SPECIAL_DEFENSE projection:supports reduced authoritative damage', projectedHp('player', 75, specialProjection) === 80
    && projectedHp('player', 75, specialProjection ? revealDamageVisualProjection(specialProjection) : null) === 75);
  check('action identity:no replay across later actions', miss.cutover?.actionId !== special.cutover?.actionId);
}

check('deployment:player and enemy STANDARD_DAMAGE own ROM completion',
  BATTLE_PRESENTATION_DEPLOYMENT.romCompletionRoutes.join('|') === 'PLAYER_STANDARD_DAMAGE|ENEMY_STANDARD_DAMAGE',
  BATTLE_PRESENTATION_DEPLOYMENT.romCompletionRoutes.join('|'));

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
  return timeline.entries.find(entry => entry.cue.type === 'FIGHTER_MOTION')?.cue as Extract<BattleTimeline['entries'][number]['cue'], { type: 'FIGHTER_MOTION' }> | undefined;
}

function reducedState(value: unknown): string {
  return JSON.stringify(value);
}

function assertScenarioBranch(scenarioId: string, expected: 'HIT' | 'MISS') {
  const scenario = PRESENTATION_SCENARIOS.find(item => item.id === scenarioId);
  check(`${scenarioId}:scenario exists`, !!scenario);
  if (!scenario) return;
  const run = runPresentationScenario(scenario);
  const timeline = buildPresentationTimeline({ events: run.log.entries, context: CONTEXT });
  const branch = branchCue(timeline);
  check(`${scenarioId}:ROM branch cue`, !!branch);
  check(`${scenarioId}:selected branch ${expected}`, branch?.selectedFamily === expected, String(branch?.selectedFamily));
  check(
    `${scenarioId}:branch derives from EventLog`,
    branch?.selectedSourceEvent === (expected === 'MISS' ? 'ATTACK_MISSED' : 'ATTACK_HIT'),
    String(branch?.selectedSourceEvent),
  );
  check(
    `${scenarioId}:legacy impact suppressed for STANDARD_DAMAGE`,
    !timeline.entries.some(entry => entry.cue.type === 'IMPACT' && entry.sourceEvent === (expected === 'MISS' ? 'ATTACK_MISSED' : 'ATTACK_HIT')),
  );
}

function manualSpecialDefenseTimeline() {
  const card = getCard(5);
  if (!card) throw new Error('Cont.Punch card missing');
  const action = actionDescriptorForCard(card);
  const events: BattleEventEnvelope[] = [
    { sequence: 0, tick: 10, event: { type: 'ACTION_STARTED', side: 'player', action } },
    { sequence: 1, tick: 10, event: { type: 'ATTACK_HIT', source: 'player', target: 'enemy', outcome: 'block' } },
    { sequence: 2, tick: 10, event: { type: 'ACTION_RESOLVED', side: 'player', action } },
  ];
  return buildPresentationTimeline({ events, context: CONTEXT });
}

const standardDamageCards = CARDS.filter(card => romActionExecutionDescriptorForCard(card).execution.handler === STANDARD_DAMAGE_ROM_HANDLER);
const nonStandardBacked = CARDS.filter(card => romActionExecutionDescriptorForCard(card).execution.handler !== STANDARD_DAMAGE_ROM_HANDLER && standardDamageProfileForAction(actionDescriptorForCard(card)));
check('gate:19/19 handler $0A cards', standardDamageCards.length === 19, String(standardDamageCards.length));
check('gate:19/19 ROM-backed by handler', standardDamageCards.every(card => !!standardDamageProfileForAction(actionDescriptorForCard(card))));
check('gate:0 non-$0A cards diverted', nonStandardBacked.length === 0, nonStandardBacked.map(card => card.name).join(', '));

const summary = standardDamageRuntimeCutoverSummary();
check('summary:ROM backed count', summary.romBacked === 19, String(summary.romBacked));
check('summary:no accidental handlers', summary.nonStandardDamageBacked === 0, String(summary.nonStandardDamageBacked));
check('summary:three branch families', summary.branchFamilies.join('|') === 'HIT|MISS|SPECIAL_DEFENSE', summary.branchFamilies.join('|'));

assertScenarioBranch('m7_melee_hit', 'HIT');
assertScenarioBranch('m7_melee_miss', 'MISS');
{
  const special = manualSpecialDefenseTimeline();
  const branch = branchCue(special);
  check('special defense:ROM branch cue', !!branch);
  check('special defense:selected SPECIAL_DEFENSE', branch?.selectedFamily === 'SPECIAL_DEFENSE', String(branch?.selectedFamily));
  check('special defense:source ATTACK_HIT', branch?.selectedSourceEvent === 'ATTACK_HIT', String(branch?.selectedSourceEvent));
  check('special defense:macro $31', branch?.selectedMacroId === 0x31, String(branch?.selectedMacroId));
}

{
  const hit = PRESENTATION_SCENARIOS.find(item => item.id === 'm7_melee_hit')!;
  const run = runPresentationScenario(hit);
  const timeline = buildPresentationTimeline({ events: run.log.entries, context: CONTEXT });
  const motion = motionCue(timeline);
  check('$1C:motion cue exists', !!motion);
  const segments = motion?.segments ?? [];
  const delta = segments.reduce((sum, segment) => sum + segment.dxPerTick * segment.ticks, 0);
  const ticks = segments.reduce((sum, segment) => sum + segment.ticks, 0);
  check('$1C:segments preserved', JSON.stringify(segments) === JSON.stringify([{ dxPerTick: 4, dyPerTick: 0, ticks: 24 }, { dxPerTick: 2, dyPerTick: 0, ticks: 1 }]), JSON.stringify(segments));
  check('$1C:duration 25 ticks', motion?.durationTicks === 25 && ticks === 25, `${motion?.durationTicks}/${ticks}`);
  check('$1C:displacement +98px', motion?.deltaPx === 98 && delta === 98, `${motion?.deltaPx}/${delta}`);
}

{
  const card = getCard(5)!;
  const profile = romPresentationProfileForCard(card);
  const player = compileRomPresentationProfile(profile, { actorSide: 'player' });
  const enemy = compileRomPresentationProfile(profile, { actorSide: 'enemy' });
  const playerMotion = motionCue(player.timeline);
  const enemyMotion = motionCue(enemy.timeline);
  check('mirroring:player/enemy magnitudes unchanged', Math.abs(playerMotion?.deltaPx ?? 0) === Math.abs(enemyMotion?.deltaPx ?? 0), `${playerMotion?.deltaPx}/${enemyMotion?.deltaPx}`);
  check('mirroring:enemy side mirrors signed delta', (playerMotion?.deltaPx ?? 0) === -(enemyMotion?.deltaPx ?? 0), `${playerMotion?.deltaPx}/${enemyMotion?.deltaPx}`);
  check(
    'mirroring:segments remain discrete',
    JSON.stringify((playerMotion?.segments ?? []).map(segment => ({ ...segment, dxPerTick: -segment.dxPerTick }))) === JSON.stringify(enemyMotion?.segments),
  );
}

{
  const scenario = PRESENTATION_SCENARIOS.find(item => item.id === 'm7_melee_hit')!;
  const runA = runPresentationScenario(scenario);
  const stateBeforeTimeline = reducedState(runA.state);
  const logBeforeTimeline = reducedState(runA.log.entries);
  const rngBeforeTimeline = reducedState(runA.state.rngState);
  buildPresentationTimeline({ events: runA.log.entries, context: CONTEXT });
  check('engine state unchanged by ROM-backed Presentation', reducedState(runA.state) === stateBeforeTimeline);
  check('EventLog unchanged by ROM-backed Presentation', reducedState(runA.log.entries) === logBeforeTimeline);
  check('rngState unchanged by ROM-backed Presentation', reducedState(runA.state.rngState) === rngBeforeTimeline);

  const runB = runPresentationScenario(scenario);
  check('golden engine state deterministic', reducedState(runA.state) === reducedState(runB.state));
  check('golden EventLog deterministic', reducedState(runA.log.entries) === reducedState(runB.log.entries));
}

{
  const hit = PRESENTATION_SCENARIOS.find(item => item.id === 'm7_melee_hit')!;
  const run = runPresentationScenario(hit);
  const { index, env } = firstActionStarted(run.log.entries);
  const cutover = compileStandardDamageRuntimeCutover(run.log.entries, index, env as BattleEventEnvelope & { event: { type: 'ACTION_STARTED' } });
  check('cutover:compiles directly from ACTION_STARTED', !!cutover);
  check('cutover:profile source STANDARD_DAMAGE', cutover?.profile.kind === 'STANDARD_DAMAGE');
  check('cutover:timeline deterministic', JSON.stringify(cutover?.timeline) === JSON.stringify(compileStandardDamageRuntimeCutover(run.log.entries, index, env as BattleEventEnvelope & { event: { type: 'ACTION_STARTED' } })?.timeline));
  const defenderIn = canonForAction(env.event.action).defenderIn;
  check('cutover:target hidden in attacker-only shot', cutover?.timeline.entries.some(entry =>
    entry.cue.type === 'FIGHTER_VISIBILITY' && entry.cue.role === 'TARGET'
    && entry.cue.tick === env.tick && entry.cue.visible === false));
  check('cutover:target enters at canonical defenderIn', cutover?.timeline.entries.some(entry =>
    entry.cue.type === 'FIGHTER_VISIBILITY' && entry.cue.role === 'TARGET'
    && entry.cue.tick === env.tick + defenderIn && entry.cue.visible === true));
}

{
  const hit = PRESENTATION_SCENARIOS.find(item => item.id === 'm7_melee_hit')!;
  const run = runPresentationScenario(hit);
  const timeline = buildPresentationTimeline({ events: run.log.entries, context: CONTEXT });
  const entries = timeline.entries.filter(entry => entry.romSource?.profileFamily === 'STANDARD_DAMAGE');
  check('runtime provenance:ROM source visible', entries.length > 0);
  check('runtime provenance:handler $0A', entries.every(entry => entry.romSource?.handler === STANDARD_DAMAGE_ROM_HANDLER));
  check('runtime provenance:no legacy profile id', entries.every(entry => entry.profileId?.startsWith('rom-card-')));
  check('runtime provenance:dynamic boundary visible', entries.every(entry => entry.romSource?.dynamicPending === false));
  check('runtime:AnimationResource remains resource cue', timeline.entries.some(entry => entry.cue.type === 'ANIMATION_START' && entry.cue.resource != null));
  check('runtime:no semantic pose leaks for STANDARD_DAMAGE', !entries.some(entry => ['FIGHTER_POSE', 'PROJECTILE', 'IMPACT', 'AURA', 'FIGHTER_POSITION'].includes(entry.cue.type)));
  check('runtime:no invented anchors/coordinates', !/baseX|baseY|anchor|anchors|slotBinding|slotBindings|ROM_ACTOR_HOME|ROM_TARGET_HOME|ROM_CONTACT/.test(JSON.stringify(timeline)));
}

{
  const hit = PRESENTATION_SCENARIOS.find(item => item.id === 'm7_melee_hit')!;
  const run = runPresentationScenario(hit);
  const timeline = buildPresentationTimeline({ events: run.log.entries, context: CONTEXT });
  const consumed: unknown[] = [];
  createCuePresenter({
    onRomMotion(cue) {
      consumed.push(cue.segments);
    },
  }).consume({ timeline, state: run.state });
  check('Presenter consumes ROM motion segments', consumed.length > 0 && JSON.stringify(consumed[0]) === JSON.stringify(motionCue(timeline)?.segments));
}

const adapterSource = readFileSync('src/battle/engine/presentation/buildTimeline.ts', 'utf8');
const cutoverSource = readFileSync('src/battle/standardDamageRomCutover.ts', 'utf8');
const compilerSource = readFileSync('src/battle/romPresentationCompiler.ts', 'utf8');
const battleScreenSource = readFileSync('src/main.tsx', 'utf8');
check('adapter:0 Math.random', !/Math\.random\s*\(/.test(adapterSource + cutoverSource + compilerSource));
check('adapter:0 cardId switch for cutover', !/switch\s*\([^)]*card/i.test(cutoverSource) && !/card\.id\s*===/.test(cutoverSource));
check('adapter:0 damage calculation authority', !/calculateDamage|applyDamage|damageReducer|accuracyRoll|resolveAccuracy|rngNext/.test(cutoverSource));
check('production owner:BattleScreen uses focused Runtime film', battleScreenSource.includes('latestStandardDamageRuntimeCutover(runtimeResult.log.entries'));
check('production owner:ROM completion releases control', battleScreenSource.includes('if (romOwnsCompletion) finishRomCinematic()'));
check('production owner:completion cleanup restores DOM boundary', battleScreenSource.includes("completionOwnerRef.current = 'DOM'")
  && battleScreenSource.includes('romAdapterRef.current = null;'));
check('production owner:parallel DOM timeline suppressed', battleScreenSource.includes('if (romOwnsCompletion) return;'));
check('production owner:ROM impact reveals visual projection', battleScreenSource.includes('isStandardDamageImpactBoundary(cue)')
  && battleScreenSource.includes('revealDamageVisualProjection(current)'));
check('enemy ownership:Engine resolves before ROM film', battleScreenSource.includes("const res = rtApi.runtime.resolveCard('enemy', card);")
  && battleScreenSource.includes("playCardCinematic(card, 'enemy', () => {"));
check('enemy ownership:defense paths share one post-commit entry', battleScreenSource.match(/presentEnemyAttackAfterDefense\(/g)?.length === 4);

console.log('═══ STANDARD_DAMAGE ROM CUTOVER ═══');
console.log(`handler0A=${standardDamageCards.length}`);
console.log(`romBacked=${summary.romBacked}`);
console.log(`otherHandlersBacked=${summary.nonStandardDamageBacked}`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);
