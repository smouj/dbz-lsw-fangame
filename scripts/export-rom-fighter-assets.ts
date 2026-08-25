// ═══════════════════════════════════════════════════════════════════════
// P0 Visible — ROM fighter asset export.
// Materializes the physical ROM fighter corpus into a browsable package:
// generated/rom-fighters/<form>/{all_frames,resource_XX/seq_YY,contact_sheet.html}
// Source truth remains public/assets/sprites/<form>/rom-physical.manifest.json
// and provenance.json generated from the ROM.
// ═══════════════════════════════════════════════════════════════════════
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { PNG } from 'pngjs';
import { ROM_FIGHTER_FORM_IDENTITY } from '../src/data/generated/romFighterFormIdentity.generated';
import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../src/data/generated/romPhysicalCorpus.generated';

const ROOT = process.cwd();
const PUBLIC_SPRITES = join(ROOT, 'public/assets/sprites');
const OUT = join(ROOT, 'generated/rom-fighters');
const PHYSICAL_CORPUS_REPORT = join(ROOT, 'docs/rom/generated/physical-corpus');

interface ManifestFrame {
  file: string;
  rawCanvasFile?: string;
  rawImageFile?: string;
  physicalId: string;
  frameIndex: number;
  visualFrameId: number;
  durationTicks: number;
  rawOffsetX: number;
  rawOffsetY: number;
  offsetX: number;
  offsetY: number;
  originX: number;
  originY: number;
  originInTrimX?: number;
  originInTrimY?: number;
}

interface SequenceManifest {
  resource: number;
  sequence: number;
  frames: ManifestFrame[];
}

interface RomPhysicalManifest {
  schemaVersion: number;
  offsetEncoding: string;
  source: string;
  formId: string;
  actorVisualProfileKey: number;
  graphicsBank: number;
  sequences: Record<string, SequenceManifest>;
}

interface ProvenanceFrame {
  physicalId: string;
  file: string;
  rawCanvasFile?: string;
  rawImageFile?: string;
  resourceId: number;
  resourceHex: string;
  visualFrameId: number;
  actorVisualProfileKey: number;
  graphicsBank: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
  originInTrimX?: number;
  originInTrimY?: number;
  trim?: { x: number; y: number; w: number; h: number; originInTrim?: { x: number; y: number } };
  hashes: Record<string, string>;
  palette: { bgr555: string[]; colors: string[] };
  metasprite?: {
    pieces: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      flipX?: boolean;
      flipY?: boolean;
    }>;
  };
  rawBounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
    originX: number;
    originY: number;
  };
  assembly?: {
    pieceCount: number;
    graphicsBlockCount: number;
    renderedPieceCount: number;
    piecesOutsideRaw: number;
    pixelsWrittenOutsideRaw: number;
    assemblyInputHash: string;
    errors: string[];
  };
  occurrences: Array<{
    sequence: number;
    frameIndex: number;
    durationTicks: number;
    rawOffsetX: number;
    rawOffsetY: number;
    offsetX: number;
    offsetY: number;
  }>;
}

interface Provenance {
  schemaVersion: number;
  offsetEncoding: string;
  source: string;
  formProfile: {
    formId: string;
    actorVisualProfileKey: number;
    graphicsBank: number;
    paletteRaw: string[];
    paletteAddress: string;
  };
  frames: ProvenanceFrame[];
}

function hex(value: number, size = 2): string {
  return value.toString(16).padStart(size, '0');
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function cleanDir(path: string): void {
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]!));
}

function css(): string {
  return `
    :root { color-scheme: dark; background: #111; }
    body { margin: 0; background: #111; color: #eee; font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    main { padding: 18px; max-width: 1720px; }
    h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: 0; }
    h2 { margin: 24px 0 8px; font-size: 16px; letter-spacing: 0; }
    .meta { color: #bdbdbd; margin-bottom: 16px; display: flex; gap: 14px; flex-wrap: wrap; }
    .palette { display: inline-flex; gap: 3px; vertical-align: middle; }
    .swatch { width: 14px; height: 14px; border: 1px solid #555; display: inline-block; }
    .grid { display: grid; grid-template-columns: repeat(12, 128px); gap: 8px; align-items: start; }
    .cell { width: 128px; min-height: 128px; box-sizing: border-box; border: 1px solid #333; background: #181818; padding: 5px; overflow: hidden; }
    .sprite { width: 96px; height: 64px; margin: 0 auto 5px; display: grid; place-items: end center; background: repeating-conic-gradient(#202020 0% 25%, #262626 0% 50%) 50% / 12px 12px; }
    .sprite img { max-width: 96px; max-height: 64px; image-rendering: pixelated; }
    .label { color: #fafafa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sub { color: #9e9e9e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .seq { margin-bottom: 18px; }
  `;
}

