# Dev Engine Editor

El módulo `#dev/editor` es el punto de inspección interno del proyecto. No es
una segunda versión del juego: monta `BattlePixiStage` y `PixiBattlePresentation`
de producción, con el mismo reloj de 59.7275 Hz, las mismas escenas y los
mismos recursos ROM. Las ayudas de cuadrícula, anchors, bounds y los docks de
diagnóstico están superpuestos y no reciben eventos del canvas.

## Qué se puede inspeccionar

- **GAME**: salida Pixi real, en el viewport ACTION nativo de 160×80 proyectado
  una sola vez a 320×160.
- **HIERARCHY**: `BattleRuntime`, `BattlePresentation`, `SceneDirector`, las
  escenas, ambos `FighterActor`, proyectiles, display ROM y HUD.
- **INSPECTOR**: identidad de forma y lado, posición nativa, escala, pose,
  frame, duración, recurso/secuencia ROM y bloqueo de frame físico.
- **Timeline/Console/Profiler/ROM**: puntos de entrada para los datos que ya
  produce el runtime; no generan datos alternativos ni sustituyen una captura
  ROM.

## Orientación de luchadores

La orientación tiene una única autoridad de render (`facingScaleX` en
`src/data/facing.ts`), compartida por DOM, Pixi y este editor:

1. `facingFlip(formId, side)` establece el facing base: el luchador izquierdo
   mira a la derecha y el derecho a la izquierda.
2. Una pose semántica `move_back` invierte temporalmente ese ciclo porque la ROM
   reutiliza el movimiento de avance para la retirada.
3. Una cue `ROM_PHYSICAL_FRAME` toma el control. Su textura, offsets y duración
   proceden del corpus físico ROM y conserva únicamente el espejo del lado; no
   se aplica un segundo espejo semántico.

El Inspector muestra las dos cosas por separado:

```text
BASE         facing derivado del lado
FACING       orientación efectiva que recibe Pixi
ORIENTATION  SEMANTIC_POSE o ROM_PHYSICAL_FRAME
scaleX       signo finalmente aplicado al sprite
```

Así una discrepancia de orientación se puede localizar sin alterar el PNG,
`physicalId`, hashes, límites ni la procedencia ROM. Los PNG físicos se
mantienen raw/trimmed; cualquier vista canonical right-facing de otras páginas
es solo una transformación de presentación.

La propiedad de la película también es exclusiva: cuando existe una timeline
ROM, React no monta la película DOM legacy (`card-fx`) y Pixi consume los cues
ROM. Al alcanzar `FIELD`, el adaptador usa `returnToField()` para limpiar cámara,
offsets, flashes, movimiento y locks de frames antes de permitir la siguiente
acción. Esto evita que dos schedulers o un frame físico residual aparezcan a la
vez.

## Fronteras

El editor solo existe en el bundle Dev. El build de producción poda el módulo,
las capturas y la metadata de auditoría mediante `verify:release-content`.
Ningún cambio realizado desde el Inspector modifica el estado del juego ni
crea una autoridad paralela para cartas, secuencias o sprites.
