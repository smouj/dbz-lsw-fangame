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
  kind?: ProjectileVisualKind;
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
  /** Pose del defensor al recibir (default 'hurt'). Melee usa knockback_*. */
  targetPose?: string;
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

export type ProjectileVisualKind =
  | 'ray'        // haz lineal: Kamehameha, Masenko, Final Flash...
  | 'wave'       // ráfaga ancha / onda de energía
  | 'ball'       // esfera/proyectil compacto
  | 'disk'       // disco/corte de energía
  | 'sword'      // corte/espada energética
  | 'special';   // técnica singular pendiente de medición fina

export interface ActionCardSemantics {
  cardName: string;
  animation: 'stage' | 'melee' | 'beam' | 'support';
  visual: ProjectileVisualKind | 'rush' | 'power' | 'item';
  scope: 'shared' | 'limited' | 'unique';
  canonicalUsers: string[];
}

/**
 * Efectos de soporte que representan OBJETOS/TECNOLOGÍA (aura azul) en vez de
 * poder ki (aura dorada). El runtime usa esto para elegir el color del aura
 * y la pose: `item` → aura azul + pose power_up; `power` → aura dorada.
 */
const ITEM_SUPPORT_EFFECTS = new Set([
  'cc_recovery',      // Caps. Fridge
  'android_kill',     // Stop Device
  'heal_light',       // Life Preser.
  'sunglasses',
  'gamebomb',
  'candy',            // H's Choco.
  'naughty_book',
  'damage_shield',    // Champ.Belt
  'support_dispel',   // Sandglass
  'powerdown_cleanse',// Medical Mac.
  'evasion_up',       // Afterimage
]);

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
    tracks.push(track(spec.rush.startFrame, 'SHOT', { shot: 'ACTION_DUEL' }));
    tracks.push(track(spec.rush.startFrame, 'MOVEMENT_COMMIT', {})); // spec V2 §8: única mutación de posición
    tracks.push(track(spec.rush.startFrame, 'RUSH', { progress: 0, duration: spec.rush.duration }));
  }

  // 5) Proyectil/beam
  if (spec.projectile) {
    const p = spec.projectile;
    const contactFrame = p.spawnFrame + p.travelFrames;
    const payload = {
      kind: p.kind ?? 'beam',
      spawnFrame: p.spawnFrame,
      contactFrame,
      travelFrames: p.travelFrames,
    };
    tracks.push(track(p.spawnFrame, 'SHOT', { shot: 'PROJECTILE' }));
    tracks.push(track(p.spawnFrame, 'PROJECTILE', { action: 'spawn', ...payload }));
    tracks.push(track(p.spawnFrame + Math.floor(p.travelFrames / 2), 'PROJECTILE', { action: 'travel', progress: 0.5, ...payload }));
  }

  // 6) Impacto discreto
  if (spec.impact) {
    const c = spec.impact.contactFrame;
    const hitstop = spec.impact.hitstop ?? 2;
    const hp = spec.impact.hpFrame ?? c + hitstop + 1;
    const shake = spec.impact.shake ?? 0.35;
    // Pose del defensor al recibir: si el spec declara una pose especifica de
    // impacto (knockback_back/up/down para melee), usarla; si no, hurt generico.
    // Antes esto pisaba SIEMPRE con 'hurt', ignorando los knockback_*.
    const impactPose = spec.impact.targetPose ?? 'hurt';
    tracks.push(track(c, 'TARGET_POSE', { pose: impactPose }));
    tracks.push(track(c, 'HIT_FRAME', {}));
    tracks.push(track(c, 'HIT_STOP_START', {})); // spec V2: congela actores/VFX desde el mismo reloj
    tracks.push(track(c + 1, 'CAMERA', { shake }));
    if (spec.projectile) tracks.push(track(c, 'PROJECTILE', { action: 'impact' }));
    tracks.push(track(c + hitstop, 'HIT_STOP_END', {}));
    tracks.push(track(c + hitstop, 'SHOT', { shot: 'IMPACT' }));
    if (spec.projectile) tracks.push(track(c + hitstop, 'PROJECTILE', { action: 'explode' }));
    tracks.push(track(hp, 'APPLY_DAMAGE', {}));
  }

  // 7) Efecto sin golpe (buff/heal/gather)
  if (spec.applyFrame != null) tracks.push(track(spec.applyFrame, 'APPLY_DAMAGE', {}));

  // 8) Mensajes del panel inferior
  for (const m of spec.messages ?? []) tracks.push(track(m.frame, 'MESSAGE', { text: m.text }));

  // 9) Vuelta al plano táctico (cleanup → return_to_field, spec V2 §8)
  if (spec.returnToField > 0) tracks.push(track(spec.returnToField - 1, 'CLEANUP', {}));
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