function frameCell(frame: ManifestFrame, imagePath: string): string {
  return `<div class="cell">
    <div class="sprite"><img src="${esc(imagePath)}" alt="${esc(frame.physicalId)}"></div>
    <div class="label">${esc(frame.physicalId)}</div>
    <div class="sub">f${frame.frameIndex} vf$${hex(frame.visualFrameId)} ${frame.durationTicks}t</div>
    <div class="sub">dx ${frame.offsetX} dy ${frame.offsetY}</div>
  </div>`;
}

function physicalCell(frame: ProvenanceFrame): string {
  return `<div class="cell">
    <div class="sprite"><img src="all_frames/${esc(frame.physicalId)}.png" alt="${esc(frame.physicalId)}"></div>
    <div class="label">${esc(frame.physicalId)}</div>
    <div class="sub">${frame.width}x${frame.height} · origin ${frame.originInTrimX ?? '—'},${frame.originInTrimY ?? '—'} · uses ${frame.occurrences.length}</div>
    <div class="sub">vf$${hex(frame.visualFrameId)} · ${frame.resourceHex}</div>
  </div>`;
}

function writeContactSheetPng(formSrc: string, formOut: string, frames: ProvenanceFrame[]): void {
  const cellW = 96;
  const cellH = 80;
  const cols = 8;
  const rows = Math.max(1, Math.ceil(frames.length / cols));
  const sheet = new PNG({ width: cols * cellW, height: rows * cellH });

  for (let y = 0; y < sheet.height; y++) {
    for (let x = 0; x < sheet.width; x++) {
      const idx = (sheet.width * y + x) << 2;
      const checker = ((Math.floor(x / 8) + Math.floor(y / 8)) & 1) === 0 ? 28 : 34;
      sheet.data[idx] = checker;
      sheet.data[idx + 1] = checker;
      sheet.data[idx + 2] = checker;
      sheet.data[idx + 3] = 255;
    }
  }

  frames.forEach((frame, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const sprite = PNG.sync.read(readFileSync(join(formSrc, frame.file)));
    const startX = col * cellW + Math.floor((cellW - sprite.width) / 2);
    const startY = row * cellH + Math.floor((cellH - sprite.height) / 2);
    for (let sy = 0; sy < sprite.height; sy++) {
      for (let sx = 0; sx < sprite.width; sx++) {
        const si = (sprite.width * sy + sx) << 2;
        const alpha = sprite.data[si + 3];
        if (alpha === 0) continue;
        const dx = startX + sx;
        const dy = startY + sy;
        if (dx < 0 || dy < 0 || dx >= sheet.width || dy >= sheet.height) continue;
        const di = (sheet.width * dy + dx) << 2;
        sheet.data[di] = sprite.data[si];
        sheet.data[di + 1] = sprite.data[si + 1];
        sheet.data[di + 2] = sprite.data[si + 2];
        sheet.data[di + 3] = alpha;
      }
    }
  });

  writeFileSync(join(formOut, 'contact_sheet.png'), PNG.sync.write(sheet));
}

function selectForensicFrames(frames: ProvenanceFrame[]): ProvenanceFrame[] {
  const selected = new Map<string, ProvenanceFrame>();
  const add = (frame: ProvenanceFrame | undefined) => {
    if (frame) selected.set(frame.physicalId, frame);
  };
  const area = (frame: ProvenanceFrame) => frame.width * frame.height;
  const pieceCount = (frame: ProvenanceFrame) => frame.metasprite?.pieces.length ?? 0;
  const hasNegative = (frame: ProvenanceFrame) => frame.metasprite?.pieces.some(piece => piece.x < 0 || piece.y < 0) ?? false;
  const hasFlip = (frame: ProvenanceFrame) => frame.metasprite?.pieces.some(piece => piece.flipX || piece.flipY) ?? false;

  add([...frames].sort((a, b) => area(a) - area(b))[0]);
  add([...frames].sort((a, b) => b.width - a.width)[0]);
  add([...frames].sort((a, b) => b.height - a.height)[0]);
  add([...frames].sort((a, b) => pieceCount(b) - pieceCount(a))[0]);
  add(frames.find(hasNegative));
  add(frames.find(hasFlip));
  for (const frame of frames) {
    if (selected.size >= 6) break;
    add(frame);
  }
  return [...selected.values()].slice(0, 6);
}

