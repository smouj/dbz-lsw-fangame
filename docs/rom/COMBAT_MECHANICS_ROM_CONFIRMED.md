# Combat Mechanics — ROM_CONFIRMED

> **V3 SUPERSEDES (2026-08-23)**: ver
> `docs/rom/research-v3/LEDGER.md`. V3 corrige el alcance del tracer:
> el layout fisico de `ActionObject` ya esta demostrado estaticamente; siguen
> `PENDING_ROM_TRACE` los anchors absolutos y bindings semanticos. Tambien
> corrige frame record a `[visualFrameId, durationTicks, offsetY, offsetX]`,
> reachability de STANDARD_DAMAGE seq1, Tail seq1 y V-ball seq1/2/3, y exige
> tratar `CA53=2` como `RESULT_2`/atenuado, no como `MISS` universal.
>
> **V4 SUPERSEDES (2026-08-23)**: ver
> `docs/rom/research-v4-fx/LEDGER.md`. Beam FX queda demostrado como BG
> tilemap fisico: `FXResource + palette -> descriptor -> tiles 2bpp -> side
> tilemap -> CGB attrs -> opcode $0C window -> SCX/SCY`. `selector row[2/3]`
> son offsets de pantalla/camara, no anchors semanticos.
>
> **Fuente**: desensamblaje directo de la ROM (por debajo de la card table:
> máquinas de estado, intérprete cinematográfico, tirada de impacto, Gather Power).
> Este documento es la **fuente de verdad** para el BattleEngine y el Presenter.
> Todo lo que contradiga a este doc debe marcarse `OBSOLETE` y corregirse.
>
> Marcadores: ✅ ROM_CONFIRMED · 🟡 ROM_INFERRED · 🔵 REMAKE_CANON · ❌ OBSOLETE
>
> Actualizado: 2026-08-22 — lote 2 (§1–46) + lote 3 (§47–84) + lote 4 (§85–131)
> + lote 5 (§132–173) + lote 6 (§174–207) + lote 7 (§208–244) + lote 8
> (§245–276) + lote 9 (§277–310: infraestructura de traza dinámica)

---

## 1. El "azar" básico del combate NO es un PRNG

En el bucle principal (una vez por iteración sincronizada con el juego):

```asm
Bank00:$01A2
call $04D2
```

La rutina:

```asm
Bank00:$04D2
inc [$C230]
inc [$C231]
if $C231 >= 100:
    $C231 = 0
```

Por tanto `$C231` es un **contador cíclico 0...99**, no un PRNG.

Al preparar una acción, el juego toma una instantánea:

```text
$C231  →  $CA5D
```

y la resolución porcentual usa:

```asm
Bank00:$39CA
ld a,[$CA5D]
cp c
ret
```

Es decir:

```text
hit  ⇔  sampledCounter < calculatedAccuracy
```

### Consecuencia para el Engine

La tirada depende del **frame/tick en que se confirma la acción**. Ni
`Math.random()` ni siquiera `mulberry32()` son fieles. El comportamiento original:

```ts
battleFrameCounter100 = (battleFrameCounter100 + 1) % 100;

onActionAccepted() {
  battleRoll = battleFrameCounter100;
}
```

Esto explica parte de la "aleatoriedad" percibida del GBC: el jugador altera el
resultado simplemente tardando más o menos en pulsar.

---

## 2. La variante del Stage tampoco usa PRNG independiente

La secuencia Stage se elige mediante `$CA5D & $07`:

```text
sample 0...99
  → & 7
  → variant 0...7
```

Después `(stageLevel - 1) × 8 + variant` selecciona una de las 32 secuencias de
`Bank01:$7C70`:

```text
Stage 3 → 8 secuencias
Stage 4 → 8 secuencias
Stage 5 → 8 secuencias
Stage 6 → 8 secuencias
```

El mismo contador temporal de la resolución porcentual interviene en la selección.

---

## 3. FRONT/BACK — resuelto inequívocamente

Demostrado por la fórmula (bit1 = eje horizontal):

### Atacante (Damage y Beam)

```asm
fighter.position & $02
```

Si el bit NO está activo → `offense += 8`. Por tanto:

```text
bit1 = 0  ⇔  FRONT
```

### Defensor

Si `fighter.position & $02 != 0` → `defense += 8`. Por tanto:

```text
bit1 = 1  ⇔  BACK
```

### Modelo definitivo

```text
bit0: 0 = GROUND · 1 = AIR
bit1: 0 = FRONT   · 1 = BACK
```

✅ ROM_CONFIRMED

---

## 4. Modificadores espaciales exactos

| Posición | Efecto |
|---|---:|
| Atacante FRONT | `+8 ATK` |
| Defensor BACK | `+8 DEF` |
| Damage → AIR | `-8 ataque` |
| Beam → GROUND | `-8 ataque` |

La táctica de las cuatro posiciones está implementada literalmente con ±8. ✅ ROM_CONFIRMED

---

## 5. Ventanas Stage — matriz completa (sustituye a 1.2/1.7/2.4/2.9 ❌ OBSOLETE)

La rutina `Bank01:$66E4` empieza con 80 ticks y consulta `bit1` de ambos personajes:

| Atacante | Defensor | Ventana (ticks) | Tiempo @ ~59,7275 Hz |
|---|---|---|---:|
| FRONT | FRONT | **150** | 2,511 s |
| FRONT | BACK | **120** | 2,009 s |
| BACK | FRONT | **80** | 1,339 s |
| BACK | BACK | **50** | 0,837 s |

> ❌ **OBSOLETAS**: antiguas cifras `1.2 / 1.7 / 2.4 / 2.9` (además estaban
> invertidas conceptualmente: en la ROM, más cerca → más ventana).

---

## 6. QTE Stage = una única ventana global

Durante el estado activo:

```text
expected = sequence[currentIndex]
input = joypad & $3D
```

`$3D` acepta: RIGHT, UP, DOWN, A, B. **No LEFT**.

- Correcto: `success[currentIndex]=1`, `currentIndex++`, SFX `$16`
- Incorrecto: `success[currentIndex]=0`, `currentIndex++`, SFX `$02`

En ningún caso se reinicia la ventana. Invariante del Engine:

```text
████████ GLOBAL WINDOW ████████
input0 input1 input2 input3
```

NO:

```text
timer → input → reset → timer → input → reset...
```

---

## 7. Ventana A/B tras el fallo — timings exactos

Segunda ventana: **30 ticks ≈ 0,502 s**. Acepta únicamente A y B, registrando
botón pulsado y tick exacto de pulsación. Límites internos distintos:

```text
A → antes de 25 ticks  (< 0,419 s)
B → antes de 10 ticks  (< 0,167 s)
```

No es una selección de menú: el juego comprueba **velocidad de reacción**.

---

## 8. Handler Beam `$02` descompuesto

Familia Beam estándar: `Bank03:$5776`, máquina de estados basada en `$CA06`.

Estados observados: `01 02 03 04 · 14 15 16 17 18 · 32/33 · 3C/3D · 46/47 · 50/51/52/53`.

Conceptualmente:

```text
INTRO → TRANSITION → LAUNCH SETUP → ACTOR ANIMATION → FX → RESOLUTION
→ branch outcome (HIT | SPECIAL DEFENSE | MISS | SPECIAL RESULT) → RETURN
```

## 9. Handlers Beam `$03`–`$07` comparten la máquina

Normalmente: `if state != $14: jump Handler02`.

> No son cinco motores independientes: **comparten el Beam Engine** y sustituyen
> principalmente la fase de lanzamiento. Diseño objetivo del Engine:

```ts
BeamActionHandler + LaunchProfile   // en vez de 5 implementaciones duplicadas
```

---

## 10–13. Diferencias reales entre launch handlers

| Handler | Sync point | Técnicas | Notas |
|---|---|---|---|
| `$02` BEAM_BASE | actor frame 4 → config scene → load FX → wait 60 | Kamehameha, Masenko, Galick Gun, Final Flash, Special Beam Cannon, Finger Beam, Eye Beam… | estándar |
| `$03` | frame 5 | Telekinesis, Eraser Cannon, Body Change | — |
| `$04` BURNING_ATTACK_RELEASE | **frame 17** | Burning Attack | preparación larga explícita: NO comprimir a `beam_charge → beam_fire` |
| `$05` PROJECTILE_SCROLL | release → FX → screen delta `-6` × 19 ticks → restore → wait 60 | Energy Bomb, Big Bang Attack, Final Attack, Ki Blast Bomb, Energy Slash… | dirección invertida según lado |
| `$06` PROJECTILE_ALT_SCROLL | actor frame 7 → FX → screen delta `-6` × 16 ticks → restore → wait 60 | (variante proyectil) | timing/escena distintos incluso entre "proyectiles" |
| `$07` SPECIAL_PROJECTILE_PATH | config scene → audio/script → anim → WAIT FRAME 2 → FX → WAIT FRAME 4 → screen-motion path → restore → wait 60 | Destructo Disk, Super Destructo Disk, Spirit Bomb, Galactica Donut, Crasher Ball, Super Ki Ball, Energy Slice | NO implementar como simple "energy ball" |

## 14. Purple Comet / Purple Comet Z — excepciones reales

Handlers `$0D`/`$0E`: no sólo modifican el release; intervienen en más estados de
la máquina y coordinan **dos animadores simultáneos**. Concepto necesario en el Presenter:

```text
MULTI_ACTOR_SCRIPT
```

---

## 15. Lenguaje cinematográfico decodificado

Cola de presentación: eventos de **5 bytes**. Intérprete: `Bank7E:$70AB`.

| Opcode | Función |
|---:|---|
| `$01` | iniciar/configurar animación de actor |
| `$04` | cambiar/seleccionar estado animado dinámico |
| `$05` | esperar fin/marcador de animación |
| `$06` | esperar frame/índice determinado |
| `$07` | esperar N ticks |
| `$08` | resetear animador |
| `$0A` | fijar coordenadas absolutas |
| `$0B` | mover actor horizontalmente N ticks |
| `$0C` | cargar/activar gráficos FX |
| `$0D` | configurar escena/pantalla |
| `$0E` | desplazar pantalla progresivamente |
| `$0F` | restaurar pantalla |
| `$10` | aplicar ΔX/ΔY del frame actual al actor |
| `$11` | ejecutar path de movimiento de pantalla |
| `$12` | efecto auxiliar |
| `$13` | SFX directo |
| `$14` | script de audio/triggers |

Es el **lenguaje de Timeline real del DBZ LSW**.

## 16. Macros cinematográficas en ROM

`Bank30:$5D00`: tabla de macros. Cada macro:

```text
count + count × 5-byte presentation commands
```

Reutilizan coreografías. Vistas: `$1C $1E $2B $2C $2E $2F $30 $31 $32 $33 $34 $35`…

## 17. Rush físico real — macro `$1C`

```text
04 00 00 01 A0      ; opcode $0B: +4 px
0B 00 04 18 00      ; opcode $0B: +4 px × 24 ticks
0B 00 02 01 00      ; opcode $0B: +2 px × 1 tick
04 00 00 00 A0
```

Total: **98 píxeles lógicos en 25 ticks ≈ 0,419 s**, con mirroring según lado.

> No usar `lerp(actor.x, target.x, 0.74)`. El original hace literalmente
> 4px × 24 + 2px × 1.

## 18. Inicio Beam — macro `$1E`

```text
-1 × 2 ticks · -2 × 10 ticks · -1 × 5 ticks
```

Total: **-27 px en 17 ticks ≈ 0,285 s**, reflejado según lado. Forma parte de la
preparación/encuadre Beam. No inventar coordenadas.

## 19. Hit físico normal — macro `$2F` (13 comandos)

1. iniciar animación actor/slot 0
2. esperar frame 2
3. cambiar reacción slot 1
4. SFX `$16`
5. esperar fin actor 0
6. aplicar ΔX/ΔY acumulado
7. volver actor 0 a normal
8. **WAIT 30**
9. cambiar otro estado
10. reacción slot 1 `$19`
11. esperar fin
12. volver slot 1 a normal
13. **WAIT 30**

Dos pausas explícitas de 30 ticks (≈0,502 s c/u): la sensación "pausada" está
deliberadamente programada.

## 20. Miss físico — macro `$30` (coreografía distinta)

```text
start attack → wait frame 2 → target anim variant $13 → SFX $31
→ wait attacker completion → apply attacker frame displacement
→ attacker reset → wait target completion → WAIT 30
```

HIT y MISS tienen **secuencias visuales distintas**.

## 21. Defensa física especial — macro `$31`

Igual que miss pero con `target animation variant $14` y SFX `$39`.

Tres resoluciones físicas distintas:

```text
normal hit ($2F) · normal miss ($30) · special defensive resolution ($31)
```

No basta `hit ? hurt : idle`.

---

## 22. Handler Damage `$0A` reconstruido

Rutina principal: `Bank03:$5FE3`, máquina de estados `$CA06` (estados `01–06,
1E/1F, 28/29, 32/33, 3C/3D`).

Flujo:

```text
prepare → wait 20 → macro $1C → scene transition → defensive preprocessing
→ start actor attack animation → wait actor frame 2 → trigger card SFX
→ start technique-specific animation → wait technique animation → macro $2E
→ wait attacker → branch result
```

Branch:

```text
CA53 = 0 → normal hit        → macro $2F
CA53 = 1 → special defense   → macro $31
CA53 = 2 → normal miss       → macro $30
```

## 23. Damage: handler compartido, animación NO

```text
Generic Damage State Machine
 + Card AnimationResource
 + Card audio script
```

Continuous Punch, Atomic Break, Crazy Rush, Cell Combo, 18's Attack… comparten
handler `$0A` con animaciones distintas. **Este debe ser nuestro diseño.**

## 24. `CA53` — versión inicial (SUPERADA por §59, lote 3)

❌ OBSOLETO (2026-08-22, lote 3): "CA53 = 2 → miss normal" era demasiado
simplificado. Taxonomía correcta en §59: 0=FULL, 1=ZERO_AVOID, 2=PARTIAL
(daño → card.CC_cost, NO miss de 0 HP), 3=SPECIAL_NULLIFY, 4=ENERGY_ABSORB.

Durante Beam:

```text
CA53 = 3 → damage = 0
CA53 = 4 → damage = cardPower (→ cura con Energy Absorb, ver §65)
```

## 25. Power >= 30 — efecto cinematográfico

```asm
if cardPower >= 30: $CA54 = 1  else: $CA54 = 0
```

En Beam selecciona macros:

```text
Hit:  power < 30 → $2B · power >= 30 → $2C
Miss: power < 30 → $32 · power >= 30 → $33
```

Una técnica fuerte no sólo hace más daño: puede usar **otra reacción visual**.

---

## 26–31. Kamehameha — reconstrucción cinematográfica

### Registro ROM (Card #12)

```text
Type = Beam · Power = 20 · Accuracy = 100 · CC = 16
Handler = $02 · ActorAnim = $03 · FX = $05 · Palette = $2C
Power 20 < 30 → highPowerFlag = 0
```

### Flujo real

- **A. Preparación**: macro `$1E` (-27 px / 17 ticks, reflejada).
- **B. Cambio de plano**: transición al programa de acción.
- **C. Actor**: AnimationResource `$03`, secuencia según forma/posición.
- **D. Sync point**: `WAIT actor frame 4` (el FX no dispara antes).
- **E. FX**: config scene → load card FX → `WAIT 60` (≈1,005 s explícito).
  El propio AnimationResource `$03` contiene su frame mantenido 60 ticks:
  **sincronización máquina de acción ↔ guion de actor**, no animación plana.

### SFX/script vinculado a carta

Opcode `$14` recibe el ID de carta. Card #12 → script ID `$0C`; tabla de audio
`Bank30:$6600` resuelve `(C=$0E, B=$43)`. (Nombre humano pendiente, ID exacto conservado.)

### Impacto normal (power 20 → macro `$2B`)

```text
configure target scene → load effect $0A → screen movement -6 × 16 ticks
→ restore screen → auxiliary impact → target reaction $17
→ wait target animation → apply target animation offset → return target state
```

### Super Kamehameha (Power 30 → highPowerFlag=1 → macro `$2C`)

Reacción cambia a **variant `$18`**. Diferencia ROM real entre Kamehameha y Super
Kamehameha aunque compartan `actorAnimation = $03`.

### Kamehameha miss (estado `$46` — resolución atenuada/fallo)

Nota: "miss" aquí = branch de resolución no plena (ver §59: CA53=2 es PARTIAL,
no un miss de 0 HP). Las macros de fallo según potencia:

```text
power < 30 → macro $32 → target reaction variant $15
power >= 30 → macro $33 → variant $16
```

Incluso el fallo cambia según la potencia de la técnica.

---

## 32–36. Gather Power / power window — cerrado

> SUPERSEDED parcial (lote 4 §102, §127): el campo `fighterState+4` NO es
> exclusivo de Gather Power. Gather escribe 5; CHARA escribe 2. Nombre canónico:
> **powerWindowCounter**. Ver §102–103.

### Contador

`Bank01:$7A18`: la acción que finaliza el power-up escribe `fighterState + 4 = 5`:

```text
POWER_COUNTER = 5
```

### No son "cinco turnos"

Ciclo global `Bank01:$4B66...`: procesa ambos fighters con
`if powerCounter != 0: powerCounter--`. Son **5 pasos de máquina de combate**,
no una duración temporal abstracta (CHARA = 2 pasos; ver §103). Reproducir los
mismos puntos de decremento.

### FX gráfico dedicado

`Bank03:$6750`: carga `Bank $68, Resource $1A` y lo copia a `VRAM $8800`.

### Paleta `$33` (tabla RGB15 CGB `Bank30:$6E00`)

| Color | RGB aprox. |
|---|---:|
| 0 | `#FFFFFF` (blanco) |
| 1 | `#F6A452` (dorado) |
| 2 | `#F6CDA4` (naranja claro) |
| 3 | `#FF8300` (naranja intenso) |

`aura_power = naranja/dorada` pasa de REMAKE_CANON a **ROM_CONFIRMED**.

### Duración núcleo

```asm
CB77++
if CB77 < $5A: continue
```

`$5A` = 90 ticks ≈ **1,507 s** de efecto activo antes de su salida.
(Con transiciones antes/después: la acción completa no dura exactamente 90 ticks.)

