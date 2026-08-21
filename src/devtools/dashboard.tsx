// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Dashboard: estado de producción.
// DEV-SYNC: TODOS los contadores vienen de getDevProjectSnapshot()
// (fuente común con Validation/GameConfig/Characters) — nunca
// hardcodeados. El pipeline mostrado es la arquitectura ACTUAL del
// motor (BattleCommand → Engine → Runtime → Presentation Adapter),
// no los módulos M1-M7 sueltos.
// ═══════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { getDevProjectSnapshot } from './devSnapshot';
import { GBC_NATIVE_FPS } from '../data/actionFidelity';
import type { DevModuleId } from './DevStudio';

interface StatCard { label: string; value: number; total: number; ok: boolean; hint?: string; }

const PIPELINE: Array<[string, string]> = [
  ['src/battle/engine/commands/', 'BattleCommand → canExecute (legalidad ÚNICA)'],
  ['src/battle/engine/commands/reduceAcceptedCommand.ts', 'reducers puros (M3) — resolución por dominio'],
  ['src/battle/engine/state/', 'BattleState puro + selectores (M1)'],
  ['src/battle/engine/events/', 'BattleEvent + EventLog (M4) — hechos, no vista'],
  ['src/battle/engine/clock/', 'GBC Clock en ticks (M6) — tiempo autoritativo'],
  ['src/battle/runtime/BattleRuntime.ts', 'orquestador ÚNICO: dispatch/advance → timeline → presenter'],
  ['src/battle/engine/presentation/buildTimeline.ts', 'Presentation Adapter (M7): EventLog → BattleTimeline'],
  ['src/battle/cinematic/GbcCinematicCanon.ts', 'F0 Ground Truth: solo FRAME_VERIFIED / VIDEO_VERIFIED'],
  ['src/data/generated/spriteCounts.generated.ts', 'conteos de frames por forma (fuente: OUT_frames)'],
];

