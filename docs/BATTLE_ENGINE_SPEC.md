# DBZ LSW — Battle Engine Spec (canónica, corregida)

Fuente: FAQ/manual contemporáneo, RPGClassics shrine, StrategyWiki, guías de la época,
investigación de memoria por la comunidad, y análisis de la ROM USA (CRC32 025AA88A).

> ⚠️ Esta spec CORRIGE la implementación anterior. No implementar literalmente la
> primera versión (tenía errores: CC máx, mano, Gather Power, Speed, IA).

## Correcciones confirmadas

1. **CC NO tiene máx 13**. Capturas muestran 35-42 CC acumulados; cartas cuestan >30 CC.
   GameShark USA pone CC=0x63 → **99 es el límite efectivo** (verificar clamp en ROM).
2. **Mano**: 3 Joint iniciales + 1 robo al comenzar Attack Phase = 6 transitorio,
   pero solo **5 persisten** a la siguiente fase (descartar si >5).
3. **Gather Power**: consume la acción de ataque completa, habilita Limits,
   Basic 3 Stage → 4 Stage, estados `FULL_POWER → HALF_POWER → NORMAL` (parpadeo
   rápido luego lento). Limits disponibles los 2 turnos posteriores.
4. **Speed**: determina prioridad/orden y participa en bloqueo/esquiva.
   NO está demostrado que aumente la precisión directamente.
5. **IA**: el patrón Gather→5 Stage→especial es frecuente pero hay excepciones
   (CC, mano, Power, distancia, posición, HP, deck).

## Tabla canónica

| Elemento | Comportamiento GBC |
|---|---|
| Personajes activos | 1 normal; algunos combates 2 |
| Joint Deck | exactamente 20 cartas |
| Copias | máx 3 de la misma carta |
| Limit Deck | máx 3 por personaje (2 en Android 19/20) |
| Basic Deck | acciones permanentes, no se consumen |
| Mano inicial | 3 Joint aleatorias |
| Robo | +1 Joint al comenzar Attack Phase |
| Mano persistente | máx 5 (transitoria 6) |
| CC inicial | verificar en ROM |
| CC por ataque | +3 al comenzar Attack Phase |
| CC Stage | +1 por input correcto |
| CC por daño | +2 si pérdida sustancial (+mods por vulnerabilidad/posición) |
| Victoria | HP del equipo rival agotado |
| Nivel | 1–5 (EXP: Lv2=3, Lv3=15, Lv4=50, Lv5=500) |

## Turno = ROUND

```
ROUND
├── determinar prioridad por SPEED
├── Combatiente más rápido → su Attack Phase → Defense del rival
└── Combatiente más lento  → su Attack Phase → Defense del rival
```

Si SPEED cambia durante el combate, cambia quién empieza el siguiente round.
NO recalcular el orden a mitad de round (hasta que la ROM demuestre lo contrario).

## Attack Phase: LIMIT / JOINT / BASIC / CHARA

- **LIMIT**: cartas equipadas del personaje. Reutilizables, no se descartan,
  cuestan CC, solo disponibles mientras Powered Up, restricciones de personaje.
- **JOINT**: mano del mazo de 20. Una carta usada desaparece de la mano.
- **BASIC**: Stage Attack (3 Stage normal, 4 Stage powered) + Gather Power.
- **CHARA**: cambiar activo/reserva (solo combates 2v2, solo en Attack).

## Stage Attacks (reproducir exactamente)

- 3/4/5/6 Stage. Cada input correcto: **CC += 1** y continúa.
- **Ventana TOTAL de la secuencia según posición relativa (manual GBC USA)**:
  cuanto MÁS CERCA del rival, MÁS tiempo (manual) — ❌ OBSOLETE (2026-08-22, ROM).
  Valores reales en docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md §5:
  `FRONT_FRONT=150t (2.511s) · FRONT_BACK=120t (2.009s) · BACK_FRONT=80t (1.339s) · BACK_BACK=50t (0.837s)`
  (×59.7275 → 72 / 102 / 143 / 173 ticks). ⚠️ Los extremos están confirmados
  (B/B ≈ 50t máx distancia · F/F ≈ 150t mín distancia) — matriz completa ya
  ✅ ROM_CONFIRMED (bit1 de ambos fighters, rutina Bank01:$66E4).
  El reloj corre global para completar TODOS los comandos (no por input).
