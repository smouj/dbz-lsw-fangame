// Shared combat sprite configuration.
// Runtime and Dev Studio both import this file so pose names, fallbacks and
// labels cannot drift apart.

export const COMBAT_REQUIRED_POSES = [
  'idle',
  'move_front',
  'move_back',
  'guard',
  'attack_fwd',
  'attack_ud',
  'hurt',
  'beam_charge',
  'beam_fire',
] as const;

export const COMBAT_OPTIONAL_POSES = [
  'beam_ray',
  'beam_ray_tip',
  'gather_power',
  'power_up',
  'punch_right',
  'punch_left',
  'kick_right',
  'knockback_back',
  'knockback_up',
  'knockback_down',
  'beam_guard',
  'evade',
] as const;

export const COMBAT_POSE_ORDER = [
  ...COMBAT_REQUIRED_POSES,
  ...COMBAT_OPTIONAL_POSES,
] as const;

export type BattleSpritePose = typeof COMBAT_POSE_ORDER[number];

export const POSE_FALLBACKS: Record<string, string[]> = {
  idle: ['idle'],
  move_front: ['move_front', 'move_back', 'attack_fwd', 'idle'],
  move_back: ['move_back', 'move_front', 'attack_fwd', 'idle'],
  guard: ['guard', 'idle'],
  attack_fwd: ['attack_fwd', 'move_front', 'idle'],
  attack_ud: ['attack_ud', 'attack_fwd', 'idle'],
  punch_right: ['punch_right', 'attack_fwd', 'idle'],
  punch_left: ['punch_left', 'attack_fwd', 'idle'],
  kick_right: ['kick_right', 'attack_ud', 'attack_fwd', 'idle'],
  hurt: ['hurt', 'knockback_back', 'guard', 'idle'],
  knockback_back: ['knockback_back', 'hurt', 'idle'],
  knockback_up: ['knockback_up', 'hurt', 'idle'],
  knockback_down: ['knockback_down', 'hurt', 'idle'],
  beam_guard: ['beam_guard', 'guard', 'beam_charge', 'idle'],
  evade: ['evade', 'move_back', 'guard', 'idle'],
  beam_charge: ['beam_charge', 'gather_power', 'guard', 'idle'],
  beam_fire: ['beam_fire', 'beam_charge', 'attack_fwd', 'idle'],
  gather_power: ['gather_power', 'beam_charge', 'guard', 'idle'],
  power_up: ['power_up', 'gather_power', 'beam_charge', 'guard', 'idle'],
  beam_ray: ['beam_ray'],
  beam_ray_tip: ['beam_ray_tip'],
};

export function resolveCombatPose(pose: string, hasPose: (pose: string) => boolean): string | null {
  const fallbacks = POSE_FALLBACKS[pose] ?? [pose, 'idle'];
  return fallbacks.find(hasPose) ?? null;
}

/**
 * Composicion de secuencia por pose (contrato FRAMES_ACTIONS_SPEC V1).
 * Devuelve la lista de ARCHIVOS a reproducir para una pose dada, reutilizando
 * frames fisicos reales (idle, step, attack, hurt, guard) sin inventar PNGs.
 *
 * - move_front/move_back: [idle_00, step_01] (2 frames, el primero = idle).
 * - punch_right/punch_left: variantes de attack_fwd (no existe PNG propio).
 * - kick_right: variantes de attack_ud.
 * - knockback_*: hurt.
 * - beam_guard: guard.
 * - evade: move_back/guard/idle.
 * - beam_ray/beam_ray_tip: solo referencia de sheet, NUNCA proyectil runtime.
 */
