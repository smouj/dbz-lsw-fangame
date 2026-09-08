---
name: "rom-physical-promotion"
description: "'renderer pending N' in dev modules or UNRESOLVED card frames — promote AnimationResources into the ROM physical corpus (mirror build+verify allowlist)."
---

# ROM Physical Promotion (DBZ LSW — production coverage)

When dev modules (Cards/Animation Studio) show "Fighter rendered X/X · renderer pending N" or a real battle's card animation does not show the fighter body, the cause is usually the hardcoded fighter-physical allowlist, not missing wiring. The resolver and FighterActor already work once a resource has physical PNGs; the job is extending the corpus.

## Decode the counter before touching anything

"Fighter rendered 16/16 · renderer pending 46" is RESOURCE-level, not fighter-level. It comes from `ROM_PHYSICAL_CORPUS_SUMMARY` (`src/data/generated/romPhysicalCorpus.generated.ts`), computed by `scripts/build-rom-physical-corpus.ts`:

- `resourcesRendered` = AnimationResources inside the hardcoded `FIGHTER_PHYSICAL_RESOURCE_IDS` set that have a decoded frame stream (they get PNGs per compatible form).
- `resourcesRendererPending` = resources WITH a decoded frame stream NOT in that set (45 FRAME_STREAM_ONLY + leftovers). They never got textures, so `resolveProductionFrame` returns source UNRESOLVED and FighterActor has nothing to show.
- The SAME allowlist constant is duplicated in `scripts/verify-rom-physical-corpus.ts` — every promotion must touch BOTH files or the verifier diverges from the builder.

## Classify the pending resources before promoting

Dump `docs/rom/generated/physical-corpus/resource_physical_completion.json` (per-resource status):

- `FRAME_STREAM_ONLY` with consumers → promotion candidate (same pipeline as the rendered 16).
- `GRAPHICS_PENDING` ($28/$29/$2A/$40 Teleport./Paralysis/Time Freeze/Kiai; sequenceCount 0, frames 0) → handler/preload tokens, NO frames to render; leave explicit, never promote.
- `UNREFERENCED` (no card consumers, e.g. $0D) → skip; nothing consumes it in production.

## Prove producibility BEFORE editing the allowlist

Run the physical renderer for a candidate and inspect the gitignored output (writes under `docs/rom/generated/fighters/`, safe):

```bash
npx tsx tools/rom-research/scripts/render-fighter-physical.ts --resource <hex> --keys <profileKeyHex>
```

Look at a frame's `metadata.json`: `assembly.errors` must be `[]`, `piecesOutsideRaw` 0, and the trimmed PNG must have a non-empty opaque bbox (check with PIL). A successful render of one candidate (e.g. $2E Dunk Shot for cell_perfect key 0x24) generalizes to the whole FSO family — probe a sample per card family, not all 45.

## Confirm the production gap (optional, strengthens the commit)

Compile a real runtime timeline for a card whose resource is outside the allowlist (ACTION_STARTED + ATTACK_HIT events through `buildPresentationTimeline`, or the STANDARD_DAMAGE runtime cutover) and count `ROM_PHYSICAL_FRAME` cue sources: the resource emits `UNRESOLVED` while a promoted one (Cont.Punch $2C) emits `ROM_PHYSICAL`. That is the visible-battle symptom (actor stays on the previous pose during the move).

## Promote: extend the allowlist in BOTH mirrored files

Add the producible resource IDs to `FIGHTER_PHYSICAL_RESOURCE_IDS` in `scripts/build-rom-physical-corpus.ts` AND `scripts/verify-rom-physical-corpus.ts` (same set; 16 → 61 when promoting all FSO). Commit small and by root cause, never `git add -A`; the message cites the cause (incomplete allowlist → UNRESOLVED at runtime → FighterActor without texture). Excluded tokens stay `ROM_PENDING` explicit by design — no silent LEGACY/SEMANTIC fallback exists for them (resolver returns UNRESOLVED/MANIFEST_FALLBACK only with explicit evidence).

## Regenerate and re-verify

`npm run build:rom-physical-corpus` is SLOW (>10 min CPU observed; it re-renders reachable resources and produced no log lines until very late — do not judge it dead by silence). Run it detached with its own session and wait on a completion marker, never on the exec session (see session-lifecycle note in rom-presentation-cutover step 5). PNG exports under `public/assets/sprites/*/physical/` are gitignored by design; the strict local gate is `REQUIRE_ROM_PHYSICAL_EXPORTS=1`.

Area gates after regen, sequential: `verify:rom-physical-corpus` (checks `resourcesRendererPending === rendererPendingResources.length` — drops to the UNREFERENCED count once summary regenerates), `verify:workspace-hygiene` (its pinned corpus totals, e.g. 3689/24823, change with the corpus — update those literals in the same or an immediately following commit, citing the regen), `verify:production-frame-resolver`, `verify:physical-animation-mapping`, `verify:combat-film-consumption`, `verify:card-physical-coverage`, `verify:animation-resources`, `npm run typecheck`. Then the resolver probe for the affected cards must return `ROM_PHYSICAL`; any frame that renders empty stays an explicit transparent/`EMPTY_NOT_PROMOTED` record — never promoted as a fake.

## Pitfalls

- Do not read the dev-module label as "46 fighters missing": it is 46 resources (slots of the 66-resource catalog) missing physical textures.
- Do not promote GRAPHICS_PENDING tokens: they have zero frames by design.
- Do not edit only the builder: the verifier mirrors the same allowlist constant and will disagree.
- Regen is not incremental per resource in the default mode and re-renders the reachable set — budget the time or use the documented narrow modes (`ROM_PHYSICAL_RENDER_MODE`).
