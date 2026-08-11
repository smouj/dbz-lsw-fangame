// ═══════════════════════════════════════════════════════════
// DBZ LSW — Viñetas del modo historia (manga interactivo)
// ═══════════════════════════════════════════════════════════
// El modo historia es una experiencia narrativa LINEAL presentada con
// viñetas manga dinámicas que conectan directamente los combates.
// NO existe exploración de mapa ni movimiento libre entre encuentros.
//
// Cada capítulo tiene una secuencia de VIÑETAS antes del combate (intro)
// y opcionalmente después (outro). Cada viñeta usa:
//   - fondo: /assets/backgrounds/NN_world.png (13 escenarios de la ROM)
//   - retratos: /assets/portraits/cell_XX_XX.png (113 story portraits 40×56)
//   - sprites overworld (panel_sprites) para personajes completos
//   - efectos: flash/zoom/shake simples
//
// El motor SOLO interpreta datos: editar la historia no toca código.

export type PanelLayout =
  | 'FULL'              // ilustración a pantalla completa
  | 'SPLIT_2'           // dos personajes enfrentados
  | 'PORTRAIT_DIALOGUE' // escenario + retratos + caja de diálogo (estilo LSW)
  | 'IMPACT';           // viñeta que rompe el layout (transformación/ataque)

export interface StoryPortrait {
  character: string;    // id de personaje (goku, piccolo...) para el retrato
  form?: string;        // forma (base, ssj...) — opcional
  side?: 'left' | 'right';
  emotion?: string;     // clave de emoción (pendiente de mapear a cells)
  flip?: boolean;
}

export interface StoryPanel {
  id: string;
  layout: PanelLayout;
  background: string;              // /assets/backgrounds/NN_world.png
  title?: string;                  // título de escena (ej: 'CAPÍTULO 1')
  subtitle?: string;
  characters?: StoryPortrait[];
  dialogue?: {
    speaker: string;               // nombre del que habla
    text: string;                  // texto (localizable vía i18n si aplica)
    side?: 'left' | 'right';
  };
  effects?: ('flash' | 'zoom' | 'shake' | 'speed')[];
  transition?: 'fade' | 'slash' | 'zoom-in';
}

export interface StoryChapterFlow {
  chapter: number;
  intro: StoryPanel[];   // viñetas antes del combate
  outro?: StoryPanel[];  // viñetas después del combate
}

// ─── Helpers de retrato ────────────────────────────────────
// Los 113 story portraits están en cell_XX_XX.png SIN etiquetar (hoja original
// sin mapeo de personaje). Hasta completar el mapeo forense, usamos el retrato
// de MENÚ (cell_00_XX) que SÍ está mapeado por personaje en MINI_PORTRAITS,
// con fallback a un cell genérico.
export function storyPortraitUrl(character: string, formId?: string): string | undefined {
  // MINI_PORTRAITS mapea personaje → cell (40×56) — reutilizamos el mapeo
  const mini = (window as unknown as Record<string, unknown>).__MINI_PORTRAITS__ as Record<string, string> | undefined;
  if (mini && mini[character]) return `/assets/portraits/menu/${mini[character]}`;
  return undefined;
}

// ─── Datos de viñetas por capítulo ─────────────────────────
// Los capítulos 1-13 tienen viñetas específicas; el resto usa un generador
// por defecto con el escenario del jefe (para no bloquear el progreso).

const NAME: Record<string, string> = {
  goku: 'Goku', piccolo: 'Piccolo', gohan: 'Gohan', vegeta: 'Vegeta',
  krillin: 'Krillin', frieza: 'Freezer', cell: 'Cell', trunks: 'Trunks',
  goten: 'Goten', buu: 'Buu', android_16: 'Android 16', android_17: 'Android 17',
  android_18: 'Android 18', android_19: 'Android 19', android_20: 'Android 20',
  ginyu: 'Ginyu', recoome: 'Reacoom', guldo: 'Guldo', jeice: 'Jeice', burter: 'Burter',
  nappa: 'Nappa', cell_jr: 'Cell Jr.', vegito: 'Vegito', gotenks: 'Gotenks',
};