- **Durante el QTE el luchador está en pose NEUTRAL (idle)**. La animación de la
  acción SOLO se ejecuta al completar la secuencia (GBC real).
- **Al completar**: se ejecuta la cinemática completa de la acción
  (attacker → travel → target → return) y el daño completo se aplica al terminar.
- **Al fallar** (input equivocado o timeout): RECOVERY_PROMPT (manual GBC +
  comunidad: el GBC final muestra icono en ACTION SCREEN con A/B):
  - **A (Q) = BANK / DEFENDER**: conservas los CC ya acertados y TERMINAS el
    Stage. ⚠️ FIDELITY V10 — A NO implica necesariamente 0 daño: veteranos y
    Q&A aceptada documentan que los comandos completados pueden contar con
    daño REDUCIDO/proporcional al progreso (fórmula exacta UNKNOWN/HYPOTHESIS
    hasta captura ROM; si no hay recuperación previa sí puede acabar en 0).
  - **B (E) = REPAIR / CONTINUAR**: continúas el Stage desde el input fallido
    (la ventana de secuencia se reinicia para los inputs restantes).
  - Sin input válido o ventana excedida: el contraataque del rival CONECTA
    (COUNTER_HIT). Las ventanas exactas A/B (≈0.4s/≈0.15s actuales) son
    HYPOTHESIS — no denominarlas canon.
- Interrupción (Foresight/Telepathy/Time Freeze): fuerza el fallo (0 aciertos).
- Ventana GLOBAL de secuencia (manual GBC, 4 valores por posición relativa):
  `FRONT_FRONT=150t · FRONT_BACK=120t · BACK_FRONT=80t · BACK_BACK=50t` ✅ ROM_CONFIRMED.
- Estados: `INPUT_WINDOW → COMPLETED` (cinemática, daño completo) |
  `COUNTER_WINDOW` (contraataque A/B con timing) → `SAFE_ABORT` | `COUNTER_HIT`
  (el counter conecta sobre el atacante).

## Gather Power (estado real)

```ts
enum PowerState { NORMAL, HALF_POWER, FULL_POWER }
```

- FULL_POWER al usar (consume Attack Phase) → HALF_POWER → NORMAL.
- Mientras activo: Limit ENABLED, Basic 3 Stage → 4 Stage, **+4 STR +4 KI**
  (comunidad; verificar contra ROM).

## Defense Phase: LIMIT / JOINT / BASIC (sin CHARA)

- Cartas permitidas: Defense + Support/Item aplicable.
- BASIC: Guard + Move.
- **Orden canónico (implementado)**: el defensor elige su defensa ANTES de que se
  ejecute la animación del ataque. La cinemática del atacante (playCardCinematic
  con side del atacante) se dispara al elegir defensa, y el daño se resuelve al
  terminar la cinemática. No es un QTE reactivo.

## Cinemática de acción (timing implementado, alineado con las animaciones CSS)

La presentación ACTION recorre `attacker → travel → target → return` y los frames
GBC se eligieron para que las animaciones CSS NUNCA se corten a mitad:

| Tipo | attacker | travel | target | total |
|---|---|---|---|---|
| Beam | 54f (0.90s) | 54f (0.90s) | 44f (0.74s) | 152f ≈ 2.54s |
| Damage/Command | 50f (0.84s) | 44f (0.74s) | 38f (0.64s) | 132f ≈ 2.21s |
| Support (sin target cut) | presentationMs = 118f ≈ 1.98s | — | — | — |

- `fx-actor-center` 0.82s ≤ attacker 0.84s (damage) / 0.90s (beam).
- `fx-rush-body` 0.70s ≤ travel 0.74s; `fx-beam-*` 0.86s ≤ travel 0.90s.
- La vuelta al campo (return) mantiene un beat corto antes de desmontar la capa.

## Guard (NO es simple %)

