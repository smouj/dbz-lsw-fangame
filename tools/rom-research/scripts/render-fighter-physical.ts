// ═══════════════════════════════════════════════════════════════════════
// R2.3 — PHYSICAL OBJ RENDERER (desde la ROM, sin assets externos).
// Cadena VERIFIED (R2.2): resource base → +0 secuencias / +2 metasprites /
// +4 frame-graphics · graphics source [bank $31+key, base $0000] ·
// bloques 32B = 2 tiles 8×8 2bpp = pieza OBJ 8×16 · flips $40/$20 ·
// paleta $6E00+key×8 (BGR555).
// Uso: npx tsx tools/rom-research/scripts/render-fighter-physical.ts
//   --resource 3 --keys 3,5,6,1c [--selector 0..5]
// Salida: profile_<key>/seq_SS/frame_FF/rom_raw.png + rom_trimmed.png +
// metadata.json + physical-index.json + hashes.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { PNG } from 'pngjs';
import { ROM_CGB_PALETTE_TABLE } from '../../../src/data/generated/romCgbPaletteTable.generated';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ROM_PATH = resolve(ROOT, '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-spain.gbc');
const CATALOG = join(ROOT, 'docs/rom/generated/animation-resources.json');
const OUT = join(ROOT, 'docs/rom/generated/fighters');
const SCHEMA_VERSION = 2;
const OFFSET_ENCODING = 's8';

const rom = readFileSync(ROM_PATH);
const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));

function parseArgs(): { resource: number; keys: number[]; selector: number | null } {
  const args = process.argv.slice(2);
  const get = (name: string): string | undefined => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return {
    resource: parseInt(get('--resource') ?? '3', 16),
    keys: (get('--keys') ?? '3,5,6,1c').split(',').map((k) => parseInt(k, 16)),
    selector: get('--selector') ? parseInt(get('--selector')!, 10) : null,
  };
}

// ── Resolvers puros (reproducen la aritmética ROM verificada) ──

/** Base del resource: derivada empíricamente y validada contra las
 *  secuencias del catálogo (la tabla global [offset,size] del banco apunta
 *  al descriptor; la base de runtime es la que resuelve los 3 roots). */
function resourceBase(bank: number, resourceId: number): number {
  // tabla global del banco: u16 count + pares [offset u16, size u16]
  const u16 = (a: number) => rom[bank * 0x4000 + a] | (rom[bank * 0x4000 + a + 1] << 8);
  const layout = [{ bank: 0x62, first: 0x00 }, { bank: 0x63, first: 0x19 }, { bank: 0x64, first: 0x32 }];
  const L = layout.find((l) => resourceId >= l.first && resourceId < l.first + 25) ?? layout[0];
  void L;
  // Resolver la base por validación cruzada: probar candidatos y exigir que
  // +0 → tabla con count de secuencias que resuelva a las direcciones reales.
  const res = catalog.find((r: { resourceId: number }) => r.resourceId === resourceId);
  if (!res) throw new Error(`resource ${resourceId} no está en el catálogo`);
  const seqAddrs = res.sequences.map((s: { addr: number }) => s.addr);
  for (let base = 0x40; base < 0x4000 - 8; base++) {
    const w0 = u16(base);
    const T = (base + w0) & 0xffff;
    if (T + 2 >= 0x4000) continue;
    const count = rom[bank * 0x4000 + T];
    if (count !== seqAddrs.length) continue;
    let ok = true;
    for (let sel = 0; sel < seqAddrs.length; sel++) {
      const entry = T + 1 + sel * 2;
      if (entry + 2 >= 0x4000) { ok = false; break; }
      const off = u16(entry);
      if (((T + 1 + sel * 2 + off) & 0x3fff) !== (seqAddrs[sel] & 0x3fff)) { ok = false; break; }
    }
    if (ok) return base;
  }
  throw new Error(`no se pudo resolver la base del resource ${resourceId}`);
}

const u16At = (bank: number, addr: number) => rom[bank * 0x4000 + addr] | (rom[bank * 0x4000 + addr + 1] << 8);
const u8At = (bank: number, addr: number) => rom[bank * 0x4000 + addr];
const s8 = (value: number) => {
  const u8 = value & 0xff;
  return u8 < 0x80 ? u8 : u8 - 0x100;
};

