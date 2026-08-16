// ═══════════════════════════════════════════════════════════
// DBZ LSW — BATTLE OVERWORLD (taxonomía canónica)
// docs/SPRITE_TAXONOMY.md — separación Acción/Estado/Frame/FX.
//
// El Battle Overworld NO es un sprite único: es un grupo:
//   actor/000_idle.png                → pose normal de pie (TACTICAL_IDLE)
//   actor/001_gather_power_pose.png   → brazos levantados (acción GATHER POWER)
//   effects/000_gather_power_aura.png → destello de energía (FX, NO actor)
//
// FUENTE DE VERDAD: public/assets/overworld/battle/manifest.json (24
// entradas reales). Los formIds del roster SIN entrada en el manifest NO
// tienen battle overworld extraído: las URLs devuelven undefined y el
// runtime cae al chibi *_ow.png (sin aura rota / icono cyan).
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

// Manifest cargado estáticamente (vite sirve el JSON como URL).
import manifestUrl from '/assets/overworld/battle/manifest.json?url';
import { OVERWORLD_FILES } from './overworld';

export async function loadBattleOverworldManifest(): Promise<Record<string, Record<string, BattleOverworldEntry>>> {
  const res = await fetch(manifestUrl);
  return res.json();
}

/**
 * Mapeo estático char/form derivado del manifest REAL (24 entradas).
 * SOLO las formas confirmadas tienen battle overworld; el resto devuelve
 * null → runtime usa chibi *_ow.png y sin aura (nunca URL rota).
 */
function formIdToCharFormSync(formId: string): { char: string; form: string } | null {
  const known: Record<string, [string, string]> = {
    // Entradas confirmadas en manifest.json (24)
    'goku_base': ['goku', 'base'],
    'goku_ssj': ['goku', 'super_saiyan'],
    'goku_ssj3': ['goku', 'super_saiyan_3'],
    'vegeta_base': ['vegeta', 'base'],
    'vegeta_ssj': ['vegeta', 'super_saiyan'],
    'vegeta_majin': ['vegeta', 'super_saiyan'],
    'piccolo_base': ['piccolo', 'base'],
    'krillin_base': ['krillin', 'base'],
    'frieza_final': ['frieza', 'base'],
    'cell_jr': ['cell_jr', 'base'],
    'android_16': ['android_16', 'base'],
    'android_17': ['android_17', 'base'],
    'android_18': ['android_18', 'base'],
    'android_19': ['android_19', 'base'],
    'android_20': ['android_20', 'base'],
    'ginyu': ['captain_ginyu', 'base'],
    'recoome': ['recoome', 'base'],
    'guldo': ['guldo', 'base'],
    'jeice': ['jeice_burter', 'jeice'],
    'burter': ['jeice_burter', 'burter'],
    'buu_base': ['majin_buu', 'fat_buu'],
    'buu_super': ['majin_buu', 'super_buu'],
    'buu_kid': ['majin_buu', 'kid_buu'],
    'gotenks_ssj': ['gotenks', 'super_saiyan'],
    'vegito_ssj': ['vegito', 'base'],
    // NOTA: gohan, trunks, goten, cell, nappa, ginyu_goku, buu_gotenks,
    // buu_gohan y gotenks_ssj3 NO tienen battle overworld en el manifest
    // (24 entradas reales). No inventar rutas: devuelven null y el runtime
    // cae al chibi *_ow.png sin aura (nunca icono roto/cyan).
  };
  const pair = known[formId];
  return pair ? { char: pair[0], form: pair[1] } : null;
}

// URL del frame de actor
// - 'idle': FUENTE CANÓNICA = overworld/panel_sprites (48 formas, sin duplicados).
//   Usa el MISMO mapeo OVERWORLD_FILES que overworldUrl (los nombres de archivo
//   NO son <formId>_ow.png para todas las formas: gohan_young→young_gohan_base_ow,
//   trunks_kid→trunks_base_ow, etc.). Los 000_idle.png de battle/ eran copias
//   byte-idénticas de panel_sprites (21/24) — eliminados como duplicidad.
// - 'gather_power_pose': SOLO battle/ (brazos arriba, exclusivo del power-up);
//   las 20 formas sin battle overworld devuelven undefined → fallback al chibi.
export function battleOverworldActorUrl(formId: string, frame: 'idle' | 'gather_power_pose'): string | undefined {
  if (frame === 'idle') {
    const file = OVERWORLD_FILES[formId];
    return file ? `/assets/overworld/panel_sprites/${file}` : undefined;
  }
  const key = formIdToCharFormSync(formId);
  if (!key) return undefined;
  return `/assets/overworld/battle/${key.char}/${key.form}/battle_overworld/actor/001_gather_power_pose.png`;
}

// URL del aura (FX). Verifica existencia real del archivo: si la entrada del
// manifest no existe en disco, devuelve undefined (sin icono roto/cyan).
export async function battleOverworldAuraUrlAsync(formId: string): Promise<string | undefined> {
  const url = battleOverworldAuraUrl(formId);
  if (!url) return undefined;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok ? url : undefined;
  } catch {
    return undefined;
  }
}

// Versión síncrona para el runtime del juego: deriva del mapeo estático.
// Devuelve undefined si el form no tiene aura real → el runtime muestra la
// pose gather sin aura (fallback CSS), nunca una imagen rota.
export function battleOverworldAuraUrl(formId: string): string | undefined {
  const key = formIdToCharFormSync(formId);
  if (!key) return undefined;
  return `/assets/overworld/battle/${key.char}/${key.form}/battle_overworld/effects/000_gather_power_aura.png`;
}
