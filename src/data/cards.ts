// ═══════════════════════════════════════════════════════════
// DBZ LSW — Cartas (125 reales de la ROM USA, CRC32 025AA88A)
// Tabla ROM 0x044315 (125 × 16 bytes) — nombres, tipos y stats verificados
// Tipos: command/damage/beam/support/defense/special
// effect: lógica de batalla independiente del idioma
// ═══════════════════════════════════════════════════════════

export type CardType = 'command' | 'damage' | 'beam' | 'support' | 'defense' | 'special';
export type CardEffect = 'command_3' | 'command_4' | 'command_5' | 'command_6'
  | 'damage' | 'damage_pierce' | 'damage_special' | 'damage_special_team' | 'damage_special_lowacc' | 'damage_low_acc'
  | 'beam' | 'beam_team' | 'beam_suicide' | 'beam_varhp'
  | 'heal_25pct' | 'heal_strong' | 'heal_light'
  | 'buff_kaio' | 'buff_ki8' | 'buff_str8' | 'buff_speed8' | 'buff_guard8' | 'buff_str_ki8'
  | 'debuff_str8' | 'debuff_ki8' | 'debuff_speed8' | 'debuff_speed8_lowacc' | 'debuff_guard8'
  | 'attack_power_down' | 'powerdown_cleanse' | 'powerup_dispel' | 'support_dispel'
  | 'avoid_beam' | 'avoid_damage' | 'avoid_damage_taiyoken' | 'reduce_damage' | 'absorb_beam'
  | 'command_cancel' | 'accuracy_up' | 'evasion_up' | 'knockdown_dmg' | 'knockdown_min' | 'medical_machine'
  | 'life_drain' | 'cc_recovery' | 'lock_on' | 'sunglasses' | 'gamebomb' | 'candy' | 'naughty_book'
  | 'beam_shield' | 'damage_shield' | 'ohko_lowacc' | 'android_kill' | 'special_card';

