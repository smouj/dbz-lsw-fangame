// ═══════════════════════════════════════════════════════════════════════
// ROM PENDING CUE CLOSURE AUDIT
// ═══════════════════════════════════════════════════════════════════════
// Inventario determinista de los huecos ROM que el compilador mantiene
// explícitamente como ROM_PENDING. Este módulo no modifica el runtime ni
// convierte una inferencia en evidencia: solo agrupa las ocurrencias vivas,
// conserva su frontera STATIC/DYNAMIC y explica el bloqueo concreto.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS, type CardDef } from '../src/data/cards';
import { romActionExecutionDescriptorForCard } from '../src/battle/romActionExecutionDescriptors';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';
import type { RomPendingCue, TimelineEntry } from '../src/battle/engine/presentation/PresentationCue';

export const PENDING_CUE_DOC_MD = 'docs/rom/audit/rom-pending-cues.md';
export const PENDING_CUE_DOC_JSON = 'docs/rom/audit/rom-pending-cues.json';
export const PENDING_CUE_DOC_CSV = 'docs/rom/audit/rom-pending-cues.csv';

export type PendingCueCause =
  | 'ACTOR_SELECTOR_UNPROVEN'
  | 'STAGE_PHYSICAL_TEXTURE_BINDING'
  | 'SUPPORT_KNOCKDOWN_PAYLOAD'
  | 'SUPPORT_FSM_DETAIL'
  | 'SPECIAL_RESULT_BRANCH_DYNAMIC'
  | 'PRELOADED_NOT_STARTED_GLOBAL'
  | 'OTHER_STATIC_PENDING';

export type PendingCueStatus = 'STATIC_CLOSURE_CANDIDATE' | 'PENDING_ROM_TRACE';

export interface PendingCueRow {
  key: string;
  cardId: number;
  cardName: string;
  cardType: CardDef['type'];
  handler: number;
  handlerHex: string;
  family: string;
  boundary: RomPendingCue['boundary'];
  tick: number;
  reason: string;
  cause: PendingCueCause;
  status: PendingCueStatus;
  evidence: string;
  sourceEvent: string;
  profileId: string | null;
}

export interface PendingCueCauseDefinition {
  cause: PendingCueCause;
  title: string;
  status: PendingCueStatus;
  blocker: string;
  remediation: string;
}

export interface PendingCueGroup extends PendingCueCauseDefinition {
  count: number;
  staticCount: number;
  dynamicCount: number;
  cards: Array<{ id: number; name: string }>;
  handlers: string[];
  families: string[];
  reasons: string[];
}

export interface PendingCueAuditReport {
  schemaVersion: 1;
  generatedFrom: 'ROM_PRESENTATION_TIMELINES';
  cards: number;
  pendingCues: number;
  staticPendingCues: number;
  dynamicPendingCues: number;
  cardsWithPendingCues: number;
  groups: PendingCueGroup[];
  rows: PendingCueRow[];
}

const CAUSE_DEFINITIONS: readonly PendingCueCauseDefinition[] = [
  {
    cause: 'ACTOR_SELECTOR_UNPROVEN',
    title: 'Actor sequence selector not proven',
    status: 'STATIC_CLOSURE_CANDIDATE',
    blocker: 'The compiler has the ROM resource but cannot select a physical actor sequence without the actor form/profile key or a proven selector row.',
    remediation: 'Extend the shared ROM selector table or capture the missing form/state branch, then let ProductionFrameResolver consume the demonstrated sequence.',
  },
  {
    cause: 'STAGE_PHYSICAL_TEXTURE_BINDING',
    title: 'Stage Bank $61 physical texture binding incomplete',
    status: 'STATIC_CLOSURE_CANDIDATE',
    blocker: 'The Bank $61 timing and visualFrameId are known, but the selected physical texture is not fully present in ROM_PHYSICAL_CORPUS for every form.',
    remediation: 'Complete the canonical Bank $61 physical corpus mapping from ROM evidence; do not substitute a semantic pose or a guessed PNG.',
  },
  {
    cause: 'SUPPORT_KNOCKDOWN_PAYLOAD',
    title: 'Support worker $0B payload grammar incomplete',
    status: 'STATIC_CLOSURE_CANDIDATE',
    blocker: 'The worker states and CA53/CAA2 payload are identified, but the exact presentation grammar for the result states is not yet decoded.',
    remediation: 'Decode the worker result payload and prove its resource/sequence/STOP transitions before promoting the cues.',
  },
  {
    cause: 'SUPPORT_FSM_DETAIL',
    title: 'Support worker $0F FSM detail incomplete',
    status: 'STATIC_CLOSURE_CANDIDATE',
    blocker: 'The worker transition addresses are known, but their resource and sequence choreography has not been completely decoded.',
    remediation: 'Resolve the $3239/$2FCE/$34C7 branch grammar from ROM or a focused trace and wire it through the existing support compiler.',
  },
  {
    cause: 'SPECIAL_RESULT_BRANCH_DYNAMIC',
    title: 'Special handler result branch remains dynamic',
    status: 'PENDING_ROM_TRACE',
    blocker: 'The special handler dispatch is known, but HIT/MISS/GUARD and inter-phase transitions depend on runtime state not available to the static compiler.',
    remediation: 'Capture the handler in a native ROM trace, record branch state/resource/sequence/ticks/STOP, and promote only the observed branch.',
  },
  {
    cause: 'PRELOADED_NOT_STARTED_GLOBAL',
    title: 'AnimationSlot8 is preloaded but has no global start evidence',
    status: 'STATIC_CLOSURE_CANDIDATE',
    blocker: 'The ROM marks the slot as preloaded, but this route has no demonstrated global animation start that Production can safely consume.',
    remediation: 'Trace the global start/stop owner. Until then keep the slot visible as an explicit pending cue rather than inventing a pose.',
  },
  {
    cause: 'OTHER_STATIC_PENDING',
    title: 'Other static ROM gap',
    status: 'STATIC_CLOSURE_CANDIDATE',
    blocker: 'The compiler reported a static ROM gap that does not match a currently classified closure family.',
    remediation: 'Add a precise ROM evidence classification before changing the compiler; an unclassified gap must fail the audit.',
  },
];

