// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — HUD Studio
// CONFIGURADOR del tema HUD: colores, HUD, cartas, posición, escala y
// tipografía (33 variables CSS reales consumidas por el juego). El preview
// muestra el HUD con el tema actual (paridad dev↔juego: mismas clases y
// variables). NO es un simulador de combate — las demos/batallas viven en
// el Combat Lab. "Aplicar al juego" inyecta las variables en :root y
// persiste en localStorage.
// ═══════════════════════════════════════════════════════════════════════
import { Check, Download, RotateCcw, Lock, BookOpen, Swords, Library, Users, Sparkles, Settings as SettingsIcon, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  HUD_THEME_VARS, HudTheme, currentHudTheme, defaultHudTheme,
  saveHudTheme, applyHudTheme, resetHudTheme,
} from '../data/hudTheme';
import { battleOverworldActorUrl } from '../data/battleOverworld';
import { SCENARIOS, SPECIAL_ACTION_BACKGROUND } from '../data/scenarios';
import { BATTLE_STAGES } from '../data/battleBackgrounds';
import { getForm } from '../data/roster';
import { spriteDirFor, spriteFrameUrl } from '../data/spriteManifest';
import { BATTLE_PORTRAITS } from '../data/battlePortraits';
import { storyPortraitUrlApproximate as storyPortraitUrl } from '../data/storyPortraits';
import { resolveSpeakerPortrait } from '../data/speakerPortraits';
import { anchorFor, BattlePosition, actionAnchorFor } from '../data/positions';
import { downloadJson } from './spriteEditing';
import { getCard, CARD_TYPE_NAMES, CARD_COLORS, CARD_COLORS_ON_LIGHT, CardDef } from '../data/cards';
import { tipBlock, tipCard, TipPart } from '../data/tooltips';
import { cardIconUrl } from '../data/icons';
import { FitArt } from '../components/FitArt';
import { CardArtHole } from '../components/CardArtHole';
import { CARD_FRAME_BY_TYPE, CARD_FRAME_SELECTED, CARD_FRAME_DISABLED } from '../data/cardVisuals';
import { HUD_LAYOUT, validateHudLayout } from '../data/hudLayout';
import { StageHudPanel } from '../components/StageHudPanel';
import { MainMenuPresentation, type MainMenuPresentationItem } from '../components/MainMenuPresentation';

// Formas de ejemplo del mockup (Goku vs Piccolo, como el Battle Lab).
const P_FORM = 'goku_base';
const E_FORM = 'piccolo_base';

const GROUPS = ['Colores', 'HUD', 'Cartas', 'Posición', 'Escala', 'Tipografía'];

// Vista del preview: cómo se ve el HUD en cada estado (sin motor — visual).
type HudView = 'COMMAND' | 'MANO' | 'BASIC' | 'MOVE' | 'STAGE' | 'BEAM' | 'DAMAGE' | 'LIMIT' | 'DIALOGO' | 'STORY_DIALOGO' | 'INTRO' | 'DISCARD' | 'DEFENSA' | 'RESULTADO' | 'MENU';

const VIEWS: { id: HudView; label: string; tip: string }[] = [
  // Flujo de batalla: comandos → cartas → fases → flujo global
  { id: 'COMMAND', label: 'Comando', tip: 'Command strip: LIMIT · JOINT · BASIC' },
  { id: 'MANO', label: 'Mano', tip: 'JOINT — cartas de la mano con sus frames GBC + huecos' },
  { id: 'BASIC', label: 'BASIC', tip: 'Stage Attack (frame de carta) · Gather · Back' },
  { id: 'MOVE', label: 'MOVE', tip: 'Selección de eje: HORIZONTAL ↔ o VERTICAL ↕' },
  { id: 'STAGE', label: 'STAGE', tip: 'QTE del Stage Attack: inputs con los sprites del paquete' },
  { id: 'BEAM', label: 'BEAM', tip: 'Acción de carta Beam: carga · lanzamiento · viaje · contacto · reacción' },
  { id: 'DAMAGE', label: 'DAMAGE', tip: 'Acción de carta Damage: preparación · avance · impacto · reacción' },
  { id: 'LIMIT', label: 'LIMIT', tip: 'Cartas LIMITED del personaje + huecos' },
  { id: 'DEFENSA', label: 'Defensa', tip: 'Menú de defensa (contrato): GUARD · MOVE(H|V) · carta defensiva/support — SIN Stage/QTE' },
  { id: 'DISCARD', label: 'Descarte', tip: 'HAND CHECK — demasiadas cartas, elige cuál descartar' },
  { id: 'DIALOGO', label: 'Diálogo', tip: 'Cuadro de mensaje GBC estructurado' },
  { id: 'STORY_DIALOGO', label: 'Story Diálogo', tip: 'Diálogo del modo historia: retrato + caja GBC (blanco/negro)' },
  { id: 'RESULTADO', label: 'Resultado', tip: 'Pantalla final: VICTORIA / DERROTA' },
  { id: 'MENU', label: 'Menú', tip: 'Pantalla principal: logo, continuar, navegación y footer' },
  { id: 'INTRO', label: 'Intro', tip: 'Presentación VS: sprites entran desde fuera + VS + flash (sin texto)' },
];

const MENU_PREVIEW_ITEMS: MainMenuPresentationItem[] = [
  { screen: 'story', label: 'HISTORIA', desc: 'Tu próxima batalla empieza aquí', Icon: BookOpen },
  { screen: 'versus', label: 'BATALLA', desc: 'Prepara tu equipo y lucha', Icon: Swords },
  { screen: 'deck', label: 'MAZO', desc: '20 cartas. Tu estrategia.', Icon: Library },
  { screen: 'characters', label: 'PERSONAJES', desc: 'Guerreros, formas y poder', Icon: Users },
  { screen: 'cards', label: 'CARTAS', desc: 'Explora tu colección', Icon: Sparkles },
  { screen: 'settings', label: 'AJUSTES', desc: 'Audio · Idioma · Pantalla', Icon: SettingsIcon },
];

