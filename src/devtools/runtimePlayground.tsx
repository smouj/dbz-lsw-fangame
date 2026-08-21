// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — Engine Playground (M8): primer slice vertical EN VIVO.
// Prueba real del pipeline: UI → BattleCommand → Engine → EventLog →
// M7 Timeline → Presenter (DOM con poses reales del manifest V9).
// El reloj lo alimenta un GbcClockAdapter (fuera del Engine) vía RAF —
// el renderer solo aporta tiempo, nunca reglas.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react';
import { BattleRuntime, useBattleRuntime, createCuePresenter, resolvePoseSrc } from '../battle/runtime';
import { createInitialBattleState } from '../battle/engine/state/createInitialBattleState';
import { getCard, type CardDef } from '../data/cards';
import { BattlePosition } from '../data/positions';
import { GbcClockAdapter } from '../battle/GbcClockAdapter';
import { SCENARIOS, SPECIAL_ACTION_BACKGROUND } from '../data/scenarios';
import type { BattleSide } from '../battle/engine/state/BattleState';
import { CanonBattleField } from './CanonBattleField';

function deckOf(ids: number[]): { drawPile: CardDef[]; hand: CardDef[]; discardPile: CardDef[] } {
  return { drawPile: [], hand: ids.map(id => getCard(id)).filter((c): c is CardDef => !!c), discardPile: [] };
}

