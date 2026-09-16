#!/usr/bin/env node
/**
 * capture-pixi-visual-master.mjs
 * ═══════════════════════════════════════════════════════════════════════
 * Deterministic Pixi capture for the ROM Visual Master (Kamehameha · LEFT).
 *
 * Browser side: src/devtools/romdisplay2/visualMasterCapture.tsx — boots the
 * REAL BattleRuntime (fixed seed + deck), replays its production cue timeline
 * through ProductionRomPresentationAdapter with NO wall clock and NO rAF, and
 * renders exactly ONE frame per tick.
 *
 * This script:
 *   · drives that route (one page load per determinism pass),
 *   · writes `remake/frame_<romFrame>.png` for every mapped pair,
 *   · writes `remake/capture.json`: the EXPLICIT coordinate/scale contract and
 *     the ROM-frame → remake-presentation-tick mapping,
 *   · re-runs everything and asserts byte-identical PNGs (determinism).
 *
 * It never writes the ROM side (rom/, ROM hashes, source, coverage.ranges).
 *
 * Usage:
 *   npm run dev                                    # in another terminal
 *   node scripts/capture-pixi-visual-master.mjs [--map 0:0,60:0,408:22] [--json]
 * ENV:
 *   UI_BASE_URL  (default http://127.0.0.1:5178/)
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE (optional; else Win32 channel fallback)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const MASTER_DIR = resolve(ROOT, 'docs/rom/generated/visual-master/kamehameha-left');
const OUT_DIR = resolve(MASTER_DIR, 'remake');
const BASE_URL = process.env.UI_BASE_URL || 'http://127.0.0.1:5178/';

// Card 12 = Kamehameha, side LEFT.
// `form` is a roster FORM id (gohan_young); the CHARACTER id (gohan_kid) is
// derived from the form by the harness, exactly as production does. Passing the
// character id here left the actor without a ROM physical profile and made the
// film emit ROM_PENDING instead of physical frames.
const ACTOR = { card: 12, form: 'gohan_young', character: 'gohan_kid', enemy: 'piccolo_base', scenario: 1, seed: 23089 };

/**
 * ROM frame → remake presentation tick.
 *
 * The ROM frame counter (savestate-relative) and the remake BattleRuntime GBC
 * tick share no base, so the mapping is a declared, piecewise-linear offset
 * table anchored on the beat each side declares for the same phase. Every
 * segment advances 1:1 because both sides count GBC frames (~59.73 Hz); no
 * anchor is interpolated across a phase boundary the remake does not model.
 *
 * `counterpart` records whether the remake film actually declares a beat for
 * that ROM phase. NO_REMAKE_BEAT frames are still captured (never substituted)
 * and are expected to diverge — that divergence IS the measurement.
 */
const SEGMENTS = [
  // rom frame, remake tick, phase, counterpart
  { rom: 0, tick: 0, phase: 'FIELD_REFERENCE', counterpart: 'ANCHORED' },
  { rom: 60, tick: 0, phase: 'CONFIRM_BOUNDARY', counterpart: 'ANCHORED' },
  // slot-0 beam physical-frame hold starts at 22 (phase-1 anchor, accepted).
  { rom: 408, tick: 22, phase: 'ACTOR_BEAM_WINDOW', counterpart: 'ANCHORED' },
  { rom: 488, tick: 102, phase: 'SCREEN_RESTORE', counterpart: 'DERIVED' },
  // 644..660 is NOT the attacker's film: the ROM there shows a visible scrolling
  // plane (matches scenarios/special_action.png at 8.3% vs 36.0% for 01_action.png)
  // while 408..487 is a blank plane. It belongs to another route (defender/result),
  // so it carries no comparable remake tick and leaves the comparable set.
  // LABEL ONLY — nothing is routed by this change.
  { rom: 644, tick: null, phase: 'OTHER_ROUTE', counterpart: 'OTHER_ROUTE' },
  { rom: 660, tick: null, phase: 'OTHER_ROUTE', counterpart: 'OTHER_ROUTE' },
];

