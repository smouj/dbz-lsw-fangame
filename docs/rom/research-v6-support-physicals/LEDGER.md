# DBZ LSW ROM Research V6 Support Physical Visuals Ledger

Estado: `V6_P0_LOADER_DESCRIPTOR_MATRIX_PARTIAL`.

V5 queda `CLOSED/FROZEN`. Este ledger solo registra avances V6 sobre la ruta
card-indexed de Support:

```text
Bank00:$2C30 -> banks $6B+ -> descriptor fisico -> layout/control -> graphics
```

No reabre:

- `category + handler`
- Support BG `$19`
- BG `$1A = CHARA/Gather`
- `HOLD120`
- Defense slot8 preload/start boundary
- Move tactical state vs cinematic net0
- CA83/CA53 numeric result contract

## 1. `CC01` indexing

`Bank03:$63FA`:

```text
XOR A
CALL $39B3
LD ($CC01),A
C = $6B
B = $03
DE = $8800
CALL $2C30
```

`Bank00:$39B3` selects the active side's `CA57/CA58` card id. `Call_2A77`
proves the indexing convention for normal card records:

```text
HL = $4000 + (CC01 << 4) + $0310
```

So:

```text
CC01 = 1 -> Bank11:$4320
```

That is the first normal 16-byte card record. V6 therefore records:

```text
cc01LoaderIndex = cardId
```

Status: `ROM_STATIC_VERIFIED`.

## 2. `$2C30` loader formula

`Bank00:$2C30` reads `CC01`, repeatedly subtracts `$20`, and increments `C`,
starting with Support `C=$6B`.

Formula:

```text
loaderBank = $6B + floor(CC01 / $20)
localIndex = CC01 % $20
```

Status: `ROM_STATIC_VERIFIED`.

## 3. `$1266` descriptor resolution

`Bank00:$1266`:

```text
HL = $4008 + localIndex * 4
entryWord = word[HL]
descriptor = $4000 + entryWord * 4
```

This means table words such as `$0022` resolve to `$4088`, not `$7D22`.
Interpreting the bank table as absolute pointers is wrong.

Status: `ROM_STATIC_VERIFIED`.

## 4. Descriptor format

For 48/48 Support descriptors:

```text
byte 0                 layoutChunkCount
next count * 8 bytes   layout/control bytes copied via $073F
next byte              tileCount -> C216
next tileCount*16      2bpp graphics copied via $10CF
```

Observed shape:

```text
layoutChunkCount = 2
layoutSize       = 16 bytes
tileCount        = $1E / 30 tiles
graphicsSize     = 480 bytes
payloadSize      = 498 bytes
padding          = 2 bytes before next aligned descriptor
```

Status: `ROM_STATIC_VERIFIED`.

## 5. Support 48/48 matrix

Generated:

```text
data/support_physical_visual_matrix_v6.csv
data/support_physical_visual_matrix_v6.json
data/support_physical_visual_summary_v6.json
```

Summary:

```text
Support rows      48
Unique payloads   48
Unique graphics   48
Unique layouts    46
```

Physical payload aliases:

```text
none
```

Graphics payload aliases:

```text
none
```

Layout/control aliases:

```text
Tien #85     <-> Yajirobe #86
Dende #88    <-> Guru #89
```

Status: `ROM_STATIC_VERIFIED`.

## 6. Track separation preserved

The V6 matrix intentionally keeps separate:

```text
$2C30 card visual descriptor
card AnimationResource
card FX token
card palette byte
BG $19 / $1A helpers
Presentation macros
```

Example: Kiai #42 and Paralysis #51 still have their own `$2C30` physical
visual descriptors while their card AnimationResources remain
`PRELOADED_SLOT6_NOT_ACTIONOBJECT_STARTED` per V5.

Status: `CONTRACT_PRESERVED`.

## 7. Not closed yet

Still pending before V6 can close:

- Render the 48 graphics/layout combinations into inspection PNGs.
- Finish exact palette path classification per Support family.
- Determine final visible BG/VRAM composition for `$0B/$0D/$0F`.
- Decode macros `$2B/$2C/$34/$35` literally.
- Run final global Teleport `$28` / Time Freeze `$2A` negative slot8 audit.
- Preserve `romCA53` numeric result plus contextual semantic outcome.


## 8. V6.3b — 48/48 ROM inspection renders

