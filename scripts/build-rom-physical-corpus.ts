// ═══════════════════════════════════════════════════════════════════════
// P0.3B — Runtime ROM physical corpus builder.
// Re-renders reachable AnimationResources from ROM with signed s8 offsets,
// then promotes verified ROM renders into the runtime asset tree without using
// legacy/canonical PNGs as source truth.
// ═══════════════════════════════════════════════════════════════════════
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { CARDS, type CardDef } from '../src/data/cards';
import { FORMS } from '../src/data/roster';
import { romCardData } from '../src/data/romCardData';
import { ANIMATION_RESOURCE_CATALOG } from '../src/battle/animationResources';
import { ROM_BANK61_ANIMATION_CORE_RESOURCE_BASES } from '../src/data/generated/romAnimationCore.generated';

const ROOT = process.cwd();
function runTsx(args: string[]): void {
  const command = process.platform === 'win32'
    ? (process.env.ComSpec ?? 'cmd.exe')
    : 'npx';
  const commandArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npx.cmd', 'tsx', ...args]
    : ['tsx', ...args];
  execFileSync(command, commandArgs, { cwd: ROOT, stdio: 'pipe' });
}
const FIGHTERS = join(ROOT, 'docs/rom/generated/fighters');
const PROFILES = join(ROOT, 'docs/rom/generated/sprite-mapping/rom-form-profiles.json');
const OUT_REPORT = join(ROOT, 'docs/rom/generated/physical-corpus');
const PUBLIC_SPRITES = join(ROOT, 'public/assets/sprites');
const ANIMATION_RESOURCES = join(ROOT, 'docs/rom/generated/animation-resources.json');
const GENERATED_TS = join(ROOT, 'src/data/generated/romPhysicalCorpus.generated.ts');

const SCHEMA_VERSION = 2;
const PHYSICAL_RENDERER_SCHEMA = 3;
const OFFSET_ENCODING = 's8';
const FIGHTER_PHYSICAL_RESOURCE_IDS = new Set([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x2b, 0x2c, 0x2d, 0x2e, 0x2f, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x3b, 0x3c, 0x3d, 0x3e, 0x3f, 0x41]);
// The incremental mode is deliberately narrow: it re-renders only the newly
// requested neutral candidate, then rebuilds and validates the complete
// manifest from the existing certified render inputs.  Full remains default.
const RENDER_BANK61_NEUTRAL_ONLY = process.env.ROM_PHYSICAL_RENDER_MODE === 'bank61-neutral';
const STAGE_BANK61_RENDER_TARGETS = [
  // Selector 0 is the static neutral candidate: a single physical frame with
  // zero offsets that is the recovery target for Bank $61 animations.  It is
  // promoted as static ROM evidence; a live ActionObject capture remains the
  // separate gate for calling it dynamically verified idle.
  { resourceIndex: 0, sequences: [0x00, 0x0a, 0x0b, 0x0d, 0x0f, 0x10, 0x17] },
  { resourceIndex: 1, sequences: null },
  { resourceIndex: 2, sequences: null },
  { resourceIndex: 3, sequences: null },
  { resourceIndex: 4, sequences: null },
] as const;
const ROM_SPAIN_SHA256 = 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804';

interface RomFormProfile {
  formId: string;
  actorVisualProfileKey: number;
  graphicsBank: number;
  paletteRaw: string[];
  paletteAvailable: boolean;
  mappingUncertain?: boolean;
}

interface RenderMetadata {
  key: number;
  resource: number | null;
  animationBank?: number;
  resourceBase?: number;
  bank: number;
  base: number;
  sequence: number;
  frameIndex: number;
  frameRecord: {
    visualFrameId: number;
    durationTicks: number;
    offsetY: number;
    offsetX: number;
    raw: [number, number, number, number];
    provenance: Record<string, number>;
  };
  metasprite: {
    pieces: Array<{ rawY: number; rawX: number; x?: number; y?: number; width?: number; height?: number; tileDelta: number; attr: number; flipX: boolean; flipY: boolean }>;
    provenance: Record<string, number>;
  };
  graphics: {
    blockCount: number;
    relativeOffsets: number[];
    provenance: Record<string, number>;
  };
  pieceGraphics?: Array<{
    pieceIndex: number;
    graphicsBank: number;
    graphicsBlockRelativeOffset: number | null;
    graphicsBlockAddress: number | null;
    graphicsBlockHash: string;
    tile0Address: number | null;
    tile0Hash: string;
    tile1Address: number | null;
    tile1Hash: string;
  }>;
  assembly?: {
    pieceCount: number;
    graphicsBlockCount: number;
    renderedPieceCount: number;
    graphicsBlockAddresses: Array<number | null>;
    renderedBlockAddresses: Array<number | null>;
    piecesOutsideRaw: number;
    pixelsWrittenOutsideRaw: number;
    assemblyInputHash: string;
    rawPixelHash: string;
    trimmedPixelHash: string;
    errors: string[];
  };
  source: { bank: number; baseAddress: number };
  palette: { raw?: number[]; bgr555: string[]; colors: string[]; transparentIndex?: number; color0Transparent?: boolean; displayTransform?: string };
  bounds: {
    coordinateSpace?: string;
    minX: number | null;
    minY: number | null;
    maxX: number | null;
    maxY: number | null;
    width?: number;
    height?: number;
    originInTrimX?: number;
    originInTrimY?: number;
    opaqueBounds?: { minX: number; minY: number; maxX: number; maxY: number } | null;
  };
  rawBounds?: { coordinateSpace: string; minX: number; minY: number; maxX: number; maxY: number; width: number; height: number; originX: number; originY: number };
  rawCanvas?: { rawFile?: string; file: string; width: number; height: number; originX: number; originY: number; pieceBoundsInCanvas?: { x: number; y: number; w: number; h: number }; originVisible: boolean };
  trimmed?: { file: string; x: number; y: number; w: number; h: number; originInTrim: { x: number; y: number } };
  hashes: Record<string, string>;
  sourceProvenance?: {
    metaspriteHash: string;
    graphicsTableHash: string;
    graphicsHash: string;
    graphicsBlockHashes: string[];
    paletteRawHash: string;
    sourceProvenanceHash: string;
  };
  evidence: string;
}

interface AnimationResource {
  resourceId: number | null;
  bank: number;
  sequences: Array<{ frames: unknown[] }>;
}

type ResourcePhysicalStatus =
  | 'RENDERABLE'
  | 'FRAME_STREAM_ONLY'
  | 'METASPRITE_PENDING'
  | 'GRAPHICS_PENDING'
  | 'HANDLER_DEPENDENT'
  | 'DYNAMIC_PENDING'
  | 'UNREFERENCED';

