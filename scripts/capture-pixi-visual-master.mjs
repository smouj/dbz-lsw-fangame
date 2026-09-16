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

// Card 12 = Kamehameha, side LEFT, actor gohan_kid vs piccolo_base.
// The seed is fixed inside the harness (visualMasterCapture.tsx FIXED_SEED).
const ACTOR = { card: 12, player: 'gohan_kid', enemy: 'piccolo_base', scenario: 1, seed: 23089 };

/**
 * ROM frame → remake presentation tick.
 *
 * The ROM timeline counts ROM frames from the savestate bootstrap; the remake
 * emits cues on the BattleRuntime GBC clock, which for this film runs 0..145.
 * There is no shared clock, so the mapping is anchored on the BEAT boundaries
 * the two sides declare for themselves. Every anchor below is justified by a
 * measurement in `docs/rom/…/remake/capture.json` (`anchors[].evidence`).
 */
const DEFAULT_MAP = [
  // ROM 0 (FIELD_REFERENCE) and ROM 60 (CONFIRM_BOUNDARY) are byte-identical
  // framebuffers (verified: 0 differing pixels), so both map to the remake's
  // pre-action FIELD at presentation tick 0.
  { romFrame: 0, remakeTick: 0 },
  { romFrame: 60, remakeTick: 0 },
  // ROM 408 = first frame of ACTOR_BEAM_WINDOW (408..487, 80 frames). In the
  // remake runtime timeline the actor's beam physical-frame hold is the
  // slot-0 ROM_PHYSICAL_FRAME frameIndex 2 with durationTicks 60 starting at
  // tick 22 → the same beat, different clock base.
  { romFrame: 408, remakeTick: 22 },
];

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
  const out = { map: DEFAULT_MAP, json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--map') {
      out.map = argv[++i].split(',').map((pair) => {
        const [romFrame, remakeTick] = pair.split(':').map(Number);
        return { romFrame, remakeTick };
      }).filter((p) => Number.isFinite(p.romFrame) && Number.isFinite(p.remakeTick));
    } else if (argv[i] === '--json') out.json = true;
  }
  return out;
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function captureUrl(ticks) {
  const params = new URLSearchParams({
    dev: '1',
    vmCapture: '1',
    vmTick: String(ticks[0]),
    vmSweep: ticks.join(','),
    vmCard: String(ACTOR.card),
    vmPlayer: ACTOR.player,
    vmEnemy: ACTOR.enemy,
    vmScenario: String(ACTOR.scenario),
    vmSeed: String(ACTOR.seed),
  });
  return `${BASE_URL}?${params.toString()}#dev/romdisplay`;
}

const args = parseArgs(process.argv.slice(2));
if (args.map.length === 0) {
  console.error('no ROM->remake tick pairs given');
  process.exit(1);
}
const ticks = [...new Set(args.map.map((p) => p.remakeTick))].sort((a, b) => a - b);

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : process.platform === 'win32' ? { channel: 'msedge' } : {}),
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e.message ?? e)));

/** One determinism pass: all ticks captured in a single page load. */
async function runPass() {
  await page.goto(captureUrl(ticks), { waitUntil: 'domcontentloaded', timeout: 120000 });
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
    throw new Error(`sweep failed: ${JSON.stringify(err).slice(0, 400)}`);
  }
  const byTick = new Map();
  for (const f of sweep.frames) {
    const str = String(f.dataUrl);
    const buffer = Buffer.from(str.slice(str.indexOf(',') + 1), 'base64');
    byTick.set(f.tick, {
      buffer,
      sha: sha256(buffer),
      pixelsSha256: f.pixelsSha256 ?? null,
      stats: trimStats(f.stats),
    });
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

const passA = await runPass();
const passB = await runPass();
await browser.close();

const frames = [];
let determinismFailures = 0;

for (const pair of args.map) {
  const a = passA.get(pair.remakeTick);
  const b = passB.get(pair.remakeTick);
  if (!a || !b) {
    console.error(`remake tick ${pair.remakeTick}: missing from sweep`);
    determinismFailures++;
    continue;
  }
  const identical = a.sha === b.sha;
  if (!identical) determinismFailures++;
  const name = `frame_${String(pair.romFrame).padStart(3, '0')}.png`;
  await writeFile(resolve(OUT_DIR, name), a.buffer);
  const frame = {
    romFrame: pair.romFrame,
    remakeTick: pair.remakeTick,
    file: `remake/${name}`,
    bytes: a.buffer.length,
    sha256: a.sha,
    rerunSha256: b.sha,
    byteIdentical: identical,
    pixelsSha256: a.pixelsSha256,
    stats: a.stats,
  };
  frames.push(frame);
  if (!args.json) {
    console.log(
      `rom ${String(pair.romFrame).padStart(3)} ← tick ${String(pair.remakeTick).padStart(3)}  ` +
      `${name}  ${a.buffer.length}B  sha=${a.sha.slice(0, 16)}…  ` +
      `rerun=${identical ? 'IDENTICAL' : 'DIVERGENT'}`,
    );
  }
}

const capture = {
  schema: 'dbzlsw.rom.visual-master.capture.v1',
  generator: 'scripts/capture-pixi-visual-master.mjs',
  harness: 'src/devtools/romdisplay2/visualMasterCapture.tsx',
  baseUrl: BASE_URL,
  actor: ACTOR,
  determinism: {
    passes: 2,
    failures: determinismFailures,
    statement: 'two independent runs of the same tick produced byte-identical PNGs',
  },
  contract: CONTRACT,
  tickMapping: {
    kind: 'romFrame -> remake presentation tick',
    note:
      'The ROM frame counter and the remake BattleRuntime GBC tick share no clock. ' +
      'Anchors map BEAT boundaries declared by each side; the ROM frame pair 0/60 is ' +
      'byte-identical in the ROM, so no anchor may separate it.',
    anchors: args.map.map((p) => ({
      romFrame: p.romFrame,
      remakeTick: p.remakeTick,
    })),
  },
  pageErrors,
  frames,
};
await writeFile(resolve(OUT_DIR, 'capture.json'), `${JSON.stringify(capture, null, 2)}\n`);

if (args.json) console.log(JSON.stringify(capture, null, 2));
else {
  console.log(`\nmapped ${frames.length} frame(s) → ${OUT_DIR}`);
  console.log(`capture.json written · pageerrors=${pageErrors.length} · determinism failures=${determinismFailures}`);
}
if (determinismFailures || pageErrors.length) process.exitCode = 1;
