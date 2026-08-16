// ═══════════════════════════════════════════════════════════
// DBZ LSW — Stage Attack: mapeo INPUT → pose/frame del luchador
// ═══════════════════════════════════════════════════════════
// Cada tecla del Stage Attack (A/B/↑/↓/←/→) dispara una pose distinta del
// luchador en el campo, como en el GBC: el QTE no es solo UI, el sprite
// ejecuta el golpe correspondiente a la tecla pulsada.
//
// Convención (docs/FRAMES_ACTIONS_SPEC.md — body families):
//   A        → puñetazo derecho   (attack_fwd / punch_right)
//   B        → puñetazo izquierdo (attack_fwd / punch_left)
//   UP       → golpe ascendente   (attack_ud — NUNCA knockback_up, que es
//             pose de RECIBIR daño, no de atacar)
//   DOWN     → golpe descendente  (attack_ud — idem knockback_down)
//   LEFT     → avance frontal     (move_front → attack_fwd)
//   RIGHT    → retroceso/guardia  (move_back / guard)
//
// El runtime usa `pose` para el FighterSprite grande y `fieldPose` para el
// sprite overworld del campo táctico. Ambos se resuelven con fallbacks.

export type StageKey = 'A' | 'B' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface StageInputAnim {
  /** Pose para el sprite grande (ACTION/FighterSprite). */
  pose: string;
  /** Pose para el overworld del campo (TACTICAL_FIELD). */
  fieldPose: string;
  /** Etiqueta legible (debug/UI). */
  label: string;
  /** Clase CSS extra para el lunge visual (qte-lunge/qte-idle). */
  lunge: boolean;
}

export const STAGE_INPUT_FRAMES: Record<StageKey, StageInputAnim> = {
  A: { pose: 'punch_right', fieldPose: 'attack_fwd', label: 'Puño derecho', lunge: false },
  B: { pose: 'punch_left', fieldPose: 'attack_fwd', label: 'Puño izquierdo', lunge: false },
  UP: { pose: 'attack_ud', fieldPose: 'attack_ud', label: 'Golpe ascendente', lunge: true },
  DOWN: { pose: 'attack_ud', fieldPose: 'attack_ud', label: 'Golpe descendente', lunge: true },
  LEFT: { pose: 'move_front', fieldPose: 'move_front', label: 'Avance', lunge: true },
  RIGHT: { pose: 'guard', fieldPose: 'guard', label: 'Retroceso/guardia', lunge: false },
};

/** Pose del sprite grande para una tecla (con fallback seguro). */
export function stageInputPose(key: StageKey | null | undefined): string {
  return (key && STAGE_INPUT_FRAMES[key].pose) || 'attack_fwd';
}

/** Pose del overworld para una tecla (con fallback seguro). */
export function stageInputFieldPose(key: StageKey | null | undefined): string {
  return (key && STAGE_INPUT_FRAMES[key].fieldPose) || 'attack_fwd';
}

/** ¿La tecla implica lunge (desplazamiento) o es un golpe en sitio? */
export function stageInputLunges(key: StageKey | null | undefined): boolean {
  return key ? STAGE_INPUT_FRAMES[key].lunge : false;
}
