// ═══════════════════════════════════════════════════════════
// DBZ LSW — Perfiles de acción DECLARATIVOS (por carta, no por tipo)
// ═══════════════════════════════════════════════════════════
// Reemplaza el modelo "kind → fábrica genérica" por un modelo donde cada
// técnica emblemática declara SU cinematografía (docs/CINEMATIC_GRAMMAR.md
// §23/§34). Un perfil es un objeto declarativo (spec) que un compilador
// traduce a los mismos `CinematicTrack[]` que consume el BattleTimeline.
//
//   spec (autoría) ──compile──▶ CinematicProfile ──▶ BattleTimeline
//
// Niveles de fidelidad (docs/ACTION_FIDELITY.md):
//   PLACEHOLDER  — provisional sin datos del original
//   INFERRED     — deducido de manuales/guías/comunidad (no frame-exacto)
//   VERIFIED     — confirmado por captura (tolerancia amplia)
//   FRAME_VERIFIED — medido frame a frame contra el original
//
// Los timings iniciales de los perfiles "firma" son INHERED del template de
// kind (NO canon). La pasada forense sobre la ROM los sustituirá por valores
// FRAME_VERIFIED sin cambiar la arquitectura: solo se edita el spec.

import {
  buildProfile,
  track,
  type CinematicProfile,
  type CinematicProfilePresentation,
  type CinematicTrack,
} from './timeline';

export type Fidelity = 'PLACEHOLDER' | 'INFERRED' | 'VERIFIED' | 'FRAME_VERIFIED';

/** Pose en un frame GBC absoluto (desde el inicio de la acción). */
export interface PoseBeat {
  frame: number;
  pose: string;
  note?: string;
}

/** Rush/lunge del atacante: desplazamiento de `duration` ticks desde `startFrame`. */
export interface RushSpec {
  startFrame: number;
  duration: number;
}

/** Proyectil/beam: spawn → viaje → contacto. */
export interface ProjectileSpec {
  kind?: string;
  spawnFrame: number;
  /** Frames de viaje (spawn → contacto). */
  travelFrames: number;
}

/**
 * Impacto discreto. Campos forenses (sfxFrame/hpFrame/hitstop) en `null`/
 * omitidos significan UNKNOWN: el compilador usa defaults razonables hasta
 * medirlos frame a frame.
 */
export interface ImpactSpec {
  /** Frame EXACTO de contacto (HIT_FRAME). */
  contactFrame: number;
  /** Frame del SFX de impacto (null = UNKNOWN → contactFrame). */
  sfxFrame?: number | null;
  /** Frame de aplicación del daño (null = UNKNOWN → contact + hitstop + 1). */
  hpFrame?: number | null;
  /** Frames de hitstop (null = UNKNOWN → 2). */
  hitstop?: number | null;
  /** Intensidad de sacudida de cámara 0..1 (default 0.35). */
  shake?: number;
}

export interface MessageBeat {
  frame: number;
  text: string;
}

export interface ActionProfileSpec {
  /** Slug único (ej. 'kamehameha'). */
  id: string;
  /** Etiqueta legible. */
  label: string;
  /** Categoría (beam/damage/command/support/gather/guard/move). */
  kind: string;
  fidelity: Fidelity;
  /** Slugs normalizados de card.name que mapean a este perfil. */
  match: string[];
  entry: {
    source: 'TACTICAL';
    destination: CinematicProfilePresentation;
    /** transición (default 'cut'); PENDIENTE de medir en ROM. */
    transition?: 'cut' | 'flash' | 'wipe' | 'fade';
  };
  actor?: { pose?: string; beats: PoseBeat[] };
  target?: { beats: PoseBeat[] };
  rush?: RushSpec;
  projectile?: ProjectileSpec;
  impact?: ImpactSpec;
  /** Frame de aplicación de un efecto (buff/heal) sin impacto de golpe. */
  applyFrame?: number;
  messages?: MessageBeat[];
  /** Frame GBC de vuelta al plano táctico (FIELD_RETURN). */
  returnToField: number;
}

