# DBZ LSW — Physical Frame Reconciliation

Estado: `PHYSICAL FRAME RECONCILIATION ACTIVE` · `TRACE DYNAMIC PARKED`.

Este documento enlaza frames ROM ya decodificados con los manifests actuales del proyecto. No usa comparación visual ni V9 como autoridad de pose.

## Contract

- `durationTicks`, `offsetX`, `offsetY` y `raw` proceden solo de ROM.
- `manifestPose`, `manifestIndex` y `physicalFrame` proceden solo de `public/assets/sprites/<form>/manifest.json` indexado.
- `EXACT` exige frame de manifest existente sin reutilización detectada.
- `SHARED` es válido cuando el runtime reutiliza un frame/pose para varios frames ROM.
- `COMPOSITE` no se trata como frame físico atómico.
- `ROM_PHYSICAL` es un frame físicamente renderizado desde ROM sin equivalente canónico/manifest (identidad ROM-native, no fabricar).
- `UNRESOLVED` es válido y explícito.

## Summary

- Resources reconciled: 14
- ROM frames: 301
- EXACT: 4
- SHARED: 173
- COMPOSITE: 0
- ROM_PHYSICAL: 88
- UNRESOLVED: 36

## Resource Summary

| Resource | Technique | Forms | ROM Frames | EXACT | SHARED | COMPOSITE | ROM_PHYSICAL | UNRESOLVED | Gap Cause |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 0x00 | Energy Wave | 44 | 14 | 0 | 10 | 0 | 0 | 4 | METASPRITE_MAPPING_PENDING |
| 0x01 | Finger Beam | 5 | 12 | 0 | 8 | 0 | 0 | 4 | METASPRITE_MAPPING_PENDING |
| 0x03 | Kamehameha | 26 | 48 | 0 | 30 | 0 | 0 | 18 | METASPRITE_MAPPING_PENDING |
| 0x04 | Masenko | 8 | 14 | 0 | 10 | 0 | 0 | 4 | METASPRITE_MAPPING_PENDING |
| 0x05 | Galick-Ho | 3 | 16 | 0 | 16 | 0 | 0 | 0 | NONE |
| 0x08 | Misty KiWave | 1 | 8 | 2 | 6 | 0 | 0 | 0 | NONE |
| 0x09 | Final Flash | 2 | 16 | 0 | 16 | 0 | 0 | 0 | NONE |
| 0x0b | Hell Flash | 1 | 7 | 2 | 5 | 0 | 0 | 0 | NONE |
| 0x0f | Big Bang Attack | 3 | 16 | 0 | 16 | 0 | 0 | 0 | NONE |
| 0x12 | Destructo Disk | 5 | 36 | 0 | 32 | 0 | 0 | 4 | METASPRITE_MAPPING_PENDING |
| 0x16 | Special Beam Cannon | 5 | 16 | 0 | 14 | 0 | 0 | 2 | METASPRITE_MAPPING_PENDING |
| 0x22 | Spirit Bomb | 4 | 10 | 0 | 10 | 0 | 0 | 0 | NONE |
| 0x2c | Cont.Punch | 44 | 62 | 0 | 0 | 0 | 62 | 0 | ROM_PHYSICAL_ONLY |
| 0x3f | Tail | 3 | 26 | 0 | 0 | 0 | 26 | 0 | ROM_PHYSICAL_ONLY |

## Frame Matrix

