// ═══════════════════════════════════════════════════════════════════════
// P0.3B verifier — generated runtime physical corpus.
// Fails if reachable ROM physical outputs are stale, unsigned, missing,
// oversized, non-provenanced, semantically named, or promoted into production
// manifest.json before P0.3C.
// ═══════════════════════════════════════════════════════════════════════
import { createHash } from 'crypto';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';
import { CARDS, type CardDef } from '../src/data/cards';
import { FORMS } from '../src/data/roster';
import { romCardData } from '../src/data/romCardData';

const ROOT = process.cwd();
const PUBLIC_SPRITES = join(ROOT, 'public/assets/sprites');
const PROFILES = join(ROOT, 'docs/rom/generated/sprite-mapping/rom-form-profiles.json');
const ANIMATION_RESOURCES = join(ROOT, 'docs/rom/generated/animation-resources.json');
const SUMMARY = join(ROOT, 'docs/rom/generated/physical-corpus/summary.json');
const BUILDER = join(ROOT, 'scripts/build-rom-physical-corpus.ts');
const ROM_SPAIN_SHA256 = 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804';
const SCHEMA_VERSION = 2;
const PHYSICAL_RENDERER_SCHEMA = 3;
const OFFSET_ENCODING = 's8';
const FIGHTER_PHYSICAL_RESOURCE_IDS = new Set([0x00, 0x03, 0x04, 0x05, 0x08, 0x12]);
const MAX_REASONABLE_DIMENSION = 128;

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function readJson<T = any>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function s8(value: number): number {
  const u8 = value & 0xff;
  return u8 < 0x80 ? u8 : u8 - 0x100;
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function pngSize(path: string): { width: number; height: number } {
  const png = PNG.sync.read(readFileSync(path));
  return { width: png.width, height: png.height };
}

const allProfiles = readJson<Array<{ formId: string; actorVisualProfileKey: number; paletteAvailable: boolean }>>(PROFILES);
const profiles = allProfiles.filter(profile => profile.paletteAvailable);
const paletteBlockedProfiles = allProfiles.filter(profile => !profile.paletteAvailable);
const resources = readJson<Array<{ resourceId: number; sequences: Array<{ frames: unknown[] }> }>>(ANIMATION_RESOURCES)
  .filter(resource => resource.sequences.some(sequence => sequence.frames.length > 0))
  .filter(resource => FIGHTER_PHYSICAL_RESOURCE_IDS.has(resource.resourceId));
const rendererPendingResources = readJson<Array<{ resourceId: number; sequences: Array<{ frames: unknown[] }> }>>(ANIMATION_RESOURCES)
  .filter(resource => resource.sequences.some(sequence => sequence.frames.length > 0))
  .filter(resource => !FIGHTER_PHYSICAL_RESOURCE_IDS.has(resource.resourceId));
const resourceHex = new Set(resources.map(resource => resource.resourceId.toString(16).padStart(2, '0')));

function compatibleFormsForCard(card: CardDef): string[] {
  const forms = Object.values(FORMS);
  if (card.compatible?.length) return forms.filter(form => card.compatible?.includes(form.character)).map(form => form.id);
  if (card.notCompatible?.length) return forms.filter(form => !card.notCompatible?.includes(form.character)).map(form => form.id);
  return forms.map(form => form.id);
}

function compatibleProfilesForResource(resourceId: number): typeof profiles {
  const compatibleFormIds = new Set<string>();
  for (const card of CARDS) {
    const rom = romCardData(card.name);
    if (!rom || rom.actorAnim !== resourceId) continue;
    for (const formId of compatibleFormsForCard(card)) compatibleFormIds.add(formId);
  }
  return profiles.filter(profile => compatibleFormIds.has(profile.formId));
}

const profilesByResource = new Map(resources.map(resource => [resource.resourceId, compatibleProfilesForResource(resource.resourceId)]));
const corpusProfiles = profiles.filter(profile =>
  resources.some(resource => (profilesByResource.get(resource.resourceId) ?? []).some(candidate => candidate.formId === profile.formId)));
const resourceBlockedProfiles = profiles.filter(profile => !corpusProfiles.some(candidate => candidate.formId === profile.formId));

check('s8 fixture 0x00 → 0', s8(0x00) === 0);
check('s8 fixture 0x01 → 1', s8(0x01) === 1);
check('s8 fixture 0x7f → 127', s8(0x7f) === 127);
check('s8 fixture 0x80 → -128', s8(0x80) === -128);
check('s8 fixture 0xfe → -2', s8(0xfe) === -2);
check('s8 fixture 0xff → -1', s8(0xff) === -1);

check('summary.json exists', existsSync(SUMMARY));
const summary = existsSync(SUMMARY) ? readJson(SUMMARY) : null;
if (summary) {
  check('summary schemaVersion=2', summary.schemaVersion === SCHEMA_VERSION);
  check('summary physicalRendererSchema=3', summary.physicalRendererSchema === PHYSICAL_RENDERER_SCHEMA);
  check('summary offsetEncoding=s8', summary.offsetEncoding === OFFSET_ENCODING);
  check('summary ROM España sha pinned', summary.romSha256 === ROM_SPAIN_SHA256);
  check('summary reachable resources match catalog', JSON.stringify(summary.reachableResources) === JSON.stringify([...resourceHex].map(id => `0x${id}`)));
  check('summary reports renderer-pending decoded resources', summary.totals.resourcesRendererPending === rendererPendingResources.length, `${summary.totals.resourcesRendererPending}`);
  check('summary reports resource/profile blocked pairs', typeof summary.totals.resourceProfileBlockedPairs === 'number');
  check('summary has no generatedAt timestamp', !Object.prototype.hasOwnProperty.call(summary, 'generatedAt'));
  check('summary reports palette/resource-blocked profiles', summary.totals.formsIndexed === allProfiles.length && summary.totals.formsPaletteBlocked === paletteBlockedProfiles.length && summary.totals.formsResourceBlocked === resourceBlockedProfiles.length, `palette=${summary.totals.formsPaletteBlocked} resource=${summary.totals.formsResourceBlocked}/${allProfiles.length}`);
}

let totalPngs = 0;
let totalFrames = 0;
let totalInstances = 0;
let signedNegativeInstances = 0;
let oversize = 0;
let stale = 0;
let missingFiles = 0;
let badHashes = 0;
let rawMutated = 0;
const physicalHashIndex = new Map<string, string>();

for (const profile of corpusProfiles) {
  const form = profile.formId;
  const dir = join(PUBLIC_SPRITES, form);
  const physicalDir = join(dir, 'physical');
  const debugDir = join(dir, 'physical-debug');
  const manifestPath = join(dir, 'rom-physical.manifest.json');
  const provenancePath = join(dir, 'provenance.json');
  const legacyManifestPath = join(dir, 'manifest.json');
  const keyHex = profile.actorVisualProfileKey.toString(16).padStart(2, '0');

  check(`${form}: physical dir exists`, existsSync(physicalDir));
  check(`${form}: physical debug dir exists`, existsSync(debugDir));
  check(`${form}: rom-physical.manifest.json exists`, existsSync(manifestPath));
  check(`${form}: provenance.json exists`, existsSync(provenancePath));
  check(`${form}: production manifest untouched by physical cutover`, !existsSync(legacyManifestPath) || !readFileSync(legacyManifestPath, 'utf8').includes('ROM_PHYSICAL_FIGHTERS'));
  if (!existsSync(physicalDir) || !existsSync(debugDir) || !existsSync(manifestPath) || !existsSync(provenancePath)) continue;

  const pngs = readdirSync(physicalDir).filter(name => name.endsWith('.png')).sort();
  const manifest = readJson(manifestPath);
  const provenance = readJson(provenancePath);
  const frames = provenance.frames as any[];
  totalPngs += pngs.length;
  totalFrames += frames.length;

  check(`${form}: schemaVersion=2`, manifest.schemaVersion === SCHEMA_VERSION && provenance.schemaVersion === SCHEMA_VERSION);
  check(`${form}: physicalRendererSchema=3`, manifest.physicalRendererSchema === PHYSICAL_RENDERER_SCHEMA && provenance.physicalRendererSchema === PHYSICAL_RENDERER_SCHEMA);
  check(`${form}: offsetEncoding=s8`, manifest.offsetEncoding === OFFSET_ENCODING && provenance.offsetEncoding === OFFSET_ENCODING);
  check(`${form}: ROM España sha pinned`, provenance.rom.sha256 === ROM_SPAIN_SHA256);
  check(`${form}: source is ROM_PHYSICAL_FIGHTERS`, provenance.source === 'ROM_PHYSICAL_FIGHTERS' && manifest.source === 'ROM_PHYSICAL_FIGHTERS');
  check(`${form}: has physical frames`, pngs.length > 0, `${pngs.length}`);
  const bankHex = (0x31 + profile.actorVisualProfileKey).toString(16).padStart(2, '0');
  check(`${form}: files use strong physical IDs`, pngs.every(name => new RegExp(`^rom-p${keyHex}-g${bankHex}-r[0-9a-f]{2}-vf[0-9a-f]{2}-ms[0-9a-f]{8}-gfx[0-9a-f]{8}\\.png$`).test(name)));
  check(`${form}: no legacy pose names in physical files`, pngs.every(name => !/(attack|guard|hurt|beam|aura|idle|move|pose|special|disk|ray|charge|fire)/.test(name)));

  const frameFiles = new Set(frames.map(frame => frame.file.replace('physical/', '')));
  const resourceProfileBlocked = (provenance.resourceProfileBlocked ?? []) as Array<{ resourceHex: string; reason: string }>;
  const blockedResourceHex = new Set(resourceProfileBlocked.map(item => item.resourceHex.replace('0x', '').padStart(2, '0')));
  check(`${form}: every PNG has provenance`, pngs.every(name => frameFiles.has(name)));
  check(`${form}: every provenance frame has PNG`, frames.every(frame => existsSync(join(dir, frame.file))));
  check(`${form}: every provenance frame has RAW canvas`, frames.every(frame => typeof frame.rawCanvasFile === 'string' && existsSync(join(dir, frame.rawCanvasFile))));
  const expectedResourceHex = resources
    .filter(resource => (profilesByResource.get(resource.resourceId) ?? []).some(candidate => candidate.formId === form))
    .map(resource => resource.resourceId.toString(16).padStart(2, '0'));
  check(`${form}: every compatible renderable resource represented or explicitly blocked`, expectedResourceHex.every(id => pngs.some(name => name.includes(`-r${id}-`)) || blockedResourceHex.has(id)), expectedResourceHex.map(id => `0x${id}`).join(','));
  check(`${form}: blocked resource/profile pairs have reasons`, resourceProfileBlocked.every(item => /^0x[0-9a-f]{2}$/.test(item.resourceHex) && typeof item.reason === 'string' && item.reason.length > 0));
  check(`${form}: all frames have origin/bounds`, frames.every(frame =>
    Number.isFinite(frame.originX) &&
    Number.isFinite(frame.originY) &&
    Number.isFinite(frame.originInTrimX) &&
    Number.isFinite(frame.originInTrimY) &&
    frame.trim?.originInTrim &&
    frame.width > 0 &&
    frame.height > 0
  ));
  check(`${form}: all frames have metasprite + graphics provenance`, frames.every(frame => frame.metasprite?.provenance && frame.graphics?.provenance && frame.graphics.blockCount === frame.metasprite.pieces.length));
  check(`${form}: all frames have per-piece graphics forensic data`, frames.every(frame =>
    Array.isArray(frame.pieceGraphics) &&
    frame.pieceGraphics.length === frame.metasprite.pieces.length &&
    frame.pieceGraphics.every((piece: any, index: number) =>
      piece.pieceIndex === index &&
      piece.graphicsBank === 0x31 + profile.actorVisualProfileKey &&
      typeof piece.graphicsBlockHash === 'string' &&
      typeof piece.tile0Hash === 'string' &&
      typeof piece.tile1Hash === 'string'
    )
  ));
  check(`${form}: metasprite piece coordinates are signed`, frames.every(frame => frame.metasprite.pieces.every((piece: any) =>
    Number.isInteger(piece.x) &&
    Number.isInteger(piece.y) &&
    piece.x === s8(piece.rawX) &&
    piece.y === s8(piece.rawY) &&
    piece.width === 8 &&
    piece.height === 16
  )));
  check(`${form}: fighter color0 is transparent`, frames.every(frame => frame.palette?.transparentIndex === 0 && frame.palette?.color0Transparent === true));

  const seqs = Object.values(manifest.sequences) as any[];
  check(`${form}: all sequences declare schema/offset/render contract`, seqs.every(seq => seq.schemaVersion === SCHEMA_VERSION && seq.physicalRendererSchema === PHYSICAL_RENDERER_SCHEMA && seq.offsetEncoding === OFFSET_ENCODING));
  check(`${form}: sequence frames preserve ticks/raw/signed offsets`, seqs.every(seq => seq.frames.every((frame: any) =>
    typeof frame.durationTicks === 'number' &&
    typeof frame.rawOffsetX === 'number' &&
    typeof frame.rawOffsetY === 'number' &&
    frame.offsetX === s8(frame.rawOffsetX) &&
    frame.offsetY === s8(frame.rawOffsetY) &&
    frame.offsetEncoding === OFFSET_ENCODING
  )));

  for (const frame of frames) {
    const path = join(dir, frame.file);
    if (!existsSync(path)) {
      missingFiles++;
      continue;
    }
    const size = pngSize(path);
    if (size.width !== frame.width || size.height !== frame.height) badHashes++;
    if (size.width > MAX_REASONABLE_DIMENSION || size.height > MAX_REASONABLE_DIMENSION || size.width === 0 || size.height === 0) oversize++;
    if (frame.schemaVersion && frame.schemaVersion !== SCHEMA_VERSION) stale++;
    if (frame.physicalRendererSchema !== PHYSICAL_RENDERER_SCHEMA) stale++;
    if (frame.offsetEncoding && frame.offsetEncoding !== OFFSET_ENCODING) stale++;
    if (frame.hashes?.sourceFileSha256 !== sha256(path)) badHashes++;
    if (!frame.rawCanvas?.originVisible || !frame.rawCanvasFile || !existsSync(join(dir, frame.rawCanvasFile))) stale++;
    physicalHashIndex.set(`${form}:${frame.physicalId}`, frame.hashes?.sourceFileSha256 ?? sha256(path));

    for (const occurrence of frame.occurrences ?? []) {
      totalInstances++;
      if (occurrence.offsetEncoding !== OFFSET_ENCODING) stale++;
      if (occurrence.offsetX !== s8(occurrence.rawOffsetX) || occurrence.offsetY !== s8(occurrence.rawOffsetY)) rawMutated++;
      if (occurrence.raw?.[2] !== occurrence.rawOffsetY || occurrence.raw?.[3] !== occurrence.rawOffsetX) rawMutated++;
      if (occurrence.rawOffsetX >= 0x80 || occurrence.rawOffsetY >= 0x80) signedNegativeInstances++;
    }
  }
}

check('0 missing physical files', missingFiles === 0, `missing=${missingFiles}`);
check('0 stale unsigned outputs', stale === 0, `stale=${stale}`);
check('0 oversized/empty physical PNGs', oversize === 0, `oversize=${oversize}`);
check('0 hash/dimension mismatches', badHashes === 0, `bad=${badHashes}`);
check('raw bytes preserved while signed offsets decode separately', rawMutated === 0, `bad=${rawMutated}`);
check('real signed-negative ROM instances covered', signedNegativeInstances > 0, `${signedNegativeInstances}`);
check('all renderable/palette/resource profile categories accounted', totalFrames > 0 && totalPngs > 0 && corpusProfiles.length + resourceBlockedProfiles.length + paletteBlockedProfiles.length === 48, `rendered=${corpusProfiles.length} resourceBlocked=${resourceBlockedProfiles.length} paletteBlocked=${paletteBlockedProfiles.length} frames=${totalFrames} pngs=${totalPngs}`);
check('palette-blocked profiles are explicit, not faked', paletteBlockedProfiles.length === 0, paletteBlockedProfiles.map(profile => profile.formId).join(', ') || 'none');
check('resource-blocked profiles are explicit, not faked', resourceBlockedProfiles.length === 0, resourceBlockedProfiles.map(profile => profile.formId).join(', ') || 'none');

check('Canonical_Frames_Official is not a physical source', !readFileSync(BUILDER, 'utf8').includes('Canonical_Frames_Official'));
check('builder does not promote ROM physical into manifest.json', !readFileSync(BUILDER, 'utf8').includes(`'manifest.json'`) && !readFileSync(BUILDER, 'utf8').includes('"manifest.json"'));

if (failures === 0) {
  console.log(`\n✅ verify:rom-physical-corpus PASS (${totalFrames} physical IDs · ${totalInstances} frame instances · ${signedNegativeInstances} signed-negative instances)`);
  process.exit(0);
}
console.log(`\n❌ verify:rom-physical-corpus FAIL (${failures})`);
process.exit(1);
