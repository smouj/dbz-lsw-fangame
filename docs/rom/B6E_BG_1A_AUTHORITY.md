# B6E — Autoridad ROM del BG `$1A` (CHARA/Gather)

> Evidencia estática del decomp (`build/mgbdis/`). Sustituye la inferencia
> "Gather/CHARA ⇒ $1A" por la autoridad real que lo selecciona.
> Estado: **ROM_STATIC_VERIFIED** (toda la cadena es código, sin traza dinámica).

## Cadena demostrada

```
CHARA  handler Call_001_7293 (bank_001, dispatch [$ca04])
  estado 9   → Jump_001_7364  bank_001:8934   ld a,$31 ; ld [$cc15],a   ← paleta CHARA
  estado $0a → Jump_001_7374  bank_001:8939   call Call_000_3abd       ← load $1A

Gather handler Call_001_7b2c (bank_001)
              bank_001:10314-10315  ld a,$33 ; ld [$cc15],a           ← paleta Gather
              bank_001:10319        call Call_000_3abd               ← load $1A  (MISMO call)

Call_000_3abd (bank_000:11553)
    ld a, $03
    call Call_000_0f9b      ; bank-switch a $03
    call $6750              ; → Bank03:$6750
    call Call_000_0fb6      ; restore bank
    ret

Bank03:$6750 — máquina de sub-estado [$ca03] (bank_003 ~$6750)
    ld a, [$ca03]
    cp $00
    jr z, jr_003_67a3       ; $00 → loader del resource $1A

jr_003_67a3 (bank_003:6529)  ← LOADER $1A
    ld b, $68               ; bank $68
    ld de, $001a            ; resource $1A
    ld a, b
    call Call_000_1266      ; carga (A=bank, DE=resource)
    ld c, $01
    ld hl, $8800            ; VRAM $8800
    call Call_000_051d      ; copia a VRAM
    ld hl, $ca03
    inc [hl]
    ret
```

## El punto clave: `$19` y `$1A` son estados hermanos

`jr_003_6711` (bank_003:6441) es **idéntico byte a byte** al loader `$1A`, salvo el
inmediato del resource:

```
jr_003_6711:  ld b,$68 ; ld de,$0019 ; call Call_000_1266 ; ld c,$01 ; ld hl,$8800 ; call Call_000_051d
jr_003_67a3:  ld b,$68 ; ld de,$001a ; call Call_000_1266 ; ld c,$01 ; ld hl,$8800 ; call Call_000_051d
```

Es decir: **la selección `$19` vs `$1A` no es un branch sobre una variable de
estado — es CUÁL callsite se ejecuta**, con el resource pasado como inmediato en
`DE` a `Call_000_1266` (que resuelve el puntero vía `hl=$4008` + `DE<<4`).
`$19` pertenece a la máquina `[$ca04]` (acción); `$1A` a la máquina `[$ca03]`
estado `$00`.

## La paleta NO la decide el loader

El loader no escribe paleta. La paleta se lee de `$cc15` en el path de display:

```
jr_003_67cc:  ld a,[$cc15] ; ld e,a ; ld d,$00 ; ld b,$05 ; call Call_000_36ca
```

Y `$cc15` solo se escribe en dos sitios (bank_001): `$31` en `Jump_001_7364`
(CHARA estado 9, línea 8934) y `$33` en `Call_001_7b2c` (Gather, línea 10315).

→ Confirma §2123: **el resource `$1A` es literalmente compartido por CHARA y
Gather; lo que difiere es la paleta (`$31` / `$33`)**, fijada por el handler que
llega, no por el loader.

## Respuestas a las preguntas de B6E

| # | Pregunta | Respuesta (dirección) |
|---|---|---|
| 1 | callsite de `Bank03:$6750` | `Call_000_3abd` (bank_000:11553) → `ld a,$03`; `call $6750` |
| 2 | estado/handler que llega | CHARA `Call_001_7293` estado `$0a` (`Jump_001_7374`, bank_001:8939); Gather `Call_001_7b2c` (bank_001:10319) |
| 3 | condición `$19` vs `$1A` | no es condición: son **callsites/inmediatos distintos** (`DE=$0019` vs `DE=$001A` a `Call_000_1266`) |
| 4 | CHARA estado 10 | `$ca04 == $0a` → `Jump_001_7374` → `call Call_000_3abd` ✓ |
| 5 | Gather y `$3ABD` | `Call_000_3abd` es el mismo routine; llamado desde bank_001:10319 (Gather) y bank_003:5169 |
| 6 | qué fija paleta `$31`/`$33` | el handler que llega escribe `$cc15`: CHARA `$31` (bank_001:8934), Gather `$33` (bank_001:10315) |
| 7 | ¿`$1A` compartido? | **Sí, literal.** CHARA y Gather ejecutan el mismo loader; solo cambia `$cc15` |
| 8 | clear/restore vs B6 | pendiente — se fija en el gate contra `resolveActionExitBoundary()` |

## Consecuencia para el SSOT

La afirmación correcta y demostrable no es "Gather/CHARA usan BG `$1A`", sino:

> El resource `$1A` se carga cuando la máquina `[$ca03]` de Bank03 alcanza el
> estado `$00`, y a ese punto se llega desde `Call_000_3abd`. La paleta que lo
> acompaña la fija `$cc15` en el handler emisor (`$31` CHARA / `$33` Gather).

`background.resource` puede ampliarse a `'$19' | '$1A'` **citando estas
direcciones** — ya no es una inferencia.
