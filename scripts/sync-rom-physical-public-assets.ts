// Restores the public physical corpus from its ROM render provenance.
//
// PNGs below public/assets/sprites/<form>/physical are ignored build output.
// After a checkout or a corpus update they can therefore be absent even while
// provenance and runtime selectors correctly name them. This script closes
// that gap without consulting the legacy/remake manifest: it renders every
// missing source resource from ROM, then promotes only rom_trimmed/raw canvas
// files named by each provenance record.

import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { dirname, join } from 'path';

const ROOT = process.cwd();
const SPRITES = join(ROOT, 'public/assets/sprites');
const RENDERER = 'tools/rom-research/scripts/render-fighter-physical.ts';

type ProvenanceFrame = {
  file: string;
  rawCanvasFile?: string;
  rawImageFile?: string;
  sourceRender: string;
  resourceId: number | null;
  actorVisualProfileKey: number;
};

type Provenance = { source: string; frames: ProvenanceFrame[]; transparentFrameRecords?: unknown[] };
type PhysicalManifest = { transparentFrameRecords?: unknown[] };

type MissingFrame = { formDir: string; frame: ProvenanceFrame };

function json<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function renderResource(resourceId: number, profileKeys: number[]): void {
  const keys = [...new Set(profileKeys)].sort((a, b) => a - b)
    .map(key => key.toString(16).padStart(2, '0')).join(',');
  const localTsx = join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const args = [RENDERER, '--resource', resourceId.toString(16).padStart(2, '0'), '--keys', keys];
  if (existsSync(localTsx)) {
    execFileSync(process.execPath, [localTsx, ...args], { cwd: ROOT, stdio: 'pipe' });
    return;
  }
  // Invoke npm's JavaScript CLI with Node, not its Windows batch shim.  That
  // makes the renderer synchronous and preserves failures for this recovery
  // script instead of silently returning while npx continues elsewhere.
  if (process.platform === 'win32') {
    const npxCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');
    execFileSync(process.execPath, [npxCli, 'tsx', ...args], { cwd: ROOT, stdio: 'pipe' });
    return;
  }
  execFileSync('npx', ['tsx', ...args], { cwd: ROOT, stdio: 'pipe' });
}

function requiredFiles(frame: ProvenanceFrame): string[] {
  return [frame.file, frame.rawCanvasFile, frame.rawImageFile].filter((file): file is string => !!file);
}

const missing: MissingFrame[] = [];
for (const entry of readdirSync(SPRITES, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const formDir = entry.name;
  const provenancePath = join(SPRITES, formDir, 'provenance.json');
  if (!existsSync(provenancePath)) continue;
  const provenance = json<Provenance>(provenancePath);
  if (provenance.source !== 'ROM_PHYSICAL_FIGHTERS') continue;
  for (const frame of provenance.frames) {
    if (requiredFiles(frame).some(file => !existsSync(join(SPRITES, formDir, file)))) {
      missing.push({ formDir, frame });
    }
  }
}

const renderTargets = new Map<number, Set<number>>();
for (const { frame } of missing) {
  if (frame.resourceId == null) continue; // Bank $61 sources are already static corpus output.
  const keys = renderTargets.get(frame.resourceId) ?? new Set<number>();
  keys.add(frame.actorVisualProfileKey);
  renderTargets.set(frame.resourceId, keys);
}

for (const [resourceId, keys] of [...renderTargets.entries()].sort(([a], [b]) => a - b)) {
  renderResource(resourceId, [...keys]);
}

let promoted = 0;
const unresolved: string[] = [];
for (const { formDir, frame } of missing) {
  const sourceDir = dirname(join(ROOT, frame.sourceRender));
  const sourceByTarget = new Map<string, string>([
    [frame.file, join(sourceDir, 'rom_trimmed.png')],
    ...(frame.rawCanvasFile ? [[frame.rawCanvasFile, join(sourceDir, 'rom_raw_canvas.png')]] : []),
    ...(frame.rawImageFile ? [[frame.rawImageFile, join(sourceDir, 'rom_raw.png')]] : []),
  ]);
  for (const [targetFile, source] of sourceByTarget) {
    const target = join(SPRITES, formDir, targetFile);
    if (!existsSync(source)) {
      unresolved.push(`${formDir}/${targetFile} ← ${source}`);
      continue;
    }
    copyFileSync(source, target);
    promoted++;
  }
}

// This is derived metadata, not an image transformation: an empty ROM frame
// stays empty and must be represented identically in the public physical
// manifest and its provenance.  Checkouts can retain the latter while losing
// ignored build output, so reconcile the two during the same ROM-only repair.
for (const entry of readdirSync(SPRITES, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const formDir = entry.name;
  const provenancePath = join(SPRITES, formDir, 'provenance.json');
  const manifestPath = join(SPRITES, formDir, 'rom-physical.manifest.json');
  if (!existsSync(provenancePath) || !existsSync(manifestPath)) continue;
  const provenance = json<Provenance>(provenancePath);
  if (provenance.source !== 'ROM_PHYSICAL_FIGHTERS') continue;
  const manifest = json<PhysicalManifest>(manifestPath);
  const records = provenance.transparentFrameRecords ?? [];
  if (JSON.stringify(manifest.transparentFrameRecords ?? []) !== JSON.stringify(records)) {
    writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, transparentFrameRecords: records }, null, 2)}\n`);
  }
}

if (unresolved.length) {
  throw new Error(`ROM physical promotion left ${unresolved.length} missing source files:\n${unresolved.join('\n')}`);
}

console.log(`ROM physical public sync: ${missing.length} frame records repaired · ${promoted} ROM files promoted · ${renderTargets.size} resources rendered`);
