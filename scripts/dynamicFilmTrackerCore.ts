// ═══════════════════════════════════════════════════════════════════════
// DYNAMIC FILM TRACKER — core (single source of truth)
// ═══════════════════════════════════════════════════════════════════════
// P0.2 slice 1: convierte el universo "dynamic pending" en un tracker POR
// CAUSA RAÍZ. Dos ejes, ambos contados por causa (A-G) y nunca solapados:
//
//   films       = perfiles ROM con completion.dynamic === 'PENDING_ROM_TRACE'
//                 (26 hoy: SPECIAL_HANDLER cuyo result-branch/FSM sigue abierto)
//   occurrences = decisiones dinámicas reales todavía abiertas:
//                 - ventanas FX con scroll/timing PENDING_ROM_TRACE
//                 - selector tracks de actor con kind DYNAMIC_PENDING
//
// La clasificación es DETERMINISTA y deriva de datos reales (bindings,
// perfiles, runtime_cutover.json, FX corpus) — ninguna fila se fabrica.
// Cada fila cae EXACTAMENTE en una causa A-G; una fila sin evidencia que la
// clasifique sería cause G (UNKNOWN_REASON genuino), nunca un pendiente
// genérico sin explicación.
//
// Regla de clasificación (provenance documentado en docs/rom/audit/
// dynamic-film-tracker.md):
//   fx row + card con ROM_FX_WINDOW en runtime_cutover.json
//       (window.scroll/timing.status === 'PENDING_ROM_TRACE')  → A
//   actor row (N sequences físicas cerradas; selección por handler) → D
//   fx row fuera del runtime cutover:
//       card ∈ films y worker MULTI_ACTOR_SCRIPT (Bank3:$5C04/$5D0C) → B
//       card ∈ films y worker TAIL/SPECIAL/BUU_BALL                → D
//       card ∉ films (SUPPORT_OR_FIELD_EFFECT/DEFENSE_RULE/...)    → F
//   (C contact/anchors y E screen-path/motion no tienen occurrences hoy;
//    G unknown genuino no tiene filas hoy: 0 pendientes SIN explicación.)
// ═══════════════════════════════════════════════════════════════════════

import { getRomActionSequenceBindings } from '../src/data/romActionSequenceBinding';
import { compileAllRomPresentationProfiles } from '../src/battle/romPresentationCompiler';
import { romPresentationProfileForCard } from '../src/battle/romPresentationProfiles';
import { CARDS } from '../src/data/cards';
import runtimeCutover from '../generated/rom-fx/runtime_cutover.json';

export const TRACKER_DOC_DIR = 'docs/rom/audit';
export const TRACKER_DOC_MD = `${TRACKER_DOC_DIR}/dynamic-film-tracker.md`;
export const TRACKER_DOC_CSV = `${TRACKER_DOC_DIR}/dynamic-film-tracker.csv`;

// ── Taxonomía de causas (A-G) ──────────────────────────────────────────
export interface CauseDef {
  code: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  name: string;
  description: string;
  evidenceProvenance: string;
}

