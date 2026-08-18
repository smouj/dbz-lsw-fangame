# BATTLE ENGINE MIGRATION — P1 #3 (plan de trabajo)

> **Baseline contractual**: `PRE_BATTLE_ENGINE_MIGRATION_BASELINE` (commit `711c2ee7`).
> Todo el gameplay observable de ese commit es el CONTRATO a preservar. La
> migración NO reescribe el combate: encapsula el comportamiento verde dentro
> de una máquina determinista. Al terminar, el gameplay debe ser IDÉNTICO —
> solo cambia quién posee el estado y quién decide las transiciones.

## Arquitectura objetivo

```text
UI / React / Dev Studio
 │  commands
 ▼
┌──────────────────────────┐
│ BattleEngine             │  authoritative state · phases/turns · actions
│                          │  validation · resolution · RNG · battle events
└─────────────┬────────────┘
 │  events
 ▼
┌──────────────────────────┐
│ Battle Presentation      │  cinematics · animation sequences
│                          │  camera/background · SFX · QTE presentation
└─────────────┬────────────┘
 ▼
PixiJS Renderer
```

**Regla principal**: React/Pixi NO deciden reglas de combate. BattleEngine NO
decide cómo se dibuja una cinemática.

## Contrato de estado (sin DOM)

`BattleState` puro: tick · phase (intro/attack/defense/resolution/finished) ·
exchange (index/attackerId/defenderId) · fighters · positions · commandCounters ·
hand/deck/discard · pendingAction · outcome · rng. NADA de HTMLElement/Sprite/
Texture/setTimeout/Audio/React setters/CSS/DOMRect dentro del estado.

## Comandos (la UI no muta estado directo)

```ts
type BattleCommand =
  | { type: 'START_BATTLE' }
  | { type: 'SELECT_BASIC' }
  | { type: 'USE_STAGE_ATTACK'; stage: 3 | 4 | 5 }
  | { type: 'GATHER_POWER' }
  | { type: 'USE_CARD'; cardId: string }
  | { type: 'GUARD' }
  | { type: 'MOVE'; axis: 'horizontal' | 'vertical' }
  | { type: 'USE_DEFENSE_CARD'; cardId: string }
  | { type: 'QTE_INPUT'; input: CommandInput }
  | { type: 'QTE_TIMEOUT' }
  | { type: 'DEFENSIVE_RESPONSE'; choice: 'defend' | 'continue' };
```

`canExecute(command)` = ÚNICA autoridad de legalidad (la UI lo consulta para
deshabilitar botones, pero `dispatch` vuelve a validar — nunca confiar en el
frontend).

## Eventos (resolución ≠ presentación)

```ts
{ type: 'ACTION_STARTED', actionId, attacker, defender }
{ type: 'QTE_STARTED', sequence, durationTicks }
{ type: 'QTE_INPUT_RESULT', index, success }
{ type: 'DAMAGE_APPLIED', target, amount }
```

La capa visual interpreta los eventos (TACTICAL→ACTION→QTE→impacto→damage→
ACTION→TACTICAL) pero la cinemática NO decide el daño.

## Reloj único GBC

`GBC_NATIVE_FPS = 59.7275005696`. Eliminar progresivamente setTimeout/
setInterval/Date.now/performance.now como fuentes de verdad del combate.
El motor trabaja en TICKS (`durationTicks: 72`); la conversión a ms es
presentación/debug.

## Orden de migración por dominios

- **M1 State** — HP/CC/turn/phase/attacker/defender/positions/cards (sin gameplay)
- **M2 Legality** — qué puede usarse, fases, costes, requisitos, posición, CC
- **M3 Phase machine** — ATTACK/DEFENSE/exchange/next exchange/turn completion
- **M4 BASIC** — Gather Power + Stage Attack 3/4/5 (lo más comprobable)
- **M5 Defense** — Guard + MOVE h/v + support cards
- **M6 Cards** — Damage/Beam/Support/Guard/Joint/Character/Limit
- **M7 QTE** — sequence/timer/success/failure/partial/counterattack al engine
- **M8 Damage/resolution** — UNA ruta `resolveAction()` (nada de cálculos en componentes)
- **M9 Battle end** — KO/victory/defeat/rewards/story continuation

## Posiciones canónicas (en el engine, no en el HUD)

`ground_far ↔ ground_near` · `air_far ↔ air_near` (MOVE horizontal).
`ground_far ↔ air_far` · `ground_near ↔ air_near` (MOVE vertical).
Nunca ground_far → air_near en una acción. El motor impide estados imposibles.

## BattleEventLog + RNG determinista

- Cada partida produce un log de eventos con tick (tests, reproducciones,
  Dev Studio, comparación GBC, futuro PvP, replays, desync detection).
- Toda aleatoriedad entra por `engine.rng` (nunca Math.random): seed + inputs =
  misma batalla.

## Nuevas vistas Dev Studio (tras el núcleo)

COMBATE: HUD · Combat Lab · Positions · **Battle Engine** (phase/exchange/
attacker/defender/CC/HP/position/pending action/seed/tick) · **Battle Events**
(timeline con tick) · Sequence Lab · **Replay** (seed + command log = batalla).

