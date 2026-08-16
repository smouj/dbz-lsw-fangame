// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Research / ROM
// Estado de fidelidad y fuentes (ROM USA CRC32 025AA88A, manual, foros).
// Etiquetas: CONFIRMED_MANUAL · HYPOTHESIS · UNKNOWN · FRAME_VERIFIED.
// ═══════════════════════════════════════════════════════════
import { FORMS, CHARACTERS } from '../data/roster';
import { CARDS } from '../data/cards';
import { STORY_ENEMY_DECKS, TEAM_BATTLES } from '../data/enemy_decks';
import { spriteDirFor } from '../data/spriteManifest';

interface Finding {
  topic: string;
  status: 'CONFIRMED_MANUAL' | 'FRAME_VERIFIED' | 'HYPOTHESIS' | 'UNKNOWN';
  note: string;
}

export function ResearchModule() {
  const forms = Object.values(FORMS);
  const withDir = forms.filter(f => spriteDirFor(f.id)).length;

  const findings: Finding[] = [
    { topic: 'Tabla de cartas ROM', status: 'FRAME_VERIFIED', note: `${CARDS.length} cartas de la tabla 0x044315 (125×16 bytes).` },
    { topic: 'Roster', status: 'FRAME_VERIFIED', note: `${forms.length} formas / ${CHARACTERS.length} personajes de stats_full.json.` },
    { topic: 'Mazos de jefes', status: 'CONFIRMED_MANUAL', note: `${Object.keys(STORY_ENEMY_DECKS).length} mazos del spreadsheet oficial (legendarysuperwarriors.wordpress.com).` },
    { topic: 'Stage Attack windows', status: 'CONFIRMED_MANUAL', note: 'BACK_BACK 1.2s · BACK_FRONT 1.7s · FRONT_BACK 2.4s · FRONT_FRONT 2.9s (manual USA §9).' },
    { topic: 'Contraataque A/B', status: 'HYPOTHESIS', note: 'A≈0.4s (bancar CC) / B≈0.15s (reparar). Pendiente de captura forense ROM.' },
    { topic: 'Desempate SPD inicial', status: 'UNKNOWN', note: '50/50 aleatorio hasta medir en ROM.' },
    { topic: 'Modificadores tácticos', status: 'HYPOTHESIS', note: 'FRONT=+atk/−def, BACK=−atk/+def; valores exactos sin medir.' },
    { topic: 'Sprites de combate V5', status: 'FRAME_VERIFIED', note: `${withDir}/${forms.length} formas con manifest.json (8-9 poses).` },
    { topic: 'Combates 2v2', status: 'CONFIRMED_MANUAL', note: `Caps ${Object.keys(TEAM_BATTLES).join(', ')} (walkthrough).` },
    { topic: 'Crecimiento de stats', status: 'FRAME_VERIFIED', note: 'Curvas por cuartos 25/50/75/100 extraídas de la ROM.' },
  ];

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Research / ROM</h1>
        <p className="dev-sub">Fuentes y nivel de verificación de cada mecánica. Nada marcado VERIFIED sin captura.</p>
      </header>

      <div className="dev-sources">
        <h2>Fuentes</h2>
        <ul className="dev-alerts">
          <li className="dev-alert info"><strong>INFO</strong> ROM USA — CRC32 <code>025AA88A</code> (tabla cartas, stats, mazos, curvas).</li>
          <li className="dev-alert info"><strong>INFO</strong> Manual USA §9-§10 — Stage Attack, posiciones, movimiento.</li>
          <li className="dev-alert info"><strong>INFO</strong> Spreadsheet oficial — mazos de jefes + AI boosts (wordpress).</li>
          <li className="dev-alert info"><strong>INFO</strong> Walkthrough / foros (RPGClassics) — vulnerabilidades Air/Ground, 2v2.</li>
          <li className="dev-alert warn"><strong>WARN</strong> Captura forense de ROM pendiente para desempates de SPD y timing de contraataque.</li>
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
    </div>
  );
}
