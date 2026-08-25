// ═══════════════════════════════════════════════════════════════════════
// S-MAP2 — build-rom-provenance.ts
// ROM Physical Provenance Bridge: S-MAP1 bindings + R2.3 renders + R2.4
// normalizador → provenance ROM por frame físico (EXACT por hash, nunca
// fuzzy/resize/remap/flip/pose-name).
//   npx tsx tools/sprite-mapping/build-rom-provenance.ts
// Salidas en docs/rom/generated/sprite-mapping/:
//   rom-form-profiles.json · rom-physical-identities.json ·
//   rom-canonical-provenance.json · rom-unresolved-physical.json ·
//   ROM_PROVENANCE_REPORT.md
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { normalizePhysicalFrame } from './normalize.ts';
import { spriteDirs } from '../../src/data/spriteManifest.ts';

const ROOT = process.cwd() || resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ROM_PATH = resolve(ROOT, '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc');
const OUT = join(ROOT, 'docs/rom/generated/sprite-mapping');
const FIGHTERS = join(ROOT, 'docs/rom/generated/fighters');

const rom = readFileSync(ROM_PATH);
const u8 = (a: number) => rom[a];

// ── 1) Tablas ROM ──
const CARD_TABLE = 0x11 * 0x4000 + 0x320;
const cardRes = (i: number) => u8(CARD_TABLE + i * 16 + 6);
const cardMask = (i: number): bigint => {
  const r = CARD_TABLE + i * 16 + 9;
  let m = 0n;
  for (let b = 0; b < 6; b++) m |= BigInt(u8(r + b)) << BigInt(b * 8);
  return m;
};
function formKey(f: number): number {
  const rec = 0x4000 + ((f >> 4) << 8) + ((f & 0xf) << 4);
  return u8(0x11 * 0x4000 + ((rec + 1) & 0x3fff));
}
function bankedOffset(bank: number, cpuAddress: number): number {
  if (cpuAddress < 0x4000 || cpuAddress > 0x7fff) {
    throw new Error(`banked CPU address out of range: $${cpuAddress.toString(16)}`);
  }
  return bank * 0x4000 + (cpuAddress - 0x4000);
}
const PAL_BANK = 0x30;
const PAL_TABLE = 0x6e00;
function paletteFor(key: number): number[] {
  const cpuAddress = PAL_TABLE + key * 8;
  const off = bankedOffset(PAL_BANK, cpuAddress);
  const raw = Array.from(rom.subarray(off, off + 8));
  return raw;
}
function hasPalette(key: number): boolean {
  const raw = paletteFor(key);
  // 0x0000 is a valid BGR555 black color. The ROM copies all 8 bytes from
  // Bank30:$6E00+key*8, so all-zero entries are physical palette data too.
  return raw.length === 8 && raw.slice(0, 6).some((b) => b !== 0xff);
}

// ── 2) Mapping formID → formId (tabla de bits del corpus; inciertos marcados) ──
const FORM_NAMES: Record<number, { formId: string; uncertain?: boolean }> = {
  1: { formId: 'gohan_young' }, 2: { formId: 'gohan_young_ssj' }, 3: { formId: 'gohan_young_ssj2' },
  4: { formId: 'piccolo_base' }, 5: { formId: 'piccolo_kami' }, 6: { formId: 'piccolo_evil' },
  7: { formId: 'krillin_base' },
  8: { formId: 'goku_base' }, 9: { formId: 'goku_ssj' }, 10: { formId: 'goku_ssj2' }, 11: { formId: 'goku_ssj3' },
  12: { formId: 'vegeta_base' }, 13: { formId: 'vegeta_ssj' }, 14: { formId: 'vegeta_majin' },
  15: { formId: 'gohan_adult_ssj' }, 16: { formId: 'gohan_adult_ssj2' }, 17: { formId: 'gohan_adult_ultimate' },
  18: { formId: 'trunks_future' }, 19: { formId: 'trunks_ssj' },
  20: { formId: 'goten_base' }, 21: { formId: 'goten_ssj' },
  22: { formId: 'trunks_kid' }, 23: { formId: 'trunks_kid_ssj' },
  24: { formId: 'buu_base' }, 25: { formId: 'buu_super' },
  26: { formId: 'nappa' }, 27: { formId: 'guldo' }, 28: { formId: 'recoome' },
  29: { formId: 'jeice' }, 30: { formId: 'burter' }, 31: { formId: 'ginyu' },
  32: { formId: 'frieza_final' },
  33: { formId: 'android_16' }, 34: { formId: 'android_17' }, 35: { formId: 'android_18' },
  36: { formId: 'android_19' }, 37: { formId: 'android_20' },
  38: { formId: 'cell_imperfect' }, 39: { formId: 'cell_semi' }, 40: { formId: 'cell_perfect' },
  41: { formId: 'cell_jr' },
  42: { formId: 'buu_gotenks', uncertain: true }, 43: { formId: 'buu_gohan', uncertain: true },
  44: { formId: 'buu_kid', uncertain: true }, 45: { formId: 'ginyu_goku', uncertain: true },
  46: { formId: 'gotenks_ssj', uncertain: true }, 47: { formId: 'gotenks_ssj3', uncertain: true },
  48: { formId: 'vegito_ssj', uncertain: true },
};