## Criterio de aceptación

- BattleEngine dueño del BattleState · React sin reglas · Pixi sin reglas
- Todas las acciones como BattleCommand · transiciones → BattleEvent
- RNG determinista · reloj único GBC · posiciones validadas
- QTE/damage/defense gobernados por el engine
- Sin setTimeout autoritativos ni Math.random autoritativos
- Replay determinista posible · TODOS los tests previos verdes
- Nueva suite `verify:battle-engine` (transiciones e invariantes, no UI)

## Orden de pendientes actualizado

1. BattleEngine (P1 #3) → 2. BattleEngine Dev Studio → 3. Story E2E → 4. responsive

## Progreso de la migración

- **M1 ✅** — BattleState puro extraído (`src/battle/engine/state/`) — 30 invariantes.
- **M2 ✅** — BattleCommand + canExecute (`src/battle/engine/commands/`): unión
  discriminada de los comandos REALES auditados (command-strip, mano, BASIC,
  defensa, QTE), `CommandCheck` con razones tipadas (nunca texto), reglas por
  dominio (resource/card/movement/defense), `getAvailableCommands()` para la UI,
  `canExecute` 100% puro (state + command → check, sin mutación/RNG/timers),
  tests de PARIDAD legacy↔engine (LIMIT/GATHER/PLAY_CARD). 60 invariantes.
- **M3 ✅** — executeCommand puro (`commands/executeCommand.ts` +
  `reduceAcceptedCommand.ts` + `reducers/`): canExecute es BARRERA OBLIGATORIA
  (no existe ruta sin validación) · rechazo = el MISMO objeto state (cero
  mutación) · reducers por dominio (resource/card/movement/power+defense+
  stage) · recursos UNA sola vez · movimiento con destino derivado
  (applyMoveAxis, 8/8 casos) · QTE determinista (acierto/fallo/contraataque) ·
  sin RNG (lo RNG-dependente delimitado a M5) · `mustExecute` para secuencias
  HEADLESS desde Node. 79 invariantes.
- **M4 ✅** — BattleEvent + EventLog (`src/battle/engine/events/`): unión
  discriminada de HECHOS resultantes (COMMAND_ACCEPTED/REJECTED, CC_SPENT/
  GAINED, KI_SPENT, CARD_SELECTED/PLAYED/DISCARDED, POSITION_CHANGED,
  GUARD_STARTED, GATHER_STARTED/POWER_CHANGED, QTE_STARTED/INPUT_RESOLVED/
  COMPLETED/FAILED/COUNTER_*, ACTION_STARTED/RESOLVED con descriptor
  serializable, DAMAGE_APPLIED/FIGHTER_DEFEATED listos para M5,
  PHASE_CHANGED). Los eventos salen de las MUTACIONES REALES de los reducers
  (nunca de diff de snapshots), son JSON serializables, sin callbacks/DOM/
  React/Pixi, y el orden es contractual (ACCEPTED primero → dominio en orden
  de mutación → ACTION_STARTED → PHASE_CHANGED al final). Rechazo = estado
  idéntico + COMMAND_REJECTED. executeCommand devuelve { state, events };
  EventLog nace secuenciado (sequence 0..N, tick en M6). 31 checks M4 nuevos +
  4 golden fixtures (`scripts/fixtures/m4_*.json`) que blindan el orden.
- **CANON DE ANIMACIÓN ✅** — `src/battle/animationCanon.ts` + `docs/ANIMATION_CANON.md`:
  BattleEvent → poses canónicas de los sheets perfectos por familia
  (stage/damage/beam/support/gather/guard/move), con aura power/support y
  fallbacks de manifest (V9). 6 checks en verify:battle-engine.
- **M5 ✅ — RNG determinista + daño** (`src/battle/engine/random/prng.ts` +
  `combat/resolution.ts` + `reducers/damageReducer.ts`):
  - PRNG canónico mulberry32 puro (initRng/nextRng/rollPercent/rollRange);
    `seed` explícito + `rngState` en BattleState (default canónico 1; nunca
    Date.now/Math.random — verificado por escaneo de TODO el engine).
  - RNG SOLO cuando hace falta: rechazado → 0 avances · determinista → 0
    avances · damage/beam card → 1 (accuracy) + 1 (respuesta) + 1 (eje o
    hit/block/avoid), miss → solo 1.
  - P1: PLAY_CARD inicializa REALMENTE su QTE (stageQte + secuencia pool
    determinista por tick + ventana GBC por profundidades + QTE_STARTED).
  - P2: PLAY_LIMIT_CARD cobra el CC REAL del catálogo (+ INSUFFICIENT_CC).
  - applyDamage = única ruta de HP: DAMAGE_APPLIED (amount = hpBefore −
    hpAfter) → FIGHTER_DEFEATED en orden causal · ATTACK_HIT/ATTACK_MISSED
    (miss observable, sin amount=0).
  - QTE fallo → COUNTER_WINDOW (el GBC no rechaza inputs) · DEFEND = daño
    parcial por progreso · TIMEOUT = daño real del counter (fórmula legacy).
  - Shadow parity: HIT/BLOCK/AVOID (90 combos), accuracy ±30, attackDamage,
    stage/counter/partial, powerFor/spdFor — mismos inputs → mismos veredictos.
  - Golden determinista: mismo seed+comandos ⇒ mismo state+events+rngState.
  - verify:battle-engine: 110 → **149 checks** · suite completa verde ·
    tsc · build OK.
- **M6 ✅ — GBC Clock** (`src/battle/engine/clock/clock.ts` +
  `src/battle/GbcClockAdapter.ts`):
  - `advanceBattleClock(state, ticks)` puro y separado de executeCommand
    (tiempo ≠ intención; sin comandos TICK/WAIT/TIMEOUT). tick entero,
    monotónico y autoritativo; BattleState sin fracciones.
  - QTE/COUNTER con startedTick/deadlineTick/counterDeadlineTick ABSOLUTOS.
    Regla de borde contractual: currentTick < deadline → abierta; >=
    deadline → timeout UNA vez (cubiertos deadline−1/deadline/deadline+1).
    advance(N) ≡ advance(1)×N (bucle interno tick a tick — ningún timeout
    se pierde aunque el render vaya lento).
  - El timeout del QTE (INPUT → COUNTER_WINDOW) y del contraataque
    (counter daño real) los dispara el RELOJ, no un comando: eliminado
    QTE_COUNTER_TIMEOUT; nuevo evento QTE_TIMEOUT + action 'TIMEOUT' en
    QTE_COUNTER_RESOLVED.
  - BattleEventEnvelope = { sequence, tick, event } (varios eventos
    comparten tick; sequence = orden causal). appendOutcomeToEventLog con
    eventTicks por hecho.
  - GbcClockAdapter (FUERA del Engine): deltaMs reales → 0..N ticks
    enteros; la fracción sobrante vive en el adaptador, nunca en el
    estado. ticksFromDeltaMs puro + clase con estado.
  - Paridad demostrada: la MISMA batalla (seed + comandos + 6s de reloj)
    a 30/60/144 FPS, deltas irregulares y headless produce el MISMO
    state + EventLog (tick incluido) + rngState.
  - verify:battle-engine: 149 → **170 checks** · suites completas verdes ·
    tsc · build OK.
- **M7 ✅ — Presentation Adapter** (`src/battle/engine/presentation/` +
  `src/devtools/timeline.tsx` + `scripts/verify-presentation.ts`):
  - `buildPresentationTimeline({ events, context })` PURO (0 React/DOM/
    Pixi/timers) — EventLog → BattleTimeline de cues en ticks GBC.
  - PresentationCue: unión discriminada (SCENE/FIGHTER_POSE/FIGHTER_VISIBILITY/
    FIGHTER_POSITION/AURA/PROJECTILE/CAMERA/IMPACT/HUD/AUDIO) con ticks
    absolutos y durationTicks — nunca delayMs. Poses SEMÁNTICAS (sin paths).
  - Dos tiempos: logicalTick (del evento, NUNCA modificado) + cue.tick
    (presentación — secuencias ancladas a ACTION_STARTED + frames del canon).
  - Escenas canonizadas: OVERVIEW / PLAYER_ACTION / ENEMY_ACTION /
    SPECIAL_ACTION. ACTOR/TARGET relativos; facing V9 por transformación
    (resolveFacing: player→1 · enemy→−1, sin assets duplicados).
  - animationCanon = fuente semántica (kind/visual → familia → beats);
    perfiles firma aplicados con profileId + fidelity conservados por cue
    (jerarquía FRAME_VERIFIED > firma > familia > fallback).
  - aura_power/aura_support como CAPAS (AURA cue) — nunca poses.
  - Resultados event-driven: ATTACK_HIT/MISSED → IMPACT (hit/block/guard/
    miss) + poses; FIGHTER_DEFEATED → K.O.; jamás se deduce mirando HP.
  - QTE/counter con timeline propio (QTE_STARTED/INPUT/FAILED/TIMEOUT /
    COUNTER_STARTED/RESOLVED → HUD/AUDIO cues; la UI consulta deadlines).
  - 11 escenarios headless compartidos (Dev Studio + fixtures) + golden
    fixtures scripts/fixtures/m7_*.json (11). Propiedad central: mismo
    EventLog ⇒ mismo Timeline (independiente de FPS — M6 ya lo probó).
  - Dev Studio: vista #dev/timeline — tabla Evento/Tick lógico/Tick cue/Δ/
    Cue/Actor/Pose/FX/Fondo/Fidelidad/Perfil (base de la pasada
    FRAME_VERIFIED). Legacy runtime intacto (M7 coexiste; M8 hará el cutover).
  - verify:presentation: 64 checks · battle-engine 170 · suites verdes ·
    tsc · build OK.
- **M8 (siguiente)** — integración/cutover (main.tsx consume el engine:
  EventLog → Timeline → Presenter Pixi; soporte completo, OHKO, equipo,
  defensa con carta entrante) · **M9** Replay.
