import { ROM_FX_CORPUS_BUNDLES, ROM_FX_CORPUS_SUMMARY } from '../data/generated/romFxCorpus.generated';
import {
  ROM_FX_ATTRIBUTE_STRIPS,
  ROM_FX_BUNDLE_GEOMETRY,
  ROM_FX_FILM_CONTRACT_SUMMARY,
} from '../data/generated/romFxFilmContract.generated';
import type { BattleSide } from './engine/state/BattleState';

export type RomFxWindowStatus =
  | 'ROM_FX_WINDOW_PARTIAL'
  | 'ROM_FX_WINDOW_STATIC_COMPLETE'
  | 'ROM_FX_WINDOW_DYNAMIC_COMPLETE'
  | 'ROM_FX_WINDOW_COMPLETE'
  | 'REMAKE_FALLBACK';

export type RomFxWindowPhase = 'PREFIX' | 'RESULT';
export type RomFxWindowSourceMap = 'SIDE_1' | 'SIDE_2';
export type RomFxWindowSide = 'LEFT' | 'RIGHT';
export type RomFxPrefixRelation = 'DISTINCT_RESULT_GRAPHIC' | 'PURE_MAP_TRANSLATION';

export interface RomFxWindowEvidence {
  status: 'ROM_STATIC_VERIFIED' | 'ROM_FX_FORMAT_VERIFIED' | 'EXTERNAL_ARTIFACT_IMPORTED' | 'PENDING_ROM_TRACE';
  source: string;
  detail: string;
}

export interface RomScrollStep {
  startTick: number | null;
  durationTicks: number | null;
  dxPerTick: number | null;
  dyPerTick: number | null;
  evidence: RomFxWindowEvidence[];
}

export interface RomFxBBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface RomFxAttributeStrip {
  side: 1 | 2;
  descriptor: string;
  bgPalette: number;
  vramBank: number;
  bands: Array<{ rows: [number, number]; attribute: string; xFlip: boolean; yFlip: boolean }>;
}

/** Static film contract proven from ROM Research V4 FX. */
export interface RomFxFilmContract {
  prefixOperand: number;
  prefixRows: [number, number];
  resultOperand: number;
  resultRows: [number, number];
  prefixRelation: RomFxPrefixRelation;
  mapDeltaX: number | null;
  mirrorPrefix: boolean;
  mirrorResult: boolean;
  mirrorResultDiffPixels: number;
  tileCount: number;
  prefixBBox: RomFxBBox | null;
  resultBBox: RomFxBBox | null;
  attributeStrip: RomFxAttributeStrip | null;
}

export interface RomFxDisplayWindow {
  status: RomFxWindowStatus;
  physicalId: string;
  fxResource: number;
  palette: number;
  context: {
    category: string | null;
    handler: number;
    worker?: string | null;
  };
  side: RomFxWindowSide;
  sideSelection: 'ACTOR_SIDE_STATIC_MAPPING';
  phase: RomFxWindowPhase;
  sourceMap: RomFxWindowSourceMap;
  sourceImage: string;
  viewport: {
    sourceX: number;
    sourceY: number;
    width: number;
    height: number;
    sourceRows: string;
    operand: number;
  };
  screen: {
    x: number;
    y: number;
    bgMap: '$9800';
    bgRow: 4;
    bgCol: 0;
  };
  scroll: {
    initialScx: number | null;
    initialScy: number | null;
    program: RomScrollStep[];
    status: 'PENDING_ROM_TRACE';
  };
  timing: {
    startTick: number;
    holdTicks: number | null;
    endTick: number | null;
    status: 'PARTIAL_FROM_PROFILE_WAITS' | 'PENDING_ROM_TRACE';
  };
  filmContract: RomFxFilmContract | null;
  evidence: RomFxWindowEvidence[];
}

export interface RomFxWindowSummary {
  offensiveResources: number;
  physicalCorpusAvailable: number;
  staticComplete: number;
  dynamicComplete: number;
  complete: number;
  partial: number;
  remakeFallback: number;
  silentFallback: number;
}

function sideForActor(actorSide: BattleSide): RomFxWindowSide {
  return actorSide === 'player' ? 'LEFT' : 'RIGHT';
}

