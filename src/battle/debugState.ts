// ═══════════════════════════════════════════════════════════
// DBZ LSW — Inspector de estado interno + debugger del QTE
// ═══════════════════════════════════════════════════════════
// Modo ?debugState=1: overlay con el estado interno de BattleScreen
// (fase, CC, posiciones, stages, QTE) y controles para congelar/avanzar
// el reloj del Stage Attack (QTE) frame a frame.

export function isDebugState(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debugState');
}

export interface QteDebugController {
  readonly frozen: boolean;
  toggleFreeze: () => void;
  step: (frames: number) => void;
}

/**
 * Teclas del debugger del QTE. No colisionan con los inputs del Stage Attack
 * (que usan Q/E/WASD/flechas):
 *   F          → congelar/descongelar el reloj del QTE
 *   . (punto)  → avanzar +1 frame GBC
 *   Shift + .  → avanzar +10 frames
 */
export function bindQteDebugControls(ctrl: QteDebugController): () => void {
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === 'f') { e.preventDefault(); ctrl.toggleFreeze(); }
    else if (e.key === '.') { e.preventDefault(); ctrl.step(e.shiftKey ? 10 : 1); }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

// ─── Snapshot tipado para el overlay (se construye en main.tsx) ───

export interface FighterDebug {
  side: 'P' | 'E';
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  cc: number;
  maxCc: number;
  pos: string;   // "GROUND / FRONT"
  pose: string;
}

export interface StateDebugSnapshot {
  phase: string;
  round: number;
  exchange: string;   // "1/2"
  owner: string;
  initiative: string;
  attacker: string;
  defender: string;
  defenseState: string;
  tick: number;
  rng: number;
  control: string;
  fighters: FighterDebug[];
  pStages: string;
  eStages: string;
  power: string;
  gather: number;
  buff: number;
  lockOn: boolean;
  acc: number;
  eva: number;
  handSize: number;
  selected: string | null;
  qte: string | null;
}

export function renderStateOverlay(s: StateDebugSnapshot, qteFrozen: boolean): string {
  const lines: string[] = [];
  // P0 — la barrera de control es lo PRIMERO: si pone PLAYER_DEFENSE_CHOICE
  // y el enemigo ataca, alguien se está saltando la frontera.
  lines.push(`CONTROL ${s.control}`);
  lines.push(`PHASE ${s.phase} · ROUND ${s.round} · EXCH ${s.exchange} · INITIATIVE ${s.initiative} · ATTACKER ${s.attacker} · DEFENDER ${s.defender}`);
  lines.push(`DEFENSE ${s.defenseState} · TICK ${s.tick} · RNG ${s.rng}`);
  for (const f of s.fighters) {
    lines.push(`${f.side} ${f.name} Lv${f.level}  HP ${f.hp}/${f.maxHp}  CC ${f.cc}/${f.maxCc}  [${f.pos}]  ${f.pose}`);
  }
  lines.push(`P STAGES ${s.pStages}`);
  lines.push(`E STAGES ${s.eStages}`);
  lines.push(`POWER ${s.power} · GATHER ${s.gather} · BUFF ${s.buff} · LOCK ${s.lockOn ? 'ON' : 'off'} · ACC ${s.acc} · EVA ${s.eva}`);
  lines.push(`HAND ${s.handSize} · SEL ${s.selected ?? '—'}`);
  if (s.qte) lines.push(`QTE ${s.qte}${qteFrozen ? ' [FROZEN]' : ''}`);
  return lines.join('\n');
}
