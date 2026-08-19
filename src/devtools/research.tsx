// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Research / F0 Ground Truth
// Vocabulario de evidencia F0 (único):
//   FRAME_VERIFIED · VIDEO_VERIFIED · ROM_ASSET_VERIFIED ·
//   MANUAL_VERIFIED · INFERRED
// Nada funcional se etiqueta como canon GBC sin evidencia trazable.
// ═══════════════════════════════════════════════════════════
import { FORMS, CHARACTERS } from '../data/roster';
import { CARDS } from '../data/cards';
import { STORY_ENEMY_DECKS, TEAM_BATTLES } from '../data/enemy_decks';
import { spriteDirFor } from '../data/spriteManifest';
import { GBC_CINEMATIC_CANON } from '../battle/cinematic/GbcCinematicCanon';
import { getDevProjectSnapshot } from './devSnapshot';

/** Niveles de evidencia F0 (schema único — isGbcCanon solo acepta
 *  FRAME_VERIFIED / VIDEO_VERIFIED). */
export type F0Fidelity =
  | 'FRAME_VERIFIED' | 'VIDEO_VERIFIED'
  | 'ROM_ASSET_VERIFIED' | 'MANUAL_VERIFIED' | 'INFERRED';

interface Finding {
  topic: string;
  status: F0Fidelity;
  note: string;
}

export function ResearchModule() {
  const snap = getDevProjectSnapshot();
  const forms = Object.values(FORMS);
  const withDir = forms.filter(f => spriteDirFor(f.id)).length;

  const findings: Finding[] = [
    { topic: 'Tabla de cartas ROM', status: 'ROM_ASSET_VERIFIED', note: `${CARDS.length} cartas de la tabla 0x044315 (125×16 bytes).` },
    { topic: 'Roster', status: 'ROM_ASSET_VERIFIED', note: `${forms.length} formas / ${CHARACTERS.length} personajes de stats_full.json.` },
    { topic: 'Mazos de jefes', status: 'MANUAL_VERIFIED', note: `${Object.keys(STORY_ENEMY_DECKS).length} mazos del spreadsheet oficial (legendarysuperwarriors.wordpress.com).` },
    { topic: 'Stage Attack windows', status: 'MANUAL_VERIFIED', note: 'BACK_BACK 1.2s · BACK_FRONT 1.7s · FRONT_BACK 2.4s · FRONT_FRONT 2.9s (manual USA §9).' },
    { topic: 'Contraataque A/B', status: 'INFERRED', note: 'A≈0.4s (bancar CC) / B≈0.15s (reparar). Pendiente de captura forense ROM.' },
    { topic: 'Iniciativa por SPD (reorden por turno)', status: 'MANUAL_VERIFIED', note: 'SPD decide quién ataca primero; el orden se recalcula cada turno (si la Speed cambia, el siguiente turno invierte). Empate → persiste la iniciativa actual (determinista en el Engine).' },
    { topic: 'Modificadores tácticos', status: 'INFERRED', note: 'FRONT=+atk/−def, BACK=−atk/+def; valores exactos sin medir.' },
    { topic: 'Sprites de combate (manifest runtime)', status: 'ROM_ASSET_VERIFIED', note: `${withDir}/${forms.length} formas con manifest.json — ${snap.sprites.poseOrder} poses en COMBAT_POSE_ORDER.` },
    { topic: 'Combates 2v2', status: 'MANUAL_VERIFIED', note: `Caps ${Object.keys(TEAM_BATTLES).join(', ')} (walkthrough).` },
    { topic: 'Crecimiento de stats', status: 'ROM_ASSET_VERIFIED', note: 'Curvas por cuartos 25/50/75/100 extraídas de la ROM.' },
    { topic: 'Secuencias cinematográficas GBC (F0)', status: snap.cinematics.gbcVerified > 0 ? 'FRAME_VERIFIED' : 'INFERRED', note: `${snap.cinematics.gbcFamilies} familias declaradas · ${snap.cinematics.gbcVerified} con evidencia verificada · ${snap.cinematics.gbcInferred} INFERRED. Hasta F0, una secuencia funcional NO se llama canon GBC.` },
  ];

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Research / F0 Ground Truth</h1>
        <p className="dev-sub">
          Vocabulario F0: <code>FRAME_VERIFIED</code> · <code>VIDEO_VERIFIED</code> ·{' '}
          <code>ROM_ASSET_VERIFIED</code> · <code>MANUAL_VERIFIED</code> · <code>INFERRED</code>.
          Nada funcional se etiqueta como canon GBC sin evidencia trazable.
        </p>
      </header>

      <div className="dev-sources">
        <h2>Fuentes</h2>
        <ul className="dev-alerts">
          <li className="dev-alert info"><strong>INFO</strong> ROM USA — SHA-256 <code>8dab48cc…</code> / CRC32 <code>025AA88A</code> (tabla cartas, stats, mazos, curvas).</li>
          <li className="dev-alert info"><strong>INFO</strong> Manual USA §9-§10 — Stage Attack, posiciones, movimiento.</li>
          <li className="dev-alert info"><strong>INFO</strong> Spreadsheet oficial — mazos de jefes + AI boosts (wordpress).</li>
          <li className="dev-alert info"><strong>INFO</strong> Walkthrough / foros (RPGClassics) — vulnerabilidades Air/Ground, 2v2.</li>
          <li className="dev-alert info"><strong>INFO</strong> Showcases de vídeo — material para F0 (VIDEO_VERIFIED pendiente de catalogar por clip).</li>
          <li className="dev-alert warn"><strong>WARN</strong> Captura forense de ROM pendiente para timing de contraataque y desempates de SPD.</li>
        </ul>
      </div>

      <div className="dev-checks">
        {findings.map(f => (
          <div key={f.topic} className={`dev-finding dev-finding-${f.status.toLowerCase()}`}>
            <span className="dev-finding-badge">{f.status}</span>
            <div className="dev-finding-body">
              <div className="dev-finding-topic">{f.topic}</div>
              <div className="dev-finding-note">{f.note}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dev-section">
        <h2>Corpus de evidencia F0 (GBC_CINEMATIC_CANON)</h2>
        <div className="dev-table-wrap">
          <table className="dev-table">
            <thead><tr><th>#</th><th>Familia</th><th>Fidelity</th><th>Fuente</th><th>Beats</th></tr></thead>
            <tbody>
              {GBC_CINEMATIC_CANON.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td><code>{s.id}</code></td>
                  <td><span className={`dev-tag ${s.evidence.fidelity === 'INFERRED' ? '' : 'ok'}`}>{s.evidence.fidelity}</span></td>
                  <td className="dev-cell-muted">{s.evidence.source.slice(0, 60)}</td>
                  <td>{s.beats.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {snap.cinematics.gbcVerified === 0 && (
          <p className="dev-muted" style={{ marginTop: 6 }}>
            GBC_CINEMATIC_CANON con 0 entradas verificadas es válido: las 20 familias declaradas son el
            armazón INFERRED hasta observar el GBC en vídeo (F0).
          </p>
        )}
      </div>
    </div>
  );
}
