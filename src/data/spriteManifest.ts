// ═══════════════════════════════════════════════════════════
// DBZ LSW — Sprites de COMBATE animados (Sprite Database completa)
// Mapeo formId → directorio de sprites con manifest.json
// (42 personajes/formas del ZIP oficial, poses: idle/move/guard/
// attack_fwd/attack_ud/hurt/beam_charge/beam_fire)
// ═══════════════════════════════════════════════════════════

const SPRITE_DIRS: Record<string, string> = {
  // Goku
  'goku_base': 'goku_base',
  'goku_ssj': 'goku_super_saiyan',
  'goku_ssj2': 'goku_super_saiyan_2',
  'goku_ssj3': 'goku_super_saiyan_3',
  // Vegeta (el sheet SSJ _ Majin cubre SSJ y Majin)
  'vegeta_base': 'vegeta_base',
  'vegeta_ssj': 'vegeta_super_saiyan_majin',
  'vegeta_majin': 'vegeta_super_saiyan_majin',
  // Gohan
  'gohan_young': 'young_gohan_base',
  'gohan_young_ssj': 'young_gohan_super_saiyan',
  'gohan_young_ssj2': 'young_gohan_super_saiyan_2',
  'gohan_adult_ssj': 'gohan_super_saiyan_1_2',
  'gohan_adult_ssj2': 'gohan_super_saiyan_1_2',
  'gohan_adult_ultimate': 'gohan_ultimate',
  // Trunks
  'trunks_kid': 'trunks_base',
  'trunks_kid_ssj': 'kid_trunks_super_saiyan',
  'trunks_future': 'future_trunks_base',
  'trunks_ssj': 'future_trunks_super_saiyan',
  // Goten
  'goten_base': 'goten_base',
  'goten_ssj': 'goten_super_saiyan',
  // Gotenks
  'gotenks_ssj': 'gotenks_super_saiyan',
  'gotenks_ssj3': 'gotenks_super_saiyan_3',
  // Piccolo / Krillin
  'piccolo_base': 'piccolo_base',
  'piccolo_kami': 'piccolo_base',
  'piccolo_evil': 'piccolo_base',
  'krillin_base': 'krillin_base',
  // Frieza
  'frieza_final': 'frieza_base',
  // Cell
  'cell_imperfect': 'cell_imperfect_form',
  'cell_semi': 'cell_semi_perfect_form',
  'cell_perfect': 'cell_perfect',
  'cell_jr': 'cell_jr_base',
  // Androids
  'android_16': 'android_16_base',
  'android_17': 'android_17_base',
  'android_18': 'android_18_base',
  'android_19': 'android_19_base',
  'android_20': 'android_20_base',
  // Ginyu Force
  'ginyu': 'ginyu_base',
  'ginyu_goku': 'ginyu_gokus_body',
  'recoome': 'recoome_base',
  'guldo': 'guldo_base',
  'jeice': 'jeice_base',
  'burter': 'burter_base',
  'nappa': 'nappa_base',
  // Buu
  'buu_base': 'buu_base',
  'buu_super': 'super_buu_base',
  'buu_gotenks': 'buu_gotenks_absorbed',
  'buu_gohan': 'buu_gohan_absorbed',
  'buu_kid': 'kid_buu_base',
  // Fusions
  'vegito_ssj': 'vegito_ssj',
};

export function spriteDirFor(formId: string): string | undefined {
  return SPRITE_DIRS[formId];
}

export function spriteManifestUrl(formId: string): string | undefined {
  const dir = SPRITE_DIRS[formId];
  return dir ? `/assets/sprites/${dir}/manifest.json` : undefined;
}

export function spriteFrameUrl(formId: string, file: string): string {
  const dir = SPRITE_DIRS[formId] || formId;
  return `/assets/sprites/${dir}/${file}`;
}

// ─── Resolución de pose REAL (Dev Studio + previews) ───
// El manifest es la verdad: algunas formas NO tienen beam_fire físico
// (beam_fire: {} — alias de beam_charge en 12 formas SSJ) y las poses
// compuestas (punch_right, knockback_*, gather_power…) reutilizan frames de
// poses base. Este helper devuelve la URL del frame N de una pose aplicando
// los MISMOS fallbacks que el runtime (spriteConfig.resolveCombatPose).

// Cache-bust SIEMPRE: el Dev Studio edita manifests en disco y el SPA no debe
// quedarse con copias obsoletas (bug 2026-08-17: power_up mostraba idle porque
// el manifest cacheado era de antes del re-mapeo de poses).
async function loadManifestFor(formId: string): Promise<Record<string, unknown> | null> {
  const dir = SPRITE_DIRS[formId] || formId;
  const url = `/assets/sprites/${dir}/manifest.json?t=${Date.now()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

interface ManifestPose {
  frames?: Array<{ file?: string } | string>;
}

/**
 * URL del frame `index` de una pose, resuelto contra el manifest REAL con
 * fallbacks runtime. Devuelve undefined si la pose no existe en absoluto
 * (p.ej. beam_ray sin PNG).
 */
import { resolveCombatPose } from '../battle/spriteConfig';
import type { BattleSpritePose } from '../battle/spriteConfig';

/**
 * URL del frame `index` de una pose, resuelto contra el manifest REAL con
 * los MISMOS fallbacks del runtime (spriteConfig.resolveCombatPose — fuente
 * ÚNICA; no hay tabla de fallbacks local aquí).
 */
export async function spritePoseFrameUrl(
  formId: string,
  pose: string,
  index = 0,
): Promise<string | undefined> {
  const info = await resolvePoseInfo(formId, pose, index);
  return info?.url;
}

/**
 * Resolución completa de una pose (URL + pose resuelta + cadena de fallback)
 * — usada por Dev Studio para mostrar QUÉ se resuelve y TRAZAR el fallback.
 */
export async function resolvePoseInfo(
  formId: string,
  pose: string,
  index = 0,
): Promise<{ url: string; pose: string; fallback: string[] } | null> {
  const dir = SPRITE_DIRS[formId] || formId;
  const m = await loadManifestFor(formId);
  if (!m) return null;
  const hasPose = (p: string) => {
    const spec = m[p] as ManifestPose | undefined;
    return (spec?.frames?.length ?? 0) > 0;
  };
  const resolved = resolveCombatPose(pose as BattleSpritePose, hasPose);
  if (!resolved) return null;
  const spec = m[resolved] as ManifestPose | undefined;
  const fr = spec?.frames?.[index] ?? spec?.frames?.[0];
  const file = typeof fr === 'string' ? fr : fr?.file;
  if (!file) return null;
  // cadena de fallback real (desde la pose pedida hasta la resuelta)
  const fallback: string[] = [];
  let cur: string | null = pose;
  const guard = new Set<string>();
  while (cur && cur !== resolved && !guard.has(cur)) {
    guard.add(cur);
    fallback.push(cur);
    const next = resolveCombatPose(cur as BattleSpritePose, hasPose);
    if (!next || next === cur) break;
    cur = next;
  }
  return { url: spriteFrameUrl(formId, file), pose: resolved, fallback };
}

export const _spriteManifestInternals = { loadManifestFor };