| Resource | Seq | Frame | Metasprite | Ticks | Offset | Raw | Mapping | Status | Forms | Sample | Reason |
|---|---:|---:|---:|---:|---|---|---|---|---:|---|---|
| 0x00 | 0 | 0 | 0 | 3 | 0,0 | [0,3,0,0] | beam_charge[0] | SHARED | 44/44 | android_16:android_16_beam_charge_00.png, android_17:android_17_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x00 | 0 | 1 | 0 | 2 | 0,0 | [0,2,0,0] | beam_charge[1] | UNRESOLVED | 43/44 | android_16:android_16_beam_charge_01.png, android_17:android_17_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x00 | 0 | 2 | 0 | 2 | 0,0 | [0,2,0,0] | beam_charge[2] | UNRESOLVED | 34/44 | android_16:android_16_beam_charge_02.png, android_18:android_18_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x00 | 0 | 3 | 1 | 2 | -1,0 | [1,2,0,255] | beam_fire[0] | SHARED | 44/44 | android_16:android_16_beam_fire_00.png, android_17:android_17_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x00 | 0 | 4 | 3 | 2 | -2,0 | [3,2,0,254] | beam_fire[0] | SHARED | 44/44 | android_16:android_16_beam_fire_00.png, android_17:android_17_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x00 | 0 | 5 | 3 | 2 | -3,0 | [3,2,0,253] | beam_fire[0] | SHARED | 44/44 | android_16:android_16_beam_fire_00.png, android_17:android_17_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x00 | 0 | 6 | 3 | 2 | -2,0 | [3,2,0,254] | beam_fire[0] | SHARED | 44/44 | android_16:android_16_beam_fire_00.png, android_17:android_17_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x00 | 1 | 0 | 0 | 3 | 0,0 | [0,3,0,0] | beam_charge[0] | SHARED | 44/44 | android_16:android_16_beam_charge_00.png, android_17:android_17_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x00 | 1 | 1 | 0 | 2 | 0,0 | [0,2,0,0] | beam_charge[1] | UNRESOLVED | 43/44 | android_16:android_16_beam_charge_01.png, android_17:android_17_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x00 | 1 | 2 | 0 | 2 | 0,0 | [0,2,0,0] | beam_charge[2] | UNRESOLVED | 34/44 | android_16:android_16_beam_charge_02.png, android_18:android_18_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x00 | 1 | 3 | 1 | 2 | -1,0 | [1,2,0,255] | beam_fire[0] | SHARED | 44/44 | android_16:android_16_beam_fire_00.png, android_17:android_17_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x00 | 1 | 4 | 2 | 2 | -2,0 | [2,2,0,254] | beam_fire[0] | SHARED | 44/44 | android_16:android_16_beam_fire_00.png, android_17:android_17_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x00 | 1 | 5 | 2 | 2 | -3,0 | [2,2,0,253] | beam_fire[0] | SHARED | 44/44 | android_16:android_16_beam_fire_00.png, android_17:android_17_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x00 | 1 | 6 | 2 | 2 | -2,0 | [2,2,0,254] | beam_fire[0] | SHARED | 44/44 | android_16:android_16_beam_fire_00.png, android_17:android_17_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x01 | 0 | 0 | 0 | 3 | 0,0 | [0,3,0,0] | beam_charge[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_charge_00.png, cell_jr:cell_jr_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x01 | 0 | 1 | 0 | 2 | 0,0 | [0,2,0,0] | beam_charge[1] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_charge_01.png, cell_jr:cell_jr_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x01 | 0 | 2 | 0 | 2 | 0,0 | [0,2,0,0] | beam_charge[2] | UNRESOLVED | 3/5 | cell_imperfect:cell_imperfect_beam_charge_02.png, cell_jr:cell_jr_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x01 | 0 | 3 | 0 | 2 | 0,0 | [0,2,0,0] | beam_charge[2] | UNRESOLVED | 3/5 | cell_imperfect:cell_imperfect_beam_charge_02.png, cell_jr:cell_jr_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x01 | 0 | 4 | 2 | 2 | -7,0 | [2,2,0,249] | beam_fire[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_fire_00.png, cell_jr:cell_jr_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x01 | 0 | 5 | 2 | 2 | -6,0 | [2,2,0,250] | beam_fire[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_fire_00.png, cell_jr:cell_jr_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x01 | 1 | 0 | 0 | 3 | 0,0 | [0,3,0,0] | beam_charge[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_charge_00.png, cell_jr:cell_jr_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x01 | 1 | 1 | 0 | 2 | 0,0 | [0,2,0,0] | beam_charge[1] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_charge_01.png, cell_jr:cell_jr_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x01 | 1 | 2 | 0 | 2 | 0,0 | [0,2,0,0] | beam_charge[2] | UNRESOLVED | 3/5 | cell_imperfect:cell_imperfect_beam_charge_02.png, cell_jr:cell_jr_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x01 | 1 | 3 | 0 | 2 | 0,0 | [0,2,0,0] | beam_charge[2] | UNRESOLVED | 3/5 | cell_imperfect:cell_imperfect_beam_charge_02.png, cell_jr:cell_jr_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x01 | 1 | 4 | 3 | 2 | -7,0 | [3,2,0,249] | beam_fire[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_fire_00.png, cell_jr:cell_jr_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x01 | 1 | 5 | 3 | 2 | -6,0 | [3,2,0,250] | beam_fire[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_fire_00.png, cell_jr:cell_jr_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 0 | 0 | 1 | 3 | 2,0 | [1,3,0,2] | beam_charge[0] | SHARED | 26/26 | buu_base:buu_base_beam_charge_00.png, buu_gohan:buu_gohan_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 0 | 1 | 1 | 2 | 3,0 | [1,2,0,3] | beam_charge[1] | UNRESOLVED | 25/26 | buu_base:buu_base_beam_charge_01.png, buu_gohan:buu_gohan_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 0 | 2 | 1 | 60 | 3,0 | [1,60,0,3] | beam_charge[2] | UNRESOLVED | 22/26 | buu_base:buu_base_beam_charge_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 0 | 3 | 1 | 2 | 2,0 | [1,2,0,2] | beam_charge[2] | UNRESOLVED | 22/26 | buu_base:buu_base_beam_charge_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 0 | 4 | 2 | 2 | -2,0 | [2,2,0,254] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 0 | 5 | 2 | 2 | -4,0 | [2,2,0,252] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 0 | 6 | 2 | 2 | -5,0 | [2,2,0,251] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 0 | 7 | 2 | 2 | -4,0 | [2,2,0,252] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 1 | 0 | 3 | 3 | 2,0 | [3,3,0,2] | beam_charge[0] | SHARED | 26/26 | buu_base:buu_base_beam_charge_00.png, buu_gohan:buu_gohan_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 1 | 1 | 3 | 2 | 3,0 | [3,2,0,3] | beam_charge[1] | UNRESOLVED | 25/26 | buu_base:buu_base_beam_charge_01.png, buu_gohan:buu_gohan_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 1 | 2 | 3 | 60 | 3,0 | [3,60,0,3] | beam_charge[2] | UNRESOLVED | 22/26 | buu_base:buu_base_beam_charge_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 1 | 3 | 3 | 2 | 2,0 | [3,2,0,2] | beam_charge[2] | UNRESOLVED | 22/26 | buu_base:buu_base_beam_charge_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 1 | 4 | 4 | 2 | -2,0 | [4,2,0,254] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 1 | 5 | 4 | 2 | -4,0 | [4,2,0,252] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 1 | 6 | 4 | 2 | -5,0 | [4,2,0,251] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 1 | 7 | 4 | 2 | -4,0 | [4,2,0,252] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 2 | 0 | 5 | 3 | 4,0 | [5,3,0,4] | beam_charge[0] | SHARED | 26/26 | buu_base:buu_base_beam_charge_00.png, buu_gohan:buu_gohan_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 2 | 1 | 5 | 2 | 5,0 | [5,2,0,5] | beam_charge[1] | UNRESOLVED | 25/26 | buu_base:buu_base_beam_charge_01.png, buu_gohan:buu_gohan_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 2 | 2 | 5 | 60 | 5,0 | [5,60,0,5] | beam_charge[2] | UNRESOLVED | 22/26 | buu_base:buu_base_beam_charge_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 2 | 3 | 5 | 2 | 4,0 | [5,2,0,4] | beam_charge[2] | UNRESOLVED | 22/26 | buu_base:buu_base_beam_charge_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 2 | 4 | 6 | 2 | -2,0 | [6,2,0,254] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 2 | 5 | 6 | 2 | -4,0 | [6,2,0,252] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 2 | 6 | 6 | 2 | -5,0 | [6,2,0,251] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 2 | 7 | 6 | 2 | -4,0 | [6,2,0,252] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 3 | 0 | 1 | 3 | 4,0 | [1,3,0,4] | beam_charge[0] | SHARED | 26/26 | buu_base:buu_base_beam_charge_00.png, buu_gohan:buu_gohan_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 3 | 1 | 1 | 2 | 5,0 | [1,2,0,5] | beam_charge[1] | UNRESOLVED | 25/26 | buu_base:buu_base_beam_charge_01.png, buu_gohan:buu_gohan_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 3 | 2 | 1 | 60 | 5,0 | [1,60,0,5] | beam_charge[2] | UNRESOLVED | 22/26 | buu_base:buu_base_beam_charge_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 3 | 3 | 1 | 2 | 4,0 | [1,2,0,4] | beam_charge[2] | UNRESOLVED | 22/26 | buu_base:buu_base_beam_charge_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 3 | 4 | 2 | 2 | -2,0 | [2,2,0,254] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 3 | 5 | 2 | 2 | -4,0 | [2,2,0,252] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 3 | 6 | 2 | 2 | -5,0 | [2,2,0,251] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 3 | 7 | 2 | 2 | -4,0 | [2,2,0,252] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 4 | 0 | 7 | 3 | 2,0 | [7,3,0,2] | beam_charge[0] | SHARED | 26/26 | buu_base:buu_base_beam_charge_00.png, buu_gohan:buu_gohan_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 4 | 1 | 7 | 2 | 3,0 | [7,2,0,3] | beam_charge[1] | UNRESOLVED | 25/26 | buu_base:buu_base_beam_charge_01.png, buu_gohan:buu_gohan_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 4 | 2 | 7 | 60 | 3,0 | [7,60,0,3] | beam_charge[2] | UNRESOLVED | 22/26 | buu_base:buu_base_beam_charge_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 4 | 3 | 7 | 2 | 2,0 | [7,2,0,2] | beam_charge[2] | UNRESOLVED | 22/26 | buu_base:buu_base_beam_charge_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 4 | 4 | 8 | 2 | -2,0 | [8,2,0,254] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 4 | 5 | 8 | 2 | -4,0 | [8,2,0,252] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 4 | 6 | 8 | 2 | -5,0 | [8,2,0,251] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 4 | 7 | 8 | 2 | -4,0 | [8,2,0,252] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 5 | 0 | 9 | 3 | 4,0 | [9,3,0,4] | beam_charge[0] | SHARED | 26/26 | buu_base:buu_base_beam_charge_00.png, buu_gohan:buu_gohan_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 5 | 1 | 9 | 2 | 5,0 | [9,2,0,5] | beam_charge[1] | UNRESOLVED | 25/26 | buu_base:buu_base_beam_charge_01.png, buu_gohan:buu_gohan_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 5 | 2 | 9 | 60 | 5,0 | [9,60,0,5] | beam_charge[2] | UNRESOLVED | 22/26 | buu_base:buu_base_beam_charge_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 5 | 3 | 9 | 2 | 4,0 | [9,2,0,4] | beam_charge[2] | UNRESOLVED | 22/26 | buu_base:buu_base_beam_charge_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x03 | 5 | 4 | 10 | 2 | -2,0 | [10,2,0,254] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 5 | 5 | 10 | 2 | -4,0 | [10,2,0,252] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 5 | 6 | 10 | 2 | -5,0 | [10,2,0,251] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x03 | 5 | 7 | 10 | 2 | -4,0 | [10,2,0,252] | beam_fire[0] | SHARED | 26/26 | buu_base:buu_base_attack_fwd_02.png, buu_gohan:buu_gohan_beam_charge_02.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x04 | 0 | 0 | 2 | 3 | 1,0 | [2,3,0,1] | beam_charge[0] | SHARED | 8/8 | gohan_adult_ssj:gohan_adult_ssj_beam_charge_00.png, gohan_adult_ultimate:gohan_adult_ultimate_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x04 | 0 | 1 | 2 | 2 | 2,0 | [2,2,0,2] | beam_charge[1] | UNRESOLVED | 7/8 | gohan_adult_ultimate:gohan_adult_ultimate_beam_charge_01.png, gohan_young:gohan_young_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x04 | 0 | 2 | 2 | 60 | 2,0 | [2,60,0,2] | beam_charge[2] | UNRESOLVED | 5/8 | gohan_adult_ultimate:gohan_adult_ultimate_beam_charge_02.png, gohan_young:gohan_young_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x04 | 0 | 3 | 1 | 3 | -1,0 | [1,3,0,255] | beam_fire[0] | SHARED | 8/8 | gohan_adult_ssj:gohan_adult_ssj_beam_charge_00.png, gohan_adult_ultimate:gohan_adult_ultimate_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x04 | 0 | 4 | 3 | 2 | -9,0 | [3,2,0,247] | beam_fire[0] | SHARED | 8/8 | gohan_adult_ssj:gohan_adult_ssj_beam_charge_00.png, gohan_adult_ultimate:gohan_adult_ultimate_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x04 | 0 | 5 | 3 | 2 | -10,0 | [3,2,0,246] | beam_fire[0] | SHARED | 8/8 | gohan_adult_ssj:gohan_adult_ssj_beam_charge_00.png, gohan_adult_ultimate:gohan_adult_ultimate_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x04 | 0 | 6 | 3 | 2 | -9,0 | [3,2,0,247] | beam_fire[0] | SHARED | 8/8 | gohan_adult_ssj:gohan_adult_ssj_beam_charge_00.png, gohan_adult_ultimate:gohan_adult_ultimate_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x04 | 1 | 0 | 4 | 3 | 1,0 | [4,3,0,1] | beam_charge[0] | SHARED | 8/8 | gohan_adult_ssj:gohan_adult_ssj_beam_charge_00.png, gohan_adult_ultimate:gohan_adult_ultimate_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x04 | 1 | 1 | 4 | 2 | 2,0 | [4,2,0,2] | beam_charge[1] | UNRESOLVED | 7/8 | gohan_adult_ultimate:gohan_adult_ultimate_beam_charge_01.png, gohan_young:gohan_young_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x04 | 1 | 2 | 4 | 60 | 2,0 | [4,60,0,2] | beam_charge[2] | UNRESOLVED | 5/8 | gohan_adult_ultimate:gohan_adult_ultimate_beam_charge_02.png, gohan_young:gohan_young_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x04 | 1 | 3 | 1 | 3 | -1,0 | [1,3,0,255] | beam_fire[0] | SHARED | 8/8 | gohan_adult_ssj:gohan_adult_ssj_beam_charge_00.png, gohan_adult_ultimate:gohan_adult_ultimate_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x04 | 1 | 4 | 3 | 2 | -9,0 | [3,2,0,247] | beam_fire[0] | SHARED | 8/8 | gohan_adult_ssj:gohan_adult_ssj_beam_charge_00.png, gohan_adult_ultimate:gohan_adult_ultimate_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x04 | 1 | 5 | 3 | 2 | -10,0 | [3,2,0,246] | beam_fire[0] | SHARED | 8/8 | gohan_adult_ssj:gohan_adult_ssj_beam_charge_00.png, gohan_adult_ultimate:gohan_adult_ultimate_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x04 | 1 | 6 | 3 | 2 | -9,0 | [3,2,0,247] | beam_fire[0] | SHARED | 8/8 | gohan_adult_ssj:gohan_adult_ssj_beam_charge_00.png, gohan_adult_ultimate:gohan_adult_ultimate_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x05 | 0 | 0 | 2 | 3 | 1,0 | [2,3,0,1] | beam_charge[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_charge_00.png, vegeta_ssj:vegeta_ssj_attack_fwd_03.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x05 | 0 | 1 | 2 | 2 | 2,0 | [2,2,0,2] | beam_charge[1] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_charge_01.png, vegeta_ssj:vegeta_ssj_attack_fwd_04.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x05 | 0 | 2 | 2 | 60 | 3,0 | [2,60,0,3] | beam_charge[2] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_charge_02.png, vegeta_ssj:vegeta_ssj_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x05 | 0 | 3 | 1 | 3 | 0,0 | [1,3,0,0] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x05 | 0 | 4 | 3 | 2 | -7,0 | [3,2,0,249] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x05 | 0 | 5 | 3 | 2 | -8,0 | [3,2,0,248] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x05 | 0 | 6 | 3 | 2 | -6,0 | [3,2,0,250] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x05 | 0 | 7 | 3 | 2 | -5,0 | [3,2,0,251] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x05 | 1 | 0 | 4 | 3 | 1,0 | [4,3,0,1] | beam_charge[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_charge_00.png, vegeta_ssj:vegeta_ssj_attack_fwd_03.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x05 | 1 | 1 | 4 | 2 | 2,0 | [4,2,0,2] | beam_charge[1] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_charge_01.png, vegeta_ssj:vegeta_ssj_attack_fwd_04.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x05 | 1 | 2 | 4 | 60 | 3,0 | [4,60,0,3] | beam_charge[2] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_charge_02.png, vegeta_ssj:vegeta_ssj_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x05 | 1 | 3 | 1 | 3 | 0,0 | [1,3,0,0] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x05 | 1 | 4 | 5 | 2 | -7,0 | [5,2,0,249] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x05 | 1 | 5 | 5 | 2 | -8,0 | [5,2,0,248] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x05 | 1 | 6 | 5 | 2 | -6,0 | [5,2,0,250] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x05 | 1 | 7 | 5 | 2 | -5,0 | [5,2,0,251] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x08 | 0 | 0 | 0 | 3 | 0,0 | [0,3,0,0] | beam_charge[0] | EXACT | 1/1 | krillin_base:krillin_base_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x08 | 0 | 1 | 1 | 3 | -2,0 | [1,3,0,254] | beam_fire[0] | SHARED | 1/1 | krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x08 | 0 | 2 | 2 | 2 | -3,0 | [2,2,0,253] | beam_fire[0] | SHARED | 1/1 | krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x08 | 0 | 3 | 2 | 60 | -4,0 | [2,60,0,252] | beam_charge[2] | EXACT | 1/1 | krillin_base:krillin_base_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x08 | 0 | 4 | 3 | 3 | -8,0 | [3,3,0,248] | beam_fire[0] | SHARED | 1/1 | krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x08 | 0 | 5 | 3 | 2 | -6,0 | [3,2,0,250] | beam_fire[0] | SHARED | 1/1 | krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x08 | 0 | 6 | 3 | 2 | -5,0 | [3,2,0,251] | beam_fire[0] | SHARED | 1/1 | krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x08 | 0 | 7 | 3 | 2 | -6,0 | [3,2,0,250] | beam_fire[0] | SHARED | 1/1 | krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x09 | 0 | 0 | 2 | 3 | -5,0 | [2,3,0,251] | beam_charge[0] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_charge_00.png, vegeta_ssj:vegeta_ssj_attack_fwd_03.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x09 | 0 | 1 | 2 | 60 | -4,0 | [2,60,0,252] | beam_charge[1] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_charge_01.png, vegeta_ssj:vegeta_ssj_attack_fwd_04.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x09 | 0 | 2 | 2 | 4 | -3,0 | [2,4,0,253] | beam_charge[2] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_charge_02.png, vegeta_ssj:vegeta_ssj_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x09 | 0 | 3 | 1 | 3 | -4,0 | [1,3,0,252] | beam_fire[0] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x09 | 0 | 4 | 3 | 2 | -7,0 | [3,2,0,249] | beam_fire[0] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x09 | 0 | 5 | 3 | 2 | -9,0 | [3,2,0,247] | beam_fire[0] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x09 | 0 | 6 | 3 | 2 | -8,0 | [3,2,0,248] | beam_fire[0] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x09 | 0 | 7 | 3 | 2 | -7,0 | [3,2,0,249] | beam_fire[0] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x09 | 1 | 0 | 2 | 3 | -5,0 | [2,3,0,251] | beam_charge[0] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_charge_00.png, vegeta_ssj:vegeta_ssj_attack_fwd_03.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x09 | 1 | 1 | 2 | 60 | -4,0 | [2,60,0,252] | beam_charge[1] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_charge_01.png, vegeta_ssj:vegeta_ssj_attack_fwd_04.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x09 | 1 | 2 | 2 | 4 | -3,0 | [2,4,0,253] | beam_charge[2] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_charge_02.png, vegeta_ssj:vegeta_ssj_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x09 | 1 | 3 | 1 | 3 | -4,0 | [1,3,0,252] | beam_fire[0] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x09 | 1 | 4 | 4 | 2 | -7,0 | [4,2,0,249] | beam_fire[0] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x09 | 1 | 5 | 4 | 2 | -9,0 | [4,2,0,247] | beam_fire[0] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x09 | 1 | 6 | 4 | 2 | -8,0 | [4,2,0,248] | beam_fire[0] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x09 | 1 | 7 | 4 | 2 | -7,0 | [4,2,0,249] | beam_fire[0] | SHARED | 2/2 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x0b | 0 | 0 | 4 | 4 | 0,0 | [4,4,0,0] | beam_charge[0] | EXACT | 1/1 | android_16:android_16_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x0b | 0 | 1 | 2 | 40 | 1,0 | [2,40,0,1] | beam_charge[1] | EXACT | 1/1 | android_16:android_16_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x0b | 0 | 2 | 3 | 2 | 0,0 | [3,2,0,0] | beam_fire[0] | SHARED | 1/1 | android_16:android_16_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x0b | 0 | 3 | 3 | 60 | 1,0 | [3,60,0,1] | beam_charge[2] | SHARED | 1/1 | android_16:android_16_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x0b | 0 | 4 | 5 | 3 | 4,0 | [5,3,0,4] | beam_fire[0] | SHARED | 1/1 | android_16:android_16_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x0b | 0 | 5 | 5 | 2 | 6,0 | [5,2,0,6] | beam_fire[0] | SHARED | 1/1 | android_16:android_16_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x0b | 0 | 6 | 5 | 2 | 4,0 | [5,2,0,4] | beam_fire[0] | SHARED | 1/1 | android_16:android_16_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x0f | 0 | 0 | 1 | 3 | 2,0 | [1,3,0,2] | beam_charge[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_charge_00.png, vegeta_ssj:vegeta_ssj_attack_fwd_03.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x0f | 0 | 1 | 1 | 2 | 3,0 | [1,2,0,3] | beam_charge[1] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_charge_01.png, vegeta_ssj:vegeta_ssj_attack_fwd_04.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x0f | 0 | 2 | 1 | 60 | 3,0 | [1,60,0,3] | beam_charge[2] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_charge_02.png, vegeta_ssj:vegeta_ssj_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x0f | 0 | 3 | 1 | 2 | 2,0 | [1,2,0,2] | beam_charge[2] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_charge_02.png, vegeta_ssj:vegeta_ssj_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x0f | 0 | 4 | 2 | 2 | -2,0 | [2,2,0,254] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x0f | 0 | 5 | 2 | 2 | -4,0 | [2,2,0,252] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x0f | 0 | 6 | 2 | 2 | -5,0 | [2,2,0,251] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x0f | 0 | 7 | 2 | 2 | -4,0 | [2,2,0,252] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x0f | 1 | 0 | 3 | 3 | 2,0 | [3,3,0,2] | beam_charge[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_charge_00.png, vegeta_ssj:vegeta_ssj_attack_fwd_03.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x0f | 1 | 1 | 3 | 2 | 3,0 | [3,2,0,3] | beam_charge[1] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_charge_01.png, vegeta_ssj:vegeta_ssj_attack_fwd_04.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x0f | 1 | 2 | 3 | 60 | 3,0 | [3,60,0,3] | beam_charge[2] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_charge_02.png, vegeta_ssj:vegeta_ssj_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x0f | 1 | 3 | 3 | 2 | 2,0 | [3,2,0,2] | beam_charge[2] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_charge_02.png, vegeta_ssj:vegeta_ssj_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x0f | 1 | 4 | 4 | 2 | -2,0 | [4,2,0,254] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x0f | 1 | 5 | 4 | 2 | -4,0 | [4,2,0,252] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x0f | 1 | 6 | 4 | 2 | -5,0 | [4,2,0,251] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x0f | 1 | 7 | 4 | 2 | -4,0 | [4,2,0,252] | beam_fire[0] | SHARED | 3/3 | vegeta_base:vegeta_base_beam_fire_00.png, vegeta_ssj:vegeta_ssj_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 0 | 0 | 0 | 3 | 0,0 | [0,3,0,0] | beam_charge[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_charge_00.png, krillin_base:krillin_base_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x12 | 0 | 1 | 0 | 2 | 0,0 | [0,2,0,0] | beam_charge[1] | SHARED | 5/5 | frieza_final:frieza_final_beam_charge_01.png, krillin_base:krillin_base_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x12 | 0 | 2 | 2 | 3 | -3,0 | [2,3,0,253] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 0 | 3 | 2 | 60 | -2,0 | [2,60,0,254] | beam_charge[2] | UNRESOLVED | 4/5 | krillin_base:krillin_base_beam_charge_02.png, vegeta_base:vegeta_base_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x12 | 0 | 4 | 1 | 3 | -2,0 | [1,3,0,254] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 0 | 5 | 3 | 2 | -7,0 | [3,2,0,249] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 0 | 6 | 3 | 2 | -9,0 | [3,2,0,247] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 0 | 7 | 3 | 2 | -8,0 | [3,2,0,248] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 0 | 8 | 3 | 2 | -7,0 | [3,2,0,249] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 1 | 0 | 0 | 3 | 0,0 | [0,3,0,0] | beam_charge[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_charge_00.png, krillin_base:krillin_base_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x12 | 1 | 1 | 0 | 2 | 0,0 | [0,2,0,0] | beam_charge[1] | SHARED | 5/5 | frieza_final:frieza_final_beam_charge_01.png, krillin_base:krillin_base_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x12 | 1 | 2 | 4 | 3 | -3,0 | [4,3,0,253] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 1 | 3 | 4 | 60 | -2,0 | [4,60,0,254] | beam_charge[2] | UNRESOLVED | 4/5 | krillin_base:krillin_base_beam_charge_02.png, vegeta_base:vegeta_base_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x12 | 1 | 4 | 1 | 3 | -2,0 | [1,3,0,254] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 1 | 5 | 3 | 2 | -8,0 | [3,2,0,248] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 1 | 6 | 3 | 2 | -10,0 | [3,2,0,246] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 1 | 7 | 3 | 2 | -9,0 | [3,2,0,247] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 1 | 8 | 3 | 2 | -8,0 | [3,2,0,248] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 2 | 0 | 0 | 3 | 0,0 | [0,3,0,0] | beam_charge[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_charge_00.png, krillin_base:krillin_base_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x12 | 2 | 1 | 0 | 2 | 0,0 | [0,2,0,0] | beam_charge[1] | SHARED | 5/5 | frieza_final:frieza_final_beam_charge_01.png, krillin_base:krillin_base_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x12 | 2 | 2 | 2 | 3 | -3,0 | [2,3,0,253] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 2 | 3 | 2 | 60 | -2,0 | [2,60,0,254] | beam_charge[2] | UNRESOLVED | 4/5 | krillin_base:krillin_base_beam_charge_02.png, vegeta_base:vegeta_base_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x12 | 2 | 4 | 1 | 3 | -2,0 | [1,3,0,254] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 2 | 5 | 3 | 2 | -8,0 | [3,2,0,248] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 2 | 6 | 3 | 2 | -10,0 | [3,2,0,246] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 2 | 7 | 3 | 2 | -9,0 | [3,2,0,247] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 2 | 8 | 3 | 2 | -8,0 | [3,2,0,248] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 3 | 0 | 0 | 3 | 0,0 | [0,3,0,0] | beam_charge[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_charge_00.png, krillin_base:krillin_base_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x12 | 3 | 1 | 0 | 2 | 0,0 | [0,2,0,0] | beam_charge[1] | SHARED | 5/5 | frieza_final:frieza_final_beam_charge_01.png, krillin_base:krillin_base_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x12 | 3 | 2 | 4 | 3 | -3,0 | [4,3,0,253] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 3 | 3 | 4 | 60 | -2,0 | [4,60,0,254] | beam_charge[2] | UNRESOLVED | 4/5 | krillin_base:krillin_base_beam_charge_02.png, vegeta_base:vegeta_base_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x12 | 3 | 4 | 1 | 3 | -2,0 | [1,3,0,254] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 3 | 5 | 3 | 2 | -8,0 | [3,2,0,248] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 3 | 6 | 3 | 2 | -10,0 | [3,2,0,246] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 3 | 7 | 3 | 2 | -9,0 | [3,2,0,247] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x12 | 3 | 8 | 3 | 2 | -8,0 | [3,2,0,248] | beam_fire[0] | SHARED | 5/5 | frieza_final:frieza_final_beam_fire_00.png, krillin_base:krillin_base_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x16 | 0 | 0 | 2 | 3 | -5,0 | [2,3,0,251] | beam_charge[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_charge_00.png, cell_jr:cell_jr_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x16 | 0 | 1 | 2 | 60 | -4,0 | [2,60,0,252] | beam_charge[1] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_charge_01.png, cell_jr:cell_jr_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x16 | 0 | 2 | 2 | 4 | -3,0 | [2,4,0,253] | beam_charge[2] | UNRESOLVED | 4/5 | cell_imperfect:cell_imperfect_beam_charge_02.png, cell_jr:cell_jr_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x16 | 0 | 3 | 1 | 3 | -4,0 | [1,3,0,252] | beam_fire[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_fire_00.png, cell_jr:cell_jr_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x16 | 0 | 4 | 3 | 2 | -7,0 | [3,2,0,249] | beam_fire[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_fire_00.png, cell_jr:cell_jr_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x16 | 0 | 5 | 3 | 2 | -9,0 | [3,2,0,247] | beam_fire[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_fire_00.png, cell_jr:cell_jr_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x16 | 0 | 6 | 3 | 2 | -8,0 | [3,2,0,248] | beam_fire[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_fire_00.png, cell_jr:cell_jr_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x16 | 0 | 7 | 3 | 2 | -7,0 | [3,2,0,249] | beam_fire[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_fire_00.png, cell_jr:cell_jr_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x16 | 1 | 0 | 2 | 3 | -5,0 | [2,3,0,251] | beam_charge[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_charge_00.png, cell_jr:cell_jr_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x16 | 1 | 1 | 2 | 60 | -4,0 | [2,60,0,252] | beam_charge[1] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_charge_01.png, cell_jr:cell_jr_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x16 | 1 | 2 | 2 | 4 | -3,0 | [2,4,0,253] | beam_charge[2] | UNRESOLVED | 4/5 | cell_imperfect:cell_imperfect_beam_charge_02.png, cell_jr:cell_jr_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x16 | 1 | 3 | 1 | 3 | -4,0 | [1,3,0,252] | beam_fire[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_fire_00.png, cell_jr:cell_jr_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x16 | 1 | 4 | 4 | 2 | -7,0 | [4,2,0,249] | beam_fire[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_fire_00.png, cell_jr:cell_jr_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x16 | 1 | 5 | 4 | 2 | -9,0 | [4,2,0,247] | beam_fire[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_fire_00.png, cell_jr:cell_jr_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x16 | 1 | 6 | 4 | 2 | -8,0 | [4,2,0,248] | beam_fire[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_fire_00.png, cell_jr:cell_jr_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x16 | 1 | 7 | 4 | 2 | -7,0 | [4,2,0,249] | beam_fire[0] | SHARED | 5/5 | cell_imperfect:cell_imperfect_beam_fire_00.png, cell_jr:cell_jr_beam_fire_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x22 | 0 | 0 | 2 | 4 | -2,0 | [2,4,0,254] | beam_charge[0] | SHARED | 4/4 | goku_base:goku_base_beam_charge_00.png, goku_ssj:goku_ssj_beam_charge_00.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x22 | 0 | 1 | 2 | 60 | -1,0 | [2,60,0,255] | beam_charge[1] | SHARED | 4/4 | goku_base:goku_base_beam_charge_01.png, goku_ssj:goku_ssj_beam_charge_01.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x22 | 0 | 2 | 2 | 3 | -2,0 | [2,3,0,254] | beam_charge[2] | SHARED | 4/4 | goku_base:goku_base_beam_charge_02.png, goku_ssj:goku_ssj_beam_charge_02.png | Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity. |
| 0x22 | 0 | 3 | 1 | 3 | -3,0 | [1,3,0,253] | beam_fire[0] | SHARED | 4/4 | goku_base:goku_base_beam_fire_00.png, goku_ssj:goku_ssj_beam_charge_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x22 | 0 | 4 | 3 | 2 | -10,0 | [3,2,0,246] | beam_fire[0] | SHARED | 4/4 | goku_base:goku_base_beam_fire_00.png, goku_ssj:goku_ssj_beam_charge_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x22 | 0 | 5 | 3 | 2 | -14,0 | [3,2,0,242] | beam_fire[0] | SHARED | 4/4 | goku_base:goku_base_beam_fire_00.png, goku_ssj:goku_ssj_beam_charge_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x22 | 0 | 6 | 3 | 2 | -12,0 | [3,2,0,244] | beam_fire[0] | SHARED | 4/4 | goku_base:goku_base_beam_fire_00.png, goku_ssj:goku_ssj_beam_charge_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x22 | 0 | 7 | 3 | 3 | -13,0 | [3,3,0,243] | beam_fire[0] | SHARED | 4/4 | goku_base:goku_base_beam_fire_00.png, goku_ssj:goku_ssj_beam_charge_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x22 | 0 | 8 | 3 | 3 | -12,0 | [3,3,0,244] | beam_fire[0] | SHARED | 4/4 | goku_base:goku_base_beam_fire_00.png, goku_ssj:goku_ssj_beam_charge_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x22 | 0 | 9 | 3 | 3 | -11,0 | [3,3,0,245] | beam_fire[0] | SHARED | 4/4 | goku_base:goku_base_beam_fire_00.png, goku_ssj:goku_ssj_beam_charge_00.png | Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it. |
| 0x2c | 0 | 0 | 1 | 2 | 0,0 | [1,2,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 1 | 1 | 2 | 0,0 | [1,2,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 2 | 2 | 2 | -7,0 | [2,2,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 3 | 2 | 4 | -8,0 | [2,4,0,248] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 4 | 2 | 6 | -7,0 | [2,6,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 5 | 1 | 2 | 0,0 | [1,2,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 6 | 3 | 2 | -7,0 | [3,2,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 7 | 3 | 4 | -8,0 | [3,4,0,248] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 8 | 3 | 6 | -7,0 | [3,6,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 9 | 1 | 2 | 0,0 | [1,2,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 10 | 2 | 2 | -7,0 | [2,2,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 11 | 2 | 4 | -8,0 | [2,4,0,248] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 12 | 2 | 6 | -7,0 | [2,6,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 13 | 1 | 2 | 0,0 | [1,2,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 14 | 3 | 2 | -7,0 | [3,2,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 15 | 3 | 4 | -8,0 | [3,4,0,248] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 16 | 3 | 6 | -7,0 | [3,6,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 17 | 1 | 2 | 0,0 | [1,2,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 18 | 2 | 2 | -7,0 | [2,2,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 19 | 2 | 4 | -8,0 | [2,4,0,248] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 20 | 2 | 6 | -7,0 | [2,6,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 21 | 1 | 2 | 0,0 | [1,2,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 22 | 3 | 2 | -7,0 | [3,2,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 23 | 3 | 4 | -8,0 | [3,4,0,248] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 24 | 3 | 6 | -7,0 | [3,6,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 25 | 1 | 2 | 0,0 | [1,2,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 26 | 2 | 2 | -7,0 | [2,2,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 27 | 2 | 4 | -8,0 | [2,4,0,248] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 28 | 2 | 6 | -7,0 | [2,6,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 29 | 1 | 2 | 0,0 | [1,2,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 30 | 3 | 2 | -7,0 | [3,2,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 31 | 3 | 4 | -8,0 | [3,4,0,248] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 32 | 3 | 6 | -7,0 | [3,6,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 33 | 1 | 2 | 0,0 | [1,2,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 34 | 2 | 2 | -7,0 | [2,2,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 35 | 2 | 4 | -8,0 | [2,4,0,248] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 36 | 2 | 6 | -7,0 | [2,6,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 37 | 1 | 2 | 0,0 | [1,2,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 38 | 3 | 2 | -7,0 | [3,2,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 39 | 3 | 4 | -8,0 | [3,4,0,248] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 40 | 3 | 6 | -7,0 | [3,6,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 41 | 1 | 2 | 0,0 | [1,2,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 42 | 2 | 2 | -7,0 | [2,2,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 43 | 2 | 4 | -8,0 | [2,4,0,248] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 44 | 2 | 6 | -7,0 | [2,6,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 45 | 1 | 2 | 0,0 | [1,2,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 46 | 3 | 2 | -7,0 | [3,2,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 47 | 3 | 4 | -8,0 | [3,4,0,248] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 48 | 3 | 2 | -7,0 | [3,2,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 49 | 1 | 2 | 0,0 | [1,2,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 50 | 3 | 2 | -7,0 | [3,2,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 51 | 3 | 4 | -8,0 | [3,4,0,248] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 52 | 3 | 2 | -7,0 | [3,2,0,249] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 0 | 53 | 0 | 30 | 0,0 | [0,30,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 1 | 0 | 1 | 3 | -2,0 | [1,3,0,254] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 1 | 1 | 3 | 2 | -11,0 | [3,2,0,245] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 1 | 2 | 3 | 4 | -16,0 | [3,4,0,240] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 1 | 3 | 3 | 2 | -13,0 | [3,2,0,243] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 1 | 4 | 3 | 2 | -14,0 | [3,2,0,242] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 1 | 5 | 3 | 30 | -13,0 | [3,30,0,243] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 1 | 6 | 3 | 4 | -8,0 | [3,4,0,248] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x2c | 1 | 7 | 0 | 2 | 0,0 | [0,2,0,0] | — | ROM_PHYSICAL | 0/44 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 0 | 0 | 0 | 31 | 0,0 | [0,31,0,0] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 0 | 1 | 5 | 1,0 | [1,5,0,1] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 1 | 2 | 3 | 1,-1 | [2,3,255,1] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 2 | 1 | 4 | 1,0 | [1,4,0,1] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 3 | 2 | 3 | 0,-1 | [2,3,255,0] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 4 | 1 | 4 | 1,0 | [1,4,0,1] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 5 | 2 | 3 | 1,-1 | [2,3,255,1] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 6 | 1 | 4 | 1,0 | [1,4,0,1] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 7 | 2 | 3 | 0,-1 | [2,3,255,0] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 8 | 1 | 4 | 1,0 | [1,4,0,1] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 9 | 2 | 3 | 1,-1 | [2,3,255,1] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 10 | 1 | 4 | 1,0 | [1,4,0,1] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 11 | 2 | 3 | 0,-1 | [2,3,255,0] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 12 | 0 | 60 | 0,0 | [0,60,0,0] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 13 | 1 | 2 | 1,0 | [1,2,0,1] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 14 | 3 | 4 | 2,0 | [3,4,0,2] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 15 | 3 | 30 | 2,0 | [3,30,0,2] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 16 | 1 | 3 | -1,0 | [1,3,0,255] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 17 | 4 | 2 | -16,0 | [4,2,0,240] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 18 | 4 | 2 | -18,2 | [4,2,2,238] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 19 | 5 | 2 | -18,0 | [5,2,0,238] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 20 | 5 | 3 | -18,-1 | [5,3,255,238] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 21 | 5 | 60 | -18,0 | [5,60,0,238] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 22 | 5 | 6 | -19,0 | [5,6,0,237] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 23 | 5 | 6 | -20,0 | [5,6,0,236] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |
| 0x3f | 1 | 24 | 0 | 2 | -12,0 | [0,2,0,244] | — | ROM_PHYSICAL | 0/3 | — | ROM physical frame rendered; no canonical/manifest equivalent (preserve ROM-native identity, do not fabricate). |

## Non-Decoded Resource Gap Causes

| Resource | Status | Cards | Handlers | Gap Cause |
|---|---|---:|---|---|
| 0x02 | PARTIAL | 1 | 0x02 | SEQUENCE_BOUNDARY_PENDING |
| 0x06 | PARTIAL | 1 | 0x02 | SEQUENCE_BOUNDARY_PENDING |
| 0x07 | PARTIAL | 1 | 0x04 | SEQUENCE_BOUNDARY_PENDING |
| 0x0a | PARTIAL | 1 | 0x03 | SEQUENCE_BOUNDARY_PENDING |
| 0x0c | PARTIAL | 1 | 0x05 | SEQUENCE_BOUNDARY_PENDING |
| 0x0d | UNKNOWN | 0 | — | OTHER_STATIC_PENDING |
| 0x0e | PARTIAL | 1 | 0x05 | SEQUENCE_BOUNDARY_PENDING |
| 0x10 | PARTIAL | 1 | 0x05 | SEQUENCE_BOUNDARY_PENDING |
| 0x11 | PARTIAL | 1 | 0x05 | SEQUENCE_BOUNDARY_PENDING |
| 0x13 | PARTIAL | 1 | 0x07 | SEQUENCE_BOUNDARY_PENDING |
| 0x14 | PARTIAL | 1 | 0x05 | SEQUENCE_BOUNDARY_PENDING |
| 0x15 | PARTIAL | 1 | 0x05 | SEQUENCE_BOUNDARY_PENDING |
| 0x17 | PARTIAL | 1 | 0x05 | SEQUENCE_BOUNDARY_PENDING |
| 0x18 | PARTIAL | 1 | 0x07 | SEQUENCE_BOUNDARY_PENDING |
| 0x19 | PARTIAL | 1 | 0x02 | SEQUENCE_BOUNDARY_PENDING |
| 0x1a | PARTIAL | 1 | 0x03 | SEQUENCE_BOUNDARY_PENDING |
| 0x1b | PARTIAL | 1 | 0x07 | SEQUENCE_BOUNDARY_PENDING |
| 0x1c | SPECIAL | 2 | 0x0d, 0x0e | HANDLER_DEPENDENT |
| 0x1d | PARTIAL | 1 | 0x05 | SEQUENCE_BOUNDARY_PENDING |
| 0x1e | PARTIAL | 1 | 0x02 | SEQUENCE_BOUNDARY_PENDING |
| 0x1f | PARTIAL | 1 | 0x06 | SEQUENCE_BOUNDARY_PENDING |
| 0x20 | PARTIAL | 1 | 0x03 | SEQUENCE_BOUNDARY_PENDING |
| 0x21 | PARTIAL | 1 | 0x07 | SEQUENCE_BOUNDARY_PENDING |
| 0x23 | PARTIAL | 1 | 0x05 | SEQUENCE_BOUNDARY_PENDING |
| 0x24 | PARTIAL | 1 | 0x00 | HANDLER_DEPENDENT |
| 0x25 | PARTIAL | 1 | 0x00 | HANDLER_DEPENDENT |
| 0x26 | PARTIAL | 1 | 0x00 | HANDLER_DEPENDENT |
| 0x27 | PARTIAL | 1 | 0x00 | HANDLER_DEPENDENT |
| 0x28 | PARTIAL | 1 | 0x00 | HANDLER_DEPENDENT |
| 0x29 | SPECIAL | 1 | 0x0d | HANDLER_DEPENDENT |
| 0x2a | PARTIAL | 1 | 0x00 | HANDLER_DEPENDENT |
| 0x2b | SPECIAL | 1 | 0x08 | HANDLER_DEPENDENT |
| 0x2d | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x2e | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x2f | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x30 | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x31 | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x32 | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x33 | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x34 | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x35 | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x36 | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x37 | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x38 | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x39 | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x3a | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x3b | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x3c | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x3d | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x3e | PARTIAL | 1 | 0x0a | FRAME_TABLE_PARTIAL |
| 0x40 | SPECIAL | 1 | 0x0d | HANDLER_DEPENDENT |
| 0x41 | SPECIAL | 1 | 0x0c | HANDLER_DEPENDENT |

Verificador: `npm run verify:physical-animation-mapping`.
