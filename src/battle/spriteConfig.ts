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
  // Escanea TODOS los frames disponibles de una familia (hasta 16) — el
  // manifest usa exactamente los archivos que existen (frieza beam_charge
  // tiene 6, piccolo hurt 7...). Cohesión garantizada con los manifests.
  const allOf = (name: string): string[] => {
    const out: string[] = [];
    for (let i = 0; i < 16; i++) {
      const file = f(name, i);
      if (file) out.push(file);
      else if (i > 8) break; // hueco tras el inicio = fin de familia
    }
    return out;
  };

  switch (pose) {
    // Convención V6.1: move tiene pose inicial PROPIA (move_00) + paso (01).
    // La V6.1 NO reutiliza idle_00 (cada forma tiene move_front_00/move_back_00).
    case 'move_front': {
      const step0 = f('move_front', 0);
      const step1 = f('move_front', 1);
      return [step0, step1].filter(Boolean) as string[];
    }
    case 'move_back': {
      const step0 = f('move_back', 0);
      const step1 = f('move_back', 1);
      return [step0, step1].filter(Boolean) as string[];
    }
    // Contrato V1 (manifests): las poses compuestas empiezan con idle_00 como
    // windup y luego la variante del golpe. punch_right usa los 3 primeros
    // attack_fwd; punch_left la segunda mitad. DEBE coincidir con los
    // manifests regenerados (e7b393d) o el Dev Studio muestra otra cosa.
    case 'punch_right': {
      const idle = f('idle', 0);
      const hits = seq('attack_fwd', 0, 2).length ? seq('attack_fwd', 0, 2) : allOf('attack_fwd');
      return [idle, ...hits].filter(Boolean) as string[];
    }
    case 'punch_left': {
      const idle = f('idle', 0);
      // Contrato V1: punch_left = segunda mitad fija (3..6). punch_right usa
      // 0..2; el manifest de punch_left referencia exactamente idle + 3..6.
      const hits = seq('attack_fwd', 3, 6).length ? seq('attack_fwd', 3, 6) : allOf('attack_fwd');
      return [idle, ...hits].filter(Boolean) as string[];
    }
    case 'kick_right': {
      const idle = f('idle', 0);
      const hits = allOf('attack_ud').length ? allOf('attack_ud') : allOf('attack_fwd');
      return [idle, ...hits].filter(Boolean) as string[];
    }
    // Knockback: variantes que usan SOLO los frames de hurt que el manifest
    // referencia (back=todos, up=0,1,2,5, down=2,3,4,5). No inventar frames
    // que el runtime no usa.
    case 'knockback_back':
      return allOf('hurt');
    case 'knockback_up': {
      const out: string[] = [];
      for (const i of [0, 1, 2, 5]) { const file = f('hurt', i); if (file) out.push(file); }
      return out;
    }
    case 'knockback_down': {
      const out: string[] = [];
      for (const i of [2, 3, 4, 5]) { const file = f('hurt', i); if (file) out.push(file); }
      return out;
    }
    case 'beam_guard':
      return allOf('guard');
    // Evade (convención V6.1): move_back_00 → guard → move_back_00
    // (parpadeo defensivo). guard_00 = frame canónico (el V9 no duplica guard_01
    // como PNG propio; guard tiene 1-3 frames físicos).
    case 'evade': {
      const base = f('move_back', 0) ?? f('idle', 0);
      const guard = f('guard', 0) ?? f('guard', 1) ?? f('idle', 0);
      if (base && guard) return [base, guard, base];
      const back = allOf('move_back');
      return back.length ? back : [f('idle', 0)].filter(Boolean) as string[];
    }
    case 'gather_power':
      // La pose gather_power del manifest = personaje con aura (verificado
// (canon semántico por frame: src/data/generated/spriteCanon.generated.ts — family power/gather_power)
      // 2026-08-17: idéntica a power_up en todas las formas) — es la
      // preparación común de energía del GBC, NO la carga del rayo.
      // Fallback: beam_charge -> guard.
      return allOf('gather_power').length ? allOf('gather_power')
        : allOf('beam_charge').length ? allOf('beam_charge') : allOf('guard');
    case 'power_up':
      // power_up del manifest = personaje + aura (re-mapeado canónico V9,
      // ronda 2026-08-17). NO es beam_charge (era el fallback de la V6.1).
      return allOf('power_up').length ? allOf('power_up')
        : allOf('gather_power').length ? allOf('gather_power')
        : allOf('beam_charge').length ? allOf('beam_charge') : allOf('idle');
    default:
      return allOf(pose);
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
