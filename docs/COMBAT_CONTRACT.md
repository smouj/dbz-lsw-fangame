# COMBAT CONTRACT — Contrato canónico del combate (2026-08-19)

> Fuente: definición del usuario (16:14 CEST) + GameFAQs (manual USA §9).
> El Engine, el Runtime, la Timeline, el HUD y el Dev Studio consumen ESTE
> contrato. Nada de `playerTurn`/`enemyTurn`: el atacante se deriva siempre
> de iniciativa + exchange.

## 1. Ronda = 2 exchanges

```
ROUND N
│
├─ EXCHANGE 0 → ataca quien tiene la INICIATIVA
│
└─ EXCHANGE 1 → ataca el otro

FIN DE RONDA
→ round++ · exchange = 0 · recalcular iniciativa (SPD efectiva)
```

Desde el punto de vista del jugador solo existe ATTACK o DEFENSE:

```
iniciativa PLAYER → exchange 0 = ATTACK · exchange 1 = DEFENSE
iniciativa ENEMY   → exchange 0 = DEFENSE · exchange 1 = ATTACK
```

**Una ronda acaba cuando ambos lados han tenido su acción correspondiente.**

## 2. El ritmo normal (iniciativa del jugador)

```
ROUND 1
├─ ATTACK PHASE
│    ESPERAR JUGADOR
│    → elegimos acción (carta / BASIC → Stage o Gather / LIMIT / JOINT)
│    → CINEMÁTICA DE NUESTRA ACCIÓN
│    → acción resuelta → FIELD
│
├─ DEFENSE PHASE
│    ESPERAR JUGADOR
│    → Guard / Move / carta defensiva-support
│    → CINEMÁTICA DEL ATAQUE ENEMIGO + nuestra defensa aplicada
│    → acción resuelta → FIELD
│
└─ FIN ROUND 1 → ROUND 2 → ATTACK PHASE → ESPERAR JUGADOR
```

Si el enemigo tiene la iniciativa, la única variante es el orden inicial:
`DEFENSE → ATTACK`.

## 3. El juego se detiene en toda frontera de decisión

`getControlBoundary(state)`:

```
PLAYER_ATTACK_CHOICE   → espera BattleCommand (nada avanza sin él)
PLAYER_DEFENSE_CHOICE  → espera GUARD / MOVE / carta defensiva
ACTION_INPUT           → espera el input de la acción en curso
RESOLVING              → puede avanzar automáticamente
NONE                   → sin control del jugador (win/lose)
```

En `PLAYER_ATTACK_CHOICE`, `PLAYER_DEFENSE_CHOICE` y `ACTION_INPUT` ningún
gameplay avanza sin una orden del jugador — 10.000 ticks no producen nada.

## 4. Toda acción sigue el mismo patrón

```
SELECT
↓
PREPARING      ← cinematografía de la acción (NO inputs, NO timer)
↓
WAITING_INPUT  ← SOLO si la acción requiere input (ej. Stage)
↓
RESOLVING
↓
COMPLETE
```

`getActionExecution(state)` → `IDLE | PREPARING | WAITING_INPUT | RESOLVING | COMPLETE`.

- **Stage** (BASIC o carta 3/4/5/6): `SELECT → PREPARING → WAITING_INPUT → RESOLVING → COMPLETE`
- **Beam / Melee**: `SELECT → PREPARING → RESOLVING → COMPLETE`
- **Defensa**: `SELECT GUARD/MOVE/CARD → COMMITTED → preparación/resolución del ataque enemigo → COMPLETE`

El input aparece SOLO al terminar PREPARING (`inputOpenTick` del reloj del
Engine). La presentación jamás abre el QTE ni arranca el temporizador:
representa los estados que ya decidió el reloj.

## 5. La defensa es una interacción, no un segundo ataque

> GUARD/MOVE/carta **no es "nuestro segundo ataque"**. Es nuestra decisión
> de cómo afrontar el ataque enemigo que viene a continuación.

```
DEFENSE PHASE
↓
GUARD / MOVE(H|V) / CARTA
↓
DEFENSE COMMITTED  ← el Engine aceptó la elección
↓
ENEMY ACTION PREPARATION
↓
ENEMY ACTION CINEMATIC + nuestra defensa aplicada
↓   (Guard bloquea/reduce · Move modifica/esquiva · carta aplica su efecto)
hit / block / avoid / efecto
↓
ENEMY ACTION COMPLETE
```

El enemigo **jamás actúa antes** de que el Engine acepte la elección
defensiva (DEFENSE_COMMITTED).

## 6. Regla final

**El juego nunca toma una nueva decisión por el jugador.**

Solo automatiza la preparación y resolución de una acción que ya ha sido
elegida. `Presentation` muestra PREPARING/INPUT/RESOLVING — no decide cuándo
empieza el siguiente exchange, cuándo ataca el enemigo ni cuándo se abre una
ventana de gameplay.

## En una sola línea

**Ronda = nuestra acción + acción enemiga, con una decisión del jugador
antes de cada parte que le corresponda controlar.**

Con iniciativa normal del jugador:

```
ATTACK → cinemática → DEFENSE → cinemática enemiga → nueva ronda → ATTACK
```
