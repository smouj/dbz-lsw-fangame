// ═══════════════════════════════════════════════════════════
// DBZ LSW — Pixi Lab (Dev Studio): prueba del renderer PixiJS 8
// ═══════════════════════════════════════════════════════════
// Harness de verificación del BattleRenderer + FighterActor + reloj GBC único.
// No forma parte del flujo público. Demuestra:
//   · pixel art nítido (nearest-neighbour, sin blur)
//   · ground line estable (ancla 0.5,1 → el sprite NO "respira")
//   · animación determinista por frames GBC (sin setInterval)

import { useEffect, useRef, useState } from 'react';
import { FORMS } from '../data/roster';
import { GBC_FPS } from '../battle/timeline';
import { SCENARIOS } from '../data/scenarios';
import { BattlePosition, BATTLE_POSITIONS, POSITION_NAMES } from '../data/positions';
import { BattleRenderer } from '../renderer/pixi/BattleRenderer';
import { PixiBattlePresentation } from '../renderer/pixi/presentation/PixiBattlePresentation';
import type { BattleScene } from '../renderer/pixi/presentation/BattlePresentation';
import { BATTLE_LOGICAL_H, BATTLE_LOGICAL_W } from '../renderer/pixi/config';

const POSES = [
  'idle', 'move_front', 'move_back', 'guard', 'attack_fwd',
  'attack_ud', 'punch_right', 'punch_left', 'kick_right',
  'hurt', 'knockback_back', 'knockback_up', 'knockback_down',
  'beam_guard', 'evade', 'beam_charge', 'beam_fire', 'gather_power',
] as const;

