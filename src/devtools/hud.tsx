// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — HUD Studio
// CONFIGURADOR del tema HUD: colores, HUD, cartas, posición, escala y
// tipografía (33 variables CSS reales consumidas por el juego). El preview
// muestra el HUD con el tema actual (paridad dev↔juego: mismas clases y
// variables). NO es un simulador de combate — las demos/batallas viven en
// el Combat Lab. "Aplicar al juego" inyecta las variables en :root y
// persiste en localStorage.
// ═══════════════════════════════════════════════════════════════════════
import { Check, Download, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  HUD_THEME_VARS, HudTheme, currentHudTheme, defaultHudTheme,
  saveHudTheme, applyHudTheme, resetHudTheme,
} from '../data/hudTheme';
import { battleOverworldActorUrl } from '../data/battleOverworld';
import { SCENARIOS } from '../data/scenarios';
import { getForm } from '../data/roster';
import { spriteDirFor, spriteFrameUrl } from '../data/spriteManifest';
import { BATTLE_PORTRAITS } from '../data/battlePortraits';
import { downloadJson } from './spriteEditing';
import { getCard, CARD_TYPE_NAMES, CARD_COLORS, CardDef } from '../data/cards';
import { cardIconUrl } from '../data/icons';
import { FitArt } from '../components/FitArt';
import { CARD_FRAME_BY_TYPE, CARD_FRAME_SELECTED, CARD_FRAME_DISABLED } from '../data/cardVisuals';

// Formas de ejemplo del mockup (Goku vs Piccolo, como el Battle Lab).
const P_FORM = 'goku_base';
const E_FORM = 'piccolo_base';

const GROUPS = ['Colores', 'HUD', 'Cartas', 'Posición', 'Escala', 'Tipografía'];

// Vista del preview: cómo se ve el HUD en cada estado (sin motor — visual).
type HudView = 'COMMAND' | 'MANO' | 'DIALOGO' | 'INTRO' | 'BASIC' | 'LIMIT';

const VIEWS: { id: HudView; label: string; tip: string }[] = [
  { id: 'COMMAND', label: 'Comando', tip: 'Command strip: LIMIT · JOINT · BASIC' },
  { id: 'MANO', label: 'JOINT · Mano', tip: 'Cartas de la mano con sus frames GBC' },
  { id: 'DIALOGO', label: 'Diálogo', tip: 'Cuadro de mensaje GBC estructurado' },
  { id: 'BASIC', label: 'BASIC', tip: 'Stage Attack (frame de carta) · Gather · Back' },
  { id: 'LIMIT', label: 'LIMIT', tip: 'Cartas LIMITED del personaje' },
  { id: 'INTRO', label: 'Intro', tip: 'Presentación de inicio (VS + READY/FIGHT)' },
];

function PreviewHpBar({ current, max, side }: { current: number; max: number; side: 'left' | 'right' }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className={`hp-bar ${side}`}>
      <div className="hp-bar-track">
        <div className="hp-bar-recent" style={{ width: `${pct + 8}%` }} />
        <div className="hp-bar-current" style={{ width: `${pct}%` }} />
        <div className="hp-bar-text">{current}/{max}</div>
      </div>
    </div>
  );
}

// Carta GBC real: mismo render que el juego (frame por tipo + arte centrado)
function HudCard({ card, selected, disabled }: { card: CardDef; selected?: boolean; disabled?: boolean }) {
  const frame = disabled ? CARD_FRAME_DISABLED : selected ? CARD_FRAME_SELECTED : (CARD_FRAME_BY_TYPE[card.type] ?? undefined);
  const iconUrl = cardIconUrl(card.id);
  const color = CARD_COLORS[card.type];
  return (
    <button className={`card ${card.type} ${selected ? 'selected' : ''}`} disabled={disabled}
      style={{ '--card-color': color, '--card-frame': frame ? `url('${frame}')` : undefined } as React.CSSProperties}
      data-tip={`${card.name} — ${CARD_TYPE_NAMES[card.type]}\nCC ${card.cc} · ATK ${card.atk > 0 ? card.atk : '—'} · ACC ${card.acc}%\n${card.description ?? ''}`}>
      <div className="card-art">
        {iconUrl
          ? <FitArt src={iconUrl} areaW={64} areaH={48} className="card-art-img" />
          : <span className="card-icon-emoji">?</span>}
      </div>
    </button>
  );
}

