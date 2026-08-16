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

`ACTION_PROFILE_REGISTRY` currently registers 20 signature profiles:

- Beam families: Energy Wave, Energy Bomb, Kamehameha, Masenko, Special Beam
  Cannon, Spirit Bomb, Final Flash/Galick-Ho/Grand Wave/Hell Flash, Big Bang
  Attack, Burning Attack/Fin.Buster/Lightning C., Energy Disk, Finger/Eye/Misty
  KiWave, Flash Sword and Special Projectile.
- Melee families: Cont.Punch, Cont.Kick, Rising Kick, Sonic Kick, Dunk Shot and
  Crazy Rush.
- Support family: Kaio Ken.

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
npm run typecheck
npm run build
```

What they protect:

- `verify:profiles`: profile compilation, deterministic timelines, unique ids,
  unique slugs, common action prep, profile resolver cases and complete BEAM
  card coverage.
- `audit:sprites`: all 48 form manifests exist, required poses exist, frame
  names/counts/sizes are coherent, `beam_ray` is present and beam cards have
  explicit profiles.
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
