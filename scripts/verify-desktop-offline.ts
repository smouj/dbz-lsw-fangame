#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════════════════════════════
// verify:desktop-offline — hace cumplir el contrato desktop/offline
// ═══════════════════════════════════════════════════════════════════════
// Convierte la decisión de arquitectura (docs/architecture/
// DESKTOP_OFFLINE_ARCHITECTURE.md) en algo que la CI comprueba, para que no se
// erosione sin que nadie mire.
//
// Comprueba hechos del repositorio: empaquetado Tauri, dist como frontend,
// bundle NSIS, ausencia de red externa en runtime, y que el tooling de
// investigación ROM no se importe desde el frontend de producción.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); }
  else { failed++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

// ── 1. Empaquetado de escritorio ──
check('src-tauri existe', existsSync('src-tauri'));
const confPath = 'src-tauri/tauri.conf.json';
check('tauri.conf.json existe', existsSync(confPath));
const conf = existsSync(confPath) ? JSON.parse(readFileSync(confPath, 'utf8')) : {};
const build = conf.build ?? {};
check('frontendDist apunta a ../dist', build.frontendDist === '../dist', String(build.frontendDist));
const targets: string[] = conf.bundle?.targets ?? [];
check('el bundle incluye NSIS', targets.includes('nsis'), targets.join(',') || '(ninguno)');
check('devUrl sólo sirve al desarrollo', typeof build.devUrl === 'string' && build.devUrl.length > 0, String(build.devUrl));

// ── 2. Scripts del producto ──
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
const s = pkg.scripts;
check('existe desktop:dev', typeof s['desktop:dev'] === 'string', String(s['desktop:dev']));
check('existe desktop:build', typeof s['desktop:build'] === 'string', String(s['desktop:build']));
check('desktop:build no depende de un servidor', !/serve|start.*server/i.test(s['desktop:build'] ?? ''), String(s['desktop:build']));
check('existe verify:release-content', typeof s['verify:release-content'] === 'string');

// ── 3. Sin red externa en el frontend de producción ──
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === '__tests__' || e === 'node_modules') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}
const srcFiles = existsSync('src') ? walk('src') : [];
const externalFetches: string[] = [];
const romToolingImports: string[] = [];
for (const f of srcFiles) {
  const txt = readFileSync(f, 'utf8');
  // fetch/axios a un origen absoluto http(s)
  if (/fetch\(\s*[`'"]https?:\/\//.test(txt) || /fetch\(\s*`https?:\/\//.test(txt)) externalFetches.push(f);
  if (/\baxios\b|new WebSocket\(\s*[`'"]wss?:\/\//.test(txt)) externalFetches.push(f);
  // importar el tooling de investigación ROM desde producción
  if (/from\s+['"][^'"]*tools\/rom-trace/.test(txt) || /require\(\s*['"][^'"]*tools\/rom-trace/.test(txt)) romToolingImports.push(f);
}
check('sin fetch a orígenes externos en src/', externalFetches.length === 0, externalFetches.slice(0, 3).join(', ') || `${srcFiles.length} ficheros`);
check('src/ no importa tools/rom-trace', romToolingImports.length === 0, romToolingImports.slice(0, 3).join(', ') || 'ok');

// ── 4. Documentos de arquitectura presentes ──
check('DESKTOP_OFFLINE_ARCHITECTURE.md existe', existsSync('docs/architecture/DESKTOP_OFFLINE_ARCHITECTURE.md'));
check('ROM_EXECUTION_MODES.md existe', existsSync('docs/architecture/ROM_EXECUTION_MODES.md'));
check('ENVIRONMENTS.md existe', existsSync('docs/development/ENVIRONMENTS.md'));

// ── 5. Fijado de versiones ──
check('.nvmrc existe', existsSync('.nvmrc'), existsSync('.nvmrc') ? readFileSync('.nvmrc', 'utf8').trim() : '');
check('package-lock.json existe', existsSync('package-lock.json'));

// ── 6. Una sola versión de Node en todos los entornos ──
// Había CUATRO versiones en juego (20/22/24): el workflow de migración usaba 20
// mientras .nvmrc y los otros tres usaban 22. Este check impide que vuelva.
const nvmrc = existsSync('.nvmrc') ? readFileSync('.nvmrc', 'utf8').trim() : '';
check('.nvmrc define una versión de Node', /^[0-9]+(\.[0-9x]+)?$/.test(nvmrc), nvmrc || '(vacío)');
const wfDir = '.github/workflows';
const wfNodes: { file: string; version: string }[] = [];
if (existsSync(wfDir)) {
  for (const f of readdirSync(wfDir)) {
    if (!/\.ya?ml$/.test(f)) continue;
    const m = readFileSync(join(wfDir, f), 'utf8').match(/node-version:\s*['"]?([0-9][0-9.x]*)/);
    if (m) wfNodes.push({ file: f, version: m[1] });
  }
}
check('hay workflows que fijan Node', wfNodes.length > 0, `${wfNodes.length} workflows`);
const nodeMajor = (v: string) => v.split('.')[0];
const nodeMismatched = wfNodes.filter((w) => nodeMajor(w.version) !== nodeMajor(nvmrc));
check(
  'todos los entornos usan el mismo Node que .nvmrc',
  nodeMismatched.length === 0,
  nodeMismatched.length
    ? `desajustados: ${nodeMismatched.map((m) => `${m.file}=${m.version}`).join(', ')}`
    : `todos = ${nvmrc}`,
);

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
process.exit(failed === 0 ? 0 : 1);
