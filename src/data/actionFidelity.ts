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

// ═══ Temporización GBC (Pan Docs / GBDev) ═══
// El Game Boy Color NO refresca a 60 Hz exactos:
//   4.194.304 Hz / 70.224 dots por frame = 59.72750056960583 Hz
// Los datos canónicos se almacenan en FRAMES GBC (unidad principal);
// los segundos son SOLO para presentación/runtime.
// GBC FRAME ≠ VIDEO CAPTURE FRAME (al capturar a 60fps hay deriva).
export const GBC_NATIVE_FPS = 59.72750056960583;
export const CAPTURE_FPS = 60;

export interface FrameTiming {
  gbcFrames: number;
}

export function gbcFramesToSeconds(gbcFrames: number): number {
  return gbcFrames / GBC_NATIVE_FPS;
}

// ═══ Conversiones frame GBC ↔ frame de captura ═══
// captureFrame → gbcFrame: × (59.7275 / 60)   [≈ 0.99546]
export function captureFrameToGbcFrame(captureFrame: number): number {
  return captureFrame * (GBC_NATIVE_FPS / CAPTURE_FPS);
}

// gbcFrame → captureFrame: × (60 / 59.7275)   [≈ 1.00456]
export function gbcFrameToCaptureFrame(gbcFrame: number): number {
  return gbcFrame * (CAPTURE_FPS / GBC_NATIVE_FPS);
}

// ═══ Evidencia (cada número canónico trazable a una captura) ═══
export type EvidenceStatus = 'CONFIRMED' | 'COMMUNITY_TESTED' | 'HYPOTHESIS' | 'UNKNOWN';

export interface FidelityEvidence {
  status: EvidenceStatus;
  source?: string;
  captureId?: string;
  gbcFrame?: number;
  gbcFrameRange?: [number, number];
  notes?: string;
}

// ═══ Estados intermedios del QTE (Stage Attacks) — manual GBC USA ═══
// Flujo canónico (2026-08-12, verificado contra el manual original):
//   INPUT_WINDOW ──todos correctos──▶ COMPLETED   (la acción se anima)
//        │
//        └─ error/timeout ──▶ COUNTER_WINDOW  (el rival contraataca, ENTER COMMAND)
//                                 ├─ A con timing ──▶ SAFE_ABORT  (banca CC, sin daño)
//                                 ├─ B con timing ──▶ INPUT_WINDOW (repara y continúa)
//                                 └─ timeout ───────▶ COUNTER_HIT (el counter conecta)
export type QteState =
  | 'WAITING'
  | 'INPUT_WINDOW'
  | 'COUNTER_WINDOW'
  | 'COMPLETED'
  | 'SAFE_ABORT'
  | 'COUNTER_HIT';

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
  // ventana GLOBAL de la secuencia en frames según posición relativa
  // (manual GBC): BACK_BACK=72 · BACK_FRONT=102 · FRONT_BACK=143 · FRONT_FRONT=173
  sequenceWindowFrames: Record<string, number> | null;
  // ventana de contraataque (ENTER COMMAND) — A≈24f · B≈9f (HYPOTHESIS)
  counterAFrames: number | null;
  counterBFrames: number | null;
  timeoutBehavior: 'COUNTER';
  wrongInputBehavior: 'COUNTER';
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
  // ⚠️ Temporización: GBC_NATIVE_FPS = 59.72750056960583 (no 60)
  // Los frames medidos en capturas a 60fps deben convertirse: gbcFrame = capFrame * (60/59.7275)
  '3_stage_attack': { action: '3 Stage Attack', fidelity: FidelityLevel.INFERRED, notes: 'QTE v2: ventana GLOBAL en frames GBC (PUSH elapsed/limit), límite por distancia táctica, +1 CC/input, daño SOLO al resolver, recovery A=abort/B=reparar con timing; tabla STAGE_TIMING_TABLE HYPOTHESIS — pendiente FRAME_VERIFIED' },
  '4_stage_attack': { action: '4 Stage Attack', fidelity: FidelityLevel.INFERRED, notes: '4 inputs; Basic 4 Stage solo con Gather (INFERRED); ventana global + recovery como 3S' },
  '5_stage_attack': { action: '5 Stage Attack', fidelity: FidelityLevel.INFERRED, notes: '5 inputs (INFERRED); ventana global + recovery' },
  '6_stage_attack': { action: '6 Stage Attack', fidelity: FidelityLevel.INFERRED, notes: '6 inputs; se desbloquea tras completar story (INFERRED); ventana global + recovery' },
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
