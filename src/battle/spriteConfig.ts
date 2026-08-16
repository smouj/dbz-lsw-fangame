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
  hurt: ['hurt', 'guard', 'idle'],
  beam_charge: ['beam_charge', 'gather_power', 'guard', 'idle'],
  beam_fire: ['beam_fire', 'beam_charge', 'attack_fwd', 'idle'],
  gather_power: ['gather_power', 'beam_charge', 'guard', 'idle'],
  power_up: ['power_up', 'gather_power', 'beam_charge', 'guard', 'idle'],
  beam_ray: ['beam_ray'],
  beam_ray_tip: ['beam_ray_tip', 'beam_ray'],
};

export function resolveCombatPose(pose: string, hasPose: (pose: string) => boolean): string | null {
  const fallbacks = POSE_FALLBACKS[pose] ?? [pose, 'idle'];
  return fallbacks.find(hasPose) ?? null;
}

export const COMBAT_POSE_META: Record<string, { label: string; group: string; gameplay: string }> = {
  idle: { label: 'Idle', group: 'base', gameplay: 'pose tactica / espera' },
  move_front: { label: 'Move front', group: 'movement', gameplay: 'desplazamiento frontal' },
  move_back: { label: 'Move back', group: 'movement', gameplay: 'desplazamiento trasero' },
  guard: { label: 'Guard', group: 'defense', gameplay: 'bloqueo / parada de impacto' },
  attack_fwd: { label: 'Melee forward', group: 'stage/melee', gameplay: 'stage attack frontal / puno continuo' },
  attack_ud: { label: 'Melee vertical', group: 'stage/melee', gameplay: 'stage attack vertical / patada continua' },
  hurt: { label: 'Hurt', group: 'reaction', gameplay: 'impacto / dano recibido' },
  beam_charge: { label: 'Beam charge', group: 'beam', gameplay: 'carga del beam' },
  beam_fire: { label: 'Beam fire', group: 'beam', gameplay: 'disparo del beam' },
  beam_ray: { label: 'Beam ray', group: 'beam/fx', gameplay: 'cuerpo del haz' },
  beam_ray_tip: { label: 'Beam tip', group: 'beam/fx', gameplay: 'punta / impacto del haz' },
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
