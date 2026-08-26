# P0.3B — ROM Physical Runtime Corpus

Source ROM SHA256: `bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804`
Schema: `2`
Physical renderer schema: `3` (signed piece coordinates, piece-extents trim, color0 transparent)
Offset encoding: `s8` (raw bytes preserved separately)

Scope: 6 fighter-physical renderable AnimationResources from `docs/rom/generated/animation-resources.json`: `$00`, `$03`, `$04`, `$05`, `$08`, `$12`.
AnimationResource physical promotion: 6/66 renderable; 8 frame-stream-only; 18 handler-dependent; 5 dynamic-pending.
Renderer-pending decoded resources: `$01`, `$09`, `$0b`, `$0f`, `$16`, `$22`, `$2c`, `$3f`.
Forms rendered: 48/48. Palette-blocked profiles: 0.
Resource-blocked palette-ready profiles: 0.

Generated via fresh ROM re-render before runtime promotion. Legacy/canonical PNGs are not a source for this corpus.

Physical identities: 505
Frame instances: 2374
Signed-negative frame instances: 1307
Resource/profile blocked pairs: 0
Offset range: -10..5
Max dimensions: 40×48

Palette-blocked profiles are not rendered or faked:

Resource-blocked profiles are not rendered or faked:

| Form | Profile key | Physical IDs | Frame instances | ROM sequences | Signed-negative instances | Blocked pairs | Max dimensions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| gohan_young | 0x00 | 17 | 76 | 10 | 40 | — | 32×48 |
| gohan_young_ssj | 0x01 | 17 | 76 | 10 | 40 | — | 32×48 |
| gohan_young_ssj2 | 0x02 | 17 | 76 | 10 | 40 | — | 32×48 |
| piccolo_evil | 0x03 | 7 | 28 | 4 | 16 | — | 32×48 |
| piccolo_base | 0x03 | 7 | 28 | 4 | 16 | — | 32×48 |
| piccolo_kami | 0x03 | 7 | 28 | 4 | 16 | — | 32×48 |
| krillin_base | 0x04 | 22 | 106 | 13 | 67 | — | 40×48 |
| goku_base | 0x05 | 13 | 62 | 8 | 32 | — | 32×48 |
| goku_ssj | 0x06 | 13 | 62 | 8 | 32 | — | 32×48 |
| goku_ssj2 | 0x07 | 13 | 62 | 8 | 32 | — | 32×48 |
| goku_ssj3 | 0x08 | 13 | 62 | 8 | 32 | — | 32×48 |
| vegeta_base | 0x09 | 13 | 66 | 8 | 44 | — | 40×48 |
| vegeta_ssj | 0x0a | 13 | 66 | 8 | 44 | — | 40×48 |
| vegeta_majin | 0x0a | 13 | 66 | 8 | 44 | — | 40×48 |
| gohan_adult_ssj | 0x0c | 17 | 76 | 10 | 40 | — | 32×48 |
| gohan_adult_ssj2 | 0x0c | 17 | 76 | 10 | 40 | — | 32×48 |
| gohan_adult_ultimate | 0x0b | 16 | 72 | 10 | 40 | — | 32×48 |
| trunks_future | 0x0d | 7 | 28 | 4 | 16 | — | 32×48 |
| trunks_ssj | 0x0e | 7 | 28 | 4 | 16 | — | 32×48 |
| goten_base | 0x0f | 9 | 42 | 7 | 20 | — | 32×48 |
| goten_ssj | 0x10 | 11 | 50 | 8 | 24 | — | 32×48 |
| trunks_kid | 0x11 | 3 | 14 | 2 | 8 | — | 32×48 |
| trunks_kid_ssj | 0x12 | 3 | 14 | 2 | 8 | — | 32×48 |
| gotenks_ssj | 0x13 | 13 | 62 | 8 | 32 | — | 32×48 |
| gotenks_ssj3 | 0x14 | 13 | 62 | 8 | 32 | — | 32×48 |
| vegito_ssj | 0x15 | 23 | 114 | 14 | 68 | — | 40×48 |
| nappa | 0x16 | 3 | 14 | 2 | 8 | — | 32×48 |
| guldo | 0x17 | 3 | 14 | 2 | 8 | — | 32×48 |
| recoome | 0x18 | 3 | 14 | 2 | 8 | — | 32×48 |
| jeice | 0x19 | 3 | 14 | 2 | 8 | — | 32×48 |
| burter | 0x1a | 3 | 14 | 2 | 8 | — | 32×48 |
| ginyu | 0x1b | 13 | 62 | 8 | 32 | — | 32×48 |
| frieza_final | 0x1c | 8 | 50 | 6 | 36 | — | 32×48 |
| android_16 | 0x1d | 3 | 14 | 2 | 8 | — | 32×48 |
| android_17 | 0x1e | 3 | 14 | 2 | 8 | — | 32×48 |
| android_18 | 0x1f | 3 | 14 | 2 | 8 | — | 32×48 |
| android_19 | 0x20 | 3 | 14 | 2 | 8 | — | 32×48 |
| android_20 | 0x21 | 3 | 14 | 2 | 8 | — | 32×48 |
| cell_imperfect | 0x22 | 13 | 62 | 8 | 32 | — | 32×48 |
| cell_semi | 0x23 | 13 | 62 | 8 | 32 | — | 32×48 |
| cell_perfect | 0x24 | 13 | 62 | 8 | 32 | — | 32×48 |
| cell_jr | 0x25 | 13 | 62 | 8 | 32 | — | 32×48 |
| buu_base | 0x26 | 13 | 62 | 8 | 32 | — | 32×48 |
| buu_super | 0x27 | 13 | 62 | 8 | 32 | — | 32×48 |
| buu_gotenks | 0x28 | 13 | 62 | 8 | 32 | — | 32×48 |
| buu_gohan | 0x29 | 13 | 62 | 8 | 32 | — | 32×48 |
| buu_kid | 0x2a | 13 | 62 | 8 | 32 | — | 32×48 |
| ginyu_goku | 0x2b | 13 | 62 | 8 | 32 | — | 32×48 |

Generated assets live in `public/assets/sprites/<form>/physical/`.
`manifest.json` remains the legacy/remake runtime manifest until P0.3C; `rom-physical.manifest.json` is the physical ROM manifest generated here.
