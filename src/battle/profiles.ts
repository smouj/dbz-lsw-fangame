// ═══════════════════════════════════════════════════════════
// DBZ LSW — Perfiles de cinemática por carta (plan del usuario, punto 3-5)
// ═══════════════════════════════════════════════════════════
// Cada acción declara SU cinematografía: plano(s) + secuencia de eventos con
// duración por frame (ticks). Nada de if/else gigantes con animaciones
// genéricas: la carta apunta a un perfil declarativo.
//
// Vistas canónicas (gramática de planos):
//   FIELD        → sprites overworld pequeños + escenario normal
//   ACTION_SOLO  → un único personaje grande (Gather, buffs, transformación)
//   ACTION_DUEL  → ambos sprites grandes (melee, guard, counters, stage)
//   PROJECTILE   → beam/proyectil: release → travel → contact
//   IMPACT       → golpe/explosión/block/evade (plano corto dedicado)
//
// Duración por frame (punto 6): cada evento lleva su tick absoluto; mantener
// frames HOLD (impacto 2-3 ticks) es lo que da peso al golpe en pixel art.

import { type CinematicProfile, type CinematicTrack, buildProfile, track } from './timeline';
import { compileActionProfile, resolveActionProfile } from './actionProfiles';

// Tipos de acción que llegan de las cartas (subconjunto del runtime)
export type CinematicKind =
  | 'beam'
  | 'damage'
  | 'command'
  | 'support_offensive'   // efectos ofensivos de support (ej. explosión)
  | 'support'             // buffs/heal/utility
  | 'gather'              // Gather Power
  | 'guard';              // defensa básica
// NOTA: 'move' NO es un kind cinematográfico. MOVE es del espacio TÁCTICO
// (docs/CINEMATIC_GRAMMAR.md §7): el sprite overworld se recoloca en el tablero
// vía `defendBasic('move', axis)` en main.tsx, sin plano de acción. Por eso no
// existe `move` aquí ni en PROFILE_FACTORIES.

export interface CinematicParams {
  side: 'player' | 'enemy';
  actorPose: string;      // pose base del atacante en cada fase
  targetPose: string;
}

// ── Tabla de timing (frames GBC) — alineada con docs/ACTION_FIDELITY.md ──
// Beam:    attacker 54f (charge 0-0.90s) · travel 54f (0.90-1.80s) · target 44f
// Damage:  attacker 50f (0.84s)         · travel 44f (0.74s)       · target 38f
// Support: total ≈118f (1.98s) con aura/pose
const T = {
  beamAttacker: 54,
  beamTravel: 54,
  beamTarget: 44,
  rushAttacker: 50,
  rushTravel: 44,
  rushTarget: 38,
  supportTotal: 118,
  soloTotal: 96,
  impactHold: 3,     // HOLD del impacto (peso del golpe)
  returnField: 12,   // fade de vuelta a FIELD
};

function profileBeam(id: string): CinematicProfile {
  const a = T.beamAttacker, t = T.beamTravel, g = T.beamTarget;
  return buildProfile(id, 'ACTION_SOLO', [
    // 1) Plano ACTION_SOLO + el atacante carga sin duplicar al defensor
    track(0, 'SHOT', { shot: 'ACTION_SOLO' }),
    track(0, 'ACTOR_POSE', { pose: 'beam_charge' }),
    // 2) Release + proyectil creado (head/body/trail)
    track(a - 6, 'SHOT', { shot: 'PROJECTILE' }),
    track(a - 6, 'PROJECTILE', { action: 'spawn', kind: 'beam', spawnFrame: a - 6, contactFrame: a + t, travelFrames: t + 6 }),
    track(a, 'ACTOR_POSE', { pose: 'beam_fire' }),
    track(a, 'SHOT', { shot: 'PROJECTILE', focus: 'beam' }),
    // 3) Viaje del beam
    track(a + Math.floor(t / 2), 'PROJECTILE', { action: 'travel', progress: 0.5 }),
    // 4) Contacto: HIT_FRAME sincroniza TODO (pose defensor + impacto + daño)
    track(a + t, 'TARGET_POSE', { pose: 'hurt' }),
    track(a + t, 'PROJECTILE', { action: 'impact' }),
    track(a + t, 'HIT_FRAME', {}),
    track(a + t + 1, 'CAMERA', { shake: 0.45 }),
    track(a + t + 2, 'MESSAGE', { text: 'IMPACT' }),
    // 5) Impacto hold + explosión
    track(a + t + T.impactHold, 'PROJECTILE', { action: 'explode' }),
    track(a + t + T.impactHold, 'SHOT', { shot: 'IMPACT' }),
    // 6) Aplicar daño precalculado (la lógica ya resolvió antes)
    track(a + t + T.impactHold + 1, 'APPLY_DAMAGE', {}),
    // 7) Vuelta a FIELD
    track(a + t + g, 'FIELD_RETURN', {}),
  ]);
}

