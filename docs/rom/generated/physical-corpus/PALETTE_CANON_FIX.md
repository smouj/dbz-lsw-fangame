# P0 Palette Canon Fix

Status: CLOSED / VERIFIED

## Root Cause

The fighter palette contract is:

```text
actor/form
→ actorVisualProfileKey
→ Bank30:$6E00 + actorVisualProfileKey × 8
→ 8 bytes
→ 4 CGB BGR555 colors
```

`$6E00` is a banked CPU address, not a raw file offset. The correct ROM file offset is:

```text
bank * $4000 + (cpuAddress - $4000)
```

So `Bank $30 : $6E00` resolves to:

```text
$30 * $4000 + ($6E00 - $4000) = $C2E00
```

The old raw addition form would have read:

```text
$30 * $4000 + $6E00 = $C6E00
```

That is one full bank too far.

## Fix

- `scripts/generate-rom-fighter-palettes.ts` now uses `bankedOffset(bank, cpuAddress)`.
- `tools/sprite-mapping/build-rom-provenance.ts` now uses the same banked-address conversion.
- `romFighterPalettes.generated.ts` now records `romBank`, `cpuAddress`, and `fileOffset` per palette row.
- `rom-form-profiles.json` now records `paletteRomBank`, `paletteCpuAddress`, and `paletteFileOffset` per form.
- `scripts/verify-rom-fighter-canon.ts` fails if the old raw `bankBase + cpuAddress` conversion reappears.

## Domain Separation

Fighter palettes and card FX palettes are separate domains:

```text
FORM.actorVisualProfileKey → fighter OBJ palette
CARD.fxPalette             → FX/beam/support palette
```

Example:

```text
Kamehameha
actor AnimationResource = $03
FXResource              = $05
FX palette              = $2C
```

`$2C` colors the FX, not Goku.

## Regenerated Outputs

After this fix:

```text
fighter palette rows  64
forms                 48/48
palette unresolved    0
physical IDs          490
frame instances       2070
physical renderer     schema 3
raw canvases          490
```

The physical corpus and exported contact sheets were regenerated from the corrected fighter palettes and the schema 3 fighter renderer: signed metasprite piece coordinates, piece-extents trim, preserved origin, raw debug canvas, and OBJ color0 transparency.
