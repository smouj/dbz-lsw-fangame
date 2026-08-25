# P0 Fighter Identity Audit

Source: ROM USA `8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee`.

This report is about ROM identity and frame assembly, not visual similarity. A Fighter render is accepted only when the runtime form resolves through the raw ROM form record to the same actor visual profile, graphics bank, palette index, metasprite identity, and graphics-block identity used by the physical PNG.

## Gate Result

- Form identity table: `48/48`
- High-risk identities: `7/7 ROM_IDENTITY_VERIFIED`
- Remaining `UNVERIFIED_PHYSICAL`: `0`
- Palette SSOT: `ROM_CGB_PALETTE_TABLE`, `256/256` entries, `0` filtered rows
- Physical corpus: `48/48` forms, `490` physical IDs, `2070` frame instances
- Physical ID contract: `ROM SHA + actorVisualProfileKey + graphicsBank + AnimationResource + visualFrameId + metaspriteHash + graphicsHash`
- Frame assembly: `490` physical frames, `5880` pieces, `0` piece/block/render mismatches
- Source provenance: metasprite hash, graphics table hash, graphics block hashes, palette raw hash, source provenance hash
- Runtime production resolver: reads generated `physicalFrameIndex`, not a local weak formula

## Directed Cases

| formId | ROM form | ROM record | raw record | profile | graphics | palette | status |
| --- | ---: | --- | --- | ---: | ---: | ---: | --- |
| `goku_base` | `$08` | `Bank11:$4080` / file `$44080` | `01 05 07 07 00 03 00 00 00 00 00 00 00 00 00 00` | `$05` | `$36` | `$05` | `ROM_RECORD_VERIFIED` |
| `goku_ssj` | `$09` | `Bank11:$4090` / file `$44090` | `01 06 07 08 00 03 0a 05 03 02 00 00 00 00 00 00` | `$06` | `$37` | `$06` | `ROM_RECORD_VERIFIED` |
| `krillin_base` | `$07` | `Bank11:$4070` / file `$44070` | `01 04 02 06 00 02 00 00 00 00 00 00 00 00 00 00` | `$04` | `$35` | `$04` | `ROM_RECORD_VERIFIED` |
| `vegito_ssj` | `$30` | `Bank11:$4300` / file `$44300` | `01 2b 12 b2 00 10 00 05 00 00 00 00 00 00 00 00` | `$2b` | `$5c` | `$2b` | `ROM_IDENTITY_VERIFIED` |
| `gotenks_ssj` | `$2e` | `Bank11:$42e0` / file `$442e0` | `01 29 2c 2d 00 1a 14 0a 07 03 00 00 00 00 00 00` | `$29` | `$5a` | `$29` | `ROM_IDENTITY_VERIFIED` |
| `gotenks_ssj3` | `$2f` | `Bank11:$42f0` / file `$442f0` | `01 2a 2c 2e 00 1a 05 05 05 0a 00 00 00 00 00 00` | `$2a` | `$5b` | `$2a` | `ROM_IDENTITY_VERIFIED` |
| `buu_gotenks` | `$2a` | `Bank11:$42a0` / file `$442a0` | `01 25 20 29 00 18 00 00 00 00 00 00 00 00 00 00` | `$25` | `$56` | `$25` | `ROM_IDENTITY_VERIFIED` |
| `buu_gohan` | `$2b` | `Bank11:$42b0` / file `$442b0` | `01 26 2c 2a 00 19 00 00 00 00 00 00 00 00 00 00` | `$26` | `$57` | `$26` | `ROM_IDENTITY_VERIFIED` |
| `buu_kid` | `$2c` | `Bank11:$42c0` / file `$442c0` | `01 27 2c 2b 00 1a 00 00 00 00 00 00 00 00 00 00` | `$27` | `$58` | `$27` | `ROM_IDENTITY_VERIFIED` |
| `ginyu_goku` | `$2d` | `Bank11:$42d0` / file `$442d0` | `01 28 2c 2c 00 1a 0f 06 0a 04 00 00 00 00 00 00` | `$28` | `$59` | `$28` | `ROM_IDENTITY_VERIFIED` |
| `piccolo_base` | `$04` | `Bank11:$4040` / file `$44040` | `01 03 01 03 00 01 14 0a 07 04 00 00 00 00 00 00` | `$03` | `$34` | `$03` | `ROM_RECORD_VERIFIED` |
| `android_16` | `$21` | `Bank11:$4210` / file `$44210` | `01 1c 13 20 00 11 00 00 00 00 00 00 00 00 00 00` | `$1c` | `$4d` | `$1c` | `ROM_RECORD_VERIFIED` |
| `cell_perfect` | `$28` | `Bank11:$4280` / file `$44280` | `01 23 1e 27 00 17 0a 05 03 02 00 00 00 00 00 00` | `$23` | `$54` | `$23` | `ROM_RECORD_VERIFIED` |
| `buu_base` | `$18` | `Bank11:$4180` / file `$44180` | `01 13 2e 17 00 09 00 00 00 00 00 00 00 00 00 00` | `$13` | `$44` | `$13` | `ROM_RECORD_VERIFIED` |

## Critical Separations

- `goku_base` is `profile $05 / graphicsBank $36`.
- `goku_ssj` is `profile $06 / graphicsBank $37`.
- `krillin_base` is `profile $04 / graphicsBank $35`, so it does not consume Goku profile graphics.
- `vegito_ssj` is the only production Vegito identity in this table. Historical `vegito/base` material is not a ROM authority.
- `gotenks_ssj` and `gotenks_ssj3` are distinct ROM profiles: `$29/$5a` and `$2a/$5b`.
- `buu_gotenks`, `buu_gohan`, and `buu_kid` are distinct ROM profiles: `$25/$56`, `$26/$57`, and `$27/$58`.
- `ginyu_goku` has its own ROM profile `$28/$59`; it is not silently mapped to Goku Base.

## Frame Assembly Gate

- `verify:rom-fighter-frame-assembly` validates every physical frame before TRIM is trusted.
- For each frame, `metaspritePieceCount == graphicsBlockCount == renderedPieceCount`.
- Each rendered piece records `pieceIndex`, signed `x/y`, attributes, graphics block address/hash, and both tile addresses/hashes.
- Bounds are computed from metasprite piece geometry (`8x16` OBJ pieces), not opaque-pixel bbox.
- Same source provenance must produce the same RAW pixel hash.

## Visual Audit Outputs

- Per-form sheets: `generated/rom-fighters/<formId>/contact_sheet.png`
- Per-form forensic HTML: `generated/rom-fighters/<formId>/contact_sheet.html`
- Global 48-form audit sheet: `generated/rom-fighters/contact_sheet_48_forms.png`
- Global 48-form forensic sheet: `generated/rom-fighters/contact_sheet_48_forms_forensic.png`
- Global 48-form audit HTML: `generated/rom-fighters/contact_sheet_48_forms.html`
- Global 48-form audit JSON: `generated/rom-fighters/contact_sheet_48_forms.json`
- Global 48-form forensic JSON: `generated/rom-fighters/contact_sheet_48_forms_forensic.json`

P0 Fighter identity and frame assembly are closed by ROM evidence. Future remapping work must still keep semantic roles separate from physical identities.
