# P0.3B — ROM Physical Runtime Corpus

Source ROM SHA256: `bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804`
Schema: `2`
Physical renderer schema: `3` (signed piece coordinates, piece-extents trim, color0 transparent)
Offset encoding: `s8` (raw bytes preserved separately)

Scope: 14 fighter-physical renderable AnimationResources from `docs/rom/generated/animation-resources.json`: `$00`, `$01`, `$03`, `$04`, `$05`, `$08`, `$09`, `$0b`, `$0f`, `$12`, `$16`, `$22`, `$2c`, `$3f`.
AnimationResource physical promotion: 14/66 renderable; 0 frame-stream-only; 18 handler-dependent; 5 dynamic-pending.
Renderer-pending decoded resources: none.
Forms rendered: 48/48. Palette-blocked profiles: 0.
Resource-blocked palette-ready profiles: 0.

Generated via fresh ROM re-render before runtime promotion. Legacy/canonical PNGs are not a source for this corpus.

Physical identities: 809
Frame instances: 5767
Signed-negative frame instances: 3778
Resource/profile blocked pairs: 0
Offset range: -20..6
Max dimensions: 40×48

Palette-blocked profiles are not rendered or faked:

Resource-blocked profiles are not rendered or faked:

| Form | Profile key | Physical IDs | Frame instances | ROM sequences | Signed-negative instances | Blocked pairs | Max dimensions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| gohan_young | 0x00 | 27 | 164 | 14 | 101 | — | 40×48 |
| gohan_young_ssj | 0x01 | 27 | 164 | 14 | 101 | — | 40×48 |
| gohan_young_ssj2 | 0x02 | 27 | 164 | 14 | 101 | — | 40×48 |
| piccolo_evil | 0x03 | 16 | 106 | 8 | 76 | — | 40×48 |
| piccolo_base | 0x03 | 16 | 106 | 8 | 76 | — | 40×48 |
| piccolo_kami | 0x03 | 16 | 106 | 8 | 76 | — | 40×48 |
| krillin_base | 0x04 | 26 | 168 | 15 | 113 | — | 40×48 |
| goku_base | 0x05 | 21 | 134 | 11 | 83 | — | 32×48 |
| goku_ssj | 0x06 | 21 | 134 | 11 | 83 | — | 32×48 |
| goku_ssj2 | 0x07 | 21 | 134 | 11 | 83 | — | 32×48 |
| goku_ssj3 | 0x08 | 21 | 134 | 11 | 83 | — | 32×48 |
| vegeta_base | 0x09 | 24 | 162 | 14 | 114 | — | 40×48 |
| vegeta_ssj | 0x0a | 24 | 162 | 14 | 114 | — | 40×48 |
| vegeta_majin | 0x0a | 24 | 162 | 14 | 114 | — | 40×48 |
| gohan_adult_ssj | 0x0c | 21 | 138 | 12 | 86 | — | 32×48 |
| gohan_adult_ssj2 | 0x0c | 21 | 138 | 12 | 86 | — | 32×48 |
| gohan_adult_ultimate | 0x0b | 20 | 134 | 12 | 86 | — | 32×48 |
| trunks_future | 0x0d | 11 | 90 | 6 | 62 | — | 32×48 |
| trunks_ssj | 0x0e | 11 | 90 | 6 | 62 | — | 32×48 |
| goten_base | 0x0f | 13 | 104 | 9 | 66 | — | 32×48 |
| goten_ssj | 0x10 | 15 | 112 | 10 | 70 | — | 32×48 |
| trunks_kid | 0x11 | 7 | 76 | 4 | 54 | — | 32×48 |
| trunks_kid_ssj | 0x12 | 7 | 76 | 4 | 54 | — | 32×48 |
| gotenks_ssj | 0x13 | 17 | 124 | 10 | 78 | — | 32×48 |
| gotenks_ssj3 | 0x14 | 17 | 124 | 10 | 78 | — | 32×48 |
| vegito_ssj | 0x15 | 30 | 194 | 18 | 122 | — | 40×48 |
| nappa | 0x16 | 7 | 76 | 4 | 54 | — | 32×48 |
| guldo | 0x17 | 7 | 76 | 4 | 54 | — | 32×48 |
| recoome | 0x18 | 7 | 76 | 4 | 54 | — | 32×48 |
| jeice | 0x19 | 7 | 76 | 4 | 54 | — | 32×48 |
| burter | 0x1a | 7 | 76 | 4 | 54 | — | 32×48 |
| ginyu | 0x1b | 17 | 124 | 10 | 78 | — | 32×48 |
| frieza_final | 0x1c | 15 | 124 | 10 | 86 | — | 40×48 |
| android_16 | 0x1d | 11 | 83 | 5 | 54 | — | 32×48 |
| android_17 | 0x1e | 7 | 76 | 4 | 54 | — | 32×48 |
| android_18 | 0x1f | 7 | 76 | 4 | 54 | — | 32×48 |
| android_19 | 0x20 | 7 | 76 | 4 | 54 | — | 32×48 |
| android_20 | 0x21 | 7 | 76 | 4 | 54 | — | 32×48 |
| cell_imperfect | 0x22 | 25 | 152 | 14 | 96 | — | 40×48 |
| cell_semi | 0x23 | 25 | 152 | 14 | 96 | — | 40×48 |
| cell_perfect | 0x24 | 25 | 152 | 14 | 96 | — | 40×48 |
| cell_jr | 0x25 | 25 | 152 | 14 | 96 | — | 40×48 |
| buu_base | 0x26 | 17 | 124 | 10 | 78 | — | 32×48 |
| buu_super | 0x27 | 17 | 124 | 10 | 78 | — | 32×48 |
| buu_gotenks | 0x28 | 17 | 124 | 10 | 78 | — | 32×48 |
| buu_gohan | 0x29 | 17 | 124 | 10 | 78 | — | 32×48 |
| buu_kid | 0x2a | 17 | 124 | 10 | 78 | — | 32×48 |
| ginyu_goku | 0x2b | 17 | 124 | 10 | 78 | — | 32×48 |

Generated assets live in `public/assets/sprites/<form>/physical/`.
`manifest.json` remains the legacy/remake runtime manifest until P0.3C; `rom-physical.manifest.json` is the physical ROM manifest generated here.
