// ═══════════════════════════════════════════════════════════════════════
// S-MAP1 — sprite-mapping/taxonomy.ts
// Taxonomía canónica ROM-FIRST para assets/poses de combate.
//
// RUNTIME_RESOLVED ≠ PHYSICAL. Cada asset/pose lleva OBLIGATORIAMENTE uno
// de estos estados; "unmarked" está prohibido (si no se sabe → UNRESOLVED;
// si no se usa → SOURCE_ONLY; si es efecto → REFERENCE_FX).
// ═══════════════════════════════════════════════════════════════════════

export const SPRITE_CLASSIFICATIONS = [
  'ROM_PHYSICAL',        // Fighter OBJ reconstruido directamente de la ROM
  'CANONICAL_PHYSICAL',  // PNG físico existente en Canonical_Frames_Official
  'SHARED_PHYSICAL',     // mismo frame físico usado en más de una función
  'COMPOSITE',           // secuencia construida con varios frames físicos
  'FALLBACK',            // sustitución runtime por asset ausente
  'REFERENCE_FX',        // referencia visual de efecto, no FighterActor
  'SEMANTIC_ALIAS',      // nombre funcional que reutiliza otro asset
  'SOURCE_ONLY',         // existe en sheets/fuentes, no pertenece al runtime
  'MISSING',             // debería existir según contrato pero falta
  'UNRESOLVED',          // evidencia física existe, función exacta pendiente
] as const;

export type SpriteClassification = typeof SPRITE_CLASSIFICATIONS[number];

/** Poses FX superpuestas al actor — NUNCA cuentan como pose física del Fighter. */
export const FX_POSES = new Set([
  'beam_ray',
  'beam_ray_tip',
  'aura_power',
  'aura_support',
]);

/** FX de movimiento (Basic > Move) — NO son la carta Avoiding. */
export const MOVEMENT_FX = [
  { pose: 'move_horizontal_fx', category: 'movement', note: 'rallitas horizontales de Basic > Move' },
  { pose: 'move_vertical_fx', category: 'movement', note: 'rallitas verticales de Basic > Move' },
] as const;

/** Poses compuestas (secuencias construidas con frames de otras familias). */
export const COMPOSITE_POSES = new Set([
  'punch_right',
  'punch_left',
  'kick_right',
  'knockback_back',
  'knockback_up',
  'knockback_down',
  'beam_guard',
  'evade',
]);

/** Aliases semánticos conocidos: pose → pose propietaria del asset físico. */
export const SEMANTIC_ALIAS_MAP: Record<string, string> = {
  power_up: 'gather_power',
};

/** Requeridas runtime (COMBAT_REQUIRED_POSES del runtime). */
export const REQUIRED_POSES = [
  'idle', 'move_front', 'move_back', 'guard', 'attack_fwd', 'attack_ud',
  'hurt', 'beam_charge', 'beam_fire',
] as const;

export interface RuntimeSpriteBinding {
  formId: string;
  runtimePose: string;
  classification: SpriteClassification;
  /** Pose propietaria cuando SHARED_PHYSICAL / SEMANTIC_ALIAS. */
  ownerPose?: string;
  files: string[];
  canonicalIds?: string[];
  romPhysical?: {
    actorVisualProfileKey: number;
    resourceId: number;
    visualFrameIds: number[];
  }[];
  components?: { pose?: string; file: string }[];
  evidence: string[];
}

export const CLASSIFICATION_LABELS: Record<SpriteClassification, string> = {
  ROM_PHYSICAL: 'Fighter OBJ reconstruido de la ROM (R2.3 render)',
  CANONICAL_PHYSICAL: 'PNG físico de Canonical_Frames_Official',
  SHARED_PHYSICAL: 'Reutiliza frames físicos de otra función',
  COMPOSITE: 'Secuencia compuesta de frames físicos existentes',
  FALLBACK: 'Sustitución runtime por asset ausente',
  REFERENCE_FX: 'Referencia visual de efecto (no FighterActor)',
  SEMANTIC_ALIAS: 'Nombre funcional que reutiliza otro asset',
  SOURCE_ONLY: 'Existe en fuentes, no pertenece al runtime',
  MISSING: 'Debería existir según contrato pero falta',
  UNRESOLVED: 'Evidencia física presente, función exacta pendiente',
};

/** Dominios ROM: actor (OBJ) vs FX (BG). */
export const ROM_DOMAIN = {
  ACTOR: 'AnimationResource → Fighter metasprite → OBJ',
  FX: 'FXResource → 2bpp → BG tilemap → VRAM $8800 → BG $9800 → SCX/SCY',
} as const;
