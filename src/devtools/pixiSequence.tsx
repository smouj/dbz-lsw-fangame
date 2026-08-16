// ═══════════════════════════════════════════════════════════
// DBZ LSW — Pixi Sequence Lab (Dev Studio): secuencia COMPLETA de combate
// ═══════════════════════════════════════════════════════════
// Rediseño (2026-08-15): dos flujos cinematográficos bien separados, porque
// melee y beam NO son la misma secuencia:
//
//   MELEE (golpe físico):
//     FIELD (rival en escena, jugador aparece)
//       → GUARD (jugador en guardia)
//       → MOVE_FRONT (avance táctico: overworld DOWN_BACK → DOWN_FRONT)
//       → ACTION_DUEL (luchadores grandes) + windup attack_fwd
//       → RUSH (lunge hacia el rival)
//       → HIT_FRAME (contacto) + target hurt + impacto
//       → FIELD_RETURN
//
//   BEAM (onda de energía):
//     FIELD (rival en escena, jugador aparece)
//       → GUARD (sin avance: el personaje se queda en su lado)
//       → PROJECTILE (escena del rayo: personaje a la izquierda)
//       → BEAM_CHARGE (carga de ki)
//       → BEAM_FIRE + spawn del rayo (sale desde el lado del personaje)
//       → TRAVEL (el rayo cruza la escena hasta el rival)
//       → HIT_FRAME (impacto del beam) + target hurt + FX genérico
//       → FIELD_RETURN
//
// El impacto del beam es un FX genérico (flash + shake + hitstop) igual para
// todos los personajes. Determinista: frame = f(tick GBC único).

import { useEffect, useRef, useState } from 'react';
import { FORMS } from '../data/roster';
import { BattleRenderer } from '../renderer/pixi/BattleRenderer';
import { PixiBattlePresentation } from '../renderer/pixi/presentation/PixiBattlePresentation';
import { applyCinematicEvent } from '../renderer/pixi/presentation/CinematicAdapter';
import { BattleTimeline, buildProfile, track, type CinematicProfile, type CinematicTrack } from '../battle/timeline';
import {
  ACTION_PROFILE_REGISTRY,
  compileActionProfile,
  listActionProfiles,
  type ActionProfileSpec,
  type ProjectileVisualKind,
} from '../battle/actionProfiles';
import { BattlePosition } from '../data/positions';
import { BATTLE_LOGICAL_W, BATTLE_LOGICAL_H } from '../renderer/pixi/config';

// ── Catálogo de acciones del lab ───────────────────────────────────────────
interface LabAction {
  id: string;
  label: string;
  kind: 'melee' | 'beam' | 'guard' | 'gather' | 'support';
  pose: string;          // pose de windup/ataque en ACTION
  rush: boolean;         // melee: lunge hacia el rival
  projectile: boolean;   // beam: spawn + travel
  projectileKind?: ProjectileVisualKind | 'beam';
  profileId?: string;
  signature?: boolean;   // viene del registro de perfiles firma
  matrix?: boolean;
}

const BASE_ACTIONS: LabAction[] = [
  { id: 'melee_fwd', label: 'Golpe frontal (melee)', kind: 'melee', pose: 'attack_fwd', rush: true, projectile: false },
  { id: 'melee_ud', label: 'Golpe vertical (arriba/abajo)', kind: 'melee', pose: 'attack_ud', rush: true, projectile: false },
  { id: 'beam_generic', label: 'Beam genérico (onda)', kind: 'beam', pose: 'beam_charge', rush: false, projectile: true },
  { id: 'guard', label: 'Guardia (defensa)', kind: 'guard', pose: 'guard', rush: false, projectile: false },
  { id: 'gather', label: 'Gather Power', kind: 'gather', pose: 'power_up', rush: false, projectile: false },
  { id: 'support', label: 'Aura / buff', kind: 'support', pose: 'power_up', rush: false, projectile: false },
];