const PHASE_FOR = (romFrame) => {
  if (romFrame === 0) return 'FIELD_REFERENCE';
  if (romFrame === 60) return 'CONFIRM_BOUNDARY';
  if (romFrame >= 408 && romFrame <= 487) return 'ACTOR_BEAM_WINDOW';
  if (romFrame === 488) return 'SCREEN_RESTORE';
  if (romFrame >= 644 && romFrame <= 659) return 'PROJECTILE_TRAVEL';
  if (romFrame === 660) return 'SCREEN_RESTORE';
  return 'UNCLASSIFIED';
};

/** The full captured frame set, exactly as timeline.json declares it. */
function defaultRomFrames() {
  return [0, 60, ...Array.from({ length: 81 }, (_, i) => 408 + i), ...Array.from({ length: 17 }, (_, i) => 644 + i)];
}

function mapRomToRemakeTick(romFrame) {
  let segment = SEGMENTS[0];
  for (const candidate of SEGMENTS) {
    if (candidate.rom <= romFrame) segment = candidate;
  }
  // OTHER_ROUTE segments declare no comparable remake beat.
  if (segment.tick === null) return null;
  return segment.tick + (romFrame - segment.rom);
}

function buildMap(romFrames) {
  return romFrames.map((romFrame) => {
    const remakeTick = mapRomToRemakeTick(romFrame);
    const segment = [...SEGMENTS].reverse().find((candidate) => candidate.rom <= romFrame) ?? SEGMENTS[0];
    return {
      romFrame,
      remakeTick,
      // phase label follows the segment that owns the frame
      phase: segment.tick === null ? segment.phase : PHASE_FOR(romFrame),
      counterpart: segment.counterpart,
    };
  });
}

// Coordinate/scale contract (see docs — the highest-risk item).
const CONTRACT = {
  romNative: { width: 160, height: 144 },
  romWorldCrop: { x: 0, y: 24, width: 160, height: 80 },
  remakeOutput: { width: 320, height: 180 },
  remakeWorldCrop: { x: 0, y: 10, width: 320, height: 160 },
  compareScale: 0.5,
  compareWidth: 160,
  compareHeight: 80,
  compareSpace: 'gbc-5bit',
  note:
    'ROM reference is the native 160x144 framebuffer; its battle world is rows ' +
    '24..103 (80 rows, ACTION_NATIVE_H). The remake output is 320x180 with the ' +
    'ROM world 320x160 centred at output y=10 (BATTLE_OUTPUT_Y). Comparison ' +
    'downscales the remake world crop x0.5 to 160x80 and quantises both sides ' +
    'to GBC 5-bit colour, which removes the 5-bit->8-bit expansion convention ' +
    'difference (ROM PNGs use round(v*255/31); the remake uses v<<3).',
};

function parseArgs(argv) {
  const out = { romFrames: defaultRomFrames(), json: false, batch: 25 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--rom-frames') {
      out.romFrames = argv[++i].split(',').map(Number).filter(Number.isFinite);
    } else if (argv[i] === '--batch') {
      out.batch = Math.max(1, Number(argv[++i]) || 25);
    } else if (argv[i] === '--json') out.json = true;
  }
  return out;
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function captureUrl(batchTicks) {
  const params = new URLSearchParams({
    dev: '1',
    vmCapture: '1',
    vmTick: String(batchTicks[0]),
    vmSweep: batchTicks.join(','),
    vmCard: String(ACTOR.card),
    vmForm: ACTOR.form,
    vmPlayer: ACTOR.form,
    vmEnemy: ACTOR.enemy,
    vmScenario: String(ACTOR.scenario),
    vmSeed: String(ACTOR.seed),
  });
  return `${BASE_URL}?${params.toString()}#dev/romdisplay`;
}

