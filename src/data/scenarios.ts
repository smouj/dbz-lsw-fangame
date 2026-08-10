// ═══════════════════════════════════════════════════════════
// DBZ LSW — Escenarios de batalla (dos representaciones por escenario)
// Cada escenario tiene:
//   overviewBackground → fondo TÁCTICO (sprites pequeños, selección)
//   actionBackground   → fondo de ACCIÓN (sprites grandes, QTE, animación)
// Además existe specialActionBackground (genérico, independiente).
// ═══════════════════════════════════════════════════════════

export interface BattleScenario {
  id: string;
  overviewBackground: string;
  actionBackground: string;
}

export const SCENARIOS: BattleScenario[] = Array.from({ length: 13 }, (_, i) => ({
  id: `scenario_${String(i + 1).padStart(2, '0')}`,
  overviewBackground: `/assets/backgrounds/scenarios/${String(i + 1).padStart(2, '0')}_world.png`,
  actionBackground: `/assets/backgrounds/scenarios/${String(i + 1).padStart(2, '0')}_action.png`,
}));

export const SPECIAL_ACTION_BACKGROUND = '/assets/backgrounds/scenarios/special_action.png';

export type BattleViewMode = 'OVERVIEW' | 'ACTION' | 'SPECIAL_ACTION';