interface PhysicalFrame {
  physicalId: string;
  schemaVersion: typeof SCHEMA_VERSION;
  physicalRendererSchema: typeof PHYSICAL_RENDERER_SCHEMA;
  offsetEncoding: typeof OFFSET_ENCODING;
  file: string;
  sourceRender: string;
  resourceId: number;
  animationBank: number;
  resourceBase: number;
  resourceIdentity: string;
  resourceHex: string;
  visualFrameId: number;
  actorVisualProfileKey: number;
  graphicsBank: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
  originInTrimX: number;
  originInTrimY: number;
  metaspriteOriginX: number;
  metaspriteOriginY: number;
  trim: {
    x: number;
    y: number;
    w: number;
    h: number;
    originInTrim: { x: number; y: number };
  };
  rawCanvasFile?: string;
  rawImageFile?: string;
  rawCanvas?: RenderMetadata['rawCanvas'];
  rawBounds?: RenderMetadata['rawBounds'];
  hashes: Record<string, string>;
  palette: RenderMetadata['palette'];
  metasprite: RenderMetadata['metasprite'];
  graphics: RenderMetadata['graphics'];
  pieceGraphics: NonNullable<RenderMetadata['pieceGraphics']>;
  assembly: NonNullable<RenderMetadata['assembly']>;
  sourceProvenance?: RenderMetadata['sourceProvenance'];
  occurrences: Array<{
    sequence: number;
    frameIndex: number;
    durationTicks: number;
    offsetEncoding: typeof OFFSET_ENCODING;
    rawOffsetX: number;
    rawOffsetY: number;
    offsetX: number;
    offsetY: number;
    raw: [number, number, number, number];
    frameAddress?: number;
  }>;
}

function hex(value: number, size = 2): string {
  return value.toString(16).padStart(size, '0');
}