/** A. frame record: base → +0 → tabla → selector → frame×4. */
function resolveFrameRecord(bank: number, base: number, selector: number, frameIndex: number) {
  const w0 = u16At(bank, base);
  let T = (base + w0) & 0xffff;
  const count = u8At(bank, T); // u8 count de secuencias
  const sel = selector < count ? selector : 0; // fallback ROM ($0B16: cp b; jr c)
  const entry = (T + 1 + sel * 2) & 0xffff;
  const off = u16At(bank, entry);
  const seqAddr = (T + 1 + sel * 2 + off) & 0xffff;
  const frameAddr = (seqAddr + 1 + frameIndex * 4) & 0xffff; // +1: count u8 de la secuencia
  const raw = [u8At(bank, frameAddr), u8At(bank, frameAddr + 1), u8At(bank, frameAddr + 2), u8At(bank, frameAddr + 3)];
  return {
    visualFrameId: raw[0],
    durationTicks: raw[1],
    offsetY: s8(raw[2]), // byte2 = signed Y delta (consumer $096A → drawY)
    offsetX: s8(raw[3]), // byte3 = signed X delta
    raw,
    provenance: { bank, base, sequenceTable: T, sequenceAddress: seqAddr, frameAddress: frameAddr, selector: sel, sequenceCount: count },
  };
}

/** B. metasprite: base → +2 → tabla → vfid×2 → piezas. */
function resolveMetasprite(bank: number, base: number, visualFrameId: number) {
  const w2 = u16At(bank, base + 2);
  let T = (base + 2 + w2) & 0xffff;
  const entry = (T + visualFrameId * 2) & 0xffff;
  const off = u16At(bank, entry);
  const pieceAddr = (T + visualFrameId * 2 + off) & 0xffff;
  const count = u8At(bank, pieceAddr);
  const pieces: { rawY: number; rawX: number; tileDelta: number; attr: number; flipX: boolean; flipY: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    const p = pieceAddr + 1 + i * 4;
    const rawY = u8At(bank, p);
    const rawX = u8At(bank, p + 1);
    const tileDelta = u8At(bank, p + 2);
    const attr = u8At(bank, p + 3);
    pieces.push({ rawY, rawX, tileDelta, attr, flipX: (attr & 0x40) !== 0, flipY: (attr & 0x20) !== 0 });
  }
  return { pieces, provenance: { tableAddress: T, entryAddress: entry, pieceAddress: pieceAddr, count } };
}

/** C. frame graphics layout: base → +4 → tabla → vfid×2 → [count, offsets u16]. */
function resolveFrameGraphics(bank: number, base: number, visualFrameId: number) {
  const w4 = u16At(bank, base + 4);
  let T = (base + 4 + w4) & 0xffff;
  const entry = (T + visualFrameId * 2) & 0xffff;
  const off = u16At(bank, entry);
  const layoutAddr = (T + visualFrameId * 2 + off) & 0xffff;
  const blockCount = u8At(bank, layoutAddr);
  const relativeOffsets: number[] = [];
  for (let i = 0; i < blockCount; i++) relativeOffsets.push(u16At(bank, layoutAddr + 1 + i * 2));
  return { blockCount, relativeOffsets, provenance: { tableAddress: T, entryAddress: entry, layoutAddress: layoutAddr } };
}

function bankedFileOffset(bank: number, cpuAddress: number): number {
  if (cpuAddress >= 0x4000 && cpuAddress <= 0x7fff) {
    return bank * 0x4000 + (cpuAddress - 0x4000);
  }
  if (cpuAddress >= 0x0000 && cpuAddress < 0x4000) {
    return bank * 0x4000 + cpuAddress;
  }
  throw new Error(`invalid graphics CPU/local address: bank $${bank.toString(16)} addr $${cpuAddress.toString(16)}`);
}

/** D. graphics source + bloque: banked CPU/local address → 32B. */
function resolveGraphicsBlock(key: number, relativeOffset: number) {
  const bank = 0x31 + key;
  const start = bankedFileOffset(bank, relativeOffset);
  if (start + 32 > rom.length) throw new Error(`block fuera de ROM: bank ${bank} + ${relativeOffset}`);
  return { bank, absoluteAddress: start, relativeOffset, raw32: Array.from(rom.subarray(start, start + 32)) };
}

