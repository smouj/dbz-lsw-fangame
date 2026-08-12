// ═══════════════════════════════════════════════════════════
// DBZ LSW — Depurador cinematográfico (plan del usuario, punto 18)
// ═══════════════════════════════════════════════════════════
// Modo ?debugCinematics=1: overlay con ACTION/SHOT/TICK y controles
// Space Play/Pause · ← → ±1 tick · Shift←→ ±10 ticks · R Restart.
// Se engancha al BattleTimeline vía el callback onDebugTick.

export interface CinematicDebugInfo {
  action: string;
  shot: string;
  tick: number;
  totalTicks: number;
  actor: { animation: string; frame: string } | null;
  defender: { animation: string; frame: string } | null;
  projectile: { x: number } | null;
  nextEvent: { type: string; tick: number } | null;
}

export function isDebugCinematics(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debugCinematics');
}

export interface CinematicDebugController {
  paused: boolean;
  seekBy: (ticks: number) => void;
  togglePause: () => void;
  restart: () => void;
}

/** Gestiona el teclado del depurador. Devuelve cleanup. */
export function bindDebugControls(ctrl: CinematicDebugController): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === ' ') { e.preventDefault(); ctrl.togglePause(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); ctrl.seekBy(e.shiftKey ? 10 : 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); ctrl.seekBy(e.shiftKey ? -10 : -1); }
    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); ctrl.restart(); }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

export function renderDebugOverlay(info: CinematicDebugInfo | null, paused: boolean): string {
  if (!info) return '';
  return [
    `ACTION: ${info.action}`,
    `SHOT: ${info.shot}`,
    `TICK: ${info.tick} / ${info.totalTicks}${paused ? ' ⏸' : ''}`,
    info.actor ? `Attacker: ${info.actor.animation} ${info.actor.frame}` : '',
    info.defender ? `Defender: ${info.defender.animation} ${info.defender.frame}` : '',
    info.projectile ? `Projectile: x=${info.projectile.x}%` : '',
    info.nextEvent ? `Next event: ${info.nextEvent.type} @ tick ${info.nextEvent.tick}` : '',
  ].filter(Boolean).join('\n');
}
