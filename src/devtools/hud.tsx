// ═══════════════════════════════════════════════════════════
// DEV STUDIO — HUD Studio
// Visualizador completo del gameplay (mockup del HUD + campo) y
// editor en vivo del tema HUD (variables CSS de :root). Los cambios
// se previsualizan al instante en el mockup y se aplican al juego
// real con "Aplicar al juego" (persisten en localStorage).
// ═══════════════════════════════════════════════════════════
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
import { getCard, CARD_TYPE_NAMES, CARD_COLORS } from '../data/cards';
import { cardIconUrl, TYPE_ICONS } from '../data/icons';

// Formas de ejemplo para el mockup (Goku vs Piccolo, como el Battle Lab).
const P_FORM = 'goku_base';
const E_FORM = 'piccolo_base';

const GROUPS = ['Colores', 'HUD', 'Cartas', 'Posición', 'Escala', 'Tipografía'];

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

export function HudModule() {
  const [theme, setTheme] = useState<HudTheme>(() => currentHudTheme());
  const [status, setStatus] = useState('');
  // Vista del mockup: qué apartado del HUD se muestra (como al pulsar cada botón)
  const [view, setView] = useState<'INTRO' | 'DIALOGO' | 'COMMAND' | 'JOINT' | 'BASIC' | 'LIMIT'>('COMMAND');
  const VIEWS = [
    { id: 'INTRO' as const, label: 'Intro', tip: 'Presentación de inicio (VS + READY/FIGHT)' },
    { id: 'DIALOGO' as const, label: 'Diálogo', tip: 'Cuadro de mensaje GBC durante acciones' },
    { id: 'COMMAND' as const, label: 'Comando', tip: 'LIMIT / JOINT / BASIC (fase command)' },
    { id: 'JOINT' as const, label: 'JOINT · Mano', tip: 'Cartas de la mano (fase cardSelect)' },
    { id: 'BASIC' as const, label: 'BASIC', tip: 'Stage Attack / Gather Power (acción básica)' },
    { id: 'LIMIT' as const, label: 'LIMIT', tip: 'Cartas LIMITED del personaje' },
  ];

  const player = useMemo(() => getForm(P_FORM), []);
  const enemy = useMemo(() => getForm(E_FORM), []);
  const pDir = player ? spriteDirFor(player.id) : undefined;
  const eDir = enemy ? spriteDirFor(enemy.id) : undefined;
  const pIdle = battleOverworldActorUrl(P_FORM, 'idle') ?? (pDir ? spriteFrameUrl(player!.id, `${pDir}_idle_00.png`) : undefined);
  const eIdle = battleOverworldActorUrl(E_FORM, 'idle') ?? (eDir ? spriteFrameUrl(enemy!.id, `${eDir}_idle_00.png`) : undefined);
  const pPortrait = BATTLE_PORTRAITS[P_FORM];
  const ePortrait = BATTLE_PORTRAITS[E_FORM];
  const battleBgUrl = SCENARIOS[0]?.overviewBackground ?? '/assets/backgrounds/scenarios/01_world.png';

  const setVar = (key: string, val: string) => setTheme(prev => ({ ...prev, [key]: val }));

  const apply = () => {
    saveHudTheme(theme);
    applyHudTheme(theme);
    setStatus('✓ Aplicado al juego (persistido en localStorage)');
    setTimeout(() => setStatus(''), 2600);
  };

  const reset = () => {
    resetHudTheme();
    setTheme(defaultHudTheme());
    setStatus('↺ Restablecido a los valores por defecto de :root');
    setTimeout(() => setStatus(''), 2600);
  };

  const exportJson = () => downloadJson('hud-theme.json', theme);

  // Variables CSS inyectadas en el mockup (preview en vivo).
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
            Visualizador completo del gameplay y editor del tema HUD. Los cambios se ven al
            instante en la preview; <strong>Aplicar al juego</strong> los inyecta como variables
            CSS (afecta a todo el juego) y los persiste.
          </p>
        </div>
        <div className="dev-hud-actions">
          <button className="dev-btn dev-btn-primary" onClick={apply}><Check size={15} /> Aplicar al juego</button>
          <button className="dev-btn" onClick={exportJson}><Download size={15} /> Exportar JSON</button>
          <button className="dev-btn dev-btn-danger" onClick={reset}><RotateCcw size={15} /> Reset</button>
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
        {/* ─── PREVIEW / VISUALIZADOR ─── */}
        <div className="dev-hud-preview" style={mockVars}>
          <div className="battle-screen view-overview dev-hud-real-preview">
            {/* Presentación de inicio (intro GBC) — previsualizable */}
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
                <div className="hud-stats"><span>STR60</span><span>KI55</span><span>SPD50</span></div>
                <div className="hud-status">
                  <span className="status-chip buff">STR+</span>
                  <span className="status-chip guard">GUARD</span>
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
                <div className="hud-stats"><span>STR58</span><span>KI60</span><span>SPD48</span></div>
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
                  <div className="fighter-position-tag hidden">down back</div>
                </div>
                <div className="fighter-container enemy up back" style={{ left: '70%', top: '46%' }}>
                  {eIdle && <img src={eIdle} alt="" className="overworld-sprite dev-hud-fighter-sprite" style={{ transform: 'scaleX(-1)' }} />}
                  <div className="fighter-position-tag hidden">up back</div>
                </div>
              </div>
            </div>

            <div className="phase-bar">
              <div className="phase-info">
                <span className="turn-label">TURN 1</span>
                <span className="speed-order-label">GOKU FIRST</span>
                <span className="phase-label">ACTION 1/2</span>
              </div>
              <button className="btn-exit" type="button">EXIT</button>
            </div>

            {/* Cuadro de diálogo GBC (mensajes durante acciones) — previsualizable */}
            {view === 'DIALOGO' && (
              <div className="gbc-dialogue">
                <div className="gbc-dialogue-text">GOKU uses KAMEHAMEHA!<span className="gbc-dialogue-cursor">▼</span></div>
              </div>
            )}

            <div className="battle-controls dev-hud-battle-controls">
              {/* Contenido según la vista: igual que las fases del juego real.
                  COMMAND: botones + mano juntos (misma línea, como el build al
                  entrar en cardSelect); JOINT/BASIC/LIMIT: apartados por botón. */}
              {view === 'COMMAND' && (
                <>
                  <div className="command-strip">
                    <button className="cmd-limit" data-tip="LIMITED" />
                    <button className="cmd-j" data-tip="JOINT" />
                    <button className="cmd-b" data-tip="BASIC" />
                  </div>
                  <MockHand compact />
                </>
              )}
              {view === 'JOINT' && <MockHand />}
              {view === 'BASIC' && (
                <div className="dev-hud-basic-view">
                  <div className="command-strip">
                    <button className="cmd-b" data-tip="BASIC" />
                  </div>
                  <div className="dev-hud-basic-options">
                    <button className="dev-hud-basic-opt">STAGE ATTACK</button>
                    <button className="dev-hud-basic-opt">GATHER POWER</button>
                  </div>
                </div>
              )}
              {view === 'LIMIT' && (
                <div className="dev-hud-basic-view">
                  <div className="command-strip">
                    <button className="cmd-limit" data-tip="LIMITED" />
                  </div>
                  <MockHand limit />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── CONTROLES ─── */}
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


// ── Mano del mockup: cartas REALES del catálogo (igual que el build) ──
const MOCK_HAND_IDS = [13, 7, 5, 1]; // Kamehameha, Energy Wave, Cont. Punch, 3 Stage Attack

// Frames GBC por tipo (paridad con CardVisual del juego)
const MOCK_CARD_TYPE_FRAME: Record<string, string> = {
  command: '/assets/ui/card_frames/card_type_stage_attack_frame.png',
  damage: '/assets/ui/card_frames/card_type_danger_frame.png',
  beam: '/assets/ui/card_frames/card_type_power_frame.png',
  support: '/assets/ui/card_frames/card_type_support_frame.png',
  defense: '/assets/ui/card_frames/card_type_basic_frame.png',
  special: '/assets/ui/card_frames/card_type_special_frame.png',
};

function MockHand({ compact, limit }: { compact?: boolean; limit?: boolean }) {
  // LIMIT: cartas exclusivas de personaje (Goku: Kaio Ken); mano: catálogo
  const ids = limit ? [87, 46] : MOCK_HAND_IDS;
  const cards = ids.map(id => getCard(id)).filter(Boolean) as NonNullable<ReturnType<typeof getCard>>[];
  return (
    <div className="hand-area">
      <div className="hand-label">— MANO —</div>
      <div className="hand-cards">
        {cards.map((card, i) => {
          const color = CARD_COLORS[card.type];
          const iconUrl = cardIconUrl(card.id);
          const IconCmp = TYPE_ICONS[card.type];
          const frame = i === 2
            ? '/assets/ui/card_frames/card_type_blocked_or_invalid_frame.png'
            : i === 1
              ? '/assets/ui/card_frames/card_type_bonus_gold_frame.png'
              : (MOCK_CARD_TYPE_FRAME[card.type] ?? undefined);
          const tip = `${card.name} — ${CARD_TYPE_NAMES[card.type]}  ★${card.rarity}\nCC ${card.cc} · ATK ${card.atk > 0 ? card.atk : '—'} · ACC ${card.acc}%\n${card.description ?? ''}`;
          return (
            <button key={card.id} className={`card ${card.type} ${i === 1 ? 'selected' : ''}`}
              style={{ '--card-color': color, '--card-frame': frame ? `url('${frame}')` : undefined } as React.CSSProperties}
              disabled={i === 2} data-tip={tip}>
              <div className="card-header">
                <span className="card-icon">
                  {iconUrl ? <img className="card-icon-img" src={iconUrl} alt="" /> : <IconCmp size={16} strokeWidth={2.2} />}
                </span>
                <span className="card-cc">{card.cc}CC</span>
              </div>
              <div className="card-art">
                {iconUrl ? <img className="card-art-img" src={iconUrl} alt="" /> : <IconCmp size={40} strokeWidth={1.8} />}
              </div>
              <div className="card-name">{card.name}</div>
              <div className="card-type">{CARD_TYPE_NAMES[card.type]}</div>
              <div className="card-stats">
                {card.atk > 0 && <span className="card-atk">ATK{card.atk}</span>}
                <span className="card-acc">ACC{card.acc}%</span>
              </div>
              <div className="card-rarity">{'★'.repeat(card.rarity)}{'☆'.repeat(5 - card.rarity)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
