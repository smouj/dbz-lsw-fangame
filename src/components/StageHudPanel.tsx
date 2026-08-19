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
  return (
    <div className={`stage-hud-panel speaker-${side}`} data-stage-state={state}>
      {/* PORTRAIT — FUERA del cuadro (como el speaker del diálogo GBC), en el
          lado del personaje. M8.C2a FIX: antes era columna DENTRO del panel
          blanco y se veía montado encima de los inputs; ahora el cuadro solo
          contiene la secuencia + timer y el retrato cuelga del borde (left =
          calc(100% + 24px) / right = calc(100% + 24px), igual que
          .gbc-dialogue-speaker). */}
      <div className={`stage-hud-portrait ${side}`}>
        {portraitUrl
          ? <img src={portraitUrl} alt="portrait" className="stage-hud-portrait-img" draggable={false} />
          : <span className="stage-hud-portrait-ph">?</span>}
      </div>

      {/* CUADRO — solo la secuencia de inputs del combo (+ timer). El prompt
          grande de tecla actual se ELIMINÓ (no es parte del GBC: el combo
          ya muestra qué tecla toca en la celda 'current'). */}
      <div className="stage-hud-box">
        <div className="stage-hud-track">
          {preparing ? (
            /* PREPARING: panel VACÍO (sin inputs ni cronómetro) — el Engine
               abre los inputs solo en QTE_STARTED (inputOpenTick). */
            <span className="stage-hud-prep">…</span>
          ) : (
            <div className="stage-hud-sequence">
              {seq.map((k, i) => (
                <span key={i} className={`stage-hud-cell ${i < idx ? 'done' : i === idx ? 'current' : 'future'}`}>
                  {i < idx
                    ? <span className="stage-hud-check">✓</span>
                    : <img src={`/assets/ui/qte/${stageKeyIcon(k)}.png`} alt={stageKeyLabel(k)} className="stage-hud-key" />}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* TIMER — fijo (tiempo numérico GBC, sin barra) */}
        <div className="stage-hud-timer">
          {!preparing && (
            <span className="stage-hud-time"><strong>{elapsedSec.toFixed(1)}</strong> / {limitSec.toFixed(1)}s</span>
          )}
        </div>
      </div>
    </div>
  );
}
