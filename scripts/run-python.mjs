import { spawnSync } from 'node:child_process';

const python = process.platform === 'win32' ? 'python' : 'python3';
const result = spawnSync(python, process.argv.slice(2), {
  stdio: 'inherit',
  env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
