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
ground                 y=75
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

## Alcance y validación

Este contrato solo afecta al canary Pixi (`?pixiField=1`); el renderer DOM y la
autoridad de datos ROM no cambian. Los frames, secuencias, timings y provenance
siguen proviniendo del corpus físico ROM. Las comprobaciones asociadas son:

- `verify:presentation-physical-geometry`
- `verify:presentation-physical-film`
- `verify:rom-action-object`
- `src/renderer/pixi/presentation/animationOwnership.test.ts`

No se introducen sustituciones visuales ni mappings por nombre de carta.
