# Action trace — film por frame (2026-09-13)

Trace de acción real a **fidelidad de frame**, con estado de batalla, ActionObjects,
activeObject, drawState y orden de dibujo. Es el formato que pide el plan para
"secuencias, frames, tiempo".

## Procedencia

| Campo | Valor |
| --- | --- |
| ROM | USA `8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee` |
| Emulador | mGBA 0.10.2 headless (`tools/rom-trace/rom-driver`) |
| Savestate | `tools/rom-trace/r31a/tail_left_base.ss0` |
| Comando | `trace PATH N "frame:key:hold,..."` |

## Hallazgo del driver (esto sí es sólido)

**`runFrame` NO hace progresar acciones que están esperando input.**
El comando `trace` avanza con `step()` + `frameCounter()` y **sí** las hace
progresar. Evidencia: con `frames` la acción quedaba clavada en `CA03=15`
durante 240 frames; con `trace` recorrió la escalera completa.

> **Matiz posterior (misma sesión):** `trace` tampoco garantiza el commit de un
> comando. Con `trace 140 "0:1:8"` desde el savestate de Gather, `CA7F`/`CA55`
> no se movieron; con `frames 10 0x01` + espera, sí (`CA55=04`, `CA7F=00`).
> Conclusión revisada: **el commit depende del comando y del tiempo de pulsación**,
> no solo del mecanismo de avance. No generalizar.

## Escalera de estados (18 transiciones en 90 frames)

```text
frame  C0A0  CA03  CA04  CA06  activeObject  drawState  drawOrder
    0     5    21     0     0        0           0         2
    1     5    90     0     0        0           0         2   <- CA03 = 0x5A
    2     5    91     0     0        0           0         2
    3     5    92     0     0        0           0         2
    8     8     0     0     0        0           0         2
   11     8     0     0     1        0           0         2
   12     8     0     0    20        0           0         2
   15     9     0     0     0        0           0         2
   19    30     0     0     0        0           0         2
   38    11     0     0     0        0           0         2
   40    11     0     0     0        1           0         1   <- activeObject 0->1
   51    11     0     1     0        1           0         1
   52    11     0     3     0        1           0         1
   53    11     1     3     0        1           0         1
   58    11     0     4     0        1           0         1
   59    11     0     5     0        1           0         1
   76    11     0     6     0        1           0         1
```

- **`C0A0`**: 5 → 8 → 9 → 30 → 11 (fases de la acción, no un salto único).
- **`CA03` = `0x5A`** al inicio — coincide con el commit documentado
  (`commit CA55=1 + CA03=0x5A`).
- **`activeObject` 0→1** y **`drawOrderFlag` 2→1** en el frame 40.
- **`CA04`** recorre `1 → 3 → 4 → 5 → 6` (subestados de animación).

## Campos por frame (en `tail-action-trace.json`)

`frame` · `battle` (C0A0, CA01, CA02, CA03, CA04, CA06, CA7E, CB77, CA53) ·
`actionObjects` · `activeObject` · `drawState` · `drawOrderFlag` · `display` ·
`scroll` · `slots`

---

## ⛔ TESTS INVÁLIDOS — retirados como evidencia

Registrados aquí para que nadie los reutilice creyendo que prueban algo.

### Test de posición con gate FORZADO — **INVÁLIDO**

Se hizo `write 0xca40 5` para simular el gate de Gather y se mandaron
direcciones. Resultado: `A+RIGHT` == `A+UP` == `A+DOWN` (diff idéntico de 22
bytes; `CA5A: 01→02` en los tres).

**Por qué no vale:**
1. El gate se forzó **a mano** (`CA40`); no es un Gather real. Y se comprobó
   después que **el contador del gather es `CA7F`, no `CA40`**.
2. El único cambio dependiente de botón en el barrido previo
   (`RIGHT` → `CA36: 00→01`) era **el cursor del menú**, no `position`.
3. `CA5A/CA5B/CA5D` con bit1 encendido venían del **commit de la acción**, no de
   los direccionales.

**Conclusión: NO prueban `GATHER_POSITION_RULE`. `position` sigue sin
identificar.**
