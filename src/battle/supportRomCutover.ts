// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — SUPPORT $0B/$0D/$0F runtime cutover (V7.5)
// Gates presentation for (category=SUPPORT, handler=$0B/$0D/$0F) only,
// through the ROM profile/compiler path. Never rolls accuracy, never computes
// damage, never mutates BattleState; it translates the emitted EventLog /
// resolution context (romCA53) into the ROM presentation timeline.
// Preserves the ROM branch $0B state $0D: CA53==0 -> $1E, CA53!=0 -> $14
// (numeric romCA53; semanticOutcome is a separate concern, V7.7).
// ═══════════════════════════════════════════════════════════════════════
import type { CardDef } from '../data/cards';
import type { BattleTimeline } from './engine/presentation/PresentationCue';
import type { RomCA53 } from './engine/rom/romDescriptors';
import {
  romSupportPresentationProfile,
  type SupportWorkerFamily,
} from './romSupportPresentationProfile';
import { compileRomSupportPresentation } from './romSupportPresentationCompiler';
import { ROM_SUPPORT_PHYSICAL_VISUALS } from '../data/generated/romSupportPhysicalVisuals.generated';
import { CARDS } from '../data/cards';

/** Handlers Support especiales con cutover ROM (V7.5). */
export const SUPPORT_SPECIAL_HANDLERS: SupportWorkerFamily[] = ['$0B', '$0D', '$0F'];

export interface SupportSpecialCutoverOptions {
  /** romCA53 numérico (romCA53=0 -> rama $1E; !=0 -> $14 en $0B). */
  romCA53?: RomCA53;
}

export interface SupportSpecialCutover {
  card: CardDef;
  family: SupportWorkerFamily | null;
  handler: number;
  /** Rama CA53 seleccionada (solo $0B). */
  selectedBranch: '$1E' | '$14' | null;
  romCA53: RomCA53 | null;
  timeline: BattleTimeline;
}

const HANDLER_TO_FAMILY: Record<number, SupportWorkerFamily> = {
  0x0b: '$0B',
  0x0d: '$0D',
  0x0f: '$0F',
};

export function supportSpecialCards(): CardDef[] {
  return Object.keys(ROM_SUPPORT_PHYSICAL_VISUALS)
    .map((id) => Number(id))
    .filter((id) => HANDLER_TO_FAMILY[ROM_SUPPORT_PHYSICAL_VISUALS[id].handler] !== undefined)
    .map((id) => CARDS.find((c) => c.id === id))
    .filter((c): c is CardDef => Boolean(c));
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
    selectedBranch,
    romCA53: options.romCA53 ?? null,
    timeline: compiled.timeline,
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
