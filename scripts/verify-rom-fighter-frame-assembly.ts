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
const REQUIRE_ROM_PHYSICAL_EXPORTS = process.env.REQUIRE_ROM_PHYSICAL_EXPORTS === '1';

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

function bankedFileOffset(bank: number, cpuAddress: number): number | null {
  if (cpuAddress >= 0x4000 && cpuAddress <= 0x7fff) return bank * 0x4000 + (cpuAddress - 0x4000);
  if (cpuAddress >= 0x0000 && cpuAddress < 0x4000) return bank * 0x4000 + cpuAddress;
  return null;
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
  tileDeltaRaw?: number;
  tileDeltaUnit?: 'TILE_8X8';
  resolvedBlockIndex?: number | null;
  expectedBlockRelativeOffset?: number | null;
  expectedBlockAddress?: number | null;
  expectedBlockHash?: string;
  legacyIndexBlockAddress?: number | null;
  blockMatchWithLegacyIndex?: boolean;
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
  rawImageFile?: string;
  resourceId: number;
  visualFrameId: number;
  actorVisualProfileKey: number;
  graphicsBank: number;
  width: number;
  height: number;
  originInTrimX: number;
  originInTrimY: number;
  trim: { x: number; y: number; w: number; h: number; originInTrim: { x: number; y: number } };
  rawBounds?: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number; originX: number; originY: number };
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
  assembly?: {
    pieceCount: number;
    graphicsBlockCount: number;
    renderedPieceCount: number;
    reorderedPieceCount?: number;
    oddTileDeltaCount?: number;
    outOfRangeBlockCount?: number;
    pieceGraphicsMapping?: 'ROM_TILE_DELTA';
    graphicsBlockAddresses: Array<number | null>;
    renderedBlockAddresses: Array<number | null>;
    piecesOutsideRaw: number;
    pixelsWrittenOutsideRaw: number;
    assemblyInputHash: string;
    rawPixelHash: string;
    trimmedPixelHash: string;
    errors: string[];
  };
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
let missingCleanRaw = 0;
let destructiveTrim = 0;
let lostOrigin = 0;
let classifiedAssemblyErrors = 0;
let staleOrForeignBlocks = 0;
let missingTrim = 0;
let badPiece = 0;
let badGraphicsAddress = 0;
let oddTileDelta = 0;
let outOfRangeBlockIndex = 0;
let wrongResolvedBlock = 0;
let weakProductionLookup = 0;
let crossProfile = 0;
let duplicatePhysicalIdDifferentSource = 0;
const physicalIdSourceHashes = new Map<string, string>();
const sourceToRawHashes = new Map<string, Set<string>>();

function hashPngPixels(path: string): string {
  return createHash('sha256').update(PNG.sync.read(readFileSync(path)).data).digest('hex').slice(0, 16);
}

