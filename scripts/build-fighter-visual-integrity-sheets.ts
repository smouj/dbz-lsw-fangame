// ═══════════════════════════════════════════════════════════════════════
// P0.4R-VI — contact sheets por forma para revisión visual pieza a pieza.
//
// Por cada forma genera:
//   generated/rom-fighters/<form>/contact_sheet_visual_integrity.png
//
// Cada celda = un physicalId promovido, mostrando:
//   · TRIMMED (frame promovido) con OVERLAY de las cajas 8×16 de cada pieza
//   · RAW canvas (recortado) como referencia forense
//   · etiqueta: resource · vfid · pieces · flips
// ═══════════════════════════════════════════════════════════════════════
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';

const ROOT = process.cwd();
const SPRITES = join(ROOT, 'public/assets/sprites');
const OUT = join(ROOT, 'generated/rom-fighters');

interface Piece { x: number; y: number; flipX?: boolean; flipY?: boolean }
interface Frame {
  physicalId: string;
  file: string;
  rawCanvasFile?: string;
  resourceId: number;
  visualFrameId: number;
  trim: { x: number; y: number; w: number; h: number };
  metasprite: { pieces: Piece[] };
}

interface Provenance {
  formProfile: { formId: string };
  frames: Frame[];
}

const CELL = 72;
const GAP = 6;
const COLS = 8;

function readPng(path: string): PNG { return PNG.sync.read(readFileSync(path)); }

function copyInto(dst: PNG, src: PNG, dx: number, dy: number, scale: number): void {
  for (let y = 0; y < src.height * scale; y++) {
    for (let x = 0; x < src.width * scale; x++) {
      const sx = Math.floor(x / scale);
      const sy = Math.floor(y / scale);
      const so = (sy * src.width + sx) * 4;
      const doX = dx + x;
      const doY = dy + y;
      if (doX < 0 || doY < 0 || doX >= dst.width || doY >= dst.height) continue;
      const d = (doY * dst.width + doX) * 4;
      dst.data[d] = src.data[so];
      dst.data[d + 1] = src.data[so + 1];
      dst.data[d + 2] = src.data[so + 2];
      dst.data[d + 3] = src.data[so + 3];
    }
  }
}

function rect(dst: PNG, x: number, y: number, w: number, h: number, r: number, g: number, b: number): void {
  for (let i = 0; i < w; i++) { setPx(dst, x + i, y, r, g, b); setPx(dst, x + i, y + h - 1, r, g, b); }
  for (let j = 0; j < h; j++) { setPx(dst, x, y + j, r, g, b); setPx(dst, x + w - 1, y + j, r, g, b); }
}

function setPx(dst: PNG, x: number, y: number, r: number, g: number, b: number): void {
  if (x < 0 || y < 0 || x >= dst.width || y >= dst.height) return;
  const o = (y * dst.width + x) * 4;
  dst.data[o] = r; dst.data[o + 1] = g; dst.data[o + 2] = b; dst.data[o + 3] = 255;
}

function buildSheet(formId: string): void {
  const dir = join(SPRITES, formId);
  if (!existsSync(join(dir, 'provenance.json'))) return;
  const prov = JSON.parse(readFileSync(join(dir, 'provenance.json'), 'utf8')) as Provenance;
  const frames = prov.frames;
  if (frames.length === 0) return;

  const rows = Math.ceil(frames.length / COLS);
  const sheet = new PNG({ width: COLS * (CELL + GAP) + GAP, height: rows * (CELL + GAP) + GAP });
  // fondo oscuro
  for (let i = 0; i < sheet.data.length; i += 4) { sheet.data[i] = 20; sheet.data[i + 1] = 22; sheet.data[i + 2] = 28; sheet.data[i + 3] = 255; }

  frames.forEach((frame, idx) => {
    const cx = GAP + (idx % COLS) * (CELL + GAP);
    const cy = GAP + Math.floor(idx / COLS) * (CELL + GAP);

    if (existsSync(join(dir, frame.file))) {
      const trimmed = readPng(join(dir, frame.file));
      // escala para que quepa en la celda (max ~48px alto, mantener aspecto)
      const scale = Math.max(1, Math.min(Math.floor((CELL - 16) / trimmed.width), Math.floor((CELL - 28) / trimmed.height)));
      const sw = trimmed.width * scale;
      const sh = trimmed.height * scale;
      const ox = cx + Math.floor((CELL - sw) / 2);
      const oy = cy + 2;
      copyInto(sheet, trimmed, ox, oy, scale);

      // overlay cajas de pieza 8×16 (en coordenadas trim = piece - trim.origin)
      for (const piece of frame.metasprite.pieces) {
        const px = ox + (piece.x - frame.trim.x) * scale;
        const py = oy + (piece.y - frame.trim.y) * scale;
        rect(sheet, px, py, 8 * scale, 16 * scale, piece.flipX || piece.flipY ? 255 : 80, piece.flipX || piece.flipY ? 200 : 255, 80);
      }
    } else {
      setPx(sheet, cx + 2, cy + 2, 255, 80, 80);
    }

    // etiqueta (bloques de color codifican texto; el HTML/JSON adjunto lo aclara)
    const label = `${frame.resourceId.toString(16).padStart(2, '0')}/${frame.visualFrameId.toString(16).padStart(2, '0')}·${frame.metasprite.pieces.length}`;
    for (let i = 0; i < label.length; i++) {
      const ch = label.charCodeAt(i) & 0x7f;
      for (let y = 0; y < 5; y++) {
        const on = (ch >> y) & 1;
        setPx(sheet, cx + 3 + i * 4, cy + CELL - 14 + y, on ? 200 : 60, on ? 220 : 70, 90);
      }
    }
  });

  const outDir = join(OUT, formId);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'contact_sheet_visual_integrity.png'), PNG.sync.write(sheet));
  console.log(`  ${formId}: ${frames.length} frames → contact_sheet_visual_integrity.png`);
}

const forms = readdirSync(SPRITES, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((id) => existsSync(join(SPRITES, id, 'provenance.json')))
  .sort();

console.log(`Generando contact sheets visual-integrity para ${forms.length} formas…`);
for (const formId of forms) buildSheet(formId);
console.log('done.');
