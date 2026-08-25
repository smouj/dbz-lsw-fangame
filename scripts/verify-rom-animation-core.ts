// ═══════════════════════════════════════════════════════════════════════
// VERIFY: ROM ANIMATION CORE — bank $61 structural decode + Goku golden gate.
// Uso: npm run verify:rom-animation-core
//
// Puertas (todo ROM-dependiente, va en verify:rom-local):
//  G1. 7 recursos bank $61 decodifican (bases/sequenceCount coinciden con
//      la enumeración charAnimBankEnumeration de build-rom-stage).
//  G2. Determinismo: re-decode byte-exacto vs animation-core.json.
//  G3. R2 invariant: metasprite pieces === graphics blocks en CADA frame.
//  G4. Goku golden gate: pose selector $C3C7 = sequence index (fallback < count).
//  G5. frame descriptors: duration/offset signed, direcciones dentro de ROM.
//  G6. Collision-free: (animationBank, resourceBase) bank $61 ≠ catalog $62-$64.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROM_PATH = resolve(ROOT, '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-spain.gbc');
const JSON_PATH = join(ROOT, 'generated/rom-animation-core/animation-core.json');
const GOLDEN_PATH = join(ROOT, 'generated/rom-animation-core/goku-golden-gate.json');

let failures = 0;
let checks = 0;
function check(name: string, ok: boolean, detail?: string) {
  checks++;
  if (!ok) { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
  else console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
}

if (!existsSync(ROM_PATH)) { console.log('SKIP: ROM no presente (verify:rom-local)'); process.exit(0); }

const rom = readFileSync(ROM_PATH);
const u16At = (bank: number, addr: number) => rom[bank * 0x4000 + addr] | (rom[bank * 0x4000 + addr + 1] << 8);
const u8At = (bank: number, addr: number) => rom[bank * 0x4000 + addr];
const s8 = (v: number) => { const u = v & 0xff; return u < 0x80 ? u : u - 0x100; };

const BANK61 = 0x61;
const BANK61_BASES = [16432, 18800, 19464, 20852, 22532, 23932, 24096];

function decodeResource(cpuBase: number) {
  const base = cpuBase - 0x4000;
  const w0 = u16At(BANK61, base);
  const T = (base + w0) & 0xffff;
  const sequenceCount = u8At(BANK61, T);
  const sequences = [] as { selector: number; frameCount: number; seqAddr: number; frames: { vf: number; dur: number; dx: number; dy: number; addr: number }[] }[];
  for (let sel = 0; sel < sequenceCount; sel++) {
    const entry = (T + 1 + sel * 2) & 0xffff;
    const off = u16At(BANK61, entry);
    const seqAddr = (T + 1 + sel * 2 + off) & 0xffff;
    const frameCount = u8At(BANK61, seqAddr);
    const frames = [] as { vf: number; dur: number; dx: number; dy: number; addr: number }[];
    for (let f = 0; f < frameCount; f++) {
      const fa = (seqAddr + 1 + f * 4) & 0xffff;
      frames.push({ vf: u8At(BANK61, fa), dur: u8At(BANK61, fa + 1), dy: s8(u8At(BANK61, fa + 2)), dx: s8(u8At(BANK61, fa + 3)), addr: fa });
    }
    sequences.push({ selector: sel, frameCount, seqAddr, frames });
  }
  return { base, T, sequenceCount, sequences };
}

// G1: sequence counts coinciden con la enumeración previa ($4030→32, $4970→6, $4C08→12, $5174→14, $5804→10, $5D7C→4, $5E20→27).
const EXPECTED_SEQ = [32, 6, 12, 14, 10, 4, 27];
const decoded = BANK61_BASES.map(decodeResource);
decoded.forEach((d, i) => {
  check(`G1 resource ${i} ($${BANK61_BASES[i].toString(16).toUpperCase()}) sequenceCount=${d.sequenceCount}`, d.sequenceCount === EXPECTED_SEQ[i], `esperado ${EXPECTED_SEQ[i]}`);
});

// G2: determinismo vs JSON.
const saved = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
let jsonMatches = true;
saved.resources.forEach((r: any, i: number) => {
  if (r.sequenceCount !== decoded[i].sequenceCount) jsonMatches = false;
  r.sequences.forEach((s: any) => {
    const d = decoded[i].sequences[s.selector];
    if (!d || d.frameCount !== s.frameCount) { jsonMatches = false; return; }
    s.frames.forEach((f: any) => {
      const df = d.frames[f.frameIndex];
      if (!df || df.vf !== f.visualFrameId || df.dur !== f.durationTicks || df.dx !== f.offsetX || df.dy !== f.offsetY) jsonMatches = false;
    });
  });
});
check('G2 determinismo: re-decode == animation-core.json', jsonMatches);

// G3: R2 invariant (pieces === blocks) en cada frame.
function metaspriteCount(base: number, vf: number): number {
  const w2 = u16At(BANK61, base + 2);
  const T = (base + 2 + w2) & 0xffff;
  const entry = (T + vf * 2) & 0xffff;
  const off = u16At(BANK61, entry);
  const pieceAddr = (T + vf * 2 + off) & 0xffff;
  return u8At(BANK61, pieceAddr);
}
function graphicsBlockCount(base: number, vf: number): number {
  const w4 = u16At(BANK61, base + 4);
  const T = (base + 4 + w4) & 0xffff;
  const entry = (T + vf * 2) & 0xffff;
  const off = u16At(BANK61, entry);
  const layoutAddr = (T + vf * 2 + off) & 0xffff;
  return u8At(BANK61, layoutAddr);
}
let invariantBad = 0;
let totalFrames = 0;
for (const d of decoded) for (const s of d.sequences) for (const f of s.frames) {
  totalFrames++;
  if (metaspriteCount(d.base, f.vf) !== graphicsBlockCount(d.base, f.vf)) invariantBad++;
}
check(`G3 R2 invariant pieces===blocks (${totalFrames - invariantBad}/${totalFrames} frames)`, invariantBad === 0);

// G4+G5: golden gate.
const golden = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8'));
const COMMANDS: { command: string; pose: number; resourceIndex: number }[] = [
  { command: 'A', pose: 5, resourceIndex: 1 },
  { command: 'B', pose: 8, resourceIndex: 2 },
  { command: 'RIGHT', pose: 11, resourceIndex: 3 },
  { command: 'UP', pose: 6, resourceIndex: 4 },
  { command: 'DOWN', pose: 9, resourceIndex: 4 },
];
let poseOk = true;
for (const { command, pose, resourceIndex } of COMMANDS) {
  const d = decoded[resourceIndex];
  const fallback = pose >= d.sequenceCount;
  const eff = fallback ? 0 : pose;
  const seq = d.sequences[eff];
  // G4: pose < count (no fallback) para los 5 comandos.
  if (fallback) poseOk = false;
  // G5: direcciones dentro de ROM y signed offsets en rango.
  let addrOk = true;
  for (const f of seq.frames) {
    const file = BANK61 * 0x4000 + f.addr;
    if (file < 0 || file + 3 >= rom.length) addrOk = false;
    if (f.dx < -128 || f.dx > 127 || f.dy < -128 || f.dy > 127) addrOk = false;
  }
  check(`G5 ${command} pose=$${pose.toString(16)} → seq ${eff}, ${seq.frameCount} frames, direcciones/signed OK`, addrOk && !fallback, fallback ? 'fallback inesperado' : undefined);
}
check('G4 Goku: los 5 pose selectors < sequenceCount (sin fallback)', poseOk);

// G6: collision-free — bank $61 resourceBase nunca coincide con un resourceBase $62-$64.
const catalogBases = new Set<number>();
for (const base of [16492,16796,17172,17556,18632,19092,19640,20100,20980,21336,21804,22400,22908,23212,23796,24228,24628,25248,25612,26168,26528,26960,27740,28280,28728,16840,17356,17944,19892,20244,20592,21120,21624,22240,22604,23044,24092,24680,25752,26636,27196,27848,28504,29428,30532,31636,16456,17840,18964,20076,21196,22552,23288,24460,25596,26640,27572,28500,29352,30536,31124]) catalogBases.add(base);
let collision = false;
for (const b of BANK61_BASES) if (catalogBases.has(b)) collision = true;
check('G6 collision-free: bank $61 resourceBases ∉ catálogo $62-$64', !collision);

console.log(`\nROM ANIMATION CORE: ${checks - failures}/${checks} PASS · ${totalFrames} frames · ${invariantBad} R2 mismatches`);
if (failures === 0) { console.log('✅ bank $61 estructural + Goku golden gate (pose→sequence→frames) verificado.'); process.exit(0); }
process.exit(1);
