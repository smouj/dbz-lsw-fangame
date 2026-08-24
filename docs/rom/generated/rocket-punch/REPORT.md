# R4 — ROCKET PUNCH $05 FSM (ROM_STATIC_VERIFIED)

**Fecha**: 2026-08-24 · **Método**: desensamblado Bank00/03/07E + bytes crudos ROM (verificación de labels mgbdis)
**Fuente ROM**: `dbz-lsw-usa.gbc` · **Git**: main @ 0a489c7a

---

## Veredicto

**Rocket Punch (card #? handler $05) = el MOTOR BEAM común (Bank03:$5776) con un PERFIL DE LANZAMIENTO propio** (Bank03:$5B38 → init $5B42).

La FSM completa del Rocket = los estados CA06 1..0x53 del motor + el perfil. NO tiene estados propios adicionales (a diferencia de $0D/$0E que tienen dispatchers propios).

---

## 1. Estructura del handler

```
Bank03:$5B38 (handler $05):
    ld a, [CA06]
    cp $14
    jr z, jr_003_5B42      ; CA06 == 0x14 → el INIT del perfil Rocket
    jp Jump_003_5776        ; cualquier otro estado → el motor Beam base
```

El patrón "si state != $14 → motor base" es compartido por $03/$04/$05/$06 (los perfiles);
$02 (Kamehameha) es el propio motor (su init es el estado 0x14 de $5776 = $5815).

## 2. Perfil de lanzamiento del Rocket (init $5B42)

Secuencia de ENTRADAS escritas en el buffer del actor (c7ce/c7d1 vía `3e57`/`3e64`,
helpers Bank7E que escriben `[tipo, datos...]`):

| Entrada | Helper | Datos | Semántica |
|---|---|---|---|
| `[01, c3c6, 06, c3c7, A0]` | `3ebd` → $72A4 | d=6, e=0xA0 | posicionar objeto (X=6, Y=160) |
| `[06, c3c6, 04]` | `3ee1` → $72DF | e=4 | **releaseSyncFrame = 4** (igual que Kamehameha) |
| `[0D, C2D0, C2D1, b]` | `3f30` → $734B | de = coords rival | objetivo |
| `[0C, 00]` | `3f24` → $733C | e=0 | parámetro |
| `[0E, FA, 13, 00]` | `3f3c` → $735E | d=-6 (FA), c=19 | **SCREEN MOTION -6px × 19t** ← firma del Rocket |
| `[0F]` | `3f48` → $7371 | — | flag (screen-path/impacto) |
| `[07, 3C, 00]` | `3f18` → $732B | c=60 | WAIT 60 ticks (≈1.005s) |

**Diferencia vs Kamehameha ($02, init $5815)**: el Rocket añade `[0E: -6×19t]` + `[0F]`.
El Kamehameha: `[01][06:4][0D][0C:0][07:60]` — sin screen motion ni flag.

## 3. FSM del motor (Jump_003_5776 — común a $02-$07)

| CA06 | Handler | Descripción |
|---|---|---|
| 1 | jr_003_57da | PREPARE: reset c7d4 + setup (3e92 bc=0x1E) |
| 2 | jr_003_57ec | PALETTE_TRANSITION (07f4: bc=8, e=0x10, d=2) |
| 3 | jr_003_5802 | WAIT (080c) + 3408 |
| 4 | Jump_003_580b | RELEASE → CA06=0x14 |
| 0x14 | Jump_003_5815 | **INIT** (perfil — el $02 aquí; el $05/$06 tienen el suyo) |
| 0x15 | Jump_003_587a | PALETTE_TRANSITION 2 (07f4: bc=0x310) + wait (3e5e) |
| 0x16 | Jump_003_5891 | ACTION_OBJECT draw (0938; c3c6=CA59>>1) |
| 0x17 | Jump_003_58a6 | **RESULTADO**: 3aa5 + check CA02 + carta atacante (39b3); si card==0x3E (62) → CA53 0/2/4 → CA7F=34b8(defensor)>>1 + CA53=0; CA53 1/3 → CA7F=0 |
| 0x18 | Jump_003_58eb | **BRANCH CA53**: 0→0x32 HIT · 1→0x3C MISS · 2→0x46 PARTIAL · otro→0x50 SPECIAL |
| 0x32 | Jump_003_5912 | HIT: screen [0E:-6×16t] + audio (3f60 CA54) + macro (CA54+0x2B: hit low $2B/high $2C) |
| 0x33 | Jump_003_5949 | wait HIT → CA06=0 |
| 0x3C | Jump_003_5957 | MISS: screen [0E:-6×8t] + macro $34 + screen [0E:-6×30t] + macro $35 |
| 0x3D | Jump_003_5949 | wait MISS → CA06=0 |
| 0x46 | Jump_003_598f | PARTIAL: screen [0E:-6×16t] + audio + macro (CA54+0x32) |
| 0x47 | Jump_003_5949 | wait PARTIAL → CA06=0 |
| 0x50 | Jump_003_59c6 | SPECIAL (CA53=3): defensor (c3c6=1, d=8, e=0xA0) + screen [0E:-6×16t] + roll==0x4B → skip audio + 3ed5 + wait |
| 0x51 | Jump_003_5a2b | wait SPECIAL: CA53==4 → stay; else CA06=0 |
| 0x52 | Jump_003_5a41 | DAMAGE APPLY: CA81=1 + CA0A=CA5A + 34b8 + 3239 |
| 0x53 | Jump_003_5a55 | CLEANUP: 3239 + wait CA03 + 34c7 + CA7F=0 + CA06=0 |

**Flujo**: 1→2→3→4→0x14(perfil)→0x15→0x16→0x17(roll/daño)→0x18(branch)→
{0x32|0x3C|0x46|0x50}→wait→0x52(aplicar daño)→0x53(cleanup)→fin.

## 4. Tabla de perfiles ($02-$07)

| Handler | releaseSyncFrame (entrada 06) | screen motion (entrada 0E) | flag 0F | init |
|---|---|---|---|---|
| $02 Kamehameha | 4 | — | — | $5815 |
| $03 (frame 5) | 5 | — | — | $5A75 |
| $04 Burning Attack | 17 | ? | ? | (init propio) |
| **$05 Rocket Punch** | **4** | **-6 × 19t** | **sí** | **$5B42** |
| $06 Potbelly | 7 | -6 × 16t | sí | $5BA8 |
| $07 (path) | ? | WAIT2→FX→WAIT4→SCREEN_PATH | — | $5DFE (per corpus) |

## 5. Detalles de resolución

- **Daño del beam**: el estado 0x17 calcula CA7F SOLO para el card 62 (handler $03, acc 80, cc 20);
  el resto de beams aplican el daño en el estado 0x52 (34b8 → daño base del defensor, 3239 → aplicar).
  CA53=0/2/4 → daño (0x17: `34b8; srl b; rr c` = daño>>1 → CA7F; CA53=0). CA53=1/3 → CA7F=0.
- **MISS path** ($3C): screen -6×8t → macro $34 → screen -6×30t → macro $35 (los macros del miss).
- **SPECIAL path** ($50): el defensor se reposiciona (d=8, e=0xA0), screen -6×16t,
  roll (39b3) == 0x4B → se omite el audio; CA53=4 (ENERGY_ABSORB) mantiene el estado 0x51.
- **Macros del impacto**: HIT = CA54+0x2B (low $2B / high $2C, variantes $17/$18 — confirma corpus lote 7);
  PARTIAL = CA54+0x32; MISS = $34/$35 fijos.

## 6. Correlación con el corpus

- ✅ "Beam $02-$07 = un motor + LaunchProfiles" (lote 7 §2) — confirmado: `if state != $14 → jump $5776`.
- ✅ "releaseSyncFrame: $02=4, $03=5, $04=17, $06=7" — confirmado; **añadido $05=4**.
- ✅ "$05=$5B38 (screen -6×19t)" — confirmado: entrada `[0E: FA, 13]` = -6px × 19t.
- ✅ "$06 frame 7, screen -6×16t" — confirmado: e=7, `[0E: FA, 10]`.
- ✅ "Kamehameha: release frame 4, WAIT 60t" — confirmado: e=4, `[07: 3C]`.
- ✅ "hit low $2B / high $2C" — confirmado: macro CA54+0x2B.

## 7. Notas del método

- El mgbdis NO etiqueta los bloques Bank7E $72A4-$7391 (los escritores de entradas del perfil);
  se verificaron con los bytes crudos del ROM: cada helper = `call 3e57; push hl; call 3e64; ld a, <tipo>; ld [hl+], a; <datos>; pop hl; inc [hl]; ret`.
- El buffer del perfil = c7ce (actor 0) / c7d1 (actor 1) — los "profile records" que el runtime de presentación interpreta.

---

*R4 cerrado: docs/rom/generated/rocket-punch/REPORT.md. El Potbelly $06 comparte el motor (perfil: release 7 + screen -6×16t + flag 0F) — ver tabla §4.*
