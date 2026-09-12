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
export type ActionObjectContext = 'OFFENSE' | 'DEFENSE_REACTION' | 'DEFENSE' | 'REACTION';

/**
 * P0.4R-B7B2 — observabilidad del binding físico de slots.
 * Es el estado que demuestra que `slot0 != player`: los slots representan roles
 * físicos, no bandos.
 */
export interface ActionObjectBindingObservation {
  /** Cues de binding aplicadas. */
  bindCount: number;
  /** Tick de la última aplicación de binding. */
  lastBindTick: number | null;
  /** Contexto ROM activo. */
  bindingContext: 'OFFENSE' | 'DEFENSE_REACTION' | null;
  slot0Role: 'ATTACKER' | 'DEFENDER' | null;
  slot1Role: 'ATTACKER' | 'DEFENDER' | null;
  slot0Side: 'PLAYER' | 'ENEMY' | null;
  slot1Side: 'PLAYER' | 'ENEMY' | null;
}

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

// ── Slice 2: runtime-effective logical slot bindings ──
// The immutable helpers above remain the ROM contract used by static gates.
// Pixi uses this small mutable facade so the same source of truth also governs
// live BIND/UNBIND/STOP cues and can later be snapshotted by DOM.
export type ActionObjectSlot = 0 | 1;
export type ActionObjectCueRole = 'ACTOR' | 'TARGET' | 'ACTOR_PRIMARY' | 'ACTOR_SUPPORT' | 'FX_PARTICIPANT';
export interface ActionObjectBinding {
  role: ActionObjectCueRole;
  fighterSide?: 'PLAYER' | 'ENEMY';
  /** B7B2 — contexto ROM del binder (autoridad del rol↔slot). */
  context?: 'OFFENSE' | 'DEFENSE_REACTION';
  /** B7B2 — semántica física confirmada por el cue. */
  semantic?: 'ATTACKER' | 'DEFENDER';
  /** B7B2 — tick del cue, para `lastBindTick` observable. */
  tick?: number;
}
export interface ActionObjectRuntimeState {
  slot: ActionObjectSlot;
  binding: ActionObjectBinding | null;
  active: boolean;
  visible: boolean;
}

function cloneRuntimeState(state: ActionObjectRuntimeState): ActionObjectRuntimeState {
  return { ...state, binding: state.binding ? { ...state.binding } : null };
}

/** Live logical-slot state. The binding, never a fixed side, selects the fighter. */
export class ActionObjectRuntime {
  private readonly slots: [ActionObjectRuntimeState, ActionObjectRuntimeState] = [
    { slot: 0, binding: { role: 'ACTOR' }, active: true, visible: true },
    { slot: 1, binding: { role: 'TARGET' }, active: true, visible: true },
  ];

  bind(slot: ActionObjectSlot, binding: ActionObjectBinding): void {
    this.slots[slot] = { slot, binding: { ...binding }, active: true, visible: true };
  }

  unbind(slot: ActionObjectSlot): void {
    this.slots[slot] = { slot, binding: null, active: false, visible: false };
  }

  stop(slot: ActionObjectSlot): void {
    this.slots[slot] = { ...this.slots[slot], active: false, visible: false };
  }

  state(slot: ActionObjectSlot): ActionObjectRuntimeState {
    return cloneRuntimeState(this.slots[slot]);
  }

  snapshot(): ActionObjectRuntimeState[] {
    return this.slots.map(cloneRuntimeState);
  }

  resolve(slot: ActionObjectSlot): ActionObjectBinding | null {
    const binding = this.slots[slot].binding;
    return binding ? { ...binding } : null;
  }

  // ── P0.4R-B7B2 — binding ROM por contexto + observabilidad ──

  private observation: ActionObjectBindingObservation = {
    bindCount: 0,
    lastBindTick: null,
    bindingContext: null,
    slot0Role: null,
    slot1Role: null,
    slot0Side: null,
    slot1Side: null,
  };