function beamSpec(id: string, label: string, match: string[], projectile: ProjectileVisualKind = 'ray'): ActionProfileSpec {
  const b = T.beam;
  return {
    id, label, kind: 'beam', fidelity: 'INFERRED', match,
    entry: { source: 'TACTICAL', destination: 'ACTION_SOLO', transition: 'cut' },
    actor: {
      pose: 'idle',
      beats: [
        { frame: 12, pose: 'gather_power', note: 'preparación común: energía (aura)' },
        { frame: 28, pose: 'beam_charge', note: 'carga específica del beam (fluye desde gather)' },
        { frame: b.charge, pose: 'beam_fire' },
      ],
    },
    projectile: { kind: projectile, spawnFrame: b.spawn, travelFrames: b.contact - b.spawn },
    impact: { contactFrame: b.contact, hitstop: b.hitstop, shake: b.shake },
    messages: [{ frame: b.contact + 2, text: 'IMPACT' }],
    returnToField: b.return,
  };
}

function meleeSpec(id: string, label: string, match: string[], strikePose = 'punch_right', targetPose = 'knockback_back'): ActionProfileSpec {
  const m = T.melee;
  return {
    id, label, kind: 'damage', fidelity: 'INFERRED', match,
    entry: { source: 'TACTICAL', destination: 'ACTION_SOLO', transition: 'cut' },
    actor: {
      pose: 'idle',
      beats: [
        // Preparación: el GBC hace una pose de windup antes del rush; para
        // melee es la guardia/neutral, NO gather_power (esa es solo para
        // cargar energía/ki). Un puñetazo no grita con los brazos arriba.
        { frame: 12, pose: 'attack_fwd', note: 'windup de golpe' },
        { frame: m.windup, pose: strikePose },
        { frame: m.contact, pose: strikePose },
        { frame: m.recovery, pose: 'idle' },
      ],
    },
    // Pose del defensor ANTES del contacto (guard/neutral). El impacto (94)
    // ya emite la pose especifica (knockback_*); el beat extra era redundante.
    target: { beats: [] },
    rush: { startFrame: m.rush, duration: m.rushDur },
    impact: { contactFrame: m.contact, hitstop: m.hitstop, shake: m.shake, targetPose },
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

function stageSpec(id: string, label: string, match: string[], stages: number): ActionProfileSpec {
  // Stage Attack: el QTE es la introduccion (GBC); al completarlo la accion
  // se ejecuta como un rush melee con la pose del golpe final.
  const m = T.melee;
  const strikePose = stages >= 5 ? 'punch_left' : 'punch_right';
  return {
    id, label, kind: 'command', fidelity: 'INFERRED', match,
    entry: { source: 'TACTICAL', destination: 'ACTION_SOLO', transition: 'cut' },
    actor: {
      pose: 'idle',
      beats: [
        // Tras completar el QTE el GBC ejecuta el combo: windup de golpe,
        // no gather_power (esa es solo para cargar energia).
        { frame: 12, pose: 'attack_fwd', note: 'windup del combo' },
        { frame: 26, pose: 'idle' },
        { frame: m.windup, pose: strikePose },
        { frame: m.contact, pose: strikePose, note: `${stages} stage - golpe final` },
        { frame: m.recovery, pose: 'idle' },
      ],
    },
    target: { beats: [] },
    rush: { startFrame: m.rush, duration: m.rushDur },
    impact: { contactFrame: m.contact, hitstop: m.hitstop, shake: m.shake, targetPose: 'knockback_back' },
    messages: [
      { frame: 4, text: `${stages} STAGE` },
      { frame: m.contact + 2, text: 'IMPACT' },
    ],
    returnToField: m.return,
  };
}

export const ACTION_PROFILE_REGISTRY: ActionProfileSpec[] = [
  // — Stage Attacks (QTE → rush melee) —
  stageSpec('stage_3', '3 Stage Attack', ['3stageatk'], 3),
  stageSpec('stage_4', '4 Stage Attack', ['4stageatk'], 4),
  stageSpec('stage_5', '5 Stage Attack', ['5stageatk'], 5),
  stageSpec('stage_6', '6 Stage Attack', ['6stageatk'], 6),
  // — Beams / energía —
  beamSpec('energy_wave', 'Energy Wave', ['energywave'], 'wave'),
  beamSpec('energy_bomb', 'Energy Bomb', ['energybomb', 'kiblastbomb'], 'ball'),
  beamSpec('kamehameha', 'Kamehameha', ['kamehameha', 'skamehameha', 'fkamehameha', 'kamekameha'], 'ray'),
  beamSpec('masenko', 'Masenko', ['masenko'], 'ray'),
  beamSpec('special_beam_cannon', 'Special Beam Cannon', ['sbeamcan'], 'ray'),
  beamSpec('spirit_bomb', 'Spirit Bomb', ['spiritbomb', 'supereball', 'sweetbeam'], 'ball'),
  beamSpec('final_flash', 'Final Flash', ['finalflash', 'galickho', 'grandwave', 'hellflash'], 'ray'),
  beamSpec('big_bang_attack', 'Big Bang Attack', ['bigbangatk'], 'ball'),
  beamSpec('burning_attack', 'Burning Attack', ['burningatk', 'finbuster', 'flambomb', 'lightningc'], 'wave'),
  beamSpec('energy_disk', 'Energy Disk', ['destructdisk', 'sdestrucd', 'energyslash', 'energyslice'], 'disk'),
  beamSpec('finger_beam', 'Finger Beam', ['fingerbeam', 'eyebeam', 'mistykiwave'], 'ray'),
  beamSpec('flash_sword', 'Flash Sword', ['flashsword'], 'sword'),
  beamSpec('special_projectile', 'Special Projectile', ['flightbomb', 'galacticad', 'sgkatk', 'telekinesis', 'msoundwave', 'erasercan', 'crasherball', 'purplecomet', 'bodychange', 'suicide'], 'special'),
  // — Melee / golpes físicos —
  meleeSpec('cont_punch', 'Cont. Punch', ['contpunch'], 'punch_right', 'knockback_back'),
  meleeSpec('cont_kick', 'Cont. Kick', ['contkick'], 'kick_right', 'knockback_back'),
  meleeSpec('rising_kick', 'Rising Kick', ['risingkick'], 'kick_right', 'knockback_up'),
  meleeSpec('sonic_kick', 'Sonic Kick', ['sonickick'], 'kick_right', 'knockback_back'),
  meleeSpec('dunk_shot', 'Dunk Shot', ['dunkshot'], 'punch_left', 'knockback_down'),
  meleeSpec('crazy_rush', 'Crazy Rush', ['crazyrush'], 'punch_left', 'knockback_back'),
  // — Melee: cartas damage adicionales (misma gramática, pose segun tecnica) —
  meleeSpec('solid_shot', 'Solid Shot', ['solidshot'], 'punch_right', 'knockback_back'),
  meleeSpec('tail', 'Tail', ['tail'], 'punch_right', 'knockback_up'),
  meleeSpec('flash_punch', 'Flash Punch', ['flashpunch'], 'punch_right', 'knockback_back'),
  meleeSpec('vball_crash', 'V-ball Crash', ['vballcrash'], 'punch_left', 'knockback_up'),
  meleeSpec('atomic_break', 'Atomic Break', ['atomicbreak'], 'punch_left', 'knockback_down'),
  meleeSpec('n_slasher', 'N.Slasher', ['nslasher'], 'punch_right', 'knockback_back'),
  meleeSpec('rfb_atk', 'R.F.B.Atk.', ['rfbatk'], 'punch_right', 'knockback_down'),
  meleeSpec('pcomet_z', 'P.Comet Z', ['pcometz'], 'punch_left', 'knockback_up'),
  meleeSpec('mach_attack', 'Mach Attack', ['machattack'], 'punch_right', 'knockback_back'),
  meleeSpec('dynami_punch', 'Dynami.Punch', ['dynamipunch'], 'punch_right', 'knockback_back'),
  meleeSpec('sdash_elbow', 'S.Dash Elbow', ['sdashelbow'], 'punch_left', 'knockback_up'),
  meleeSpec('rocket_punch', 'Rocket Punch', ['rocketpunch'], 'punch_right', 'knockback_back'),
  meleeSpec('attack_18', 'Attack No. 18', ['attackno18'], 'punch_left', 'knockback_back'),
  meleeSpec('life_absorb', 'Life Absorb', ['lifeabsorb'], 'punch_right', 'knockback_back'),
  meleeSpec('cell_combo', 'Cell Combo', ['cellcombo'], 'punch_left', 'knockback_up'),
  meleeSpec('step_up_atk', 'Step Up Atk.', ['stepupatk'], 'kick_right', 'knockback_up'),
  meleeSpec('potbelly_atk', 'Potbelly Atk', ['potbellyatk'], 'punch_left', 'knockback_down'),
  meleeSpec('crasher_buu', 'Crasher Buu', ['crasherbuu'], 'punch_right', 'knockback_down'),
  // — Buffs emblemáticos —
  buffSpec('kaio_ken', 'Kaio Ken', ['kaioken']),
];

const SLUG_INDEX: Map<string, ActionProfileSpec> = (() => {
  const m = new Map<string, ActionProfileSpec>();
  for (const spec of ACTION_PROFILE_REGISTRY) {
    for (const key of spec.match) {
      if (m.has(key)) {
        throw new Error(`Duplicate action profile slug "${key}" in ${m.get(key)?.id} and ${spec.id}`);
      }
      m.set(key, spec);
    }
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

export function actionSemanticsForCard(card: { name: string; type: string; compatible?: string[]; effect?: string }): ActionCardSemantics {
  const specific = resolveActionProfile(card.name);
  const isItem = card.type === 'support' && card.effect != null && ITEM_SUPPORT_EFFECTS.has(card.effect);
  const projectile = specific?.projectile?.kind ?? (card.type === 'beam' ? 'ray' : card.type === 'support' ? (isItem ? 'item' : 'power') : 'rush');
  const animation = card.type === 'command' ? 'stage'
    : card.type === 'damage' ? 'melee'
    : card.type === 'beam' ? 'beam'
    : 'support';
  const users = card.compatible ?? [];
  return {
    cardName: card.name,
    animation,
    visual: projectile,
    scope: !card.compatible ? 'shared' : card.compatible.length === 1 ? 'unique' : 'limited',
    canonicalUsers: users,
  };
}
