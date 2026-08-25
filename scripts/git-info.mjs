// Genera public/release/git-info.json (branch, commit, dirty) para el
// RELEASE STATUS del Dev Studio. Se lanza en predev/prebuild/preview/release.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const sh = (cmd) => { try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return '?'; } };
const info = {
  branch: sh('git rev-parse --abbrev-ref HEAD'),
  commit: sh('git rev-parse --short HEAD'),
  dirty: sh('git status --porcelain').length > 0,
  generatedAt: new Date().toISOString(),
};
const out = join(ROOT, 'public', 'release');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'git-info.json'), JSON.stringify(info, null, 2));
console.log(`git-info: ${info.branch} ${info.commit} ${info.dirty ? 'DIRTY' : 'CLEAN'}`);
