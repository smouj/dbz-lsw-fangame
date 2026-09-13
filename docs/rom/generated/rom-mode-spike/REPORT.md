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
| Captura (extendida) | `tools/rom-trace/rom-driver` — `trace` incluye **OAM (0xFE00, 160 B)** y muestra de **VRAM (0x9800, 64 B)** por frame |
| Decoder | `src/battle/romMode/decodeRomFeed.ts` — semántica OAM real (offset +16/+8, flip, prioridad, paleta OBJ, banco CGB, modo 8×16 por LCDC); **oculta los sprites fuera de pantalla** como hace el hardware |
| Escena | `src/battle/romMode/feedToScene.ts` — agrupa sprites por lado, deriva centro/caja/orientación, resuelve **nuestro** sprite (resolver inyectado) |

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
  ally  centro=(32,80)  caja 16×16@(24,72)  mira=right  cgbPal=0 → cell_imperfect_form_ow.png
  enemy centro=(128,80) caja 16×16@(120,72) mira=left   cgbPal=1 → piccolo_base_ow.png
```

Lo que **no escribimos nosotros** y sale correcto de la ROM: la orientación
opuesta (se miran), las paletas CGB distintas por lado, y la geometría.

## Barrido de familias (tras el fix de sprites fuera de pantalla)

```text
tail_left_base  (Damage)  CA03=21 C0A0=5  ally(32,80)→der pal0 | enemy(128,80)→izq pal1
kame_left_base  (Beam)    CA03=21 C0A0=5  igual
battle-base     (Defense) CA03= 4 C0A0=6  igual
offense-base    (Stage)   CA03= 4 C0A0=5  igual
Support: pendiente de un savestate con acción de soporte
```

## ⚠️ Hallazgo importante: el BG NO se debe reimplementar

Se intentó decodificar el **BG** desde VRAM (tiles 6144 B + tilemap 2048 B en
modo CGB con atributos + 8 paletas BGR555) y comparar píxel a píxel contra el
framebuffer del propio emulador:

```text
diff medio = 93.1/255 · píxeles exactos = 14.4%
```

El resultado es **fragmentado** (ver `../rom-mode-spike/bg/compare.png`): la
imagen decodificada se parece pero no cuadra. Motivo real: una pantalla de
batalla completa NO es solo BG — lleva **WINDOW** (HUD superior e inferior),
**OBJ/sprites** (luchadores y UI) y **prioridad** entre capas. Reproducirla exige
implementar el **PPU completo**.

**Conclusión (aplica la regla de la ROM como especificación):**
reimplementar el PPU es exactamente lo que NO hay que hacer. El core ya lo
renderiza perfecto. El reparto correcto es:

| Capa | Fuente |
| --- | --- |
| **Vídeo** (píxeles) | el **framebuffer del emulador** (`shot` → PNG 160×144, ya en uso) |
| **Semántica** (posiciones, estados, action objects) | nuestro `decodeRomFeed` → `NormalizedBattleFeed` |

Así el vídeo es exacto *por construcción* y nosotros solo interpretamos estado
para UI/scene propia. El spike ya tiene las dos mitades.

## Límites honestos

- La ventana capturada era estática (`escenas distintas: 1`), coherente con que
  el estado esperaba input.
- El render `rom-mode-scene.png` usa un **fondo de marca**, no el BG real (y por
  lo anterior no debe intentar serlo).
- Familia **Support** pendiente de savestate.