/** Paleta: $6E00 + key×8 → 4 BGR555 → RGB. */
function resolvePalette(key: number) {
  const entry = ROM_CGB_PALETTE_TABLE[key];
  if (!entry) throw new Error(`sin entrada ROM_CGB_PALETTE_TABLE para key ${key}`);
  return {
    key,
    keyHex: entry.indexHex,
    romBank: entry.romBank,
    cpuAddress: entry.cpuAddress,
    cpuAddressHex: entry.cpuAddressHex,
    fileOffset: entry.fileOffset,
    fileOffsetHex: entry.fileOffsetHex,
    raw: entry.rawBytes,
    rawBytes: entry.rawBytes,
    bgr555: entry.bgr555Hex,
    bgr555Words: entry.bgr555,
    colors: entry.hexRaw,
    hexRaw: entry.hexRaw,
    rawSha256: entry.rawSha256,
    evidence: entry.evidence,
  };
}

/** 2bpp: 16 bytes → 8×8 índices 0..3. */
function decodeTile2bpp(bytes: number[]): number[][] {
  const tile: number[][] = [];
  for (let y = 0; y < 8; y++) {
    const lo = bytes[y * 2];
    const hi = bytes[y * 2 + 1];
    const row: number[] = [];
    for (let x = 7; x >= 0; x--) {
      const bit = 1 << x;
      row.push(((lo & bit) ? 1 : 0) | ((hi & bit) ? 2 : 0));
    }
    tile.push(row);
  }
  return tile;
}

function piecePixels(raw32: number[], flipX: boolean, flipY: boolean): number[][] {
  const top = decodeTile2bpp(raw32.slice(0, 16));
  const bottom = decodeTile2bpp(raw32.slice(16, 32));
  let pixels = [...top, ...bottom];
  if (flipX) pixels = pixels.map((row) => [...row].reverse());
  if (flipY) pixels = [...pixels].reverse();
  return pixels;
}

function rgbaForPaletteIndex(index: number, colors: string[]): [number, number, number, number] {
  if (index === 0) return [0, 0, 0, 0];
  const color = colors[index] ?? '#000000';
  return [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
    255,
  ];
}

function drawPiece(target: Uint8Array, width: number, height: number, x: number, y: number, pixels: number[][], colors: string[]) {
  for (let yy = 0; yy < 16; yy++) {
    for (let xx = 0; xx < 8; xx++) {
      const index = pixels[yy]?.[xx] ?? 0;
      const [r, g, b, a] = rgbaForPaletteIndex(index, colors);
      if (a === 0) continue;
      const X = x + xx;
      const Y = y + yy;
      if (X < 0 || X >= width || Y < 0 || Y >= height) continue;
      const o = (Y * width + X) * 4;
      target[o] = r;
      target[o + 1] = g;
      target[o + 2] = b;
      target[o + 3] = a;
    }
  }
}

function pixelDataHash(data: Uint8Array): string {
  return createHash('sha256').update(Buffer.from(data)).digest('hex').slice(0, 16);
}

function drawOriginCross(target: Uint8Array, width: number, height: number, originX: number, originY: number) {
  const mark = (x: number, y: number, r: number, g: number, b: number, a = 255) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const o = (y * width + x) * 4;
    target[o] = r; target[o + 1] = g; target[o + 2] = b; target[o + 3] = a;
  };
  for (let x = 0; x < width; x++) mark(x, originY, 90, 160, 255, 180);
  for (let y = 0; y < height; y++) mark(originX, y, 90, 160, 255, 180);
  for (let d = -3; d <= 3; d++) {
    mark(originX + d, originY, 255, 210, 64);
    mark(originX, originY + d, 255, 210, 64);
  }
}

// ── Render ──
const { resource, keys, selector } = parseArgs();
const res = catalog.find((r: { resourceId: number }) => r.resourceId === resource);
if (!res) { console.log(`resource ${resource} no en catálogo`); process.exit(1); }
const bank = res.bank;
const base = resourceBase(bank, resource);
console.log(`resource ${resource} (bank $${bank.toString(16)}) base=$${base.toString(16).toUpperCase()}`);

const index: unknown[] = [];
let invariantMismatches = 0;
const ORIGIN = 160; // raw debug canvas origin (0,0) técnico constante

