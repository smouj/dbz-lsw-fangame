// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — SUPPORT runtime cutover (V7.5 → V8: SUPPORT_OR_FIELD_EFFECT)
// Gates presentation for (category=SUPPORT, handler $00/$02/$0B/$0D/$0F)
// through the ROM profile/compiler path, in TWO tiers:
//
//   worker       ($0B/$0D/$0F, 22 cartas) — comportamiento V7.5 INTACTO:
//                rama CA53 $1E/$14 en $0B (romCA53 numérico), macro $2B en
//                $0D, $0F FSM propia con ROM_PENDING.
//   field-effect ($00/$02, 25 cartas)     — compilación PLANA vía
//                romSupportPresentationProfile + compileRomSupportPresentation
//                (sin branch, sin hydratación de ROM_RESULT_BRANCH — ese cue
//                no existe en su programa), sourceEvent 'SUPPORT_FIELD_EFFECT'.
//
// Elegibilidad (derivada en código, no a mano): TODAS las de
// ROM_SUPPORT_PHYSICAL_VISUALS sin DEFENSE_ROM_RULES (§62 — las Defense Cards
// van por su cutover DEFENSE_RULE aunque compartan handler en visuals). El
// tier se decide por handler. La única carta de la matriz visual que NO sale
// de LEGACY es #9 "Special Card" (placeholder type 'special', profile kind
// NONE, sin efecto real): no es una carta support — la exclusión es
// card.type === 'support' (mismo criterio que el guardrail $02 del profile
// kind: type support → SUPPORT_OR_FIELD_EFFECT).
//
// Nunca rueda accuracy, nunca computa daño, nunca muta BattleState; traduce
// el EventLog / contexto de resolución (romCA53) al timeline ROM.
// ═══════════════════════════════════════════════════════════════════════
import type { CardDef } from '../data/cards';
import type { BattleActionDescriptor } from './engine/events/BattleEvent';
import type { BattleEventEnvelope } from './engine/events/EventLog';
import type { BattleTimeline } from './engine/presentation/PresentationCue';
import { DEFENSE_ROM_RULES, type RomCA53 } from './engine/rom/romDescriptors';
import {
  romSupportPresentationProfile,
  type SupportWorkerFamily,
} from './romSupportPresentationProfile';
import { compileRomSupportPresentation } from './romSupportPresentationCompiler';
import { ROM_SUPPORT_PHYSICAL_VISUALS } from '../data/generated/romSupportPhysicalVisuals.generated';
import { CARDS } from '../data/cards';

/** Handlers Support especiales (worker) con cutover ROM (V7.5). */
export const SUPPORT_SPECIAL_HANDLERS: SupportWorkerFamily[] = ['$0B', '$0D', '$0F'];

/** Handlers Support comunes / field-effect ($00/$02, BG $19 + HOLD120). */
export const FIELD_EFFECT_HANDLERS: SupportWorkerFamily[] = ['$00', '$02'];

export type SupportCutoverTier = 'worker' | 'field-effect';

export interface SupportSpecialCutoverOptions {
  /** romCA53 numérico (romCA53=0 -> rama $1E; !=0 -> $14 en $0B). */
  romCA53?: RomCA53;
}

export interface SupportSpecialCutover {
  card: CardDef;
  /** Familia worker ($0B/$0D/$0F) o field-effect ($00/$02) que la gobierna. */
  family: SupportWorkerFamily | null;
  handler: number;
  tier: SupportCutoverTier;
  /** Rama CA53 seleccionada (solo $0B worker). */
  selectedBranch: '$1E' | '$14' | null;
  romCA53: RomCA53 | null;
  timeline: BattleTimeline;
  /** Cues ROM_PENDING del timeline (nunca se silencian). */
  pendingCues: number;
}

const HANDLER_TO_FAMILY: Record<number, SupportWorkerFamily> = {
  0x0b: '$0B',
  0x0d: '$0D',
  0x0f: '$0F',
};

const FIELD_EFFECT_HANDLER_TO_FAMILY: Record<number, '$00' | '$02'> = {
  0x00: '$00',
  0x02: '$02',
};

function isFieldEffectHandler(handler: number): boolean {
  return handler === 0x00 || handler === 0x02;
}

function supportVisualFor(cardId: number) {
  return ROM_SUPPORT_PHYSICAL_VISUALS[cardId] ?? null;
}

/** Carta Support real (type 'support') en la matriz visual. Excluye #9
 *  "Special Card" (type 'special', placeholder N/A, kind NONE). */
