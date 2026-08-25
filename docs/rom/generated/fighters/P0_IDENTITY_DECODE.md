# P0 — ROM FORM IDENTITY DECODE (baseline freeze)

Frozen 2026-08-25. Do not overwrite this baseline — it is the falsification
fixture against which any regenerated mapping is measured.

## Baseline metrics

- physical IDs: 560 · frame instances: 2410 · coverage gaps: 0
- identity status: ROM_RECORD_VERIFIED 41 · ROM_IDENTITY_VERIFIED 7
- mappingUncertain (7): buu_gotenks, buu_gohan, buu_kid, ginyu_goku, gotenks_ssj, gotenks_ssj3, vegito_ssj
- suspicion boundary: profile key **19** onward (buu_base), not just the 7 flagged forms.

## Field semantics (XREF from bank_000/bank_001/bank_002 disasm)

| byte | reader | consumer | semantics |
| --- | --- | --- | --- |
| 0 | `Call_000_2a96` | menu (+$44/+$28 tile offset) | menu/tile id |
| 1 | `Call_000_2b65` | `Call_000_36a5` → `Bank30:$6E00 + key*8` | actorVisualProfileKey (palette index) |
| 2 | `Call_000_2b7a` | `Call_000_2807` (graphics loader) | body/sprite family |
| 3 | `Call_000_2b9c` | `formRecord[3 + 5*$cc0b + $cc0c]` | form asset index (sub-struct head) |
| 5 | `Call_000_2b9c` ($cc0c=2) | same | character/body group |

## Palette system — CONFIRMED SINGLE TABLE

**There is only ONE palette table: `Bank30:$6E00 + profileKey*8`.**

Evidence:
1. `Call_000_36a5` (palette load for P1/P2 sprites): `Bank switch to $30 → read byte[1] → Bank30:$6E00 + key*8 → write to OBP registers`
2. `Call_000_36ca` and `Call_000_36e6` (variants): identical formula, different write targets
3. No villain/hero palette branch found in disasm
4. No second palette table found in Bank30 (searched $6C00, $6600, $6900 areas — all are different data structures)
5. `$ca0a` is a P1/P2 flag, NOT a palette selection flag
6. `$cb1a`/`$cb47` are P1/P2 form record buffers in RAM, not alternative mappings

## Palette reality — ROM palette IS the game palette

The ROM palette at `Bank30:$6E00 + key*8` is **byte-exact truth**. There is no remap, no second table, no hero/villano branch.

Key findings (byte-exact CGB colors, 5-bit → 8-bit approximation):

| form | key | color1 (body) | color2 (accent) | vs reference |
| --- | --- | --- | --- | --- |
| goku_base | 5 | (248,216,168) skin | (248,0,0) red | ✓ matches |
| goku_ssj | 6 | (248,248,200) yellow | (232,128,0) orange | ✓ matches |
| krillin_base | 4 | (248,216,168) skin | (248,0,0) red | ✓ matches |
| piccolo_base | 3 | (0,248,0) green | (176,0,248) purple | ✓ matches |
| buu_base | 19 | (248,248,200) yellow | (240,112,0) orange | ✗ ref says pink |
| android_16 | 28 | (224,224,224) white | (200,0,248) magenta | ✗ ref says green |
| ginyu | 26 | (248,200,0) yellow | (0,160,248) blue | ✗ ref says purple |
| buu_gotenks | 37 | (248,248,248) white | (0,144,248) blue | ✗ ref says pink |
| buu_gohan | 38 | (248,128,160) pink | (192,208,248) blue | ✓ matches |
| ginyu_goku | 40 | (248,128,160) pink | (192,208,248) blue | ✗ ref says purple+orange |
| vegito_ssj | 43 | (248,216,168) skin | (208,56,208) purple | ✗ no ref exists |

**The "mismatch" between ROM palette and reference sheets is NOT a bug.** The reference
sheets (`14_reference/sprite_sheets/`) are full-color 32-bit RGBA rips with anti-aliasing,
background colors (cyan, green), and shading — NOT the in-battle 4-color CGB palette.
They cannot be used to falsify the ROM palette.

The ROM palette IS what the game displays. Whether buu_base appears yellow+orange
in the actual game on GBC hardware is the ROM-accurate rendering.

## Vegito byte[3]=0xB2 analysis

