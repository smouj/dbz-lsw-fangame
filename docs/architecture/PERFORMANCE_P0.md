# Performance P0 — distribución y camino crítico

Este documento separa las mejoras que ya están aplicadas de las que requieren
medición en runtime. No se cambia ninguna regla del Engine ni ninguna
selección ROM para optimizar.

## Aplicado

- El modo `release` usa el stub nulo de Dev Studio y mantiene el panel interno
  fuera del camino de arranque del juego.
- Vite aplica una frontera de contenido al cerrar el build release. Conserva
  `manifest.json`, `rom-physical.manifest.json`, `rom-durations.json`, frames
  físicos y assets usados por el runtime; elimina `physical-debug/`,
  `provenance.json`, capturas y páginas de auditoría.
- `npm run verify:release-content` mide JS/CSS, assets de juego, archivos ROM y
  material Dev, y falla ante cualquier fuga.

Medición del corte `c68e18bd` en Windows:

```text
release files       7.723
JS/CSS              4,78 MiB
game assets         60,98 MiB
ROM/save files      0
Dev-only files      0
```

El build previo sin la frontera contenía 16.884 archivos; la diferencia son
materializaciones de inspección que no necesita el jugador.

## Pendiente medido, sin cambios especulativos

El atlas Pixi de producción, el pooling de FX y el presupuesto de memoria/FPS
requieren primero una traza de `BattleScreen` en navegador/Tauri. Se mantienen
fuera del release hasta poder demostrar:

```text
0 asset loads durante ACTION/IMPACT
0 texturas faltantes
59.7275 ticks estables
0 long tasks > 50 ms durante una película
memoria estable tras 10 rematches
```

El visor ROM Sprite Atlas sí genera hojas de contacto para Dev, pero esas hojas
no son todavía una sustitución del cargador físico de producción. Cualquier
promoción futura debe conservar `physicalId`, geometría y provenance ROM.

## Comandos

```powershell
npm run verify:release-content
npm run verify:dev-production-boundary
npm run desktop:build
```

`desktop:build` ejecuta la verificación release antes de empaquetar NSIS.
