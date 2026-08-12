// ═══════════════════════════════════════════════════════════
// DBZ LSW — Posiciones tácticas del campo (4 por combatiente)
// ═══════════════════════════════════════════════════════════
// El campo NO es "AIR/GROUND + FRONT/BACK" como etiquetas sueltas: cada
// combatiente tiene 4 estados tácticos seleccionables (manual USA + foros):
//   UP_BACK    Arriba/Aire · Lejos (borde propio)
//   UP_FRONT   Arriba/Aire · Cerca (centro)
//   DOWN_BACK  Abajo/Suelo · Lejos (borde propio)
//   DOWN_FRONT Abajo/Suelo · Cerca (centro)
// La posición inicial NORMAL es DOWN_BACK para ambos (abajo, suelo, borde
// propio, lejos del rival). Posición PERSISTENTE: solo cambia con MOVE en
// Basic Defense. BACK=defensivo/ataque↓ · FRONT=ofensivo/defensa↓ ·
// AIR=vulnerable a BEAM · GROUND=vulnerable a DAMAGE.
// Los valores numéricos exactos (modificadores, timings) siguen siendo
// HYPOTHESIS hasta la captura forense de la ROM (CRC32 025AA88A).

export enum BattlePosition {
  UP_BACK = 'UP_BACK',
  UP_FRONT = 'UP_FRONT',
  DOWN_BACK = 'DOWN_BACK',
  DOWN_FRONT = 'DOWN_FRONT',
}

export const BATTLE_POSITIONS: BattlePosition[] = [
  BattlePosition.UP_BACK,
  BattlePosition.UP_FRONT,
  BattlePosition.DOWN_BACK,
  BattlePosition.DOWN_FRONT,
];

export type Altitude = 'AIR' | 'GROUND';
export type Depth = 'BACK' | 'FRONT';

export const POSITION_DATA: Record<BattlePosition, { altitude: Altitude; depth: Depth }> = {
  [BattlePosition.UP_BACK]: { altitude: 'AIR', depth: 'BACK' },
  [BattlePosition.UP_FRONT]: { altitude: 'AIR', depth: 'FRONT' },
  [BattlePosition.DOWN_BACK]: { altitude: 'GROUND', depth: 'BACK' },
  [BattlePosition.DOWN_FRONT]: { altitude: 'GROUND', depth: 'FRONT' },
};

// Distancia relativa entre combatientes, derivada de las posiciones de AMBOS
// (nunca almacenar una distancia arbitraria independiente):
//   BACK + BACK → FAR      (ambos en sus bordes)
//   FRONT + BACK → MID     (uno avanza)
//   BACK + FRONT → MID
//   FRONT + FRONT → CLOSE  (distancia horizontal mínima)
export type HorizontalDistance = 'FAR' | 'MID' | 'CLOSE';

export function resolveRelativeDistance(a: BattlePosition, b: BattlePosition): HorizontalDistance {
  const da = POSITION_DATA[a].depth;
  const db = POSITION_DATA[b].depth;
  if (da === 'FRONT' && db === 'FRONT') return 'CLOSE';
  if (da === 'BACK' && db === 'BACK') return 'FAR';
  return 'MID';
}

// Modificadores tácticos (HYPOTHESIS — valores exactos por medir en ROM):
// BACK = ataque↓ defensa↑ · FRONT = ataque↑ defensa↓
export function attackModifier(pos: BattlePosition): 'UP' | 'DOWN' {
  return POSITION_DATA[pos].depth === 'FRONT' ? 'UP' : 'DOWN';
}

export function defenseModifier(pos: BattlePosition): 'UP' | 'DOWN' {
  return POSITION_DATA[pos].depth === 'FRONT' ? 'DOWN' : 'UP';
}

// Vulnerabilidades (CONFIRMED_MANUAL — RPGClassics):
// AIR → vulnerable a BEAM · GROUND → vulnerable a DAMAGE
export function isBeamVulnerable(pos: BattlePosition): boolean {
  return POSITION_DATA[pos].altitude === 'AIR';
}

export function isDamageVulnerable(pos: BattlePosition): boolean {
  return POSITION_DATA[pos].altitude === 'GROUND';
}

