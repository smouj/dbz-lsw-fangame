// ═══════════════════════════════════════════════════════════

import { COMBAT_POSE_ORDER } from '../battle/spriteConfig';
// DBZ LSW — Semántica de frames de combate (para el panel Sheets)
// Asigna a cada pose del manifest su significado canónico (SPRITE_TAXONOMY):
// categoría (Acción/Estado/Frame/FX), significado, y qué acciones del juego
// la consumen. Es metadata de DEV STUDIO — el runtime NO depende de esto.
// ═══════════════════════════════════════════════════════════

export interface PoseSemantics {
  pose: string;
  category: 'Estado' | 'Acción' | 'Frame' | 'FX';
  meaning: string;
  usedBy: string[];       // acciones/contextos del juego que la usan
  frames: string;         // nº de frames típico
  notes?: string;
}

export const POSE_SEMANTICS: Record<string, PoseSemantics> = {
  idle: {
    pose: 'idle', category: 'Estado', meaning: 'Pose neutral de pie (también durante QTE/espera)',
    usedBy: ['Idle', 'Follow-through (recovery de golpe)', 'FIELD (overworld)', 'Espera de turno'],
    frames: '1',
  },
  move_front: {
    pose: 'move_front', category: 'Acción', meaning: 'Avanzar hacia el rival: idle_00 -> step frontal',
    usedBy: ['MOVE táctico (avance)', 'Rush previo al ataque melee'],
    frames: '2',
  },
  move_back: {
    pose: 'move_back', category: 'Acción', meaning: 'Retroceder: idle_00 -> step trasero',
    usedBy: ['MOVE táctico (retirada)'],
    frames: '2',
    notes: 'El primer frame debe ser idle. El segundo frame es el paso fisico de move_back cuando existe.',
  },
  guard: {
    pose: 'guard', category: 'Acción', meaning: 'Bloqueando/parando (defensa básica)',
    usedBy: ['Guardia', 'Contraataque (windup)', 'Fallback de beam_charge'],
    frames: '3',
  },
  attack_fwd: {
    pose: 'attack_fwd', category: 'Acción', meaning: 'Golpe frontal (puñetazo/patada hacia delante)',
    usedBy: ['Melee fwd (punch/kick)', 'Stage Attack', 'Windup + contacto + recovery'],
    frames: '8',
  },
  attack_ud: {
    pose: 'attack_ud', category: 'Acción', meaning: 'Golpe vertical (arriba/abajo, según posición)',
    usedBy: ['Melee vertical (vs AIR/GROUND)', 'Dunk Shot', 'Sonic Kick'],
    frames: '4',
  },
  punch_right: {
    pose: 'punch_right', category: 'Acción', meaning: 'Secuencia semántica de puñetazo derecho',
    usedBy: ['Cont.Punch', 'primer golpe de melee', 'Stage Attack frontal'],
    frames: 'idle + attack_fwd iniciales',
    notes: 'Alias semántico: solo puede usar idle/attack_fwd, nunca beam, guard ni hurt.',
  },
  punch_left: {
    pose: 'punch_left', category: 'Acción', meaning: 'Secuencia semántica de puñetazo izquierdo / follow-up',
    usedBy: ['Crazy Rush', 'Dunk Shot fallback', 'combos físicos'],
    frames: 'idle + attack_fwd tardios',
    notes: 'Alias semántico: solo puede usar idle/attack_fwd, nunca beam, guard ni hurt.',
  },
  kick_right: {
    pose: 'kick_right', category: 'Acción', meaning: 'Secuencia semántica de patada derecha',
    usedBy: ['Cont.Kick', 'Rising Kick', 'Sonic Kick'],
    frames: 'idle + attack_ud',
    notes: 'No existe patada izquierda separada en el set actual; se conserva como kick_right.',
  },
  hurt: {
    pose: 'hurt', category: 'Estado', meaning: 'Recibiendo daño (knockback)',
    usedBy: ['Impacto de daño', 'Hit de beam', 'Golpe recibido'],
    frames: '6',
  },
  knockback_back: {
    pose: 'knockback_back', category: 'Estado', meaning: 'Reacción de impacto con desplazamiento hacia atras',
    usedBy: ['Impacto melee frontal', 'beam hit fallback'],
    frames: 'hurt',
    notes: 'Alias semántico: solo puede usar frames hurt.',
  },
  knockback_up: {
    pose: 'knockback_up', category: 'Estado', meaning: 'Reacción de impacto lanzado hacia arriba',
    usedBy: ['Rising Kick', 'golpes verticales ascendentes'],
    frames: 'hurt',
    notes: 'Alias semántico: solo puede usar frames hurt.',
  },
  knockback_down: {
    pose: 'knockback_down', category: 'Estado', meaning: 'Reacción de impacto derribado hacia abajo',
    usedBy: ['Dunk Shot', 'golpes verticales descendentes'],
    frames: 'hurt',
    notes: 'Alias semántico: solo puede usar frames hurt.',
  },
  beam_guard: {
    pose: 'beam_guard', category: 'Acción', meaning: 'Parar un beam / juntar manos en defensa',
    usedBy: ['Guard contra beam', 'Absorb Energy fallback'],
    frames: 'guard',
    notes: 'No usa beam_ray ni beam_fire: es una pose corporal defensiva.',
  },
  evade: {
    pose: 'evade', category: 'Acción', meaning: 'Esquiva / afterimage',
    usedBy: ['Avoiding', 'Teleport', 'Barrier/Breath fallback visual'],
    frames: 'idle/guard/move_back',
    notes: 'Hasta separar las rayitas de afterimage, no se etiqueta ningun FX no demostrado.',
  },
  beam_charge: {
    pose: 'beam_charge', category: 'Acción', meaning: 'Cargando ki (manos juntas, preparación del beam)',
    usedBy: ['Beam (fase charge)', 'Gather Power (fallback)', 'Kamehameha/Masenko/etc.'],
    frames: '4',
  },
  beam_fire: {
    pose: 'beam_fire', category: 'Acción', meaning: 'Disparando el beam (brazos extendidos, release)',
    usedBy: ['Beam (fase release)', 'Proyectil en viaje'],
    frames: '5',
  },
  beam_ray: {
    pose: 'beam_ray', category: 'FX', meaning: 'Recorte compuesto observado: personaje + haz horizontal',
    usedBy: ['Referencia visual de sheet', 'No se usa como proyectil runtime independiente'],
    frames: '1-3',
    notes: 'Prohibido montarlo como proyectil separado: duplica el personaje. El runtime dibuja el travel como entidad FX sin estirar PNGs.',
  },
  beam_ray_tip: {
    pose: 'beam_ray_tip', category: 'FX', meaning: 'Recorte observado de punta/impacto del haz',
    usedBy: ['Referencia visual de sheet', 'Impacto/fx cuando se separe como asset puro'],
    frames: '1-2',
    notes: 'No sustituye al actor ni debe contener un segundo cuerpo de personaje.',
  },
  gather_power: {
    pose: 'gather_power', category: 'Acción', meaning: 'Gather Power (brazos arriba, cuerpo tenso)',
    usedBy: ['Gather Power (táctico)', 'Overworld battle: pose de canalización'],
    frames: '1',
  },
  power_up: {
    pose: 'power_up', category: 'Acción', meaning: 'Transformación/aura de poder',
    usedBy: ['Transformación', 'Support buffs', 'Kaio Ken'],
    frames: '1+',
  },
};

/** Orden canónico de poses para mostrar en el grid. */
export const POSE_ORDER = [
  ...COMBAT_POSE_ORDER,
];

/** Semántica de una pose (con fallback genérico). */
export function poseSemantics(pose: string): PoseSemantics {
  return POSE_SEMANTICS[pose] ?? {
    pose,
    category: 'Frame',
    meaning: 'Pose adicional del manifest',
    usedBy: ['(sin mapeo semántico)'],
    frames: '?',
  };
}

/** Separa el nombre de archivo en pose + índice (frente_trunks_ssj_attack_fwd_03 → attack_fwd, 3). */
export function parseFrameName(file: string, dir: string): { pose: string; index: number | null } {
  const base = file.replace(/\.png$/i, '').replace(`${dir}_`, '');
  const m = base.match(/^(.*?)_(\d+)$/);
  if (m) return { pose: m[1], index: Number(m[2]) };
  return { pose: base, index: null };
}
