// ═══════════════════════════════════════════════════════════
// DBZ LSW — Configuración de gameplay (CANON LOCKED vs TUNABLE)
// ═══════════════════════════════════════════════════════════

export interface GameplayConfig {
  /** [CANON] FPS nativos del GBC (reloj único del motor). */
  gbcNativeFps: number;
  /** [CANON] El tick de batalla = gbcNativeFps (battleTick es el reloj único). */
  battleTickRate: number;
  /** [TUNABLE] Buffer de entrada del jugador (ticks). */
  inputBuffer: number;
  /** [CANON] Ventanas del QTE Stage Attack (segundos), por par de posiciones. */
  stageWindowsSeconds: Record<'BACK_BACK' | 'BACK_FRONT' | 'FRONT_BACK' | 'FRONT_FRONT', number>;
  /** [TUNABLE] Velocidad de batalla por defecto (1 = nativa). */
  defaultBattleSpeed: number;
  /** [TUNABLE] Retardo de "pensamiento" de la IA (ms, solo UI). */
  aiThinkingDelayMs: number;
  /** [TUNABLE] Retardo entre turnos (ms, solo UI). */
  turnDelayMs: number;
  /** [TUNABLE] Duración de los números de daño (ms). */
  damageNumberDurationMs: number;
  /** [TUNABLE] Avance automático de diálogos/story. */
  autoAdvance: boolean;
  /** [TUNABLE] Velocidad de texto de la historia (ms/carácter). */
  storyTextSpeedMs: number;
  /** [TUNABLE] Multiplicador de screen shake (0 = sin shake). */
  cameraShakeMultiplier: number;
  /** [TUNABLE] Velocidad de transición de la UI (ms). */
  uiTransitionMs: number;
}

export const GAMEPLAY_CONFIG: GameplayConfig = {
  // ── CANON LOCKED ─────────────────────────────────────────
  gbcNativeFps: 59.72750056960583,
  battleTickRate: 59.72750056960583,
  stageWindowsSeconds: {
    BACK_BACK: 1.2,
    BACK_FRONT: 1.7,
    FRONT_BACK: 2.4,
    FRONT_FRONT: 2.9,
  },
  // ── TUNABLE ──────────────────────────────────────────────
  inputBuffer: 4,
  defaultBattleSpeed: 1,
  aiThinkingDelayMs: 400,
  turnDelayMs: 900,
  damageNumberDurationMs: 700,
  autoAdvance: false,
  storyTextSpeedMs: 28,
  cameraShakeMultiplier: 1,
  uiTransitionMs: 180,
};

export const GAMEPLAY_CANON_FIELDS = new Set<keyof GameplayConfig>([
  'gbcNativeFps', 'battleTickRate', 'stageWindowsSeconds',
]);

/** Ventanas del QTE en ticks nativos (cómputo derivado, siempre fresco). */
export function stageWindowsTicks(c: GameplayConfig = GAMEPLAY_CONFIG) {
  return {
    BACK_BACK: Math.round(c.stageWindowsSeconds.BACK_BACK * c.gbcNativeFps),
    BACK_FRONT: Math.round(c.stageWindowsSeconds.BACK_FRONT * c.gbcNativeFps),
    FRONT_BACK: Math.round(c.stageWindowsSeconds.FRONT_BACK * c.gbcNativeFps),
    FRONT_FRONT: Math.round(c.stageWindowsSeconds.FRONT_FRONT * c.gbcNativeFps),
  };
}

export function validateGameplayConfig(c: GameplayConfig): string[] {
  const issues: string[] = [];
  if (c.gbcNativeFps !== 59.72750056960583) issues.push('gbcNativeFps no coincide con el nativo GBC');
  if (c.battleTickRate !== c.gbcNativeFps) issues.push('battleTickRate != gbcNativeFps');
  for (const k of ['BACK_BACK', 'BACK_FRONT', 'FRONT_BACK', 'FRONT_FRONT'] as const) {
    const v = c.stageWindowsSeconds[k];
    if (!(v >= 1.0 && v <= 3.5)) issues.push(`stageWindow ${k} fuera de rango 1.0-3.5s (${v})`);
  }
  return issues;
}
