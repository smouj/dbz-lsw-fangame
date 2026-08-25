// ═══════════════════════════════════════════════════════════
// VERIFY: DEV-ROUTES — contrato de las 22 rutas canónicas del Dev Studio.
// Uso: npm run verify:dev-routes
//   1. Las 22 rutas #dev/* existen y se derivan de UNA sola fuente
//      (DEV_MODULES en DevStudio.tsx) — no de listas duplicadas.
//   2. DevModuleId (tipo) ≡ DEV_MODULES (datos): sin ids huérfanos
//      ni rutas sin registrar.
//   3. route.ts (módulo ligero) y DevStudio.tsx resuelven el MISMO
//      módulo desde el hash (paridad de parsing, incluidos guiones).
//   4. El render switch cubre los 22 módulos.
//   5. release-guard: isDevRoute() devuelve false en release.
// ═══════════════════════════════════════════════════════════
import { readFileSync } from 'fs';

let passed = 0;
let failed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name + (detail ? ` — ${detail}` : '')); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const studio = readFileSync('src/devtools/DevStudio.tsx', 'utf8');
const route = readFileSync('src/devtools/route.ts', 'utf8');

// ── 1. Extraer DEV_MODULES (fuente única) ──
const devModulesMatch = studio.match(/export const DEV_MODULES[\s\S]*?= \[([\s\S]*?)\];/);
if (!devModulesMatch) {
  check('dev-routes: DEV_MODULES exportado', false, 'no se encontró el array');
  process.exit(1);
}
const body = devModulesMatch[1];
const idMatches = [...body.matchAll(/id: '([a-z-]+)'/g)].map(m => m[1]);
const groupMatches = [...body.matchAll(/group: '([^']+)'/g)].map(m => m[1]);
check('dev-routes: DEV_MODULES tiene 22 módulos', idMatches.length === 22, `hay ${idMatches.length}`);
check('dev-routes: ids únicos', new Set(idMatches).size === idMatches.length);
check('dev-routes: cada módulo con grupo', groupMatches.length === idMatches.length, `${groupMatches.length}/${idMatches.length}`);

const CANONICAL = [
  'dashboard', 'characters', 'cards', 'animation', 'animation-studio', 'pixelart', 'facing', 'assets',
  'hud', 'lab', 'positions', 'combat', 'timeline', 'story', 'validation', 'research',
  'romdisplay', 'music', 'gameconfig', 'team-builder', 'deck-builder', 'workspace',
];
const missingCanon = CANONICAL.filter(id => !idMatches.includes(id));
const extraIds = idMatches.filter(id => !CANONICAL.includes(id));
check('dev-routes: las 22 rutas canónicas existen', missingCanon.length === 0, missingCanon.join(', ') || undefined);
check('dev-routes: sin rutas extra fuera del canon', extraIds.length === 0, extraIds.join(', ') || undefined);

// ── 2. DevModuleId (tipo) ≡ DEV_MODULES ──
const typeMatch = studio.match(/export type DevModuleId =([\s\S]*?);/);
if (!typeMatch) {
  check('dev-routes: DevModuleId exportado', false);
} else {
  const typeIds = [...typeMatch[1].matchAll(/'([a-z-]+)'/g)].map(m => m[1]);
  const typeEqData = typeIds.length === idMatches.length && typeIds.every(id => idMatches.includes(id));
  check('dev-routes: DevModuleId ≡ DEV_MODULES (22 ids)', typeEqData);
}

// ── 3. Paridad de parsing del hash (guiones soportados) ──
check('dev-routes: route.ts parsea #dev/ con guiones', route.includes('[a-z-]+'));
check('dev-routes: DevStudio.tsx parsea #dev/ con guiones', studio.includes('[a-zA-Z-]+'));

// ── 4. Render switch cubre los 22 ──
const renderCovers = CANONICAL.every(id => studio.includes(`module === '${id}'`));
check('dev-routes: render switch cubre las 22 rutas', renderCovers);

// ── 5. release-guard ──
check('dev-routes: isDevRoute con release-guard', route.includes("import.meta.env.MODE === 'release'"));

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed > 0) {
  console.log('\nFallos:');
  failures.forEach(f => console.log(' - ' + f));
  process.exit(1);
}
