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
    pose: 'move_front', category: 'Acción', meaning: 'Avanzar hacia el rival (ciclo de andar)',
    usedBy: ['MOVE táctico (avance)', 'Rush previo al ataque melee'],
    frames: '2',
  },
  move_back: {
    pose: 'move_back', category: 'Acción', meaning: 'Retroceder (el juego ESPEJA move_front en runtime)',
    usedBy: ['MOVE táctico (retirada)'],
    frames: '2',
    notes: 'Frames idénticos a move_front por diseño — el espejo lo hace el render.',
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
  hurt: {
    pose: 'hurt', category: 'Estado', meaning: 'Recibiendo daño (knockback)',
    usedBy: ['Impacto de daño', 'Hit de beam', 'Golpe recibido'],
    frames: '6',
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
    pose: 'beam_ray', category: 'FX', meaning: 'RAYO real: haz horizontal de energía que se extiende desde el personaje al rival',
    usedBy: ['Proyectil de beam (modo stretch GBC)', 'Kamehameha/Masenko/Final Flash/etc.'],
    frames: '1-3',
    notes: 'Extraído del V6 canónico (2026-08-15). El render lo estira con progress.',
  },
  beam_ray_tip: {
    pose: 'beam_ray_tip', category: 'FX', meaning: 'Cabeza/punta del rayo (energía azul, frente del haz)',
    usedBy: ['Proyectil de beam (cabeza)', 'Impacto del rayo'],
    frames: '1-2',
    notes: 'Opcional — 44/48 formas lo tienen (goten/nappa/recoome usan solo el rayo).',
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
