# Agent handoff — ROM Research V4 FX

Integrate these findings on top of the user's current HEAD and V3 package. Do not reset/rebase onto any older research branch.

## Required imports

1. Append V4 findings to the existing append-only ROM research ledger.
2. Add `V4 SUPERSEDES` only to claims actually superseded, especially:
   - physical count: 31 non-FF FX IDs (32 field values including FF);
   - physical count: 9 non-FF palette IDs (10 field values including FF);
   - selector row[2]/row[3] are screen-scroll presentation parameters, not generic unknown coordinates;
   - Beam FX is a BG tilemap-window program, not a generic projectile animation.
3. Preserve V3 facts that V4 does not supersede.

## Compiler/runtime audit

### BEAM / offensive FX

Represent literal ROM FX cues with:

```text
resourceId
paletteId
side
opcode0COperand
sourceRows
BG_TILEMAP provenance
```

Known prefix operands:

- handlers $02/$03/$04/$05/$06/$0D/$0E and V-ball fallback: `$00` -> rows1-8;
- handler $07: `$02` -> rows3-10.

Known result operand:

- `$0A` -> rows11-18.

Do not invent an FPS animation inside FXResource. Opcode0C is an immediate tilemap copy; waits/screen motion live in the handler/Presentation VM.

### Physical rendering contract

Normal offensive bundle:

```text
base     = graphics
base + 1 = side1 tilemap 20x32
base + 2 = side2 tilemap 20x32
```

Graphics load to VRAM bank1 `$8800`; card palette loads to BG palette slot4.

Do not use review-PNG alpha as a ROM transparency contract. Color0 is physical BG color.

### Screen offsets

Promote selector row[2]/row[3] provenance through the compiler:

```text
row2 -> C2D0 -> opcode0D -> C405 -> SCY contribution
row3 -> C2D1 -> opcode0D -> C406 -> SCX contribution
```

Still do NOT create `ACTOR_HOME`, `TARGET_HOME` or `CONTACT_POINT` from these values.

### Existing STANDARD_DAMAGE audit remains required

Do not lose V3 corrections:

- slot6 card track + slot7 generic secondary track;
- CA53=2 is not universally `MISS` (Endurance also uses numeric result2).

## Verifiers to add/update

- all 28 used normal offensive FX bundles resolve three descriptors;
- side maps exactly 640 bytes;
- rows0/9/10/19 blank `$80`;
- every tile ID stays inside loaded tileCount;
- BG palette slot4 used for card FX;
- 13 opcode0C call sites remain accounted for;
- handler07 prefix operand remains2;
- result operand remains0A;
- no Support/Defense is silently routed through Beam opcode0C semantics;
- no card-name switch is introduced.

## Use these files

- `data/fx_resources_exact_v4.*`
- `data/fx_bundle_geometry_v4.*`
- `data/fx_opcode0c_call_sites_v4.*`
- `data/offensive_fx_execution_v4.*`
- `data/beam_actor_screen_offsets_v4.*`
- `data/fx_global_attribute_strips_v4.*`
- `generated_fx_assets/manifest.json`
- `proof/disassembly_fx_core_v4.txt`

