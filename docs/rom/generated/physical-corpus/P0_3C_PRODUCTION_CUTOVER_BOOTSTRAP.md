# P0.3C — Production Cutover Bootstrap

Status: OPEN / BOOTSTRAPPED.

P0.3B is closed locally: `ROM_PHYSICAL_FIGHTERS` uses `schemaVersion=2` and
`offsetEncoding=s8`, with raw ROM bytes preserved separately from decoded signed
offsets.

This P0.3C bootstrap adds the production authority layer. It does not replace
`manifest.json` and it does not rename physical frames into semantic poses.

## New Authority

`src/battle/productionFrameResolver.ts`

Input:

```text
formId
AnimationResource
sequenceSelector
frameIndex
```

Output:

```text
ROM_PHYSICAL | CANONICAL_PHYSICAL | MANIFEST_FALLBACK | UNRESOLVED
physicalId
frameInstanceId
file
durationTicks
offsetX / offsetY
rawOffsetX / rawOffsetY
visualFrameId
evidence
fallbackReason
```

Rules:

- `ROM_PHYSICAL` wins when the corpus contains the form/resource/sequence/frame.
- `MANIFEST_FALLBACK` is only returned when the caller asks for an explicit
  fallback pose.
- Palette-blocked forms stay `UNRESOLVED` without silent fallback.
- `SUPPORT + handler $02` is forbidden from entering `BEAM_BASE`.
- `MIXED` production presentation must remain `0`.

## Current Metrics

```text
PHYSICAL EXTRACTION
forms rendered 48 / 48
physical IDs 490
frame instances 2070
physical renderer schema 3
raw debug canvases 490

PHYSICAL MAPPING
ROM instances mapped 2070 / 2070
exact physical IDs 490
shared physical instances 1580
unresolved 0

PRODUCTION CONSUMPTION
ROM presentation production 35 / 125
LEGACY fallback 90 / 125
MIXED 0
```

The previous 10 `PALETTE_UNRESOLVED` forms are resolved after the Bank30
banked-address palette fix. Current blocked lists are empty:

```text
palette-blocked profiles 0
resource-blocked profiles 0
```

## Runtime Trace Hook

`ANIMATION_START` now may emit `ROM_PHYSICAL_FRAME` cues when `actorFormId` and
`sequenceSelector` are known. `ProductionRomPresentationAdapter` records:

```text
formId
resource
sequence
frameIndex
physicalId
source
file
offsetX / offsetY
durationTicks
```

This lets Animation Studio / Combat Lab inspect what production actually
resolved instead of assuming the presenter consumed the ROM frame.

## Validation

```bash
npm run verify:production-frame-resolver
npm run verify:rom-physical-corpus
npm run verify:beam-base-rom-cutover
npm run verify:dev-routes
npm run verify:dev-studio
npm run verify:animation-studio
npm run typecheck
npm run build
```

## Next Block

P0.3D should continue from the visible physical corpus:

1. Export/inspect the exhaustive structure:

   ```text
   rom-physical-fighters/<form>/resource_<rr>/seq_<ss>/frame_<ff>_vf_<vv>.png
   ```

2. Attach per-frame metadata with form/profile/graphicsBank/resource/sequence/
   frame/vfid/ticks/signed offsets/metasprite pieces/palette/hash.
3. Deduplicate by physical identity and hash while preserving every ROM use.
4. Begin visual cutover cohorts only after the BattleScreen previews match
   the corrected raw/trimmed ROM render.
5. Only after that, reconcile `ROM_PHYSICAL` against
   `Canonical_Frames_Official`, current manifests and runtime production.