function isSupportTypeCard(cardId: number): boolean {
  return CARDS.some((c) => c.id === cardId && c.type === 'support');
}

// ── TIER WORKER ($0B/$0D/$0F) — V7.5 intacto ──────────────────────────

export function supportSpecialCards(): CardDef[] {
  return Object.keys(ROM_SUPPORT_PHYSICAL_VISUALS)
    .map((id) => Number(id))
    .filter((id) => HANDLER_TO_FAMILY[ROM_SUPPORT_PHYSICAL_VISUALS[id].handler] !== undefined)
    .map((id) => CARDS.find((c) => c.id === id))
    .filter((c): c is CardDef => Boolean(c));
}

/** Resuelve la carta Support especial ($0B/$0D/$0F) para una acción, o null. */
export function supportSpecialCardForAction(action: BattleActionDescriptor): CardDef | null {
  const card = CARDS.find((c) => c.name === action.label);
  if (!card) return null;
  const visual = ROM_SUPPORT_PHYSICAL_VISUALS[card.id];
  if (!visual) return null;
  return HANDLER_TO_FAMILY[visual.handler] ? card : null;
}

/**
 * Cutover runtime para Support especial: traduce la acción a su timeline ROM.
 * romCA53 no está (todavía) en el BattleEventLog — el Engine aún no expone el
 * resultado autoritativo del soporte; por eso $0B usa la rama por defecto
 * ($14) dejando selectedSourceEvent sin setear (honesto, análogo a como el
 * puente de producción no resuelve el outcome de beam). Determinista.
 */
export function compileSupportRomRuntimeCutover(
  events: BattleEventEnvelope[],
  actionStartedIndex: number,
  env: BattleEventEnvelope & { event: { type: 'ACTION_STARTED' } },
): SupportSpecialCutover | null {
  void events; void actionStartedIndex;
  // Captura AMBOS tiers ANTES del fallback LEGACY de escena: worker primero
  // ($0B/$0D/$0F, intacto), después field-effect ($00/$02).
  const card = supportSpecialCardForAction(env.event.action)
    ?? supportFieldEffectCardForAction(env.event.action);
  if (!card) return null;
  const visual = supportVisualFor(card.id);
  if (!visual) return null;
  if (HANDLER_TO_FAMILY[visual.handler]) {
    // romCA53 se resolverá cuando el Engine lo exponga; hoy usamos el valor
    // por defecto ($0B → $14). Se deja el parámetro por si pasa a estar
    // disponible más adelante.
    return supportSpecialCutover(card.id, {});
  }
  return supportFieldEffectCutover(card.id);
}

/**
 * Compila el cutover de una carta Support especial ($0B/$0D/$0F).
 * - $0B: selecciona la rama CA53 (romCA53==0 -> $1E; !=0 -> $14) y rellena el
 *        ROM_RESULT_BRANCH con la rama elegida.
 * - $0D/$0F: sin branch; timeline del profile.
 */
export function supportSpecialCutover(
  cardId: number,
  options: SupportSpecialCutoverOptions = {},
): SupportSpecialCutover | null {
  const card = CARDS.find((c) => c.id === cardId);
  const visual = ROM_SUPPORT_PHYSICAL_VISUALS[cardId];
  if (!card || !visual) return null;
  const family = HANDLER_TO_FAMILY[visual.handler];
  if (!family) return null;

  const profile = romSupportPresentationProfile({ cardId });
  let selectedBranch: '$1E' | '$14' | null = null;

  if (family === '$0B') {
    selectedBranch = options.romCA53 === 0 ? '$1E' : '$14';
    // Rehidrata el branch con la rama seleccionada (presentación, no gameplay).
    profile.cues = profile.cues.map((cue) => {
      if (cue.type === 'ROM_RESULT_BRANCH') {
        return {
          ...cue,
          selectedFamily: selectedBranch ?? undefined,
          selectedSourceEvent: options.romCA53 !== undefined ? `romCA53=${options.romCA53}` : undefined,
        } as typeof cue;
      }
      return cue;
    });
  }

  const compiled = compileRomSupportPresentation(profile, {
    sourceEvent: family === '$0B' ? `CA53_BRANCH_${selectedBranch}` : 'SUPPORT_SPECIAL',
  });

  return {
    card,
    family,
    handler: visual.handler,
    tier: 'worker',
    selectedBranch,
    romCA53: options.romCA53 ?? null,
    timeline: compiled.timeline,
    pendingCues: compiled.pending.length,
  };
}

