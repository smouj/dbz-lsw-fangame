// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Dashboard: estado de producción con contadores
// reales computados de los datos del juego (nada hardcodeado).
// ═══════════════════════════════════════════════════════════
import { FORMS, CHARACTERS } from '../data/roster';
import { CARDS } from '../data/cards';
import { STORY_ENEMY_DECKS, TEAM_BATTLES } from '../data/enemy_decks';
import { SCENARIOS } from '../data/scenarios';
import { spriteDirFor } from '../data/spriteManifest';
import { ACTION_FIDELITY_REGISTRY, FidelityLevel } from '../data/actionFidelity';
import { listActionProfiles } from '../battle/actionProfiles';
import type { DevModuleId } from './DevStudio';

interface StatCard { label: string; value: number; total: number; ok: boolean; hint?: string; }

export function DashboardModule({ onNavigate }: { onNavigate: (m: DevModuleId) => void }) {
  const forms = Object.values(FORMS);
  const cards = CARDS;
  const deckCount = Object.keys(STORY_ENEMY_DECKS).length;
  const teamCount = Object.keys(TEAM_BATTLES).length;
  const chapterCount = Object.keys(STORY_ENEMY_DECKS).length;
  const spriteDirs = forms.filter(f => spriteDirFor(f.id)).length;
  const bgCount = SCENARIOS.length;
  const fidelityRows = Object.values(FidelityLevel).map(level => {
    const count = Object.values(ACTION_FIDELITY_REGISTRY).filter(a => a.fidelity === level).length;
    return { level, count };
  });
  const fidelityTotal = Math.max(1, Object.keys(ACTION_FIDELITY_REGISTRY).length);
  const signatureProfiles = listActionProfiles();

  const stats: StatCard[] = [
    { label: 'Formas (ROM 48)', value: forms.length, total: 48, ok: forms.length === 48 },
    { label: 'Personajes', value: CHARACTERS.length, total: CHARACTERS.length, ok: CHARACTERS.length >= 24, hint: `${CHARACTERS.length} jugables` },
    { label: 'Cartas (ROM 125)', value: cards.length, total: 125, ok: cards.length === 125 },
    { label: 'Mazos de jefes', value: deckCount, total: 32, ok: deckCount >= 30 },
    { label: 'Combates de equipo', value: teamCount, total: teamCount, ok: teamCount > 0, hint: `${teamCount} cap. 2v2` },
    { label: 'Capítulos', value: chapterCount, total: 32, ok: chapterCount >= 32 },
    { label: 'Dirs de sprites', value: spriteDirs, total: 48, ok: spriteDirs >= 42 },
    { label: 'Escenarios', value: bgCount, total: 13, ok: bgCount >= 13 },
    { label: 'Perfiles firma', value: signatureProfiles.length, total: signatureProfiles.length, ok: signatureProfiles.length >= 12, hint: 'mín. 12' },
  ];

  // Cobertura de sprites por forma: cuántas formas tienen dir de combate
  const withSprite = forms.filter(f => spriteDirFor(f.id)).length;
  const spritePct = Math.round((withSprite / Math.max(1, forms.length)) * 100);

  const alerts: { level: 'warn' | 'info'; text: string }[] = [];
  if (forms.length !== 48) alerts.push({ level: 'warn', text: `Faltan ${48 - forms.length} formas de la ROM (stats_full.json tiene 48).` });
  if (cards.length !== 125) alerts.push({ level: 'warn', text: `Faltan ${125 - cards.length} cartas de la tabla ROM.` });
  if (spritePct < 100) alerts.push({ level: 'info', text: `${forms.length - withSprite} formas sin sprite de combate animado (fallback sheet/procedural).` });
  if (signatureProfiles.length < 12) alerts.push({ level: 'warn', text: `Solo ${signatureProfiles.length}/12 perfiles firma registrados.` });
  alerts.push({ level: 'info', text: 'Stage Attack: ventanas BACK_BACK 1.2s · BACK_FRONT 1.7s · FRONT_BACK 2.4s · FRONT_FRONT 2.9s (manual USA).' });
  alerts.push({ level: 'info', text: 'Contraataque: A≈0.4s / B≈0.15s — HYPOTHESIS hasta captura ROM.' });
  alerts.push({ level: 'info', text: 'Desempate de SPD inicial: 50/50 aleatorio — UNKNOWN hasta ROM.' });

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Estado de producción</h1>
        <p className="dev-sub">Contadores computados de los datos reales — si algo difiere, el dato es la fuente.</p>
      </header>

      <div className="dev-grid dev-grid-cards">
        {stats.map(s => (
          <div key={s.label} className={`dev-stat-card ${s.ok ? 'ok' : 'bad'}`}>
            <div className="dev-stat-value">{s.value}<span className="dev-stat-total">/{s.total || '—'}</span></div>
            <div className="dev-stat-label">{s.label}</div>
            {s.hint && <div className="dev-stat-hint">{s.hint}</div>}
            <div className="dev-stat-bar"><div style={{ width: `${Math.min(100, (s.value / Math.max(1, s.total)) * 100)}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="dev-section">
        <h2>Fidelidad</h2>
        <div className="dev-fidelity">
          {fidelityRows.map(f => {
            const pct = Math.round((f.count / fidelityTotal) * 100);
            const color = f.level === FidelityLevel.FRAME_VERIFIED ? '#7fd4ff'
              : f.level === FidelityLevel.VERIFIED ? '#3fae5a'
              : f.level === FidelityLevel.INFERRED ? '#d8a830'
              : '#c04040';
            return (
            <div key={f.level} className="dev-fid-row">
              <span className="dev-fid-label">{f.level}</span>
              <div className="dev-fid-track"><div style={{ width: `${pct}%`, background: color }} /></div>
              <span className="dev-fid-pct">{f.count}/{fidelityTotal}</span>
            </div>
            );
          })}
          <div className="dev-fid-note">
            Sprites de combate: <strong>{withSprite}/{forms.length}</strong> formas con dir animado ({spritePct}%). Perfiles firma: <strong>{signatureProfiles.length}</strong>.
          </div>
        </div>
      </div>

      <div className="dev-section">
        <h2>Alertas</h2>
        <ul className="dev-alerts">
          {alerts.map((a, i) => (
            <li key={i} className={`dev-alert ${a.level}`}><strong>{a.level.toUpperCase()}</strong> {a.text}</li>
          ))}
        </ul>
      </div>

      <div className="dev-section">
        <h2>Atajos</h2>
        <div className="dev-shortcuts">
          <button className="dev-btn" onClick={() => onNavigate('characters')}>Character Studio</button>
          <button className="dev-btn" onClick={() => onNavigate('cards')}>Card Database</button>
          <button className="dev-btn" onClick={() => onNavigate('sprites')}>Sprite Inspector</button>
          <button className="dev-btn" onClick={() => onNavigate('positions')}>Position Lab</button>
          <button className="dev-btn" onClick={() => onNavigate('validation')}>Validación</button>
        </div>
      </div>
    </div>
  );
}