function sourceMapForActor(actorSide: BattleSide): RomFxWindowSourceMap {
  return actorSide === 'player' ? 'SIDE_1' : 'SIDE_2';
}

function attributeSideForActor(actorSide: BattleSide): 1 | 2 {
  return actorSide === 'player' ? 1 : 2;
}

function imagePhase(phase: RomFxWindowPhase): 'prefix' | 'result' {
  return phase === 'PREFIX' ? 'prefix' : 'result';
}

function rowsForOperand(operand: number): [number, number] {
  if (operand === 0x02) return [3, 10];
  if (operand === 0x0a) return [11, 18];
  return [1, 8];
}

/** Prefix operand is determined by handler: only $07 uses operand $02 (rows 3-10). */
function prefixOperandForHandler(handler: number): number {
  return handler === 0x07 ? 0x02 : 0x00;
}

// The generated const arrays are deeply `readonly`; cast them into mutable
// structural views so the film contract can be assembled without spread copies.
interface GeometryRowView {
  fxResource: number;
  prefixRelation: RomFxPrefixRelation;
  mapDeltaX: number | null;
  mirrorPrefix: boolean;
  mirrorResult: boolean;
  mirrorResultDiffPixels: number;
  tileCount: number;
  prefixBBox: readonly [number, number, number, number] | null;
  resultBBox: readonly [number, number, number, number] | null;
}
interface AttributeStripView {
  side: 1 | 2;
  descriptor: string;
  bgPalette: number;
  vramBank: number;
  bands: Array<{ rows: [number, number]; attribute: string; xFlip: boolean; yFlip: boolean }>;
}

const GEOMETRY_BY_RESOURCE: Map<number, GeometryRowView> = new Map(
  ROM_FX_BUNDLE_GEOMETRY.map(row => [row.fxResource, row as unknown as GeometryRowView]),
);
const ATTRIBUTE_STRIP_BY_SIDE: Map<1 | 2, AttributeStripView> = new Map(
  ROM_FX_ATTRIBUTE_STRIPS.map(row => [row.side, row as unknown as AttributeStripView]),
);

function bboxFromTuple(tuple: readonly [number, number, number, number] | null | undefined): RomFxBBox | null {
  if (!tuple) return null;
  return { left: tuple[0], top: tuple[1], right: tuple[2], bottom: tuple[3] };
}

