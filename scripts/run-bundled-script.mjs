import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const [source, outfile, ...scriptArgs] = process.argv.slice(2);

if (!source || !outfile) {
  console.error('Usage: node scripts/run-bundled-script.mjs <source.ts> <outfile.mjs> [...args]');
  process.exitCode = 2;
} else {
  const outputPath = resolve(outfile);
  try {
    await build({
      entryPoints: [source],
      outfile: outputPath,
      bundle: true,
      format: 'esm',
      platform: 'node',
      logLevel: 'info',
    });

    const result = spawnSync(process.execPath, [outputPath, ...scriptArgs], {
      stdio: 'inherit',
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    await rm(outputPath, { force: true });
  }
}
