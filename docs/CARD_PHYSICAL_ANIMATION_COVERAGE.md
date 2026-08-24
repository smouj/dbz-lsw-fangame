# DBZ LSW — Card Physical Animation Coverage

> **V3 SUPERSEDES (2026-08-23)**: ver
> `docs/rom/research-v3/LEDGER.md`. Esta matriz queda por regenerar con el
> pipeline fisico V3 `metasprite -> graphics blocks -> tiles 2bpp -> CGB
> palette`, la prueba 411/411, slot8 Defense y reachability actualizada de
> STANDARD_DAMAGE, Tail y V-ball. No interpretar `RESOURCE_SPECIAL` como
> `unused`.

Estado: `CARD PHYSICAL ANIMATION COVERAGE ACTIVE` · `TRACE DYNAMIC PARKED`.

Esta matriz baja la reconciliacion fisica a nivel carta. Cada fila deriva de `CARD -> ROM card record -> AnimationResource -> physical reconciliation`.

## Contract

- No usa V9 ni comparacion visual.
- Una carta con `RESOURCE_DECODED_COMPLETE` no implica coordenadas runtime ni anchors cerrados.
- `RESOURCE_DECODED_PARTIAL` conserva mappings conocidos y deja el resto como `UNRESOLVED`.
- `RESOURCE_PARTIAL`, `RESOURCE_SPECIAL` y `RESOURCE_UNKNOWN` son pendientes estaticos explicitos por recurso.
- `NO_ROM_ANIMATION` es valido para cartas sin actor animation ROM.

## Summary

- Cards: 125/125
- With AnimationResource: 70
- Cards using DECODED resources: 16
- Complete physical coverage: 5
- Partial physical coverage: 10
- Decoded but unresolved physical coverage: 1
- Pending static resource decode: 54
- No ROM actor animation: 55
- Missing resources: 0
- ROM frames counted through card usage: 412
- Mapped frames through card usage: 292
- Unresolved frames through card usage: 120

## By Card Type

| Type | Cards | AnimResource | Decoded | Complete | Partial | Unresolved Decoded | Pending Static | No ROM Animation |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| command | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| damage | 24 | 24 | 1 | 0 | 0 | 1 | 23 | 0 |
| beam | 38 | 38 | 15 | 5 | 10 | 0 | 23 | 0 |
| support | 47 | 2 | 0 | 0 | 0 | 0 | 2 | 45 |
| defense | 11 | 6 | 0 | 0 | 0 | 0 | 6 | 5 |
| special | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |

## Matrix 125/125

