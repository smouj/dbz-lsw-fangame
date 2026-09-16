import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = resolve(ROOT, 'docs/rom/generated/visual-master/kamehameha-left');
const ROM_FRAMES_DIR = join(OUT_DIR, 'rom');
const SCANLINE_FIXTURE = resolve(ROOT, 'fixtures/rom-trace/beam-kame-left-scanline.json');
const ACTION_TRACE = resolve(ROOT, 'tools/rom-trace/r31a/artifacts/kame-trace-01.json');
const BOOTSTRAP_STATE = resolve(ROOT, 'tools/rom-trace/r31a/artifacts/kame_left_base.ss0');
const OUTPUT = join(OUT_DIR, 'timeline.json');

const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const frameNumber = (name: string) => Number(name.match(/^frame_(\d+)\.png$/)?.[1] ?? NaN);

// ── Remake (Pixi) capture fold ──────────────────────────────────────────
// The remake side is written ONLY by scripts/capture-pixi-visual-master.mjs
// (remake/capture.json + remake/frame_NNN.png). This builder never generates
// remake pixels: with no capture present the frames stay PENDING explicitly.
const REMAKE_MANIFEST = join(OUT_DIR, 'remake/capture.json');
interface RemakeFrameEntry {
  romFrame: number;
  remakeTick: number;
  file: string;
  sha256: string;
  byteIdentical: boolean;
  pixelsSha256: string | null;
}
interface RemakeCapture {
  schema: string;
  generator: string;
  harness: string;
  actor: Record<string, unknown>;
  determinism: { passes: number; failures: number; statement: string };
  contract: Record<string, unknown>;
  tickMapping: Record<string, unknown>;
  pageErrors?: string[];
  frames: RemakeFrameEntry[];
}

let remakeCapture: RemakeCapture | null = null;
if (existsSync(REMAKE_MANIFEST)) {
  const raw = readJson(REMAKE_MANIFEST) as RemakeCapture;
  if (raw.schema !== 'dbzlsw.rom.visual-master.capture.v1') {
    throw new Error(`Unknown remake capture schema: ${raw.schema}`);
  }
  // Hash every remake PNG here: the manifest records what the capturer wrote,
  // the builder records what is actually on disk for each frame.
  const byRomFrame = new Map<number, RemakeFrameEntry>();
  for (const entry of raw.frames) {
    const file = resolve(OUT_DIR, entry.file);
    if (!existsSync(file)) throw new Error(`Remake capture missing: ${entry.file}`);
    const png = readFileSync(file);
    if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
      throw new Error(`Remake capture is not a PNG: ${entry.file}`);
    }
    if (sha256(png) !== entry.sha256) {
      throw new Error(`Remake capture hash drift: ${entry.file}`);
    }
    byRomFrame.set(entry.romFrame, entry);
  }
  remakeCapture = { ...raw, frames: [...byRomFrame.values()] };
}

const scanline = readJson(SCANLINE_FIXTURE);
const actionTrace = readJson(ACTION_TRACE);
const traceByFrame = new Map(actionTrace.frames.map((frame: any) => [frame.frame, frame]));
const scanlineByFrame = new Map(scanline.observed.frames.map((frame: any) => [frame.frame, frame]));

const phaseFor = (frame: number) => {
  if (frame === 0) return 'FIELD_REFERENCE';
  if (frame === 60) return 'CONFIRM_BOUNDARY';
  if (frame >= 408 && frame <= 487) return 'ACTOR_BEAM_WINDOW';
  if (frame === 488) return 'SCREEN_RESTORE';
  if (frame >= 644 && frame <= 659) return 'PROJECTILE_TRAVEL';
  if (frame === 660) return 'SCREEN_RESTORE';
  return 'UNCLASSIFIED';
};

const pngFiles = readdirSync(ROM_FRAMES_DIR)
  .filter((name) => /^frame_\d+\.png$/.test(name))
  .sort((a, b) => frameNumber(a) - frameNumber(b));

