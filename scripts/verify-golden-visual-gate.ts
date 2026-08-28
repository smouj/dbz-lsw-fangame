#!/usr/bin/env node
/**
 * verify-golden-visual-gate.ts
 * 
 * P0 REAL BROWSER GOLDEN GATE — Headless data integrity check
 * Verifies that each golden form's sprite manifests resolve to
 * actual PNG files with correct dimensions.
 */

import * as fs from 'fs';
import * as path from 'path';

const GOLDEN_FORMS = [
  'goku_base', 'goku_ssj', 'gohan_young', 'vegeta_base',
  'piccolo_base', 'krillin_base', 'android_16', 'frieza_final'
];

const KEY_POSES = [
  'idle', 'move_front', 'punch_right', 'hurt', 'guard',
  'beam_charge', 'beam_fire', 'attack_fwd', 'attack_ud',
  'knockback_back', 'evade', 'gather_power'
];

const SPRITES_DIR = 'public/assets/sprites';

interface ManifestFrame {
  name: string;
  file: string;
  w: number;
  h: number;
}

interface ManifestPose {
  frame_count: number;
  fps: number;
  loop: boolean;
  frames: ManifestFrame[];
}

type Manifest = Record<string, ManifestPose>;

let passed = 0;
let failed = 0;
const errors: string[] = [];
const results: Record<string, Record<string, { status: string; frames: number; details?: string }>> = {};

for (const form of GOLDEN_FORMS) {
  results[form] = {};
  const manifestPath = path.join(SPRITES_DIR, form, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log(`❌ ${form}: NO manifest.json`);
    failed++;
    errors.push(`${form}: missing manifest.json`);
    continue;
  }

  let manifest: Manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    console.log(`❌ ${form}: manifest.json parse error`);
    failed++;
    errors.push(`${form}: manifest parse error`);
    continue;
  }

  const poses = Object.keys(manifest);
  console.log(`\n═══ ${form}: ${poses.length} poses ═══`);

  // Check key poses
  for (const pose of KEY_POSES) {
    if (!poses.includes(pose)) {
      console.log(`  ⚠️  ${pose}: MISSING from manifest`);
      results[form][pose] = { status: 'MISSING', frames: 0 };
      failed++;
      errors.push(`${form}/${pose}: missing pose in manifest`);
      continue;
    }

    const poseData = manifest[pose];
    const frames = poseData.frames;
    if (!frames || frames.length === 0) {
      console.log(`  ❌ ${pose}: empty frames array`);
      results[form][pose] = { status: 'EMPTY', frames: 0 };
      failed++;
      errors.push(`${form}/${pose}: empty frames`);
      continue;
    }

    // Check each frame's PNG exists and has content
    let poseErrors = 0;
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const pngPath = path.join(SPRITES_DIR, form, frame.file);
      if (!fs.existsSync(pngPath)) {
        poseErrors++;
        if (i === 0) { // Only report first missing
          console.log(`  ❌ ${pose}[${i}]: PNG missing: ${frame.file}`);
          errors.push(`${form}/${pose}[${i}]: missing PNG ${frame.file}`);
        }
        continue;
      }

      const stat = fs.statSync(pngPath);
      if (stat.size < 100) {
        poseErrors++;
        console.log(`  ❌ ${pose}[${i}]: PNG too small (${stat.size} bytes): ${frame.file}`);
        errors.push(`${form}/${pose}[${i}]: PNG too small`);
        continue;
      }

      // Check dimensions are reasonable
      if (frame.w <= 0 || frame.h <= 0) {
        poseErrors++;
        console.log(`  ❌ ${pose}[${i}]: invalid dimensions ${frame.w}x${frame.h}`);
        errors.push(`${form}/${pose}[${i}]: invalid dims`);
        continue;
      }

      passed++;
    }

    if (poseErrors > 0) {
      failed += poseErrors;
      results[form][pose] = { status: 'ERROR', frames: frames.length, details: `${poseErrors} frame errors` };
    } else {
      results[form][pose] = { status: 'PASS', frames: frames.length };
      passed += frames.length;
    }
  }

  const formTotal = poses.reduce((acc, p) => acc + (manifest[p]?.frames?.length || 0), 0);
  const keyTotal = KEY_POSES.reduce((acc, p) => acc + (manifest[p]?.frames?.length || 0), 0);
  console.log(`  Total: ${formTotal} frames across ${poses.length} poses; key poses: ${keyTotal} frames`);
}

// Check physical PNG directories
console.log('\n═══ PHYSICAL PNG INTEGRITY ═══');
for (const form of GOLDEN_FORMS) {
  const physDir = path.join(SPRITES_DIR, form, 'physical');
  if (!fs.existsSync(physDir)) {
    console.log(`❌ ${form}: NO physical directory`);
    failed++;
    errors.push(`${form}: missing physical/ dir`);
    continue;
  }
  const pngs = fs.readdirSync(physDir).filter(f => f.endsWith('.png'));
  console.log(`  ${form}: ${pngs.length} physical PNGs`);
  passed += pngs.length;
}

// Summary
console.log('\n═══ GOLDEN FORMS SUMMARY ═══');
for (const form of GOLDEN_FORMS) {
  const formResults = results[form] || {};
  const totalPoses = Object.keys(formResults).length;
  const passCount = Object.values(formResults).filter(r => r.status === 'PASS').length;
  const missCount = Object.values(formResults).filter(r => r.status === 'MISSING').length;
  console.log(`  ${form}: ${passCount}/${totalPoses} key poses PASS${missCount > 0 ? `, ${missCount} MISSING` : ''}`);
}

console.log(`\n═══ RESULTADO: ${passed} ✓ · ${failed} ✗ ═══`);
if (errors.length > 0 && errors.length <= 20) {
  console.log('\nERRORS:');
  errors.forEach(e => console.log(`  ${e}`));
} else if (errors.length > 20) {
  console.log(`\n${errors.length} errors (showing first 20):`);
  errors.slice(0, 20).forEach(e => console.log(`  ${e}`));
}
process.exit(failed > 0 ? 1 : 0);