| ID | Card | Type | Effect | AnimationResource | Resource Status | Physical Status | Gap Cause | ROM Frames | EXACT | SHARED | COMPOSITE | UNRESOLVED |
|---:|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|
| 1 | 3 stage atk. | command | command_3 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 2 | 4 stage atk. | command | command_4 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 3 | 5 stage atk. | command | command_5 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 4 | 6 stage atk. | command | command_6 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 5 | Cont.Punch | damage | damage | 0x2c | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 6 | Cont.Kick | damage | damage | 0x2d | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 7 | Energy Wave | beam | beam | 0x00 | DECODED | RESOURCE_DECODED_PARTIAL | METASPRITE_MAPPING_PENDING | 14 | 0 | 10 | 0 | 4 |
| 8 | Energy Bomb | beam | beam | 0x0c | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 9 | Special Card | special | special_card | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 10 | Masenko | beam | beam | 0x04 | DECODED | RESOURCE_DECODED_PARTIAL | METASPRITE_MAPPING_PENDING | 14 | 0 | 10 | 0 | 4 |
| 11 | Dunk Shot | damage | damage | 0x2e | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 12 | Kamehameha | beam | beam | 0x03 | DECODED | RESOURCE_DECODED_PARTIAL | METASPRITE_MAPPING_PENDING | 48 | 0 | 30 | 0 | 18 |
| 13 | S.Kamehameha | beam | beam | 0x03 | DECODED | RESOURCE_DECODED_PARTIAL | METASPRITE_MAPPING_PENDING | 48 | 0 | 30 | 0 | 18 |
| 14 | F.Kamehameha | beam | beam_team | 0x03 | DECODED | RESOURCE_DECODED_PARTIAL | METASPRITE_MAPPING_PENDING | 48 | 0 | 30 | 0 | 18 |
| 15 | Sonic Kick | damage | damage | 0x3d | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 16 | Resurrection | support | heal_25pct | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 17 | S.Beam Can. | beam | beam | 0x16 | DECODED | RESOURCE_DECODED_PARTIAL | METASPRITE_MAPPING_PENDING | 16 | 0 | 14 | 0 | 2 |
| 18 | F.Lightbomb | beam | beam | 0x11 | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 19 | Taiyoken | defense | avoid_damage_taiyoken | 0x26 | PARTIAL | RESOURCE_PARTIAL | HANDLER_DEPENDENT | 0 | 0 | 0 | 0 | 0 |
| 20 | Misty KiWave | beam | beam | 0x08 | DECODED | RESOURCE_DECODED_COMPLETE | NONE | 8 | 2 | 6 | 0 | 0 |
| 21 | Destruct-Disk | beam | beam | 0x12 | DECODED | RESOURCE_DECODED_PARTIAL | METASPRITE_MAPPING_PENDING | 36 | 0 | 32 | 0 | 4 |
| 22 | S.Destruc-D. | beam | beam | 0x12 | DECODED | RESOURCE_DECODED_PARTIAL | METASPRITE_MAPPING_PENDING | 36 | 0 | 32 | 0 | 4 |
| 23 | Kaio Ken | support | buff_kaio | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 24 | Spirit Bomb | beam | beam | 0x22 | DECODED | RESOURCE_DECODED_COMPLETE | NONE | 10 | 0 | 10 | 0 | 0 |
| 25 | Solid Shot | damage | damage | 0x2f | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 26 | Teleport. | defense | avoid_beam | 0x28 | PARTIAL | RESOURCE_PARTIAL | HANDLER_DEPENDENT | 0 | 0 | 0 | 0 | 0 |
| 27 | Sup.Saiyan-2 | support | buff_ki8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 28 | Sup.Saiyan-3 | support | buff_str8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 29 | Tail | damage | damage_pierce | 0x3f | DECODED | RESOURCE_DECODED_UNRESOLVED | METASPRITE_MAPPING_PENDING | 26 | 0 | 0 | 0 | 26 |
| 30 | Galick-Ho | beam | beam | 0x05 | DECODED | RESOURCE_DECODED_COMPLETE | NONE | 16 | 0 | 16 | 0 | 0 |
| 31 | Big Bang Atk | beam | beam | 0x0f | DECODED | RESOURCE_DECODED_COMPLETE | NONE | 16 | 0 | 16 | 0 | 0 |
| 32 | Final Flash | beam | beam | 0x09 | DECODED | RESOURCE_DECODED_COMPLETE | NONE | 16 | 0 | 16 | 0 | 0 |
| 33 | Suicide | beam | beam_suicide | 0x2b | SPECIAL | RESOURCE_SPECIAL | HANDLER_DEPENDENT | 0 | 0 | 0 | 0 | 0 |
| 34 | Rising Kick | damage | damage | 0x30 | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 35 | Burning Atk. | beam | beam | 0x07 | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 36 | Fin.Buster | beam | beam | 0x10 | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 37 | Flash Punch | damage | damage | 0x31 | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 38 | Kamekameha | beam | beam | 0x03 | DECODED | RESOURCE_DECODED_PARTIAL | METASPRITE_MAPPING_PENDING | 48 | 0 | 30 | 0 | 18 |
| 39 | Galactica D. | beam | beam | 0x18 | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 40 | S.G.K.Atk. | beam | beam | 0x23 | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 41 | V-ball Crash | damage | damage_special_team | 0x41 | SPECIAL | RESOURCE_SPECIAL | HANDLER_DEPENDENT | 0 | 0 | 0 | 0 | 0 |
| 42 | Kiai | support | debuff_guard8 | 0x40 | SPECIAL | RESOURCE_SPECIAL | HANDLER_DEPENDENT | 0 | 0 | 0 | 0 | 0 |
| 43 | Atomic Break | damage | damage | 0x32 | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 44 | Flash.Sword | beam | beam | 0x19 | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 45 | Barrier | defense | avoid_beam | 0x24 | PARTIAL | RESOURCE_PARTIAL | HANDLER_DEPENDENT | 0 | 0 | 0 | 0 | 0 |
| 46 | N.Slasher | damage | damage | 0x33 | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 47 | KiBlast Bomb | beam | beam | 0x0e | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 48 | Lightning C. | beam | beam | 0x06 | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 49 | Telekinesis | beam | beam | 0x1a | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 50 | M.Soundwave | beam | beam | 0x17 | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 51 | Paralysis | support | debuff_speed8 | 0x29 | SPECIAL | RESOURCE_SPECIAL | HANDLER_DEPENDENT | 0 | 0 | 0 | 0 | 0 |
| 52 | Time Freeze | defense | command_cancel | 0x2a | PARTIAL | RESOURCE_PARTIAL | HANDLER_DEPENDENT | 0 | 0 | 0 | 0 | 0 |
| 53 | Breath | defense | avoid_beam | 0x27 | PARTIAL | RESOURCE_PARTIAL | HANDLER_DEPENDENT | 0 | 0 | 0 | 0 | 0 |
| 54 | Eraser Can. | beam | beam | 0x0a | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 55 | R.F.B.Atk. | damage | damage_low_acc | 0x34 | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 56 | Crasher Ball | beam | beam | 0x1b | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 57 | Purple Comet | beam | beam_team | 0x1c | SPECIAL | RESOURCE_SPECIAL | HANDLER_DEPENDENT | 0 | 0 | 0 | 0 | 0 |
| 58 | P.Comet Z | damage | damage_special_team | 0x1c | SPECIAL | RESOURCE_SPECIAL | HANDLER_DEPENDENT | 0 | 0 | 0 | 0 | 0 |
| 59 | Speed Up | support | buff_speed8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 60 | Mach Attack | damage | damage | 0x35 | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 61 | Dynami.Punch | damage | damage | 0x36 | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 62 | Body Change | beam | beam_varhp | 0x20 | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 63 | Finger Beam | beam | beam | 0x01 | DECODED | RESOURCE_DECODED_PARTIAL | METASPRITE_MAPPING_PENDING | 12 | 0 | 8 | 0 | 4 |
| 64 | Super E-Ball | beam | beam | 0x21 | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 65 | Grand Wave | beam | beam | 0x14 | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 66 | S.Dash Elbow | damage | damage | 0x37 | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 67 | Eye Beam | beam | beam | 0x02 | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 68 | Lock On | support | lock_on | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 69 | Rocket Punch | damage | damage_special_lowacc | 0x1d | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 70 | Hell Flash | beam | beam | 0x0b | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 71 | Crazy Rush | damage | damage | 0x38 | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 72 | Energy Slash | beam | beam | 0x15 | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 73 | Energy Slice | beam | beam | 0x13 | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 74 | Attack No. 18 | damage | damage | 0x39 | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 75 | Life Absorb | damage | life_drain | 0x3e | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 76 | Energy Absorb | defense | absorb_beam | 0x25 | PARTIAL | RESOURCE_PARTIAL | HANDLER_DEPENDENT | 0 | 0 | 0 | 0 | 0 |
| 77 | Cell Combo | damage | damage | 0x3a | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 78 | Step Up Atk. | damage | damage | 0x3b | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 79 | Flesh Guard | support | buff_guard8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 80 | Potbelly Atk | damage | damage_special | 0x1f | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 81 | Crasher Buu | damage | damage | 0x3c | PARTIAL | RESOURCE_PARTIAL | FRAME_TABLE_PARTIAL | 0 | 0 | 0 | 0 | 0 |
| 82 | Sweet Beam | beam | beam | 0x1e | PARTIAL | RESOURCE_PARTIAL | SEQUENCE_BOUNDARY_PENDING | 0 | 0 | 0 | 0 | 0 |
| 83 | Bulma | support | debuff_str8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 84 | Chaiotzu | support | debuff_speed8_lowacc | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 85 | Tien | support | knockdown_dmg | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 86 | Yajirobe | support | knockdown_dmg | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 87 | Kaio | support | debuff_ki8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 88 | Dende | support | heal_strong | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 89 | Guru | support | buff_str_ki8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 90 | Hercule | support | knockdown_min | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 91 | Supreme Kai | support | debuff_speed8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 92 | Kibito | support | beam_shield | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 93 | Babidi | support | powerup_dispel | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 94 | Dabura | support | ohko_lowacc | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 95 | Yakon | support | powerup_dispel | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 96 | Scouter | support | debuff_guard8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 97 | Caps. Fridge | support | cc_recovery | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 98 | Stop Device | support | android_kill | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 99 | Life Preser. | support | heal_light | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 100 | Medical Mac. | support | powerdown_cleanse | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 101 | Gravity Dev. | support | debuff_speed8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 102 | Ene.Absorber | support | damage | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 103 | Sealed Ball | support | attack_power_down | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 104 | Trunks Sword | support | buff_str8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 105 | Dabura Spear | support | buff_str8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 106 | Light Vest | support | buff_speed8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 107 | Btl. Jacket | support | buff_guard8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 108 | New-B Jacket | support | buff_guard8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 109 | Sunglasses | support | sunglasses | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 110 | Gamebomb | support | gamebomb | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 111 | Champ.Belt | support | damage_shield | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 112 | H's Choco. | support | candy | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 113 | Heart Virus | support | attack_power_down | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 114 | Heart Medi. | support | powerdown_cleanse | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 115 | Sandglass | support | support_dispel | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 116 | Naughty Book | support | naughty_book | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 117 | Full Spirit | support | buff_ki8 | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 118 | Afterimage | support | evasion_up | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 119 | Reading Ki | support | accuracy_up | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 120 | Feint | support | accuracy_up | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 121 | Endurance | defense | reduce_damage | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 122 | Telepathy | defense | command_cancel | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 123 | Foresight | defense | command_cancel | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 124 | Shockwave | defense | avoid_damage | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |
| 125 | Avoiding | defense | avoid_beam | — | — | NO_ROM_ANIMATION | NO_ROM_ANIMATION | 0 | 0 | 0 | 0 | 0 |

Verificador: `npm run verify:card-physical-coverage`.
