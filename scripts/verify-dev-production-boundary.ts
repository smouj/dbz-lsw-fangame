/**
 * VERIFY: DEV/PRODUCTION BOUNDARY
 *
 * El juego y el Dev Studio comparten las autoridades ROM y algunos
 * componentes de preview, pero tienen entradas distintas. Este gate evita
 * que el entrypoint público vuelva a cargar el layout Dev o que una URL
 * parecida active la herramienta interna por accidente.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    const suffix = detail ? ` — ${detail}` : '';
    failures.push(`${label}${suffix}`);
    console.log(`  ✗ ${label}${suffix}`);
  }
}

const main = read('src/main.tsx');
const route = read('src/devtools/route.ts');
const studio = read('src/devtools/DevStudio.tsx');
const stub = read('src/devtools/DevStudioStub.tsx');
const vite = read('vite.config.ts');

check('boundary: game entry does not import Dev layout CSS', !main.includes("'./devtools/dev-layout.css'"));
check('boundary: DevStudio owns its private layout CSS', studio.includes("import './dev-layout.css';"));
check('boundary: DevStudio is lazy-loaded', main.includes("lazy(() => import('./devtools/DevStudio')"));
check('boundary: release build removes DevStudio branch', main.includes("import.meta.env.MODE === 'release' ? null : DevStudioLazy"));
check('boundary: release alias points to the null stub', vite.includes('DevStudioStub.tsx'));
check('boundary: release stub renders no panel', /function DevStudio\([^)]*\): null[\s\S]*?return null/.test(stub));
check('boundary: Dev route has an explicit release guard', route.includes("import.meta.env.MODE === 'release'"));
check('boundary: only #dev or #dev/<module> activates Dev', route.includes("hash === '#dev' || hash.startsWith('#dev/')"));
check('boundary: query activation requires dev=1', route.includes("q.get('dev') === '1'"));
check('boundary: Dev UI is explicitly marked internal', studio.includes('DEV ONLY') && studio.includes('Herramienta interna'));
check('boundary: Dev exit returns to the game', studio.includes('aria-label="Volver al juego"') && studio.includes('url.hash = \'\''));

// Fuera de src/devtools solo se permiten el route guard y el contrato de props
// como imports de infraestructura. Los módulos de trabajo no pueden entrar
// accidentalmente en el árbol de producción.
const allowedDevImports = new Set([
  './devtools/route',
  './devtools/DevStudioTypes',
]);
const sourceFiles: string[] = [];
function walk(dir: string) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(tsx?|jsx?)$/.test(entry.name) && !path.includes(`${join(ROOT, 'src', 'devtools')}`)) sourceFiles.push(path);
  }
}
walk(join(ROOT, 'src'));
const unexpected: string[] = [];
for (const path of sourceFiles) {
  const source = readFileSync(path, 'utf8');
  for (const match of source.matchAll(/from\s+['"](\.\/devtools\/[^'"]+)['"]/g)) {
    if (!allowedDevImports.has(match[1])) unexpected.push(`${relative(ROOT, path)} → ${match[1]}`);
  }
}
check('boundary: game source has no eager Dev module imports', unexpected.length === 0, unexpected.join(', '));

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed) {
  console.log('\nFallos:');
  failures.forEach(failure => console.log(` - ${failure}`));
  process.exit(1);
}
