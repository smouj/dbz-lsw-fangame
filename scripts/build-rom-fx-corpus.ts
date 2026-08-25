import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { PNG } from 'pngjs';

const ROOT = process.cwd();
const SOURCE_ROOT = join(ROOT, 'docs/rom/research-v4-fx/external/DBZ_LSW_ROM_RESEARCH_V4_FX');
const SOURCE_ASSETS = join(SOURCE_ROOT, 'generated_fx_assets');
const OUT = join(ROOT, 'generated/rom-fx');
const OUT_PUBLIC = join(ROOT, 'public/assets/rom-fx');
const OUT_TS = join(ROOT, 'src/data/generated/romFxCorpus.generated.ts');

type Phase = 'prefix' | 'result';
type Side = 1 | 2;

interface SourceImage {
  side: Side;
  phase: Phase;
  file: string;
  bbox: [number, number, number, number];
  sha256: string;
  sourceRows: [number, number];
  mapSize: [number, number];
}

interface SourcePair {
  fxResource: number;
  fxHex: string;
  palette: number;
  paletteHex: string;
  prefixOperand: number;
  prefixRows: [number, number];
  resultOperand: number;
  resultRows: [number, number];
  cards: Array<{ cardId: number; name: string; category: string; handler: string }>;
  images: SourceImage[];
}

interface FxResourceExact {
  fxResource: number;
  fxHex: string;
  bank: number;
  bankHex: string;
  localIndex: number;
  baseDescriptor: number;
  baseDescriptorHex: string;
  graphicsTileCount: number;
  graphicsBytes: number;
  graphicsSha256: string;
  side1Descriptor: number;
  side1DescriptorHex: string;
  side2Descriptor: number;
  side2DescriptorHex: string;
  paletteIds: number[];
  cardCount: number;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function hex2(value: number): string {
  return `0x${value.toString(16).padStart(2, '0').toUpperCase()}`;
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

function png(path: string): PNG {
  return PNG.sync.read(readFileSync(path));
}

function paste(dest: PNG, src: PNG, dx: number, dy: number): void {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const si = (y * src.width + x) * 4;
      const di = ((dy + y) * dest.width + (dx + x)) * 4;
      dest.data[di] = src.data[si];
      dest.data[di + 1] = src.data[si + 1];
      dest.data[di + 2] = src.data[si + 2];
      dest.data[di + 3] = src.data[si + 3];
    }
  }
}

function fill(dest: PNG, r: number, g: number, b: number, a: number): void {
  for (let i = 0; i < dest.data.length; i += 4) {
    dest.data[i] = r;
    dest.data[i + 1] = g;
    dest.data[i + 2] = b;
    dest.data[i + 3] = a;
  }
}

function drawRect(dest: PNG, x: number, y: number, w: number, h: number, r: number, g: number, b: number): void {
  for (let px = x; px < x + w; px++) {
    for (const py of [y, y + h - 1]) set(px, py);
  }
  for (let py = y; py < y + h; py++) {
    for (const px of [x, x + w - 1]) set(px, py);
  }
  function set(px: number, py: number): void {
    if (px < 0 || py < 0 || px >= dest.width || py >= dest.height) return;
    const i = (py * dest.width + px) * 4;
    dest.data[i] = r;
    dest.data[i + 1] = g;
    dest.data[i + 2] = b;
    dest.data[i + 3] = 255;
  }
}