// ── TIER FIELD-EFFECT ($00/$02) — SUPPORT_OR_FIELD_EFFECT ──────────────

/** Las 25 cartas field-effect ($00/$02, ROM-backed, sin DEFENSE_ROM_RULES). */
export function supportFieldEffectCards(): CardDef[] {
  return Object.keys(ROM_SUPPORT_PHYSICAL_VISUALS)
    .map((id) => Number(id))
    .filter((id) => {
      const visual = ROM_SUPPORT_PHYSICAL_VISUALS[id];
      if (!visual || !isFieldEffectHandler(visual.handler)) return false;
      if (DEFENSE_ROM_RULES[id]) return false; // §62: va por DEFENSE_RULE
      return isSupportTypeCard(id);            // excluye #9 placeholder (special)
    })
    .map((id) => CARDS.find((c) => c.id === id))
    .filter((c): c is CardDef => Boolean(c));
}

/** Resuelve la carta field-effect ($00/$02) para una acción, o null. */
export function supportFieldEffectCardForAction(action: BattleActionDescriptor): CardDef | null {
  const card = CARDS.find((c) => c.name === action.label);
  if (!card) return null;
  const visual = supportVisualFor(card.id);
  if (!visual || !isFieldEffectHandler(visual.handler)) return null;
  if (DEFENSE_ROM_RULES[card.id]) return null; // §62: va por DEFENSE_RULE
  if (!isSupportTypeCard(card.id)) return null; // #9 placeholder N/A
  return card;
}

/**
 * Compila el cutover de una carta field-effect ($00/$02): compilación PLANA
 * del profile (SUPPORT_VISUAL_LOAD + PALETTE_LOAD + BG_ASSEMBLY $19 +
 * PALETTE_TRANSITION + ROM_WAIT HOLD120), sin branch ni hydratación de
 * ROM_RESULT_BRANCH (no existe en su programa — el worker $0B lo rehidrata,
 * esta familia no tiene ese cue). sourceEvent honesto 'SUPPORT_FIELD_EFFECT'.
 * Determinista: misma carta → mismo timeline.
 */
export function supportFieldEffectCutover(cardId: number): SupportSpecialCutover | null {
  const card = CARDS.find((c) => c.id === cardId);
  const visual = supportVisualFor(cardId);
  if (!card || !visual || !isFieldEffectHandler(visual.handler)) return null;
  if (DEFENSE_ROM_RULES[cardId]) return null; // §62: va por DEFENSE_RULE
  if (!isSupportTypeCard(cardId)) return null; // #9 placeholder N/A

  const profile = romSupportPresentationProfile({ cardId });
  const compiled = compileRomSupportPresentation(profile, {
    sourceEvent: 'SUPPORT_FIELD_EFFECT',
  });

  return {
    card,
    family: FIELD_EFFECT_HANDLER_TO_FAMILY[visual.handler] ?? null,
    handler: visual.handler,
    tier: 'field-effect',
    selectedBranch: null,
    romCA53: null,
    timeline: compiled.timeline,
    pendingCues: compiled.pending.length,
  };
}

export interface SupportFieldEffectCutoverSummary {
  total: number;
  romBacked: number;
  legacy: number;
  families: Record<string, number>;
}

export function supportFieldEffectCutoverSummary(): SupportFieldEffectCutoverSummary {
  const cards = supportFieldEffectCards();
  const families: Record<string, number> = {};
  for (const card of cards) {
    const family = FIELD_EFFECT_HANDLER_TO_FAMILY[ROM_SUPPORT_PHYSICAL_VISUALS[card.id].handler] ?? '?';
    families[family] = (families[family] ?? 0) + 1;
  }
  return {
    total: cards.length,
    romBacked: cards.length,
    legacy: 0,
    families,
  };
}

export interface SupportSpecialCutoverSummary {
  total: number;
  romBacked: number;
  legacy: number;
  families: Record<string, number>;
  branchFamilies: string[];
}

export function supportSpecialCutoverSummary(): SupportSpecialCutoverSummary {
  const cards = supportSpecialCards();
  const families: Record<string, number> = {};
  for (const card of cards) {
    const family = HANDLER_TO_FAMILY[ROM_SUPPORT_PHYSICAL_VISUALS[card.id].handler];
    families[family] = (families[family] ?? 0) + 1;
  }
  return {
    total: cards.length,
    romBacked: cards.length,
    legacy: 0,
    families,
    branchFamilies: ['$1E', '$14'],
  };
}
