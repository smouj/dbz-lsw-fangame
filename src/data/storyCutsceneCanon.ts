// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — STORY CUTSCENE PHYSICAL CATALOG
// ═══════════════════════════════════════════════════════════════════════
// 71 physical 160×96 Story images extracted from the cartridge live under
// public/assets/cutscenes/. Their physical order is authoritative.
//
// IMPORTANT PROVENANCE RULE:
// - assetEvidence=ROM_EXTRACTED_PHYSICAL means the PNG itself is ROM-derived.
// - bindingEvidence=SEMANTIC_PHYSICAL_ORDER means the Story grouping follows
//   physical order + scene content, but has NOT yet been elevated to a decoded
//   LOAD_SCENE_RESOURCE ($3E) callsite binding.
// - Never report a SEMANTIC binding as ROM_EXACT.
//
// The remake uses this layer only for dialogue/cutscene presentation. No Story
// Map ($29-$2F), NPC movement, triggers or exploration are represented here.
// ═══════════════════════════════════════════════════════════════════════

export type CutsceneAssetEvidence = 'ROM_EXTRACTED_PHYSICAL';
export type CutsceneBindingEvidence = 'SEMANTIC_PHYSICAL_ORDER' | 'ROM_EXACT';

export interface StoryCutsceneAsset {
  id: number;
  file: string;
  url: string;
  assetEvidence: CutsceneAssetEvidence;
}

const FILES = [
  '001_seven_dragon_balls_on_grass.png',
  '002_kid_goku_riding_flying_nimbus.png',
  '003_goku_chichi_and_gohan_family.png',
  '004_goku_holds_raditz_for_special_beam_cannon.png',
  '005_grassy_valley_battlefield.png',
  '006_stormy_grassy_valley.png',
  '007_gohan_riding_flying_nimbus_over_crater.png',
  '008_energy_burst_silhouette.png',
  '009_ground_impact_explosion.png',
  '010_rocky_wasteland.png',
  '011_island_coastline.png',
  '012_goku_vs_great_ape_vegeta.png',
  '013_yajirobe_cuts_great_ape_vegeta_tail.png',
  '014_capsule_spacecraft_at_night.png',
  '015_frieza_force_ship_over_island.png',
  '016_namek_cliffs_and_water.png',
  '017_namek_shoreline.png',
  '018_frieza_ship_on_namek_cliff.png',
  '019_namek_cave_and_ship.png',
  '020_ginyu_force_group_pose.png',
  '021_frieza_spaceship_exterior.png',
  '022_porunga_summoned.png',
  '023_namek_dragon_balls.png',
  '024_namek_cliff_shoreline.png',
  '025_frieza_fires_energy_beam.png',
  '026_namek_destruction_lightning.png',
  '027_earth_tree_and_mountain_plain.png',
  '028_forest_cliff.png',
  '029_goku_family_house.png',
  '030_earth_cliff_above_clouds.png',
  '031_smoke_explosion_by_cliff.png',
  '032_rocky_plain.png',
  '033_energy_sphere_projectile.png',
  '034_rocky_wasteland_overlook.png',
  '035_rock_wall_and_rubble.png',
  '036_capsule_aircraft_in_sky.png',
  '037_kame_house.png',
  '038_rocky_field_with_scattered_capsules.png',
  '039_kamis_lookout.png',
  '040_coastal_grassland.png',
  '041_hyperbolic_time_chamber_entrance.png',
  '042_cell_games_arena.png',
  '043_fighter_thrown_through_energy_burst.png',
  '044_cell_games_crater.png',
  '045_android_16_grabbed_by_cell.png',
  '046_cell_self_destruct_swollen.png',
  '047_goku_teleports_to_self_destructing_cell.png',
  '048_shenron_summoned.png',
  '049_future_city_ruins.png',
  '050_future_city_skyline.png',
  '051_world_martial_arts_tournament_stadium.png',
  '052_spopovich_attacks_videl.png',
  '053_island_coastline_buu_saga.png',
  '054_babidis_ship_crater.png',
  '055_damaged_world_tournament_stadium.png',
  '056_rocky_wasteland_crater.png',
  '057_dabura_turned_into_cookie.png',
  '058_majin_vegeta_sacrifice_explosion.png',
  '059_gohan_on_sacred_world_of_kai.png',
  '060_sacred_world_of_kai_purple_sky.png',
  '061_z_sword_in_pedestal.png',
  '062_sacred_world_of_kai_green_hills.png',
  '063_pink_energy_silhouette.png',
  '064_rocky_wasteland_buu_saga.png',
  '065_giant_energy_sphere.png',
  '066_kid_buu_vs_goku.png',
  '067_green_coastline_buu_saga.png',
  '068_mr_satan_carries_vegeta.png',
  '069_final_battle_crater_under_pink_sky.png',
  '070_ending_goku_family_and_friends.png',
  '071_blue_story_transition_gradient.png',
] as const;

