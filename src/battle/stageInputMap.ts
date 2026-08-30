// ═══════════════════════════════════════════════════════════
// DBZ LSW — Stage Attack: mapeo INPUT → pose/frame del luchador
// ═══════════════════════════════════════════════════════════
// BRIDGE: cada tecla del Stage Attack (A/B/↑/↓/→) todavía resuelve a una
// pose semántica para UI/fallback. La ROM real no ejecuta una pose única:
// despacha un microprograma distinto por participante (ver stageSequences.ts
// romStageProgramPairForCommand + ROM_STAGE_VM_CONTRACT).
//
// Convención (docs/FRAMES_ACTIONS_SPEC.md — body families):
//   A        → puñetazo derecho   (attack_fwd / punch_right)
//   B        → puñetazo izquierdo (attack_fwd / punch_left)
//   UP       → golpe ascendente   (attack_ud — NUNCA knockback_up, que es
//             pose de RECIBIR daño, no de atacar)
//   DOWN     → golpe descendente  (attack_ud — idem knockback_down)
//   RIGHT    → retroceso/guardia  (move_back / guard)
//
// LEFT NO existe en el QTE Stage del ROM: la máscara $3D acepta
// RIGHT|UP|DOWN|A|B (P0.4S — Bank00 Call_000_3833). El StageKey no incluye
// LEFT; el input de cruceta "izquierda" no consume ningún comando Stage.
//
// El runtime legacy usa `pose` para el FighterSprite grande y `fieldPose` para
// el sprite overworld del campo táctico. Esto debe ser sustituido por la VM
// Stage ROM: $04 start animation, $05 wait animation, $06 wait ActionObject+4,
// $13 sync event.

export type StageKey = 'A' | 'B' | 'UP' | 'DOWN' | 'RIGHT';

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