function signatureActions(): LabAction[] {
  return listActionProfiles().map(p => ({
    id: `sig:${p.id}`,
    label: `${p.label} (firma)`,
    kind: p.kind === 'beam' ? 'beam' : p.kind === 'damage' || p.kind === 'command' ? 'melee' : 'support',
    pose: p.kind === 'beam' ? 'beam_charge' : 'attack_fwd',
    rush: p.kind === 'damage' || p.kind === 'command',
    projectile: p.kind === 'beam',
    profileId: p.id,
    signature: true,
  }));
}

const PROJECTILE_MATRIX_IDS = [
  'kamehameha',
  'energy_wave',
  'spirit_bomb',
  'energy_disk',
  'flash_sword',
  'special_projectile',
] as const;

function projectileMatrixActions(): LabAction[] {
  return PROJECTILE_MATRIX_IDS
    .map(id => ACTION_PROFILE_REGISTRY.find(p => p.id === id))
    .filter((p): p is ActionProfileSpec => !!p)
    .map(p => ({
      id: `matrix:${p.id}`,
      label: `${p.label} — ${p.projectile?.kind ?? 'ray'}`,
      kind: 'beam' as const,
      pose: 'beam_charge',
      rush: false,
      projectile: true,
      projectileKind: p.projectile?.kind ?? 'ray',
      profileId: p.id,
      matrix: true,
    }));
}

const SIGNATURE_ACTIONS = signatureActions();
const PROJECTILE_MATRIX_ACTIONS = projectileMatrixActions();
const ALL_ACTIONS: LabAction[] = [...BASE_ACTIONS, ...SIGNATURE_ACTIONS, ...PROJECTILE_MATRIX_ACTIONS];

// ── Escenarios (fondos) ────────────────────────────────────────────────────
const SCENARIOS = Array.from({ length: 13 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return { id: n, label: `Escenario ${n}` };
}).concat([{ id: 'special', label: 'Special' }]);

// ── Timings (ticks GBC) ────────────────────────────────────────────────────
const T = {
  guard: 18,          // jugador en guardia
  moveFront: 34,      // avance táctico (solo melee)
  action: 50,         // plano de acción + windup
  charge: 54,         // duración de la carga del beam
  contact: 102,       // HIT_FRAME (melee)
  recovery: 122,      // vuelta a idle del actor (melee)
  returnField: 136,   // FIELD_RETURN (melee)
  // Beam: disparo tras la carga y viaje del rayo hasta el impacto
  beamChargeEnd: 104, // beam_fire + spawn (50 + 54)
  beamContact: 136,   // impacto del rayo en el rival (104 + 32 viaje)
  beamRecovery: 156,
  beamReturn: 170,
};

/**
 * MELEE: avance táctico + ACTION_DUEL + rush. El jugador se acerca al rival.
 */
function buildMeleeProfile(action: LabAction): CinematicProfile {
  const t: CinematicTrack[] = [];
  const contact = T.contact;
  t.push(track(0, 'SHOT', { shot: 'FIELD' }));
  t.push(track(0, 'ACTOR_POSE', { pose: 'idle' }));
  t.push(track(0, 'TARGET_POSE', { pose: 'idle' }));
  t.push(track(T.guard, 'ACTOR_POSE', { pose: 'guard' }));
  t.push(track(T.moveFront, 'ACTOR_POSE', { pose: 'move_front' }));
  t.push(track(T.action, 'SHOT', { shot: 'ACTION_DUEL' }));
  t.push(track(T.action, 'ACTOR_POSE', { pose: action.pose }));
  t.push(track(T.action + 8, 'PROJECTILE', { action: 'rush', progress: 0, duration: contact - (T.action + 8) }));
  t.push(track(contact, 'TARGET_POSE', { pose: 'hurt' }));
  t.push(track(contact, 'HIT_FRAME', {}));
  t.push(track(contact + 1, 'CAMERA', { shake: 0.35 }));
  t.push(track(contact + 3, 'SHOT', { shot: 'IMPACT' }));
  t.push(track(contact + 4, 'APPLY_DAMAGE', {}));
  t.push(track(T.recovery, 'ACTOR_POSE', { pose: 'idle' }));
  t.push(track(T.returnField, 'FIELD_RETURN', {}));
  return buildProfile(`lab:${action.id}`, 'FIELD', t);
}

