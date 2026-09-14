// Build ROM Sprite Atlas exports from the canonical physical corpus.
//
// Identity and geometry remain ROM generated.  The PNGs are only a
// materialization step and are safely regenerable because physical assets are
// ignored build output.  Missing materializations are recorded explicitly.
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PNG } from 'pngjs';
import {
  enrichRomSpriteAtlasForm,
  romSpriteAtlasExport,
  romSpriteAtlasMetrics,
  ROM_SPRITE_ATLAS_FORMS,
  type RomSpriteAtlasForm,
} from '../src/devtools/romdisplay2/romSpriteAtlas';

const ROOT = resolve(process.cwd());
const SOURCE_ROOT = join(ROOT, 'public', 'assets', 'sprites');
const OUT_ROOT = join(ROOT, 'generated', 'rom-sprite-atlas');
const CELL = 96;
const COLUMNS = 8;

function formWithDiskProvenance(form: RomSpriteAtlasForm): RomSpriteAtlasForm {
  const path = join(SOURCE_ROOT, form.formId, 'provenance.json');
  if (!existsSync(path)) return form;
  try {
    const json = JSON.parse(readFileSync(path, 'utf8')) as { frames?: unknown[] };
    return enrichRomSpriteAtlasForm(form, (json.frames ?? []) as never);
  } catch {
    return form;
  }
}

function writeForm(formInput: RomSpriteAtlasForm): { formId: string; frames: number; missing: number } {
  const form = formWithDiskProvenance(formInput);
  const out = join(OUT_ROOT, form.formId);
  const framesOut = join(out, 'frames');
  mkdirSync(framesOut, { recursive: true });
  const frameEntries: Array<Record<string, unknown>> = [];
  const images: Array<{ frame: typeof form.frames[number]; image: PNG; index: number }> = [];
  let missing = 0;

  form.frames.forEach((frame, index) => {
    const source = join(SOURCE_ROOT, form.formId, frame.file.replaceAll('/', '\\'));
    const frameName = `frame_${String(index).padStart(3, '0')}.png`;
    const destination = join(framesOut, frameName);
    const materialized = existsSync(source);
    if (materialized) {
      copyFileSync(source, destination);
      try { images.push({ frame, image: PNG.sync.read(readFileSync(source)), index }); } catch { /* explicit missing atlas tile below */ }
    } else {
      missing++;
    }
    frameEntries.push({
      physicalId: frame.physicalId,
      visualFrameIds: [frame.visualFrameId],
      frameFile: `frames/${frameName}`,
      sourceFile: frame.file,
      rawImageFile: frame.rawImageFile,
      x: null,
      y: null,
      w: frame.width,
      h: frame.height,
      originX: frame.originX,
      originY: frame.originY,
      anchorX: frame.anchorX,
      anchorY: frame.anchorY,
      uses: frame.uses,
      materialized,
      provenance: {
        metaspriteHash: frame.metaspriteHash,
        graphicsHash: frame.graphicsHash,
        sourceProvenanceHash: frame.sourceProvenanceHash,
        trimmedPixelHash: frame.trimmedPixelHash,
      },
    });
  });

  // Contact sheet: native pixel dimensions, centered in fixed cells, no
  // filtering/upscaling.  A missing source never receives a fake image.
  if (images.length > 0) {
    const rows = Math.ceil(images.length / COLUMNS);
    const atlas = new PNG({ width: COLUMNS * CELL, height: rows * CELL });
    images.forEach(({ image, index }) => {
      const col = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      const x0 = col * CELL + Math.max(0, Math.floor((CELL - image.width) / 2));
      const y0 = row * CELL + Math.max(0, Math.floor((CELL - image.height) / 2));
      PNG.bitblt(image, atlas, 0, 0, image.width, image.height, x0, y0);
      const entry = frameEntries[index];
      entry.x = x0;
      entry.y = y0;
      entry.w = image.width;
      entry.h = image.height;
    });
    writeFileSync(join(out, 'atlas.png'), PNG.sync.write(atlas));
  }

  const exported = romSpriteAtlasExport(form) as { frames?: unknown[]; [key: string]: unknown };
  writeFileSync(join(out, 'atlas.json'), `${JSON.stringify({
    ...exported,
    generatedAt: 'deterministic-from-rom-physical-corpus',
    contactSheet: images.length > 0 ? 'atlas.png' : null,
    frames: frameEntries,
  }, null, 2)}\n`);
  return { formId: form.formId, frames: form.frames.length, missing };
}

mkdirSync(OUT_ROOT, { recursive: true });
const forms = ROM_SPRITE_ATLAS_FORMS.map(writeForm);
const missing = forms.reduce((sum, form) => sum + form.missing, 0);
writeFileSync(join(OUT_ROOT, 'index.json'), `${JSON.stringify({
  schemaVersion: 1,
  source: 'ROM_PHYSICAL_FIGHTERS',
  metrics: romSpriteAtlasMetrics(),
  forms,
  generatedAt: 'deterministic-from-rom-physical-corpus',
}, null, 2)}\n`);
console.log(`ROM Sprite Atlas: ${forms.length} forms · ${forms.reduce((sum, form) => sum + form.frames, 0)} frames · ${missing} materializations missing`);
