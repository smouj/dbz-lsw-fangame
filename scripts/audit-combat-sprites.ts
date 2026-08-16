import fs from 'node:fs';
import path from 'node:path';
import { FORMS } from '../src/data/roster';
import { CARDS } from '../src/data/cards';
import { spriteDirFor } from '../src/data/spriteManifest';
import { actionSemanticsForCard, resolveActionProfile } from '../src/battle/actionProfiles';
import { COMBAT_POSE_ORDER, COMBAT_REQUIRED_POSES } from '../src/battle/spriteConfig';

type ManifestFrame = { file: string; w: number; h: number };
type ManifestPose = { frame_count?: number; fps?: number; loop?: boolean; frames?: ManifestFrame[] };
type Manifest = Record<string, ManifestPose>;
type PoseContract = {
  fps: number;
  loop: boolean;
  frames?: string[];
  startsWith?: string;
  containsOnlyPrefixes?: string[];
  forbiddenPrefixes?: string[];
};

const POSE_RUNTIME_DEFAULTS: Record<string, PoseContract> = {
  idle: { fps: 3, loop: true },
  move_front: { fps: 6, loop: true, frames: ['idle_00', 'move_front_01'] },
  move_back: { fps: 6, loop: true, frames: ['idle_00', 'move_back_01'] },
  guard: { fps: 6, loop: false },
  attack_fwd: { fps: 5, loop: false },
  attack_ud: { fps: 5, loop: false },
  punch_right: { fps: 7, loop: false, startsWith: 'idle_', containsOnlyPrefixes: ['idle_', 'attack_fwd_'], forbiddenPrefixes: ['beam_', 'hurt_', 'guard_'] },
  punch_left: { fps: 7, loop: false, startsWith: 'idle_', containsOnlyPrefixes: ['idle_', 'attack_fwd_'], forbiddenPrefixes: ['beam_', 'hurt_', 'guard_'] },
  kick_right: { fps: 7, loop: false, startsWith: 'idle_', containsOnlyPrefixes: ['idle_', 'attack_ud_'], forbiddenPrefixes: ['beam_', 'hurt_', 'guard_'] },
  hurt: { fps: 6, loop: false },
  knockback_back: { fps: 7, loop: false, containsOnlyPrefixes: ['hurt_'], forbiddenPrefixes: ['beam_', 'attack_', 'guard_'] },
  knockback_up: { fps: 7, loop: false, containsOnlyPrefixes: ['hurt_'], forbiddenPrefixes: ['beam_', 'attack_', 'guard_'] },
  knockback_down: { fps: 7, loop: false, containsOnlyPrefixes: ['hurt_'], forbiddenPrefixes: ['beam_', 'attack_', 'guard_'] },
  beam_guard: { fps: 6, loop: false, containsOnlyPrefixes: ['guard_'], forbiddenPrefixes: ['beam_ray_', 'attack_', 'hurt_'] },
  evade: { fps: 10, loop: false, startsWith: 'idle_', containsOnlyPrefixes: ['idle_', 'guard_', 'move_back_'], forbiddenPrefixes: ['beam_', 'attack_', 'hurt_'] },
  beam_charge: { fps: 7, loop: false },
  beam_fire: { fps: 8, loop: false },
  beam_ray: { fps: 7, loop: false },
  beam_ray_tip: { fps: 7, loop: false },
  gather_power: { fps: 6, loop: true },
  power_up: { fps: 6, loop: true },
};