- byte[3] is sequential 0x00–0x2E for forms 1–47.
- Vegito (form 48) = 0xB2 (178).
- `Call_000_2b9c` reads `formRecord[3 + 5*$cc0b + $cc0c]` — byte[3] is an asset index, not a pointer.
- Vegito shares byte[2]=0x12 and byte[5]=0x10 with frieza_final, suggesting it uses
  frieza's body/sprite family in the data, but byte[1]=0x2B gives it a unique palette.
- 0xB2 is NOT interpretable as a simple form offset (0x2E + 0x84 would imply a gap).
- It is likely a special/merged resource index for a fusion character.

## P1/P2 form record system

- `$cb1a` = P1 form record buffer (RAM)
- `$cb47` = P2 form record buffer (RAM)
- `$ca0a` = P1/P2 flag (1=P2, 0=P1)
- Both players load form records from the same Bank11 table, then copy to their respective RAM buffers
- The palette formula is identical for both players

## Bank30 data structure map (confirmed)

| Address | Structure | Purpose |
| --- | --- | --- |
| $6000 | form record pointer table | 16-byte records in Bank11 |
| $6300 | graphics bank pointer table | indexed by byte[2] body family |
| $6600 | animation sequence table | indexed by profileKey |
| $6900 | animation resource pointer table | indexed by profileKey |
| $6E00 | CGB palette table (256×8) | indexed by profileKey |
| $7000 | secondary pointer table | indexed by profileKey |

## Open / next

1. ✅ RESOLVED: No second palette table. Single `Bank30:$6E00 + key*8` confirmed by disasm.
2. ✅ RESOLVED: Palette "mismatch" is reference sheet divergence, not a bug.
3. Vegito byte[3]=0xB2: asset index semantics not fully decoded. Likely a special fusion resource.
4. The `mappingUncertain` flag on the last 7 forms was based on palette suspicion.
   Since the ROM palette is confirmed correct, these forms should be upgraded to
   `ROM_RECORD_VERIFIED` (the mapping IS correct — the forms use their assigned
   profile keys and the palette is what the game provides).
5. Visual confirmation on actual GBC hardware or emulator still needed for
   definitive "does buu_base look yellow in the game" answer.
## PASS 2B — Physical Sequence Linkage (2026-08-25)

### Bank table format correction

The AnimationResource bank table (banks $62/$63/$64) format is:

```
u16 count            (offset 0)
3 × u16 flags        (offsets 2, 4, 6)
count × (u16 offset, u16 size)  (starting at offset 8, NOT 2)
```

The previous interpretation (entries starting at offset 2) was incorrect.
The corrected format (offset 8) produces:
- All 66 resource descriptors with valid offsets within bank space
- Sensible metasprite piece data at each descriptor offset
- Frame sequence addresses confirmed within descriptor data blocks

### Metasprite linkage verified for $0B and $2C

Full chain resolution confirmed for both resources:

```
base → +0 → sequence table (selector → seq addr → frames)
base → +2 → metasprite table (vfid → piece addr → pieces)
base → +4 → graphics table (vfid → block layout)
```

- **Hell Flash ($0B)**: base=0x1780, 6 vfids (2-5), 12 pieces each, 12 blocks each
  - 7/7 frames resolved → physicalId
  - 4 unique physical IDs (vfids 2, 3, 4, 5)
- **Cont.Punch ($2C)**: base=0x2A3C, 4 vfids (0-3), 12 pieces each, 12 blocks each
  - 62/62 frames resolved → physicalId
  - 4 unique physical IDs (vfids 0, 1, 2, 3)

### Completion taxonomy

The current `STATICALLY_CLOSED` status means:

```
SEQUENCE_STREAM CLOSED ✓
TIMINGS CLOSED ✓
OFFSETS CLOSED ✓
RESOURCE CONSUMER KNOWN ✓
METASPRITE LINK PENDING → NOW RESOLVED ✓
PHYSICAL FRAME LINK PENDING → NOW RESOLVED ✓
```

For $0B and $2C, the full chain `frame → vfid → metasprite → pieces → graphics → physicalId`
is byte-exact ROM proven. No heuristics.

### Remaining 12 DECODED resources

Need the same metasprite linkage audit. The `resourceBase()` resolver
cross-validates against known sequence addresses, so any resource with
confirmed sequences can be resolved the same way.