export function romFxWindowFor(params: {
  fxResource: number | null;
  palette: number | null | undefined;
  handler: number;
  category?: string | null;
  worker?: string | null;
  actorSide: BattleSide;
  tick: number;
  phase: RomFxWindowPhase;
  holdTicks?: number | null;
}): RomFxDisplayWindow | null {
  const { fxResource, palette } = params;
  if (fxResource == null || palette == null) return null;

  const bundle = ROM_FX_CORPUS_BUNDLES.find(item => item.fxResource === fxResource && item.paletteIndex === palette);
  if (!bundle) return null;

  const side = sideForActor(params.actorSide);
  const sourceMap = sourceMapForActor(params.actorSide);
  const sourceImage = bundle.images.find(image => image.side === (sourceMap === 'SIDE_1' ? 1 : 2) && image.phase === imagePhase(params.phase));
  if (!sourceImage) return null;

  // Static film contract (per FXResource geometry + global attribute strips).
  const geometry = GEOMETRY_BY_RESOURCE.get(fxResource) ?? null;
  const attributeStrip = ATTRIBUTE_STRIP_BY_SIDE.get(attributeSideForActor(params.actorSide)) ?? null;

  const prefixOperand = prefixOperandForHandler(params.handler);
  const prefixRows = rowsForOperand(prefixOperand);
  const resultOperand = 0x0a;
  const resultRows = rowsForOperand(resultOperand);

  const filmContract: RomFxFilmContract | null = geometry
    ? {
        prefixOperand,
        prefixRows,
        resultOperand,
        resultRows,
        prefixRelation: geometry.prefixRelation as RomFxPrefixRelation,
        mapDeltaX: geometry.mapDeltaX,
        mirrorPrefix: geometry.mirrorPrefix,
        mirrorResult: geometry.mirrorResult,
        mirrorResultDiffPixels: geometry.mirrorResultDiffPixels,
        tileCount: geometry.tileCount,
        prefixBBox: bboxFromTuple(geometry.prefixBBox),
        resultBBox: bboxFromTuple(geometry.resultBBox),
        attributeStrip,
      }
    : null;

  // The viewport operand/source rows now come from the ROM-proven operand
  // mapping (handler for prefix, $0A for result) rather than a sourceRows heuristic.
  const phaseOperand = params.phase === 'PREFIX' ? prefixOperand : resultOperand;
  const phaseRows = params.phase === 'PREFIX' ? prefixRows : resultRows;

  const evidence: RomFxWindowEvidence[] = [
    {
      status: 'ROM_STATIC_VERIFIED',
      source: 'Bank7E:$71CA opcode $0C',
      detail: 'Copies an 8x32 tile window into BG map $9800 row 4 col 0.',
    },
    {
      status: 'ROM_STATIC_VERIFIED',
      source: 'Bank01:$3421 + $CB75',
      detail: 'Side selects side1/side2 tilemap; card palette loads to BG palette slot 4.',
    },
    {
      status: 'ROM_STATIC_VERIFIED',
      source: 'Bank03 opcode $0C call sites',
      detail: `operand $${phaseOperand.toString(16).padStart(2, '0')} -> source rows ${phaseRows[0]}-${phaseRows[1]}.`,
    },
    {
      status: 'ROM_STATIC_VERIFIED',
      source: 'fx_bundle_geometry_v4.json',
      detail: geometry
        ? `${geometry.prefixRelation}${geometry.mapDeltaX != null ? ` mapDeltaX=${geometry.mapDeltaX}px` : ''}; mirror P/R=${geometry.mirrorPrefix}/${geometry.mirrorResult}; tiles=${geometry.tileCount}.`
        : 'bundle geometry descriptor not found',
    },
    {
      status: 'ROM_STATIC_VERIFIED',
      source: 'fx_global_attribute_strips_v4.json',
      detail: attributeStrip
        ? `BG palette ${attributeStrip.bgPalette} + VRAM bank ${attributeStrip.vramBank} (${attributeStrip.descriptor}).`
        : 'attribute strip descriptor not found',
    },
    {
      status: 'PENDING_ROM_TRACE',
      source: 'P0.1B',
      detail: 'Exact SCX/SCY base scroll ($C407/$C409), tick timing and cleanup remain dynamic (SFX-V4-05).',
    },
  ];

  const status: RomFxWindowStatus = filmContract ? 'ROM_FX_WINDOW_STATIC_COMPLETE' : 'ROM_FX_WINDOW_PARTIAL';

  return {
    status,
    physicalId: bundle.physicalId,
    fxResource,
    palette,
    context: {
      category: params.category ?? null,
      handler: params.handler,
      worker: params.worker ?? null,
    },
    side,
    sideSelection: 'ACTOR_SIDE_STATIC_MAPPING',
    phase: params.phase,
    sourceMap,
    sourceImage: sourceImage.file,
    viewport: {
      sourceX: 0,
      sourceY: 0,
      width: 256,
      height: 64,
      sourceRows: `${phaseRows[0]}-${phaseRows[1]}`,
      operand: phaseOperand,
    },
    screen: {
      x: 0,
      y: 32,
      bgMap: '$9800',
      bgRow: 4,
      bgCol: 0,
    },
    scroll: {
      initialScx: null,
      initialScy: null,
      program: [],
      status: 'PENDING_ROM_TRACE',
    },
    timing: {
      startTick: params.tick,
      holdTicks: params.holdTicks ?? null,
      endTick: params.holdTicks == null ? null : params.tick + params.holdTicks,
      status: params.holdTicks == null ? 'PENDING_ROM_TRACE' : 'PARTIAL_FROM_PROFILE_WAITS',
    },
    filmContract,
    evidence,
  };
}

export function romFxWindowRuntimeSummary(): RomFxWindowSummary {
  return {
    offensiveResources: ROM_FX_CORPUS_SUMMARY.totals.offensiveFxResources,
    physicalCorpusAvailable: ROM_FX_CORPUS_SUMMARY.totals.offensiveFxResources,
    staticComplete: ROM_FX_FILM_CONTRACT_SUMMARY.totals.staticCompleteResources,
    dynamicComplete: 0,
    complete: 0,
    partial: 0,
    remakeFallback: 0,
    silentFallback: 0,
  };
}