Resultados posibles: NORMAL GUARD (~todo el daño, algo reducido),
BLOCK (~1/4), AVOID (0). Probabilidad ligada a Speed defensor × Accuracy
ataque × estados evasión/precisión. Extraer de ROM, no inventar %.

## CC por daño recibido (manual GBC §14)

- +1 base al recibir daño.
- +2 si la pérdida es sustancial (≥15% maxHP, umbral HYPOTHESIS).
- +1 adicional si el ataque acierta la vulnerabilidad de posición
  (Beam contra AIR / Damage contra GROUND).

## Movimiento y empuje (manual GBC §9, 2026-08-12)

- MOVE es una acción DEFENSIVA básica (B → Movement), no una fase.
- **MOVE usa SOLO 2 ejes** (nunca 4 destinos directos). Cada decisión
  transforma UN eje y conserva el otro — imposible teletransportarse en
  diagonal (Air/Back → Ground/Front requiere DOS acciones):
  - `HORIZONTAL ↔` → cambia depth (BACK↔FRONT), conserva altitude.
  - `VERTICAL ↕` → cambia altitude (GROUND↔AIR), conserva depth.
- Al avanzar a FRONT (eje HORIZONTAL) cuando el rival está en BACK, el rival
  pasa a FRONT (no se crea una quinta posición: el frente empuja al frente).
  VERTICAL jamás modifica Front/Back.
- Las 4 posiciones: AIR+BACK / AIR+FRONT / GROUND+BACK / GROUND+FRONT.
  Beam es efectivo contra AIR; Damage contra GROUND. FRONT sacrifica defensa
  por ataque; BACK al revés.

## Campo (4 posiciones por luchador)

- **Vertical**: AIR → vulnerable a BEAM, resistente a DAMAGE.
  GROUND → vulnerable a DAMAGE, resistente a BEAM.
- **Horizontal**: FRONT → +ataque, −defensa. BACK → −ataque, +defensa.
- Calcular `playerPosition`, `enemyPosition`, `relativeDistance`
  (no solo posición absoluta).

## Distancia modifica daño

Avanzar BACK → FRONT ≈ **+8 STR/KI efectivos** por avance (mediciones repetidas).

## Damage vs Beam

```
Damage → STR (cardPower + effectiveSTR + position + distance + guard + variance)
Beam   → KI  (cardPower + effectiveKI + position + distance + guard + variance)
```

Fórmula algebraica exacta: **extraer de la ROM**, no inventar.

## Accuracy / Block / Avoid

`cardAccuracy × defenderSpeed × accuracyModifier × avoidModifier × Guard?` → MISS/BLOCK/HIT.
No usar `chance = cardAccuracy + attackerSpeed` sin verificar en binario.

## Stat stages

- Parámetros con niveles temporales **−3..+3** (`clamp(statStage + effect, -3, 3)`).
- Incrementos de cartas ≈ **8 unidades internas**.
- Estados: Accuracy Up, Avoid Up, Damage Fail, Beam Fail, Support Cancel,
  Power Down... `Damage Fail` y `Beam Fail` NO coexisten.

## Progresión

- Niveles 1–5. EXP: 3/15/50/500.
- Al subir: estrella + elegir HP/STR/KI/SPD.
- **Crecimiento específico por personaje** (no +1 universal):
  `{ base: {}, growth: { hp, str, ki, spd } }`.

## IA

Clonar la real: stats, deck, limits, decision rules, story overrides.
Patrón típico (ataque → Gather → 5 Stage → Beam/Damage) con excepciones por
CC/mano/Power/distancia/posición/HP/deck.

## Arquitectura objetivo

```
BattleEngine
├── BattleState
├── RoundController
├── TurnOrderResolver
├── CardEngine
├── CommandAttackEngine
├── DamageResolver
├── AccuracyResolver
├── PositionResolver
├── CCSystem
├── PowerStateSystem
├── StatusEffectSystem
├── DeckManager
├── HandManager
├── CharacterSwitcher
├── AIController
└── BattleEventLog
```

La UI solo observa `BattleState` y reproduce animaciones/sprites/sonido/HUD.
Nunca decide reglas. Mismo motor para Story, Battle, VS y tests.

## Piezas a extraer de la ROM (no inventar)

