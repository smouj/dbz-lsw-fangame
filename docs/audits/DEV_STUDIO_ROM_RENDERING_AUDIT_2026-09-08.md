# Dev Studio ROM rendering audit — 2026-09-08

## Contract

Any Dev Studio surface that presents a fighter frame or an action sequence must
obtain it from a canonical source:

- `resolveCharacterVisualSequence()` followed by a `rom-p...` physical-id
  lookup for form + semantic-role previews;
- `runtimeActionPreview()` for the player DAMAGE/BEAM production trace;
- `battleOverworldActorUrl()` for tactical overworld actors;
- the ROM physical corpus for raw, trimmed and display-frame inspection.

No preview may derive a filename by replacing another fighter's form prefix,
or pass a logical/remake manifest filename to `spriteFrameUrl()`. The Dev
physical URL bridge resolves a promoted `rom-p...` identity to the matching
`physical/` corpus file. Missing evidence is rendered as an explicit
pending/empty state.

### Neutral base pose

The large Character Studio `idle` preview has one additional, explicitly
bounded source: Bank `$61`, resource `0`, selector `0`, physical frame `0`.
The ROM decode proves a single full-body frame of 3 ticks with `dx=0, dy=0`,
and it is now physically rendered per form through that form's verified
graphics bank and palette. The UI labels it `ROM_STATIC_HIGH_CONFIDENCE`:
it is not promoted to `ROM_DYNAMIC_VERIFIED_IDLE` until a live ActionObject
trace records the quiet state. No `idle_00.png` legacy fallback is used.

## Applied surfaces

| Surface | Frame source |
| --- | --- |
| Character Studio | physical-ROM resolver and promoted corpus |
| Cards action preview | selected card's compiled production timeline (`ROM_PHYSICAL_FRAME`) |
| HUD action preview | production trace for player DAMAGE/BEAM; physical-ROM resolver otherwise |
| Canon Battle Field / Combat Lab | physical-ROM action resolver and canonical overworld mapping |
| Position Lab | canonical overworld form map |
| Animation Studio / ROM Display | physical corpus and provenance records |

Portraits, card icons, backgrounds, UI glyphs, raw canvases and research
captures are separate domains. They remain available only in their correctly
labelled UI, asset or research context; none is a substitute for a fighter
combat frame.

### Animation route consolidation

`#dev/animation` and `#dev/animation-studio` now open the same physical-ROM
inspector. It accepts only `physical/rom-p...` assets; legacy and remake
manifest data cannot be selected or rendered as thumbnails. ROM Display's
Fighters tab follows the same contract and enumerates forms from the generated
ROM identity table, so there is no alternate manifest pose mode to confuse the
preview with a runtime frame.

The Cards preview follows the same rule. Its timeline ignores every cue except
`ROM_PHYSICAL_FRAME` with a promoted `physical/` file. The focused Vegito SSJ
gate exercises all 64 compatible cards (424 physical cues) so a semantic or
external PNG cannot silently re-enter the preview.

## Guardrails

`verify:dev-rom-truth` now rejects the former Goku-prefix rewrite, manual pose
filename construction and legacy `spriteFrameUrl()` use in a ROM preview. It
also requires Card, HUD and Character previews to use the physical corpus and
to expose pending evidence rather than fabricate a frame.

Validation at this checkpoint:

- `verify:dev-routes` — 22/22 modules;
- `verify:dev-studio` — 58 checks;
- `verify:dev-rom-truth` — 27 checks;
- `verify:dev-physical-sync` — 48 forms, 4,407 physical IDs, 28,669 instances;
- `verify:rom-fighter-neutral` — 100 checks across all 48 forms;
- action-preview runtime parity and frame-form identity gates.

The physical-corpus verifier remains the source-of-truth gate for local asset
promotion: if a declared physical file is absent, the Dev surface must show an
explicit unavailable state and the build is not considered synchronized.