const DEFINITION_BY_CAUSE = new Map(CAUSE_DEFINITIONS.map(definition => [definition.cause, definition]));

function classifyReason(reason: string): PendingCueCause {
  if (/Stage .*sequence selector|actorFormId\/sequenceSelector is not proven/i.test(reason)) {
    return 'ACTOR_SELECTOR_UNPROVEN';
  }
  if (/Stage physical texture binding/i.test(reason)) {
    return 'STAGE_PHYSICAL_TEXTURE_BINDING';
  }
  if (/worker \$0B states/i.test(reason)) {
    return 'SUPPORT_KNOCKDOWN_PAYLOAD';
  }
  if (/worker \$0F states/i.test(reason)) {
    return 'SUPPORT_FSM_DETAIL';
  }
  if (/special handler result branch/i.test(reason)) {
    return 'SPECIAL_RESULT_BRANCH_DYNAMIC';
  }
  if (/PRELOADED_NOT_STARTED_GLOBAL/i.test(reason)) {
    return 'PRELOADED_NOT_STARTED_GLOBAL';
  }
  return 'OTHER_STATIC_PENDING';
}

function evidenceFor(entry: TimelineEntry): string {
  const source = entry.romSource;
  if (!source) return entry.fidelity;
  return `${entry.fidelity}; ${source.kind}; ${source.profileFamily}; static=${source.staticCompletion}; dynamicPending=${source.dynamicPending}`;
}

function rowFor(input: {
  card: CardDef;
  family: string;
  handler: number;
  handlerHex: string;
  entry: TimelineEntry;
  cueIndex: number;
  cue: RomPendingCue;
}): PendingCueRow {
  const cause = classifyReason(input.cue.reason);
  const definition = DEFINITION_BY_CAUSE.get(cause);
  if (!definition) throw new Error(`Missing definition for pending cause ${cause}`);
  return {
    key: `${input.card.id}|${input.cueIndex}|${input.cue.tick}|${cause}`,
    cardId: input.card.id,
    cardName: input.card.name,
    cardType: input.card.type,
    handler: input.handler,
    handlerHex: input.handlerHex,
    family: input.family,
    boundary: input.cue.boundary,
    tick: input.cue.tick,
    reason: input.cue.reason,
    cause,
    status: definition.status,
    evidence: evidenceFor(input.entry),
    sourceEvent: input.entry.sourceEvent,
    profileId: input.entry.profileId,
  };
}

function compareRows(a: PendingCueRow, b: PendingCueRow): number {
  return a.cardId - b.cardId
    || a.tick - b.tick
    || a.cause.localeCompare(b.cause)
    || a.reason.localeCompare(b.reason)
    || a.key.localeCompare(b.key);
}

