#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// DBZ LSW — Importador de sprites desde la fuente AUTORITATIVA
// DBZ_LSW_COMPLETE_CHARACTER_SPRITES_FIXED.zip
//
// La fuente correcta es `00_manifest/animations.json` (frames por pose
// verificados + `corrections.json` con 171 fixes). Reemplaza a los dos
// intentos previos (import-v5-sprites.mjs con tabla hardcodeada, y
// rebuild-sprites-v6.mjs que usó la clasificación de review del zip
// ATOMIC V5, más gruesa y sin guard/attack_ud).
//
// Mapeo de categorías FIXED → pose del juego:
//   idle → idle · movement → move · guard → guard ·
//   attack_forward → attack_fwd · attack_vertical → attack_ud ·
//   hurt → hurt (recoil completo) · beam → beam_charge
// beam_fire / power_up se omiten (el juego hace fallback a beam_charge
// vía POSE_FALLBACKS, ya que el zip FIXED no trae poses separadas de
// "fuego de beam" ni "power-up": el beam es solo carga, y el proyectil
// es el efecto `linked_beam`).
//
// Uso: node scripts/import-fixed-sprites.mjs /abs/path/FIXED.zip
// ═══════════════════════════════════════════════════════════
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const zipPath = process.argv[2];
if (!zipPath) {
  console.error('Usage: node scripts/import-fixed-sprites.mjs /abs/path/DBZ_LSW_COMPLETE_CHARACTER_SPRITES_FIXED.zip');
  process.exit(1);
}

const repoRoot = process.cwd();
const outRoot = path.join(repoRoot, 'public/assets/sprites');
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dbz-lsw-fixed-'));

// FIXED zip form → directorio de sprites del juego (spriteManifest.ts).
const FORM_TO_DIR = {
  '01_android_16/base': 'android_16_base',
  '02_android_17/base': 'android_17_base',
  '03_android_18/base': 'android_18_base',
  '04_android_19/base': 'android_19_base',
  '05_android_20/base': 'android_20_base',
  '06_burter/base': 'burter_base',
  '07_buu/base': 'buu_base',
  '08_buu/gohan_absorbed': 'buu_gohan_absorbed',
  '09_buu/gotenks_absorbed': 'buu_gotenks_absorbed',
  '10_cell/imperfect_form': 'cell_imperfect_form',
  '11_cell/perfect': 'cell_perfect',
  '12_cell/semi_perfect_form': 'cell_semi_perfect_form',
  '13_cell_jr/base': 'cell_jr_base',
  '14_frieza/base': 'frieza_base',
  '15_future_trunks/base': 'future_trunks_base',
  '16_ginyu/base': 'ginyu_base',
  '17_ginyu/gokus_body': 'ginyu_gokus_body',
  '18_gohan/super_saiyan_1_2': 'gohan_super_saiyan_1_2',
  '19_gohan/ultimate': 'gohan_ultimate',
  '20_goku/base': 'goku_base',
  '21_goku/super_saiyan_2': 'goku_super_saiyan_2',
  '22_goku/super_saiyan_3': 'goku_super_saiyan_3',
  '23_goku/super_saiyan': 'goku_super_saiyan',
  '24_goten/base': 'goten_base',
  '25_goten/super_saiyan': 'goten_super_saiyan',
  '26_gotenks/super_saiyan_3': 'gotenks_super_saiyan_3',
  '27_gotenks/super_saiyan': 'gotenks_super_saiyan',
  '28_guldo/base': 'guldo_base',
  '29_jeice/base': 'jeice_base',
  '30_kid_buu/base': 'kid_buu_base',
  '31_krillin/base': 'krillin_base',
  '32_nappa/base': 'nappa_base',
  '33_piccolo/base': 'piccolo_base',
  '34_recoome/base': 'recoome_base',
  '35_super_buu/base': 'super_buu_base',
  '36_trunks/base': 'trunks_base',
  '37_trunks/super_saiyan': 'kid_trunks_super_saiyan',
  '38_vegeta/base': 'vegeta_base',
  '39_vegeta/super_saiyan_majin': 'vegeta_super_saiyan_majin',
  '40_young_gohan/base': 'young_gohan_base',
  '41_young_gohan/super_saiyan_2': 'young_gohan_super_saiyan_2',
  '42_young_gohan/super_saiyan': 'young_gohan_super_saiyan',
};

// Formas del juego que NO están en el zip FIXED → reutilizar la más cercana.
const COPY_FROM = {
  'future_trunks_super_saiyan': 'future_trunks_base',
  'vegito_base': 'goku_super_saiyan',
};

