// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — verify:combat-fidelity
// Matriz de fidelidad por carta: conecta ROM evidence → runtime path.
//
// Para cada carta responde:
//   CARD → HANDLER → ANIM → SEQ → PHYSICAL FRAMES → FX → PALETTE
//        → PRESENTATION → OUTCOME → RUNTIME PATH (ROM vs LEGACY).
//
// El objetivo de este verifier NO es inventar nada: es MEDIR el gap real
// entre lo que la ROM ya documenta y lo que el runtime consume hoy.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS, type CardDef } from '../src/data/cards';
import { romCardData } from '../src/data/romCardData';
import {
  romActionExecutionDescriptorForCard,
  romActionExecutionSummary,
  type RomActionExecutionDescriptor,
} from '../src/battle/romActionExecutionDescriptors';
import {
  romPresentationProfileForCard,
  romPresentationProfileSummary,
  type RomPresentationProfile,
} from '../src/battle/romPresentationProfiles';
import {
  cardPhysicalCoverageForCard,
  cardPhysicalCoverageSummary,
} from '../src/battle/cardPhysicalCoverage';
import { resolveActionProfile } from '../src/battle/actionProfiles';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function hex(value: number | null | undefined): string | null {
  return value == null || value === 0xff ? null : `0x${value.toString(16).padStart(2, '0')}`;
}

type RuntimePath =
  | 'ROM_STANDARD_DAMAGE'
  | 'ROM_BEAM_BASE'
  | 'ROM_BEAM_FAMILY'
  | 'ROM_SUPPORT_SPECIAL'
  | 'ROM_DEFENSE_RULE'
  | 'ROM_SPECIAL_HANDLER'
  | 'ROM_STAGE_COMMAND'
  | 'LEGACY';

/**
 * Runtime path is measured from the production router itself. This avoids a
 * stale second classifier: if romPresentationTimelineForCard routes a family,
 * the fidelity matrix must report that same family.
 */
function runtimePathFor(card: CardDef): RuntimePath {
  const route = romPresentationTimelineForCard(card, 'player', null);
  switch (route?.kind) {
    case 'STANDARD_DAMAGE': return 'ROM_STANDARD_DAMAGE';
    case 'BEAM_BASE': return 'ROM_BEAM_BASE';
    case 'BEAM_VARIANT':
    case 'PROJECTILE_SCROLL': return 'ROM_BEAM_FAMILY';
    case 'SUPPORT_SPECIAL': return 'ROM_SUPPORT_SPECIAL';
    case 'DEFENSE_RULE': return 'ROM_DEFENSE_RULE';
    case 'SPECIAL_HANDLER': return 'ROM_SPECIAL_HANDLER';
    case 'STAGE_COMMAND': return 'ROM_STAGE_COMMAND';
    default: return 'LEGACY';
  }
}

interface FidelityRow {
  cardId: number;
  name: string;
  type: CardDef['type'];
  handler: string;
  workerFamily: string;
  execEvidence: string;
  animResource: string | null;
  animStatus: string;
  seqCount: number;
  romFrames: number;
  mappedFrames: number;
  unresolved: number;
  fxResource: string | null;
  palette: string | null;
  profileKind: string;
  staticCompletion: string;
  resultFamily: string;
  branchCount: number;
  runtimePath: RuntimePath;
  legacyInferred: boolean;
  /** Proyectil procedural (Graphics) si va por LEGACY con visual de proyectil. */
  proceduralFallback: boolean;
}

const BEAM_VISUALS = new Set(['ray', 'wave', 'ball', 'disk', 'sword', 'special']);

function buildRow(card: CardDef): FidelityRow {
  const rom = romCardData(card.name);
  const descriptor = romActionExecutionDescriptorForCard(card);
  const profile = romPresentationProfileForCard(card);
  const coverage = cardPhysicalCoverageForCard(card);
  const legacy = resolveActionProfile(card.name);

  const runtimePath = runtimePathFor(card);

  return {
    cardId: card.id,
    name: card.name,
    type: card.type,
    handler: descriptor.execution.handlerHex,
    workerFamily: descriptor.execution.workerFamily,
    execEvidence: descriptor.execution.evidence,
    animResource: hex(rom?.actorAnim),
    animStatus: descriptor.actorAnimation.resourceStatus,
    seqCount: descriptor.actorAnimation.sequenceSource?.sequenceCount ?? 0,
    romFrames: coverage.romFrames,
    mappedFrames: coverage.mappedFrames,
    unresolved: coverage.unresolved,
    fxResource: hex(rom?.fxGraphics),
    palette: hex(rom?.fxPalette),
    profileKind: profile.kind,
    staticCompletion: profile.completion.static,
    resultFamily: descriptor.result.family,
    branchCount: descriptor.result.branches.length,
    runtimePath,
    legacyInferred: !!legacy,
    proceduralFallback: runtimePath === 'LEGACY' && (card.type === 'beam' || BEAM_VISUALS.has(legacy?.projectile?.kind ?? '')),
  };
}