1. Fórmula exacta de daño.
2. Fórmula exacta HIT/BLOCK/AVOID.
3. Máquina exacta de decisión de la IA.
4. Clamp de CC (confirmar 99).
5. Valores de crecimiento por personaje.

---

## 📡 ACTUALIZACIÓN 2026-08-10: Fórmulas reales extraídas (spreadsheets oficiales)

Fuente: https://legendarysuperwarriors.wordpress.com/spreadsheets/ (Mochi/LSW team)
Datos crudos en `docs/rom-data/` (6 spreadsheets + 12 pestañas CSV).

### Fórmula de daño REAL (validada con tests de la comunidad)

```
Damage = (power + move) × positionMultiplier × block
```

- `power` = STR del atacante (cartas Damage) o KI (cartas Beam)
- `move` = poder de la carta (ej. Galick Gun = 20)
- `positionMultiplier` REAL (tests con Buu Evil recibiendo Cont.Punch de Goten STR 6):
  | Posición | Mult |
  |---|---|
  | Front + tipo vulnerable (ground+Damage / air+Beam) | **0.8** |
  | Resto (back, front con tipo no vulnerable) | **0.5** |
- `block` = defend/endurance del GBC = **×0.5**
- `damage guard` (carta de guardia) = **×0.7**

### Stats reales del GBC (48 formas)

- Cada forma tiene stats BASE (nivel 1) + curva de crecimiento por cuartos
  (valores en niveles 25/50/75/100). Interpolación lineal entre cuartos.
- Ej: Goku Normal 90/9/13/6 → max 142/30/28/26; Vegito Super 110/17/18/10 → 170/44/39/38
- Códigos de transformación (ROM hex): Super = Life+10, Str+5, Ki+3, Spd+2;
  Ultimate = +15/7/5/3; Mystic = +20/10/7/4
- Implementado: `roster.ts` (FormDef.curves) + `statAtLevel()` + `applyLevelUps()`

### Nivel IA real (battle mode)

```
aiLevel = (playerLevel - 1) * 2 + 1
```
- La IA tiene 2 upgrades (Hp/Str/Ki/Spd) por cada 1 del jugador
- PLevel 1 → aiLevel 1 · PLevel 5 → aiLevel 9
- Battle mode: 3 tiers de personajes (forma final = tier 3, sin transformar = tier 1)
- Story mode tiene campo "AI boost"

### Turnos / roles reales

- Cada round hay UN atacante y UN defensor; la SPEED decide quién empieza
- El turno ALTERNA jugador ↔ enemigo (la velocidad solo decide el primero)
- Atacante: posición + B (gather / 3-stage, 4 con power) o J (cartas) o L (limits)
- Defensor: MOVE (reposicionar) o DEFEND (block ×0.5)
- BASIC no cuesta CC · Command Cards CC=0 (+1 CC por comando acertado)

### Economía CC real

- +3 CC cada vez que eres el atacante
- +1 CC por comando acertado de Command Card
- +2 CC cuando tu HP baja sustancialmente (≥15% en un golpe)
- Bonus por localización (aire+Beam / suelo+Damage)
- Las cartas Joint/Limited CUESTAN su CC (18 cartas cuestan 0)

### Mazos enemigos reales (story/battle)

- Cada jefe usa un mazo fijo: Stage Attacks (3/4/5/6) + sus especiales
- Story tab 1 (32 jefes) y battle tab 2 (48 formas) en docs/rom-data/enemy_gid_*.csv
- Patrón IA: ataca → gather → 5 Stage → Beam/Damage → repite

---

## 🏷️ Niveles de evidencia (regla del proyecto)

Ningún valor inferido se presenta como "original del GBC" sin nivel de evidencia.
Cada comportamiento lleva una de estas etiquetas:

| Tag | Significado |
|---|---|
| `CONFIRMED_MANUAL` | Documentado en el manual/FAQ oficial |
| `CONFIRMED_ROM` | Verificado desensamblando la ROM USA (CRC32 025AA88A) |
| `CONFIRMED_MEMORY` | Verificado en la memoria del juego (direcciones conocidas) |
| `COMMUNITY_TESTED` | Reproducido por pruebas comunitarias (no rutina desensamblada) |
| `HYPOTHESIS` | Inferencia razonable sin confirmar |
| `UNKNOWN` | Sin datos |

