// ═══════════════════════════════════════════════════════════
// DBZ LSW — Exploración del modo historia (mapas GBC + objetos ocultos)
// ═══════════════════════════════════════════════════════════
// Los mapas de exploración son los fondos `NN_world.png` (160×80) extraídos
// de la ROM USA (CRC32 025AA88A). Cada capítulo del story mode visita un
// mapa y puede contener objetos ocultos (press A en lugares concretos) y
// personajes con los que hablar — replicando el walkthrough canónico
// (docs/STORY_WALKTHROUGH.md, fuente shrines.rpgclassics.com).
//
// Los hotspots usan coordenadas en la cuadrícula del mapa nativo (160×80).
// La recompensa de cada objeto es la carta REAL del GBC (id de cards.ts).

export interface ExplorationHotspot {
  id: string;            // id único (persistencia: dbzlsw_explored)
  x: number;             // columna en el mapa nativo 160×80
  y: number;             // fila en el mapa nativo 160×80
  label: string;         // qué se encuentra (walkthrough)
  hint: string;          // pista contextual ("formación rocosa", "árbol más a la derecha"...)
  rewardCard?: number;   // carta que otorga (si aplica)
  npc?: string;          // si es un NPC: nombre para el diálogo
  dialog?: string;       // texto del NPC (walkthrough)
}

export interface ExplorationMapDef {
  chapter: number;           // capítulo en el que se visita
  map: string;               // archivo del fondo: /assets/backgrounds/01_world.png
  playerForm: string;        // forma del jugador en el mapa (overworld sprite)
  hotspots: ExplorationHotspot[];
}

