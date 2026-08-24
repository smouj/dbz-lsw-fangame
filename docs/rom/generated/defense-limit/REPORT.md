# R5 — DEFENSE LIMIT ROM CONTRACT (ROM_STATIC_VERIFIED)

**Fecha**: 2026-08-24 · **Método**: desensamblado Bank00/01/07E + evidencia dinámica (driver mGBA, gohan-battle-base)
**Fuente ROM**: `dbz-lsw-usa.gbc` (MBC5, 128 bancos) · **Git**: main @ d281cdf8

---

## Veredicto

| Componente | Estado |
|---|---|
| selector route | ✅ PASS |
| source Limit data | ✅ PASS |
| availability gates | ✅ PASS |
| commit boundary | ✅ PASS |
| cost / consumption | ✅ PASS |
| defense state writes | ✅ PASS |
| incoming attack consumer | ✅ PASS |
| effect | ✅ PASS |
| Presentation worker/macros | ✅ PASS (de la carta) |
| resource/FX/palette path | ✅ PASS (de la carta) |
| cleanup | ✅ PASS |
| invented mechanics | 0 |
| unexplained Engine mutation | 0 |

**Defense LIMIT = la carta juega por el MISMO flujo que JOIN, con 3 diferencias demostradas:**
1. **Fuente** = slots de límite del battle block (no la mano).
2. **Gate extra** = `powerWindowCounter (battleStat+4) ≠ 0` — un LIMIT requiere ventana de poder (Gather/CHARA).
3. **Sin consumo de mano** — el límite es reutilizable (se conserva en el bloque).

---

## 1. Selector (cadena de addresses reproducible)

```
DEFENSE MENU (C0A0=6)
├─ CA03 = 0x04  → Bank01:jr_001_4fcc  (estado menú)
│    ├─ input: Bank01:Jump_001_537c → jr_001_53be (test A/B/START/SELECT)
│    │    └─ A (C2D0=4) → srl-chain → jr_001_53e0 (A-handler)
│    │         CA0A=1 · CC0C=CA36 · call $2B9C (lee el límite) · C2D0=1 · CA07=0
│    ├─ check: C2D0==1 → jr_001_4fde  (dispatch CA36)
│    │    CA36=0 (LIMIT) → CA03=0x0A
│    │    CA36=1 (JOIN)  → CA03=0x14
│    │    CA36=2 (BASIC) → CA03=0x1E
│    │    CA36=3         → CA03=0x28 (inalcanzable en defensa: cursor cicla 0..2)
│    └─ cursor: RIGHT/LEFT (CA07=5/4 → Jump_001_5443 / Call_000_24cd) cicla 0↔1↔2
│         (RIGHT se DETIENE en BASIC — menú defensivo NO tiene CHARA — verificado)
├─ CA03=0x0A → Jump_001_500a (select-open: Call_001_5c0f + wait CA05 + CA07=2)
├─ CA03=0x0B → Jump_001_5022 (select-wait + CONFIRM)
│    ├─ input: Jump_001_537c  (mismo scan)
│    ├─ release check: 2fce(CA07) != 0 → ret
│    ├─ C2D0==1 → Bank01:0x5036 (confirm path)
│    └─ else → CA36=0, CA03=1 (fallback)
```

**Input keys**: `Call_001_5960` lee el shadow joypad C012 → `C2D0 = 4 (A) / 2 (B) / 8 (START) / 0`; D-pad vía C013/CA37.

## 2. Fuente del dato LIMIT

- **Battle block del jugador** = `0xCB1A` (roster +0..2, **límites +3..17**, deck +18..37, drawIndex +38, mano +39..44).
- Registros de límite = **5 bytes** (`id 0x00 0x00 0x00 0x00` — solo el byte 0 se usa; el resto padding/reservado).
- El A-handler lee el límite: `Call_000_2b9c` → `HL = battleBlock + 3 + CC0B*5 + CC0C` → `CC01` (el id de la carta).
- `CC0B` = índice del miembro seleccionado (jugador); `CC0C` = cursor del select (0..2).
- El select copia el registro de carta completo (16B de Bank11:$4320 + mask) a `CC0D`.
- Ejemplo verificado: Gohan (block 0xCB1A) límites `[01 ..]`; Piccolo `[03 0F 11]`; parcheo `CB1D=0x53` → el select muestra "Stare Down" (carta 83).

## 3. Availability — gates en orden (todos verificados)

**Validador**: `Bank01:$7B96` (vía `Call_000_3c88` — wrapper con bankswitch + restaura CC01 + refresh 2aa3):

| Gate | Check | Rechazo |
|---|---|---|
| Coste | `cost (CC0D+4) < CC+1` donde CC = `battleStat+2` = `CA3E` (2fd5: `CA3C + (CA0A-1)*8`) | `C2D0=1` |
| Compat | máscara 48-bit `CC0D+9..14` — bit de la forma activa: `bit ((card-1)&7)+1` del byte `(card-1)>>3` | `C2D0=2` |
| Categoría | `CA0C`: 0 (ofensivo) → cat 5 (DEFENSE) rechazada; ≠0 (defensivo) → cat <4 rechazada | `C2D0=3` |
| **POWER WINDOW** | `battleStat+4` = **powerWindowCounter** (`CA40`) — `and a; ret z` si 0 | **rechazo silencioso** |

El gate del powerWindow está SOLO en el confirm LIMIT (`Bank01:0x5048`: `call 2fd5; ld bc,4; add hl,bc; ld a,[hl]; and a; ret z`).
**Empírico**: Gohan en la fase defensiva tiene `CA40=0` → el LIMIT nunca confirma aunque la carta pase todos los demás gates.
Con `CA40=5` (nivel Gather) → el mismo select CONFIRMA en el mismo frame.

