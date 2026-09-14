# Renderer de batalla ROM/Pixi

## Contrato actual

`BattleScreen` usa **Pixi ROM** como renderer visible por defecto. El campo
DOM/CSS se conserva para diagnóstico y recuperación, pero solo se activa de
forma explícita con:

```text
?domField=1
```

También se acepta `?renderer=dom` como alias legible. El antiguo
`?pixiField=1` sigue siendo compatible y no es necesario en una partida normal.

La carga de Pixi continúa siendo diferida: el chunk de `BattlePixiStage` se
descarga al entrar en una batalla, nunca en el menú principal ni en las
pantallas de contenido.

## Arranque sin huecos

Mientras React.lazy y los atlases ROM se inicializan, el campo DOM permanece
visible. Solo después de `onPresentationReady(true)` se ocultan el fondo y los
fighters DOM. Si la inicialización falla, el campo DOM sigue disponible para
que la partida no quede en blanco.

La disponibilidad del chunk Pixi y la propiedad de una acción son estados
distintos. Una carta solo oculta su película DOM cuando existe `romTimeline` y
el timeline ROM ha tomado la propiedad (`pixiActionActive`). Las familias que
todavía usan una película legacy conservan esa película visible aunque Pixi
esté montado para el campo; así no se produce una acción vacía por el mero
hecho de cargar el renderer.

## Geometría única

La escena ACTION usa coordenadas ROM nativas de `160×80`. `ActionScene` aplica
una única proyección `ACTION_WORLD_SCALE` al contenedor completo; fondos,
fighters, offsets físicos y movimiento comparten el mismo espacio. Los frames
ROM de `FighterActor` permanecen a escala `1:1` dentro de ese mundo y no se
mezclan con escalas CSS independientes.

`RomDisplayLayer` conserva su superficie GBC nativa `160×144` y se recorta al
viewport ACTION antes de la proyección. La capa de pantalla y los actores no
comparten una escala implícita.

## Propiedad de las acciones

El cambio de renderer no altera la autoridad del runtime: los cues ROM siguen
pasando por `ProductionRomPresentationAdapter`, `ActionObjectRuntime` y los
frames físicos reconciliados. Las rutas que aún no tienen evidencia física
completa mantienen un fallback legacy **dentro del adapter**, no una segunda
escena DOM visible en paralelo.

La finalización ROM continúa limitada a las rutas que ya tienen contrato
cerrado (`PLAYER_STANDARD_DAMAGE` y `ENEMY_STANDARD_DAMAGE`). El resto conserva
su fallback progresivo hasta cerrar su evidencia, sin inventar frames ni
timings.

## Diagnóstico en Dev Studio

Combat Lab muestra explícitamente `PIXI ROM · DEFAULT` o
`DOM LEGACY · FALLBACK EXPLÍCITO`. El Dashboard, Validation y Game Config leen
la misma constante `BATTLE_PRESENTATION_DEPLOYMENT`; no existe una tabla paralela
que pueda informar que DOM es el renderer por defecto.

Para comparar una incidencia visual:

1. Reproducir la acción sin query (Pixi ROM).
2. Repetir con `?domField=1`.
3. Comparar los snapshots de actor, cue, frame físico y tick ROM.
4. Corregir la autoridad ROM o la composición Pixi, nunca ajustar el DOM para
   ocultar una discrepancia.
