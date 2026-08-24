# PLAYABLE ALPHA — P0 (post-V7)

Estado: `PA1-PA4 ✅ · PA8 ✅ · PA10 ✅ · PA9 ✅ · PA11 (EnemyController) ✅ · GOLDEN PATH por UI: pendiente de smoke con KO real por UI (balance legacy)`.

## PA11 — Enemy Controller Cutover (cerrado)

- **`src/battle/enemy/enemyController.ts`** (puro, determinista, sin
  React/Pixi/DOM/timers/Math.random): `decideEnemyCommand({battle,
  session})` → `{command, card, nextSession, diagnostic{intent,reason}}`.
  RNG = LCG con seed (misma entrada → misma decisión). Legalidad SIEMPRE
  vía `canExecute` (autoridad, nunca reglas duplicadas). Policy Alpha:
  ataque ofensivo > BASIC/Stage > heal útil > Gather útil (último recurso).
  Anti-loop: gather/heal consecutivos penalizados; nunca PASS con acción
  razonable. `EnemySessionState` = memoria privada de la IA (consecutive-
  Gather/Heal, turnsWithoutDamage, lastIntent, rngState) — fuera del Engine.
- **`verify:enemy-controller` (FULL PASS)**: pureza (imports reales), 1800
  decisiones → 0 ilegales, determinismo (replay exacto), fixtures attack
  (offensive/lowCC/highCC/gather útil e inútil/heal low+full HP/empty deck/
  only BASIC), iniciativa (enemy ex0 ataca · player ex0 → enemigo defiende
  política), anti-stall (partidas 20 turns estables, KO real DEFEAT turn 27
  con stats altos, 0 rejects, gather/heal loops 0).
- **Cutover main.tsx**: `enemyIntent` legacy ELIMINADA (0 refs). `enemyAttack`
  y `beginDefenseAfterPlayer` deciden vía controller (draw enemigo
  sincronizado a state.eDeck; GATHER → engineAct; ataque → incomingCard +
  defensa del player). La RESOLUCIÓN del ataque enemigo pasa por el Engine:
  `resolveEnemyAttackViaEngine()` = `runtime.resolveCard('enemy', card)` +
  proyección de eventos (DAMAGE_APPLIED → daño/flash/pose; ATTACK_MISSED →
  miss; CC_GAINED → log; FIGHTER_DEFEATED → 2v2/enterResults). La mutación
  legacy `resolveEnemyAttack` (Math.random + fórmulas duplicadas) ELIMINADA.
  `defendJoint` migrado a engineAct(PLAY_DEFENSE_CARD).
- **Hallazgos honestos**: (1) el Engine (M8.C2a-L, congelado) solo soporta
  defensa del PLAYER (`playerIsDefender` → NOT_DEFENDER para side enemy) → la
  política defensiva enemiga del controller es FUTURE (documentada en el
  módulo); el orquestador solo la usa en contexto ofensivo → 0 ilegales.
  (2) Las support heal son DEFENSIVAS en el Engine → el enemigo no puede
  curarse en ataque (paridad con el flujo actual; el harness tampoco).
  (3) Deuda `DEFENSE_LIMIT_LEGACY`: defendLimit conserva resolveDefenseCard
  (el Engine no soporta límites defensivos como carta de mano) — alcanzable
  solo con Gather + menú LIMIT.
- Smoke real: menú → BATTLE → FIGHT → stage + QTE → contraataque del
  controller (menú defensivo) → GUARD → ROUND 2. 0 errores de app.
- Batería completa verde: enemy-controller, playable-alpha-loop, battle-
  results, battlescreen-runtime-cutover, battle-boundaries, card-playability
  125/125, battle-engine 331, presentation 114, dev-studio 47, battle-session-
  lifecycle, build. Engine y Presentation: 0 cambios.

## PA8 — Battle Terminal + Results (cerrado)

- **`battleOutcome(state)`** (selector engine, autoridad ÚNICA): ACTIVE /
  VICTORY(player) / DEFEAT(enemy); doble KO → gana la iniciativa del turno.
  **`isBattleTerminal(state)`** derivado.
