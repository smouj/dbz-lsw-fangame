// ═══════════════════════════════════════════════════════════
// DEV STUDIO — HUD Studio
// Visualizador completo del gameplay (mockup del HUD + campo) y
// editor en vivo del tema HUD (variables CSS de :root). Los cambios
// se previsualizan al instante en el mockup y se aplican al juego
// real con "Aplicar al juego" (persisten en localStorage).
// ═══════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import {
  HUD_THEME_VARS, HudTheme, currentHudTheme, defaultHudTheme,
  saveHudTheme, applyHudTheme, resetHudTheme,
} from '../data/hudTheme';
import { getForm } from '../data/roster';
import { spriteDirFor, spriteFrameUrl } from '../data/spriteManifest';
import { BATTLE_PORTRAITS } from '../data/battlePortraits';
import { downloadJson } from './spriteEditing';

// Formas de ejemplo para el mockup (Goku vs Piccolo, como el Battle Lab).
const P_FORM = 'goku_base';
const E_FORM = 'piccolo_base';

const GROUPS = ['Colores', 'Cartas', 'Escala', 'Tipografía'];

export function HudModule() {
  const [theme, setTheme] = useState<HudTheme>(() => currentHudTheme());
  const [status, setStatus] = useState('');

  const player = useMemo(() => getForm(P_FORM), []);
  const enemy = useMemo(() => getForm(E_FORM), []);
  const pDir = player ? spriteDirFor(player.id) : undefined;
  const eDir = enemy ? spriteDirFor(enemy.id) : undefined;
  const pIdle = pDir ? spriteFrameUrl(player!.id, `${pDir}_idle_00.png`) : undefined;
  const eIdle = eDir ? spriteFrameUrl(enemy!.id, `${eDir}_idle_00.png`) : undefined;
  const pPortrait = BATTLE_PORTRAITS[P_FORM];
  const ePortrait = BATTLE_PORTRAITS[E_FORM];

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
          <button className="dev-btn dev-btn-primary" onClick={apply}>✓ Aplicar al juego</button>
          <button className="dev-btn" onClick={exportJson}>↓ Exportar JSON</button>
          <button className="dev-btn dev-btn-danger" onClick={reset}>↺ Reset</button>
        </div>
      </div>
      {status && <div className="dev-hud-status">{status}</div>}

      <div className="dev-hud-grid">
        {/* ─── PREVIEW / VISUALIZADOR ─── */}
        <div className="dev-hud-preview" style={mockVars}>
          <div className="dev-hud-mock">
            {/* HUD superior */}
            <div className="dev-hud-mock-top">
              <div className="dev-hud-mock-fighter left">
                <div className="dev-hud-mock-name">
                  <span className="dev-hud-mock-portrait">
                    {pPortrait ? <img src={pPortrait} alt="" /> : <span className="dev-hud-mock-ph">?</span>}
                  </span>
                  <strong>GOKU</strong>
                  <span className="dev-hud-mock-form">Base</span>
                  <span className="dev-hud-mock-lv">LV50</span>
                </div>
                <div className="dev-hud-mock-hp">
                  <div className="dev-hud-mock-hp-fill" style={{ width: '72%' }} />
                  <span className="dev-hud-mock-hp-txt">720/1000</span>
                </div>
                <div className="dev-hud-mock-stats">STR60 · KI55 · SPD50</div>
              </div>

              <div className="dev-hud-mock-center">
                <span className="dev-hud-mock-round">ROUND 1</span>
                <span className="dev-hud-mock-vs">VS</span>
                <span className="dev-hud-mock-order">GOKU FIRST</span>
              </div>

              <div className="dev-hud-mock-fighter right">
                <div className="dev-hud-mock-name">
                  <span className="dev-hud-mock-portrait">
                    {ePortrait ? <img src={ePortrait} alt="" /> : <span className="dev-hud-mock-ph">?</span>}
                  </span>
                  <strong>PICCOLO</strong>
                  <span className="dev-hud-mock-form">Base</span>
                  <span className="dev-hud-mock-lv">LV50</span>
                </div>
                <div className="dev-hud-mock-hp">
                  <div className="dev-hud-mock-hp-fill" style={{ width: '88%' }} />
                  <span className="dev-hud-mock-hp-txt">880/1000</span>
                </div>
                <div className="dev-hud-mock-stats">STR58 · KI60 · SPD48</div>
              </div>
            </div>

            {/* Campo de batalla */}
            <div className="dev-hud-mock-field">
              <div className="dev-hud-mock-bg" />
              {pIdle && <img src={pIdle} alt="" className="dev-hud-mock-sprite left" />}
              {eIdle && <img src={eIdle} alt="" className="dev-hud-mock-sprite right" />}
            </div>

            {/* Menú de comandos */}
            <div className="dev-hud-mock-commands">
              <button className="dev-hud-mock-cmd special">LIMIT</button>
              <button className="dev-hud-mock-cmd command">JOINT</button>
              <button className="dev-hud-mock-cmd defense">BASIC</button>
            </div>

            {/* Carta de ejemplo (beam) para mostrar colores + tamaño */}
            <div className="dev-hud-mock-card">
              <span className="dev-hud-mock-card-type">BEAM</span>
              <strong>KAMEHAMEHA</strong>
              <span className="dev-hud-mock-card-stats">ATK 40 · ACC 90%</span>
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
                    ↺
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
