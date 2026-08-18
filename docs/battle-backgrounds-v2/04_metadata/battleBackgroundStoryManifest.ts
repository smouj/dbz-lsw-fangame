export const DBZ_LSW_STORY_STAGES = [
  { id: 1, key: 'earth_grasslands', locationEs: 'Llanuras verdes de la Tierra', primaryArc: 'saiyan_saga', overview: '/assets/battle/backgrounds/01_earth_grasslands_overview.png', action: '/assets/battle/backgrounds/01_earth_grasslands_action.png' },
  { id: 2, key: 'earth_desert_wasteland', locationEs: 'Yermo desértico de la Tierra', primaryArc: 'saiyan_saga', overview: '/assets/battle/backgrounds/02_earth_desert_wasteland_overview.png', action: '/assets/battle/backgrounds/02_earth_desert_wasteland_action.png' },
  { id: 3, key: 'earth_rocky_badlands', locationEs: 'Badlands rocosas de la Tierra', primaryArc: 'saiyan_saga', overview: '/assets/battle/backgrounds/03_earth_rocky_badlands_overview.png', action: '/assets/battle/backgrounds/03_earth_rocky_badlands_action.png' },
  { id: 4, key: 'kamis_lookout', locationEs: 'Palacio de Kamisama / Mirador de Kami', primaryArc: 'training_and_interludes', overview: '/assets/battle/backgrounds/04_kamis_lookout_overview.png', action: '/assets/battle/backgrounds/04_kamis_lookout_action.png' },
  { id: 5, key: 'namek_rocky_field', locationEs: 'Llanura rocosa de Namek', primaryArc: 'namek_frieza_saga', overview: '/assets/battle/backgrounds/05_namek_rocky_field_overview.png', action: '/assets/battle/backgrounds/05_namek_rocky_field_action.png' },
  { id: 6, key: 'cell_games_ring', locationEs: 'Ring de los Cell Games', primaryArc: 'android_cell_saga', overview: '/assets/battle/backgrounds/06_cell_games_ring_overview.png', action: '/assets/battle/backgrounds/06_cell_games_ring_action.png' },
  { id: 7, key: 'namek_coast', locationEs: 'Costa / lagunas de Namek', primaryArc: 'namek_frieza_saga', overview: '/assets/battle/backgrounds/07_namek_coast_overview.png', action: '/assets/battle/backgrounds/07_namek_coast_action.png' },
  { id: 8, key: 'ruined_city', locationEs: 'Ciudad en ruinas', primaryArc: 'android_cell_saga', overview: '/assets/battle/backgrounds/08_ruined_city_overview.png', action: '/assets/battle/backgrounds/08_ruined_city_action.png' },
  { id: 9, key: 'future_ruins_wasteland', locationEs: 'Yermo en ruinas del futuro', primaryArc: 'future_trunks_extra_story', overview: '/assets/battle/backgrounds/09_future_ruins_wasteland_overview.png', action: '/assets/battle/backgrounds/09_future_ruins_wasteland_action.png' },
  { id: 10, key: 'world_tournament_grounds', locationEs: 'Recinto del Torneo Mundial', primaryArc: 'buu_saga', overview: '/assets/battle/backgrounds/10_world_tournament_grounds_overview.png', action: '/assets/battle/backgrounds/10_world_tournament_grounds_action.png' },
  { id: 11, key: 'earth_forest', locationEs: 'Bosque de la Tierra', primaryArc: 'saiyan_saga', overview: '/assets/battle/backgrounds/11_earth_forest_overview.png', action: '/assets/battle/backgrounds/11_earth_forest_action.png' },
  { id: 12, key: 'supreme_kai_world', locationEs: 'Mundo del Kaio Supremo', primaryArc: 'buu_saga', overview: '/assets/battle/backgrounds/12_supreme_kai_world_overview.png', action: '/assets/battle/backgrounds/12_supreme_kai_world_action.png' },
  { id: 13, key: 'earth_lakeside_field', locationEs: 'Campo abierto con agua al fondo', primaryArc: 'saiyan_saga', overview: '/assets/battle/backgrounds/13_earth_lakeside_field_overview.png', action: '/assets/battle/backgrounds/13_earth_lakeside_field_action.png' },
] as const;

export const DBZ_LSW_STORY_ARCS = {
  training_and_interludes: [4],
  saiyan_saga: [1, 2, 3, 11, 13],
  namek_frieza_saga: [5, 7],
  android_cell_saga: [2, 3, 6, 8, 11, 13],
  future_trunks_extra_story: [8, 9],
  buu_saga: [10, 12, 8, 11, 13],
} as const;

export const DBZ_LSW_SPECIAL_ACTION_BACKGROUND = '/assets/battle/backgrounds/99_special_action_generic.png';
