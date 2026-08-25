// ═══════════════════════════════════════════════════════════════════════
// BUILD: ROM ANIMATION CORE — bank $61 (standing/basic) full structural decode
// + Goku Base golden gate (command → pose → sequence → frames).
//
// Uso: npm run build:rom-animation-core
//
// Esto CIERRA el último enlace de la cadena P0.4S ($CA0D → physicalId):
//   $CA0D[c] descriptor → (animationBank, resourceBase)  [Call_000_0b8d]
//   $C3C7 pose selector = sequence index                   [Call_000_0b16]
//   $C3D0 frame index                                       [Call_000_0b16]
//   resource base → +0 secuencias → frame [vfid][dur][dY][dX]
//
// Emite:
//   generated/rom-animation-core/animation-core.json      (7 resources $61)
//   generated/rom-animation-core/goku-golden-gate.json    (5 commands, key 5)
//   src/data/generated/romAnimationCore.generated.ts       (const tipadas)
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ROM_CGB_PALETTE_TABLE } from '../src/data/generated/romCgbPaletteTable.generated';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROM_PATH = resolve(ROOT, '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-spain.gbc');
const OUT_DIR = join(ROOT, 'generated/rom-animation-core');
const OUT_JSON = join(OUT_DIR, 'animation-core.json');
const OUT_GOLDEN = join(OUT_DIR, 'goku-golden-gate.json');
const OUT_TS = join(ROOT, 'src/data/generated/romAnimationCore.generated.ts');

const rom = readFileSync(ROM_PATH);
// mgbdis convention: switchable region $4000-$7FFF → file = bank*0x4000 + (addr-0x4000).
// El renderer y los resolvers usan LOCAL offset (0x0000-0x3FFF); aquí base = cpu-0x4000.
const u16At = (bank: number, addr: number) => rom[bank * 0x4000 + addr] | (rom[bank * 0x4000 + addr + 1] << 8);
const u8At = (bank: number, addr: number) => rom[bank * 0x4000 + addr];
const s8 = (v: number) => { const u = v & 0xff; return u < 0x80 ? u : u - 0x100; };
const hex = (n: number) => `$${n.toString(16).toUpperCase()}`;

const BANK61 = 0x61;
/** 7 recursos de pie/básica bank $61. resourceIndex 0..6 (idle, A, B, RIGHT, UP/DOWN, extra5, extra6). */
const BANK61_BASES = [16432, 18800, 19464, 20852, 22532, 23932, 24096];

interface FrameDecode {
  frameIndex: number;
  visualFrameId: number;
  durationTicks: number;
  offsetX: number;
  offsetY: number;
  frameAddress: number;
}

interface SequenceDecode {
  selector: number;
  frameCount: number;
  sequenceAddress: number;
  frames: FrameDecode[];
}

interface ResourceDecode {
  resourceIndex: number;
  animationBank: number;
  resourceBase: number;   // CPU
  localBase: number;      // CPU - 0x4000
  sequenceTable: number;  // local
  sequenceCount: number;
  sequences: SequenceDecode[];
}

function decodeResource(bank: number, cpuBase: number, resourceIndex: number): ResourceDecode {
  const localBase = cpuBase - 0x4000;
  const w0 = u16At(bank, localBase);
  const T = (localBase + w0) & 0xffff;
  const sequenceCount = u8At(bank, T);
  const sequences: SequenceDecode[] = [];
  for (let sel = 0; sel < sequenceCount; sel++) {
    const entry = (T + 1 + sel * 2) & 0xffff;
    const off = u16At(bank, entry);
    const seqAddr = (T + 1 + sel * 2 + off) & 0xffff;
    const frameCount = u8At(bank, seqAddr);
    const frames: FrameDecode[] = [];
    for (let f = 0; f < frameCount; f++) {
      const fa = (seqAddr + 1 + f * 4) & 0xffff;
      frames.push({
        frameIndex: f,
        visualFrameId: u8At(bank, fa),
        durationTicks: u8At(bank, fa + 1),
        offsetY: s8(u8At(bank, fa + 2)), // byte2 = signed Y delta
        offsetX: s8(u8At(bank, fa + 3)), // byte3 = signed X delta
        frameAddress: fa,
      });
    }
    sequences.push({ selector: sel, frameCount, sequenceAddress: seqAddr, frames });
  }
  return { resourceIndex, animationBank: bank, resourceBase: cpuBase, localBase, sequenceTable: T, sequenceCount, sequences };
}

