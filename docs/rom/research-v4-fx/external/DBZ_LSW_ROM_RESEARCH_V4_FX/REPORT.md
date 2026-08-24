# DBZ LSW ROM Research V4 — Physical FX / Beam presentation

Date: 2026-08-23
Canonical source: USA ROM SHA-256 `8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee`

This package continues V3. It does **not** promote absolute fighter anchors or semantic ActionObject actor/target binding.

## 1. Card FX accessor is exact

`Bank00:$2B30` reads card byte `+7` (FXResource) and `+8` (palette). For non-`$FF` FX IDs:

```text
fxBank  = $65 + floor(FXResource / $1E)
fxLocal = FXResource % $1E
palette = card byte +8
```

The card table has 32 distinct FX field values **including `$FF`**, hence **31 physical non-FF FX IDs**. It has 10 distinct palette field values including `$FF`, hence **9 physical non-FF palette IDs**: `$2C,$2D,$2E,$2F,$30,$31,$32,$33,$35`.

## 2. Common FX setup

`Bank01:$700E` invokes `$2B30` and then `Bank00:$3421` when FX != `$FF`.

`$3421`:

- preserves side in `$CB76`;
- picks `base+1` or `base+2` in `$CB75` according to side;
- preserves FX bank in `$CB74`;
- resolves the base descriptor through `$1266`;
- loads its graphics payload to VRAM bank 1 beginning at `$8800`;
- loads card palette through `$36CA` into **BG palette slot 4**.

`$073B` proves `$C600` is the BG palette buffer; `$0737` returns `$C640`, the OBJ palette buffer. Fighter and FX palettes are therefore distinct physical CGB palette domains.

## 3. Normal offensive FX bundle grammar

Of the 31 non-FF FX IDs used by cards, **28 are normal offensive bundle bases**. The category tokens/reuses `$01,$04,$06` are not normal `graphics + side1 map + side2 map` bases and must not be parsed as such.

A normal bundle is:

```text
base +0 descriptor -> graphics payload
base +1 descriptor -> side 1 tilemap strip
base +2 descriptor -> side 2 tilemap strip
```

For Bank `$65`, locals `0/1` are reserved by the global attribute strips, so the normal used bundle grid begins at local `2` and advances by 3. In Banks `$66-$68` bundle bases lie on local multiples of 3.

### Graphics descriptor

The first byte is `tileCount`; it is followed by `tileCount × 16` bytes. Each 16-byte chunk is one 8×8 2bpp BG tile. Graphics are copied to VRAM `$8800`.

### Side maps

For all 28 used normal bundles:

- side1 → side2 descriptor distance = exactly `640` bytes;
- each map is `20 rows × 32 columns = 640` tile IDs;
- rows `0,9,10,19` are blank tile `$80` in **all 56 side maps**;
- every referenced tile ID resolves inside the tile range loaded by that FX bundle;
- tile `$80` is the first tile at `$8800` under signed BG tile addressing.

## 4. Opcode `$0C` is an immediate BG tilemap-window operation

Presentation VM opcode `$0C` (`Bank7E:$71CA`, builder `$733C`) stores its operand in `$C0FD` and calls `$345A`.

`$345A` sets destination geometry:

```text
row = 4
col = 0
height = 8 rows
width = full 32-tile row
```

Then `$C0FD` is incremented before copying.

Therefore:

```text
operand $00 -> source rows 1..8
operand $02 -> source rows 3..10
operand $0A -> source rows 11..18
```

`$0EC9/$0EF2` copy exactly 8 × 32 = 256 tilemap/attribute bytes into BG map `$9800`, beginning at destination row 4.

Opcode `$0C` does **not** run a per-FX frame animator. It copies a selected BG tilemap state immediately. Timing/lifetime comes from handler waits, later opcode `$0C` calls, screen motion, scene changes and macros.

## 5. Global FX CGB attribute strips

The attribute source is global:

- side1 → Bank65 local0 (`$4070`)
- side2 → Bank65 local1 (`$42F0`)

Each is 20×32 bytes with uniform rows.

Side1:

```text
rows 0-4   $0C = palette4 + VRAM bank1
rows 5-9   $4C = palette4 + VRAM bank1 + Y flip
rows 10-14 $0C
rows 15-19 $4C
```

Side2:

```text
rows 0-4   $2C = palette4 + VRAM bank1 + X flip
rows 5-9   $6C = palette4 + VRAM bank1 + X flip + Y flip
rows 10-14 $2C
rows 15-19 $6C
```

Thus side mirroring is physically implemented using CGB BG-map attributes plus side-specific tilemaps, not by a separate set of recolored graphic tiles.

## 6. Every opcode `$0C` call site in the ROM

There are **13** calls to `$3F24`, all in Bank03 offensive presentation workers. No Support/Defense worker calls this FX-window VM operation.

Key usage:

```text
Beam core state14          operand 00 -> rows 1-8
handlers 03/04/05/06       operand 00 -> rows 1-8
Purple Comet / P.Comet Z   operand 00 -> rows 1-8
handler 07 state14         operand 02 -> rows 3-10
Beam result states          operand 0A -> rows 11-18
V-ball result state32       operand 0A -> rows 11-18
```

Handler `$07` is statically exact: `E=2` is set before `$3EE1`; `$3EE1 → $72DF` reads E but does not alter it, and the bank-switch wrappers preserve DE. The following `$3F24` therefore receives operand `$02`.

## 7. Physical relation between prefix/result windows

Rendering directly from ROM tiles + maps + CGB palette for the 28 normal bundles gives:

- **18** bundles where prefix/result are pixel-identical after cropping and differ only by map-space translation;
- **10** bundles where the result window is a genuinely different physical graphic.

For pure translations, map-space X deltas include `+16,+24,+32,+40,+48,+56,+64,+80` px depending on FXResource. These are map-space geometry, **not yet absolute screen travel**, because SCX also participates in the final view.

This is recorded in `data/fx_bundle_geometry_v4.csv`.

## 8. Mirroring fidelity

Across 28 bundles × 2 windows = 56 side pairs:

- **55/56** side2 renders are the exact horizontal pixel mirror of side1 after crop;
- the only exception is **FX `$05` result window (Kamehameha/Misty KiWave family)**, which differs by exactly **1 pixel** from a mathematically perfect mirror.

This asymmetry exists in the ROM data path and must not be silently “fixed” by a pixel-perfect remake without a deliberate compatibility decision.

## 9. Kamehameha physical FX is now reconstructed

FX `$05`, palette `$2C`:

```text
Bank65 local5 graphics: 31 tiles / 496 bytes
side1 map: local6
side2 map: local7
```

State14 uses operand `$00` (rows 1-8), producing the long directional Kamehameha beam/orb graphic directly from ROM data.

Result branches use operand `$0A` (rows 11-18), producing the compact circular result-state graphic.

Side2 is produced from the same graphics tile payload with side map + CGB X-flip attributes.

`generated_fx_assets/` contains review renders for all 38 offensive `(FXResource,palette)` pairs.

### Important PNG caveat

For review PNGs, palette color index 0 is exported transparent so the physical non-background pixels can be inspected easily. **This transparency is not a ROM fact.** On the GBC these are BG tiles and color 0 is a real palette color (white in the nine card FX palettes). Runtime integration must reproduce the actual scene/background composition rather than treating the review PNG alpha as canonical.

## 10. FX identity is `(FXResource + palette + side + selected window)`

There are 41 offensive cards with non-FF FX, 28 unique offensive FX bundle IDs, but **38 unique `(FXResource,palette)` pairs**.

Several resources are recolored by palette, e.g. `$02,$05,$08,$0E,$11,$14,$27,$30,$36,$45`.

Therefore:

```text
FXResource alone != complete physical effect identity
```

## 11. Selector parameters `row[2]/row[3]` are screen offsets, not unknown coordinates

`Bank00:$3966` writes selector row byte2 to `$C2D0` and transforms row byte3 into `$C2D1` with a side-dependent expression around `$80`.

Beam state14 passes `$C2D0/$C2D1` to Presentation opcode `$0D`.

Opcode `$0D` stores them in `$C405/$C406`.

`Bank00:$0DA2` proves:

```text
SCY (FF42) = base C407 + C405
SCX (FF43) = base C409 + C406
```

Thus these selector fields are **presentation scroll parameters**:

- row[2] -> vertical screen offset byte;
- row[3] -> horizontal screen offset source, transformed by side around `$80`.

This is static ROM evidence and no longer belongs in a generic `UNKNOWN coordinate` bucket.

`data/beam_actor_screen_offsets_v4.csv` contains the exact values for the 240 Beam/card-form compatibility rows from the V2 matrix (237 belong to the standard `$02/$03/$04/$05/$07` families; the remainder are special Beam cases).

This does **not** prove universal ACTOR_HOME/TARGET_HOME or semantic contact anchors.

## 12. Support/Defense boundary

All 13 opcode `$0C` FX-window call sites are Bank03 offensive. Support/Defense do not use this operation.

The common action setup still reads/preloads their FX fields, but their visible presentation is category-specific and must be studied through Support/Defense workers rather than by reusing Beam FX-window semantics.

This explains why `$01/$04/$06` must not be treated as normal offensive bundles.

### Kiai / Paralysis actor AnimationResource

The Support `$0D` worker (`Bank03:$664E`) uses Presentation macro `$2B` in state14. Macro `$2B` contains no opcode `$01` start of AnimationSlot6. Global static searches likewise find no Support ActionObject start of the card-loaded slot6. Therefore Kiai `$40` and Paralysis `$29` remain:

```text
CARD_RESOURCE_LOADED
BUT_NO_STATIC_SUPPORT_ACTIONOBJECT_START_FOUND
```

Do not auto-play those resources merely because the card table contains them.

## 13. What V4 means for runtime

For Beam/offensive FX the ROM-level cue should carry at least:

```text
FXResource
palette
side
windowOperand / sourceRows
renderDomain = BG_TILEMAP
VRAM graphics base = $8800
BG palette slot = 4
provenance address
```

Do not reduce this to `projectileKind = beam/ball` and choose an arbitrary PNG by card name.

A faithful compiler may semantically resolve a known ROM FX later, but the literal cue must remain inspectable.

## 14. Still open

Static work still worth doing:

1. Support/Defense visual grammar outside opcode `$0C`.
2. Exact purpose of generic/category FX tokens `$01/$04/$06` beyond common preload.
3. Lightning C. AnimationResource `$06` sequence1 reachability.
4. Deeper meaning of Kiai/Paralysis loaded-but-not-started card AnimationResources.
5. Exact scene/background composition while FX BG window color0 is visible.
6. Full mapping from FX/map-space geometry + SCX/SCY parameters to the final 160×144 viewport.

Dynamic evidence still reserved for:

- definitive semantic actor/target ActionObject binding in specials;
- universal combat anchors/contact points where static code cannot establish them;
- multi-actor runtime binding and any branch that genuinely depends on live state not statically enumerable.