// Categoría FIXED → pose del juego + metadatos de reproducción.
const POSE_MAP = {
  idle: { pose: 'idle', fps: 3, loop: true },
  movement: { pose: 'move', fps: 6, loop: true },
  guard: { pose: 'guard', fps: 6, loop: false },
  attack_forward: { pose: 'attack_fwd', fps: 7, loop: false },
  attack_vertical: { pose: 'attack_ud', fps: 7, loop: false },
  hurt: { pose: 'hurt', fps: 6, loop: false },
  beam: { pose: 'beam_charge', fps: 7, loop: false },
};

// Orden canónico de poses en el manifest (igual que el formato previo).
const POSE_ORDER = ['idle', 'move', 'guard', 'attack_fwd', 'attack_ud', 'hurt', 'beam_charge'];

function pngSize(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`No es PNG: ${filePath}`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function cleanDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.png') || f === 'manifest.json') {
      fs.rmSync(path.join(dir, f));
    }
  }
}

function writeManifest(dir, poses) {
  const manifest = {};
  for (const poseName of POSE_ORDER) {
    const entry = poses[poseName];
    if (!entry) continue;
    const frames = entry.frames.map((f, i) => {
      const name = `${dir}_${poseName}_${String(i).padStart(2, '0')}`;
      return { name, file: `${name}.png`, w: f.w, h: f.h };
    });
    manifest[poseName] = {
      frame_count: frames.length,
      fps: entry.fps,
      loop: entry.loop,
      frames,
    };
  }
  fs.writeFileSync(path.join(outRoot, dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

try {
  execFileSync('unzip', ['-q', '-o', zipPath, '-d', tmpRoot], { stdio: 'inherit' });

  const animPath = path.join(tmpRoot, '00_manifest', 'animations.json');
  if (!fs.existsSync(animPath)) {
    throw new Error('No se encontró 00_manifest/animations.json en el zip.');
  }
  const animations = JSON.parse(fs.readFileSync(animPath, 'utf8')).animations;

  let imported = 0;
  const errors = [];

  for (const [fixedForm, gameDir] of Object.entries(FORM_TO_DIR)) {
    const anim = animations[fixedForm];
    if (!anim) { errors.push(`FIXED form ${fixedForm} no está en animations.json`); continue; }

    const targetDir = path.join(outRoot, gameDir);
    cleanDir(targetDir);

    const poses = {};
    for (const [category, meta] of Object.entries(POSE_MAP)) {
      const relPaths = anim[category]?.frames || [];
      if (relPaths.length === 0) continue;
      const frames = relPaths.map((relPath, i) => {
        const abs = path.join(tmpRoot, relPath);
        if (!fs.existsSync(abs)) throw new Error(`Falta frame: ${relPath}`);
        const { w, h } = pngSize(abs);
        const dest = `${gameDir}_${meta.pose}_${String(i).padStart(2, '0')}.png`;
        fs.copyFileSync(abs, path.join(targetDir, dest));
        return { w, h };
      });
      poses[meta.pose] = { ...meta, frames };
    }

    writeManifest(gameDir, poses);
    imported++;
    console.log(`${gameDir}: ${Object.values(poses).reduce((s, p) => s + p.frames.length, 0)} frames`);
  }

  // Formas del juego sin fuente FIXED → copiar directorio de la forma más cercana.
  for (const [destDir, srcDir] of Object.entries(COPY_FROM)) {
    const src = path.join(outRoot, srcDir);
    const dst = path.join(outRoot, destDir);
    if (!fs.existsSync(src)) { errors.push(`Fuente de copia ${srcDir} no existe para ${destDir}`); continue; }
    cleanDir(dst);
    for (const f of fs.readdirSync(src)) {
      if (f.endsWith('.png') && f.startsWith(`${srcDir}_`)) {
        fs.copyFileSync(path.join(src, f), path.join(dst, f.replace(`${srcDir}_`, `${destDir}_`)));
      }
    }
    // Reescribir manifest con el prefijo correcto.
    const srcManifest = JSON.parse(fs.readFileSync(path.join(src, 'manifest.json'), 'utf8'));
    const dstManifest = {};
    for (const [pose, entry] of Object.entries(srcManifest)) {
      dstManifest[pose] = {
        ...entry,
        frames: entry.frames.map((fr, i) => {
          const name = `${destDir}_${pose}_${String(i).padStart(2, '0')}`;
          return { name, file: `${name}.png`, w: fr.w, h: fr.h };
        }),
      };
    }
    fs.writeFileSync(path.join(dst, 'manifest.json'), `${JSON.stringify(dstManifest, null, 2)}\n`);
    console.log(`${destDir}: copiado de ${srcDir}`);
  }

  if (errors.length) {
    console.error('\n⚠️  Errores:');
    for (const e of errors) console.error('  - ' + e);
    process.exitCode = 1;
  } else {
    console.log(`\n✓ Importados ${imported} formas FIXED + ${Object.keys(COPY_FROM).length} copiadas.`);
  }
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