// ── 3) Perfiles de forma ──
const formProfiles: unknown[] = [];
const keyByFormId: Record<string, number> = {};
for (let f = 1; f <= 48; f++) {
  const key = formKey(f);
  const name = FORM_NAMES[f]!;
  keyByFormId[name.formId] = key;
  const pal = paletteFor(key);
  const paletteCpuAddress = PAL_TABLE + key * 8;
  const paletteFileOffset = bankedOffset(PAL_BANK, paletteCpuAddress);
  formProfiles.push({
    formId: name.formId,
    romFormId: f,
    actorVisualProfileKey: key,
    graphicsBank: 0x31 + key,
    paletteAddress: `Bank30:$6E00 + 0x${key.toString(16)}×8`,
    paletteRomBank: PAL_BANK,
    paletteCpuAddress,
    paletteCpuAddressHex: `0x${paletteCpuAddress.toString(16).padStart(4, '0')}`,
    paletteFileOffset,
    paletteFileOffsetHex: `0x${paletteFileOffset.toString(16).padStart(5, '0')}`,
    paletteRaw: pal.map((b) => b.toString(16).padStart(2, '0')),
    paletteAvailable: hasPalette(key),
    paletteNote: hasPalette(key) ? undefined : 'paleta vacía en $6E00 (fuente pendiente)',
    mappingUncertain: name.uncertain ?? false,
    evidence: ['Bank00:$2B65/$2A77 (registro forma Bank11) + Bank30:$6E00+key×8 (ROM_STATIC_VERIFIED)'],
  });
}

// ── 4) Corpus alcanzable: forma → cartas compatibles → resources ──
const reachable: Record<number, { key: number; resources: number[] }> = {};
for (let f = 1; f <= 48; f++) {
  const key = formKey(f);
  const ress = new Set<number>();
  for (let i = 0; i < 125; i++) {
    const m = cardMask(i);
    if ((m >> BigInt(f - 1)) & 1n) {
      const r = cardRes(i);
      if (r > 0 && r < 100) ress.add(r);
    }
  }
  reachable[f] = { key, resources: [...ress].sort((a, b) => a - b) };
}

// ── 5) Identidades ROM renderizadas → hashes ──
interface RomIdentity {
  actorVisualProfileKey: number;
  resourceId: number;
  visualFrameId: number;
  sequence: number;
  normalizedPixelHash: string;
  opaqueMaskHash: string;
  canonicalFile?: string;
  provenance: 'ROM_EXACT' | 'ROM_UNRESOLVED';
}
const romIdentities: RomIdentity[] = [];
const romHashIndex = new Map<string, RomIdentity[]>(); // hash → identities

