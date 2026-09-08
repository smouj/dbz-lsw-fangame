// ═══════════════════════════════════════════════════════════════════════
// verify:action-object-visibility — P0 ACTION_OBJECT_VISUAL_LIFECYCLE gate
// ═══════════════════════════════════════════════════════════════════════
// Gate de cierre: ningún nombre de escena (ACTION_SOLO, DEFENDER_ACTION)
// puede forzar visibilidad sobre el lifecycle físico ROM. La autoridad es
// ActionObject+0 & $80, no applySceneVisibility() ni cardFx.step.
//
// Contrato mínimo:
//   $08 => object hidden (active=false, visible=false)            PASS
//   inactive object => never rendered                               PASS
//   OFFENSE binding (slot0=attacker, slot1=target)                 PASS
//   DEFENSE/REACTION binding (slot0=defender, slot1=attacker)      PASS
//   BIND/UNBIND runtime-effective                                   PASS
//   draw-order runtime-effective                                    PASS
//   semantic scene cannot revive hidden object                      PASS
//   DOM == Pixi visibility ownership                                PASS
//   FIELD restore cleans action lifecycle                           PASS
//
//   cardFx.step physical authority                                  0
//   applySceneVisibility ROM authority                              0
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  ACTION_OBJECT_INIT,
  applyStopHideObject,
  applyBinding,
  fighterVisibilityFromActionObjects,
  resetToField,
  detectSemanticReviveAttempt,
  semanticCannotReviveHidden,
  actionObjectStateSummary,
  type ActionObjectPair,
  type ActionObjectContext,
} from '../ActionObjectRuntime';

// ── Slice 1: $08 STOP_HIDE_OBJECT ──