// ── Timings iniciales (INHERED del template de kind — NO canon) ────────────
// Re-medir por acción en la pasada forense (FRAME_VERIFIED).
const T = {
  beam: { charge: 54, spawn: 48, contact: 108, hitstop: 3, return: 152, shake: 0.45 },
  melee: { windup: 38, rush: 50, rushDur: 44, contact: 94, hitstop: 3, recovery: 106, return: 132, shake: 0.35 },
  support: { total: 118 },
};

// ── Compilador: spec → CinematicProfile ────────────────────────────────────

export function compileActionProfile(spec: ActionProfileSpec): CinematicProfile {
  const tracks: CinematicTrack[] = [];
  const dest = spec.entry.destination;

  // 1) Plano de entrada
  tracks.push(track(0, 'SHOT', { shot: dest }));

  // 2) Poses del atacante
  if (spec.actor?.pose) tracks.push(track(0, 'ACTOR_POSE', { pose: spec.actor.pose }));
  for (const b of spec.actor?.beats ?? []) tracks.push(track(b.frame, 'ACTOR_POSE', { pose: b.pose }));

  // 3) Poses del defensor (pre-contacto: guard, idle…; el hurt se emite en el impacto)
  for (const b of spec.target?.beats ?? []) tracks.push(track(b.frame, 'TARGET_POSE', { pose: b.pose }));

  // 4) Rush/lunge
  if (spec.rush) {
    tracks.push(track(spec.rush.startFrame, 'PROJECTILE', { action: 'rush', progress: 0, duration: spec.rush.duration }));
  }

  // 5) Proyectil/beam
  if (spec.projectile) {
    const p = spec.projectile;
    tracks.push(track(p.spawnFrame, 'PROJECTILE', { action: 'spawn', kind: p.kind ?? 'beam' }));
    tracks.push(track(p.spawnFrame + Math.floor(p.travelFrames / 2), 'PROJECTILE', { action: 'travel', progress: 0.5 }));
  }

  // 6) Impacto discreto
  if (spec.impact) {
    const c = spec.impact.contactFrame;
    const hitstop = spec.impact.hitstop ?? 2;
    const hp = spec.impact.hpFrame ?? c + hitstop + 1;
    const shake = spec.impact.shake ?? 0.35;
    tracks.push(track(c, 'TARGET_POSE', { pose: 'hurt' }));
    tracks.push(track(c, 'HIT_FRAME', {}));
    tracks.push(track(c + 1, 'CAMERA', { shake }));
    if (spec.projectile) tracks.push(track(c, 'PROJECTILE', { action: 'impact' }));
    tracks.push(track(c + hitstop, 'SHOT', { shot: 'IMPACT' }));
    if (spec.projectile) tracks.push(track(c + hitstop, 'PROJECTILE', { action: 'explode' }));
    tracks.push(track(hp, 'APPLY_DAMAGE', {}));
  }

  // 7) Efecto sin golpe (buff/heal/gather)
  if (spec.applyFrame != null) tracks.push(track(spec.applyFrame, 'APPLY_DAMAGE', {}));

  // 8) Mensajes del panel inferior
  for (const m of spec.messages ?? []) tracks.push(track(m.frame, 'MESSAGE', { text: m.text }));

  // 9) Vuelta al plano táctico
  tracks.push(track(spec.returnToField, 'FIELD_RETURN', {}));

  // Orden estable por tick (los eventos del mismo tick conservan su orden).
  tracks.sort((a, b) => a.tick - b.tick);

  return buildProfile(spec.id, dest, tracks);
}

// ── Normalización de nombres de carta ──────────────────────────────────────

const slugCache = new Map<string, string>();

export function slugifyCardName(name: string): string {
  const cached = slugCache.get(name);
  if (cached) return cached;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  slugCache.set(name, slug);
  return slug;
}

// ── Registro de perfiles firma ─────────────────────────────────────────────