- **Guards de terminal en el Engine**: `canExecute` paso 0 →
  `reject('BATTLE_TERMINAL')`; `reduceAcceptedCommand` defensa en profundidad
  (mismo rechazo). END_EXCHANGE post-KO rechazado (exchange/turn fijos).
- **`getControlBoundary` post-KO → NONE** (0 PLAYER_ATTACK_CHOICE /
  PLAYER_DEFENSE_CHOICE).
- **`enterResults()`** (main.tsx, entrada única a RESULTS): deriva el ganador
  de `battleOutcome` (React NO recalcula), cleanup visual OBLIGATORIO antes de
  la pantalla (QTE reset, selectedCard null, defendMenu null, viewMode
  OVERVIEW, poses idle, incomingCard null), Sfx/log del perdedor, setPhase.
  Los 5 call sites legacy (win×2, lose×3) → `enterResults()`;
  0 `setPhase('win'|'lose')` fuera de ella (verifier estático).
- **Results screen**: VICTORY/DEFEAT + `[REMATCH]` (solo !storyChapter) +
  `[NEW BATTLE]` + `[MAIN MENU]`. i18n: common.rematch/mainMenu (10 idiomas,
  ES: REVANCHA / MENÚ PRINCIPAL).
- **`verify:battle-results` (30/30)**: KO via DAMAGE/BEAM/STAGE (fixtures
  enemyHp 2 — daño físico con BACK+BACK = 2), DEFEAT, doble KO, 0 comandos
  post-KO (can+dispatch), END_EXCHANGE no ocurre, boundary NONE, QTE_INPUT
  rechazado, sin draw/exchange/acciones enemigas tras 600 ticks, timeline del
  último ataque cierra, estático: UI no decide ganador.

## PA10 — Rematch / Main Menu (cerrado)

- **REMATCH** (main.tsx `onRematch`): `setStoryScene(null)` +
  `setBattleKey(k+1)` + `setScreen('battle')` — BattleScreen se remonta con
  key nueva = BattleRuntime/BattleState/Presenter/HUD/QTE/refs NUEVOS.
  SIN `window.location.reload()`.
- **MAIN MENU** (`onMainMenu`): `setScreen('main')` — desmonta BattleScreen
  (useEffects con cleanup: keydown 1595, raf 1806/367; 0 gamepad en el juego).
  0 stale listeners.
- **`verify:battle-session-lifecycle` (22/22)**: Battle A (2519 dispatches,
  KO lose) → REMATCH → Battle B == fresh init (JSON igual a
  createInitialBattleState(config)), Runtime/EventLog independientes, recursos
  fresh (HP/KI/CC/turn 1/exchange 0/activeSide/phase position/QTE
  WAITING/defense NONE/powerWindow 0/mano 3), config deliberadamente
  conservado (personajes/stats), Battle B jugable hasta KO (0 softlock).
  OJO orquestador: advance() cuenta como paso + QTE en el loop principal
  (patrón playable-alpha-loop) — los sub-bucles de advance fugan el log → OOM.

## PA9 — Battle Setup (conectado)

- BATTLE MODE existente conecta directamente: lista de personajes (player) →
  VS → enemigo/form/dificultad → FIGHT! → `startBattle` → props
  playerFormId/enemyFormId → BattleScreen. Sin 50 props/refs; la selección UI
  aterriza en el BattleConfig del Engine (createInitialBattleState en
  BattleScreen).

## Golden path por UI — hallazgo de jugabilidad (pendiente de balance/IA)

- Smoke real: menú → BATTLE → character select → FIGHT! → JOINT → mano →
  carta stage → QTE real ("STAGE ATTACK preparación…") → counter — el flujo
  UI real funciona.
- **Hallazgo**: en matchup con SPD enemiga superior (Piccolo 5 vs Gohan Kid),
  el `enemyIntent` legacy (gather/passive con gatherStreak) domina la partida
  y el player apenas recibe ventana de input real (135 rounds sin
  defense-menu/mano visible). El KO por UI en matchup normal es lento/raro
  (el GBC real también lo es con defensas/curas); el KO REAL está demostrado
  por Engine (fight_to_ko turn 35; verify:battle-results fixtures). El
  golden path UI completo (KO→RESULTS→REMATCH→RESULTS→MAIN MENU) queda como
  smoke pendiente: requiere matchup favorable o ajuste del enemyIntent legacy
  (trabajo de IA/balance, FUERA del alcance estructural PA8-PA10, que está
  cerrado y verificado).

