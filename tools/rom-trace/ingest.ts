// ═══════════════════════════════════════════════════════════════════════
// ROM LOTE 9 (§299-301/§310) — ingest: valida dumps crudos del emulador y
// produce los artefactos canónicos.
//
//   capture.raw.json + metadata.json  →  trace.full.json (validado)
//                                     →  trace.changes.json (diff)
//                                     →  summary.md
//
// El raw es GENERATED/IMMUTABLE; este script valida, nunca modifica el raw.
// Sin ROM SHA válido, el trace NO puede promover datos canónicos (§278).
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import {
  validateTrace,
  traceId,
  type RomActionTrace,
  type RomTraceFrame,
  type RomActionObjectRaw,
  type RomTraceSource,
} from './trace-schema';
import { deriveChanges, deriveStateMachine, deriveMilestones } from './derive-state-machine';

/** Formato intermedio emitido por trace-action.lua. */
interface RawCapture {
  frames: Array<{
    frame: number;
    battle: {
      C0A0: number; CA01: number; CA02: number; CA03: number; CA04: number;
      CA06: number; CA7E: number; CB77: number; CA53?: number;
    };
    actionObjects: Array<string | number[]>; // ['AA BB ...', ...] o [{bytes:[...]}] 19 bytes por slot
    activeObject: number;
    drawState: number;
    drawOrderFlag?: number;
    display: { scx: number; scy: number; lcdc: number; stat: number };
  }>;
}

/** Convierte 'AA BB CC...' O number[] → 19 números. */
function hexBytesToArray(s: string | number[]): RomActionObjectRaw['bytes'] {
  const nums = typeof s === 'string'
    ? s.trim().split(/\s+/).map(h => parseInt(h, 16))
    : s.map(n => Number(n));
  if (nums.length !== 19) throw new Error(`ActionObject raw debe tener 19 bytes (${nums.length})`);
  return nums as RomActionObjectRaw['bytes'];
}

export function ingestTrace(rawPath: string, metaPath: string, outDir: string): RomActionTrace {
  const raw: RawCapture = JSON.parse(readFileSync(rawPath, 'utf8'));
  const meta: { source: RomTraceSource; attackerSide: 'LEFT' | 'RIGHT'; expectedOutcome?: string; firstFrame: number; lastFrame: number; cardId?: number; subtype?: number; workerBank?: number; workerAddress?: number; attackerForm?: string; defenderForm?: string; initialTacticalPosition?: { attacker: number; defender: number } } =
    JSON.parse(readFileSync(metaPath, 'utf8'));

  const frames: RomTraceFrame[] = raw.frames.map(f => ({
    frame: f.frame,
    battle: {
      C0A0: f.battle.C0A0, CA01: f.battle.CA01, CA02: f.battle.CA02,
      CA03: f.battle.CA03, CA04: f.battle.CA04, CA06: f.battle.CA06,
      CA7E: f.battle.CA7E, CB77: f.battle.CB77,
    },
    actionObjects: [
      { bytes: hexBytesToArray(typeof f.actionObjects[0] === 'string' ? f.actionObjects[0] : (f.actionObjects[0] as { bytes: number[] }).bytes) },
      { bytes: hexBytesToArray(typeof f.actionObjects[1] === 'string' ? f.actionObjects[1] : (f.actionObjects[1] as { bytes: number[] }).bytes) },
    ],
    activeObject: f.activeObject,
    drawState: f.drawState,
    drawOrderFlag: f.drawOrderFlag,
    display: f.display,
  }));

  const trace: RomActionTrace = {
    meta: {
      source: meta.source,
      attackerSide: meta.attackerSide,
      expectedOutcome: meta.expectedOutcome,
      firstFrame: meta.firstFrame,
      lastFrame: meta.lastFrame,
      cardId: meta.cardId,
      subtype: meta.subtype,
      workerBank: meta.workerBank,
      workerAddress: meta.workerAddress,
      attackerForm: meta.attackerForm,
      defenderForm: meta.defenderForm,
      initialTacticalPosition: meta.initialTacticalPosition,
    },
    frames,
  };

  const issues = validateTrace(trace);
  if (issues.length > 0) {
    throw new Error(`trace inválido (${rawPath}):\n  ${issues.join('\n  ')}`);
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'trace.full.json'), JSON.stringify(trace, null, 1) + '\n');
  writeFileSync(join(outDir, 'trace.changes.json'), JSON.stringify(deriveChanges(trace), null, 1) + '\n');

  const id = traceId(trace);
  const fsm = deriveStateMachine(trace);
  const milestones = deriveMilestones(trace);
  const summary = [
    `# Trace: ${id}`,
    '',
    `- ROM: ${trace.meta.source.romLabel} · ${trace.meta.source.romSha256.slice(0, 16)}…`,
    `- Emulador: ${trace.meta.source.emulator} ${trace.meta.source.emulatorVersion} · tool ${trace.meta.source.traceToolVersion}`,
    `- Condiciones: side=${trace.meta.attackerSide} · outcome=${trace.meta.expectedOutcome ?? '?'} · card=${trace.meta.cardId ?? '?'} · subtype=${trace.meta.subtype?.toString(16) ?? '?'}`,
    `- Frames: ${trace.meta.firstFrame}..${trace.meta.lastFrame} (${trace.frames.length})`,
    `- State transitions (CA06): ${fsm.length}`,
    ...fsm.map(t => `  - t${t.tick} $${t.from.toString(16).padStart(2, '0')}→$${t.to.toString(16).padStart(2, '0')} (obj0:${t.object0Changed ? 'Δ' : '='} obj1:${t.object1Changed ? 'Δ' : '='} scr:${t.displayChanged ? 'Δ' : '='})`),
    `- Milestones (observacionales — campaña pre-roll):`,
    ...(milestones.length
      ? milestones.map(m => `  - t${m.tick} ${m.kind}`)
      : ['  - (ninguno — revisar si el trace empezó después de confirmar la acción)']),
    '',
    '> GENERATED · IMMUTABLE · no editar a mano (§301). Promoción solo vía',
    '> cross-trace (PENDING → CAPTURED → CANDIDATE → CROSS_TRACE → DYNAMIC_VERIFIED).',
    '',
  ].join('\n');
  writeFileSync(join(outDir, 'summary.md'), summary);

  return trace;
}

/** CLI: node ingest.js <raw.json> <metadata.json> <outDir> */
if (process.argv[1] && /ingest\.(ts|mjs|js)$/.test(process.argv[1])) {
  const [rawPath, metaPath, outDir] = process.argv.slice(2);
  if (!rawPath || !metaPath || !outDir) {
    console.error('uso: node ingest.ts <raw.json> <metadata.json> <outDir>');
    process.exit(1);
  }
  try {
    const t = ingestTrace(rawPath, metaPath, outDir);
    console.log(`INGEST_OK ${traceId(t)} frames=${t.frames.length}`);
    console.log(`  full:    ${join(outDir, 'trace.full.json')}`);
    console.log(`  changes: ${join(outDir, 'trace.changes.json')}`);
    console.log(`  summary: ${join(outDir, 'summary.md')}`);
  } catch (e) {
    console.error(`INGEST_FAIL: ${(e as Error).message}`);
    process.exit(1);
  }
}
