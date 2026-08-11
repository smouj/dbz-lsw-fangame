# DBZ LSW — Story Mode Walkthrough (referencia canónica)

Fuente: https://shrines.rpgclassics.com/gb/dbzlsw/walkthrough.shtml

Este documento describe la estructura REAL del modo historia del GBC para
replicarla en el remake. El juego comienza tras la batalla con Raditz, con
Piccolo entrenando a Gohan.

## Estructura del modo historia

El juego alterna:
- **Mapas de exploración** (hablar con personajes, buscar objetos ocultos)
- **Combates de historia** (jefes con dificultad y estrategias específicas)
- **Recompensa post-batalla**: elegir 1 carta de 3
- **Desbloqueos**: personajes, cartas, formas y retos ocultos

## Elección de mazo inicial

Al inicio (tras el tutorial con los tarros), Piccolo pregunta qué tipo de mazo
quieres: **Beam o Damage** (el remake ya lo implementa en StarterScreen).

## Combates de historia (orden y jefes)

| # | Jefe | Dificultad | Estrategia clave |
|---|---|---|---|
| 1 | **Piccolo** (Gohan) | Fácil | 3 Stage para CC; Foresight contra stage attacks; Avoid contra Special Beam Cannon; mover a esquina inferior si no hay Avoid |
| 2 | **Nappa** | Normal | Stage attacks; Endurance si no hace Gather; tácticas iguales |
| 3 | **Vegeta** (Goku) | Difícil | Equipar limites Super Kamehameha + Kaioken; Kaioken en defensa + Super Kamehameha en ataque; cuidado con Galick-Ho |
| 4 | **Vegeta** (Gohan) | Normal | Misma estrategia sin Goku |
| 5 | **Guldo** | Fácil | Elegir Gohan o Krillin (subir nivel) |
| 6 | **Recoome** | Casi difícil | Stage attacks; cuidado con Eraser Gun |
| 7 | **Jeice y Burter** | Normal | **Primer 2v2**: Gohan delante, Goku atrás (switch); Dende para curar; Shockwave contra Mach Attack; Goku power up + Kaioken + Spirit Bomb |
| 8 | **Ginyu (Goku) y Jeice** | Fácil | Cuidado con Super Kamehameha; Krillin con Misty KiWave; cambiar si Gohan muere |
| 9 | **Freeza** | Casi difícil | Ground Wave + Super Dash Elbow; CC 65-70; Kaioken + Spirit Bomb |
| 10 | **Freeza** (SSJ Goku) | Casi difícil | Spirit Bomb (sin Kaioken); Super Kamehamehas |
| 11 | **Goku** (Gohan) | Fácil | Spirit Bomb drena HP; Dunk Shot o Masenko |
| 12 | **Android 19** | Normal | Puede absorber Ki; ataque que drena HP; Spirit Bombs |
| 13 | **Android 20** | Normal | Super E-Ball; igual que 19 |
| 14 | **Cell** (Piccolo) | Normal | Piccolo-God; Special Beam Cannon + Super Kamehameha |
| 15 | **Android 17** (Piccolo) | Semi | Crazy Rush o Super E-Ball; Special Beam Cannon |
| 16 | **Android 16 y 18** | Casi difícil | Rocket Punch; Goku-SS ayuda |
| 17 | **Cell** (Goku) | Normal | Cell Combo; Special Beam Cannon |
| 18 | **Cell** (Gohan SSJ2) | Muy fácil | Misma estrategia |
| 19 | **Cell** (Gohan) | Normal | Super Kamehameha en Gohan |
| 20 | **Cell** (Vegeta, opcional) | Normal | Desbloquea 2 historias extra (venganza Trunks) |
| 21 | **Androids 17 y 18** (Trunks) | Normal | Solo Super Trunks; carta de Bulma |
| 22 | **Cell** (Trunks) | Normal | Igual que con Piccolo |
| 23 | **Goten** (Gohan) | Fácil | Tácticas normales |
| 24 | **Trunks** (Goten) | Normal | Burning Attack + Flash Punch; Kamekameha de Goten; guardar contra specials |
| 25 | **Majin Vegeta** (SSJ2 Goku) | Normal | Final Flash + Big Bang Attack; subir CC y power; SPIRIT BOMB si vuela |
| 26 | **Fat Buu** | Normal | Super E-ball + Potbelly Attack; Final Flash/Big Bang |
| 27 | **Trunks** (futuro vs jóvenes) | Normal | Rising Kick + Burning Attack |
| 28 | **Buu** (Gotenks SSJ3) | Normal | Super E-ball |
| 29 | **Buu** (Gohan Ultimate) | Normal | Super Kamehamehas |
| 30 | **Buu** (Gohan, absorbe a Gotenks+Piccolo) | Normal | Usa Breath para cancelar Super Kamehameha |
| 31 | **Buu** (Vegito) | Normal | Equipar Super Kamehameha + Teleport + Big Bang |
| 32 | **Evil Buu** | Normal | SSJ3 Goku facilita |

## Elementos de mapa (objetos ocultos)

- **Espada de Yajirobe**: formación rocosa, botón A
- **Carta Dende**: casa tras fila de árboles en la aldea Namekiana
- **Dragon Ball**: árbol más a la derecha de la isla
- **Carta en nave espacial**: esquina superior izquierda del mapa
- **Dragon Balls**: camino de tierra al norte de la nave
- **Dunk Shot/Masenko**: buscar el ki de Piccolo 5 veces
- **Carta de Chichi**: hablar con ella
- **5 Stage Attack**: hablar con Goku
- **Carta de Chiaotzu**: hablar con él
- **Kaio, Trunks' Sword, Solid Shot**: nota tras el edificio
- **Carta de Bulma**: tras los eventos del time chamber
- **Tien**: oculto al norte del acantilado
- **Memorandos**: indican cómo desbloquear personajes

## Desbloqueos clave (del walkthrough)

- **Piccolo-God**: perder contra Cell una vez, continuar, ganar
- **Historia extra**: usar Vegeta para la batalla final contra Cell
- **Super Trunks**: requerido para Androids 17+18
- **SSJ3 Goku**: facilita la batalla contra Evil Buu
- **Vegito**: fusión Potara Goku+Vegeta

## Diseño del remake (2026-08-11 — decisión del usuario)

**El modo historia es una experiencia narrativa LINEAL presentada con viñetas
manga dinámicas que conectan directamente los combates. NO existe exploración
del mapa ni movimiento libre de personajes entre encuentros.**

- Flujo: MENÚ HISTORIA → INTRO (viñetas) → COMBATE → OUTRO (viñetas) → recompensa → siguiente capítulo
- Cada capítulo es una pequeña historieta data-driven (`src/data/storyPanels.ts`):
  layouts FULL / SPLIT_2 / PORTRAIT_DIALOGUE / IMPACT, fondos NN_world.png,
  retratos 40×56, diálogos, efectos (flash/zoom/shake/speed)
- Los objetos ocultos del walkthrough (Espada Yajirobe, Dende, etc.) pasan a ser
  contenido narrativo de las viñetas, no interactividad de mapa
- Los capítulos 14-32 usan un generador por defecto (escenario por saga) hasta
  escribir sus viñetas específicas

## Mecánicas de historia que el remake debe respetar

1. Recompensa: 1 de 3 cartas tras cada victoria
2. Combates 2v2 con cambio de personaje (CHARA en Attack Phase)
3. Desbloqueos por condiciones específicas (perder/ganar de cierta forma)
4. La elección de mazo inicial (Beam/Damage) afecta las recompensas
   (ej. Dunk Shot si elegiste Damage, Masenko si Beam)