---

## 37–40. Fórmulas — profundidad real

### Accuracy

```text
threshold = cardAccuracy + attackerAccuracyModifier - defenderAccuracyModifier
```

con saturación inferior a cero; estados temporales pueden `threshold /= 2` o
saltarse/modificar la resolución. Sample = `$CA5D`; `sample < threshold` → hit normal.

Helper `Bank7E:$5C6E`: lee `character/stat structure +6` = **SPEED** (bautizado
en lote 3, §51). La fórmula central es:

```text
hitThreshold = card.accuracy + effectiveSpeed(attacker) - effectiveSpeed(defender)
```

con saturación inferior a cero; estados temporales pueden `threshold /= 2`
(Afterimage, §53) o saltarse/modificar la resolución. Sample = `$CA5D`;
`sample < threshold` → hit normal. Si falla, segunda clasificación interna
CA53=1 vs CA53=2 (§60).

### Damage (estructura real, lote 3 §56)

```text
physical = Strength
si Kaio Ken:   ×2
si FRONT:      +8
si Gather Power activo: +4
+ strengthBuffTier × 8
- strengthDebuffTier × 8
(suelo cero)
→ mitigación del defensor → + card.power
```

> NO codificar `damage = card.power + attacker.attack - defender.defense` y darlo
> por terminado. Quedan excepciones/orden de ramas por cerrar.

### Beam (estructura paralela, lote 3 §57)

Usa **Ki** en lugar de Strength (Kaio Ken → ×2 base Ki, FRONT +8, Gather +4,
Ki buff/debuff ±8/tier), conserva:

```text
FRONT attacker → +8 · BACK defender → +8 · GROUND target → -8
```

Damage y Beam comparten estructura pero usan stats ofensivas diferentes.

---

## 41–42. Cambios recomendados ya en el Engine

### Tirada (sustituir mulberry32 para paridad estricta)

```ts
interface BattleTimingState {
  frameCounter8: number;
  percentCounter: number; // 0..99
}

function tickBattleClock(state: BattleTimingState) {
  state.percentCounter++;
  if (state.percentCounter >= 100) state.percentCounter = 0;
}
```

Al aceptar acción: `action.roll100 = state.percentCounter;` luego
`hit = action.roll100 < calculatedAccuracy;`

Ventaja clave: un replay con los mismos comandos **y los mismos ticks de
confirmación** produce exactamente el mismo resultado que el modelo original.

### Variante Stage con la misma muestra

```ts
stage.variant = action.roll100 & 0x07;
sequenceIndex = (stageLevel - 3) * 8 + stage.variant;  // ajustar IDs
```

---

## 43. Taxonomía cinematográfica real

```text
ROM_ACTION_HANDLER
├── $02 BEAM_BASE
├── $03 BEAM_RELEASE_FRAME_5
├── $04 BURNING_ATTACK_RELEASE
├── $05 PROJECTILE_SCROLL
├── $06 PROJECTILE_ALT_SCROLL
├── $07 SPECIAL_PROJECTILE_PATH
├── $08 SPECIAL
├── $0A DAMAGE_BASE
├── $0B TAIL
├── $0C BUU_BALL
├── $0D PURPLE_COMET
└── $0E PURPLE_COMET_Z
```

Nombres humanos perfeccionables; la **jerarquía de ejecución ya está en la ROM**.

## 44. Arquitectura recomendada

```text
Card → RomActionProfile { handler, animationResource, effectResource, palette, audioScript }
→ Handler template → ROM presentation macros → AnimationResource sequences
→ Semantic Timeline → Pixi
```

```ts
const KAMEHAMEHA = {
  rom: {
    cardId: 0x0c,
    handler: 0x02,
    animation: 0x03,
    effect: 0x05,
    palette: 0x2c,
    highPower: false,
  },
};
```

## 45. Dos niveles de secuencia

- `ROM_SEQUENCE` (literal): `$01 · $06 frame 4 · $0D · $0C · $07 60 · …`
- `SEMANTIC_SEQUENCE` (interpretado): `START_ATTACK_ANIM · WAIT_RELEASE_FRAME ·
  SWITCH_ACTION_SCENE · SPAWN_ENERGY_FX · HOLD · …`

Guardar ambas para comparar el remake contra la ROM **sin perder trazabilidad**.

---

## 46. Estado de la ingeniería inversa

| Subsistema | Estado |
|---|---|
| Tabla 125 cartas | ✅ |
| Categorías | ✅ |
| Power / Accuracy base / CC cost | ✅ |
| 48 formas | ✅ |
| Compatibility mask | ✅ |
| Handlers | ✅ |
| Jerarquía Beam handlers | ✅ nueva |
| Actor AnimationResource / frame format / ticks por frame / ΔX/ΔY | ✅ |
| Metasprites | ✅ |
| FX resources | ✅ |
| CGB palettes | ✅ |
| Presentation queue / opcodes / macro table | ✅ nueva |
| Hit/Miss physical macros | ✅ nueva |
| FRONT/BACK | ✅ nueva |
| AIR/GROUND | ✅ |
| Position modifiers | ✅ nueva |
| Stage sequences / variant selection / global timer / position→timer matrix / A/B recovery | ✅ nueva |
| Global 0–99 "random" counter | ✅ nueva |
| Accuracy comparison | ✅ nueva |
| Gather Power counter / FX resource / palette / core FX timing | ✅ nueva |
| Full Damage formula | 🟡 |
| Full Beam formula | 🟡 |
| Defense flag names | 🟡 |
| All Support handlers | 🟡 |
| Exact target reaction names | 🟡 |
| Exact screen tilemaps | 🟡 |
| Audio IDs → human names | 🟡 |
| KO/replacement | 🟡 |
| AI | 🟡 |
| Deck/hand lifecycle | 🟡 |

---

# PARTE 2 — LOTE 3 (2026-08-22): battle block, defensas, support, KO, Stage

> Continuación del desensamblaje. Corrige varias interpretaciones del lote 2
> (ver §59 CA53, §51 Speed, §73 HP→CC). Mismo criterio: ✅ ROM_CONFIRMED.

---

## 47. Battle card block — 45 bytes por lado

```text
PLAYER BATTLE CARD BLOCK — 45 bytes

+00..+02 roster: 3 miembros

+03..+07 Limits miembro 1
+08..+12 Limits miembro 2
+13..+17 Limits miembro 3

+18..+37 Joint Deck: 20 cartas

+38 drawIndex

+39..+44 mano: 6 slots
```

### Limits: no son cartas fijas del personaje

La ROM diferencia tres capas:

```text
compatibilidad de carta  → qué puede equipar el personaje
configuración persistente → qué Limits tiene equipados
battle block             → copia del loadout para esta batalla
```

Registro persistente por personaje (16 bytes): `+8` capacidad de Limits,
`+9...` cartas Limit equipadas. Capacidad normal: **3** (existen registros con 2).
El battle block reserva 5 bytes por miembro pero eso NO significa 5 Limits activos.

Seleccionar/usar un Limit NO usa la rutina que elimina cartas de la mano Joint:
los Limits permanecen equipados y reutilizables mientras sus condiciones
permitan ejecutarlos.

## 48. Baraja y mano — confirmadas

Cada lado tiene baraja real de **20 IDs** (se transforma/baraja con rutinas de
corte/intercalado propias; no se genera carta al azar por turno).

### Inicio de batalla

```text
BATTLE START
→ 10 CC
→ draw 3
```

Al comenzar la fase ofensiva:

```text
+3 CC
+ draw 1
```

## 49. Mano física de 6 cartas + descarte obligatorio

RAM: `+39..+44` = 6 slots; la ROM cuenta esos 6 slots. Con `handCount == 6`
entra la interfaz de descarte: seleccionar carta → eliminar slot → desplazar
restantes → mano vuelve a 5.

```text
capacidad de conservación = 5
robo temporal: 5 → 6
si llega a 6: DISCARD REQUIRED
6 → 5
```

## 50. Bloque de stats de combate (~13 bytes)

```text
+0/+1  Max Life
+2/+3  Current Life
+4     Strength
+5     Ki / Beam attack
+6     Speed
+7     status flags
+8     positive modifier tiers
+9     negative modifier tiers
+10    health-loss CC threshold tracker
+11    RESERVED / UNUSED_OBSERVED (auditado, sin referencias de combate — ver §85)
+12    RESERVED / UNUSED_OBSERVED
```

Inicialización: `Max Life → Current Life` al entrar en combate.

> ❌ SUPERSEDED por lote 4 §85: `+11/+12` NO son stats ocultos. Quitarlos del
> modelo semántico (`reserved0B/reserved0C` como mucho).

## 51. Speed = battleStat +6 — iniciativa Y accuracy (corrige lote 2)

`battleStat +6` = **SPEED** (resuelve el "stat +6 sin bautizar" del lote 2).
No es una stat de Accuracy independiente: **la misma rutina determina
iniciativa y probabilidad de impacto**.

```text
effectiveSpeed = baseSpeed + speedBuff - speedDebuff
```

Modificadores en niveles de **8 puntos**.

## 52. Fórmula de precisión (Speed)

```text
hitThreshold = card.accuracy + effectiveSpeed(attacker) - effectiveSpeed(defender)
```

con saturación. Luego:

```text
sample = valor 0..99 capturado al confirmar acción
hit ⇔ sample < hitThreshold
```

Speed afecta a la vez iniciativa y accuracy/evasión efectiva.

## 53. Afterimage — mecánica exacta

No es evasión genérica: con el flag activo, `hitThreshold >>= 1` (divide entre
2 el umbral del siguiente ataque recibido). Después **flag consumido**: un solo uso.

## 54. Buffs/debuffs empaquetados en bits

### `battleStat +8` — positivos (4 grupos de 2 bits)

```text
bits 0–1 → Strength buff
bits 2–3 → Ki buff
bits 4–5 → Speed buff
bits 6–7 → Defense buff
```

Cada nivel = **+8**, hasta 3 niveles.

### `battleStat +9` — negativos

```text
bits 0–1 → Strength debuff
bits 2–3 → Ki debuff
bits 4–5 → Speed debuff
bits 6–7 → vulnerability
```

Cada nivel = 8 puntos.

> NO modelar como `buffs: [{ stat, amount }]` moderno — son bitfields compactos.

## 55. Kaio Ken — multiplicativo

Activa un bit específico. En cálculo físico y Beam:

```text
base Strength × 2   (físico)
base Ki × 2         (Beam)
```

antes de modificadores posteriores. NO es `ATK + N`.

## 56. Fórmula física — estructura real

```text
physical = Strength
si Kaio Ken:   physical *= 2
si FRONT:      physical += 8
si Gather Power activo: physical += 4
physical += strengthBuffTier × 8
physical -= strengthDebuffTier × 8
(suelo cero)
```

Después: mitigación del defensor + potencia de la carta. Quedan excepciones y
orden exacto de ciertas ramas — no simplificar a una línea todavía.

## 57. Beam — estructura paralela

Igual pero con **Ki** en lugar de Strength:

```text
Kaio Ken → ×2 base Ki
FRONT → +8
Gather Power → +4
Ki buff → +8/tier · Ki debuff → -8/tier
```

Luego defensa, y el ya demostrado `Beam → GROUND -8`.

## 58. Defensa: BACK y Basic Guard son independientes

- **BACK** → `Defense +8`
- **Basic Guard** → establece `CA82 = 2`; el resolver añade `Defense +4`

```text
BACK ≠ GUARD, y pueden combinarse:
defense = base/derived + (BACK ? 8 : 0) + (BASIC_GUARD ? 4 : 0) + defenseBuffTier×8 ...
```

## 59. CA53 — taxonomía correcta (CORRIGE §24 del lote 2)

❌ OBSOLETO: "CA53=2 → MISS". Una tirada fallida puede terminar de dos maneras:

```text
CA53 = 1 → ZERO / AVOIDED RESOLUTION        finalEffect = 0
CA53 = 2 → PARTIAL / ATTENUATED RESOLUTION  si había efecto preliminar:
                                           finalDamage = card.CC_cost
```

Taxonomía completa:

```text
CA53 = 0 → FULL / NORMAL RESOLUTION
CA53 = 1 → ZERO / AVOIDED RESOLUTION
CA53 = 2 → PARTIAL / ATTENUATED RESOLUTION
CA53 = 3 → SPECIAL NULLIFICATION
CA53 = 4 → ENERGY ABSORB RESULT
```

`CA53=2 == MISS` debe desaparecer del canon.

## 60. Cómo decide entre CA53=1 y CA53=2

Cuando la Accuracy falla:

```asm
if ((sample & 3) == 0 && card.ccCost < 21) {
  CA53 = 1;
  effect = 0;
} else {
  CA53 = 2;
  if (effect != 0) effect = card.ccCost;
}
```

Segunda clasificación interna tras fallar Accuracy — peculiaridad a preservar.

## 61. El "daño = CC cost" golpea al defensor

Descartado que sea contraataque: la rutina global aplica ese valor a la **Life
del defensor**. Es ataque parcialmente efectivo, no daño reflejado.

## 62. Defense Cards — bitfield `CA83`

```text
Taiyoken → $01
Instant Transmission → $02
Barrier → $04
Time Freeze → $40
Breath → $04
Energy Absorb → $08
Endurance → $10
Telepathy → $40
Foresight → $40
Shockwave → $01
Avoiding → $02
```

> Las 11 Defense Cards no son variantes visuales de Guard: son reglas diferentes.

## 63–64. Ramas de anulación

- `CA83 & $02` (Instant Transmission / Avoiding) → `CA53 = 1`, damage 0.
- `CA83 & $04` (Barrier / Breath) → `CA53 = 3`, damage 0: anulación
  semánticamente distinta a teleport/avoid, con su propia rama cinematográfica.

> ZERO DAMAGE no implica la misma reacción visual en todos los casos.

## 65. Energy Absorb — decodificado

Con `CA83 & $08` al recibir un Beam:

```text
CA53 = 4
value = incomingCard.power
→ rutina de Life en modo HEAL
```

> Energy Absorb **cura al defensor por la potencia de la técnica Beam recibida**
> hasta su Life máxima. No es `beam damage = 0`.

## 66. Endurance

`CA83 & $10` → fuerza resolución familia `CA53 = 2` (resultado atenuado, no
anulación absoluta). No convertir Endurance en "Guard más fuerte".

## 67. Time Freeze / Telepathy / Foresight — nueva regla

Comparten `CA83 & $40`. En acciones Command/Stage la ROM hace:

```text
clear $CA6A..$CA73  (= success flags del Stage QTE)
```

> Borran/anulan los aciertos del Command/Stage: familia defensiva dedicada
> contra Command, explicada mecánicamente. Presentación exacta pendiente.

## 68–70. Contadores carta-a-carta

- **Sunglasses** vs **Taiyoken**: flag persistente/temporal → bypass de la
  anulación de Taiyoken. Interacción explícita carta contra carta.
- **Champion Belt**: flag de un solo uso; la ruta Damage puede cancelar el
  siguiente Damage y consume el flag → protección de un solo uso frente a Damage.
- **Kibito**: mismo patrón para Beam → protección de un solo uso frente a Beam.

```text
Champion Belt → Damage shield
Kibito → Beam shield
```

## 71. Support — efectos numéricos localizados

| Carta | Efecto ROM localizado |
|---|---|
| Kaio Ken | duplica Strength/Ki base |
| SSJ2 | Ki buff tier +1 |
| SSJ3 | Strength buff tier +1 |
| Kiai | vulnerabilidad objetivo +1 |
| Paralysis | Speed objetivo −1 tier |
| Speed Up | Speed +1 tier |
| Lock On | fuerza resolución normal del siguiente ataque |
| Flesh Guard | Defense +1 tier |
| Guru | Strength +1 + Ki +1 |
| Supreme Kai | Speed debuff |
| Kibito | protección de un Beam |
| Babidi | limpia tiers positivos/negativos |
| Yakon | elimina Gather Power |
| Capsule Fridge | +5 CC |
| Rejuvenation Chamber | limpia debuffs |
| Trunks' Sword | Strength buff |
| Dabura's Spear | Strength buff |
| Light Vest | Speed buff |
| Old Armor | Defense buff |
| New Jacket | Defense buff |
| Sunglasses | counter de Taiyoken |
| Champion Belt | protección de un Damage |
| Heart Virus | debuff Strength + Ki |
| Heart Pills | limpia debuffs |
| Hourglass | limpia la mayoría de status temporales |
| Full Spirit | Ki buff |
| Afterimage | siguiente accuracy threshold ÷2 |
| Reading Ki | fuerza resolución normal |
| Feint | fuerza resolución normal |

## 72. Lock On / Reading Ki / Feint — FORCE_NORMAL_SUCCESS

`status & $10`: durante la resolución ofensiva fuerza `CA53 = 0` y se consume.

```text
FORCE_NORMAL_SUCCESS_NEXT_ATTACK   (no es Accuracy + X)
```

## 73. Pérdida de Life → CC: regla exacta (corrige "+2 CC al perder mucha vida")

La ROM divide la Life máxima en **8 tramos** y mantiene un contador de umbrales
cruzados. Cada primer cruce de otro octavo:

```text
+2 CC
100% → 87.5% → 75% → 62.5% → ...
```

Un golpe enorme que cruza tres umbrales → **+6 CC** en esa actualización.

## 74. No explotable curándose

`healthLossRewardTracker` registra los tramos ya bonificados. Perder HP → ganar
CC → curarse → volver a perder el mismo tramo NO da +2 otra vez; no se ha
localizado reset del tracker durante combate normal.

## 75. KO y equipos

Max/Current Life de 16 bits. `KO ⇔ currentLife == 0` (sin thresholds ocultos).
Recorrido de hasta 3 miembros devuelve:

```text
0 → combatiente activo sigue vivo
1 → activo KO pero existe reserva viva (índice activo ya apunta al primer superviviente)
2 → no queda ningún miembro vivo
```

> La sustitución automática por KO es una ruta propia del Engine: no
> reimplementarla reutilizando simplemente CHARA.

## 76–79. Stage — daño y reposicionamiento

### 76. Acumulador `CA7F`

Cada input correcto: `CA7F++`. Pero hay un componente ofensivo previo derivado
de Strength/Defense reducido `>> 2` (≈ /4) que queda como valor base.

