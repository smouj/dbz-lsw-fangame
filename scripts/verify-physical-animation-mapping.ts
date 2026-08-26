import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import {
  PHYSICAL_FRAME_RECONCILIATION,
  physicalFrameReconciliationSummary,
  staticGapCauseForResourceId,
  type PhysicalFrameMappingStatus,
} from '../src/battle/physicalFrameReconciliation';
import { ANIMATION_RESOURCE_CATALOG } from '../src/battle/animationResources';
import { MANIFEST_FRAME_INDEX, manifestFileUsage, manifestFrame, manifestFramesFor } from '../src/data/generated/manifestFrameIndex.generated';

let failures = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function signed(byte: number): number {
  return byte > 127 ? byte - 256 : byte;
}

const ROOT = process.cwd();
const statusValues: PhysicalFrameMappingStatus[] = ['EXACT', 'SHARED', 'COMPOSITE', 'UNRESOLVED'];
const generatedAgain = JSON.stringify(PHYSICAL_FRAME_RECONCILIATION);
const decodedResourceCount = ANIMATION_RESOURCE_CATALOG.filter((r) => r.status === 'DECODED').length;

check('catalog:decoded resources only', PHYSICAL_FRAME_RECONCILIATION.length === decodedResourceCount, String(PHYSICAL_FRAME_RECONCILIATION.length));
check('catalog:deterministic same object', JSON.stringify(PHYSICAL_FRAME_RECONCILIATION) === generatedAgain);
check('manifest index:not empty', MANIFEST_FRAME_INDEX.length > 0, String(MANIFEST_FRAME_INDEX.length));

for (const frame of MANIFEST_FRAME_INDEX) {
  const manifestPath = resolve(ROOT, 'public/assets/sprites', frame.dir, 'manifest.json');
  const framePath = resolve(ROOT, 'public/assets/sprites', frame.dir, frame.file);
  check(`manifest:${frame.formId}:${frame.pose}:${frame.index}:manifest exists`, existsSync(manifestPath), manifestPath);
  check(`manifest:${frame.formId}:${frame.file}:png exists`, existsSync(framePath), framePath);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, { frames?: Array<{ file?: string }> }>;
  check(`manifest:${frame.formId}:${frame.pose}:pose exists`, Array.isArray(manifest[frame.pose]?.frames));
  check(`manifest:${frame.formId}:${frame.pose}:${frame.index}:file matches`, manifest[frame.pose]?.frames?.[frame.index]?.file === frame.file);
}