function reconstructRawFromTrim(raw: PNG, trimmed: PNG, trimX: number, trimY: number, rawOriginX: number, rawOriginY: number): Buffer {
  const out = Buffer.alloc(raw.width * raw.height * 4);
  const startX = rawOriginX + trimX;
  const startY = rawOriginY + trimY;
  for (let y = 0; y < trimmed.height; y++) {
    for (let x = 0; x < trimmed.width; x++) {
      const source = (trimmed.width * y + x) << 2;
      const targetX = startX + x;
      const targetY = startY + y;
      if (targetX < 0 || targetY < 0 || targetX >= raw.width || targetY >= raw.height) continue;
      const target = (raw.width * targetY + targetX) << 2;
      out[target] = trimmed.data[source];
      out[target + 1] = trimmed.data[source + 1];
      out[target + 2] = trimmed.data[source + 2];
      out[target + 3] = trimmed.data[source + 3];
    }
  }
  return out;
}

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
    if (!frame.rawImageFile || !existsSync(join(dir, frame.rawImageFile))) missingCleanRaw++;

    if (pieces.length !== frame.graphics.blockCount || pieceGraphics.length !== pieces.length) pieceCountMismatch++;
    if (
      !frame.assembly ||
      frame.assembly.pieceCount !== pieces.length ||
      frame.assembly.graphicsBlockCount !== frame.graphics.blockCount ||
      frame.assembly.renderedPieceCount !== pieces.length ||
      frame.assembly.piecesOutsideRaw !== 0 ||
      frame.assembly.pixelsWrittenOutsideRaw !== 0 ||
      frame.assembly.errors.length !== 0
    ) {
      classifiedAssemblyErrors++;
    }

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
    if (
      !frame.rawBounds ||
      frame.rawBounds.minX !== minX ||
      frame.rawBounds.minY !== minY ||
      frame.rawBounds.maxX !== maxX ||
      frame.rawBounds.maxY !== maxY ||
      frame.rawBounds.width !== maxX - minX ||
      frame.rawBounds.height !== maxY - minY ||
      frame.rawBounds.originX !== -minX ||
      frame.rawBounds.originY !== -minY
    ) {
      boundsMismatch++;
    }

    for (const [index, piece] of pieces.entries()) {
      const gfx = pieceGraphics[index];
      const resolvedBlockIndex = piece.tileDelta >> 1;
      const expectedRelativeOffset = frame.graphics.relativeOffsets[resolvedBlockIndex] ?? null;
      const expectedGraphicsBlockAddress = gfx?.graphicsBlockRelativeOffset === null || gfx?.graphicsBlockRelativeOffset === undefined
        ? null
        : bankedFileOffset(frame.graphicsBank, gfx.graphicsBlockRelativeOffset);
      if ((piece.tileDelta & 1) !== 0) oddTileDelta++;
      if (resolvedBlockIndex < 0 || resolvedBlockIndex >= frame.graphics.relativeOffsets.length) outOfRangeBlockIndex++;
      if (
        !gfx ||
        gfx.pieceIndex !== index ||
        gfx.pieceX !== piece.x ||
        gfx.pieceY !== piece.y ||
        piece.x !== s8(piece.rawX) ||
        piece.y !== s8(piece.rawY) ||
        piece.width !== 8 ||
        piece.height !== 16 ||
        gfx.tileDeltaUnit !== 'TILE_8X8' ||
        (gfx.tileDeltaRaw ?? piece.tileDelta) !== piece.tileDelta ||
        (gfx.resolvedBlockIndex ?? resolvedBlockIndex) !== resolvedBlockIndex ||
        gfx.graphicsBlockRelativeOffset !== expectedRelativeOffset ||
        (gfx.expectedBlockRelativeOffset ?? expectedRelativeOffset) !== expectedRelativeOffset ||
        gfx.graphicsBank !== frame.graphicsBank ||
        gfx.graphicsBlockHash.length !== 64 ||
        gfx.tile0Hash.length !== 64 ||
        gfx.tile1Hash.length !== 64 ||
        (gfx.tile0Address !== null && gfx.tile1Address !== gfx.tile0Address + 16)
      ) {
        badPiece++;
      }
      if (
        !gfx ||
        gfx.expectedBlockAddress !== gfx.graphicsBlockAddress ||
        gfx.expectedBlockHash !== gfx.graphicsBlockHash ||
        gfx.blockMatchWithLegacyIndex !== (resolvedBlockIndex === index)
      ) {
        wrongResolvedBlock++;
      }
      if (
        !gfx ||
        expectedGraphicsBlockAddress === null ||
        gfx.graphicsBlockAddress !== expectedGraphicsBlockAddress ||
        gfx.tile0Address !== expectedGraphicsBlockAddress ||
        gfx.tile1Address !== expectedGraphicsBlockAddress + 16
      ) {
        badGraphicsAddress++;
      }
      if (
        frame.assembly &&
        (
          frame.assembly.graphicsBlockAddresses[index] !== gfx.graphicsBlockAddress ||
          frame.assembly.renderedBlockAddresses[index] !== gfx.graphicsBlockAddress ||
          frame.assembly.pieceGraphicsMapping !== 'ROM_TILE_DELTA' ||
          frame.assembly.oddTileDeltaCount !== 0 ||
          frame.assembly.outOfRangeBlockCount !== 0
        )
      ) {
        staleOrForeignBlocks++;
      }
      const drawX = piece.x + (-minX);
      const drawY = piece.y + (-minY);
      if (drawX < 0 || drawY < 0 || drawX + piece.width > maxX - minX || drawY + piece.height > maxY - minY) {
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
      if (frame.hashes.trimmedPixelHash && hashPngPixels(join(dir, frame.file)) !== frame.hashes.trimmedPixelHash) destructiveTrim++;
    }
    if (frame.rawImageFile && existsSync(join(dir, frame.rawImageFile)) && existsSync(join(dir, frame.file))) {
      const raw = PNG.sync.read(readFileSync(join(dir, frame.rawImageFile)));
      const trimmed = PNG.sync.read(readFileSync(join(dir, frame.file)));
      if (frame.hashes.rawPixelHash && hashPngPixels(join(dir, frame.rawImageFile)) !== frame.hashes.rawPixelHash) destructiveTrim++;
      const reconstructed = reconstructRawFromTrim(raw, trimmed, frame.trim.x, frame.trim.y, raw.width / 2, raw.height / 2);
      if (!Buffer.from(raw.data).equals(reconstructed)) destructiveTrim++;
      const expectedOriginInTrimX = raw.width / 2 - (raw.width / 2 + frame.trim.x);
      const expectedOriginInTrimY = raw.height / 2 - (raw.height / 2 + frame.trim.y);
      if (frame.trim.originInTrim.x !== expectedOriginInTrimX || frame.trim.originInTrim.y !== expectedOriginInTrimY) lostOrigin++;
    }
  }
}

