import { CARDS } from '../src/data/cards';
import { romCardData } from '../src/data/romCardData';
import { animationResourceById } from '../src/battle/animationResources';
import {
  ROM_ACTION_EXECUTION_DESCRIPTORS,
  romActionExecutionDescriptorForCard,
  romActionExecutionSummary,
  type RomActionExecutionDescriptor,
} from '../src/battle/romActionExecutionDescriptors';

let failures = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function expectedResource(value: number): number | null {
  return value === 0xff ? null : value;
}

function walkKeys(value: unknown, path = 'descriptor'): string[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap((item, index) => walkKeys(item, `${path}[${index}]`));
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => [
    `${path}.${key}`,
    ...walkKeys(nested, `${path}.${key}`),
  ]);
}

function assertNoDynamicCoordinates(descriptor: RomActionExecutionDescriptor) {
  const forbidden = new Set([
    'x',
    'y',
    'baseX',
    'baseY',
    'anchor',
    'anchors',
    'slotBinding',
    'slotBindings',
    'coordinates',
    'absoluteCoordinates',
  ]);
  const bad = walkKeys(descriptor).filter(path => forbidden.has(path.split('.').at(-1) ?? ''));
  check(`card:${descriptor.cardId}:no dynamic coordinates`, bad.length === 0, bad.slice(0, 8).join(', '));
}

function assertNoFrameDuplication(descriptor: RomActionExecutionDescriptor) {
  const keys = walkKeys(descriptor);
  const bad = keys.filter(path => /\.(frames|raw|durationTicks|offsetX|offsetY)$/.test(path));
  check(`card:${descriptor.cardId}:no copied physical frame stream`, bad.length === 0, bad.slice(0, 8).join(', '));
  check(
    `card:${descriptor.cardId}:sequence source is reference`,
    !descriptor.actorAnimation.sequenceSource || descriptor.actorAnimation.sequenceSource.module === 'animationResources.ts',
    descriptor.actorAnimation.sequenceSource?.module,
  );
}

const ids = ROM_ACTION_EXECUTION_DESCRIPTORS.map(descriptor => descriptor.cardId);
check('descriptors:125/125', ROM_ACTION_EXECUTION_DESCRIPTORS.length === CARDS.length, `${ROM_ACTION_EXECUTION_DESCRIPTORS.length}/${CARDS.length}`);
check('descriptors:unique card ids', new Set(ids).size === ids.length, `${new Set(ids).size}/${ids.length}`);