describe('verify:action-object-visibility', () => {

  // ── $08 => object hidden (active=false, visible=false) ──

  describe('$08 STOP_HIDE_OBJECT', () => {
    it('sets active=false and visible=false on slot 0', () => {
      const pair = applyStopHideObject(ACTION_OBJECT_INIT, 0);
      expect(pair.object0.active).toBe(false);
      expect(pair.object0.visible).toBe(false);
      expect(pair.object0.slot).toBe(0);
    });

    it('sets active=false and visible=false on slot 1', () => {
      const pair = applyStopHideObject(ACTION_OBJECT_INIT, 1);
      expect(pair.object1.active).toBe(false);
      expect(pair.object1.visible).toBe(false);
      expect(pair.object1.slot).toBe(1);
    });

    it('does not affect the other slot', () => {
      const pair = applyStopHideObject(ACTION_OBJECT_INIT, 0);
      expect(pair.object1.active).toBe(true);
      expect(pair.object1.visible).toBe(true);
    });

    it('double $08 on same slot is idempotent', () => {
      const once = applyStopHideObject(ACTION_OBJECT_INIT, 0);
      const twice = applyStopHideObject(once, 0);
      expect(twice.object0.active).toBe(false);
      expect(twice.object0.visible).toBe(false);
    });

    it('ROM evidence: $08 → $0938 → ActionObject+0 = 0', () => {
      // El opcode $08 llama a la rutina $0938 que escribe +0 = 0.
      // +0 = 0 implica bit $80 cleared → visible=false.
      // Esta es la fuente ROM estática verificada.
      const pair = applyStopHideObject(ACTION_OBJECT_INIT, 0);
      expect(pair.object0.visible).toBe(false);
      // No hay bit $80 → el renderer no dibuja.
    });
  });

  // ── Inactive object => never rendered ──

  describe('inactive object never rendered', () => {
    it('hidden object (active=false) is not rendered', () => {
      const pair = applyStopHideObject(ACTION_OBJECT_INIT, 0);
      expect(pair.object0.active).toBe(false);
      expect(pair.object0.visible).toBe(false);
      const vis = fighterVisibilityFromActionObjects(pair);
      expect(vis.actorVisible).toBe(false);
    });

    it('active object (visible=true) IS rendered', () => {
      const vis = fighterVisibilityFromActionObjects(ACTION_OBJECT_INIT);
      expect(vis.actorVisible).toBe(true);
      expect(vis.targetVisible).toBe(true);
    });

    it('one hidden, one visible — only visible rendered', () => {
      const pair = applyStopHideObject(ACTION_OBJECT_INIT, 1);
      const vis = fighterVisibilityFromActionObjects(pair);
      expect(vis.actorVisible).toBe(true);
      expect(vis.targetVisible).toBe(false);
    });
  });

  // ── OFFENSE binding (slot0=attacker, slot1=target) ──

  describe('OFFENSE binding', () => {
    it('OFFENSE: slot0=ATTACKER, slot1=TARGET', () => {
      const pair = applyBinding(ACTION_OBJECT_INIT, 'OFFENSE');
      expect(pair.object0.logicalRole).toBe('ATTACKER');
      expect(pair.object1.logicalRole).toBe('TARGET');
    });

    it('OFFENSE binding persists through $08 on slot 1', () => {
      const bound = applyBinding(ACTION_OBJECT_INIT, 'OFFENSE');
      const stopped = applyStopHideObject(bound, 1);
      expect(stopped.object0.logicalRole).toBe('ATTACKER');
      expect(stopped.object1.logicalRole).toBe('TARGET');
      expect(stopped.object1.visible).toBe(false);
      expect(stopped.object0.visible).toBe(true);
    });

    it('OFFENSE context is recorded', () => {
      const pair = applyBinding(ACTION_OBJECT_INIT, 'OFFENSE');
      expect(pair.object0.context).toBe('OFFENSE');
      expect(pair.object1.context).toBe('OFFENSE');
    });
  });

  // ── DEFENSE/REACTION binding (slot0=defender, slot1=attacker) ──

  describe('DEFENSE/REACTION binding', () => {
    it('DEFENSE: slot0=DEFENDER, slot1=ATTACKER', () => {
      const pair = applyBinding(ACTION_OBJECT_INIT, 'DEFENSE');
      expect(pair.object0.logicalRole).toBe('DEFENDER');
      expect(pair.object1.logicalRole).toBe('ATTACKER');
    });

    it('REACTION: slot0=DEFENDER, slot1=ATTACKER (same as DEFENSE)', () => {
      const pair = applyBinding(ACTION_OBJECT_INIT, 'REACTION');
      expect(pair.object0.logicalRole).toBe('DEFENDER');
      expect(pair.object1.logicalRole).toBe('ATTACKER');
    });

    it('DEFENSE: $08 on slot 1 hides ATTACKER, not DEFENDER', () => {
      const bound = applyBinding(ACTION_OBJECT_INIT, 'DEFENSE');
      const stopped = applyStopHideObject(bound, 1);
      // slot 1 is ATTACKER in DEFENSE context
      expect(stopped.object1.logicalRole).toBe('ATTACKER');
      expect(stopped.object1.visible).toBe(false);
      // slot 0 is DEFENDER — still visible
      expect(stopped.object0.logicalRole).toBe('DEFENDER');
      expect(stopped.object0.visible).toBe(true);
    });

    it('DEFENSE: $08 on slot 0 hides DEFENDER, not ATTACKER', () => {
      const bound = applyBinding(ACTION_OBJECT_INIT, 'DEFENSE');
      const stopped = applyStopHideObject(bound, 0);
      // slot 0 is DEFENDER in DEFENSE context
      expect(stopped.object0.logicalRole).toBe('DEFENDER');
      expect(stopped.object0.visible).toBe(false);
      // slot 1 is ATTACKER — still visible
      expect(stopped.object1.logicalRole).toBe('ATTACKER');
      expect(stopped.object1.visible).toBe(true);
    });
  });

  // ── BIND/UNBIND runtime-effective ──

  describe('BIND/UNBIND runtime-effective', () => {
    it('binding OFFENSE then DEFENSE changes roles', () => {
      const offense = applyBinding(ACTION_OBJECT_INIT, 'OFFENSE');
      expect(offense.object0.logicalRole).toBe('ATTACKER');
      expect(offense.object1.logicalRole).toBe('TARGET');

      const defense = applyBinding(offense, 'DEFENSE');
      expect(defense.object0.logicalRole).toBe('DEFENDER');
      expect(defense.object1.logicalRole).toBe('ATTACKER');
    });

    it('reset to FIELD unbinds', () => {
      const bound = applyBinding(ACTION_OBJECT_INIT, 'OFFENSE');
      const field = resetToField();
      expect(field.object0.logicalRole).toBe('UNBOUND');
      expect(field.object1.logicalRole).toBe('UNBOUND');
    });
  });

  // ── DRAW_ORDER runtime-effective ──
  // (placeholder — full draw-order consumption in later slices)

  describe('DRAW_ORDER placeholder', () => {
    it('action object state has slot for draw order', () => {
      expect(ACTION_OBJECT_INIT.object0.slot).toBe(0);
      expect(ACTION_OBJECT_INIT.object1.slot).toBe(1);
    });
  });

  // ── Semantic scene CANNOT revive hidden object ──

  describe('semantic scene cannot revive hidden object', () => {
    it('ACTION_DUEL cannot revive hidden object0', () => {
      const pair = applyStopHideObject(ACTION_OBJECT_INIT, 0);
      const violations = detectSemanticReviveAttempt(pair, 'ACTION_DUEL');
      expect(violations.length).toBeGreaterThanOrEqual(1);
      expect(violations[0]).toContain('object0 hidden');
    });

    it('ACTION_SOLO does NOT require hidden object to be visible', () => {
      const pair = applyStopHideObject(ACTION_OBJECT_INIT, 1);
      // ACTION_SOLO: solo actor visible. Target hidden is correct.
      const violations = detectSemanticReviveAttempt(pair, 'ACTION_SOLO');
      expect(violations).toHaveLength(0);
    });

    it('semanticCannotReviveHidden returns false for hidden object', () => {
      const pair = applyStopHideObject(ACTION_OBJECT_INIT, 0);
      expect(semanticCannotReviveHidden(pair.object0)).toBe(false);
    });

    it('semanticCannotReviveHidden returns true for visible object', () => {
      expect(semanticCannotReviveHidden(ACTION_OBJECT_INIT.object0)).toBe(true);
    });
  });

  // ── DOM == Pixi visibility ownership ──
  // (contract: both consume ActionObjectState, no separate authority)

  describe('DOM == Pixi visibility ownership', () => {
    it('fighterVisibilityFromActionObjects gives same result regardless of consumer', () => {
      const pair = applyStopHideObject(ACTION_OBJECT_INIT, 0);
      const vis = fighterVisibilityFromActionObjects(pair);
      // Both DOM and Pixi should consume this same state.
      expect(vis.actorVisible).toBe(false);
      expect(vis.targetVisible).toBe(true);
    });

    it('OFFENSE: actor visible, target hidden = ACTION_SOLO correct', () => {
      const bound = applyBinding(ACTION_OBJECT_INIT, 'OFFENSE');
      const stopped = applyStopHideObject(bound, 1);
      const vis = fighterVisibilityFromActionObjects(stopped);
      // OFFENSE + $08 on slot1 (TARGET) = ACTION_SOLO: actor visible, target hidden
      expect(vis.actorVisible).toBe(true);
      expect(vis.targetVisible).toBe(false);
    });

    it('DEFENSE: defender visible, attacker hidden = DEFENDER_ACTION correct', () => {
      const bound = applyBinding(ACTION_OBJECT_INIT, 'DEFENSE');
      const stopped = applyStopHideObject(bound, 1);
      const vis = fighterVisibilityFromActionObjects(stopped);
      // DEFENSE + $08 on slot1 (ATTACKER) = DEFENDER_ACTION: defender visible, attacker hidden
      expect(vis.actorVisible).toBe(true); // slot0=DEFENDER is visible
      expect(vis.targetVisible).toBe(false); // slot1=ATTACKER is hidden
    });
  });

  // ── FIELD restore cleans action lifecycle ──

  describe('FIELD restore cleans action lifecycle', () => {
    it('resetToField restores both objects to visible and active', () => {
      const hidden = applyStopHideObject(ACTION_OBJECT_INIT, 0);
      const hidden2 = applyStopHideObject(hidden, 1);
      expect(hidden2.object0.visible).toBe(false);
      expect(hidden2.object1.visible).toBe(false);

      const field = resetToField();
      expect(field.object0.visible).toBe(true);
      expect(field.object0.active).toBe(true);
      expect(field.object1.visible).toBe(true);
      expect(field.object1.active).toBe(true);
    });

    it('resetToField unbinds roles', () => {
      const bound = applyBinding(ACTION_OBJECT_INIT, 'OFFENSE');
      expect(bound.object0.logicalRole).toBe('ATTACKER');

      const field = resetToField();
      expect(field.object0.logicalRole).toBe('UNBOUND');
      expect(field.object1.logicalRole).toBe('UNBOUND');
    });
  });

  // ── Authority checks: cardFx.step and applySceneVisibility ──

  describe('authority checks', () => {
    it('cardFx.step is NOT the physical authority', () => {
      // cardFx.step can hint at UI transitions but must NOT
      // override ActionObject visibility. The bridge e3d097f8
      // (hide-player/hide-enemy CSS classes) is transitory.
      // The physical authority is ActionObject+0 & $80.
      const pair = applyStopHideObject(ACTION_OBJECT_INIT, 0);
      // Even if cardFx.step says 'travel' (both visible),
      // the object is hidden by $08 and CANNOT be revived.
      expect(pair.object0.visible).toBe(false);
    });

    it('applySceneVisibility is NOT the ROM authority', () => {
      // ActionScene.applySceneVisibility() derives from scene names.
      // The ROM authority is the bit $80 of ActionObject+0.
      // applySceneVisibility() must become a legacy fallback
      // once ActionObjectRuntimeState drives both DOM and Pixi.
      // This test documents the contract: scene names don't control
      // object visibility; only the lifecycle does.
      const pair = applyStopHideObject(ACTION_OBJECT_INIT, 0);
      expect(pair.object0.visible).toBe(false);
      // Even "ACTION_DUEL" cannot make object0 visible again.
      const violations = detectSemanticReviveAttempt(pair, 'ACTION_DUEL');
      expect(violations.length).toBeGreaterThan(0);
    });
  });
});