export function characterName(id: string): string {
  return NAME[id] ?? id;
}

const bg = (n: number) => `/assets/backgrounds/${String(n).padStart(2, '0')}_world.png`;

// ─── Cutscenes REALES del GBC (160×96, extraídos del paquete pixel-perfect) ───
// Los fondos auténticos de las viñetas de historia (public/assets/cutscenes/).
// Mapa por capítulo: el cutscene que mejor representa la escena de esa saga.
const CS = (n: number) => {
  const files: Record<number, string> = {
    1: '005_grassy_valley_battlefield.png',
    2: '006_stormy_grassy_valley.png',
    3: '010_rocky_wasteland.png',
    4: '012_goku_vs_great_ape_vegeta.png',
    5: '016_namek_cliffs_and_water.png',
    6: '017_namek_shoreline.png',
    7: '020_ginyu_force_group_pose.png',
    8: '021_frieza_spaceship_exterior.png',
    9: '025_frieza_fires_energy_beam.png',
    10: '026_namek_destruction_lightning.png',
    11: '027_earth_tree_and_mountain_plain.png',
    12: '032_rocky_plain.png',
    13: '034_rocky_wasteland_overlook.png',
    14: '039_kamis_lookout.png',
    15: '035_rock_wall_and_rubble.png',
    16: '040_coastal_grassland.png',
    17: '042_cell_games_arena.png',
    18: '044_cell_games_crater.png',
    19: '042_cell_games_arena.png',
    20: '046_cell_self_destruct_swollen.png',
    21: '049_future_city_ruins.png',
    22: '050_future_city_skyline.png',
    23: '051_world_martial_arts_tournament_stadium.png',
    24: '055_damaged_world_tournament_stadium.png',
    25: '058_majin_vegeta_sacrifice_explosion.png',
    26: '054_babidis_ship_crater.png',
    27: '049_future_city_ruins.png',
    28: '063_pink_energy_silhouette.png',
    29: '059_gohan_on_sacred_world_of_kai.png',
    30: '060_sacred_world_of_kai_purple_sky.png',
    31: '065_giant_energy_sphere.png',
    32: '066_kid_buu_vs_goku.png',
  };
  return `/assets/cutscenes/${files[n] ?? '001_seven_dragon_balls_on_grass.png'}`;
};

// Intro del GBC (recapitulación): las 4 viñetas de la introducción
export const INTRO_CUTSCENES: StoryPanel[] = [
  { id: 'intro1', layout: 'FULL', background: '/assets/cutscenes/001_seven_dragon_balls_on_grass.png', title: 'DRAGON BALL Z', subtitle: 'LEGENDARY SUPER WARRIORS', effects: ['zoom'] },
  { id: 'intro2', layout: 'FULL', background: '/assets/cutscenes/002_kid_goku_riding_flying_nimbus.png', effects: ['zoom'] },
  { id: 'intro3', layout: 'FULL', background: '/assets/cutscenes/003_goku_chichi_and_gohan_family.png', effects: ['zoom'] },
  { id: 'intro4', layout: 'FULL', background: '/assets/cutscenes/004_goku_holds_raditz_for_special_beam_cannon.png', title: 'LA HISTORIA COMIENZA…', effects: ['zoom', 'flash'] },
];

