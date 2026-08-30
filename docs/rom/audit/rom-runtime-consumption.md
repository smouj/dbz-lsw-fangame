# ROM → Runtime Consumption Scoreboard

## Estados finales (125 cartas)

| Estado | Cartas |
| --- | --- |
| ROM_FULL | 0 |
| ROM_MIXED | 84 |
| LEGACY | 36 |
| PENDING_DYNAMIC | 0 |
| NOT_APPLICABLE | 5 |

> **ROM_FULL = 0** significa que ninguna carta cierra hoy el ciclo completo: toda carta ROM-backed arrastra al menos un cue PENDING.

## Consumo de evidencia ROM ya desentrañada

| Métrica | Valor |
| --- | --- |
| Frame sequences timed | 224 |
| Frame instances timed | 3928 |
| Cinematic beats correctlyUsed | 27/36 (75%) (9 incorrect) |
| Scene cues CONSUMED | 49/60 (82%) |
| Scene cues TRACE_ONLY / BRIDGE / PENDING | 3 / 1 / 7 |

## Implementaciones manuales que quedan (gap real)

| Métrica | Valor |
| --- | --- |
| Manual scene visibility paths (hardcoded) | 8 |
| Hardcoded action positions | 4 |
| Legacy buildTimeline routes | 36 |
| Camera cues generated / consumed | 12 / 11 |
| ROM-backed cards (bridge) | 84 (strict 0) |
| Cues generated / consumed / dropped | 579 / 579 / 100 |
| PENDING estático (cerrable) / dinámico (congelado) | 95 / 5 |
| Cards con proyectil procedural | 0 |

## ROM_MIXED desglose por causa

| Causa | Cartas |
| --- | --- |
| PENDING estático (cerrable) | 71 |
| Sin efecto visible (REMAKE_FALLBACK) | 14 |
| PENDING dinámico (congelado) | 5 |


## Matriz por carta (125)

