// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Battle Lab
// Combate instantáneo: elige formas + modo (Versus / capítulo de
// historia) y lanza el BattleScreen real con ese estado inicial.
// El Internal State Inspector (fase/CC/posiciones/stages en vivo)
// y el QTE Debugger (freeze + step) siguen como siguiente fase.
// ═══════════════════════════════════════════════════════════
import { useState } from 'react';
import { FORMS, CHARACTERS } from '../data/roster';
import { STORY_ENEMY_DECKS } from '../data/enemy_decks';

const CHAPTERS = Object.keys(STORY_ENEMY_DECKS).map(Number).sort((a, b) => a - b);

interface Props {
  onLaunchBattle?: (playerFormId: string, enemyFormId: string, chapter: number | null) => void;
}

export function BattleLabModule({ onLaunchBattle }: Props) {
  const [player, setPlayer] = useState('gohan_young');
  const [enemy, setEnemy] = useState('piccolo_base');
  const [mode, setMode] = useState<'versus' | 'story'>('versus');
  const [chapter, setChapter] = useState(1);

  const charName = (fid: string) => {
    const f = FORMS[fid];
    return f ? `${f.character} / ${f.form}` : fid;
  };

  const launch = () => {
    if (onLaunchBattle) onLaunchBattle(player, enemy, mode === 'story' ? chapter : null);
  };

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Battle Lab</h1>
        <p className="dev-sub">Combate instantáneo real + depurador — elige matchup y lanza el motor de batalla.</p>
      </header>

      <div className="dev-wip-banner">
        ⚠ El <em>Internal State Inspector</em> (fase/CC/posiciones/stages en vivo) y el
        <em> QTE Debugger</em> (freeze + step) siguen en desarrollo. Ahora mismo puedes
        lanzar combates reales con cualquier matchup sin jugar la partida completa.
      </div>

      <div className="dev-battlelab-layout">
        <div className="dev-sprite-controls">
          <label>Player (forma)</label>
          <select value={player} onChange={e => setPlayer(e.target.value)}>
            {Object.keys(FORMS).map(fid => <option key={fid} value={fid}>{charName(fid)}</option>)}
          </select>

          <label>Enemy (forma)</label>
          <select value={enemy} onChange={e => setEnemy(e.target.value)}>
            {Object.keys(FORMS).map(fid => <option key={fid} value={fid}>{charName(fid)}</option>)}
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

          <button className="dev-launch-btn" onClick={launch} disabled={!onLaunchBattle}>
            ⚔ Lanzar combate
          </button>
        </div>

        <div className="dev-battlelab-readout">
          <div><label>Matchup</label><strong>{charName(player)} vs {charName(enemy)}</strong></div>
          <div><label>Modo</label><strong>{mode === 'story' ? `Historia · cap. ${chapter}` : 'Versus'}</strong></div>
          <div><label>Personajes registrados</label><strong>{CHARACTERS.length} · formas {Object.keys(FORMS).length}</strong></div>
          <div><label>Motor</label><strong className="dev-ok">conectado — lanza BattleScreen real</strong></div>
        </div>
      </div>
    </div>
  );
}
