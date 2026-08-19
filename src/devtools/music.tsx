// ═══════════════════════════════════════════════════════════
// Dev Studio — Música (BSO)
// Player de las 20 pistas del juego + mapeo de contexto.
// ═══════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Play, Square, Music as MusicIcon, MapPin } from 'lucide-react';
import { MUSIC_TRACK_LIST, MUSIC_TRACKS, SCREEN_MUSIC, musicForScreen, type MusicTrackId } from '../audio/music';

// DEV-SYNC: sin tabla paralela — el mapeo se visualiza desde SCREEN_MUSIC
// (fuente única que también consume musicForScreen). Etiquetas legibles.
const SCREEN_LABELS: Record<string, string> = {
  main: 'main (título)', story: 'story', storyScene: 'storyScene', battle: 'battle (normal)',
  versus: 'versus', deck: 'deck', cards: 'cards', characters: 'characters', settings: 'settings',
};

export default function MusicPage() {
  const [current, setCurrent] = useState<MusicTrackId | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: MusicTrackId) => {
    if (current === id && playing) {
      const el = document.getElementById('dev-music-player') as HTMLAudioElement | null;
      el?.pause();
      setPlaying(false);
      return;
    }
    const el = document.getElementById('dev-music-player') as HTMLAudioElement | null;
    if (!el) return;
    const track = MUSIC_TRACKS[id];
    el.src = track.file;
    el.loop = track.loop;
    el.volume = 0.8;
    el.play().then(() => setPlaying(true)).catch(() => setError('Autoplay bloqueado: pulsa reproducir de nuevo.'));
    setCurrent(id);
    setError(null);
  };

  return (
    <div className="dev-panel">
      <h1><MusicIcon size={16} /> Música — BSO del juego</h1>
      <p className="dev-muted">
        Rip Zophar's Domain «Dragon Ball Z - Legendary Super Warriors (MP3)» — 20 pistas identificadas por
        huella espectral contra la tracklist khinsider y recodificadas a MP3 mono 22.05kHz 64kbps (21.5MB).
      </p>

      <audio id="dev-music-player" onEnded={() => setPlaying(false)} style={{ display: 'none' }} />

      {error && <div className="dev-banner dev-banner-bad">{error}</div>}

      <div className="dev-section">
        <h3>Pistas</h3>
        <div className="music-grid">
          {MUSIC_TRACK_LIST.map(t => (
            <button key={t.id}
              className={`music-cell ${current === t.id && playing ? 'playing' : ''}`}
              onClick={() => toggle(t.id)}
              title={t.file}>
              <span className="music-cell-icon">
                {current === t.id && playing ? <Square size={12} /> : <Play size={12} />}
              </span>
              <span className="music-cell-name">{t.label}</span>
              <span className={`dev-tag ${t.category === 'bgm' ? 'ok' : 'bad'}`}>{t.category === 'bgm' ? 'loop' : '1-shot'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="dev-section">
        <h3>Mapeo de contexto</h3>
        <table className="dev-table">
          <thead><tr><th>Contexto</th><th>Pista</th></tr></thead>
          <tbody>
            {Object.entries(SCREEN_MUSIC).map(([screen, id]) => (
              <tr key={screen}>
                <td>{SCREEN_LABELS[screen] ?? screen}</td>
                <td>
                  <button className="linklike" onClick={() => toggle(id)}>
                    <MapPin size={10} /> {MUSIC_TRACKS[id].label}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="dev-muted">
          <code>src/audio/music.ts</code> — <code>musicForScreen(screen)</code> + hook en <code>main.tsx</code>;
          victoria/derrota por fase del combate; jefes (cap ≥15) con Epic Battle.
        </p>
      </div>
    </div>
  );
}
