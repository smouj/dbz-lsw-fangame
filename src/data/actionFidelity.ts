// ═══════════════════════════════════════════════════════════
// DBZ LSW — Fidelidad de acciones (GBC Action Fidelity)
// Toda acción del combate lleva un nivel de fidelidad:
//   PLACEHOLDER     → implementación provisional sin datos del original
//   INFERRED        → deducido de manuales/guías/comunidad (no frame-exacto)
//   VERIFIED        → confirmado por captura/emulación (tolerancia amplia)
//   FRAME_VERIFIED  → medido frame a frame contra el original
// ═══════════════════════════════════════════════════════════

export enum FidelityLevel {
  PLACEHOLDER = 'PLACEHOLDER',
  INFERRED = 'INFERRED',
  VERIFIED = 'VERIFIED',
  FRAME_VERIFIED = 'FRAME_VERIFIED',
}

// Las medidas canónicas se almacenan en FRAMES (no ms).
// Conversión runtime: seconds = frames / ORIGINAL_TARGET_FPS
export const ORIGINAL_TARGET_FPS = 60;

export function framesToSeconds(frames: number): number {
  return frames / ORIGINAL_TARGET_FPS;
}

// ═══ Definición de acción (data-driven — nada hardcodeado) ═══

export type ActionSource = 'BASIC' | 'DECK' | 'LIMIT';
export type BackgroundPolicy = 'TACTICAL' | 'SCENARIO_ACTION' | 'SPECIAL_ACTION';

export type SequenceType =
  | 'STAGE_ATTACK'
  | 'DAMAGE'
  | 'BEAM'
  | 'GATHER'
  | 'SUPPORT'
  | 'GUARD'
  | 'MOVE'
  | 'CHANGE_CHARACTER';

export interface QTESpec {
  inputCount: number;
  // ventanas en frames (null = sin medir aún → INFERRED)
  inputWindowFrames: number | null;
  recoveryWindowFrames: number | null;
  timeoutBehavior: 'PARTIAL' | 'FAILED';
  wrongInputBehavior: 'RECOVERY' | 'PARTIAL';
  ccPerInput: number;
}

export interface ActionDefinition {
  id: string;
  type: SequenceType;
  source: ActionSource;
  ccCost: number;
  requiresPowered: boolean;
  backgroundPolicy: BackgroundPolicy;
  animationSet?: string;     // ej. 'goku_kamehameha'
  qte?: QTESpec;
  // medidas en frames (null = sin medir)
  startupFrames: number | null;
  activeFrames: number | null;
  recoveryFrames: number | null;
  hitstopFrames: number | null;
  fidelity: FidelityLevel;
}

// ═══ Ficha forense por acción (documentación) ═══
// docs/ACTION_FIDELITY.md contiene las 16 fichas YAML completas.
// Aquí solo el registro de estado para el runtime.

export interface ActionFidelityRecord {
  action: string;
  fidelity: FidelityLevel;
  notes: string;
}

export const ACTION_FIDELITY_REGISTRY: Record<string, ActionFidelityRecord> = {
  '3_stage_attack': { action: '3 Stage Attack', fidelity: FidelityLevel.INFERRED, notes: '3 inputs, +1 CC cada uno; ventana por distancia (INFERRED); pendiente FRAME_VERIFIED' },
  '4_stage_attack': { action: '4 Stage Attack', fidelity: FidelityLevel.INFERRED, notes: '4 inputs; Basic 4 Stage solo con Gather (INFERRED)' },
  '5_stage_attack': { action: '5 Stage Attack', fidelity: FidelityLevel.INFERRED, notes: '5 inputs (INFERRED)' },
  '6_stage_attack': { action: '6 Stage Attack', fidelity: FidelityLevel.INFERRED, notes: '6 inputs; se desbloquea tras completar story (INFERRED)' },
  'damage': { action: 'Damage físico', fidelity: FidelityLevel.INFERRED, notes: 'fórmula (power+move)×posMult COMMUNITY_TESTED; frames pendientes' },
  'beam': { action: 'Beam', fidelity: FidelityLevel.INFERRED, notes: 'carga+disparo; división de frames del sheet por estimación' },
  'gather_power': { action: 'Gather Power', fidelity: FidelityLevel.INFERRED, notes: '+4 STR/KI COMMUNITY_TESTED; powered=true 2 turnos CONFIRMED_MANUAL' },
  'guard': { action: 'Guard', fidelity: FidelityLevel.INFERRED, notes: 'HIT/BLOCK/AVOID probabilidades HYPOTHESIS; BLOCK ¼ COMMUNITY_TESTED' },
  'move': { action: 'Move', fidelity: FidelityLevel.INFERRED, notes: 'posiciones front/back+ground/air CONFIRMED_MANUAL; multiplicadores HYPOTHESIS' },
  'avoid': { action: 'Avoid / esquiva', fidelity: FidelityLevel.INFERRED, notes: 'Afterimage +30% evasión 2 turnos (HYPOTHESIS)' },
  'support': { action: 'Support', fidelity: FidelityLevel.INFERRED, notes: 'curas/buffs/debuffs ±8 CONFIRMED_MANUAL; timing pendiente' },
  'limit': { action: 'Limit', fidelity: FidelityLevel.INFERRED, notes: 'hasta 3 (2 androides 19/20) CONFIRMED_MANUAL; reutilizables con CC' },
  'ko': { action: 'KO', fidelity: FidelityLevel.INFERRED, notes: 'pantalla resultado; relevo 2v2 (HYPOTHESIS timing)' },
  'change_character': { action: 'Change Character', fidelity: FidelityLevel.INFERRED, notes: 'CHARA consume acción (CONFIRMED_MANUAL); timing pendiente' },
  'phase_attack_defense': { action: 'Cambio ATTACK → DEFENSE', fidelity: FidelityLevel.PLACEHOLDER, notes: 'transición de fase sin presentación propia aún' },
  'phase_defense_attack': { action: 'Cambio DEFENSE → ATTACK', fidelity: FidelityLevel.PLACEHOLDER, notes: 'idem' },
};
