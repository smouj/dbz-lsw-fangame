// ═══════════════════════════════════════════════════════════
// DBZ LSW — Configuración de audio
// ═══════════════════════════════════════════════════════════

export interface AudioConfig {
  /** [TUNABLE] Volumen maestro (0-1). */
  master: number;
  /** [TUNABLE] Volumen de música (0-1). */
  music: number;
  /** [TUNABLE] Volumen de SFX (0-1). */
  sfx: number;
  /** [TUNABLE] Volumen de UI (0-1). */
  ui: number;
  /** [TUNABLE] Volumen de voz (0-1). */
  voice: number;
  /** [TUNABLE] Silenciar al perder el foco. */
  muteWhenUnfocused: boolean;
  /** [TUNABLE] Hint de latencia del AudioContext. */
  latencyHint: 'interactive' | 'balanced' | 'playback';
  /** [TUNABLE] Precargar pistas de música al arrancar. */
  preloadMusic: boolean;
}

export const AUDIO_CONFIG: AudioConfig = {
  master: 0.7,
  music: 0.5,
  sfx: 0.8,
  ui: 0.7,
  voice: 0.8,
  muteWhenUnfocused: false,
  latencyHint: 'interactive',
  preloadMusic: false,
};

export function validateAudioConfig(c: AudioConfig): string[] {
  const issues: string[] = [];
  for (const k of ['master', 'music', 'sfx', 'ui', 'voice'] as const) {
    if (!(c[k] >= 0 && c[k] <= 1)) issues.push(`${k} fuera de rango 0-1`);
  }
  return issues;
}
