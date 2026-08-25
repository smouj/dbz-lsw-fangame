# P0.3B — ROM Physical Runtime Corpus

Source ROM SHA256: `bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804`
Schema: `2`
Physical renderer schema: `3` (signed piece coordinates, piece-extents trim, color0 transparent)
Offset encoding: `s8` (raw bytes preserved separately)

Scope: 6 fighter-physical renderable AnimationResources from `docs/rom/generated/animation-resources.json`: `$00`, `$03`, `$04`, `$05`, `$08`, `$12`.
Renderer-pending decoded resources: `$01`, `$09`, `$0f`, `$16`, `$22`, `$3f`.
Forms rendered: 48/48. Palette-blocked profiles: 0.
Resource-blocked palette-ready profiles: 0.

Generated via fresh ROM re-render before runtime promotion. Legacy/canonical PNGs are not a source for this corpus.

Physical identities: 560
Frame instances: 2410
Signed-negative frame instances: 1327
Resource/profile blocked pairs: 0
Offset range: -10..5
Max dimensions: 40×48

Palette-blocked profiles are not rendered or faked:

Resource-blocked profiles are not rendered or faked:

| Form | Profile key | Physical IDs | Frame instances | ROM sequences | Signed-negative instances | Blocked pairs | Max dimensions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| gohan_young | 0x00 | 18 | 76 | 10 | 40 | — | 32×48 |
| gohan_young_ssj | 0x01 | 18 | 76 | 10 | 40 | — | 32×48 |
| gohan_young_ssj2 | 0x02 | 18 | 76 | 10 | 40 | — | 32×48 |
| piccolo_base | 0x03 | 8 | 28 | 4 | 16 | — | 32×48 |
| piccolo_kami | 0x03 | 8 | 28 | 4 | 16 | — | 32×48 |
| piccolo_evil | 0x03 | 8 | 28 | 4 | 16 | — | 32×48 |
| krillin_base | 0x04 | 23 | 106 | 13 | 67 | — | 40×48 |
| goku_base | 0x05 | 14 | 62 | 8 | 32 | — | 32×48 |
| goku_ssj | 0x06 | 14 | 62 | 8 | 32 | — | 32×48 |
| goku_ssj2 | 0x07 | 14 | 62 | 8 | 32 | — | 32×48 |
| goku_ssj3 | 0x08 | 14 | 62 | 8 | 32 | — | 32×48 |
| vegeta_base | 0x09 | 14 | 66 | 8 | 44 | — | 40×48 |
| vegeta_ssj | 0x0a | 14 | 66 | 8 | 44 | — | 40×48 |
| vegeta_majin | 0x0a | 14 | 66 | 8 | 44 | — | 40×48 |
| gohan_adult_ssj | 0x0c | 18 | 76 | 10 | 40 | — | 32×48 |
| gohan_adult_ssj2 | 0x0c | 18 | 76 | 10 | 40 | — | 32×48 |
| gohan_adult_ultimate | 0x0b | 18 | 76 | 10 | 40 | — | 32×48 |
| trunks_future | 0x0d | 8 | 28 | 4 | 16 | — | 32×48 |
| trunks_ssj | 0x0e | 8 | 28 | 4 | 16 | — | 32×48 |
| goten_base | 0x0f | 14 | 62 | 8 | 32 | — | 32×48 |
| goten_ssj | 0x10 | 14 | 62 | 8 | 32 | — | 32×48 |
| trunks_kid | 0x11 | 4 | 14 | 2 | 8 | — | 32×48 |
| trunks_kid_ssj | 0x12 | 4 | 14 | 2 | 8 | — | 32×48 |
| buu_base | 0x13 | 14 | 62 | 8 | 32 | — | 32×48 |
| buu_super | 0x14 | 14 | 62 | 8 | 32 | — | 32×48 |
| nappa | 0x15 | 4 | 14 | 2 | 8 | — | 32×48 |
| guldo | 0x16 | 4 | 14 | 2 | 8 | — | 32×48 |
| recoome | 0x17 | 4 | 14 | 2 | 8 | — | 32×48 |
| jeice | 0x18 | 4 | 14 | 2 | 8 | — | 32×48 |
| burter | 0x19 | 4 | 14 | 2 | 8 | — | 32×48 |
| ginyu | 0x1a | 14 | 62 | 8 | 32 | — | 32×48 |
| frieza_final | 0x1b | 9 | 50 | 6 | 36 | — | 32×48 |
| android_16 | 0x1c | 4 | 14 | 2 | 8 | — | 32×48 |
| android_17 | 0x1d | 4 | 14 | 2 | 8 | — | 32×48 |
| android_18 | 0x1e | 4 | 14 | 2 | 8 | — | 32×48 |
| android_19 | 0x1f | 4 | 14 | 2 | 8 | — | 32×48 |
| android_20 | 0x20 | 4 | 14 | 2 | 8 | — | 32×48 |
| cell_imperfect | 0x21 | 14 | 62 | 8 | 32 | — | 32×48 |
| cell_semi | 0x22 | 14 | 62 | 8 | 32 | — | 32×48 |
| cell_perfect | 0x23 | 14 | 62 | 8 | 32 | — | 32×48 |
| cell_jr | 0x24 | 14 | 62 | 8 | 32 | — | 32×48 |
| buu_gotenks | 0x25 | 14 | 62 | 8 | 32 | — | 32×48 |
| buu_gohan | 0x26 | 14 | 62 | 8 | 32 | — | 32×48 |
| buu_kid | 0x27 | 14 | 62 | 8 | 32 | — | 32×48 |
| ginyu_goku | 0x28 | 14 | 62 | 8 | 32 | — | 32×48 |
| gotenks_ssj | 0x29 | 14 | 62 | 8 | 32 | — | 32×48 |
| gotenks_ssj3 | 0x2a | 14 | 62 | 8 | 32 | — | 32×48 |
| vegito_ssj | 0x2b | 24 | 114 | 14 | 68 | — | 40×48 |

Generated assets live in `public/assets/sprites/<form>/physical/`.
`manifest.json` remains the legacy/remake runtime manifest until P0.3C; `rom-physical.manifest.json` is the physical ROM manifest generated here.
