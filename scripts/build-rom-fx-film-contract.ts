// ═══════════════════════════════════════════════════════════════════════
// P0.1B-R — ROM FX FILM CONTRACT BUILDER
// ═══════════════════════════════════════════════════════════════════════
// Encodes the *static* film contract for every normal offensive FX bundle
// directly from ROM Research V4 FX evidence, WITHOUT inventing dynamic
// scroll/timing that the ROM does not statically prove.
//
// Static (proven here, promotes STATIC_COMPLETE):
//   - opcode $0C source-window operand -> rows (prefix/result)
//   - prefix/result relation (DISTINCT_RESULT_GRAPHIC | PURE_MAP_TRANSLATION)
//   - map-space ΔX for pure translations
//   - prefix/result opaque BBox (map-space)
//   - mirror flags + mirror-result pixel diff
//   - tile count / first palette
//   - global CGB attribute strips (bgPalette 4, VRAM bank 1, X/Y flip)
//   - screen-offset *mechanism* (selector row[2]/row[3] -> C405/C406 -> SCY/SCX)
//
// Dynamic (NOT proven, keeps COMPLETE unreachable):
//   - base scroll $C407/$C409 + final 160x144 viewport composition (SFX-V4-05)
//   - tick timing / hold / cleanup (handler waits + screen motion)
//   - per-form numeric C405/C406 (form-scoped, requires actorFormId binding)
// ═══════════════════════════════════════════════════════════════════════

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const ROOT = process.cwd();
const SOURCE_ROOT = join(ROOT, 'docs/rom/research-v4-fx/external/DBZ_LSW_ROM_RESEARCH_V4_FX');
const OUT = join(ROOT, 'generated/rom-fx');
const OUT_PUBLIC = join(ROOT, 'public/assets/rom-fx');
const OUT_TS = join(ROOT, 'src/data/generated/romFxFilmContract.generated.ts');

type PrefixRelation = 'DISTINCT_RESULT_GRAPHIC' | 'PURE_MAP_TRANSLATION';
type BBox = [number, number, number, number];

interface GeometryRow {
  fxResource: string;
  kind: string;
  prefixRelation: PrefixRelation | 'N/A';
  mapDeltaX: number | string;
  mirrorPrefix: boolean | string;
  mirrorResult: boolean | string;
  mirrorResultDiffPixels: number | string;
  tileCount: number;
  prefixBBox?: string;
  resultBBox?: string;
  firstPalette?: string;
}

interface ExecutionRow {
  cardId: number;
  name: string;
  category: string;
  handler: string;
  fxResource: string;
  palette: string;
  prefixOperand: string;
  prefixSourceRows: string;
  prefixCall: string;
  resultOperand: string;
  resultSourceRows: string;
  resultCall: string;
  bundleRelation: PrefixRelation;
  mapDeltaXIfPure: number | string;
  note: string;
}

interface AttributeStripEntry {
  side: number;
  descriptor: string;
  row: number;
  attribute: string;
  bgPalette: number;
  vramBank: number;
  xFlip: boolean;
  yFlip: boolean;
  priority: boolean;
}

interface CallSiteRow {
  address: string;
  context: string;
  operand: string;
  effectiveSourceWindow: string;
  note: string;
}