if (pngFiles.length === 0) throw new Error(`No ROM frames in ${ROM_FRAMES_DIR}`);
const bootstrapSha = sha256(readFileSync(BOOTSTRAP_STATE));
if (bootstrapSha !== scanline.source.bootstrapStateSha256) {
  throw new Error(`Bootstrap hash mismatch: ${bootstrapSha} != ${scanline.source.bootstrapStateSha256}`);
}

/** Remake side of one ROM frame. PENDING unless a real capture exists. */
const remakeFor = (frame: number) => {
  const entry = remakeCapture?.frames.find((candidate) => candidate.romFrame === frame) ?? null;
  if (!entry) {
    return {
      status: 'PENDING_REMAKE_CAPTURE',
      image: null,
      imageSha256: null,
      remakeTick: null,
    };
  }
  return {
    status: 'CAPTURED',
    image: entry.file,
    imageSha256: entry.sha256,
    pixelsSha256: entry.pixelsSha256,
    remakeTick: entry.remakeTick,
    byteIdenticalOnRerun: entry.byteIdentical,
  };
};

const frames = pngFiles.map((file) => {
  const frame = frameNumber(file);
  const png = readFileSync(join(ROM_FRAMES_DIR, file));
  const trace: any = traceByFrame.get(frame) ?? null;
  const raster: any = scanlineByFrame.get(frame) ?? null;
  return {
    frame,
    phase: phaseFor(frame),
    romImage: `rom/${file}`,
    romImageSha256: sha256(png),
    actionObjects: trace?.actionObjects ?? null,
    activeObject: trace?.activeObject ?? null,
    drawOrderFlag: trace?.drawOrderFlag ?? null,
    display: trace?.display ?? null,
    scroll: raster ? {
      C405: raster.C405,
      C406: raster.C406,
      C407: raster.C407,
      C409: raster.C409,
      bands: raster.bands,
    } : trace?.scroll ?? null,
    animationSlots: trace?.slots ?? null,
    remake: remakeFor(frame),
  };
});

const output = {
  schema: 'dbzlsw.rom.visual-master.v1',
  id: 'kamehameha-left',
  label: 'Kamehameha · LEFT / SIDE_1',
  cardId: scanline.source.cardId,
  cardName: scanline.source.cardName,
  side: scanline.source.side,
  source: {
    rom: scanline.source.rom,
    romSha256: scanline.source.romSha256,
    emulator: scanline.source.emulator,
    emulatorVersion: scanline.source.emulatorVersion,
    driver: 'tools/rom-trace/rom-driver.c shot',
    bootstrapState: 'tools/rom-trace/r31a/artifacts/kame_left_base.ss0',
    bootstrapStateSha256: bootstrapSha,
    identityRebind: {
      tool: 'tools/rom-trace/rebind-savestate-rom-identity.mjs',
      targetRomSha256: scanline.source.romSha256,
      scope: 'mGBA gbAs ROM identity bytes $04..$1f only',
      gameplayPayload: 'byte-identical to bootstrap outside identity bytes',
    },
    scanlineFixture: 'fixtures/rom-trace/beam-kame-left-scanline.json',
    rawActionTrace: 'tools/rom-trace/r31a/artifacts/kame-trace-01.json',
  },
  coverage: {
    capturedFrames: frames.length,
    ranges: [[0, 0], [60, 60], [408, 488], [644, 660]],
    activeFrameRanges: scanline.observed.activeFrameRanges,
    restoreFrames: scanline.observed.restoreFrames,
    remakeCapturedFrames: frames.filter((frame) => frame.remake.image).length,
  },
  ...(remakeCapture ? {
    remakeCapture: {
      schema: remakeCapture.schema,
      generator: remakeCapture.generator,
      harness: remakeCapture.harness,
      actor: remakeCapture.actor,
      determinism: remakeCapture.determinism,
      contract: remakeCapture.contract,
      tickMapping: remakeCapture.tickMapping,
      pageErrors: remakeCapture.pageErrors ?? [],
    },
  } : {}),
  frames,
};

writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(`ROM Visual Master: ${basename(OUT_DIR)} · ${frames.length} ROM frames · ${OUTPUT}`);