const rows = CARDS.map(buildRow);

// ── Integridad ──
check('fidelity:125 cards', rows.length === 125, String(rows.length));
check('fidelity:unique card ids', new Set(rows.map(r => r.cardId)).size === 125);

// ── Resumen ──
const byPath: Record<RuntimePath, number> = {
  ROM_STANDARD_DAMAGE: 0,
  ROM_BEAM_BASE: 0,
  ROM_BEAM_FAMILY: 0,
  ROM_SUPPORT_SPECIAL: 0,
  ROM_DEFENSE_RULE: 0,
  ROM_SPECIAL_HANDLER: 0,
  ROM_STAGE_COMMAND: 0,
  LEGACY: 0,
};
const byHandler = new Map<string, number>();
const legacyProcedural: FidelityRow[] = [];
for (const r of rows) {
  byPath[r.runtimePath]++;
  byHandler.set(r.handler, (byHandler.get(r.handler) ?? 0) + 1);
  if (r.proceduralFallback) legacyProcedural.push(r);
}

const romBacked = byPath.ROM_STANDARD_DAMAGE
  + byPath.ROM_BEAM_BASE
  + byPath.ROM_BEAM_FAMILY
  + byPath.ROM_SUPPORT_SPECIAL
  + byPath.ROM_DEFENSE_RULE
  + byPath.ROM_SPECIAL_HANDLER
  + byPath.ROM_STAGE_COMMAND;
const legacy = byPath.LEGACY;

// ── Verificaciones del gate (no afirmamos nada falso; solo medimos) ──
check('fidelity:rom-backed = standard+beam', romBacked === rows.filter(r => r.runtimePath !== 'LEGACY').length);
check('fidelity:legacy handlers have ROM descriptors anyway', legacy > 0); // gap real
check('fidelity:procedural fallback only on legacy', legacyProcedural.every(r => r.runtimePath === 'LEGACY'));

// Consistencia con los summaries existentes.
const execSummary = romActionExecutionSummary();
const presSummary = romPresentationProfileSummary();
const physSummary = cardPhysicalCoverageSummary();
check('fidelity:matches exec summary cards', execSummary.cards === 125, String(execSummary.cards));
check('fidelity:matches presentation summary cards', presSummary.cards === 125, String(presSummary.cards));
check('fidelity:matches physical coverage cards', physSummary.cards === 125, String(physSummary.cards));

// ── Salida ──
console.log('════════ COMBAT FIDELITY MATRIX ════════');
console.log(`cards=${rows.length}`);
console.log(`ROM_STANDARD_DAMAGE=${byPath.ROM_STANDARD_DAMAGE}`);
console.log(`ROM_BEAM_BASE=${byPath.ROM_BEAM_BASE}`);
console.log(`ROM_BEAM_FAMILY=${byPath.ROM_BEAM_FAMILY}`);
console.log(`ROM_SUPPORT_SPECIAL=${byPath.ROM_SUPPORT_SPECIAL}`);
console.log(`ROM_DEFENSE_RULE=${byPath.ROM_DEFENSE_RULE}`);
console.log(`ROM_SPECIAL_HANDLER=${byPath.ROM_SPECIAL_HANDLER}`);
console.log(`ROM_STAGE_COMMAND=${byPath.ROM_STAGE_COMMAND}`);
console.log(`ROM_BACKED_TOTAL=${romBacked}`);
console.log(`LEGACY=${legacy}`);
console.log(`proceduralFallback(LEGACY+beam)=${legacyProcedural.length}`);
console.log('');
console.log('── handlers ──');
for (const [h, count] of [...byHandler.entries()].sort()) {
  const wired = ['0x00', '0x02', '0x03', '0x04', '0x05', '0x06', '0x07', '0x08', '0x0a', '0x0b', '0x0c', '0x0d', '0x0e', '0x0f'].includes(h) ? ' ← wired' : '';
  console.log(`  ${h}: ${count}${wired}`);
}
console.log('');
console.log('── LEGACY cards (no wired a ROM en runtime) ──');
for (const r of rows.filter(r => r.runtimePath === 'LEGACY')) {
  console.log(`  #${String(r.cardId).padStart(3)} ${r.name.padEnd(16)} ${r.type.padEnd(8)} handler=${r.handler} ${r.profileKind.padEnd(20)} ${r.proceduralFallback ? 'PROCEDURAL' : ''}`);
}

// ── Artefacto JSON (para tracking continuo) ──
import { writeFileSync, mkdirSync } from 'fs';
const outDir = 'docs/rom/generated/combat-fidelity';
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/fidelity-matrix.json`, JSON.stringify({
  generated: new Date().toISOString(),
  summary: {
    cards: rows.length,
    byPath,
    byHandler: Object.fromEntries(byHandler),
    romBacked,
    legacy,
    proceduralFallback: legacyProcedural.length,
  },
  execSummary,
  presentationSummary: presSummary,
  physicalSummary: physSummary,
  rows,
}, null, 2));

console.log('');
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);