// ─── Anchors visuales (8 en total: 4 por lado, BACK reflejado) ───
// El escenario completo necesita 8 puntos físicos: LEFT (jugador) y RIGHT
// (enemigo) NO comparten X porque BACK apunta al borde propio de cada lado.
// Coordenadas en porcentaje del viewport del campo (0-100).
export const LEFT_ANCHORS: Record<BattlePosition, { x: number; y: number }> = {
  [BattlePosition.UP_BACK]: { x: 16, y: 26 },
  [BattlePosition.UP_FRONT]: { x: 32, y: 26 },
  [BattlePosition.DOWN_BACK]: { x: 16, y: 68 },
  [BattlePosition.DOWN_FRONT]: { x: 32, y: 68 },
};

export const RIGHT_ANCHORS: Record<BattlePosition, { x: number; y: number }> = {
  [BattlePosition.UP_BACK]: { x: 84, y: 26 },
  [BattlePosition.UP_FRONT]: { x: 68, y: 26 },
  [BattlePosition.DOWN_BACK]: { x: 84, y: 68 },
  [BattlePosition.DOWN_FRONT]: { x: 68, y: 68 },
};

export function anchorFor(pos: BattlePosition, side: 'LEFT' | 'RIGHT') {
  return side === 'LEFT' ? LEFT_ANCHORS[pos] : RIGHT_ANCHORS[pos];
}

// ─── Movement: transformación de UN SOLO eje (manual GBC, 2026-08-12) ───
// La interfaz de Movement NO ofrece las 4 posiciones como destinos directos
// (eso permitiría diagonales imposibles como Air/Back → Ground/Front). Solo
// hay DOS decisiones, cada una modifica UN eje y conserva el otro:
//   HORIZONTAL ↔ cambia depth (BACK↔FRONT) · VERTICAL ↕ cambia altitude
// Regla del manual §9: al avanzar a FRONT con el rival en BACK, el rival es
// empujado a FRONT (nunca hay dos posiciones de profundidad distintas en
// contacto); Vertical jamás toca Front/Back.
export function moveHorizontal(pos: BattlePosition): BattlePosition {
  const d = POSITION_DATA[pos].depth;
  const alt = POSITION_DATA[pos].altitude;
  return d === 'BACK'
    ? (alt === 'AIR' ? BattlePosition.UP_FRONT : BattlePosition.DOWN_FRONT)
    : (alt === 'AIR' ? BattlePosition.UP_BACK : BattlePosition.DOWN_BACK);
}

export function moveVertical(pos: BattlePosition): BattlePosition {
  const d = POSITION_DATA[pos].depth;
  const alt = POSITION_DATA[pos].altitude;
  return alt === 'GROUND'
    ? (d === 'BACK' ? BattlePosition.UP_BACK : BattlePosition.UP_FRONT)
    : (d === 'BACK' ? BattlePosition.DOWN_BACK : BattlePosition.DOWN_FRONT);
}

// Resultado de aplicar un eje (para la preview CURRENT → RESULT del menú)
export type MoveAxis = 'HORIZONTAL' | 'VERTICAL';
export function applyMoveAxis(pos: BattlePosition, axis: MoveAxis): BattlePosition {
  return axis === 'HORIZONTAL' ? moveHorizontal(pos) : moveVertical(pos);
}

export function positionLabel(pos: BattlePosition): string {
  const d = POSITION_DATA[pos].depth;
  const alt = POSITION_DATA[pos].altitude;
  return `${alt === 'AIR' ? 'AIR' : 'GROUND'} / ${d === 'FRONT' ? 'FRONT' : 'BACK'}`;
}

// Etiquetas localizadas (la UI las traduce; aquí el nombre canónico)
export const POSITION_NAMES: Record<BattlePosition, string> = {
  [BattlePosition.UP_BACK]: 'Arriba · Lejos',
  [BattlePosition.UP_FRONT]: 'Arriba · Cerca',
  [BattlePosition.DOWN_BACK]: 'Abajo · Lejos',
  [BattlePosition.DOWN_FRONT]: 'Abajo · Cerca',
};