const forms = readdirSync(PUBLIC_SPRITES, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .filter(formId => existsSync(join(PUBLIC_SPRITES, formId, 'rom-physical.manifest.json')) && existsSync(join(PUBLIC_SPRITES, formId, 'provenance.json')))
  .sort((a, b) => {
    const aIdentity = ROM_FIGHTER_FORM_IDENTITY.find(item => item.formId === a);
    const bIdentity = ROM_FIGHTER_FORM_IDENTITY.find(item => item.formId === b);
    return (aIdentity?.romFormId ?? 0xff) - (bIdentity?.romFormId ?? 0xff);
  });

cleanDir(OUT);

const catalog: Array<{
  formId: string;
  romFormId: number;
  actorVisualProfileKey: number;
  graphicsBank: number;
  physicalIds: number;
  frameInstances: number;
  resources: string[];
  contactSheetHtml: string;
}> = [];

const globalPhysical = new Map<string, unknown>();
const pixelHashGroups = new Map<string, string[]>();
const auditRows: Array<{
  formId: string;
  romFormId: number;
  actorVisualProfileKey: number;
  graphicsBank: number;
  mappingStatus: string;
  frames: ProvenanceFrame[];
  formSrc: string;
}> = [];

const finalSweepRows: Array<{
  romFormId: number;
  formId: string;
  actorVisualProfileKey: number;
  graphicsBank: number;
  resources: string[];
  sequences: number;
  frameInstances: number;
  physicalIds: number;
  missingPhysicalPngs: number;
  missingRawCanvases: number;
  missingRawImages: number;
  wrongProfileFrames: number;
  wrongBankFrames: number;
  assemblyErrors: number;
  rawErrors: number;
  trimErrors: number;
  errors: string[];
}> = [];

for (const formId of forms) {
  const formSrc = join(PUBLIC_SPRITES, formId);
  const manifest = readJson<RomPhysicalManifest>(join(formSrc, 'rom-physical.manifest.json'));
  const provenance = readJson<Provenance>(join(formSrc, 'provenance.json'));
  const identity = ROM_FIGHTER_FORM_IDENTITY.find(item => item.formId === formId);
  const formOut = join(OUT, formId);
  const allFramesOut = join(formOut, 'all_frames');
  mkdirSync(allFramesOut, { recursive: true });

  const frameById = new Map(provenance.frames.map(frame => [frame.physicalId, frame]));
  for (const frame of provenance.frames) {
    copyFileSync(join(formSrc, frame.file), join(allFramesOut, `${frame.physicalId}.png`));
    if (frame.rawCanvasFile && existsSync(join(formSrc, frame.rawCanvasFile))) {
      copyFileSync(join(formSrc, frame.rawCanvasFile), join(allFramesOut, `${frame.physicalId}.raw-canvas.png`));
    }
    if (frame.rawImageFile && existsSync(join(formSrc, frame.rawImageFile))) {
      copyFileSync(join(formSrc, frame.rawImageFile), join(allFramesOut, `${frame.physicalId}.raw.png`));
    }
    const useLines = frame.occurrences.map(use => ({
      resource: frame.resourceHex,
      sequence: use.sequence,
      frameIndex: use.frameIndex,
      durationTicks: use.durationTicks,
      offsetX: use.offsetX,
      offsetY: use.offsetY,
      rawOffsetX: use.rawOffsetX,
      rawOffsetY: use.rawOffsetY,
    }));
    const metadata = {
      formId,
      romFormId: identity?.romFormId ?? null,
      romRecord: identity?.romRecordCpuAddressHex ?? null,
      actorVisualProfileKey: manifest.actorVisualProfileKey,
      graphicsBank: `0x${hex(manifest.graphicsBank)}`,
      physicalId: frame.physicalId,
      resource: frame.resourceHex,
      visualFrameId: `0x${hex(frame.visualFrameId)}`,
      width: frame.width,
      height: frame.height,
      originX: frame.originX,
      originY: frame.originY,
      originInTrimX: frame.originInTrimX,
      originInTrimY: frame.originInTrimY,
      trim: frame.trim,
      rawCanvas: frame.rawCanvasFile ? `all_frames/${frame.physicalId}.raw-canvas.png` : null,
      rawImage: frame.rawImageFile ? `all_frames/${frame.physicalId}.raw.png` : null,
      rawBounds: frame.rawBounds,
      assembly: frame.assembly,
      palette: frame.palette,
      hashes: frame.hashes,
      uses: useLines,
      evidence: 'ROM_PHYSICAL',
    };
    writeFileSync(join(allFramesOut, `${frame.physicalId}.json`), `${JSON.stringify(metadata, null, 2)}\n`);
    globalPhysical.set(`${formId}:${frame.physicalId}`, metadata);
    const hash = frame.hashes.trimmedPixelHash ?? frame.hashes.rawPixelHash ?? frame.physicalId;
    pixelHashGroups.set(hash, [...(pixelHashGroups.get(hash) ?? []), `${formId}:${frame.physicalId}`]);
  }

  const sequenceSections: string[] = [];
  let frameInstances = 0;
  const resources = new Set<string>();
  const errors: string[] = [];
  for (const sequence of Object.values(manifest.sequences).sort((a, b) => a.resource - b.resource || a.sequence - b.sequence)) {
    const resourceDir = join(formOut, `resource_${hex(sequence.resource)}`);
    const seqDirName = `seq_${hex(sequence.sequence)}`;
    const seqDir = join(resourceDir, seqDirName);
    mkdirSync(seqDir, { recursive: true });
    resources.add(`0x${hex(sequence.resource)}`);
    frameInstances += sequence.frames.length;

    const cells: string[] = [];
    for (const frame of sequence.frames) {
      const source = join(formSrc, frame.file);
      const fileName = `frame_${hex(frame.frameIndex)}_vf_${hex(frame.visualFrameId)}.png`;
      const jsonName = `frame_${hex(frame.frameIndex)}_vf_${hex(frame.visualFrameId)}.json`;
      copyFileSync(source, join(seqDir, fileName));
      const physical = frameById.get(frame.physicalId);
      const metadata = {
        formId,
        romFormId: identity?.romFormId ?? null,
        romRecord: identity?.romRecordCpuAddressHex ?? null,
        actorVisualProfileKey: manifest.actorVisualProfileKey,
        graphicsBank: `0x${hex(manifest.graphicsBank)}`,
        animationResource: `0x${hex(sequence.resource)}`,
        sequence: sequence.sequence,
        frameIndex: frame.frameIndex,
        visualFrameId: `0x${hex(frame.visualFrameId)}`,
        durationTicks: frame.durationTicks,
        rawOffsetX: frame.rawOffsetX,
        rawOffsetY: frame.rawOffsetY,
        offsetX: frame.offsetX,
        offsetY: frame.offsetY,
        originX: frame.originX,
        originY: frame.originY,
        originInTrimX: frame.originInTrimX,
        originInTrimY: frame.originInTrimY,
        rawCanvasFile: frame.rawCanvasFile,
        rawImageFile: frame.rawImageFile,
        physicalId: frame.physicalId,
        sourcePhysicalFile: frame.file,
        rawBounds: physical?.rawBounds,
        assembly: physical?.assembly,
        palette: physical?.palette,
        hashes: physical?.hashes,
        evidence: 'ROM_PHYSICAL',
      };
      writeFileSync(join(seqDir, jsonName), `${JSON.stringify(metadata, null, 2)}\n`);
      cells.push(frameCell(frame, `${relative(formOut, join(seqDir, fileName))}`));
    }
    sequenceSections.push(`<section class="seq"><h2>RESOURCE $${hex(sequence.resource)} · SEQ ${sequence.sequence}</h2><div class="grid">${cells.join('\n')}</div></section>`);
  }

  const palette = provenance.formProfile.paletteRaw.map((raw, index) => index % 2 === 0 ? raw : null).filter((v): v is string => v !== null);
  const missingPhysicalPngs = provenance.frames.filter(frame => !existsSync(join(formSrc, frame.file))).length;
  const missingRawCanvases = provenance.frames.filter(frame => !frame.rawCanvasFile || !existsSync(join(formSrc, frame.rawCanvasFile))).length;
  const missingRawImages = provenance.frames.filter(frame => !frame.rawImageFile || !existsSync(join(formSrc, frame.rawImageFile))).length;
  const wrongProfileFrames = provenance.frames.filter(frame => frame.actorVisualProfileKey !== manifest.actorVisualProfileKey).length;
  const wrongBankFrames = provenance.frames.filter(frame => frame.graphicsBank !== manifest.graphicsBank).length;
  const assemblyErrors = provenance.frames.reduce((total, frame) =>
    total + (frame.assembly?.errors.filter(error => error.startsWith('ASSEMBLY_') || error.startsWith('PIXEL_')).length ?? 0), 0);
  const rawErrors = provenance.frames.reduce((total, frame) =>
    total + (frame.assembly?.errors.filter(error => error.startsWith('RAW_')).length ?? 0), 0);
  const trimErrors = provenance.frames.reduce((total, frame) =>
    total + (frame.assembly?.errors.filter(error => error.startsWith('TRIM_')).length ?? 0), 0);
  if (!identity) errors.push('missing RomFighterIdentity');
  if (manifest.actorVisualProfileKey !== identity?.actorVisualProfileKey) errors.push('manifest profile mismatch');
  if (manifest.graphicsBank !== identity?.graphicsBank) errors.push('manifest graphics bank mismatch');
  if (provenance.formProfile.formId !== formId) errors.push('provenance form mismatch');
  if (missingPhysicalPngs) errors.push(`${missingPhysicalPngs} missing physical PNGs`);
  if (missingRawCanvases) errors.push(`${missingRawCanvases} missing RAW canvases`);
  if (missingRawImages) errors.push(`${missingRawImages} missing clean RAW images`);
  if (wrongProfileFrames) errors.push(`${wrongProfileFrames} wrong-profile frames`);
  if (wrongBankFrames) errors.push(`${wrongBankFrames} wrong-bank frames`);
  if (assemblyErrors) errors.push(`${assemblyErrors} assembly errors`);
  if (rawErrors) errors.push(`${rawErrors} RAW errors`);
  if (trimErrors) errors.push(`${trimErrors} trim errors`);
  if (provenance.frames.length === 0) errors.push('0 physical IDs');
  if (frameInstances === 0) errors.push('0 frame instances');
  finalSweepRows.push({
    romFormId: identity?.romFormId ?? 0xff,
    formId,
    actorVisualProfileKey: manifest.actorVisualProfileKey,
    graphicsBank: manifest.graphicsBank,
    resources: [...resources],
    sequences: Object.keys(manifest.sequences).length,
    frameInstances,
    physicalIds: provenance.frames.length,
    missingPhysicalPngs,
    missingRawCanvases,
    missingRawImages,
    wrongProfileFrames,
    wrongBankFrames,
    assemblyErrors,
    rawErrors,
    trimErrors,
    errors,
  });

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css()}</style></head><body><main>
    <h1>${esc(formId)} — ROM PHYSICAL FIGHTERS</h1>
    <div class="meta">
      <span>profile 0x${hex(manifest.actorVisualProfileKey)}</span>
      <span>graphics bank 0x${hex(manifest.graphicsBank)}</span>
      <span>ROM form $${hex(identity?.romFormId ?? 0)}</span>
      <span>${provenance.frames.length} physical IDs</span>
      <span>${frameInstances} frame instances</span>
      <span>${[...resources].join(', ')}</span>
      <span class="palette">${palette.map((_, i) => `<i class="swatch" style="background:${provenance.frames[0]?.palette.colors[i] ?? '#000'}"></i>`).join('')}</span>
    </div>
    <h2>DEDUPED PHYSICAL FRAMES</h2>
    <div class="grid">${provenance.frames.map(physicalCell).join('\n')}</div>
    ${sequenceSections.join('\n')}
  </main></body></html>`;
  writeFileSync(join(formOut, 'contact_sheet.html'), html);
  writeContactSheetPng(formSrc, formOut, provenance.frames);
  writeFileSync(join(formOut, 'manifest.json'), `${JSON.stringify({
    formId,
    romFormId: identity?.romFormId ?? null,
    romRecord: identity?.romRecordCpuAddressHex ?? null,
    source: 'ROM_PHYSICAL_FIGHTERS',
    schemaVersion: manifest.schemaVersion,
    offsetEncoding: manifest.offsetEncoding,
    actorVisualProfileKey: manifest.actorVisualProfileKey,
    graphicsBank: manifest.graphicsBank,
    physicalIds: provenance.frames.length,
    frameInstances,
    resources: [...resources],
    allFrames: 'all_frames/',
    contactSheetHtml: 'contact_sheet.html',
    contactSheetPng: 'contact_sheet.png',
    note: 'Generated package for visual inspection. Production manifest.json remains separate until visible cutover.',
  }, null, 2)}\n`);
  catalog.push({
    formId,
    romFormId: identity?.romFormId ?? 0xff,
    actorVisualProfileKey: manifest.actorVisualProfileKey,
    graphicsBank: manifest.graphicsBank,
    physicalIds: provenance.frames.length,
    frameInstances,
    resources: [...resources],
    contactSheetHtml: `${formId}/contact_sheet.html`,
  });
  auditRows.push({
    formId,
    romFormId: identity?.romFormId ?? 0xff,
    actorVisualProfileKey: manifest.actorVisualProfileKey,
    graphicsBank: manifest.graphicsBank,
    mappingStatus: identity?.mappingStatus ?? 'UNVERIFIED_PHYSICAL',
    frames: selectForensicFrames(provenance.frames),
    formSrc,
  });
}

function drawTextBlock(sheet: PNG, x: number, y: number, width: number, lines: string[]): void {
  // Minimal block marker: solid bars encode text rows in the PNG while the JSON/HTML
  // carry exact labels. This keeps the visual audit deterministic without fonts.
  lines.slice(0, 4).forEach((line, lineIndex) => {
    const yy = y + lineIndex * 6;
    const barWidth = Math.min(width, Math.max(12, line.length * 4));
    for (let py = 0; py < 4; py++) {
      for (let px = 0; px < barWidth; px++) {
        const idx = (sheet.width * (yy + py) + x + px) << 2;
        sheet.data[idx] = 120;
        sheet.data[idx + 1] = 154;
        sheet.data[idx + 2] = 190;
        sheet.data[idx + 3] = 255;
      }
    }
  });
}

function writeGlobalContactSheet(rows: typeof auditRows): void {
  const labelW = 180;
  const cellW = 64;
  const rowH = 72;
  const cols = 6;
  const sheet = new PNG({ width: labelW + cols * cellW, height: Math.max(1, rows.length) * rowH });

  for (let y = 0; y < sheet.height; y++) {
    for (let x = 0; x < sheet.width; x++) {
      const idx = (sheet.width * y + x) << 2;
      const checker = ((Math.floor(x / 8) + Math.floor(y / 8)) & 1) === 0 ? 22 : 30;
      sheet.data[idx] = x < labelW ? 16 : checker;
      sheet.data[idx + 1] = x < labelW ? 22 : checker;
      sheet.data[idx + 2] = x < labelW ? 32 : checker;
      sheet.data[idx + 3] = 255;
    }
  }

  rows.forEach((row, rowIndex) => {
    const y = rowIndex * rowH;
    drawTextBlock(sheet, 8, y + 8, labelW - 16, [
      row.formId,
      `p${hex(row.actorVisualProfileKey)} g${hex(row.graphicsBank)}`,
      row.mappingStatus,
    ]);
    row.frames.forEach((frame, frameIndex) => {
      const sprite = PNG.sync.read(readFileSync(join(row.formSrc, frame.file)));
      const startX = labelW + frameIndex * cellW + Math.floor((cellW - sprite.width) / 2);
      const startY = y + Math.floor((rowH - sprite.height) / 2);
      for (let sy = 0; sy < sprite.height; sy++) {
        for (let sx = 0; sx < sprite.width; sx++) {
          const si = (sprite.width * sy + sx) << 2;
          const alpha = sprite.data[si + 3];
          if (alpha === 0) continue;
          const dx = startX + sx;
          const dy = startY + sy;
          if (dx < labelW || dy < 0 || dx >= sheet.width || dy >= sheet.height) continue;
          const di = (sheet.width * dy + dx) << 2;
          sheet.data[di] = sprite.data[si];
          sheet.data[di + 1] = sprite.data[si + 1];
          sheet.data[di + 2] = sprite.data[si + 2];
          sheet.data[di + 3] = alpha;
        }
      }
    });
  });

  writeFileSync(join(OUT, 'contact_sheet_48_forms.png'), PNG.sync.write(sheet));
  writeFileSync(join(OUT, 'contact_sheet_48_forms.json'), `${JSON.stringify(rows.map(row => ({
    formId: row.formId,
    actorVisualProfileKey: row.actorVisualProfileKey,
    graphicsBank: row.graphicsBank,
    mappingStatus: row.mappingStatus,
    physicalIds: row.frames.map(frame => frame.physicalId),
    files: row.frames.map(frame => frame.file),
  })), null, 2)}\n`);
  const htmlRows = rows.map(row => `<tr>
    <td><strong>${esc(row.formId)}</strong><br><span>p$${hex(row.actorVisualProfileKey)} · g$${hex(row.graphicsBank)} · ${esc(row.mappingStatus)}</span></td>
    ${row.frames.map(frame => `<td><img src="${esc(`${row.formId}/all_frames/${frame.physicalId}.png`)}" alt="${esc(frame.physicalId)}"><br><code>${esc(frame.physicalId)}</code></td>`).join('')}
  </tr>`).join('\n');
  writeFileSync(join(OUT, 'contact_sheet_48_forms.html'), `<!doctype html><html><head><meta charset="utf-8"><style>
    ${css()}
    table { border-collapse: collapse; width: 100%; }
    td { border: 1px solid #303844; padding: 6px; vertical-align: top; background: #151a20; }
    td:first-child { width: 220px; color: #dcecff; }
    img { image-rendering: pixelated; max-width: 72px; max-height: 72px; }
    code { display: block; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #9eb4ca; }
  </style></head><body><main>
    <h1>48-FORM ROM PHYSICAL AUDIT</h1>
    <div class="meta">Rows are forms. Cells are representative deduped ROM physical frames. Identity labels come from romFighterFormIdentity.generated.ts.</div>
    <table>${htmlRows}</table>
  </main></body></html>`);
}

writeGlobalContactSheet(auditRows);

function drawPngInto(sheet: PNG, sprite: PNG, x: number, y: number, maxW: number, maxH: number): void {
  const startX = x + Math.floor((maxW - sprite.width) / 2);
  const startY = y + Math.floor((maxH - sprite.height) / 2);
  for (let sy = 0; sy < sprite.height; sy++) {
    for (let sx = 0; sx < sprite.width; sx++) {
      const si = (sprite.width * sy + sx) << 2;
      const alpha = sprite.data[si + 3];
      if (alpha === 0) continue;
      const dx = startX + sx;
      const dy = startY + sy;
      if (dx < x || dy < y || dx >= x + maxW || dy >= y + maxH || dx >= sheet.width || dy >= sheet.height) continue;
      const di = (sheet.width * dy + dx) << 2;
      sheet.data[di] = sprite.data[si];
      sheet.data[di + 1] = sprite.data[si + 1];
      sheet.data[di + 2] = sprite.data[si + 2];
      sheet.data[di + 3] = alpha;
    }
  }
}

function writeForensicContactSheet(rows: typeof auditRows): void {
  const labelW = 190;
  const cellW = 96;
  const rowH = 132;
  const cols = 6;
  const sheet = new PNG({ width: labelW + cols * cellW, height: Math.max(1, rows.length) * rowH });

  for (let y = 0; y < sheet.height; y++) {
    for (let x = 0; x < sheet.width; x++) {
      const idx = (sheet.width * y + x) << 2;
      const checker = ((Math.floor(x / 8) + Math.floor(y / 8)) & 1) === 0 ? 20 : 29;
      sheet.data[idx] = x < labelW ? 14 : checker;
      sheet.data[idx + 1] = x < labelW ? 20 : checker;
      sheet.data[idx + 2] = x < labelW ? 28 : checker;
      sheet.data[idx + 3] = 255;
    }
  }

  rows.forEach((row, rowIndex) => {
    const y = rowIndex * rowH;
    drawTextBlock(sheet, 8, y + 8, labelW - 16, [
      row.formId,
      `p${hex(row.actorVisualProfileKey)} g${hex(row.graphicsBank)}`,
      row.mappingStatus,
      'RAW / TRIM',
    ]);

    row.frames.forEach((frame, frameIndex) => {
      const x = labelW + frameIndex * cellW;
      const rawPath = frame.rawCanvasFile ? join(row.formSrc, frame.rawCanvasFile) : null;
      const raw = rawPath && existsSync(rawPath) ? PNG.sync.read(readFileSync(rawPath)) : null;
      const trimmed = PNG.sync.read(readFileSync(join(row.formSrc, frame.file)));
      if (raw) drawPngInto(sheet, raw, x, y + 4, cellW, 60);
      drawPngInto(sheet, trimmed, x, y + 68, cellW, 60);
    });
  });

  writeFileSync(join(OUT, 'contact_sheet_48_forms_forensic.png'), PNG.sync.write(sheet));
  writeFileSync(join(OUT, 'contact_sheet_48_forms_forensic.json'), `${JSON.stringify(rows.map(row => ({
    formId: row.formId,
    actorVisualProfileKey: row.actorVisualProfileKey,
    graphicsBank: row.graphicsBank,
    mappingStatus: row.mappingStatus,
    frames: row.frames.map(frame => ({
      physicalId: frame.physicalId,
      file: frame.file,
      rawCanvasFile: frame.rawCanvasFile,
      rawImageFile: frame.rawImageFile,
      width: frame.width,
      height: frame.height,
      pieces: frame.metasprite?.pieces.length ?? null,
      renderedPieces: frame.assembly?.renderedPieceCount ?? null,
      assemblyInputHash: frame.assembly?.assemblyInputHash ?? null,
      assemblyErrors: frame.assembly?.errors ?? [],
      rawBounds: frame.rawBounds ?? null,
      hasNegativePiece: frame.metasprite?.pieces.some(piece => piece.x < 0 || piece.y < 0) ?? null,
      hasFlipPiece: frame.metasprite?.pieces.some(piece => piece.flipX || piece.flipY) ?? null,
    })),
  })), null, 2)}\n`);
}

writeForensicContactSheet(auditRows);

writeFileSync(join(OUT, 'final_sweep_48_forms.json'), `${JSON.stringify({
  source: 'ROM_PHYSICAL_FIGHTERS',
  romSha256: 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804',
  rows: finalSweepRows.length,
  totalPhysicalIds: finalSweepRows.reduce((total, row) => total + row.physicalIds, 0),
  totalFrameInstances: finalSweepRows.reduce((total, row) => total + row.frameInstances, 0),
  totalAssemblyErrors: finalSweepRows.reduce((total, row) => total + row.assemblyErrors, 0),
  totalRawErrors: finalSweepRows.reduce((total, row) => total + row.rawErrors, 0),
  totalTrimErrors: finalSweepRows.reduce((total, row) => total + row.trimErrors, 0),
  totalErrors: finalSweepRows.reduce((total, row) => total + row.errors.length, 0),
  forms: finalSweepRows,
}, null, 2)}\n`);

writeFileSync(join(OUT, 'final_sweep_48_forms.md'), [
  '# ROM Fighter Final Sweep 48/48',
  '',
  '| # | Form | Profile | Bank | Resources | Sequences | Instances | Physical IDs | Assembly Errors | RAW Errors | Trim Errors | Errors |',
  '| -: | ---- | ------: | ---: | --------- | --------: | --------: | -----------: | --------------: | ---------: | ----------: | ------ |',
  ...finalSweepRows.map(row => [
    `| ${row.romFormId}`,
    `\`${row.formId}\``,
    `\`$${hex(row.actorVisualProfileKey)}\``,
    `\`$${hex(row.graphicsBank)}\``,
    row.resources.map(resource => `\`${resource}\``).join(' '),
    row.sequences,
    row.frameInstances,
    row.physicalIds,
    row.assemblyErrors,
    row.rawErrors,
    row.trimErrors,
    row.errors.length ? row.errors.map(error => `\`${error}\``).join(' ') : '`0`',
    '|',
  ].join(' ')),
  '',
  `Totals: ${finalSweepRows.length}/48 forms, ${finalSweepRows.reduce((total, row) => total + row.physicalIds, 0)} physical IDs, ${finalSweepRows.reduce((total, row) => total + row.frameInstances, 0)} frame instances, ${finalSweepRows.reduce((total, row) => total + row.errors.length, 0)} errors.`,
  '',
].join('\n'));

