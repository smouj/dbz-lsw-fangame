# V6 — Decodificación de `Bank00:$2C30` (Support card-indexed visual loader)

> Estado: `V6_SLICE_1_SUPERSEDED_BY_MATRIX`.
>
> Este documento fue el primer corte de desensamblado. La matriz V6 posterior
> corrige la lectura inicial de la cabecera del descriptor. Usar como fuente
> vigente:
>
> - `LEDGER.md`
> - `proof/loader_2c30_decoding_v6.txt`
> - `data/support_physical_visual_matrix_v6.csv/json`
>
> Fuente del desensamblado: `dbz-lsw-decomp/build/mgbdis/bank_000.asm`
> (mgbdis v3.0, ROM USA `8dab48cc…`). Verificación de bancos: lectura directa
> de `13_raw_rom/dbz-lsw-usa.gbc`.

## 1. Resumen del loader `$2C30`

`Call_000_2c30` es el cargador de visual físico indexado por carta para las
cartas **Support**. Recibe el banco base en `C` (lo pasa el caller) y el id
visual de la carta en `$CC01`, y:

1. calcula `banco = C + cardId/32`, `entrada = cardId % 32`;
2. conmuta al banco (pila de bancos software);
3. resuelve el descriptor vía tabla de punteros en `$4008`;
4. lee `byte0 -> C`, copia `C*8` bytes de layout/control, y despues lee el
   siguiente byte como `$C216`/tile count;
5. monta el destino VRAM y copia la carga gráfica.

### Desensamblado anotado

```asm
Call_000_2c30:
    push bc                 ; guarda BC del caller (C = banco base)
    ld b, $01
    call Call_000_10b0      ; push registro comando (cola en $C213)
    ld a, [$cc01]           ; A = id visual de carta (0..~124)

jr_000_2c39:                ; bucle: A /= 32
    cp $20
    jr c, jr_000_2c42       ; si A < 0x20, salir
    sub $20                 ; A -= 32
    inc c                   ; C++  (C = banco base + cociente)
    jr jr_000_2c39

jr_000_2c42:
    ld e, a                 ; E = resto (0..31) = índice de entrada
    ld d, $00
    ld a, c                 ; A = banco
    call Call_000_0f9b      ; conmutar banco ROM (pila software $C2C0)
    ld a, c
    call Call_000_1266      ; DE = dirección de descriptor (ver §3)
    pop bc                  ; restaura BC del caller
    ld a, [de]              ; A = descriptor[0] = layoutChunkCount
    inc de
    ld c, a                 ; C = descriptor[0]  (clase visual)
    call Call_000_073b      ; HL = $C600
    call Call_000_073f      ; copia C*8 bytes de layout/control
    call Call_000_0763      ; flags $C417 + punteros $C640/$C680
    ld a, [de]              ; A = byte tras layout/control
    inc de
    ld [$c216], a           ; $C216 = tileCount
    call Call_000_10cf      ; leer/ejecutar comando encolado (copia VRAM)
    call Call_000_0fb6      ; restaurar banco anterior
    ret
```

### Variantes localizadas

| Rutina | Banco base | Notas |
|---|---|---|
| `Call_000_2c30` | `C` (caller) | loader principal |
| `Call_000_2c66` | `$69` fijo | carga con `+$09` a DE y `ld c,$01` (ruta distinta) |
| `Call_000_2ca6` | `C` (caller) | igual bucle `÷32` sin `push bc / $10B0` previo |
| `Jump_000_2c0f` | — | cierra una variante anterior (usa `ld de,$8e00`) |

## 2. Helpers decodificados (Bank 0)

| Dirección | Rol | Detalle |
|---|---|---|
| `Call_000_0f9b` | **conmutar banco** | pila software en `$C2C0` (puntero), escribe `$2000` (MBC5) y `xor a → $3000`. |
| `Call_000_0fb6` | **restaurar banco** | decrementa `$C2C0`, recupera banco previo, escribe `$2000`. |
| `Call_000_1266` | **resolver descriptor** | ver §3. |
| `Call_000_10b0` | **push comando** | registro de 6 bytes `[B, $C214, $C215, E, D&0x1F, 0]` en tabla indexada por `$C213`. |
| `Call_000_10cf` | **pop/ejecutar comando** | lee el registro, copia a VRAM (`$D800+`), usa `$C216`. |
| `Call_000_073b` | — | `HL = $C600`. |
| `Call_000_073f` | — | `sla c` + tabla (`Call_000_0fe8`). |
| `Call_000_0763` | — | `or $01 → $C417`, punteros `$C600/$C680`. |

