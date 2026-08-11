import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const zipPath = process.argv[2];
if (!zipPath) {
  console.error('Usage: npm run import:sprites:v5 -- /absolute/path/DBZ_LSW_SPRITES_RECUT_V5_ATOMIC.zip');
  process.exit(1);
}

const repoRoot = process.cwd();
const outRoot = path.join(repoRoot, 'public/assets/sprites');
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dbz-lsw-sprites-v5-'));

const FORM_SOURCES = [
  ['goku_base', 'goku', 'normal'],
  ['goku_super_saiyan', 'goku', 'super_saiyan'],
  ['goku_super_saiyan_3', 'goku', 'super_saiyan_3'],
  ['vegeta_base', 'vegeta', 'normal'],
  ['vegeta_super_saiyan_majin', 'vegeta', 'super_saiyan_majin'],
  ['young_gohan_base', 'gohan', 'young_gohan_normal'],
  ['young_gohan_super_saiyan', 'gohan', 'young_gohan_super_saiyan'],
  ['young_gohan_super_saiyan_2', 'gohan', 'young_gohan_super_saiyan_2'],
  ['gohan_super_saiyan_1_2', 'gohan', 'teen_gohan_super_saiyan'],
  ['gohan_ultimate', 'gohan', 'teen_gohan_normal_mystic'],
  ['trunks_base', 'trunks_kid', 'kid_trunks_normal'],
  ['kid_trunks_super_saiyan', 'trunks_kid', 'kid_trunks_super_saiyan'],
  ['future_trunks_base', 'trunks_future', 'future_trunks_normal'],
  ['future_trunks_super_saiyan', 'trunks_future', 'future_trunks_super_saiyan'],
  ['goten_base', 'goten', 'normal'],
  ['goten_super_saiyan', 'goten', 'super_saiyan'],
  ['gotenks_super_saiyan', 'gotenks', 'super_saiyan'],
  ['gotenks_super_saiyan_3', 'gotenks', 'super_saiyan_3'],
  ['piccolo_base', 'piccolo', 'base'],
  ['krillin_base', 'krillin', 'base'],
  ['frieza_base', 'frieza', 'base'],
  ['cell_imperfect_form', 'cell', 'cell_form_1'],
  ['cell_semi_perfect_form', 'cell', 'cell_form_2'],
  ['cell_perfect', 'cell', 'perfect_cell'],
  ['cell_jr_base', 'cell_jr', 'base'],
  ['android_16_base', 'android_16', 'base'],
  ['android_17_base', 'android_17', 'base'],
  ['android_18_base', 'android_18', 'base'],
  ['android_19_base', 'android_19', 'base'],
  ['android_20_base', 'android_20', 'base'],
  ['ginyu_base', 'captain_ginyu', 'base'],
  ['recoome_base', 'recoome', 'base'],
  ['guldo_base', 'guldo', 'base'],
  ['jeice_base', 'jeice_burter', 'jeice'],
  ['burter_base', 'jeice_burter', 'burter'],
  ['nappa_base', 'nappa', 'base'],
  ['buu_base', 'majin_buu', 'fat_buu'],
  ['super_buu_base', 'majin_buu', 'super_buu'],
  ['buu_gotenks_absorbed', 'majin_buu', 'super_buu_gotenks_absorbed'],
  ['buu_gohan_absorbed', 'majin_buu', 'super_buu_gohan_absorbed'],
  ['kid_buu_base', 'majin_buu', 'kid_buu'],
  ['vegito_base', 'vegito', 'base'],
];

const POSE_INDEXES = {
  idle: [1],
  move: [6, 7],
  guard: [4, 11, 12],
  attack_fwd: [6, 7, 17, 20, 21, 25, 26],
  attack_ud: [9, 10, 14, 18, 22],
  hurt: [15, 22, 14],
  beam_charge: [19, 23, 24, 27, 28, 29, 30],
  power_up: [27, 28, 29, 37, 38],
};

const POSE_META = {
  idle: { fps: 3, loop: true },
  move: { fps: 6, loop: true },
  guard: { fps: 6, loop: false },
  attack_fwd: { fps: 7, loop: false },
  attack_ud: { fps: 7, loop: false },
  hurt: { fps: 6, loop: false },
  beam_charge: { fps: 7, loop: false },
  beam_fire: { fps: 7, loop: false },
  power_up: { fps: 8, loop: true },
};

