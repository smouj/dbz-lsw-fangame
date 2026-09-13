# Beats ROM por familia (2026-09-13)

Escaleras de beat **reales** extraídas de trazas conducidas (input inyectado con
`trace`), no de ventanas estáticas. Fuente: `driven/*.json`, resumen en
`driven/ladders.json`.

Script: `tools/rom-trace/rom-driver` · comando `trace PATH N "frame:key:hold,..."`.

## Invariante compartido

```text
CA03 = 0x5A (90)   ← el commit de la acción. Presente en las TRES familias.
```

Coincide con lo documentado (`commit CA55=1 + CA03=0x5A`, §3857).

## Beam (`kame_left_base`)

```text
fr  0  C0A0=5 CA03=21            (0x15, acción activa)
fr  3  C0A0=5 CA03=90            <- commit 0x5A
fr  4  CA03=91 · fr 5 CA03=92
fr 10  C0A0=8
fr 13  CA06=1 · fr 14 CA06=20 · fr 15 CA06=0
fr 17  C0A0=9
activeObject=1 desde fr 42
15 transiciones en 100 frames
```

## Stage (`offense-base`)

```text
fr  0  C0A0=5 CA03=4             (menú)
fr 11  CA03=20 (0x14)            <- disparo
fr 14  CA03=21 (0x15)            <- acción activa
fr 31  CA03=90 (0x5A)            <- commit
fr 38  C0A0=8
fr 41  CA06=1 · fr 42 CA06=30
activeObject=1 desde fr 71
15 transiciones en 110 frames
```

## Support (`Afterimage`, Gohan vs Trunks)

```text
fr  0  C0A0=6 CA03=21  activeObj=1 drawOrder=0
fr  3  CA03=90 (0x5A)            <- commit
fr  9  C0A0=7
fr 12  CA06=1 · fr 13 CA06=10
fr 16  C0A0=9
fr 20  C0A0=30                   <- macro de acción
activeObject=1 desde fr 0 (el estado se capturó ya dentro de la acción)
18 transiciones en 110 frames
```

## Lectura

- La escalera `C0A0` es común: `5/6/7 → 8 → 9 → 30 → 11`.
- `CA03` comparte el patrón `21 (0x15) → 90 (0x5A) → 91 → 92 → 0`.
- `CA06` recorre subestados (`1 → 10/20/30 → 0`) al entrar en la fase de macro.
- **El momento de `activeObject=1` depende de la familia** (beam fr42 · stage fr71 ·
  support fr0) — es decir, la activación del objeto **no** es un tick fijo global.

## Límite honesto

Las trazas están **conducidas con pulsaciones de `A` genéricas**, no con la
secuencia de QTE exacta de cada acción. Por eso los frames absolutos sirven como
referencia de **orden y forma** de la escalera, **no** como duración canónica por
familia. Para duraciones canónicas hay que alimentar la secuencia correcta.