export const CAUSE_DEFS: CauseDef[] = [
  {
    code: 'A',
    name: 'Beam/window SCX/SCY + tick timing',
    description: 'ROM_FX_WINDOW de beams/proyectiles ya emitido (static complete) pero scroll base SCX/SCY ($C407/$C409 + C405/C406) y tick timing/cleanup siguen PENDING_ROM_TRACE.',
    evidenceProvenance: 'generated/rom-fx/runtime_cutover.json → rows[cardId].playerWindows[].scroll/timing.status === PENDING_ROM_TRACE (evidencia SFX-V4-05).',
  },
  {
    code: 'B',
    name: 'Multi-actor ownership/spatial choreography',
    description: 'Films SPECIAL_HANDLER con worker MULTI_ACTOR_SCRIPT (Bank3:$5C04/$5D0C, handlers $0D/$0E): el FX/actor helper no tiene dueño ni ancla espacial trazado frente al target.',
    evidenceProvenance: 'RomActionExecutionDescriptor.execution.workerFamily === MULTI_ACTOR_SCRIPT; profile kind SPECIAL_HANDLER; pending "special handler result branch ... inter-phase state transitions".',
  },
  {
    code: 'C',
    name: 'Contact/anchors rush-impact-defender',
    description: 'Contacto/anclas del rush-impact contra el defensor (familia STANDARD_DAMAGE/contacto). Sin occurrences abiertas en este slice: familia selector-closed en P0.1.',
    evidenceProvenance: '—',
  },
  {
    code: 'D',
    name: 'Dynamic branch runtime (result-branch/FSM + selección de secuencia del actor)',
    description: 'Result-branch HIT/MISS/GUARD + transiciones inter-fase del FSM del special handler, o selección runtime de secuencia entre N cerradas del actor.',
    evidenceProvenance: 'profile completion.pending "special handler result branch (HIT/MISS/GUARD) and inter-phase state transitions remain dynamic trace territory"; selector evidence "N physical sequences are closed; handler $XX selection semantics are not promoted".',
  },
  {
    code: 'E',
    name: 'Screen path/motion workers ROM',
    description: 'Workers de screen path / ROM motion sin cablear. Sin occurrences abiertas en este slice (SCREEN_PATH_TABLE estático; FIGHTER_MOTION cerrado).',
    evidenceProvenance: '—',
  },
  {
    code: 'F',
    name: 'Palette/FX timing — dominio FX de soporte/categoría',
    description: 'FX visuals fuera del corpus ofensivo (sin bundle (fx,palette) en el runtime cutover): auras/soportes/efectos de cartas SUPPORT/DEFENSE/regla. El corpus lo declara abierto.',
    evidenceProvenance: 'ROM_FX_CORPUS_SUMMARY.statuses: supportVisuals SEPARATE_DOMAIN · supportAuraBlue/gatherPowerAuraOrange UNRESOLVED; ausencia de bundle en runtime_cutover.json.',
  },
  {
    code: 'G',
    name: 'Unknown genuine (sin evidencia clasificatoria)',
    description: 'Solo si una fila no se puede clasificar con evidencia. HOY: 0 — toda fila traza a ROM o a un archivo generado verificado.',
    evidenceProvenance: '—',
  },
];

export const CAUSE_BY_CODE = new Map(CAUSE_DEFS.map(c => [c.code, c]));

// ── Filas ──────────────────────────────────────────────────────────────
export type EvidenceStatus = 'STATIC_EVIDENCE' | 'PARTIAL_DYN_EVIDENCE';

export interface OccurrenceRow {
  key: string; // cardId|trackId|resourceHex — identidad frente a datos vivos
  cardId: number;
  cardName: string;
  handlerHex: string;
  family: string;
  worker: string | null;
  trackId: string;
  resourceHex: string | null;
  sequence: string; // secuencias físicas cerradas ("0-3") o '—'
  physicalStatus: string;
  cause: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  reasonCode: string;
  evidenceStatus: EvidenceStatus;
  blocker: string;
  evidence: string;
}

export interface FilmRow {
  cardId: number;
  cardName: string;
  handlerHex: string;
  family: string;
  worker: string | null;
  kind: string;
  cause: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  reasonCode: string;
  evidenceStatus: EvidenceStatus;
  blocker: string;
  pendingItems: string[];
}

export interface TrackerTotals {
  occurrencesTotal: number;
  filmsTotal: number;
  occurrencesByCause: Record<string, number>;
  filmsByCause: Record<string, number>;
}

const WORKER_MULTI_ACTOR = /Bank3:\$5C04|Bank3:\$5D0C/;

function sequenceLabel(sequences: number[]): string {
  if (sequences.length === 0) return '—';
  if (sequences.length === 1) return String(sequences[0]);
  const sorted = [...sequences].sort((a, b) => a - b);
  const contiguous = sorted.every((s, i) => i === 0 || s === sorted[i - 1] + 1);
  return contiguous ? `${sorted[0]}-${sorted[sorted.length - 1]}` : sorted.join(',');
}

