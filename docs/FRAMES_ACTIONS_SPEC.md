# DBZ LSW — Frames, Animations and Actions Spec

Version 1.0 · 2026-08-16

This is the current project contract for naming, classifying and executing
combat sprites without confusing observed assets with gameplay semantics.

## Evidence Levels

| Mark | Meaning | Canonical use |
|---|---|---|
| `CONF_GAME` | Confirmed by game/manual/card list/walkthrough rules | Yes |
| `CONF_ASSET` | The graphic exists in a sheet/crop, but function is not proven | Asset only |
| `CONF_PROJECT` | Closed remake contract | Yes, internal |
| `INFERRED` | Reasonable interpretation | No official claim |
| `PENDING_ROM` | Needs ROM/video/OAM/frame audit | No |

Rule:

```text
Graphic found, unknown function -> unclassified
Generic function proven -> semantic family
Card, character and sequence proven -> specific variant
Order, timing, pivot and events proven -> validated/frame-perfect
```

## Views

The renderer must keep these views separate:

- `TACTICAL_FIELD`: small overworld sprites, positions, cards, HUD and tactical
  state only.
- `ACTION_SOLO`: one large actor. Used for preparation, Gather Power, buffs,
  transformations, healing, items and utility/support without body contact.
- `ACTION_DUEL`: large actor and target. Used for melee, grab, guard, counter
  and direct contact actions.
- `PROJECTILE`: projectile/beam/disk/sword/effect travel as an entity separate
  from the actor body.
- `IMPACT`: contact, block, avoid, explosion, hit-stop and KO confirmation.

Canonical flow:

```text
TACTICAL_FIELD
-> ACTION_CONFIRMED
-> ACTION_VIEW_ENTER
-> ACTION_PREPARATION
-> ACTION_EXECUTION
-> HIT | MISS | BLOCK | AVOID
-> RESULT_APPLICATION
-> ACTION_VIEW_EXIT
-> TACTICAL_FIELD
```

In the current implementation this maps to:

```text
FIELD
-> ACTION_SOLO
-> PROJECTILE | ACTION_DUEL
-> IMPACT
-> FIELD_RETURN
```

`RUSH` is its own timeline event. It must not be encoded as a projectile.

## Folder Contract

```text
characters/
  <character_id>/
    <form_id>/
      overworld/
        idle/
        movement/
        gather_power/
        guard/
        hurt/
        unclassified/
      action/
        idle/
        movement/
        guard/
        attack_forward/
        attack_vertical/
        hurt/
        beam/
        special/
        unclassified/
      manifest.json

effects/
  movement/
  aura/
  charge/
  beam/
  projectile/
  impact/
  guard/
  transformation/
  status/
  unclassified/

backgrounds/
  <scenario_id>/
    overview.png
    action.png
    special_action/

cinematics/
  templates/
  cards/
  characters/
```

Auras, beams, dust, impacts and projectiles are not body frames, even when they
appear near a body pose in the original sheet.

## Naming

Physical frame:

```text
[role]_[action]_[variant]_[frame].png
```

Allowed `role` values:

```text
player
enemy
support
effect
projectile
```

Examples:

```text
player_guard_front_01.png
enemy_hurt_heavy_02.png
player_attack_forward_03.png
player_attack_vertical_02.png
player_beam_cast_01.png
support_heal_cast_02.png
effect_beam_charge_03.png
projectile_energy_ball_01.png
```

Clip id:

```text
[view]_[action]_[variant]
```

Examples:

```text
overworld_idle_ground
overworld_move_horizontal
overworld_move_vertical
battle_overworld_gather_power_pose
battle_overworld_gather_power_aura
action_guard_front
action_attack_forward
action_attack_vertical
action_beam_cast
action_hurt_heavy
```

Unknown frame:

```text
unclassified_sheet_<sheet>_region_<region>_<frame>.png
```

Do not rename a crop by visual similarity.

## Canonical Body Families

| Family | Use | Loop | Mechanical event |
|---|---|---:|---|
| `idle` | Neutral wait | Yes | None |
| `movement` | Tactical movement/approach | Usually no | `movement_commit` when position changes |
| `guard` | Guard or barrier body pose | Depends | `guard_active` |
| `attack_forward` | Horizontal physical attacks | No | `contact` |
| `attack_vertical` | Rising/slam/vertical attacks | No | `contact` |
| `hurt` | Reaction to hit/cut/beam/explosion/fall | No | None |
| `beam` | Body pose/charge/release of energy | Partial | `charge_start`, `projectile_spawn` |
| `special` | Transformation/control/validated exclusive technique | Depends | Profile-defined |
| `unclassified` | Asset with unproven function | No | None |
| `fixed` | QA/provenance mark for corrected crop | Inherits | Inherits |

