import { readFileSync } from 'node:fs';
import { CARDS } from '../src/data/cards';
import {
  compileAllRomPresentationProfiles,
  compileRomPresentationProfile,
  romPresentationCompilerSummary,
  type CompiledRomPresentationProfile,
} from '../src/battle/romPresentationCompiler';
import { ROM_PRESENTATION_PROFILES, romPresentationProfileByCardId } from '../src/battle/romPresentationProfiles';

let failures = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function walkKeys(value: unknown, path = 'compiled'): string[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap((item, index) => walkKeys(item, `${path}[${index}]`));
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => [
    `${path}.${key}`,
    ...walkKeys(nested, `${path}.${key}`),
  ]);
}

function assertNoDynamicCoordinates(compiled: CompiledRomPresentationProfile) {
  const forbidden = new Set([
    'baseX',
    'baseY',
    'anchor',
    'anchors',
    'slotBinding',
    'slotBindings',
    'absoluteCoordinates',
  ]);
  const bad = walkKeys(compiled).filter(path => forbidden.has(path.split('.').at(-1) ?? ''));
  check(`card:${compiled.cardId}:no BASE/anchors/slot bindings`, bad.length === 0, bad.slice(0, 8).join(', '));
}

function assertTimelineDeterministic(profileId: number) {
  const profile = romPresentationProfileByCardId(profileId);
  check(`fixture:${profileId}:profile exists`, !!profile);
  if (!profile) return;
  const a = compileRomPresentationProfile(profile);
  const b = compileRomPresentationProfile(profile);
  check(`fixture:${profileId}:deterministic`, JSON.stringify(a) === JSON.stringify(b));
}

function assertOrderAndTicks(compiled: CompiledRomPresentationProfile) {
  let lastTick = -Infinity;
  for (const [index, entry] of compiled.timeline.entries.entries()) {
    check(`card:${compiled.cardId}:entry:${index}:tick integer`, Number.isInteger(entry.cue.tick), String(entry.cue.tick));
    check(`card:${compiled.cardId}:entry:${index}:stable order`, entry.cue.tick >= lastTick, `${entry.cue.tick}/${lastTick}`);
    lastTick = entry.cue.tick;
    if ('durationTicks' in entry.cue) {
      check(`card:${compiled.cardId}:entry:${index}:duration integer`, Number.isInteger(entry.cue.durationTicks), String(entry.cue.durationTicks));
      check(`card:${compiled.cardId}:entry:${index}:duration positive`, entry.cue.durationTicks > 0, String(entry.cue.durationTicks));
    }
    check(`card:${compiled.cardId}:entry:${index}:profile id`, entry.profileId === compiled.profileId, `${entry.profileId}/${compiled.profileId}`);
  }
  check(`card:${compiled.cardId}:timeline bounds`, compiled.timeline.endTick >= compiled.timeline.startTick, `${compiled.timeline.startTick}/${compiled.timeline.endTick}`);
}

function assertNoSemanticLeak(compiled: CompiledRomPresentationProfile) {
  const forbiddenCueTypes = new Set(['FIGHTER_POSE', 'PROJECTILE', 'IMPACT', 'AURA', 'FIGHTER_POSITION']);
  const bad = compiled.timeline.entries.filter(entry => forbiddenCueTypes.has(entry.cue.type));
  check(`card:${compiled.cardId}:no semantic cue leak`, bad.length === 0, bad.map(entry => entry.cue.type).join(','));
}

function assertProfileDerivation(compiled: CompiledRomPresentationProfile) {
  const source = romPresentationProfileByCardId(compiled.cardId);
  check(`card:${compiled.cardId}:source profile exists`, !!source);
  if (!source) return;
  check(`card:${compiled.cardId}:kind mirrors profile`, compiled.kind === source.kind, `${compiled.kind}/${source.kind}`);
  check(`card:${compiled.cardId}:dependencies by reference`, compiled.dependencies === source.dependencies);
  check(`card:${compiled.cardId}:static completion mirrors`, compiled.completion.static === source.completion.static, `${compiled.completion.static}/${source.completion.static}`);
  check(`card:${compiled.cardId}:dynamic completion mirrors`, compiled.completion.dynamic === source.completion.dynamic, `${compiled.completion.dynamic}/${source.completion.dynamic}`);
}

function assertResourcesAndBranches(compiled: CompiledRomPresentationProfile) {
  const source = romPresentationProfileByCardId(compiled.cardId);
  if (!source) return;
  const animStarts = compiled.timeline.entries.filter(entry => entry.cue.type === 'ANIMATION_START').map(entry => entry.cue.resource);
  for (const resource of animStarts) {
    check(`card:${compiled.cardId}:animation resource mirrors profile`, resource === source.dependencies.animationResource, `${resource}/${source.dependencies.animationResource}`);
  }
  const fxLoads = compiled.timeline.entries.filter(entry => entry.cue.type === 'FX_LOAD').map(entry => entry.cue);
  for (const fx of fxLoads) {
    check(`card:${compiled.cardId}:FX resource mirrors profile`, fx.resource === source.dependencies.fxResource, `${fx.resource}/${source.dependencies.fxResource}`);
    check(`card:${compiled.cardId}:FX palette mirrors profile`, fx.palette === source.dependencies.palette, `${fx.palette}/${source.dependencies.palette}`);
  }
  const branchCues = compiled.timeline.entries.filter(entry => entry.cue.type === 'ROM_RESULT_BRANCH').map(entry => entry.cue);
  for (const cue of branchCues) {
    check(`card:${compiled.cardId}:branch count mirrors profile`, cue.branches.length === source.resultBranches.length, `${cue.branches.length}/${source.resultBranches.length}`);
    check(
      `card:${compiled.cardId}:branch macros mirror profile`,
      JSON.stringify(cue.branches.map(branch => branch.macroId)) === JSON.stringify(source.resultBranches.map(branch => branch.macroId)),
    );
  }
}