const root = process.cwd();
const spriteRoot = path.join(root, 'public/assets/sprites');
let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` - ${detail}` : ''}`);
  }
}

const manifests = new Map<string, Manifest>();

for (const form of Object.values(FORMS)) {
  const dir = spriteDirFor(form.id);
  check(`${form.id}:spriteDir`, !!dir);
  if (!dir) continue;

  const manifestPath = path.join(spriteRoot, dir, 'manifest.json');
  check(`${form.id}:manifest`, fs.existsSync(manifestPath), dir);
  if (!fs.existsSync(manifestPath)) continue;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest;
  manifests.set(form.id, manifest);

  for (const pose of COMBAT_REQUIRED_POSES) {
    check(`${form.id}:${pose}`, !!manifest[pose]?.frames?.length);
  }

  for (const [pose, poseData] of Object.entries(manifest)) {
    const frames = poseData.frames ?? [];
    check(`${form.id}:${pose}:frame_count`, poseData.frame_count == null || poseData.frame_count === frames.length, `${poseData.frame_count} vs ${frames.length}`);
    const runtimeDefault = POSE_RUNTIME_DEFAULTS[pose];
    if ((COMBAT_POSE_ORDER as readonly string[]).includes(pose) && runtimeDefault) {
      check(`${form.id}:${pose}:fps`, poseData.fps === runtimeDefault.fps, `${poseData.fps} vs ${runtimeDefault.fps}`);
      check(`${form.id}:${pose}:loop`, poseData.loop === runtimeDefault.loop, `${poseData.loop} vs ${runtimeDefault.loop}`);
      if (runtimeDefault.frames) {
        check(`${form.id}:${pose}:contractFrameCount`, frames.length === runtimeDefault.frames.length, `${frames.length} vs ${runtimeDefault.frames.length}`);
        runtimeDefault.frames.forEach((suffix, index) => {
          check(`${form.id}:${pose}:${index}:contractFrame`, frames[index]?.file === `${dir}_${suffix}.png`, frames[index]?.file);
        });
      }
      if (runtimeDefault.startsWith && frames.length) {
        check(`${form.id}:${pose}:startsWith`, frames[0].file.startsWith(`${dir}_${runtimeDefault.startsWith}`), frames[0].file);
      }
      if (runtimeDefault.containsOnlyPrefixes) {
        for (const frame of frames) {
          check(`${form.id}:${pose}:${frame.file}:semanticSource`,
            runtimeDefault.containsOnlyPrefixes.some(prefix => frame.file.startsWith(`${dir}_${prefix}`)),
            frame.file);
        }
      }
      if (runtimeDefault.forbiddenPrefixes) {
        for (const frame of frames) {
          check(`${form.id}:${pose}:${frame.file}:forbiddenSource`,
            runtimeDefault.forbiddenPrefixes.every(prefix => !frame.file.startsWith(`${dir}_${prefix}`)),
            frame.file);
        }
      }
    }
    let lastIndex = -1;
    const seenIndexes = new Set<number>();
    frames.forEach((frame, index) => {
      const expectedPrefix = `${dir}_${pose}_`;
      const semanticAlias = (COMBAT_POSE_ORDER as readonly string[]).includes(pose);
      check(`${form.id}:${pose}:${index}:name`,
        (semanticAlias ? frame.file.startsWith(`${dir}_`) : frame.file.startsWith(expectedPrefix)) && frame.file.endsWith('.png'),
        frame.file);
      const m = frame.file.match(/_(\d+)\.png$/);
      const numericIndex = m ? Number(m[1]) : null;
      const physicalPoseFrame = frame.file.startsWith(expectedPrefix);
      check(`${form.id}:${pose}:${index}:index`,
        numericIndex != null && (!physicalPoseFrame || (numericIndex > lastIndex && !seenIndexes.has(numericIndex))),
        frame.file);
      if (numericIndex != null && physicalPoseFrame) {
        lastIndex = numericIndex;
        seenIndexes.add(numericIndex);
      }
      check(`${form.id}:${pose}:${index}:size`, frame.w > 0 && frame.h > 0, `${frame.w}x${frame.h}`);
    });
  }

  const beamFrames = manifest.beam_ray?.frames ?? [];
  check(`${form.id}:beam_ray`, beamFrames.length > 0);
  for (const frame of beamFrames) {
    const ratio = frame.w / frame.h;
    check(`${form.id}:beam_ray:${frame.file}:ratio`, ratio >= 2, `${frame.w}x${frame.h}`);
    check(`${form.id}:beam_ray:${frame.file}:height`, frame.h >= 8, `${frame.w}x${frame.h}`);
  }
}

const pixiPresentation = fs.readFileSync(path.join(root, 'src/renderer/pixi/presentation/PixiBattlePresentation.ts'), 'utf8');
check('pixi:noBeamRayTextureAsProjectile', !pixiPresentation.includes("getPoseTexture('beam_ray'"));
check('pixi:noStretchSpriteProjectile', !pixiPresentation.includes('raySprite') && !pixiPresentation.includes('rayScale'));

check('future_trunks_base:notKidTrunks', spriteDirFor('trunks_future') === 'future_trunks_base', spriteDirFor('trunks_future'));
check('future_trunks_super:notKidTrunks', spriteDirFor('trunks_ssj') === 'future_trunks_super_saiyan', spriteDirFor('trunks_ssj'));
check('kid_trunks_super:separateDir', spriteDirFor('trunks_kid_ssj') === 'kid_trunks_super_saiyan', spriteDirFor('trunks_kid_ssj'));

for (const card of CARDS.filter(c => c.type === 'command' || c.type === 'damage' || c.type === 'beam')) {
  const sem = actionSemanticsForCard(card);
  check(`card:${card.name}:animation`, ['stage', 'melee', 'beam'].includes(sem.animation), sem.animation);
  if (card.type === 'beam') {
    const profile = resolveActionProfile(card.name);
    check(`card:${card.name}:beamProfile`, !!profile);
    check(`card:${card.name}:beamVisual`, sem.visual !== 'rush' && sem.visual !== 'power', String(sem.visual));
  }
}

const forms = Object.keys(FORMS).length;
const manifestCount = manifests.size;
const withBeamRay = [...manifests.values()].filter(m => m.beam_ray?.frames?.length).length;
console.log(`\nAudited ${forms} forms, ${manifestCount} manifests, ${withBeamRay} beam-ray sets.`);
console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