function beamSpec(id: string, label: string, match: string[]): ActionProfileSpec {
  const b = T.beam;
  return {
    id, label, kind: 'beam', fidelity: 'INFERRED', match,
    entry: { source: 'TACTICAL', destination: 'PROJECTILE', transition: 'cut' },
    actor: { pose: 'beam_charge', beats: [{ frame: b.charge, pose: 'beam_fire' }] },
    projectile: { kind: 'beam', spawnFrame: b.spawn, travelFrames: b.contact - b.spawn },
    impact: { contactFrame: b.contact, hitstop: b.hitstop, shake: b.shake },
    messages: [{ frame: b.contact + 2, text: 'IMPACT' }],
    returnToField: b.return,
  };
}

function meleeSpec(id: string, label: string, match: string[]): ActionProfileSpec {
  const m = T.melee;
  return {
    id, label, kind: 'damage', fidelity: 'INFERRED', match,
    entry: { source: 'TACTICAL', destination: 'ACTION_DUEL', transition: 'cut' },
    actor: {
      pose: 'idle',
      beats: [
        { frame: m.windup, pose: 'attack_fwd' },
        { frame: m.contact, pose: 'attack_fwd' },
        { frame: m.recovery, pose: 'idle' },
      ],
    },
    rush: { startFrame: m.rush, duration: m.rushDur },
    impact: { contactFrame: m.contact, hitstop: m.hitstop, shake: m.shake },
    messages: [{ frame: m.contact + 2, text: 'IMPACT' }],
    returnToField: m.return,
  };
}

function buffSpec(id: string, label: string, match: string[]): ActionProfileSpec {
  const total = T.support.total;
  return {
    id, label, kind: 'support', fidelity: 'INFERRED', match,
    entry: { source: 'TACTICAL', destination: 'ACTION_SOLO', transition: 'cut' },
    actor: { pose: 'power_up', beats: [] },
    messages: [{ frame: Math.floor(total / 3), text: 'AURA' }],
    applyFrame: Math.floor(total / 2),
    returnToField: total - 12,
  };
}

export const ACTION_PROFILE_REGISTRY: ActionProfileSpec[] = [
  // — Beams / energía —
  beamSpec('kamehameha', 'Kamehameha', ['kamehameha', 'skamehameha', 'fkamehameha', 'kamekameha']),
  beamSpec('masenko', 'Masenko', ['masenko']),
  beamSpec('special_beam_cannon', 'Special Beam Cannon', ['sbeamcan']),
  beamSpec('spirit_bomb', 'Spirit Bomb', ['spiritbomb']),
  beamSpec('final_flash', 'Final Flash', ['finalflash']),
  // — Melee / golpes físicos —
  meleeSpec('cont_punch', 'Cont. Punch', ['contpunch']),
  meleeSpec('cont_kick', 'Cont. Kick', ['contkick']),
  meleeSpec('rising_kick', 'Rising Kick', ['risingkick']),
  meleeSpec('sonic_kick', 'Sonic Kick', ['sonickick']),
  meleeSpec('dunk_shot', 'Dunk Shot', ['dunkshot']),
  meleeSpec('crazy_rush', 'Crazy Rush', ['crazyrush']),
  // — Buffs emblemáticos —
  buffSpec('kaio_ken', 'Kaio Ken', ['kaioken']),
];

const SLUG_INDEX: Map<string, ActionProfileSpec> = (() => {
  const m = new Map<string, ActionProfileSpec>();
  for (const spec of ACTION_PROFILE_REGISTRY) {
    for (const key of spec.match) m.set(key, spec);
  }
  return m;
})();

/** Resuelve un perfil firma por nombre de carta (slug normalizado). */
export function resolveActionProfile(cardName: string): ActionProfileSpec | null {
  return SLUG_INDEX.get(slugifyCardName(cardName)) ?? null;
}

/** Lista plana de perfiles firma (para auditoría / Dev Studio). */
export function listActionProfiles(): Array<{ id: string; label: string; kind: string; fidelity: Fidelity }> {
  return ACTION_PROFILE_REGISTRY.map(s => ({ id: s.id, label: s.label, kind: s.kind, fidelity: s.fidelity }));
}
