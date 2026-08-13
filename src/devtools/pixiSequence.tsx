// ═══════════════════════════════════════════════════════════
// DBZ LSW — Pixi Sequence Lab (Dev Studio): verificación del pipeline
// ═══════════════════════════════════════════════════════════
// Harness del contrato BattleTimeline → BattlePresentation → PixiBattlePresentation.
// Demuestra la secuencia Stage Attack (rush) de principio a fin y comprueba
// FRAME-DETERMINISMO: la misma secuencia reproducida N veces da el MISMO
// (tick → pose/frame/posición) en todos los runs, sin rAF.

import { useEffect, useRef, useState } from 'react';
import { BattleRenderer } from '../renderer/pixi/BattleRenderer';
import { PixiBattlePresentation } from '../renderer/pixi/presentation/PixiBattlePresentation';
import { applyCinematicEvent } from '../renderer/pixi/presentation/CinematicAdapter';
import { profileFor } from '../battle/profiles';
import { BattleTimeline } from '../battle/timeline';
import type { CinematicEvent, CinematicProfile } from '../battle/timeline';
import { BattlePosition } from '../data/positions';
import { BATTLE_LOGICAL_W, BATTLE_LOGICAL_H } from '../renderer/pixi/config';

const CONFIG = {
  playerFormId: 'goku_base',
  enemyFormId: 'piccolo_base',
  overviewBackground: '/assets/backgrounds/scenarios/01_world.png',
  actionBackground: '/assets/backgrounds/scenarios/01_action.png',
  playerPos: BattlePosition.DOWN_BACK,
  enemyPos: BattlePosition.DOWN_BACK,
  scale: 3,
};

/** Agrupa los tracks del perfil por tick (preservando el orden declarado). */
function groupEvents(profile: CinematicProfile): Map<number, CinematicEvent[]> {
  const byTick = new Map<number, CinematicEvent[]>();
  for (const t of profile.tracks) {
    const list = byTick.get(t.tick) ?? [];
    list.push({ type: t.event.type, tick: t.tick, payload: t.event.payload });
    byTick.set(t.tick, list);
  }
  return byTick;
}

/** Reproduce el perfil de forma 100% determinista (sin rAF) y devuelve un hash. */
function runDeterministic(pres: PixiBattlePresentation, profile: CinematicProfile): string {
  const byTick = groupEvents(profile);
  const lines: string[] = [];
  for (let tick = 0; tick <= profile.totalTicks; tick++) {
    const evs = byTick.get(tick) ?? [];
    for (const e of evs) applyCinematicEvent(pres, e);
    pres.sync(tick);
    lines.push(`${tick}|${JSON.stringify(pres.debugState())}`);
  }
  return lines.join('\n');
}

export function PixiSequenceModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const debugRef = useRef<HTMLPreElement>(null);
  const presRef = useRef<PixiBattlePresentation | null>(null);
  const timelineRef = useRef<BattleTimeline | null>(null);

  const [ready, setReady] = useState(false);
  const [detResult, setDetResult] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const renderer = await BattleRenderer.create(canvas);
      renderer.resize(BATTLE_LOGICAL_W, BATTLE_LOGICAL_H);
      const pres = new PixiBattlePresentation(renderer, CONFIG);
      await pres.init();
      if (cancelled) { renderer.destroy(); return; }
      presRef.current = pres;
      setReady(true);
      if (statusRef.current) statusRef.current.textContent = 'listo — goku vs piccolo';
    })();
    return () => {
      cancelled = true;
      timelineRef.current?.cancel();
      presRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showDebug = (s: string) => {
    if (debugRef.current) debugRef.current.textContent = s;
  };

  const playLive = () => {
    const pres = presRef.current;
    if (!pres) return;
    timelineRef.current?.cancel();
    pres.reset();
    pres.setAttacker('left'); // goku ataca
    const profile = profileFor('damage', 'Stage Attack');
    showDebug(`reproduciendo «${profile.id}» (${profile.totalTicks} ticks, ${profile.tracks.length} eventos)…`);
    const tl = new BattleTimeline(profile, {
      onEvent: e => { applyCinematicEvent(pres, e); },
      onTick: tick => { pres.sync(tick); showDebug(JSON.stringify(pres.debugState())); },
      onComplete: () => { showDebug('COMPLETE — ' + JSON.stringify(pres.debugState())); },
    });
    timelineRef.current = tl;
    tl.start();
  };

  const checkDeterminism = () => {
    const pres = presRef.current;
    if (!pres) return;
    const profile = profileFor('damage', 'Stage Attack');
    const runs = 100;
    pres.reset();
    const first = runDeterministic(pres, profile);
    let mismatches = 0;
    let firstDivergence = -1;
    for (let i = 1; i < runs; i++) {
      pres.reset();
      const cur = runDeterministic(pres, profile);
      if (cur !== first) { mismatches++; if (firstDivergence < 0) firstDivergence = i; }
    }
    pres.reset();
    setDetResult(mismatches === 0
      ? `✅ FRAME-DETERMINISTICO: ${runs} runs idénticos (${profile.totalTicks} ticks, ${profile.tracks.length} eventos)`
      : `❌ ${mismatches} divergencias (primera en run ${firstDivergence})`);
  };

  return (
    <div className="pixi-module">
      <h1>Pixi Sequence Lab</h1>
      <p>
        Pipeline <code>BattleTimeline → BattlePresentation → PixiBattlePresentation</code>.
        Secuencia Stage Attack (rush) completa + comprobación de frame-determinismo
        (sin rAF: mismo tick → misma pose/frame/posición).
      </p>

      <div className="pixi-controls">
        <button onClick={playLive} disabled={!ready}>▶ Reproducir Stage Attack (live)</button>
        <button onClick={checkDeterminism} disabled={!ready}>Comprobar determinismo (100 runs)</button>
        <div ref={statusRef} className="pixi-status-text" />
      </div>

      {detResult && <div className="pixi-note" style={{ fontWeight: 700 }}>{detResult}</div>}

      <div className="pixi-stage">
        <canvas ref={canvasRef} width={BATTLE_LOGICAL_W} height={BATTLE_LOGICAL_H}
          className="pixi-canvas" style={{ width: BATTLE_LOGICAL_W * 2, height: BATTLE_LOGICAL_H * 2, imageRendering: 'pixelated' }} />
      </div>

      <pre ref={debugRef} className="pixi-debug" />
    </div>
  );
}
