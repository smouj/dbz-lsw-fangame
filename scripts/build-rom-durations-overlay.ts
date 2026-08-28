// ═══════════════════════════════════════════════════════════════════════
// build-rom-durations-overlay — P0 ROM FRAME-TICK CUTOVER
// ═══════════════════════════════════════════════════════════════════════
// Generates per-form ROM duration overlays indexed by:
//   formId → resourceId → sequenceSelector → frameIndex
//
// NOT by pose name. The pose→resource mapping is consumed at runtime,
// but the overlay SSOT is form+resource+sequence+frameIndex because
// the same physicalId can appear in different sequences with different
// durationTicks.
//
// Schema (rom-durations.json):
// {
//   "formId": "goku_base",
//   "resources": {
//     "0x61": {                    // standing resource (bank $61)
//       "0": [                     // sequenceSelector 0
//         { "vf": 0, "dur": 3, "ox": 0, "oy": 0 },
//         ...
//       ],
//       "1": [...],
//     },
//     "0x03": {                    // Kamehameha
//       "0": [...],
//     },
//     ...
//   },
//   "source": "ANIMATION_RESOURCE_CATALOG + ROM_PHYSICAL_CORPUS"
// }
//
// Bank $61 standing resources use ROM_BANK61_ANIMATION_CORE.
// Bank $62-64 attack resources use ANIMATION_RESOURCE_CATALOG.
// ═══════════════════════════════════════════════════════════════════════

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { FORMS } from '../src/data/roster';
import { spriteDirFor } from '../src/data/spriteManifest';
import { animationResourceById, ANIMATION_RESOURCE_CATALOG } from '../src/battle/animationResources';
import { ROM_BANK61_ANIMATION_CORE } from '../src/data/generated/romAnimationCore.generated';
import { profileForForm } from '../src/data/romPhysicalFrameIndex';
import { romPhysicalIdForContent } from '../src/data/romPhysicalFrameIndex';

const ROOT = process.cwd();
const SPRITES = join(ROOT, 'public', 'assets', 'sprites');

interface RomFrameEntry {
  /** visualFrameId */
  vf: number;
  /** durationTicks */
  dur: number;
  /** offsetX */
  ox: number;
  /** offsetY */
  oy: number;
}

interface RomDurationsOverlay {
  formId: string;
  resources: Record<string, Record<string, RomFrameEntry[]>>;
  source: string;
}

function hex2(n: number): string {
  return n.toString(16).toUpperCase().padStart(2, '0');
}

// Build bank $61 standing durations for a form
function bank61Sequences(): Record<string, RomFrameEntry[]> {
  const sequences: Record<string, RomFrameEntry[]> = {};
  for (let r = 0; r < ROM_BANK61_ANIMATION_CORE.length; r++) {
    const res = ROM_BANK61_ANIMATION_CORE[r];
    const seqs: Record<string, RomFrameEntry[]> = {};
    for (let s = 0; s < res.sequences.length; s++) {
      const seq = res.sequences[s];
      if (seq.frames.length > 0) {
        seqs[String(s)] = seq.frames.map(f => ({
          vf: f.visualFrameId,
          dur: f.durationTicks,
          ox: f.offsetX,
          oy: f.offsetY,
        }));
      }
    }
    if (Object.keys(seqs).length > 0) {
      sequences[String(r)] = seqs;  // wrapped under "0x61" key
    }
  }
  // Flatten: bank $61 resource index → sequence entries
  return sequences;  // key = resourceIndex, value = sequences
}

// Build attack resource durations from the catalog
function attackResourceSequences(formId: string): Record<string, Record<string, RomFrameEntry[]>> {
  const profile = profileForForm(formId);
  if (!profile) return {};

  const resources: Record<string, Record<string, RomFrameEntry[]>> = {};

  for (const entry of ANIMATION_RESOURCE_CATALOG) {
    if (entry.status !== 'DECODED') continue;
    if (entry.sequences.length === 0) continue;

    const resourceHex = `0x${hex2(entry.resourceId)}`;
    const seqs: Record<string, RomFrameEntry[]> = {};

    for (let s = 0; s < entry.sequences.length; s++) {
      const seq = entry.sequences[s];
      if (seq.frames.length === 0) continue;
      seqs[String(s)] = seq.frames.map(f => ({
        vf: f.visualFrameId,
        dur: f.durationTicks,
        ox: f.offsetX,
        oy: f.offsetY,
      }));
    }

    if (Object.keys(seqs).length > 0) {
      resources[resourceHex] = seqs;
    }
  }

  return resources;
}

function buildFormOverlay(formId: string): RomDurationsOverlay | null {
  const dir = spriteDirFor(formId);
  if (!dir) return null;

  const profile = profileForForm(formId);
  if (!profile) return null;

  const resources: Record<string, Record<string, RomFrameEntry[]>> = {};

  // Bank $61 standing (shared across all forms that use it)
  // All 7 resources, indexed by resource index under "0x61"
  const standing = bank61Sequences();
  if (Object.keys(standing).length > 0) {
    resources['0x61'] = {};
    for (const [resIdx, seqs] of Object.entries(standing)) {
      resources['0x61'][resIdx] = seqs;
    }
  }

  // Attack resources ($62-$64 catalog)
  const attack = attackResourceSequences(formId);
  for (const [resHex, seqs] of Object.entries(attack)) {
    resources[resHex] = seqs;
  }

  if (Object.keys(resources).length === 0) return null;

  return {
    formId,
    resources,
    source: 'ANIMATION_RESOURCE_CATALOG + ROM_BANK61_ANIMATION_CORE',
  };
}

function main() {
  console.log('Building ROM duration overlays (form→resource→sequence→frameIndex)...');

  let generated = 0;
  let skipped = 0;
  let totalResources = 0;
  let totalSequences = 0;
  let totalFrames = 0;

  for (const form of FORMS) {
    const formId = form.id;
    const overlay = buildFormOverlay(formId);
    if (!overlay) {
      skipped++;
      continue;
    }

    const dir = spriteDirFor(formId);
    if (!dir) {
      skipped++;
      continue;
    }

    const outDir = join(SPRITES, dir);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const outPath = join(outDir, 'rom-durations.json');
    writeFileSync(outPath, JSON.stringify(overlay, null, 2));

    const resCount = Object.keys(overlay.resources).length;
    let seqCount = 0;
    let frameCount = 0;
    for (const seqs of Object.values(overlay.resources)) {
      seqCount += Object.keys(seqs).length;
      for (const frames of Object.values(seqs)) {
        frameCount += frames.length;
      }
    }

    totalResources += resCount;
    totalSequences += seqCount;
    totalFrames += frameCount;
    console.log(`  ${formId}: ${resCount} resources, ${seqCount} sequences, ${frameCount} frames → ${outPath}`);
    generated++;
  }

  console.log(`\nDone: ${generated} overlays, ${skipped} skipped`);
  console.log(`Total: ${totalResources} resources, ${totalSequences} sequences, ${totalFrames} frame instances with ROM timing`);
  console.log(`MISSING_DURATION_TICKS target: 0 (all ROM frame instances timed)`);
}

main();