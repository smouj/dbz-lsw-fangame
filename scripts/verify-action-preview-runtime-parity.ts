import { runtimeActionPreview } from '../src/battle/actionPreviewParity';
import { traceActionPresentation } from '../src/battle/actionPresentationTrace';

let failures = 0;
let checks = 0;
function check(name: string, ok: boolean) {
  checks++;
  if (!ok) { failures++; console.log(`FAIL ${name}`); }
}

for (const [kind, golden] of [['DAMAGE', 'standard_damage'], ['BEAM', 'kamehameha']] as const) {
  const preview = runtimeActionPreview(kind);
  const trace = traceActionPresentation(golden);
  check(`${kind}:ROM source`, preview.source === 'ROM' && trace.presentation.source === 'ROM');
  check(`${kind}:same beat count`, preview.beats.length === trace.romFrames.length);
  check(`${kind}:non-empty physical stream`, preview.beats.length > 0);
  for (let i = 0; i < preview.beats.length; i++) {
    const beat = preview.beats[i];
    const runtime = trace.romFrames[i];
    check(`${kind}:${i}:identity`, !!runtime && beat.tick === runtime.absoluteTick
      && beat.formId === runtime.actor.formId && beat.file === runtime.actor.file
      && beat.resource === runtime.resourceId && beat.sequence === runtime.sequenceIndex
      && beat.frameIndex === runtime.frameIndex && beat.visualFrameId === runtime.visualFrameId);
    if (i > 0) check(`${kind}:${i}:monotonic tick`, beat.tick > preview.beats[i - 1].tick);
    check(`${kind}:${i}:duration`, beat.durationTicks > 0);
  }
}

console.log(`ACTION PREVIEW ↔ RUNTIME PARITY: ${checks - failures}/${checks} checks OK`);
process.exit(failures === 0 ? 0 : 1);
