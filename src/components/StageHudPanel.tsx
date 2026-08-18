// ═══════════════════════════════════════════════════════════════════════
// StageHudPanel — PANEL CANÓNICO del Stage/QTE (geometría ÚNICA).
// ═══════════════════════════════════════════════════════════════════════
// REGLA M8.C2a: #dev/hud (HUD Studio) y BattleScreen renderizan EXACTAMENTE
// el mismo componente; el Dev Studio solo lo envuelve en un viewport de
// preview. Así NUNCA vuelven a divergir (la partida real llegó a mostrar
// media franja vacía porque main.tsx componía el QTE con otra estructura).
//
// Geometría canónica (3 columnas, sin huecos raros):
//   ┌──────────┬──────────────────────────────────┬──────────┐
//   │ PORTRAIT │ INPUT TRACK (centrado, celdas    │  TIMER   │
//   │  fijo    │  de igual tamaño y separación)   │  fijo    │
//   └──────────┴──────────────────────────────────┴──────────┘
// PREPARING  → PORTRAIT + PANEL VACÍO (sin inputs ni timer)
// QTE_STARTED→ PORTRAIT + [Q][E][↓]… + 0.6 / 1.2s
// ═══════════════════════════════════════════════════════════════════════

import { type StageKey } from '../battle/stageInputMap';

export interface StageHudPanelProps {
  /** Retrato del actor (URL del asset story/battle). */
  portraitUrl: string;
  /** Secuencia completa del QTE (inputs canónicos). */
  seq: StageKey[];
  /** Índice del input actual (0 = primer input pendiente). */
  idx: number;
  /** Estado del QTE según el Engine. */
  state: 'PREPARING' | 'INPUT_WINDOW' | 'COUNTER_WINDOW' | 'COMPLETED' | 'WAITING';
  /** Feedback visual del último input (acierto/fallo). */
  feedback?: 'correct' | 'wrong' | null;
  /** Segundos GBC transcurridos / límite (ventana total). */
  elapsedSec: number;
  limitSec: number;
  /** Side del speaker: retrato a la izquierda (player) o derecha (enemy). */
  side?: 'left' | 'right';
}

/** Icono del paquete UI para cada tecla canónica (assets reales). */
export function stageKeyIcon(key: StageKey): string {
  switch (key) {
    case 'UP': return 'arrow_up';
    case 'DOWN': return 'arrow_down';
    case 'LEFT': return 'arrow_left';
    case 'RIGHT': return 'arrow_right';
    case 'A': return 'key_q';
    case 'B': return 'key_e';
  }
}

/** Etiqueta legible de la tecla (teclado PC + pad GBC). */
export function stageKeyLabel(key: StageKey): string {
  switch (key) {
    case 'UP': return 'W / ↑';
    case 'DOWN': return 'S / ↓';
    case 'LEFT': return 'A / ←';
    case 'RIGHT': return 'D / →';
    case 'A': return 'A (Q)';
    case 'B': return 'B (E)';
  }
}

/**
 * Panel canónico del Stage/QTE. Consumido por BattleScreen (partida real) y
 * por el HUD Studio (#dev/hud → vista STAGE). Misma estructura, misma CSS.
 */
export function StageHudPanel({ portraitUrl, seq, idx, state, feedback = null, elapsedSec, limitSec, side = 'left' }: StageHudPanelProps) {
  const preparing = state === 'PREPARING';
  const curKey = seq[idx];
  return (
    <div className={`stage-hud-panel speaker-${side}`} data-stage-state={state}>
      {/* PORTRAIT — columna fija. ANCLAJE por lado (M8.C2a): si el actor es
          el personaje de la IZQUIERDA (player) el retrato va en la columna
          1; si es el de la DERECHA (enemy) va en la columna 3 (grid-order).
          El Dev Studio y el juego usan el mismo componente → mismo anclaje. */}
      <div className={`stage-hud-portrait ${side}`}>
        {portraitUrl
          ? <img src={portraitUrl} alt="portrait" className="stage-hud-portrait-img" draggable={false} />
          : <span className="stage-hud-portrait-ph">?</span>}
      </div>

      {/* INPUT TRACK — columna central (celdas de igual tamaño/separación) */}
      <div className="stage-hud-track">
        {preparing ? (
          /* PREPARING: panel VACÍO (sin inputs ni cronómetro) — el Engine
             abre los inputs solo en QTE_STARTED (inputOpenTick). */
          <span className="stage-hud-prep">…</span>
        ) : (
          <>
            <div className="stage-hud-sequence">
              {seq.map((k, i) => (
                <span key={i} className={`stage-hud-cell ${i < idx ? 'done' : i === idx ? 'current' : 'future'}`}>
                  {i < idx
                    ? <span className="stage-hud-check">✓</span>
                    : <img src={`/assets/ui/qte/${stageKeyIcon(k)}.png`} alt={stageKeyLabel(k)} className="stage-hud-key" />}
                </span>
              ))}
            </div>
            <div className={`stage-hud-prompt ${feedback ?? ''} ${curKey ?? ''}`}>
              {curKey && <img src={`/assets/ui/qte/${stageKeyIcon(curKey)}.png`} alt={curKey} className="stage-hud-key-big" />}
            </div>
          </>
        )}
      </div>

      {/* TIMER — columna fija (tiempo numérico GBC, sin barra) */}
      <div className="stage-hud-timer">
        {!preparing && (
          <span className="stage-hud-time"><strong>{elapsedSec.toFixed(1)}</strong> / {limitSec.toFixed(1)}s</span>
        )}
      </div>
    </div>
  );
}
