// ═══════════════════════════════════════════════════════════════════════
// P0 ACTION_OBJECT_VISUAL_LIFECYCLE — Slice 1: $08 STOP_HIDE_OBJECT
// ═══════════════════════════════════════════════════════════════════════
// Fuente: ROM Presentation VM — ActionObject+0 & $80 (renderer); $08 → $0938
//
// El renderer ROM dibuja solo si ActionObject+0 & $80. $08 → $0938 hace
// +0 = 0 (HIDE). Init típico: $80/$A0 (ambos visibles).
//
// El primitivo ROM es: un objeto HIDDEN no se renderiza, NUNCA.
// Ninguna capa semántica (ACTION_SOLO, DEFENDER_ACTION) puede reactivar
// un objeto hidden. La autoridad física es exclusivamente el lifecycle.
//
// Binding lógico↔físico:
//   OFFENSE: slot0=attacker, slot1=target
//   DEFENSE/REACTION: slot0=defender, slot1=attacker
//   (CA59/CA5A intercambian según contexto)
// ═══════════════════════════════════════════════════════════════════════

/** Contexto de binding: quién es slot0 y slot1. */
export type ActionObjectContext = 'OFFENSE' | 'DEFENSE' | 'REACTION';

/** Estado runtime de un ActionObject físico (slot 0 o 1). */
export interface ActionObjectState {
  /** Índice del slot físico (0 o 1). */
  slot: 0 | 1;
  /** Bit $80 del ActionObject+0. true = visible, false = hidden ($08). */
  visible: boolean;
  /** Si el objeto está activo (tiene programa ejecutándose). */
  active: boolean;
  /** Binding lógico: qué rol representa este slot en el contexto actual. */
  logicalRole: 'ACTOR' | 'TARGET' | 'DEFENDER' | 'ATTACKER' | 'UNBOUND';
  /** Contexto de binding actual. */
  context: ActionObjectContext | null;
}

/** Snapshot de los dos ActionObjects en un instante de la presentación. */
export interface ActionObjectPair {
  object0: ActionObjectState;
  object1: ActionObjectState;
}

/** Resultado de consumir un opcode $08 STOP_HIDE_OBJECT. */
export interface StopHideObjectResult {
  /** Slot afectado (0 o 1). */
  slot: 0 | 1;
  /** El objeto pasa a active=false, visible=false. */
  active: false;
  visible: false;
  /** Evidencia de la fuente ROM. */
  evidence: 'ROM_STATIC_VERIFIED';
  source: string;
}

// ── Inicialización ROM ──

/** Valores de init típicos de la ROM ($80/$A0 → ambos visibles). */
export const ACTION_OBJECT_INIT: ActionObjectPair = {
  object0: {
    slot: 0,
    visible: true,   // +0 = $80 → bit $80 set → visible
    active: true,     // programa arrancado
    logicalRole: 'UNBOUND',
    context: null,
  },
  object1: {
    slot: 1,
    visible: true,   // +0 = $A0 → bit $80 set → visible
    active: true,     // programa arrancado
    logicalRole: 'UNBOUND',
    context: null,
  },
};

// ── Operaciones del lifecycle ──

/** Aplica opcode $08 STOP_HIDE_OBJECT a un slot.
 *  ROM: $08 → $0938 → ActionObject+0 = 0 → active=false, visible=false.
 *  Ninguna capa semántica puede revertir esto. */
export function applyStopHideObject(pair: ActionObjectPair, slot: 0 | 1): ActionObjectPair {
  const key = slot === 0 ? 'object0' : 'object1';
  const obj = pair[key];
  return {
    ...pair,
    [key]: {
      ...obj,
      active: false,
      visible: false,
    },
  };
}

/** Aplica binding lógico↔físico según contexto.
 *  OFFENSE: slot0=ATTACKER, slot1=TARGET
 *  DEFENSE/REACTION: slot0=DEFENDER, slot1=ATTACKER */
export function applyBinding(pair: ActionObjectPair, context: ActionObjectContext): ActionObjectPair {
  const offenseRoles: ['ATTACKER', 'TARGET'] = ['ATTACKER', 'TARGET'];
  const defenseRoles: ['DEFENDER', 'ATTACKER'] = ['DEFENDER', 'ATTACKER'];
  const roles = context === 'OFFENSE' ? offenseRoles : defenseRoles;
  return {
    object0: { ...pair.object0, logicalRole: roles[0], context },
    object1: { ...pair.object1, logicalRole: roles[1], context },
  };
}

/** Verifica que un objeto hidden NO puede ser reactivado por una capa semántica.
 *  Este es el invariante ROM: $08 → visible=false es permanente hasta
 *  que otro opcode ROM explícitamente lo reactive ($01 START_ACTION_OBJECT
 *  con +0 & $80). */
export function semanticCannotReviveHidden(obj: ActionObjectState): boolean {
  // Si el objeto está hidden, ninguna capa semántica puede hacerlo visible.
  // Solo un nuevo START_ACTION_OBJECT puede restaurar el bit $80.
  if (!obj.visible) {
    return false; // correctamente hidden, no revivable
  }
  return true; // visible, no necesita protección
}

/** Consulta: ¿qué fighters deben ser visibles según el estado de los ActionObjects?
 *  Este es el primitivo que reemplaza a applySceneVisibility() y cardFx.step. */
export function fighterVisibilityFromActionObjects(pair: ActionObjectPair): {
  actorVisible: boolean;
  targetVisible: boolean;
} {
  // El actor siempre es el slot0 en OFFENSE, slot0 en DEFENSE es el defensor.
  // Pero la visibilidad se deriva del bit $80 del ActionObject, no del nombre.
  return {
    actorVisible: pair.object0.visible,
    targetVisible: pair.object1.visible,
  };
}

/** Restaura los ActionObjects al estado FIELD (ambos visibles, unbound). */
export function resetToField(): ActionObjectPair {
  return {
    object0: { ...ACTION_OBJECT_INIT.object0, logicalRole: 'UNBOUND', context: null },
    object1: { ...ACTION_OBJECT_INIT.object1, logicalRole: 'UNBOUND', context: null },
  };
}

// ── Queries ──

/** ¿Hay algún objeto hidden que una capa semántica intentó revivir? */
export function detectSemanticReviveAttempt(pair: ActionObjectPair, sceneName: string): string[] {
  const violations: string[] = [];
  if (!pair.object0.visible && sceneName === 'ACTION_DUEL') {
    // ACTION_DUEL requiere ambos visibles, pero si object0 está hidden,
    // no se puede forzar visible — el $08 lo prohibe.
    violations.push(`object0 hidden but scene=${sceneName} would require visible`);
  }
  if (!pair.object1.visible && sceneName === 'ACTION_DUEL') {
    violations.push(`object1 hidden but scene=${sceneName} would require visible`);
  }
  return violations;
}

/** Resumen del estado para debugging. */
export function actionObjectStateSummary(pair: ActionObjectPair): string {
  return `obj0(${pair.object0.logicalRole} v=${pair.object0.visible} a=${pair.object0.active}) obj1(${pair.object1.logicalRole} v=${pair.object1.visible} a=${pair.object1.active})`;
}