interface RuntimeWindowRow {
  cardId: number;
  name?: string;
  fxResource?: string;
  status?: string;
  playerWindows?: Array<{ scroll?: { status?: string }; timing?: { status?: string }; evidence?: string[] }>;
  [k: string]: unknown;
}

function runtimeWindowEvidenceFor(cardId: number): { evidence: string; status: EvidenceStatus } {
  const rows = (runtimeCutover.rows as RuntimeWindowRow[]).filter(r => r.cardId === cardId);
  const window = rows[0]?.playerWindows?.[0];
  if (!window) return { evidence: 'no window row in runtime_cutover.json', status: 'STATIC_EVIDENCE' };
  const pendingLine = (window.evidence ?? []).find(line => line.startsWith('PENDING_ROM_TRACE'))
    ?? (window.scroll?.status ? `window scroll.status=${window.scroll.status}` : '');
  // SFX-V4-05 capturó card 12 (Kamehameha LEFT): C405/C406 coinciden con la
  // fila del selector; la fórmula per-scanline sigue sin probar.
  const status: EvidenceStatus = cardId === 12 ? 'PARTIAL_DYN_EVIDENCE' : 'STATIC_EVIDENCE';
  return { evidence: pendingLine, status };
}

const BLOCKERS: Record<string, string> = {
  A: 'SFX-V4-05 per-scanline capture (LY 23-95): probar SCY=low($C407)+C405 / SCX=low($C409)+C406 en vivo; RIGHT/side2 mirror (C406=0xA9); handler $07 ventana rows 3-10; FIRST/LAST_SCROLL_CHANGE + RESTORE_TICK. Después: cablear loadBeamBgOffsets/getBeamFrameDeltas a consumidores y quitar PENDING_ROM_TRACE.',
  B: 'Trace FSM/runtime del worker MULTI_ACTOR_SCRIPT (Bank3:$5C04 / Bank3:$5D0C): quién es dueño del actor/helper, ancla espacial y coreografía frente al target; solo entonces cerrar result-branch HIT/MISS/GUARD de la familia $0D/$0E.',
  D_ACTOR: 'Trace FSM del handler: qué estado/branch selecciona la secuencia entre las N físicas cerradas (result macros $2F/$30/$31 u operación interna del worker); evidencia dinámica por worker antes de promover selector.',
  D_FILM: 'Trace del film SPECIAL_HANDLER (worker Bank3:$61C5 / Bank3:$5E67 / Bank3:$62D4): result-branch HIT/MISS/GUARD + transiciones inter-fase; el FX del film se cierra con el mismo trace.',
  F: 'Resolver el dominio FX de soporte/categoría en el corpus: supportVisuals SEPARATE_DOMAIN, supportAuraBlue/gatherPowerAuraOrange UNRESOLVED; exportar bundles (fx,palette) no-ofensivos o declarar su grammar por categoría.',
};

const REASON_CODES: Record<string, string> = {
  A: 'BEAM_WINDOW_SCX_SCY_TIMING_OPEN',
  B: 'MULTI_ACTOR_HELPER_OWNERSHIP_OPEN',
  D_ACTOR: 'ACTOR_SEQ_RUNTIME_SELECTION_OPEN',
  D_FILM: 'SPECIAL_FILM_FX_FSM_OPEN',
  D_FILM_ROW: 'SPECIAL_RESULT_BRANCH_FSM_OPEN',
  F: 'SUPPORT_FX_DOMAIN_CORPUS_OPEN',
};

