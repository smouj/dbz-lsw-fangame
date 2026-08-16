# Combat action pipeline

This document connects the runtime pieces that decide how a card becomes an
on-screen DBZ LSW action. It is the maintenance contract for cards, action
profiles, sprite manifests and validation scripts.

## Source of truth

- `src/data/cards.ts` contains the 125 ROM cards: name, type, stats, effect and
  character compatibility.
- `src/battle/actionProfiles.ts` contains signature cinematic specs by card
  slug. These specs are declarative and compile into `CinematicProfile` tracks.
- `src/battle/profiles.ts` resolves runtime requests. It uses a signature
  profile when one exists and falls back to a generic profile by action kind.
- `src/battle/spriteConfig.ts` is the shared combat sprite contract used by
  React runtime, Pixi runtime and Dev Studio. Do not duplicate pose fallback
  tables elsewhere.
- `public/assets/sprites/<spriteDir>/manifest.json` contains per-form frames.
  `src/data/spriteManifest.ts` maps form ids to those directories.

## Card to visual flow

```text
CardDef
  -> slugifyCardName(card.name)
  -> resolveActionProfile(card.name)
  -> actionSemanticsForCard(card)
  -> profileFor(kind, card.name)
  -> compileActionProfile(spec)
  -> BattleTimeline events
  -> React/Pixi renderer poses + projectile class
```

The visual class for projectiles comes from `ActionCardSemantics.visual`:

- `ray`: linear beams such as Kamehameha, Masenko, Final Flash and Finger Beam.
- `wave`: wide energy waves such as Energy Wave and Burning Attack variants.
- `ball`: compact projectiles such as Energy Bomb, Spirit Bomb and Big Bang.
- `disk`: disk/cut visuals such as Destruct-Disk and Energy Slash/Slice.
- `sword`: sword slash visuals such as Flash.Sword.
- `special`: unique techniques that still need frame-by-frame capture.

All real BEAM cards must resolve to a signature profile. A generic `ray`
fallback is only acceptable for temporary non-BEAM code paths.

## Action visibility contract

Card actions must never show two independent character presentations at the
same time. The canonical sequence is:

```text
FIELD
  -> ACTION_SOLO     actor enters / charges / prepares
  -> PROJECTILE      beam/ball/disk/sword travels, or
     ACTION_DUEL     melee/rush reaches the target
  -> IMPACT          target reaction + hitstop/flash
  -> FIELD_RETURN
```

Runtime ownership:

- DOM `card-fx` is the fallback presentation when Pixi is not active.
- Pixi is the presentation owner when `?pixiField=1` is active and the
  `PixiBattlePresentation` is ready; in that mode DOM `card-fx` is hidden to
  avoid duplicated actors.
- Field fighters (`battlefield-fighters`) are hidden during card actions. The
  action scene owns the visible actor/target until `FIELD_RETURN`.
- `ACTION_SOLO` shows the actor only. `PROJECTILE`, `ACTION_DUEL` and `IMPACT`
  may show the target.
- `RUSH` is a body-motion event. It must never be encoded as
  `PROJECTILE { action: "rush" }`; that keeps melee and autonomous projectiles
  structurally separate.

Projectile tracks carry timing metadata as part of the runtime contract:

- `PROJECTILE { action: "spawn", kind, spawnFrame, contactFrame, travelFrames }`
  starts the visual and defines the travel window.
- `PROJECTILE { action: "travel", progress }` is a checkpoint for compatibility
  and debug readability, not the authority for per-frame movement.
- Pixi computes continuous progress in `sync(tick)` as
  `(tick - spawnFrame) / (contactFrame - spawnFrame)`, clamped to `[0, 1]`.
- `BattleTimeline.seek()` can move backward: it calls `onReset`, replays only
  events up to the target tick and then calls `onTick(target)`. Debug tools must
  rely on this instead of creating ad hoc replay paths.

## Current signature profile coverage

`ACTION_PROFILE_REGISTRY` currently registers **42 signature profiles** — the
**66 combat cards** (command/damage/beam) all resolve to their own profile
(`verify:profiles` fails if any real card is left without one):

