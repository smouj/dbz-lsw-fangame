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
- **Ventana de input depende de la distancia** (más cerca = más tiempo).
- Fallar un input → ventana de reacción: **A = abandonar/defender**
  (conserva CC acumulado), **B = reparar y seguir**.
- Interrupción (Foresight/Telepathy/Time Freeze): CPU no repara, jugador sí.

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

## Guard (NO es simple %)

Resultados posibles: NORMAL GUARD (~todo el daño, algo reducido),
BLOCK (~1/4), AVOID (0). Probabilidad ligada a Speed defensor × Accuracy
ataque × estados evasión/precisión. Extraer de ROM, no inventar %.

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
