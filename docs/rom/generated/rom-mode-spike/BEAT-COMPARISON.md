# ROM vs remake — comparación de beats (2026-09-13)

Para que el remake "se sienta" como la ROM, la comprobación verificable es
comparar los **beats** (transiciones de estado y de composición) del guion real
de la ROM contra el timeline del remake para la **misma acción**.

| Lado | Fuente |
| --- | --- |
| ROM | `docs/rom/generated/action-trace/tail-action-trace.json` — captura real, 90 frames |
| Remake | `scripts/fixtures/m7_melee_hit.json` — HIT estándar (misma acción) |

Script: `scripts/compare-rom-beats.ts` · salida: `beat-comparison.txt`

## Beats de la ROM (captura real)

```text
frame  0  C0A0=5  CA03=21 (0x15)   activeObj=0 drawOrder=2
frame  1  C0A0=5  CA03=90 (0x5A)              <- commit
frame  8  C0A0=8
frame 15  C0A0=9
frame 19  C0A0=30                             <- macro de acción
frame 38  C0A0=11
frame 40  C0A0=11  activeObj=1 drawOrder=1    <- el objetivo pasa a ACTIVO
frame 53  CA03=1 · 54 CA03=2 · 58 CA03=0
```

## Beats del remake

```text
tick   0  SCENE_LOAD TACTICAL_TO_ACTION · ROM_WAIT 20 · PALETTE_TRANSITION 17
tick  17  SCENE_LOAD ACTION_READY
tick  20  ROM_MACRO · FIGHTER_MOTION dur=25
tick  40  FIGHTER_VISIBILITY TARGET
tick  45  ANIMATION_START
```

## Contraste

| Beat | ROM | Remake | |
| --- | ---: | ---: | --- |
| Objetivo pasa a activo | frame **40** | tick **40** | ✅ **exacto** |
| Macro de acción | frame **19** (C0A0=30) | tick **20** | ✅ ±1t |

## Límites (no se sobreafirma)

- La captura ROM es de **90 frames trazados** — es la longitud de captura, **no**
  la duración del action. Por eso **no** se compara contra los 302 ticks del
  timeline del remake: la captura no sostiene esa afirmación.
- `m7_melee_hit` es el escenario de presentación de HIT estándar; la traza ROM
  viene de `tail_left_base`. La equivalencia es razonable pero **no** está
  demostrada byte a byte; se anota como supuesto.