function walkRenders(): void {
  if (!existsSync(FIGHTERS)) return;
  for (const resDir of readdirSync(FIGHTERS)) {
    const m = resDir.match(/^resource_([0-9a-f]+)$/i);
    if (!m) continue;
    const resourceId = parseInt(m[1], 16);
    const resPath = join(FIGHTERS, resDir);
    for (const profDir of readdirSync(resPath)) {
      const pm = profDir.match(/^profile_([0-9a-f]+)$/i);
      if (!pm) continue;
      const key = parseInt(pm[1], 16);
      const profPath = join(resPath, profDir);
      for (const seqDir of readdirSync(profPath)) {
        const sm = seqDir.match(/^seq_(\d+)$/);
        if (!sm) continue;
        const seqPath = join(profPath, seqDir);
        for (const frameDir of readdirSync(seqPath)) {
          const fm = frameDir.match(/^frame_(\d+)$/);
          if (!fm) continue;
          const framePath = join(profPath, seqDir, frameDir);
          const metaPath = join(framePath, 'metadata.json');
          if (!existsSync(metaPath)) continue;
          const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
          const rawPath = join(framePath, 'rom_raw.png');
          if (!existsSync(rawPath)) continue;
          const n = normalizePhysicalFrame(rawPath);
          if (!n) continue;
          const id: RomIdentity = {
            actorVisualProfileKey: key,
            resourceId,
            visualFrameId: meta.frameRecord?.visualFrameId ?? parseInt(fm[1], 10),
            sequence: parseInt(sm[1], 10),
            normalizedPixelHash: n.normalizedPixelHash,
            opaqueMaskHash: n.opaqueMaskHash,
            provenance: 'ROM_UNRESOLVED',
          };
          romIdentities.push(id);
          const list = romHashIndex.get(n.normalizedPixelHash) ?? [];
          list.push(id);
          romHashIndex.set(n.normalizedPixelHash, list);
        }
      }
    }
  }
}
walkRenders();

// ── 6) Canonical (S-MAP1) → hashes ──
const SPRITE_DIRS = spriteDirs();
const canonicalProvenance: unknown[] = [];
const canonicalHashIndex = new Map<string, { file: string; formId: string; pose: string; dir: string }[]>();

for (const formId of Object.keys(SPRITE_DIRS)) {
  const dir = SPRITE_DIRS[formId]!;
  const manifestPath = join(ROOT, 'public/assets/sprites', dir, 'manifest.json');
  if (!existsSync(manifestPath)) continue;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const [pose, data] of Object.entries(manifest) as [string, { frames: Array<{ file: string }> }][]) {
    for (const f of data.frames) {
      const filePath = join(ROOT, 'public/assets/sprites', dir, f.file);
      if (!existsSync(filePath)) continue;
      const n = normalizePhysicalFrame(filePath);
      if (!n) continue;
      const entry = { file: f.file, formId, pose, dir };
      const list = canonicalHashIndex.get(n.normalizedPixelHash) ?? [];
      list.push(entry);
      canonicalHashIndex.set(n.normalizedPixelHash, list);
      canonicalProvenance.push({ ...entry, normalizedPixelHash: n.normalizedPixelHash });
    }
  }
}

// ── 7) Comparación exacta por hash ──
let exactCount = 0;
const exactRelations: unknown[] = [];
const romCanonicalCount = new Map<string, number>();
for (const id of romIdentities) {
  const canon = canonicalHashIndex.get(id.normalizedPixelHash) ?? [];
  if (canon.length > 0) {
    id.provenance = 'ROM_EXACT';
    id.canonicalFile = canon[0].file;
    exactCount++;
    for (const c of canon) {
      exactRelations.push({
        rom: { profileKey: id.actorVisualProfileKey, resourceId: id.resourceId, visualFrameId: id.visualFrameId },
        canonical: { formId: c.formId, pose: c.pose, file: c.file },
        hash: id.normalizedPixelHash,
      });
    }
    const k = `${id.actorVisualProfileKey}:${id.resourceId}:${id.visualFrameId}`;
    romCanonicalCount.set(k, (romCanonicalCount.get(k) ?? 0) + canon.length);
  }
}
// dedupe de identidades ROM únicas (ANTES de asignar ROM_SHARED)
const uniqueRom = new Map<string, RomIdentity>();
for (const id of romIdentities) {
  const k = `${id.actorVisualProfileKey}:${id.resourceId}:${id.visualFrameId}`;
  if (!uniqueRom.has(k)) uniqueRom.set(k, id);
}
// ROM_SHARED: una identidad ROM con ≥2 archivos canónicos distintos (N↔1)
for (const id of uniqueRom.values()) {
  const k = `${id.actorVisualProfileKey}:${id.resourceId}:${id.visualFrameId}`;
  const n = romCanonicalCount.get(k) ?? 0;
  if (n >= 2) id.provenance = 'ROM_SHARED';
  if (n === 1) id.provenance = 'ROM_EXACT';
}
const romUnresolved = [...uniqueRom.values()]
  .filter((i) => i.provenance === 'ROM_UNRESOLVED')
  .map((i) => ({ profileKey: i.actorVisualProfileKey, resourceId: i.resourceId, visualFrameId: i.visualFrameId, hash: i.normalizedPixelHash }));