/**
 * BEAM: SIN avance ni rush. El personaje se queda a la izquierda, carga,
 * dispara; el rayo sale desde su lado y viaja hasta el rival. El impacto es
 * un FX genérico (flash + shake + hitstop) igual para todos los personajes.
 */
function buildBeamProfile(action: LabAction): CinematicProfile {
  const t: CinematicTrack[] = [];
  const contact = T.beamContact;
  const chargeEnd = T.beamChargeEnd;
  t.push(track(0, 'SHOT', { shot: 'FIELD' }));
  t.push(track(0, 'ACTOR_POSE', { pose: 'idle' }));
  t.push(track(0, 'TARGET_POSE', { pose: 'idle' }));
  t.push(track(T.guard, 'ACTOR_POSE', { pose: 'guard' }));
  // Escena del rayo: personaje a la izquierda, rival a la derecha, SIN avance.
  t.push(track(T.action, 'SHOT', { shot: 'PROJECTILE' }));
  t.push(track(T.action, 'ACTOR_POSE', { pose: 'beam_charge' }));
  // Release: dispara + el rayo nace desde el lado del personaje.
  t.push(track(chargeEnd, 'ACTOR_POSE', { pose: 'beam_fire' }));
  const projectileKind = action.projectileKind ?? 'beam';
  t.push(track(chargeEnd, 'PROJECTILE', {
    action: 'spawn',
    kind: projectileKind,
    spawnFrame: chargeEnd,
    contactFrame: contact,
    travelFrames: contact - chargeEnd,
  }));
  // Viaje del rayo hacia el rival.
  t.push(track(chargeEnd + Math.floor((contact - chargeEnd) / 2), 'PROJECTILE', {
    action: 'travel',
    kind: projectileKind,
    progress: 0.5,
    spawnFrame: chargeEnd,
    contactFrame: contact,
    travelFrames: contact - chargeEnd,
  }));
  // Impacto del beam en el rival: FX genérico (igual para todos los personajes).
  t.push(track(contact, 'PROJECTILE', { action: 'impact' }));
  t.push(track(contact, 'TARGET_POSE', { pose: 'hurt' }));
  t.push(track(contact, 'HIT_FRAME', {}));
  t.push(track(contact + 1, 'CAMERA', { shake: 0.45 }));
  t.push(track(contact + 3, 'SHOT', { shot: 'IMPACT' }));
  t.push(track(contact + 4, 'APPLY_DAMAGE', {}));
  t.push(track(contact + 4, 'PROJECTILE', { action: 'explode' }));
  t.push(track(T.beamRecovery, 'ACTOR_POSE', { pose: 'idle' }));
  t.push(track(T.beamReturn, 'FIELD_RETURN', {}));
  return buildProfile(`lab:${action.id}`, 'FIELD', t);
}

/**
 * DEFENSA / GATHER / SUPPORT: el defensor se protege o el jugador canaliza.
 */
function buildSimpleProfile(action: LabAction): CinematicProfile {
  const t: CinematicTrack[] = [];
  if (action.kind === 'guard') {
    t.push(track(0, 'SHOT', { shot: 'FIELD' }));
    t.push(track(0, 'ACTOR_POSE', { pose: 'idle' }));
    t.push(track(0, 'TARGET_POSE', { pose: 'idle' }));
    t.push(track(T.guard, 'SHOT', { shot: 'ACTION_DUEL' }));
    t.push(track(T.guard, 'TARGET_POSE', { pose: 'guard' }));
    t.push(track(60, 'SHOT', { shot: 'FIELD' }));
    t.push(track(64, 'FIELD_RETURN', {}));
  } else {
    t.push(track(0, 'SHOT', { shot: 'FIELD' }));
    t.push(track(0, 'ACTOR_POSE', { pose: 'idle' }));
    t.push(track(0, 'TARGET_POSE', { pose: 'idle' }));
    t.push(track(T.guard, 'SHOT', { shot: 'ACTION_SOLO' }));
    t.push(track(T.guard, 'ACTOR_POSE', { pose: action.pose }));
    t.push(track(60, 'APPLY_DAMAGE', {}));
    t.push(track(64, 'FIELD_RETURN', {}));
  }
  return buildProfile(`lab:${action.id}`, 'FIELD', t);
}