export function EnginePlayground() {
  const [runtime] = useState(() => {
    const cfg = {
      playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
      playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 8, playerSpd: 9,
      playerMaxCc: 99, playerCc: 0,
      enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
      enemyMaxHp: 1000, enemyHp: 1000, enemyStr: 9, enemyKi: 10, enemySpd: 7,
      enemyMaxCc: 99, enemyCc: 0,
      playerPos: BattlePosition.DOWN_FRONT, enemyPos: BattlePosition.DOWN_BACK,
      playerDeck: deckOf([12, 5, 1]), enemyDeck: deckOf([1]),
      playerLimits: [], playerFighterLimits: [],
      firstAttacker: 'player' as const, seed: 20260818,
    };
    return new BattleRuntime({
      state: { ...createInitialBattleState(cfg), phase: 'command' as never },
      context: {
        playerFormId: 'goku_base', enemyFormId: 'piccolo_base',
        overviewBackground: SCENARIOS[0].overviewBackground,
        actionBackground: SCENARIOS[0].actionBackground,
        specialActionBackground: SPECIAL_ACTION_BACKGROUND,
      },
    });
  });

  // ── Presenter DOM: consume cues → pinta poses reales + fondo ──
  const [poseSrcs, setPoseSrcs] = useState<Record<string, string | null>>({ player: null, enemy: null });
  const [poseNames, setPoseNames] = useState<Record<string, string>>({ player: 'idle', enemy: 'idle' });
  const [sceneBg, setSceneBg] = useState<string>(SCENARIOS[0].overviewBackground);
  const [sceneMode, setSceneMode] = useState('OVERVIEW');
  const [lastCue, setLastCue] = useState<string>('—');
  const setPoseFor = (side: BattleSide, pose: string) => {
    setPoseNames(prev => ({ ...prev, [side]: pose }));
    const formId = side === 'player' ? 'goku_base' : 'piccolo_base';
    resolvePoseSrc(formId, pose).then(src => setPoseSrcs(prev => ({ ...prev, [side]: src })));
  };
  const presenter = useMemo(() => createCuePresenter({
    onScene: (cue) => { setSceneBg(cue.background); setSceneMode(cue.mode); },
    onPose: (cue) => { setPoseFor(cue.side, cue.pose); setLastCue(`${cue.tick} pose ${cue.pose} (${cue.side})`); },
    onAura: (cue) => { setLastCue(`${cue.tick} aura ${cue.variant} ${cue.visible ? 'ON' : 'OFF'}`); },
    onProjectile: (cue) => { setLastCue(`${cue.tick} projectile ${cue.action}`); },
    onImpact: (cue) => { setLastCue(`${cue.tick} impact ${cue.outcome} → ${cue.side}`); },
    onCamera: (cue) => { setLastCue(`${cue.tick} camera ${cue.action}`); },
    onHud: (cue) => { setLastCue(`${cue.tick} hud ${cue.kind}`); },
    onAudio: (cue) => { setLastCue(`${cue.tick} audio ${cue.cue}`); },
  }), []);

  const { runtime: rt, version, dispatch, advance, can } = useBattleRuntime({ runtime, presenter });

  // ── Reloj: RAF → GbcClockAdapter → runtime.advance (solo tiempo) ──
  const adapter = useRef(new GbcClockAdapter());
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const ticks = adapter.current.push(now - last);
      last = now;
      if (ticks > 0) advance(ticks);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [advance]);

  const s = rt.state;
  const seq = [...s.stageQte.seq];
  const qteKey = s.stageQte.idx < seq.length ? seq[s.stageQte.idx] : null;
  const inQte = s.stageQte.state === 'INPUT_WINDOW';
  const inCounter = s.stageQte.state === 'COUNTER_WINDOW';

  const sceneModeNorm = sceneMode === 'SPECIAL_ACTION' ? 'SPECIAL_ACTION' : sceneMode === 'ACTION' ? 'ACTION' : 'OVERVIEW';
  const activeSide: BattleSide = s.exchange === 0 ? s.activeSide : (s.activeSide === 'player' ? 'enemy' : 'player');

  const commands: Array<{ label: string; cmd: Parameters<typeof dispatch>[0]; enabled: boolean }> = [
    { label: 'GATHER', cmd: { type: 'GATHER_POWER' }, enabled: can({ type: 'GATHER_POWER' }) },
    { label: 'BASIC', cmd: { type: 'BASIC' }, enabled: can({ type: 'BASIC' }) },
    { label: 'JOINT', cmd: { type: 'JOINT' }, enabled: can({ type: 'JOINT' }) },
    { label: 'LIMIT', cmd: { type: 'LIMIT' }, enabled: can({ type: 'LIMIT' }) },
    { label: 'GUARD', cmd: { type: 'GUARD' }, enabled: can({ type: 'GUARD' }) },
    { label: 'MOVE H', cmd: { type: 'MOVE', axis: 'HORIZONTAL' }, enabled: can({ type: 'MOVE', axis: 'HORIZONTAL' }) },
    { label: 'MOVE V', cmd: { type: 'MOVE', axis: 'VERTICAL' }, enabled: can({ type: 'MOVE', axis: 'VERTICAL' }) },
    { label: 'STAGE', cmd: { type: 'BASIC_STAGE_ATTACK' }, enabled: can({ type: 'BASIC_STAGE_ATTACK' }) },
    { label: 'PLAY Kamehameha', cmd: { type: 'PLAY_CARD', handIndex: 0 }, enabled: can({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' }) },
    ...(inQte && qteKey ? [{ label: `QTE ${qteKey}`, cmd: { type: 'QTE_INPUT', input: qteKey } as Parameters<typeof dispatch>[0], enabled: true }] : []),
    ...(inCounter ? [
      { label: 'Counter DEFEND', cmd: { type: 'QTE_COUNTER_DEFEND' } as Parameters<typeof dispatch>[0], enabled: true },
      { label: 'Counter CONTINUE', cmd: { type: 'QTE_COUNTER_CONTINUE' } as Parameters<typeof dispatch>[0], enabled: true },
    ] : []),
  ];

  const logTail = rt.log.entries.slice(-6);

  return (
    <div className="dev-rt">
      <div className="dev-rt-head">
        <strong>Engine Playground — slice vertical M8</strong>
        <span className="dev-rt-tick">tick {s.tick}</span>
        <span className="dev-rt-cue">último cue: {lastCue}</span>
      </div>

      {/* BATTLE-SCREEN CANÓNICO — mismo markup que HUD Studio (canon visual) */}
      <div className="dev-rt-stage dev-rt-stage-canon">
        <CanonBattleField
          player={{
            formId: 'goku_base', name: 'GOKU', form: 'Base',
            hp: s.player.hp, maxHp: s.player.maxHp, cc: s.player.cc,
            pos: s.player.battlePos,
            phase: activeSide === 'player' ? 'ATTACK' : 'DEFEND',
          }}
          enemy={{
            formId: 'piccolo_base', name: 'PICCOLO', form: 'Base',
            hp: s.enemy.hp, maxHp: s.enemy.maxHp, cc: s.enemy.cc,
            pos: s.enemy.battlePos,
            phase: activeSide === 'enemy' ? 'ATTACK' : 'DEFEND',
          }}
          round={s.turn + 1}
          background={sceneBg}
          mode={sceneModeNorm}
          actor={activeSide}
          pose={{
            player: sceneModeNorm !== 'OVERVIEW' && activeSide === 'player' ? poseNames.player : 'idle',
            enemy: sceneModeNorm !== 'OVERVIEW' && activeSide === 'enemy' ? poseNames.enemy : 'idle',
          }}
          qte={inQte && qteKey ? { label: qteKey, seq } : inCounter ? { label: 'DEFEND o CONTINUE', seq, warn: true } : null}
          devAids={false}
        />
      </div>

      <div className="dev-rt-commands">
        {commands.map(c => (
          <button key={c.label} className={`dev-btn ${c.enabled ? '' : 'dev-btn-disabled'}`}
            disabled={!c.enabled} onClick={() => dispatch(c.cmd)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="dev-rt-state">
        <span><b>JUG</b> HP {s.player.hp}/{s.player.maxHp} · CC {s.player.cc} · {s.player.battlePos}</span>
        <span><b>RIV</b> HP {s.enemy.hp}/{s.enemy.maxHp} · CC {s.enemy.cc} · {s.enemy.battlePos}</span>
        <span><b>fase</b> {s.phase} · <b>power</b> {s.powerState} · <b>rng</b> {s.rngState}</span>
        <span><b>eventos</b> {rt.log.entries.length} · <b>cues</b> {rt.timeline.entries.length}</span>
      </div>

      <div className="dev-rt-log">
        {logTail.map((en, i) => (
          <code key={i}>[{en.tick}] {en.event.type}</code>
        ))}
      </div>
      <p className="dev-hint">
        El reloj corre con RAF → GbcClockAdapter → advance() (solo tiempo). Los botones disparan
        BattleCommand; el Engine decide; el Presenter DOM pinta los cues con poses reales del manifest.
        La legalidad de cada botón es canExecute() en vivo.
      </p>
    </div>
  );
}
