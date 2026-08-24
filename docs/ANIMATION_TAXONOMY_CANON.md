# DBZ LSW — Animation Taxonomy Canon

Estado: `ANIMATION TAXONOMY ACTIVE` · `ROM TRACE NAVIGATION PARKED / READY` · `L10 DYNAMIC BLOCKED BY REAL TRACES`.

Esta matriz separa tres capas que no deben mezclarse:

- `EXECUTION FAMILY`: handler/rutina que ejecuta la ROM (byte 5 de la tabla de cartas).
- `ACTOR ANIMATION`: ActionProfile, AnimationResource, secuencias y frames físicos del actor cuando están extraídos.
- `VISUAL EFFECT`: visual runtime, FXResource, paleta y aura.

TRACE DYNAMIC solo vuelve para `BASE_X / BASE_Y`, `anchors`, `slot binding`, FSM especiales incompletos y coordenadas absolutas.

## Summary

- Cartas cubiertas: 125/125
- Con AnimationResource estático: 70
- Con FXResource estático: 99
- Con secuencias físicas ROM ya extraídas: 16
- AnimationResources con frame decode ROM: 12
- Execution families: NO_ACTION_HANDLER=19 · DAMAGE_BASE=19 · BASE_BEAM_OR_SUPPORT=38 · PROJECTILE_SCROLL=10 · SPECIAL_PROJECTILE_PATH=7 · SCRIPTED_SPECIAL_OR_SUMMON=9 · SPECIAL_SCRIPT=1 · BURNING_ATTACK_RELEASE=1 · BUU_BALL=1 · MULTI_ACTOR_SCRIPT=14 · BEAM_RELEASE_FRAME_5=3 · PURPLE_COMET_Z=1 · PROJECTILE_ALT_SCROLL=1 · ENERGY_ABSORBER=1
- Visual effects: rush=26 · wave=4 · ball=7 · special=12 · ray=13 · power=46 · disk=4 · sword=1 · item=12

## Matrix 125/125