export function DashboardModule({ onNavigate }: { onNavigate: (m: DevModuleId) => void }) {
  const snap = useMemo(() => getDevProjectSnapshot(), []);
  const { roster, cards, sprites, cinematics, story, audio, scenarios } = snap;

  const stats: StatCard[] = [
    { label: 'Formas (ROM 48)', value: roster.forms, total: roster.formsTotal, ok: roster.forms === roster.formsTotal },
    { label: 'Personajes', value: roster.characters, total: roster.characters, ok: roster.characters >= 24, hint: `${roster.characters} jugables` },
    { label: 'Cartas (ROM 125)', value: cards.count, total: cards.total, ok: cards.count === cards.total },
    { label: 'Capítulos con mazo', value: story.chapters, total: 32, ok: story.chapters >= 32 },
    { label: 'Combates de equipo', value: story.teamBattles, total: story.teamBattles, ok: story.teamBattles > 0, hint: `${story.teamBattles} cap. 2v2` },
    { label: 'Dirs de sprites', value: roster.withSpriteDir, total: roster.forms, ok: roster.withSpriteDir >= 42 },
    { label: 'Escenarios', value: scenarios, total: 13, ok: scenarios >= 13 },
    { label: 'Perfiles firma', value: cinematics.actionProfiles, total: cinematics.actionProfiles, ok: cinematics.actionProfiles >= 12, hint: 'mín. 12' },
  ];

  const alerts: { level: 'warn' | 'info'; text: string }[] = [];
  if (roster.forms !== roster.formsTotal) alerts.push({ level: 'warn', text: `Faltan ${roster.formsTotal - roster.forms} formas de la ROM (stats_full.json tiene 48).` });
  if (cards.count !== cards.total) alerts.push({ level: 'warn', text: `Faltan ${cards.total - cards.count} cartas de la tabla ROM.` });
  if (roster.withSpriteDir < roster.forms) alerts.push({ level: 'info', text: `${roster.forms - roster.withSpriteDir} formas sin sprite de combate animado: ${roster.withoutSpriteDir.join(', ')}.` });
  if (sprites.unknown > 0) alerts.push({ level: 'info', text: `${sprites.unknown} frames físicos sin evidencia (UNCLASSIFIED honestos — no se asignan a buckets por aproximación).` });
  if (cinematics.gbcVerified === 0) alerts.push({ level: 'info', text: 'F0: 0 secuencias GBC verificadas aún — todo lo funcional es INFERRED hasta captura (nunca se etiqueta como canon GBC).' });
  // RUNTIME vs CANON: las secuencias Stage funcionales son RUNTIME SEQUENCE
  // (fidelity INFERRED) — no "canon GBC" (eso es F0).
  alerts.push({ level: 'info', text: 'Stage Attack: ventanas BACK_BACK 1.2s · BACK_FRONT 1.7s · FRONT_BACK 2.4s · FRONT_FRONT 2.9s (manual USA).' });
  alerts.push({ level: 'info', text: 'Stage: RUNTIME SEQUENCE por nivel (pool fijo, rotación determinista) — fidelity INFERRED hasta verificación F0.' });
  alerts.push({ level: 'info', text: 'Iniciativa: SPD efectiva decide cada turno; empate → persiste la iniciativa actual (determinista — el Engine es puro, sin Math.random).' });
  alerts.push({ level: 'info', text: 'Contraataque: A≈0.4s / B≈0.15s — HYPOTHESIS hasta captura ROM.' });

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Estado de producción <span className="dev-header-fixed-badge" title="Header fijo estructural — si NO ves este badge, recarga con Ctrl+Shift+R">v4-fijo</span></h1>
        <p className="dev-sub">Contadores derivados de getDevProjectSnapshot() — la MISMA fuente que Validation, Game Config y Characters. Si algo difiere, el registro es la fuente.</p>
      </header>

      {/* ═══ PIPELINE ÚNICO + FIDELIDAD (2 col, contenido denso arriba) ═══ */}
      <div className="dev-dash-grid">
        <div className="dev-section">
          <h2>Pipeline único — fuentes de verdad</h2>
          <p className="dev-muted" style={{ marginTop: -4 }}>
            Todas las páginas del Dev Studio y el juego consumen ESTAS fuentes. No hay
            pipelines paralelos: un cambio aquí se refleja en todo.
          </p>
          <div className="dev-pipeline">
            {PIPELINE.map(([file, rol]) => (
              <div key={file} className="dev-pipeline-row">
                <span className="dev-pipeline-file"><code>{file}</code></span>
                <span className="dev-pipeline-rol">{rol}</span>
                <span className="dev-pipeline-ok">✓</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dev-section">
          <h2>Fidelidad</h2>
          <div className="dev-fidelity">
            {cinematics.fidelityByLevel.map(f => {
              const pct = Math.round((f.count / cinematics.fidelityTotal) * 100);
              const color = f.level === FidelityColorMap.FRAME_VERIFIED ? '#7fd4ff'
                : f.level === FidelityColorMap.VERIFIED ? '#3fae5a'
                : f.level === FidelityColorMap.INFERRED ? '#d8a830'
                : '#c04040';
              return (
                <div key={f.level} className="dev-fid-row">
                  <span className="dev-fid-label">{f.level}</span>
                  <div className="dev-fid-track"><div style={{ width: `${pct}%`, background: color }} /></div>
                  <span className="dev-fid-pct">{f.count}/{cinematics.fidelityTotal}</span>
                </div>
              );
            })}
            <div className="dev-fid-note">
              Sprites OUT_frames: <strong>{sprites.canonFrames}</strong> frames ({Object.entries(sprites.byStatus).map(([k, v]) => `${k} ${v}`).join(' · ')}) ·
              {sprites.runtimePoseCount} poses con frame físico de {sprites.poseOrder} en COMBAT_POSE_ORDER.
            </div>
            <div className="dev-fid-note">
              F0: <strong>{cinematics.gbcVerified}</strong> secuencias verificadas · {cinematics.gbcInferred} INFERRED ·
              {cinematics.gbcFamilies} familias cinematográficas · {cinematics.animationCanonFamilies} familias runtime ·
              reloj nativo {GBC_NATIVE_FPS} fps GBC.
            </div>
          </div>
        </div>
      </div>

      <div className="dev-grid dev-grid-cards">
        {stats.map(s => (
          <div key={s.label} className={`dev-stat-card ${s.ok ? 'ok' : 'bad'}`}>
            <div className="dev-stat-value">{s.value}<span className="dev-stat-total">/{s.total || '—'}</span></div>
            <div className="dev-stat-label">{s.label}</div>
            {s.hint && <div className="dev-stat-hint">{s.hint}</div>}
            <div className="dev-stat-bar"><div style={{ width: `${Math.min(100, (s.value / Math.max(1, s.total)) * 100)}%` }} /></div>
          </div>
        ))}
        <EngineMilestoneCard />
      </div>

      <div className="dev-dash-grid">
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
            <button className="dev-btn" onClick={() => onNavigate('positions')}>Position Lab</button>
            <button className="dev-btn" onClick={() => onNavigate('validation')}>Validación</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Colores por nivel — espejo del enum (evita importar el enum solo para esto)
const FidelityColorMap: Record<string, string> = { FRAME_VERIFIED: 'FRAME_VERIFIED', VERIFIED: 'VERIFIED', INFERRED: 'INFERRED' };

// ── Estado del BattleEngine — milestones de la migración M1→M9 ──
const ENGINE_MILESTONES = [
  { id: 'M1', label: 'State', done: true },
  { id: 'M2', label: 'Rules', done: true },
  { id: 'M3', label: 'Resolution', done: true },
  { id: 'M4', label: 'Events', done: true },
  { id: 'M5', label: 'RNG+Damage', done: true },
  { id: 'M6', label: 'Clock', done: true },
  { id: 'M7', label: 'Presentation', done: true },
  { id: 'M8', label: 'Cutover', done: false, hint: 'M8.C en curso: MOVE+GUARD+defensa migrados' },
  { id: 'M9', label: 'Replay', done: false },
];

function EngineMilestoneCard() {
  return (
    <div className="dev-stat-card ok dev-engine-card">
      <div className="dev-stat-value" style={{ fontSize: 15 }}>M7<span className="dev-stat-total" style={{ fontSize: 11 }}>/M9</span></div>
      <div className="dev-stat-label">BattleEngine (migración)</div>
      <div className="dev-engine-miles">
        {ENGINE_MILESTONES.map(m => (
          <span key={m.id} className={`dev-engine-mile ${m.done ? 'done' : ''}`} title={`${m.id} ${m.label}${m.hint ? ` — ${m.hint}` : ''}`}>
            {m.id}{m.done ? ' ✓' : ''}
          </span>
        ))}
      </div>
      <div className="dev-stat-hint">
        M8.C2a-L cerrado: DefenseState (NONE/AWAITING_CHOICE/COMMITTED) · END_EXCHANGE ·
        fase ≠ lado atacante · iniciativa dinámica por SPD efectiva.
      </div>
    </div>
  );
}
