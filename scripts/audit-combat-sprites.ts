import fs from 'node:fs';
import path from 'node:path';
import { FORMS } from '../src/data/roster';
import { CARDS } from '../src/data/cards';
import { spriteDirFor } from '../src/data/spriteManifest';
import { actionSemanticsForCard, resolveActionProfile } from '../src/battle/actionProfiles';
import { COMBAT_REQUIRED_POSES } from '../src/battle/spriteConfig';

type ManifestFrame = { file: string; w: number; h: number };
type ManifestPose = { frame_count?: number; frames?: ManifestFrame[] };
type Manifest = Record<string, ManifestPose>;

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
    let lastIndex = -1;
    const seenIndexes = new Set<number>();
    frames.forEach((frame, index) => {
      const expectedPrefix = `${dir}_${pose}_`;
      check(`${form.id}:${pose}:${index}:name`, frame.file.startsWith(expectedPrefix) && frame.file.endsWith('.png'), frame.file);
      const m = frame.file.match(/_(\d+)\.png$/);
      const numericIndex = m ? Number(m[1]) : null;
      check(`${form.id}:${pose}:${index}:index`, numericIndex != null && numericIndex > lastIndex && !seenIndexes.has(numericIndex), frame.file);
      if (numericIndex != null) {
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
