// ═══════════════════════════════════════════════════════════════════════
// build-canonical-manifest-bridge — F-MAP2
// ═══════════════════════════════════════════════════════════════════════
// Establece el enlace FÍSICO demostrable entre:
//   Canonical_Frames_Official (catalog-v9/forms_by_runtime/<form>/atomic/*)
//   ↔ current manifest.json  (public/assets/sprites/<dir>/<dir>_<pose>_NN.png)
//
// Matching PERMITIDO (orden, sin fuzzy/perceptual):
//   1. BYTE_EXACT         → SHA256 del PNG crudo idéntico
//   2. PIXEL_EXACT        → RGBA decodificado idéntico (misma W/H + píxeles)
//   3. VISIBLE_PIXEL_EXACT→ RGBA visible idéntico (alpha>0; RGB de
//                           transparentes ignorado, posición preservada)
//   4. NO_MATCH           → sin evidencia física (NO se promueve)
//
// PROHIBIDO como evidencia: resize/crop/flip/recolor/fuzzy/SSIM/perceptual.
// ═══════════════════════════════════════════════════════════════════════

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { SPRITE_CANON } from '../src/data/generated/spriteCanon.generated';
import { MANIFEST_FRAME_INDEX } from '../src/data/generated/manifestFrameIndex.generated';
import { FORMS } from '../src/data/roster';
import { spriteDirFor } from '../src/data/spriteManifest';

// ── PNG decode (RGBA8 no-interlaced; color types 2/RGB y 6/RGBA) ──
function decodePngRgba(buf: Buffer): { w: number; h: number; rgba: Uint8Array } | null {
  if (buf.length < 33 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  let w = 0, h = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat: Buffer[] = [];
  let off = 8;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  if (bitDepth !== 8 || interlace !== 0) return null;
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (bpp === 0) return null; // solo RGBA/RGB (indexado/grayscale → solo BYTE_EXACT)
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = new Uint8Array(w * h * 4);
  const prev = new Uint8Array(stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (filter === 1) v = (v + a) & 255;
      else if (filter === 2) v = (v + b) & 255;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        v = (v + pr) & 255;
      }
      line[i] = v;
    }
    // expand RGB→RGBA or copy RGBA
    for (let x = 0; x < w; x++) {
      const o = y * w * 4 + x * 4;
      if (bpp === 4) {
        out[o] = line[x * 4]; out[o + 1] = line[x * 4 + 1]; out[o + 2] = line[x * 4 + 2]; out[o + 3] = line[x * 4 + 3];
      } else {
        out[o] = line[x * 3]; out[o + 1] = line[x * 3 + 1]; out[o + 2] = line[x * 3 + 2]; out[o + 3] = 255;
      }
    }
    prev.set(line);
  }
  return { w, h, rgba: out };
}

const sha256 = (b: Buffer | Uint8Array) => createHash('sha256').update(b).digest('hex');

interface Fingerprint {
  sha256: string;
  pixelKey: string | null;   // sha256 del RGBA completo
  visibleKey: string | null; // sha256 del RGBA con RGB de transparentes a 0
}

function fingerprint(path: string): Fingerprint {
  const buf = readFileSync(path);
  const sha = sha256(buf);
  const dec = decodePngRgba(buf);
  if (!dec) return { sha256: sha, pixelKey: null, visibleKey: null };
  const pixelKey = sha256(dec.rgba);
  const vis = new Uint8Array(dec.rgba.length);
  for (let i = 0; i < dec.rgba.length; i += 4) {
    const a = dec.rgba[i + 3];
    vis[i] = a > 0 ? dec.rgba[i] : 0;
    vis[i + 1] = a > 0 ? dec.rgba[i + 1] : 0;
    vis[i + 2] = a > 0 ? dec.rgba[i + 2] : 0;
    vis[i + 3] = a;
  }
  return { sha256: sha, pixelKey, visibleKey: sha256(vis) };
}

// ── canonicalId / family / role lookup from SPRITE_CANON ──
const canonMeta = new Map<string, { canonicalId: string; family: string; role: string }>();
for (const form of SPRITE_CANON.forms) {
  for (const f of form.frames) {
    canonMeta.set(f.sourceId, { canonicalId: f.canonicalId, family: f.family, role: f.role });
  }
}

// ── index canonical frames (filesystem) ──
interface CanonFrame { sourceId: string; sha256: string; pixelKey: string | null; visibleKey: string | null; }
const canonBySha = new Map<string, string[]>();
const canonByPixel = new Map<string, string[]>();
const canonByVisible = new Map<string, string[]>();
const canonAll: CanonFrame[] = [];