const resourceCompletion = {
  source: 'ROM_PHYSICAL_FIGHTERS',
  scope: 'AnimationResource physical promotion matrix; RENDERABLE means promoted into the certified Fighter corpus, not merely decoded.',
  totals: ROM_PHYSICAL_CORPUS_SUMMARY.resourceCompletionTotals,
  resources: ROM_PHYSICAL_CORPUS_SUMMARY.resourcePhysicalCompletion,
};
writeFileSync(join(OUT, 'resource_physical_completion.json'), `${JSON.stringify(resourceCompletion, null, 2)}\n`);
writeFileSync(join(OUT, 'resource_physical_completion.md'), [
  '# AnimationResource Physical Completion',
  '',
  'This matrix is copied next to the 48-form sweep so visual audit and resource promotion coverage stay together.',
  '',
  `Renderable resources: ${resourceCompletion.totals.renderable}/${resourceCompletion.totals.resources}`,
  '',
  '| Resource | Consumers | Sequences | Frames | Physical linkage | Profiles rendered | Physical IDs | Frame instances | Status | Blocking reason |',
  '| -------- | --------: | --------: | -----: | ---------------- | ----------------: | -----------: | --------------: | ------ | --------------- |',
  ...resourceCompletion.resources.map(row => [
    `\`${row.resourceHex}\``,
    row.consumerCount,
    row.sequences,
    row.frames,
    `\`${row.physicalLinkage}\``,
    row.profilesRendered,
    row.physicalIds,
    row.frameInstances,
    `\`${row.status}\``,
    row.blockingReason === '—' ? '—' : row.blockingReason.replace(/\|/g, '/'),
  ].join(' | ')).map(row => `| ${row} |`),
  '',
  `Source mirror: \`${relative(OUT, join(PHYSICAL_CORPUS_REPORT, 'resource_physical_completion.json'))}\``,
  '',
].join('\n'));

writeFileSync(join(OUT, 'catalog.json'), `${JSON.stringify({
  source: 'ROM_PHYSICAL_FIGHTERS',
  forms: catalog.length,
  physicalIds: catalog.reduce((total, item) => total + item.physicalIds, 0),
  frameInstances: catalog.reduce((total, item) => total + item.frameInstances, 0),
  formsCatalog: catalog,
}, null, 2)}\n`);

writeFileSync(join(OUT, 'physical_catalog.json'), `${JSON.stringify({
  source: 'ROM_PHYSICAL_FIGHTERS',
  identity: 'formId + physicalId; physicalId = ROM SHA + actorVisualProfileKey + graphicsBank + AnimationResource + visualFrameId + metasprite hash + graphics hash',
  physicalEntries: [...globalPhysical.values()],
  pixelHashGroups: [...pixelHashGroups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([hash, ids]) => ({ hash, ids })),
}, null, 2)}\n`);

console.log(`ROM fighter asset export: ${catalog.length} forms · ${catalog.reduce((total, item) => total + item.physicalIds, 0)} physical IDs · ${catalog.reduce((total, item) => total + item.frameInstances, 0)} frame instances`);
console.log(`Output: ${OUT}`);
