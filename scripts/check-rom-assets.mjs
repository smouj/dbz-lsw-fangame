#!/usr/bin/env node
// check-rom-assets.mjs — detecta si faltan los assets ROM regenerables.
//
// Estos assets NO están versionados (ver .gitignore). Un checkout limpio
// no los tiene hasta ejecutar `npm run gen:rom-runtime-assets` con la ROM
// local autorizada. Este check evita 404 misteriosos de PNG al arrancar.
//
// Salida: solo WARN (exit 0) para no romper CI/builds que no necesitan
// render ROM; el mensaje explica el comando exacto.

import { existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES_DIR = resolve(ROOT, 'public/assets/sprites');
const ROM_FX_DIR = resolve(ROOT, 'public/assets/rom-fx');

const problems = [];

// 1) Fighters: rom-physical.manifest.json por forma (48 esperado).
let manifestCount = 0;
if (existsSync(SPRITES_DIR)) {
  for (const d of readdirSync(SPRITES_DIR)) {
    if (existsSync(resolve(SPRITES_DIR, d, 'rom-physical.manifest.json'))) manifestCount++;
  }
}
if (manifestCount === 0) {
  problems.push(`Fighters: no hay rom-physical.manifest.json en public/assets/sprites/*/ (0/48).`);
} else if (manifestCount < 48) {
  problems.push(`Fighters: solo ${manifestCount}/48 rom-physical.manifest.json presentes.`);
}

// 2) FX: manifest.json del corpus rom-fx.
if (!existsSync(resolve(ROM_FX_DIR, 'manifest.json'))) {
  problems.push('FX: falta public/assets/rom-fx/manifest.json.');
}

if (problems.length === 0) {
  console.log('[check-rom-assets] ROM runtime assets presentes ✓');
  process.exit(0);
}

console.error('');
console.error('══════════════════════════════════════════════════════════════════');
console.error('⚠️  FALTAN ASSETS ROM REGENERABLES (no versionados en Git)');
console.error('══════════════════════════════════════════════════════════════════');
for (const p of problems) console.error(`  • ${p}`);
console.error('');
console.error('  Reproduce con la ROM local autorizada:');
console.error('');
console.error('    npm run gen:rom-runtime-assets');
console.error('');
console.error('  Esto regenera fighters + FX (physical/, rom-fx/, manifests, filmstrip).');
console.error('  Sin él, el runtime servirá 404 de PNG. No es un error de build.');
console.error('══════════════════════════════════════════════════════════════════');
console.error('');
process.exit(0);
