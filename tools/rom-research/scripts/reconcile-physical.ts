// ═══════════════════════════════════════════════════════════════════════
// R2.4 — PHYSICAL FRAME RECONCILIATION.
// Normalizador ÚNICO para ROM y Canonical (no semántico, sin resize/flip/
// remap/fuzzy):
//   RGBA → alpha==0 → RGB=0 → alpha bbox → crop exacto → hash(w,h,RGBA)
//   + opaqueMaskHash (geometría alpha, diagnóstico)
// Unidad física ROM: actorVisualProfileKey + resourceId + visualFrameId
//   (occurrences conservan sequence/frame/ticks/offsets — NO entran en el hash).
// Clasificación: EXACT (hash binario idéntico) · SHARED (N↔1/1↔N) ·
//   COMPOSITE (solo con componentes demostrados — no se asigna aquí) ·
//   UNRESOLVED (todo lo demás). Diagnósticos que NO cambian el status.
// Uso: npx tsx tools/rom-research/scripts/reconcile-physical.ts
// Salida: docs/rom/generated/reconciliation/{canonical-physical-index.json,
//   rom-physical-index.json, physical-reconciliation.json,
//   physical-reconciliation.csv, REPORT.md}
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { PNG } from 'pngjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CANONICAL_ROOT = resolve(ROOT, '../.tmp/canonical_frames_official/Canonical_Frames_Official');
const ROM_RENDERS = join(ROOT, 'docs/rom/generated/fighters/resource_03');
const OUT_DIR = join(ROOT, 'docs/rom/generated/reconciliation');

/** Normalizador único: decode → alpha0→RGB0 → crop por alpha bbox → hash. */
function normalizePhysicalFrame(pngPath: string): {
  width: number; height: number; normalizedWidth: number; normalizedHeight: number;
  alphaBBox: { x: number; y: number; w: number; h: number };
  normalizedPixelHash: string; opaqueMaskHash: string; sourceFileHash: string;
} | null {
  try {
    const png = PNG.sync.read(readFileSync(pngPath));
    const W = png.width, H = png.height;
    // alpha bbox
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const a = png.data[(y * W + x) * 4 + 3];
        if (a > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX) return null; // vacío
    const cw = maxX - minX + 1, ch = maxY - minY + 1;
    const rgba = Buffer.alloc(cw * ch * 4);
    const mask = Buffer.alloc(cw * ch);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const s = ((minY + y) * W + (minX + x)) * 4;
        const d = (y * cw + x) * 4;
        const a = png.data[s + 3];
        rgba[d] = a === 0 ? 0 : png.data[s];
        rgba[d + 1] = a === 0 ? 0 : png.data[s + 1];
        rgba[d + 2] = a === 0 ? 0 : png.data[s + 2];
        rgba[d + 3] = a;
        mask[y * cw + x] = a > 0 ? 1 : 0;
      }
    }
    const h = (b: Buffer) => createHash('sha256').update(b).digest('hex').slice(0, 16);
    return {
      width: W, height: H, normalizedWidth: cw, normalizedHeight: ch,
      alphaBBox: { x: minX, y: minY, w: cw, h: ch },
      normalizedPixelHash: h(Buffer.concat([Buffer.from([cw, ch]), rgba])),
      opaqueMaskHash: h(Buffer.concat([Buffer.from([cw, ch]), mask])),
      sourceFileHash: h(readFileSync(pngPath)),
    };
  } catch {
    return null;
  }
}

// ── 1) Canonical physical index ──
function walkPngs(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walkPngs(p));
    else if (/\.png$/i.test(e)) out.push(p);
  }
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });
const canonicalIndex: { canonicalId: string; sourcePath: string; normalizedPixelHash: string; opaqueMaskHash: string; sourceFileHash: string; normalizedWidth: number; normalizedHeight: number }[] = [];
const canonicalByHash = new Map<string, string[]>();
if (existsSync(CANONICAL_ROOT)) {
  const files = walkPngs(CANONICAL_ROOT);
  for (const f of files) {
    const rel = f.replace(CANONICAL_ROOT + '/', '');
    const n = normalizePhysicalFrame(f);
    if (!n) continue;
    const rec = {
      canonicalId: rel,
      sourcePath: rel,
      normalizedPixelHash: n.normalizedPixelHash,
      opaqueMaskHash: n.opaqueMaskHash,
      sourceFileHash: n.sourceFileHash,
      normalizedWidth: n.normalizedWidth,
      normalizedHeight: n.normalizedHeight,
    };
    canonicalIndex.push(rec);
    const list = canonicalByHash.get(n.normalizedPixelHash) ?? [];
    list.push(rel);
    canonicalByHash.set(n.normalizedPixelHash, list);
  }
}
writeFileSync(join(OUT_DIR, 'canonical-physical-index.json'), JSON.stringify(canonicalIndex, null, 2));
console.log(`Canonical: ${canonicalIndex.length} PNGs indexados`);

// ── 2) ROM physical index (identidades físicas únicas: key+vfid) ──
interface RomIdentity {
  key: number; resourceId: number; visualFrameId: number;
  normalizedPixelHash: string; opaqueMaskHash: string;
  occurrences: { sequence: number; frameIndex: number; durationTicks: number; offsetY: number; offsetX: number }[];
}
const romByIdentity = new Map<string, RomIdentity>();
const romKey = (k: number, v: number) => `${k}:${v}`;