### Registro de decisiones (2026-08-10, revisión canónica)

```yaml
exp_thresholds:
  lv1_to_2: 10     # CONFIRMED_MANUAL
  lv2_to_3: 50     # CONFIRMED_MANUAL
  lv3_to_4: 150    # CONFIRMED_MANUAL
  lv4_to_5: 500    # CONFIRMED_MANUAL
  lv5_plus: 500 * 3.2^(lv-4)  # HYPOTHESIS (extrapolación, sin datos)

cc:
  maximum: 999     # DECISIÓN DEL USUARIO (2026-08-11): el máximo CC del remake es 999.
                   # Revierte la revisión anterior de /13 (pantalla "CC: /13" del shrine).
                   # El clamp en ROM real sigue pendiente de CONFIRMED_ROM, pero el
                   # remake usa 999 como tope del contador.
  attack_phase_gain: 3      # CONFIRMED_MANUAL
  command_input_gain: 1     # CONFIRMED_MANUAL (por input acertado)
  substantial_damage_gain: 2  # CONFIRMED_MANUAL
  substantial_damage_threshold: 0.15 * maxHP  # HYPOTHESIS (UNKNOWN en ROM)
  vulnerable_position_bonus: NO  # Sin evidencia → no implementado

gather_power:
  str_bonus: 4     # COMMUNITY_TESTED
  ki_bonus: 4      # COMMUNITY_TESTED
  limits_enabled: true      # CONFIRMED_MANUAL (2 turnos siguientes)
  basic_stage_4: true       # CONFIRMED_MANUAL (3→4 mientras cargado)
  duration: 2 turns         # CONFIRMED_MANUAL (activación + 1, ver ROM)

healing:
  resurrection: 0.25 * maxHP        # CONFIRMED_MANUAL (½ en defensa)
  dende: (1/4 + 1/3) * maxHP        # CONFIRMED_MANUAL (offense)
  medical_machine: atk + (SPD/2*4)  # HYPOTHESIS (fórmula real usa "phase")

position:
  front: +atk -def / back: -atk +def  # CONFIRMED_MANUAL
  air_vuln_beam / ground_vuln_damage  # CONFIRMED_MANUAL
  multipliers 0.8/0.5                  # COMMUNITY_TESTED (tests con Buu/Goten)

damage_formula: (power + move) * posMult * block
  power: STR (damage) / KI (beam)      # CONFIRMED_MANUAL
  block: 0.5 (defend/endurance)       # COMMUNITY_TESTED
  guard_card: 0.7                     # COMMUNITY_TESTED
  exact_routine: UNKNOWN              # P0: extraer DamageResolver de la ROM
```

### Incógnitas abiertas (bloqueadores de fidelidad 1:1 — priorizadas)
- **P0**: fórmula exacta Damage/Beam/Stage (orden de ops, rounding, min/max, variance)
- **P0**: HIT/BLOCK/AVOID + Basic Guard (probabilidades, divisor de block, RNG)
- **P0**: RNG de combate (algoritmo PRNG, seed, call order)
- **P1**: algoritmo de decisión de la IA (mazos conocidos, decisión no)
- **P1**: recálculo de iniciativa por SPD (momento exacto)
- **P1**: clamp CC real (add_cc/clamp_cc en ROM)
- **P1**: umbral "daño sustancial" (+2 CC)
- **P1**: contadores internos de Gather Power
- **P1**: buff/debuff stacking (máx acumulaciones, persistencia al cambiar personaje)

---

## 🛡️ Separación de estados defensivos (Guard NO es un único valor)

La hoja de cartas confirma efectos explícitos de Guard (Kiai −8, Flesh Guard +8,
Scouter −8) → Guard es un stat independiente de la posición. El motor distingue:

| Estado | Representación | Cartas que lo afectan |
|---|---|---|
| `positionDefense` | front/back · air/ground (4 posiciones) | — |
| `guardStat` | pStages.guard / eStages.guard (−3..+3, cada stage = 8) | Kiai(−), Flesh Guard(+), Scouter(−) |
| `basicGuardAction` | DEFEND (block ×0.5) al defender | — |
| `defensiveCard` | playerGuard: avoid_beam/avoid_damage/reduce/absorb/cancel | Teleport, Barrier, Taiyoken, Avoiding, Endurance, Foresight... |
| `avoidStatus` | pEva (Afterimage +30% evasión, 2 turnos) | Afterimage |
| `lockOnStatus` | pLockOn (próximo ataque no falla) | Lock On |

### Crecimientos por estrella (arrays, no valores únicos)
`docs/rom-data/growth_deltas.json`: las 48 formas con deltas por estrella
(base→25, 25→50, 50→75, 75→100) por stat. Ejemplos verificados contra la doc:
- Gohan Kid STR: [5, 6, 5, 5] (la doc decía +5,+5,+6,+5 según orden de lectura)
- Goku Normal STR: [6, 5, 5, 5] ("Goku obtiene un 6 en su primera mejora STR" ✓)
- Cada forma tiene su propia tabla (las transformaciones alteran el orden)

### Efectos especiales con flags (verificados en cards.ts)
| Flag | Carta(s) | Estado |
|---|---|---|
| UNAVOIDABLE | Tail (damage_pierce) | ✅ |
| UNBLOCKABLE | Body Change (beam_varhp, ½ HP) | ✅ |
| COMMAND_INTERRUPT | Foresight/Telepathy/Time Freeze (solo Guldo) | ✅ |
| ANDROID_KILL | Stop Device | ✅ |
| LIFE_STEAL | Absorb Ki (life_drain) | ✅ |
| END_GATHER | Yakon (id 95: disipa el poder + resetea mejoras) | ✅ nuevo |
| RESET_BUFFS | Babidi/Yakon (powerup_dispel → eStages a 0) | ✅ nuevo |
| ANTI_BEAM | Teleport/Barrier/Kibito (avoid_beam/beam_shield) | ✅ |
| LOCK_ON | Lock On (próximo ataque asegurado) | ✅ nuevo |
| ACC_UP / EVADE_UP | Reading Ki (+30% 2t) / Afterimage (+30% evasión 2t) | ✅ nuevo |
| CC_BONUS | Caps. Fridge (+5 CC) | ✅ |
| DEBUFF_SPD / DEBUFF_GUARD | Paralysis / Kiai·Scouter | ✅ corregido (antes restaban STR/KI) |

---

## 🛡️ Basic Guard: HIT/BLOCK/AVOID (implementado, 2026-08-10)

Cuando el defensor usa Basic Guard (DEFEND) se resuelve en 3 resultados
(observados por la comunidad, variables documentadas en el manual):

```
avoidChance = clamp(0.05 + (SPD_def − 25) × 0.004 + (100 − ACC_atk) × 0.002, 0.05, 0.35)
blockChance = 0.55
roll < avoid            → AVOID (0 daño)
roll < avoid + 0.55     → BLOCK (daño × 0.25)   # COMMUNITY_TESTED (≈¼)
roll ≥ avoid + 0.55     → HIT (daño completo)
```

- Variables: `Card Accuracy` × `Defender Speed` (CONFIRMED_MANUAL)
- Probabilidades: HYPOTHESIS (la rutina real `resolve_guard` es P0 ROM)
- BLOCK divisor ¼: COMMUNITY_TESTED
- Aplicado al Basic Guard del jugador Y a la respuesta defensiva de la IA

### IA: curación a HP bajo (HYPOTHESIS)
- Si `enemy.hp < 25% maxHp` y su mazo (real del jefe) contiene cartas heal →
  la usa (consume la acción). El deck determina qué puede hacer; el algoritmo
  exacto de decisión sigue siendo P0 ROM.

## Modelo de turnos (actualizado 2026-08-11 — spec de 20 puntos)

El combate NO es `PLAYER_TURN → ENEMY_TURN`. Un TURN completo contiene **dos
EXCHANGES** (el GBC los llama Attack/Defense Phase):