export function buildOccurrenceRows(): OccurrenceRow[] {
  const rows: OccurrenceRow[] = [];

  // FX/display resources do not select AnimationResource sequences. Track the
  // real open decision instead: the ROM window whose scroll/timing still needs
  // a per-scanline trace.
  for (const runtime of runtimeCutover.rows as RuntimeWindowRow[]) {
    const window = runtime.playerWindows?.[0];
    if (!window || (window.scroll?.status !== 'PENDING_ROM_TRACE' && window.timing?.status !== 'PENDING_ROM_TRACE')) continue;
    const binding = getRomActionSequenceBindings().find(candidate => candidate.card.id === runtime.cardId);
    if (!binding) continue;
    const resourceHex = runtime.fxResource?.replace(/^0x/i, '').padStart(2, '0') ?? null;
    const evidence = runtimeWindowEvidenceFor(runtime.cardId);
    rows.push({
      key: `${runtime.cardId}|fx-window|${resourceHex ?? '—'}`,
      cardId: runtime.cardId,
      cardName: binding.card.name,
      handlerHex: binding.execution.handlerHex,
      family: binding.execution.family,
      worker: binding.execution.worker,
      trackId: 'fx-window',
      resourceHex,
      sequence: '—',
      physicalStatus: runtime.status ?? 'ROM_FX_WINDOW_STATIC_COMPLETE',
      cause: 'A',
      reasonCode: REASON_CODES.A,
      evidenceStatus: evidence.status,
      blocker: BLOCKERS.A,
      evidence: evidence.evidence,
    });
  }

  for (const binding of getRomActionSequenceBindings()) {
    for (const track of binding.tracks) {
      if (track.selector.kind !== 'DYNAMIC_PENDING') continue;
      const cause = 'D' as const;
      const reasonCode = REASON_CODES.D_ACTOR;
      const blocker = BLOCKERS.D_ACTOR;
      const resourceHex = track.resourceId != null ? track.resourceId.toString(16).padStart(2, '0') : null;
      rows.push({
        key: `${binding.card.id}|${track.trackId}|${resourceHex ?? '—'}`,
        cardId: binding.card.id,
        cardName: binding.card.name,
        handlerHex: binding.execution.handlerHex,
        family: binding.execution.family,
        worker: binding.execution.worker,
        trackId: track.trackId,
        resourceHex,
        sequence: sequenceLabel(track.sequences),
        physicalStatus: track.physicalStatus,
        cause,
        reasonCode,
        evidenceStatus: 'STATIC_EVIDENCE',
        blocker,
        evidence: track.selector.evidence,
      });
    }
  }
  return rows.sort((a, b) => a.cause.localeCompare(b.cause) || a.cardId - b.cardId);
}

export function buildFilmRows(): FilmRow[] {
  const profiles = compileAllRomPresentationProfiles().filter(f => f.completion.dynamic === 'PENDING_ROM_TRACE');
  const rows: FilmRow[] = [];
  for (const f of profiles) {
    const card = CARDS.find(c => c.id === f.cardId);
    const profile = card ? romPresentationProfileForCard(card) : null;
    const worker = profile?.execution.worker
      ? `Bank${profile.execution.worker.bank}:$${profile.execution.worker.address.toString(16).toUpperCase()}`
      : null;
    const workerForRule = worker ?? null;
    const isMultiActor = workerForRule != null && WORKER_MULTI_ACTOR.test(workerForRule);
    const cause: 'B' | 'D' = isMultiActor ? 'B' : 'D';
    const handlerHex = profile?.execution.handler != null
      ? `$${profile.execution.handler.toString(16).padStart(2, '0')}`
      : '—';
    rows.push({
      cardId: f.cardId,
      cardName: f.cardName,
      handlerHex,
      family: profile?.execution.family ?? '—',
      worker,
      kind: f.kind,
      cause,
      reasonCode: cause === 'B' ? REASON_CODES.B : REASON_CODES.D_FILM_ROW,
      evidenceStatus: 'STATIC_EVIDENCE',
      blocker: cause === 'B' ? BLOCKERS.B : BLOCKERS.D_FILM,
      pendingItems: f.completion.pending,
    });
  }
  return rows.sort((a, b) => a.cardId - b.cardId);
}

export function trackerTotals(occurrences: OccurrenceRow[], films: FilmRow[]): TrackerTotals {
  const occurrencesByCause: Record<string, number> = {};
  const filmsByCause: Record<string, number> = {};
  for (const row of occurrences) occurrencesByCause[row.cause] = (occurrencesByCause[row.cause] ?? 0) + 1;
  for (const row of films) filmsByCause[row.cause] = (filmsByCause[row.cause] ?? 0) + 1;
  return {
    occurrencesTotal: occurrences.length,
    filmsTotal: films.length,
    occurrencesByCause,
    filmsByCause,
  };
}
