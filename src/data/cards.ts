// ═══════════════════════════════════════════════════════════
// DBZ LSW — Cartas (125 reales)
// Datos de la tabla ROM 0x044315 (125 × 16 bytes)
// Tipos: command/damage/beam/support/defense/special
// ═══════════════════════════════════════════════════════════

export type CardType = 'command' | 'damage' | 'beam' | 'support' | 'defense' | 'special';

export interface CardDef {
  id: number;
  name: string;
  type: CardType;
  description: string;
  atk: number;
  acc: number;
  cc: number;
  rarity: number;          // 1-5 estrellas
  compatible?: string[];   // ids de personajes (undefined = todos)
}

export const CARD_COLORS: Record<CardType, string> = {
  command: '#8890a0',
  damage: '#c04040',
  beam: '#3890d8',
  support: '#40a848',
  defense: '#7060b0',
  special: '#d8a830',
};

export const CARD_ICONS: Record<CardType, string> = {
  command: '⚡',
  damage: '👊',
  beam: '💫',
  support: '💚',
  defense: '🛡',
  special: '⭐',
};

export const CARD_TYPE_NAMES: Record<CardType, string> = {
  command: 'COMMAND',
  damage: 'DAMAGE',
  beam: 'BEAM',
  support: 'SUPPORT',
  defense: 'DEFENSE',
  special: 'SPECIAL',
};

// ─── 125 cartas ───────────────────────────────────────────