function pngSize(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`Not a PNG: ${filePath}`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function frameNumber(fileName) {
  return Number(path.basename(fileName, '.png'));
}

function selectFrames(frames, indexes) {
  const byIndex = new Map(frames.map(frame => [frame.index, frame]));
  return indexes.map(index => byIndex.get(index)).filter(Boolean);
}

function beamFireFrames(frames) {
  const lateWide = frames.filter(frame => frame.index >= 31 && frame.w >= 58);
  if (lateWide.length > 0) return lateWide;
  const anyWide = frames.filter(frame => frame.w >= 58);
  if (anyWide.length > 0) return anyWide;
  return selectFrames(frames, [31, 32, 33, 34]);
}

function withFallback(frames, primary, fallback) {
  return primary.length > 0 ? primary : selectFrames(frames, fallback);
}

function buildManifest(target, sourceFrames) {
  const manifest = {};
  const poses = {
    idle: selectFrames(sourceFrames, POSE_INDEXES.idle),
    move: selectFrames(sourceFrames, POSE_INDEXES.move),
    guard: selectFrames(sourceFrames, POSE_INDEXES.guard),
    attack_fwd: selectFrames(sourceFrames, POSE_INDEXES.attack_fwd),
    attack_ud: selectFrames(sourceFrames, POSE_INDEXES.attack_ud),
    hurt: selectFrames(sourceFrames, POSE_INDEXES.hurt),
    beam_charge: selectFrames(sourceFrames, POSE_INDEXES.beam_charge),
    beam_fire: beamFireFrames(sourceFrames),
    power_up: selectFrames(sourceFrames, POSE_INDEXES.power_up),
  };

  poses.guard = withFallback(sourceFrames, poses.guard, [4, 1, 3]);
  poses.attack_fwd = withFallback(sourceFrames, poses.attack_fwd, [6, 7, 17, 25, 26, 21, 20]);
  poses.attack_ud = withFallback(sourceFrames, poses.attack_ud, [9, 10, 18, 22, 14]);
  poses.hurt = withFallback(sourceFrames, poses.hurt, [15, 22, 14, 21]);
  poses.beam_charge = withFallback(sourceFrames, poses.beam_charge, [19, 23, 24, 27, 28, 29]);
  poses.power_up = withFallback(sourceFrames, poses.power_up, [27, 28, 29, 19, 23, 24]);

  for (const [pose, frames] of Object.entries(poses)) {
    const meta = POSE_META[pose];
    manifest[pose] = {
      frame_count: frames.length,
      fps: meta.fps,
      loop: meta.loop,
      frames: frames.map((frame, i) => {
        const name = `${target}_${pose}_${String(i).padStart(2, '0')}`;
        return { name, file: `${name}.png`, w: frame.w, h: frame.h };
      }),
    };
  }
  return { manifest, poses };
}

function cleanTargetDir(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const file of fs.readdirSync(targetDir)) {
    if (file.endsWith('.png') || file === 'manifest.json') {
      fs.rmSync(path.join(targetDir, file));
    }
  }
}

try {
  execFileSync('unzip', ['-q', '-o', zipPath, '-d', tmpRoot], { stdio: 'inherit' });
  const root = path.join(tmpRoot, 'DBZ_LSW_SPRITES_RECUT_V5_ATOMIC');
  let imported = 0;

  for (const [target, character, form] of FORM_SOURCES) {
    const sourceDir = path.join(root, 'characters', character, form, 'frames');
    if (!fs.existsSync(sourceDir)) {
      console.warn(`skip missing ${character}/${form}`);
      continue;
    }

    const sourceFrames = fs.readdirSync(sourceDir)
      .filter(file => file.endsWith('.png'))
      .sort((a, b) => frameNumber(a) - frameNumber(b))
      .map(file => {
        const filePath = path.join(sourceDir, file);
        return { index: frameNumber(file), file, filePath, ...pngSize(filePath) };
      });

    const { manifest, poses } = buildManifest(target, sourceFrames);
    const targetDir = path.join(outRoot, target);
    cleanTargetDir(targetDir);

    for (const [pose, frames] of Object.entries(poses)) {
      frames.forEach((frame, i) => {
        const outName = manifest[pose].frames[i].file;
        fs.copyFileSync(frame.filePath, path.join(targetDir, outName));
      });
    }
    fs.writeFileSync(path.join(targetDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    imported++;
    console.log(`${target}: ${sourceFrames.length} source frames -> ${Object.values(poses).reduce((sum, arr) => sum + arr.length, 0)} pose frames`);
  }

  console.log(`Imported ${imported} V5 sprite forms.`);
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
