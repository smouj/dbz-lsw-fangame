// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — CANON DE ANIMACIÓN: BattleEvent → poses canónicas.
// ═══════════════════════════════════════════════════════════════════════
// Une el Engine M4 (hechos: ACTION_STARTED, DAMAGE_APPLIED, GUARD_STARTED…)
// con los SHEETS PERFECTOS por personaje (runtime pose contract: idle, move,
// guard, attack_fwd/ud, beam_charge/fire, hurt, knockback_*, evade,
// gather_power, power_up + aura power/support).
//
// Regla: la presentación NO decide animaciones por intuición. Un hecho
// (ACTION_STARTED { kind: 'beam', visual: 'ray' }) resuelve AQUÍ su canon:
// secuencia de poses del actor, del defensor y aura. Después el manifest
// del personaje (public/assets/sprites/<form>/manifest.json) resuelve los
// frames reales con los fallbacks de spriteConfig.resolveCombatPose.
//
//   BattleEvent (M4)
//        │  canonForAction / canonForEvent
//        ▼
//   ActionAnimationCanon (poses canónicas)
//        │  manifest + POSE_FALLBACKS
//        ▼
//   frames reales del sheet perfecto
//
// Los timings (frames GBC relativos) son los del perfil firma de la carta
// (actionProfiles); este canon define la FAMILIA por kind/visual para las
// cartas sin perfil firma y para las acciones básicas del juego.
// ═══════════════════════════════════════════════════════════════════════

import type {
  ActionKind,
  ActionVisualKind,
  BattleActionDescriptor,
  BattleEvent,
} from './engine/events/BattleEvent';

/** Poses del runtime pose contract (nombres de familia en los manifests). */
export type CanonPose =
  | 'idle'
  | 'move_front'
  | 'move_back'
  | 'guard'
  | 'attack_fwd'
  | 'attack_ud'
  | 'beam_charge'
  | 'beam_fire'
  | 'hurt'
  | 'knockback_back'
  | 'knockback_up'
  | 'knockback_down'
  | 'evade'
  | 'gather_power'
  | 'power_up'
  | 'aura_power'
  | 'aura_support';

export interface CanonPoseBeat {
  /** Frame GBC relativo al inicio de la acción. */
  frame: number;
  pose: CanonPose;
}

export interface ActionAnimationCanon {
  kind: ActionKind;
  visual: ActionVisualKind;
  /** Secuencia canónica de poses del actor (quien ejecuta la acción). */
  actor: CanonPoseBeat[];
  /** Secuencia canónica del defensor (objetivo / reacción). */
  target: CanonPoseBeat[];
  /** Aura durante la acción: 'power' = dorada (ki), 'support' = azul (objeto). */
  aura: 'power' | 'support' | 'none';
  /** Frames GBC del impacto (contacto) dentro de la secuencia. */
  contactFrame: number;
  /** Frames GBC totales de la secuencia (vuelta al plano táctico). */
  totalFrames: number;
}

// ═══ Canon por familia (kind × visual) ══════════════════════════════════

const MELEE: ActionAnimationCanon = {
  kind: 'damage', visual: 'rush',
  actor: [
    { frame: 0, pose: 'idle' },
    { frame: 12, pose: 'attack_fwd' },      // windup del golpe
    { frame: 38, pose: 'attack_fwd' },      // strike pose (punch/kick según perfil)
    { frame: 52, pose: 'move_front' },      // APPROACH: avanza al plano del rival
    { frame: 66, pose: 'attack_fwd' },      // prepara el golpe enfrente del rival
    { frame: 94, pose: 'attack_fwd' },      // contacto
    { frame: 106, pose: 'idle' },           // recover
  ],
  target: [{ frame: 94, pose: 'knockback_back' }],
  aura: 'none',
  contactFrame: 94,
  totalFrames: 132,
};

const STAGE: ActionAnimationCanon = {
  kind: 'command', visual: 'rush',
  actor: [
    { frame: 0, pose: 'idle' },
    { frame: 12, pose: 'attack_fwd' },      // windup del combo
    { frame: 26, pose: 'idle' },
    { frame: 38, pose: 'attack_fwd' },      // golpe final del stage
    { frame: 52, pose: 'move_front' },      // APPROACH: avanza al plano del rival
    { frame: 66, pose: 'idle' },            // se para enfrente (stop + idle)
    { frame: 94, pose: 'attack_fwd' },
    { frame: 106, pose: 'idle' },
  ],
  target: [{ frame: 94, pose: 'knockback_back' }],
  aura: 'none',
  contactFrame: 94,
  totalFrames: 132,
};

const BEAM: ActionAnimationCanon = {
  kind: 'beam', visual: 'ray',
  actor: [
    { frame: 0, pose: 'idle' },
    { frame: 12, pose: 'gather_power' },    // preparación: energía (aura)
    { frame: 28, pose: 'beam_charge' },     // carga específica
    { frame: 54, pose: 'beam_fire' },       // emisión (release)
  ],
  target: [{ frame: 108, pose: 'hurt' }],
  aura: 'power',
  contactFrame: 108,
  totalFrames: 152,
};

const SUPPORT_POWER: ActionAnimationCanon = {
  kind: 'support', visual: 'power',
  actor: [{ frame: 0, pose: 'power_up' }],
  target: [],
  aura: 'power',
  contactFrame: -1,
  totalFrames: 118,
};

const SUPPORT_ITEM: ActionAnimationCanon = {
  kind: 'support', visual: 'item',
  actor: [{ frame: 0, pose: 'power_up' }],
  target: [],
  aura: 'support',
  contactFrame: -1,
  totalFrames: 118,
};