function buildLabProfile(action: LabAction): CinematicProfile {
  if (action.profileId) {
    const spec = ACTION_PROFILE_REGISTRY.find(p => p.id === action.profileId);
    if (spec) return compileActionProfile(spec);
  }
  if (action.kind === 'beam') return buildBeamProfile(action);
  if (action.kind === 'melee') return buildMeleeProfile(action);
  return buildSimpleProfile(action);
}

// ── Speed del reloj del lab ────────────────────────────────────────────────
const SPEEDS = [0.5, 1, 2, 4] as const;

export function PixiSequenceModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const debugRef = useRef<HTMLPreElement>(null);
  const presRef = useRef<PixiBattlePresentation | null>(null);
  const rendererRef = useRef<BattleRenderer | null>(null);
  const timelineRef = useRef<BattleTimeline | null>(null);
  const advancedRef = useRef(false);
  const tickRef = useRef(0);

  const [playerFormId, setPlayerFormId] = useState('goku_base');
  const [enemyFormId, setEnemyFormId] = useState('piccolo_base');
  const [actionId, setActionId] = useState('melee_fwd');
  const [scenario, setScenario] = useState('01');
  const [speed, setSpeed] = useState<number>(1);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [detResult, setDetResult] = useState('');
  const [seekTick, setSeekTick] = useState(0);
  const [totalTicks, setTotalTicks] = useState(0);

  const action = ALL_ACTIONS.find(a => a.id === actionId) ?? ALL_ACTIONS[0];
  const isMelee = action.kind === 'melee';

  // Crear renderer + presentación cuando cambian formas o escenario.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      rendererRef.current?.destroy();
      rendererRef.current = null;
      presRef.current = null;
      setReady(false);
      const renderer = await BattleRenderer.create(canvas);
      renderer.resize(BATTLE_LOGICAL_W, BATTLE_LOGICAL_H);
      const pres = new PixiBattlePresentation(renderer, {
        playerFormId,
        enemyFormId,
        overviewBackground: `/assets/backgrounds/scenarios/${scenario}_world.png`,
        actionBackground: `/assets/backgrounds/scenarios/${scenario}_action.png`,
        playerPos: BattlePosition.DOWN_BACK,
        enemyPos: BattlePosition.DOWN_BACK,
        scale: 3,
      });
      await pres.init();
      if (cancelled) { renderer.destroy(); return; }
      rendererRef.current = renderer;
      presRef.current = pres;
      setReady(true);
      if (statusRef.current) {
        const p = FORMS[playerFormId];
        const e = FORMS[enemyFormId];
        statusRef.current.textContent = `listo — ${p?.character ?? playerFormId} vs ${e?.character ?? enemyFormId}`;
      }
    })();
    return () => {
      cancelled = true;
      timelineRef.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerFormId, enemyFormId, scenario]);

  const showDebug = (s: string) => {
    if (debugRef.current) debugRef.current.textContent = s;
  };

  const resetPresentationForReplay = (pres: PixiBattlePresentation) => {
    pres.reset();
    pres.setAttacker('left');
    advancedRef.current = false;
  };

  const play = () => {
    const pres = presRef.current;
    if (!pres) return;
    timelineRef.current?.cancel();
    resetPresentationForReplay(pres);
    tickRef.current = 0;
    const profile = buildLabProfile(action);
    showDebug(`reproduciendo «${action.label}» (${profile.totalTicks} ticks, ${profile.tracks.length} eventos)\n`);
    setTotalTicks(profile.totalTicks);
    const tl = new BattleTimeline(profile, {
      onEvent: e => { applyCinematicEvent(pres, e); },
      speed,
      onReset: () => resetPresentationForReplay(pres),
      onTick: tick => {
        // Avance táctico SOLO en melee (el beam no se acerca al rival).
        if (isMelee && !advancedRef.current && tick >= T.moveFront) {
          pres.updateTactical(BattlePosition.DOWN_FRONT, BattlePosition.DOWN_BACK);
          advancedRef.current = true;
        }
        tickRef.current = tick;
        pres.sync(tick);
        if (debugRef.current) {
          const d = pres.debugState();
          const line = `${tick}|${d.scene}|A:${d.actor?.pose ?? '-'}/${d.actor?.frame ?? '-'}@${Math.round(d.actor?.x ?? 0)}:${d.actor?.visible ? 'vis' : 'hid'}|T:${d.target?.pose ?? '-'}/${d.target?.frame ?? '-'}:${d.target?.visible ? 'vis' : 'hid'}`;
          const lines = debugRef.current.textContent?.split('\n') ?? [];
          if (lines.length > 40) lines.shift();
          lines.push(line);
          debugRef.current.textContent = lines.join('\n');
        }
      },
      onComplete: () => {
        setPlaying(false);
        showDebug('COMPLETE — ' + JSON.stringify(pres.debugState()));
      },
    });
    timelineRef.current = tl;
    setPlaying(true);
    tl.start();
  };

  const stop = () => {
    timelineRef.current?.cancel();
    setPlaying(false);
  };

  const reset = () => {
    const pres = presRef.current;
    if (!pres) return;
    timelineRef.current?.cancel();
    setPlaying(false);
    pres.reset();
    advancedRef.current = false;
    tickRef.current = 0;
    setSeekTick(0);
    showDebug('reset — ' + JSON.stringify(pres.debugState()));
  };

  /** Salta a un tick concreto (depurador frame a frame). */
  const seek = (tick: number) => {
    const pres = presRef.current;
    if (!pres) return;
    const profile = buildLabProfile(action);
    let t = timelineRef.current;
    if (!t || t.profile.id !== profile.id) {
      t?.cancel();
      resetPresentationForReplay(pres);
      t = new BattleTimeline(profile, {
        onEvent: e => { applyCinematicEvent(pres, e); },
        speed,
        onReset: () => resetPresentationForReplay(pres),
        onTick: (currentTick) => { pres.sync(currentTick); },
        onComplete: () => {},
      });
      timelineRef.current = t;
    }
    setTotalTicks(profile.totalTicks);
    const target = Math.max(0, Math.min(tick, profile.totalTicks));
    t.seek(target);
    if (isMelee && target >= T.moveFront) {
      pres.updateTactical(BattlePosition.DOWN_FRONT, BattlePosition.DOWN_BACK);
      advancedRef.current = true;
    }
    tickRef.current = target;
    setSeekTick(target);
    pres.sync(target);
    const d = pres.debugState();
    showDebug(`seek ${target}|${d.scene}|A:${d.actor?.pose ?? '-'}/${d.actor?.frame ?? '-'}:${d.actor?.visible ? 'vis' : 'hid'}|T:${d.target?.pose ?? '-'}/${d.target?.frame ?? '-'}:${d.target?.visible ? 'vis' : 'hid'}`);
  };

  /** Reproduce el perfil sin rAF y comprueba frame-determinismo (100 runs). */
  const checkDeterminism = () => {
    const pres = presRef.current;
    if (!pres) return;
    const profile = buildLabProfile(action);
    const runs = 100;
    const runOnce = (): string => {
      const lines: string[] = [];
      for (let tick = 0; tick <= profile.totalTicks; tick++) {
        const evs = profile.tracks.filter(t => t.tick === tick).map(t => ({ ...t.event, tick: t.tick }));
        for (const e of evs) applyCinematicEvent(pres, e);
        if (isMelee && !advancedRef.current && tick >= T.moveFront) {
          pres.updateTactical(BattlePosition.DOWN_FRONT, BattlePosition.DOWN_BACK);
          advancedRef.current = true;
        }
        pres.sync(tick);
        lines.push(JSON.stringify(pres.debugState()));
      }
      return lines.join('\n');
    };
    pres.reset();
    advancedRef.current = false;
    const first = runOnce();
    let mismatches = 0;
    let firstDivergence = -1;
    for (let i = 1; i < runs; i++) {
      pres.reset();
      advancedRef.current = false;
      const cur = runOnce();
      if (cur !== first) { mismatches++; if (firstDivergence < 0) firstDivergence = i; }
    }
    pres.reset();
    advancedRef.current = false;
    setDetResult(mismatches === 0
      ? `✅ FRAME-DETERMINISTICO: ${runs} runs idénticos (${profile.totalTicks} ticks, ${profile.tracks.length} eventos)`
      : `❌ ${mismatches} divergencias (primera en run ${firstDivergence})`);
  };

  return (
    <div className="pixi-module">
      <h1>Pixi Sequence Lab</h1>
      <p>
        Dos secuencias cinematográficas distintas:
        <strong> melee</strong> (guardia → avance → rush → golpe) y{' '}
        <strong>beam</strong> (sin avance: carga → disparo → el rayo viaja →
        impacto genérico). El rival aparece en el campo y el jugador desde su lado.
      </p>

      <div className="pixi-controls">
        <label className="pixi-control">
          <span>Jugador</span>
          <select value={playerFormId} onChange={e => setPlayerFormId(e.target.value)}>
            {Object.entries(FORMS).map(([id, f]) => (
              <option key={id} value={id}>{f.character} / {f.form}</option>
            ))}
          </select>
        </label>
        <label className="pixi-control">
          <span>Rival</span>
          <select value={enemyFormId} onChange={e => setEnemyFormId(e.target.value)}>
            {Object.entries(FORMS).map(([id, f]) => (
              <option key={id} value={id}>{f.character} / {f.form}</option>
            ))}
          </select>
        </label>
        <label className="pixi-control">
          <span>Acción</span>
          <select value={actionId} onChange={e => setActionId(e.target.value)}>
            <optgroup label="Genéricas">
              {BASE_ACTIONS.map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </optgroup>
            <optgroup label="Matriz proyectiles">
              {PROJECTILE_MATRIX_ACTIONS.map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </optgroup>
            <optgroup label="Perfiles firma (cartas)">
              {SIGNATURE_ACTIONS.map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="pixi-control">
          <span>Escenario</span>
          <select value={scenario} onChange={e => setScenario(e.target.value)}>
            {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="pixi-control">
          <span>Velocidad</span>
          <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>
            {SPEEDS.map(s => <option key={s} value={s}>{s}×</option>)}
          </select>
        </label>
      </div>

      <div className="pixi-controls">
        <button onClick={play} disabled={!ready || playing}>▶ Reproducir</button>
        <button onClick={stop} disabled={!playing}>⏸ Pausa</button>
        <button onClick={reset} disabled={!ready}>⏮ Reset</button>
        <button onClick={checkDeterminism} disabled={!ready}>Comprobar determinismo (100 runs)</button>
        <div ref={statusRef} className="pixi-status-text" />
      </div>

      <div className="pixi-controls">
        <label className="pixi-control">
          <span>Frame (tick GBC)</span>
          <input type="range" min={0} max={Math.max(1, totalTicks)} value={Math.min(seekTick, totalTicks)}
            onChange={e => seek(Number(e.target.value))} style={{ minWidth: 220 }} />
          <span style={{ fontSize: 11 }}>{seekTick} / {totalTicks}</span>
        </label>
      </div>

      {detResult && <div className="pixi-note" style={{ fontWeight: 700 }}>{detResult}</div>}

      <div className="pixi-stage">
        <canvas ref={canvasRef} width={BATTLE_LOGICAL_W} height={BATTLE_LOGICAL_H}
          className="pixi-canvas" style={{ width: BATTLE_LOGICAL_W * 2, height: BATTLE_LOGICAL_H * 2, imageRendering: 'pixelated' }} />
      </div>

      <pre ref={debugRef} className="pixi-debug" />
      <p className="pixi-note">
        MELEE: FIELD → guard → move_front (avance) → ACTION_DUEL → rush → HIT.
        BEAM: FIELD → guard → PROJECTILE (sin avance) → beam_charge → beam_fire
        → rayo viaja → impacto genérico. Determinista: frame = f(tick GBC).
      </p>
    </div>
  );
}
