// Verifies that obsolete diagnostic material is archived or clearly separated
// from the active ROM/runtime canon.
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`PASS ${name}${detail ? ` - ${detail}` : ''}`);
  else {
    failures++;
    console.log(`FAIL ${name}${detail ? ` - ${detail}` : ''}`);
  }
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const rel = relative(ROOT, path);
    if (rel.includes('node_modules/') || rel.startsWith('dist/') || rel.startsWith('.git/')) continue;
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const activeMemoryVariants = existsSync(join(ROOT, 'memory'))
  ? readdirSync(join(ROOT, 'memory')).filter(name => /^2026-08-25-\d+\.md$/.test(name))
  : [];
check('canonical daily memory has no active timestamped variants', activeMemoryVariants.length === 0, activeMemoryVariants.join(', ') || 'none');
check('timestamped 2026-08-25 memory variants are archived',
  existsSync(join(ROOT, 'memory/archive/obsolete-timestamped-2026-08-25')),
  'memory/archive/obsolete-timestamped-2026-08-25');

const activeTextFiles = [
  ...walk(join(ROOT, 'src')),
  ...walk(join(ROOT, 'scripts')),
  ...walk(join(ROOT, 'tools')),
  ...walk(join(ROOT, 'docs')),
].filter(path =>
  /\.(ts|tsx|js|jsx|md|json|csv|txt)$/.test(path) &&
  !relative(ROOT, path).startsWith('docs/rom/research-') &&
  !relative(ROOT, path).startsWith('docs/audio/') &&
  !relative(ROOT, path).startsWith('docs/battle-backgrounds-v2/') &&
  !relative(ROOT, path).includes('/archive/'));

const stalePromotedCorpusClaims: string[] = [];
for (const path of activeTextFiles) {
  const rel = relative(ROOT, path);
  const text = readFileSync(path, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (
      /(560\s+physical IDs|560\/560|2410\s+frame instances|2410\/2410|physicalIdentities\s*===\s*560|frameInstances\s*===\s*2410)/i.test(line) &&
      !/transparent|EMPTY_NOT_PROMOTED|not promoted|superseded|archive|historical/i.test(line)
    ) {
      stalePromotedCorpusClaims.push(`${rel}:${index + 1}: ${line.trim()}`);
    }
  });
}
check('active docs/code do not claim stale promoted corpus totals', stalePromotedCorpusClaims.length === 0, stalePromotedCorpusClaims.slice(0, 8).join(' | ') || 'none');

const requiredCanonFiles = [
  'generated/rom-fighters/final_sweep_48_forms.json',
  'generated/rom-fighters/resource_physical_completion.json',
  'docs/rom/generated/physical-corpus/summary.json',
  'docs/rom/generated/physical-corpus/resource_physical_completion.json',
  'src/data/generated/romPhysicalCorpus.generated.ts',
];
check('current physical-corpus canon files exist', requiredCanonFiles.every(file => existsSync(join(ROOT, file))), requiredCanonFiles.filter(file => !existsSync(join(ROOT, file))).join(', ') || 'all present');

const physicalCorpusGenerated = readFileSync(join(ROOT, 'src/data/generated/romPhysicalCorpus.generated.ts'), 'utf8');
check('current generated corpus exposes fighter and Stage-promoted totals',
  physicalCorpusGenerated.includes('"fighterPhysicalIdentities": 809') &&
  physicalCorpusGenerated.includes('"fighterFrameInstances": 5767') &&
  physicalCorpusGenerated.includes('"physicalIdentities": 3257') &&
  physicalCorpusGenerated.includes('"frameInstances": 21079') &&
  physicalCorpusGenerated.includes('"transparentPhysicalIds": 7') &&
  physicalCorpusGenerated.includes('"transparentFrameRecords": 36'));

if (failures) {
  console.log(`\nworkspace-hygiene: ${failures} failure(s)`);
  process.exit(1);
}

console.log('\nworkspace-hygiene: active canon is separated from archived/obsolete material');