`fixed` is metadata, not gameplay animation.

## Gather Power

Gather Power is not a beam charge and must not be called `power`.

```text
action: gather_power
body pose: battle_overworld_gather_power_pose
effect: battle_overworld_gather_power_aura
resulting state: powered_up
```

Expected sequence:

```text
card/basic confirm
-> battle_overworld_gather_power_pose
-> charge_start
-> battle_overworld_gather_power_aura loop
-> resolve(powered_up)
-> aura end
-> overworld_idle
```

## Frame Metadata

Every frame manifest entry should carry enough information to audit its source
and runtime behavior:

```json
{
  "id": "player_guard_front_01",
  "file": "action/guard/player_guard_front_01.png",
  "sourceSheet": "goku_super_saiyan",
  "sourceRegion": "region_014",
  "evidence": "CONF_ASSET",
  "semanticStatus": "validated",
  "durationTicks": 4,
  "pivot": { "x": 16, "y": 31 },
  "hurtbox": { "x": 7, "y": 3, "w": 18, "h": 28 },
  "hitbox": null,
  "attachPoints": {
    "hand_left": null,
    "hand_right": null,
    "mouth": null,
    "center": { "x": 16, "y": 16 }
  },
  "events": [],
  "flipSafe": true,
  "paletteId": "battle_default",
  "notes": ""
}
```

## Timeline Events

Minimum semantic events:

```text
clip_start
anticipation_start
charge_start
charge_loop
projectile_spawn
beam_start
movement_commit
contact
guard_contact
avoid_commit
hit_stop_start
hit_stop_end
resolve
ko_confirmed
cleanup
return_to_field
```

Implementation-level `BattleTimeline` events:

```text
SHOT
ACTOR_POSE
TARGET_POSE
RUSH
PROJECTILE
HIT_FRAME
APPLY_DAMAGE
SFX
CAMERA
MESSAGE
FIELD_RETURN
COMPLETE
```

Rules:

- `contact` synchronizes pose, VFX, SFX and reaction. It does not apply damage
  by itself.
- `resolve` applies HP, CC, statuses and discard.
- `ko_confirmed` only happens after `resolve`.
- `projectile_spawn` creates a separate entity anchored to the correct
  attach point.
- `movement_commit` is the only event that changes a tactical position.
- `cleanup` removes temporary effects, not persistent states.

## Stage Attack 3/4/5/6

The confirmed Stage Attack cards are 3, 4, 5 and 6 Stage Attack. They grant 3,
4, 5 and 6 CC respectively.

Stage Attack is not its own sprite bank. It composes:

```text
idle/ready
movement or rush
attack_forward/attack_vertical
hurt
impact
recovery
```

Rules:

- The input window is global for the whole sequence.
- The actor stays neutral/prepared while commands are entered.
- Each success advances the input index.
- Failure does not become automatic partial damage.
- Movement buttons represent two axes: horizontal or vertical.

## Prohibited Errors

- Naming a pose by resemblance without seeing it executed.
- Grouping two different poses in the same PNG.
- Keeping aura/projectile/impact glued to the body when it is an independent
  entity.
- Showing large action sprites in `TACTICAL_FIELD`.
- Showing overworld sprites as the full action technique.
- Applying damage at animation start.
- Starting KO before `resolve`.
- Restarting Stage Attack timing after each input.
- Showing four movement buttons that allow diagonal one-step jumps.
- Changing both tactical axes with one Movement action.
- Calling a beam charge `gather_power`.
- Calling `fixed` an action.
- Treating `001`, `002`, etc. as semantics.
- Synchronizing VFX, camera, sprites and damage with independent timers.

## Validation Bar

An animation can only be marked `validated` when these are checked:

1. Character and form.
2. Source sheet and region.
3. Frame order.
4. Duration per frame.
5. Deliberate repeated frames.
6. Pivot and X/Y offsets.
7. Palette.
8. Flip and side.
9. Z-order/OAM.
10. Effect spawn point.
11. Exact contact frame.
12. Hit-stop.
13. HIT/MISS/BLOCK/AVOID reaction.
14. `resolve` moment.
15. Cleanup and return.

If frame order, duration, pivot, spawn point or contact frame are missing, the
sequence is not frame-perfect.
