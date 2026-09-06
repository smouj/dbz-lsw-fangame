# STANDARD_DAMAGE Runtime Cutover

Status: `CLOSED · PRODUCTION OWNER PILOT`

Scope: player-side cards whose ROM execution handler is `$0A` (`STANDARD_DAMAGE`).

## Runtime Route

```text
ACTION_STARTED
  -> RomActionExecutionDescriptor
  -> RomPresentationProfile
  -> compileRomPresentationProfile()
  -> BattleTimeline
```

The cutover is gated by handler, not by individual card IDs. Non-`$0A` cards stay on the legacy presentation path.

With `?pixiField=1`, BattleScreen compiles the latest resolved player `$0A` action
from the authoritative Runtime EventLog and gives its focused film to Pixi.
That ROM player owns completion for this route, so the legacy DOM timeline is
not started in parallel. The default renderer and every other family retain
their current fallback while the migration remains progressive.

## Canonical Counts

```text
STANDARD_DAMAGE handler $0A cards       19/19 ROM_BACKED
Other handlers diverted                  0
Branches                                 HIT / MISS / SPECIAL_DEFENSE
```

## Guardrails

- Engine authority is unchanged: HP, damage, hit/miss, CC, phase, exchange, hand/discard and RNG are still produced by the battle engine.
- Branch selection comes from `BattleEventLog`: `ATTACK_HIT` -> `HIT`, `ATTACK_MISSED` -> `MISS`, guarded/block outcomes -> `SPECIAL_DEFENSE`.
- Presentation does not roll RNG and does not compute damage.
- ROM motion `$1C` stays discrete: `+4px x 24 ticks`, `+2px x 1 tick`, total `+98px / 25 ticks`.
- No `BASE_X`, `BASE_Y`, anchors, absolute coordinates or slot bindings are introduced.
- Animation resources remain resource provenance (`ANIMATION_START resource $XX`), not semantic pose claims.
- The legacy STANDARD_DAMAGE semantic path is suppressed for `$0A` after ACTION_STARTED.
- The cumulative Runtime log is reduced to the latest matching action before playback; previous films cannot replay.
- Pixi `onComplete` is the only presentation boundary that releases control for player `$0A` while the flag is active. Enemy actions retain the legacy completion path until their resolve/present order is migrated.

## Verification

```text
npm run verify:standard-damage-rom-cutover
npm run verify:presentation
```

The dedicated verifier checks the 19/19 gate, branch provenance, `$1C` segment preservation, Presenter segment consumption, deterministic timelines, and that Engine state/EventLog/RNG remain unchanged by the ROM-backed presentation path.
