import {
  ANIMATION_RESOURCE_CATALOG,
  animationResourceSummary,
  type AnimationResourceCompletionCause,
  type AnimationResourceCompletionDisposition,
} from '../src/battle/animationResources';

let failures = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const causes: AnimationResourceCompletionCause[] = [
  'NONE',
  'POINTER_TABLE_UNRESOLVED',
  'SEQUENCE_BOUNDARY_UNRESOLVED',
  'SEQUENCE_COUNT_UNRESOLVED',
  'FRAME_STREAM_PARTIAL',
  'METASPRITE_LINK_PENDING',
  'MULTI_SEQUENCE_AMBIGUOUS',
  'HANDLER_SELECTED_SEQUENCE',
  'STATIC_LIMIT_REACHED',
  'UNREFERENCED_RESOURCE',
];

const dispositions: AnimationResourceCompletionDisposition[] = [
  'STATICALLY_CLOSED',
  'STATICALLY_CLOSABLE',
  'STATIC_LIMIT_REACHED',
  'NEEDS_DYNAMIC_TRACE',
];

for (const resource of ANIMATION_RESOURCE_CATALOG) {
  const completion = resource.completion;
  check(`resource:${resource.resourceHex}:completion present`, !!completion);
  check(`resource:${resource.resourceHex}:cause valid`, causes.includes(completion.cause), completion.cause);
  check(`resource:${resource.resourceHex}:disposition valid`, dispositions.includes(completion.disposition), completion.disposition);
  check(`resource:${resource.resourceHex}:detail present`, completion.detail.length >= 24, completion.detail);
  check(`resource:${resource.resourceHex}:dynamic deps explicit`, Array.isArray(completion.dynamicDependencies));

  if (resource.status === 'DECODED') {
    check(`resource:${resource.resourceHex}:decoded cause`, completion.cause === 'NONE', completion.cause);
    check(`resource:${resource.resourceHex}:decoded disposition`, completion.disposition === 'STATICALLY_CLOSED', completion.disposition);
    check(`resource:${resource.resourceHex}:decoded sequences complete`, resource.sequenceCount > 0 && resource.physicalFrameCount > 0);
    check(`resource:${resource.resourceHex}:decoded no dynamic deps`, completion.dynamicDependencies.length === 0, completion.dynamicDependencies.join(','));
  }

  if (resource.status === 'PARTIAL') {
    check(`resource:${resource.resourceHex}:partial cause explicit`, completion.cause !== 'NONE', completion.cause);
    check(`resource:${resource.resourceHex}:partial not static closed`, completion.disposition !== 'STATICALLY_CLOSED', completion.disposition);
    check(`resource:${resource.resourceHex}:partial no decoded frames`, resource.sequenceCount === 0 && resource.physicalFrameCount === 0, `${resource.sequenceCount}/${resource.physicalFrameCount}`);
    check(`resource:${resource.resourceHex}:partial has consumers`, resource.cards.length > 0, String(resource.cards.length));
  }

  if (resource.status === 'SPECIAL') {
    check(`resource:${resource.resourceHex}:special cause`, completion.cause === 'HANDLER_SELECTED_SEQUENCE', completion.cause);
    check(`resource:${resource.resourceHex}:special dynamic justified`, completion.disposition === 'NEEDS_DYNAMIC_TRACE', completion.disposition);
    check(`resource:${resource.resourceHex}:special deps`, completion.dynamicDependencies.length > 0, completion.dynamicDependencies.join(','));
  }

  if (resource.status === 'UNKNOWN') {
    check(`resource:${resource.resourceHex}:unknown cause`, completion.cause === 'UNREFERENCED_RESOURCE', completion.cause);
    check(`resource:${resource.resourceHex}:unknown static limit`, completion.disposition === 'STATIC_LIMIT_REACHED', completion.disposition);
    check(`resource:${resource.resourceHex}:unknown unreferenced`, resource.cards.length === 0, String(resource.cards.length));
  }

  if (completion.disposition === 'NEEDS_DYNAMIC_TRACE') {
    check(`resource:${resource.resourceHex}:dynamic deps required`, completion.dynamicDependencies.length > 0);
    check(
      `resource:${resource.resourceHex}:dynamic deps bounded`,
      completion.dynamicDependencies.every(dep => /handler|slot|runtime|branch|actor/i.test(dep)),
      completion.dynamicDependencies.join(','),
    );
  }

  if (completion.disposition === 'STATICALLY_CLOSABLE') {
    check(`resource:${resource.resourceHex}:static closable has no dynamic deps`, completion.dynamicDependencies.length === 0, completion.dynamicDependencies.join(','));
  }
}

const summary = animationResourceSummary();
const statusTotal = Object.values(summary.byStatus).reduce((sum, count) => sum + count, 0);
const causeTotal = Object.values(summary.byCompletionCause).reduce((sum, count) => sum + count, 0);
const dispositionTotal = Object.values(summary.byCompletionDisposition).reduce((sum, count) => sum + count, 0);

check('summary:resources', summary.resources === 66, String(summary.resources));
check('summary:status total', statusTotal === summary.resources, `${statusTotal}/${summary.resources}`);
check('summary:cause total', causeTotal === summary.resources, `${causeTotal}/${summary.resources}`);
check('summary:disposition total', dispositionTotal === summary.resources, `${dispositionTotal}/${summary.resources}`);
check('summary:partial resources still tracked', summary.partial === 48, String(summary.partial));
check('summary:special resources tracked', summary.special === 5, String(summary.special));
check('summary:unknown resources tracked', summary.unknown === 1, String(summary.unknown));
check('summary:dynamic only justified subset', summary.needsDynamicTrace > 0 && summary.needsDynamicTrace < summary.resources, String(summary.needsDynamicTrace));

console.log('═══ ANIMATION RESOURCE STATIC COMPLETION ═══');
console.log(`resources=${summary.resources}`);
console.log(`decoded=${summary.decoded}`);
console.log(`partial=${summary.partial}`);
console.log(`special=${summary.special}`);
console.log(`unknown=${summary.unknown}`);
console.log(`staticallyClosed=${summary.staticallyClosed}`);
console.log(`staticallyClosable=${summary.staticallyClosable}`);
console.log(`staticLimitReached=${summary.staticLimitReached}`);
console.log(`needsDynamicTrace=${summary.needsDynamicTrace}`);
console.log(`causes=${Object.entries(summary.byCompletionCause).map(([k, v]) => `${k}:${v}`).join(' · ')}`);
console.log(`dispositions=${Object.entries(summary.byCompletionDisposition).map(([k, v]) => `${k}:${v}`).join(' · ')}`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);