`scripts/render_v6_support_physicals.py` renders directly from ROM bytes:

```text
descriptor -> payload graphics (30 tiles 2bpp) -> grid 6x5 (48x40, scale 4)
           -> layout refs (2 chunks x (3 tile-source pointers + $7FFF terminator))
```

Output:

```text
renders/card_XXX_<name>.png           (48)
renders/card_XXX_<name>_layoutrefs.png (48)
contact_sheets/support_all_48.png
contact_sheets/support_layout_aliases.png
RENDER_VALIDATION.json
SUPPORT_LAYOUT_ALIASES.csv
```

Checks (RENDER_VALIDATION.json): `48/48 renderable`, `0 tile reads out of range`,
`0 payload overruns`, `0 invalid layout refs`, deterministic byte->PNG
(no timestamps, zlib level 9), SHA-256 per PNG (96 PNGs total).

Renders are `ROM_INSPECTION_RENDER`, NOT runtime assets. Color index 0 is
rendered OPAQUE (GBC behavior: color0 is a real color) — no invented
transparency. Visual inspection confirms coherent pixel art (icons, faces,
hearts, items, creature shapes), not noise.

Layout interpretation status: `PARTIAL_ROM_STATIC` — the 16 layout bytes are
copied to WRAM via $073B/$073F/$0763 (double-buffer toggle $C417); each chunk
holds 3 tile-source pointers + $7FFF. The exact WRAM/VRAM composition consumer
is not yet closed (open item).

Alias clarification: Tien #85 <-> Yajirobe #86 and Dende #88 <-> Guru #89 are
`SAME_LAYOUT` ONLY (payload and graphics hashes differ). They are NOT shared
physical visuals.

## 9. V6.3c — palette path per card

`SUPPORT_PALETTE_PATH_48.csv` records:

```text
Bank00:$36CA: E = palette index -> HL = Bank30:$6E00 + E*8 -> 8 bytes BGR555
              copied to WRAM palette buffer. NO $FF == NONE check: $FF -> $75F8.
CC15 writers (whole ROM, exhaustive): 01:$736E=$31 (CHARA), 01:$7B82=$33
              (Gather), 03:$5EAE=$31 (action-scene default).
Support common palette readers: 03:$6740 / 03:$67CC (CC15 -> $36CA).
Card record byte8 copied to WRAM $CC0D+8 via Bank00:$2AA7/$0FDA.
```

Status per card: `effectivePaletteIndex = CC15_PRESENTATION_STATE(default $31)`
and `cardByte8ToCc15Link = UNLINKED_CARD_BYTE8`. No per-card palette binding is
invented; the exact card.byte8 -> CC15 link for Support remains an open item.

## 10. V6.4 — macros $2B/$2C/$34/$35 literal (IMPORTED, not re-disassembled)

Reused the existing V5 corpus (`presentation_macros_v5.json`); verified each
macro byte-exact against canonical ROM with the count byte:

```text
macro format in ROM: [count][count * 5 bytes]; pointer table Bank30:$5D00
uses RELATIVE pointers: $3E92 -> HL = $5D00 + id*2 -> word -> HL = $5D00 + word.
$2B @30:60E9 count=4 match=True
$2C @30:60FE count=4 match=True
$34 @30:61F1 count=2 match=True
$35 @30:61FC count=4 match=True
```

Call-sites (LD BC,<id>; CALL $3E92, exhaustive scan, no regex false positives):

```text
$2B -> 03:6663 (worker $0D)                          [Support KnockDown family]
$2C -> 03:6578 (worker $0B)
$34 -> 03:5973 (BEAM), 03:5FAC (DAMAGE $0A), 03:65EA (worker $0B)
$35 -> 03:5983 (BEAM), 03:5FB7 (DAMAGE $0A), 03:662F (worker $0B)
$37 -> 03:60CA (DAMAGE defense result — common defense)
$38 -> 03:60BE (Shockwave #124)
```

`data/support_macros_v6.json` records raw bytes, decoded commands, call-sites
and VM-script references. `literalProgramStatus = COMPLETE_ROM_VERIFIED`;
`semanticStatus = UNRESOLVED` (human meaning only when binding is demonstrated).

## 11. V6.5 — global slot8 negative audit (verify:defense-slot8-global)

