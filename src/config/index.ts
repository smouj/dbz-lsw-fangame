// ═══════════════════════════════════════════════════════════
// DBZ LSW — Config central (agregador + validación global)
// ═══════════════════════════════════════════════════════════

import { GAME_CONFIG, validateGameConfig } from './game.config';
import { GAMEPLAY_CONFIG, validateGameplayConfig, stageWindowsTicks } from './gameplay.config';
import { RENDERER_CONFIG, validateRendererConfig } from './renderer.config';
import { AUDIO_CONFIG, validateAudioConfig } from './audio.config';
import { SAVE_CONFIG, validateSaveConfig } from './save.config';
import { FEATURE_FLAGS, activeDevOnly } from './features';
import { BUILD_PROFILES, validateBuildProfile, type BuildProfileId } from './build/build.config';

export * from './game.config';
export * from './gameplay.config';
export * from './renderer.config';
export * from './audio.config';
export * from './save.config';
export * from './features';
export * from './build/build.config';

export interface ConfigReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/** Validación global de la configuración (canon + invariantes). */
export function validateAllConfig(): ConfigReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  errors.push(...validateGameConfig(GAME_CONFIG).map(e => `game: ${e}`));
  errors.push(...validateGameplayConfig(GAMEPLAY_CONFIG).map(e => `gameplay: ${e}`));
  errors.push(...validateRendererConfig(RENDERER_CONFIG).map(e => `renderer: ${e}`));
  errors.push(...validateAudioConfig(AUDIO_CONFIG).map(e => `audio: ${e}`));
  errors.push(...validateSaveConfig(SAVE_CONFIG, GAME_CONFIG.saveVersion).map(e => `save: ${e}`));

  // saveVersion consistente entre game y save
  if (SAVE_CONFIG.saveVersion !== GAME_CONFIG.saveVersion) {
    errors.push(`saveVersion inconsistente (game=${GAME_CONFIG.saveVersion} save=${SAVE_CONFIG.saveVersion})`);
  }

  // Dev-only activos según el perfil de build
  const profile = BUILD_PROFILES[GAME_CONFIG.channel as BuildProfileId] ?? BUILD_PROFILES.development;
  for (const k of validateBuildProfile(profile)) errors.push(`build(${profile.id}): ${k}`);
  for (const k of activeDevOnly(FEATURE_FLAGS)) {
    if (!profile.devStudio && k === 'devStudio') errors.push(`features: ${k} activo sin Dev Studio en el perfil`);
  }

  // QTE windows en rango canónico (derivado)
  const w = stageWindowsTicks();
  if (w.BACK_BACK !== 72 || w.BACK_FRONT !== 102 || w.FRONT_BACK !== 143 || w.FRONT_FRONT !== 173) {
    warnings.push(`stageWindowsTicks fuera del rango medido (${w.BACK_BACK}/${w.BACK_FRONT}/${w.FRONT_BACK}/${w.FRONT_FRONT}; canon ~72/102/143/173)`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