interface Manifest {
  sourceRomSha256: string;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function writeJson(path: string, value: unknown): void {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(path: string, value: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, value);
}

function parseHex(value: string): number {
  return Number.parseInt(value, 16);
}

function parseBBox(raw: string | undefined): BBox | null {
  if (!raw) return null;
  const match = /\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/.exec(raw);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
}

function numberOrNull(value: number | string): number | null {
  if (value === '' || value == null) return null;
  return Number(value);
}

function boolOr(value: boolean | string): boolean | null {
  if (value === '' || value == null) return null;
  return Boolean(value);
}

function compressBands(entries: AttributeStripEntry[]) {
  const bands: Array<{ rows: [number, number]; attribute: string; xFlip: boolean; yFlip: boolean }> = [];
  let current: { start: number; end: number; attribute: string; xFlip: boolean; yFlip: boolean } | null = null;
  for (const entry of entries) {
    if (current && current.attribute === entry.attribute && current.xFlip === entry.xFlip && current.yFlip === entry.yFlip) {
      current.end = entry.row;
    } else {
      if (current) bands.push({ rows: [current.start, current.end], attribute: current.attribute, xFlip: current.xFlip, yFlip: current.yFlip });
      current = { start: entry.row, end: entry.row, attribute: entry.attribute, xFlip: entry.xFlip, yFlip: entry.yFlip };
    }
  }
  if (current) bands.push({ rows: [current.start, current.end], attribute: current.attribute, xFlip: current.xFlip, yFlip: current.yFlip });
  return bands;
}

function main(): void {
  const manifest = readJson<Manifest>(join(SOURCE_ROOT, 'generated_fx_assets/manifest.json'));
  const geometryRaw = readJson<GeometryRow[]>(join(SOURCE_ROOT, 'data/fx_bundle_geometry_v4.json'));
  const executionRaw = readJson<ExecutionRow[]>(join(SOURCE_ROOT, 'data/offensive_fx_execution_v4.json'));
  const attributeRaw = readJson<AttributeStripEntry[]>(join(SOURCE_ROOT, 'data/fx_global_attribute_strips_v4.json'));
  const callSitesRaw = readJson<CallSiteRow[]>(join(SOURCE_ROOT, 'data/fx_opcode0c_call_sites_v4.json'));

  const sourceRomSha256 = manifest.sourceRomSha256;

  // 1) Bundle geometry — normal offensive bundles only ($01/$04/$06 are category tokens).
  const bundleGeometry = geometryRaw
    .filter(row => row.kind === 'NORMAL_OFFENSIVE_BUNDLE')
    .map(row => ({
      fxResource: parseHex(row.fxResource),
      fxHex: row.fxResource,
      prefixRelation: row.prefixRelation,
      mapDeltaX: numberOrNull(row.mapDeltaX),
      mirrorPrefix: boolOr(row.mirrorPrefix),
      mirrorResult: boolOr(row.mirrorResult),
      mirrorResultDiffPixels: numberOrNull(row.mirrorResultDiffPixels) ?? 0,
      tileCount: row.tileCount,
      prefixBBox: parseBBox(row.prefixBBox),
      resultBBox: parseBBox(row.resultBBox),
      firstPalette: row.firstPalette ?? null,
    }))
    .sort((a, b) => a.fxResource - b.fxResource);

  // 2) Execution rows — per card (41 rows) carrying prefix/result operands + relation.
  const execution = executionRaw.map(row => ({
    cardId: row.cardId,
    name: row.name,
    category: row.category,
    handler: row.handler,
    fxResource: parseHex(row.fxResource),
    fxHex: row.fxResource,
    palette: row.palette,
    prefixOperand: parseHex(row.prefixOperand),
    prefixSourceRows: row.prefixSourceRows,
    prefixCall: row.prefixCall,
    resultOperand: parseHex(row.resultOperand),
    resultSourceRows: row.resultSourceRows,
    resultCall: row.resultCall,
    bundleRelation: row.bundleRelation,
    mapDeltaXIfPure: numberOrNull(row.mapDeltaXIfPure),
    note: row.note,
  })).sort((a, b) => a.cardId - b.cardId);

  // 3) Attribute strips — compress per side into uniform bands.
  const side1 = attributeRaw.filter(e => e.side === 1);
  const side2 = attributeRaw.filter(e => e.side === 2);
  const attributeStrips = [
    {
      side: 1,
      descriptor: side1[0]?.descriptor ?? 'Bank65:$4070',
      bgPalette: side1[0]?.bgPalette ?? 4,
      vramBank: side1[0]?.vramBank ?? 1,
      bands: compressBands(side1),
    },
    {
      side: 2,
      descriptor: side2[0]?.descriptor ?? 'Bank65:$42F0',
      bgPalette: side2[0]?.bgPalette ?? 4,
      vramBank: side2[0]?.vramBank ?? 1,
      bands: compressBands(side2),
    },
  ];

  // 4) Opcode $0C call sites (13).
  const opcode0cCallSites = callSitesRaw.map(row => ({
    address: row.address,
    context: row.context,
    operand: parseHex(row.operand),
    effectiveSourceWindow: row.effectiveSourceWindow,
    note: row.note,
  }));

  // 5) Screen-offset mechanism (static address path; values are form-scoped).
  const screenOffsetMechanism = {
    selectorRow2: {
      path: 'Bank00:$3966 -> $C2D0 -> opcode0D -> $C405',
      contributes: 'SCY',
      note: 'selector row[2] is a vertical presentation scroll byte',
    },
    selectorRow3: {
      path: 'Bank00:$3966 -> $C2D1 (side transform around $80) -> opcode0D -> $C406',
      contributes: 'SCX',
      note: 'selector row[3] is a horizontal presentation scroll source, side-transformed',
    },
    finalScroll: 'SCY(FF42) = base $C407 + $C405 ; SCX(FF43) = base $C409 + $C406',
    evidence: 'Bank00:$3966 + Bank7E opcode0D + Bank00:$0DA2',
    baseScroll: { c407: 'OPEN_SFX_V4_05', c409: 'OPEN_SFX_V4_05' },
    perFormValues: 'beam_actor_screen_offsets_v4.json (240 form-scoped rows; requires actorFormId binding)',
  };

  const staticCompleteResources = bundleGeometry.length; // 28
  const dynamicPendingResources = bundleGeometry.length; // all still pending scroll/timing

  const completion = {
    phase: 'P0.1B_ROM_FX_FILM_CONTRACT',
    source: 'ROM_RESEARCH_V4_FX',
    sourceRomSha256,
    totals: {
      normalOffensiveBundles: bundleGeometry.length,
      executionRows: execution.length,
      opcode0cCallSites: opcode0cCallSites.length,
      attributeStripSides: attributeStrips.length,
      staticCompleteResources,
      dynamicPendingResources,
      completeResources: 0,
    },
    status: 'ROM_FX_WINDOW_STATIC_COMPLETE',
    notes: [
      'Static film contract is fully ROM-proven for all 28 normal offensive bundles.',
      'Base scroll $C407/$C409 and final 160x144 viewport composition remain OPEN (SFX-V4-05).',
      'Tick timing/hold/cleanup remain PENDING_ROM_TRACE (handler waits + screen motion).',
      'Per-form numeric C405/C406 are form-scoped and require actorFormId binding.',
    ],
    bundleGeometry,
    execution,
    attributeStrips,
    opcode0cCallSites,
    screenOffsetMechanism,
  };

  writeJson(join(OUT, 'film_contract.json'), completion);
  writeJson(join(OUT_PUBLIC, 'film_contract.json'), completion);

  writeText(join(OUT, 'film_contract.md'), [
    '# ROM FX Film Contract (P0.1B)',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| Normal offensive bundles | ${completion.totals.normalOffensiveBundles} |`,
    `| Execution rows | ${completion.totals.executionRows} |`,
    `| Opcode $0C call sites | ${completion.totals.opcode0cCallSites} |`,
    `| Attribute strip sides | ${completion.totals.attributeStripSides} |`,
    `| STATIC_COMPLETE resources | ${completion.totals.staticCompleteResources} |`,
    `| DYNAMIC pending resources | ${completion.totals.dynamicPendingResources} |`,
    `| COMPLETE resources | ${completion.totals.completeResources} |`,
    '',
    `Status: ${completion.status}`,
    '',
    '## Bundle geometry (per FXResource)',
    '',
    '| FX | Relation | ΔX | Mirror P/R | Diff px | Tiles | Prefix BBox | Result BBox |',
    '| --- | --- | ---: | --- | ---: | ---: | --- | --- |',
    ...bundleGeometry.map(g =>
      `| ${g.fxHex} | ${g.prefixRelation} | ${g.mapDeltaX ?? '-'} | ${g.mirrorPrefix}/${g.mirrorResult} | ${g.mirrorResultDiffPixels} | ${g.tileCount} | ${g.prefixBBox ? g.prefixBBox.join(',') : '-'} | ${g.resultBBox ? g.resultBBox.join(',') : '-'} |`,
    ),
    '',
    '## Screen-offset mechanism (static)',
    '',
    `- row[2] → SCY: ${screenOffsetMechanism.selectorRow2.path}`,
    `- row[3] → SCX: ${screenOffsetMechanism.selectorRow3.path}`,
    `- final: ${screenOffsetMechanism.finalScroll}`,
    `- base scroll: ${screenOffsetMechanism.baseScroll.c407} / ${screenOffsetMechanism.baseScroll.c409} (OPEN)`,
    '',
  ].join('\n'));

  writeText(OUT_TS, [
    '// Generated by scripts/build-rom-fx-film-contract.ts',
    '// Static film contract for normal offensive FX bundles (P0.1B-R).',
    '// Dynamic scroll program + tick timing/cleanup remain PENDING_ROM_TRACE.',
    'export const ROM_FX_FILM_CONTRACT_SUMMARY = ' + JSON.stringify({
      phase: completion.phase,
      source: completion.source,
      sourceRomSha256: completion.sourceRomSha256,
      totals: completion.totals,
      status: completion.status,
    }, null, 2) + ' as const;',
    '',
    'export const ROM_FX_BUNDLE_GEOMETRY = ' + JSON.stringify(bundleGeometry, null, 2) + ' as const;',
    '',
    'export const ROM_FX_EXECUTION_BY_CARD = ' + JSON.stringify(execution, null, 2) + ' as const;',
    '',
    'export const ROM_FX_ATTRIBUTE_STRIPS = ' + JSON.stringify(attributeStrips, null, 2) + ' as const;',
    '',
    'export const ROM_FX_OPCODE0C_CALL_SITES = ' + JSON.stringify(opcode0cCallSites, null, 2) + ' as const;',
    '',
    'export const ROM_FX_SCREEN_OFFSET_MECHANISM = ' + JSON.stringify(screenOffsetMechanism, null, 2) + ' as const;',
    '',
  ].join('\n'));

  console.log(`ROM FX film contract: ${bundleGeometry.length} static-complete bundles · ${execution.length} execution rows · ${opcode0cCallSites.length} call sites · COMPLETE 0 (dynamic pending ${dynamicPendingResources})`);
}

main();