- **Stage Attacks (4)**: 3/4/5/6 Stage Attack — cinemática de rush melee con
  mensaje `${n} STAGE` y secuencias canónicas de inputs (ver `stageSequences.ts`).
- **Beam families**: Energy Wave, Energy Bomb, Kamehameha, Masenko, Special Beam
  Cannon, Spirit Bomb, Final Flash/Galick-Ho/Grand Wave/Hell Flash, Big Bang
  Attack, Burning Attack/Fin.Buster/Lightning C., Energy Disk, Finger/Eye/Misty
  KiWave, Flash Sword, Special Projectile y resto de beams firma.
- **Melee families**: Cont.Punch, Cont.Kick, Rising Kick, Sonic Kick, Dunk Shot,
  Crazy Rush y las 18 cartas damage restantes (Solid Shot, Tail, Flash Punch,
  V-ball Crash, Atomic Break, N.Slasher, Dynami.Punch, Cell Combo, Step Up Atk,
  Crasher Buu, etc.) — cada una con su pose de golpe (punch_right/left,
  kick_right) y knockback específico (back/up/down).
- **Support family**: Kaio Ken (buff) + cartas de objeto con aura azul.

Contrato de poses de impacto: `ImpactSpec.targetPose` define la pose del
**defensor** al recibir (knockback_back/up/down en melee; hurt por defecto) y
se emite UNA sola vez en el tick de contacto (sin beats redundantes).

Timings are still `INFERRED`. Frame-exact work should edit the profile spec, not
the runtime renderer.

## Pose contract

Required combat poses for every form:

- `idle`
- `move_front`
- `move_back`
- `guard`
- `attack_fwd`
- `attack_ud`
- `hurt`
- `beam_charge`
- `beam_fire`

Optional/shared poses:

- `beam_ray`
- `beam_ray_tip`
- `gather_power`
- `power_up`

Fallback resolution must go through `resolveCombatPose()` from
`src/battle/spriteConfig.ts`. This keeps `FighterSprite`, `FighterActor` and Dev
Studio aligned.

## Validation commands

Run these before considering combat/action work done:

```bash
npm run verify:profiles
npm run audit:sprites
npm run verify:gbc
npm run typecheck
npm run build
```

What they protect:

- `verify:profiles`: 42 profiles compile deterministically, unique ids/slugs,
  melee/stage windup uses `attack_fwd` (never `gather_power`), melee impact
  emits the spec-specific knockback pose, canonical Stage Attack pools/rotation,
  profile resolver cases and **66/66 combat cards covered** (regression guard).
- `audit:sprites`: all 48 form manifests exist, required poses exist, frame
  names/counts are coherent, **declared w/h matches the physical PNG size**,
  no consecutive duplicate frames, `beam_ray` ratio >= 2 and beam cards have
  explicit profiles.
- `verify:gbc`: GBC canon invariants — position vulnerabilities (AIR→beam,
  GROUND→damage, exclusive), deck max 3 copies, canonical Stage Attack
  sequences, profile coverage, 48/48 roster forms resolve to manifests.
- `typecheck`: TypeScript contracts between cards, profiles, runtime and Dev
  Studio.
- `build`: production bundle still compiles. A >500 KB chunk warning is known
  until the main app is split further.

## Dev Studio links

- Full studio: `http://localhost:5178/?dev=1`
- Sheets: `http://localhost:5178/?dev=1#dev/sheets`
- HUD: `http://localhost:5178/?dev=1#dev/hud`
- Battle Lab with overlays: `http://localhost:5178/?dev=1#dev/battlelab`
- Projectile Matrix: `http://localhost:5178/?dev=1#dev/pixiSequence` and use
  the "Matriz proyectiles" action group for `ray`, `wave`, `ball`, `disk`,
  `sword` and `special`.

When launching a battle from Dev Studio, the app removes only `dev` from the
query and preserves useful debug flags such as `debugState`, `debugCinematics`
and `pixiField`.