const GATHER: ActionAnimationCanon = {
  kind: 'gather', visual: 'power',
  actor: [
    { frame: 0, pose: 'gather_power' },
    { frame: 30, pose: 'power_up' },        // loop de carga con aura
  ],
  target: [],
  aura: 'power',
  contactFrame: -1,
  totalFrames: 90,
};

const GUARD_CANON: ActionAnimationCanon = {
  kind: 'guard', visual: 'power',
  actor: [{ frame: 0, pose: 'guard' }],
  target: [],
  aura: 'none',
  contactFrame: -1,
  totalFrames: 30,
};

const MOVE_CANON: ActionAnimationCanon = {
  kind: 'move', visual: 'rush',
  actor: [
    { frame: 0, pose: 'move_front' },       // move_back si retrocede
    { frame: 12, pose: 'idle' },
  ],
  target: [],
  aura: 'none',
  contactFrame: -1,
  totalFrames: 24,
};

// ═══ Resolución canónica ════════════════════════════════════════════════

/** Cánones por familia; el visual afina (knockback según tipo de golpe). */
const CANON_BY_KIND: Record<ActionKind, ActionAnimationCanon> = {
  command: STAGE,
  damage: MELEE,
  beam: BEAM,
  support: SUPPORT_POWER,
  gather: GATHER,
  guard: GUARD_CANON,
  move: MOVE_CANON,
};

/** Variantes por visual dentro de la familia. */
const CANON_VARIANTS: Partial<Record<ActionVisualKind, Partial<ActionAnimationCanon>>> = {
  item: SUPPORT_ITEM,
  ball: { ...BEAM, visual: 'ball', contactFrame: 108, totalFrames: 152 },
  wave: { ...BEAM, visual: 'wave', contactFrame: 108, totalFrames: 152 },
  disk: { ...BEAM, visual: 'disk', contactFrame: 108, totalFrames: 152 },
  sword: { ...BEAM, visual: 'sword', contactFrame: 108, totalFrames: 152 },
  special: { ...BEAM, visual: 'special', contactFrame: 108, totalFrames: 152 },
  // golpes que lanzan hacia arriba / estampan abajo → knockback específico
  rush: { target: [{ frame: 94, pose: 'knockback_back' }] },
};

/** Canon para un descriptor de acción (ACTION_STARTED/ACTION_RESOLVED). */
export function canonForAction(descriptor: BattleActionDescriptor): ActionAnimationCanon {
  const base = CANON_BY_KIND[descriptor.kind] ?? MELEE;
  const variant = CANON_VARIANTS[descriptor.visual];
  if (!variant) return base;
  return { ...base, ...variant, kind: descriptor.kind, visual: descriptor.visual };
}

/**
 * Canon para un HECHO del Engine (M4). Devuelve null si el hecho no
 * dispara animación canónica (COMMAND_ACCEPTED, CC_SPENT… son datos, no
 * animación).
 */
export function canonForEvent(event: BattleEvent): ActionAnimationCanon | null {
  switch (event.type) {
    case 'ACTION_STARTED':
    case 'ACTION_RESOLVED':
      return canonForAction(event.action);
    case 'GATHER_STARTED':
      return GATHER;
    case 'GUARD_STARTED':
      return GUARD_CANON;
    case 'POSITION_CHANGED':
      return MOVE_CANON;
    case 'DAMAGE_APPLIED': {
      // Reacción del objetivo: melee/beam → hurt/knockback; contraataque → hurt
      const cause = event.cause.type;
      const targetPose: CanonPose = cause === 'COUNTER' ? 'hurt' : 'knockback_back';
      return { ...MELEE, actor: [], target: [{ frame: 0, pose: targetPose }], aura: 'none', contactFrame: 0, totalFrames: 30 };
    }
    case 'QTE_STARTED':
      // El QTE es UI/entrada: el actor mantiene la pose táctica (idle).
      return { ...GUARD_CANON, kind: 'command', actor: [{ frame: 0, pose: 'idle' }] };
    default:
      return null;
  }
}

/** Aura canónica para un descriptor (power dorada / support azul). */
export function auraForAction(descriptor: BattleActionDescriptor): 'power' | 'support' | 'none' {
  if (descriptor.kind === 'beam' || descriptor.kind === 'gather' || descriptor.kind === 'support') {
    return descriptor.visual === 'item' ? 'support' : 'power';
  }
  return 'none';
}

// ═══ Tabla legible para auditoría / Dev Studio ═══════════════════════════

export function listAnimationCanon(): Array<{ id: string; kind: ActionKind; visual: ActionVisualKind; actor: string; target: string; aura: string; contact: number; total: number }> {
  const seen = new Set<string>();
  const out: Array<{ id: string; kind: ActionKind; visual: ActionVisualKind; actor: string; target: string; aura: string; contact: number; total: number }> = [];
  for (const kind of Object.keys(CANON_BY_KIND) as ActionKind[]) {
    for (const visual of ['rush', 'ray', 'wave', 'ball', 'disk', 'sword', 'special', 'power', 'item'] as ActionVisualKind[]) {
      const canon = canonForAction({ id: `${kind}_${visual}`, label: '', kind, visual, fidelity: 'INFERRED' });
      const key = `${kind}_${canon.visual}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: key,
        kind,
        visual: canon.visual,
        actor: canon.actor.map(b => `${b.frame}:${b.pose}`).join(' → '),
        target: canon.target.map(b => `${b.frame}:${b.pose}`).join(' → ') || '—',
        aura: canon.aura,
        contact: canon.contactFrame,
        total: canon.totalFrames,
      });
    }
  }
  return out;
}
