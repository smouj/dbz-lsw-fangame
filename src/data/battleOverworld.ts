// ═══════════════════════════════════════════════════════════
// DBZ LSW — BATTLE OVERWORLD (taxonomía canónica)
// docs/SPRITE_TAXONOMY.md — separación Acción/Estado/Frame/FX.
//
// El Battle Overworld NO es un sprite único: es un grupo:
//   actor/000_idle.png                → pose normal de pie (TACTICAL_IDLE)
//   actor/001_gather_power_pose.png   → brazos levantados (acción GATHER POWER)
//   effects/000_gather_power_aura.png → destello de energía (FX, NO actor)
//
// La animación battle_overworld_gather_power:
//   idle → gather_power_pose → gather_power_pose + gather_power_aura
//   → POWERED_UP = true → idle
// ═══════════════════════════════════════════════════════════

export interface BattleOverworldFrame {
  x0: number; y0: number; width: number; height: number;
}

export interface BattleOverworldEntry {
  sheet: string;
  actor: {
    idle: BattleOverworldFrame;
    gather_power_pose: BattleOverworldFrame;
  };
  effects: {
    gather_power_aura: BattleOverworldFrame;
  };
}

// Forma canónica: <formId> → entrada (los ids internos son los del roster)
const BATTLE_OVERWORLD: Record<string, BattleOverworldEntry> = {
  // Mapeo directo desde public/assets/overworld/battle/manifest.json
  // (char/form del roster → rutas). Se rellena abajo por import estático
  // del manifest (generado por scripts/extract-battle-overworld.py).
};

// Cargar el manifest generado (estático — vite lo sirve como JSON)
import manifestUrl from '/assets/overworld/battle/manifest.json?url';

export async function loadBattleOverworldManifest(): Promise<Record<string, Record<string, BattleOverworldEntry>>> {
  const res = await fetch(manifestUrl);
  return res.json();
}

// URL del frame de actor
export function battleOverworldActorUrl(formId: string, frame: 'idle' | 'gather_power_pose'): string | undefined {
  // formId → char/form: el formId del roster incluye el character
  // (p.ej. 'goku_super_saiyan' → char 'goku', form 'super_saiyan').
  // El manifest está por (char, form) del roster.
  const key = formIdToCharForm(formId);
  if (!key) return undefined;
  const file = frame === 'idle' ? '000_idle.png' : '001_gather_power_pose.png';
  return `/assets/overworld/battle/${key.char}/${key.form}/battle_overworld/actor/${file}`;
}

// URL del aura (FX)
export function battleOverworldAuraUrl(formId: string): string | undefined {
  const key = formIdToCharForm(formId);
  if (!key) return undefined;
  return `/assets/overworld/battle/${key.char}/${key.form}/battle_overworld/effects/000_gather_power_aura.png`;
}

// Resolver char/form desde el formId del roster (p.ej. 'goku_super_saiyan')
// Se apoya en el prefijo del id (los ids de forma son <char>_<form>).
function formIdToCharForm(formId: string): { char: string; form: string } | null {
  // Los ids de forma del roster: goku_base, goku_super_saiyan, vegeta_base,
  // piccolo_base, majin_buu_fat_buu no existe — buu_base etc.
  // Para robustez, buscamos en el manifest por coincidencia de prefijo.
  const known: Record<string, [string, string]> = {
    'goku_base': ['goku', 'base'],
    'goku_ssj': ['goku', 'super_saiyan'],
    'goku_ssj2': ['goku', 'super_saiyan_3'], // placeholder — revisar
    'goku_ssj3': ['goku', 'super_saiyan_3'],
    'vegeta_base': ['vegeta', 'base'],
    'vegeta_ssj': ['vegeta', 'super_saiyan'],
    'vegeta_majin': ['vegeta', 'super_saiyan'],
    'piccolo_base': ['piccolo', 'base'],
    'piccolo_kami': ['piccolo', 'base'],
    'piccolo_evil': ['piccolo', 'base'],
    'krillin_base': ['krillin', 'base'],
    'gohan_young': ['gohan', 'young_base'],
    'gohan_young_ssj': ['gohan', 'super_saiyan'],
    'gohan_young_ssj2': ['gohan', 'super_saiyan'],
    'gohan_adult_ssj': ['gohan', 'super_saiyan'],
    'gohan_adult_ssj2': ['gohan', 'super_saiyan'],
    'gohan_adult_ultimate': ['gohan', 'ultimate'],
    'trunks_kid': ['trunks', 'base'],
    'trunks_kid_ssj': ['trunks', 'super_saiyan'],
    'trunks_future': ['trunks_future', 'base'],
    'trunks_ssj': ['trunks_future', 'super_saiyan'],
    'goten_base': ['goten', 'base'],
    'goten_ssj': ['goten', 'super_saiyan'],
    'gotenks_ssj': ['gotenks', 'super_saiyan'],
    'gotenks_ssj3': ['gotenks', 'super_saiyan_3'],
    'frieza_final': ['frieza', 'base'],
    'cell_imperfect': ['cell', 'imperfect'],
    'cell_semi': ['cell', 'semi_perfect'],
    'cell_perfect': ['cell', 'perfect'],
    'cell_jr': ['cell_jr', 'base'],
    'android_16': ['android_16', 'base'],
    'android_17': ['android_17', 'base'],
    'android_18': ['android_18', 'base'],
    'android_19': ['android_19', 'base'],
    'android_20': ['android_20', 'base'],
    'ginyu': ['captain_ginyu', 'base'],
    'ginyu_goku': ['captain_ginyu', 'gokus_body'],
    'recoome': ['recoome', 'base'],
    'guldo': ['guldo', 'base'],
    'jeice': ['jeice_burter', 'jeice'],
    'burter': ['jeice_burter', 'burter'],
    'nappa': ['nappa', 'base'],
    'buu_base': ['majin_buu', 'fat_buu'],
    'buu_super': ['majin_buu', 'super_buu'],
    'buu_gotenks': ['majin_buu', 'gotenks_absorbed'],
    'buu_gohan': ['majin_buu', 'gohan_absorbed'],
    'buu_kid': ['majin_buu', 'kid_buu'],
    'vegito_ssj': ['vegito', 'base'],
  };
  const pair = known[formId];
  return pair ? { char: pair[0], form: pair[1] } : null;
}