function collectRom(profileDir: string, key: number) {
  for (const seqDir of readdirSync(profileDir)) {
    const seqPath = join(profileDir, seqDir);
    if (!statSync(seqPath).isDirectory()) continue;
    const seq = parseInt(seqDir.replace('seq_', ''), 10);
    for (const frameDir of readdirSync(seqPath)) {
      const framePath = join(seqPath, frameDir);
      if (!statSync(framePath).isDirectory()) continue;
      const f = parseInt(frameDir.replace('frame_', ''), 10);
      const metaPath = join(framePath, 'metadata.json');
      const rawPath = join(framePath, 'rom_raw.png');
      if (!existsSync(metaPath) || !existsSync(rawPath)) continue;
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      const vfid = meta.frameRecord.visualFrameId;
      const n = normalizePhysicalFrame(rawPath);
      if (!n) continue;
      const kk = romKey(key, vfid);
      const existing = romByIdentity.get(kk);
      const occ = {
        sequence: meta.sequence, frameIndex: meta.frameIndex,
        durationTicks: meta.frameRecord.durationTicks,
        offsetY: meta.frameRecord.offsetY, offsetX: meta.frameRecord.offsetX,
      };
      if (existing) {
        if (!existing.occurrences.some((o) => o.sequence === occ.sequence && o.frameIndex === occ.frameIndex)) existing.occurrences.push(occ);
      } else {
        romByIdentity.set(kk, {
          key, resourceId: meta.resource, visualFrameId: vfid,
          normalizedPixelHash: n.normalizedPixelHash, opaqueMaskHash: n.opaqueMaskHash,
          occurrences: [occ],
        });
      }
    }
  }
}

const KEYS: Record<string, number> = { '02': 0x02, '08': 0x08, '0d': 0x0d };
for (const [name, key] of Object.entries(KEYS)) {
  const p = join(ROM_RENDERS, `profile_${name}`);
  if (existsSync(p)) collectRom(p, key);
}
const romIndex = [...romByIdentity.values()];
writeFileSync(join(OUT_DIR, 'rom-physical-index.json'), JSON.stringify(romIndex, null, 2));
console.log(`ROM: ${romIndex.length} identidades físicas únicas (dedup de occurrences)`);

// ── 3) Reconciliación ──
const reconciliation = romIndex.map((rom) => {
  const matches = canonicalByHash.get(rom.normalizedPixelHash) ?? [];
  let status: 'EXACT' | 'SHARED' | 'COMPOSITE' | 'UNRESOLVED' = 'UNRESOLVED';
  const diagnostics: string[] = [];
  if (matches.length === 1) {
    status = 'EXACT';
  } else if (matches.length > 1) {
    status = 'SHARED';
    diagnostics.push(`1 ROM → ${matches.length} Canonical IDs (SHARED_ROM_TO_CANONICAL)`);
  } else {
    // diagnóstico: misma geometría alpha, distinto RGBA
    const sameMask = canonicalIndex.filter((c) => c.opaqueMaskHash === rom.opaqueMaskHash);
    if (sameMask.length > 0) diagnostics.push(`SAME_ALPHA_GEOMETRY_DIFFERENT_RGBA (${sameMask.length} canonical)`);
    else diagnostics.push('NO_PHYSICAL_MATCH');
  }
  return {
    rom: {
      actorVisualProfileKey: rom.key,
      resourceId: rom.resourceId,
      visualFrameId: rom.visualFrameId,
      pixelHash: rom.normalizedPixelHash,
      opaqueMaskHash: rom.opaqueMaskHash,
    },
    canonical: matches.length > 0 ? { ids: matches, count: matches.length } : null,
    status,
    occurrences: rom.occurrences,
    diagnostics,
  };
});

writeFileSync(join(OUT_DIR, 'physical-reconciliation.json'), JSON.stringify(reconciliation, null, 2));
const csv = ['key,resource,vfid,status,pixelHash,opaqueMaskHash,canonicalIds,occurrences,diagnostics'];
for (const r of reconciliation) {
  csv.push(`${r.rom.actorVisualProfileKey.toString(16)},${r.rom.resourceId.toString(16)},${r.rom.visualFrameId},${r.status},${r.rom.pixelHash},${r.rom.opaqueMaskHash},${(r.canonical?.ids ?? []).join('|') || '-'},${r.occurrences.length},${r.diagnostics.join('|')}`);
}
writeFileSync(join(OUT_DIR, 'physical-reconciliation.csv'), csv.join('\n'));

const counts = reconciliation.reduce((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {} as Record<string, number>);
const md = [
  '# R2.4 — Physical Frame Reconciliation REPORT (piloto $03)',
  '',
  `Canonical indexados: ${canonicalIndex.length} · Identidades ROM únicas: ${romIndex.length}`,
  '',
  `| Key | Resource | VF | Status |`,
  `| --- | --- | --- | --- |`,
];
for (const r of reconciliation) {
  md.push(`| ${r.rom.actorVisualProfileKey.toString(16).padStart(2, '0')} | ${r.rom.resourceId.toString(16).padStart(2, '0')} | ${r.rom.visualFrameId.toString(16).padStart(2, '0')} | ${r.status}${r.canonical ? ` (${r.canonical.ids.slice(0, 2).join(', ')}${r.canonical.count > 2 ? '…' : ''})` : ''} |`);
}
md.push('', `EXACT ${counts.EXACT ?? 0} · SHARED ${counts.SHARED ?? 0} · COMPOSITE ${counts.COMPOSITE ?? 0} · UNRESOLVED ${counts.UNRESOLVED ?? 0}`, '');
md.push('COMPOSITE solo se asigna con componentes demostrados (ninguno aquí). UNRESOLVED es válido.', '');
writeFileSync(join(OUT_DIR, 'REPORT.md'), md.join('\n'));
console.log(`Reconciliación: EXACT=${counts.EXACT ?? 0} SHARED=${counts.SHARED ?? 0} COMPOSITE=${counts.COMPOSITE ?? 0} UNRESOLVED=${counts.UNRESOLVED ?? 0}`);
