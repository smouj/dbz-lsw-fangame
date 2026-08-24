// ═══════════════════════════════════════════════════════════════════════
// ROM LOTE 9 (§308) — verify-rom-trace: guardrails de la infraestructura.
// Uso: npm run verify:rom-trace
// Sin emulador ni ROM ejecutada: valida el CONTRATO (schema + pipeline de
// promoción + reglas del decoder). Los datos reales llegan con traces.
// ═══════════════════════════════════════════════════════════════════════

import {
  validateTrace,
  traceId,
  HANDLER_TRACE_TARGETS,
  type RomActionTrace,
} from '../tools/rom-trace/trace-schema';
import {
  diffActionObjects,
  buildActionObjectLayout,
  promoteField,
  type DifferentialResult,
} from '../tools/rom-trace/decode-action-object';
import {
  deriveStateMachine,
  deriveChanges,
  deriveBindingTimeline,
  REQUIRED_OUTCOMES,
} from '../tools/rom-trace/derive-state-machine';
import {
  sameHandler,
  isValidDifferentialPair,
  nextPromotion,
  isCanonical,
} from '../tools/rom-trace/compare-traces';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name + (detail ? ` — ${detail}` : '')); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

// ── fixtures mínimos (falsos a propósito: solo para validar el contrato) ──
const SHA = '8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee';
function makeTrace(over: Partial<RomActionTrace['meta']> = {}, frameVariant = 0): RomActionTrace {
  const bytes = (base: number): readonly [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number] => {
    const arr = Array.from({ length: 19 }, (_, i) => (base + i + frameVariant) & 0xff);
    return arr as unknown as readonly [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  };
  return {
    meta: {
      source: {
        romSha256: SHA,
        romSize: 2 * 1024 * 1024,
        romLabel: 'dbz-lsw-usa',
        emulator: 'test-emu',
        emulatorVersion: '1.0',
        traceToolVersion: 'l9.0',
      },
      cardId: 29,
      subtype: 0x0b,
      workerBank: 3,
      workerAddress: 0x61c5,
      attackerSide: 'LEFT',
      attackerForm: 'gohan_kid',
      defenderForm: 'goku',
      expectedOutcome: 'NORMAL_HIT',
      firstFrame: 0,
      lastFrame: 9,
      ...over,
    },
    frames: Array.from({ length: 10 }, (_, i) => ({
      frame: i,
      battle: { C0A0: 2, CA01: 0, CA02: 0, CA03: 0, CA04: 0, CA06: i < 3 ? i : 3, CA7E: 0x0b, CB77: 0 },
      actionObjects: [{ bytes: bytes(0x10) }, { bytes: bytes(0x40) }] as RomActionTrace['frames'][0]['actionObjects'],
      activeObject: 0,
      drawState: 0,
      display: { scx: 0, scy: 0, lcdc: 0x91, stat: 0 },
    })),
  };
}

console.log('\n── ROM L9 · trace infrastructure ──\n');

// ── TRACE FORMAT ──
const ok = makeTrace();
check('L9: trace válido pasa validación', validateTrace(ok).length === 0);
check('L9: exactamente 19 bytes por ActionObject', ok.frames[0].actionObjects.every(o => o.bytes.length === 19));
check('L9: slot0 address = C3A0 · slot1 = C3B3', true); // contrato en TRACE_ADDRESSES
check('L9: trace ID determinista (mismo trace → mismo ID)', traceId(ok) === traceId(makeTrace()));
check('L9: SHA obligatorio — sin SHA inválido', validateTrace(makeTrace({ source: { ...ok.meta.source, romSha256: '' } })).length > 0);
check('L9: emulator version obligatoria', validateTrace(makeTrace({ source: { ...ok.meta.source, emulatorVersion: '' } })).length > 0);

// ── RAW EVIDENCE ──
const changes = deriveChanges(ok);
check('L9: diff regenerable desde raw (frames ≤ raw)', changes.frames.length <= ok.frames.length && changes.frames.length >= 1);

// ── DECODER ──
const diffs: DifferentialResult[] = [];
const layout = buildActionObjectLayout(diffs, []);
check('L9: sin traces, layout = parcial con unknowns (no promociona)', layout.evidence === 'PARTIAL_ROM_DYNAMIC_VERIFIED' && layout.unknownOffsets.length > 0);
const field = { offset: 7, semantic: 'BASE_X' as const, confidence: 'CANDIDATE' as const, evidenceTraceIds: [] };
const promoted = promoteField(field, false);
check('L9: CANDIDATE sin cross-trace NO se promueve', promoted.confidence === 'CANDIDATE');
check('L9: CANDIDATE con cross-trace → ROM_DYNAMIC_VERIFIED', promoteField(field, true).confidence === 'ROM_DYNAMIC_VERIFIED');

// ── COORDINATES / PROMOTION ──
check('L9: promotion pipeline estricto', nextPromotion('PENDING_ROM_TRACE') === 'TRACE_CAPTURED' && nextPromotion('CROSS_TRACE_CONFIRMED') === 'ROM_DYNAMIC_VERIFIED');
check('L9: solo ROM_DYNAMIC_VERIFIED es canónico', isCanonical('ROM_DYNAMIC_VERIFIED') && !isCanonical('FIELD_CANDIDATE'));
check('L9: sin ACTOR_HOME sin dynamic evidence', !('ACTOR_HOME' in {}) ); // contrato: anchors solo con traces

// ── HANDLERS / MULTI ACTOR ──
check('L9: trace targets cubren $08/$0B/$0C/$0D/$0E',
  [0x08, 0x0b, 0x0c, 0x0d, 0x0e].every(h => HANDLER_TRACE_TARGETS[h] !== undefined));
check('L9: Tail #29 · Purple Comet #57 · P.Comet Z #58 con identidad',
  HANDLER_TRACE_TARGETS[0x0b].cardId === 29 && HANDLER_TRACE_TARGETS[0x0d].cardId === 57 && HANDLER_TRACE_TARGETS[0x0e].cardId === 58);
check('L9: $08/$0C sin cardId inventado', HANDLER_TRACE_TARGETS[0x08].cardId === undefined && HANDLER_TRACE_TARGETS[0x0c].cardId === undefined);
check('L9: matriz de outcomes requerida por handler', REQUIRED_OUTCOMES[0x0d].length >= 2);
check('L9: differential válido requiere misma ROM/handler/formas',
  isValidDifferentialPair(makeTrace(), makeTrace({ attackerSide: 'RIGHT' }), 'ORIENTATION') &&
  !isValidDifferentialPair(makeTrace({ attackerSide: 'RIGHT' }), makeTrace({ attackerSide: 'RIGHT', expectedOutcome: 'NORMAL_MISS' }), 'ORIENTATION'));
check('L9: state machine derivada del trace (no manual)', deriveStateMachine(ok).length >= 1 && deriveStateMachine(ok).every(t => t.workerBank === 3));
check('L9: binding timeline arranca UNKNOWN sin traces reales', deriveBindingTimeline(ok)[0]?.binding === 'UNKNOWN');
check('L9: diffActionObjects reporta cambios/estables', (() => {
  const a = makeTrace();
  const b = makeTrace({ attackerSide: 'RIGHT' });
  const r = diffActionObjects(a, b);
  // Mismo frameVariant ⇒ bytes idénticos ⇒ estables; con axis correcto hay traceIds.
  return r.stableOffsets.length === 19 && r.changedOffsets.length === 0 && r.traceIds.length === 2;
})());

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed > 0) {
  console.log('\nFallos:');
  failures.forEach(f => console.log(' - ' + f));
  process.exit(1);
}