for (const resource of PHYSICAL_FRAME_RECONCILIATION) {
  const catalog = ANIMATION_RESOURCE_CATALOG.find(entry => entry.resourceId === resource.resourceId);
  check(`resource:${resource.resourceHex}:catalog`, !!catalog);
  check(`resource:${resource.resourceHex}:decoded`, catalog?.status === 'DECODED', catalog?.status);
  check(`resource:${resource.resourceHex}:frames count`, resource.frames.length === catalog?.physicalFrameCount, `${resource.frames.length}/${catalog?.physicalFrameCount}`);
  check(`resource:${resource.resourceHex}:gap cause`, staticGapCauseForResourceId(resource.resourceId).length > 0);
  check(`resource:${resource.resourceHex}:compatible forms`, resource.compatibleForms.length > 0, String(resource.compatibleForms.length));

  let exact = 0;
  let shared = 0;
  let composite = 0;
  let unresolved = 0;
  for (const entry of resource.frames) {
    check(`frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:status`, statusValues.includes(entry.assetMapping.status));
    check(`frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:duration from ROM`, Number.isInteger(entry.rom.durationTicks) && entry.rom.durationTicks > 0, String(entry.rom.durationTicks));
    check(`frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:offsetX from ROM`, Number.isInteger(entry.rom.offsetX) && entry.rom.offsetX >= -128 && entry.rom.offsetX <= 127, String(entry.rom.offsetX));
    check(`frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:offsetY from ROM`, Number.isInteger(entry.rom.offsetY) && entry.rom.offsetY >= -128 && entry.rom.offsetY <= 127, String(entry.rom.offsetY));
    check(`frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:raw tuple`, entry.rom.raw.length === 4, String(entry.rom.raw.length));
    check(`frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:raw meta`, entry.rom.raw[0] === entry.rom.metasprite);
    check(`frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:raw duration`, entry.rom.raw[1] === entry.rom.durationTicks);
    check(`frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:raw offsetY`, signed(entry.rom.raw[2]) === entry.rom.offsetY);
    check(`frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:raw offsetX`, signed(entry.rom.raw[3]) === entry.rom.offsetX);

    if (entry.assetMapping.status !== 'UNRESOLVED') {
      check(`frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:physicalFrame present`, !!entry.assetMapping.physicalFrame);
      check(`frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:manifestPose present`, !!entry.assetMapping.manifestPose);
      check(`frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:manifestIndex present`, entry.assetMapping.manifestIndex != null);
      for (const formId of resource.compatibleForms) {
        const frame = manifestFrame(formId, entry.assetMapping.manifestPose!, entry.assetMapping.manifestIndex!);
        check(`frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:${formId}:manifest frame exists`, !!frame);
        if (frame) {
          check(`frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:${formId}:sequence index valid`, manifestFramesFor(formId, entry.assetMapping.manifestPose!).some(f => f.index === entry.assetMapping.manifestIndex));
        }
      }
    }

    if (entry.assetMapping.status === 'SHARED') {
      check(
        `frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:shared has reason`,
        entry.assetMapping.reason.includes('contract') || entry.assetMapping.sampleFiles.some(sample => {
          const [formId, file] = sample.split(':');
          return manifestFileUsage(formId, file).length > 1;
        }),
      );
    }

    if (entry.assetMapping.status === 'COMPOSITE') {
      check(`frame:${resource.resourceHex}:${entry.sequenceIndex}.${entry.frameIndex}:composite never physical`, entry.assetMapping.physicalFrame == null || !entry.assetMapping.physicalFrame.includes('PHYSICAL'));
    }

    if (entry.assetMapping.status === 'EXACT') exact++;
    if (entry.assetMapping.status === 'SHARED') shared++;
    if (entry.assetMapping.status === 'COMPOSITE') composite++;
    if (entry.assetMapping.status === 'UNRESOLVED') unresolved++;
  }
  check(`resource:${resource.resourceHex}:summary exact`, resource.summary.exact === exact, `${resource.summary.exact}/${exact}`);
  check(`resource:${resource.resourceHex}:summary shared`, resource.summary.shared === shared, `${resource.summary.shared}/${shared}`);
  check(`resource:${resource.resourceHex}:summary composite`, resource.summary.composite === composite, `${resource.summary.composite}/${composite}`);
  check(`resource:${resource.resourceHex}:summary unresolved`, resource.summary.unresolved === unresolved, `${resource.summary.unresolved}/${unresolved}`);
}

for (const resource of ANIMATION_RESOURCE_CATALOG) {
  if (resource.status === 'PARTIAL' || resource.status === 'SPECIAL' || resource.status === 'UNKNOWN') {
    const cause = staticGapCauseForResourceId(resource.resourceId);
    check(`resource:${resource.resourceHex}:gap cause explicit`, cause !== 'NONE', cause);
  }
}

const summary = physicalFrameReconciliationSummary();
check('summary:resources', summary.resources === decodedResourceCount, String(summary.resources));
check('summary:romFrames', summary.romFrames > 0, String(summary.romFrames));
check('summary:counts add up', summary.exact + summary.shared + summary.composite + summary.unresolved === summary.romFrames);

console.log('═══ PHYSICAL FRAME RECONCILIATION ═══');
console.log(`resources=${summary.resources}`);
console.log(`romFrames=${summary.romFrames}`);
console.log(`EXACT=${summary.exact}`);
console.log(`SHARED=${summary.shared}`);
console.log(`COMPOSITE=${summary.composite}`);
console.log(`UNRESOLVED=${summary.unresolved}`);
console.log(`statuses=${Object.entries(summary.byStatus).map(([k, v]) => `${k}:${v}`).join(' · ')}`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);