// Recompensas de cartas reales del GBC (id → cards.ts):
//   3  = 5 stage atk. · 10 = Masenko · 11 = Dunk Shot · 25 = Solid Shot
//   83 = Bulma · 84 = Chaiotzu · 85 = Tien · 86 = Yajirobe · 87 = Kaio
//   88 = Dende · 104 = Trunks Sword
export const EXPLORATION_MAPS: ExplorationMapDef[] = [
  {
    chapter: 1,
    map: '/assets/backgrounds/01_world.png',
    playerForm: 'gohan_young',
    hotspots: [
      {
        id: 'ch1_yajirobe',
        x: 118, y: 38,
        label: 'Espada de Yajirobe',
        hint: 'Formación rocosa',
        rewardCard: 86,
        dialog: 'Encontraste la Espada de Yajirobe escondida entre las rocas.',
      },
      {
        id: 'ch1_piccolo_ki',
        x: 45, y: 52,
        label: 'Ki de Piccolo',
        hint: 'Busca el ki de Piccolo',
        rewardCard: 10,
        dialog: 'Sientes el ki de Piccolo... ¡Masenko!',
      },
    ],
  },
  {
    chapter: 2,
    map: '/assets/backgrounds/02_world.png',
    playerForm: 'goku_base',
    hotspots: [
      {
        id: 'ch2_chichi',
        x: 90, y: 30,
        label: 'Carta de Chichi',
        hint: 'Hablar con Chichi',
        rewardCard: 11,
        dialog: 'Chichi: "¡Goku! ¡Vuelve sano y salvo! Toma esto."',
      },
    ],
  },
  {
    chapter: 3,
    map: '/assets/backgrounds/03_world.png',
    playerForm: 'goku_base',
    hotspots: [
      {
        id: 'ch3_goku_5stage',
        x: 35, y: 20,
        label: '5 Stage Attack',
        hint: 'Hablar con Goku',
        rewardCard: 3,
        dialog: 'Goku: "¡Mira esto! ¡Un ataque de 5 etapas!"',
      },
    ],
  },
  {
    chapter: 4,
    map: '/assets/backgrounds/04_world.png',
    playerForm: 'gohan_young',
    hotspots: [
      {
        id: 'ch4_ship_card',
        x: 14, y: 8,
        label: 'Carta en la nave',
        hint: 'Esquina superior izquierda del mapa',
        rewardCard: 25,
        dialog: 'Encuentras una carta olvidada en la nave espacial.',
      },
    ],
  },
  {
    chapter: 5,
    map: '/assets/backgrounds/05_world.png',
    playerForm: 'gohan_young',
    hotspots: [
      {
        id: 'ch5_dende',
        x: 48, y: 46,
        label: 'Carta de Dende',
        hint: 'Casa tras la fila de árboles (aldea Namekiana)',
        rewardCard: 88,
        dialog: 'Dende: "¡Gracias por ayudarnos! Toma esta carta."',
      },
      {
        id: 'ch5_dragonball',
        x: 130, y: 26,
        label: 'Dragon Ball',
        hint: 'Árbol más a la derecha de la isla',
        dialog: '¡Una Dragon Ball brillando bajo el árbol!',
      },
    ],
  },
  {
    chapter: 6,
    map: '/assets/backgrounds/06_world.png',
    playerForm: 'gohan_young',
    hotspots: [
      {
        id: 'ch6_dragonballs',
        x: 90, y: 14,
        label: 'Dragon Balls',
        hint: 'Camino de tierra al norte de la nave',
        dialog: 'Un montón de Dragon Balls reunidas junto al camino.',
      },
    ],
  },
  {
    chapter: 7,
    map: '/assets/backgrounds/07_world.png',
    playerForm: 'gohan_young',
    hotspots: [
      {
        id: 'ch7_guru',
        x: 105, y: 55,
        label: 'Guru',
        hint: 'Hablar con el Gran Mayordomo',
        rewardCard: 89,
        dialog: 'Guru: "Tu potencial es enorme, joven Namekiano."',
      },
    ],
  },
  {
    chapter: 8,
    map: '/assets/backgrounds/08_world.png',
    playerForm: 'goku_base',
    hotspots: [
      {
        id: 'ch8_chiaotzu',
        x: 30, y: 42,
        label: 'Carta de Chiaotzu',
        hint: 'Hablar con él',
        rewardCard: 84,
        dialog: 'Chiaotzu: "¡Tien y yo te ayudaremos!"',
      },
    ],
  },
  {
    chapter: 9,
    map: '/assets/backgrounds/09_world.png',
    playerForm: 'goku_base',
    hotspots: [
      {
        id: 'ch9_memo',
        x: 120, y: 60,
        label: 'Memorando',
        hint: 'Nota tras el edificio',
        dialog: 'Memorando: "El Scouter detecta... ¡cuidado con su forma final!"',
      },
    ],
  },
  {
    chapter: 10,
    map: '/assets/backgrounds/10_world.png',
    playerForm: 'goku_base',
    hotspots: [
      {
        id: 'ch10_bulma',
        x: 72, y: 30,
        label: 'Carta de Bulma',
        hint: 'Hablar con Bulma',
        rewardCard: 83,
        dialog: 'Bulma: "¡Que tengas suerte, Goku! Toma esto."',
      },
    ],
  },
  {
    chapter: 11,
    map: '/assets/backgrounds/11_world.png',
    playerForm: 'gohan_young',
    hotspots: [
      {
        id: 'ch11_trunks_sword',
        x: 95, y: 58,
        label: 'Espada de Trunks',
        hint: 'Nota tras el edificio',
        rewardCard: 104,
        dialog: 'Una nota junto a la Espada de Trunks: "Para el futuro."',
      },
    ],
  },
  {
    chapter: 12,
    map: '/assets/backgrounds/12_world.png',
    playerForm: 'goku_base',
    hotspots: [
      {
        id: 'ch12_kaio',
        x: 40, y: 20,
        label: 'Kaio',
        hint: 'Hablar con Kaio',
        rewardCard: 87,
        dialog: 'Kaio: "¡Entrena duro! Este poder te será útil."',
      },
    ],
  },
  {
    chapter: 13,
    map: '/assets/backgrounds/13_world.png',
    playerForm: 'gohan_teen_ssj',
    hotspots: [
      {
        id: 'ch13_tien',
        x: 142, y: 10,
        label: 'Tien',
        hint: 'Oculto al norte del acantilado',
        rewardCard: 85,
        dialog: 'Tien: "He estado entrenando aquí. Toma esta carta."',
      },
    ],
  },
];

// ─── Acceso ────────────────────────────────────────────────

export function explorationForChapter(chapter: number): ExplorationMapDef | null {
  return EXPLORATION_MAPS.find(m => m.chapter === chapter) ?? null;
}

// Persistencia: objetos ya encontrados (dbzlsw_explored → string[])
const EXPLORED_KEY = 'dbzlsw_explored';

export function loadExplored(): string[] {
  try {
    const raw = localStorage.getItem(EXPLORED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter((x): x is string => typeof x === 'string');
    }
  } catch { /* noop */ }
  return [];
}

export function saveExplored(ids: string[]) {
  try { localStorage.setItem(EXPLORED_KEY, JSON.stringify(ids)); } catch { /* noop */ }
}

export function isExplored(id: string): boolean {
  return loadExplored().includes(id);
}

export function markExplored(id: string) {
  const ids = loadExplored();
  if (!ids.includes(id)) {
    ids.push(id);
    saveExplored(ids);
  }
}