### 77. BACK afecta al daño Stage (no sólo al tiempo)

```text
attacker BACK → base >>= 1
defender BACK → base >>= 1
(acumulables)

FRONT→FRONT: base · BACK→FRONT: base/2 · FRONT→BACK: base/2 · BACK→BACK: base/4
```

> FRONT/BACK modifica a la vez la dificultad temporal del Stage y su eficacia
> numérica.

### 78. Stage potenciado reescribe la posición persistente

> ❌ SUPERSEDED por lote 4 §97–99. La versión correcta: la rutina
> `Bank01:$6E43–$6E6B` consulta `CA60` (expected sequence) y recorre `CA5F`
> comandos — **se aplican los direccionales del prefijo de la secuencia que
> terminó siendo resuelto/procesado** (un comando reparado con B cuenta; con A
> el fallo corta antes). Sólo si `powerWindowCounter != 0` y `CA82 != 1`.

Con Gather Power activo, la resolución Stage recorre los comandos procesados y
los direccionales modifican `defender.position` de forma **persistente**:

```text
RIGHT → position |= $02   (bit1=1 → FORCE BACK)
UP    → position |= $01   (FORCE AIR)
DOWN  → limpia bit vertical (FORCE GROUND, preserva horizontal)
A / B → no cambian posición
```

### 79. Reposicionamiento desde los botones

> ❌ SUPERSEDED por lote 4 §97–99 (prefijo resuelto, no "inputs acertados").

Ej.: secuencia `A → UP → B → RIGHT` con B-repair puede terminar con el
defensor en `AIR + BACK`. Es una regla ROM → posición táctica persistente, NO
knockback cinematográfico genérico.

## 80. MOVEMENT VISUAL ≠ POSITION COMMAND

El personaje puede recorrer 98 px en el rush sin cambiar su estado táctico; un
UP/DOWN/RIGHT procesado por el Stage potenciado SÍ cambia `BattleState.position`.
Resuelve una parte complicada del diseño del Presenter.

## 81. Modelo de BattleState mínimo

```ts
interface FighterBattleState {
  activeMember: number;
  position: { vertical: "GROUND" | "AIR"; horizontal: "FRONT" | "BACK" };
  cc: number;
  powerWindowCounter: number; // antes gatherPowerCounter — SUPERSEDED lote 4 §102 (CHARA escribe 2)
  members: [{
    maxLife: number; life: number;
    strength: number; ki: number; speed: number;
    statusFlags: number;
    positiveTiers: { strength: number; ki: number; speed: number; defense: number };
    negativeTiers: { strength: number; ki: number; speed: number; vulnerability: number };
    healthCcThresholdsClaimed: number;
  }];
  limits: CardId[][];
  deck: CardId[]; // 20
  drawIndex: number;
  hand: CardId[]; // physical max 6
}
```

## 82. Resultado de acción

```ts
type RomResolution =
  | "FULL" | "ZERO_AVOID" | "PARTIAL" | "SPECIAL_NULLIFY" | "ENERGY_ABSORB";
// conservar además romCA53 para trazabilidad
```

## 83. Correcciones aplicadas al informe anterior

| Antes | Ahora |
|---|---|
| CA53=2 → MISS | CA53=2 → PARTIAL / ATTENUATED |
| cada personaje tiene 3 Limits propios | capacidad Limit + loadout persistente + compatibilidad ROM |
| +2 CC al perder mucha vida | +2 CC por cada nuevo umbral de 1/8 de Max Life cruzado |
| Speed → iniciativa | Speed → iniciativa + accuracy/evasión efectiva |
| Stage powered → empuja enemigo | Gather-powered Stage → interpreta direcciones del QTE → modifica posición táctica persistente |

## 84. Estado de la investigación (actualizado)

| Sistema | Estado |
|---|---|
| Tabla de 125 cartas / 48 formas / compatibilidad | ✅ |
| Battle card block / roster / Limit slots / Limit loadout persistente | ✅ |
| Deck 20 / shuffle / draw index / mano 6 / descarte 6→5 | ✅ |
| CC inicial 10 / draw inicial 3 / +3 CC ofensivo / draw +1 ofensivo | ✅ |
| Max/Current Life / Strength / Ki / Speed | ✅ |
| Buff tiers / debuff tiers (bitfields) | ✅ |
| FRONT/BACK · AIR/GROUND · Basic Guard +4 · FRONT +8 · BACK +8 DEF · Damage/Air −8 · Beam/Ground −8 | ✅ |
| Accuracy base / Speed→Accuracy / timing-counter resolution | ✅ |
| FULL/ZERO/PARTIAL | ✅ mucho mejor |
| Energy Absorb / Defense bitfield / Command suppression defense | ✅ |
| HP thresholds→CC / KO / auto replacement | ✅ |
| Stage sequences / timer / positional matrix / base component / powered reposition | ✅ (fórmula final cerrada en §86–92) |
| Gather Power counter / FX | ✅ (→ powerWindowCounter, §102) |
| Limits: exact UI/use lifecycle | ✅ (§106–111) |
| CHARA voluntary switch | ✅ (§116–126) |
| Full Stage final formula | ✅ (§130) |
| battleStat +11/+12 | ✅ RESERVED/UNUSED (§85) |
| Support carta por carta | 🟢 avanzado |
| Complete Beam/Damage formula exceptions | 🟢 avanzado |
| AI | 🟡 |
| Exact action backgrounds/tilemaps | 🟡 |
| Complete audio catalog | 🟡 |
| 125 cinematografías completas | 🟡 |

> **Siguiente bloque prioritario**: Stage `$6Cxx–$6Fxx`, `battleStat +11/+12` y
> LIMIT/CHARA. Con esos tres cerrados queda prácticamente todo el núcleo de
> reglas del BattleEngine; después el trabajo grande es convertir handlers y
> recursos visuales en las 125 timelines cinematográficas exactas.

---

# PARTE 3 — LOTE 4 (2026-08-22): Stage cerrado, battleStat, LIMIT/CHARA

> Cierra los tres bloques pendientes del lote 3. **Tres SUPERSEDES** sobre el
> lote 3: `powerWindowCounter` (no gatherPowerCounter), reposicionamiento Stage
> por prefijo resuelto (no inputs acertados), y BASIC Stage = 3/4 (nunca 5).

---

## 85. battleStat +11/+12: NO son stats ocultos

Stride del bloque por miembro: **13 bytes** (`Bank00:$3C25`). La inicialización
construye `+00..+0A` (MaxLife, CurLife, Str, Ki, Speed, status, tiers +/−,
HP→CC tracker). Después de `+0A` no se inicializa nada más.

Auditoría de referencias a `$3C25`: los accesos funcionales llegan hasta `+0A`;
**no hay código de combate usando `+0B/+0C`**. Por tanto:

```text
+0B RESERVED / UNUSED_OBSERVED
+0C RESERVED / UNUSED_OBSERVED
```

Recomendación: quitarlos del modelo semántico; si se conserva raw:
`reserved0B/reserved0C` — **no inventar estadísticas**.

## 86. Fórmula Stage — cerrada

Preparación numérica: `Bank7E:$4EF6–$4F4A`, con helpers `Bank7E:$5BE8`
(atacante) y `Bank7E:$5C2D` (defensor).

## 87. Componente ofensivo Stage exacto

```text
stageAttack = (kaioKen ? strength * 2 : strength)
            + (powerWindowCounter > 0 ? 4 : 0)
            + strengthBuffTier * 8
            - strengthDebuffTier * 8
(clamp inferior a 0)
```

## 88. Stage NO recibe FRONT +8

A diferencia de Damage/Beam (attacker FRONT → +8), el helper Stage `$5BE8` **no
aplica ese +8**. La posición horizontal se usa después de forma más agresiva
(§90).

## 89. Componente defensivo Stage (`Bank7E:$5C2D`)

```text
+8 × vulnerabilityTier        (al componente atacante)
-8 × defenseBuffTier
-8 si defensor BACK
-4 si Basic Guard (CA82 == 2)
```

```ts
rawStage = max(0, stageAttack + vulnerabilityTier*8 - defenseBuffTier*8
                - (defenderBack ? 8 : 0) - (basicGuard ? 4 : 0));
```

## 90. Después la ROM divide por cuatro

```asm
SRL A
SRL A
```

```text
stageBase = floor(rawStage / 4)
```

## 91. BACK vuelve a afectar después

Tras el /4, divisiones enteras por desplazamiento:

```text
attacker BACK → stageBase /= 2
defender BACK → stageBase /= 2
```

Matriz: F/F = base · B/F = base/2 · F/B = (defensa BACK −8) + base/2 ·
B/B = defensa BACK −8 + /2 + /2.

> La posición Stage afecta a: (1) ventana QTE, (2) componente defensivo,
> (3) multiplicador final.

## 92. Fórmula final del Stage

Durante reproducción (`Bank01:$6C06`), cada comando aceptado incrementa
`CA7F++`. Al final (`Bank01:$6E06`): `CA7F = CA80 + CA7F`.

```ts
finalStageDamage = stageBase + resolvedCommandCount;
// excepción: resolvedCommandCount == 0 → 0 (forzado por la ROM)
```

## 93. `resolvedCommandCount`, no `correctInputs`

El QTE guarda `CA60..` (expected) y `CA6A..` (success flags), pero con B-repair
un comando fallado puede reinsertarse y procesarse como resuelto. Por tanto:

```text
resolvedCommandCount = inputs correctos + inputs fallados reparados con B
```

## 94–95. Semántica numérica de A y B tras error

- **B correcto** (`< 10 ticks`): recupera el comando actual → lo ejecuta → lo
  cuenta en CA7F → continúa la secuencia. **Reparación y continuación.**
- **A correcto** (`< 25 ticks`): NO repara la secuencia. Finaliza con el
  progreso acumulado hasta el error y llama a la finalización Stage.
- **Respuesta demasiado lenta**: ramas tardías → `CA7F = 0` (resolución nula).

## 96. CC generado por Stage

`Bank01:$6E17–$6E24`: `E = CA5F; CALL $34D3` ($34D3 = incrementador de CC).
En esa fase `CA5F` ya es el número de comandos procesados/aceptados:

```text
CC gained = resolvedCommandCount
gainCc(resolvedCommandCount);
```

La misma cantidad determina el prefijo de secuencia considerado ejecutado.

## 97. SUPERSEDES lote 3 — reposicionamiento Stage

❌ Lo dicho en §78–79 ("los direccionales acertados reescriben la posición") es impreciso. `Bank01:$6E43–$6E6B` **no consulta CA6A (success flags)**:
consulta directamente `CA60` (expected sequence) y recorre `CA5F` comandos.

> **Correcto**: se aplican los direccionales del **prefijo de la secuencia que
> terminó siendo resuelto/procesado**.

Con B: comando fallado + B repair → entra en el prefijo resuelto → su
dirección también reposiciona. Con A: el fallo termina antes de ese comando →
no entra en el prefijo final.

## 98. Reposicionamiento exacto

Sólo si `powerWindowCounter != 0` **y** `CA82 != 1` (modo especial sin nombre
semántico definitivo, 🟡). Por cada comando resuelto:

```text
RIGHT $01 → position |= $02   → BACK
UP    $04 → position |= $01   → AIR
DOWN  $08 → position &= $02   → GROUND (preserva FRONT/BACK)
A/B        → no modifican posición
```

## 99. Cualquier Stage puede reposicionar con power window

La rutina NO comprueba `card == 4 Stage`: comprueba `fighterState+4 != 0`.
5/6 Stage vía Joint/Limit durante power window **también reposicionan**.
Es propiedad `STAGE + POWER WINDOW`, no del card ID.

## 100. BASIC Stage: sólo 3 o 4 (SUPERSEDES)

`Bank7E:$59D1`:

```asm
if fighterState+4 == 0: return 1   ; Card 1 = 3 Stage
else:                   return 2   ; Card 2 = 4 Stage
```

```text
BASIC Stage: powerWindow == 0 → 3 Stage · powerWindow != 0 → 4 Stage
```

❌ **SUPERSEDED**: cualquier implementación HUD que sortee 3/4/5 para BASIC
debe eliminarse.

## 101. 5 Stage y 6 Stage son cartas reales (no salen de BASIC)

Card 3 = 5 Stage · Card 4 = 6 Stage. El selector BASIC jamás devuelve 3/4:
sólo entran por JOINT y/o LIMIT (compatibilidad/configuración). Diferencia
importante para Cards/HUD/GameConfig.

## 102. Renombrar `gatherPowerCounter` → `powerWindowCounter` (SUPERSEDES)

Dos escritores confirmados:

```text
Gather Power (Bank01:$7A18): fighterState+4 = 5
CHARA        (Bank01:$7270..): fighterState+4 = 2
```

Usado además para: LIMIT enabled? · Basic Stage 3→4 · físico +4 · Beam +4 ·
Stage +4 · Stage reposition enabled. Nombre neutral propuesto:
`powerWindowCounter` (o `limitPowerCounter`).

## 103. Decremento del power window — POST_ACTION_MAINTENANCE (SUPERSEDES)

> ❌ SUPERSEDED por lote 5 §132–133: la cadencia ya NO es desconocida.
> `Bank01:$4B21/$4B66` decrementa **ambos fighters después de cada
> ActionExecution completada**, antes del siguiente control (C0A0=$02).
> `ROM_CADENCE_PENDING` queda eliminado del modelo.

```text
Gather: WRITE 5 → maintenance 4 → next control ve 4
CHARA:  WRITE 2 → maintenance 1 → next control ve 1
```

## 104. Taxonomía interna de acción por lado (CA55/CA56)

```text
CA55 = lado 1 · CA56 = lado 2 · payload en CA57/CA58

0 → BASIC GUARD
1 → CARD ACTION
2 → BASIC MOVE
3 → CHARA
4 → GATHER POWER
```

## 105. CARD ACTION unifica LIMIT, JOINT y BASIC Stage

Tras la selección las tres convergen: `CA55=1, CA57=cardId`. La diferencia se
resuelve ANTES:

```text
JOINT      → elimina carta de mano
LIMIT      → no elimina carta
BASIC Stage → genera Card ID 1/2
```

El Engine puede conservar `source` para auditoría; la ejecución comparte ruta.

## 106–108. LIMIT — validación, CC y no eliminación

- Listado: `Bank01:$5C0F`, recorre hasta 5 slots del miembro activo; cada carta
  pasa el validator genérico `Bank01:$7B96` + condición extra
  `powerWindowCounter != 0` (si es 0, LIMIT aparece no utilizable).
- **LIMIT consume CC normalmente**: el resolver común hace
  `currentCC -= card.ccCost`. Reusable ≠ free.
- Al confirmar (`CA57=cardId, CA55=1`) **no se llama a la rutina de borrado de
  mano**: queda equipado. JOINT sí: `Bank00:$2E51 → Bank01:$45CF`
  (zero slot → shift left → zero tail).

## 109. Validador común de cartas (`Bank01:$7B96`)

```text
card.ccCost <= currentCC
compatibilidad: (cardId-1)/8 y (cardId-1)%8 → bit en máscara de 48 formas
```

Confirmado a nivel de código de ejecución, no sólo estructura de tabla.

## 110. Restricción por fase

```text
Ataque (CA0C == 0): rechaza type 0 y type 5 (Defense); permite ofensivas/Support válidas
Defensa (CA0C != 0): exige type >= 4 → sólo Support y Defense
```

Aplica igual a LIMIT y JOINT.

## 111. LIMIT también puede usarse en defensa

Defense Phase = LIMIT + JOINT + BASIC; el path LIMIT vuelve al selector
`$5C0F`. Un Limit es válido en defensa cuando: equipado + powerWindow > 0 +
compatible + CC suficiente + tipo Support/Defense + restricciones específicas.

## 112. Menú ofensivo confirmado (`Bank01:$4FDE`)

```text
CA36 = 0 → LIMIT → state $0A
CA36 = 1 → JOINT → state $14
CA36 = 2 → BASIC → state $1E
CA36 = 3 → CHARA → state $28
```

## 113. Menú defensivo confirmado (`Bank01:$521D`)

Sólo acepta 0/1/2 (LIMIT/JOINT/BASIC). **No existe rama CHARA**:

> No se puede cambiar voluntariamente de personaje durante Defense Phase.

## 114–115. BASIC ofensivo y defensivo exactos

```text
Ofensivo: CA36 != 1 → Stage (CA55=1, CA57=1|2) · CA36 == 1 → Gather (CA55=4, CA57=0)
Defensivo: CA36 == 0 → GUARD (CA55=0) · CA36 != 0 → MOVE (CA55=2)
```

Presentación/resolver transforma: `GUARD → CA82=2 · MOVE → CA82=3`. CA82 es
modalidad de resolución, no simplemente "isGuard".

## 116–119. CHARA — restricciones

- Selector construye máx 3 miembros desde `battleBlock +0..+2`.
- Precondición: `currentLife != 0` del miembro (si 0 → rechazado).
- `selected == activeMember` → return (**selected != activeMember** formal).
- Al confirmar sólo se almacena `CA57=selected, CA55=3`; el cambio real de
  `fighterState+1` ocurre **después**, dentro de la ActionExecution de CHARA
  (~`Bank01:$7320`): `fighterState.activeMember = selected` + refresco de
  gráficos/stats.

> El swap lógico está sincronizado con un beat de la cinematografía, no con el
> clic del menú.

## 120. CHARA — ejecución cinematográfica propia

Dispatcher de presentación:

```text
lado 1: CHARA → $0D · GATHER → $0E
lado 2: CHARA → $17 · GATHER → $18 (mirrored)
```

No es `activeMember = X → render`.

## 121–122. Dispatcher CHARA y pausas explícitas

Ejecución real: `Bank01:$71F4`, máquina propia (estados 1–5); fase central
llama a `Bank01:$7293` (múltiples beats). Pausas: `CB77 = $14` (20 ticks) y
`CB77 = $1E` (30 ticks), más waits de presentación. Conservar:

```text
salida/preparación → hold → swap real → entrada/refresco → hold → retorno
```

## 123. Momento exacto del cambio de activeMember

`Bank01:$7320–$733E`: obtiene fighter state del lado → payload CA57/CA58 →
escribe en `fighterState+1` → actualiza CA0B → reconstruye datos gráficos →
continúa la cinematografía. Timeline debe tener cue lógico
`CHARACTER_SWITCH_COMMIT` dentro de la ActionExecution.