export function PixiModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BattleRenderer | null>(null);
  const presRef = useRef<PixiBattlePresentation | null>(null);
  const tickEl = useRef<HTMLSpanElement>(null);
  const tickRef = useRef(0);

  const [formId, setFormId] = useState('goku_base');
  const [enemyFormId, setEnemyFormId] = useState('piccolo_base');
  const [scenarioId, setScenarioId] = useState('scenario_01');
  const [scene, setScene] = useState<BattleScene>('ACTION_SOLO');
  const [playerPos, setPlayerPos] = useState<BattlePosition>(BattlePosition.DOWN_BACK);
  const [enemyPos, setEnemyPos] = useState<BattlePosition>(BattlePosition.DOWN_BACK);
  const [pose, setPose] = useState<string>('gather_power');
  const [scale, setScale] = useState(3);
  const [status, setStatus] = useState<'loading' | 'ready' | 'no-manifest'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  // Cargar el mismo renderer/presentation que usa el juego real.
  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    const scenario = SCENARIOS.find(s => s.id === scenarioId) ?? SCENARIOS[0];
    if (!canvas || !scenario) return;
    setStatus('loading');
    rendererRef.current?.destroy();
    rendererRef.current = null;
    presRef.current = null;

    (async () => {
      const renderer = await BattleRenderer.create(canvas);
      if (cancelled) {
        renderer.destroy();
        return;
      }
      renderer.resize(BATTLE_LOGICAL_W, BATTLE_LOGICAL_H);
      const pres = new PixiBattlePresentation(renderer, {
        playerFormId: formId,
        enemyFormId,
        overviewBackground: scenario.overviewBackground,
        actionBackground: scenario.actionBackground,
        playerPos,
        enemyPos,
        scale,
      });
      await pres.init();
      if (cancelled) {
        renderer.destroy();
        return;
      }
      rendererRef.current = renderer;
      presRef.current = pres;
      pres.setAttacker('left');
      applyScenePreset(pres, scene, pose, tickRef.current);
      pres.sync(tickRef.current);
      setStatus('ready');
    })().catch(() => {
      if (!cancelled) setStatus('no-manifest');
    });
    return () => {
      cancelled = true;
      rendererRef.current?.destroy();
      rendererRef.current = null;
      presRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, enemyFormId, scenarioId, reloadKey]);

  function applyScenePreset(pres: PixiBattlePresentation, nextScene: BattleScene, nextPose = pose, tick = tickRef.current) {
    pres.setAttacker('left');
    pres.setScene(nextScene);
    pres.setActorPose(nextPose);
    pres.setTargetPose('idle');
    if (nextScene === 'FIELD') {
      pres.setActorPose('idle');
    } else if (nextScene === 'ACTION_SOLO') {
      pres.setActorPose(nextPose === 'idle' ? 'gather_power' : nextPose);
    } else if (nextScene === 'ACTION_DUEL') {
      pres.setActorPose(nextPose === 'idle' || nextPose === 'gather_power' ? 'attack_fwd' : nextPose);
    } else if (nextScene === 'PROJECTILE') {
      pres.setActorPose(nextPose === 'idle' || nextPose === 'gather_power' ? 'beam_fire' : nextPose);
      pres.spawnProjectile('ray', { spawnTick: tick, contactTick: tick + 52 });
    } else if (nextScene === 'IMPACT') {
      pres.setActorPose('idle');
      pres.setTargetPose('hurt');
      pres.impact();
    }
    pres.sync(tick);
  }

  // Cambiar pose (reinicia el reloj de la pose en el tick actual).
  useEffect(() => {
    presRef.current?.setActorPose(pose);
  }, [pose]);

  // Cambiar escala.
  useEffect(() => {
    // La escala se aplica al recrear presentación para no dejar nodos stale.
    setReloadKey(k => k + 1);
  }, [scale]);

  useEffect(() => {
    const pres = presRef.current;
    if (!pres) return;
    applyScenePreset(pres, scene);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useEffect(() => {
    presRef.current?.updateTactical(playerPos, enemyPos);
  }, [playerPos, enemyPos]);

  // Reloj GBC ÚNICO: avanza frames a GBC_FPS y alimenta el renderer.
  // El contador se escribe por DOM directo (sin setState por frame).
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let total = 0;
    const loop = (now: number) => {
      const dt = ((now - last) / 1000) * GBC_FPS;
      last = now;
      acc += dt;
      const ticks = Math.floor(acc);
      if (ticks > 0) {
        acc -= ticks;
        total += ticks;
        tickRef.current = total;
        presRef.current?.sync(total);
        if (tickEl.current) tickEl.current.textContent = String(total);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pixi-module">
      <h1>Pixi Lab</h1>
      <p>
        Renderer <strong>PixiJS 8</strong> (WebGL) + <strong>reloj GBC único</strong>.
        La animación del sprite es función pura del tick GBC — sin{' '}
        <code>setInterval</code> ni CSS <code>animation-duration</code>.
      </p>

      <div className="pixi-controls">
        <label className="pixi-control">
          <span>Forma</span>
          <select value={formId} onChange={e => setFormId(e.target.value)}>
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
          <span>Escena</span>
          <select value={scene} onChange={e => setScene(e.target.value as BattleScene)}>
            {(['FIELD', 'ACTION_SOLO', 'ACTION_DUEL', 'PROJECTILE', 'IMPACT'] as BattleScene[]).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="pixi-control">
          <span>Escenario</span>
          <select value={scenarioId} onChange={e => setScenarioId(e.target.value)}>
            {SCENARIOS.map(s => (
              <option key={s.id} value={s.id}>{s.id.replace('scenario_', 'Escenario ')}</option>
            ))}
          </select>
        </label>
        <label className="pixi-control">
          <span>Pose</span>
          <select value={pose} onChange={e => setPose(e.target.value)}>
            {POSES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="pixi-control">
          <span>Escala {scale}×</span>
          <input type="range" min={1} max={8} step={1} value={scale}
            onChange={e => setScale(Number(e.target.value))} />
        </label>
        <label className="pixi-control">
          <span>Player pos</span>
          <select value={playerPos} onChange={e => setPlayerPos(e.target.value as BattlePosition)}>
            {BATTLE_POSITIONS.map(p => <option key={p} value={p}>{POSITION_NAMES[p]}</option>)}
          </select>
        </label>
        <label className="pixi-control">
          <span>Enemy pos</span>
          <select value={enemyPos} onChange={e => setEnemyPos(e.target.value as BattlePosition)}>
            {BATTLE_POSITIONS.map(p => <option key={p} value={p}>{POSITION_NAMES[p]}</option>)}
          </select>
        </label>
        <div className="pixi-control">
          <span>Preset</span>
          <button type="button" onClick={() => { setScene('ACTION_SOLO'); setPose('gather_power'); }}>Solo carga</button>
        </div>
        <div className="pixi-control">
          <span>Preset</span>
          <button type="button" onClick={() => { setScene('PROJECTILE'); setPose('beam_fire'); }}>Beam travel</button>
        </div>
        <div className="pixi-control">
          <span>Preset</span>
          <button type="button" onClick={() => { setScene('ACTION_DUEL'); setPose('attack_fwd'); }}>Melee duel</button>
        </div>
      </div>

      <div className="pixi-status">
        <span className={`pixi-badge ${status}`}>
          {status === 'loading' ? 'cargando atlas…' : status === 'no-manifest' ? 'sin manifest' : 'listo'}
        </span>
        <span className="pixi-tick">tick GBC <span ref={tickEl}>0</span> · {GBC_FPS.toFixed(2)} Hz</span>
      </div>

      <div className="pixi-stage">
        <canvas ref={canvasRef} width={BATTLE_LOGICAL_W} height={BATTLE_LOGICAL_H} className="pixi-canvas" />
      </div>
      <p className="pixi-note">
        Arranca en ACTION_SOLO para que el canvas no parezca vacio. Usa el mismo
        `BattleRenderer` + `PixiBattlePresentation` que el combate:
        fondo overview/action, overworld táctico, actores grandes, target oculto
        en ACTION_SOLO, proyectil real en PROJECTILE y reloj GBC único.
      </p>
    </div>
  );
}
