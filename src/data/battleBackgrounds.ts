// ═══════════════════════════════════════════════════════════
// DBZ LSW — Escenarios de batalla CLASIFICADOS por historia
// ═══════════════════════════════════════════════════════════
// Fuente: paquete DBZ_LSW_BATTLE_BACKGROUNDS_GBC_STORY_CLASSIFIED_V2
// (assets 160×80 idénticos a los ya integrados en scenarios/ — aquí se
// canoniza el NOMBRE, el ARCO de historia y la RECOMENDACIÓN por capítulo).
//
//   overview → plano táctico (NN_world.png) · action → plano de acción
//   (NN_action.png) · special → SPECIAL_ACTION_BACKGROUND (genérico).
//
// Regla de uso: en MODO HISTORIA el escenario se elige por capítulo
// (pickStageForChapter — del arco del capítulo); en VERSUS, aleatorio.
// ═══════════════════════════════════════════════════════════

export interface BattleStage {
  id: number;
  key: string;
  locationEs: string;
  primaryArc: StoryArcKey;
  overview: string;
  action: string;
}

export type StoryArcKey =
  | 'training_and_interludes'
  | 'saiyan_saga'
  | 'namek_frieza_saga'
  | 'android_cell_saga'
  | 'future_trunks_extra_story'
  | 'buu_saga';

const BASE = '/assets/backgrounds/scenarios';
const png = (n: string) => `${BASE}/${n}`;

export const BATTLE_STAGES: BattleStage[] = [
  { id: 1, key: 'earth_grasslands', locationEs: 'Llanuras verdes de la Tierra', primaryArc: 'saiyan_saga', overview: png('01_world.png'), action: png('01_action.png') },
  { id: 2, key: 'earth_desert_wasteland', locationEs: 'Yermo desértico de la Tierra', primaryArc: 'saiyan_saga', overview: png('02_world.png'), action: png('02_action.png') },
  { id: 3, key: 'earth_rocky_badlands', locationEs: 'Badlands rocosas de la Tierra', primaryArc: 'saiyan_saga', overview: png('03_world.png'), action: png('03_action.png') },
  { id: 4, key: 'kamis_lookout', locationEs: 'Mirador de Kami', primaryArc: 'training_and_interludes', overview: png('04_world.png'), action: png('04_action.png') },
  { id: 5, key: 'namek_rocky_field', locationEs: 'Llanura rocosa de Namek', primaryArc: 'namek_frieza_saga', overview: png('05_world.png'), action: png('05_action.png') },
  { id: 6, key: 'cell_games_ring', locationEs: 'Ring de los Cell Games', primaryArc: 'android_cell_saga', overview: png('06_world.png'), action: png('06_action.png') },
  { id: 7, key: 'namek_coast', locationEs: 'Costa de Namek', primaryArc: 'namek_frieza_saga', overview: png('07_world.png'), action: png('07_action.png') },
  { id: 8, key: 'ruined_city', locationEs: 'Ciudad en ruinas', primaryArc: 'android_cell_saga', overview: png('08_world.png'), action: png('08_action.png') },
  { id: 9, key: 'future_ruins_wasteland', locationEs: 'Yermo del futuro devastado', primaryArc: 'future_trunks_extra_story', overview: png('09_world.png'), action: png('09_action.png') },
  { id: 10, key: 'world_tournament_grounds', locationEs: 'Recinto del Torneo Mundial', primaryArc: 'buu_saga', overview: png('10_world.png'), action: png('10_action.png') },
  { id: 11, key: 'earth_forest', locationEs: 'Bosque de la Tierra', primaryArc: 'saiyan_saga', overview: png('11_world.png'), action: png('11_action.png') },
  { id: 12, key: 'supreme_kai_world', locationEs: 'Mundo del Kaio Supremo', primaryArc: 'buu_saga', overview: png('12_world.png'), action: png('12_action.png') },
  { id: 13, key: 'earth_lakeside_field', locationEs: 'Campo abierto junto al agua', primaryArc: 'saiyan_saga', overview: png('13_world.png'), action: png('13_action.png') },
];

export const SPECIAL_ACTION_BACKGROUND = png('special_action.png');

export const STORY_ARCS: Record<StoryArcKey, { nameEs: string; stages: number[] }> = {
  training_and_interludes: { nameEs: 'Entrenamiento e interludios', stages: [4] },
  saiyan_saga: { nameEs: 'Saga Saiyan', stages: [1, 2, 3, 11, 13] },
  namek_frieza_saga: { nameEs: 'Saga Namek / Freezer', stages: [5, 7] },
  android_cell_saga: { nameEs: 'Saga Androides / Cell', stages: [2, 3, 6, 8, 11, 13] },
  future_trunks_extra_story: { nameEs: 'Historia extra de Trunks', stages: [8, 9] },
  buu_saga: { nameEs: 'Saga Majin Buu', stages: [10, 12, 8, 11, 13] },
};

// Capítulo de historia → arco (mismo recorrido que CHAPTERS en main.tsx)
export function arcForChapter(chapter: number): StoryArcKey {
  if (chapter <= 4) return 'saiyan_saga';
  if (chapter <= 10) return 'namek_frieza_saga';
  if (chapter <= 20) return 'android_cell_saga';
  if (chapter <= 22) return 'future_trunks_extra_story';
  if (chapter <= 24) return 'training_and_interludes';
  return 'buu_saga';
}

export function stageForChapter(chapter: number): BattleStage {
  const arc = arcForChapter(chapter);
  const ids = STORY_ARCS[arc].stages;
  const stage = BATTLE_STAGES.find(s => s.id === ids[Math.floor(Math.random() * ids.length)])!;
  return stage;
}