```text
TURN N
├── TURN_START: recalcular SPD efectiva → fijar firstAttacker (para todo el turno)
├── EXCHANGE 1: firstAttacker = ATTACKER (+3 CC al entrar) · rival = DEFENDER
│   ├── ATTACK_INTENT + DEFENSE_INTENT (la defensa se elige ANTES, no reactiva)
│   └── resolución → HP/CC/status → KO_CHECK
├── EXCHANGE 2: roles invertidos (misma secuencia)
└── TURN_END: expiraciones/counters → TURN N+1 (recalcular SPD)
```

- **SPD** decide quién ataca primero en cada turno; el orden queda fijado para
  todo el turno (cambios de SPD afectan al turno siguiente — partida documentada
  de Chiaotzu con dos Attack Phases consecutivas). `speedTiePolicy: UNKNOWN (ROM)`.
- **+3 CC** se concede al ENTRAR en Attack Phase de cada exchange, no al turno global.
- **Robo de Joint** (+1) también al entrar en Attack Phase.
- **ATTACK**: BASIC (Stage Attack / Gather Power) · JOINT (COMMAND/DAMAGE/BEAM/
  SUPPORT) · LIMIT (solo si powered) · CHARACTER (cambio de aliado).
- **DEFENSE**: BASIC (Defense | Move) · JOINT (solo cartas DEFENSE/SUPPORT) ·
  LIMIT (solo defensivas/Support si powered). Las ofensivas (COMMAND/DAMAGE/
  BEAM) quedan bloqueadas durante Defense. SUPPORT es válida en Attack y
  Defense (efecto puede variar por fase).
- **Move** es una acción de BASIC DEFENSE (junto a Defense), NO una fase del
  turno: consume la elección defensiva, modifica la posición PERSISTENTE del
  FighterState y DESPUÉS se resuelve la ofensiva enemiga con la nueva posición
  (no cancela el ataque). La posición NO se reinicia entre fases/turnos; el
  atacante no elige posición al empezar su Attack Phase.
- **POSICIONES (4 por combatiente, spec posición)**: `UP_BACK / UP_FRONT /
  DOWN_BACK / DOWN_FRONT` (UP=Aire vulnerable a Beam · DOWN=Suelo vulnerable a
  Damage · BACK=defensa↑/ataque↓ · FRONT=ataque↑/defensa↓). Inicial NORMAL =
  DOWN_BACK para ambos (borde propio). Persistente: solo cambia con MOVE en
  Basic Defense. 8 anchors visuales (LEFT/RIGHT reflejados — BACK apunta al
  borde propio). La distancia del QTE se DERIVA del par de posiciones
  (FRONT+FRONT→close · BACK+BACK→far · mixto→mid). Implementado `f673fb9`.
- **Gather Power** consume la Attack Phase completa (3 Stage → 4 Stage mientras
  powered; +4 STR/KI COMMUNITY_TESTED; duración exacta ROM_VERIFY).
- **Guard** no es daño×0.5 fijo: HIT/BLOCK/EVADE con probabilidades (fórmula
  exacta UNKNOWN — reconstruir por ROM).
- **CC pertenece al BattleSide** (equipo); HP/posición/Gather/Limits al Fighter.
- **BattleState ≠ ViewMode**: TACTICAL/ACTION/SPECIAL_ACTION son presentación;
  una defensa puede estar en TACTICAL, un Beam en ACTION.

### Implementado (commit `7a936fa`)
- `beginTurn()` (SPD → firstAttacker) · `startExchange(attacker)` (+3 CC +
  robo al atacar) · `advanceExchange()` (Exchange 1→2→TURN_END→beginTurn)
- Label de fase: `EXCHANGE X/2`
- Verificado: TURN 1 → EXCHANGE 1 (Goku Stage Attack 10 dmg) → EXCHANGE 2
  (Vegeta +3 CC ataca, Goku defiende)

### UNKNOWN (emulación forense pendiente)
speedTiePolicy · momento exacto draw/discard · orden gasto CC vs animación ·
duración/decremento Gather Power · probabilidades HIT/BLOCK/EVADE ·
❌ OBSOLETO (ROM §73–74): umbral `+2 CC` por pérdida sustancial · fórmula
daño/posición · segundo Exchange tras
KO · duración/tick de estados.