const uniqueExact = [...uniqueRom.values()].filter((i) => i.provenance === 'ROM_EXACT').length;
const uniqueShared = [...uniqueRom.values()].filter((i) => i.provenance === 'ROM_SHARED').length;
const uniqueUnresolved = [...uniqueRom.values()].filter((i) => i.provenance === 'ROM_UNRESOLVED').length;

// ── 8) Salidas ──
const report = `# S-MAP2 — ROM PHYSICAL PROVENANCE (REPORT)

Generado: ${new Date().toISOString()} · HEAD local.

## Principio

\`\`\`text
CANONICAL_PHYSICAL ≠ ROM_EXACT
SHARED_RUNTIME_DIR ≠ ROM_PHYSICAL_SHARED
comparación SOLO por hash físico exacto (R2.4 grammar) — sin fuzzy/resize/remap/flip/pose-name/V9
\`\`\`

## Cobertura

| Métrica | Valor |
| --- | --- |
| Formas ROM reales (1-48) con perfil | 48/48 (100%) |
| Keys de perfil únicas | ${new Set(formProfiles.map((p: any) => p.actorVisualProfileKey)).size} |
| Keys sin paleta en \\$6E00 | ${formProfiles.filter((p: any) => !p.paletteAvailable).length} (${formProfiles.filter((p: any) => !p.paletteAvailable).map((p: any) => p.formId).join(', ')}) |
| Identidades ROM renderizadas (occs) | ${romIdentities.length} |
| Identidades ROM únicas | ${uniqueRom.size} |
| ROM_EXACT únicas | ${uniqueExact} |
| ROM_SHARED únicas | ${uniqueShared} |
| ROM_UNRESOLVED únicas | ${uniqueUnresolved} |
| Relaciones exactas (ROM↔canonical) | ${exactRelations.length} |
| Canonical files indexados | ${canonicalProvenance.length} |

> ROM_UNRESOLVED es válido y NO hace fallar el gate (el piloto R2.4 dio 15/15 UNRESOLVED).

## Notas

- Las keys sin paleta (Gohan Kid 0/1, Krillin 4, etc.) no se renderizan: su provenance
  queda ROM_UNRESOLVED hasta localizar la fuente de paleta (posible vía transición CGB \\$07F4).
- Mapping formId↔formID 42-48 marcado como uncertain (bits 42-47 del corpus = "Buu/ginyu/rango").
- El mapping erróneo de un nombre NUNCA inventa ROM_EXACT: reduce matches (→ ROM_UNRESOLVED).
`;
const json = (o: unknown) => JSON.stringify(o, null, 1);
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'rom-form-profiles.json'), json(formProfiles));
writeFileSync(join(OUT, 'rom-physical-identities.json'), json([...uniqueRom.values()]));
writeFileSync(join(OUT, 'rom-canonical-provenance.json'), json(exactRelations));
writeFileSync(join(OUT, 'rom-unresolved-physical.json'), json(romUnresolved));
writeFileSync(join(OUT, 'ROM_PROVENANCE_REPORT.md'), report);

console.log(`S-MAP2: ${formProfiles.length} perfiles · ${uniqueRom.size} identidades ROM únicas (EXACT=${uniqueExact}, SHARED=${uniqueShared}, UNRESOLVED=${uniqueUnresolved}) · ${exactRelations.length} relaciones exactas`);