## 124–126. CHARA — posición táctica

```text
position |= $02  → horizontal = BACK (persistente, no visual)
bit0 no se toca   → vertical preservado

GROUND_FRONT → GROUND_BACK · AIR_FRONT → AIR_BACK
GROUND_BACK → GROUND_BACK · AIR_BACK → AIR_BACK
```

Y después: `fighterState+4 = 2` (powerWindowCounter = 2). Cambiar de personaje
NO es mecánicamente neutro: activa LIMIT, Stage 3→4, +4 ofensivo, Stage
reposition.

## 127. Gather y CHARA escriben valores distintos

```text
GATHER POWER → powerWindowCounter = 5
CHARA        → powerWindowCounter = 2
```

Ambos decrementados por `Bank01:$4B66`. Documentar así hasta mapear a ventanas
humanas Turn/Exchange.

## 128–129. Modelo de acción canonizado

```ts
type RomBattleActionKind =
  | 0 // BASIC_GUARD
  | 1 // CARD
  | 2 // BASIC_MOVE
  | 3 // CHARA
  | 4; // GATHER_POWER

type CardSource = "LIMIT" | "JOINT" | "BASIC_STAGE";

type BattleCommand =
  | { type: "PLAY_CARD"; source: "LIMIT" | "JOINT"; cardId: CardId }
  | { type: "STAGE_ATTACK"; cardId: 1 | 2 | 3 | 4; source: "BASIC" | "LIMIT" | "JOINT" }
  | { type: "GATHER_POWER" }
  | { type: "GUARD" }
  | { type: "MOVE"; axis: "HORIZONTAL" | "VERTICAL" }
  | { type: "SWITCH_CHARACTER"; memberIndex: 0 | 1 | 2 };
```

El Engine transforma después al equivalente CA55/CA57.

## 130. Fórmula Stage candidata definitiva

```ts
function computeStageBase(attacker, defender, basicGuard): number {
  let attack = attacker.member.strength;
  if (attacker.status.kaioKen) attack *= 2;
  if (attacker.powerWindowCounter > 0) attack += 4;
  attack += attacker.buffs.strength * 8;
  attack -= attacker.debuffs.strength * 8;
  attack = Math.max(0, attack);

  let vulnerability = defender.debuffs.vulnerability * 8;
  let defense = defender.buffs.defense * 8;
  if (defender.position.horizontal === "BACK") defense += 8;
  if (basicGuard) defense += 4;

  let raw = Math.max(0, attack + vulnerability - defense);
  let base = raw >> 2;
  if (attacker.position.horizontal === "BACK") base >>= 1;
  if (defender.position.horizontal === "BACK") base >>= 1;
  return base;
}

// Resolución completa:
const resolved = stage.resolvedCommandCount;
gainCc(attacker, resolved);
if (resolved === 0) damage = 0;
else damage = computeStageBase(...) + resolved;
if (attacker.powerWindowCounter > 0 && resolutionMode !== ROM_CA82_MODE_1) {
  applyStagePositionCommands(stage.expectedSequence.slice(0, resolved), defender);
}
```

> Usar `expectedSequence[0..resolved)`, NO `successfulButtons`.

## 131. Correcciones en cascada y estado

### SUPERSEDES lote 3

| Antes | Ahora |
|---|---|
| `gatherPowerCounter` | `powerWindowCounter` (CHARA también escribe el campo) |
| Stage powered reposiciona con inputs acertados | reposiciona con el **prefijo de comandos resueltos** (B-repair cuenta) |
| BASIC Stage puede mostrar 3/4/5 | BASIC: counter 0 → 3 Stage · counter ≠ 0 → 4 Stage · 5/6 sólo por cartas |

### Nuevo

```text
CHARA → commit diferido en cinematografía · horizontal BACK · vertical conservado · powerWindowCounter = 2
Stage damage = floor(netPhysicalStage / 4 / positionalBackModifiers) + resolvedCommandCount
Stage CC gain = resolvedCommandCount
```

### Estado del bloque

| Investigación | Estado |
|---|---|
| Stage `$6Cxx–$6Fxx` | 🟢 casi cerrado |
| Fórmula Stage / CC / B repair / A abort / reposition | ✅ |
| battleStat +11/+12 | ✅ reserved/unobserved |
| LIMIT lifecycle / validation / attack+defense / JOINT vs LIMIT | ✅ |
| BASIC Stage real | ✅ |
| CHARA availability / restrictions / commit / position / power effect | ✅ |
| CHARA cinematografía macro exacta | 🟢 |
| Semántica humana definitiva CA82=1 | 🟡 |

### Cambio de mayor impacto

`fighterState+4` es un **estado temporal general de potencia**, no "Gather
Power": powerWindowCounter → 0 normal · Gather 5 · CHARA 2 · LIMIT gate ·
Stage BASIC 3→4 · +4 offense · Stage positional commands.

Y **BASIC nunca genera 5 Stage**: la ROM sólo selecciona Card 1 o 2. Corregir
ya en HUD, Engine, documentación y tests antes de seguir construyendo sobre la
regla vieja.

---

# PARTE 4 — LOTE 5 (2026-08-22): cadencia powerWindow, CA82, CHARA/Gather, cierre Stage

> Cierra la cadencia de decremento (POST_ACTION_MAINTENANCE), clasifica CA82
> completo, canoniza FX compartido Gather/CHARA y el skeleton Stage final.
> SUPERSEDES: ROM_CADENCE_PENDING (ahora §132-133).

---

## 132. Cadencia exacta de powerWindowCounter — POST_ACTION_MAINTENANCE

Rutina: `Bank01:$4B21` (máquina de mantenimiento común). Su estado `$04`
entra en `Bank01:$4B66` y hace literalmente para **ambos lados**:

```asm
fighter1.powerWindowCounter: if > 0 → --
fighter2.powerWindowCounter: if > 0 → --
```

### Cuándo se ejecuta

Los handlers de acciones terminan regresando al estado global `C0A0 = $02`:

```text
Stage → termina → C0A0=$02
Gather → termina → C0A0=$02
CHARA → termina → C0A0=$02
...
```

Y `C0A0=$02 → Bank01:$4B21 → post-action maintenance → decrement → siguiente fase/decisión`.

> **powerWindowCounter decrementa una vez después de cada ActionExecution
> completada, para ambos combatientes, antes del siguiente control de juego.**

NO es TURN_END, ni ATTACK_PHASE_END, ni tiempo real. Es POST_ACTION_MAINTENANCE.

## 133. ROM_CADENCE_PENDING eliminado — boundary canonizado

```text
execute action
↓
action presentation/resolution completes
↓
POST_ACTION_MAINTENANCE
↓
decrementPowerWindow(player) · decrementPowerWindow(enemy)
↓
NEXT_CONTROL_BOUNDARY
```

`decrementPowerWindow(state)` debe ejecutarse exactamente ahí.

## 134. Efecto real de Gather = 5

```text
GATHER commit → counter = 5
↓
POST_ACTION_MAINTENANCE → counter = 4
↓
NEXT PLAYER CONTROL  (observa 4)
```

La escritura canónica de Gather sigue siendo 5; el siguiente punto de control
normalmente observa 4. Son dos eventos consecutivos, sin contradicción.

## 135. Efecto real de CHARA = 2

```text
CHARA finalize → counter = 2
↓
POST_ACTION_MAINTENANCE → counter = 1
↓
NEXT PLAYER CONTROL  (observa 1)
```

Los tests de reducer `GATHER→5` y `CHARA→2` se conservan; faltan tests a nivel
Runtime/Exchange: `5→4` y `2→1` tras mantenimiento.

## 136. Duración funcional sin llamarlas “turnos”

```text
Gather: WRITE 5 → maint 4 → acc 3 → acc 2 → acc 1 → acc 0  (4 boundaries activos)
CHARA:  WRITE 2 → maint 1 → acc 0                            (1 boundary activo)
```

No renombrar a "4 turnos/1 turno": la ROM cuenta acciones/mantenimientos internos.

## 137. Test crítico: decremento de AMBOS fighters

```text
P1.counter = 4 · P2.counter = 2
P1 completa acción → maintenance
→ P1.counter = 3 · P2.counter = 1   (aunque P2 no haya actuado)
```

## 138. Una acción rechazada NO consume ventana

El decremento está después de una **ejecución completada**: comando inválido →
rechazo → vuelve a PLAYER_CHOICE sin decrementar. Los ticks cinematográficos
tampoco decrementan.

---

## 139–142. CA82 clasificado completamente

Al inicio de la resolución global (`Bank01:$7505`): `CA82 = 0 · CA83 = 0`.

| CA82 | Significado |
|---:|---|
| 0 | resolución normal |
| 1 | **SPECIAL_SUPPORT_RESOLUTION** (alias semántico nuestro — la ROM no tiene nombre) |
| 2 | BASIC GUARD |
| 3 | BASIC MOVE |

### Escritor de CA82=1

