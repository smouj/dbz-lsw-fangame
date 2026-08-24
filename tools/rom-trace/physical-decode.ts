// ═══════════════════════════════════════════════════════════════════════
// R3 — physical-decode: ActionObject 19B → representación física decodificada.
// Integra el modelo estático VERIFIED (R2.2/R2.3): slot → base →
// resourceId · selector/frameIndex/vfid · graphics source → key = bank-$31 ·
// identity física (key+resource+vfid) con hash cacheado (no PNG por tick).
// Nunca identifica personajes por apariencia: key se deriva del GraphicsSource.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ROM_PATH = resolve(ROOT, '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc');
const CATALOG = join(ROOT, 'docs/rom/generated/animation-resources.json');
const BANK61 = join(ROOT, 'tools/rom-trace/bank61-resources.json');

const rom = readFileSync(ROM_PATH);
const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));

export interface DecodedActionObjectTick {
  objectIndex: 0 | 1;
  raw: number[];
  active: boolean;
  controlFlags: number;
  animationSlotPtr: number;
  animationSlot: { bank: number; base: number } | null;
  resourceId: number | null;
  sequenceSelector: number;
  frameIndex: number;
  visualFrameId: number;
  frameElapsedTicks: number;
  currentDrawY: number;
  currentDrawX: number;
  renderAttributesBase: number;
  graphicsSource: { bank: number; base: number; actorVisualProfileKey: number | null } | null;
  physicalFrame: { identity: string; trimmedPixelHash: string } | null;
}

const u16 = (b: number, a: number) => rom[b * 0x4000 + a] | (rom[b * 0x4000 + a + 1] << 8);
const u8 = (b: number, a: number) => rom[b * 0x4000 + a];

/** Índice inverso (bank, base) → resourceId, construido con el resolver R2.3. */
let resourceByBase: Map<string, number> | null = null;
export function resourceIndex(): Map<string, number> {
  if (resourceByBase) return resourceByBase;
  resourceByBase = new Map();
  for (const res of catalog) {
    const base = resolveResourceBase(res.bank, res.resourceId, res.sequences.map((s: { addr: number }) => s.addr));
    if (base !== null) resourceByBase.set(`${res.bank}:${base}`, res.resourceId);
  }
  // R3.1A: resources de bank 0x61 (Gohan/Piccolo/acción) decodificados dinámicamente.
  // Las bases se registran DIRECTAS (vienen del slot del AO observado), sin escaneo.
  try {
    const b61 = JSON.parse(readFileSync(BANK61, 'utf8'));
    for (const r of b61.resources) {
      resourceByBase.set(`${b61.bank}:${r.base}`, r.resourceId);
    }
  } catch { /* sin bank61 no rompe la resolución estática */ }
  return resourceByBase;
}

function resolveResourceBase(bank: number, resourceId: number, seqAddrs: number[]): number | null {
  for (let base = 0x20; base < 0x4000 - 8; base++) {
    const w0 = u16(bank, base);
    const T = (base + w0) & 0xffff;
    if (T + 2 >= 0x4000) continue;
    if (u8(bank, T) !== seqAddrs.length) continue;
    let ok = true;
    for (let sel = 0; sel < seqAddrs.length; sel++) {
      const off = u16(bank, T + 1 + sel * 2);
      if (((T + 1 + sel * 2 + off) & 0x3fff) !== (seqAddrs[sel] & 0x3fff)) { ok = false; break; }
    }
    if (ok) return base;
  }
  return null;
}

