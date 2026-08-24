# AGENT_HANDOFF_PLAYABLE_ALPHA — del reverse engineering al juego real

V7 queda `CLOSED` (docs/rom/research-v7-support-defense-consumption/). A partir
de aquí **no se abre V8 de investigación**: la prioridad es construir el
remake jugable. La ROM solo vuelve a investigarse cuando un problema concreto
de fidelidad lo exija.

## Lo que ya está en la base (no rehacer)

- Engine puro (M1-M9) + EventLog + BattleRuntime + Presentation Adapter.
- Cutovers ROM-backed: STANDARD_DAMAGE $0A (19), BEAM_BASE $02 (38),
  Support $00/$02 (26), Support $0B/$0D/$0F (22), Defense (11 profiles).
- romCA53 contextual (semanticOutcomeForCA53) + consolidación verificada.
- RomDisplayPresenter (capa ROM display, 0 no-ops silenciosos) + ROM Display
  Lab en Dev Studio (#dev/romdisplay) con comparación inspection↔runtime.
- Renders físicos Support 48/48 + contact sheets (ROM_INSPECTION_RENDER).
- Verifiers: defense-slot8-global, rom-ca53-contract, rom-ca53-consolidation,
  rom-defense-presentation, rom-support-presentation-compiler,
  rom-support-presentation-profile, support-rom-cutover, v7-presenter-display.

## PLAYABLE ALPHA — P0

Objetivo: arrancar el remake y jugar una partida completa, bonita y estable.

### Primer gate: Battle Loop completo (sin romperse)

```text
BOOT -> MAIN MENU -> BATTLE -> CHARACTER/TEAM SELECT -> BATTLE INTRO
-> FIELD -> ATTACK INPUT -> ACTION CINEMATIC -> FIELD
-> DEFENSE INPUT -> ENEMY ACTION + DEFENSE -> FIELD
-> NEXT ROUND -> ... -> KO -> VICTORY/DEFEAT -> RESULT -> MAIN MENU
```

Attack: FIELD -> PLAYER_ATTACK_CHOICE (espera infinita) -> acción -> cinemática
-> resolución -> FIELD.
Defense: PLAYER_DEFENSE_CHOICE (espera infinita) -> Guard/Move/carta -> ataque
enemigo -> defensa aplicada -> resolución -> FIELD.
Round: dos exchanges -> post-action maintenance -> nuevo turno.

Pruebas: 10/20/30 rondas sin autoplay, sin softlock, sin doble acción, sin
doble gasto, sin doble daño, sin timeline huérfana.

### Segundo gate: 125 cartas jugables

`CARD PLAYABILITY MATRIX #001..#125` automática: canExecute correcto, coste,
compatibilidad, acción termina, timeline termina, sin crash/softlock, sin
legacy inesperado, resultado correcto, retorno a FIELD. Métricas separadas:
`PLAYABLE 125/125` (obligatorio antes de exigir COMPLETE) y `ROM FIDELITY
X COMPLETE / Y PARTIAL / Z PENDING`.

### Tercero: HUD y menús finales

Main Menu, Battle Setup, Character Select, HUD, Pause, Options, Results,
Story. Objetivo visual: DBZ LSW reconocible al instante, rehecho como juego
moderno 2D (pixel art perfecto, sprites correctos, escenarios mejorados, UI
limpia, transiciones, FX, screen shake controlado, flashes, paletas, audio,
gamepad, fullscreen).

## Reglas

- No inventar anchors / semantic slot bindings / nombres humanos no demostrados.
- No convertir CA53 en semántica sin contexto.
- El Presenter ejecuta primitivas; no conoce ROM.
- Backlog (no V8): $0B07 records finos, $C3CE/$C3CF/$C3D0, $9800 vs shadow,
  semántica de macros, anchors.
