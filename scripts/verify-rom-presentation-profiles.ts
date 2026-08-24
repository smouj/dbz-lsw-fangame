import { CARDS } from '../src/data/cards';
import {
  PHYSICAL_RESOLUTION_MACROS,
  ROM_BEAM_SETUP_MOTION,
  ROM_RUSH_MOTION,
} from '../src/battle/engine/rom/romDescriptors';
import { romActionExecutionDescriptorForCard } from '../src/battle/romActionExecutionDescriptors';
import {
  ROM_PRESENTATION_PROFILES,
  romPresentationProfileForCard,
  romPresentationProfileSummary,
  type RomPresentationProfile,
  type RomPresentationStep,
} from '../src/battle/romPresentationProfiles';

let failures = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function walkKeys(value: unknown, path = 'profile'): string[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap((item, index) => walkKeys(item, `${path}[${index}]`));
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => [
    `${path}.${key}`,
    ...walkKeys(nested, `${path}.${key}`),
  ]);
}

function assertNoDynamicCoordinates(profile: RomPresentationProfile) {
  const forbidden = new Set([
    'baseX',
    'baseY',
    'anchor',
    'anchors',
    'slotBinding',
    'slotBindings',
    'coordinates',
    'absoluteCoordinates',
  ]);
  const bad = walkKeys(profile).filter(path => forbidden.has(path.split('.').at(-1) ?? ''));
  check(`card:${profile.cardId}:no dynamic coordinates/anchors`, bad.length === 0, bad.slice(0, 8).join(', '));
}

function assertIntegerTicks(profile: RomPresentationProfile) {
  for (const step of profile.program) {
    if (step.tick != null) {
      check(`card:${profile.cardId}:${step.id}:tick integer`, Number.isInteger(step.tick), String(step.tick));
    }
    if (step.durationTicks != null) {
      check(`card:${profile.cardId}:${step.id}:duration integer`, Number.isInteger(step.durationTicks), String(step.durationTicks));
      check(`card:${profile.cardId}:${step.id}:duration positive`, step.durationTicks > 0, String(step.durationTicks));
    }
    if (step.kind === 'ROM_MOTION') {
      check(`card:${profile.cardId}:${step.id}:motion present`, !!step.motion);
      for (const segment of step.motion?.motion.segments ?? []) {
        check(`card:${profile.cardId}:${step.id}:motion ticks integer`, Number.isInteger(segment.ticks) && segment.ticks > 0, String(segment.ticks));
        check(`card:${profile.cardId}:${step.id}:motion dx integer`, Number.isInteger(segment.dxPerTick), String(segment.dxPerTick));
        check(`card:${profile.cardId}:${step.id}:motion dy integer`, Number.isInteger(segment.dyPerTick), String(segment.dyPerTick));
      }
      check(`card:${profile.cardId}:${step.id}:no lerp label`, !/lerp|easing/i.test(step.label), step.label);
    }
  }
}

function assertDescriptorDerivation(profile: RomPresentationProfile) {
  const descriptor = romActionExecutionDescriptorForCard(CARDS.find(card => card.id === profile.cardId)!);
  check(`card:${profile.cardId}:handler matches descriptor`, profile.execution.handler === descriptor.execution.handler, `${profile.execution.handler}/${descriptor.execution.handler}`);
  check(`card:${profile.cardId}:worker family matches descriptor`, profile.execution.family === descriptor.execution.workerFamily, `${profile.execution.family}/${descriptor.execution.workerFamily}`);
  check(`card:${profile.cardId}:actor resource matches descriptor`, profile.dependencies.animationResource === descriptor.actorAnimation.resource, `${profile.dependencies.animationResource}/${descriptor.actorAnimation.resource}`);
  check(`card:${profile.cardId}:FX matches descriptor`, profile.dependencies.fxResource === descriptor.visualEffect.resource, `${profile.dependencies.fxResource}/${descriptor.visualEffect.resource}`);
  check(`card:${profile.cardId}:palette matches descriptor`, profile.dependencies.palette === descriptor.visualEffect.palette, `${profile.dependencies.palette}/${descriptor.visualEffect.palette}`);
  check(`card:${profile.cardId}:source descriptor card`, profile.sourceDescriptor.cardId === descriptor.cardId, `${profile.sourceDescriptor.cardId}/${descriptor.cardId}`);
  check(`card:${profile.cardId}:source descriptor handler`, profile.sourceDescriptor.handler === descriptor.execution.handler, `${profile.sourceDescriptor.handler}/${descriptor.execution.handler}`);

  if (profile.kind !== 'STANDARD_DAMAGE') {
    check(
      `card:${profile.cardId}:branches derive from descriptor`,
      JSON.stringify(profile.resultBranches) === JSON.stringify(descriptor.result.branches),
      `${profile.resultBranches.length}/${descriptor.result.branches.length}`,
    );
  }
}

function assertBranches(profile: RomPresentationProfile) {
  if (profile.kind === 'STANDARD_DAMAGE') {
    const macros = new Set(profile.resultBranches.map(branch => branch.macroId));
    check(`card:${profile.cardId}:damage hit branch`, macros.has(PHYSICAL_RESOLUTION_MACROS.hit));
    check(`card:${profile.cardId}:damage miss branch`, macros.has(PHYSICAL_RESOLUTION_MACROS.miss));
    check(`card:${profile.cardId}:damage special defense branch`, macros.has(PHYSICAL_RESOLUTION_MACROS.specialDefense));
    check(
      `card:${profile.cardId}:damage branch source`,
      profile.resultBranches.every(branch => branch.source === 'PHYSICAL_RESOLUTION_MACROS' && branch.evidence === 'ROM_HANDLER_VERIFIED'),
      profile.resultBranches.map(branch => `${branch.source}/${branch.evidence}`).join(','),
    );
  }

  check(
    `card:${profile.cardId}:branch evidence bounded`,
    profile.resultBranches.every(branch => branch.evidence === 'ROM_HANDLER_VERIFIED' || branch.evidence === 'ROM_DEFENSE_RULE_VERIFIED'),
    profile.resultBranches.map(branch => branch.evidence).join(','),
  );
}

