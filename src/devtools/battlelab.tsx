// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Battle Lab
// Combate instantáneo: elige formas + modo (Versus / capítulo de
// historia) y lanza el BattleScreen real con ese estado inicial.
// Los depuradores de combate se activan por URL en la batalla:
//   ?debugState=1      → Inspector de estado + QTE Debugger
//                        (F freeze · . +1 frame · Shift+. +10)
//   ?debugCinematics=1 → timeline cinematográfico (Space/←→/R)
// ═══════════════════════════════════════════════════════════
import { useState } from 'react';
import { Bug, Clapperboard, Cpu, Play } from 'lucide-react';
import { FORMS, CHARACTERS, ROM_ORDERED_FORM_IDS } from '../data/roster';
import { STORY_ENEMY_DECKS } from '../data/enemy_decks';
import { BATTLE_PRESENTATION_DEPLOYMENT } from '../renderer/pixi/flag';
const CHAPTERS = Object.keys(STORY_ENEMY_DECKS).map(Number).sort((a, b) => a - b);

interface Props {
  onLaunchBattle?: (playerFormId: string, enemyFormId: string, chapter: number | null) => void;
  /** true cuando se renderiza dentro de un contenedor con header propio (Combat Lab) */
  embedded?: boolean;
}

export function BattleLabModule({ onLaunchBattle, embedded }: Props) {
  const [player, setPlayer] = useState('gohan_young');
  const [enemy, setEnemy] = useState('piccolo_base');
  const [mode, setMode] = useState<'versus' | 'story'>('versus');
  const [chapter, setChapter] = useState(1);
  const [debugState, setDebugState] = useState(() => new URLSearchParams(window.location.search).has('debugState'));
  const [debugCinematics, setDebugCinematics] = useState(() => new URLSearchParams(window.location.search).has('debugCinematics'));
  const [pixiField, setPixiField] = useState(() => new URLSearchParams(window.location.search).has('pixiField'));

  const charName = (fid: string) => {
    const f = FORMS[fid];
    return f ? `${f.character} / ${f.form}` : fid;
  };

  const launch = () => {
    const url = new URL(window.location.href);
    const setFlag = (key: string, enabled: boolean) => {
      if (enabled) url.searchParams.set(key, '1');
      else url.searchParams.delete(key);
    };
    setFlag('debugState', debugState);
    setFlag('debugCinematics', debugCinematics);
    setFlag('pixiField', pixiField);
    window.history.replaceState(null, '', url.toString());
    if (onLaunchBattle) onLaunchBattle(player, enemy, mode === 'story' ? chapter : null);
  };

  return (
    <div className="dev-panel">
      {!embedded && (
        <header className="dev-header">
          <h1>Battle Lab</h1>
          <p className="dev-sub">Combate instantáneo real + depurador — elige matchup y lanza el motor de batalla.</p>
        </header>
      )}

      <div className="dev-battlelab-layout">
        <div className="dev-sprite-controls">
          <label>Player (forma)</label>
          <select value={player} onChange={e => setPlayer(e.target.value)}>
            {ROM_ORDERED_FORM_IDS.map(fid => <option key={fid} value={fid}>{charName(fid)}</option>)}
          </select>

          <label>Enemy (forma)</label>
          <select value={enemy} onChange={e => setEnemy(e.target.value)}>
            {ROM_ORDERED_FORM_IDS.map(fid => <option key={fid} value={fid}>{charName(fid)}</option>)}
          </select>

          <label>Modo</label>
          <div className="dev-pose-pills">
            <button className={`dev-pose-pill ${mode === 'versus' ? 'active' : ''}`}
              onClick={() => setMode('versus')}>Versus</button>
            <button className={`dev-pose-pill ${mode === 'story' ? 'active' : ''}`}
              onClick={() => setMode('story')}>Historia</button>
          </div>

          {mode === 'story' && (
            <>
              <label>Capítulo (mazo del jefe)</label>
              <select value={chapter} onChange={e => setChapter(Number(e.target.value))}>
                {CHAPTERS.map(c => (
                  <option key={c} value={c}>{c} — {STORY_ENEMY_DECKS[c].length} cartas</option>
                ))}
              </select>
            </>
          )}

          <label>Depuración</label>
          <div className="dev-debug-toggles">
            <button className={`dev-toggle ${debugState ? 'active' : ''}`} onClick={() => setDebugState(v => !v)} type="button" aria-pressed={debugState} aria-label="Activar inspector de estado">
              <Bug size={14} /> Estado
            </button>
            <button className={`dev-toggle ${debugCinematics ? 'active' : ''}`} onClick={() => setDebugCinematics(v => !v)} type="button" aria-pressed={debugCinematics} aria-label="Activar depurador cinematográfico">
              <Clapperboard size={14} /> Cinemática
            </button>
            <button className={`dev-toggle ${pixiField ? 'active' : ''}`} onClick={() => setPixiField(v => !v)} type="button" aria-pressed={pixiField} aria-label="Activar renderer Pixi en batalla">
              <Cpu size={14} /> Pixi
            </button>
          </div>

          <button className="dev-launch-btn" onClick={launch} disabled={!onLaunchBattle}>
            <Play size={15} /> Lanzar combate
          </button>
        </div>

        <div className="dev-battlelab-readout">
          <div><label>Matchup</label><strong>{charName(player)} vs {charName(enemy)}</strong></div>
          <div><label>Modo</label><strong>{mode === 'story' ? `Historia · cap. ${chapter}` : 'Versus'}</strong></div>
          <div><label>Personajes registrados</label><strong>{CHARACTERS.length} · formas {Object.keys(FORMS).length}</strong></div>
          <div><label>Debug</label><strong>{[
            debugState ? 'estado' : null,
            debugCinematics ? 'cinematica' : null,
            pixiField ? 'pixi' : null,
          ].filter(Boolean).join(' · ') || 'off'}</strong></div>
          <div><label>Motor</label><strong className="dev-ok">conectado — lanza BattleScreen real</strong></div>
          <div><label>Renderer de este lanzamiento</label><strong className={pixiField ? 'dev-ok' : ''}>{pixiField ? 'PIXI ROM + DOM PARALLEL' : BATTLE_PRESENTATION_DEPLOYMENT.defaultRenderer}</strong></div>
          <div><label>Ruta por carta</label><strong>ROM_ROUTE / LEGACY — resuelta en runtime</strong></div>
          <div><label>Completion owner</label><strong>{BATTLE_PRESENTATION_DEPLOYMENT.legacyCompletionOwner ? 'DOM LEGACY onDone' : 'ROM RUNTIME'}</strong></div>
          <div><label>Inspector BattleScreen</label><strong>{debugState && debugCinematics ? 'estado + cue/tick activos' : 'activa Estado + Cinemática'}</strong></div>
          <p className="dev-hint" style={{ marginTop: 12 }}>
            Este panel lanza la BattleScreen real y es el gate end-to-end.{' '}
            <strong>Timeline → Runtime Sandbox</strong> crea otra instancia aislada para
            pausa/step; no observa esta partida.
          </p>
        </div>
      </div>
    </div>
  );
}
