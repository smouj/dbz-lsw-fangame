# ROM Mode — spike emulator-backed (2026-09-13)

Prueba de que el **remake puede representar la ROM en vivo** en lugar de
reimplementarla. Es el paso que responde a "¿lo hemos implementado bien?" con
"la ROM acaba de ejecutarlo".

## Cadena probada

```text
ROM → core mGBA → WRAM/OAM/VRAM/registros → decoder → NormalizedBattleFeed
    → feedToScene → escena → render
```

## Piezas

| Pieza | Fichero |
| --- | --- |
| Captura (extendida) | `tools/rom-trace/rom-driver` — `trace` ahora incluye **OAM (0xFE00, 160 B)** y muestra de **VRAM (0x9800, 64 B)** por frame |
| Decoder | `src/battle/romMode/decodeRomFeed.ts` — semántica OAM real (offset +16/+8, flip, prioridad, paleta OBJ, banco CGB, modo 8×16 por LCDC) |
| Escena | `src/battle/romMode/feedToScene.ts` — agrupa sprites por lado, deriva centro/caja/orientación y resuelve **nuestro** sprite (resolver inyectado) |

## Prueba (batalla real, savestate `battle-base.ss0`)

```text
tick=10  LCDC=0xC6  lcdOn · objEnabled · sprites 8×16
battle   CA03=11 (acción)  C0A0=6 (menú defensivo)  activeObj=1

OAM → 4 sprites normalizados:
  #0 (24,72) tile=0x00 flipX=true  cgbPal=0   ← jugador (mira →)
  #1 (32,72) tile=0x02 flipX=true  cgbPal=0
  #2 (128,72) tile=0x30 flipX=false cgbPal=1  ← enemigo (mira ←)
  #3 (120,72) tile=0x32 flipX=false cgbPal=1

escena:
  ally  centro=(32,80)  caja 16×16@(24,72)  mira=right  cgbPal=0 → cell_imperfect_form_ow.png (14×16)
  enemy centro=(128,80) caja 16×16@(120,72) mira=left   cgbPal=1 → piccolo_base_ow.png (12×15)
```

Lo que **no escribimos nosotros** y sale correcto de la ROM: la **orientación**
opuesta (se miran), las **paletas CGB** distintas por lado, y la **geometría**
(izquierda x=24-32, derecha x=120-128, y=72).

Nuestros `panel_sprites` miden 14×16 y 12×15 px, prácticamente el mismo tamaño
que el box de OAM (16×16): encajan sin reescalado.

`rom-mode-scene.png` es el render de prueba.

## Límites honestos del spike

- El fondo del render es una marca visual, **no** el BG real de la ROM
  (extraer el BG del tilemap/paletas es trabajo aparte).
- La escena de este tramo es estática (`escenas distintas en 40 frames: 1`),
  coherente con que el estado estaba esperando input.
- Alcance pedido del spike (1 Damage · 1 Beam · 1 Stage · 1 Support · 1 Defense):
  la **cadena** está probada; falta correr el barrido por familia.

## Siguiente

Correr el barrido de las 5 familias con la cadena ya probada, y enganchar
`feedToScene` a Pixi para tener el render en vivo dentro del juego.