for (const key of keys) {
  const palette = resolvePalette(key);
  const sourceBank = 0x31 + key;
  const framesRendered: unknown[] = [];
  for (let seq = 0; seq < res.sequences.length; seq++) {
    if (selector !== null && seq !== selector) continue;
    for (let f = 0; f < res.sequences[seq].frames.length; f++) {
      const frame = resolveFrameRecord(bank, base, seq, f);
      const meta = resolveMetasprite(bank, base, frame.visualFrameId);
      const gfx = resolveFrameGraphics(bank, base, frame.visualFrameId);
      // invariant: pieces === blockCount
      if (meta.pieces.length !== gfx.blockCount) {
        invariantMismatches++;
        console.log(`⚠ MISMATCH seq${seq} F${f}: pieces=${meta.pieces.length} blocks=${gfx.blockCount} — invariante R2 violado`);
      }
      // bloques físicos — cada frame construye sus arrays/canvases de cero.
      const blocks = gfx.relativeOffsets.map((off) => resolveGraphicsBlock(key, off));
      const pieces = blocks.map((b, i) => ({
        pixels: piecePixels(b.raw32, meta.pieces[i]?.flipX ?? false, meta.pieces[i]?.flipY ?? false),
      }));

      const signedPieces = meta.pieces.map((piece, i) => ({
        ...piece,
        index: i,
        x: s8(piece.rawX),
        y: s8(piece.rawY),
        width: 8,
        height: 16,
      }));
      const minPieceX = Math.min(...signedPieces.map(piece => piece.x));
      const minPieceY = Math.min(...signedPieces.map(piece => piece.y));
      const maxPieceX = Math.max(...signedPieces.map(piece => piece.x + piece.width));
      const maxPieceY = Math.max(...signedPieces.map(piece => piece.y + piece.height));
      const trimW = maxPieceX - minPieceX;
      const trimH = maxPieceY - minPieceY;
      const originInTrimX = -minPieceX;
      const originInTrimY = -minPieceY;

      // composición: canvas RGBA raw/debug en coordenadas metasprite puras.
      // Los offsets de frame NO se bakean aquí; pertenecen a la ocurrencia temporal.
      const canvasW = 320, canvasH = 320;
      const rgba = new Uint8Array(canvasW * canvasH * 4); // 0 = transparente
      const trimmed = new Uint8Array(trimW * trimH * 4);
      const assemblyErrors: string[] = [];
      let renderedPieceCount = 0;
      let piecesOutsideRaw = 0;
      let pixelsWrittenOutsideRaw = 0;
      let opaqueMinX = Infinity, opaqueMinY = Infinity, opaqueMaxX = -Infinity, opaqueMaxY = -Infinity;
      signedPieces.forEach((piece, i) => {
        const rendered = pieces[i]?.pixels;
        if (!rendered) return;
        renderedPieceCount++;
        const rawDrawX = ORIGIN + piece.x;
        const rawDrawY = ORIGIN + piece.y;
        if (rawDrawX < 0 || rawDrawY < 0 || rawDrawX + piece.width > canvasW || rawDrawY + piece.height > canvasH) {
          piecesOutsideRaw++;
        }
        for (let yy = 0; yy < 16; yy++) {
          for (let xx = 0; xx < 8; xx++) {
            if ((rendered[yy]?.[xx] ?? 0) === 0) continue;
            const X = rawDrawX + xx;
            const Y = rawDrawY + yy;
            if (X < 0 || X >= canvasW || Y < 0 || Y >= canvasH) pixelsWrittenOutsideRaw++;
          }
        }
        drawPiece(rgba, canvasW, canvasH, ORIGIN + piece.x, ORIGIN + piece.y, rendered, palette.colors);
        drawPiece(trimmed, trimW, trimH, piece.x + originInTrimX, piece.y + originInTrimY, rendered, palette.colors);
        for (let yy = 0; yy < 16; yy++) {
          for (let xx = 0; xx < 8; xx++) {
            if ((rendered[yy]?.[xx] ?? 0) === 0) continue;
            const x = piece.x + xx;
            const y = piece.y + yy;
            opaqueMinX = Math.min(opaqueMinX, x);
            opaqueMinY = Math.min(opaqueMinY, y);
            opaqueMaxX = Math.max(opaqueMaxX, x + 1);
            opaqueMaxY = Math.max(opaqueMaxY, y + 1);
          }
        }
      });
      if (meta.pieces.length !== gfx.blockCount) assemblyErrors.push('ASSEMBLY_BLOCK_COUNT_MISMATCH');
      if (renderedPieceCount !== meta.pieces.length) assemblyErrors.push('ASSEMBLY_RENDERED_COUNT_MISMATCH');
      if (piecesOutsideRaw > 0) assemblyErrors.push('RAW_PIECE_OUTSIDE_CANVAS');
      if (pixelsWrittenOutsideRaw > 0) assemblyErrors.push('RAW_EXTRA_PIECE');
      const rawCanvas = new Uint8Array(rgba);
      drawOriginCross(rawCanvas, canvasW, canvasH, ORIGIN, ORIGIN);

      // PNG raw (sin recortar) + trimmed (bounding box)
      const outDir = join(OUT, `resource_${resource.toString(16).padStart(2, '0')}`, `profile_${key.toString(16).padStart(2, '0')}`, `seq_${String(seq).padStart(2, '0')}`, `frame_${String(f).padStart(2, '0')}`);
      mkdirSync(outDir, { recursive: true });

      const writePng = (path: string, w: number, h: number, data: Uint8Array) => {
        const png = new PNG({ width: w, height: h });
        png.data = Buffer.from(data);
        writeFileSync(path, PNG.sync.write(png));
      };
      writePng(join(outDir, 'rom_raw.png'), canvasW, canvasH, rgba);
      writePng(join(outDir, 'rom_raw_canvas.png'), canvasW, canvasH, rawCanvas);
      writePng(join(outDir, 'rom_trimmed.png'), trimW, trimH, trimmed);

      const pieceGraphics = signedPieces.map((piece, i) => {
        const block = blocks[i];
        const raw32 = block?.raw32 ?? [];
        const tile0 = raw32.slice(0, 16);
        const tile1 = raw32.slice(16, 32);
        return {
          pieceIndex: i,
          pieceX: piece.x,
          pieceY: piece.y,
          rawX: piece.rawX,
          rawY: piece.rawY,
          attributes: piece.attr,
          tileDelta: piece.tileDelta,
          flipX: piece.flipX,
          flipY: piece.flipY,
          graphicsBank: sourceBank,
          graphicsBlockRelativeOffset: block?.relativeOffset ?? null,
          graphicsBlockAddress: block?.absoluteAddress ?? null,
          graphicsBlockHash: createHash('sha256').update(Buffer.from(raw32)).digest('hex'),
          tile0Address: block ? block.absoluteAddress : null,
          tile0Hash: createHash('sha256').update(Buffer.from(tile0)).digest('hex'),
          tile1Address: block ? block.absoluteAddress + 16 : null,
          tile1Hash: createHash('sha256').update(Buffer.from(tile1)).digest('hex'),
        };
      });

      const rawHash = createHash('sha256').update(Buffer.from(rgba)).digest('hex').slice(0, 16);
      const trimmedHash = createHash('sha256').update(Buffer.from(trimmed)).digest('hex').slice(0, 16);
      const metaspriteHash = createHash('sha256').update(JSON.stringify({ resource, bank, base, visualFrameId: frame.visualFrameId, metasprite: meta })).digest('hex').slice(0, 16);
      const graphicsHash = createHash('sha256').update(JSON.stringify({ actorVisualProfileKey: key, graphicsBank: sourceBank, resource, visualFrameId: frame.visualFrameId, layout: gfx, pieces: pieceGraphics })).digest('hex').slice(0, 16);
      const paletteHash = createHash('sha256').update(Buffer.from(palette.rawBytes)).digest('hex').slice(0, 16);
      const graphicsTableHash = createHash('sha256').update(JSON.stringify({ resource, bank, base, visualFrameId: frame.visualFrameId, graphics: gfx })).digest('hex').slice(0, 16);
      const graphicsBlockHashes = pieceGraphics.map(piece => piece.graphicsBlockHash);
      const sourceProvenanceHash = createHash('sha256').update(JSON.stringify({
        rom: createHash('sha256').update(rom).digest('hex'),
        actorVisualProfileKey: key,
        graphicsBank: sourceBank,
        resource,
        visualFrameId: frame.visualFrameId,
        metaspriteHash,
        graphicsTableHash,
        graphicsBlockHashes,
        paletteHash,
      })).digest('hex').slice(0, 16);
      const assemblyInputHash = createHash('sha256').update(JSON.stringify({
        metaspritePieces: signedPieces.map(piece => ({
          x: piece.x,
          y: piece.y,
          rawX: piece.rawX,
          rawY: piece.rawY,
          width: piece.width,
          height: piece.height,
          tileDelta: piece.tileDelta,
          attr: piece.attr,
          flipX: piece.flipX,
          flipY: piece.flipY,
        })),
        graphicsBlockAddresses: pieceGraphics.map(piece => piece.graphicsBlockAddress),
        graphicsBlockHashes,
        paletteHash,
      })).digest('hex').slice(0, 16);

      const metadata = {
        schemaVersion: SCHEMA_VERSION,
        offsetEncoding: OFFSET_ENCODING,
        key, resource, bank, base,
        sequence: seq, frameIndex: f,
        frameRecord: frame,
        metasprite: {
          ...meta,
          pieces: signedPieces,
        },
        graphics: gfx,
        pieceGraphics,
        assembly: {
          pieceCount: meta.pieces.length,
          graphicsBlockCount: gfx.blockCount,
          renderedPieceCount,
          graphicsBlockAddresses: pieceGraphics.map(piece => piece.graphicsBlockAddress),
          renderedBlockAddresses: pieceGraphics.map(piece => piece.graphicsBlockAddress),
          piecesOutsideRaw,
          pixelsWrittenOutsideRaw,
          assemblyInputHash,
          rawPixelHash: rawHash,
          trimmedPixelHash: trimmedHash,
          errors: assemblyErrors,
        },
        source: { bank: sourceBank, baseAddress: 0x0000 },
        palette: {
          raw: palette.raw,
          rawBytes: palette.rawBytes,
          rawSha256: palette.rawSha256,
          cpuAddress: palette.cpuAddress,
          cpuAddressHex: palette.cpuAddressHex,
          fileOffset: palette.fileOffset,
          fileOffsetHex: palette.fileOffsetHex,
          bgr555: palette.bgr555,
          colors: palette.colors,
          transparentIndex: 0,
          color0Transparent: true,
          displayTransform: 'BGR555_TO_SRGB_DIRECT',
        },
        bounds: {
          coordinateSpace: 'METASPRITE_ORIGIN',
          minX: minPieceX,
          minY: minPieceY,
          maxX: maxPieceX,
          maxY: maxPieceY,
          width: trimW,
          height: trimH,
          originInTrimX,
          originInTrimY,
          opaqueBounds: opaqueMinX <= opaqueMaxX ? {
            minX: opaqueMinX,
            minY: opaqueMinY,
            maxX: opaqueMaxX,
            maxY: opaqueMaxY,
          } : null,
        },
        rawBounds: {
          coordinateSpace: 'METASPRITE_ORIGIN',
          minX: minPieceX,
          minY: minPieceY,
          maxX: maxPieceX,
          maxY: maxPieceY,
          width: trimW,
          height: trimH,
          originX: originInTrimX,
          originY: originInTrimY,
        },
        rawCanvas: {
          rawFile: 'rom_raw.png',
          file: 'rom_raw_canvas.png',
          width: canvasW,
          height: canvasH,
          originX: ORIGIN,
          originY: ORIGIN,
          pieceBoundsInCanvas: {
            x: ORIGIN + minPieceX,
            y: ORIGIN + minPieceY,
            w: trimW,
            h: trimH,
          },
          originVisible: true,
        },
        trimmed: {
          file: 'rom_trimmed.png',
          x: minPieceX,
          y: minPieceY,
          w: trimW,
          h: trimH,
          originInTrim: { x: originInTrimX, y: originInTrimY },
        },
        hashes: { rawPixelHash: rawHash, rawCanvasOverlayHash: pixelDataHash(rawCanvas), trimmedPixelHash: trimmedHash, metaspriteHash, graphicsHash, paletteHash, graphicsTableHash, sourceProvenanceHash, assemblyInputHash },
        sourceProvenance: {
          metaspriteHash,
          graphicsTableHash,
          graphicsHash,
          graphicsBlockHashes,
          paletteRawHash: paletteHash,
          sourceProvenanceHash,
        },
        romVram: { buffer: null, tileBase: null, doubleBuffered: true }, // metadata de fidelidad (no emulado)
        evidence: 'ROM_PHYSICAL (sin assets externos)',
      };
      writeFileSync(join(outDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
      framesRendered.push({ key, seq, f, hashes: metadata.hashes });
      index.push({ key, seq, f, meta: metaspriteHash, gfx: graphicsHash, pal: paletteHash });
      console.log(`  key ${key.toString(16).padStart(2, '0')} seq${seq} F${f}: vfid=${frame.visualFrameId} pieces=${meta.pieces.length} blocks=${gfx.blockCount} → ${outDir}`);
    }
  }
  void framesRendered;
}

writeFileSync(join(OUT, `resource_${resource.toString(16).padStart(2, '0')}`, 'physical-index.json'), JSON.stringify(index, null, 2));
if (invariantMismatches > 0) {
  console.log(`physical-index.json escrito con ${invariantMismatches} invariant mismatches; resource no es promocionable como FIGHTER_PHYSICAL.`);
  process.exit(1);
}
console.log('physical-index.json escrito');
