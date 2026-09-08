// P0 ACTION_OBJECT_VISUAL_LIFECYCLE — runtime binding state.
//
// The ROM has two reusable physical ActionObjects, while their meaning is
// chosen by the current presentation context.  Keep that indirection in one
// small state machine so a STOP after a rebind can never hide a hard-coded
// left/right fighter.

export type ActionObjectSlot = 0 | 1;
export type ActionObjectCueRole =
  | 'ACTOR'
  | 'TARGET'
  | 'ACTOR_PRIMARY'
  | 'ACTOR_SUPPORT'
  | 'FX_PARTICIPANT';
export type ActionObjectResolvedRole = 'ACTOR' | 'TARGET' | 'SIDE';

export interface ActionObjectBinding {
  role: ActionObjectCueRole;
  fighterSide?: 'PLAYER' | 'ENEMY';
}

export interface ActionObjectRuntimeState {
  slot: ActionObjectSlot;
  binding: ActionObjectBinding | null;
  active: boolean;
  visible: boolean;
}

function cloneState(state: ActionObjectRuntimeState): ActionObjectRuntimeState {
  return { ...state, binding: state.binding ? { ...state.binding } : null };
}

/** Mutable ROM ActionObject state shared by Pixi (DOM can consume snapshots later). */
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
    const current = this.slots[slot];
    this.slots[slot] = { ...current, active: false, visible: false };
  }

  state(slot: ActionObjectSlot): ActionObjectRuntimeState {
    return cloneState(this.slots[slot]);
  }

  snapshot(): ActionObjectRuntimeState[] {
    return this.slots.map(cloneState);
  }

  /** Resolve a logical slot without assuming slot 0 is a fixed physical side. */
  resolve(slot: ActionObjectSlot): ActionObjectBinding | null {
    return this.slots[slot].binding ? { ...this.slots[slot].binding! } : null;
  }
}