function assertMotionPreserved(compiled: CompiledRomPresentationProfile) {
  for (const entry of compiled.timeline.entries) {
    if (entry.cue.type !== 'FIGHTER_MOTION') continue;
    check(`card:${compiled.cardId}:motion has discrete segments`, Array.isArray(entry.cue.segments) && entry.cue.segments.length > 0);
    const fromSegments = (entry.cue.segments ?? []).reduce((sum, segment) => sum + segment.dxPerTick * segment.ticks, 0);
    check(`card:${compiled.cardId}:motion delta from segments`, fromSegments === entry.cue.deltaPx, `${fromSegments}/${entry.cue.deltaPx}`);
    check(
      `card:${compiled.cardId}:motion segment ticks integer`,
      (entry.cue.segments ?? []).every(segment => Number.isInteger(segment.ticks) && segment.ticks > 0),
    );
  }
}

function assertPendingVisible(compiled: CompiledRomPresentationProfile) {
  const pendingCues = compiled.timeline.entries.filter(entry => entry.cue.type === 'ROM_PENDING');
  if (compiled.completion.static === 'PARTIAL' || compiled.completion.dynamic === 'PENDING_ROM_TRACE') {
    check(`card:${compiled.cardId}:partial/dynamic pending visible`, compiled.completion.pending.length > 0 || pendingCues.length > 0);
  }
  if (compiled.completion.dynamic === 'PENDING_ROM_TRACE') {
    check(`card:${compiled.cardId}:dynamic pending cue bounded`, pendingCues.some(entry => entry.cue.boundary === 'DYNAMIC') || compiled.completion.pending.length > 0);
  }
}

const compiled = compileAllRomPresentationProfiles();
const ids = compiled.map(item => item.cardId);
check('compiler:125/125', compiled.length === CARDS.length, `${compiled.length}/${CARDS.length}`);
check('compiler:unique ids', new Set(ids).size === ids.length, `${new Set(ids).size}/${ids.length}`);
check('compiler:source profiles untouched count', ROM_PRESENTATION_PROFILES.length === CARDS.length, `${ROM_PRESENTATION_PROFILES.length}/${CARDS.length}`);

for (const item of compiled) {
  assertProfileDerivation(item);
  assertOrderAndTicks(item);
  assertNoSemanticLeak(item);
  assertNoDynamicCoordinates(item);
  assertResourcesAndBranches(item);
  assertMotionPreserved(item);
  assertPendingVisible(item);
}

// Structural fixtures: keep them at ROM cue level, not final semantic timeline.
assertTimelineDeterministic(1);   // support/no-op style resource surface
assertTimelineDeterministic(12);  // Kamehameha / BEAM_BASE
assertTimelineDeterministic(27);  // standard damage family
assertTimelineDeterministic(45);  // defense rule
assertTimelineDeterministic(66);  // projectile/special-ish family where present

const source = readFileSync('src/battle/romPresentationCompiler.ts', 'utf8');
check('compiler:no CardDef switch', !/switch\s*\([^)]*card/i.test(source) && !/from '\.\.\/data\/cards'/.test(source));
check('compiler:no legacy actionProfiles authority', !/actionProfiles|cardsCinematic|resolveActionProfile/i.test(source));
check('compiler:no semantic pose strings', !/beam_charge|beam_fire|attack_fwd|knockback|idle|hurt/i.test(source));
check('compiler:no lerp/easing', !/lerp|easing/i.test(source));

const summary = romPresentationCompilerSummary();
check('summary:cards', summary.cards === 125, String(summary.cards));
check('summary:compilable', summary.compilable === 125, String(summary.compilable));
check('summary:no semantic cue leaks', summary.semanticCueLeaks === 0, String(summary.semanticCueLeaks));
check('summary:motion present', summary.timelinesWithMotion > 0, String(summary.timelinesWithMotion));
check('summary:branches present', summary.timelinesWithBranches > 0, String(summary.timelinesWithBranches));

console.log('═══ ROM PRESENTATION COMPILER ═══');
console.log(`cards=${summary.cards}`);
console.log(`compilable=${summary.compilable}`);
console.log(`complete=${summary.complete}`);
console.log(`partial=${summary.partial}`);
console.log(`dynamicPending=${summary.dynamicPending}`);
console.log(`totalCues=${summary.totalCues}`);
console.log(`timelinesWithMotion=${summary.timelinesWithMotion}`);
console.log(`timelinesWithBranches=${summary.timelinesWithBranches}`);
console.log(`pendingCues=${summary.pendingCues}`);
console.log(`semanticCueLeaks=${summary.semanticCueLeaks}`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);
