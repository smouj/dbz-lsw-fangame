// ═══════════════════════════════════════════════════════════
// Dev Studio — Performance
// Medición del navegador para decidir optimizaciones con datos reales.
// Este módulo solo se carga en #dev; no forma parte del juego publicado.
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Clock3, Database, Gauge, Play, RefreshCw, Square, Zap } from 'lucide-react';
import { runtimePerformanceProfiler, type PerformanceSnapshot } from './performance/runtimeProfiler';

const formatMs = (value: number) => `${value.toFixed(2)} ms`;
const formatBytes = (value: number | null) => {
  if (value === null) return 'N/D';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
};

function Metric({ icon: Icon, label, value, hint, tone = 'neutral' }: {
  icon: typeof Activity; label: string; value: string; hint?: string; tone?: 'neutral' | 'ok' | 'warn';
}) {
  return (
    <article className={`dev-perf-metric ${tone}`}>
      <div className="dev-perf-metric-head"><Icon size={14} /><span>{label}</span></div>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}

export function PerformanceModule() {
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot>(() => runtimePerformanceProfiler.snapshot());

  useEffect(() => {
    // Start automatically on first visit so a developer can open the panel,
    // launch BattleScreen and keep collecting while the Dev page is unmounted.
    if (!runtimePerformanceProfiler.snapshot().active) runtimePerformanceProfiler.start();
    const timer = window.setInterval(() => setSnapshot(runtimePerformanceProfiler.snapshot()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const start = () => { runtimePerformanceProfiler.start(); setSnapshot(runtimePerformanceProfiler.snapshot()); };
  const stop = () => { runtimePerformanceProfiler.stop(); setSnapshot(runtimePerformanceProfiler.snapshot()); };
  const mark = (name: string) => { runtimePerformanceProfiler.mark(name); setSnapshot(runtimePerformanceProfiler.snapshot()); };
  const targetFrameMs = 1000 / 59.7275;
  const frameTone = snapshot.active && snapshot.averageFrameMs > targetFrameMs * 1.25 ? 'warn' : 'ok';

  return (
    <div className="dev-panel dev-performance">
      <header className="dev-header">
        <h1><Gauge size={16} /> Performance</h1>
        <p className="dev-sub">Medición de BattleScreen y del navegador. Solo se muestran datos expuestos por la plataforma; no se estiman texturas ni draw calls.</p>
      </header>

      <section className="dev-perf-toolbar" aria-label="Controles de captura">
        <span className={`dev-status-pill ${snapshot.active ? 'ok' : 'info'}`}><Activity size={12} /> {snapshot.active ? 'CAPTURANDO' : 'DETENIDO'}</span>
        <button type="button" className="dev-btn dev-btn-primary" onClick={start}><Play size={13} /> Reiniciar captura</button>
        <button type="button" className="dev-btn" onClick={stop} disabled={!snapshot.active}><Square size={13} /> Detener</button>
        <span className="dev-perf-target">Objetivo GBC: {formatMs(targetFrameMs)} / frame</span>
      </section>

      <div className="dev-perf-grid">
        <Metric icon={Gauge} label="FPS observado" value={snapshot.fps ? snapshot.fps.toFixed(1) : '—'} hint="Ventana desde el inicio de captura" tone={snapshot.fps >= 55 || !snapshot.active ? 'ok' : 'warn'} />
        <Metric icon={Clock3} label="Frame medio" value={formatMs(snapshot.averageFrameMs)} hint={`Peor: ${formatMs(snapshot.worstFrameMs)}`} tone={frameTone} />
        <Metric icon={AlertTriangle} label="Tareas largas" value={`${snapshot.longTasks}`} hint="Entradas Long Task > 50 ms" tone={snapshot.longTasks === 0 ? 'ok' : 'warn'} />
        <Metric icon={Database} label="Recursos" value={`${snapshot.resources}`} hint={formatBytes(snapshot.resourceBytes)} />
        <Metric icon={Zap} label="Heap JS" value={formatBytes(snapshot.heapUsedBytes)} hint={snapshot.heapLimitBytes === null ? 'API no expuesta' : `límite ${formatBytes(snapshot.heapLimitBytes)}`} />
        <Metric icon={RefreshCw} label="Captura" value={`${(snapshot.elapsedMs / 1000).toFixed(1)} s`} hint={`${snapshot.frames} frames observados`} />
      </div>

      <section className="dev-section dev-perf-section">
        <div className="dev-section-title"><Activity size={14} /><h2>Marcas de recorrido</h2></div>
        <p className="dev-hint">Usa estas marcas al recorrer Main Menu → Battle → acción → cleanup. La captura continúa aunque navegues fuera de este módulo.</p>
        <div className="dev-perf-marks">
          {['MAIN_MENU', 'BATTLE_READY', 'ACTION_START', 'IMPACT', 'CLEANUP'].map(name => (
            <button key={name} type="button" className="dev-btn dev-btn-sm" onClick={() => mark(name)} disabled={!snapshot.active}>{name}</button>
          ))}
        </div>
        {snapshot.marks.length === 0 ? <p className="dev-perf-empty">Aún no hay marcas en esta captura.</p> : (
          <ol className="dev-perf-mark-list">
            {snapshot.marks.map((entry, index) => <li key={`${entry.name}-${index}`}><code>{entry.name}</code><span>{(entry.elapsedMs / 1000).toFixed(3)} s</span></li>)}
          </ol>
        )}
      </section>

      <section className="dev-section dev-perf-section">
        <div className="dev-section-title"><Database size={14} /><h2>Alcance de la medición</h2></div>
        <div className="dev-perf-notes">
          <p><strong>Medido:</strong> frame time, FPS, tareas largas, recursos descargados, bytes transferidos y heap JS cuando el navegador lo expone.</p>
          <p><strong>No inventado:</strong> Pixi no ofrece un contador estable de draw calls, texturas GPU o memoria de vídeo entre backends; esos valores quedan como N/D hasta instrumentar el renderer con una fuente verificable.</p>
        </div>
      </section>
    </div>
  );
}