## PA2 — UI Runtime Cutover (cerrado)

`verify:battlescreen-runtime-cutover` (16/16 PASS):

- **0 timers que conduzcan gameplay en main.tsx** (búsqueda estática:
  setTimeout→advanceExchange/afterPlayerAction/finishPlayerTurn/endTurnRef/
  setPhase win|lose/enemyAttack = 0). Migrados los 6+ bridges: win/lose
  directos (1956/2033/2379), finishPlayerTurnStage directo (1952),
  endTurnRef directo (2370), afterPlayerAction directo (2468/2471),
  advanceExchange directo tras gather/heal enemigo (2592).
- DEFENSE_BASIC/JOINT/LIMIT = navegación (no commitean); GUARD/MOVE/carta
  Defense válida = DEFENSE_COMMITTED.
- Player action completion NO lanza enemy action (sin END_EXCHANGE el
  exchange no cambia; activeAttacker sigue siendo el player).
- Enemy initiative exchange 0 → player defiende (activeAttacker, nunca
  exchange fijo).
- KO → 0 comandos aceptados.
- Stage QTE completa → resolución por lifecycle Runtime (no timer).
- Smoke real: menú → BATTLE → character select (Goku/Vegeta/...) carga sin
  errores de consola tras la migración.

React-owned gameplay lifecycle = 0 (los avances van por Runtime; React solo
proyecta desde state).


## PA2 — fronteras de control (contrato Engine demostrado)

`verify:battle-boundaries` (nuevo): en PLAYER_ATTACK_CHOICE y
PLAYER_DEFENSE_CHOICE, advance(10000) congela el gameplay (mismo
phase/exchange/turn/HP/CC/mano), 0 comandos despachados, 0 eventos nuevos.
El Engine soporta espera indefinida — la presentación no dispara gameplay.

## PA4 — card-playability 125/125

`verify:card-playability` (nuevo): 125/125 PLAYABLE, 0 BLOCKED, 0 crash, 0
softlock, 0 cleanup inválido. Checks por carta: canExecute (contexto legal con
personaje compatible), dispatch aceptado, coste aplicado UNA vez, carta sale de
la mano, acción termina (command → QTE completo real; defense → dentro de
incoming attack con iniciativa enemiga), timeline ordenada/cerrada, boundary
válido, serializable. PLAYABILITY separado de ROM_FIDELITY.

## Deuda PLAYABLE_ALPHA_BRIDGE (auditado en main.tsx)

El legacy aún conduce gameplay desde timers de presentación. Puentes exactos a
migrar a la BattleScreen real (UI → command → runtime):

```text
main.tsx:1952  setTimeout -> finishPlayerTurnStage (tras cinemática)
main.tsx:1956  setTimeout -> setPhase('win') + log
main.tsx:2033  setTimeout -> setPhase('lose')
main.tsx:2370  setTimeout -> endTurnRef (2v2 swap)
main.tsx:2468/2471 setTimeout -> afterPlayerAction (turn advance)
main.tsx:2592  setTimeout -> advanceExchange (enemy idle)
```

Contrato a respetar en la migración: DEFENSE_BASIC/JOINT/LIMIT = navegación
(no commit); GUARD/MOVE/carta válida = commit; atacante/defensor solo vía
activeAttacker()/activeDefender() (nunca exchange===0/1); carta rechazada →
botón deshabilitado/rechazo visible (el fallback automático es del harness de
test, no UX del jugador).

## Pendiente

```text
PA2 UI: BattleScreen real consume Runtime (migrar los 6 puentes de arriba)
PA8 UI: KO visual -> Results (VICTORY/DEFEAT + [REMATCH] [MAIN MENU])
PA10: Results -> Rematch/Main Menu sin window.location.reload()
PA9: Main Menu -> Battle Setup (Select Player/Form/Enemy -> START)
```


Primer gate (Battle Loop) ejecutado a nivel Engine + orquestador emulado:

- `verify:playable-alpha-loop` (nuevo): 5 configs de partida COMPLETA con el
  Engine real, acciones despachadas una a una (sin autoplay mágico), emulando
  el orquestador de main.tsx (JOINT->cardSelect->SELECT_CARD->PLAY_CARD,
  QTE por stage, END_EXCHANGE, defensa COMMITTED, ataque enemigo via
  resolveCard, draw +3 CC por ATTACK PHASE, ataque básico si el mazo enemigo
  se agota).
- Resultado: 5/5 configs estables (117-70 exchanges, 0 softlocks), KO real en
  `fight_to_ko` (lose, turn 35, HP 0). Invariantes por paso: sin doble daño
  (ΔHP == DAMAGE_APPLIED), sin doble gasto (CC>=0), timeline ordenada/no
  huérfana, estado serializable, tick/fase siempre avanzan.
- Hallazgos del harness: (1) DEFENSE_BASIC/JOINT/LIMIT son navegación de menú
  (no commitean — el commit real es GUARD/carta/MOVE); (2) con iniciativa
  enemiga el player defiende en exchange 0; (3) el deck enemigo se agota y el
  juego usa ataque básico; (4) cartas incompatibles (Kamehameha vs Goku en
  ciertos configs) bloquean PLAY_CARD -> el orquestador permite cancelar/BASIC.
- Pendiente PA1: jugar la partida real desde la BattleScreen UI (no emulada),
  fronteras PLAYER_ATTACK_CHOICE/PLAYER_DEFENSE_CHOICE con espera infinita de
  10 min, y Results/Main Menu sin recargar. PA4 verify:card-playability 125/125.


V7 CLOSED (docs/rom/research-v7-support-defense-consumption/AGENT_HANDOFF_PLAYABLE_ALPHA.md).
A partir de aquí el objetivo cambia: ya no «¿qué hace Bank03:$xxxx?», sino
**«¿puedo arrancar el remake y jugar una partida completa, bonita y estable?»**.

## Primer gate: Battle Loop

```text
BOOT -> MAIN MENU -> BATTLE -> CHARACTER/TEAM SELECT -> BATTLE INTRO
-> FIELD -> ATTACK INPUT -> ACTION CINEMATIC -> FIELD
-> DEFENSE INPUT -> ENEMY ACTION + DEFENSE -> FIELD
-> NEXT ROUND -> ... -> KO -> VICTORY/DEFEAT -> RESULT -> MAIN MENU
```

- Attack: FIELD -> PLAYER_ATTACK_CHOICE (espera infinita) -> acción ->
  cinemática -> resolución -> FIELD.
- Defense: PLAYER_DEFENSE_CHOICE (espera infinita) -> Guard/Move/carta ->
  ataque enemigo -> defensa aplicada -> resolución -> FIELD.
- Round: dos exchanges -> post-action maintenance -> nuevo turno.

Pruebas: 10/20/30 rondas sin autoplay, sin softlock, sin doble acción, sin
doble gasto, sin doble daño, sin timeline huérfana.

## Segundo gate: 125 cartas jugables

`CARD PLAYABILITY MATRIX` automática (#001..#125): canExecute correcto, coste,
compatibilidad con personaje, acción termina, timeline termina, sin crash /
softlock / legacy inesperado, resultado correcto, retorno a FIELD.

```text
PLAYABLE      125/125   (obligatorio antes de exigir COMPLETE)
ROM FIDELITY  X COMPLETE / Y PARTIAL / Z PENDING
```

## Tercero: HUD y menús finales

Main Menu, Battle Setup, Character Select, HUD, Pause, Options, Results,
Story. Objetivo: DBZ LSW reconocible al instante, rehecho como juego moderno
2D (pixel art perfecto, sprites correctos, escenarios mejorados, UI limpia,
HUD consistente, transiciones, FX, screen shake controlado, flashes, paletas,
audio, gamepad, fullscreen).

## Reglas

- La ROM solo se investiga de nuevo ante un bloqueo concreto de fidelidad.
- No inventar anchors / bindings / semántica humana no demostrada.
- El Presenter ejecuta primitivas; no conoce ROM.
- Backlog (no V8): $0B07 records finos, $C3CE/$C3CF/$C3D0, $9800 vs shadow,
  semántica de macros, anchors (PENDING_ROM_TRACE).
