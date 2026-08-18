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

// Alias canónico de la especificación de frames/acciones V1 (§5.3, §20):
// air_back/air_front/ground_back/ground_front. Mismo conjunto de 4 estados;
// los nombres del proyecto (UP/DOWN × BACK/FRONT) son el aliasing interno.
export type SpecBattlePosition =
  | 'air_back' | 'air_front' | 'ground_back' | 'ground_front';

export function toSpecPosition(p: BattlePosition): SpecBattlePosition {
  const { altitude, depth } = POSITION_DATA[p];
  return `${altitude === 'AIR' ? 'air' : 'ground'}_${depth === 'BACK' ? 'back' : 'front'}` as SpecBattlePosition;
}

export function fromSpecPosition(s: SpecBattlePosition): BattlePosition {
  const [alt, depth] = s.split('_');
  return (alt === 'air' ? 'UP' : 'DOWN') + '_' + (depth === 'back' ? 'BACK' : 'FRONT') as BattlePosition;
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
export type PositionAnchor = { x: number; y: number };
export type PositionSide = 'LEFT' | 'RIGHT';

export const DEFAULT_LEFT_ANCHORS: Record<BattlePosition, PositionAnchor> = {
  [BattlePosition.UP_BACK]: { x: 16, y: 26 },
  [BattlePosition.UP_FRONT]: { x: 32, y: 26 },
  [BattlePosition.DOWN_BACK]: { x: 16, y: 72 },
  [BattlePosition.DOWN_FRONT]: { x: 32, y: 72 },
};

export const DEFAULT_RIGHT_ANCHORS: Record<BattlePosition, PositionAnchor> = {
  [BattlePosition.UP_BACK]: { x: 84, y: 26 },
  [BattlePosition.UP_FRONT]: { x: 68, y: 26 },
  [BattlePosition.DOWN_BACK]: { x: 84, y: 72 },
  [BattlePosition.DOWN_FRONT]: { x: 68, y: 72 },
};

export const LEFT_ANCHORS = DEFAULT_LEFT_ANCHORS;
export const RIGHT_ANCHORS = DEFAULT_RIGHT_ANCHORS;

const ANCHOR_OVERRIDE_KEY = 'dbzlsw:position-anchors';

export type PositionAnchorOverrides = Partial<Record<PositionSide, Partial<Record<BattlePosition, PositionAnchor>>>>;

function clampAnchor(anchor: PositionAnchor): PositionAnchor {
  return {
    x: Math.max(0, Math.min(100, Math.round(anchor.x * 10) / 10)),
    y: Math.max(0, Math.min(100, Math.round(anchor.y * 10) / 10)),
  };
}

export function defaultAnchorFor(pos: BattlePosition, side: PositionSide): PositionAnchor {
  return side === 'LEFT' ? DEFAULT_LEFT_ANCHORS[pos] : DEFAULT_RIGHT_ANCHORS[pos];
}

export function loadPositionAnchorOverrides(): PositionAnchorOverrides {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ANCHOR_OVERRIDE_KEY);
    return raw ? (JSON.parse(raw) as PositionAnchorOverrides) : {};
  } catch {
    return {};
  }
}

export function savePositionAnchorOverrides(overrides: PositionAnchorOverrides): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ANCHOR_OVERRIDE_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore quota/private-mode errors; Position Lab can still preview defaults.
  }
}

export function clearPositionAnchorOverrides(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(ANCHOR_OVERRIDE_KEY);
  } catch {
    // noop
  }
}

export function setPositionAnchorOverride(side: PositionSide, pos: BattlePosition, anchor: PositionAnchor): PositionAnchorOverrides {
  const current = loadPositionAnchorOverrides();
  const next: PositionAnchorOverrides = {
    ...current,
    [side]: {
      ...(current[side] ?? {}),
      [pos]: clampAnchor(anchor),
    },
  };
  savePositionAnchorOverrides(next);
  return next;
}

export function anchorFor(pos: BattlePosition, side: PositionSide): PositionAnchor {
  const override = loadPositionAnchorOverrides()[side]?.[pos];
  return override ? clampAnchor(override) : defaultAnchorFor(pos, side);
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
