import {
  ANIMATION_RESOURCE_CATALOG,
  animationResourceSummary,
} from '../src/battle/animationResources';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const emptyIds = new Set([0x28, 0x29, 0x2a, 0x40]);

for (const resource of ANIMATION_RESOURCE_CATALOG) {
  const completion = resource.completion;
  check(`resource:${resource.resourceHex}:completion`, !!completion);
  check(`resource:${resource.resourceHex}:statically closed`, completion.disposition === 'STATICALLY_CLOSED', completion.disposition);
  check(`resource:${resource.resourceHex}:no physical dynamic dependency`, completion.dynamicDependencies.length === 0, completion.dynamicDependencies.join(','));
  check(`resource:${resource.resourceHex}:detail`, completion.detail.length >= 40, completion.detail);

  if (emptyIds.has(resource.resourceId)) {
    check(`resource:${resource.resourceHex}:empty status`, resource.status === 'EMPTY', resource.status);
    check(`resource:${resource.resourceHex}:empty cause`, completion.cause === 'EMPTY_RESOURCE_SLOT', completion.cause);
    check(`resource:${resource.resourceHex}:empty frame stream`, resource.sequenceCount === 0 && resource.physicalFrameCount === 0);
  } else {
    check(`resource:${resource.resourceHex}:decoded status`, resource.status === 'DECODED', resource.status);
    check(`resource:${resource.resourceHex}:closed cause`, completion.cause === 'NONE', completion.cause);
    check(`resource:${resource.resourceHex}:sequences`, resource.sequenceCount > 0, String(resource.sequenceCount));
    check(`resource:${resource.resourceHex}:frames`, resource.sequenceFrameInstances > 0, String(resource.sequenceFrameInstances));
  }
}

const summary = animationResourceSummary();
check('summary:resources', summary.resources === 66, String(summary.resources));
check('summary:decoded', summary.decoded === 62, String(summary.decoded));
check('summary:empty', summary.empty === 4, String(summary.empty));
check('summary:all statically closed', summary.staticallyClosed === 66, String(summary.staticallyClosed));
check('summary:no statically closable debt', summary.staticallyClosable === 0, String(summary.staticallyClosable));
check('summary:no resource-level dynamic trace debt', summary.needsDynamicTrace === 0, String(summary.needsDynamicTrace));
check('summary:no static-limit resource', summary.staticLimitReached === 0, String(summary.staticLimitReached));

console.log('═══ ANIMATION RESOURCE STATIC COMPLETION ═══');
console.log(`resources=${summary.resources} decoded=${summary.decoded} empty=${summary.empty}`);
console.log(`staticallyClosed=${summary.staticallyClosed} needsDynamicTrace=${summary.needsDynamicTrace}`);
console.log('NOTE: handler/FSM dynamic semantics remain tracked by action descriptors, not by physical-resource completion.');
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);
