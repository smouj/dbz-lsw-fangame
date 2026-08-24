// ═══════════════════════════════════════════════════════════════════════
// ROM LOTE 9 (§295-298/§300) — derive-state-machine: FSM observada + diff.
//
// La state machine se RECONSTRUYE desde los traces (CA06 transitions),
// nunca a mano. Un único trace no basta: se necesita la matriz de outcomes
// (§296). El diff (changes) es derivable del raw en todo momento (§300).
// ═══════════════════════════════════════════════════════════════════════

import type {
  RomActionTrace,
  RomActionObjectRaw,
  RomStateTransition,
  ActionObjectBindingTrace,
  TraceOutcome,
} from './trace-schema';

/** Extrae las transiciones de CA06 observadas en un trace (§295). */
export function deriveStateMachine(trace: RomActionTrace): RomStateTransition[] {
  const out: RomStateTransition[] = [];
  let prev = trace.frames[0]?.battle.CA06;
  for (let i = 1; i < trace.frames.length; i++) {
    const f = trace.frames[i];
    const from = prev;
    const to = f.battle.CA06;
    if (from !== to) {
      const prevFrame = trace.frames[i - 1];
      out.push({
        tick: f.frame,
        from,
        to,
        workerBank: trace.meta.workerBank ?? 3,
        workerAddress: trace.meta.workerAddress ?? 0,
        object0Changed: objChanged(prevFrame.actionObjects[0].bytes, f.actionObjects[0].bytes),
        object1Changed: objChanged(prevFrame.actionObjects[1].bytes, f.actionObjects[1].bytes),
        displayChanged: prevFrame.display.scx !== f.display.scx || prevFrame.display.scy !== f.display.scy,
      });
    }
    prev = to;
  }
  return out;
}

function objChanged(a: readonly number[], b: readonly number[]): boolean {
  return a.some((v, i) => v !== b[i]);
}

/** Deriva el diff de cambios (trace.changes.json) desde el raw (§300). */
export function deriveChanges(trace: RomActionTrace): RomActionTrace {
  const frames = trace.frames.filter((f, i) => {
    if (i === 0) return true;
    const p = trace.frames[i - 1];
    return f.battle.CA06 !== p.battle.CA06 || f.battle.C0A0 !== p.battle.C0A0
      || f.actionObjects[0].bytes.some((v, j) => v !== p.actionObjects[0].bytes[j])
      || f.actionObjects[1].bytes.some((v, j) => v !== p.actionObjects[1].bytes[j])
      || f.display.scx !== p.display.scx || f.display.scy !== p.display.scy;
  });
  return { meta: trace.meta, frames };
}

/**
 * Binding timeline observado (§297): correlación por slot usando el estado
 * de los objetos. Sin trazas reales devuelve UNKNOWN — nunca intuición.
 */
export function deriveBindingTimeline(trace: RomActionTrace): ActionObjectBindingTrace[] {
  return trace.frames.map(f => ({
    tick: f.frame,
    slot: f.activeObject === 1 ? 1 : 0,
    binding: 'UNKNOWN' as const,
    evidence: 'PENDING_ROM_TRACE' as const,
  }));
}

/** Matriz de outcomes requerida por handler (§296). */
export const REQUIRED_OUTCOMES: Record<number, TraceOutcome[]> = {
  0x08: ['NORMAL_HIT', 'NORMAL_MISS'],
  0x0b: ['NORMAL_HIT', 'NORMAL_MISS'],
  0x0c: ['NORMAL_HIT', 'NORMAL_MISS'],
  0x0d: ['NORMAL_HIT', 'NORMAL_MISS', 'HIGH_POWER'],
  0x0e: ['NORMAL_HIT', 'NORMAL_MISS', 'HIGH_POWER'],
};

// ────────────────────────────────────────────────────────────────────────
// HITOS OBSERVADOS — para traces iniciados ANTES de confirmar la acción
// (campaña §"Muy importante durante la captura"): localizan init, primera
// escritura de los 19 bytes, activación C3C6/C3C7 y cleanup. Son
// OBSERVACIONES puras (tick + qué cambió), nunca interpretación semántica.
// ────────────────────────────────────────────────────────────────────────