## 3. `Call_000_1266` — resolución del descriptor (clave)

```asm
Call_000_1266:
    call Call_000_0f9b      ; conmutar banco (A = banco)
    ld hl, $4008            ; base de la tabla de punteros
    sla e; rl d             ; E *= 4   (stride 4 bytes por entrada)
    sla e; rl d
    add hl, de              ; HL = $4008 + entrada*4
    ld a, [hl+]; ld e, a; ld d, [hl]   ; leer offset u16
    sla e; rl d; sla e; rl d           ; offset *= 4
    ld hl, $4000
    add hl, de              ; HL = $4000 + offset*4
    ld e, l; ld d, h        ; DE = dirección del descriptor
    call Call_000_0fb6      ; restaurar banco
    ret
```

**Estructura de banco resultante** (verificada en bancos `$69`–`$6E`):

```text
$4000..$4007  cabecera: 20 00 00 00 02 00 00 00   (count=0x20=32)
$4008..$4087  tabla de 32 entradas × 4 bytes
              entrada = [ offset u16 ][ stride u16 ]
              (stride observado = $007d = 125 → 125*4 = 500 bytes por descriptor)
$4088+        descriptores alineados cada 500 bytes ($1F4)
              payload usado = 498 bytes + 2 bytes de padding
              byte0 = layoutChunkCount
              next count*8 bytes = layout/control
              next byte = tileCount
              next tileCount*16 bytes = graphics 2bpp
```

## 4. Bancos base y bancos de visual Support

Callers de `$2C30` en `bank_002.asm` / `bank_003.asm` / `bank_07e.asm`
fijan `C` antes de la llamada. Valores observados: **`$69`, `$6A`, `$6B`**
(+ `$2C66`/`$2CA6` que usan `$69` o el `C` del caller).

Con el bucle `÷32`, el rango de bancos de visual Support es:

```text
base $69 → $69..$6C
base $6A → $6A..$6D
base $6B → $6B..$6E
```

Los bancos `$69`–`$6E` comparten la MISMA cabecera (`20 00 00 00 02 00 00 00`,
32 entradas) pero tienen **sha256 distintos** → datos físicos distintos por
banco (ver `BANK_HASHES.md` generado abajo). Bancos vecinos: `$6F` = 8 entradas
(cabecera `08`), `$75`–`$7A` = cabecera `534f442a…` (otro formato), `$7E` =
código (cabecera `fa12c0e6…`).

## 5. Cabecera de descriptor — lectura inicial superada

Descriptor 0 / 1 de bank `$69` (primeros bytes):

```text
02 a5 14 be 14 b1 14 ff 7f  a5 14 be 14 b1 14 ff 7f  1e 00 00 7f 7f 40 40 ...
02 a5 14 45 29 f1 5e ff 7f  a5 14 b7 11 3f 43 ff 7f  1e 00 00 7c 0b 7e 7d ...
```

La lectura inicial anterior trataba `descriptor[1]` como `$C216`. Eso es
incorrecto para los Support V6. La lectura vigente es:

```text
descriptor[0] = $02 = layoutChunkCount
descriptor[1..16] = 2 chunks de 8 bytes de layout/control
descriptor[17] = $1E = tileCount
descriptor[18..497] = 30 tiles 2bpp
```

Por tanto `$a5 14 ...` no es `C216`; forma parte del primer chunk de
layout/control copiado por `$073F`.

## 6. Pendiente para el cierre V6 (no hecho aún)

1. Renderizar los 48 descriptores Support.
2. Terminar la semántica exacta de los 16 bytes de layout/control.
3. Separar palette path final por ruta/familia.
4. Confirmar composición visible para `$0B/$0D/$0F`.
5. Macros `$2B/$2C/$34/$35` y auditoría global slot8 (Teleport `$28` /
   Time Freeze `$2A`) — fase posterior.

## 7. Trazabilidad

- Snapshot dirty registrado al arrancar V6: `DIRTY_STATE_SNAPSHOT.md`.
- Este documento queda conservado como primer corte; la fuente vigente es el
  extractor V6 y los data files generados.
