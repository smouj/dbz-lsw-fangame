import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface ManifestFrame {
  name?: string;
  file?: string;
  w?: number;
  h?: number;
}

interface ManifestPose {
  frames?: ManifestFrame[];
}

const ROOT = process.cwd();
const SPRITES_DIR = resolve(ROOT, 'public/assets/sprites');
const OUT = resolve(ROOT, 'src/data/generated/manifestFrameIndex.generated.ts');

function q(value: string): string {
  return JSON.stringify(value);
}

const records: string[] = [];
for (const dir of readdirSync(SPRITES_DIR).sort()) {
  const manifestPath = resolve(SPRITES_DIR, dir, 'manifest.json');
  let manifest: Record<string, ManifestPose>;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, ManifestPose>;
  } catch {
    continue;
  }
  for (const pose of Object.keys(manifest).sort()) {
    const frames = manifest[pose]?.frames ?? [];
    for (let index = 0; index < frames.length; index++) {
      const frame = frames[index];
      if (!frame.file) continue;
      records.push(
        `  { formId: ${q(dir)}, dir: ${q(dir)}, pose: ${q(pose)}, index: ${index}, file: ${q(frame.file)}, name: ${q(frame.name ?? frame.file.replace(/\\.png$/i, ''))}, w: ${frame.w ?? 0}, h: ${frame.h ?? 0} },`,
      );
    }
  }
}

const lines = [
  '// ═══════════════════════════════════════════════════════════════════════',
  '// manifestFrameIndex.generated.ts — GENERADO por scripts/generate-manifest-frame-index.ts',
  '// Fuente: public/assets/sprites/<form>/manifest.json actuales.',
  '// NO editar a mano — regenerar si cambian los manifests.',
  '// ═══════════════════════════════════════════════════════════════════════',
  '',
  'export interface ManifestFrameRecord {',
  '  formId: string;',
  '  dir: string;',
  '  pose: string;',
  '  index: number;',
  '  file: string;',
  '  name: string;',
  '  w: number;',
  '  h: number;',
  '}',
  '',
  'export const MANIFEST_FRAME_INDEX: readonly ManifestFrameRecord[] = [',
  ...records,
  '];',
  '',
  'export function manifestForms(): string[] {',
  '  return [...new Set(MANIFEST_FRAME_INDEX.map(frame => frame.formId))].sort();',
  '}',
  '',
  'export function manifestPoseNames(formId: string): string[] {',
  '  return [...new Set(MANIFEST_FRAME_INDEX.filter(frame => frame.formId === formId).map(frame => frame.pose))].sort();',
  '}',
  '',
  'export function manifestFramesFor(formId: string, pose: string): ManifestFrameRecord[] {',
  '  return MANIFEST_FRAME_INDEX.filter(frame => frame.formId === formId && frame.pose === pose).sort((a, b) => a.index - b.index);',
  '}',
  '',
  'export function manifestFrame(formId: string, pose: string, index: number): ManifestFrameRecord | undefined {',
  '  return manifestFramesFor(formId, pose)[index];',
  '}',
  '',
  'export function manifestFileUsage(formId: string, file: string): ManifestFrameRecord[] {',
  '  return MANIFEST_FRAME_INDEX.filter(frame => frame.formId === formId && frame.file === file);',
  '}',
  '',
].join('\n');

writeFileSync(OUT, lines);
console.log(`✅ ${OUT} (${records.length} frames)`);