for (const card of CARDS) {
  const descriptor = romActionExecutionDescriptorForCard(card);
  const rom = romCardData(card.name);
  check(`card:${card.id}:rom data exists`, !!rom);
  if (!rom) continue;

  check(`card:${card.id}:handler matches romCardData`, descriptor.execution.handler === rom.exec, `${descriptor.execution.handler}/${rom.exec}`);
  check(`card:${card.id}:actor resource matches romCardData`, descriptor.actorAnimation.resource === expectedResource(rom.actorAnim), `${descriptor.actorAnimation.resource}/${expectedResource(rom.actorAnim)}`);
  check(`card:${card.id}:FX matches romCardData`, descriptor.visualEffect.resource === expectedResource(rom.fxGraphics), `${descriptor.visualEffect.resource}/${expectedResource(rom.fxGraphics)}`);
  check(`card:${card.id}:palette matches romCardData`, descriptor.visualEffect.palette === expectedResource(rom.fxPalette), `${descriptor.visualEffect.palette}/${expectedResource(rom.fxPalette)}`);

  if (rom.actorAnim === 0xff) {
    check(`card:${card.id}:no artificial actor resource`, descriptor.actorAnimation.resource === null);
    check(`card:${card.id}:no artificial sequence source`, descriptor.actorAnimation.sequenceSource === null);
  } else {
    const resource = animationResourceById(rom.actorAnim);
    check(`card:${card.id}:resource exists`, !!resource, `0x${rom.actorAnim.toString(16)}`);
    check(`card:${card.id}:resource status mirrors catalog`, descriptor.actorAnimation.resourceStatus === (resource?.status ?? 'MISSING'), `${descriptor.actorAnimation.resourceStatus}/${resource?.status}`);
    if (resource) {
      check(`card:${card.id}:resource completion mirrors catalog`, descriptor.actorAnimation.completion === resource.completion);
      check(`card:${card.id}:sequence count mirrors catalog`, descriptor.actorAnimation.sequenceSource?.sequenceCount === resource.sequenceCount, `${descriptor.actorAnimation.sequenceSource?.sequenceCount}/${resource.sequenceCount}`);
      check(`card:${card.id}:frame count mirrors catalog`, descriptor.actorAnimation.sequenceSource?.physicalFrameCount === resource.physicalFrameCount, `${descriptor.actorAnimation.sequenceSource?.physicalFrameCount}/${resource.physicalFrameCount}`);
      if (resource.completion.disposition === 'NEEDS_DYNAMIC_TRACE') {
        check(`card:${card.id}:dynamic resource dependency preserved`, descriptor.handlerScript.steps.some(step => step.evidence === 'PENDING_ROM_TRACE') || descriptor.result.evidence === 'PENDING_ROM_TRACE');
      }
    }
  }

  check(
    `card:${card.id}:result branches are evidenced`,
    descriptor.result.branches.every(branch => branch.evidence === 'ROM_HANDLER_VERIFIED' || branch.evidence === 'ROM_DEFENSE_RULE_VERIFIED'),
    descriptor.result.branches.map(branch => branch.evidence).join(','),
  );
  check(
    `card:${card.id}:semantic branch has source`,
    descriptor.result.branches.every(branch => branch.source.length > 0 && branch.condition.length > 0),
  );
  check(
    `card:${card.id}:pending trace justified`,
    descriptor.result.evidence !== 'PENDING_ROM_TRACE' || descriptor.result.pending.length > 0 || descriptor.handlerScript.steps.some(step => step.evidence === 'PENDING_ROM_TRACE'),
  );
  check(`card:${card.id}:evidence present`, descriptor.evidence.length > 0);
  assertNoDynamicCoordinates(descriptor);
  assertNoFrameDuplication(descriptor);
}

const summary = romActionExecutionSummary();
const resultTotal = Object.values(summary.byResultFamily).reduce((sum, count) => sum + count, 0);

check('summary:cards', summary.cards === 125, String(summary.cards));
check('summary:result families total', resultTotal === summary.cards, `${resultTotal}/${summary.cards}`);
check('summary:missing resources zero', summary.missingResources === 0, String(summary.missingResources));
check('summary:descriptors with known branches', summary.descriptorsWithBranches > 0, String(summary.descriptorsWithBranches));
check('summary:dynamic subset bounded', summary.needsDynamicTrace >= 0 && summary.needsDynamicTrace < summary.cards, String(summary.needsDynamicTrace));

console.log('═══ ROM ACTION EXECUTION DESCRIPTORS ═══');
console.log(`cards=${summary.cards}`);
console.log(`withActorAnimation=${summary.withActorAnimation}`);
console.log(`withFx=${summary.withFx}`);
console.log(`withPalette=${summary.withPalette}`);
console.log(`standardAttackProfiles=${summary.standardAttackProfiles}`);
console.log(`defenseRules=${summary.defenseRules}`);
console.log(`specialHandlers=${summary.specialHandlers}`);
console.log(`descriptorsWithBranches=${summary.descriptorsWithBranches}`);
console.log(`pendingStaticDecode=${summary.pendingStaticDecode}`);
console.log(`needsDynamicTrace=${summary.needsDynamicTrace}`);
console.log(`missingResources=${summary.missingResources}`);
console.log(`resultFamilies=${Object.entries(summary.byResultFamily).map(([k, v]) => `${k}:${v}`).join(' · ')}`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);