const canonRoot = resolve(process.cwd(), 'sprites-source/catalog-v9/forms_by_runtime');
for (const dir of readdirSync(canonRoot)) {
  for (const sub of ['atomic', 'fixed_only']) {
    const p = join(canonRoot, dir, sub);
    if (!existsSync(p)) continue;
    for (const f of readdirSync(p)) {
      if (!f.endsWith('.png')) continue;
      const sourceId = `${dir}/${f}`;
      const fp = fingerprint(join(p, f));
      canonAll.push({ sourceId, ...fp });
      canonBySha.set(fp.sha256, [...(canonBySha.get(fp.sha256) ?? []), sourceId]);
      if (fp.pixelKey) canonByPixel.set(fp.pixelKey, [...(canonByPixel.get(fp.pixelKey) ?? []), sourceId]);
      if (fp.visibleKey) canonByVisible.set(fp.visibleKey, [...(canonByVisible.get(fp.visibleKey) ?? []), sourceId]);
    }
  }
}

// ── match manifest frames ──
type Relation = 'BYTE_EXACT' | 'PIXEL_EXACT' | 'VISIBLE_PIXEL_EXACT' | 'NO_MATCH';
interface Binding {
  formId: string; dir: string; pose: string; manifestIndex: number; manifestFile: string;
  canonicalSourceId: string | null; canonicalId: string | null; canonicalFamily: string | null; canonicalRole: string | null;
  relation: Relation; evidence: string;
}

const bindings: Binding[] = [];
const manRoot = resolve(process.cwd(), 'public/assets/sprites');

for (const rec of MANIFEST_FRAME_INDEX) {
  const path = join(manRoot, rec.dir, rec.file);
  if (!existsSync(path)) {
    bindings.push({ formId: rec.formId, dir: rec.dir, pose: rec.pose, manifestIndex: rec.index, manifestFile: rec.file, canonicalSourceId: null, canonicalId: null, canonicalFamily: null, canonicalRole: null, relation: 'NO_MATCH', evidence: 'manifest file missing on disk' });
    continue;
  }
  const fp = fingerprint(path);
  let relation: Relation = 'NO_MATCH';
  let matches: string[] = [];
  let evidence = 'no byte/pixel/visible equality';
  if (canonBySha.has(fp.sha256)) { relation = 'BYTE_EXACT'; matches = canonBySha.get(fp.sha256)!; evidence = `sha256 ${fp.sha256.slice(0, 12)}`; }
  else if (fp.pixelKey && canonByPixel.has(fp.pixelKey)) { relation = 'PIXEL_EXACT'; matches = canonByPixel.get(fp.pixelKey)!; evidence = 'RGBA pixel-identical'; }
  else if (fp.visibleKey && canonByVisible.has(fp.visibleKey)) { relation = 'VISIBLE_PIXEL_EXACT'; matches = canonByVisible.get(fp.visibleKey)!; evidence = 'visible-RGBA identical (transparent RGB ignored)'; }

  const src = matches[0] ?? null;
  const meta = src ? canonMeta.get(src) : undefined;
  bindings.push({
    formId: rec.formId, dir: rec.dir, pose: rec.pose, manifestIndex: rec.index, manifestFile: rec.file,
    canonicalSourceId: src, canonicalId: meta?.canonicalId ?? null, canonicalFamily: meta?.family ?? null, canonicalRole: meta?.role ?? null,
    relation, evidence: evidence + (matches.length > 1 ? ` (+${matches.length - 1} ambiguous)` : ''),
  });
}

// ── summary ──
const byRelation: Record<Relation, number> = { BYTE_EXACT: 0, PIXEL_EXACT: 0, VISIBLE_PIXEL_EXACT: 0, NO_MATCH: 0 };
for (const b of bindings) byRelation[b.relation]++;

// ── shared physical frames (RUNTIME_SHARED): dirs referenciados por >1 forma ──
// (misma fuente que sharedDirMap(): FORMS → spriteDirFor(formId))
const dirToForms = new Map<string, Set<string>>();
for (const formId of Object.keys(FORMS)) {
  const dir = spriteDirFor(formId);
  if (!dir) continue;
  if (!dirToForms.has(dir)) dirToForms.set(dir, new Set());
  dirToForms.get(dir)!.add(formId);
}
const sharedDirs = [...dirToForms.entries()]
  .filter(([, forms]) => forms.size > 1)
  .map(([dir, forms]) => ({ dir, forms: [...forms].sort() }));
const sharedPhysical = bindings.filter(b => (dirToForms.get(b.dir)?.size ?? 0) > 1);

