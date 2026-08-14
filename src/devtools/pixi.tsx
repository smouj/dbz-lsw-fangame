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
import { BattleCanvas, type BattleCanvasHandle } from '../renderer/pixi/BattleCanvas';
import type { FighterActor } from '../renderer/pixi/actors/FighterActor';

const POSES = [
  'idle', 'move_front', 'move_back', 'guard', 'attack_fwd',
  'attack_ud', 'hurt', 'beam_charge', 'beam_fire', 'power_up',
] as const;

// Caja lógica (píxeles de "juego") y display CSS (escalado 2x pixelado).
const LOGICAL_W = 320;
const LOGICAL_H = 240;

export function PixiModule() {
  const canvasRef = useRef<BattleCanvasHandle>(null);
  const actorRef = useRef<FighterActor | null>(null);
  const tickEl = useRef<HTMLSpanElement>(null);
  const tickRef = useRef(0);

  const [formId, setFormId] = useState('goku_base');
  const [pose, setPose] = useState<string>('idle');
  const [scale, setScale] = useState(4);
  const [status, setStatus] = useState<'loading' | 'ready' | 'no-manifest'>('loading');

  // Cargar el luchador cuando cambia la forma.
  useEffect(() => {
    let cancelled = false;
    const h = canvasRef.current;
    if (!h) return;
    setStatus('loading');
    h.addFighter(formId, 'left', scale).then(actor => {
      if (cancelled) return;
      if (!actor) { setStatus('no-manifest'); return; }
      actorRef.current = actor;
      // ground line: abajo-centro de la caja lógica
      actor.position.set(LOGICAL_W / 2, LOGICAL_H - 12);
      actor.setPose(pose, tickRef.current);
      setStatus('ready');
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  // Cambiar pose (reinicia el reloj de la pose en el tick actual).
  useEffect(() => {
    actorRef.current?.setPose(pose, tickRef.current);
  }, [pose]);

  // Cambiar escala.
  useEffect(() => {
    actorRef.current?.setScale(scale);
  }, [scale]);

  // Reloj GBC ÚNICO: avanza frames a GBC_FPS y alimenta el renderer.
  // El contador se escribe por DOM directo (sin setState por frame).
  useEffect(() => {
    const h = canvasRef.current;
    if (!h) return;
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
        h.tick(ticks);
        total += ticks;
        tickRef.current = total;
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
      </div>

      <div className="pixi-status">
        <span className={`pixi-badge ${status}`}>
          {status === 'loading' ? 'cargando atlas…' : status === 'no-manifest' ? 'sin manifest' : 'listo'}
        </span>
        <span className="pixi-tick">tick GBC <span ref={tickEl}>0</span> · {GBC_FPS.toFixed(2)} Hz</span>
      </div>

      <div className="pixi-stage">
        <BattleCanvas ref={canvasRef} width={LOGICAL_W} height={LOGICAL_H} className="pixi-canvas" />
      </div>
      <p className="pixi-note">
        Ground line fija (ancla 0.5,1): al cambiar de frame el personaje no
        «respira», aunque los PNG tengan dimensiones recortadas distintas.
      </p>
    </div>
  );
}