function profileRush(id: string, kind: 'damage' | 'command'): CinematicProfile {
  const a = T.rushAttacker, t = T.rushTravel, g = T.rushTarget;
  // El impacto (HIT_FRAME) ocurre al FINAL del travel: antes el travel duraba
  // solo 6 ticks (a-6 → a), lo que cortaba el lunge CSS (fx-rush-body 0.7s).
  const contact = a + t;
  return buildProfile(id, 'ACTION_SOLO', [
    track(0, 'SHOT', { shot: 'ACTION_SOLO' }),
    track(0, 'ACTOR_POSE', { pose: 'idle' }),
    // Windup al final del approach
    track(a - 12, 'ACTOR_POSE', { pose: 'attack_fwd' }),
    // Travel: lunge hacia el rival (inicio del desplazamiento)
    track(a, 'SHOT', { shot: 'ACTION_DUEL' }),
    track(a, 'RUSH', { progress: 0.0, duration: t }),
    track(a, 'ACTOR_POSE', { pose: 'attack_fwd' }),
    // Contacto al final del travel
    track(contact, 'ACTOR_POSE', { pose: 'attack_fwd', contact: true }),
    track(contact, 'TARGET_POSE', { pose: 'hurt' }),
    track(contact, 'HIT_FRAME', {}),
    track(contact + 1, 'CAMERA', { shake: 0.35 }),
    track(contact + 2, 'MESSAGE', { text: 'IMPACT' }),
    // Hold del impacto + daño
    track(contact + T.impactHold, 'SHOT', { shot: 'IMPACT' }),
    track(contact + T.impactHold + 1, 'APPLY_DAMAGE', {}),
    // Recovery y vuelta
    track(contact + T.impactHold + T.returnField, 'ACTOR_POSE', { pose: 'idle' }),
    track(contact + g, 'FIELD_RETURN', {}),
  ]);
}

function profileSupportOffensive(id: string): CinematicProfile {
  const a = T.rushAttacker, g = T.rushTarget;
  return buildProfile(id, 'ACTION_SOLO', [
    track(0, 'SHOT', { shot: 'ACTION_SOLO' }),
    track(0, 'ACTOR_POSE', { pose: 'power_up' }),
    track(a - 10, 'ACTOR_POSE', { pose: 'attack_fwd' }),
    track(a, 'SHOT', { shot: 'ACTION_DUEL' }),
    track(a, 'TARGET_POSE', { pose: 'hurt' }),
    track(a, 'HIT_FRAME', {}),
    track(a + 1, 'CAMERA', { shake: 0.3 }),
    track(a + T.impactHold + 1, 'APPLY_DAMAGE', {}),
    track(a + T.impactHold + 2, 'SHOT', { shot: 'IMPACT' }),
    track(a + g, 'FIELD_RETURN', {}),
  ]);
}

function profileSupport(id: string): CinematicProfile {
  return buildProfile(id, 'ACTION_SOLO', [
    track(0, 'SHOT', { shot: 'ACTION_SOLO' }),
    track(0, 'ACTOR_POSE', { pose: 'power_up' }),
    track(Math.floor(T.supportTotal / 3), 'MESSAGE', { text: 'AURA' }),
    track(Math.floor(T.supportTotal / 2), 'APPLY_DAMAGE', {}), // efecto (heal/buff)
    track(T.supportTotal - T.returnField, 'FIELD_RETURN', {}),
  ]);
}

function profileGather(id: string): CinematicProfile {
  return buildProfile(id, 'ACTION_SOLO', [
    track(0, 'SHOT', { shot: 'ACTION_SOLO' }),
    track(0, 'ACTOR_POSE', { pose: 'power_up' }),
    track(Math.floor(T.soloTotal / 3), 'MESSAGE', { text: 'GATHER' }),
    track(Math.floor(T.soloTotal / 2), 'APPLY_DAMAGE', {}), // aplicar buffs
    track(T.soloTotal - T.returnField, 'FIELD_RETURN', {}),
  ]);
}

function profileDefense(id: string): CinematicProfile {
  return buildProfile(id, 'ACTION_DUEL', [
    track(0, 'SHOT', { shot: 'ACTION_DUEL' }),
    track(0, 'TARGET_POSE', { pose: 'guard' }),
    track(Math.floor(T.rushAttacker / 2), 'MESSAGE', { text: 'GUARD' }),
    track(T.rushAttacker - T.returnField, 'FIELD_RETURN', {}),
  ]);
}

// ── Registro: kind → fábrica de perfil ──
const PROFILE_FACTORIES: Record<CinematicKind, (id: string) => CinematicProfile> = {
  beam: profileBeam,
  damage: profileRush as unknown as (id: string) => CinematicProfile,
  command: profileRush as unknown as (id: string) => CinematicProfile,
  support_offensive: profileSupportOffensive,
  support: profileSupport,
  gather: profileGather,
  guard: profileDefense,
};

export function profileFor(kind: CinematicKind, cardName: string): CinematicProfile {
  // Perfil firma por carta (declarativo, docs/CINEMATIC_GRAMMAR.md §23/§34).
  const specific = resolveActionProfile(cardName);
  if (specific) return compileActionProfile(specific);
  // Fallback genérico por kind (técnicas sin perfil propio todavía).
  const factory = PROFILE_FACTORIES[kind] ?? profileSupport;
  return factory(`${kind}:${cardName}`);
}

export { T as CINEMATIC_TIMING };
