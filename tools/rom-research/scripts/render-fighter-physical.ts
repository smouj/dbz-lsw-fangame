// ═══════════════════════════════════════════════════════════════════════
// R2.3 — PHYSICAL OBJ RENDERER (desde la ROM, sin assets externos).
// Cadena VERIFIED (R2.2): resource base → +0 secuencias / +2 metasprites /
// +4 frame-graphics · graphics source [bank $31+key, base $0000] ·
// bloques 32B = 2 tiles 8×8 2bpp = pieza OBJ 8×16 · flips $40/$20 ·
// paleta $6E00+key×8 (BGR555).
// Uso: npx tsx tools/rom-research/scripts/render-fighter-physical.ts
//   --resource 3 --keys 2,8,d [--selector 0..5] [--out docs/rom/generated/fighters]
// Salida: profile_<key>/seq_SS/frame_FF/rom_raw.png + rom_trimmed.png +
// metadata.json + physical-index.json + hashes.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { PNG } from 'pngjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ROM_PATH = resolve(ROOT, '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc');
const CATALOG = join(ROOT, 'docs/rom/generated/animation-resources.json');
const PALETTES_TS = join(ROOT, 'src/data/generated/romFighterPalettes.generated.ts');
const OUT = join(ROOT, 'docs/rom/generated/fighters');

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
    keys: (get('--keys') ?? '2,8,d').split(',').map((k) => parseInt(k, 16)),
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
    offsetY: raw[2], // byte2 = Y (consumer $096A → drawY)
    offsetX: raw[3], // byte3 = X
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

/** D. graphics source + bloque: [bank $31+key, base $0000] + offset → 32B. */
function resolveGraphicsBlock(key: number, relativeOffset: number) {
  const bank = 0x31 + key;
  const addr = relativeOffset; // base $0000
  const start = bank * 0x4000 + addr;
  if (start + 32 > rom.length) throw new Error(`block fuera de ROM: bank ${bank} + ${addr}`);
  return { bank, absoluteAddress: start, relativeOffset, raw32: Array.from(rom.subarray(start, start + 32)) };
}