Sólo `Bank7E:$57E0`: `CA53 = 0 · CA82 = 1`. Dispatcher llega ahí para cards
85, 86, 90, 94, 102, 110, 112, 116 (Tien, Yajirobe, Hercule, Dabura, Ki
Absorber, Gamebomb, Special Candy, Roshi's Book — mapping USA).

### Efectos de CA82=1

```text
Damage: card.power >> 1      (Bank7E:$4F7E)
Beam:   card.power >> 1      (Bank7E:$501B)
Stage reposition: sale antes  (Bank01:$6E2E) → NO reposition
Stage result: CA7F = 0        (Bank01:$6893)
```

No es una bandera visual: interviene directamente en la resolución.

## 143. CHARA y Gather comparten cinematografía base

Ambas llaman `Bank00:$3ABD` → `Bank03:$6750` → carga `Bank $68, Resource
$1A → VRAM $8800`. **Mismo recurso gráfico base de efecto**; la diferencia
está en la paleta y el guion alrededor.

## 144–151. Gather — cinematografía y timing

### Skeleton (handler `Bank01:$7993`)

```text
COMMON INTRO → shared action-scene prep → Gather sequence → power FX
→ post-FX hold → scene restore → powerWindowCounter = 5 → POST_ACTION_MAINTENANCE
```

### Shared Action Setup (`Bank01:$7A62`, también CHARA)

`BC=$0308 · E=$10 · D=$02` + `CB77 = 20` → **WAIT 20 ticks**.

### Gather-specific (`Bank01:$7B2C`)

```text
load presentation macro $19 → wait → palette transition BC=$0340 → wait  ⚠️ SUPERSEDED by §174/§175: $19 is SET_ANIMATION_STATE slot 0, not a graphic resource
→ WAIT 20 → palette $33 → start shared power FX
```

### FX exacto (`Bank03:$6750` + `$6806`)

`Bank68:$1A → VRAM $8800` + palette `$33`; core effect `CB77++ CP $5A` =
**90 ticks**.

### Paleta `$33` (Gather) — ROM_CONFIRMED sólido

| Índice | Color |
|---:|---|
| 0 | `#FFFFFF` (blanco) |
| 1 | `#F6A452` (dorado/naranja) |
| 2 | `#F6CDA4` (naranja claro) |
| 3 | `#FF8300` (naranja intenso) |

### Post-FX hold

`CB77 = $1E` → **WAIT 30** antes de la transición final.

### Timing fijo mínimo

```text
shared 20 + pre-FX 20 + FX core 90 + post 30 = 160 ticks ≈ 2.68 s
(duración total > 160: faltan waits asíncronos de carga/anim/transición)
```

### El counter se escribe al FINAL

`Bank01:$7A18` (`fighterState+4 = 5`) ocurre DESPUÉS de FX + post-hold +
transition out. La secuencia lógica:

```text
GATHER VISUAL → GATHER FINALIZE (counter=5) → POST_ACTION_MAINTENANCE (5→4) → next control
```

## 152. Yakon integrado en el cierre de Gather

Tras escribir 5, la ROM consulta la acción del otro lado; si es CARD ACTION
con card ID `$5F` (95 = Yakon):

```asm
XOR A · LD (HL),A   →  powerWindowCounter = 0
```

```text
Gather finalizes → counter=5 → ¿acción rival == Yakon? → no: 5 · sí: 0
```

Interacción carta-a-acción directamente codificada.

---

## 153–162. CHARA — cinematografía exacta

Handler: `Bank01:$71F4` (5 estados exteriores):

```text
common intro → shared scene setup → CHARA core → exit transition → final tactical effects
```

### Shared setup: el mismo `Bank01:$7A62` que Gather

### Core (`Bank01:$7293`, 12 estados internos 0…11)

```text
load macro $19 → wait → palette transition $0348 → wait → WAIT 20  ⚠️ SUPERSEDED by §174/§175
→ load $27 → wait → CHARACTER_SWITCH_COMMIT → refresh assets/stats
→ load $28 → wait → palette $31 → shared power FX → WAIT 30 → finish
```

### Commit del miembro — `Bank01:$7320`

```text
obtiene side → memberIndex → escribe activeMember → actualiza CA0B
→ refresca datos/graphics → continúa la ActionExecution
```

> **activeMember cambia a mitad de la cinematografía** — ese es el beat
> CHARACTER_SWITCH_COMMIT.

### Paleta `$31` (CHARA)

| Índice | Color |
|---:|---|
| 0 | `#FFFFFF` (blanco) |
| 1 | `#FF8B83` (rosa/salmón) |
| 2 | `#FFCDC5` (rosa claro) |
| 3 | `#FF524A` (rojo-coral) |

### Familia de asset FX única

```text
MISMO FX graphics: Bank68:$1A
Gather: palette $33 → naranja/dorado
CHARA:  palette $31 → rojo/rosa
```

→ **una única familia de asset FX parametrizada por paleta**, no dos sprites.

### Core FX CHARA: también 90 ticks + hold 30 (mismo $6750/$6806)

Timing fijo mínimo CHARA = 160 ticks ≈ 2.68 s (mismo presupuesto que Gather).

### Dos commits distintos

```text
Commit 1 — personaje:  activeMember = selectedMember  ($7320, mitad de la acción)
Commit 2 — táctico:    position |= $02 · powerWindowCounter = 2  (final de $71F4)

CHARACTER_SWITCH_COMMIT → FX entrada → CHARACTER_SWITCH_FINALIZE (BACK + counter=2)
→ maintenance (2→1)
```

Vertical se conserva hasta el final (`position |= 2` nunca toca bit0):
AIR_FRONT→AIR_BACK · GROUND_FRONT→GROUND_BACK · *BACK→*BACK.

## 163. Recomendación M8.CHARA

Pixi jamás muta BattleState. Secuencia preprogramada por Engine/Runtime:
`SWITCH_CHARACTER accepted → ActionExecution → PresentationTimeline →
CHARACTER_SWITCH_COMMIT → CHARACTER_SWITCH_FINALIZE → post-action maintenance`.
Estado final determinista en Engine; el Presenter solo revela visualmente en el
tick ROM correcto.

---

## 164–170. Stage — cierre cinematográfico

### Pre-QTE (setup `Bank01:$6955` + vuelta `$682C`)

```text
WAIT 20 (setup secuencia) + WAIT 30 (vuelta a máquina superior) = 50 ticks
```

❌ OBSOLETA la antigua timeline `0/12/30/48/60`.

### QTE (`Bank01:$6A47`) — sin cambios: ventana global 50/80/120/150, prefijo resuelto, A/B repair.

### Playback (`Bank01:$6BC1`)

Cada comando aceptado: `INC ($CA7F)` — es esta fase la que consolida
resolvedCommandCount (daño/CC).

### Cierre

```text
playback completo → WAIT 30 → aplicar resultado/Life reaction → WAIT 60 → cleanup
```

### Skeleton Stage actualizado (sustituye al provisional del Presenter)

```text
STAGE ACTION
├─ common scene setup
├─ sequence setup → WAIT 20 → preparación → WAIT 30
├─ QTE START (global 50/80/120/150)
├─ recovery: B<10 repair/continue · A<25 abort con progreso
├─ resolved-command playback
├─ finalize: stageBase + resolvedCommandCount · CC += count · powered position prefix
├─ WAIT 30
├─ apply result / Life reaction
├─ WAIT (Life presentation)
├─ WAIT 60
└─ restore battle scene
```

### CA82=1 en el cierre

Antes de aplicar un resultado Stage: `if CA82==1: CA7F = 0` + no powered
reposition → contrato específico de SPECIAL_SUPPORT_RESOLUTION frente a Stage,
a entrar en el Engine antes de cablear la fórmula definitiva.

---

## 171. Eventos recomendados para EventLog

```ts
POWER_WINDOW_SET { fighter, value: 5 | 2 }
CHARACTER_SWITCH_COMMITTED { fighter, fromMember, toMember }
POST_ACTION_MAINTENANCE { decrementedPowerWindows: [...] }
// opcional:
CHARACTER_SWITCH_FINALIZED { fighter, horizontal: "BACK", powerWindowCounter: 2 }
```

Hace el replay mucho más auditable.

## 172. Tests a añadir

| Test | Resultado |
|---|---|
| Gather reducer commit | counter=5 |
| Gather post-action boundary | 5→4 |
| CHARA finalize | counter=2 |
| CHARA post-action boundary | 2→1 |
| Acción siguiente | decrementa ambos fighters |
| Acción rechazada | no decrementa |
| Cinematic ticks | no decrementan |
| Counter 0 | permanece 0 |
| CHARA | commit member antes de finalize |
| CHARA finalize | fuerza BACK · conserva AIR/GROUND |
| Gather vs Yakon | counter termina 0 |
| CA82 reset | 0 al iniciar nueva resolución |
| Basic Guard / Move | CA82=2 / CA82=3 |
| Special Support | CA82=1 |
| Stage + CA82=1 | no reposition |
| Stage playback done | hold 30 |
| Stage result done | hold 60 |

## 173. Correcciones/SUPERSEDES

### SUPERSEDES ROM_CADENCE_PENDING

```text
Antes: cadencia de decremento desconocida
Ahora: POST_ACTION_MAINTENANCE — después de cada ActionExecution completada,
       para ambos fighters, antes del siguiente control (§132-133)
```

### Precisión nueva (sin tocar GATHER=5 ni CHARA=2)

```text
next control after Gather normalmente ve 4
next control after CHARA normalmente ve 1
```

### CA82 nuevo

```text
0 NORMAL · 1 SPECIAL_SUPPORT_RESOLUTION (alias nuestro) · 2 BASIC_GUARD · 3 BASIC_MOVE
```

### Asset canon nuevo

```text
POWER/CHARA shared FX: Bank68:$1A → VRAM $8800
Gather palette $33 · CHARA palette $31
```

### CHARA contract

```text
mid-action: activeMember commit · end-action: force BACK + counter=2 · post-action: 2→1
```

### Gather contract

```text
power FX finishes → final transition → counter=5 → Yakon counter-check → maintenance
```

---

## 174. `SUPERSEDES`: `$19/$27/$28` son macros de presentación, no recursos

La llamada `Bank00:$3E92` (BC = macroId) indexa una tabla en `Bank30:$5D00`.
Formato: `u16 relativePointer → u8 commandCount → command[commandCount]` (5 bytes cada uno).

Por tanto `$19`, `$27` y `$28` son **macros de presentación**, no recursos gráficos.

SUPERSEDED: cualquier referencia a "presentation resource $19/$27/$28" → "presentation macro $19/$27/$28".

## 175. Macro `$19`: estado neutro del actor

```text
Macro $19
pointer = $0206, commands = 1
04 00 00 00 A0  →  SET_ANIMATION_STATE slot=0 variant=0
```

Coloca el actor principal en su estado animado 0. Su pareja:

```text
Macro $1A
04 01 00 00 A0  →  SET_ANIMATION_STATE slot=1 variant=0
```

`$19/$1A` son los estados neutros iniciales de actor/defensor dentro del plano ACTION.

## 176. Macro `$27`: salida exacta de CHARA

```text
Macro $27
actor animation state = 2

ΔX = -1 × 2 ticks
ΔX = -2 × 2 ticks
ΔX = -3 × 4 ticks
ΔX = -4 × 20 ticks

Total: -98 px en 28 ticks

WAIT 15 ticks
```

Contrato:

```text
CHARA_EXIT
state 2 → retreat 98 px / 28t → hold 15t
Duración fija: 43 ticks ≈ 0.720 s
```

El signo se refleja automáticamente para el lado contrario.

## 177. Macro `$28`: entrada exacta del nuevo personaje

Primera fase:

```text
state = 1
+8×8 + 6×4 + 4×3 + 2×2 + 1×2 = +106 px en 19 ticks
WAIT 5
state = 2
-1 × 8 ticks = -8 px
state = 0
```

Resultado espacial neto: `+106 - 8 = +98 px` — exactamente simétrico a la salida de `$27`.

Duración fija: `19 + 5 + 8 = 32 ticks ≈ 0.536 s`

## 178. Coreografía CHARA definitiva

```text
ACTION SETUP
↓
actor viejo → state 0
↓
palette transition $0348
↓
WAIT 20
↓
MACRO $27
  state2 → retreat 98 px / 28t → hold 15t
↓
CHARACTER_SWITCH_COMMIT
  activeMember = selectedMember
  reload character data/assets
↓
MACRO $28
  state1 → enter 106 px / 19t → hold 5t
  state2 → settle -8 px / 8t
  state0
↓
palette $31
↓
shared FX Bank68:$1A
↓
90t FX
↓
WAIT 30
↓
palette transition out
↓
FINALIZE
  position |= BACK
  powerWindowCounter = 2
↓
POST_ACTION_MAINTENANCE
  2 → 1
```

Macros `$27+$28`: `43 + 32 = 75 ticks ≈ 1.256 s` (sin fades/FX/waits asíncronos).

## 179. `SUPERSEDES`: `$07F4/$080C` son transiciones de paleta CGB

Las rutinas `Bank01:$4000` procesan buffers `$C600/$C680` (128 bytes cada uno = 64 colores × 2 bytes), extrayendo canales RGB15 de Game Boy Color (`value & $1F` cada canal) e interpolando progresivamente.

Perfiles como `$0308`, `$0340`, `$0348` son **PALETTE_TRANSITION** (parámetros/máscaras del interpolador de paletas CGB), no camera/tilemap transitions.

SUPERSEDED: "$07F4/$080C = generic scene transition" → "$07F4/$080C = CGB palette interpolation/transition".

## 180. TACTICAL → ACTION: carga de actores confirmada

`Bank01:$7422` ejecuta la entrada al subsistema ACTION. Primero `Bank01:$6708` prepara los fighter slots:

```text
CA59 → presentation slot 0 → character/form lookup → metasprite setup
CA5A → presentation slot 1 → character/form lookup → metasprite setup
```

Después el juego carga gráficos específicos de combate.

## 181. Los gráficos ACTION se cargan en VRAM aparte

`Bank00:$33A1` carga datos hacia `VRAM $8E00`. `$33C0` y `$33EC` continúan cargando bloques hacia la misma región.

> La ROM prepara un conjunto gráfico de combatiente para ACTION distinto del sprite táctico persistente.

Esto respalda la arquitectura `TACTICAL fighter ≠ ACTION fighter`.

## 182. Inicio ACTION: macros de inicialización

Al terminar la carga: `Macro $19` → actor slot 0 state 0, `Macro $1A` → slot 1 state 0.

```text
TACTICAL
↓ prepare action actors (slot 0/1)
↓ load ACTION graphics → VRAM
↓ initialize presentation slots ($19/$1A)
↓ palette transition
↓ ACTION execution
```

TACTICAL↔ACTION architecture = ✅ · exact tilemap transition = 🟡 (faltan las escrituras $9800/$9C00).

## 183. Taxonomía visual real de Support

| Handler | Perfil observado |
|---:|---|
| `$00` | recuperación de Life |
| `$02` | buffs/estados propios |
| `$0B` | Support directo / Knock Down / efecto activo |
| `$0D` | debuff/control del rival |
| `$0F` | Ki Absorber, caso especial |

## 184. Familia Support `$00`: recuperación

| ID | Carta | FX | PAL | Uso normal | Uso defensivo |
|---:|---|---:|---:|---|---|
| 16 | Resurrection | `$08` | `$30` | `MaxLife.low >> 2` | `MaxLife.low >> 3` |
| 88 | Dende | `$08` | `$30` | `floor(MaxLife/4) + 10` | `floor(MaxLife/4)` |
| 99 | Medical Machine | `$08` | `$30` | `Power + floor(effectiveSpeed/2)` | `Power + floor(effectiveSpeed/4)` |

La Action machine identifica `$10`/`$58`/`$63` como la familia que activa modo recuperación de Life. Medical Machine depende de `effectiveSpeed` (llama `Bank7E:$5C6E` — mismo resolver de Speed efectiva ya identificado).

## 185. Support puede tener efecto reducido durante Defense Phase

La ROM posee dos caminos:

```text
Bank7E:$5180 → normal Support resolution
Bank7E:$5584 → defensive Support resolution
```

Algunas cartas conservan exactamente el mismo efecto. Otras lo reducen. Y un grupo concreto se convierte en `CA82 = 1` (SPECIAL_SUPPORT_RESOLUTION).

El Engine debería aceptar:

```ts
resolveSupport(card, context: { phase: "ATTACK" | "DEFENSE" })
```

## 186. Support de buffs propios

| ID | Carta | Efecto ROM |
|---:|---|---|
| 23 | Kaio Ken | `status |= $40`; duplica Strength/Ki base en fórmula |
| 27 | Sup. Saiyan-2 | Ki buff tier `+1` |
| 28 | Sup. Saiyan-3 | Strength buff tier `+1` |
| 59 | Speed Up | Speed buff tier `+1` |
| 68 | Lock On | `status |= $10`, fuerza resolución normal siguiente |
| 79 | Flesh Guard | Defense buff tier `+1` |
| 89 | Guru | Strength `+1` + Ki `+1` |
| 92 | Kibito | status low bits=`2`, protección de Beam |
| 97 | C.C. Fridge | `+5 CC` |
| 100 | Rejuvenation Chamber | `negativeTiers = 0` |
| 104 | Trunks' Sword | Strength buff `+1` |
| 105 | Dabura's Spear | Strength buff `+1` |
| 106 | Light Vest | Speed buff `+1` |
| 107 | Old Armor | Defense buff `+1` |
| 108 | New Jacket | Defense buff `+1` |
| 109 | Sunglasses | `status |= $08` |
| 111 | Champion Belt | low status mode=`1`, protección Damage |
| 114 | Heart Pills | `negativeTiers = 0` |
| 117 | Full Spirit | Ki buff `+1` |
| 118 | Afterimage | `status |= $04`, siguiente threshold `/2` |
| 119 | Reading Ki | `status |= $10` |
| 120 | Feint | `status |= $10` |

Los tiers saturan a 0..3, cada nivel = 8 puntos donde aplica.

## 187. Support de debuff/control

| ID | Carta | Efecto ROM |
|---:|---|---|
| 42 | Kiai | vulnerability tier objetivo `+1` |
| 51 | Paralysis | Speed debuff `+1` |
| 83 | Bulma | Strength debuff `+1` |
| 84 | Chiaotzu | Speed debuff `+1` |
| 87 | Kaio | Ki debuff `+1` |
| 91 | Supreme Kai | Speed debuff `+1` |
| 93 | Babidi | limpia positive y negative tiers |
| 95 | Yakon | `powerWindowCounter = 0` |
| 96 | New Scouter | vulnerability tier `+1` |
| 101 | Gravity Device | Speed debuff `+1` |
| 103 | Sealed Ball | Strength debuff `+1` + Ki debuff `+1` |
| 113 | Heart Virus | Strength debuff `+1` + Ki debuff `+1` |
| 115 | Hourglass | `statusFlags &= $80` |

Hourglass: no pone `all status = 0`, hace `statusFlags &= 0x80` — elimina bits 0..6 y preserva bit 7. Tampoco limpia automáticamente los bytes de tiers.

## 188. Tien/Yajirobe/Hercule: Knock Down real

```text
Tien:    CA7F = 20
Yajirobe: CA7F = 10
Hercule:  CA7F = 5
```

Después: `target.position &= $02` → AIR→GROUND, FRONT/BACK preserved.

```ts
target.vertical = "GROUND"; // sin modificar horizontal
```

## 189. Dabura

Uso normal: `CA7F = $FF` si no se obtuvo resolución evitada. Sentinel especial `FOSSILIZE_SENTINEL = 0xFF` — no documentar como "255 damage"; downstream se trata como efecto especial.

## 190. Gamebomb y Special Candy

```text
Gamebomb:     CA7F = card.power = 25
Special Candy: CA7F = card.power = 30
```

Support directo, no aplican Knock Down.

## 191. Roshi's Book depende del contador 0–99

```text
effect = (roll100 & 0x1E) + 5
```

Valores posibles: 5, 7, 9, ..., 35. Depende del mismo contador temporal que participa en otras resoluciones. No necesita RNG nuevo.

## 192. Quick Stop Device: condición interna exacta parcial

Uso normal consulta form ID objetivo y exige `$22 <= formId < $27` (Androides 16–20). Después comprueba posición. Si falla: `CA53 = 1`. Si pasa: `CA53 = 0` y en configuración espacial concreta: `CA7F >>= 1`.

En defensa: `CA53 = 1` directamente (no aplica efecto normal).

## 193. Ki Absorber sigue siendo especial

Card 102, handler `$0F`, única Support con ese handler. Bajo `CA82=1` puede forzar `CA7F=0`, pero su efecto principal vive fuera de la rutina Support genérica. Permanece `🟡 UNIQUE_HANDLER_PENDING`.

## 194. Grupo `CA82=1`: contexto defensivo

Las cartas 85/86/90/94/102/110/112/116 entran en `CA82 = 1` **cuando se procesan como Support defensivo**. No es una propiedad general — en uso normal ejecutan sus efectos propios.

Esto encaja con que varias se documentaban como "Protect in Guard".

## 195. Qué hace `SPECIAL_SUPPORT_RESOLUTION`

```text
Damage: card.power >>= 1
Beam:   card.power >>= 1
Stage:  CA7F puede forzarse a 0 + powered reposition bloqueado
```

Modelable como `resolutionMode: "SPECIAL_SUPPORT_DEFENSE"` — nunca como variante de GUARD.

## 196. Support: taxonomía visual derivada de la tabla de cartas

**Healing**: handler `$00`, AN=`$FF`, FX=`$08`, PAL=`$30`
**Buff propio**: handler `$02`, AN=`$FF`, FX=`$02`, paleta distingue carácter (`$31` Strength/equipment, `$32` Defense, `$33` Speed/power-like, `$35` transformación/power, `$30` genérico)
**Debuff/control**: handler `$0D`, FX=`$01`, casi siempre AN=`$FF` excepto Kiai AN=`$40`, Paralysis AN=`$29`
**Direct Support**: handler `$0B`, FX=`$04` (Tien/Yajirobe/Hercule/Dabura/Gamebomb/Special Candy/Roshi)
**Especial**: Ki Absorber handler `$0F`

## 197. Defense: las 11 cartas con recursos exactos

| ID | Carta | AN | FX | PAL | `CA83` |
|---:|---|---:|---:|---:|---:|
| 19 | Taiyoken | `$26` | `$02` | `FF` | `$01`/`$81` |
| 26 | Instant Transmission | `$28` | `$04` | `FF` | `$02` |
| 45 | Barrier | `$24` | `$04` | `$30` | `$04` |
| 52 | Time Freeze | `$2A` | `$01` | `FF` | `$40` |
| 53 | Breath | `$27` | `$04` | `FF` | `$04` |
| 76 | Absorb Energy | `$25` | `$04` | `FF` | `$08` |
| 121 | Endurance | `FF` | `$06` | `$30` | `$10` |
| 122 | Telepathy | `FF` | `$01` | `$30` | `$40` |
| 123 | Foresight | `FF` | `$01` | `$30` | `$40` |
| 124 | Shockwave | `FF` | `$02` | `$30` | `$01` |
| 125 | Avoiding | `FF` | `$04` | `FF` | `$02` |

Las primeras Defense especiales tienen animaciones propias; las últimas dependen del FX genérico.

## 198. Taiyoken + Sunglasses: interacción exacta

Taiyoken consulta `statusFlags & $08`. Sin Sunglasses: `CA83 = $01`. Con Sunglasses: `CA83 = $81`. Bit 7 = marca de counter de Taiyoken. No modelar como Defense distinta.

## 199. Instant Transmission / Avoiding

Ambas: `CA83 = $02` → `CA53 = 1`, `CA7F = 0`. Familia `ZERO_AVOID`.

## 200. Barrier / Breath

Ambas: `CA83 = $04` → `CA53 = 3`, `CA7F = 0`. Familia `SPECIAL_NULLIFY`. Cinematográficamente no comparten la misma reacción que Instant Transmission.

## 201. Absorb Energy

`CA83 = $08`. Frente a Beam: `CA53 = 4`, `CA7F = incomingCard.power` → `heal(defender, incomingBeam.power)` con clamp a MaxLife. `ENERGY_ABSORB` queda completamente separado de `ZERO_AVOID`.

## 202. Endurance

`CA83 = $10` → `CA53 = 2`, `CA7F = incomingCard.ccCost`. Familia `PARTIAL`: `damage = CC cost`. No es `damage / 2`.

## 203. Time Freeze / Telepathy / Foresight

Las tres: `CA83 = $40`. En Command/Stage: `clear CA6A..CA73` (success flags = 0). Anulan el progreso Command/Stage mediante el propio array de resultados del QTE. Mucho más fiel que implementar `stageDamage = 0` al final.

## 204. Shockwave

`CA83 = $01`. Comparte bitfield con Taiyoken, pero no el flag `$80` de Sunglasses. El mismo resultado lógico puede proceder de cartas visualmente distintas → separar `rule effect` de `cinematic profile`.

## 205. TACTICAL/ACTION: modelo actualizado

Reemplazar `setScene("ACTION")` por:

```text
ACTION_PREPARE
├── assign actor/target slots
├── resolve fighter form
├── load actor action graphics → VRAM $8E00
├── create metasprite state
├── initialize actor macro $19
├── initialize target macro $1A
├── perform palette transition
└── enter action handler

ACTION_EXECUTE
└── card/action-specific timeline

ACTION_RETURN
├── presentation cleanup
├── palette restoration
├── destroy/hide ACTION actors
└── restore TACTICAL representation
```

El GBC construye la transición mediante carga gráfica, estados de presentación y transiciones de paleta discretas, no mediante una cámara moderna.

## 206. Cambios concretos recomendados al código

```ts
type RomSupportContext = "ATTACK" | "DEFENSE";

enum RomResolutionMode {
  NORMAL = 0,
  SPECIAL_SUPPORT = 1,
  BASIC_GUARD = 2,
  BASIC_MOVE = 3,
}
```

Para CHARA:

```ts
CHARACTER_EXIT_STARTED
CHARACTER_SWITCH_COMMITTED
CHARACTER_ENTRY_STARTED
CHARACTER_SWITCH_FINALIZED
```

Para presentación:

```ts
PALETTE_TRANSITION_STARTED
PALETTE_TRANSITION_COMPLETED
ACTION_ACTORS_PREPARED
ACTION_GRAPHICS_LOADED
```

No hacen que estos eventos alteren reglas por sí solos; son principalmente auditabilidad/presentación.

## 207. Tests ROM que ya merecen entrar

| Caso | Invariante |
|---|---|
| Macro27 | net -98, movimiento 28t, hold 15t |
| Macro28 | +106, hold5, -8, net +98 |
| CHARA | commit entre macro27 y macro28 |
| CHARA | movimiento total simétrico |
| $07F4 | no tratar como cámara |
| Resurrection ATTACK | MaxLife>>2 |
| Resurrection DEFENSE | MaxLife>>3 |
| Dende ATTACK | MaxLife/4+10 |
| Dende DEFENSE | MaxLife/4 |
| Medical ATTACK | Power+Speed/2 |
| Medical DEFENSE | Power+Speed/4 |
| Tien normal | fuerza GROUND |
| Tien defensa | CA82=1 |
| Roshi normal | (roll100&0x1E)+5 |
| Roshi defensa | CA82=1 |
| Taiyoken + Sunglasses | CA83=0x81 |
| Teleport/Avoiding | CA53=1, 0 efecto |
| Barrier/Breath | CA53=3, 0 efecto |
| Energy Absorb | CA53=4, heal=Beam Power |
| Endurance | CA53=2, damage=CC cost |
| TimeFreeze/Telepathy/Foresight | limpia success flags Stage |

## SUPERSEDES del lote 6

```text
"resource $19/$27/$28" → SUPERSEDED por §174
"presentation macro $19/$27/$28" → ROM_CONFIRMED

"$07F4/$080C = generic scene transition" → SUPERSEDED por §179
"$07F4/$080C = CGB palette interpolation" → ROM_CONFIRMED

CA82=1 como propiedad general de 8 Support → SUPERSEDED por §194
CA82=1 = modo defensivo de esas cartas → ROM_CONFIRMED
```

Afinar §140–142 del lote 5: CA82=1 no es propiedad general de esas 8 Support, sino su modo al utilizarse en Defense Phase.

## Estado después del lote 6

| Bloque | Estado |
|---|---:|
| Macro `$19` | ✅ |
| Macro `$1A` | ✅ |
| Macro `$27` | ✅ exacto |
| Macro `$28` | ✅ exacto |
| CHARA exit/entry displacement | ✅ |
| CHARA fixed macro timing | ✅ |
| Palette transition engine | ✅ |
| ACTION actor setup | ✅ |
| ACTION graphics loading | ✅ |
| Exact ACTION tilemap | 🟡 |
| 48 Support logical dispatch | ✅ |
| ATTACK vs DEFENSE Support split | ✅ |
| 11 Defense CA83 mapping | ✅ |
| Defense result semantics | ✅ |
| Quick Stop full downstream | 🟡 |
| Ki Absorber unique handler | 🟡 |
| Dabura `$FF` downstream | 🟡 |
| Exact Support/Defense cinematographic macros | 🟡 |

---

# PARTE 6 — LOTE 7 (2026-08-22): STANDARD_ATTACK, Damage/Beam, lanzamiento, impacto, ActionObjects

> Gramática cinematográfica común de Damage/Beam con la VM ROM por debajo.
> **Cuatro SUPERSEDES expresos** (§241–244). Retira las timelines INFERRED
> genéricas (`gather_power@12 → beam_charge@40 → beam_fire@54 → …`).

---

## 208. Damage y Beam comparten STANDARD_ATTACK (SUPERSEDES #1)

La ROM NO tiene DamageEngine y BeamEngine independientes carta por carta.
Existe un esqueleto común + dispatcher por subtipo:

```text
CARD → STANDARD_ATTACK → $CA7E = subtype → Bank00:$39F4 → Bank03 worker
→ recursos de carta → macros de presentación → resultado
```

| Subtype | Worker Bank03 |
|---:|---:|
| `$02` | `$5776` |
| `$03` | `$5A6B` |
| `$04` | `$5AC7` |
| `$05` | `$5B38` |
| `$06` | `$5B9E` |
| `$07` | `$5DFE` |
| `$08` | `$5E67` |
| `$0A` | `$5FE3` |
| `$0B` | `$61C5` |
| `$0C` | `$62D4` |
| `$0D` | `$5C04` |
| `$0E` | `$5D0C` |

Damage `$0A` y Beam `$02–$07` = variaciones de una gramática ROM.

```ts
RomActionProfile { handler · animationResource · effectResource · palette · audioScript · resultRules }
// NO: if (cardId === KAMEHAMEHA) ... if (cardId === MASENKO) ...
```

## 209. La Presentation VM de la ROM es nuestro Timeline real

Intérprete `Bank7E:$70AB`, entradas de 5 bytes. Opcodes identificados
(repetidos aquí como capa ROM literal):

| Opcode | Semántica |
|---:|---|
| `$01` | iniciar/configurar animación |
| `$04` | cambiar estado animado |
| `$05` | esperar fin/marcador |
| `$06` | esperar frame/índice concreto |
| `$07` | esperar N ticks |
| `$08` | reset animador |
| `$0A` | coordenadas absolutas |
| `$0B` | movimiento horizontal durante N ticks |
| `$0C` | cargar/activar FX |
| `$0D` | configurar escena/pantalla |
| `$0E` | desplazamiento progresivo de pantalla |
| `$0F` | restaurar pantalla |
| `$10` | aplicar ΔX/ΔY del frame |
| `$11` | ejecutar path de pantalla |
| `$12` | FX auxiliar |
| `$13` | SFX |
| `$14` | script de audio/triggers |

Macros en `Bank30:$5D00` (contador + comandos 5B). Capas:

```text
ROM_SEQUENCE (opcodes) → SEMANTIC_SEQUENCE (move/wait/FX/impact) → PresentationCue[]
```

No perder el nivel literal.

## 210. Dos ActionObjects estables, no actores recreados

Los workers operan sobre slots `0`/`1`; el cleanup detiene ambos.

```text
ActionObject[0] · ActionObject[1]
roles: ACTOR · TARGET (según atacante actual)
```

NO crear/destruir sprites por ataque. Mantener el contrato P0 (dos FighterActor).

⚠️ Posiciones: NO inventar coordenadas absolutas aún. Solo está
ROM_CONFIRMED la **geometría relativa** (§211-212, screen shifts).

## 211. Rush físico exacto — macro $1C

```text
$0B: +4 px × 24 ticks · $0B: +2 px × 1 tick
Total: +98 px · 25 ticks ≈ 0.419 s · mirroring por lado
```

```ts
interface RomDiscreteMotion {
  segments: { dxPerTick: number; dyPerTick: number; ticks: number }[];
  mirrorBySide: boolean;
}
```

NO lerp ni easing.

## 212. Preparación Beam exacta — macro $1E

```text
-1 px × 2t · -2 px × 10t · -1 px × 5t
Total: -27 px · 17 ticks ≈ 0.285 s · mirroring
```

El inicio Beam no empieza estático en ACTOR_HOME: hay reajuste/encuadre
físico previo codificado.

## 213. Damage $0A — máquina de estados real (Bank03:$5FE3)

Estados: `01–06 · 1E/1F · 28/29 · 32/33 · 3C/3D`.

```text
PREPARE → WAIT 20 → macro $1C (+98px/25t) → scene transition
→ defensive preprocessing → start actor attack animation → WAIT frame 2
→ card audio/script → start AnimationResource → WAIT technique animation
→ macro $2E → WAIT attacker → branch CA53

CA53=0 → macro $2F NORMAL HIT
CA53=1 → macro $31 SPECIAL DEFENSE
CA53=2 → macro $30 NORMAL MISS
```

## 214. Damage comparte handler, no animación

```text
Generic Damage State Machine + AnimationResource de carta/personaje
+ audio script de carta + resolution macro
```

Cont.Punch / Atomic Break / Crazy Rush / Cell Combo / 18's Attack comparten
handler `$0A` con secuencias distintas. Las poses `punch_right/kick_right`
quedan como **fallback runtime**, no canon primario.

## 215. HIT físico — macro $2F (13 comandos, dos WAIT 30)

```text
start actor attack → WAIT frame 2 → target reaction → SFX $16
→ WAIT actor completion → apply actor frame ΔX/ΔY → actor reset
→ WAIT 30 → target second reaction $19 → WAIT target completion
→ target reset → WAIT 30
```

Dos holds de 30t (≈0.502s c/u) **programados** — no es lag ni interpolación.

## 216. MISS físico — macro $30

```text
start attack → WAIT frame 2 → target variant $13 → SFX $31
→ WAIT attacker → apply ΔX/ΔY → reset attacker → WAIT target → WAIT 30
```

Prohibido `if (!hit) { skipDamage(); }` con la misma presentación.

## 217. Defensa física especial — macro $31

```text
target reaction variant $14 · SFX $39
```

Tres familias visuales físicas:

```text
PHYSICAL_HIT · PHYSICAL_MISS · PHYSICAL_SPECIAL_DEFENSE
```

Presentation recibe el resultado semántico del Engine; no decide impacto.

## 218. Beam $02–$07: un motor con LaunchProfiles (SUPERSEDES #2)

`$03–$07` hacen `if state != $14: jump Handler02` — comparten la máquina
Beam y reemplazan el tramo de lanzamiento.

```ts
BeamActionHandler + BeamLaunchProfile
// NO: RayEngine/BallEngine/DiscEngine/WaveEngine independientes
```

`ray/ball/disk` pueden seguir existiendo como semántica visual; por debajo
manda el handler ROM.

## 219. Handler $02 — Beam estándar

```text
start AnimationResource → WAIT actor frame 4 → configure scene
→ load FX → WAIT 60
```

Kamehameha, Masenko, Galick Gun, Final Flash, Special Beam Cannon, Finger
Beam, Eye Beam. `releaseSyncFrame: 4`, no `releaseAfterMs: 300`.

## 220. Handler $03 — release en frame 5

Telekinesis, Eraser Cannon, Body Change. `releaseFrame` = propiedad del
LaunchProfile.

## 221. Handler $04 — Burning Attack espera frame 17

No resolver como `beam_charge → beam_fire` genérico: su preparación
específica es parte de la cinematografía.

## 222. Handler $05 — proyectil + desplazamiento de escena

```text
load FX → screen displacement -6 × 19t → restore → WAIT 60
```

Energy Bomb, Big Bang Attack, Final Attack, Ki Blast Bomb, Energy Slash.
La ROM mueve **la presentación de pantalla**, no solo un sprite.

## 223. Handler $06 — otra puesta en escena

```text
WAIT frame 7 → load FX → screen -6 × 16t → restore → WAIT 60
```

`$05 ≠ $06` aunque ambos parezcan bolas/proyectiles.

## 224. Handler $07 — path especial

```text
configure scene → card audio/script → start actor animation → WAIT frame 2
→ load FX → WAIT frame 4 → opcode $11 screen-motion path
→ restore scene → WAIT 60
```

Destructo Disk, S.Destructo Disk, Spirit Bomb, Galactica Donut, Crasher
Ball, Super Ki Ball, Energy Slice. ❌ OBSOLETA la equivalencia
`Spirit Bomb ≈ Energy Bomb grande`.

## 225. Purple Comet — MULTI_ACTOR_SCRIPT real

Handlers `$0D`/`$0E` coordinan **dos animadores simultáneos**:

```ts
type ActionParticipantRole = 'ACTOR_PRIMARY' | 'ACTOR_SUPPORT' | 'TARGET';
```

Sin tercer FighterActor permanente: el secundario es cameo temporal con
ownership explícito y cleanup obligatorio.

## 226. CA54 — Power ≥ 30 cambia la cinematografía (SUPERSEDES #4)

```asm
if card.power >= 30: CA54 = 1 · else: CA54 = 0
```

```text
Hit:  low → $2B · high → $2C
Miss: low → $32 · high → $33
```

Power no es solo daño: determina una clase visual de impacto.

## 227–230. Kamehameha — perfil ROM real

### Card #12

```text
Type Beam · Power 20 · Accuracy 100 · CC 16
Handler $02 · ActorAnim $03 · FX $05 · Palette $2C · CA54 0
```

```text
BEAM START → macro $1E (-27px/17t) → ACTION scene transition
→ AnimationResource $03 → WAIT actor frame 4 → configure scene
→ load FX $05 → WAIT 60t (≈1.005s) → resolution branch
```

### HIT normal (Power 20 → CA54=0 → macro $2B)

```text
configure target scene → load effect $0A → screen displacement -6 × 16t
→ restore → aux impact → target reaction variant $17 → WAIT target
→ apply target frame ΔX/ΔY → restore target
```

### Super Kamehameha (Power 30 → CA54=1 → macro $2C)

```text
target reaction variant $18  (mismo ActorAnim $03)
```

En #dev/cards: `impactClass = NORMAL_POWER` vs `HIGH_POWER`.

### MISS — dos clases también

```text
CA53=2: low → $32 → variant $15 · high → $33 → variant $16
```

## 231. “Projectile” no siempre es entidad física autónoma

La ROM combina FX resource, screen shift, scene config, screen-motion path
y frame offsets. PROYECTIL en el remake debe distinguir:

```text
ENTITY_PROJECTILE · SCREEN_FX · SCREEN_PATH_FX · BEAM_RAY · ATTACHED_FX
```

No forzar cada Beam a un Sprite con x/y interpolados.

## 232. Screen displacement ≠ fighter movement

`-6 × N ticks` ($05/$06/impacto) = movimiento de PANTALLA/escena. Separar:

```ts
FIGHTER_MOTION · SCREEN_MOTION · FRAME_DELTA_APPLICATION
```

Opcode `$10` aplica ΔX/ΔY del frame al ActionObject; no es posición táctica.

## 233. Estado exacto de los anchors

```text
ROM_CONFIRMED:
✓ dos slots/ActionObjects · rush +98px/25t · Beam pre-shift -27px/17t
✓ screen shifts -6×16 / -6×19 · opcode posición absoluta existe
✓ frame ΔX/ΔY existe · mirroring según lado

PENDING (no inventar):
✗ coordenadas absolutas ACTOR_HOME · TARGET_HOME · CONTACT_POINT universal
```

## 234. Cambio de plano

Las macros ofensivas contienen `$0D/$0E/$0F/$11`. El SceneDirector debe
consumir comandos explícitos; NO `card.type === beam → ACTION` implícito.

## 235. RomStandardAttackProfile

```ts
interface RomStandardAttackProfile {
  cardId: number;
  handler: number;
  actorAnimationResource: number | null;
  effectResource: number | null;
  paletteId: number | null;
  audioScriptId: number | null;
  launch?: {
    syncFrame: number | null;
    screenMotion?: RomScreenMotion;
    pathId?: number;
  };
  resolution: {
    normalHitMacro: number | null;
    normalMissMacro: number | null;
    specialDefenseMacro: number | null;
    highPowerHitMacro?: number | null;
    highPowerMissMacro?: number | null;
  };
}
```

Reside junto a los descriptores ROM del Lote 6 (no en cards.tsx/Pixi/CSS).

## 236. Nuevos cues de Timeline

```text
ANIMATION_START · ANIMATION_STATE · WAIT_ANIMATION · WAIT_ANIMATION_FRAME
ACTION_OBJECT_POSITION · ACTION_OBJECT_MOTION · APPLY_FRAME_DELTA
FX_LOAD · FX_AUX
SCENE_CONFIGURE · SCREEN_MOTION · SCREEN_RESTORE · SCREEN_PATH
ROM_SFX · ROM_AUDIO_SCRIPT · ROM_MACRO
```

Los waits se convierten en ticks de Presentation — nunca timers de pared.

## 237. Resultado lógico y macro visual separados

```text
Engine → RomDefenseResult/attack outcome → BattleEvent → Presentation → macro
```

Presentation no relee CA53 para decidir gameplay (frontera del Lote 6).

## 238. Perfiles INFERRED pasan a fallback

```text
ROM handler available → ROM profile wins
ROM handler unknown  → perfil INFERRED queda como fallback
```

Nunca al revés.

## 239. Dev Studio

`#dev/cards`: ROM Handler · AnimationResource · FX · Palette · Audio Script ·
Release Sync Frame · High Power sí/no · Hit/Miss/Special Defense Macro ·
Fidelity. `#dev/timeline`: toggle SEMANTIC / ROM TRACE (p. ej. Kamehameha:
`$1E $01 $06 frame4 $0D $0C FX05 $07 60 $2B`).

## 240. Tests mínimos

```text
STANDARD ATTACK: dispatcher $02/$03/$04/$05/$06/$07/$0A/$0D/$0E tipado ·
  card → handler data-driven · sin switches por nombre en Presenter
ACTION OBJECTS: exactamente dos ActionObjects · roles intercambiables ·
  sin respawn por lado · cleanup detiene ambos · motion no toca posición táctica
DAMAGE: $0A skeleton común · macro $1C = +98px/25t · CA53 0→$2F 1→$31 2→$30 ·
  $2F con dos WAIT 30 · HIT y MISS timelines distintas
BEAM: $1E = -27px/17t · $02 release 4 · $03 release 5 · $04 release 17 ·
  $05 screen -6×19 · $06 release 7 + -6×16 · $07 WAIT2→FX→WAIT4→SCREEN_PATH ·
  $03–$07 reutilizan Beam base
POWER CLASS: Power 29 → CA54=0 · 30 → 1 · low hit $2B · high hit $2C ·
  low miss $32 · high miss $33
KAMEHAMEHA: card 12 → $02 · anim $03 · FX $05 · pal $2C · release frame 4 ·
  WAIT 60 · hit low → $2B · reaction $17
PRESENTATION: fighter motion ≠ screen motion · waits en ticks · 0 setTimeout ·
  0 gameplay mutation · postActionMaintenance exactamente una vez al COMPLETE
```

## 241–244. SUPERSEDES del Lote 7 (expresos)

```text
SUPERSEDES #1 — Damage y Beam NO son timelines handcrafted por carta
→ STANDARD_ATTACK + ROM handler + AnimationResource + FX + macros

SUPERSEDES #2 — Beam genérico INFERRED (gather_power@12 … return@152)
→ perfil INFERRED antiguo; con descriptor ROM gana handler+macros

SUPERSEDES #3 — Beam/proyectiles no implican siempre entidad Pixi viajando
→ FX / screen motion / screen path / entity projectile según handler

SUPERSEDES #4 — card.power no afecta solo al daño
→ Power >= 30 → CA54 → clase de impacto fuerte → macros/reacciones distintas
```

## Pendientes NO cerrados artificialmente

```text
✗ coordenadas absolutas iniciales de ActionObject 0/1
✗ nombre humano definitivo de reaction variants $13–$19
✗ nombres humanos de scripts/SFX (solo IDs; no bautizar sin correlacionar)
```

Pipeline final del lote:

```text
CARD → ROM ACTION PROFILE → STANDARD_ATTACK HANDLER
→ PRESENTATION MACROS/OPCODES → 2 ACTION OBJECTS + FX + SCREEN
→ HIT / MISS / SPECIAL RESULT → CLEANUP
```

> Siguiente bloque: **Lote 8** — handlers especiales `$08/$0B/$0C/$0D/$0E`,
> multi-actor y coordenadas absolutas/initialization records de ActionObject
> 0/1. Ahí se cierran los anchors ACTION sin inventarlos.

---

# PARTE 7 — LOTE 8 (2026-08-22): ActionObject core, timing por frame, handlers especiales

> Cierra lo DEMOSTRADO de los ActionObjects y deja preparado el sistema para
> trazar lo pendiente sin contaminar el canon. **Cuatro SUPERSEDES** (§275-276).
> Corrección honesta respecto al cierre de L7: los anchors absolutos y las
> máquinas internas de `$08/$0B/$0C/$0D/$0E` NO son afirmables con la
> evidencia actual — necesitan traza de los 19 bytes de ambos ActionObjects.

---

## 245. Los ActionObjects son registros ROM reales de 19 bytes

```text
ActionObject table base = $C3A0 · stride = $13 = 19 bytes
ActionObject[0] = $C3A0 .. $C3B2
ActionObject[1] = $C3B3 .. $C3C5
active/index state = $C3C6
```

Ambos se actualizan cada frame: `update animation → compute position → draw`.
La prioridad de dibujo puede cambiar mediante la rama `$CA39 == 2`.

```ts
interface RomActionObjectState {
  slot: 0 | 1;
  active: boolean;
  animationSetId: number | null;
  clipId: number | null;
  frameIndex: number;
  frameElapsedTicks: number;
  x: number;
  y: number;
  flipX: boolean;
  flipY: boolean;
  renderPriority: number;
  raw?: readonly number[];  // útil mientras los 19 bytes no estén decodificados
}
```

## 246. SUPERSEDES 1 — slot ≠ ACTOR/TARGET permanente

L7 trató `slot 0 → ACTOR · slot 1 → TARGET` como conveniencia. No es
identidad física permanente:

1. solo existen **dos objetos grandes**;
2. Purple Comet coordina **dos animadores simultáneos**;
3. en multi-actor los dos slots pueden representar a los dos participantes
   ofensivos, no necesariamente actor+target.

```text
ActionObject slot ≠ fighter identity ≠ combat role permanente
```

```ts
interface ActionObjectBinding {
  slot: 0 | 1;
  role: 'ACTOR' | 'TARGET' | 'ACTOR_PRIMARY' | 'ACTOR_SUPPORT' | 'FX_PARTICIPANT';
  fighterSide?: 'PLAYER' | 'ENEMY';
  characterId?: string;
  formId?: string;
}
```

## 247. Esto corrige el modelo MULTI_ACTOR_SCRIPT

NO implementar Purple Comet con un tercer FighterActor permanente:

```text
2 FighterActor lógicos persistentes del combate
+
2 ActionObject slots de presentación
+
binding temporal de los slots

Ej. Purple Comet: ActionObject[0] → ACTOR_PRIMARY · ActionObject[1] → ACTOR_SUPPORT
```

No forzar tres grandes sprites simultáneos si la ROM no lo demuestra.

## 248. Inicialización ACTION con rutinas dedicadas

```text
$35CA → inicializa los dos objetos grandes + prepara recursos compartidos
$366D → resuelve recursos del participante/forma
$369F → entra en Bank $30 → tabla de paleta por personaje/forma

ACTION PARTICIPANT → character/form → animation resources → palette → ActionObject init
```

NO: `characterId → buscar PNG idle → ponerlo en x/y`.

## 249. FighterActionResources explícito

```ts
interface FighterActionResources {
  characterId: string;
  formId: string;
  animationSetId: number | string;
  paletteId: number | string;
  sourceEvidence: 'ROM_STATIC_VERIFIED' | 'ROM_DYNAMIC_VERIFIED' | 'PROJECT_MAPPING';
}
```

NO incluir `actionAnchor` como confirmado (sigue PENDING).

## 250. SUPERSEDES 2 — el motor NO funciona con FPS uniforme

Las rutinas ~`$0A01/$096A/$0B16` reconstruyen entradas de animación de
**4 bytes por frame**:

```text
byte 0 = visualFrameId / metasprite
byte 1 = durationTicks
byte 2 = offsetX
byte 3 = offsetY
```

`pose = 8 FPS` no es fiel: la ROM hace `frame 0 → N0 ticks · frame 1 → N1 …`.

## 251. RomAnimationFrame y el bridge V9

```ts
interface RomAnimationFrame {
  visualFrameId: number;
  durationTicks: number;
  offsetX: number;
  offsetY: number;
}

interface RuntimePoseFrame {
  asset: string;
  durationTicks?: number;
  rom?: {
    visualFrameId?: number;
    offsetX?: number;
    offsetY?: number;
    evidence: 'ROM_STATIC_VERIFIED' | 'FRAME_VERIFIED' | 'INFERRED';
  };
}
```

## 252. fps pasa a compatibilidad legacy

```ts
interface PoseAnim {
  loop: boolean;
  frames: RuntimePoseFrame[];
  fps?: number; // preview/fallback only
}
```

Fuente temporal (por orden):

```text
1. durationTicks ROM · 2. durationTicks profile verified
3. runtime fallback · 4. legacy FPS
```

Nunca `fps → convertir automáticamente toda secuencia en canon GBC`.

## 253. Los offsets del frame son cinematografía real

`offsetX/offsetY` NO son padding del PNG: son información temporal de la
animación, invertibles según flags de flip.

```text
final visual position = object base position + current frame offset
```

Cinco conceptos separados:

```text
BASE_OBJECT_POSITION · FRAME_OFFSET · OBJECT_MOTION · SCREEN_MOTION · TACTICAL_POSITION
```

## 254. APPLY_FRAME_DELTA (L7) plenamente justificado

```ts
{ type: 'APPLY_FRAME_DELTA', slot: 0, dx: frame.offsetX, dy: frame.offsetY }
// sin modificar BattleState.position
```

## 255. STOP/HOLD/LOOP pertenecen al animador

Flags de animación + comando `$08` (stop/reset) en la VM: una animación
puede terminar/loop/mantener último frame/quedar detenida **sin que Pixi
invente `if (animationName === ...)`**. El estado del Animator se deriva de
datos.

---

## 256. Taxonomía ROM de los cinco handlers pendientes

```text
ROM_ACTION_HANDLER
├─ $02 BEAM_BASE · $03 BEAM_RELEASE_FRAME_5 · $04 BURNING_ATTACK_RELEASE
├─ $05 PROJECTILE_SCROLL · $06 PROJECTILE_ALT_SCROLL · $07 SPECIAL_PROJECTILE_PATH
├─ $08 SPECIAL · $0A DAMAGE_BASE · $0B TAIL · $0C BUU_BALL
└─ $0D PURPLE_COMET · $0E PURPLE_COMET_Z
```

⚠️ Es clasificación del handler, NO autorización para inventar subestados internos.

## 257. Handler $08 — SPECIAL

```text
subtype $08 → Bank03:$5E67 · una carta en el corpus con byte5 $08
{ handler: 0x08, family: 'SPECIAL', fidelity: 'ROM_HANDLER_VERIFIED', sequence: null }
```

NO copiarle automáticamente `$02`, `$05` ni `$07`.

## 258. Handler $0B — TAIL

```text
subtype $0B → Bank03:$61C5 · family: 'TAIL'
release frame / movimiento / macros / target reaction / holds = PENDING_ROM_TRACE
```

## 259. Handler $0C — BUU_BALL

```text
subtype $0C → Bank03:$62D4 · family: 'BUU_BALL'
```

Importante: **Buu Ball no debe caer en DAMAGE_BASE** aunque parezca ataque
físico — familia propia.

## 260. Handler $0D — PURPLE_COMET

```text
$0D → Bank03:$5C04 → PURPLE_COMET
{ handler: 0x0d, family: 'MULTI_ACTOR_SCRIPT', variant: 'PURPLE_COMET', simultaneousActionObjects: 2 }
```

Interviene en más estados que un simple override de release; coordina dos
animadores simultáneamente.

## 261. Handler $0E — PURPLE_COMET_Z

```text
$0E → Bank03:$5D0C → PURPLE_COMET_Z
```

Misma categoría estructural MULTI_ACTOR_SCRIPT pero **no asumir que es
idéntico a $0D con más daño**: handlers diferentes, cartas distintas.

## 262. SUPERSEDES 3 — multi-actor no es una variante de Beam

```text
NO: Beam base → spawn secondary fighter → fire
SÍ: MULTI_ACTOR_SCRIPT → binding temporal ActionObject[0/1] → dos animadores
    → sincronización propia → cleanup
```

Purple Comet no es un BeamLaunchProfile: es otro tipo de script.

## 263. El target no tiene derecho permanente sobre slot 1

```text
❌ invariante vieja: slot0=actor · slot1=target
✅ invariante: máx dos ActionObjects grandes activos
   + cada slot tiene exactamente un binding mientras está activo
```

No: `slot 1 siempre enemy`.

## 264. Draw priority en el modelo

```ts
type ActionDrawOrder = 'SLOT_0_THEN_1' | 'SLOT_1_THEN_0';
// cue nuevo: ACTION_OBJECT_DRAW_ORDER
```

No resolver z-order como `player siempre delante` ni `actor siempre delante`.

## 265. SET_OBJECT_POSITION sigue PARTIAL

Opcode `$0A` manipula el par de coordenadas del objeto; semántica exacta del
campo PARTIAL hasta terminar decodificación:

```ts
interface RomSetObjectPosition {
  slot: 0 | 1;
  x: number;
  y: number;
  semantics: 'ABSOLUTE_OR_BASE_POSITION_UNRESOLVED';
}
```

No etiquetar prematuramente `ACTOR_HOME`.

## 266. Los anchors universales continúan PENDING

```text
PENDING_ROM_TRACE: ACTOR_HOME X/Y · TARGET_HOME X/Y · CONTACT_POINT X/Y
```

Lo que sí sabemos: base position · frame offset · opcode $0B motion · $10
frame delta · screen independiente. Por eso medir el sprite en pantalla no
basta para deducir la base.

## 267. Cómo cerrar correctamente los anchors — contrato de traza

Por cada frame de la acción:

```text
dump $C3A0..$C3B2 (object0) + $C3B3..$C3C5 (object1)
+ $C3C6 · $C3C7 · $CA39 · SCX / SCY
```

```lua
local function dumpObject(base)
  local b = {}
  for i = 0, 0x12 do
    b[#b + 1] = string.format("%02X", emu:read8(base + i))
  end
  return table.concat(b, "")
end
-- object0 = dumpObject(0xC3A0) · object1 = dumpObject(0xC3B3)
```

## 268. No necesitamos capturar 125 cartas — cubrir subtipos

```text
Damage: 05 06 0A 0B 0C · Beam: 02 03 04 05 07 08 · scripted/type4: 00 02 0B 0D 0F
L7 ya cubrió: 02 03 04 05 06 07 0A
L8/L9 persiguen: 08 0B 0C 0D 0E
```

## 269. Nuevo descriptor de handler

```ts
interface RomActionHandlerDescriptor {
  subtype: number;
  worker: { bank: number; address: number };
  family: 'BEAM' | 'DAMAGE' | 'SPECIAL' | 'TAIL' | 'BUU_BALL' | 'MULTI_ACTOR_SCRIPT';
  variant?: string;
  evidence: 'ROM_HANDLER_VERIFIED' | 'ROM_SEQUENCE_VERIFIED' | 'PENDING_ROM_TRACE';
}

0x08 → { bank: 3, address: 0x5e67, family: 'SPECIAL' }
0x0b → { bank: 3, address: 0x61c5, family: 'TAIL' }
0x0c → { bank: 3, address: 0x62d4, family: 'BUU_BALL' }
0x0d → { bank: 3, address: 0x5c04, family: 'MULTI_ACTOR_SCRIPT', variant: 'PURPLE_COMET' }
0x0e → { bank: 3, address: 0x5d0c, family: 'MULTI_ACTOR_SCRIPT', variant: 'PURPLE_COMET_Z' }
```

## 270. No reutilizar RomStandardAttackProfile a la fuerza

```ts
type RomActionProfile = RomStandardAttackProfile | RomSpecialAttackProfile | RomMultiActorProfile;
```

No llenar `releaseSyncFrame/projectile/highPower macro` con null para fingir
que Purple Comet es un Beam estándar.

## 271. MultiActor profile

```ts
interface RomMultiActorProfile {
  handler: 0x0d | 0x0e;
  variant: 'PURPLE_COMET' | 'PURPLE_COMET_Z';
  maxSimultaneousActionObjects: 2;
  bindings: 'DYNAMIC';
  sequenceEvidence: 'ROM_HANDLER_VERIFIED' | 'ROM_SEQUENCE_VERIFIED' | 'PENDING_ROM_TRACE';
}
```

## 272. Nuevos cues

```text
ACTION_OBJECT_BIND · ACTION_OBJECT_UNBIND · ACTION_OBJECT_DRAW_ORDER
ACTION_OBJECT_FRAME · ACTION_OBJECT_FRAME_OFFSET · ACTION_OBJECT_STOP
MULTI_ACTOR_SYNC
```

(Los demás comandos VM ya entraron en L7.)

## 273. Dev Studio

Cards (`$08/$0B/$0C/$0D/$0E`): ROM HANDLER · WORKER (Bank03:addr) · FAMILY ·
VARIANT · SEQUENCE (PENDING_ROM_TRACE) — **no mostrar timeline inventada**.
Timeline: panel ACTION OBJECTS (tick/slot/binding/clip/frame/x/y/offsetX/Y +
draw order). Animation: separar legacy FPS preview de ROM per-frame
durationTicks.

## 274. Tests L8

```text
ACTION OBJECT MEMORY CONTRACT: base $C3A0 · stride $13 · slot1 $C3B3 ·
  dos slots · 19 bytes por slot · slot identity ≠ rol permanente ·
  binding cambiable · PRIMARY+SUPPORT · target no posee slot1 siempre
DRAW ORDER: orden CA39 representable (0→1 y 1→0) · z-order no muta gameplay
ANIMATION FRAME MODEL: cada frame con su durationTicks · durationTicks
  overridea fps · offsetX/Y signed · espejan con facing · frame offset ≠
  object motion ≠ tactical position
HANDLERS: $08→$5E67 SPECIAL · $0B→$61C5 TAIL · $0C→$62D4 BUU_BALL ·
  $0D→$5C04 MULTI_ACTOR/PURPLE_COMET · $0E→$5D0C MULTI_ACTOR/PURPLE_COMET_Z ·
  $0D y $0E distintos · ni caen en BEAM_BASE · sin releaseSyncFrame
  fabricado · sin anchor absoluto fabricado
MULTI ACTOR: máx 2 primarios · sin tercer FighterActor · bindings limpios
  tras COMPLETE · sin participante huérfano
ARCHITECTURE: ActionObject ops no mutan BattleState.position · frame
  duration no avanza el tick lógico incorrectamente · Timeline completion no
  dispara gameplay · postActionMaintenance sigue exactamente una vez
```

## 275–276. SUPERSEDES del Lote 8 (expresos)

```text
SUPERSEDES 1 — NO: ActionObject[0]=actor siempre · [1]=target siempre
SÍ: slots genéricos + bindings temporales según la secuencia

SUPERSEDES 2 — NO: pose = FPS uniforme
SÍ: cada frame ROM tiene durationTicks propio + offsetX + offsetY

SUPERSEDES 3 — NO: Purple Comet = Beam con cameo adicional
SÍ: $0D/$0E = MULTI_ACTOR_SCRIPT con dos animadores coordinados

SUPERSEDES 4 — NO: la existencia del opcode $0A demuestra ACTOR_HOME/TARGET_HOME
SÍ: $0A manipula posición/offset del ActionObject; los anchors siguen PENDING_ROM_TRACE
```

## Estado al cerrar el Lote 8

```text
ROM_CONFIRMED
✓ 2 ActionObjects · $C3A0/$C3B3/stride $13 · update/draw de ambos
✓ draw order variable · frame = visualId + duration + offsetX + offsetY
✓ recursos ACTION mediante inicialización dedicada
✓ $08/$0B/$0C/$0D/$0E tienen workers propios
✓ $0D/$0E coordinan dos animadores · Purple Comet ≠ P.Comet Z

PENDING_ROM_TRACE
✗ offsets exactos de los 19 bytes del record
✗ coordenadas base universales · ACTOR_HOME/TARGET_HOME · CONTACT_POINT
✗ state machine completa de $08/$0B/$0C/$0D/$0E
```

> Siguiente: **Lote 9** — traza dinámica de `$08/$0B/$0C/$0D/$0E` +
> decodificación byte-a-byte de `C3A0..C3C5` + anchors ACTION absolutos.

---

# PARTE 8 — LOTE 9 (2026-08-22): infraestructura de traza dinámica

> **Instrumentación, no hallazgos.** Con el corpus actual NO hay dumps
> dinámicos ejecutados: no se puede afirmar qué byte de los 19 es x/y/clip,
> ni cerrar las máquinas de $08/$0B/$0C/$0D/$0E. Este lote construye la
> infraestructura; los datos llegan con traces reales (Lote 10).
> **Tres SUPERSEDES** (§309). Regla de oro: el tracer no elimina INFERRED;
> los elimina individualmente cuando existen traces reales.

---

## 277. ROM_DYNAMIC_VERIFIED — evidencia distinta

```ts
type RomEvidence =
  | 'ROM_STATIC_VERIFIED'
  | 'ROM_HANDLER_VERIFIED'
  | 'ROM_DYNAMIC_VERIFIED'
  | 'PENDING_ROM_TRACE';

// leer código ROM → ROM_STATIC_VERIFIED
// observar memoria/estado durante ejecución → ROM_DYNAMIC_VERIFIED
```

No promocionar algo porque encaje con la interpretación estática.

## 278. La identidad de la ROM acompaña cada trace

El harness antiguo se construyó sobre una ROM modificada/reskin: sus
mecanismos estructurales pueden estudiarse, pero sus datos visuales/balance
no deben asumirse idénticos a la comercial. Sin SHA, ningún trace promueve
datos canónicos:

```ts
interface RomTraceSource {
  romSha256: string;
  romSize: number;
  romLabel: string;
  emulator: string;
  emulatorVersion: string;
  traceToolVersion: string;
}
```

## 279. Un trace es una ejecución reproducible

```ts
interface RomActionTrace { meta: RomTraceMeta; frames: RomTraceFrame[]; }

interface RomTraceMeta {
  source: RomTraceSource;
  cardId?: number;
  subtype?: number;
  workerBank?: number;
  workerAddress?: number;
  attackerSide: 'LEFT' | 'RIGHT';
  attackerForm?: string;
  defenderForm?: string;
  initialTacticalPosition?: { attacker: number; defender: number };
  expectedOutcome?: string;
  firstFrame: number;
  lastFrame: number;
}
```

## 280. Snapshot completo por tick

Registros a observar: `C0A0 · CA01-CA04 · CA06 · CA0A · CA55-CA5A · CA7E ·
CB77 · C3C6 · C3C7 · C3A0..C3C5 · C40E · C41B · SCX · SCY · LCDC · STAT`.

```ts
interface RomTraceFrame {
  frame: number;
  battle: {
    C0A0: number; CA01: number; CA02: number; CA03: number;
    CA04: number; CA06: number; CA7E: number; CB77: number;
  };
  actionObjects: [RomActionObjectRaw, RomActionObjectRaw];
  activeObject: number;
  drawState: number;
  display: { scx: number; scy: number; lcdc: number; stat: number };
}
```

## 281. Los 19 bytes se guardan crudos SIEMPRE

```ts
interface RomActionObjectRaw {
  bytes: readonly [19 × number];
}
```

No sustituir `bytes[7]` por `x` y perder el original. El decoder vive encima.

## 282. Decoder con evidencia por campo

```ts
interface DecodedActionObjectField {
  offset: number;
  semantic: 'ACTIVE' | 'ANIMATION_SET' | 'CLIP' | 'FRAME' | 'FRAME_ELAPSED'
    | 'BASE_X' | 'BASE_Y' | 'FLAGS' | 'UNKNOWN';
  confidence: 'CANDIDATE' | 'ROM_DYNAMIC_VERIFIED';
  evidenceTraceIds: string[];
}
```

`offset $07 candidate BASE_X` ≠ `offset $07 = x 100% confirmado`.

## 283. Método diferencial obligatorio

Cambiar **una sola variable cada vez** y comparar los 38 bytes:

```text
mismo ataque/personaje/resultado, cambiar LEFT↔RIGHT
→ orientation/coordinate candidate

mismo ataque/lado, cambiar AnimationResource
→ animation candidate

mismo ataque/clip, esperar frame siguiente
→ elapsed counter candidate

byte cambia solo al cambiar frame → frame index candidate
```

## 284. El frame record conocido sirve de referencia externa

El motor usa `visualFrameId/durationTicks/offsetX/offsetY` por entrada:
los traces correlacionan AnimationResource ↔ bytes del ActionObject
(frameIndex/frameElapsedTicks).

## 285. No confundir posición del objeto y posición final de pantalla

Por frame: `ActionObject base + frame offset + object motion + SCX/SCY`.
L9 prueba la relación; NO presupone `screenX = object.x`.

## 286. RomCoordinateModel

```ts
interface RomCoordinateModel {
  baseXOffset?: number;
  baseYOffset?: number;
  frameOffsetApplied: boolean | null;
  screenXDependency: 'NONE' | 'SCX' | 'UNKNOWN';
  screenYDependency: 'NONE' | 'SCY' | 'UNKNOWN';
  evidence: RomEvidence;
}
```

Hasta resolverlo, `UNKNOWN` es resultado válido.

## 287. Los anchors se derivan DESPUÉS del record

```text
1. decodificar ActionObject · 2. identificar BASE_X/BASE_Y
3. observar inicialización · 4. normalizar orientación
5. comparar acciones · 6. detectar posiciones repetidas
7. entonces definir anchors
```

NO: `captura parece x=34 → ACTOR_HOME=34`.

## 288. Qué hace falta para llamar algo ACTOR_HOME

Solo se promociona si: posición inicial estable · corresponde al **base
object position** (no frame offset) · se reproduce en más de una acción ·
se comprueba en ambos lados/orientaciones · no depende de SCX · no es
específico de un AnimationResource. Regla metodológica del remake:

```ts
interface RomActionAnchor {
  id: 'ACTOR_HOME' | 'TARGET_HOME' | 'CONTACT_POINT' | 'ACTOR_ENTRY' | 'TARGET_ENTRY';
  x: number; y: number;
  traces: string[];
  evidence: 'ROM_DYNAMIC_VERIFIED';
}
```

## 289. No tiene por qué existir un CONTACT_POINT universal

El rush $1C (+98px/25t) no demuestra que todas las acciones terminen en el
mismo punto. L9 debe permitir descubrir GLOBAL anchor, handler-specific
anchor, o animation-specific position — sin forzar el resultado deseado.

## 290–294. Capturas prioritarias y disciplina de cardId

```text
#29 Tail ($0B → $61C5): TAIL_LEFT_HIT / TAIL_RIGHT_HIT / LEFT_MISS / RIGHT_MISS
  → estudia orientation + motion + animation + reaction + cleanup a la vez
#57 Purple Comet ($0D → $5C04): dump object0/object1/C3C6/C3C7/CA39 por tick
  → ¿en qué tick se activan AMBOS objetos y qué binding representa cada uno?
#58 P.Comet Z ($0E → $5D0C): comparar contra #57 — estados/clips/tempos/
  bindings/macros que comparten y cambian; NO describir como "$0D + daño"
$08 ($5E67 SPECIAL): existe un único Beam de ese subtipo, pero NO inventar
  cardId — traceBySubtype(0x08) hasta derivarlo de la tabla ROM
$0C ($62D4 BUU_BALL): mismo criterio — sin cardId no demostrado
```

## 295–298. State machine, matriz de outcomes, binding timeline, draw order

```ts
interface RomStateTransition {
  tick: number; from: number; to: number;
  workerBank: number; workerAddress: number;
  object0Changed: boolean; object1Changed: boolean;
  displayChanged: boolean;
}
// state machine OBSERVADA (CA06), no reconstruida a mano
```

Un trace no basta: cada handler necesita matriz mínima (NORMAL HIT · NORMAL
MISS · +SPECIAL DEFENSE / HIGH POWER cuando aplique).

```ts
interface ActionObjectBindingTrace {
  tick: number; slot: 0 | 1;
  binding: 'PRIMARY' | 'SUPPORT' | 'TARGET' | 'UNKNOWN';
  evidence: RomEvidence;
}
// correlación por AnimationResource + forma/personaje visible + slot,
// NO por intuición visual
```

Draw order: producir `tick · CA39 · order` y confirmar cuándo ocurre
0→1 o 1→0 — no basta saber estáticamente que ambas existen.

## 299–301. Artefactos y reglas de traza

```text
tools/rom-trace/
├─ trace-action.lua · trace-schema.ts · decode-action-object.ts
├─ compare-traces.ts · derive-state-machine.ts · fixtures/

docs/rom/traces/
├─ manifest.json · tail/ · purple-comet/ · p-comet-z/ · handler-08/ · handler-0c/
└─ por captura: trace.json · changes.csv · metadata.json · summary.md
```

Dos formatos: `trace.full.json` (raw, todos los ticks — la evidencia) y
`trace.changes.json` (diff, inspección humana).

**Nunca editar un trace a mano**: generated · immutable · checksummed. El
significado va en `trace.annotations.json` aparte.

## 302. Promotion pipeline

```text
PENDING_ROM_TRACE → TRACE_CAPTURED → FIELD_CANDIDATE
→ CROSS_TRACE_CONFIRMED → ROM_DYNAMIC_VERIFIED
```

Solo el último puede entrar en ROM_ACTION_OBJECT_LAYOUT /
ROM_ACTION_ANCHORS / ROM_HANDLER_STATE_MACHINES.

## 303. ACTION_OBJECT_LAYOUT — aceptable parcial

```ts
interface RomActionObjectLayout {
  size: 0x13;
  fields: { active?: number; animationSet?: number; clipId?: number;
    frameIndex?: number; frameElapsedTicks?: number;
    baseX?: number; baseY?: number; flags?: number };
  unknownOffsets: number[];
  evidence: 'PARTIAL_ROM_DYNAMIC_VERIFIED' | 'ROM_DYNAMIC_VERIFIED';
}
// 12 bytes conocidos + 7 UNKNOWN es mejor que bautizar 19/19 falsamente
```

## 304. Anchors pueden quedar parcialmente resueltos

```text
ACTOR_HOME → ROM_DYNAMIC_VERIFIED
TARGET_HOME → ROM_DYNAMIC_VERIFIED
CONTACT_POINT → PENDING_ROM_TRACE
```

No obligar al lote a obtener los tres a la vez.

## 305–307. Dev Studio

- Timeline: vista `SEMANTIC | ROM TRACE` (tick · CA06 · slot0 raw · slot1 raw
  · SCX · SCY · CA39) + decoder (BASE_X candidate · FRAME verified · byte 0C
  unknown).
- Anchors: mostrar `PENDING_ROM_TRACE`, no `ACTOR_HOME = —`; o `x=N y=M
  ROM_DYNAMIC_VERIFIED traces: 6`.
- Handler FSM: estado OBSERVADO por trazas (nº de traces, STATE FLOW, ramas
  CA53=0/CA53=2 si aparecen). No rellenar estados ausentes desde otro handler.

## 308. Tests del Lote 9

```text
TRACE FORMAT: ROM SHA obligatorio · emulator version obligatorio ·
  trace ID determinista · exactamente 19 bytes por ActionObject ·
  slot0 = C3A0 · slot1 = C3B3
RAW EVIDENCE: raw inmutable · annotations separadas · diff regenerable
  desde raw · checksum reproducible
DECODER: ningún byte UNKNOWN se promociona solo · CANDIDATE ≠
  ROM_DYNAMIC_VERIFIED · signed fields preservados · raw nunca se pierde
COORDINATES: base ≠ frame offset ≠ screen motion · sin ACTOR_HOME sin
  dynamic evidence · sin CONTACT_POINT inferido desde +98px
HANDLERS: trace targets $08/$0B/$0C/$0D/$0E soportados · outcome variants
  separados
MULTI ACTOR: raw slot bindings coexisten · draw order trazable · cleanup
  deja ambos slots inactivos · sin tercer FighterActor
ARCHITECTURE: tracing = dev/tooling only · sin mutación de gameplay · sin
  autoridad de Presentation · sin dependencia de producción del emulador
```

## 309. SUPERSEDES del Lote 9 (expresos)

```text
SUPERSEDES 1 — NO: offset bautizado por inspección visual
SÍ: raw byte → differential traces → candidate → cross-trace → semantic field

SUPERSEDES 2 — NO: posición del sprite en pantalla = ActionObject.x/y
SÍ: base object + frame offset + object motion + screen state → visual final

SUPERSEDES 3 — NO: un trace satisfactorio = state machine completa
SÍ: handler × outcome × side/orientation → conjunto de traces → FSM verificada
```

## 310. Estado de cierre real

### Integrable inmediatamente (infraestructura)

```text
✓ trace schema · Lua tracer · full 19-byte dumps · ROM SHA metadata
✓ diff generator · decoder framework · evidence promotion states
✓ handler trace targets · Dev Studio ROM TRACE · tests/guardrails
```

### NO marcar como completado hasta ejecutar la ROM

```text
✗ layout semántico byte-a-byte C3A0..C3C5 · BASE_X · BASE_Y
✗ ACTOR_HOME absoluto · TARGET_HOME absoluto · CONTACT_POINT
✗ state machine completa $08/$0B/$0C/$0D/$0E
```

> **Lote 9 no elimina los INFERRED por añadir el tracer: los elimina
> individualmente cuando existen traces reales que demuestran el dato.**
> Para arrancar: Tail #29 · Purple Comet #57 · P.Comet Z #58 (identidad
> inequívoca). Lote 10 = resultados dinámicos (decodificar 19 bytes,
> coordenadas ACTION, 5 handlers byte/tick por byte/tick).