const args = parseArgs(process.argv.slice(2));
const map = buildMap(args.romFrames);
if (map.length === 0) {
  console.error('no ROM frames to capture');
  process.exit(1);
}
// Frames whose segment declares no comparable remake beat leave the comparable
// set explicitly (recorded, counted, never silently dropped or substituted).
const comparable = map.filter((pair) => pair.remakeTick !== null);
const excluded = map.filter((pair) => pair.remakeTick === null);
const ticks = [...new Set(comparable.map((p) => p.remakeTick))].sort((a, b) => a - b);
const batches = [];
for (let i = 0; i < ticks.length; i += args.batch) batches.push(ticks.slice(i, i + args.batch));

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : process.platform === 'win32' ? { channel: 'msedge' } : {}),
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e.message ?? e)));

/** One determinism pass: every tick captured, in batches of BATCH page loads. */
async function runPass(label) {
  const byTick = new Map();
  for (const [index, batch] of batches.entries()) {
    await page.goto(captureUrl(batch), { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(
      () => {
        const s = window.__VISUAL_MASTER_SWEEP__;
        const r = window.__VISUAL_MASTER_CAPTURE__;
        return (!!s && s.status === 'ok') || (!!r && r.status === 'error');
      },
      null,
      { timeout: 600000 },
    );
    const sweep = await page.evaluate(() => window.__VISUAL_MASTER_SWEEP__);
    if (!sweep) {
      const err = await page.evaluate(() => window.__VISUAL_MASTER_CAPTURE__);
      for (const tick of batch) byTick.set(tick, { error: `sweep aborted: ${JSON.stringify(err).slice(0, 200)}` });
      continue;
    }
    for (const f of sweep.frames) {
      if (f.error || !f.dataUrl) {
        byTick.set(f.tick, { error: f.error ?? 'no dataUrl' });
        continue;
      }
      const str = String(f.dataUrl);
      const buffer = Buffer.from(str.slice(str.indexOf(',') + 1), 'base64');
      byTick.set(f.tick, {
        buffer,
        sha: sha256(buffer),
        pixelsSha256: f.pixelsSha256 ?? null,
        opaquePixels: f.opaquePixels ?? null,
        stats: trimStats(f.stats),
      });
    }
    const failed = batch.filter((tick) => byTick.get(tick)?.error);
    console.log(`  pass ${label} batch ${index + 1}/${batches.length}: ${batch.length} ticks, ${failed.length} failed`);
  }
  return byTick;
}

/** Keep the presentation-adapter readout that explains a capture. */
function trimStats(stats) {
  if (!stats) return null;
  const keys = [
    'source', 'cuesTotal', 'cuesConsumed', 'visibleEffects', 'displayEffects', 'traceCues',
    'pendingCues', 'pendingReasons', 'sceneChanges', 'scenePrepares', 'physicalFrames',
    'physicalFrameSources', 'lastPhysicalFrame', 'impacts', 'fxWindows', 'romSequenceBySlot',
  ];
  const out = {};
  for (const key of keys) if (stats[key] !== undefined) out[key] = stats[key];
  return out;
}

const passA = await runPass('A');
const passB = await runPass('B');
await browser.close();

const frames = [];
const failures = [];
let verified = 0;

for (const pair of comparable) {
  const a = passA.get(pair.remakeTick);
  const b = passB.get(pair.remakeTick);
  const base = {
    romFrame: pair.romFrame,
    remakeTick: pair.remakeTick,
    phase: pair.phase,
    counterpart: pair.counterpart,
  };
  if (!a || a.error || !b || b.error) {
    // Never substitute a neighbour frame or a manual PNG: the failure is the record.
    const error = a?.error ?? b?.error ?? 'missing from sweep';
    failures.push({ ...base, status: 'CAPTURE_FAILED', error });
    console.error(`rom ${pair.romFrame}: CAPTURE_FAILED — ${error}`);
    continue;
  }
  const identical = a.sha === b.sha;
  verified++;
  if (!identical) failures.push({ ...base, status: 'NONDETERMINISTIC', error: `${a.sha} != ${b.sha}` });
  const name = `frame_${String(pair.romFrame).padStart(3, '0')}.png`;
  await writeFile(resolve(OUT_DIR, name), a.buffer);
  frames.push({
    ...base,
    status: identical ? 'CAPTURED' : 'CAPTURED_NONDETERMINISTIC',
    file: `remake/${name}`,
    bytes: a.buffer.length,
    sha256: a.sha,
    rerunSha256: b.sha,
    byteIdentical: identical,
    pixelsSha256: a.pixelsSha256,
    opaquePixels: a.opaquePixels,
    stats: a.stats,
  });
}

const determinismFailures = failures.filter((f) => f.status !== 'CAPTURE_FAILED').length;
if (!args.json) {
  const wobble = frames.filter((f) => !f.byteIdentical).map((f) => f.remakeTick);
  console.log(
    `\ncaptured ${frames.length}/${comparable.length} comparable frames · byte-identical ${verified}/${comparable.length}` +
    (wobble.length ? ` · DIVERGENT ticks: ${wobble.join(',')}` : '') +
    `\nexcluded by mapping (OTHER_ROUTE): ${excluded.length} frames` +
    (excluded.length ? ` — rom ${excluded[0].romFrame}..${excluded[excluded.length - 1].romFrame}` : ''),
  );
}

const capture = {
  schema: 'dbzlsw.rom.visual-master.capture.v1',
  generator: 'scripts/capture-pixi-visual-master.mjs',
  harness: 'src/devtools/romdisplay2/visualMasterCapture.tsx',
  baseUrl: BASE_URL,
  actor: ACTOR,
  determinism: {
    passes: 2,
    framesVerified: verified,
    framesExpected: comparable.length,
    failures: determinismFailures,
    statement: 'two independent runs of every comparable mapped tick produced byte-identical PNGs (full set, not a sample)',
  },
  comparableSet: {
    frames: comparable.length,
    excludedByMapping: {
      frames: excluded.length,
      counterpart: 'OTHER_ROUTE',
      romRanges: excluded.length ? [[excluded[0].romFrame, excluded[excluded.length - 1].romFrame]] : [],
    },
  },
  contract: CONTRACT,
  tickMapping: {
    kind: 'romFrame -> remake presentation tick (piecewise 1:1 GBC-frame offset table)',
    note:
      'The ROM frame counter (savestate-relative) and the remake BattleRuntime GBC tick share no clock. ' +
      'Each segment anchors a ROM phase on the beat the remake declares for the same phase and advances 1:1 ' +
      'because both sides count GBC frames. Frames whose phase has NO_REMAKE_BEAT are still captured and are ' +
      'expected to diverge — that divergence is the measurement, not an artifact.',
    segments: SEGMENTS.map((segment) => ({
      romFrom: segment.rom,
      phase: segment.phase,
      remakeTickFrom: segment.tick,
      counterpart: segment.counterpart,
    })),
    anchors: comparable.map((p) => ({ romFrame: p.romFrame, remakeTick: p.remakeTick, phase: p.phase })),
  },
  pageErrors,
  failures,
  frames,
};
await writeFile(resolve(OUT_DIR, 'capture.json'), `${JSON.stringify(capture, null, 2)}\n`);

if (args.json) console.log(JSON.stringify(capture, null, 2));
else {
  console.log(`capture.json written → ${OUT_DIR}`);
  console.log(`pageerrors=${pageErrors.length} · determinism failures=${determinismFailures} · capture failures=${failures.filter((f) => f.status === 'CAPTURE_FAILED').length}`);
}
if (failures.length || pageErrors.length) process.exitCode = 1;