/** Paleta: $6E00 + key×8 → 4 BGR555 → RGB. */
function resolvePalette(key: number) {
  const src = readFileSync(PALETTES_TS, 'utf8');
  const m = src.match(/ROM_FIGHTER_PALETTES:[\s\S]*?= (\[[\s\S]*?\]);/);
  if (!m) throw new Error('no se pudo leer romFighterPalettes');
  const pal = JSON.parse(m[1]).find((p: { key: number }) => p.key === key);
  if (!pal) throw new Error(`sin paleta física para key ${key}`);
  return pal;
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

/** Bloque 32B → pieza 8×16 (tile superior + inferior). */
function blockToPiece(raw32: number[]): number[][][] {
  return [decodeTile2bpp(raw32.slice(0, 16)), decodeTile2bpp(raw32.slice(16, 32))];
}

function flipTile(tile: number[][], flipX: boolean, flipY: boolean): number[][] {
  let t = tile;
  if (flipX) t = t.map((row) => [...row].reverse());
  if (flipY) t = [...t].reverse();
  return t;
}

// ── Render ──
const { resource, keys, selector } = parseArgs();
const res = catalog.find((r: { resourceId: number }) => r.resourceId === resource);
if (!res) { console.log(`resource ${resource} no en catálogo`); process.exit(1); }
const bank = res.bank;
const base = resourceBase(bank, resource);
console.log(`resource ${resource} (bank $${bank.toString(16)}) base=$${base.toString(16).toUpperCase()}`);

const index: unknown[] = [];
const ORIGIN = 128; // raw canvas origin (0,0) técnico constante

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
        console.log(`⚠ MISMATCH seq${seq} F${f}: pieces=${meta.pieces.length} blocks=${gfx.blockCount} — invariante R2 violado`);
      }
      // bloques físicos
      const blocks = gfx.relativeOffsets.map((off) => resolveGraphicsBlock(key, off));
      const pieces = blocks.map((b, i) => blockToPiece(b.raw32));

      // composición: canvas RGBA (raw, origen técnico constante)
      const canvasW = 256, canvasH = 256;
      const rgba = new Uint8Array(canvasW * canvasH * 4); // 0 = transparente
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let cx = ORIGIN + frame.offsetX;
      let cy = ORIGIN + frame.offsetY;
      meta.pieces.forEach((piece, i) => {
        const tileTop = pieces[i]?.[0];
        const tileBot = pieces[i]?.[1];
        if (!tileTop || !tileBot) return;
        const tt = flipTile(tileTop, piece.flipX, piece.flipY);
        const tb = flipTile(tileBot, piece.flipX, piece.flipY);
        // pieza OBJ 8×16: y = rawY, x = rawX (s8)
        const py = cy + (piece.rawY < 128 ? piece.rawY : piece.rawY - 256);
        const px = cx + piece.rawX;
        for (let yy = 0; yy < 8; yy++) {
          for (let xx = 0; xx < 8; xx++) {
            const idxTop = tt[yy][xx];
            if (idxTop > 0) {
              const color = palette.colors[idxTop - 1] ?? '#000000';
              const X = px + xx, Y = py + yy;
              if (X >= 0 && X < canvasW && Y >= 0 && Y < canvasH) {
                const o = (Y * canvasW + X) * 4;
                rgba[o] = parseInt(color.slice(1, 3), 16); rgba[o + 1] = parseInt(color.slice(3, 5), 16); rgba[o + 2] = parseInt(color.slice(5, 7), 16); rgba[o + 3] = 255;
                minX = Math.min(minX, X); minY = Math.min(minY, Y); maxX = Math.max(maxX, X); maxY = Math.max(maxY, Y);
              }
            }
            const idxBot = tb[yy][xx];
            if (idxBot > 0) {
              const color = palette.colors[idxBot - 1] ?? '#000000';
              const X = px + xx, Y = py + 8 + yy;
              if (X >= 0 && X < canvasW && Y >= 0 && Y < canvasH) {
                const o = (Y * canvasW + X) * 4;
                rgba[o] = parseInt(color.slice(1, 3), 16); rgba[o + 1] = parseInt(color.slice(3, 5), 16); rgba[o + 2] = parseInt(color.slice(5, 7), 16); rgba[o + 3] = 255;
                minX = Math.min(minX, X); minY = Math.min(minY, Y); maxX = Math.max(maxX, X); maxY = Math.max(maxY, Y);
              }
            }
          }
        }
      });

      // PNG raw (sin recortar) + trimmed (bounding box)
      const outDir = join(OUT, `resource_${resource.toString(16).padStart(2, '0')}`, `profile_${key.toString(16).padStart(2, '0')}`, `seq_${String(seq).padStart(2, '0')}`, `frame_${String(f).padStart(2, '0')}`);
      mkdirSync(outDir, { recursive: true });

      const writePng = (path: string, w: number, h: number, data: Uint8Array) => {
        const png = new PNG({ width: w, height: h });
        png.data = Buffer.from(data);
        writeFileSync(path, PNG.sync.write(png));
      };
      writePng(join(outDir, 'rom_raw.png'), canvasW, canvasH, rgba);

      let trimmed = rgba;
      let tw = canvasW, th = canvasH;
      if (minX <= maxX && minY <= maxY) {
        tw = maxX - minX + 1; th = maxY - minY + 1;
        trimmed = new Uint8Array(tw * th * 4);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const s = (y * canvasW + x) * 4;
            const d = ((y - minY) * tw + (x - minX)) * 4;
            trimmed.set(rgba.subarray(s, s + 4), d);
          }
        }
      }
      writePng(join(outDir, 'rom_trimmed.png'), tw, th, trimmed);

      const rawHash = createHash('sha256').update(Buffer.from(rgba)).digest('hex').slice(0, 16);
      const trimmedHash = createHash('sha256').update(Buffer.from(trimmed)).digest('hex').slice(0, 16);
      const metaspriteHash = createHash('sha256').update(JSON.stringify(meta.pieces)).digest('hex').slice(0, 16);
      const graphicsHash = createHash('sha256').update(JSON.stringify(gfx.relativeOffsets)).digest('hex').slice(0, 16);
      const paletteHash = createHash('sha256').update(palette.bgr555.join(',')).digest('hex').slice(0, 16);

      const metadata = {
        key, resource, bank, base,
        sequence: seq, frameIndex: f,
        frameRecord: frame,
        metasprite: meta,
        graphics: gfx,
        source: { bank: sourceBank, baseAddress: 0x0000 },
        palette: { bgr555: palette.bgr555, colors: palette.colors },
        bounds: { minX, minY, maxX, maxY },
        hashes: { rawPixelHash: rawHash, trimmedPixelHash: trimmedHash, metaspriteHash, graphicsHash, paletteHash },
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
console.log('physical-index.json escrito');
