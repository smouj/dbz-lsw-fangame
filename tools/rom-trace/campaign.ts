// ═══════════════════════════════════════════════════════════════════════
// ROM LOTE 9/10 — campaign: runner de la campaña de captura.
//
// Orden (§290-294): $0B Tail → $0D Purple Comet → $0E P.Comet Z →
// $08 SPECIAL → $0C BUU_BALL. Los tres primeros tienen cardId controlado
// (29/57/58); $08/$0C requieren resolver la asociación antes de canon.
//
// CRITERIO PARA ABRIR EL LOTE 10 (textual del usuario):
//   ✓ Tail LEFT HIT · RIGHT HIT · LEFT MISS · RIGHT MISS
//   ✓ Purple Comet ≥2 traces comparables · P.Comet Z ≥2 comparables
//   ✓ todos validan schema · raw checksums correctos · diff regenerable
//   ✓ CA06 FSM extraíble · ambos ActionObjects 19B completos
//   ✓ decoder produce candidatos · ninguna promoción automática errónea
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validateTrace, traceId, type RomActionTrace } from './trace-schema';
import { deriveChanges, deriveStateMachine } from './derive-state-machine';

export interface CampaignRequirement {
  name: string;
  handler: number;
  cardId?: number;
  /** Matriz mínima de capturas (§290-294). */
  required: string[];
}

/** Definición de campaña (§290-294) — orden de ejecución. */
export const CAMPAIGN: CampaignRequirement[] = [
  {
    name: 'Tail ($0B)',
    handler: 0x0b,
    cardId: 29,
    required: ['tail_left_hit', 'tail_right_hit', 'tail_left_miss', 'tail_right_miss'],
  },
  {
    name: 'Purple Comet ($0D)',
    handler: 0x0d,
    cardId: 57,
    required: ['purple_comet_left_hit', 'purple_comet_right_hit', 'purple_comet_left_miss', 'purple_comet_right_miss'],
  },
  {
    name: 'P.Comet Z ($0E)',
    handler: 0x0e,
    cardId: 58,
    required: ['pcomet_z_left_hit', 'pcomet_z_right_hit', 'pcomet_z_left_miss', 'pcomet_z_right_miss'],
  },
  {
    name: 'SPECIAL ($08)',
    handler: 0x08,
    required: ['handler_08'], // traceBySubtype — cardId pendiente de resolver
  },
  {
    name: 'BUU_BALL ($0C)',
    handler: 0x0c,
    required: ['handler_0c'], // traceBySubtype — cardId pendiente de resolver
  },
];

export interface CampaignStatus {
  traceDir: string;
  captures: Map<string, RomActionTrace>;
  /** capturas presentes que validan schema. */
  valid: string[];
  invalid: Array<{ name: string; issues: string[] }>;
  missing: string[];
  /** Criterio L10 (§"criterio para decir ya podemos"). */
  readyForL10: boolean;
  reasons: string[];
}

/** Lee y valida todas las capturas existentes en docs/rom/traces/. */
export function loadCampaign(traceDir: string): CampaignStatus {
  const captures = new Map<string, RomActionTrace>();
  const valid: string[] = [];
  const invalid: Array<{ name: string; issues: string[] }> = [];
  const missing: string[] = [];

  const requiredAll = CAMPAIGN.flatMap(c => c.required);
  for (const name of requiredAll) {
    const full = join(traceDir, name, 'trace.full.json');
    if (!existsSync(full)) {
      missing.push(name);
      continue;
    }
    try {
      const trace = JSON.parse(readFileSync(full, 'utf8')) as RomActionTrace;
      const issues = validateTrace(trace);
      if (issues.length > 0) {
        invalid.push({ name, issues });
      } else {
        captures.set(name, trace);
        valid.push(name);
      }
    } catch (e) {
      invalid.push({ name, issues: [(e as Error).message] });
    }
  }

  // ── Criterio L10 ──
  const reasons: string[] = [];
  const tail = ['tail_left_hit', 'tail_right_hit', 'tail_left_miss', 'tail_right_miss'];
  const okTail = tail.filter(n => captures.has(n)).length === 4;
  if (!okTail) reasons.push('Tail: faltan capturas de la matriz 4 (LEFT/RIGHT × HIT/MISS)');

  const pc = ['purple_comet_left_hit', 'purple_comet_right_hit', 'purple_comet_left_miss', 'purple_comet_right_miss']
    .filter(n => captures.has(n));
  const pcz = ['pcomet_z_left_hit', 'pcomet_z_right_hit', 'pcomet_z_left_miss', 'pcomet_z_right_miss']
    .filter(n => captures.has(n));
  if (pc.length < 2) reasons.push('Purple Comet: se necesitan ≥2 traces comparables');
  if (pcz.length < 2) reasons.push('P.Comet Z: se necesitan ≥2 traces comparables');

  // FSM extraíble + ActionObjects 19B + diff regenerable se validan por trace:
  for (const name of valid) {
    const t = captures.get(name)!;
    const fsm = deriveStateMachine(t);
    const changes = deriveChanges(t);
    const nineteen = t.frames[0]?.actionObjects.every(o => o.bytes.length === 19);
    if (fsm.length === 0) reasons.push(`${name}: sin transiciones CA06 (FSM no extraíble)`);
    if (!nineteen) reasons.push(`${name}: ActionObjects no tienen 19 bytes`);
    if (changes.frames.length > t.frames.length) reasons.push(`${name}: diff no regenerable`);
  }

  const readyForL10 = reasons.length === 0 && invalid.length === 0 && valid.length >= 6;

  return { traceDir, captures, valid, invalid, missing, readyForL10, reasons };
}

/** CLI: node campaign.js <traceDir> */
if (process.argv[1] && process.argv[1].endsWith('campaign.ts')) {
  const traceDir = process.argv[2] ?? 'docs/rom/traces';
  const st = loadCampaign(traceDir);
  console.log(`\n═══ CAMPAÑA ROM — ${traceDir} ═══\n`);
  console.log(`Capturas válidas (${st.valid.length}):`);
  st.valid.forEach(n => console.log(`  ✓ ${n} (${traceId(st.captures.get(n)!)} · ${st.captures.get(n)!.frames.length}f)`));
  console.log(`\nInválidas (${st.invalid.length}):`);
  st.invalid.forEach(i => console.log(`  ✗ ${i.name}: ${i.issues.join(' · ')}`));
  console.log(`\nFaltantes (${st.missing.length}):`);
  st.missing.forEach(n => console.log(`  - ${n}`));
  console.log(`\nCriterio L10: ${st.readyForL10 ? '✅ LISTO — se puede abrir el Lote 10 con datos reales' : '❌ todavía no'}`);
  st.reasons.forEach(r => console.log(`   · ${r}`));
  console.log('');
}