export function resolvePoseFrameSequence(
  pose: string,
  dir: string,
  available: (file: string) => boolean,
): string[] {
  const f = (name: string, index: number) => {
    const file = `${dir}_${name}_${String(index).padStart(2, '0')}.png`;
    return available(file) ? file : null;
  };
  const seq = (name: string, start: number, end: number) => {
    const out: string[] = [];
    for (let i = start; i <= end; i++) {
      const file = f(name, i);
      if (file) out.push(file);
    }
    return out;
  };

  switch (pose) {
    case 'move_front': {
      const idle = f('idle', 0);
      const step = f('move_front', 1) ?? f('move_front', 0);
      return [idle, step].filter(Boolean) as string[];
    }
    case 'move_back': {
      const idle = f('idle', 0);
      const step = f('move_back', 1) ?? f('move_back', 0);
      return [idle, step].filter(Boolean) as string[];
    }
    case 'punch_right':
      return seq('attack_fwd', 0, 2).length
        ? seq('attack_fwd', 0, 2)
        : seq('attack_fwd', 0, 6);
    case 'punch_left':
      return seq('attack_fwd', 3, 6).length
        ? seq('attack_fwd', 3, 6)
        : seq('attack_fwd', 0, 6);
    case 'kick_right':
      return seq('attack_ud', 0, 3).length
        ? seq('attack_ud', 0, 3)
        : seq('attack_fwd', 0, 6);
    case 'knockback_back':
    case 'knockback_up':
    case 'knockback_down':
      return seq('hurt', 0, 5);
    case 'beam_guard':
      return seq('guard', 0, 2);
    case 'evade': {
      const back = seq('move_back', 0, 1);
      const guard = seq('guard', 0, 2);
      const idle = seq('idle', 0, 0);
      return back.length ? back : guard.length ? guard : idle;
    }
    case 'gather_power':
      return seq('beam_charge', 0, 3).length ? seq('beam_charge', 0, 3) : seq('guard', 0, 2);
    case 'power_up':
      return seq('gather_power', 0, 0).length ? seq('gather_power', 0, 0) : seq('beam_charge', 0, 3);
    default:
      return seq(pose, 0, 12);
  }
}

export const COMBAT_POSE_META: Record<string, { label: string; group: string; gameplay: string }> = {
  idle: { label: 'Idle', group: 'base', gameplay: 'pose tactica / espera' },
  move_front: { label: 'Move front', group: 'movement', gameplay: 'desplazamiento frontal' },
  move_back: { label: 'Move back', group: 'movement', gameplay: 'desplazamiento trasero' },
  guard: { label: 'Guard', group: 'defense', gameplay: 'bloqueo / parada de impacto' },
  attack_fwd: { label: 'Melee forward', group: 'stage/melee', gameplay: 'stage attack frontal / puno continuo' },
  attack_ud: { label: 'Melee vertical', group: 'stage/melee', gameplay: 'stage attack vertical / patada continua' },
  punch_right: { label: 'Punch right', group: 'melee/detail', gameplay: 'punetazo con derecha' },
  punch_left: { label: 'Punch left', group: 'melee/detail', gameplay: 'punetazo con izquierda / follow-up' },
  kick_right: { label: 'Kick right', group: 'melee/detail', gameplay: 'patada derecha' },
  hurt: { label: 'Hurt', group: 'reaction', gameplay: 'impacto / dano recibido' },
  knockback_back: { label: 'Knockback back', group: 'reaction', gameplay: 'golpe que desplaza hacia atras' },
  knockback_up: { label: 'Knockback up', group: 'reaction', gameplay: 'golpe que lanza hacia arriba' },
  knockback_down: { label: 'Knockback down', group: 'reaction', gameplay: 'golpe que estampa hacia abajo' },
  beam_guard: { label: 'Beam guard', group: 'defense', gameplay: 'parar beam / juntar manos' },
  evade: { label: 'Evade', group: 'defense', gameplay: 'esquiva / afterimage' },
  beam_charge: { label: 'Beam charge', group: 'beam', gameplay: 'carga del beam' },
  beam_fire: { label: 'Beam fire', group: 'beam', gameplay: 'disparo del beam' },
  beam_ray: { label: 'Beam ray ref', group: 'beam/fx-reference', gameplay: 'recorte compuesto personaje+haz; no usar como proyectil independiente' },
  beam_ray_tip: { label: 'Beam tip ref', group: 'beam/fx-reference', gameplay: 'referencia de punta/impacto; usar solo si es FX puro' },
  gather_power: { label: 'Action prep', group: 'shared', gameplay: 'preparacion comun antes de ejecutar accion' },
  power_up: { label: 'Power up', group: 'shared', gameplay: 'aura / transformacion' },
};

export function combatPoseMeta(pose: string): { label: string; group: string; gameplay: string } {
  return COMBAT_POSE_META[pose] ?? {
    label: pose.replaceAll('_', ' '),
    group: 'custom',
    gameplay: 'pose personalizada',
  };
}