export const STORY_CUTSCENE_ASSETS: readonly StoryCutsceneAsset[] = FILES.map((file, i) => ({
  id: i + 1,
  file,
  url: `/assets/cutscenes/${file}`,
  assetEvidence: 'ROM_EXTRACTED_PHYSICAL' as const,
}));

export function storyCutsceneAsset(id: number): StoryCutsceneAsset {
  const asset = STORY_CUTSCENE_ASSETS[id - 1];
  if (!asset || asset.id !== id) throw new Error(`Unknown Story cutscene id=${id}`);
  return asset;
}

/** Four ROM recap images shown before Story 1. */
export const STORY_PROLOGUE_CUTSCENES = [1, 2, 3, 4] as const;

/**
 * Dialogue-only Story grouping in remake sequence order (1..32).
 * These arrays preserve the cartridge-extracted physical scene order and remove
 * the old one-background-per-chapter CS() shortcut. A line can therefore advance
 * through multiple physical Story illustrations.
 *
 * They remain SEMANTIC_PHYSICAL_ORDER until direct $3E callsite extraction is
 * persisted. This distinction is intentional and verified.
 */
export const STORY_CUTSCENE_SEQUENCE_BINDINGS: Readonly<Record<number, readonly number[]>> = {
  1: [5],
  2: [6, 7, 8, 9],
  3: [10, 11, 12, 13],
  4: [14],
  5: [15, 16, 17, 18, 19],
  6: [20],
  7: [20],
  8: [20, 21],
  9: [22, 23, 24, 25],
  10: [25, 26],
  11: [27, 28, 29],
  12: [30, 31, 32, 33],
  13: [34, 35],
  14: [36, 37, 38, 39],
  15: [40],
  16: [41],
  17: [42],
  18: [43, 44, 45],
  19: [42, 44, 45],
  20: [46, 47, 48],
  21: [49], // EX Story 1 — future ruins
  22: [50], // EX Story 2 — future skyline
  23: [51], // Story 21
  24: [51, 52], // Story 22
  25: [52, 53, 54], // Story 23
  26: [54, 55, 56, 57, 58], // Story 24
  27: [59, 60, 61], // Story 25 — replaces the old, incorrect future-city binding
  28: [62, 63], // Story 26
  29: [59, 60, 61, 62], // Story 27
  30: [63, 64], // Story 28
  31: [64, 65], // Story 29
  32: [65, 66, 67, 68, 69, 70], // Story 30 + ending
};

export const STORY_CUTSCENE_BINDING_EVIDENCE: CutsceneBindingEvidence = 'SEMANTIC_PHYSICAL_ORDER';

export function cutsceneIdsForStorySequence(sequenceIndex: number): readonly number[] {
  const ids = STORY_CUTSCENE_SEQUENCE_BINDINGS[sequenceIndex];
  if (!ids?.length) throw new Error(`Missing Story cutscene binding for sequenceIndex=${sequenceIndex}`);
  return ids;
}

/**
 * Deterministically spreads dialogue lines over the physical illustrations bound
 * to that Story, preserving order. Once $3E bindings are extracted, this helper
 * can consume the exact beat→scene table without changing StoryPanel consumers.
 */
export function cutsceneForDialogueBeat(
  sequenceIndex: number,
  beatIndex: number,
  beatCount: number,
): StoryCutsceneAsset {
  const ids = cutsceneIdsForStorySequence(sequenceIndex);
  if (ids.length === 1) return storyCutsceneAsset(ids[0]);
  const safeCount = Math.max(1, beatCount);
  const normalized = Math.min(Math.max(0, beatIndex), safeCount - 1);
  const slot = Math.min(ids.length - 1, Math.floor((normalized * ids.length) / safeCount));
  return storyCutsceneAsset(ids[slot]);
}

export function firstCutsceneForStory(sequenceIndex: number): StoryCutsceneAsset {
  return storyCutsceneAsset(cutsceneIdsForStorySequence(sequenceIndex)[0]);
}

export function lastCutsceneForStory(sequenceIndex: number): StoryCutsceneAsset {
  const ids = cutsceneIdsForStorySequence(sequenceIndex);
  return storyCutsceneAsset(ids[ids.length - 1]);
}

export const STORY_CUTSCENE_CANON = {
  physicalAssetCount: 71,
  narrativePhysicalRange: [1, 70] as const,
  transitionAssetId: 71,
  mapRuntimeIncluded: false,
} as const;