ID | Carta | Tipo | Handler | Kind | Evid | Compiler | Runtime | Frames | Ticks | Scene | Motion | Camera | FX/BG | Cues | Estado | Razón
--- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---
1 | 3 stage atk. | command | 0x00 | NONE | C | LEGACY | LEGACY | NO_ANIMATION | 0 | CLEAN | NONE | CONSUMED | N/A | 0/0/0 | NOT_APPLICABLE | sin programa de presentación ROM (kind NONE)
2 | 4 stage atk. | command | 0x00 | NONE | C | LEGACY | LEGACY | NO_ANIMATION | 0 | CLEAN | NONE | CONSUMED | N/A | 0/0/0 | NOT_APPLICABLE | sin programa de presentación ROM (kind NONE)
3 | 5 stage atk. | command | 0x00 | NONE | C | LEGACY | LEGACY | NO_ANIMATION | 0 | CLEAN | NONE | CONSUMED | N/A | 0/0/0 | NOT_APPLICABLE | sin programa de presentación ROM (kind NONE)
4 | 6 stage atk. | command | 0x00 | NONE | C | LEGACY | LEGACY | NO_ANIMATION | 0 | CLEAN | NONE | CONSUMED | N/A | 0/0/0 | NOT_APPLICABLE | sin programa de presentación ROM (kind NONE)
5 | Cont.Punch | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 255 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
6 | Cont.Kick | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 192 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
7 | Energy Wave | beam | 0x02 | BEAM_BASE | P | ROM | MIXED | ROM_TICKS | 30 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
8 | Energy Bomb | beam | 0x05 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 30 | PENDING | ROM | CONSUMED | PENDING | 5/5/2 | ROM_MIXED | 2 PENDING estático (cerrable)
9 | Special Card | special | 0x00 | NONE | C | LEGACY | LEGACY | NO_ANIMATION | 0 | PENDING | NONE | PARTIAL | PENDING | 0/0/0 | NOT_APPLICABLE | sin programa de presentación ROM (kind NONE)
10 | Masenko | beam | 0x02 | BEAM_BASE | P | ROM | MIXED | ROM_TICKS | 148 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
11 | Dunk Shot | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 163 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
12 | Kamehameha | beam | 0x02 | BEAM_BASE | C | ROM | MIXED | ROM_TICKS | 450 | PENDING | ROM | CONSUMED | PENDING | 11/11/1 | ROM_MIXED | 1 PENDING estático (cerrable)
13 | S.Kamehameha | beam | 0x02 | BEAM_BASE | P | ROM | MIXED | ROM_TICKS | 450 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
14 | F.Kamehameha | beam | 0x02 | BEAM_BASE | P | ROM | MIXED | ROM_TICKS | 450 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
15 | Sonic Kick | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 233 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
16 | Resurrection | support | 0x00 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
17 | S.Beam Can. | beam | 0x02 | BEAM_BASE | P | ROM | MIXED | ROM_TICKS | 156 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
18 | F.Lightbomb | beam | 0x05 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 85 | PENDING | ROM | CONSUMED | PENDING | 5/5/2 | ROM_MIXED | 2 PENDING estático (cerrable)
19 | Taiyoken | defense | 0x00 | DEFENSE_RULE | C | LEGACY | LEGACY | LEGACY_FPS | 549 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:DEFENSE_RULE
20 | Misty KiWave | beam | 0x02 | BEAM_BASE | P | ROM | MIXED | ROM_TICKS | 77 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
21 | Destruct-Disk | beam | 0x07 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 316 | PENDING | ROM | CONSUMED | PENDING | 6/6/2 | ROM_MIXED | 2 PENDING estático (cerrable)
22 | S.Destruc-D. | beam | 0x07 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 316 | PENDING | ROM | CONSUMED | PENDING | 6/6/2 | ROM_MIXED | 2 PENDING estático (cerrable)
23 | Kaio Ken | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
24 | Spirit Bomb | beam | 0x07 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 85 | PENDING | ROM | CONSUMED | PENDING | 6/6/2 | ROM_MIXED | 2 PENDING estático (cerrable)
25 | Solid Shot | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 252 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
26 | Teleport. | defense | 0x00 | DEFENSE_RULE | P | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:DEFENSE_RULE
27 | Sup.Saiyan-2 | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
28 | Sup.Saiyan-3 | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
29 | Tail | damage | 0x0b | SPECIAL_HANDLER | C/DYN | ROM | MIXED | ROM_TICKS | 256 | CLEAN | NONE | PARTIAL | N/A | 3/3/3 | ROM_MIXED | 2 PENDING estático (cerrable) · 1 PENDING dinámico (congelado)
30 | Galick-Ho | beam | 0x02 | BEAM_BASE | P | ROM | MIXED | ROM_TICKS | 152 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
31 | Big Bang Atk | beam | 0x05 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 150 | PENDING | ROM | CONSUMED | PENDING | 5/5/2 | ROM_MIXED | 2 PENDING estático (cerrable)
32 | Final Flash | beam | 0x02 | BEAM_BASE | P | ROM | MIXED | ROM_TICKS | 156 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
33 | Suicide | beam | 0x08 | SPECIAL_HANDLER | P/DYN | ROM | MIXED | ROM_TICKS | 162 | PENDING | NONE | CONSUMED | PENDING | 2/2/2 | ROM_MIXED | 1 PENDING estático (cerrable) · 1 PENDING dinámico (congelado)
34 | Rising Kick | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 181 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
35 | Burning Atk. | beam | 0x04 | BEAM_VARIANT | P | ROM | MIXED | ROM_TICKS | 252 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
36 | Fin.Buster | beam | 0x05 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 200 | PENDING | ROM | CONSUMED | PENDING | 5/5/2 | ROM_MIXED | 2 PENDING estático (cerrable)
37 | Flash Punch | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 259 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
38 | Kamekameha | beam | 0x02 | BEAM_BASE | P | ROM | MIXED | ROM_TICKS | 450 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
39 | Galactica D. | beam | 0x07 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 164 | PENDING | ROM | CONSUMED | PENDING | 6/6/2 | ROM_MIXED | 2 PENDING estático (cerrable)
40 | S.G.K.Atk. | beam | 0x05 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 154 | PENDING | ROM | CONSUMED | PENDING | 5/5/2 | ROM_MIXED | 2 PENDING estático (cerrable)
41 | V-ball Crash | damage | 0x0c | SPECIAL_HANDLER | P/DYN | ROM | MIXED | ROM_TICKS | 502 | CLEAN | NONE | PARTIAL | N/A | 6/6/5 | ROM_MIXED | 4 PENDING estático (cerrable) · 1 PENDING dinámico (congelado)
42 | Kiai | support | 0x0d | SPECIAL_HANDLER | P/DYN | ROM | REMAKE_FALLBACK | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 7/7/0 | ROM_MIXED | sin efecto visible
43 | Atomic Break | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 312 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
44 | Flash.Sword | beam | 0x02 | BEAM_BASE | P | ROM | MIXED | ROM_TICKS | 78 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
45 | Barrier | defense | 0x00 | DEFENSE_RULE | C | LEGACY | LEGACY | LEGACY_FPS | 549 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:DEFENSE_RULE
46 | N.Slasher | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 267 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
47 | KiBlast Bomb | beam | 0x05 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 75 | PENDING | ROM | CONSUMED | PENDING | 5/5/2 | ROM_MIXED | 2 PENDING estático (cerrable)
48 | Lightning C. | beam | 0x02 | BEAM_BASE | P | ROM | MIXED | ROM_TICKS | 146 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
49 | Telekinesis | beam | 0x03 | BEAM_VARIANT | P | ROM | MIXED | ROM_TICKS | 176 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
50 | M.Soundwave | beam | 0x05 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 126 | PENDING | ROM | CONSUMED | PENDING | 5/5/2 | ROM_MIXED | 2 PENDING estático (cerrable)
51 | Paralysis | support | 0x0d | SPECIAL_HANDLER | P/DYN | ROM | REMAKE_FALLBACK | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 7/7/0 | ROM_MIXED | sin efecto visible
52 | Time Freeze | defense | 0x00 | DEFENSE_RULE | P | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:DEFENSE_RULE
53 | Breath | defense | 0x00 | DEFENSE_RULE | C | LEGACY | LEGACY | LEGACY_FPS | 366 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:DEFENSE_RULE
54 | Eraser Can. | beam | 0x03 | BEAM_VARIANT | P | ROM | MIXED | ROM_TICKS | 195 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
55 | R.F.B.Atk. | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 238 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
56 | Crasher Ball | beam | 0x07 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 172 | PENDING | ROM | CONSUMED | PENDING | 6/6/2 | ROM_MIXED | 2 PENDING estático (cerrable)
57 | Purple Comet | beam | 0x0d | SPECIAL_HANDLER | C/DYN | ROM | MIXED | ROM_TICKS | 944 | PENDING | NONE | CONSUMED | PENDING | 4/4/3 | ROM_MIXED | 2 PENDING estático (cerrable) · 1 PENDING dinámico (congelado)
58 | P.Comet Z | damage | 0x0e | SPECIAL_HANDLER | C/DYN | ROM | MIXED | ROM_TICKS | 944 | CLEAN | NONE | PARTIAL | N/A | 4/4/3 | ROM_MIXED | 2 PENDING estático (cerrable) · 1 PENDING dinámico (congelado)
59 | Speed Up | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
60 | Mach Attack | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 238 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
61 | Dynami.Punch | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 291 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
62 | Body Change | beam | 0x03 | BEAM_VARIANT | P | ROM | MIXED | ROM_TICKS | 166 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
63 | Finger Beam | beam | 0x02 | BEAM_BASE | P | ROM | MIXED | ROM_TICKS | 26 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
64 | Super E-Ball | beam | 0x07 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 261 | PENDING | ROM | CONSUMED | PENDING | 6/6/2 | ROM_MIXED | 2 PENDING estático (cerrable)
65 | Grand Wave | beam | 0x05 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 77 | PENDING | ROM | CONSUMED | PENDING | 5/5/2 | ROM_MIXED | 2 PENDING estático (cerrable)
66 | S.Dash Elbow | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 141 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
67 | Eye Beam | beam | 0x02 | BEAM_BASE | P | ROM | MIXED | ROM_TICKS | 30 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
68 | Lock On | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
69 | Rocket Punch | damage | 0x05 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 82 | CLEAN | ROM | PARTIAL | N/A | 5/5/2 | ROM_MIXED | 2 PENDING estático (cerrable)
70 | Hell Flash | beam | 0x02 | BEAM_BASE | P | ROM | MIXED | ROM_TICKS | 113 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
71 | Crazy Rush | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 213 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
72 | Energy Slash | beam | 0x05 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 154 | PENDING | ROM | CONSUMED | PENDING | 5/5/2 | ROM_MIXED | 2 PENDING estático (cerrable)
73 | Energy Slice | beam | 0x07 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 79 | PENDING | ROM | CONSUMED | PENDING | 6/6/2 | ROM_MIXED | 2 PENDING estático (cerrable)
74 | Attack No. 18 | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 353 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
75 | Life Absorb | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 430 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
76 | Energy Absorb | defense | 0x00 | DEFENSE_RULE | C | LEGACY | LEGACY | LEGACY_FPS | 183 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:DEFENSE_RULE
77 | Cell Combo | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 244 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
78 | Step Up Atk. | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 190 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
79 | Flesh Guard | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
80 | Potbelly Atk | damage | 0x06 | PROJECTILE_SCROLL | P | ROM | MIXED | ROM_TICKS | 183 | CLEAN | ROM | PARTIAL | N/A | 5/5/2 | ROM_MIXED | 2 PENDING estático (cerrable)
81 | Crasher Buu | damage | 0x0a | STANDARD_DAMAGE | P | ROM | MIXED | ROM_TICKS | 220 | CLEAN | ROM | PARTIAL | N/A | 8/8/1 | ROM_MIXED | 1 PENDING estático (cerrable)
82 | Sweet Beam | beam | 0x02 | BEAM_BASE | P | ROM | MIXED | ROM_TICKS | 79 | PENDING | ROM | CONSUMED | PENDING | 7/7/1 | ROM_MIXED | 1 PENDING estático (cerrable)
83 | Bulma | support | 0x0d | SPECIAL_HANDLER | C/DYN | ROM | REMAKE_FALLBACK | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 7/7/0 | ROM_MIXED | sin efecto visible
84 | Chaiotzu | support | 0x0d | SPECIAL_HANDLER | C/DYN | ROM | REMAKE_FALLBACK | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 7/7/0 | ROM_MIXED | sin efecto visible
85 | Tien | support | 0x0b | SPECIAL_HANDLER | C/DYN | ROM | MIXED | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 9/9/1 | ROM_MIXED | 1 PENDING estático (cerrable)
86 | Yajirobe | support | 0x0b | SPECIAL_HANDLER | C/DYN | ROM | MIXED | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 9/9/1 | ROM_MIXED | 1 PENDING estático (cerrable)
87 | Kaio | support | 0x0d | SPECIAL_HANDLER | C/DYN | ROM | REMAKE_FALLBACK | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 7/7/0 | ROM_MIXED | sin efecto visible
88 | Dende | support | 0x00 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
89 | Guru | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
90 | Hercule | support | 0x0b | SPECIAL_HANDLER | C/DYN | ROM | MIXED | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 9/9/1 | ROM_MIXED | 1 PENDING estático (cerrable)
91 | Supreme Kai | support | 0x0d | SPECIAL_HANDLER | C/DYN | ROM | REMAKE_FALLBACK | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 7/7/0 | ROM_MIXED | sin efecto visible
92 | Kibito | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
93 | Babidi | support | 0x0d | SPECIAL_HANDLER | C/DYN | ROM | REMAKE_FALLBACK | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 7/7/0 | ROM_MIXED | sin efecto visible
94 | Dabura | support | 0x0b | SPECIAL_HANDLER | C/DYN | ROM | MIXED | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 9/9/1 | ROM_MIXED | 1 PENDING estático (cerrable)
95 | Yakon | support | 0x0d | SPECIAL_HANDLER | C/DYN | ROM | REMAKE_FALLBACK | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 7/7/0 | ROM_MIXED | sin efecto visible
96 | Scouter | support | 0x0d | SPECIAL_HANDLER | C/DYN | ROM | REMAKE_FALLBACK | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 7/7/0 | ROM_MIXED | sin efecto visible
97 | Caps. Fridge | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
98 | Stop Device | support | 0x0b | SPECIAL_HANDLER | C/DYN | ROM | MIXED | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 9/9/1 | ROM_MIXED | 1 PENDING estático (cerrable)
99 | Life Preser. | support | 0x00 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
100 | Medical Mac. | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
101 | Gravity Dev. | support | 0x0d | SPECIAL_HANDLER | C/DYN | ROM | REMAKE_FALLBACK | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 7/7/0 | ROM_MIXED | sin efecto visible
102 | Ene.Absorber | support | 0x0f | SUPPORT_OR_FIELD_EFFECT | C | ROM | REMAKE_FALLBACK | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 4/4/1 | ROM_MIXED | 1 PENDING estático (cerrable) · sin efecto visible
103 | Sealed Ball | support | 0x0d | SPECIAL_HANDLER | C/DYN | ROM | REMAKE_FALLBACK | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 7/7/0 | ROM_MIXED | sin efecto visible
104 | Trunks Sword | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
105 | Dabura Spear | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
106 | Light Vest | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
107 | Btl. Jacket | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
108 | New-B Jacket | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
109 | Sunglasses | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
110 | Gamebomb | support | 0x0b | SPECIAL_HANDLER | C/DYN | ROM | MIXED | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 9/9/1 | ROM_MIXED | 1 PENDING estático (cerrable)
111 | Champ.Belt | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
112 | H's Choco. | support | 0x0b | SPECIAL_HANDLER | C/DYN | ROM | MIXED | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 9/9/1 | ROM_MIXED | 1 PENDING estático (cerrable)
113 | Heart Virus | support | 0x0d | SPECIAL_HANDLER | C/DYN | ROM | REMAKE_FALLBACK | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 7/7/0 | ROM_MIXED | sin efecto visible
114 | Heart Medi. | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
115 | Sandglass | support | 0x0d | SPECIAL_HANDLER | C/DYN | ROM | REMAKE_FALLBACK | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 7/7/0 | ROM_MIXED | sin efecto visible
116 | Naughty Book | support | 0x0b | SPECIAL_HANDLER | C/DYN | ROM | MIXED | ROM_TICKS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 9/9/1 | ROM_MIXED | 1 PENDING estático (cerrable)
117 | Full Spirit | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
118 | Afterimage | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
119 | Reading Ki | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
120 | Feint | support | 0x02 | SUPPORT_OR_FIELD_EFFECT | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:SUPPORT_OR_FIELD_EFFECT
121 | Endurance | defense | 0x00 | DEFENSE_RULE | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:DEFENSE_RULE
122 | Telepathy | defense | 0x00 | DEFENSE_RULE | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:DEFENSE_RULE
123 | Foresight | defense | 0x00 | DEFENSE_RULE | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:DEFENSE_RULE
124 | Shockwave | defense | 0x00 | DEFENSE_RULE | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:DEFENSE_RULE
125 | Avoiding | defense | 0x00 | DEFENSE_RULE | C | LEGACY | LEGACY | LEGACY_FPS | 0 | CLEAN | NONE | PARTIAL | CONSUMED | 0/0/0 | LEGACY | BRIDGE_NOT_ELIGIBLE:DEFENSE_RULE
