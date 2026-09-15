// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ACTION plane geometry (cinematics)
// ═══════════════════════════════════════════════════════════════════════
//
// ACTION is a different coordinate space from the tactical/overworld field.
// Keep its anchors here so a cinematic can never accidentally consume
// `anchorFor()` from data/positions.ts.  Both the Pixi renderer and Dev Studio
// use this module; the DOM helpers below are only a projection of the same
// native coordinates, never a second layout.
//
// Native ACTION world: 160×80, projected once by ActionScene at ×2.
// The values are the established presentation projection of the ROM ACTION
// plane.  ROM ActionObject anchors remain available in romActionObject.ts for
// cue-specific SET_OBJECT_POSITION / motion; these home anchors define the
// stable scene composition between those cues.

export type ActionPlaneSide = 'player' | 'enemy';
export type ActionPlaneMode = 'ACTION' | 'SPECIAL_ACTION';

export interface ActionPlaneAnchor {
  /** Native ACTION pixels, before the single ActionScene ×2 projection. */
  readonly x: number;
  readonly y: number;
}

export interface ActionPlanePercent {
  /** CSS percentages projected from the native ACTION plane. */
  readonly x: number;
  readonly y: number;
}

export interface ActionPlaneGeometry {
  readonly width: 160;
  readonly height: 80;
  readonly scale: 2;
  readonly home: Readonly<Record<ActionPlaneSide, ActionPlaneAnchor>>;
  readonly special: Readonly<Record<ActionPlaneSide, ActionPlaneAnchor>>;
}

export const ACTION_PLANE_GEOMETRY: ActionPlaneGeometry = {
  width: 160,
  height: 80,
  scale: 2,
  home: {
    player: { x: 48, y: 72 },
    enemy: { x: 112, y: 72 },
  },
  special: {
    player: { x: 56, y: 72 },
    enemy: { x: 104, y: 72 },
  },
} as const;

/** Native ACTION anchor for the requested side and cinematic mode. */
export function actionPlaneAnchorFor(
  side: ActionPlaneSide,
  mode: ActionPlaneMode = 'ACTION',
): ActionPlaneAnchor {
  return mode === 'SPECIAL_ACTION'
    ? ACTION_PLANE_GEOMETRY.special[side]
    : ACTION_PLANE_GEOMETRY.home[side];
}

/**
 * CSS percentage projection used by the DOM Dev previews.  It is deliberately
 * derived from native ACTION coordinates so Dev and Pixi cannot drift apart.
 */
export function actionPlaneAnchorPercentFor(
  side: ActionPlaneSide,
  mode: ActionPlaneMode = 'ACTION',
): ActionPlanePercent {
  const anchor = actionPlaneAnchorFor(side, mode);
  return {
    x: (anchor.x / ACTION_PLANE_GEOMETRY.width) * 100,
    y: (anchor.y / ACTION_PLANE_GEOMETRY.height) * 100,
  };
}

export const ACTION_PLANE_SOURCE =
  'ACTION_ROM_PRESENTATION_NATIVE_160x80' as const;
