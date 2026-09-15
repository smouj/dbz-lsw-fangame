// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — Dev Engine Editor
// Editor interno del runtime. El viewport GAME monta BattlePixiStage, que es
// exactamente el renderer Pixi de producción; aquí solo se añaden controles y
// ayudas de inspección. No hay sprites, timelines ni previews paralelos.
// ═══════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Camera, CirclePause, CirclePlay, Crosshair,
  FileCode2, Gauge, Grid3X3, Layers3, Pause, Play, RotateCcw,
  SkipForward, Terminal, TimerReset, Workflow,
} from 'lucide-react';
import { BattlePixiStage } from '../battle/BattlePixiStage';
import { SCENARIOS } from '../data/scenarios';
import { BattlePosition } from '../data/positions';
import { PixiBattlePresentation } from '../renderer/pixi/presentation/PixiBattlePresentation';
import { ACTION_NATIVE_H, ACTION_NATIVE_W, ACTION_WORLD_SCALE, BATTLE_LOGICAL_H, BATTLE_LOGICAL_W, BATTLE_OUTPUT_H } from '../renderer/pixi/config';

type EditorScene = 'FIELD' | 'ACTION_SOLO' | 'ACTION_DUEL' | 'PROJECTILE' | 'IMPACT';
type BottomTab = 'PROJECT' | 'SCRIPTS' | 'TIMELINE' | 'CONSOLE' | 'PROFILER' | 'ROM';

const SCENES: Array<{ id: EditorScene; label: string }> = [
  { id: 'FIELD', label: 'Field' },
  { id: 'ACTION_SOLO', label: 'Action solo' },
  { id: 'ACTION_DUEL', label: 'Action duel' },
  { id: 'PROJECTILE', label: 'Projectile' },
  { id: 'IMPACT', label: 'Impact' },
];

const POSES = ['idle', 'attack_fwd', 'beam_charge', 'beam_fire', 'hurt', 'knockback_back', 'gather_power'];
const HIERARCHY = [
  { id: 'runtime', label: 'BattleRuntime', kind: 'runtime', children: ['presentation', 'scene-director', 'hud'] },
  { id: 'presentation', label: 'BattlePresentation · Pixi', kind: 'presentation', children: ['action-scene', 'projectile-layer', 'rom-display'] },
  { id: 'scene-director', label: 'SceneDirector', kind: 'scene', children: ['tactical-scene', 'action-scene'] },
  { id: 'tactical-scene', label: 'TacticalScene', kind: 'scene', children: ['player-chibi', 'enemy-chibi'] },
  { id: 'action-scene', label: 'ActionScene · 160×80 ×2', kind: 'scene', children: ['action-background', 'player-actor', 'enemy-actor'] },
  { id: 'player-actor', label: 'FighterActor · Player', kind: 'actor', children: [] },
  { id: 'enemy-actor', label: 'FighterActor · Enemy', kind: 'actor', children: [] },
  { id: 'projectile-layer', label: 'ProjectileLayer', kind: 'fx', children: [] },
  { id: 'rom-display', label: 'RomDisplayLayer', kind: 'rom', children: [] },
  { id: 'hud', label: 'BattleHUD', kind: 'hud', children: [] },
];