function main(): void {
  const sourceManifest = readJson<{ sourceRomSha256: string; assetSemantics: string; pairs: SourcePair[] }>(join(SOURCE_ASSETS, 'manifest.json'));
  const resourcesExact = readJson<FxResourceExact[]>(join(SOURCE_ROOT, 'data/fx_resources_exact_v4.json'));
  const geometry = readJson<Array<{ fxResource: string; kind: string; tileCount: number }>>(join(SOURCE_ROOT, 'data/fx_bundle_geometry_v4.json'));

  const resourcesById = new Map(resourcesExact.map(row => [row.fxResource, row]));
  const geometryById = new Map(geometry.map(row => [Number(row.fxResource), row]));
  const normalPairs = sourceManifest.pairs.filter(pair => pair.images.length === 4);
  const fxIds = [...new Set(normalPairs.map(pair => pair.fxResource))].sort((a, b) => a - b);
  const cards = new Map<number, SourcePair['cards'][number]>();
  for (const pair of normalPairs) for (const card of pair.cards) cards.set(card.cardId, card);

  rmSync(OUT, { recursive: true, force: true });
  rmSync(OUT_PUBLIC, { recursive: true, force: true });
  ensureDir(OUT);
  ensureDir(OUT_PUBLIC);

  const bundles = normalPairs.map(pair => {
    const exact = resourcesById.get(pair.fxResource);
    const geom = geometryById.get(pair.fxResource);
    const relDir = `fx-${pair.fxResource.toString(16).padStart(2, '0')}/palette-${pair.palette.toString(16).padStart(2, '0')}`;
    const outDir = join(OUT, relDir);
    const publicDir = join(OUT_PUBLIC, relDir);
    ensureDir(outDir);
    ensureDir(publicDir);

    const images = pair.images.map(image => {
      const src = join(SOURCE_ASSETS, image.file);
      const phase = image.phase;
      const side = `side-${image.side}` as const;
      const name = `${side}-${phase}.png`;
      const target = join(outDir, name);
      const publicTarget = join(publicDir, name);
      copyFileSync(src, target);
      copyFileSync(src, publicTarget);
      return {
        side: image.side,
        phase,
        file: `${relDir}/${name}`,
        publicFile: `/assets/rom-fx/${relDir}/${name}`,
        sourceFile: image.file,
        sha256: image.sha256,
        bbox: image.bbox,
        sourceRows: image.sourceRows,
        mapSize: image.mapSize,
      };
    });

    const errors: string[] = [];
    if (!exact) errors.push('MISSING_EXACT_DESCRIPTOR');
    if (!geom) errors.push('MISSING_GEOMETRY_DESCRIPTOR');
    if (images.length !== 4) errors.push('SIDE_PHASE_RENDER_MISMATCH');
    for (const image of images) {
      const path = join(OUT, image.file);
      if (!existsSync(path)) errors.push(`MISSING_IMAGE_${image.side}_${image.phase}`);
    }

    const metadata = {
      physicalId: `rom-fx${pair.fxResource.toString(16).padStart(2, '0')}-pal${pair.palette.toString(16).padStart(2, '0')}`,
      status: errors.length === 0 ? 'ROM_PHYSICAL_REVIEW' : 'ERROR',
      domain: 'OFFENSIVE_FX_BG_TILEMAP',
      fxResource: pair.fxResource,
      fxHex: pair.fxHex,
      bank: exact?.bank ?? null,
      bankHex: exact?.bankHex ?? null,
      descriptorAddress: exact?.baseDescriptorHex ?? null,
      graphicsAddress: null,
      graphicsAddressStatus: 'NOT_EXPORTED_BY_ROM_RESEARCH_V4_FX',
      graphicsBytes: exact?.graphicsBytes ?? null,
      graphicsTileCount: exact?.graphicsTileCount ?? geom?.tileCount ?? null,
      graphicsHash: exact?.graphicsSha256 ?? null,
      side1TilemapAddress: exact?.side1DescriptorHex ?? null,
      side2TilemapAddress: exact?.side2DescriptorHex ?? null,
      paletteIndex: pair.palette,
      paletteHex: pair.paletteHex,
      width: 256,
      height: 64,
      prefixOperand: pair.prefixOperand,
      prefixRows: pair.prefixRows,
      resultOperand: pair.resultOperand,
      resultRows: pair.resultRows,
      consumingCards: pair.cards,
      images,
      errors,
    };
    writeJson(join(outDir, 'metadata.json'), metadata);
    writeJson(join(publicDir, 'metadata.json'), metadata);
    return metadata;
  });

  const sideMapKeys = new Set<string>();
  for (const bundle of bundles) {
    sideMapKeys.add(`${bundle.fxHex}:side1:${bundle.side1TilemapAddress}`);
    sideMapKeys.add(`${bundle.fxHex}:side2:${bundle.side2TilemapAddress}`);
  }

  const completion = {
    phase: 'P0.1A_OFFENSIVE_FX_PHYSICAL_CORPUS',
    source: 'ROM_RESEARCH_V4_FX',
    sourceRomSha256: sourceManifest.sourceRomSha256,
    assetSemantics: sourceManifest.assetSemantics,
    totals: {
      fxResourcesTotalNonFF: resourcesExact.length,
      offensiveFxResources: fxIds.length,
      normalOffensiveBundles: fxIds.length,
      paletteBundles: bundles.length,
      sideMapsByResource: sideMapKeys.size,
      sidePhaseRenders: bundles.reduce((sum, bundle) => sum + bundle.images.length, 0),
      consumingCards: cards.size,
      errors: bundles.reduce((sum, bundle) => sum + bundle.errors.length, 0),
      supportOrCategorySpecificResources: resourcesExact.length - fxIds.length,
    },
    statuses: {
      offensive: 'ROM_PHYSICAL_REVIEW',
      runtimeCutover: 'PENDING_ROM_FX_WINDOW',
      supportVisuals: 'SEPARATE_DOMAIN',
      supportAuraBlue: 'UNRESOLVED',
      gatherPowerAuraOrange: 'UNRESOLVED',
    },
    resources: fxIds.map(fxResource => {
      const exact = resourcesById.get(fxResource);
      return {
        fxResource,
        fxHex: hex2(fxResource),
        bankHex: exact?.bankHex ?? null,
        descriptorAddress: exact?.baseDescriptorHex ?? null,
        graphicsAddress: null,
        graphicsAddressStatus: 'NOT_EXPORTED_BY_ROM_RESEARCH_V4_FX',
        graphicsBytes: exact?.graphicsBytes ?? null,
        graphicsTileCount: exact?.graphicsTileCount ?? null,
        graphicsHash: exact?.graphicsSha256 ?? null,
        side1TilemapAddress: exact?.side1DescriptorHex ?? null,
        side2TilemapAddress: exact?.side2DescriptorHex ?? null,
        paletteBundles: bundles.filter(bundle => bundle.fxResource === fxResource).length,
        consumingCards: [...new Map(bundles.filter(bundle => bundle.fxResource === fxResource).flatMap(bundle => bundle.consumingCards).map(card => [card.cardId, card])).values()],
        status: 'ROM_PHYSICAL_REVIEW',
        errors: bundles.filter(bundle => bundle.fxResource === fxResource).flatMap(bundle => bundle.errors),
      };
    }),
    bundles,
  };

  writeJson(join(OUT, 'manifest.json'), {
    source: completion.source,
    phase: completion.phase,
    sourceRomSha256: completion.sourceRomSha256,
    totals: completion.totals,
    bundles: bundles.map(bundle => ({
      physicalId: bundle.physicalId,
      fxResource: bundle.fxResource,
      fxHex: bundle.fxHex,
      paletteIndex: bundle.paletteIndex,
      paletteHex: bundle.paletteHex,
      metadata: `fx-${bundle.fxResource.toString(16).padStart(2, '0')}/palette-${bundle.paletteIndex.toString(16).padStart(2, '0')}/metadata.json`,
      images: bundle.images.map(image => image.file),
      consumingCards: bundle.consumingCards,
      errors: bundle.errors,
    })),
  });
  writeJson(join(OUT, 'completion.json'), completion);
  writeJson(join(OUT_PUBLIC, 'manifest.json'), readJson(join(OUT, 'manifest.json')));
  writeJson(join(OUT_PUBLIC, 'completion.json'), completion);

  writeText(join(OUT, 'completion.md'), [
    '# ROM FX Physical Completion',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| FX IDs físicos no-$FF | ${completion.totals.fxResourcesTotalNonFF} |`,
    `| Offensive FXResource únicos | ${completion.totals.offensiveFxResources} |`,
    `| Normal offensive bundles | ${completion.totals.normalOffensiveBundles} |`,
    `| FX/palette bundles | ${completion.totals.paletteBundles} |`,
    `| SIDE maps por recurso | ${completion.totals.sideMapsByResource} |`,
    `| SIDE/phase renders | ${completion.totals.sidePhaseRenders} |`,
    `| Consuming cards | ${completion.totals.consumingCards} |`,
    `| Errors | ${completion.totals.errors} |`,
    '',
    '| FX | Bank | Descriptor | Tiles | Palettes | Cards | Status | Errors |',
    '| --- | --- | --- | ---: | ---: | ---: | --- | --- |',
    ...completion.resources.map(resource =>
      `| ${resource.fxHex} | ${resource.bankHex ?? '-'} | ${resource.descriptorAddress ?? '-'} | ${resource.graphicsTileCount ?? 0} | ${resource.paletteBundles} | ${resource.consumingCards.length} | ${resource.status} | ${resource.errors.length} |`,
    ),
    '',
  ].join('\n'));

  const cellW = 276;
  const cellH = 84;
  const cols = 4;
  const rows = bundles.length;
  const sheet = new PNG({ width: cellW * cols, height: cellH * rows });
  fill(sheet, 11, 17, 27, 255);
  bundles.forEach((bundle, row) => {
    bundle.images.forEach((image, col) => {
      const src = png(join(OUT, image.file));
      const x = col * cellW + 10;
      const y = row * cellH + 10;
      paste(sheet, src, x, y);
      drawRect(sheet, x, y, src.width, src.height, 54, 88, 120);
    });
  });
  writeFileSync(join(OUT, 'contact_sheet.png'), PNG.sync.write(sheet));
  writeFileSync(join(OUT_PUBLIC, 'contact_sheet.png'), PNG.sync.write(sheet));

  writeText(OUT_TS, [
    '// Generated by scripts/build-rom-fx-corpus.ts',
    'export const ROM_FX_CORPUS_SUMMARY = ' + JSON.stringify({
      phase: completion.phase,
      source: completion.source,
      sourceRomSha256: completion.sourceRomSha256,
      totals: completion.totals,
      statuses: completion.statuses,
      resources: completion.resources.map(resource => ({
        fxResource: resource.fxResource,
        fxHex: resource.fxHex,
        paletteBundles: resource.paletteBundles,
        consumingCards: resource.consumingCards.length,
        status: resource.status,
        errors: resource.errors.length,
      })),
    }, null, 2) + ' as const;',
    '',
    'export const ROM_FX_CORPUS_BUNDLES = ' + JSON.stringify(completion.bundles.map(bundle => ({
      physicalId: bundle.physicalId,
      fxResource: bundle.fxResource,
      fxHex: bundle.fxHex,
      paletteIndex: bundle.paletteIndex,
      paletteHex: bundle.paletteHex,
      bankHex: bundle.bankHex,
      descriptorAddress: bundle.descriptorAddress,
      graphicsAddress: bundle.graphicsAddress,
      graphicsAddressStatus: bundle.graphicsAddressStatus,
      graphicsBytes: bundle.graphicsBytes,
      graphicsTileCount: bundle.graphicsTileCount,
      graphicsHash: bundle.graphicsHash,
      side1TilemapAddress: bundle.side1TilemapAddress,
      side2TilemapAddress: bundle.side2TilemapAddress,
      images: bundle.images.map(image => ({
        side: image.side,
        phase: image.phase,
        file: image.publicFile,
        sha256: image.sha256,
        bbox: image.bbox,
        sourceRows: image.sourceRows,
        mapSize: image.mapSize,
      })),
      consumingCards: bundle.consumingCards.map(card => ({
        cardId: card.cardId,
        name: card.name,
        category: card.category,
        handler: card.handler,
        prefixOperand: card.prefixOperand,
        prefixSourceRows: card.prefixSourceRows,
        resultOperand: card.resultOperand,
        resultSourceRows: card.resultSourceRows,
        bundleRelation: card.bundleRelation,
        mapDeltaXIfPure: card.mapDeltaXIfPure,
      })),
    })), null, 2) + ' as const;',
    '',
  ].join('\n'));

  console.log(`ROM FX corpus: ${fxIds.length} offensive resources · ${bundles.length} bundles · ${completion.totals.sidePhaseRenders} renders · ${completion.totals.errors} errors`);
}

main();