export function buildPendingCueAudit(): PendingCueAuditReport {
  const rows: PendingCueRow[] = [];
  const cardsWithPending = new Set<number>();
  for (const card of CARDS) {
    const route = romPresentationTimelineForCard(card, 'player', null);
    if (!route) continue;
    const descriptor = romActionExecutionDescriptorForCard(card);
    route.timeline.entries.forEach((entry, cueIndex) => {
      if (entry.cue.type !== 'ROM_PENDING') return;
      cardsWithPending.add(card.id);
      rows.push(rowFor({
        card,
        family: route.kind,
        handler: descriptor.execution.handler,
        handlerHex: descriptor.execution.handlerHex,
        entry,
        cueIndex,
        cue: entry.cue,
      }));
    });
  }
  rows.sort(compareRows);

  const groups = CAUSE_DEFINITIONS.map(definition => {
    const matching = rows.filter(row => row.cause === definition.cause);
    const cards = new Map(matching.map(row => [row.cardId, row.cardName]));
    return {
      ...definition,
      count: matching.length,
      staticCount: matching.filter(row => row.boundary === 'STATIC').length,
      dynamicCount: matching.filter(row => row.boundary === 'DYNAMIC').length,
      cards: [...cards.entries()].sort((a, b) => a[0] - b[0]).map(([id, name]) => ({ id, name })),
      handlers: [...new Set(matching.map(row => row.handlerHex))].sort(),
      families: [...new Set(matching.map(row => row.family))].sort(),
      reasons: [...new Set(matching.map(row => row.reason))].sort(),
    };
  }).filter(group => group.count > 0);

  return {
    schemaVersion: 1,
    generatedFrom: 'ROM_PRESENTATION_TIMELINES',
    cards: CARDS.length,
    pendingCues: rows.length,
    staticPendingCues: rows.filter(row => row.boundary === 'STATIC').length,
    dynamicPendingCues: rows.filter(row => row.boundary === 'DYNAMIC').length,
    cardsWithPendingCues: cardsWithPending.size,
    groups,
    rows,
  };
}

function csv(value: string | number | null): string {
  const raw = value == null ? '' : String(value);
  return `"${raw.replaceAll('"', '""')}"`;
}

export function renderPendingCueCsv(report: PendingCueAuditReport): string {
  const header = ['key', 'cardId', 'cardName', 'cardType', 'handler', 'handlerHex', 'family', 'boundary', 'tick', 'cause', 'status', 'reason', 'evidence', 'sourceEvent', 'profileId'];
  const lines = [header.join(',')];
  for (const row of report.rows) {
    lines.push([
      row.key, row.cardId, row.cardName, row.cardType, row.handler, row.handlerHex,
      row.family, row.boundary, row.tick, row.cause, row.status, row.reason,
      row.evidence, row.sourceEvent, row.profileId,
    ].map(csv).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function renderPendingCueJson(report: PendingCueAuditReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function renderPendingCueMarkdown(report: PendingCueAuditReport): string {
  const lines = [
    '# ROM pending cue closure audit',
    '',
    'Generated deterministically from `romPresentationTimelineForCard(card, player, null)` and the ROM execution descriptors. This report is an evidence inventory, not a second runtime authority.',
    '',
    `- Cards in SSOT: **${report.cards}**`,
    `- Pending cue occurrences: **${report.pendingCues}** (${report.staticPendingCues} static · ${report.dynamicPendingCues} dynamic)`,
    `- Cards with at least one pending cue: **${report.cardsWithPendingCues}**`,
    '',
    '> A cue occurrence is not a card count: one card can contribute several pending cues at different ticks or phases. No pending row is promoted to a sequence, pose, resource, or frame by this audit.',
    '',
    '## Current groups',
    '',
    '| Cause | Status | Total | Static | Dynamic | Cards | Handlers |',
    '| --- | --- | ---: | ---: | ---: | --- | --- |',
  ];
  const groups = [...report.groups].sort((a, b) => b.count - a.count || a.cause.localeCompare(b.cause));
  for (const group of groups) {
    lines.push(`| ${group.cause} — ${group.title} | ${group.status} | ${group.count} | ${group.staticCount} | ${group.dynamicCount} | ${group.cards.map(card => `${card.id} ${card.name}`).join('; ')} | ${group.handlers.join(', ')} |`);
  }
  lines.push('', '## Closure rules', '');
  lines.push('- `STATIC_CLOSURE_CANDIDATE` means the compiler has enough structure to name a concrete static blocker, but it still requires canonical ROM evidence before promotion.');
  lines.push('- `PENDING_ROM_TRACE` means a runtime branch, result, or inter-phase transition is not statically observable and must remain pending until a native ROM trace exists.');
  lines.push('- Sequence `0`, semantic poses, card-name conditionals, manual PNGs, and procedural substitutes are never valid closure evidence.');
  lines.push('- The existing physical corpus, selector tables, dynamic film tracker, and scene cue registry remain the authorities; this report only cross-references their live compiler output.');
  lines.push('', '## Group blockers and next evidence', '');
  for (const group of groups) {
    lines.push(`### ${group.cause}`, '', `**Blocker:** ${group.blocker}`, '', `**Remediation:** ${group.remediation}`, '', `Reasons: ${group.reasons.map(reason => `\`${reason}\``).join('; ')}`, '');
  }
  lines.push('## Row-level evidence', '', 'The machine-readable CSV/JSON files beside this document preserve each card, handler, family, tick, boundary, compiler reason, source event, and profile provenance.');
  return `${lines.join('\n')}\n`;
}

export { CAUSE_DEFINITIONS };