export const CARDS: CardDef[] = [
  // ── COMMAND (24) ──
  { id: 1, name: '3 Stage Atk.', type: 'command', description: 'Cadena física corta. Genera CC.', atk: 14, acc: 95, cc: 0, rarity: 1 },
  { id: 2, name: '4 Stage Atk.', type: 'command', description: 'Cadena física media. Genera CC.', atk: 18, acc: 88, cc: 0, rarity: 1 },
  { id: 3, name: '5 Stage Atk.', type: 'command', description: 'Cadena larga, arriesgada.', atk: 23, acc: 80, cc: 0, rarity: 2 },
  { id: 4, name: 'Power Up', type: 'command', description: 'Concentra energía. +5 CC.', atk: 0, acc: 100, cc: 5, rarity: 1 },
  { id: 5, name: 'Counter', type: 'command', description: 'Contraataque tras bloqueo.', atk: 16, acc: 90, cc: 0, rarity: 2 },
  { id: 6, name: 'Sonic Wave', type: 'command', description: 'Onda sónica que empuja.', atk: 12, acc: 92, cc: 2, rarity: 1 },
  { id: 7, name: 'Ki Charge', type: 'command', description: 'Carga ki rápidamente. +3 CC.', atk: 0, acc: 100, cc: 3, rarity: 1 },
  { id: 8, name: 'Focus', type: 'command', description: 'Se concentra. +4 CC.', atk: 0, acc: 100, cc: 4, rarity: 1 },
  { id: 9, name: 'Meditate', type: 'command', description: 'Medita y recupera ki. +6 CC.', atk: 0, acc: 100, cc: 6, rarity: 2 },
  { id: 10, name: 'Taunt', type: 'command', description: 'Provoca al rival.', atk: 0, acc: 100, cc: 2, rarity: 1 },
  { id: 11, name: 'Quick Step', type: 'command', description: 'Movimiento rápido.', atk: 8, acc: 97, cc: 2, rarity: 1 },
  { id: 12, name: 'Feint', type: 'command', description: 'Finta que confunde.', atk: 10, acc: 90, cc: 3, rarity: 2 },
  { id: 13, name: 'Spin Kick', type: 'command', description: 'Patada giratoria.', atk: 15, acc: 86, cc: 2, rarity: 1 },
  { id: 14, name: 'Elbow', type: 'command', description: 'Codazo cercano.', atk: 13, acc: 90, cc: 2, rarity: 1 },
  { id: 15, name: 'Low Sweep', type: 'command', description: 'Barrido bajo.', atk: 12, acc: 85, cc: 3, rarity: 2 },
  { id: 16, name: 'Head Butt', type: 'command', description: 'Cabezazo.', atk: 17, acc: 80, cc: 3, rarity: 2 },
  { id: 17, name: 'Dash Punch', type: 'command', description: 'Puño en carrera.', atk: 16, acc: 88, cc: 2, rarity: 1 },
  { id: 18, name: 'Double Hit', type: 'command', description: 'Doble golpe rápido.', atk: 20, acc: 82, cc: 4, rarity: 2 },
  { id: 19, name: 'Triple Kick', type: 'command', description: 'Triple patada.', atk: 24, acc: 76, cc: 5, rarity: 3 },
  { id: 20, name: 'Rising Knee', type: 'command', description: 'Rodilla ascendente.', atk: 18, acc: 84, cc: 3, rarity: 2 },
  { id: 21, name: 'Palm Strike', type: 'command', description: 'Golpe de palma.', atk: 14, acc: 92, cc: 2, rarity: 1 },
  { id: 22, name: 'Axe Kick', type: 'command', description: 'Patada de hacha.', atk: 21, acc: 78, cc: 4, rarity: 2 },
  { id: 23, name: 'Knee Bash', type: 'command', description: 'Golpe de rodilla.', atk: 19, acc: 83, cc: 3, rarity: 2 },
  { id: 24, name: 'Backhand', type: 'command', description: 'Reverso de mano.', atk: 11, acc: 94, cc: 2, rarity: 1 },

  // ── DAMAGE (28) ──
  { id: 25, name: 'Punch', type: 'damage', description: 'Puño básico.', atk: 12, acc: 95, cc: 3, rarity: 1 },
  { id: 26, name: 'Kick', type: 'damage', description: 'Patada básica.', atk: 14, acc: 92, cc: 3, rarity: 1 },
  { id: 27, name: 'Rush Attack', type: 'damage', description: 'Golpe múltiple.', atk: 22, acc: 85, cc: 6, rarity: 2 },
  { id: 28, name: 'Critical Punch', type: 'damage', description: 'Daño alto, baja precisión.', atk: 30, acc: 75, cc: 8, rarity: 3 },
  { id: 29, name: 'Flying Kick', type: 'damage', description: 'Patada voladora.', atk: 18, acc: 88, cc: 4, rarity: 1 },
  { id: 30, name: 'Machine Gun', type: 'damage', description: 'Ráfaga de golpes.', atk: 26, acc: 82, cc: 7, rarity: 2 },
  { id: 31, name: 'Blazing Attack', type: 'damage', description: 'Ataque ardiente.', atk: 34, acc: 70, cc: 10, rarity: 3 },
  { id: 32, name: 'Combo Rush', type: 'damage', description: 'Combo devastador.', atk: 28, acc: 78, cc: 8, rarity: 3 },
  { id: 33, name: 'Power Blow', type: 'damage', description: 'Golpe de poder.', atk: 32, acc: 72, cc: 9, rarity: 3 },
  { id: 34, name: 'Swift Strike', type: 'damage', description: 'Golpe veloz.', atk: 16, acc: 94, cc: 4, rarity: 1 },
  { id: 35, name: 'Uppercut', type: 'damage', description: 'Gancho ascendente.', atk: 20, acc: 86, cc: 5, rarity: 2 },
  { id: 36, name: 'Knee Strike', type: 'damage', description: 'Golpe de rodilla.', atk: 17, acc: 90, cc: 4, rarity: 1 },
  { id: 37, name: 'Shockwave', type: 'damage', description: 'Onda expansiva.', atk: 24, acc: 80, cc: 6, rarity: 2 },
  { id: 38, name: 'Tornado Kick', type: 'damage', description: 'Patada tornado.', atk: 27, acc: 76, cc: 7, rarity: 2 },
  { id: 39, name: 'Hammer Fist', type: 'damage', description: 'Puño martillo.', atk: 29, acc: 74, cc: 8, rarity: 3 },
  { id: 40, name: 'Dragon Fist', type: 'damage', description: 'Puño del dragón.', atk: 36, acc: 68, cc: 10, rarity: 4, compatible: ['goku'] },
  { id: 41, name: 'Wolf Fang', type: 'damage', description: 'Colmillo de lobo.', atk: 25, acc: 82, cc: 7, rarity: 2, compatible: ['yamcha'] },
  { id: 42, name: 'Crusher Ball', type: 'damage', description: 'Bola aplastante.', atk: 31, acc: 72, cc: 9, rarity: 3, compatible: ['vegeta'] },
  { id: 43, name: 'Double Axe', type: 'damage', description: 'Hacha doble.', atk: 23, acc: 84, cc: 6, rarity: 2 },
  { id: 44, name: 'Meteor Smash', type: 'damage', description: 'Golpe meteoro.', atk: 33, acc: 70, cc: 9, rarity: 3 },
  { id: 45, name: 'Rapid Fists', type: 'damage', description: 'Puños rápidos.', atk: 21, acc: 88, cc: 5, rarity: 2 },
  { id: 46, name: 'Power Kick', type: 'damage', description: 'Patada poderosa.', atk: 19, acc: 87, cc: 5, rarity: 2 },
  { id: 47, name: 'Chop', type: 'damage', description: 'Golpe de mano.', atk: 15, acc: 91, cc: 4, rarity: 1 },
  { id: 48, name: 'Body Blow', type: 'damage', description: 'Golpe al cuerpo.', atk: 18, acc: 89, cc: 4, rarity: 1 },
  { id: 49, name: 'Roundhouse', type: 'damage', description: 'Patada circular.', atk: 22, acc: 83, cc: 6, rarity: 2 },
  { id: 50, name: 'Jump Kick', type: 'damage', description: 'Patada saltando.', atk: 20, acc: 85, cc: 5, rarity: 2 },
  { id: 51, name: 'Break Strike', type: 'damage', description: 'Golpe rompedor.', atk: 26, acc: 78, cc: 7, rarity: 3 },
  { id: 52, name: 'Final Rush', type: 'damage', description: 'Ráfaga final.', atk: 35, acc: 66, cc: 10, rarity: 4 },

  // ── BEAM (26) ──
  { id: 53, name: 'Kamehameha', type: 'beam', description: 'Haz de Goku.', atk: 28, acc: 90, cc: 16, rarity: 3, compatible: ['goku'] },
  { id: 54, name: 'Masenko', type: 'beam', description: 'Haz de Gohan.', atk: 22, acc: 88, cc: 12, rarity: 2, compatible: ['gohan'] },
  { id: 55, name: 'Galick Gun', type: 'beam', description: 'Haz de Vegeta.', atk: 28, acc: 90, cc: 16, rarity: 3, compatible: ['vegeta'] },
  { id: 56, name: 'Final Flash', type: 'beam', description: 'Haz definitivo de Vegeta.', atk: 38, acc: 80, cc: 23, rarity: 4, compatible: ['vegeta'] },
  { id: 57, name: 'Special Beam Cannon', type: 'beam', description: 'Cañón de Piccolo.', atk: 34, acc: 82, cc: 20, rarity: 4, compatible: ['piccolo'] },
  { id: 58, name: 'Death Beam', type: 'beam', description: 'Haz mortal de Frieza.', atk: 30, acc: 85, cc: 18, rarity: 3, compatible: ['frieza'] },
  { id: 59, name: 'Destructo Disc', type: 'beam', description: 'Disco destructor de Krillin.', atk: 26, acc: 75, cc: 14, rarity: 3, compatible: ['krillin'] },
  { id: 60, name: 'Kikoho', type: 'beam', description: 'Onda de energía.', atk: 24, acc: 86, cc: 13, rarity: 2, compatible: ['krillin'] },
  { id: 61, name: 'Big Bang Attack', type: 'beam', description: 'Gran explosión.', atk: 36, acc: 78, cc: 22, rarity: 4, compatible: ['vegeta'] },
  { id: 62, name: 'Gallic Cannon', type: 'beam', description: 'Cañón galáctico.', atk: 32, acc: 80, cc: 19, rarity: 3 },
  { id: 63, name: 'Solar Flare', type: 'beam', description: 'Destello cegador.', atk: 0, acc: 90, cc: 8, rarity: 2 },
  { id: 64, name: 'Ki Blast', type: 'beam', description: 'Ráfaga de ki.', atk: 16, acc: 92, cc: 8, rarity: 1 },
  { id: 65, name: 'Energy Wave', type: 'beam', description: 'Onda de energía.', atk: 18, acc: 90, cc: 9, rarity: 1 },
  { id: 66, name: 'Power Ball', type: 'beam', description: 'Bola de poder.', atk: 20, acc: 88, cc: 10, rarity: 2 },
  { id: 67, name: 'Energy Bomb', type: 'beam', description: 'Bomba de energía.', atk: 27, acc: 82, cc: 15, rarity: 3 },
  { id: 68, name: 'Death Ball', type: 'beam', description: 'Bola de muerte.', atk: 33, acc: 76, cc: 19, rarity: 4, compatible: ['frieza'] },
  { id: 69, name: 'Kienzan', type: 'beam', description: 'Disco de ki.', atk: 25, acc: 80, cc: 14, rarity: 3 },
  { id: 70, name: 'Energy Ring', type: 'beam', description: 'Anillo de energía.', atk: 21, acc: 84, cc: 11, rarity: 2 },
  { id: 71, name: 'Cannonball', type: 'beam', description: 'Bala de cañón.', atk: 29, acc: 78, cc: 17, rarity: 3 },
  { id: 72, name: 'Plasma Wave', type: 'beam', description: 'Onda de plasma.', atk: 23, acc: 86, cc: 12, rarity: 2 },
  { id: 73, name: 'Super Kamehameha', type: 'beam', description: 'Kamehameha mejorado.', atk: 40, acc: 82, cc: 25, rarity: 5, compatible: ['goku'] },
  { id: 74, name: 'Final Kamehameha', type: 'beam', description: 'Fusión de haces.', atk: 42, acc: 78, cc: 26, rarity: 5, compatible: ['goku', 'vegeta'] },
  { id: 75, name: 'Family Kamehameha', type: 'beam', description: 'Kamehameha familiar.', atk: 38, acc: 84, cc: 24, rarity: 4, compatible: ['goku', 'gohan'] },
  { id: 76, name: 'Makankosappo', type: 'beam', description: 'Cañón perforante.', atk: 35, acc: 80, cc: 21, rarity: 4, compatible: ['piccolo'] },
  { id: 77, name: 'Evil Explosion', type: 'beam', description: 'Explosión maligna.', atk: 31, acc: 78, cc: 18, rarity: 3, compatible: ['vegeta'] },
  { id: 78, name: 'Kamehameha (Beam)', type: 'beam', description: 'Kamehameha estándar.', atk: 28, acc: 90, cc: 16, rarity: 3 },

  // ── SUPPORT (17) ──
  { id: 79, name: 'Senzu Bean', type: 'support', description: 'Recupera 50 HP.', atk: 0, acc: 100, cc: 4, rarity: 2 },
  { id: 80, name: 'Ki Boost', type: 'support', description: '+3 STR, +3 KI este turno.', atk: 0, acc: 100, cc: 3, rarity: 1 },
  { id: 81, name: 'Power Boost', type: 'support', description: '+5 STR este turno.', atk: 0, acc: 100, cc: 4, rarity: 2 },
  { id: 82, name: 'Speed Boost', type: 'support', description: '+4 SPD este turno.', atk: 0, acc: 100, cc: 4, rarity: 2 },
  { id: 83, name: 'Regenerate', type: 'support', description: 'Recupera 30 HP.', atk: 0, acc: 100, cc: 3, rarity: 1 },
  { id: 84, name: 'Full Heal', type: 'support', description: 'Recupera 100 HP.', atk: 0, acc: 100, cc: 8, rarity: 3 },
  { id: 85, name: 'Hyper Mode', type: 'support', description: '+6 STR, +6 KI.', atk: 0, acc: 100, cc: 8, rarity: 3 },
  { id: 86, name: 'Energy Drain', type: 'support', description: 'Roba 10 CC al rival.', atk: 0, acc: 85, cc: 5, rarity: 3 },
  { id: 87, name: 'Ki Transfer', type: 'support', description: '+8 CC.', atk: 0, acc: 100, cc: 8, rarity: 2 },
  { id: 88, name: 'Time Freeze', type: 'support', description: 'Congela al rival un turno.', atk: 0, acc: 70, cc: 10, rarity: 4 },
  { id: 89, name: 'Afterimage', type: 'support', description: 'Evita el próximo ataque.', atk: 0, acc: 90, cc: 6, rarity: 3 },
  { id: 90, name: 'Rage', type: 'support', description: '+8 STR, -4 SPD.', atk: 0, acc: 100, cc: 5, rarity: 2 },
  { id: 91, name: 'Second Wind', type: 'support', description: 'Recupera 20 HP y +2 CC.', atk: 0, acc: 100, cc: 4, rarity: 2 },
  { id: 92, name: 'Warm Up', type: 'support', description: '+2 todas las stats.', atk: 0, acc: 100, cc: 4, rarity: 2 },
  { id: 93, name: 'Guard Boost', type: 'support', description: 'Reduce daño recibido 20%.', atk: 0, acc: 100, cc: 5, rarity: 2 },
  { id: 94, name: 'Max Power', type: 'support', description: '+10 STR, -5 ACC.', atk: 0, acc: 100, cc: 9, rarity: 4 },
  { id: 95, name: 'Instinct', type: 'support', description: '+10 ACC este turno.', atk: 0, acc: 100, cc: 5, rarity: 2 },

  // ── DEFENSE (15) ──
  { id: 96, name: 'Guard', type: 'defense', description: 'Bloquea 50% daño.', atk: 0, acc: 100, cc: 2, rarity: 1 },
  { id: 97, name: 'Dodge', type: 'defense', description: 'Esquiva con 70% prob.', atk: 0, acc: 70, cc: 4, rarity: 2 },
  { id: 98, name: 'Block', type: 'defense', description: 'Bloquea 40% daño.', atk: 0, acc: 100, cc: 2, rarity: 1 },
  { id: 99, name: 'Parry', type: 'defense', description: 'Bloquea y contraataca.', atk: 10, acc: 60, cc: 5, rarity: 3 },
  { id: 100, name: 'Iron Defense', type: 'defense', description: 'Bloquea 70% daño.', atk: 0, acc: 100, cc: 6, rarity: 3 },
  { id: 101, name: 'Evasion', type: 'defense', description: 'Esquiva con 85% prob.', atk: 0, acc: 85, cc: 7, rarity: 3 },
  { id: 102, name: 'Energy Shield', type: 'defense', description: 'Escudo de energía 60%.', atk: 0, acc: 100, cc: 5, rarity: 2 },
  { id: 103, name: 'Teleport', type: 'defense', description: 'Teletransporte esquiva.', atk: 0, acc: 90, cc: 8, rarity: 3 },
  { id: 104, name: 'Vanish', type: 'defense', description: 'Desaparece, esquiva total.', atk: 0, acc: 80, cc: 10, rarity: 4 },
  { id: 105, name: 'Absorb', type: 'defense', description: 'Absorbe el ataque.', atk: 0, acc: 65, cc: 8, rarity: 4 },
  { id: 106, name: 'Reflect', type: 'defense', description: 'Refleja 50% del daño.', atk: 0, acc: 60, cc: 7, rarity: 3 },
  { id: 107, name: 'Hard Guard', type: 'defense', description: 'Defensa sólida 55%.', atk: 0, acc: 100, cc: 4, rarity: 2 },
  { id: 108, name: 'Duck', type: 'defense', description: 'Agacharse esquiva 60%.', atk: 0, acc: 60, cc: 3, rarity: 1 },
  { id: 109, name: 'Deflect', type: 'defense', description: 'Desvía proyectiles.', atk: 0, acc: 75, cc: 5, rarity: 2 },
  { id: 110, name: 'Counter Guard', type: 'defense', description: 'Bloquea y responde.', atk: 8, acc: 55, cc: 6, rarity: 3 },

  // ── SPECIAL (15) ──
  { id: 111, name: 'Spirit Bomb', type: 'special', description: 'Daño masivo. Requiere CC lleno.', atk: 45, acc: 70, cc: 30, rarity: 5, compatible: ['goku'] },
  { id: 112, name: 'Super Saiyan', type: 'special', description: 'Transformación. +10 todas las stats.', atk: 0, acc: 100, cc: 25, rarity: 5 },
  { id: 113, name: 'Fusion', type: 'special', description: 'Fusión con el compañero.', atk: 0, acc: 100, cc: 30, rarity: 5 },
  { id: 114, name: 'Kaioken', type: 'special', description: 'Multiplica poder ×1.5.', atk: 0, acc: 100, cc: 20, rarity: 4, compatible: ['goku'] },
  { id: 115, name: 'Kaio-ken x2', type: 'special', description: 'Poder ×2.', atk: 0, acc: 100, cc: 28, rarity: 5, compatible: ['goku'] },
  { id: 116, name: 'Senzu Recovery', type: 'special', description: 'Recupera HP completo.', atk: 0, acc: 100, cc: 25, rarity: 5 },
  { id: 117, name: 'Sacrifice', type: 'special', description: 'Pierde 20 HP, +15 CC.', atk: 0, acc: 100, cc: 15, rarity: 4 },
  { id: 118, name: 'Limit Break', type: 'special', description: 'Desbloquea LIMIT sin CC.', atk: 0, acc: 100, cc: 20, rarity: 4 },
  { id: 119, name: 'Rage Boost', type: 'special', description: '+12 STR, +12 KI.', atk: 0, acc: 100, cc: 15, rarity: 4 },
  { id: 120, name: 'Multi-Form', type: 'special', description: 'Copia del luchador.', atk: 0, acc: 100, cc: 22, rarity: 4 },
  { id: 121, name: 'Instant Transmission', type: 'special', description: 'Cambia de posición.', atk: 0, acc: 100, cc: 10, rarity: 3 },
  { id: 122, name: 'Last Resort', type: 'special', description: 'Daño masivo si HP < 25%.', atk: 50, acc: 60, cc: 28, rarity: 5 },
  { id: 123, name: 'Grand Smash', type: 'special', description: 'Golpe definitivo.', atk: 40, acc: 75, cc: 24, rarity: 5 },
  { id: 124, name: 'Dragon Fist (Special)', type: 'special', description: 'Puño del dragón definitivo.', atk: 48, acc: 65, cc: 30, rarity: 5, compatible: ['goku'] },
  { id: 125, name: 'Universal Beam', type: 'special', description: 'Haz universal.', atk: 44, acc: 72, cc: 26, rarity: 5 },
];

// ─── Helpers ──────────────────────────────────────────────

export const DECK_SIZE = 20;
export const MAX_COPIES = 3;

export function getCard(id: number): CardDef | undefined {
  return CARDS.find(c => c.id === id);
}

export function cardColor(type: CardType): string {
  return CARD_COLORS[type];
}

export function cardIcon(type: CardType): string {
  return CARD_ICONS[type];
}