// ── diagnostics ──
const brokenCanonicalRefs = bindings.filter(b => b.canonicalSourceId && !b.canonicalId);
const brokenManifestRefs = bindings.filter(b => b.evidence === 'manifest file missing on disk');
const canonIdCounts = new Map<string, number>();
for (const f of SPRITE_CANON.forms.flatMap(f => f.frames)) canonIdCounts.set(f.canonicalId, (canonIdCounts.get(f.canonicalId) ?? 0) + 1);
const duplicateCanonicalIds = [...canonIdCounts.entries()].filter(([, n]) => n > 1);

const diagnostics = {
  brokenCanonicalRefs: brokenCanonicalRefs.length,
  brokenManifestRefs: brokenManifestRefs.length,
  duplicateCanonicalIds: duplicateCanonicalIds.length,
  sharedDirs,
  sharedPhysicalFrames: sharedPhysical.length,
};

// ── emit generated TS ──
const outDir = resolve(process.cwd(), 'src/data/generated');
mkdirSync(outDir, { recursive: true });

const serialize = (rows: Binding[]) => rows.map(r => `  { formId: ${JSON.stringify(r.formId)}, dir: ${JSON.stringify(r.dir)}, pose: ${JSON.stringify(r.pose)}, manifestIndex: ${r.manifestIndex}, manifestFile: ${JSON.stringify(r.manifestFile)}, canonicalSourceId: ${JSON.stringify(r.canonicalSourceId)}, canonicalId: ${JSON.stringify(r.canonicalId)}, canonicalFamily: ${JSON.stringify(r.canonicalFamily)}, canonicalRole: ${JSON.stringify(r.canonicalRole)}, relation: ${JSON.stringify(r.relation)}, evidence: ${JSON.stringify(r.evidence)} }`).join(',\n');

const content = `// ═══════════════════════════════════════════════════════════════════════
// canonicalManifestBridge.generated.ts — GENERADO por
// scripts/build-canonical-manifest-bridge.ts (F-MAP2)
// NO editar a mano. Regenerar: npm run build:canonical-manifest-bridge
// ═══════════════════════════════════════════════════════════════════════

export type CanonicalMatchRelation = 'BYTE_EXACT' | 'PIXEL_EXACT' | 'VISIBLE_PIXEL_EXACT' | 'NO_MATCH';

export interface CanonicalManifestBinding {
  formId: string;
  dir: string;
  pose: string;
  manifestIndex: number;
  manifestFile: string;
  canonicalSourceId: string | null;
  canonicalId: string | null;
  canonicalFamily: string | null;
  canonicalRole: string | null;
  relation: CanonicalMatchRelation;
  evidence: string;
}

export const CANONICAL_MANIFEST_BINDINGS: readonly CanonicalManifestBinding[] = [
${serialize(bindings)}
];

export const CANONICAL_MANIFEST_SUMMARY = ${JSON.stringify({ total: bindings.length, byRelation, canonicalFramesIndexed: canonAll.length, manifestFramesIndexed: MANIFEST_FRAME_INDEX.length, diagnostics }, null, 2)} as const;
`;

writeFileSync(join(outDir, 'canonicalManifestBridge.generated.ts'), content);

// ── JSON outputs (reporte F-MAP2) ──
const reportDir = resolve(process.cwd(), 'docs/sprites/frame-map');
mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, 'canonical-manifest-bindings.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  summary: { total: bindings.length, byRelation, canonicalFramesIndexed: canonAll.length },
  bindings,
}, null, 2));
writeFileSync(join(reportDir, 'unresolved-canonical.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  count: byRelation.NO_MATCH,
  unresolved: bindings.filter(b => b.relation === 'NO_MATCH'),
}, null, 2));
writeFileSync(join(reportDir, 'shared-physical.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  sharedDirs,
  sharedPhysicalFrames: sharedPhysical.length,
  frames: sharedPhysical,
}, null, 2));

console.log('═══ F-MAP2 CANONICAL↔MANIFEST BRIDGE ═══');
console.log(`canonical frames indexed : ${canonAll.length}`);
console.log(`manifest frames indexed  : ${MANIFEST_FRAME_INDEX.length}`);
console.log(`BYTE_EXACT               : ${byRelation.BYTE_EXACT}`);
console.log(`PIXEL_EXACT              : ${byRelation.PIXEL_EXACT}`);
console.log(`VISIBLE_PIXEL_EXACT      : ${byRelation.VISIBLE_PIXEL_EXACT}`);
console.log(`NO_MATCH                 : ${byRelation.NO_MATCH}`);
console.log(`shared dirs              : ${sharedDirs.length} (${sharedDirs.map(d => d.dir).join(', ')})`);
console.log(`broken canonical refs    : ${brokenCanonicalRefs.length}`);
console.log(`broken manifest refs     : ${brokenManifestRefs.length}`);
console.log(`duplicate canonical IDs  : ${duplicateCanonicalIds.length}`);
console.log(`→ src/data/generated/canonicalManifestBridge.generated.ts`);