function assertResourceRefs(profile: RomPresentationProfile) {
  for (const step of profile.program) {
    if (step.kind === 'START_ANIMATION') {
      check(`card:${profile.cardId}:${step.id}:animation ref mirrors dependency`, step.resource === profile.dependencies.animationResource, `${step.resource}/${profile.dependencies.animationResource}`);
    }
    if (step.kind === 'SPAWN_FX') {
      check(`card:${profile.cardId}:${step.id}:FX ref mirrors dependency`, step.fxResource === profile.dependencies.fxResource, `${step.fxResource}/${profile.dependencies.fxResource}`);
      check(`card:${profile.cardId}:${step.id}:palette ref mirrors dependency`, step.palette === profile.dependencies.palette, `${step.palette}/${profile.dependencies.palette}`);
    }
  }
}

function assertKnownMotion(profile: RomPresentationProfile) {
  const motionSteps = profile.program.filter(step => step.kind === 'ROM_MOTION');
  for (const step of motionSteps) {
    const encoded = JSON.stringify(step.motion?.motion);
    if (step.motion?.kind === 'RUSH') {
      check(`card:${profile.cardId}:rush motion canonical`, encoded === JSON.stringify(ROM_RUSH_MOTION), encoded);
    }
    if (step.motion?.kind === 'BEAM_SETUP') {
      check(`card:${profile.cardId}:beam setup motion canonical`, encoded === JSON.stringify(ROM_BEAM_SETUP_MOTION), encoded);
    }
  }
}

function assertPendingVisible(profile: RomPresentationProfile) {
  const pendingStep = profile.program.some(step => step.kind === 'PENDING_ROM_TRACE');
  if (profile.completion.dynamic === 'PENDING_ROM_TRACE') {
    check(`card:${profile.cardId}:dynamic pending has visible step/pending`, pendingStep || profile.completion.pending.length > 0);
  }
  if (profile.completion.static === 'PARTIAL') {
    check(
      `card:${profile.cardId}:static partial has visible reason`,
      profile.program.some(step => step.kind === 'PENDING_STATIC_DECODE') || profile.completion.pending.length > 0,
    );
  }
}

function assertNoLegacyInferred(profile: RomPresentationProfile) {
  const bad = profile.program.filter(step => /cardsCinematic|actionProfiles|legacy|INFERRED|REMAKE/i.test(`${step.source} ${step.label} ${step.evidence}`));
  check(`card:${profile.cardId}:no legacy inferred source`, bad.length === 0, bad.map(step => `${step.id}:${step.source}`).join(','));
}

const ids = ROM_PRESENTATION_PROFILES.map(profile => profile.cardId);
check('profiles:125/125', ROM_PRESENTATION_PROFILES.length === CARDS.length, `${ROM_PRESENTATION_PROFILES.length}/${CARDS.length}`);
check('profiles:unique card ids', new Set(ids).size === ids.length, `${new Set(ids).size}/${ids.length}`);

for (const card of CARDS) {
  const profile = romPresentationProfileForCard(card);
  check(`card:${card.id}:profile exists`, !!profile);
  check(`card:${card.id}:program explicit`, profile.program.length > 0);
  assertDescriptorDerivation(profile);
  assertResourceRefs(profile);
  assertIntegerTicks(profile);
  assertKnownMotion(profile);
  assertBranches(profile);
  assertPendingVisible(profile);
  assertNoDynamicCoordinates(profile);
  assertNoLegacyInferred(profile);

  if (profile.kind === 'NONE') {
    check(`card:${card.id}:NONE step explicit`, profile.program.length === 1 && profile.program[0].kind === 'NONE');
  }
  if (profile.kind === 'UNKNOWN_HANDLER') {
    check(`card:${card.id}:UNKNOWN stays pending`, profile.completion.static === 'PARTIAL' || profile.completion.dynamic === 'PENDING_ROM_TRACE');
  }
}

const summary = romPresentationProfileSummary();
const kindTotal = Object.values(summary.byKind).reduce((sum, count) => sum + count, 0);
check('summary:cards', summary.cards === 125, String(summary.cards));
check('summary:kind total', kindTotal === summary.cards, `${kindTotal}/${summary.cards}`);
check('summary:standard damage pilot present', summary.standardDamage > 0, String(summary.standardDamage));
check('summary:motion profiles present', summary.profilesWithMotion > 0, String(summary.profilesWithMotion));
check('summary:branches present', summary.profilesWithBranches > 0, String(summary.profilesWithBranches));
check('summary:none explicit', summary.none > 0, String(summary.none));

console.log('═══ ROM-DERIVED PRESENTATION PROFILES ═══');
console.log(`cards=${summary.cards}`);
console.log(`completeStatic=${summary.completeStatic}`);
console.log(`partialStatic=${summary.partialStatic}`);
console.log(`dynamicPending=${summary.dynamicPending}`);
console.log(`profilesWithBranches=${summary.profilesWithBranches}`);
console.log(`profilesWithMotion=${summary.profilesWithMotion}`);
console.log(`kinds=${Object.entries(summary.byKind).map(([k, v]) => `${k}:${v}`).join(' · ')}`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);