| ID | Card | Exec Family | Handler | AnimationResource | Actor Profile | Actor Seq | Physical Frames | FXResource | Palette | Visual Effect | Aura | Template | Evidence |
|---:|---|---|---|---|---|---|---:|---|---|---|---|---|---|
| 1 | 3 stage atk. | NO_ACTION_HANDLER | 0x00 | — | stage_3 | 0:idle > 12:attack_fwd > 26:idle > 38:attack_fwd > 52:attack_fwd > 66:idle | 0 | — | — | rush | none | T04 | ROM_STATIC_VERIFIED/REMAKE_CANON/REMAKE_CANON |
| 2 | 4 stage atk. | NO_ACTION_HANDLER | 0x00 | — | stage_4 | 0:idle > 12:attack_fwd > 26:idle > 38:attack_fwd > 52:attack_fwd > 66:idle | 0 | — | — | rush | none | T04 | ROM_STATIC_VERIFIED/REMAKE_CANON/REMAKE_CANON |
| 3 | 5 stage atk. | NO_ACTION_HANDLER | 0x00 | — | stage_5 | 0:idle > 12:attack_fwd > 26:idle > 38:attack_fwd > 52:attack_fwd > 66:idle | 0 | — | — | rush | none | T04 | ROM_STATIC_VERIFIED/REMAKE_CANON/REMAKE_CANON |
| 4 | 6 stage atk. | NO_ACTION_HANDLER | 0x00 | — | stage_6 | 0:idle > 12:attack_fwd > 26:idle > 38:attack_fwd > 52:attack_fwd > 66:idle | 0 | — | — | rush | none | T04 | ROM_STATIC_VERIFIED/REMAKE_CANON/REMAKE_CANON |
| 5 | Cont.Punch | DAMAGE_BASE | 0x0a | 0x2c | cont_punch | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T04 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 6 | Cont.Kick | DAMAGE_BASE | 0x0a | 0x2d | cont_kick | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T04 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 7 | Energy Wave | BASE_BEAM_OR_SUPPORT | 0x02 | 0x00 | energy_wave | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 14 | 0x02 | 0x2c | wave | power | T05 | ROM_STATIC_VERIFIED/ROM_SEQUENCE_VERIFIED/ROM_STATIC_VERIFIED |
| 8 | Energy Bomb | PROJECTILE_SCROLL | 0x05 | 0x0c | energy_bomb | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x17 | 0x2c | ball | power | T06 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 9 | Special Card | NO_ACTION_HANDLER | 0x00 | — | generic_support | 0:power_up | 0 | — | — | special | power | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/REMAKE_CANON |
| 10 | Masenko | BASE_BEAM_OR_SUPPORT | 0x02 | 0x04 | masenko | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 14 | 0x08 | 0x2d | ray | power | T05 | ROM_STATIC_VERIFIED/ROM_SEQUENCE_VERIFIED/ROM_STATIC_VERIFIED |
| 11 | Dunk Shot | DAMAGE_BASE | 0x0a | 0x2e | dunk_shot | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T04 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 12 | Kamehameha | BASE_BEAM_OR_SUPPORT | 0x02 | 0x03 | kamehameha | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 48 | 0x05 | 0x2c | ray | power | T05 | ROM_STATIC_VERIFIED/ROM_SEQUENCE_VERIFIED/ROM_STATIC_VERIFIED |
| 13 | S.Kamehameha | BASE_BEAM_OR_SUPPORT | 0x02 | 0x03 | kamehameha | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 48 | 0x11 | 0x2c | ray | power | T05 | ROM_STATIC_VERIFIED/ROM_SEQUENCE_VERIFIED/ROM_STATIC_VERIFIED |
| 14 | F.Kamehameha | BASE_BEAM_OR_SUPPORT | 0x02 | 0x03 | kamehameha | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 48 | 0x11 | 0x2d | ray | power | T10+T05 | ROM_STATIC_VERIFIED/ROM_SEQUENCE_VERIFIED/ROM_STATIC_VERIFIED |
| 15 | Sonic Kick | DAMAGE_BASE | 0x0a | 0x3d | sonic_kick | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T03 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 16 | Resurrection | NO_ACTION_HANDLER | 0x00 | — | generic_support | 0:power_up | 0 | 0x08 | 0x30 | power | power | T08 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 17 | S.Beam Can. | BASE_BEAM_OR_SUPPORT | 0x02 | 0x16 | special_beam_cannon | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 16 | 0x39 | 0x2d | ray | power | T05 | ROM_STATIC_VERIFIED/ROM_SEQUENCE_VERIFIED/ROM_STATIC_VERIFIED |
| 18 | F.Lightbomb | PROJECTILE_SCROLL | 0x05 | 0x11 | special_projectile | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x2d | 0x2d | special | power | T06 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 19 | Taiyoken | NO_ACTION_HANDLER | 0x00 | 0x26 | generic_support | 0:power_up | 0 | 0x02 | — | power | power | T12 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 20 | Misty KiWave | BASE_BEAM_OR_SUPPORT | 0x02 | 0x08 | finger_beam | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 8 | 0x05 | 0x2d | ray | power | T05 | ROM_STATIC_VERIFIED/ROM_SEQUENCE_VERIFIED/ROM_STATIC_VERIFIED |
| 21 | Destruct-Disk | SPECIAL_PROJECTILE_PATH | 0x07 | 0x12 | energy_disk | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 36 | 0x30 | 0x2c | disk | power | T07 | ROM_STATIC_VERIFIED/ROM_SEQUENCE_VERIFIED/ROM_STATIC_VERIFIED |
| 22 | S.Destruc-D. | SPECIAL_PROJECTILE_PATH | 0x07 | 0x12 | energy_disk | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 36 | 0x33 | 0x2e | disk | power | T07 | ROM_STATIC_VERIFIED/ROM_SEQUENCE_VERIFIED/ROM_STATIC_VERIFIED |
| 23 | Kaio Ken | BASE_BEAM_OR_SUPPORT | 0x02 | — | kaio_ken | 0:power_up | 0 | 0x02 | 0x2d | power | power | T08 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 24 | Spirit Bomb | SPECIAL_PROJECTILE_PATH | 0x07 | 0x22 | spirit_bomb | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 10 | 0x5a | 0x2c | ball | power | T06 | ROM_STATIC_VERIFIED/ROM_SEQUENCE_VERIFIED/ROM_STATIC_VERIFIED |
| 25 | Solid Shot | DAMAGE_BASE | 0x0a | 0x2f | solid_shot | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T04 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 26 | Teleport. | NO_ACTION_HANDLER | 0x00 | 0x28 | generic_support | 0:power_up | 0 | 0x04 | — | power | power | T12 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 27 | Sup.Saiyan-2 | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x35 | power | power | T08 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 28 | Sup.Saiyan-3 | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x35 | power | power | T08 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 29 | Tail | SCRIPTED_SPECIAL_OR_SUMMON | 0x0b | 0x3f | tail | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 26 | — | — | special | none | T08+T03 | ROM_HANDLER_VERIFIED/ROM_SEQUENCE_VERIFIED/REMAKE_CANON |
| 30 | Galick-Ho | BASE_BEAM_OR_SUPPORT | 0x02 | 0x05 | final_flash | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 16 | 0x0e | 0x2e | ray | power | T05 | ROM_STATIC_VERIFIED/ROM_SEQUENCE_VERIFIED/ROM_STATIC_VERIFIED |
| 31 | Big Bang Atk | PROJECTILE_SCROLL | 0x05 | 0x0f | big_bang_attack | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 16 | 0x27 | 0x2d | ball | power | T06 | ROM_STATIC_VERIFIED/ROM_SEQUENCE_VERIFIED/ROM_STATIC_VERIFIED |
| 32 | Final Flash | BASE_BEAM_OR_SUPPORT | 0x02 | 0x09 | final_flash | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 16 | 0x14 | 0x2c | ray | power | T05 | ROM_STATIC_VERIFIED/ROM_SEQUENCE_VERIFIED/ROM_STATIC_VERIFIED |
| 33 | Suicide | SPECIAL_SCRIPT | 0x08 | 0x2b | special_projectile | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | — | — | special | power | T08+T06 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 34 | Rising Kick | DAMAGE_BASE | 0x0a | 0x30 | rising_kick | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T03 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 35 | Burning Atk. | BURNING_ATTACK_RELEASE | 0x04 | 0x07 | burning_attack | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x08 | 0x2c | wave | power | T06 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 36 | Fin.Buster | PROJECTILE_SCROLL | 0x05 | 0x10 | burning_attack | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x24 | 0x2c | wave | power | T06 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 37 | Flash Punch | DAMAGE_BASE | 0x0a | 0x31 | flash_punch | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T03 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 38 | Kamekameha | BASE_BEAM_OR_SUPPORT | 0x02 | 0x03 | kamehameha | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 48 | 0x05 | 0x2c | ray | power | T05 | ROM_STATIC_VERIFIED/ROM_SEQUENCE_VERIFIED/ROM_STATIC_VERIFIED |
| 39 | Galactica D. | SPECIAL_PROJECTILE_PATH | 0x07 | 0x18 | special_projectile | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x3f | 0x2d | special | power | T09 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 40 | S.G.K.Atk. | PROJECTILE_SCROLL | 0x05 | 0x23 | special_projectile | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x63 | 0x2c | special | power | T10+T06 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 41 | V-ball Crash | BUU_BALL | 0x0c | 0x41 | vball_crash | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | 0x6c | 0x2c | rush | none | T10+T04 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 42 | Kiai | MULTI_ACTOR_SCRIPT | 0x0d | 0x40 | generic_support | 0:power_up | 0 | 0x01 | 0x2c | power | power | T09 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 43 | Atomic Break | DAMAGE_BASE | 0x0a | 0x32 | atomic_break | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T04 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 44 | Flash.Sword | BASE_BEAM_OR_SUPPORT | 0x02 | 0x19 | flash_sword | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x42 | 0x2d | sword | power | T07 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 45 | Barrier | NO_ACTION_HANDLER | 0x00 | 0x24 | generic_support | 0:power_up | 0 | 0x04 | 0x30 | power | power | T12 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 46 | N.Slasher | DAMAGE_BASE | 0x0a | 0x33 | n_slasher | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T03 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 47 | KiBlast Bomb | PROJECTILE_SCROLL | 0x05 | 0x0e | energy_bomb | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x21 | 0x2d | ball | power | T06 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 48 | Lightning C. | BASE_BEAM_OR_SUPPORT | 0x02 | 0x06 | burning_attack | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x0e | 0x2d | wave | power | T05 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 49 | Telekinesis | BEAM_RELEASE_FRAME_5 | 0x03 | 0x1a | special_projectile | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x45 | 0x2d | special | power | T09 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 50 | M.Soundwave | PROJECTILE_SCROLL | 0x05 | 0x17 | special_projectile | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x3c | 0x2c | special | power | T05 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 51 | Paralysis | MULTI_ACTOR_SCRIPT | 0x0d | 0x29 | generic_support | 0:power_up | 0 | 0x01 | — | power | power | T09 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 52 | Time Freeze | NO_ACTION_HANDLER | 0x00 | 0x2a | generic_support | 0:power_up | 0 | 0x01 | — | power | power | T12 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 53 | Breath | NO_ACTION_HANDLER | 0x00 | 0x27 | generic_support | 0:power_up | 0 | 0x04 | — | power | power | T12 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 54 | Eraser Can. | BEAM_RELEASE_FRAME_5 | 0x03 | 0x0a | special_projectile | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x14 | 0x2d | special | power | T05 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 55 | R.F.B.Atk. | DAMAGE_BASE | 0x0a | 0x34 | rfb_atk | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T04 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 56 | Crasher Ball | SPECIAL_PROJECTILE_PATH | 0x07 | 0x1b | special_projectile | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x48 | 0x2f | special | power | T06 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 57 | Purple Comet | MULTI_ACTOR_SCRIPT | 0x0d | 0x1c | special_projectile | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x27 | 0x2c | special | power | T10+T05 | ROM_HANDLER_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 58 | P.Comet Z | PURPLE_COMET_Z | 0x0e | 0x1c | pcomet_z | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | 0x6f | 0x2e | rush | none | T10+T04 | ROM_HANDLER_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 59 | Speed Up | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x33 | power | power | T08 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 60 | Mach Attack | DAMAGE_BASE | 0x0a | 0x35 | mach_attack | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T03 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 61 | Dynami.Punch | DAMAGE_BASE | 0x0a | 0x36 | dynami_punch | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T03 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 62 | Body Change | BEAM_RELEASE_FRAME_5 | 0x03 | 0x20 | special_projectile | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x51 | 0x2e | special | power | T05 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 63 | Finger Beam | BASE_BEAM_OR_SUPPORT | 0x02 | 0x01 | finger_beam | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 12 | 0x02 | 0x2c | ray | power | T05 | ROM_STATIC_VERIFIED/ROM_SEQUENCE_VERIFIED/ROM_STATIC_VERIFIED |
| 64 | Super E-Ball | SPECIAL_PROJECTILE_PATH | 0x07 | 0x21 | spirit_bomb | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x54 | 0x2d | ball | power | T06 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 65 | Grand Wave | PROJECTILE_SCROLL | 0x05 | 0x14 | final_flash | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x36 | 0x2c | ray | power | T07 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 66 | S.Dash Elbow | DAMAGE_BASE | 0x0a | 0x37 | sdash_elbow | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T03 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 67 | Eye Beam | BASE_BEAM_OR_SUPPORT | 0x02 | 0x02 | finger_beam | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x02 | 0x2d | ray | power | T05 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 68 | Lock On | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x30 | power | power | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 69 | Rocket Punch | PROJECTILE_SCROLL | 0x05 | 0x1d | rocket_punch | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | 0x4b | 0x2d | ball | none | T06 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 70 | Hell Flash | BASE_BEAM_OR_SUPPORT | 0x02 | 0x0b | final_flash | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x11 | 0x2d | ray | power | T05 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 71 | Crazy Rush | DAMAGE_BASE | 0x0a | 0x38 | crazy_rush | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T04 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 72 | Energy Slash | PROJECTILE_SCROLL | 0x05 | 0x15 | energy_disk | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x36 | 0x2d | disk | power | T07 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 73 | Energy Slice | SPECIAL_PROJECTILE_PATH | 0x07 | 0x13 | energy_disk | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x30 | 0x2d | disk | power | T07 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 74 | Attack No. 18 | DAMAGE_BASE | 0x0a | 0x39 | attack_18 | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T04 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 75 | Life Absorb | DAMAGE_BASE | 0x0a | 0x3e | life_absorb | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T03 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 76 | Energy Absorb | NO_ACTION_HANDLER | 0x00 | 0x25 | generic_support | 0:power_up | 0 | 0x04 | — | power | power | T12 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 77 | Cell Combo | DAMAGE_BASE | 0x0a | 0x3a | cell_combo | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T04 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 78 | Step Up Atk. | DAMAGE_BASE | 0x0a | 0x3b | step_up_atk | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T03 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 79 | Flesh Guard | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x32 | power | power | T08 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 80 | Potbelly Atk | PROJECTILE_ALT_SCROLL | 0x06 | 0x1f | potbelly_atk | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | 0x4e | 0x2f | rush | none | T03 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 81 | Crasher Buu | DAMAGE_BASE | 0x0a | 0x3c | crasher_buu | 0:idle > 12:attack_fwd > 38:attack_fwd > 66:attack_fwd > 80:idle | 0 | — | — | rush | none | T04 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/REMAKE_CANON |
| 82 | Sweet Beam | BASE_BEAM_OR_SUPPORT | 0x02 | 0x1e | spirit_bomb | 0:idle > 12:gather_power > 28:beam_charge > 54:beam_fire > 66:idle | 0 | 0x45 | 0x2f | ball | power | T05 | ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED/ROM_STATIC_VERIFIED |
| 83 | Bulma | MULTI_ACTOR_SCRIPT | 0x0d | — | generic_support | 0:power_up | 0 | 0x01 | 0x30 | power | power | T10 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 84 | Chaiotzu | MULTI_ACTOR_SCRIPT | 0x0d | — | generic_support | 0:power_up | 0 | 0x01 | 0x30 | power | power | T10 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 85 | Tien | SCRIPTED_SPECIAL_OR_SUMMON | 0x0b | — | generic_support | 0:power_up | 0 | 0x04 | — | power | power | T10+T12 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 86 | Yajirobe | SCRIPTED_SPECIAL_OR_SUMMON | 0x0b | — | generic_support | 0:power_up | 0 | 0x04 | — | power | power | T10+T12 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 87 | Kaio | MULTI_ACTOR_SCRIPT | 0x0d | — | generic_support | 0:power_up | 0 | 0x01 | — | power | power | T10 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 88 | Dende | NO_ACTION_HANDLER | 0x00 | — | generic_support | 0:power_up | 0 | 0x08 | 0x30 | power | power | T10 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 89 | Guru | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x35 | power | power | T10 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 90 | Hercule | SCRIPTED_SPECIAL_OR_SUMMON | 0x0b | — | generic_support | 0:power_up | 0 | 0x04 | — | power | power | T10+T12 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 91 | Supreme Kai | MULTI_ACTOR_SCRIPT | 0x0d | — | generic_support | 0:power_up | 0 | 0x01 | — | power | power | T10 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 92 | Kibito | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x35 | power | power | T10+T12 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 93 | Babidi | MULTI_ACTOR_SCRIPT | 0x0d | — | generic_support | 0:power_up | 0 | 0x01 | 0x30 | power | power | T10 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 94 | Dabura | SCRIPTED_SPECIAL_OR_SUMMON | 0x0b | — | generic_support | 0:power_up | 0 | 0x04 | 0x30 | power | power | T10+T09 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 95 | Yakon | MULTI_ACTOR_SCRIPT | 0x0d | — | generic_support | 0:power_up | 0 | 0x01 | 0x30 | power | power | T10 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 96 | Scouter | MULTI_ACTOR_SCRIPT | 0x0d | — | generic_support | 0:power_up | 0 | 0x01 | 0x30 | power | power | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 97 | Caps. Fridge | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x30 | item | support | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 98 | Stop Device | SCRIPTED_SPECIAL_OR_SUMMON | 0x0b | — | generic_support | 0:power_up | 0 | 0x04 | 0x30 | item | support | T11+T09 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 99 | Life Preser. | NO_ACTION_HANDLER | 0x00 | — | generic_support | 0:power_up | 0 | 0x08 | 0x30 | item | support | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 100 | Medical Mac. | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x30 | item | support | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 101 | Gravity Dev. | MULTI_ACTOR_SCRIPT | 0x0d | — | generic_support | 0:power_up | 0 | 0x01 | — | power | power | T11+T09 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 102 | Ene.Absorber | ENERGY_ABSORBER | 0x0f | — | generic_support | 0:power_up | 0 | 0x04 | — | power | power | T11+T12 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 103 | Sealed Ball | MULTI_ACTOR_SCRIPT | 0x0d | — | generic_support | 0:power_up | 0 | 0x01 | 0x30 | power | power | T11+T09 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 104 | Trunks Sword | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x31 | power | power | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 105 | Dabura Spear | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x31 | power | power | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 106 | Light Vest | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x33 | power | power | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 107 | Btl. Jacket | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x32 | power | power | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 108 | New-B Jacket | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x32 | power | power | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 109 | Sunglasses | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x30 | item | support | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 110 | Gamebomb | SCRIPTED_SPECIAL_OR_SUMMON | 0x0b | — | generic_support | 0:power_up | 0 | 0x04 | — | item | support | T11+T12 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 111 | Champ.Belt | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x30 | item | support | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 112 | H's Choco. | SCRIPTED_SPECIAL_OR_SUMMON | 0x0b | — | generic_support | 0:power_up | 0 | 0x04 | — | item | support | T11+T12 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 113 | Heart Virus | MULTI_ACTOR_SCRIPT | 0x0d | — | generic_support | 0:power_up | 0 | 0x01 | 0x30 | power | power | T11+T09 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 114 | Heart Medi. | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x01 | 0x30 | item | support | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 115 | Sandglass | MULTI_ACTOR_SCRIPT | 0x0d | — | generic_support | 0:power_up | 0 | 0x01 | 0x30 | item | support | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 116 | Naughty Book | SCRIPTED_SPECIAL_OR_SUMMON | 0x0b | — | generic_support | 0:power_up | 0 | 0x04 | 0x30 | item | support | T11 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 117 | Full Spirit | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x30 | power | power | T08 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 118 | Afterimage | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x30 | item | support | T08+T12 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 119 | Reading Ki | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x30 | power | power | T08 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 120 | Feint | BASE_BEAM_OR_SUPPORT | 0x02 | — | generic_support | 0:power_up | 0 | 0x02 | 0x30 | power | power | T08 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 121 | Endurance | NO_ACTION_HANDLER | 0x00 | — | generic_support | 0:power_up | 0 | 0x06 | 0x30 | power | power | T12 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 122 | Telepathy | NO_ACTION_HANDLER | 0x00 | — | generic_support | 0:power_up | 0 | 0x01 | 0x30 | power | power | T10+T12 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 123 | Foresight | NO_ACTION_HANDLER | 0x00 | — | generic_support | 0:power_up | 0 | 0x01 | 0x30 | power | power | T12 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 124 | Shockwave | NO_ACTION_HANDLER | 0x00 | — | generic_support | 0:power_up | 0 | 0x02 | 0x30 | power | power | T12 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |
| 125 | Avoiding | NO_ACTION_HANDLER | 0x00 | — | generic_support | 0:power_up | 0 | 0x04 | 0x30 | power | power | T12 | ROM_STATIC_VERIFIED/REMAKE_CANON/ROM_STATIC_VERIFIED |

## Dynamic Boundary

Los campos anteriores son canon estático derivado de ROM/decomp y runtime. Los siguientes NO se bloquean ni se inventan aquí:

- BASE_X / BASE_Y
- anchors
- slot binding
- FSM especiales incompletos
- coordenadas absolutas

Fuente de datos: `src/data/cards.ts`, `src/data/romCardData.ts`, `src/data/cardsCinematic.ts`, `src/battle/actionProfiles.ts`, `src/battle/animationCanon.ts`, `src/data/romAnimationData.ts`.
