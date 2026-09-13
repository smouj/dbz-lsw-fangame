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
| Gate | `CA40 = 5` forzado (`powerWindowCounter != 0`) |
| Comando | `trace PATH N "frame:key:hold,..."` |

## Hallazgo clave del driver

**`runFrame` NO hace progresar acciones que están esperando input.**
El comando `trace` avanza con `step()` + `frameCounter()` y **sí** las hace
progresar. Evidencia: con `frames` la acción quedaba clavada en `CA03=15`
durante 240 frames; con `trace` la misma acción pasó `CA03 15 → … → 0` y recorrió
la escalera de estados completa.

Esto explica por qué varios intentos anteriores "no commiteaban": era el
mecanismo de avance, no la falta de input.

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
- **`activeObject` 0→1** y **`drawOrderFlag` 2→1** en el frame 40: ahí es donde
  el ActionObject pasa a ser el activo y cambia el orden de dibujo.
- **`CA04`** recorre `1 → 3 → 4 → 5 → 6` (subestados de animación).

## Campos por frame (en `tail-action-trace.json`)

`frame` · `battle` (C0A0, CA01, CA02, CA03, CA04, CA06, CA7E, CB77, CA53) ·
`actionObjects` · `activeObject` · `drawState` · `drawOrderFlag` · `display` ·
`scroll` · `slots`

## Pendiente

`GATHER_POSITION_RULE` sigue abierto: falta la dirección RAM de `position`
(`bit0` AIR/GROUND · `bit1` FRONT/BACK). Con `trace` ya se puede avanzar la
acción; el siguiente intento es capturar la resolución de un Stage con
direcciones **usando `trace`** y hacer el diff.
