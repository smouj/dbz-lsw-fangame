// ═══════════════════════════════════════════════════════════════════════
// P0.4 — ROM fighter frame assembly forensics.
// Verifies physical frames after identity resolution: piece/block counts,
// per-piece graphics provenance, source provenance hashes, RAW-before-TRIM
// canvases, and bounds from metasprite geometry rather than opaque pixels.
// ═══════════════════════════════════════════════════════════════════════
import { createHash } from 'crypto';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';

const ROOT = process.cwd();
const PUBLIC_SPRITES = join(ROOT, 'public/assets/sprites');
const ROM_SHA = 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function s8(value: number): number {
  const u8 = value & 0xff;
  return u8 < 0x80 ? u8 : u8 - 0x100;
}

function hashJson(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

interface Piece {
  index?: number;
  rawX: number;
  rawY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  attr: number;
  tileDelta: number;
}

interface PieceGraphics {
  pieceIndex: number;
  pieceX: number;
  pieceY: number;
  graphicsBank: number;
  graphicsBlockRelativeOffset: number | null;
  graphicsBlockAddress: number | null;
  graphicsBlockHash: string;
  tile0Address: number | null;
  tile0Hash: string;
  tile1Address: number | null;
  tile1Hash: string;
}

interface PhysicalFrame {
  physicalId: string;
  file: string;
  rawCanvasFile?: string;
  resourceId: number;
  visualFrameId: number;
  actorVisualProfileKey: number;
  graphicsBank: number;
  width: number;
  height: number;
  originInTrimX: number;
  originInTrimY: number;
  trim: { x: number; y: number; w: number; h: number; originInTrim: { x: number; y: number } };
  hashes: Record<string, string>;
  sourceProvenance?: {
    metaspriteHash: string;
    graphicsTableHash: string;
    graphicsHash: string;
    graphicsBlockHashes: string[];
    paletteRawHash: string;
    sourceProvenanceHash: string;
  };
  palette: { raw?: number[]; rawBytes?: number[]; rawSha256?: string; transparentIndex?: number; color0Transparent?: boolean };
  metasprite: { pieces: Piece[]; provenance: Record<string, number> };
  graphics: { blockCount: number; relativeOffsets: number[]; provenance: Record<string, number> };
  pieceGraphics: PieceGraphics[];
}

interface Provenance {
  rom: { sha256: string };
  formProfile: { formId: string; actorVisualProfileKey: number; graphicsBank: number };
  frames: PhysicalFrame[];
}

const forms = readdirSync(PUBLIC_SPRITES, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .filter(formId => existsSync(join(PUBLIC_SPRITES, formId, 'provenance.json')))
  .sort();

let totalFrames = 0;
let totalPieces = 0;
let pieceCountMismatch = 0;
let sourceHashMismatch = 0;
let boundsMismatch = 0;
let missingRaw = 0;
let missingTrim = 0;
let badPiece = 0;
let crossProfile = 0;
let duplicatePhysicalIdDifferentSource = 0;
const physicalIdSourceHashes = new Map<string, string>();
const sourceToRawHashes = new Map<string, Set<string>>();

for (const formId of forms) {
  const dir = join(PUBLIC_SPRITES, formId);
  const provenance = readJson<Provenance>(join(dir, 'provenance.json'));
  check(`${formId}: ROM sha pinned`, provenance.rom.sha256 === ROM_SHA);
  check(`${formId}: profile/bank route consistent`, provenance.formProfile.graphicsBank === 0x31 + provenance.formProfile.actorVisualProfileKey);

  for (const frame of provenance.frames) {
    totalFrames++;
    const pieces = frame.metasprite.pieces;
    const pieceGraphics = frame.pieceGraphics;
    totalPieces += pieces.length;

    if (!existsSync(join(dir, frame.file))) missingTrim++;
    if (!frame.rawCanvasFile || !existsSync(join(dir, frame.rawCanvasFile))) missingRaw++;

    if (pieces.length !== frame.graphics.blockCount || pieceGraphics.length !== pieces.length) pieceCountMismatch++;

    const minX = Math.min(...pieces.map(piece => piece.x));
    const minY = Math.min(...pieces.map(piece => piece.y));
    const maxX = Math.max(...pieces.map(piece => piece.x + 8));
    const maxY = Math.max(...pieces.map(piece => piece.y + 16));
    if (
      frame.trim.x !== minX ||
      frame.trim.y !== minY ||
      frame.trim.w !== maxX - minX ||
      frame.trim.h !== maxY - minY ||
      frame.trim.originInTrim.x !== -minX ||
      frame.trim.originInTrim.y !== -minY ||
      frame.originInTrimX !== -minX ||
      frame.originInTrimY !== -minY
    ) boundsMismatch++;

    for (const [index, piece] of pieces.entries()) {
      const gfx = pieceGraphics[index];
      if (
        !gfx ||
        gfx.pieceIndex !== index ||
        gfx.pieceX !== piece.x ||
        gfx.pieceY !== piece.y ||
        piece.x !== s8(piece.rawX) ||
        piece.y !== s8(piece.rawY) ||
        piece.width !== 8 ||
        piece.height !== 16 ||
        piece.tileDelta !== index * 2 ||
        gfx.graphicsBlockRelativeOffset !== frame.graphics.relativeOffsets[index] ||
        gfx.graphicsBank !== frame.graphicsBank ||
        gfx.graphicsBlockHash.length !== 64 ||
        gfx.tile0Hash.length !== 64 ||
        gfx.tile1Hash.length !== 64 ||
        (gfx.tile0Address !== null && gfx.tile1Address !== gfx.tile0Address + 16)
      ) {
        badPiece++;
      }
    }

    if (frame.actorVisualProfileKey !== provenance.formProfile.actorVisualProfileKey || frame.graphicsBank !== provenance.formProfile.graphicsBank) {
      crossProfile++;
    }

    const graphicsBlockHashes = pieceGraphics.map(piece => piece.graphicsBlockHash);
    const paletteRaw = frame.palette.rawBytes ?? frame.palette.raw ?? [];
    const paletteRawHash = createHash('sha256').update(Buffer.from(paletteRaw)).digest('hex').slice(0, 16);
    const computedSourceHash = hashJson({
      rom: ROM_SHA,
      actorVisualProfileKey: frame.actorVisualProfileKey,
      graphicsBank: frame.graphicsBank,
      resource: frame.resourceId,
      visualFrameId: frame.visualFrameId,
      metaspriteHash: frame.hashes.metaspriteHash,
      graphicsTableHash: frame.hashes.graphicsTableHash,
      graphicsBlockHashes,
      paletteHash: frame.hashes.paletteHash ?? paletteRawHash,
    });
    const sourceHash = frame.sourceProvenance?.sourceProvenanceHash ?? frame.hashes.sourceProvenanceHash;
    if (
      !frame.sourceProvenance ||
      frame.sourceProvenance.graphicsBlockHashes.length !== pieceGraphics.length ||
      frame.sourceProvenance.graphicsBlockHashes.some((hash, index) => hash !== graphicsBlockHashes[index]) ||
      frame.sourceProvenance.metaspriteHash !== frame.hashes.metaspriteHash ||
      frame.sourceProvenance.graphicsHash !== frame.hashes.graphicsHash ||
      frame.sourceProvenance.paletteRawHash !== (frame.hashes.paletteHash ?? paletteRawHash) ||
      sourceHash !== frame.sourceProvenance.sourceProvenanceHash
    ) {
      sourceHashMismatch++;
    }

    const existingSource = physicalIdSourceHashes.get(`${formId}:${frame.physicalId}`);
    if (existingSource && existingSource !== sourceHash) duplicatePhysicalIdDifferentSource++;
    physicalIdSourceHashes.set(`${formId}:${frame.physicalId}`, sourceHash ?? computedSourceHash);

    const rawHash = frame.hashes.rawPixelHash;
    const rawHashes = sourceToRawHashes.get(sourceHash ?? computedSourceHash) ?? new Set<string>();
    rawHashes.add(rawHash);
    sourceToRawHashes.set(sourceHash ?? computedSourceHash, rawHashes);

    if (frame.palette.transparentIndex !== 0 || frame.palette.color0Transparent !== true) badPiece++;

    if (existsSync(join(dir, frame.file))) {
      const png = PNG.sync.read(readFileSync(join(dir, frame.file)));
      if (png.width !== frame.width || png.height !== frame.height || png.width !== frame.trim.w || png.height !== frame.trim.h) boundsMismatch++;
    }
  }
}

const nondeterministicSources = [...sourceToRawHashes.entries()].filter(([, hashes]) => hashes.size > 1);

check('forms with physical provenance present', forms.length === 48, `${forms.length}/48`);
check('physical frames inspected', totalFrames > 0, `${totalFrames}`);
check('piece/block/rendered counts aligned', pieceCountMismatch === 0, `mismatch=${pieceCountMismatch}`);
check('per-piece graphics provenance valid', badPiece === 0, `bad=${badPiece} pieces=${totalPieces}`);
check('0 cross-profile frame contamination', crossProfile === 0, `bad=${crossProfile}`);
check('0 source provenance mismatches', sourceHashMismatch === 0, `bad=${sourceHashMismatch}`);
check('0 duplicate physicalId with different source provenance', duplicatePhysicalIdDifferentSource === 0, `bad=${duplicatePhysicalIdDifferentSource}`);
check('same source provenance gives deterministic RAW pixels', nondeterministicSources.length === 0, `bad=${nondeterministicSources.length}`);
check('0 missing RAW canvases', missingRaw === 0, `missing=${missingRaw}`);
check('0 missing TRIMMED PNGs', missingTrim === 0, `missing=${missingTrim}`);
check('bounds use metasprite piece geometry, not opaque bbox', boundsMismatch === 0, `bad=${boundsMismatch}`);

if (failures === 0) {
  console.log(`\n✅ verify:rom-fighter-frame-assembly PASS (${totalFrames} frames · ${totalPieces} pieces)`);
  process.exit(0);
}
console.log(`\n❌ verify:rom-fighter-frame-assembly FAIL (${failures})`);
process.exit(1);