const nondeterministicSources = [...sourceToRawHashes.entries()].filter(([, hashes]) => hashes.size > 1);
const productionResolverSource = readFileSync(join(ROOT, 'src/battle/productionFrameResolver.ts'), 'utf8');
if (/resourceId\s*={2,3}[^&]+&&\s*frame\.visualFrameId\s*={2,3}/s.test(productionResolverSource)) weakProductionLookup++;
if (/frame\.resourceId\s*={2,3}[^&]+&&\s*frame\.visualFrameId\s*={2,3}/s.test(productionResolverSource)) weakProductionLookup++;

check('forms with physical provenance present', forms.length === 48, `${forms.length}/48`);
check('physical frames inspected', totalFrames > 0, `${totalFrames}`);
check('piece/block/rendered counts aligned', pieceCountMismatch === 0, `mismatch=${pieceCountMismatch}`);
check('tileDelta unit TILE_8X8', totalPieces > 0 && oddTileDelta === 0, `odd=${oddTileDelta}`);
check('out-of-range tileDelta block index = 0', outOfRangeBlockIndex === 0, `bad=${outOfRangeBlockIndex}`);
check('classified assembly frame errors = 0', classifiedAssemblyErrors === 0, `bad=${classifiedAssemblyErrors}`);
check('per-piece graphics provenance valid', badPiece === 0, `bad=${badPiece} pieces=${totalPieces}`);
check('wrong resolved graphics block = 0', wrongResolvedBlock === 0, `bad=${wrongResolvedBlock}`);
check('graphics CPU banked addresses resolve to correct file offsets', badGraphicsAddress === 0, `bad=${badGraphicsAddress}`);
check('0 foreign/stale graphics blocks consumed by renderer', staleOrForeignBlocks === 0, `bad=${staleOrForeignBlocks}`);
check('weak production resource/VFID lookup = 0', weakProductionLookup === 0, `bad=${weakProductionLookup}`);
check('0 cross-profile frame contamination', crossProfile === 0, `bad=${crossProfile}`);
check('0 source provenance mismatches', sourceHashMismatch === 0, `bad=${sourceHashMismatch}`);
check('0 duplicate physicalId with different source provenance', duplicatePhysicalIdDifferentSource === 0, `bad=${duplicatePhysicalIdDifferentSource}`);
check('same source provenance gives deterministic RAW pixels', nondeterministicSources.length === 0, `bad=${nondeterministicSources.length}`);
if (REQUIRE_ROM_PHYSICAL_EXPORTS) {
  check('0 missing RAW canvases', missingRaw === 0, `missing=${missingRaw}`);
  check('0 missing clean RAW images', missingCleanRaw === 0, `missing=${missingCleanRaw}`);
  check('0 missing TRIMMED PNGs', missingTrim === 0, `missing=${missingTrim}`);
} else if (missingRaw > 0 || missingCleanRaw > 0 || missingTrim > 0) {
  console.log(
    `SKIP ROM physical export files: missing RAW=${missingRaw} cleanRAW=${missingCleanRaw} TRIMMED=${missingTrim}; ` +
      'set REQUIRE_ROM_PHYSICAL_EXPORTS=1 after npm run gen:rom-runtime-assets for the strict local gate.',
  );
}
check('bounds use metasprite piece geometry, not opaque bbox', boundsMismatch === 0, `bad=${boundsMismatch}`);
check('TRIM is non-destructive relative to clean RAW', destructiveTrim === 0, `bad=${destructiveTrim}`);
check('TRIM preserves physical origin metadata', lostOrigin === 0, `bad=${lostOrigin}`);

if (failures === 0) {
  console.log(`\n✅ verify:rom-fighter-frame-assembly PASS (${totalFrames} frames · ${totalPieces} pieces)`);
  process.exit(0);
}
console.log(`\n❌ verify:rom-fighter-frame-assembly FAIL (${failures})`);
process.exit(1);
