/**
 * verify-chara-motion.ts — C1 CHARA ENTRY/EXIT: verificación headless del
 * contrato ROM de motion discreta.
 *
 * Valida las duraciones exactas y la integración determinista por tick:
 *   - CHARA_EXIT  = 43t (28t motion + 15t hold), -98px
 *   - CHARA_ENTRY = 32t (19t entry + 5t hold + 8t settle), +98px neto
 *   - positionFromSegments es pura en `elapsed` (sin drift por Hz)
 *   - mirror por lado correcto
 */
import {
  CHARA_EXIT,
  CHARA_ENTRY,
  CHARA_EXIT_MOTION_SEGMENTS,
  CHARA_ENTRY_MOTION_SEGMENTS,
  ROM_CHARA_EXIT_MOTION,
  ROM_CHARA_ENTRY_MOTION,
  type RomDiscreteMotion,
} from '../src/battle/engine/rom/romDescriptors';
import {
  positionFromSegments,
  segmentsTotalTicks,
  segmentsNetDelta,
  type RomMotionSegment,
} from '../src/battle/romMotionMath';

let pass = 0;
let fail = 0;

function check(label: string, cond: boolean, detail?: string): void {
  if (cond) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function mirror(m: RomDiscreteMotion): RomMotionSegment[] {
  return m.segments.map((s) => ({ dxPerTick: -s.dxPerTick, dyPerTick: -s.dyPerTick, ticks: s.ticks }));
}

console.log('C1 CHARA MOTION — verify-chara-motion\n');

// ── A. CHARA_EXIT exact duration = 43t ──
const exitTicks = segmentsTotalTicks(ROM_CHARA_EXIT_MOTION.segments);
const exitDelta = segmentsNetDelta(ROM_CHARA_EXIT_MOTION.segments);
check('A. CHARA_EXIT duration = 43t', exitTicks === 43, `got ${exitTicks}`);
check('A. CHARA_EXIT descriptor.totalTicks = 43', CHARA_EXIT.totalTicks === 43, `got ${CHARA_EXIT.totalTicks}`);
check('A. CHARA_EXIT net delta = -98px', exitDelta.x === -98, `got ${exitDelta.x}`);

// ── C. EXIT movement = 28t + hold = 15t ──
const exitMotionTicks = segmentsTotalTicks(CHARA_EXIT_MOTION_SEGMENTS);
const exitMotionDelta = segmentsNetDelta(CHARA_EXIT_MOTION_SEGMENTS);
check('C. EXIT motion segments = 28t', exitMotionTicks === 28, `got ${exitMotionTicks}`);
check('C. EXIT motion delta = -98px', exitMotionDelta.x === -98, `got ${exitMotionDelta.x}`);
const exitHold = ROM_CHARA_EXIT_MOTION.segments[ROM_CHARA_EXIT_MOTION.segments.length - 1];
check('C. EXIT hold = 15t (dx=0)', exitHold.ticks === 15 && exitHold.dxPerTick === 0, `got ticks=${exitHold.ticks} dx=${exitHold.dxPerTick}`);

// ── B. CHARA_ENTRY exact duration = 32t (CORRECCIÓN: no 13t) ──
const entryTicks = segmentsTotalTicks(ROM_CHARA_ENTRY_MOTION.segments);
const entryDelta = segmentsNetDelta(ROM_CHARA_ENTRY_MOTION.segments);
check('B. CHARA_ENTRY duration = 32t', entryTicks === 32, `got ${entryTicks}`);
check('B. CHARA_ENTRY descriptor.totalTicks = 32', CHARA_ENTRY.totalTicks === 32, `got ${CHARA_ENTRY.totalTicks}`);
check('B. CHARA_ENTRY net delta = +98px', entryDelta.x === 98, `got ${entryDelta.x}`);
const entryMotionTicks = segmentsTotalTicks(CHARA_ENTRY_MOTION_SEGMENTS);
const entryMotionDelta = segmentsNetDelta(CHARA_ENTRY_MOTION_SEGMENTS);
check('B. ENTRY motion segments = 19t', entryMotionTicks === 19, `got ${entryMotionTicks}`);
check('B. ENTRY motion delta = +106px', entryMotionDelta.x === 106, `got ${entryMotionDelta.x}`);
const entryHold = ROM_CHARA_ENTRY_MOTION.segments[5];
const entrySettle = ROM_CHARA_ENTRY_MOTION.segments[6];
check('B. ENTRY hold = 5t (dx=0)', entryHold.ticks === 5 && entryHold.dxPerTick === 0, `got ticks=${entryHold.ticks} dx=${entryHold.dxPerTick}`);
check('B. ENTRY settle = -8px/8t', entrySettle.ticks === 8 && entrySettle.dxPerTick === -1, `got ticks=${entrySettle.ticks} dx=${entrySettle.dxPerTick}`);

// ── D/E/I. Determinismo: positionFromSegments pura en elapsed ──
const exitSegs = ROM_CHARA_EXIT_MOTION.segments as RomMotionSegment[];
const p0 = positionFromSegments(exitSegs, 0);
const p28 = positionFromSegments(exitSegs, 28);
const p42 = positionFromSegments(exitSegs, 42);
const p43 = positionFromSegments(exitSegs, 43);
check('D. elapsed=0 → x=0, no done', p0.x === 0 && !p0.done, JSON.stringify(p0));
check('D. elapsed=28 → x=-98 (fin motion), aún hold', p28.x === -98 && !p28.done, JSON.stringify(p28));
check('D. elapsed=42 → x=-98 (hold estable)', p42.x === -98 && !p42.done, JSON.stringify(p42));
check('D. elapsed=43 → x=-98, done', p43.x === -98 && p43.done, JSON.stringify(p43));
// Replay determinista: mismas llamadas → mismos resultados.
const p10a = positionFromSegments(exitSegs, 10);
const p10b = positionFromSegments(exitSegs, 10);
check('I. replay determinista (elapsed=10 idempotente)', p10a.x === p10b.x && p10a.done === p10b.done, `${p10a.x} vs ${p10b.x}`);
// Sin drift fraccional: cada step acumula múltiplos enteros de dxPerTick.
check('E. no drift fraccional (x entero en todos los ticks)', Array.from({ length: 44 }, (_, e) => positionFromSegments(exitSegs, e).x).every((x) => Number.isInteger(x)));

// ── F. Mirror por lado ──
const exitMirror = mirror(ROM_CHARA_EXIT_MOTION);
const entryMirror = mirror(ROM_CHARA_ENTRY_MOTION);
check('F. EXIT mirrored delta = +98px (lado contrario)', segmentsNetDelta(exitMirror).x === 98, `got ${segmentsNetDelta(exitMirror).x}`);
check('F. ENTRY mirrored delta = -98px (lado contrario)', segmentsNetDelta(entryMirror).x === -98, `got ${segmentsNetDelta(entryMirror).x}`);
check('F. EXIT mirrored duration = 43t', segmentsTotalTicks(exitMirror) === 43);

// ── Simetría EXIT/ENTRY ──
check('simetría: EXIT -98px ↔ ENTRY +98px', exitDelta.x === -entryDelta.x);

console.log(`\n${pass} PASS · ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