  /**
   * Aplica el binding de UN slot desde la autoridad ROM del contexto.
   * El rol NO lo decide el cue (`semantic` es solo confirmación): los dos roles
   * salen del contexto, de modo que el resultado observable tras procesar el
   * tick es el binding COMPLETO, nunca medio actualizado.
   */
  applyBindingSlot(input: {
    context: 'OFFENSE' | 'DEFENSE_REACTION' | 'DEFENSE' | 'REACTION';
    tick: number;
    slot: ActionObjectSlot;
    side?: 'PLAYER' | 'ENEMY';
  }): void {
    const context: 'OFFENSE' | 'DEFENSE_REACTION' =
      input.context === 'OFFENSE' ? 'OFFENSE' : 'DEFENSE_REACTION';
    const roles: ['ATTACKER' | 'DEFENDER', 'ATTACKER' | 'DEFENDER'] =
      context === 'OFFENSE' ? ['ATTACKER', 'DEFENDER'] : ['DEFENDER', 'ATTACKER'];
    const switching = this.observation.bindingContext !== context;
    const next: ActionObjectBindingObservation = switching
      ? { ...this.observation, bindingContext: context, slot0Role: roles[0], slot1Role: roles[1] }
      : { ...this.observation };
    if (input.slot === 0) next.slot0Side = input.side ?? null;
    else next.slot1Side = input.side ?? null;
    next.bindCount = this.observation.bindCount + 1;
    next.lastBindTick = input.tick;
    this.observation = next;
    // La facade por slot refleja el mismo binding (el rol sale del contexto).
    this.slots[input.slot] = {
      slot: input.slot,
      binding: { role: roles[input.slot] === 'ATTACKER' ? 'ACTOR' : 'TARGET', fighterSide: input.side },
      active: true,
      visible: true,
    };
  }

  /** Observabilidad del binding (B7B2). */
  bindingObservation(): ActionObjectBindingObservation {
    return { ...this.observation };
  }

  /**
   * FIELD restore — el binding se limpia. El estado físico vuelve a UNBOUND:
   * ningún slot conserva rol ni lado tras volver a FIELD.
   */
  resetBindingToField(): void {
    this.observation = {
      ...this.observation,
      bindingContext: null,
      slot0Role: null,
      slot1Role: null,
      slot0Side: null,
      slot1Side: null,
    };
    this.slots[0] = { slot: 0, binding: null, active: true, visible: true };
    this.slots[1] = { slot: 1, binding: null, active: true, visible: true };
  }

  /** UNBIND — el slot queda realmente sin binding (rol y lado a null). */
  clearSlotBinding(slot: ActionObjectSlot): void {
    if (slot === 0) this.observation = { ...this.observation, slot0Role: null, slot0Side: null };
    else this.observation = { ...this.observation, slot1Role: null, slot1Side: null };
    this.slots[slot] = { slot, binding: null, active: false, visible: false };
  }
}

// ── P0.4R-B7B2 — aplicación de cues de binding (autoridad compartida) ──

/**
 * Aplica una cue `ACTION_OBJECT_BIND` sobre el runtime físico.
 * Autoridad ÚNICA compartida por PixiBattlePresentation y los gates: así el gate
 * no puede pasar con una delegación distinta a la de producción.
 */
export function applyBindingCue(
  runtime: ActionObjectRuntime,
  slot: ActionObjectSlot,
  binding: ActionObjectBinding,
): void {
  if (binding.context) {
    runtime.applyBindingSlot({
      context: binding.context,
      tick: binding.tick ?? 0,
      slot,
      side: binding.fighterSide,
    });
    return;
  }
  runtime.bind(slot, binding);
}

/** Deshace el binding de un slot (cue `ACTION_OBJECT_UNBIND`). */
export function unapplyBindingCue(runtime: ActionObjectRuntime, slot: ActionObjectSlot): void {
  runtime.clearSlotBinding(slot);
}

/**
 * Sonda de gate: implementa la superficie de binding delegando en un runtime real
 * con los MISMOS helpers que producción, para que el gate mida la cadena real
 * (adapter → runtime) sin depender de Pixi.
 */
export class ActionObjectBindingProbe {
  readonly runtime = new ActionObjectRuntime();

  bindActionObject(slot: ActionObjectSlot, binding: ActionObjectBinding): void {
    applyBindingCue(this.runtime, slot, binding);
  }

  unbindActionObject(slot: ActionObjectSlot): void {
    unapplyBindingCue(this.runtime, slot);
  }

  actionObjectBindingObservation(): ActionObjectBindingObservation {
    return this.runtime.bindingObservation();
  }

  clearActionObjectBinding(): void {
    this.runtime.resetBindingToField();
  }
}
