# DBZ LSW — Combat System (Referencia verificada)

Fuente: Wikipedia, StrategyWiki, RPGClassics shrine, Kanzenshuu, TV Tropes y guías contemporáneas.
Este documento define el sistema de combate real del juego para su implementación fiel.

## Estadísticas de personaje

- **HP**: puntos de vida. Llegan a 0 = derrota.
- **Strength (STR)**: daño de cartas `Damage` (físico/melee).
- **Ki**: daño de cartas `Beam` (energía).
- **Speed (SPD)**: afecta precisión, probabilidad de esquivar, y **quién empieza en fase de ataque** (el mayor Speed ataca primero). Influye en cambios de fase.
- Al ganar combates se obtiene **experiencia**. Al subir de nivel se aumenta **permanentemente UNA estadística** (elección del jugador).

## Mazos (3 por personaje)

1. **Limit Deck**: hasta **3 cartas** (solo 2 en Androids 19/20). Se usan repetidamente tras `Gather Power`, con el CC necesario.
2. **Deck principal**: las 20 cartas elegidas por el jugador.
3. **Deck fijo**: acciones básicas — stage attacks, `Gather Power`, `Guard`, `Move`.

- 125 cartas totales. Tipos: Attack/Command, Damage, Beam, Support, Defense.
- Al iniciar se elige entre mazo inicial orientado a **Damage** o a **Beam**.

## Fases del combate

El de mayor **Speed** comienza en **fase de ataque**; las fases se alternan. Cartas Support pueden cambiar la fase.

### Fase de ataque (objetivos: acumular CC y dañar)
- Ataque básico sin coste (melee de 3 etapas; 4 etapas tras Gather Power).
- Command Cards (3-6 etapas): inputs rápidos A/B a tiempo. Cada etapa exitosa da CC. Fallar: pulsar B para continuar, A para cortar y quedarse el CC ganado.
- Cartas Damage/Beam/Support (requieren CC).
- **Gather Power**: aumenta temporalmente Ki y STR, habilita el Limit Deck durante ~2 turnos (el sprite parpadea).

### Fase de defensa
- `Guard` (defenderse).
- `Move` (cambiar de posición).
- Cartas Support/Defense (con CC).

## Posiciones (4)

Frente/atrás × suelo/aire, elegidas en fase de defensa:
- **Aire** (frente o atrás): vulnerable a `Beam`. Frente ↑ataque ↓defensa; atrás lo contrario.
- **Suelo** (frente o atrás): vulnerable a `Damage`. Frente ↑ataque ↓defensa; atrás ↓ataque ↑defensa.
- La posición relativa afecta el tiempo para inputs de comandos.

## CC (Card Cost) — máximo ~13

- **+3 CC** por turno como atacante.
- **+1 CC** por etapa exitosa de Command Card.
- CC adicional al recibir daño significativo (más si golpean en posición vulnerable).
- Ataques básicos de etapas: **sin coste**, principal forma de acumular CC.

## Command Cards / Stage Attacks

Multi-etapa (3-6). Indicadores de botones. Pulsar correctamente y a tiempo. Fallar: B = continuar, A = cortar (conservar CC ganado). Fallo completo = sin CC.

## Otras mecánicas

- Robo de cartas cada turno (límite de mano; se puede descartar si hay demasiadas).
- Algunos ataques requieren personajes concretos (fusiones, combinados).
- Tras ganar: elegir **1 carta de 3** como recompensa.
- Con aliado: cambiar de personaje.
- IA predecible: Gather Power → ataque 5 etapas → Beam/Damage → repetir.
