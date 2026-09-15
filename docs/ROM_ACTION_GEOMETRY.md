# ACTION ROM geometry

La presentación `ACTION` usa un único espacio de coordenadas nativo de Game Boy
Color. El plano cinematográfico mide `160×80` píxeles ROM y el contenedor
`ActionScene` aplica una única escala entera `×2`, por lo que su salida visible
es `320×160`.

## Contrato

```text
ROM/native world       160×80
ActionScene scale      ×2
output/canvas          320×160
fighter asset scale    ×1 dentro del mundo nativo
camera offsets         píxeles nativos, proyectados por ActionScene
```

Los anchors de producción viven también en coordenadas nativas:

```text
player ACTION          x=48
enemy ACTION           x=112
special player         x=56
special enemy          x=104
ground                 y=72 (8px native safety margin to the 80px plane edge)
```

El fondo ACTION y los fighters no se escalan por separado. Así, un frame ROM de
`32×48` conserva su densidad y se proyecta a `64×96` junto con el fondo. Los
offsets físicos y el movimiento de cámara siguen expresándose en píxeles nativos
y se multiplican únicamente al aplicar la transformación del mundo.

## Pantalla GBC y capas

`RomDisplayLayer` mantiene el display completo de `160×144` a `1:1`, pero su
viewport de ACTION se recorta a las primeras `80` filas nativas. El display no
puede invadir el campo ni introduce una segunda escala. La capa de proyectiles
usa la misma proyección `×2` que `ActionScene`.

La cámara se aplica al contenedor común del mundo y se restablece al volver a
`FIELD` o al reiniciar la presentación. Esto evita que un desplazamiento ROM
residual deje el campo fuera del viewport tras una película.

## Secuenciado físico

Una cue `ROM_PHYSICAL_FRAME` es la autoridad directa de textura, offset y
`frameIndex`. `FighterActor` mantiene ese frame durante sus `durationTicks` y no
deja que el animador semántico del atlas lo sustituya entre cues. Un nuevo
`ANIMATION_START` invalida el frame anterior; una pose semántica solo recupera
el control cuando la propia timeline la emite de forma explícita. Si la textura
física no está materializada, el actor permanece oculto y no muestra un frame
parecido del atlas.

## Alcance y validación

Este contrato gobierna el renderer Pixi de producción. El renderer DOM se
conserva únicamente como fallback explícito (`?domField=1`) y la autoridad de
datos ROM no cambia. Los frames, secuencias, timings y provenance siguen
proviniendo del corpus físico ROM. Las comprobaciones asociadas son:

- `verify:presentation-physical-geometry`
- `verify:presentation-physical-film`
- `verify:rom-action-object`
- `src/renderer/pixi/presentation/animationOwnership.test.ts`

No se introducen sustituciones visuales ni mappings por nombre de carta.
