// dump-animation-catalog.ts — vuelca ANIMATION_RESOURCE_CATALOG a JSON
// para que los scripts .mjs (extractor R1, audit) lo consuman sin TS.
// Uso: npx tsx scripts/dump-animation-catalog.ts
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { ANIMATION_RESOURCE_CATALOG } from '../src/battle/animationResources';

const out = ANIMATION_RESOURCE_CATALOG.map((e) => ({
  resourceId: e.resourceId,
  resourceHex: e.resourceHex,
  sequenceCount: e.sequenceCount,
  physicalFrameCount: e.physicalFrameCount,
  totalTicks: e.totalTicks,
  bank: e.bank,
  localId: e.localId,
  status: e.status,
  sequences: e.sequences.map((s) => ({
    addr: s.addr,
    frames: s.frames.map((f) => ({
      visualFrameId: f.visualFrameId,
      durationTicks: f.durationTicks,
      offsetY: f.offsetY,
      offsetX: f.offsetX,
      raw: f.raw,
    })),
  })),
}));

const dir = resolve(process.cwd(), 'docs/rom/generated');
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, 'animation-resources.json'), JSON.stringify(out, null, 2));
console.log(`animation-resources.json: ${out.length} resources → docs/rom/generated/`);