New verifier `npm run verify:defense-slot8-global` scans the whole ROM:

```text
PASS slot8 loader count == 1  — 01:76E8 (defense preload: LD C,$08; CALL $3702)
PASS slot8 start count == 2   — 03:59F9 (BEAM), 03:60AE (STANDARD_DAMAGE)
                                 (LD D,$08; LD E,$A0; CALL $3EBD)
PASS macros opcode $01 slot8 == 0
```

Conclusion: Teleport $28 and Time Freeze $2A are promoted to
`PRELOADED_NOT_STARTED_GLOBAL_STATIC` (global, not just known routes).

## 12. V6.6 — romCA53 contract (verify:rom-ca53-contract)

`src/battle/engine/rom/romDescriptors.ts` now exposes:

```ts
RomCA53 (0|1|2|3|4) + RomCA53SemanticOutcome + RomCA53Resolution
semanticOutcomeForCA53(romCA53, ctx) // ctx = {defenseCardId?, sourceEvent?}
```

Fixtures (all PASS):

```text
romCA53=2 + ATTACK_MISSED (sin defensa) -> NATURAL_MISS
romCA53=2 + Endurance #121              -> ENDURANCE_PARTIAL
romCA53=2 + sin contexto                -> UNKNOWN_CONTEXT  (nunca switch directo)
romCA53=3 + Barrier #45                 -> NULLIFICATION
romCA53=4 + Energy Absorb #76           -> ENERGY_ABSORB
romCA53=1 + Teleport #26                -> AVOID
romCA53=0 + Time Freeze #52             -> COMMAND_CANCELLED
romCA53=2 + ATTACK_HIT (sin defensa)    -> NATURAL_HIT
```

## 13. V6.7/V6.8 — canonical data + presentation profile

- `scripts/generate-rom-support-physical-visuals.ts` generates
  `src/data/generated/romSupportPhysicalVisuals.generated.ts` (48 cards,
  derived from the V6 matrix — never hand-written; no payload bytes embedded).
- `src/battle/romSupportPresentationProfile.ts` compiles the literal Support
  grammar into RomPresentationCue[] (SUPPORT_VISUAL_LOAD, BG_ASSEMBLY $19,
  PALETTE_TRANSITION, HOLD120, SUPPORT_MACRO, ROM_PENDING for $0F).
- `verify:rom-support-presentation-profile` (all PASS): 48/48 profiles,
  BG19+HOLD120 in $00/$02 (26 cards), macros {$2B,$2C,$34,$35}, $0F -> pending,
  0 AnimationResource auto-starts (Kiai #42 / Paralysis #51 guardrail),
  0 Beam FX cues inherited (V4 guardrail).

## 14. V6 status

```text
V6.1 $2C30 loader        CLOSED
V6.2 $1266 descriptor    CLOSED
V6.3 matrix 48/48        DATA COMPLETE (48 payloads, 48 graphics, 46 layouts)
V6.3b inspection renders CLOSED (48/48, deterministic)
V6.3c palette path       DATA COMPLETE (CC15 path; card.byte8 UNLINKED)
V6.4 macros 2B/2C/34/35  IMPORTED + ROM-verified + call-sites (semantic UNRESOLVED)
V6.5 slot8 global audit  CLOSED (1 loader / 2 starts / 0 macros)
V6.6 romCA53 contract    CLOSED (contextual; fixtures)
V6.7 RomSupportPhysicalVisual generated  CLOSED
V6.8 RomSupportPresentationProfile       CLOSED (static grammar; runtime cutover = V7)
V6 overall               P0 + P1 COMPLETE — pending: VRAM composition $0B/$0D/$0F,
                         macro human semantics, V7 runtime cutover
```


## 15. ERRATA V7.1 — base de punteros del layout (dato nuevo, no reabrir V6)

Los words del layout son offsets RELATIVOS a `$4000` del banco
(`addr = $4000 + (word & $3FFF)`), misma convención que `$1266`. La versión
V6.3b de este ledger restaba `$4000` para words < `$4000` y leía el banco
anterior. Renders `_layoutrefs` regenerados con la base corregida
(96 PNG) + RENDER_VALIDATION + SHA256SUMS actualizados. V6 sigue CLOSED;
esta corrección pertenece a V7.1 (docs/rom/research-v7-support-defense-consumption/LEDGER.md).
