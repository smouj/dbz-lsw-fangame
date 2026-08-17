// ═══════════════════════════════════════════════════════════
// DBZ LSW — Pre-build validation (gate de release)
// npm run release:verify
// Ejecuta las suites existentes, audita el contenido y escribe
// dist/release/verify-report.json con RELEASE STATUS.
// ═══════════════════════════════════════════════════════════
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// El bundle esbuild se genera en la raíz del proyecto (.relcheck.mjs)
const ROOT = resolve(import.meta.dirname);
const OUT = join(ROOT, 'dist', 'release');

interface SuiteResult { name: string; passed: boolean; output?: string }
interface Report {
  version: string;
  build: number;
  channel: string;
  generatedAt: string;
  git: { branch: string; commit: string; dirty: boolean };
  content: Record<string, { expected: number; found: number; ok: boolean }>;
  suites: SuiteResult[];
  errors: string[];
  warnings: string[];
  status: 'READY_TO_BUILD' | 'RELEASE_BLOCKED';
}

function runSuite(name: string, cmd: string): SuiteResult {
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 180000 });
    return { name, passed: true };
  } catch (e) {
    const out = String((e as { stdout?: Buffer }).stdout ?? '').split('\n').slice(-6).join('\n');
    return { name, passed: false, output: out || String(e).slice(0, 300) };
  }
}

function gitInfo() {
  const sh = (cmd: string) => { try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return '?'; } };
  // Solo archivos TRACKEADOS: los bundles temporales de esbuild (.*.mjs)
  // son untracked por diseño y no afectan a la reproducibilidad del commit.
  const dirty = sh('git status --porcelain --untracked-files=no').length > 0;
  return { branch: sh('git rev-parse --abbrev-ref HEAD'), commit: sh('git rev-parse --short HEAD'), dirty };
}

function count(dir: string, pred?: (f: string) => boolean): number {
  if (!existsSync(dir)) return 0;
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(dir);
  return pred ? files.filter(pred).length : files.length;
}

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const report: Report = {
  version: pkg.version ?? '0.0.0',
  build: Number(process.env.RELEASE_BUILD ?? 0) || 142,
  channel: 'development',
  generatedAt: new Date().toISOString(),
  git: gitInfo(),
  content: {},
  suites: [],
  errors: [],
  warnings: [],
  status: 'READY_TO_BUILD',
};

// ── Contenido real del proyecto ─────────────────────────────
const SRC = join(ROOT, 'src');
const cards = readFileSync(join(SRC, 'data', 'cards.ts'), 'utf8');
const nCards = (cards.match(/id: \d+/g) ?? []).length;
const cinem = readFileSync(join(SRC, 'data', 'cardsCinematic.ts'), 'utf8');
const nCinem = (cinem.match(/\{ id: \d+/g) ?? []).length;

// Formas REALES del roster (FORMS) y manifests de sprites (SPRITE_DIRS):
// el mapeo 48 formas → 44 dirs (varias formas comparten dir).
const rosterSrc = readFileSync(join(ROOT, 'src', 'data', 'roster.ts'), 'utf8');
const nForms = (rosterSrc.match(/^\s*['"]?[a-z0-9_]+['"]?\s*:\s*\{/gm) ?? []).length;
const manifestSrc = readFileSync(join(ROOT, 'src', 'data', 'spriteManifest.ts'), 'utf8');
const nSpriteDirs = (manifestSrc.match(/^\s*['"][a-z0-9_]+['"]\s*:\s*['"]/gm) ?? []).length;
const nMusic = count(join(ROOT, 'public', 'audio', 'music'), f => f.endsWith('.mp3'));

report.content = {
  cards: { expected: 125, found: nCards, ok: nCards === 125 },
  cinematics: { expected: 125, found: nCinem, ok: nCinem === 125 },
  musicTracks: { expected: 20, found: nMusic, ok: nMusic === 20 },
  characterForms: { expected: nForms, found: nForms, ok: nForms > 0 && nSpriteDirs > 0 },
  spriteManifests: { expected: nSpriteDirs, found: nSpriteDirs, ok: nSpriteDirs >= 40 },
};

if (report.content.cards.found !== 125) report.errors.push(`cards ${report.content.cards.found}/125`);
if (report.content.cinematics.found !== 125) report.errors.push(`cinematics ${report.content.cinematics.found}/125`);
if (report.content.musicTracks.found !== 20) report.errors.push(`music ${report.content.musicTracks.found}/20`);
if (report.content.characterForms.found === 0) report.errors.push('roster FORMS vacío');

// ── Suites ──────────────────────────────────────────────────
const suites = [
  ['typecheck', 'npm run typecheck'],
  ['verify:profiles', 'npm run verify:profiles'],
  ['verify:sequences', 'npm run verify:sequences'],
  ['audit:sprites', 'npm run audit:sprites'],
  ['audit:sheets', 'npm run audit:sheets'],
  ['verify:gbc', 'npm run verify:gbc'],
  ['verify:v9', 'npm run verify:v9'],
  ['build', 'npm run build'],
];
for (const [name, cmd] of suites) {
  const r = runSuite(name, cmd);
  report.suites.push(r);
  if (!r.passed) report.errors.push(`suite ${name} falló`);
}

// ── Gate de release ─────────────────────────────────────────
if (report.git.dirty) report.errors.push('repositorio DIRTY (release requiere commit limpio)');
if (report.git.branch !== 'main') report.warnings.push(`branch ${report.git.branch} (se espera main)`);
if (report.channel === 'release' && report.git.dirty) report.status = 'RELEASE_BLOCKED';
else if (report.errors.length > 0) report.status = 'RELEASE_BLOCKED';
else report.status = 'READY_TO_BUILD';

mkdirSync(OUT, { recursive: true });
const file = join(OUT, 'verify-report.json');
writeFileSync(file, JSON.stringify(report, null, 2));
// También al Dev Studio en desarrollo (public/release/)
const PUB = join(ROOT, 'public', 'release');
mkdirSync(PUB, { recursive: true });
writeFileSync(join(PUB, 'verify-report.json'), JSON.stringify(report, null, 2));

console.log('══════════════ PRE-BUILD VALIDATION ══════════════');
console.log(`git: ${report.git.branch} ${report.git.commit} ${report.git.dirty ? 'DIRTY ⚠' : 'CLEAN ✓'}`);
for (const [k, v] of Object.entries(report.content)) {
  console.log(`${k}: ${v.found}/${v.expected} ${v.ok ? '✓' : '✕'}`);
}
for (const s of report.suites) console.log(`${s.passed ? '✓' : '✕'} ${s.name}`);
console.log(`\n${report.errors.length} errors · ${report.warnings.length} warnings`);
console.log(`STATUS: ${report.status}`);
console.log(`report → ${file}`);
process.exit(report.errors.length ? 1 : 0);