/** Cache de hashes físicos (identidad → trimmedPixelHash del renderer R2.3). */
const hashCache = new Map<string, string>();
export function physicalFrameHash(key: number, resourceId: number, vfid: number): string | null {
  const identity = `${key.toString(16)}:${resourceId.toString(16)}:${vfid.toString(16)}`;
  const cached = hashCache.get(identity);
  if (cached) return cached;
  // buscar en los renders existentes (docs/rom/generated/fighters/resource_XX/profile_YY/...)
  const resDir = join(ROOT, 'docs/rom/generated/fighters', `resource_${resourceId.toString(16).padStart(2, '0')}`);
  if (!existsSync(resDir)) return null;
  const profDir = join(resDir, `profile_${key.toString(16).padStart(2, '0')}`);
  if (!existsSync(profDir)) return null;
  for (const seqDir of readdirSync(profDir)) {
    const sp = join(profDir, seqDir);
    if (!statSync(sp).isDirectory()) continue;
    for (const frameDir of readdirSync(sp)) {
      const fp = join(sp, frameDir);
      if (!statSync(fp).isDirectory()) continue;
      const metaPath = join(fp, 'metadata.json');
      if (!existsSync(metaPath)) continue;
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      if (meta.frameRecord.visualFrameId === vfid) {
        hashCache.set(identity, meta.hashes.trimmedPixelHash);
        return meta.hashes.trimmedPixelHash;
      }
    }
  }
  return null;
}

/** Decodifica un ActionObject de 19 bytes (WRAM snapshot) + contexto. */
export function decodeActionObject(objectIndex: 0 | 1, raw19: number[]): DecodedActionObjectTick {
  const slotPtr = raw19[1] | (raw19[2] << 8);
  const graphicsPtr = raw19[17] | (raw19[18] << 8); // +11/+12
  let graphicsSource: DecodedActionObjectTick['graphicsSource'] = null;
  let actorKey: number | null = null;
  if (graphicsPtr >= 0xc000) {
    // el puntero apunta al registro en WRAM ($CA28+slot×3): [bank, baseLo, baseHi]
    // — en un trace real el snapshot de WRAM permitiría leerlo; aquí derivamos
    // el key SOLO si el registro es legible (el trazador lo adjunta aparte).
    graphicsSource = { bank: 0, base: 0, actorVisualProfileKey: null };
  }
  const idx = resourceIndex();
  let resourceId: number | null = null;
  if (slotPtr >= 0xc000) {
    // slot en WRAM: no legible aquí (el trazador adjunta el slot aparte)
    resourceId = null;
  }
  return {
    objectIndex,
    raw: raw19,
    active: (raw19[0] & 0x80) !== 0,
    controlFlags: raw19[0],
    animationSlotPtr: slotPtr,
    animationSlot: null,
    resourceId,
    sequenceSelector: raw19[3],
    frameIndex: raw19[4],
    visualFrameId: raw19[5],
    frameElapsedTicks: raw19[6],
    currentDrawY: raw19[15],
    currentDrawX: raw19[16],
    renderAttributesBase: raw19[14],
    graphicsSource,
    physicalFrame: null,
  };
}

/** Decodificación completa con contexto de trace (slot + registro gráfico adjuntos). */
export function decodeActionObjectFull(
  objectIndex: 0 | 1,
  raw19: number[],
  ctx: { slotBank: number; slotBase: number; graphicsBank: number },
): DecodedActionObjectTick {
  const base = decodeActionObject(objectIndex, raw19);
  const key = ctx.graphicsBank >= 0x31 ? ctx.graphicsBank - 0x31 : null;
  const resourceId = resourceIndex().get(`${ctx.slotBank}:${ctx.slotBase}`) ?? null;
  base.animationSlot = { bank: ctx.slotBank, base: ctx.slotBase };
  base.resourceId = resourceId;
  base.graphicsSource = { bank: ctx.graphicsBank, base: 0, actorVisualProfileKey: key };
  if (key !== null && resourceId !== null) {
    const hash = physicalFrameHash(key, resourceId, base.visualFrameId);
    if (hash) base.physicalFrame = { identity: `${key.toString(16)}:${resourceId.toString(16)}:${base.visualFrameId.toString(16)}`, trimmedPixelHash: hash };
  }
  return base;
}