/** Metasprite (root +2) → piece count por visualFrameId. */
function metaspriteCount(bank: number, localBase: number, visualFrameId: number): number {
  const w2 = u16At(bank, localBase + 2);
  const T = (localBase + 2 + w2) & 0xffff;
  const entry = (T + visualFrameId * 2) & 0xffff;
  const off = u16At(bank, entry);
  const pieceAddr = (T + visualFrameId * 2 + off) & 0xffff;
  return u8At(bank, pieceAddr);
}

/** Frame-graphics (root +4) → blockCount por visualFrameId. */
function graphicsBlockCount(bank: number, localBase: number, visualFrameId: number): number {
  const w4 = u16At(bank, localBase + 4);
  const T = (localBase + 4 + w4) & 0xffff;
  const entry = (T + visualFrameId * 2) & 0xffff;
  const off = u16At(bank, entry);
  const layoutAddr = (T + visualFrameId * 2 + off) & 0xffff;
  return u8At(bank, layoutAddr);
}

// ── 1. Decode bank $61 completo ──
const resources = BANK61_BASES.map((base, i) => decodeResource(BANK61, base, i));
let totalFrames = 0;
let invariantMismatches = 0;
for (const r of resources) {
  for (const seq of r.sequences) {
    for (const f of seq.frames) {
      totalFrames++;
      const mc = metaspriteCount(BANK61, r.localBase, f.visualFrameId);
      const gc = graphicsBlockCount(BANK61, r.localBase, f.visualFrameId);
      if (mc !== gc) invariantMismatches++;
    }
  }
}

// ── 2. Goku Base golden gate (profile key 5, graphics bank 0x36) ──
// command → pose selector $C3C7 (VERIFICADO, memberSlot0) + descriptor slot → resourceIndex.
// A→slot1, B→slot2, RIGHT→slot3, UP→slot4, DOWN→slot4 (Call_000_3501: $20..$24 → c=$01..$04).
const GOKU_PROFILE_KEY = 0x05;
const COMMANDS: { command: string; pose: number; resourceIndex: number }[] = [
  { command: 'A', pose: 5, resourceIndex: 1 },
  { command: 'B', pose: 8, resourceIndex: 2 },
  { command: 'RIGHT', pose: 11, resourceIndex: 3 },
  { command: 'UP', pose: 6, resourceIndex: 4 },
  { command: 'DOWN', pose: 9, resourceIndex: 4 },
];

const goldenGate = COMMANDS.map(({ command, pose, resourceIndex }) => {
  const res = resources[resourceIndex];
  const seq = res.sequences[pose] ?? res.sequences[0];
  const fallback = res.sequences[pose] == null;
  return {
    command,
    memberSlot: 0,
    poseSelector: pose,
    descriptorSlot: resourceIndex === 4 ? 4 : resourceIndex,
    animationBank: res.animationBank,
    resourceBase: res.resourceBase,
    localBase: res.localBase,
    sequenceTable: res.sequenceTable,
    sequence: seq.selector,
    fallbackApplied: fallback,
    sequenceAddress: seq.sequenceAddress,
    frameCount: seq.frameCount,
    frames: seq.frames.map((f) => ({
      ...f,
      metaspritePieceCount: metaspriteCount(res.animationBank, res.localBase, f.visualFrameId),
      graphicsBlockCount: graphicsBlockCount(res.animationBank, res.localBase, f.visualFrameId),
    })),
    palette: ROM_CGB_PALETTE_TABLE[GOKU_PROFILE_KEY],
  };
});

mkdirSync(OUT_DIR, { recursive: true });

const animationCore = {
  descriptorTable: '$CA0D (stride 3)',
  animationBank: BANK61,
  resources: resources.map((r) => ({
    resourceIndex: r.resourceIndex,
    resourceBase: r.resourceBase,
    resourceBaseHex: hex(r.resourceBase),
    sequenceTable: r.sequenceTable,
    sequenceCount: r.sequenceCount,
    sequences: r.sequences,
  })),
  totals: { resources: resources.length, sequences: resources.reduce((a, r) => a + r.sequenceCount, 0), frames: totalFrames, invariantMismatches },
};
writeFileSync(OUT_JSON, JSON.stringify(animationCore, null, 2));