Nota: la validación corre 2 veces — al abrir el select (muestra coste/disponibilidad → C2D1/C2D2) y en el confirm.

## 4. Commit boundary

```
A en el select (CA03=0x0B)
→ Bank01:0x5036:
     CA0A=1
     CA57 = CC01            (la carta del límite)
     call 3c88              (validador — reject si C2D0 != 0)
     call 2fd5; +4; and a; ret z   (gate powerWindowCounter)
     CA55=1                 (acción = CARD)
     CA03=0x5A              (¡COMMIT!)
→ 0x5B (Jump_001_5170: 30b1) → 0x5C (Jump_001_5178: 0cf5 → C0A0=8) → C0A0=9 → 0x1E (rush) → 0x14 (presentación)
```

**Primera escritura de estado autoritativa** = `CA55=1` + `CA03=0x5A` (Bank01:0x5050-0x5056). El select queda "abierto" hasta ese momento (CA03=0x0B).

## 5. Coste y consumo

| Métrica | antes | después del commit | durante la resolución |
|---|---|---|---|
| CC (`CA3E`) | 10 | 10 (sin cambio) | **7** (10−3 = coste de la carta 83) |
| Mano (block+39..44) | [79 02 75 00 00 00] | idéntica | idéntica |
| Límite (block+3, `CB1D`) | 0x53 | **0x53 (conservado)** | 0x53 |
| powerWindowCounter (`CA40`) | 5 (parcheado) | 5 | **4** (maintenance post-acción) |

- **El CC se cobra en la RESOLUCIÓN** (durante C0A0=0x14), no en el commit.
- **El límite NO se descarta** (reutilizable — a diferencia de la mano, que JOIN sí consume vía `2e51 → $45cf`).
- Siguiente turno: +3 CC (7→10) — el ciclo normal.

## 6. Estados Defense (touch / untouched)

| Registro | Commit LIMIT | Resolución (carta 83) |
|---|---|---|
| CA55 | **1** (CARD) | 1 |
| CA56 | 1 (payload) | 1 |
| CA57 | **carta** (0x53) | 0x53 |
| CA58 | 1 (carta rival: 3 Stage Atk) | 1 |
| CA02 | untouched (0) | 0 |
| CA82 | untouched (0) | 0 (la 83 NO es de la familia CA82=1) |
| CA83 | untouched (0) | 0 |
| CA53 | untouched (0) | **1** (resultado del support — ZERO_AVOID, daño 0) |
| slot8 (CA28+24) | — | **activo [5 0 0]** (support visual) |
| CA7F (Stage) | 0 | 3 (QTE del rival resuelto) |

**Defense LIMIT pertenece a la gramática de DEFENSE CARD** (CA55=1 + CA57=carta), NO a Guard/Move ni a una gramática separada. El commit no toca CA02/CA82/CA83/CA53; la resolución depende 100% de la carta jugada.

## 7. Diferencia demostrada: LIMIT vs JOIN

| | JOIN (Bank01:5095) | LIMIT (Bank01:5036) |
|---|---|---|
| Fuente | mano (block+0x27, vía `2bb9`) | límites (block+3, vía `2b9c`) |
| Validador | `3c88` ✓ | `3c88` ✓ |
| Gate extra | — | **powerWindowCounter ≠ 0** |
| Consumo | **remoción de mano** (`3b8c` → `2e51` → `$45cf`: hand[CC0C] → CC01, shift+clear) | **ninguno** (límite conservado) |
| Commit | CA55=1, CA03=0x5A | CA55=1, CA03=0x5A |

## 8. Presentation

- No hay cinematografía "LIMIT"-propia: la presentación es la de la carta (support → slot8 visual `[5 0 0]`, FX/paleta de la carta: card 83 → fx 0x01, pal 0x30).
- El flujo post-commit es el estándar: C0A0 8→9→0x1E→0x14 (presentación del atacante) → resolución.
- Screenshots: `tools/rom-trace/r31a/r5-3-select.ppm` (select con carta 83), `r5-9-limit-commit.ppm` (post-commit), `r5-11-resolve2.ppm` ("Piccolo's Attack / 3 Stage Atk").

## 9. Casos cubiertos

| Caso | Setup | Resultado |
|---|---|---|
| LIMIT sin powerWindow | Gohan base (CA40=0), carta 83 | **rechazado** (gate silencioso — el select se queda) |
| LIMIT + powerWindow | CA40=5, carta 83 | **COMMIT** (CA03=0x5A, CA55=1) |
| LIMIT carta incompatible | carta 19 (máscara formas 7-11, Gohan=1) | rechazado C2D0=2 (compat) |
| LIMIT carta fuera de rango | 0x83=131 (>125) | rechazado (coste basura) |
| LIMIT carta defensa fase | carta 25 (cat 02 DAMAGE) | rechazado (compat) |
| JOIN control | carta 83 en mano | COMMIT (sin gate powerWindow) |
| JOIN remoción | carta 83 en mano | mano[0] eliminada + shift |

## 10. Pendiente (no bloqueante)

- El momento EXACTO del cobro del CC dentro de la resolución (ocurre durante C0A0=0x14; la rutina concreta no se aisló — es el flujo compartido de cobro de cartas, no del LIMIT).
- La familia de presentación de cartas SUPPORT/DEFENSE (macro/opcode exactos) — fuera del alcance del LIMIT.
- Defense LIMIT con carta DEFENSE (cat 5) vs BEAM/STAGE: el gate de categoría defensivo permite cat ≥ 4; la resolución = la del handler de la carta.

---

*R5 cerrado: docs/rom/generated/defense-limit/REPORT.md + evidencia en tools/rom-trace/r31a/r5-*.{mts,ppm,log}.*