export interface CardDef {
  id: number;
  name: string;          // nombre canónico (inglés ROM)
  type: CardType;
  description?: string;   // descripción base (inglés)
  atk: number;
  acc: number;
  cc: number;
  rarity: number;        // 1-5 estrellas
  effect: CardEffect;    // comportamiento en batalla (independiente del idioma)
  compatible?: string[]; // ids de personajes (undefined = todos)
  notCompatible?: string[]; // ids EXCLUIDOS (el resto puede usarla)
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

// ─── 125 cartas (datos reales ROM) ────────────────────────

export const CARDS: CardDef[] = [
  { id: 1, name: "3 stage atk.", type: 'command', effect: 'command_3', atk: 0, acc: 100, cc: 0, rarity: 1 },
  { id: 2, name: "4 stage atk.", type: 'command', effect: 'command_4', atk: 0, acc: 100, cc: 0, rarity: 1 },
  { id: 3, name: "5 stage atk.", type: 'command', effect: 'command_5', atk: 0, acc: 100, cc: 0, rarity: 1 },
  { id: 4, name: "6 stage atk.", type: 'command', effect: 'command_6', atk: 0, acc: 100, cc: 0, rarity: 1 },
  { id: 5, name: "Cont.Punch", type: 'damage', effect: 'damage', atk: 10, acc: 100, cc: 10, rarity: 1 },
  { id: 6, name: "Cont.Kick", type: 'damage', effect: 'damage', atk: 20, acc: 80, cc: 15, rarity: 2 },
  { id: 7, name: "Energy Wave", type: 'beam', effect: 'beam', atk: 15, acc: 90, cc: 12, rarity: 2 },
  { id: 8, name: "Energy Bomb", type: 'beam', effect: 'beam', atk: 10, acc: 100, cc: 10, rarity: 1 },
  { id: 9, name: "Special Card", type: 'special', effect: 'special_card', atk: 0, acc: 0, cc: 0, rarity: 5 },
  { id: 10, name: "Masenko", type: 'beam', effect: 'beam', atk: 25, acc: 95, cc: 18, rarity: 3, compatible: ['gohan_kid', 'goten']},
  { id: 11, name: "Dunk Shot", type: 'damage', effect: 'damage', atk: 25, acc: 100, cc: 19, rarity: 3, compatible: ['gohan_kid'] },
  { id: 12, name: "Kamehameha", type: 'beam', effect: 'beam', atk: 20, acc: 100, cc: 16, rarity: 2, compatible: ['buu', 'cell', 'goku', 'goten']},
  { id: 13, name: "S.Kamehameha", type: 'beam', effect: 'beam', atk: 30, acc: 100, cc: 23, rarity: 3, compatible: ['buu', 'cell', 'cell_jr', 'ginyu', 'gohan_adult', 'goku', 'vegito']},
  { id: 14, name: "F.Kamehameha", type: 'beam', effect: 'beam_team', atk: 60, acc: 100, cc: 33, rarity: 5, compatible: ['goku']},
  { id: 15, name: "Sonic Kick", type: 'damage', effect: 'damage', atk: 25, acc: 100, cc: 18, rarity: 3, compatible: ['piccolo']},
  { id: 16, name: "Resurrection", type: 'support', effect: 'heal_25pct', atk: 0, acc: 100, cc: 10, rarity: 1, compatible: ['buu', 'cell', 'cell_jr', 'gohan_kid']},
  { id: 17, name: "S.Beam Can.", type: 'beam', effect: 'beam', atk: 30, acc: 75, cc: 21, rarity: 3, compatible: ['cell', 'cell_jr', 'piccolo']},
  { id: 18, name: "F.Lightbomb", type: 'beam', effect: 'beam', atk: 35, acc: 100, cc: 25, rarity: 4, compatible: ['piccolo']},
  { id: 19, name: "Taiyoken", type: 'defense', effect: 'avoid_damage_taiyoken', atk: 0, acc: 0, cc: 5, rarity: 1, compatible: ['cell', 'cell_jr', 'goku']},
  { id: 20, name: "Misty KiWave", type: 'beam', effect: 'beam', atk: 30, acc: 100, cc: 23, rarity: 3, compatible: ['krillin'] },
  { id: 21, name: "Destruct-Disk", type: 'beam', effect: 'beam', atk: 25, acc: 80, cc: 18, rarity: 3, compatible: ['frieza', 'krillin', 'vegeta']},
  { id: 22, name: "S.Destruc-D.", type: 'beam', effect: 'beam', atk: 40, acc: 90, cc: 28, rarity: 4, compatible: ['krillin']},
  { id: 23, name: "Kaio Ken", type: 'support', effect: 'buff_kaio', atk: 0, acc: 100, cc: 10, rarity: 1, compatible: ['goku']},
  { id: 24, name: "Spirit Bomb", type: 'beam', effect: 'beam', atk: 35, acc: 90, cc: 25, rarity: 4, compatible: ['goku']},
  { id: 25, name: "Solid Shot", type: 'damage', effect: 'damage', atk: 25, acc: 100, cc: 19, rarity: 3, compatible: ['goku']},
  { id: 26, name: "Teleport.", type: 'defense', effect: 'avoid_beam', atk: 0, acc: 0, cc: 5, rarity: 1, compatible: ['cell', 'vegito']},
  { id: 27, name: "Sup.Saiyan-2", type: 'support', effect: 'buff_ki8', atk: 0, acc: 100, cc: 7, rarity: 1, compatible: ['vegeta']},
  { id: 28, name: "Sup.Saiyan-3", type: 'support', effect: 'buff_str8', atk: 0, acc: 100, cc: 7, rarity: 1, compatible: ['vegeta']},
  { id: 29, name: "Tail", type: 'damage', effect: 'damage_pierce', atk: 35, acc: 100, cc: 26, rarity: 4, compatible: ['goku', 'gohan_kid', 'vegeta'] },
  { id: 30, name: "Galick-Ho", type: 'beam', effect: 'beam', atk: 20, acc: 100, cc: 17, rarity: 2, compatible: ['vegeta']},
  { id: 31, name: "Big Bang Atk", type: 'beam', effect: 'beam', atk: 30, acc: 90, cc: 23, rarity: 3, compatible: ['vegeta', 'vegito']},
  { id: 32, name: "Final Flash", type: 'beam', effect: 'beam', atk: 40, acc: 95, cc: 28, rarity: 4, compatible: ['vegeta']},
  { id: 33, name: "Suicide", type: 'beam', effect: 'beam_suicide', atk: 70, acc: 90, cc: 31, rarity: 5, compatible: ['vegeta']},
  { id: 34, name: "Rising Kick", type: 'damage', effect: 'damage', atk: 30, acc: 100, cc: 24, rarity: 3, compatible: ['trunks_future']},
  { id: 35, name: "Burning Atk.", type: 'beam', effect: 'beam', atk: 25, acc: 100, cc: 19, rarity: 3, compatible: ['android_16', 'android_17', 'android_18', 'trunks_future', 'trunks_kid']},
  { id: 36, name: "Fin.Buster", type: 'beam', effect: 'beam', atk: 35, acc: 100, cc: 26, rarity: 4, compatible: ['trunks_future'] },
  { id: 37, name: "Flash Punch", type: 'damage', effect: 'damage', atk: 25, acc: 100, cc: 19, rarity: 3, compatible: ['trunks_future']},
  { id: 38, name: "Kamekameha", type: 'beam', effect: 'beam', atk: 25, acc: 90, cc: 18, rarity: 3, compatible: ['goten']},
  { id: 39, name: "Galactica D.", type: 'beam', effect: 'beam', atk: 15, acc: 100, cc: 10, rarity: 2, compatible: ['android_19', 'android_20', 'buu']},
  { id: 40, name: "S.G.K.Atk.", type: 'beam', effect: 'beam', atk: 40, acc: 80, cc: 28, rarity: 4, compatible: ['buu']},
  { id: 41, name: "V-ball Crash", type: 'damage', effect: 'damage_special_team', atk: 60, acc: 100, cc: 33, rarity: 5, compatible: ['buu'] },
  { id: 42, name: "Kiai", type: 'support', effect: 'debuff_guard8', atk: 0, acc: 95, cc: 8, rarity: 1, compatible: ['buu']},
  { id: 43, name: "Atomic Break", type: 'damage', effect: 'damage', atk: 25, acc: 100, cc: 20, rarity: 3, compatible: ['vegito'] },
  { id: 44, name: "Flash.Sword", type: 'beam', effect: 'beam', atk: 35, acc: 100, cc: 26, rarity: 4, compatible: ['trunks_future']},
  { id: 45, name: "Barrier", type: 'defense', effect: 'avoid_beam', atk: 0, acc: 0, cc: 5, rarity: 1, compatible: ['android_17', 'cell', 'cell_jr']},
  { id: 46, name: "N.Slasher", type: 'damage', effect: 'damage', atk: 30, acc: 100, cc: 24, rarity: 3, compatible: ['nappa', 'trunks_future']},
  { id: 47, name: "KiBlast Bomb", type: 'beam', effect: 'beam', atk: 20, acc: 90, cc: 16, rarity: 2, compatible: ['cell', 'nappa']},
  { id: 48, name: "Lightning C.", type: 'beam', effect: 'beam', atk: 30, acc: 90, cc: 23, rarity: 3, compatible: ['cell', 'nappa']},
  { id: 49, name: "Telekinesis", type: 'beam', effect: 'beam', atk: 20, acc: 90, cc: 14, rarity: 2, compatible: ['cell', 'guldo']},
  { id: 50, name: "M.Soundwave", type: 'beam', effect: 'beam', atk: 15, acc: 100, cc: 10, rarity: 2, compatible: ['guldo']},
  { id: 51, name: "Paralysis", type: 'support', effect: 'debuff_speed8', atk: 0, acc: 95, cc: 5, rarity: 1, compatible: ['guldo']},
  { id: 52, name: "Time Freeze", type: 'defense', effect: 'command_cancel', atk: 0, acc: 0, cc: 1, rarity: 1, compatible: ['guldo']},
  { id: 53, name: "Breath", type: 'defense', effect: 'avoid_beam', atk: 0, acc: 0, cc: 5, rarity: 1, compatible: ['buu', 'recoome']},
  { id: 54, name: "Eraser Can.", type: 'beam', effect: 'beam', atk: 25, acc: 90, cc: 18, rarity: 3, compatible: ['cell', 'recoome']},
  { id: 55, name: "R.F.B.Atk.", type: 'damage', effect: 'damage_low_acc', atk: 35, acc: 50, cc: 24, rarity: 4, compatible: ['recoome']},
  { id: 56, name: "Crasher Ball", type: 'beam', effect: 'beam', atk: 25, acc: 100, cc: 19, rarity: 3, compatible: ['ginyu', 'jeice']},
  { id: 57, name: "Purple Comet", type: 'beam', effect: 'beam_team', atk: 40, acc: 95, cc: 28, rarity: 4, compatible: ['frieza', 'jeice']},
  { id: 58, name: "P.Comet Z", type: 'damage', effect: 'damage_special_team', atk: 50, acc: 100, cc: 31, rarity: 5, compatible: ['frieza', 'jeice']},
  { id: 59, name: "Speed Up", type: 'support', effect: 'buff_speed8', atk: 0, acc: 100, cc: 7, rarity: 1, compatible: ['jeice']},
  { id: 60, name: "Mach Attack", type: 'damage', effect: 'damage', atk: 20, acc: 100, cc: 17, rarity: 2, compatible: ['jeice']},
  { id: 61, name: "Dynami.Punch", type: 'damage', effect: 'damage', atk: 25, acc: 100, cc: 20, rarity: 3, compatible: ['ginyu']},
  { id: 62, name: "Body Change", type: 'beam', effect: 'beam_varhp', atk: 0, acc: 80, cc: 20, rarity: 3, compatible: ['ginyu']},
  { id: 63, name: "Finger Beam", type: 'beam', effect: 'beam', atk: 15, acc: 100, cc: 10, rarity: 2, compatible: ['android_19', 'android_20', 'cell', 'cell_jr', 'frieza']},
  { id: 64, name: "Super E-Ball", type: 'beam', effect: 'beam', atk: 30, acc: 95, cc: 23, rarity: 3, compatible: ['android_16', 'android_17', 'android_19', 'android_20', 'buu', 'frieza']},
  { id: 65, name: "Grand Wave", type: 'beam', effect: 'beam', atk: 25, acc: 90, cc: 18, rarity: 3, compatible: ['frieza']},
  { id: 66, name: "S.Dash Elbow", type: 'damage', effect: 'damage', atk: 30, acc: 90, cc: 23, rarity: 3, compatible: ['android_20', 'frieza']},
  { id: 67, name: "Eye Beam", type: 'beam', effect: 'beam', atk: 20, acc: 100, cc: 17, rarity: 2, compatible: ['android_16', 'android_19', 'android_20']},
  { id: 68, name: "Lock On", type: 'support', effect: 'lock_on', atk: 0, acc: 100, cc: 4, rarity: 1, compatible: ['android_16', 'android_17', 'android_19', 'android_20']},
  { id: 69, name: "Rocket Punch", type: 'damage', effect: 'damage_special_lowacc', atk: 30, acc: 30, cc: 18, rarity: 3, compatible: ['android_16', 'android_17', 'android_18']},
  { id: 70, name: "Hell Flash", type: 'beam', effect: 'beam', atk: 40, acc: 70, cc: 26, rarity: 4, compatible: ['android_16']},
  { id: 71, name: "Crazy Rush", type: 'damage', effect: 'damage', atk: 30, acc: 90, cc: 23, rarity: 3, compatible: ['android_17', 'cell']},
  { id: 72, name: "Energy Slash", type: 'beam', effect: 'beam', atk: 25, acc: 100, cc: 18, rarity: 3, compatible: ['android_16', 'android_17', 'android_19', 'cell']},
  { id: 73, name: "Energy Slice", type: 'beam', effect: 'beam', atk: 20, acc: 90, cc: 15, rarity: 2, compatible: ['android_16', 'android_17', 'cell']},
  { id: 74, name: "Attack No. 18", type: 'damage', effect: 'damage', atk: 25, acc: 100, cc: 19, rarity: 3, compatible: ['android_16', 'android_17', 'android_18']},
  { id: 75, name: "Life Absorb", type: 'damage', effect: 'life_drain', atk: 10, acc: 90, cc: 15, rarity: 2, compatible: ['android_19', 'android_20']},
  { id: 76, name: "Energy Absorb", type: 'defense', effect: 'absorb_beam', atk: 0, acc: 0, cc: 5, rarity: 1, compatible: ['android_19', 'android_20']},
  { id: 77, name: "Cell Combo", type: 'damage', effect: 'damage', atk: 25, acc: 100, cc: 20, rarity: 3, compatible: ['cell']},
  { id: 78, name: "Step Up Atk.", type: 'damage', effect: 'damage', atk: 25, acc: 100, cc: 19, rarity: 3, compatible: ['cell_jr']},
  { id: 79, name: "Flesh Guard", type: 'support', effect: 'buff_guard8', atk: 0, acc: 100, cc: 9, rarity: 1, compatible: ['buu']},
  { id: 80, name: "Potbelly Atk", type: 'damage', effect: 'damage_special', atk: 20, acc: 100, cc: 16, rarity: 2, compatible: ['buu']},
  { id: 81, name: "Crasher Buu", type: 'damage', effect: 'damage', atk: 25, acc: 100, cc: 20, rarity: 3, compatible: ['buu']},
  { id: 82, name: "Sweet Beam", type: 'beam', effect: 'beam', atk: 25, acc: 90, cc: 19, rarity: 3, compatible: ['buu']},
  { id: 83, name: "Bulma", type: 'support', effect: 'debuff_str8', atk: 0, acc: 95, cc: 3, rarity: 1 },
  { id: 84, name: "Chaiotzu", type: 'support', effect: 'debuff_speed8_lowacc', atk: 0, acc: 60, cc: 3, rarity: 1 },
  { id: 85, name: "Tien", type: 'support', effect: 'knockdown_dmg', atk: 20, acc: 80, cc: 6, rarity: 2 },
  { id: 86, name: "Yajirobe", type: 'support', effect: 'knockdown_dmg', atk: 10, acc: 100, cc: 4, rarity: 1 },
  { id: 87, name: "Kaio", type: 'support', effect: 'debuff_ki8', atk: 0, acc: 90, cc: 3, rarity: 1 },
  { id: 88, name: "Dende", type: 'support', effect: 'heal_strong', atk: 0, acc: 100, cc: 12, rarity: 2 },
  { id: 89, name: "Guru", type: 'support', effect: 'buff_str_ki8', atk: 0, acc: 100, cc: 6, rarity: 1 },
  { id: 90, name: "Hercule", type: 'support', effect: 'knockdown_min', atk: 5, acc: 100, cc: 3, rarity: 1 },
  { id: 91, name: "Supreme Kai", type: 'support', effect: 'debuff_speed8', atk: 0, acc: 80, cc: 4, rarity: 1 },
  { id: 92, name: "Kibito", type: 'support', effect: 'beam_shield', atk: 0, acc: 100, cc: 12, rarity: 2 },
  { id: 93, name: "Babidi", type: 'support', effect: 'powerup_dispel', atk: 0, acc: 100, cc: 6, rarity: 1 },
  { id: 94, name: "Dabura", type: 'support', effect: 'ohko_lowacc', atk: 0, acc: 20, cc: 12, rarity: 2 },
  { id: 95, name: "Yakon", type: 'support', effect: 'powerup_dispel', atk: 0, acc: 100, cc: 4, rarity: 1 },
  { id: 96, name: "Scouter", type: 'support', effect: 'debuff_guard8', atk: 0, acc: 90, cc: 5, rarity: 1 },
  { id: 97, name: "Caps. Fridge", type: 'support', effect: 'cc_recovery', atk: 0, acc: 100, cc: 1, rarity: 1 },
  { id: 98, name: "Stop Device", type: 'support', effect: 'android_kill', atk: 0, acc: 0, cc: 21, rarity: 3, notCompatible: ['android_16', 'android_17', 'android_18', 'android_19', 'android_20'] },
  { id: 99, name: "Life Preser.", type: 'support', effect: 'heal_light', atk: 20, acc: 100, cc: 8, rarity: 2 },
  { id: 100, name: "Medical Mac.", type: 'support', effect: 'powerdown_cleanse', atk: 0, acc: 100, cc: 8, rarity: 1 },
  { id: 101, name: "Gravity Dev.", type: 'support', effect: 'debuff_speed8', atk: 0, acc: 90, cc: 5, rarity: 1 },
  { id: 102, name: "Ene.Absorber", type: 'support', effect: 'damage', atk: 10, acc: 85, cc: 8, rarity: 1 },
  { id: 103, name: "Sealed Ball", type: 'support', effect: 'attack_power_down', atk: 0, acc: 80, cc: 4, rarity: 1 },
  { id: 104, name: "Trunks Sword", type: 'support', effect: 'buff_str8', atk: 0, acc: 100, cc: 4, rarity: 1 },
  { id: 105, name: "Dabura Spear", type: 'support', effect: 'buff_str8', atk: 0, acc: 100, cc: 4, rarity: 1 },
  { id: 106, name: "Light Vest", type: 'support', effect: 'buff_speed8', atk: 0, acc: 100, cc: 6, rarity: 1 },
  { id: 107, name: "Btl. Jacket", type: 'support', effect: 'buff_guard8', atk: 0, acc: 100, cc: 7, rarity: 1 },
  { id: 108, name: "New-B Jacket", type: 'support', effect: 'buff_guard8', atk: 0, acc: 100, cc: 6, rarity: 1 },
  { id: 109, name: "Sunglasses", type: 'support', effect: 'sunglasses', atk: 0, acc: 100, cc: 3, rarity: 1 },
  { id: 110, name: "Gamebomb", type: 'support', effect: 'gamebomb', atk: 25, acc: 90, cc: 10, rarity: 3 },
  { id: 111, name: "Champ.Belt", type: 'support', effect: 'damage_shield', atk: 0, acc: 100, cc: 12, rarity: 2 },
  { id: 112, name: "H's Choco.", type: 'support', effect: 'candy', atk: 30, acc: 80, cc: 12, rarity: 3 },
  { id: 113, name: "Heart Virus", type: 'support', effect: 'attack_power_down', atk: 0, acc: 95, cc: 5, rarity: 1 },
  { id: 114, name: "Heart Medi.", type: 'support', effect: 'powerdown_cleanse', atk: 0, acc: 100, cc: 8, rarity: 1 },
  { id: 115, name: "Sandglass", type: 'support', effect: 'support_dispel', atk: 0, acc: 100, cc: 5, rarity: 1 },
  { id: 116, name: "Naughty Book", type: 'support', effect: 'naughty_book', atk: 5, acc: 100, cc: 6, rarity: 1 },
  { id: 117, name: "Full Spirit", type: 'support', effect: 'buff_ki8', atk: 0, acc: 100, cc: 4, rarity: 1 },
  { id: 118, name: "Afterimage", type: 'support', effect: 'evasion_up', atk: 0, acc: 100, cc: 4, rarity: 1 },
  { id: 119, name: "Reading Ki", type: 'support', effect: 'accuracy_up', atk: 0, acc: 100, cc: 4, rarity: 1 },
  { id: 120, name: "Feint", type: 'support', effect: 'accuracy_up', atk: 0, acc: 100, cc: 4, rarity: 1 },
  { id: 121, name: "Endurance", type: 'defense', effect: 'reduce_damage', atk: 0, acc: 0, cc: 7, rarity: 1 },
  { id: 122, name: "Telepathy", type: 'defense', effect: 'command_cancel', atk: 0, acc: 0, cc: 1, rarity: 1 },
  { id: 123, name: "Foresight", type: 'defense', effect: 'command_cancel', atk: 0, acc: 0, cc: 1, rarity: 1 },
  { id: 124, name: "Shockwave", type: 'defense', effect: 'avoid_damage', atk: 0, acc: 0, cc: 5, rarity: 1 },
  { id: 125, name: "Avoiding", type: 'defense', effect: 'avoid_beam', atk: 0, acc: 0, cc: 5, rarity: 1 },

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
