import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('Distribution verification requires a release build in dist/.');
  process.exit(1);
}

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else files.push(path);
  }
};
walk(DIST);

const forbiddenExtensions = new Set(['.gb', '.gbc', '.sav', '.srm']);
const forbiddenFiles = files.filter((path) => forbiddenExtensions.has(extname(path).toLowerCase()));
const textFiles = files.filter((path) => ['.html', '.js', '.css', '.json'].includes(extname(path).toLowerCase()));
const devLeaks = [];

for (const path of textFiles) {
  const source = readFileSync(path, 'utf8');
  if (/Dev Studio|#dev\/(?:dashboard|characters|hud|romdisplay)|__dev\/(?:write|delete|flip)/i.test(source)) {
    devLeaks.push(relative(DIST, path));
  }
}

const oversized = files
  .filter((path) => statSync(path).size > 100 * 1024 * 1024)
  .map((path) => relative(DIST, path));

const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const config = JSON.parse(readFileSync(join(ROOT, 'src-tauri', 'tauri.conf.json'), 'utf8'));
const cargo = readFileSync(join(ROOT, 'src-tauri', 'Cargo.toml'), 'utf8');
const gameConfig = readFileSync(join(ROOT, 'src', 'config', 'game.config.ts'), 'utf8');
const versionParity = config.version === version
  && new RegExp(`version\\s*=\\s*"${version.replaceAll('.', '\\.') }"`).test(cargo)
  && new RegExp(`version:\\s*'${version.replaceAll('.', '\\.') }'`).test(gameConfig);

const indexHash = createHash('sha256').update(readFileSync(join(DIST, 'index.html'))).digest('hex').slice(0, 12);
const failures = [
  ...(forbiddenFiles.length ? [`ROM/save files bundled: ${forbiddenFiles.map((p) => relative(DIST, p)).join(', ')}`] : []),
  ...(devLeaks.length ? [`Dev-only code exposed: ${devLeaks.join(', ')}`] : []),
  ...(oversized.length ? [`Unexpected files above 100 MiB: ${oversized.join(', ')}`] : []),
  ...(!versionParity ? [`Version mismatch (package=${version}, tauri=${config.version})`] : []),
];

console.log('════════════ DISTRIBUTION VERIFICATION ════════════');
console.log(`files: ${files.length}`);
console.log(`index sha256: ${indexHash}`);
console.log(`ROM/save files: ${forbiddenFiles.length}`);
console.log(`Dev-only leaks: ${devLeaks.length}`);
console.log(`version parity: ${versionParity ? 'PASS' : 'FAIL'} (${version})`);
if (failures.length) {
  for (const failure of failures) console.error(`✕ ${failure}`);
  process.exit(1);
}
console.log('STATUS: RELEASE CONTENT PASS');