export function HudModule() {
  const [theme, setTheme] = useState<HudTheme>(() => currentHudTheme());
  const [status, setStatus] = useState('');
  const [view, setView] = useState<HudView>('COMMAND');

  const player = useMemo(() => getForm(P_FORM), []);
  const enemy = useMemo(() => getForm(E_FORM), []);
  const pDir = player ? spriteDirFor(player.id) : undefined;
  const eDir = enemy ? spriteDirFor(enemy.id) : undefined;
  const pIdle = battleOverworldActorUrl(P_FORM, 'idle') ?? (pDir ? spriteFrameUrl(player!.id, `${pDir}_idle_00.png`) : undefined);
  const eIdle = battleOverworldActorUrl(E_FORM, 'idle') ?? (eDir ? spriteFrameUrl(enemy!.id, `${eDir}_idle_00.png`) : undefined);
  const pPortrait = BATTLE_PORTRAITS[P_FORM];
  const ePortrait = BATTLE_PORTRAITS[E_FORM];
  const battleBgUrl = SCENARIOS[0]?.overviewBackground ?? '/assets/backgrounds/scenarios/01_world.png';

  // Cartas reales del catálogo para la vista Mano (como el build)
  const handCards = [13, 7, 5, 1].map(id => getCard(id)).filter((c): c is CardDef => !!c);
  const limitCards = [87, 46].map(id => getCard(id)).filter((c): c is CardDef => !!c);

  const setVar = (key: string, val: string) => setTheme(prev => ({ ...prev, [key]: val }));

  const apply = () => {
    saveHudTheme(theme);
    applyHudTheme(theme);
    setStatus('✓ Aplicado al juego (persistido en localStorage)');
    setTimeout(() => setStatus(''), 2600);
  };

  const resetTheme = () => {
    resetHudTheme();
    setTheme(defaultHudTheme());
    setStatus('↺ Restablecido a los valores por defecto de :root');
    setTimeout(() => setStatus(''), 2600);
  };

  const exportJson = () => downloadJson('hud-theme.json', theme);

  const mockVars = useMemo(() => {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(theme)) o[k] = v;
    return o as React.CSSProperties;
  }, [theme]);

  return (
    <div className="dev-hud">
      <div className="dev-hud-head">
        <div>
          <h1>HUD Studio</h1>
          <p className="dev-hud-sub">
            Configurador del tema HUD: 33 variables CSS reales (colores, HUD, cartas,
            posición, escala, tipografía) con paridad dev↔juego. El preview muestra el
            HUD con el tema actual; <strong>Aplicar al juego</strong> lo inyecta en{' '}
            <code>:root</code> y lo persiste. Las demos y batallas viven en el{' '}
            <strong>Combat Lab</strong>.
          </p>
        </div>
        <div className="dev-hud-actions">
          <button className="dev-btn dev-btn-primary" onClick={apply}><Check size={15} /> Aplicar al juego</button>
          <button className="dev-btn" onClick={exportJson}><Download size={15} /> Exportar JSON</button>
          <button className="dev-btn dev-btn-danger" onClick={resetTheme}><RotateCcw size={15} /> Reset</button>
        </div>
      </div>
      {status && <div className="dev-hud-status">{status}</div>}

      <div className="dev-hud-view-select" role="tablist" aria-label="Vista del HUD">
        {VIEWS.map(v => (
          <button key={v.id} className={`dev-hud-view-chip ${view === v.id ? 'active' : ''}`}
            onClick={() => setView(v.id)} title={v.tip}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="dev-hud-grid">
        {/* ─── PREVIEW: el HUD con el tema actual (estático, paridad real) ─── */}
        <div className="dev-hud-preview" style={mockVars}>
          <div className="battle-screen view-overview dev-hud-real-preview">
            {/* INTRO */}
            {view === 'INTRO' && (
              <div className="battle-intro">
                <div className="intro-gbc-window">
                  <div className="intro-gbc-round">ROUND 1</div>
                  <div className="intro-gbc-match">
                    <div className="intro-gbc-side">
                      <div className="intro-gbc-portrait">
                        {pPortrait ? <img src={pPortrait} alt={P_FORM} /> : <span className="dev-hud-mock-ph">?</span>}
                      </div>
                      <div className="intro-gbc-name">GOKU</div>
                      <div className="intro-gbc-form">BASE</div>
                    </div>
                    <div className="intro-vs">VS</div>
                    <div className="intro-gbc-side right">
                      <div className="intro-gbc-portrait">
                        {ePortrait ? <img src={ePortrait} alt={E_FORM} /> : <span className="dev-hud-mock-ph">?</span>}
                      </div>
                      <div className="intro-gbc-name">PICCOLO</div>
                      <div className="intro-gbc-form">BASE</div>
                    </div>
                  </div>
                  <div className="intro-gbc-roles">
                    <span>ATK GOKU</span>
                    <span>DEF PICCOLO</span>
                  </div>
                  <div className="intro-ready">READY</div>
                  <div className="intro-fight">FIGHT!</div>
                </div>
                <div className="intro-flash" />
              </div>
            )}

            {/* HUD superior (siempre visible salvo INTRO) */}
            {view !== 'INTRO' && <div className="hud-top">
              <div className="fighter-hud left">
                <div className="hud-name">
                  <span className="hud-portrait">
                    {pPortrait ? <img src={pPortrait} alt="" /> : <span className="dev-hud-mock-ph">?</span>}
                  </span>
                  <strong>GOKU</strong>
                  <span className="hud-form">Base</span>
                  <span className="hud-level">LV50</span>
                </div>
                <PreviewHpBar current={720} max={1000} side="left" />
                <div className="hud-stats"><span>STR60</span><span>KI55</span><span>SPD50</span><span>CC 6</span></div>
                <div className="hud-status">
                  <span className="status-chip buff">STR+</span>
                  <span className="status-chip guard">ATK</span>
                </div>
              </div>

              <div className="fighter-hud right">
                <div className="hud-name">
                  <span className="hud-portrait">
                    {ePortrait ? <img src={ePortrait} alt="" /> : <span className="dev-hud-mock-ph">?</span>}
                  </span>
                  <strong>PICCOLO</strong>
                  <span className="hud-form">Base</span>
                  <span className="hud-level">LV50</span>
                </div>
                <PreviewHpBar current={880} max={1000} side="right" />
                <div className="hud-stats"><span>STR58</span><span>KI60</span><span>SPD48</span><span>CC 3</span></div>
                <div className="hud-status right">
                  <span className="status-chip debuff">SPD−</span>
                  <span className="status-chip none">—</span>
                </div>
              </div>
              <div className="hud-center-badge">
                <span className="hud-center-round">ROUND 1</span>
                <span className="hud-center-vs">VS</span>
                <span className="hud-center-order">GOKU</span>
              </div>
            </div>}

            <div className="battlefield">
              <div className="battle-bg authentic" style={{ backgroundImage: `url(${battleBgUrl})` }} />
              <div className="battlefield-fighters">
                <div className="fighter-container player down back" style={{ left: '30%', top: '62%' }}>
                  {pIdle && <img src={pIdle} alt="" className="overworld-sprite dev-hud-fighter-sprite" />}
                </div>
                <div className="fighter-container enemy up back" style={{ left: '70%', top: '46%' }}>
                  {eIdle && <img src={eIdle} alt="" className="overworld-sprite dev-hud-fighter-sprite" style={{ transform: 'scaleX(-1)' }} />}
                </div>
              </div>
            </div>

            <div className="phase-bar">
              <div className="phase-info">
                <span className="turn-label">TURN 1</span>
                <span className="speed-order-label">GOKU FIRST</span>
                <span className="phase-label">ATTACK 1/2</span>
              </div>
            </div>

            {/* DIÁLOGO (cuadro GBC estructurado) */}
            {view === 'DIALOGO' && (
              <div className="gbc-dialogue">
                <div className="gbc-dialogue-actor">GOKU</div>
                <div className="gbc-dialogue-text">uses KAMEHAMEHA!<span className="gbc-dialogue-cursor">▼</span></div>
              </div>
            )}

            <div className="battle-controls dev-hud-battle-controls">
              {/* COMMAND: LIMIT · JOINT · BASIC */}
              {view === 'COMMAND' && (
                <div className="command-select">
                  <div className="command-strip">
                    <button className="cmd-limit" data-tip="LIMITED — cartas exclusivas del personaje" />
                    <button className="cmd-j" data-tip="JOINT — cartas de tu mano" />
                    <button className="cmd-b" data-tip="BASIC — acciones libres sin CC" />
                  </div>
                </div>
              )}

              {/* MANO: cartas reales del catálogo con sus frames */}
              {view === 'MANO' && (
                <div className="hand-area">
                  <div className="hand-label">— MANO —</div>
                  <div className="hand-cards">
                    {handCards.map((card, i) => (
                      <HudCard key={card.id} card={card} selected={i === 1} disabled={i === 2} />
                    ))}
                  </div>
                </div>
              )}

              {/* BASIC: Stage (frame de carta) · Gather · Back */}
              {view === 'BASIC' && (
                <div className="command-select">
                  <div className="basic-menu">
                    <button className="basic-btn basic-stage" data-tip="STAGE ATTACK — 3 Stage · secuencia A/B">
                      <span className="basic-stage-icon">
                        <FitArt src={cardIconUrl(1)!} areaW={56} areaH={40} className="stage-card-icon" />
                      </span>
                    </button>
                    <button className="basic-btn basic-gather" data-tip="GATHER POWER — sube STR/KI (+8)" />
                    <button className="basic-btn basic-back" data-tip="BACK — volver al menú de comandos" />
                  </div>
                </div>
              )}

              {/* LIMIT: cartas del personaje */}
              {view === 'LIMIT' && (
                <div className="command-select">
                  <div className="limit-panel">
                    <div className="limit-title">LIMITED — GOKU</div>
                    {limitCards.map(c => (
                      <button key={c.id} className="limit-row" data-tip={`${c.name} — ${CARD_TYPE_NAMES[c.type]}\nCC ${c.cc} · Reutilizable mientras tengas CC`}>
                        <span className="limit-name">{c.name}</span>
                        <span className="limit-cost">{c.cc} CC · {c.type.toUpperCase()}</span>
                      </button>
                    ))}
                    <button className="basic-btn basic-back" data-tip="BACK — volver al menú de comandos" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── CONTROLES (tema HUD) ─── */}
        <div className="dev-hud-controls">
          {GROUPS.map(group => (
            <div key={group} className="dev-hud-group">
              <h2 className="dev-hud-group-title">{group}</h2>
              {HUD_THEME_VARS.filter(v => v.group === group).map(v => (
                <div key={v.key} className="dev-hud-row">
                  <label className="dev-hud-row-label" title={v.key}>
                    <span>{v.label}</span>
                    <code>{v.key}</code>
                  </label>
                  {v.type === 'color' ? (
                    <div className="dev-hud-color">
                      <input
                        type="color"
                        value={theme[v.key] || v.default}
                        onChange={e => setVar(v.key, e.target.value)}
                      />
                      <input
                        type="text"
                        value={theme[v.key] || v.default}
                        onChange={e => setVar(v.key, e.target.value)}
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      className="dev-hud-size"
                      value={theme[v.key] || v.default}
                      onChange={e => setVar(v.key, e.target.value)}
                    />
                  )}
                  <button
                    className="dev-hud-reset-var"
                    title={`Restablecer ${v.label}`}
                    onClick={() => setVar(v.key, v.default)}>
                    <RotateCcw size={13} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