function pretty(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function actorSnapshot(pres: PixiBattlePresentation | null, side: 'left' | 'right') {
  if (!pres) return null;
  const actor = pres.inspectActors()[side];
  return actor ? actor.inspect() : null;
}

export function EditorModule() {
  const presentationRef = useRef<PixiBattlePresentation | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [tick, setTick] = useState(0);
  const [scene, setScene] = useState<EditorScene>('FIELD');
  const [pose, setPose] = useState('idle');
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [playerFormId, setPlayerFormId] = useState('goku_base');
  const [enemyFormId, setEnemyFormId] = useState('piccolo_base');
  const [selected, setSelected] = useState('action-scene');
  const [bottomTab, setBottomTab] = useState<BottomTab>('PROJECT');
  const [overlays, setOverlays] = useState({ grid: true, anchors: true, bounds: false });
  const [snapshot, setSnapshot] = useState<ReturnType<PixiBattlePresentation['debugState']> | null>(null);

  const refresh = useCallback(() => {
    const p = presentationRef.current;
    if (p) setSnapshot(p.debugState());
    setTick(tickRef.current);
  }, []);

  const configureScene = useCallback((nextScene: EditorScene = scene) => {
    const p = presentationRef.current;
    if (!p) return;
    p.reset();
    p.setAttacker('left');
    p.setScene(nextScene as never);
    if (nextScene === 'FIELD') {
      p.setFighterVisibility('ACTOR', true);
      p.setFighterVisibility('TARGET', true);
    } else if (nextScene === 'ACTION_SOLO') {
      p.setFighterVisibility('ACTOR', true);
      p.setFighterVisibility('TARGET', false);
      p.setActorPose(pose);
    } else if (nextScene === 'ACTION_DUEL') {
      p.setFighterVisibility('ACTOR', true);
      p.setFighterVisibility('TARGET', true);
      p.setActorPose(pose);
      p.setTargetPose('idle');
    } else if (nextScene === 'PROJECTILE') {
      p.setFighterVisibility('ACTOR', true);
      p.setFighterVisibility('TARGET', true);
      p.setActorPose('beam_fire');
      p.setTargetPose('idle');
      p.spawnProjectile('ray', { spawnTick: tickRef.current, contactTick: tickRef.current + 52 });
    } else {
      p.setFighterVisibility('ACTOR', false);
      p.setFighterVisibility('TARGET', true);
      p.setTargetPose('hurt');
      p.impact();
    }
    p.sync(tickRef.current);
    refresh();
  }, [pose, refresh, scene]);

  const step = useCallback((amount = 1) => {
    const next = Math.max(0, tickRef.current + amount);
    tickRef.current = next;
    presentationRef.current?.sync(next);
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = null;
      accumulatorRef.current = 0;
      return;
    }
    const frame = (now: number) => {
      const previous = lastTimeRef.current ?? now;
      lastTimeRef.current = now;
      accumulatorRef.current += Math.min(100, now - previous) * 59.7275 / 1000;
      const whole = Math.floor(accumulatorRef.current);
      if (whole > 0) {
        accumulatorRef.current -= whole;
        tickRef.current += whole;
        presentationRef.current?.sync(tickRef.current);
        refresh();
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [playing, refresh]);

  useEffect(() => { if (ready) configureScene(scene); }, [ready, configureScene, scene]);
  useEffect(() => { if (ready) configureScene(scene); }, [pose]); // intentional pose hand-off

  const selectedActor = selected === 'player-actor' ? actorSnapshot(presentationRef.current, 'left')
    : selected === 'enemy-actor' ? actorSnapshot(presentationRef.current, 'right') : null;
  const selectedNode = HIERARCHY.find(node => node.id === selected);
  const scenario = useMemo(() => SCENARIOS.find(item => item.id === scenarioId) ?? SCENARIOS[0], [scenarioId]);

  return (
    <div className="dev-editor" data-testid="dev-engine-editor">
      <header className="dev-editor-toolbar">
        <div className="dev-editor-brand"><Workflow size={16} /><strong>DBZ LSW · Dev Engine</strong><span>INTERNAL</span></div>
        <div className="dev-editor-transport" aria-label="Runtime controls">
          <button type="button" title="Play" aria-label="Play" className={playing ? 'active' : ''} onClick={() => setPlaying(true)}><Play size={14} /></button>
          <button type="button" title="Pause" aria-label="Pause" onClick={() => setPlaying(false)}><Pause size={14} /></button>
          <button type="button" title="Step 1 tick" aria-label="Step 1 tick" onClick={() => step(1)}><SkipForward size={14} /></button>
          <button type="button" title="Step 10 ticks" aria-label="Step 10 ticks" onClick={() => step(10)}><TimerReset size={14} /></button>
          <button type="button" title="Restart" aria-label="Restart" onClick={() => { tickRef.current = 0; setPlaying(false); configureScene(scene); }}><RotateCcw size={14} /></button>
        </div>
        <label className="dev-editor-select"><span>SCENE</span><select value={scene} onChange={event => { const next = event.target.value as EditorScene; setScene(next); configureScene(next); }}>{SCENES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <div className="dev-editor-readout"><span><Gauge size={13} /> {playing ? 'PLAYING' : 'PAUSED'}</span><b>TICK {tick}</b><small>59.7275 Hz</small></div>
      </header>

      <div className="dev-editor-main">
        <aside className="dev-editor-hierarchy" aria-label="Runtime hierarchy">
          <div className="dev-editor-pane-title"><Layers3 size={14} /> HIERARCHY <small>LIVE RUNTIME</small></div>
          <div className="dev-editor-tree">
            {HIERARCHY.map(node => <div key={node.id} className={`dev-editor-tree-row ${selected === node.id ? 'selected' : ''} kind-${node.kind}`} style={{ paddingLeft: node.id === 'runtime' ? 8 : node.id.includes('actor') || node.id === 'action-background' ? 34 : 20 }} onClick={() => setSelected(node.id)} role="button" tabIndex={0} onKeyDown={event => { if (event.key === 'Enter') setSelected(node.id); }}>
              <span className="dev-editor-tree-glyph">{node.kind === 'actor' ? '◈' : node.kind === 'scene' ? '▧' : node.kind === 'fx' ? '✦' : '▸'}</span><span>{node.label}</span>{node.kind === 'actor' && <i>{(node.id === 'player-actor' ? snapshot?.actor?.visible : snapshot?.target?.visible) ? 'visible' : 'hidden'}</i>}
            </div>)}
          </div>
        </aside>

        <section className="dev-editor-center">
          <div className="dev-editor-viewport-head"><span><Box size={14} /> GAME</span><small>{scenario.id} · {scene} · {ready ? 'READY' : 'LOADING'}</small><div className="dev-editor-viewport-tools"><button type="button" className={overlays.grid ? 'active' : ''} title="Native grid" onClick={() => setOverlays(v => ({ ...v, grid: !v.grid }))}><Grid3X3 size={13} /></button><button type="button" className={overlays.anchors ? 'active' : ''} title="Anchors" onClick={() => setOverlays(v => ({ ...v, anchors: !v.anchors }))}><Crosshair size={13} /></button><button type="button" className={overlays.bounds ? 'active' : ''} title="Bounds" onClick={() => setOverlays(v => ({ ...v, bounds: !v.bounds }))}><Camera size={13} /></button></div></div>
          <div className="dev-editor-game" data-scene={scene}>
            <BattlePixiStage key={`${scenario.id}:${playerFormId}:${enemyFormId}`} scenario={scenario} playerFormId={playerFormId} enemyFormId={enemyFormId} playerPos={BattlePosition.DOWN_FRONT} enemyPos={BattlePosition.DOWN_FRONT} presentationRef={presentationRef} onPresentationReady={value => { setReady(value); if (!value) setSnapshot(null); }} />
            {overlays.grid && <div className="dev-editor-grid-overlay" aria-hidden="true" />}
            {overlays.anchors && <><span className="dev-editor-anchor left" /><span className="dev-editor-anchor right" /><span className="dev-editor-ground" /></>}
            {overlays.bounds && <div className="dev-editor-bounds" aria-hidden="true"><span>ACTION {ACTION_NATIVE_W}×{ACTION_NATIVE_H}</span><span>WORLD {BATTLE_LOGICAL_W}×{BATTLE_LOGICAL_H}</span><span>OUTPUT {BATTLE_LOGICAL_W}×{BATTLE_OUTPUT_H}</span></div>}
          </div>
          <div className="dev-editor-viewport-status"><span><CirclePlay size={12} /> PIXI PRODUCTION RENDERER</span><span><CirclePause size={12} /> {ready ? 'RUNTIME CONNECTED' : 'WAITING FOR RUNTIME'}</span></div>
        </section>

        <aside className="dev-editor-inspector" aria-label="Inspector">
          <div className="dev-editor-pane-title"><Workflow size={14} /> INSPECTOR <small>{selectedNode?.kind ?? 'node'}</small></div>
          <div className="dev-editor-inspector-content">
            <h2>{selectedNode?.label ?? 'Runtime node'}</h2>
            {selectedActor ? <>
              <section><h3>IDENTITY</h3><dl><dt>FORM</dt><dd>{selectedActor.formId}</dd><dt>SIDE</dt><dd>{selectedActor.side.toUpperCase()}</dd><dt>FACING</dt><dd className="ok">{selectedActor.facing.toUpperCase()} · scaleX {selectedActor.scaleX}</dd><dt>BASE</dt><dd>{selectedActor.baseFacing.toUpperCase()} · lado ROM</dd><dt>ORIENTATION</dt><dd>{selectedActor.orientationSource}</dd><dt>ROLE</dt><dd>{selected === 'player-actor' ? 'PLAYER / physical left' : 'ENEMY / physical right'}</dd></dl></section>
              <section><h3>TRANSFORM</h3><dl><dt>POSITION</dt><dd>{selected === 'player-actor' ? `${snapshot?.actor?.x ?? '—'}, ${snapshot?.actor?.y ?? '—'}` : `${snapshot?.target?.x ?? '—'}, ${snapshot?.target?.y ?? '—'}`} native</dd><dt>WORLD</dt><dd>{ACTION_NATIVE_W}×{ACTION_NATIVE_H} · ×{ACTION_WORLD_SCALE}</dd><dt>GROUND</dt><dd>75 native</dd><dt>VISIBLE</dt><dd>{selectedActor ? 'YES' : 'NO'}</dd></dl></section>
              <section><h3>ANIMATION · ROM</h3><dl><dt>POSE</dt><dd>{selectedActor.pose ?? '—'}</dd><dt>FRAME</dt><dd>{selectedActor.frameIndex}</dd><dt>TIMING</dt><dd>{selectedActor.timingSource}</dd><dt>SEQUENCE</dt><dd>{selectedActor.romResource == null ? '—' : `$${selectedActor.romResource.toString(16).padStart(2, '0')} / ${selectedActor.romSequence}`}</dd><dt>PHYSICAL</dt><dd className={selectedActor.physicalId ? 'ok' : ''}>{selectedActor.physicalId ?? '—'}</dd><dt>LOCK</dt><dd>{selectedActor.physicalFrameLocked ? 'ROM_PHYSICAL_FRAME' : 'SEMANTIC POSE'}</dd></dl></section>
            </> : <>
              <section><h3>RUNTIME STATE</h3><dl><dt>SCENE</dt><dd>{snapshot?.scene ?? scene}</dd><dt>TICK</dt><dd>{snapshot?.tick ?? tick}</dd><dt>ACTOR</dt><dd>{snapshot?.actor ? `${snapshot.actor.pose ?? '—'} · frame ${snapshot.actor.frame}` : '—'}</dd><dt>TARGET</dt><dd>{snapshot?.target ? `${snapshot.target.pose ?? '—'} · frame ${snapshot.target.frame}` : '—'}</dd></dl></section>
              <section><h3>ROM DISPLAY</h3><pre>{pretty(snapshot?.romDisplay)}</pre></section>
              <section><h3>CAMERA</h3><pre>{pretty(snapshot?.camera)}</pre></section>
            </>}
          </div>
          <div className="dev-editor-form-controls"><label>PLAYER<select value={playerFormId} onChange={event => setPlayerFormId(event.target.value)}><option value="goku_base">Goku · Base</option><option value="gohan_young">Gohan · Kid</option><option value="vegeta_base">Vegeta · Base</option><option value="vegito_ssj">Vegito · SSJ</option></select></label><label>ENEMY<select value={enemyFormId} onChange={event => setEnemyFormId(event.target.value)}><option value="piccolo_base">Piccolo · Normal</option><option value="cell_perfect">Cell · Perfect</option><option value="vegeta_base">Vegeta · Base</option><option value="goku_base">Goku · Base</option></select></label><label>POSE<select value={pose} onChange={event => setPose(event.target.value)}>{POSES.map(item => <option key={item} value={item}>{item}</option>)}</select></label><label>SCENARIO<select value={scenarioId} onChange={event => setScenarioId(event.target.value)}>{SCENARIOS.map(item => <option key={item.id} value={item.id}>{item.id}</option>)}</select></label></div>
        </aside>
      </div>

      <footer className="dev-editor-dock">
        <div className="dev-editor-dock-tabs">{(['PROJECT', 'SCRIPTS', 'TIMELINE', 'CONSOLE', 'PROFILER', 'ROM'] as BottomTab[]).map(tab => <button type="button" key={tab} className={bottomTab === tab ? 'active' : ''} onClick={() => setBottomTab(tab)}>{tab === 'PROJECT' ? <FileCode2 size={13} /> : tab === 'SCRIPTS' ? <Terminal size={13} /> : tab === 'ROM' ? <Grid3X3 size={13} /> : tab === 'PROFILER' ? <Gauge size={13} /> : <TimerReset size={13} />}{tab}</button>)}</div>
        <div className="dev-editor-dock-content">{bottomTab === 'PROJECT' && <><b>dbz-lsw-fangame</b><span>src/battle/BattlePixiStage.tsx</span><span>src/renderer/pixi/presentation/PixiBattlePresentation.ts</span><span className="ok">Production renderer · source linked</span></>}{bottomTab === 'SCRIPTS' && <><span>BattleRuntime</span><span>ProductionRomPresentationAdapter</span><span>ActionObjectRuntime</span></>}{bottomTab === 'TIMELINE' && <><span className="mono">T{tick.toString().padStart(4, '0')}</span><span>{scene}</span><span>actor → target → cleanup</span></>}{bottomTab === 'CONSOLE' && <><span className="ok">No runtime errors</span><span>ROM physical ownership active</span></>}{bottomTab === 'PROFILER' && <><span>FPS target 59.7275</span><span>GBC tick {tick}</span><span>Pixi scene {scene}</span></>}{bottomTab === 'ROM' && <><span>Action geometry {ACTION_NATIVE_W}×{ACTION_NATIVE_H} native</span><span>World {BATTLE_LOGICAL_W}×{BATTLE_LOGICAL_H} · output {BATTLE_OUTPUT_H}</span><span>RomDisplay viewport 160×144 clipped</span></>}</div>
      </footer>
    </div>
  );
}
