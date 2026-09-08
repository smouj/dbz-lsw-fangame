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

## Guardrails

`verify:dev-rom-truth` now rejects the former Goku-prefix rewrite, manual pose
filename construction and legacy `spriteFrameUrl()` use in a ROM preview. It
also requires Card, HUD and Character previews to use the physical corpus and
to expose pending evidence rather than fabricate a frame.

Validation at this checkpoint:

- `verify:dev-routes` — 22/22 modules;
- `verify:dev-studio` — 58 checks;
- `verify:dev-rom-truth` — 27 checks;
- `verify:dev-physical-sync` — 48 forms, 3,641 physical IDs, 24,775 instances;
- action-preview runtime parity and frame-form identity gates.
