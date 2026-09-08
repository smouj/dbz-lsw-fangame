// ═══════════════════════════════════════════════════════════════════════
// VERIFY: ROM FIGHTER NEUTRAL — Bank $61/resource 0/selector 0
//
// This is a static physical contract.  It proves the ROM coordinates and
// the promoted per-form PNG, but deliberately does not claim a live
// ActionObject capture has dynamically verified the semantic name `idle`.
// ═══════════════════════════════════════════════════════════════════════
import { ROM_BANK61_ANIMATION_CORE } from '../src/data/generated/romAnimationCore.generated';
import { ROM_FIGHTER_FORM_IDENTITY } from '../src/data/generated/romFighterFormIdentity.generated';
import { corpusFrameForContent, physicalIndexCollisions } from '../src/data/romPhysicalFrameIndex';
import { resolveStageProductionFrame } from '../src/battle/productionFrameResolver';

let failures = 0;
let checks = 0;
function check(label: string, condition: boolean, detail?: string): void {
  checks++;
  if (!condition) {
    failures++;
    console.error(`FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`PASS ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const resource = ROM_BANK61_ANIMATION_CORE[0];
const sequence = resource?.sequences[0];
const frame = sequence?.frames[0];

check('Bank $61 resource 0 exists', resource != null);
check('selector 0 exists and has exactly one frame', sequence?.frameCount === 1, `got ${sequence?.frameCount ?? 'none'}`);
check('selector 0 physical frame is vf $00, 3 ticks, dx/dy 0',
  frame?.visualFrameId === 0 && frame.durationTicks === 3 && frame.offsetX === 0 && frame.offsetY === 0,
  frame ? `vf=${frame.visualFrameId} ticks=${frame.durationTicks} dx=${frame.offsetX} dy=${frame.offsetY}` : 'missing frame');
check('physical index has no content collisions', physicalIndexCollisions().length === 0);

if (resource && frame) {
  for (const form of ROM_FIGHTER_FORM_IDENTITY) {
    const physical = corpusFrameForContent({
      profileKey: form.actorVisualProfileKey,
      graphicsBank: form.graphicsBank,
      animationBank: 0x61,
      resourceBase: resource.resourceBase,
      resourceId: null,
      visualFrameId: frame.visualFrameId,
    });
    check(`${form.formId}: Bank $61 neutral physical frame is promoted`, physical != null);
    const resolved = resolveStageProductionFrame({
      formId: form.formId,
      resourceIndex: 0,
      animationBank: 0x61,
      resourceBase: resource.resourceBase,
      sequenceSelector: 0,
      frameIndex: frame.frameIndex,
      visualFrameId: frame.visualFrameId,
      durationTicks: frame.durationTicks,
      offsetX: frame.offsetX,
      offsetY: frame.offsetY,
    });
    check(`${form.formId}: resolver returns ROM_PHYSICAL neutral`, resolved.source === 'ROM_PHYSICAL' && resolved.physicalId === physical?.physicalId);
  }
}

console.log(`\nROM FIGHTER NEUTRAL: ${checks - failures}/${checks} PASS · static physical evidence only`);
process.exit(failures === 0 ? 0 : 1);
