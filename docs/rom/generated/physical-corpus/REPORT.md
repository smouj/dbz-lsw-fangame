# P0.3B — ROM Physical Runtime Corpus

Source ROM SHA256: `bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804`
Schema: `2`
Physical renderer schema: `3` (signed piece coordinates, piece-extents trim, color0 transparent)
Offset encoding: `s8` (raw bytes preserved separately)

Scope: 16 fighter-physical renderable AnimationResources from `docs/rom/generated/animation-resources.json`: `$00`, `$01`, `$03`, `$04`, `$05`, `$08`, `$09`, `$0b`, `$0c`, `$0f`, `$12`, `$16`, `$22`, `$2c`, `$2d`, `$3f`.
AnimationResource physical promotion: 16/66 renderable; 45 frame-stream-only; 0 handler-dependent; 0 dynamic-pending.
Renderer-pending decoded resources: `$02`, `$06`, `$07`, `$0a`, `$0d`, `$0e`, `$10`, `$11`, `$13`, `$14`, `$15`, `$17`, `$18`, `$19`, `$1a`, `$1b`, `$1c`, `$1d`, `$1e`, `$1f`, `$20`, `$21`, `$23`, `$24`, `$25`, `$26`, `$27`, `$2b`, `$2e`, `$2f`, `$30`, `$31`, `$32`, `$33`, `$34`, `$35`, `$36`, `$37`, `$38`, `$39`, `$3a`, `$3b`, `$3c`, `$3d`, `$3e`, `$41`.
Forms rendered: 48/48. Palette-blocked profiles: 0.
Resource-blocked palette-ready profiles: 0.

Generated via fresh ROM re-render before runtime promotion. Legacy/canonical PNGs are not a source for this corpus.

Physical identities: 3689
Frame instances: 24823
Signed-negative frame instances: 20146
Resource/profile blocked pairs: 0
Offset range: -20..6
Max dimensions: 40×48

Palette-blocked profiles are not rendered or faked:

Resource-blocked profiles are not rendered or faked:

| Form | Profile key | Physical IDs | Frame instances | ROM sequences | Signed-negative instances | Blocked pairs | Max dimensions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| gohan_young | 0x00 | 35 | 241 | 18 | 169 | — | 40×48 |
| gohan_young_ssj | 0x01 | 35 | 241 | 18 | 169 | — | 40×48 |
| gohan_young_ssj2 | 0x02 | 35 | 241 | 18 | 169 | — | 40×48 |
| piccolo_evil | 0x03 | 24 | 183 | 12 | 144 | — | 40×48 |
| piccolo_base | 0x03 | 24 | 183 | 12 | 144 | — | 40×48 |
| piccolo_kami | 0x03 | 24 | 183 | 12 | 144 | — | 40×48 |
| krillin_base | 0x04 | 34 | 245 | 19 | 181 | — | 40×48 |
| goku_base | 0x05 | 29 | 211 | 15 | 151 | — | 40×48 |
| goku_ssj | 0x06 | 29 | 211 | 15 | 151 | — | 40×48 |
| goku_ssj2 | 0x07 | 29 | 211 | 15 | 151 | — | 40×48 |
| goku_ssj3 | 0x08 | 29 | 211 | 15 | 151 | — | 40×48 |
| vegeta_base | 0x09 | 32 | 239 | 18 | 182 | — | 40×48 |
| vegeta_ssj | 0x0a | 32 | 239 | 18 | 182 | — | 40×48 |
| vegeta_majin | 0x0a | 32 | 239 | 18 | 182 | — | 40×48 |
| gohan_adult_ssj | 0x0c | 29 | 215 | 16 | 154 | — | 40×48 |
| gohan_adult_ssj2 | 0x0c | 29 | 215 | 16 | 154 | — | 40×48 |
| gohan_adult_ultimate | 0x0b | 28 | 211 | 16 | 154 | — | 40×48 |
| trunks_future | 0x0d | 19 | 167 | 10 | 130 | — | 40×48 |
| trunks_ssj | 0x0e | 19 | 167 | 10 | 130 | — | 40×48 |
| goten_base | 0x0f | 21 | 181 | 13 | 134 | — | 40×48 |
| goten_ssj | 0x10 | 23 | 189 | 14 | 138 | — | 40×48 |
| trunks_kid | 0x11 | 15 | 153 | 8 | 122 | — | 40×48 |
| trunks_kid_ssj | 0x12 | 15 | 153 | 8 | 122 | — | 40×48 |
| gotenks_ssj | 0x13 | 25 | 201 | 14 | 146 | — | 40×48 |
| gotenks_ssj3 | 0x14 | 25 | 201 | 14 | 146 | — | 40×48 |
| vegito_ssj | 0x15 | 38 | 271 | 22 | 190 | — | 40×48 |
| nappa | 0x16 | 15 | 153 | 8 | 122 | — | 40×48 |
| guldo | 0x17 | 15 | 153 | 8 | 122 | — | 40×48 |
| recoome | 0x18 | 15 | 153 | 8 | 122 | — | 40×48 |
| jeice | 0x19 | 15 | 153 | 8 | 122 | — | 40×48 |
| burter | 0x1a | 15 | 153 | 8 | 122 | — | 40×48 |
| ginyu | 0x1b | 25 | 201 | 14 | 146 | — | 40×48 |
| frieza_final | 0x1c | 23 | 201 | 14 | 154 | — | 40×48 |
| android_16 | 0x1d | 19 | 160 | 9 | 122 | — | 40×48 |
| android_17 | 0x1e | 15 | 153 | 8 | 122 | — | 40×48 |
| android_18 | 0x1f | 15 | 153 | 8 | 122 | — | 40×48 |
| android_19 | 0x20 | 15 | 153 | 8 | 122 | — | 40×48 |
| android_20 | 0x21 | 15 | 153 | 8 | 122 | — | 40×48 |
| cell_imperfect | 0x22 | 33 | 229 | 18 | 164 | — | 40×48 |
| cell_semi | 0x23 | 33 | 229 | 18 | 164 | — | 40×48 |
| cell_perfect | 0x24 | 33 | 229 | 18 | 164 | — | 40×48 |
| cell_jr | 0x25 | 33 | 229 | 18 | 164 | — | 40×48 |
| buu_base | 0x26 | 25 | 201 | 14 | 146 | — | 40×48 |
| buu_super | 0x27 | 25 | 201 | 14 | 146 | — | 40×48 |
| buu_gotenks | 0x28 | 25 | 201 | 14 | 146 | — | 40×48 |
| buu_gohan | 0x29 | 25 | 201 | 14 | 146 | — | 40×48 |
| buu_kid | 0x2a | 25 | 201 | 14 | 146 | — | 40×48 |
| ginyu_goku | 0x2b | 25 | 201 | 14 | 146 | — | 40×48 |

Generated assets live in `public/assets/sprites/<form>/physical/`.
`manifest.json` remains the legacy/remake runtime manifest until P0.3C; `rom-physical.manifest.json` is the physical ROM manifest generated here.