function physicalId(meta: Pick<RenderMetadata, 'key' | 'resource' | 'animationBank' | 'resourceBase' | 'frameRecord' | 'source' | 'hashes'>): string {
  const metaspriteHash = (meta.hashes.metaspriteHash ?? 'unknown').slice(0, 8);
  const graphicsHash = (meta.hashes.graphicsHash ?? 'unknown').slice(0, 8);
  const resourceIdentity = meta.resource == null
    ? `ab${hex(meta.animationBank ?? 0)}-b${hex(meta.resourceBase ?? 0, 4)}`
    : `r${hex(meta.resource)}`;
  return `rom-p${hex(meta.key)}-g${hex(meta.source.bank)}-${resourceIdentity}-vf${hex(meta.frameRecord.visualFrameId)}-ms${metaspriteHash}-gfx${graphicsHash}`;
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function isDir(path: string): boolean {
  try {
    return existsSync(path) && readdirSync(path, { withFileTypes: true }) !== undefined;
  } catch {
    return false;
  }
}

function walkMetadata(profileDir: string): string[] {
  const out: string[] = [];
  for (const seqDir of readdirSync(profileDir, { withFileTypes: true })) {
    if (!seqDir.isDirectory() || !seqDir.name.startsWith('seq_')) continue;
    const seqPath = join(profileDir, seqDir.name);
    for (const frameDir of readdirSync(seqPath, { withFileTypes: true })) {
      if (!frameDir.isDirectory() || !frameDir.name.startsWith('frame_')) continue;
      const meta = join(seqPath, frameDir.name, 'metadata.json');
      if (existsSync(meta)) out.push(meta);
    }
  }
  return out.sort();
}

function reachableResources(resources: AnimationResource[]): AnimationResource[] {
  return resources
    .filter(resource => resource.sequences.some(sequence => sequence.frames.length > 0))
    .filter(resource => FIGHTER_PHYSICAL_RESOURCE_IDS.has(resource.resourceId))
    .sort((a, b) => a.resourceId - b.resourceId);
}

function rendererPendingResources(resources: AnimationResource[]): AnimationResource[] {
  return resources
    .filter(resource => resource.sequences.some(sequence => sequence.frames.length > 0))
    .filter(resource => !FIGHTER_PHYSICAL_RESOURCE_IDS.has(resource.resourceId))
    .sort((a, b) => a.resourceId - b.resourceId);
}

function resourcePhysicalStatus(entry: (typeof ANIMATION_RESOURCE_CATALOG)[number], decodedResource: AnimationResource | undefined): {
  status: ResourcePhysicalStatus;
  physicalLinkage: 'FULL' | 'FRAME_STREAM_ONLY' | 'PARTIAL' | 'NONE';
  blockingReason: string;
} {
  const hasFrameStream = !!decodedResource?.sequences.some(sequence => sequence.frames.length > 0);
  if (FIGHTER_PHYSICAL_RESOURCE_IDS.has(entry.resourceId) && hasFrameStream) {
    return {
      status: 'RENDERABLE',
      physicalLinkage: 'FULL',
      blockingReason: '',
    };
  }
  if (entry.cards.length === 0) {
    return {
      status: 'UNREFERENCED',
      physicalLinkage: 'NONE',
      blockingReason: 'AnimationResource slot exists in the ROM bank layout, but no card in the 125-card table consumes it.',
    };
  }
  if (hasFrameStream) {
    return {
      status: 'FRAME_STREAM_ONLY',
      physicalLinkage: 'FRAME_STREAM_ONLY',
      blockingReason: 'Frame stream is decoded, but this resource has not been promoted through metasprite/graphics/profile rendering invariants yet.',
    };
  }
  if (entry.completion.disposition === 'NEEDS_DYNAMIC_TRACE') {
    return {
      status: 'DYNAMIC_PENDING',
      physicalLinkage: 'NONE',
      blockingReason: entry.completion.detail,
    };
  }
  if (entry.completion.cause === 'HANDLER_SELECTED_SEQUENCE' || entry.completion.cause === 'MULTI_SEQUENCE_AMBIGUOUS') {
    return {
      status: 'HANDLER_DEPENDENT',
      physicalLinkage: 'PARTIAL',
      blockingReason: entry.completion.detail,
    };
  }
  if (entry.completion.cause === 'FRAME_STREAM_PARTIAL' || entry.completion.cause === 'SEQUENCE_BOUNDARY_UNRESOLVED' || entry.completion.cause === 'SEQUENCE_COUNT_UNRESOLVED') {
    return {
      status: 'METASPRITE_PENDING',
      physicalLinkage: 'PARTIAL',
      blockingReason: entry.completion.detail,
    };
  }
  return {
    status: 'GRAPHICS_PENDING',
    physicalLinkage: 'PARTIAL',
    blockingReason: entry.completion.detail,
  };
}

function compatibleFormsForCard(card: CardDef): string[] {
  const forms = Object.values(FORMS);
  if (card.compatible?.length) {
    return forms.filter(form => card.compatible?.includes(form.character)).map(form => form.id);
  }
  if (card.notCompatible?.length) {
    return forms.filter(form => !card.notCompatible?.includes(form.character)).map(form => form.id);
  }
  return forms.map(form => form.id);
}

function compatibleProfilesForResource(resourceId: number, profiles: RomFormProfile[]): RomFormProfile[] {
  const compatibleFormIds = new Set<string>();
  for (const card of CARDS) {
    const rom = romCardData(card.name);
    if (!rom || rom.actorAnim !== resourceId) continue;
    for (const formId of compatibleFormsForCard(card)) compatibleFormIds.add(formId);
  }
  return profiles
    .filter(profile => compatibleFormIds.has(profile.formId))
    .sort((a, b) => a.actorVisualProfileKey - b.actorVisualProfileKey || a.formId.localeCompare(b.formId));
}

function renderReachableResources(resources: AnimationResource[], profilesByResource: Map<number, RomFormProfile[]>): void {
  for (const resource of resources) {
    const profiles = profilesByResource.get(resource.resourceId) ?? [];
    if (profiles.length === 0) continue;
    const keys = [...new Set(profiles.map(profile => profile.actorVisualProfileKey))]
      .sort((a, b) => a - b)
      .map(key => hex(key))
      .join(',');

    runTsx([
      'tools/rom-research/scripts/render-fighter-physical.ts',
      '--resource',
      hex(resource.resourceId),
      '--keys',
      keys,
    ]);
  }
}

function renderStageBank61Resources(profiles: RomFormProfile[]): void {
  const keys = [...new Set(profiles.map(profile => profile.actorVisualProfileKey))]
    .sort((a, b) => a - b)
    .map(key => hex(key))
    .join(',');

  for (const target of STAGE_BANK61_RENDER_TARGETS) {
    if (RENDER_BANK61_NEUTRAL_ONLY && target.resourceIndex !== 0) continue;
    const base = ROM_BANK61_ANIMATION_CORE_RESOURCE_BASES[target.resourceIndex];
    if (base == null) throw new Error(`Bank $61 resourceIndex ${target.resourceIndex} has no resource base`);
    const commonArgs = [
      'tsx',
      'tools/rom-research/scripts/render-fighter-physical.ts',
      '--animation-bank',
      '61',
      '--resource-base',
      hex(base, 4),
      '--keys',
      keys,
    ];
    const selectors = RENDER_BANK61_NEUTRAL_ONLY ? [0x00] : target.sequences;
    if (selectors == null) {
      runTsx(commonArgs.slice(1));
      continue;
    }
    for (const selector of selectors) {
      runTsx([...commonArgs.slice(1), '--selector', String(selector)]);
    }
  }
}

function bounds(meta: RenderMetadata): {
  width: number;
  height: number;
  originX: number;
  originY: number;
  originInTrimX: number;
  originInTrimY: number;
  metaspriteOriginX: number;
  metaspriteOriginY: number;
  trim: PhysicalFrame['trim'];
  rawCanvas?: RenderMetadata['rawCanvas'];
} {
  const b = meta.bounds;
  if (b.minX === null || b.minY === null || b.maxX === null || b.maxY === null) {
    throw new Error(`${physicalId(meta)} rendered empty`);
  }
  const width = b.width ?? (b.maxX - b.minX);
  const height = b.height ?? (b.maxY - b.minY);
  const originInTrimX = b.originInTrimX ?? -b.minX;
  const originInTrimY = b.originInTrimY ?? -b.minY;
  return {
    width,
    height,
    originX: b.minX,
    originY: b.minY,
    originInTrimX,
    originInTrimY,
    metaspriteOriginX: originInTrimX,
    metaspriteOriginY: originInTrimY,
    trim: meta.trimmed ?? {
      x: b.minX,
      y: b.minY,
      w: width,
      h: height,
      originInTrim: { x: originInTrimX, y: originInTrimY },
    },
    rawCanvas: meta.rawCanvas,
  };
}

function clearGeneratedPhysical(formId: string): void {
  const formOut = join(PUBLIC_SPRITES, formId);
  const physicalOut = join(formOut, 'physical');
  const debugOut = join(formOut, 'physical-debug');
  if (existsSync(physicalOut)) {
    for (const existing of readdirSync(physicalOut)) {
      if (/^rom-p[0-9a-f]{2}-(?:g[0-9a-f]{2}-)?(?:r[0-9a-f]{2}|ab[0-9a-f]{2}-b[0-9a-f]{4})-vf[0-9a-f]{2}(?:-ms[0-9a-f]{8}-gfx[0-9a-f]{8})?\.png$/.test(existing)) {
        unlinkSync(join(physicalOut, existing));
      }
    }
  }
  if (existsSync(debugOut)) {
    for (const existing of readdirSync(debugOut)) {
      if (/^rom-p[0-9a-f]{2}-(?:g[0-9a-f]{2}-)?(?:r[0-9a-f]{2}|ab[0-9a-f]{2}-b[0-9a-f]{4})-vf[0-9a-f]{2}(?:-ms[0-9a-f]{8}-gfx[0-9a-f]{8})?-raw(?:-canvas)?\.png$/.test(existing)) {
        unlinkSync(join(debugOut, existing));
      }
    }
  }
  for (const generated of ['rom-physical.manifest.json', 'provenance.json']) {
    const path = join(formOut, generated);
    if (existsSync(path)) unlinkSync(path);
  }
}

function buildForForm(profile: RomFormProfile, profilesByResource: Map<number, RomFormProfile[]>): { frames: PhysicalFrame[]; stageFrames: PhysicalFrame[]; manifest: Record<string, unknown>; provenance: Record<string, unknown>; resourceProfileBlocked: Array<{ resourceId: number; resourceHex: string; reason: string }>; transparentFrameRecords: Array<Record<string, unknown>> } {
  const formOut = join(PUBLIC_SPRITES, profile.formId);
  const physicalOut = join(formOut, 'physical');
  const debugOut = join(formOut, 'physical-debug');
  mkdirSync(physicalOut, { recursive: true });
  clearGeneratedPhysical(profile.formId);
  mkdirSync(physicalOut, { recursive: true });
  mkdirSync(debugOut, { recursive: true });

  const byId = new Map<string, PhysicalFrame>();
  const stageById = new Map<string, PhysicalFrame>();
  const sequences: Record<string, unknown> = {};
  const stageSequences: Record<string, unknown> = {};
  const resourceProfileBlocked: Array<{ resourceId: number; resourceHex: string; reason: string }> = [];
  const transparentFrameRecords: Array<Record<string, unknown>> = [];

  for (const resourceDir of readdirSync(FIGHTERS, { withFileTypes: true }).filter(d => d.isDirectory() && d.name.startsWith('resource_'))) {
    const resourceId = parseInt(resourceDir.name.replace('resource_', ''), 16);
    if (!FIGHTER_PHYSICAL_RESOURCE_IDS.has(resourceId)) continue;
    if (!(profilesByResource.get(resourceId) ?? []).some(candidate => candidate.formId === profile.formId)) continue;
    const profileDir = join(FIGHTERS, resourceDir.name, `profile_${hex(profile.actorVisualProfileKey)}`);
    if (!isDir(profileDir)) continue;

    const prepared: Array<{ metaPath: string; meta: RenderMetadata; b: ReturnType<typeof bounds> }> = [];
    let invalidResourceProfile: string | null = null;
    for (const metaPath of walkMetadata(profileDir)) {
      const meta = readJson<RenderMetadata>(metaPath);
      try {
        prepared.push({ metaPath, meta, b: bounds(meta) });
      } catch (error) {
        invalidResourceProfile = error instanceof Error ? error.message : String(error);
        break;
      }
    }
    if (invalidResourceProfile) {
      resourceProfileBlocked.push({
        resourceId,
        resourceHex: `0x${hex(resourceId)}`,
        reason: invalidResourceProfile,
      });
      continue;
    }

    const transparentPrepared = prepared.filter(({ meta }) => !meta.bounds.opaqueBounds);
    for (const { metaPath, meta } of transparentPrepared) {
      transparentFrameRecords.push({
        resourceId,
        resourceHex: `0x${hex(resourceId)}`,
        sequence: meta.sequence,
        frameIndex: meta.frameIndex,
        visualFrameId: meta.frameRecord.visualFrameId,
        durationTicks: meta.frameRecord.durationTicks,
        rawOffsetX: meta.frameRecord.raw[3],
        rawOffsetY: meta.frameRecord.raw[2],
        offsetX: meta.frameRecord.offsetX,
        offsetY: meta.frameRecord.offsetY,
        raw: meta.frameRecord.raw,
        frameAddress: meta.frameRecord.provenance.frameAddress,
        physicalId: physicalId(meta),
        physicalRender: 'EMPTY_NOT_PROMOTED',
        evidence: metaPath.replace(`${ROOT}/`, ''),
      });
    }

    const renderablePrepared = prepared.filter(({ meta }) => meta.bounds.opaqueBounds);
    if (renderablePrepared.length === 0) {
      resourceProfileBlocked.push({
        resourceId,
        resourceHex: `0x${hex(resourceId)}`,
        reason: `resource/profile produced only transparent physical frames (${prepared.length} candidate frames)`,
      });
      continue;
    }

    for (const { metaPath, meta, b } of renderablePrepared) {
      if (meta.key !== profile.actorVisualProfileKey || meta.source.bank !== profile.graphicsBank) {
        throw new Error(`${profile.formId}: render profile mismatch (form key=${profile.actorVisualProfileKey}/bank=${profile.graphicsBank}, render key=${meta.key}/bank=${meta.source.bank})`);
      }
      if ((meta.pieceGraphics?.length ?? 0) !== meta.metasprite.pieces.length || meta.metasprite.pieces.length !== meta.graphics.blockCount) {
        throw new Error(`${profile.formId}: piece/block mismatch in resource 0x${hex(resourceId)} seq${meta.sequence} frame${meta.frameIndex}`);
      }
      const id = physicalId(meta);
      const file = `physical/${id}.png`;
      const srcPng = join(metaPath, '..', 'rom_trimmed.png');
      const rawCanvasFile = meta.rawCanvas ? `physical-debug/${id}-raw-canvas.png` : undefined;
      const rawImageFile = meta.rawCanvas?.rawFile ? `physical-debug/${id}-raw.png` : undefined;
      const srcRawCanvas = meta.rawCanvas ? join(metaPath, '..', meta.rawCanvas.file) : null;
      const srcRawImage = meta.rawCanvas?.rawFile ? join(metaPath, '..', meta.rawCanvas.rawFile) : null;
      const occurrence = {
        sequence: meta.sequence,
        frameIndex: meta.frameIndex,
        durationTicks: meta.frameRecord.durationTicks,
        offsetEncoding: OFFSET_ENCODING,
        rawOffsetX: meta.frameRecord.raw[3],
        rawOffsetY: meta.frameRecord.raw[2],
        offsetX: meta.frameRecord.offsetX,
        offsetY: meta.frameRecord.offsetY,
        raw: meta.frameRecord.raw,
        frameAddress: meta.frameRecord.provenance.frameAddress,
      };

      const existing = byId.get(id);
      if (existing) {
        if (existing.hashes.trimmedPixelHash !== meta.hashes.trimmedPixelHash) {
          throw new Error(`${id} maps to multiple pixel hashes; sequence cannot be hidden in the filename`);
        }
        existing.occurrences.push(occurrence);
      } else {
        copyFileSync(srcPng, join(formOut, file));
        if (rawCanvasFile && srcRawCanvas && existsSync(srcRawCanvas)) {
          copyFileSync(srcRawCanvas, join(formOut, rawCanvasFile));
        }
        if (rawImageFile && srcRawImage && existsSync(srcRawImage)) {
          copyFileSync(srcRawImage, join(formOut, rawImageFile));
        }
        byId.set(id, {
          physicalId: id,
          schemaVersion: SCHEMA_VERSION,
          physicalRendererSchema: PHYSICAL_RENDERER_SCHEMA,
          offsetEncoding: OFFSET_ENCODING,
          file,
          sourceRender: metaPath.replace(`${ROOT}/`, ''),
          resourceId,
          resourceHex: `0x${hex(resourceId)}`,
          visualFrameId: meta.frameRecord.visualFrameId,
          actorVisualProfileKey: profile.actorVisualProfileKey,
          graphicsBank: profile.graphicsBank,
          ...b,
          rawCanvasFile,
          rawImageFile,
          hashes: { ...meta.hashes, sourceFileSha256: sha256(srcPng) },
          palette: meta.palette,
          metasprite: meta.metasprite,
          graphics: meta.graphics,
          pieceGraphics: meta.pieceGraphics ?? [],
          assembly: meta.assembly ?? {
            pieceCount: meta.metasprite.pieces.length,
            graphicsBlockCount: meta.graphics.blockCount,
            renderedPieceCount: meta.pieceGraphics?.length ?? 0,
            graphicsBlockAddresses: (meta.pieceGraphics ?? []).map(piece => piece.graphicsBlockAddress),
            renderedBlockAddresses: (meta.pieceGraphics ?? []).map(piece => piece.graphicsBlockAddress),
            piecesOutsideRaw: 0,
            pixelsWrittenOutsideRaw: 0,
            assemblyInputHash: meta.hashes.assemblyInputHash ?? meta.hashes.sourceProvenanceHash,
            rawPixelHash: meta.hashes.rawPixelHash,
            trimmedPixelHash: meta.hashes.trimmedPixelHash,
            errors: [],
          },
          rawBounds: meta.rawBounds,
          sourceProvenance: meta.sourceProvenance,
          occurrences: [occurrence],
        });
      }

      const sequenceKey = `resource_${hex(resourceId)}_sequence_${hex(meta.sequence)}`;
      const list = (sequences[sequenceKey] as { source: string; resource: number; sequence: number; frames: unknown[] } | undefined) ?? {
        source: 'ROM_PHYSICAL_FIGHTER',
        schemaVersion: SCHEMA_VERSION,
        physicalRendererSchema: PHYSICAL_RENDERER_SCHEMA,
        offsetEncoding: OFFSET_ENCODING,
        resource: resourceId,
        sequence: meta.sequence,
        frames: [],
      };
      list.frames.push({
        file,
        physicalId: id,
        frameIndex: meta.frameIndex,
        visualFrameId: meta.frameRecord.visualFrameId,
        durationTicks: meta.frameRecord.durationTicks,
        rawOffsetX: meta.frameRecord.raw[3],
        rawOffsetY: meta.frameRecord.raw[2],
        offsetX: meta.frameRecord.offsetX,
        offsetY: meta.frameRecord.offsetY,
        offsetEncoding: OFFSET_ENCODING,
        originX: b.originX,
        originY: b.originY,
        originInTrimX: b.originInTrimX,
        originInTrimY: b.originInTrimY,
        rawCanvasFile,
        rawImageFile,
        assemblyErrors: meta.assembly?.errors ?? [],
      });
      sequences[sequenceKey] = list;
    }
  }

  for (const target of STAGE_BANK61_RENDER_TARGETS) {
    const cpuBase = ROM_BANK61_ANIMATION_CORE_RESOURCE_BASES[target.resourceIndex];
    if (cpuBase == null) throw new Error(`Bank $61 resourceIndex ${target.resourceIndex} has no base`);
    const resourceDir = `ab61_b${hex(cpuBase, 4)}`;
    const profileDir = join(FIGHTERS, resourceDir, `profile_${hex(profile.actorVisualProfileKey)}`);
    if (!isDir(profileDir)) continue;

    const prepared: Array<{ metaPath: string; meta: RenderMetadata; b: ReturnType<typeof bounds> }> = [];
    for (const metaPath of walkMetadata(profileDir)) {
      const meta = readJson<RenderMetadata>(metaPath);
      prepared.push({ metaPath, meta, b: bounds(meta) });
    }

    for (const { metaPath, meta, b } of prepared.filter(({ meta }) => meta.bounds.opaqueBounds)) {
      if (meta.key !== profile.actorVisualProfileKey || meta.source.bank !== profile.graphicsBank) {
        throw new Error(`${profile.formId}: Stage render profile mismatch (form key=${profile.actorVisualProfileKey}/bank=${profile.graphicsBank}, render key=${meta.key}/bank=${meta.source.bank})`);
      }
      if ((meta.pieceGraphics?.length ?? 0) !== meta.metasprite.pieces.length || meta.metasprite.pieces.length !== meta.graphics.blockCount) {
        throw new Error(`${profile.formId}: Stage piece/block mismatch in bank $61 base 0x${hex(cpuBase, 4)} seq${meta.sequence} frame${meta.frameIndex}`);
      }
      const id = physicalId(meta);
      const file = `physical/${id}.png`;
      const srcPng = join(metaPath, '..', 'rom_trimmed.png');
      const rawCanvasFile = meta.rawCanvas ? `physical-debug/${id}-raw-canvas.png` : undefined;
      const rawImageFile = meta.rawCanvas?.rawFile ? `physical-debug/${id}-raw.png` : undefined;
      const srcRawCanvas = meta.rawCanvas ? join(metaPath, '..', meta.rawCanvas.file) : null;
      const srcRawImage = meta.rawCanvas?.rawFile ? join(metaPath, '..', meta.rawCanvas.rawFile) : null;
      const occurrence = {
        sequence: meta.sequence,
        frameIndex: meta.frameIndex,
        durationTicks: meta.frameRecord.durationTicks,
        offsetEncoding: OFFSET_ENCODING,
        rawOffsetX: meta.frameRecord.raw[3],
        rawOffsetY: meta.frameRecord.raw[2],
        offsetX: meta.frameRecord.offsetX,
        offsetY: meta.frameRecord.offsetY,
        raw: meta.frameRecord.raw,
        frameAddress: meta.frameRecord.provenance.frameAddress,
      };

      const existing = stageById.get(id);
      if (existing) {
        if (existing.hashes.trimmedPixelHash !== meta.hashes.trimmedPixelHash) {
          throw new Error(`${id} maps to multiple Stage pixel hashes; sequence cannot be hidden in the filename`);
        }
        existing.occurrences.push(occurrence);
      } else {
        copyFileSync(srcPng, join(formOut, file));
        if (rawCanvasFile && srcRawCanvas && existsSync(srcRawCanvas)) {
          copyFileSync(srcRawCanvas, join(formOut, rawCanvasFile));
        }
        if (rawImageFile && srcRawImage && existsSync(srcRawImage)) {
          copyFileSync(srcRawImage, join(formOut, rawImageFile));
        }
        stageById.set(id, {
          physicalId: id,
          schemaVersion: SCHEMA_VERSION,
          physicalRendererSchema: PHYSICAL_RENDERER_SCHEMA,
          offsetEncoding: OFFSET_ENCODING,
          file,
          sourceRender: metaPath.replace(`${ROOT}/`, ''),
          resourceId: null,
          animationBank: meta.animationBank ?? 0x61,
          resourceBase: meta.resourceBase ?? cpuBase,
          resourceIdentity: `ab${hex(meta.animationBank ?? 0x61)}-b${hex(meta.resourceBase ?? cpuBase, 4)}`,
          resourceHex: `ab${hex(meta.animationBank ?? 0x61)}-b${hex(meta.resourceBase ?? cpuBase, 4)}`,
          visualFrameId: meta.frameRecord.visualFrameId,
          actorVisualProfileKey: profile.actorVisualProfileKey,
          graphicsBank: profile.graphicsBank,
          ...b,
          rawCanvasFile,
          rawImageFile,
          hashes: { ...meta.hashes, sourceFileSha256: sha256(srcPng) },
          palette: meta.palette,
          metasprite: meta.metasprite,
          graphics: meta.graphics,
          pieceGraphics: meta.pieceGraphics ?? [],
          assembly: meta.assembly ?? {
            pieceCount: meta.metasprite.pieces.length,
            graphicsBlockCount: meta.graphics.blockCount,
            renderedPieceCount: meta.pieceGraphics?.length ?? 0,
            graphicsBlockAddresses: (meta.pieceGraphics ?? []).map(piece => piece.graphicsBlockAddress),
            renderedBlockAddresses: (meta.pieceGraphics ?? []).map(piece => piece.graphicsBlockAddress),
            piecesOutsideRaw: 0,
            pixelsWrittenOutsideRaw: 0,
            assemblyInputHash: meta.hashes.assemblyInputHash ?? meta.hashes.sourceProvenanceHash,
            rawPixelHash: meta.hashes.rawPixelHash,
            trimmedPixelHash: meta.hashes.trimmedPixelHash,
            errors: [],
          },
          rawBounds: meta.rawBounds,
          sourceProvenance: meta.sourceProvenance,
          occurrences: [occurrence],
        });
      }

      const sequenceKey = `bank61_resource_${target.resourceIndex}_sequence_${hex(meta.sequence)}`;
      const list = (stageSequences[sequenceKey] as { source: string; resourceIndex: number; animationBank: number; resourceBase: number; sequence: number; frames: unknown[] } | undefined) ?? {
        source: 'ROM_PHYSICAL_STAGE_BANK61',
        schemaVersion: SCHEMA_VERSION,
        physicalRendererSchema: PHYSICAL_RENDERER_SCHEMA,
        offsetEncoding: OFFSET_ENCODING,
        resourceIndex: target.resourceIndex,
        animationBank: meta.animationBank ?? 0x61,
        resourceBase: meta.resourceBase ?? cpuBase,
        sequence: meta.sequence,
        frames: [],
      };
      list.frames.push({
        file,
        physicalId: id,
        frameIndex: meta.frameIndex,
        visualFrameId: meta.frameRecord.visualFrameId,
        durationTicks: meta.frameRecord.durationTicks,
        rawOffsetX: meta.frameRecord.raw[3],
        rawOffsetY: meta.frameRecord.raw[2],
        offsetX: meta.frameRecord.offsetX,
        offsetY: meta.frameRecord.offsetY,
        offsetEncoding: OFFSET_ENCODING,
        originX: b.originX,
        originY: b.originY,
        originInTrimX: b.originInTrimX,
        originInTrimY: b.originInTrimY,
        rawCanvasFile,
        rawImageFile,
        assemblyErrors: meta.assembly?.errors ?? [],
      });
      stageSequences[sequenceKey] = list;
    }
  }

  for (const seq of Object.values(sequences) as Array<{ frames: unknown[] }>) {
    seq.frames.sort((a, b) => ((a as { frameIndex?: number }).frameIndex ?? 0) - ((b as { frameIndex?: number }).frameIndex ?? 0));
  }
  for (const seq of Object.values(stageSequences) as Array<{ frames: unknown[] }>) {
    seq.frames.sort((a, b) => ((a as { frameIndex?: number }).frameIndex ?? 0) - ((b as { frameIndex?: number }).frameIndex ?? 0));
  }

  const frames = [...byId.values()].sort((a, b) => a.physicalId.localeCompare(b.physicalId));
  const stageFrames = [...stageById.values()].sort((a, b) => a.physicalId.localeCompare(b.physicalId));
  const manifest = {
    version: 'P0.3B_ROM_PHYSICAL_FIGHTER',
    schemaVersion: SCHEMA_VERSION,
    physicalRendererSchema: PHYSICAL_RENDERER_SCHEMA,
    offsetEncoding: OFFSET_ENCODING,
    source: 'ROM_PHYSICAL_FIGHTERS',
    formId: profile.formId,
    actorVisualProfileKey: profile.actorVisualProfileKey,
    graphicsBank: profile.graphicsBank,
    sequences,
    stageSequences,
    semanticMapping: {
      status: 'PENDING_P0.3C',
      note: 'This file maps physical ROM sequences. Semantic roles remain in legacy manifest.json until P0.3C remapping.',
    },
    resourceProfileBlocked,
    transparentFrameRecords,
  };
  const provenance = {
    version: 'P0.3B_ROM_PHYSICAL_FIGHTER',
    schemaVersion: SCHEMA_VERSION,
    physicalRendererSchema: PHYSICAL_RENDERER_SCHEMA,
    offsetEncoding: OFFSET_ENCODING,
    source: 'ROM_PHYSICAL_FIGHTERS',
    rom: {
      label: 'Dragon Ball Z - Guerreros de Leyenda (España)',
      sha256: ROM_SPAIN_SHA256,
    },
    formProfile: profile,
    frameIdentity: 'ROM SHA + actorVisualProfileKey + graphicsBank + AnimationResource + visualFrameId + metasprite descriptor hash + graphics source/layout hash',
    identityExcludes: ['sequence', 'semanticRole', 'legacyPoseName'],
    resourceProfileBlocked,
    transparentFrameRecords,
    frames: [...frames, ...stageFrames],
    fighterFrames: frames,
    stageFrames,
  };
  writeFileSync(join(formOut, 'rom-physical.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(formOut, 'provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);
  return { frames, stageFrames, manifest, provenance, resourceProfileBlocked, transparentFrameRecords };
}

const profiles = readJson<RomFormProfile[]>(PROFILES);
const physicalProfiles = profiles.filter(profile => profile.paletteAvailable);
const paletteBlockedProfiles = profiles.filter(profile => !profile.paletteAvailable);
const allResources = readJson<AnimationResource[]>(ANIMATION_RESOURCES);
const allResourcesById = new Map(allResources.map(resource => [resource.resourceId, resource]));
const resources = reachableResources(allResources);
const rendererPending = rendererPendingResources(allResources);
const profilesByResource = new Map(resources.map(resource => [
  resource.resourceId,
  compatibleProfilesForResource(resource.resourceId, physicalProfiles),
]));
const corpusProfiles = physicalProfiles.filter(profile =>
  resources.some(resource => (profilesByResource.get(resource.resourceId) ?? []).some(candidate => candidate.formId === profile.formId)));
const resourceBlockedProfiles = physicalProfiles.filter(profile => !corpusProfiles.some(candidate => candidate.formId === profile.formId));
if (!RENDER_BANK61_NEUTRAL_ONLY) renderReachableResources(resources, profilesByResource);
renderStageBank61Resources(physicalProfiles);
for (const profile of [...paletteBlockedProfiles, ...resourceBlockedProfiles]) clearGeneratedPhysical(profile.formId);

const summary = corpusProfiles.map(profile => {
  const built = buildForForm(profile, profilesByResource);
  const signedNegativeInstances = built.frames.reduce((total, frame) =>
    total + frame.occurrences.filter(occurrence => occurrence.rawOffsetX >= 0x80 || occurrence.rawOffsetY >= 0x80).length, 0);
  const stageSignedNegativeInstances = built.stageFrames.reduce((total, frame) =>
    total + frame.occurrences.filter(occurrence => occurrence.rawOffsetX >= 0x80 || occurrence.rawOffsetY >= 0x80).length, 0);
  const widths = built.frames.map(frame => frame.width);
  const heights = built.frames.map(frame => frame.height);
  const offsets = built.frames.flatMap(frame => frame.occurrences.flatMap(occurrence => [occurrence.offsetX, occurrence.offsetY]));
  const resourceFrameInstances = Object.values((built.manifest as { sequences: Record<string, { resource: number; frames: unknown[] }> }).sequences)
    .reduce((map, sequence) => {
      const resourceHex = `0x${hex(sequence.resource)}`;
      map[resourceHex] = (map[resourceHex] ?? 0) + sequence.frames.length;
      return map;
    }, {} as Record<string, number>);
  return {
    formId: profile.formId,
    actorVisualProfileKey: profile.actorVisualProfileKey,
    physicalFrames: built.frames.length,
    stagePhysicalFrames: built.stageFrames.length,
    frameInstances: built.frames.reduce((total, frame) => total + frame.occurrences.length, 0),
    stageFrameInstances: built.stageFrames.reduce((total, frame) => total + frame.occurrences.length, 0),
    sequences: Object.keys((built.manifest as { sequences: Record<string, unknown> }).sequences).length,
    stageSequences: Object.keys((built.manifest as { stageSequences: Record<string, unknown> }).stageSequences).length,
    resources: [...new Set(built.frames.map(frame => frame.resourceHex))],
    stageResources: [...new Set(built.stageFrames.map(frame => frame.resourceHex))],
    resourceFrameInstances,
    resourceProfileBlocked: built.resourceProfileBlocked,
    transparentFrameRecords: built.transparentFrameRecords,
    physicalFrameIndex: built.frames.map(frame => ({
      physicalId: frame.physicalId,
      file: frame.file,
      resourceId: frame.resourceId,
      animationBank: frame.animationBank,
      resourceBase: frame.resourceBase,
      resourceHex: frame.resourceHex,
      visualFrameId: frame.visualFrameId,
      actorVisualProfileKey: frame.actorVisualProfileKey,
      graphicsBank: frame.graphicsBank,
      metaspriteHash: frame.hashes.metaspriteHash,
      graphicsHash: frame.hashes.graphicsHash,
      sourceProvenanceHash: frame.hashes.sourceProvenanceHash,
      trimmedPixelHash: frame.hashes.trimmedPixelHash,
    })),
    stagePhysicalFrameIndex: built.stageFrames.map(frame => ({
      physicalId: frame.physicalId,
      file: frame.file,
      resourceId: frame.resourceId,
      animationBank: frame.animationBank,
      resourceBase: frame.resourceBase,
      resourceHex: frame.resourceHex,
      visualFrameId: frame.visualFrameId,
      actorVisualProfileKey: frame.actorVisualProfileKey,
      graphicsBank: frame.graphicsBank,
      metaspriteHash: frame.hashes.metaspriteHash,
      graphicsHash: frame.hashes.graphicsHash,
      sourceProvenanceHash: frame.hashes.sourceProvenanceHash,
      trimmedPixelHash: frame.hashes.trimmedPixelHash,
    })),
    signedNegativeInstances,
    stageSignedNegativeInstances,
    minOffset: Math.min(...offsets),
    maxOffset: Math.max(...offsets),
    minWidth: Math.min(...widths),
    maxWidth: Math.max(...widths),
    minHeight: Math.min(...heights),
    maxHeight: Math.max(...heights),
  };
});

const totals = {
  forms: summary.length,
  formsIndexed: profiles.length,
  formsPaletteBlocked: paletteBlockedProfiles.length,
  formsResourceBlocked: resourceBlockedProfiles.length,
  resourcesReachable: resources.length,
  resourcesRendered: resources.length,
  stageResourcesRendered: STAGE_BANK61_RENDER_TARGETS.length,
  resourcesRendererPending: rendererPending.length,
  fighterPhysicalIdentities: summary.reduce((total, row) => total + row.physicalFrames, 0),
  fighterFrameInstances: summary.reduce((total, row) => total + row.frameInstances, 0),
  stagePhysicalIdentities: summary.reduce((total, row) => total + row.stagePhysicalFrames, 0),
  stageFrameInstances: summary.reduce((total, row) => total + row.stageFrameInstances, 0),
  physicalIdentities: summary.reduce((total, row) => total + row.physicalFrames + row.stagePhysicalFrames, 0),
  frameInstances: summary.reduce((total, row) => total + row.frameInstances + row.stageFrameInstances, 0),
  signedNegativeInstances: summary.reduce((total, row) => total + row.signedNegativeInstances + row.stageSignedNegativeInstances, 0),
  minOffset: Math.min(...summary.map(row => row.minOffset)),
  maxOffset: Math.max(...summary.map(row => row.maxOffset)),
  maxWidth: Math.max(...summary.map(row => row.maxWidth)),
  maxHeight: Math.max(...summary.map(row => row.maxHeight)),
  resourceProfileBlockedPairs: summary.reduce((total, row) => total + row.resourceProfileBlocked.length, 0),
  transparentFrameRecords: summary.reduce((total, row) => total + row.transparentFrameRecords.length, 0),
  transparentPhysicalIds: new Set(summary.flatMap(row => row.transparentFrameRecords.map(record => String(record.physicalId)))).size,
};

const physicalIdsByResource = new Map<number, Set<string>>();
const frameInstancesByResource = new Map<number, number>();
for (const form of summary) {
  for (const frame of form.physicalFrameIndex) {
    if (frame.resourceId == null) continue;
    const ids = physicalIdsByResource.get(frame.resourceId) ?? new Set<string>();
    ids.add(frame.physicalId);
    physicalIdsByResource.set(frame.resourceId, ids);
  }
  for (const resource of form.resources) {
    const resourceId = parseInt(resource.replace('0x', ''), 16);
    const manifestInstances = form.resourceFrameInstances[resource] ?? 0;
    frameInstancesByResource.set(resourceId, (frameInstancesByResource.get(resourceId) ?? 0) + manifestInstances);
  }
}

const resourcePhysicalCompletion = ANIMATION_RESOURCE_CATALOG.map(entry => {
  const decodedResource = allResourcesById.get(entry.resourceId);
  const status = resourcePhysicalStatus(entry, decodedResource);
  const renderedProfiles = profilesByResource.get(entry.resourceId) ?? [];
  const sequenceCount = decodedResource?.sequences.length ?? entry.sequenceCount;
  const frameCount = decodedResource?.sequences.reduce((total, sequence) => total + sequence.frames.length, 0) ?? entry.physicalFrameCount;
  return {
    resourceId: entry.resourceId,
    resourceHex: `0x${hex(entry.resourceId)}`,
    bankHex: entry.bankHex,
    consumers: entry.cards.map(card => ({
      cardId: card.id,
      name: card.name,
      handlerHex: card.handlerHex,
      type: card.type,
    })),
    consumerCount: entry.cards.length,
    handlers: entry.handlers.map(handler => `0x${hex(handler)}`),
    sequences: sequenceCount,
    frames: frameCount,
    physicalLinkage: status.physicalLinkage,
    profilesRendered: [...new Set(renderedProfiles.map(profile => profile.actorVisualProfileKey))].length,
    physicalIds: physicalIdsByResource.get(entry.resourceId)?.size ?? 0,
    frameInstances: frameInstancesByResource.get(entry.resourceId) ?? 0,
    status: status.status,
    blockingReason: status.blockingReason || '—',
  };
});

const resourceCompletionTotals = {
  resources: resourcePhysicalCompletion.length,
  renderable: resourcePhysicalCompletion.filter(row => row.status === 'RENDERABLE').length,
  frameStreamOnly: resourcePhysicalCompletion.filter(row => row.status === 'FRAME_STREAM_ONLY').length,
  metaspritePending: resourcePhysicalCompletion.filter(row => row.status === 'METASPRITE_PENDING').length,
  graphicsPending: resourcePhysicalCompletion.filter(row => row.status === 'GRAPHICS_PENDING').length,
  handlerDependent: resourcePhysicalCompletion.filter(row => row.status === 'HANDLER_DEPENDENT').length,
  dynamicPending: resourcePhysicalCompletion.filter(row => row.status === 'DYNAMIC_PENDING').length,
  unreferenced: resourcePhysicalCompletion.filter(row => row.status === 'UNREFERENCED').length,
};

mkdirSync(OUT_REPORT, { recursive: true });
const corpusSummary = {
  phase: 'P0.3B_SIGNED_REACHABLE_RERENDER',
  schemaVersion: SCHEMA_VERSION,
  physicalRendererSchema: PHYSICAL_RENDERER_SCHEMA,
  offsetEncoding: OFFSET_ENCODING,
  source: 'ROM_PHYSICAL_FIGHTERS',
  romSha256: ROM_SPAIN_SHA256,
  reachableResources: resources.map(resource => `0x${hex(resource.resourceId)}`),
  rendererPendingResources: rendererPending.map(resource => ({
    resourceId: `0x${hex(resource.resourceId)}`,
    reason: 'Decoded frame stream exists, but current fighter-physical renderer does not pass base resolution and/or pieces===blockCount invariants for this resource.',
  })),
  paletteBlockedProfiles: paletteBlockedProfiles.map(profile => ({
    formId: profile.formId,
    actorVisualProfileKey: `0x${hex(profile.actorVisualProfileKey)}`,
    reason: 'paletteAvailable=false in rom-form-profiles; physical PNG render is blocked until palette source is resolved from ROM.',
  })),
  resourceBlockedProfiles: resourceBlockedProfiles.map(profile => ({
    formId: profile.formId,
    actorVisualProfileKey: `0x${hex(profile.actorVisualProfileKey)}`,
    reason: 'Palette is available, but no currently renderer-verified fighter physical resource is compatible with this form yet.',
  })),
  resourcePhysicalCompletion,
  resourceCompletionTotals,
  totals,
  forms: summary,
};
writeFileSync(join(OUT_REPORT, 'summary.json'), `${JSON.stringify(corpusSummary, null, 2)}\n`);
writeFileSync(join(OUT_REPORT, 'resource_physical_completion.json'), `${JSON.stringify({
  source: 'ROM_PHYSICAL_FIGHTERS',
  scope: 'AnimationResource physical promotion matrix; RENDERABLE means promoted into the certified Fighter corpus, not merely decoded.',
  totals: resourceCompletionTotals,
  resources: resourcePhysicalCompletion,
}, null, 2)}\n`);
writeFileSync(GENERATED_TS, [
  '// Auto-generated by scripts/build-rom-physical-corpus.ts',
  '// Do not edit by hand.',
  `export const ROM_PHYSICAL_CORPUS_SUMMARY = ${JSON.stringify(corpusSummary, null, 2)} as const;`,
  '',
].join('\n'));
writeFileSync(join(OUT_REPORT, 'resource_physical_completion.md'), [
  '# AnimationResource Physical Completion',
  '',
  'This matrix separates decoded ROM resources from Fighter physical resources promoted into the certified 48-form corpus.',
  '',
  `Renderable resources: ${resourceCompletionTotals.renderable}/${resourceCompletionTotals.resources}`,
  `Frame-stream-only resources: ${resourceCompletionTotals.frameStreamOnly}`,
  `Handler-dependent resources: ${resourceCompletionTotals.handlerDependent}`,
  `Dynamic-pending resources: ${resourceCompletionTotals.dynamicPending}`,
  `Unreferenced resources: ${resourceCompletionTotals.unreferenced}`,
  '',
  '| Resource | Consumers | Sequences | Frames | Physical linkage | Profiles rendered | Physical IDs | Frame instances | Status | Blocking reason |',
  '| -------- | --------: | --------: | -----: | ---------------- | ----------------: | -----------: | --------------: | ------ | --------------- |',
  ...resourcePhysicalCompletion.map(row => [
    `\`${row.resourceHex}\``,
    row.consumerCount,
    row.sequences,
    row.frames,
    `\`${row.physicalLinkage}\``,
    row.profilesRendered,
    row.physicalIds,
    row.frameInstances,
    `\`${row.status}\``,
    row.blockingReason === '—' ? '—' : row.blockingReason.replace(/\|/g, '/'),
  ].join(' | ')).map(row => `| ${row} |`),
  '',
].join('\n'));
writeFileSync(join(OUT_REPORT, 'REPORT.md'), [
  '# P0.3B — ROM Physical Runtime Corpus',
  '',
  `Source ROM SHA256: \`${ROM_SPAIN_SHA256}\``,
  `Schema: \`${SCHEMA_VERSION}\``,
  `Physical renderer schema: \`${PHYSICAL_RENDERER_SCHEMA}\` (signed piece coordinates, piece-extents trim, color0 transparent)`,
  `Offset encoding: \`${OFFSET_ENCODING}\` (raw bytes preserved separately)`,
  '',
  `Scope: ${resources.length} fighter-physical renderable AnimationResources from \`docs/rom/generated/animation-resources.json\`: ${resources.map(resource => `\`$${hex(resource.resourceId)}\``).join(', ')}.`,
  `AnimationResource physical promotion: ${resourceCompletionTotals.renderable}/${resourceCompletionTotals.resources} renderable; ${resourceCompletionTotals.frameStreamOnly} frame-stream-only; ${resourceCompletionTotals.handlerDependent} handler-dependent; ${resourceCompletionTotals.dynamicPending} dynamic-pending.`,
  `Renderer-pending decoded resources: ${rendererPending.map(resource => `\`$${hex(resource.resourceId)}\``).join(', ') || 'none'}.`,
  `Forms rendered: ${totals.forms}/${totals.formsIndexed}. Palette-blocked profiles: ${totals.formsPaletteBlocked}.`,
  `Resource-blocked palette-ready profiles: ${totals.formsResourceBlocked}.`,
  '',
  'Generated via fresh ROM re-render before runtime promotion. Legacy/canonical PNGs are not a source for this corpus.',
  '',
  `Physical identities: ${totals.physicalIdentities}`,
  `Frame instances: ${totals.frameInstances}`,
  `Signed-negative frame instances: ${totals.signedNegativeInstances}`,
  `Resource/profile blocked pairs: ${totals.resourceProfileBlockedPairs}`,
  `Offset range: ${totals.minOffset}..${totals.maxOffset}`,
  `Max dimensions: ${totals.maxWidth}×${totals.maxHeight}`,
  '',
  'Palette-blocked profiles are not rendered or faked:',
  ...paletteBlockedProfiles.map(profile => `- ${profile.formId} (profile 0x${hex(profile.actorVisualProfileKey)})`),
  '',
  'Resource-blocked profiles are not rendered or faked:',
  ...resourceBlockedProfiles.map(profile => `- ${profile.formId} (profile 0x${hex(profile.actorVisualProfileKey)})`),
  '',
  '| Form | Profile key | Physical IDs | Frame instances | ROM sequences | Signed-negative instances | Blocked pairs | Max dimensions |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...summary.map(row => `| ${row.formId} | 0x${hex(row.actorVisualProfileKey)} | ${row.physicalFrames} | ${row.frameInstances} | ${row.sequences} | ${row.signedNegativeInstances} | ${row.resourceProfileBlocked.map(item => item.resourceHex).join(', ') || '—'} | ${row.maxWidth}×${row.maxHeight} |`),
  '',
  'Generated assets live in `public/assets/sprites/<form>/physical/`.',
  '`manifest.json` remains the legacy/remake runtime manifest until P0.3C; `rom-physical.manifest.json` is the physical ROM manifest generated here.',
  '',
].join('\n'));

console.log(`P0.3B ROM physical corpus generated: ${totals.forms} forms · ${totals.resourcesReachable} resources · ${totals.physicalIdentities} physical IDs · ${totals.frameInstances} instances`);