function PreviewHpBar({ current, max, side }: { current: number; max: number; side: 'left' | 'right' }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className={`hp-bar ${side} ${pct < 12 ? 'critical' : pct <= 25 ? 'low' : pct <= 50 ? 'mid' : ''}`}
      data-tip={tipBlock('HP', [['stats', `${current} / ${max}`]])}>
      <div className="hp-bar-track">
        <div className="hp-bar-recent" style={{ width: `${pct + 8}%` }} />
        <div className="hp-bar-current" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Carta GBC real: mismo render que el juego (frame por tipo + arte centrado)
function HudCard({ card, selected, disabled }: { card: CardDef; selected?: boolean; disabled?: boolean }) {
  const frame = disabled ? CARD_FRAME_DISABLED : selected ? CARD_FRAME_SELECTED : (CARD_FRAME_BY_TYPE[card.type] ?? undefined);
  const iconUrl = cardIconUrl(card.id);
  const color = CARD_COLORS[card.type];
  const tip: TipPart[] = [
    ['stats', `CC ${card.cc} · ATK ${card.atk > 0 ? card.atk : '—'} · ACC ${card.acc}%`],
    card.description ? ['desc', card.description] : null,
  ];
  return (
    <button className={`card ${card.type} ${selected ? 'selected' : ''}`} disabled={disabled}
      style={{ '--card-color': color, '--card-frame': frame ? `url('${frame}')` : undefined } as React.CSSProperties}
      data-tip={tipCard(card.name, CARD_TYPE_NAMES[card.type], CARD_COLORS_ON_LIGHT[card.type], card.rarity, tip)}>
      <CardArtHole frameUrl={frame} iconUrl={iconUrl} />
    </button>
  );
}

export function HudModule() {
  const [theme, setTheme] = useState<HudTheme>(() => currentHudTheme());
  const [status, setStatus] = useState('');
  const [view, setView] = useState<HudView>('COMMAND');
  const [devAids, setDevAids] = useState(false);   // anclas + zonas ANIM — OFF por defecto: el preview se ve LIMPIO como el juego (activar solo para editar anclas)
  const [dlgSide, setDlgSide] = useState<'left' | 'right'>('left');
  // Vista STORY DIÁLOGO: viewport fijo del juego (1082×605) escalado →
  // SIEMPRE se ve exactamente como en el juego, a cualquier ancho del preview.
  const storyStageRef = useRef<HTMLDivElement>(null);
  const [storyScale, setStoryScale] = useState(1);
  useEffect(() => {
    if (view !== 'STORY_DIALOGO') return;
    const el = storyStageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setStoryScale(Math.min(1, w / 1082, h / 605));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);
  // Escenario del preview: se puede elegir fondo (overview/action) como en
  // el combate real — los 13 escenarios del catálogo.
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [bgMode, setBgMode] = useState<'overview' | 'action'>('overview');
  // Plano de ACCIÓN ESPECIAL (transición): fondo blanco con bandas azules
  // (special_action.png — transformaciones / Beam Ultimate)
  const [actionSpecial, setActionSpecial] = useState(false);
  // Nº de inputs del QTE STAGE en el mockup (3-6 como el juego)
  const [stageLen, setStageLen] = useState(5);
  // Resultado del mockup: victoria o derrota
  const [result, setResult] = useState<'victory' | 'defeat'>('victory');
  const [introMatchup, setIntroMatchup] = useState<'1v1' | '1v2' | '2v1' | '2v2'>('1v1');
  // INTRO ▶ PLAY: reproducir la secuencia de entrada completa (slide-in →
  // VS pop → flash). El remount (key) reinicia las CSS animations; los
  // chips de fase muestran los tiempos de la secuencia (para canonizar).
  const [introPlayKey, setIntroPlayKey] = useState(0);
  const [introPhase, setIntroPhase] = useState<'idle' | 'slide' | 'vs' | 'flash' | 'done'>('idle');
  const INTRO_TIMING = [
    { phase: 'slide' as const, label: 'SLIDE-IN', at: '0.00s', note: 'sprites desde ±42vw (.25s delay, .55s ease)' },
    { phase: 'vs' as const, label: 'VS POP', at: '0.70s', note: 'VS escala 3.2→1 + glow (.55s)' },
    { phase: 'flash' as const, label: 'FLASH', at: '1.50s', note: 'blanco total .4s (clímax)' },
  ];
  const introTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playIntro = () => {
    introTimers.current.forEach(clearTimeout);
    introTimers.current = [];
    setIntroPlayKey(k => k + 1);
    setIntroPhase('slide');
    introTimers.current.push(setTimeout(() => setIntroPhase('vs'), 700));
    introTimers.current.push(setTimeout(() => setIntroPhase('flash'), 1500));
    introTimers.current.push(setTimeout(() => setIntroPhase('done'), 2000));
  };
  useEffect(() => () => introTimers.current.forEach(clearTimeout), []);
  // Actor de la ACCIÓN: en el plano ACTION solo aparece el character que
  // va a ejecutar la acción (idle del sheet de batalla) — no ambos.
  const [actor, setActor] = useState<'player' | 'enemy'>('player');

  const player = useMemo(() => getForm(P_FORM), []);
  const enemy = useMemo(() => getForm(E_FORM), []);
  const pDir = player ? spriteDirFor(player.id) : undefined;
  const eDir = enemy ? spriteDirFor(enemy.id) : undefined;
  const pIdle = battleOverworldActorUrl(P_FORM, 'idle') ?? (pDir ? spriteFrameUrl(player!.id, `${pDir}_idle_00.png`) : undefined);
  const eIdle = battleOverworldActorUrl(E_FORM, 'idle') ?? (eDir ? spriteFrameUrl(enemy!.id, `${eDir}_idle_00.png`) : undefined);
  // Sprites de ACCIÓN (grandes, del sheet de batalla) — el character correcto
  // para el plano ACTION, como el juego (FighterSprite idle).
  const pAction = pDir ? spriteFrameUrl(P_FORM, `${pDir}_idle_00.png`) : undefined;
  const eAction = eDir ? spriteFrameUrl(E_FORM, `${eDir}_idle_00.png`) : undefined;
  const pPortrait = BATTLE_PORTRAITS[P_FORM];
  const ePortrait = BATTLE_PORTRAITS[E_FORM];
  const battleBgUrl = actionSpecial
    ? SPECIAL_ACTION_BACKGROUND
    : SCENARIOS[scenarioIdx]?.[bgMode === 'overview' ? 'overviewBackground' : 'actionBackground']
      ?? '/assets/backgrounds/scenarios/01_world.png';

  // Cartas reales del catálogo para la vista Mano (como el build)
  const handCards = [13, 7, 5, 1].map(id => getCard(id)).filter((c): c is CardDef => !!c);
  const limitCards = [23, 13, 24].map(id => getCard(id)).filter((c): c is CardDef => !!c);
  // Film inspectors are ACTION-only. They are removed from the DOM entirely
  // while the preview is in Overview so the tactical HUD keeps its geometry.
  const visibleViews = bgMode === 'action'
    ? VIEWS
    : VIEWS.filter(v => v.id !== 'BEAM' && v.id !== 'DAMAGE');

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
    <div className="dev-panel">
      <header className="dev-header">
        <h1>HUD Studio</h1>
        <p className="dev-sub">
          Configurador del tema HUD: 33 variables CSS reales (colores, HUD, cartas,
          posición, escala, tipografía) con paridad dev↔juego. El preview muestra el
          HUD con el tema actual; <strong>Aplicar al juego</strong> lo inyecta en{' '}
          <code>:root</code> y lo persiste. Las demos y batallas viven en el{' '}
          <strong>Combat Lab</strong>.
        </p>
      </header>
      <div className="dev-hud">
        <div className="dev-hud-head">
        <div className="dev-hud-actions">
          <button className="dev-btn dev-btn-primary" onClick={apply}><Check size={15} /> Aplicar al juego</button>
          <button className="dev-btn" onClick={exportJson}><Download size={15} /> Exportar JSON</button>
          <button className="dev-btn dev-btn-danger" onClick={resetTheme}><RotateCcw size={15} /> Reset</button>
        </div>
      </div>
      {status && <div className="dev-hud-status">{status}</div>}

      <div className="dev-hud-view-select" role="tablist" aria-label="Vista del HUD">
        {visibleViews.map(v => (
          <button key={v.id} className={`dev-hud-view-chip ${view === v.id ? 'active' : ''}`}
            onClick={() => setView(v.id)} title={v.tip}>
            {v.label}
          </button>
        ))}
        {/* Escenario del battlefield (fondo overview/action) — los 13 del catálogo */}
        <div className="dev-hud-scenario" title="Escenario del battlefield — fondo overview (táctico) o action (animación)">
          <label>FONDO</label>
          <select value={scenarioIdx} onChange={e => setScenarioIdx(Number(e.target.value))}>
            {SCENARIOS.map((s, i) => <option key={s.id} value={i}>{BATTLE_STAGES[i] ? `SC ${String(i + 1).padStart(2, '0')} — ${BATTLE_STAGES[i].locationEs}` : s.id.replace('scenario_', 'SC ')}</option>)}
          </select>
          <div className="dev-hud-bgmode">
            <button className={`bgmode-btn ${bgMode === 'overview' ? 'active' : ''}`} onClick={() => { setBgMode('overview'); if (view === 'BEAM' || view === 'DAMAGE') setView('COMMAND'); }}>OVERVIEW</button>
            <button className={`bgmode-btn ${bgMode === 'action' ? 'active' : ''}`} onClick={() => setBgMode('action')}>ACTION</button>
          </div>
          {bgMode === 'action' && (
            <div className="dev-hud-actor" title="Quién ejecuta la acción (idle del sheet de batalla)">
              <label>ACTÚA</label>
              <button className={`actor-btn ${actor === 'player' ? 'active' : ''}`} onClick={() => setActor('player')}>PLAYER</button>
              <button className={`actor-btn ${actor === 'enemy' ? 'active' : ''}`} onClick={() => setActor('enemy')}>ENEMY</button>
            </div>
          )}
          {bgMode === 'action' && (
            <div className="dev-hud-actor" title="Plano de acción: escenario normal o ESPECIAL (transición — fondo blanco con bandas azules, transformaciones/Beam Ultimate)">
              <label>PLANO</label>
              <button className={`actor-btn ${!actionSpecial ? 'active' : ''}`} onClick={() => setActionSpecial(false)}>ESCENARIO</button>
              <button className={`actor-btn ${actionSpecial ? 'active' : ''}`} onClick={() => setActionSpecial(true)}>ESPECIAL</button>
            </div>
          )}
        </div>
        {(view === 'DIALOGO' || view === 'STORY_DIALOGO') && (
          <button className={`dev-hud-view-chip side-toggle ${dlgSide === 'right' ? 'active' : ''}`}
            onClick={() => setDlgSide(s => (s === 'left' ? 'right' : 'left'))}
            title="Alterna el lado del personaje que habla (izquierda/derecha)">
            Habla: {dlgSide === 'left' ? 'IZQUIERDA (Goku)' : 'DERECHA (Cell)'}
          </button>
        )}
        {/* AYUDAS dev: anclas P/E + zonas ANIM — OFF para capturas limpias */}
        <button className={`dev-hud-view-chip side-toggle ${devAids ? 'active' : ''}`}
          onClick={() => setDevAids(a => !a)}
          title="Muestra/oculta las ayudas dev del battlefield: anclas P/E (cruces + coordenadas) y zonas ANIM — desactívalas para ver el preview limpio">
          {devAids ? 'AYUDAS: ON' : 'AYUDAS: OFF'}
        </button>
        {/* Resultado: toggle VICTORIA / DERROTA */}
        {view === 'RESULTADO' && (
          <button className={`dev-hud-view-chip side-toggle ${result === 'defeat' ? 'active' : ''}`}
            onClick={() => setResult(r => (r === 'victory' ? 'defeat' : 'victory'))}
            title="Alterna entre VICTORIA y DERROTA">
            {result === 'victory' ? 'VICTORIA' : 'DERROTA'}
          </button>
        )}
        {/* Nº de inputs del QTE STAGE (3-6) — el mockup se adapta y el
            grupo derecha (prompt+tiempo) permanece anclado (layout estable) */}
        {view === 'STAGE' && (
          <div className="dev-hud-stage-len" title="Nº de inputs de la secuencia STAGE (3-6, como el juego)">
            <label>INPUTS</label>
            {[3, 4, 5, 6].map(n => (
              <button key={n} className={`stage-len-btn ${stageLen === n ? 'active' : ''}`}
                onClick={() => setStageLen(n)}>{n}</button>
            ))}
          </div>
        )}
        {(view === 'BEAM' || view === 'DAMAGE') && (
          <div className="dev-hud-action-preview" title="Canario de película ROM: los estados se muestran en el mismo plano ACTION que BattleScreen">
            <span className="dev-hud-action-label">ACTION</span>
            <span className="dev-hud-action-state">{view === 'BEAM' ? 'BEAM · CHARGE → TRAVEL → CONTACT → REACTION' : 'DAMAGE · PREPARE → APPROACH → IMPACT → REACTION'}</span>
            <button className="dev-btn dev-btn-primary" onClick={() => { setBgMode('action'); setActionSpecial(false); setIntroPhase('idle'); }}>
              <Play size={14} /> Reiniciar plano
            </button>
          </div>
        )}
        {/* INTRO ▶ PLAY: reproducir la secuencia de entrada completa y
            ver/actualizar/canonizar las transiciones (slide → VS → flash) */}
        {view === 'INTRO' && (
          <div className="dev-hud-intro-play" title="Reproduce la entrada de combate: slide-in → VS pop → flash (reinicia en cada click)">
            <div className="dev-intro-matchup" role="group" aria-label="Número de combatientes">
              <span>TEAMS</span>
              {(['1v1', '1v2', '2v1', '2v2'] as const).map(mode => (
                <button key={mode} className={`stage-len-btn ${introMatchup === mode ? 'active' : ''}`} onClick={() => setIntroMatchup(mode)}>{mode}</button>
              ))}
            </div>
            <button className="dev-btn dev-btn-primary" onClick={playIntro}>
              <Play size={14} /> {introPhase === 'idle' ? 'Reproducir entrada' : '↺ Replay'}
            </button>
            <div className="dev-intro-phases">
              {INTRO_TIMING.map(t => (
                <span key={t.phase}
                  className={`dev-intro-phase ${introPhase === t.phase ? 'active' : ''}`}
                  title={`${t.note}`}>
                  <b>{t.at}</b> {t.label}
                </span>
              ))}
              {introPhase === 'done' && <span className="dev-intro-phase done">✓ FIN</span>}
            </div>
          </div>
        )}
      </div>

      {/* ═══ CONTRATO VISUAL (baseline V1 congelada) ═══ */}
      <div className="dev-section">
        <details className="dev-hud-geo">
          <summary>
            <strong>Geometría canónica — baseline V1</strong>
            <span className="dev-muted" style={{ marginLeft: 8, fontSize: 11 }}>
              {validateHudLayout().ok ? '✓ invariantes OK (80px · 64×48)' : '✗ ' + validateHudLayout().errors.join(' · ')}
            </span>
          </summary>
          <p className="dev-muted" style={{ fontSize: 11, margin: '6px 0 0' }}>
            HUD Studio = fuente de verdad <strong>visual</strong>; BattleEngine = lógica.
            Juego real, preview y Combat Lab consumen estas medidas (CSS via{' '}
            <code>--hud-layout-*</code>). No cambiar de dirección visual.
          </p>
          <div className="dev-pipeline" style={{ marginTop: 8 }}>
            {Object.entries(HUD_LAYOUT).map(([k, v]) => (
              <div key={k} className="dev-pipeline-row">
                <span className="dev-pipeline-file"><code>--hud-layout-{k}</code></span>
                <span className="dev-pipeline-rol"><code style={{ color: '#ffe9a3' }}>{String(v)}</code></span>
                <span className="dev-pipeline-ok">✓</span>
              </div>
            ))}
          </div>
        </details>
      </div>

      <div className="dev-hud-grid">
        {/* ─── PREVIEW: el HUD con el tema actual (estático, paridad real) ─── */}
        <div className="dev-hud-preview" style={mockVars}>
          {/* OJO: en el studio NO se aplica intro-active (colapsaría la fila
              de controles → la ventana del preview se comprime 570→474px).
              El overlay .battle-intro (absolute inset-0, z-120) cubre TODA
              la ventana igual — misma forma que el resto de vistas y que la
              ventana del juego. dev-intro-view solo congela animaciones y
              oculta debug. */}
          <div className={`battle-screen view-overview dev-hud-real-preview ${view === 'INTRO' ? (introPhase === 'idle' ? 'dev-intro-view' : 'dev-intro-playing') : ''}`}>
            {/* INTRO */}
            {view === 'INTRO' && (
              /* VS FULL-SCREEN: los 2 sprites entran desde FUERA hacia su
                 posición (cinemática), VS en el centro, flash — SIN texto
                 (nada de READY/FIGHT ni nombres). MISMO markup que el juego.
                 key={introPlayKey} remonta el bloque: las CSS animations se
                 reinician en cada ▶ Play. */
              <div className="battle-intro" key={introPlayKey}>
                <div className="intro-team intro-team-left">
                  {(['2v1', '2v2'].includes(introMatchup) ? [P_FORM, 'gohan_young'] : [P_FORM]).map((form, i) => (
                    <div className="intro-fighter intro-left" key={`${form}-${i}`}><div className="intro-portrait">
                      {i === 0 && pPortrait ? <img src={pPortrait} alt={form} /> : <img src={BATTLE_PORTRAITS[form] ?? pPortrait ?? ''} alt={form} />}
                    </div></div>
                  ))}
                </div>
                <div className="intro-vs">VS</div>
                <div className="intro-team intro-team-right">
                  {(['1v2', '2v2'].includes(introMatchup) ? [E_FORM, 'cell_perfect'] : [E_FORM]).map((form, i) => (
                    <div className="intro-fighter intro-right" key={`${form}-${i}`}><div className="intro-portrait">
                      {i === 0 && ePortrait ? <img src={ePortrait} alt={form} /> : <img src={BATTLE_PORTRAITS[form] ?? ePortrait ?? ''} alt={form} />}
                    </div></div>
                  ))}
                </div>
                <div className="intro-flash" />
              </div>
            )}

            {/* STORY DIÁLOGO: escena del modo historia — cutscene + retrato del
                hablante (lado según quien habla) + caja GBC blanco/negro.
                MISMO markup que StorySceneScreen del juego. */}
            {view === 'STORY_DIALOGO' && (
              <div className="dev-story-scene" ref={storyStageRef}>
                <div className="story-panel story-panel-portrait_dialogue" style={{ transform: `scale(${storyScale})`, transformOrigin: 'center center' }}>
                  <div className="story-panel-bg" style={{ backgroundImage: `url('/assets/cutscenes/005_grassy_valley_battlefield.png')` }} />
                  <div className="story-panel-dim" />
                  <div className="story-characters layout-portrait_dialogue">
                    <div className={`story-character ${dlgSide === 'left' ? 'left' : 'right'} speaking`}>
                      <img src={dlgSide === 'left'
                        ? (storyPortraitUrl('piccolo') ?? '')
                        : (storyPortraitUrl('gohan', undefined, 'surprised') ?? '')}
                        alt={dlgSide === 'left' ? 'PICCOLO' : 'GOHAN'} className="story-portrait" draggable={false} />
                    </div>
                  </div>
                  <div className="story-dialogue">
                    <div className="story-speaker">{dlgSide === 'left' ? 'PICCOLO' : 'GOHAN'}</div>
                    <div className="story-text visible">{dlgSide === 'left'
                      ? 'No esperes que te trate como a un niño. Los Saiyan llegarán y tendrás que sobrevivir.'
                      : 'Lo intentaré… pero todavía no sé pelear como tú.'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* MENU PRINCIPAL: logo, continuar, navegación y footer — MISMO
                markup que el juego (main.tsx), escalado al preview */}
            {view === 'MENU' && (
              <MainMenuPresentation
                items={MENU_PREVIEW_ITEMS}
                playerLevel={12}
                chapterNumber={1}
                chapterCount={32}
                chapterName="EL REGRESO DE RADITZ"
                storyLabel="CAPÍTULO"
                continueLabel="CONTINUAR"
                chooseStoryLabel="ELIGE TU HISTORIA"
                playerLabel="GUERRERO"
                mainMenuLabel="Vista previa del menú principal"
                navigateLabel="NAVEGAR"
                selectLabel="ELEGIR"
                preview
              />
            )}

            {/* HUD superior SIEMPRE visible (como el juego: durante la intro
                la VS screen se superpone, el hud-top queda detrás) */}
            <div className="hud-top">
              <div className="fighter-hud left">
                <div className="hud-name">
                  <span className="hud-portrait">
                    {pPortrait ? <img src={pPortrait} alt="" /> : <span className="dev-hud-mock-ph">?</span>}
                  </span>
                  <strong>GOKU</strong>
                  <span className="hud-form">Base</span>
                  <span className="hud-level">LV50</span>
                  <span className="team-reserve left in-name" data-tip={tipBlock('GOHAN', [['stats', 'HP 620 / 700']])}>
                    <span className="team-reserve-portrait">
                      <img src="/assets/portraits/battle/gohan_teen_ssj.png" alt="" />
                    </span>
                    <span className="team-reserve-name">GOHAN</span>
                    <span className="team-reserve-hp">620/700</span>
                  </span>
                </div>
                <PreviewHpBar current={720} max={1000} side="left" />
                <div className="hud-info-row">
                  {/* Fase GBC: badges de estado HACIA AFUERA (borde), fase
                      ATTACK/DEFEND HACIA DENTRO (junto al VS); reserva en la
                      fila superior — MISMO layout que el juego */}
                  <div className="hud-status">
                    <span className="status-chip buff">STR+</span>
                  </div>
                  <span className="hud-phase phase-atk">ATTACK</span>
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
                <div className="hud-info-row">
                  <div className="hud-status right">
                    <span className="status-chip debuff">SPD−</span>
                  </div>
                  <span className="hud-phase phase-def">DEFEND</span>
                </div>
              </div>
              <div className="hud-center-badge">
                <span className="hud-center-vs">VS</span>
                <span className="hud-center-round">ROUND 1</span>
              </div>
            </div>

            <div className="battlefield">
              <div className={`battle-bg authentic ${actionSpecial ? 'special' : ''}`} style={{ backgroundImage: `url(${battleBgUrl})` }} />
              <div className="battlefield-fighters">
                {(() => {
                  // ANCLAJE REAL (fuente única): los fighters se posicionan con
                  // anchorFor(pos, side) — los mismos anchors que Position Lab
                  // edita (localStorage 'dbzlsw:position-anchors'). Si cambias
                  // una posición en Positions, el preview del HUD la refleja.
                  const pa = anchorFor(BattlePosition.DOWN_BACK, 'LEFT');
                  const ea = anchorFor(BattlePosition.DOWN_BACK, 'RIGHT');
                  return (
                    <>
                      {/* ANCLA del sprite: el punto EXACTO donde aparece el
                          luchador (mismo anchorFor que el juego y Position Lab) —
                          visible como cruz, para saber dónde se ancla y dónde
                          realiza las animaciones. En ACTION se ocultan: el
                          actor va centrado en la escena. */}
                      {bgMode === 'overview' && devAids && (
                        <>
                          <div className="dev-fighter-anchor player" style={{ left: `${pa.x}%`, top: `${pa.y}%` }}>
                            <span className="dev-anchor-cross" />
                            <span className="dev-anchor-label">P · {pa.x},{pa.y}</span>
                          </div>
                          <div className="dev-fighter-anchor enemy" style={{ left: `${ea.x}%`, top: `${ea.y}%` }}>
                            <span className="dev-anchor-cross" />
                            <span className="dev-anchor-label">E · {ea.x},{ea.y}</span>
                          </div>
                          {/* ZONA DE ANIMACIÓN: el área donde el luchador se mueve
                              (escala del sprite overworld, como el juego) */}
                          <div className="dev-anim-zone player" style={{ left: `${pa.x}%`, top: `${pa.y}%` }}>
                            <span className="dev-anim-zone-label">ANIM</span>
                          </div>
                          <div className="dev-anim-zone enemy" style={{ left: `${ea.x}%`, top: `${ea.y}%` }}>
                            <span className="dev-anim-zone-label">ANIM</span>
                          </div>
                        </>
                      )}
                      {/* Character correcto por plano:
                          OVERVIEW → chibi overworld (16×16 del GBC) — AMBOS
                          ACTION   → sprite de acción grande (idle del sheet)
                                     SOLO el actor (el que ejecuta la acción)
                          Ambos anclados igual que Position Lab:
                          translate(-50%,-100%) → los PIES tocan el anchor exacto. */}
                      {/* ACTION: el actor se compone según QUIÉN EJECUTA
                          (actionAnchorFor — espejo GBC): JUGADOR a la
                          izquierda (x 20) mirando a la derecha, ENEMIGO a
                          la derecha (x 80) mirando a la izquierda; en el
                          plano ESPECIAL 2px más abajo (y 70) + 2px menor
                          (190px, CSS .special-actor) */}
                      {(bgMode === 'overview' ? pIdle : (actor === 'player' ? pAction : undefined)) && (
                        <img src={bgMode === 'overview' ? pIdle : pAction} alt=""
                          className={`dev-hud-ow dev-hud-fighter-sprite dev-hud-anchored player ${bgMode === 'action' ? 'action-mode' : ''} ${bgMode === 'action' && actionSpecial ? 'special-actor' : ''}`}
                          style={bgMode === 'action' ? (() => { const aa = actionAnchorFor(actor, actionSpecial); return { left: `${aa.x}%`, top: `${aa.y}%` }; })() : { left: `${pa.x}%`, top: `${pa.y}%` }} />
                      )}
                      {(bgMode === 'overview' ? eIdle : (actor === 'enemy' ? eAction : undefined)) && (
                        <img src={bgMode === 'overview' ? eIdle : eAction} alt=""
                          className={`dev-hud-ow dev-hud-fighter-sprite dev-hud-anchored enemy ${bgMode === 'action' ? 'action-mode' : ''} ${bgMode === 'action' && actionSpecial ? 'special-actor' : ''}`}
                          style={bgMode === 'action' ? (() => { const aa = actionAnchorFor(actor, actionSpecial); return { left: `${aa.x}%`, top: `${aa.y}%` }; })() : { left: `${ea.x}%`, top: `${ea.y}%` }} />
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* cc-dock: NO es elemento del juego (display:none en main.tsx —
                el CC vive en hud-top cc-stat + chip de panel) → no se pinta */}

            <div className="battle-controls dev-hud-battle-controls">
              {/* Chips CC + FASE: solo en vistas de panel con cartas —
                  ocultos en DIÁLOGO (el cuadro GBC los reemplaza), STAGE
                  (QTE), RESULTADO, INTRO y MENÚ (igual que el juego) */}
              {['COMMAND', 'MANO', 'BASIC', 'MOVE', 'LIMIT', 'DEFENSA', 'DISCARD'].includes(view) && (
                <>
                  <div className="phase-chip-row">
                    <span className="phase-chip" data-tip={tipBlock('FASE', [['desc', 'ATTACK 1/2 — exchange del turno (quién ataca/defiende ya lo dice la fase del hud superior)']])}>ATTACK 1/2</span>
                  </div>
                  {/* CC estilo GBC: esquina inferior derecha (como el juego) */}
                  <div className="cc-panel" data-tip={tipBlock('CC', [['stats', '6 / 99']])}>06</div>
                </>
              )}
              {/* DIÁLOGO (cuadro GBC estructurado) — dentro de la caja,
                  misma altura que los botones */}
              {view === 'DIALOGO' && (
                <div className={`gbc-dialogue speaker-${dlgSide}`}>
                  {/* Sprite de STORY del que habla, FUERA de la caja (izquierda
                      o derecha según el lado), con máscara y marco negro —
                      la caja no cambia de tamaño */}
                  <div className={`gbc-dialogue-speaker ${dlgSide}`}>
                    <img src={(dlgSide === 'left' ? resolveSpeakerPortrait('goku', P_FORM) : resolveSpeakerPortrait('cell', P_FORM)) ?? ''} alt={dlgSide === 'left' ? 'GOKU' : 'CELL'} className="gbc-dialogue-speaker-img" draggable={false} />
                  </div>
                  <div className="gbc-dialogue-body">
                    <div className="gbc-dialogue-content">
                      <div className="gbc-dialogue-actor">{dlgSide === 'left' ? 'GOKU' : 'CELL'}</div>
                      <div className="gbc-dialogue-text">uses {dlgSide === 'left' ? 'KAMEHAMEHA!' : 'SPECIAL BEAM CANNON!'}<span className="gbc-dialogue-cursor">▼</span></div>
                    </div>
                  </div>
                </div>
              )}
              {/* COMMAND: LIMIT · JOINT · BASIC */}
              {view === 'COMMAND' && (
                <div className="command-select">
                  <div className="command-strip">
                    <button className="cmd-limit" data-tip={tipBlock('LIMITED', [['desc', 'Cartas exclusivas del personaje.']])} />
                    <button className="cmd-j" data-tip={tipBlock('JOINT', [['desc', 'Cartas de tu mano.']])} />
                    <button className="cmd-b" data-tip={tipBlock('BASIC', [['desc', 'Acciones libres sin CC.']])} />
                  </div>
                </div>
              )}

              {/* MANO: cartas reales + HUECOS hasta el máximo (6 transitorio /
                  5 persistente) — como en LIMIT, se ve cuántas cartas caben */}
              {view === 'MANO' && (
                <div className="hand-area">
                  <div className="hand-label">— MANO ({handCards.length}/6) —</div>
                  <div className="hand-cards">
                    {handCards.map((card, i) => (
                      <HudCard key={card.id} card={card} selected={i === 1} disabled={i === 2} />
                    ))}
                    {/* Huecos vacíos = MISMO sprite que el juego (NO CARD) */}
                    {Array.from({ length: 6 - handCards.length }).map((_, i) => (
                      <div key={`slot-${i}`} className="hand-empty-slot"
                        data-tip={tipBlock('HUECO DE MANO', [
                          ['desc', 'Máx 6 transitorio (5 persistente).'],
                        ])}>
                        <img src="/assets/ui/hud_buttons/no_card_red.png" alt="NO CARD" className="hand-no-card" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BASIC: Stage = LA CARTA REAL (igual que en la mano) · Gather · Back */}
              {view === 'BASIC' && (
                <div className="command-select">
                  <div className="basic-menu">
                    {(() => {
                      const stageCard = getCard(1);   // "3 stage atk." (id N-2)
                      return stageCard ? (
                        <button className="card basic-stage-card"
                          style={{ '--card-frame': `url('${CARD_FRAME_BY_TYPE[stageCard.type] ?? CARD_FRAME_BY_TYPE.command}')`, '--card-color': CARD_COLORS[stageCard.type] } as React.CSSProperties}
                          data-tip={tipBlock('STAGE ATTACK — 3 STAGE', [
                            ['desc', 'Secuencia de inputs A/B a tiempo.'],
                            ['effect', 'Cada acierto +1 CC (más si completas la cadena).'],
                          ])}>
                          <CardArtHole frameUrl={CARD_FRAME_BY_TYPE[stageCard.type] ?? CARD_FRAME_BY_TYPE.command} iconUrl={cardIconUrl(stageCard.id)} />
                        </button>
                      ) : null;
                    })()}
                    <button className="basic-btn basic-gather" data-tip={tipBlock('GATHER POWER', [['stats', 'STR/KI +8']])} />
                    <button className="basic-btn basic-back" data-tip={tipBlock('BACK', [['desc', 'Volver al menú anterior']])} />
                  </div>
                </div>
              )}

              {/* MOVE: los 2 botones de eje + BACK en UNA fila — MISMO tamaño
                  que command-strip (96×80, sprite ×2 ENTERO). Sin texto: el
                  data-tip explica HORIZONTAL/VERTICAL. Sprites reales
                  btn_move_axis_h/v.png + btn_exit.png vía CSS. */}
              {view === 'MOVE' && (
                <div className="move-axis-pad">
                  <button className="move-axis-btn axis-h"
                    data-tip={tipBlock('HORIZONTAL ↔', [
                      ['desc', 'LEFT/RIGHT — movimiento frontal.'],
                      ['effect', 'DOWN_BACK → DOWN_FRONT'],
                    ])} />
                  <button className="move-axis-btn axis-v"
                    data-tip={tipBlock('VERTICAL ↕', [
                      ['desc', 'UP/DOWN — movimiento de altura.'],
                      ['effect', 'DOWN_BACK → UP_BACK'],
                    ])} />
                  <button className="basic-btn basic-back"
                    data-tip={tipBlock('BACK', [['desc', 'Volver al menú anterior']])} />
                </div>
              )}

              {/* STAGE: el QTE real — secuencia de inputs con los sprites del
                  paquete ORGANIZADO (key_q/key_e/↑↓/flechas) + prompt + el
                  TIEMPO de reacción destacado + recovery */}
              {view === 'STAGE' && (
                /* M8.C2a — StageHudPanel CANÓNICO: el MISMO componente que
                   BattleScreen. El Dev Studio solo lo envuelve en el preview;
                   nunca más composiciones divergentes del QTE. */
                <StageHudPanel
                  portraitUrl={(dlgSide === 'left' ? resolveSpeakerPortrait('goku', P_FORM) : resolveSpeakerPortrait('cell', P_FORM)) ?? ''}
                  seq={['A', 'B', 'UP', 'RIGHT', 'A', 'B'].slice(0, stageLen) as never}
                  idx={1}
                  state="INPUT_WINDOW"
                  feedback="correct"
                  elapsedSec={0.6}
                  limitSec={1.2}
                  side={dlgSide}
                />
              )}

              {/* BEAM/DAMAGE: estados de acción ROM visibles en el mismo HUD
                  compartido. La tarjeta es real; la secuencia se valida en
                  Combat Lab y no se inventa una película desde el preview. */}
              {(view === 'BEAM' || view === 'DAMAGE') && (
                <div className="action-state-panel">
                  <div className="action-state-track">
                    {(view === 'BEAM' ? ['CHARGE', 'RELEASE', 'TRAVEL', 'CONTACT', 'REACTION'] : ['PREPARE', 'APPROACH', 'IMPACT', 'REACTION', 'RETURN']).map((state, i) => (
                      <span key={state} className={`action-state-chip ${i === 0 ? 'active' : ''}`}>{state}</span>
                    ))}
                  </div>
                  <div className="action-state-card">
                    <HudCard card={getCard(view === 'BEAM' ? 8 : 5)!} selected />
                    <span>{view === 'BEAM' ? 'Energy Bomb · ROM BEAM_BASE' : 'Cont.Punch · ROM STANDARD_DAMAGE'}</span>
                  </div>
                </div>
              )}

              {/* LIMIT: MISMO layout que la mano (una línea, marco + arte) */}
              {view === 'LIMIT' && (
                <div className="command-select">
                  <div className="limit-cards-row">
                    <div className="hand-cards">
                      {limitCards.map(c => (
                        <button key={c.id} className="limit-card"
                          style={{ '--card-frame': `url('${CARD_FRAME_BY_TYPE[c.type] ?? CARD_FRAME_BY_TYPE.special}')` } as React.CSSProperties}
                          data-tip={tipCard(c.name, CARD_TYPE_NAMES[c.type], CARD_COLORS_ON_LIGHT[c.type], c.rarity, [
                            ['stats', `CC ${c.cc} · ATK ${c.atk > 0 ? c.atk : '—'} · ACC ${c.acc}%`],
                            ['effect', 'Reutilizable mientras tengas CC.'],
                          ])}>
                          <CardArtHole frameUrl={CARD_FRAME_BY_TYPE[c.type] ?? CARD_FRAME_BY_TYPE.special} iconUrl={cardIconUrl(c.id)} />
                        </button>
                      ))}
                      {/* Hueco de ejemplo: Limit no obtenida */}
                      <div className="limit-slot" data-tip={tipBlock('LIMIT — NO OBTENIDA', [['desc', 'Se desbloquea jugando la historia.']])}>
                        <Lock size={16} />
                      </div>
                    </div>
                    <button className="basic-btn basic-back" data-tip={tipBlock('BACK', [['desc', 'Volver al menú de comandos']])} />
                  </div>
                </div>
              )}

              {/* DISCARD: como la MANO JOINT (es la mano donde descartas) —
                  MISMO layout: fila de cartas 96×80 con gap 10px, sin textos */}
              {view === 'DISCARD' && (
                <div className="hand-area">
                  <div className="hand-cards">
                    {handCards.map((card, i) => (
                      <HudCard key={card.id} card={card} selected={i === 1} disabled={i === 2} />
                    ))}
                  </div>
                </div>
              )}

              {/* DEFENSA: SOLO los 3 botones de fuente (sin etiqueta) */}
              {view === 'DEFENSA' && (
                <div className="defense-sources">
                  <button className="basic-btn src-limit"
                    data-tip={tipBlock('LIMITED', [['desc', 'Defensas exclusivas del personaje.'], ['effect', 'Requiere GATHER POWER activo.']])} />
                  <button className="basic-btn src-joint"
                    data-tip={tipBlock('JOINT', [['desc', 'Cartas de defensa/soporte de tu mano.']])} />
                  <button className="basic-btn src-basic"
                    data-tip={tipBlock('BASIC DEFENSE', [['desc', 'Quedarte y bloquear (−50% dmg) o MOVE.'], ['effect', 'Gratis, sin gastar CC.']])} />
                </div>
              )}

              {/* RESULTADO: panel COMPACTO — no debe alterar la altura del
                  panel de controles (como los demás: ~96px) */}
              {view === 'RESULTADO' && (
                <div className={`result-screen ${result === 'victory' ? '' : 'defeat-mode'}`}>
                  <div className={`result-title ${result}`}>{result === 'victory' ? 'VICTORY' : 'DEFEAT'}</div>
                  <div className="result-info">
                    {result === 'victory'
                      ? (<><span>LV 50</span><span>EXP +180</span><span>HP 720/1000</span></>)
                      : (<><span>TURN 1</span><span>HP 0/1000</span></>)}
                  </div>
                  <button className="btn-primary" data-tip={tipBlock(result === 'victory' ? 'NEW BATTLE' : 'RETRY', [['desc', 'Volver a intentarlo']])}>
                    {result === 'victory' ? 'NEW BATTLE' : 'RETRY'}
                  </button>
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
    </div>
  );
}
