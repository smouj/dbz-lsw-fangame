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
- **M5 (siguiente)** — RNG determinista (daño/acc) y emisión real de
  DAMAGE_APPLIED/FIGHTER_DEFEATED · **M6** ticks · **M7** Presentation Adapter
  (consume el canon + perfiles firma) · **M8** integración/cutover ·
  **M9** Replay.
