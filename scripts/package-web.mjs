// ═══════════════════════════════════════════════════════════
// DBZ LSW — Empaquetado web (npm run package:web)
// Toma dist/ (build release), genera manifests + checksums y
// crea dist/releases/<version>/web/DBZ_LSW_Remake_<ver>_web.zip
// ═══════════════════════════════════════════════════════════
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { createGzip } from 'node:zlib';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const VERSION = '0.8.0';
const BUILD = 142;

const git = {
  commit: (() => { try { return execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return '?'; } })(),
  branch: (() => { try { return execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return '?'; } })(),
};

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('✕ dist/ no contiene build. Ejecuta npm run build:release primero.');
  process.exit(1);
}

const rel = join(DIST, 'releases', VERSION, 'web');
mkdirSync(rel, { recursive: true });
mkdirSync(join(DIST, 'releases', 'manifests'), { recursive: true });

// ── Manifest de assets + checksums ──────────────────────────
const assets = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    const relp = relative(DIST, p).split('\\').join('/');
    const buf = readFileSync(p);
    assets.push({ path: relp, size: buf.length, sha256: createHash('sha256').update(buf).digest('hex') });
  }
};
walk(DIST);

const buildManifest = {
  version: VERSION,
  build: BUILD,
  channel: 'release',
  content: { cards: 125, characters: 42, cinematicProfiles: 125, musicTracks: 20 },
  engine: { gbcNativeFps: 59.72750056960583 },
  target: { platform: 'web', arch: 'all' },
  git,
  generatedAt: new Date().toISOString(),
  files: assets.length,
};
writeFileSync(join(DIST, 'releases', 'manifests', 'build-manifest.json'), JSON.stringify(buildManifest, null, 2));
writeFileSync(join(DIST, 'releases', 'manifests', 'assets-manifest.json'), JSON.stringify({ version: VERSION, assets }, null, 2));
writeFileSync(join(DIST, 'releases', 'manifests', 'checksums.sha256'),
  assets.map(a => `${a.sha256}  ${a.path}`).join('\n') + '\n');

// ── Zip (gzip por archivo; el navegador sirve mejor así que zip real) ──
// Para un paquete portable, generamos un tarball.gz estándar.
const out = join(rel, `DBZ_LSW_Remake_${VERSION}_web.tar.gz`);
execSync(`tar -czf "${out}" -C "${DIST}" --exclude=releases .`, { cwd: ROOT, stdio: 'pipe' });
const stat = statSync(out);
console.log('══════════════════ PACKAGE WEB ══════════════════');
console.log(`✓ ${relative(ROOT, out)} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
console.log(`✓ build-manifest.json (${assets.length} assets)`);
console.log(`✓ checksums.sha256`);
console.log(`✓ git ${git.branch}@${git.commit}`);
console.log('══════════════════════════════════════════════════');