export interface TraceMilestone {
  tick: number;
  kind:
    | 'FIRST_CA06_MOVE'        // primer cambio de CA06 (aceptación/worker)
    | 'FIRST_OBJECT_WRITE'     // primera escritura de bytes en slot0/slot1
    | 'OBJECT0_ACTIVE'         // C3C6 apunta a 0 (o bytes dejan de ser 0)
    | 'OBJECT1_ACTIVE'
    | 'DRAW_STATE_CHANGED'     // C3C7 cambió
    | 'DRAW_ORDER_CHANGED'     // CA39 cambió
    | 'LAST_ACTIVITY'          // último tick con cambios (fin de actividad)
    | 'CLEANUP_COMPLETE';      // ambos objetos vuelven a estado inactivo
}

/** Detecta hitos puramente observacionales en un trace (§campaign). */
export function deriveMilestones(trace: RomActionTrace): TraceMilestone[] {
  const out: TraceMilestone[] = [];
  const zeroObj = (o: RomActionObjectRaw) => o.bytes.every(b => b === 0);

  const f0 = trace.frames[0];
  if (!f0) return out;

  let prevCA06 = f0.battle.CA06;
  let prevObj0 = f0.actionObjects[0];
  let prevObj1 = f0.actionObjects[1];
  let prevC3C7 = f0.drawState;
  let prevCA39 = f0.drawOrderFlag ?? 0;
  let lastActivity = -1;

  const firstObjWrite = (obj: RomActionObjectRaw, i: 0 | 1) =>
    out.find(m => (m.kind === 'OBJECT0_ACTIVE' && i === 0) || (m.kind === 'OBJECT1_ACTIVE' && i === 1));

  for (let i = 1; i < trace.frames.length; i++) {
    const f = trace.frames[i];
    const t = f.frame;

    if (f.battle.CA06 !== prevCA06 && !out.some(m => m.kind === 'FIRST_CA06_MOVE')) {
      out.push({ tick: t, kind: 'FIRST_CA06_MOVE' });
    }
    // primera escritura no-cero en cada slot (init de ActionObject)
    for (const [slot, obj, prev] of [[0, f.actionObjects[0], prevObj0], [1, f.actionObjects[1], prevObj1]] as const) {
      const changed = obj.bytes.some((b, j) => b !== prev.bytes[j]);
      if (changed && !zeroObj(obj) && !firstObjWrite(obj, slot as 0 | 1)) {
        out.push({ tick: t, kind: slot === 0 ? 'OBJECT0_ACTIVE' : 'OBJECT1_ACTIVE' });
      }
    }
    if (f.drawState !== prevC3C7 && !out.some(m => m.kind === 'DRAW_STATE_CHANGED')) {
      out.push({ tick: t, kind: 'DRAW_STATE_CHANGED' });
    }
    if ((f.drawOrderFlag ?? 0) !== prevCA39 && !out.some(m => m.kind === 'DRAW_ORDER_CHANGED')) {
      out.push({ tick: t, kind: 'DRAW_ORDER_CHANGED' });
    }

    const anyChange = f.battle.CA06 !== prevCA06
      || f.actionObjects[0].bytes.some((b, j) => b !== prevObj0.bytes[j])
      || f.actionObjects[1].bytes.some((b, j) => b !== prevObj1.bytes[j])
      || f.display.scx !== trace.frames[i - 1].display.scx
      || f.display.scy !== trace.frames[i - 1].display.scy;
    if (anyChange) lastActivity = t;

    prevCA06 = f.battle.CA06;
    prevObj0 = f.actionObjects[0];
    prevObj1 = f.actionObjects[1];
    prevC3C7 = f.drawState;
    prevCA39 = f.drawOrderFlag ?? 0;
  }

  if (lastActivity >= 0) out.push({ tick: lastActivity, kind: 'LAST_ACTIVITY' });

  // cleanup: tras LAST_ACTIVITY, ambos objetos vuelven a 0 (o se quedan estables)
  const last = trace.frames[trace.frames.length - 1];
  if (last && zeroObj(last.actionObjects[0]) && zeroObj(last.actionObjects[1])) {
    out.push({ tick: last.frame, kind: 'CLEANUP_COMPLETE' });
  }

  return out.sort((a, b) => a.tick - b.tick);
}
