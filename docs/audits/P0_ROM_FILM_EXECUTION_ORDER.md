# P0 ROM Film — orden de ejecución canónico

Este documento fija el orden de trabajo para la cinematografía ROM en producción.
No se avanza de una familia a la siguiente con la CI roja ni se sustituye una
comprobación de navegador por una aproximación procedural.

## Orden

0. CI completa sobre el commit publicado.
1. Cerrar P0.2: visibilidad, pose y reproducción son fronteras distintas.
2. Consumir una ruta BEAM exacta y validarla en navegador.
3. Validar Stage player en navegador.
4. Validar Stage enemy de forma independiente, incluidos multi-impactos y roles.
5. Cerrar ownership de fondo, cámara y flash.
6. Cerrar cleanup, STOP y contaminación de la segunda acción.
7. Ejecutar el golden conjunto Standard Damage + Beam + Stage.
8. Hacer el cutover por defecto al final.

## Reglas de aceptación

- `WAIT_FRAME` y `WAIT` observan el progreso; no inician una película.
- Sólo una orden explícita de inicio (`FIGHTER_POSE`, `ANIMATION_START` con
  selector probado o un ActionObject ROM válido) puede habilitar reproducción.
- `FIGHTER_VISIBILITY` compone la escena y nunca inicia ni reinicia playback.
- `ACTION_OBJECT_STOP` detiene el ownership real y todos los recursos quedan
  limpiados al `endTick` ROM.
- El target no recibe frames antes de su entrada ROM, no usa la secuencia del
  actor y nunca se mantiene una película DOM/Pixi paralela.
- La película termina en su frontera ROM; no se aceptan timers de pared,
  easing inventado, proyectiles procedurales cuando existe física ROM ni cámara
  residual después de cleanup.

## Estado publicado

- P0.1 divergence audit: cerrado.
- P0.2 visibility/playback: cerrado en código y cubierto por
  `verify-combat-film-consumption` (75/75) y los tests Pixi de ownership.
- Standard Damage player/enemy: ownership ROM y result splice publicados.
- CI completa del baseline y los commits remotos integrados: verde.
- Beam y Stage: gates estáticos verdes; la captura browser específica de cada
  familia sigue siendo el siguiente trabajo antes del cutover por defecto.

Fuente de verdad: `BattleRuntime.timeline` → `BattlePresenter` →
`ProductionRomPresentationAdapter` → presentación Pixi/ROM.