---

# LOTE 10.1 — RECLASIFICACIÓN ESTÁTICA (2026-08-24, pasada de corpus)

> Cierre por evidencia estática (desensamblado + recursos + workers). Lo que
> requería ejecutar la ROM y no está capturado NO se marca como dinámico.
> El bloqueo actual es exclusivamente experimental: observación dinámica real.

## ✅ STATIC VERIFIED (cerrados)

| Item | Evidencia | Estado |
| --- | --- | --- |
| Tail $3F seq0/seq1 reachability | macro $36 opcode $01 → ActionObject 0 · AnimationSlot 6 · sequence=1 · flags=$80; Tail ejecuta en Bank03:$62BB | ambas secuencias ROM_HANDLER_VERIFIED |
| V-ball Crash $41 seq0/1/2/3 | worker: seq0 fallback; macro $3B→slot6 seq1 · $3C→seq2 · $3D→seq3 | 4/4 reachability VERIFIED |
| Suicide $08 static | Card #33 · handler $08 · Anim $2B · worker Bank03:$5E67 · resource 1 seq/40 frames/162 ticks · state $14 WAIT $A0 (160t) · branch CA53: 0/4→state $32 · 2→$46 · otro→$3C | anim/timing/routing VERIFIED · semántica espacial PENDING_ROM_TRACE |
| Defense slot8 consumer map | selection → AnimationSlot8 preload; starts directos solo Bank03:$60B2 (DAMAGE) y $59FD (Beam result); Taiyoken→slot8 en Damage · Barrier/Breath/Absorb→slot8 en Beam · Teleport/TimeFreeze=preload | ROM_HANDLER_VERIFIED |
| Defense CA83/CA53 families | CA53=1 Avoid · 2 Endurance/partial · 3 Nullification · 4 Energy Absorb; descartada equivalencia CA53=2==MISS | ROM_CONFIRMED |
| Shockwave vs Taiyoken | ambos CA83&$01 pero películas distintas: Shockwave #124 NO slot8 → macro $38 → AO1 state $1F; Taiyoken usa slot8; Sunglasses → CA83=$81 (bit $80 evita cancelación) | ROM_HANDLER_VERIFIED |
| TACTICAL→ACTION pipeline | $07F4/$080C = interpolación paletas CGB (NO fade genérico); TACTICAL→macro $19→scene/VRAM $8E00→macro $1A→palette transition→ACTION READY | estructura ROM_STATIC_VERIFIED · cadencia exacta OPEN |
| Purple Comet $0D / P.Comet Z $0E identidad | #57 handler $0D worker $5C04 Anim $1C FX $27 pal $2C · #58 handler $0E worker $5D0C Anim $1C FX $6F pal $2E — mismo resource ≠ misma cinemática | identidad estática cerrada · multi-object dinámico PENDING |
| Defense selection (CA02) | CA55=2→MOVE CA02=$1E · CA55=1→DEFENSE CARD CA02=$28 · otro→GUARD CA02=$14; Guard→CA82=2 · Move→CA82=3; Move: bit0 GROUND/AIR bit1 FRONT/BACK persistente, ACTION motion $29/$2A neto 0px | estructura VERIFIED |
| Kiai $40 / Paralysis $29 | cargadas en slot6 sin start estático desde workers Support ni Presentation macros | PRELOADED_SLOT6_NOT_ACTIONOBJECT_STARTED (no forzar) |
| Lightning C. $06 | seq0 STATICALLY_REACHABLE · seq1 UNOBSERVED_STATIC_FROM_LIGHTNING_C_PATH (casi idénticas, difieren solo en último vfid) — no UNUSED, no bloqueante | no bloquea COMPLETION |
| **R5 Defense LIMIT (2026-08-24)** | ver `docs/rom/generated/defense-limit/REPORT.md` — menú defensivo C0A0=6 CA03=0x04 → jr_001_4fcc · cursor CA36 0/1/2 (LIMIT/JOIN/BASIC, sin CHARA) · A→C2D0=1→CA03=0x0A→0x0B (Jump_001_5022) · confirm Bank01:0x5036: CA57=carta · validador $7B96 (coste≤CC · máscara 48-bit · categoría vía CA0C) · **gate exclusivo: powerWindowCounter (battleStat+4=CA40) ≠ 0** · commit CA55=1+CA03=0x5A · CC se cobra en la resolución (10→7, coste 3) · límite conservado (reutilizable) · mano intacta · JOIN (Bank01:5095) = mismo flujo SIN gate PW y CON remoción de mano ($45cf) | **ROM_STATIC_VERIFIED** |
| **R4 Rocket Punch $05 (2026-08-24)** | ver `docs/rom/generated/rocket-punch/REPORT.md` — handler Bank03:$5B38 = motor Beam común ($5776) + perfil de lanzamiento $5B42: entradas buffer [01 posicionar][06:4 releaseSyncFrame][0D objetivo][0C:0][**0E: -6×19t screen motion**][**0F flag**][07:60 wait] — = Kamehameha + screen motion + flag · FSM motor: 1 PREPARE → 2/0x15 paleta → 3 wait → 4 release → 0x14 init → 0x16 AO draw → 0x17 resultado (card 62 → CA7F=34b8>>1, CA53=0) → 0x18 branch CA53 → 0x32 HIT (macro CA54+0x2B) / 0x3C MISS (macros $34/$35) / 0x46 PARTIAL (CA54+0x32) / 0x50 SPECIAL (roll 0x4B→skip audio) → 0x52 damage apply → 0x53 cleanup · perfiles: $02=4/− · $03=5/− · $04=17/? · $05=4/−6×19t · $06=7/−6×16t · $07=path | **ROM_STATIC_VERIFIED** |

## ❌ Siguen OPEN (deuda real)

```text
R3  ActionObject semantic binding (ACTOR/TARGET, ACTOR_HOME, TARGET_HOME,
    CONTACT_POINT, LEFT↔RIGHT mirroring, multi-object binding)  [TRACE]
R4  Tail FSM dinámica · V-ball ramas espaciales · Suicide espacial
    Purple Comet multi-object · P.Comet Z multi-object            [TRACE]

R6  cadencia exacta TACTICAL↔ACTION (ticks por paso)              [TRACE]
```

No bloqueantes tras eso: R7 nombres semánticos de macros · R8 CPU original ·
R9 mapa SFX/BGM completo · R10 display internals · R11 Story map.

> Prohibido re-investigar: layout ActionObject, AnimationSlot, graphics
> renderer, Tail/V-ball sequence reachability. El milestone obligatorio
> siguiente: un `tail_left_*` real y válido (ya existe tail_left_defended_01 —
> ver R31A_TAIL_BOOTSTRAP.md), validar decoder físico (GATE PASS 0 UNKNOWN),
> luego Tail 2×2, Purple Comet y P.Comet Z; solo entonces promover anchors.