const golden = {
  profileKey: GOKU_PROFILE_KEY,
  graphicsBank: 0x31 + GOKU_PROFILE_KEY,
  form: 'goku_base',
  commands: goldenGate,
};
writeFileSync(OUT_GOLDEN, JSON.stringify(golden, null, 2));

// ── 3. TS generado ──
const tsResources = resources.map((r) => ({
  resourceIndex: r.resourceIndex,
  resourceBase: r.resourceBase,
  sequenceTable: r.sequenceTable,
  sequenceCount: r.sequenceCount,
  sequences: r.sequences,
}));
const tsGolden = goldenGate.map((g) => ({
  command: g.command,
  memberSlot: g.memberSlot,
  poseSelector: g.poseSelector,
  descriptorSlot: g.descriptorSlot,
  animationBank: g.animationBank,
  resourceBase: g.resourceBase,
  sequence: g.sequence,
  fallbackApplied: g.fallbackApplied,
  frameCount: g.frameCount,
  frames: g.frames,
}));

const ts = `// ═══════════════════════════════════════════════════════════════════
// GENERADO — no editar a mano. Fuente: scripts/build-rom-animation-core.ts
// Bank $61 (standing/basic) full structural decode + Goku golden gate.
// ═══════════════════════════════════════════════════════════════════

/** 7 recursos de pie/básica bank $61 (resourceIndex 0..6). */
export const ROM_BANK61_ANIMATION_CORE_RESOURCE_BASES: readonly number[] = [${BANK61_BASES.join(',')}];

export interface RomAnimationCoreFrame {
  frameIndex: number;
  visualFrameId: number;
  durationTicks: number;
  offsetX: number;
  offsetY: number;
  frameAddress: number;
}

export interface RomAnimationCoreSequence {
  selector: number;
  frameCount: number;
  sequenceAddress: number;
  frames: RomAnimationCoreFrame[];
}

export interface RomAnimationCoreResource {
  resourceIndex: number;
  resourceBase: number;
  sequenceTable: number;
  sequenceCount: number;
  sequences: RomAnimationCoreSequence[];
}

/** Decodificación estructural completa de bank $61 (7 recursos). */
export const ROM_BANK61_ANIMATION_CORE: readonly RomAnimationCoreResource[] = ${JSON.stringify(tsResources, null, 2)};

/** Goku Base (key $05) golden gate: command → pose selector → sequence → frames. */
export interface RomGoldenGateCommand {
  command: string;
  memberSlot: number;
  poseSelector: number;
  descriptorSlot: number;
  animationBank: number;
  resourceBase: number;
  sequence: number;
  fallbackApplied: boolean;
  frameCount: number;
  frames: (RomAnimationCoreFrame & { metaspritePieceCount: number; graphicsBlockCount: number })[];
}

export const GOKU_GOLDEN_GATE_COMMANDS: readonly RomGoldenGateCommand[] = ${JSON.stringify(tsGolden, null, 2)};
`;

writeFileSync(OUT_TS, ts);

console.log(`animation-core.json: ${resources.length} resources, ${totalFrames} frames, ${invariantMismatches} invariant mismatches`);
console.log(`goku-golden-gate.json: ${goldenGate.length} commands (key $${GOKU_PROFILE_KEY.toString(16).toUpperCase()})`);
for (const g of goldenGate) {
  const dur = g.frames.map(f => f.durationTicks).join(',');
  const vf = g.frames.map(f => f.visualFrameId).join(',');
  const dx = g.frames.map(f => f.offsetX).join(',');
  const dy = g.frames.map(f => f.offsetY).join(',');
  console.log(`  ${g.command}: pose=$${g.poseSelector.toString(16)} base=${hex(g.resourceBase)} seq=${g.sequence} frames=${g.frameCount} vf=[${vf}] dur=[${dur}] dx=[${dx}] dy=[${dy}]`);
}