// Viñetas específicas (caps 1-13 con escenario propio)
export const STORY_PANELS: Record<number, StoryChapterFlow> = {
  1: {
    chapter: 1,
    intro: [
      { id: 'c1p1', layout: 'FULL', background: bg(1), title: 'CAPÍTULO 1', subtitle: 'Entrenamiento', effects: ['zoom'], transition: 'zoom-in' },
      { id: 'c1p2', layout: 'PORTRAIT_DIALOGUE', background: bg(1), characters: [{ character: 'piccolo', side: 'left' }, { character: 'gohan', side: 'right' }], dialogue: { speaker: 'Piccolo', text: 'Gohan… entrena tu ki. ¡Te espera un gran poder!' } },
      { id: 'c1p3', layout: 'SPLIT_2', background: bg(1), characters: [{ character: 'piccolo', side: 'left' }, { character: 'gohan', side: 'right' }], dialogue: { speaker: 'Gohan', text: '¡Lo intentaré, Piccolo!' } },
      { id: 'c1p4', layout: 'IMPACT', background: bg(1), title: '¡COMBATE!', subtitle: 'Gohan vs Piccolo', effects: ['flash', 'shake'], transition: 'slash' },
    ],
    outro: [
      { id: 'c1o1', layout: 'PORTRAIT_DIALOGUE', background: bg(1), characters: [{ character: 'piccolo', side: 'left' }], dialogue: { speaker: 'Piccolo', text: 'Bien… ¡pero esto solo es el principio!' } },
    ],
  },
  2: {
    chapter: 2,
    intro: [
      { id: 'c2p1', layout: 'FULL', background: bg(2), title: 'CAPÍTULO 2', subtitle: 'Llegan los Saiyans', effects: ['zoom'] },
      { id: 'c2p2', layout: 'PORTRAIT_DIALOGUE', background: bg(2), characters: [{ character: 'goku', side: 'left' }], dialogue: { speaker: 'Goku', text: '¡No dejaré que destruyan la Tierra!' } },
      { id: 'c2p3', layout: 'IMPACT', background: bg(2), title: '¡COMBATE!', subtitle: 'Goku vs Nappa', effects: ['flash', 'shake'], transition: 'slash' },
    ],
  },
  3: {
    chapter: 3,
    intro: [
      { id: 'c3p1', layout: 'FULL', background: bg(3), title: 'CAPÍTULO 3', subtitle: 'Vegeta, el príncipe Saiyan', effects: ['zoom'] },
      { id: 'c3p2', layout: 'SPLIT_2', background: bg(3), characters: [{ character: 'goku', side: 'left' }, { character: 'vegeta', side: 'right' }], dialogue: { speaker: 'Vegeta', text: 'Soy Vegeta, el príncipe de los Saiyans. ¡Ríndete!' } },
      { id: 'c3p3', layout: 'IMPACT', background: bg(3), title: '¡COMBATE!', subtitle: 'Goku vs Vegeta', effects: ['flash', 'shake'], transition: 'slash' },
    ],
  },
  4: {
    chapter: 4,
    intro: [
      { id: 'c4p1', layout: 'FULL', background: bg(4), title: 'CAPÍTULO 4', subtitle: 'Hacia Namek', effects: ['zoom'] },
      { id: 'c4p2', layout: 'IMPACT', background: bg(4), title: '¡COMBATE!', subtitle: 'Gohan vs Vegeta', effects: ['flash', 'shake'], transition: 'slash' },
    ],
  },
  5: {
    chapter: 5,
    intro: [
      { id: 'c5p1', layout: 'FULL', background: bg(5), title: 'CAPÍTULO 5', subtitle: 'El planeta Namek', effects: ['zoom'] },
      { id: 'c5p2', layout: 'IMPACT', background: bg(5), title: '¡COMBATE!', subtitle: 'Gohan vs Guldo', effects: ['flash', 'shake'], transition: 'slash' },
    ],
  },
  6: {
    chapter: 6,
    intro: [
      { id: 'c6p1', layout: 'FULL', background: bg(6), title: 'CAPÍTULO 6', subtitle: 'La fuerza de Reacoom', effects: ['zoom'] },
      { id: 'c6p2', layout: 'IMPACT', background: bg(6), title: '¡COMBATE!', subtitle: 'Gohan vs Reacoom', effects: ['flash', 'shake'], transition: 'slash' },
    ],
  },
  7: {
    chapter: 7,
    intro: [
      { id: 'c7p1', layout: 'FULL', background: bg(7), title: 'CAPÍTULO 7', subtitle: 'Jeice y Burter', effects: ['zoom'] },
      { id: 'c7p2', layout: 'SPLIT_2', background: bg(7), characters: [{ character: 'jeice', side: 'left' }, { character: 'burter', side: 'right' }], dialogue: { speaker: 'Burter', text: '¡Soy el más rápido del universo!' } },
      { id: 'c7p3', layout: 'IMPACT', background: bg(7), title: '¡COMBATE!', subtitle: 'Gohan y Goku vs Jeice y Burter', effects: ['flash', 'shake'], transition: 'slash' },
    ],
  },
  8: {
    chapter: 8,
    intro: [
      { id: 'c8p1', layout: 'FULL', background: bg(8), title: 'CAPÍTULO 8', subtitle: 'Ginyu y su cuerpo robado', effects: ['zoom'] },
      { id: 'c8p2', layout: 'IMPACT', background: bg(8), title: '¡COMBATE!', subtitle: 'Gohan vs Ginyu (Goku)', effects: ['flash', 'shake'], transition: 'slash' },
    ],
  },
  9: {
    chapter: 9,
    intro: [
      { id: 'c9p1', layout: 'FULL', background: bg(9), title: 'CAPÍTULO 9', subtitle: 'Freezer, el tirano galáctico', effects: ['zoom'] },
      { id: 'c9p2', layout: 'SPLIT_2', background: bg(9), characters: [{ character: 'goku', side: 'left' }, { character: 'frieza', side: 'right' }], dialogue: { speaker: 'Freezer', text: '¡Miserable Saiyan! ¡Te haré pedazos!' } },
      { id: 'c9p3', layout: 'IMPACT', background: bg(9), title: '¡COMBATE!', subtitle: 'Goku vs Freezer', effects: ['flash', 'shake'], transition: 'slash' },
    ],
  },
  10: {
    chapter: 10,
    intro: [
      { id: 'c10p1', layout: 'FULL', background: bg(9), title: 'CAPÍTULO 10', subtitle: 'La furia de un Super Saiyan', effects: ['zoom', 'flash'] },
      { id: 'c10p2', layout: 'IMPACT', background: bg(9), title: '¡COMBATE!', subtitle: 'Goku SSJ vs Freezer', effects: ['flash', 'shake'], transition: 'slash' },
    ],
  },
  11: {
    chapter: 11,
    intro: [
      { id: 'c11p1', layout: 'FULL', background: bg(7), title: 'CAPÍTULO 11', subtitle: 'El regreso a la Tierra', effects: ['zoom'] },
      { id: 'c11p2', layout: 'IMPACT', background: bg(7), title: '¡COMBATE!', subtitle: 'Gohan vs Goku', effects: ['flash', 'shake'], transition: 'slash' },
    ],
  },
  12: {
    chapter: 12,
    intro: [
      { id: 'c12p1', layout: 'FULL', background: bg(8), title: 'CAPÍTULO 12', subtitle: 'Los Androides', effects: ['zoom'] },
      { id: 'c12p2', layout: 'IMPACT', background: bg(8), title: '¡COMBATE!', subtitle: 'Goku vs Android 19', effects: ['flash', 'shake'], transition: 'slash' },
    ],
  },
  13: {
    chapter: 13,
    intro: [
      { id: 'c13p1', layout: 'FULL', background: bg(8), title: 'CAPÍTULO 13', subtitle: 'Android 20', effects: ['zoom'] },
      { id: 'c13p2', layout: 'IMPACT', background: bg(8), title: '¡COMBATE!', subtitle: 'Goku vs Android 20', effects: ['flash', 'shake'], transition: 'slash' },
    ],
  },
};

// Generador por defecto para caps 14-32 (escenario según la saga)
export function panelsForChapter(chapter: number): StoryChapterFlow {
  const specific = STORY_PANELS[chapter];
  if (specific) {
    // El cap 1 arranca con la recapitulación del GBC (cutscenes de introducción)
    if (chapter === 1) {
      return { chapter, intro: [...INTRO_CUTSCENES, ...specific.intro], outro: specific.outro };
    }
    return specific;
  }
  return {
    chapter,
    intro: [
      { id: `c${chapter}p1`, layout: 'FULL', background: CS(chapter), title: `CAPÍTULO ${chapter}`, subtitle: 'La saga continúa…', effects: ['zoom'] },
      { id: `c${chapter}p2`, layout: 'IMPACT', background: CS(chapter), title: '¡COMBATE!', subtitle: '¡Enfréntate al enemigo!', effects: ['flash', 'shake'], transition: 'slash' },
    ],
  };
}
