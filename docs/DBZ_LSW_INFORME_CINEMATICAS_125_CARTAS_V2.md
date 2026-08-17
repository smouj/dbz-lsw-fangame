# DBZ LSW — Informe maestro de cinematografía, animaciones y cartas
## Especificación de producción para agente · V2.0

**Juego de referencia:** Dragon Ball Z: Legendary Super Warriors (Game Boy Color)  
**Objetivo:** implementar el remake con una arquitectura reutilizable y fiel a la lógica visual del original, evitando inventar nombres, timings o secuencias que todavía no estén verificadas cuadro a cuadro.  
**Base consolidada:** especificación V1 recuperada + catálogo completo 001–125 + guía de combate + guía de personajes + catálogo de sprites.

---

## 1. Regla de certeza

Usar siempre estas etiquetas:

- `CONF_GAME`: confirmado por reglas/listas/guías consistentes del juego.
- `CONF_ASSET`: el gráfico existe en hoja/recorte, pero su función exacta puede no estar probada.
- `CONF_PROJECT`: contrato interno del remake.
- `INFERRED`: coreografía razonable derivada del tipo de ataque; NO tratar como frame-perfect.
- `PENDING_ROM`: requiere captura cuadro a cuadro, ROM/OAM o metraje directo para cerrar orden y timing.

**Prohibido:** convertir una inferencia visual en “animación oficial” solo porque el sprite parece un Kamehameha, un guard, un hurt, etc.

---

## 2. Arquitectura visual obligatoria

### 2.1 Vistas

1. `TACTICAL_FIELD`
   - sprites pequeños `overworld`;
   - posiciones `air_back`, `air_front`, `ground_back`, `ground_front`;
   - HUD, cartas, estados, turno;
   - `overviewBackground`.

2. `ACTION_SOLO`
   - un actor grande;
   - Gather Power, buffs, curación, transformaciones, objetos/autosoporte;
   - `actionBackground` o `specialActionBackground`.

3. `ACTION_DUEL`
   - atacante y defensor grandes;
   - melee, beam, agarres, impactos y defensas directas.

4. `ACTION_TEAM`
   - dos actores aliados o secuencia conjunta;
   - F. Kamehameha, Purple Comet, P Comet Z, BuuBall Slam.

5. `PROJECTILE`
   - entidad autónoma: beam, bola, disco, fantasma, puño, onda, etc.

6. `IMPACT`
   - contacto, guard, avoid, absorb, cancel, explosión y KO.

Flujo base:

```text
TACTICAL_FIELD
→ card/basic_confirm
→ ACTION_VIEW_ENTER
→ PREPARATION
→ EXECUTION
→ HIT | MISS | BLOCK | AVOID | ABSORB | CANCEL
→ resolve
→ ko_confirmed? 
→ CLEANUP
→ ACTION_VIEW_EXIT
→ TACTICAL_FIELD
```

---

## 3. Banco universal que DEBE existir en todos los personajes

### 3.1 Overworld / táctico

```text
overworld_idle_ground
overworld_idle_air
overworld_move_horizontal_start
overworld_move_horizontal_travel
overworld_move_horizontal_end
overworld_move_vertical_start
overworld_move_vertical_travel
overworld_move_vertical_end
battle_overworld_gather_power_pose
battle_overworld_gather_power_aura   // efecto separado
overworld_guard
overworld_hurt
overworld_ko
```

### 3.2 Acción grande

```text
action_idle
action_ready
action_move_entry
action_move_exit
action_guard_start
action_guard_hold
action_guard_hit
action_guard_end
action_attack_forward_start
action_attack_forward_contact
action_attack_forward_recover
action_attack_vertical_start
action_attack_vertical_contact
action_attack_vertical_recover
action_hurt_light
action_hurt_heavy
action_hurt_beam
action_hurt_cut
action_hurt_explosion
action_knockback
action_fall
action_recover
action_ko
action_beam_pose
action_beam_charge
action_beam_release
action_beam_recover
```

No significa que cada forma tenga un PNG diferente para cada nombre: un mismo frame puede ser referenciado por varios clips. Si una forma no tiene un frame observado, no inventarlo.

### 3.3 Acciones Basic universales del sistema

**Attack Phase**
- Stage Attack disponible por Basic según progreso/configuración.
- `Gather Power`.

**Defense Phase**
- `Guard`.
- `Movement`.

`Movement` solo cambia **un eje por acción**:
- horizontal: `back ↔ front`;
- vertical: `ground ↔ air`.

Nunca permitir un salto diagonal lógico como `air_back → ground_front` en una única orden.

### 3.4 Cartas universales reales

Las cartas declaradas para **All Characters** son:
- `005 Cont. Punch`
- `006 Cont. Kick`
- `007 Energy Wave`
- `008 Energy Bomb`

Las Stage Attack `001–004` pertenecen al sistema Command/Stage y comparten la misma máquina de estados, parametrizada por longitud.

---

## 4. Gather Power correcto

```text
confirm
→ battle_overworld_gather_power_pose
→ charge_start
→ battle_overworld_gather_power_aura(loop)
→ resolve(powered_up)
→ aura_end
→ overworld_idle
```

- pose corporal y aura son recursos separados;
- no crear proyectil;
- no llamar `gather_power` a la carga de un Kamehameha;
- el estado de power-up es persistente durante la duración mecánica del juego.

---

## 5. Guard correcto

```text
action_guard_start
→ guard_active
→ action_guard_hold
→ [si hay contacto] guard_contact
→ action_guard_hit
→ resolve
→ action_guard_end
```

`BLOCK` no usa `hurt` completo. Debe mostrar VFX de bloqueo y reacción reducida.

---

## 6. Stage Attack 3/4/5/6

Una sola state machine:

```text
STAGE_INPUT
→ STAGE_RUSH
→ STAGE_CONTACT[n]
→ STAGE_FINISH
→ RESULT
→ RETURN
```

Contrato del remake:

1. Ventana **global** para toda la secuencia.
2. El reloj NO se reinicia después de cada input.
3. Mientras se introducen comandos, actor en pose neutral/preparada.
4. 3/4/5/6 entradas según carta.
5. Movement/input espacial se representa con dos ejes lógicos, no cuatro destinos absolutos.
6. Al completar la entrada comienza la cadena física visible.
7. Fallo:
   `qte_failed → counterattack_enter → Enter Command A/B`.
8. No convertir el fallo en un simple MISS decorativo.

Ventanas conservadas como contrato del proyecto:
`1.2 s`, `1.7 s`, `2.4 s`, `2.9 s`.

**Importante:** la asociación exacta entre cada ventana y cada combinación Front/Back sigue `PENDING_ROM`; no codificarla por intuición.

---

## 7. Plantillas cinematográficas

| ID | Familia | Pipeline |
|---|---|---|
| `T01` | Carta/UI | reveal → confirm → coste/condición → commit |
| `T02` | Entrada/salida | tactical → cut → action → cut → tactical |
| `T03` | Melee simple | approach → attack → contact → reaction → return |
| `T04` | Combo/Stage | input/ready → rush → N contacts → finisher → return |
| `T05` | Beam | pose → charge → release → travel → result → dissipate |
| `T06` | Projectile | create → launch → flight → result → explosion/exit |
| `T07` | Disc/slash | create → spin/trail → cut → exit |
| `T08` | Aura/buff/transform | pose → pulse → resolve state → persistent/fade |
| `T09` | Control/debuff | gesture → target effect → resolve state → release |
| `T10` | Support/team | enter/additional actor → effect/attack → result → withdraw |
| `T11` | Item/HUD | icon/object → activation → status/bar → consume/persist |
| `T12` | Defense | trigger → guard/avoid/cancel/absorb → result → return |

No crear 125 máquinas de estados. Cada carta referencia una plantilla y añade `variant`, VFX, attach points y reglas de resultado.

---

## 8. Eventos de timeline obligatorios

```text
clip_start
anticipation_start
charge_start
charge_loop
projectile_spawn
beam_start
movement_commit
contact
guard_contact
avoid_commit
absorb_commit
cancel_commit
hit_stop_start
hit_stop_end
resolve
ko_confirmed
cleanup
return_to_field
```

Reglas:
- `contact` sincroniza sprite/VFX/SFX; no aplica por sí solo HP.
- `resolve` aplica HP, CC, estados y consumos.
- `ko_confirmed` solo después de `resolve`.
- `movement_commit` es el único evento que muta posición táctica.
- proyectiles y efectos son entidades separadas del cuerpo.

---

## 9. Resultado visual

### HIT
`contact → hit-stop → impact VFX → hurt variant → resolve → recover/ko`

### MISS
trayectoria termina sin contacto; no hurt ni explosión corporal falsa.

### BLOCK
contacto con defensa/barrera; VFX de bloqueo; reacción reducida; resolve de reducción/negación.

### AVOID
defensor sale de línea / afterimage / teleport / jump; proyectil continúa o se disipa fuera.

### ABSORB
interceptor captura beam/projectile; ocultar/destruir entidad entrante en `absorb_commit`; luego resolve de recuperación/transferencia.

### CANCEL
ataque se corta antes de contacto; no generar impacto falso.

---

## 10. Matriz completa 001–125

**Leyenda de assets**
- `CORE_REUSE`: banco común de todos los fighters.
- `GENERIC_VARIANT`: comparte familia, pero usa pose/VFX variante.
- `UNIQUE_POSE/VFX/ATTACH`: requiere assets propios, no una FSM nueva.
- `UNIQUE_CINEMATIC`: secuencia singular.
- `SUPPORT_*`: actor de soporte/retrato/efecto separado.
- `ITEM_*`: objeto/HUD; no reutilizar sprite corporal arbitrariamente.
- `UNIQUE_UNKNOWN`: no inventar hasta validar.

| ID | Carta | Mecánica | Template | Asset | Directiva de animación |
|---:|---|---|---|---|---|
| 001 | 3 Stage Attack | Command / Stage | `T04` | `CORE_REUSE` | QTE global de 3 entradas; pose neutral durante inputs; al completar, rush + 3 contactos + remate/retorno. Fallo -> rama counterattack A/B. |
| 002 | 4 Stage Attack | Command / Stage | `T04` | `CORE_REUSE` | Igual a 001 con 4 entradas/contactos lógicos y ganancia de 4 CC. |
| 003 | 5 Stage Attack | Command / Stage | `T04` | `CORE_REUSE` | QTE global de 5 entradas; no reiniciar reloj por input; completar antes de iniciar la cadena física. |
| 004 | 6 Stage Attack | Command / Stage | `T04` | `CORE_REUSE` | QTE global de 6 entradas; variante máxima de la misma máquina de estados. |
| 005 | Cont. Punch | Melee | `T04` | `CORE_REUSE` | Combo universal de puñetazos: ready -> approach -> golpes repetidos -> contacto final -> reacción -> recover -> retorno. |
| 006 | Cont. Kick | Melee | `T04` | `CORE_REUSE` | Combo universal de patadas; mismo esqueleto que Cont. Punch, con clips de kick y contactos propios. |
| 007 | Energy Wave | Beam | `T05` | `CORE_REUSE` | Ataque energético universal: pose genérica -> carga breve -> release -> haz/onda -> resultado -> recover. |
| 008 | Energy Bomb | Beam / Projectile | `T06` | `CORE_REUSE` | Bola de energía universal: charge -> spawn en attachPoint de mano -> vuelo -> HIT/MISS/BLOCK/AVOID -> recover. |
| 009 | Special Card | Special / Collection | `T11` | `UNIQUE_UNKNOWN` | No forzar una cinemática de combate. Mostrar carta/UI y resolver solo si el efecto real está validado; actualmente tratar como PENDING-ROM. |
| 010 | Masenko | Beam | `T05` | `GENERIC_VARIANT` | Pose específica Masenko -> carga -> emisión -> viaje/haz -> impacto. Nunca sustituir por pose Kamehameha si existe sprite propio. |
| 011 | Dunk Shot | Melee | `T04` | `UNIQUE_POSE` | Rush físico exclusivo -> golpe/encadenado vertical -> slam/knockdown -> reacción -> retorno. Orden exacto de frames PENDING-ROM. |
| 012 | Kamehameha | Beam | `T05` | `GENERIC_VARIANT` | Pose Kamehameha -> carga -> beam_start -> HIT/MISS/BLOCK/AVOID -> recover. |
| 013 | S. Kamehameha | Beam | `T05` | `GENERIC_VARIANT` | Misma familia que Kamehameha con carga/efecto de mayor escala; conservar pose y VFX propios de la forma. |
| 014 | F. Kamehameha | Team Beam | `T10+T05` | `UNIQUE_CINEMATIC` | Acción de equipo Gohan/Goku: entrada de segundo actor -> preparación sincronizada -> emisión conjunta -> resultado -> retirada/retorno. |
| 015 | Sonic Kick | Melee | `T03` | `GENERIC_VARIANT` | Entrada rápida -> kick de alta velocidad -> contact -> hurt/knockback -> recover. |
| 016 | Resurrection | Support / Heal | `T08` | `GENERIC_VARIANT` | ACTION_SOLO: pose de recuperación -> aura/heal VFX -> resolve HP -> disipación -> retorno. En defensa el efecto mecánico puede ser menor. |
| 017 | S. Beam Cannon | Beam | `T05` | `UNIQUE_POSE` | Pose de dos dedos -> carga concentrada -> haz perforante -> resultado. Punto de emisión anclado a dedos. |
| 018 | F. Lightbomb | Beam / Projectile | `T06` | `UNIQUE_POSE` | Preparación propia -> esfera/masa de Ki -> lanzamiento -> viaje -> impacto. Forma visual exacta PENDING-ROM. |
| 019 | Taiyoken | Defense / Avoid Melee | `T12` | `UNIQUE_POSE` | Trigger defensivo -> pose Solar Flare -> flash de pantalla -> avoid_commit -> atacante falla -> retorno; no reproducir hurt. |
| 020 | Misty KiWave | Beam | `T05` | `GENERIC_VARIANT` | Cast -> onda/haz de Ki -> viaje -> resultado -> recover. |
| 021 | Destruc-Disk | Beam / Disc | `T07` | `UNIQUE_VFX` | Crear disco separado -> giro/estela -> vuelo -> corte o salida -> resultado; no pegar disco al cuerpo. |
| 022 | S. Destruc-D. | Beam / Disc | `T07` | `UNIQUE_VFX` | Variante reforzada de Destructo Disk: mismo pipeline con disco/estela/impacto de mayor intensidad. |
| 023 | Kaio Ken | Support / Buff | `T08` | `UNIQUE_POSE` | ACTION_SOLO: activación -> aura roja/pulsos -> resolve buff -> estado persistente. No tratar como ataque. |
| 024 | Spirit Bomb | Beam / Projectile | `T06` | `UNIQUE_CINEMATIC` | Carga especial prolongada -> esfera sobre actor -> release -> viaje -> impacto/explosión -> recover; mantener esfera como entidad independiente. |
| 025 | Solid Shot | Melee | `T04` | `UNIQUE_POSE` | Combo exclusivo de puñetazo/patada -> varios contactos -> remate -> reacción -> retorno. |
| 026 | Teleport | Defense / Avoid Beam | `T12` | `UNIQUE_VFX` | Trigger -> desaparición/afterimage -> avoid_commit -> proyectil continúa/sale -> reaparición -> retorno. |
| 027 | Sup. Saiyan-2 | Support / Ki Up | `T08` | `GENERIC_VARIANT` | Buff de Ki: pose de power-up/aura -> resolve Ki Up -> estado. No cambiar automáticamente de forma del personaje. |
| 028 | Sup. Saiyan-3 | Support / Strength Up | `T08` | `GENERIC_VARIANT` | Buff de Strength: pose de power-up/aura -> resolve -> estado. No confundir con transformación jugable. |
| 029 | Tail | Melee / Special | `T08+T03` | `UNIQUE_CINEMATIC` | Cinemática exclusiva de Kid Gohan con Ōzaru: transformación/entrada especial -> ataque físico -> resolve -> salida/restauración. No reutilizar combo humano. |
| 030 | Galick-Ho | Beam | `T05` | `UNIQUE_POSE` | Pose Galick Gun -> carga -> haz -> resultado -> recover. |
| 031 | Big Bang Atk | Beam / Projectile | `T06` | `UNIQUE_POSE` | Pose de una mano -> esfera/descarga -> lanzamiento -> vuelo -> impacto. |
| 032 | Final Flash | Beam | `T05` | `UNIQUE_POSE` | Preparación a dos manos -> carga -> haz de gran escala -> impacto -> recover. |
| 033 | Suicide | Beam / Self Explosion | `T08+T06` | `UNIQUE_CINEMATIC` | Carga corporal -> explosión radial -> resultado enemigo -> resolve propio dejando al usuario a 1 HP -> cleanup. Resolver HP propio después del evento ofensivo. |
| 034 | Rising Kick | Melee | `T03` | `UNIQUE_POSE` | Aproximación/ascenso -> patada vertical -> launch reaction -> aterrizaje/recover. |
| 035 | Burning Atk. | Beam / Projectile | `T06` | `UNIQUE_POSE` | Precast con gestos propios -> carga -> projectile_spawn -> vuelo -> impacto. |
| 036 | Final Atk | Beam / Projectile | `T06` | `UNIQUE_POSE` | Perfil Finish Buster/Final Attack: pose propia de SS Trunks -> esfera/descarga -> resultado. Nombre visual según edición; no renombrar assets por intuición. |
| 037 | Flash Punch | Melee | `T03` | `GENERIC_VARIANT` | Rush corto -> puñetazo rápido -> contact -> reacción -> recover. |
| 038 | Kamekameha | Beam | `T05` | `GENERIC_VARIANT` | Variante de Goten: pose/cast propio -> haz -> resultado; conservar nombre de carta aunque la familia sea Kamehameha. |
| 039 | Galactica D. | Beam / Bind | `T09` | `UNIQUE_VFX` | Crear anillo/donut de energía -> vuelo -> bind visual sobre objetivo -> resolve daño/estado -> release/cleanup. |
| 040 | S. G. K. Atk | Beam / Summoned Projectile | `T10+T06` | `UNIQUE_CINEMATIC` | Super Ghost Kamikaze: spawn de fantasma(s) -> vuelo autónomo -> contacto -> explosión -> resultado -> cleanup. |
| 041 | BuuBall Slam | Team / Special Defeat | `T10+T04` | `UNIQUE_CINEMATIC` | Solo team: entrada/participación del compañero -> secuencia de lanzamiento/voleibol -> slam -> resultado -> ambos retornan. |
| 042 | Kiai | Support / Guard Down | `T09` | `UNIQUE_VFX` | Grito/onda radial -> efecto sobre objetivo -> resolve Guard Down -> disipación. |
| 043 | Atomic Break | Melee | `T04` | `UNIQUE_POSE` | Combo físico propio de Vegito -> contactos -> remate -> reacción -> retorno. |
| 044 | Flash Sword | Beam / Energy Blade | `T07` | `UNIQUE_POSE` | Generación de espada/filo de Ki -> thrust/corte -> contacto -> reacción -> disipación. |
| 045 | Barrier | Defense / Avoid Beam | `T12` | `UNIQUE_VFX` | Trigger -> barrera de Ki alrededor/delante -> guard_contact -> beam cancel/deflect -> resolve -> fade. |
| 046 | N. Slasher | Melee / Grapple | `T03` | `UNIQUE_POSE` | Entrada cuerpo a cuerpo -> agarre/estrangulamiento -> golpe/throw -> reacción -> retorno. |
| 047 | KiBlast Bomb | Beam / Projectile | `T06` | `GENERIC_VARIANT` | Ki en palma -> spawn -> lanzamiento -> vuelo -> impacto. |
| 048 | Lightning C. | Beam | `T05` | `UNIQUE_POSE` | Carga propia de Nappa -> emisión de energía -> viaje/impacto -> recover. |
| 049 | Telekinesis | Beam / Psychic | `T09` | `UNIQUE_VFX` | Gesto psíquico -> target lock -> desplazamiento/impacto telequinético -> resolve -> release. |
| 050 | M. Soundwave | Beam / Wave | `T05` | `UNIQUE_VFX` | Pose/voz -> onda sónica visible -> contacto -> resultado -> disipación. |
| 051 | Paralysis | Support / Speed Down | `T09` | `UNIQUE_VFX` | Gesto psíquico -> efecto de inmovilización -> resolve Speed Down -> estado temporal. |
| 052 | Time Freeze | Defense / Command Fail | `T12` | `UNIQUE_CINEMATIC` | Trigger ante command/stage -> freeze visual -> cancel command -> resolve -> unfreeze -> retorno. |
| 053 | Breath | Defense / Avoid Beam | `T12` | `UNIQUE_POSE` | Trigger -> soplido/onda de aire -> interceptar beam -> cancel/deflect -> retorno; falla contra Special Defeat según reglas. |
| 054 | Eraser Can. | Beam | `T05` | `UNIQUE_POSE` | Pose -> carga -> emisión desde boca -> haz -> resultado; attachPoint mouth obligatorio. |
| 055 | R. F. B. Atk. | Melee | `T04` | `UNIQUE_POSE` | Recoome Fighting Bomber: pose/entrada propia -> cadena física -> remate -> reacción -> retorno. |
| 056 | Crasher Ball | Beam / Projectile | `T06` | `UNIQUE_POSE` | Generar esfera -> gesto tipo golpe/voleibol -> projectile_spawn -> vuelo -> impacto. |
| 057 | Purple Comet | Team Beam | `T10+T05` | `UNIQUE_CINEMATIC` | Jeice + Burter: entrada conjunta -> sincronización -> ataque energético combinado -> impacto -> retirada. |
| 058 | P Comet Z | Team / Special Defeat | `T10+T04` | `UNIQUE_CINEMATIC` | Jeice + Burter: rush conjunto con aura púrpura -> contactos/remate -> Special Defeat resolution -> retorno. |
| 059 | Speed Up | Support / Speed Up | `T08` | `GENERIC_VARIANT` | Self buff -> líneas de velocidad/afterimage -> resolve Speed Up -> estado. |
| 060 | Mach Attack | Melee | `T03` | `UNIQUE_POSE` | Rush de alta velocidad -> contact -> knockback -> recover. |
| 061 | Dynami. Punch | Melee | `T03` | `GENERIC_VARIANT` | Anticipation -> puñetazo pesado -> hit-stop -> hurt -> recover. |
| 062 | Body Change | Beam / Special | `T05` | `UNIQUE_CINEMATIC` | Pose Ginyu -> beam de Body Change -> impacto -> daño proporcional -> retorno. En LSW no intercambia personajes: no ejecutar swap de actor. |
| 063 | Finger Beam | Beam | `T05` | `UNIQUE_ATTACH` | Pose -> charge breve -> rayo desde fingertip -> impacto -> recover. |
| 064 | Super E-Ball | Beam / Projectile | `T06` | `GENERIC_VARIANT` | Carga de gran esfera -> lanzamiento -> vuelo -> explosión -> recover. |
| 065 | Grand Wave | Beam / Ground Wave | `T07` | `UNIQUE_VFX` | Cast -> onda energética rasante -> efecto de corte/rotura de suelo -> contacto -> resolve. |
| 066 | S. Dash Elbow | Melee | `T03` | `UNIQUE_POSE` | Dash -> elbow contact -> hit-stop -> knockback -> recover. |
| 067 | Eye Beam | Beam | `T05` | `UNIQUE_ATTACH` | Pose/mirada -> beam_start desde ojos -> contacto -> recover. |
| 068 | Lock On | Support / Accuracy Up | `T11` | `GENERIC_UI` | Activación -> retícula/target marker -> resolve Sure-Hit -> persistir hasta próximo ataque -> cleanup al consumir. |
| 069 | Rocket Punch | Special Defeat / Projectile | `T06` | `UNIQUE_CINEMATIC` | Separar puño como proyectil -> vuelo -> HIT/AVOID -> retorno/reconexión o cleanup. Shockwave no debe tratarlo como melee normal. |
| 070 | Hell Flash | Beam | `T05` | `UNIQUE_CINEMATIC` | Abrir/activar dispositivo de brazos -> carga -> beam_start -> impacto -> cierre/recover. |
| 071 | Crazy Rush | Melee | `T04` | `UNIQUE_POSE` | Rush -> múltiples golpes -> remate -> reacción -> retorno. |
| 072 | Energy Slash | Beam / Slash | `T07` | `UNIQUE_VFX` | Generar filo/onda desde palma -> vuelo/corte -> contacto -> resolve. |
| 073 | Energy Slice | Beam / Slash | `T07` | `UNIQUE_VFX` | Corte luminoso de energía -> viaje -> resultado -> disipación. |
| 074 | 18's Attack | Melee / Grapple | `T04` | `UNIQUE_POSE` | Agarre/estrangulamiento -> punch -> reacción -> release -> retorno. |
| 075 | Life Absorb | Melee / Drain | `T03` | `UNIQUE_CINEMATIC` | Aproximación -> contacto palma -> drain loop -> transferir HP en resolve -> separación/recover. |
| 076 | Ene. Absorb | Defense / Beam Absorb | `T12` | `UNIQUE_CINEMATIC` | Trigger beam -> palma absorbente -> absorber projectile/beam -> resolve heal/negación -> fade; falla contra Special Defeat. |
| 077 | Cell Combo | Melee | `T04` | `UNIQUE_POSE` | Punch/kick repetidos -> remate -> reacción -> retorno. |
| 078 | Step Up Atk | Melee | `T03` | `UNIQUE_POSE` | Entrada de Cell Jr. -> ataque físico propio -> contact -> reacción -> retorno. |
| 079 | Flesh Guard | Support / Guard Up | `T08` | `UNIQUE_POSE` | Body brace/flex -> aura/defense cue -> resolve Guard Up -> estado. |
| 080 | Potbelly Atk | Special Defeat / Melee | `T03` | `UNIQUE_CINEMATIC` | Ataque corporal exclusivo de Fat Buu -> contacto con vientre/masa -> Special Defeat resolution -> recover. Coreografía exacta PENDING-ROM. |
| 081 | Crasher Buu | Melee | `T04` | `UNIQUE_POSE` | Combo rápido/pesado -> varios contactos -> remate -> reacción. |
| 082 | Sweet Beam | Beam / Transform Hit | `T05` | `UNIQUE_CINEMATIC` | Beam desde antena/cabeza -> contacto -> efecto visual de conversión en dulce/snack -> resolve -> restauración/cleanup según juego. |
| 083 | Bulma | Support / Debuff | `T10` | `SUPPORT_SUMMON` | Mostrar soporte/retrato/entrada -> gesto/efecto de stare down -> resolve debuff -> retirada. No sustituir por sprite del fighter. |
| 084 | Chiaotzu | Support / Speed Down | `T10` | `SUPPORT_SUMMON` | Entrada/portrait -> efecto psíquico -> resolve Speed Down -> salida. |
| 085 | Tien | Defense Support / Knock Down | `T10+T12` | `SUPPORT_COUNTER` | Trigger durante guard -> entrada Tien -> Ki Cannon/impacto al atacante -> knockdown resolve -> retirada. |
| 086 | Yajirobe | Defense Support / Knock Down | `T10+T12` | `SUPPORT_COUNTER` | Trigger -> entrada rápida -> sword slash -> knockdown resolve -> retirada. |
| 087 | Kaio | Support / Ki Down | `T10` | `SUPPORT_SUMMON` | Entrada/portrait -> gag/onda de desmoralización -> resolve Ki Down -> salida. |
| 088 | Dende | Support / Heal | `T10` | `SUPPORT_SUMMON` | Entrada/portrait -> healing VFX sobre aliado -> resolve HP -> retirada. |
| 089 | Guru | Support / Attack Up | `T10` | `SUPPORT_SUMMON` | Entrada/portrait -> unlock-power effect -> resolve Attack Up -> salida. |
| 090 | Hercule | Defense Support / Knock Down | `T10+T12` | `SUPPORT_COUNTER` | Trigger guard -> entrada Hercule -> golpe/acción de interrupción -> knockdown -> retirada. |
| 091 | Supreme Kai | Support / Speed Down | `T10` | `SUPPORT_SUMMON` | Entrada/portrait -> restricción/telequinesis -> resolve Speed Down -> salida. |
| 092 | Kibito | Defense Support / Beam Fail | `T10+T12` | `SUPPORT_GUARD` | Trigger beam -> soporte/protección mágica -> cancel beam -> resolve -> retirada. |
| 093 | Babidi | Support / Parameter Cancel | `T10` | `SUPPORT_SUMMON` | Entrada/portrait -> magic/status VFX -> cancelar parámetros/estados definidos -> resolve -> salida. |
| 094 | Dabura | Support / Dual Phase | `T10+T09` | `UNIQUE_DUAL` | Attack Phase: spit projectile -> petrify VFX -> resolve. Defense Phase: variante protect/cancel del ataque. Mantener dos timelines bajo la misma carta. |
| 095 | Yakon | Support / Power Fail | `T10` | `SUPPORT_SUMMON` | Entrada/portrait -> absorber luz/energía -> cancelar Power/Gather effect objetivo -> resolve -> retirada. |
| 096 | Scouter | Item / Guard Down | `T11` | `ITEM_UI` | HUD scouter/scan -> marcar punto débil -> resolve Guard Down -> cerrar overlay. |
| 097 | Caps. Fridge | Item / CC Recovery | `T11` | `ITEM_UI` | Mostrar item/icono -> activación/consumo -> resolve +CC -> cleanup; sin ACTION_DUEL. |
| 098 | Stop Device | Item / Android Stop | `T11+T09` | `ITEM_TARGET` | Dispositivo -> pulso de corto alcance sobre Android válido -> stop/stun resolve -> cleanup. |
| 099 | Life Preser | Item / Heal | `T11` | `ITEM_UI` | Activar dispositivo -> healing meter/VFX -> resolve HP -> cleanup. |
| 100 | Medical Mac. | Item / Cleanse | `T11` | `ITEM_UI` | Activar máquina/medical VFX -> cancelar Parameter Down/estado negativo según reglas -> cleanup. |
| 101 | Gravity Dev. | Item / Speed Down | `T11+T09` | `ITEM_TARGET` | Activar dispositivo -> campo/pulso de gravedad sobre objetivo -> resolve Speed Down -> cleanup. |
| 102 | Ene. Absorber | Item / Life Absorb | `T11+T12` | `ITEM_DUAL` | Uso activo: absorber energía/vida según regla. En Guard: interceptar y absorber. Resolver transferencia y destruir/ocultar efecto entrante. |
| 103 | Sealed Ball | Item / Attack Down | `T11+T09` | `ITEM_TARGET` | Mostrar esfera sellada -> efecto de sellado sobre objetivo -> resolve Attack Power Down -> cleanup. |
| 104 | Trunks Sword | Item / Strength Up | `T11` | `ITEM_EQUIP` | Presentar/equipar espada -> resolve Strength Up -> icono/estado persistente; no ejecutar corte ofensivo. |
| 105 | Dabura Spear | Item / Strength Up | `T11` | `ITEM_EQUIP` | Presentar/equipar lanza -> resolve Strength Up -> estado persistente. |
| 106 | Light Vest | Item / Speed Up | `T11` | `ITEM_EQUIP` | Equip cue -> resolve Speed Up -> estado. |
| 107 | Btl. Jacket | Item / Guard Up | `T11` | `ITEM_EQUIP` | Equip armor cue -> resolve Guard Power Up -> estado. |
| 108 | New B-Jacket | Item / Guard Up | `T11` | `ITEM_EQUIP` | Misma familia de armadura con variante visual propia -> resolve Guard Up. |
| 109 | Sunglasses | Item / Taiyoken Immunity | `T11` | `ITEM_EQUIP` | Equipar gafas -> estado anti-Taiyoken -> cuando se dispare flash, bloquear su efecto sin falso hurt. |
| 110 | Gamebomb | Defense Item / Damage | `T11+T12` | `ITEM_COUNTER` | Trigger en Guard -> activar bomba -> explosión sobre atacante -> resolve daño -> cleanup. |
| 111 | Champ. Belt | Support / Damage Fail | `T11` | `ITEM_EQUIP` | Activar/equip cue -> estado que invalida daño físico aplicable -> consumir/expirar según reglas. |
| 112 | Spcl. Candy | Defense Item / Damage | `T11+T12` | `ITEM_COUNTER` | Trigger guard -> lanzar/activar candy tóxico -> impacto -> resolve damage 30 -> cleanup. |
| 113 | Heart Virus | Support / Attack Down | `T11+T09` | `ITEM_TARGET` | Aplicar virus/status icon -> resolve Attack Power Down -> mantener estado hasta cancelación/fin. |
| 114 | Heart Medi. | Item / Cleanse | `T11` | `ITEM_UI` | Consumir medicina -> eliminar Parameter Down/estado aplicable -> recovery cue -> cleanup. |
| 115 | Hourglass | Item / Cancel Support Effect | `T11` | `ITEM_UI` | Activar reloj de arena -> cancel_support_effect -> retirar VFX/estado objetivo -> cleanup. |
| 116 | Roshi's Book | Item / Unknown | `T11` | `UNIQUE_UNKNOWN` | Mostrar carta/item, pero no inventar efecto ni cinemática mecánica. Marcar PENDING-ROM hasta validar qué hace realmente. |
| 117 | Full Spirit | Support / Ki Up | `T08` | `GENERIC_VARIANT` | Pose de enfado/power-up -> aura -> resolve Ki Up -> estado. |
| 118 | Afterimage | Support / Avoid Up | `T08+T12` | `GENERIC_VARIANT` | Al usar: aplicar buff de evasión. Al activarse después: afterimage/vanish -> avoid_commit -> reaparición -> consumir estado. |
| 119 | Reading Ki | Support / Accuracy Up | `T08` | `GENERIC_VARIANT` | Pose de concentración/sense -> resolve Accuracy Up -> persistir al siguiente ataque -> cleanup al consumir. |
| 120 | Feint | Support / Accuracy Up | `T08` | `GENERIC_VARIANT` | Pose/engaño breve -> resolve Accuracy Up -> estado hasta próximo ataque. |
| 121 | Endurance | Defense / Guard | `T12` | `CORE_REUSE` | Trigger -> action_guard_start/hold -> guard_contact -> reducción -> action_guard_end. Usar cuerpo del fighter, no summon. |
| 122 | Telepathy | Defense / Command Fail | `T10+T12` | `SUPPORT_GUARD` | Trigger command/stage -> efecto telepático/Supreme Kai -> command cancel -> resolve -> retorno. |
| 123 | Foresight | Defense / Command Fail | `T12` | `GENERIC_VARIANT` | Focus/anticipation -> command cancel -> resolve -> volver a guard/field. |
| 124 | Shockwave | Defense / Avoid Damage | `T12` | `CORE_REUSE` | Trigger melee/damage -> radial shockwave -> cancelar contacto/repeler -> avoid_commit -> retorno. |
| 125 | Avoiding | Defense / Avoid Beam | `T12` | `CORE_REUSE` | Trigger beam/Special Defeat compatible -> jump/evade -> projectile continúa -> avoid_commit -> aterrizar/recover. |

---

## 11. Reglas especiales que el agente debe respetar

### 11.1 Card 029 Tail
No es un golpe físico genérico. La guía de personajes confirma una animación de Ōzaru para Kid Gohan. Debe permanecer como perfil cinematográfico exclusivo.

### 11.2 Card 033 Suicide
La vida del usuario se reduce a **1 HP** como consecuencia del ataque. No matar al usuario anticipadamente ni aplicar el coste antes de que la cinemática llegue a `resolve`.

### 11.3 Card 041 BuuBall Slam
Es una acción de **Team Battle**. No ejecutarla como ataque solo de Gotenks.

### 11.4 Cards 057/058 Purple Comet / P Comet Z
Son acciones conjuntas Jeice + Burter. Requieren `ACTION_TEAM` y dos actores sincronizados.

### 11.5 Card 062 Body Change
En LSW el efecto mecánico NO debe intercambiar los personajes. Representar el ataque visual de Body Change y aplicar el daño correspondiente, sin mutar `fighterId`, `formId`, sprites, deck ni control.

### 11.6 Cards 069/080 y otras `Special Defeat`
No asumir que el tipo de stat visual equivale a defensa normal melee/beam. El resolver debe consultar `attackClass: SPECIAL_DEFEAT` y las defensas compatibles.

### 11.7 Card 076 Ene. Absorb
No es un simple BLOCK: el VFX entrante debe terminar en la palma/interceptor y resolverse como `ABSORB`.

### 11.8 Card 094 Dabura
Debe tener dos perfiles de uso por fase. El juego documenta efectos diferentes entre Attack y Defense Phase; no resolver ambos con la misma timeline.

### 11.9 Cards 009 y 116
Mantener `PENDING_ROM`. No inventar un efecto solo para “rellenar” una animación.

---

## 12. Contrato de datos recomendado

```ts
type Evidence =
  | "CONF_GAME"
  | "CONF_ASSET"
  | "CONF_PROJECT"
  | "INFERRED"
  | "PENDING_ROM";

type BattleView =
  | "TACTICAL_FIELD"
  | "ACTION_SOLO"
  | "ACTION_DUEL"
  | "ACTION_TEAM"
  | "PROJECTILE"
  | "IMPACT";

type ActionResult =
  | "HIT"
  | "MISS"
  | "BLOCK"
  | "AVOID"
  | "ABSORB"
  | "CANCEL";

interface CardCinematicProfile {
  cardId: number;
  template: "T01"|"T02"|"T03"|"T04"|"T05"|"T06"|"T07"|"T08"|"T09"|"T10"|"T11"|"T12";
  variant: string;
  view: BattleView;
  actorClip?: string;
  partnerClip?: string;
  targetReaction?: string;
  projectileId?: string;
  impactId?: string;
  attachPoint?: "hand_left"|"hand_right"|"both_hands"|"fingertip"|"eyes"|"mouth"|"head"|"center";
  attackClass?: "MELEE"|"BEAM"|"PROJECTILE"|"SPECIAL_DEFEAT"|"SUPPORT"|"DEFENSE";
  resultPolicy: string;
  evidence: Evidence;
  timingProfile: string;
}
```

---

## 13. Timing y frame-perfect

Autoridad temporal:

```text
GBC_NATIVE_FPS = 59.7275005696
```

Todo depende de un único `battleTick`.

```ts
frameIndex = clip.frameAt(battleTick - clipStartTick);
```

No mezclar:
- `setInterval`
- varios `setTimeout`
- CSS animations independientes
- reloj Pixi independiente
- lógica de daño con temporizador separado

**No existe todavía evidencia suficiente para fijar en este documento la duración exacta de cada frame de las 125 cartas.**  
Eso se cierra con auditoría ROM/metraje:

1. frame inicial;
2. orden de sprites;
3. duración en ticks;
4. pivote X/Y;
5. attach point;
6. contacto exacto;
7. hit-stop;
8. frame de resolve;
9. salida;
10. restauración de la vista táctica.

Hasta entonces, la tabla define **qué clips y entidades deben componer cada carta**, no timings inventados.

---

## 14. Fondos y cámara

Cada escenario:

```text
overviewBackground
actionBackground
```

y opcionalmente:

```text
specialActionBackground
```

Reglas:
- `TACTICAL_FIELD` permanece montado debajo de ACTION.
- entrar en ACTION no altera la posición lógica.
- el atacante conserva su lado.
- un projectile no cambia el fondo por sí solo.
- volver a táctico restaura `BattlePosition`, no la última X/Y del sprite grande.
- hit-stop congela actores/VFX pertinentes desde el mismo reloj.

---

## 15. QA obligatorio antes de declarar una carta “frame-perfect”

- [ ] personaje y forma correctos
- [ ] compatibilidad real de carta validada
- [ ] source sheet / source region
- [ ] orden de frames
- [ ] duración por frame
- [ ] pivotes/offsets
- [ ] paleta
- [ ] orientación/flipSafe
- [ ] z-order/OAM
- [ ] attach point
- [ ] projectile spawn
- [ ] frame de contacto
- [ ] hit-stop
- [ ] HIT
- [ ] MISS
- [ ] BLOCK
- [ ] AVOID
- [ ] ABSORB/CANCEL si aplica
- [ ] resolve mecánico
- [ ] KO posterior a resolve
- [ ] cleanup
- [ ] retorno a tactical

Si faltan orden, duración, pivote, spawn o contacto exactos, marcar `validated-sequence` como máximo; no `frame-perfect`.

---

## 16. Instrucción operativa para el agente

1. No modificar reglas de gameplay para acomodar una animación.
2. No inventar sprites faltantes.
3. No convertir un VFX en frame corporal.
4. No duplicar textura para player/enemy; usar alias/runtime flip cuando sea seguro.
5. Implementar primero las 12 plantillas.
6. Implementar después el banco universal.
7. Registrar cada carta 001–125 como perfil declarativo.
8. Para cartas `UNIQUE_CINEMATIC`, crear composición específica encima de las plantillas.
9. Mantener todo dato no demostrado como `PENDING_ROM`.
10. Añadir tests para:
   - result branch;
   - no damage before resolve;
   - KO after resolve;
   - projectile cleanup;
   - position persistence;
   - Stage window global;
   - cancel/absorb sin hit falso;
   - team actor lifecycle.
11. La compatibilidad personaje/forma debe venir de un registry aparte; la animación nunca decide quién puede usar una carta.
12. No considerar el trabajo terminado hasta auditar visualmente cada carta con el original.

---

## 17. Fuentes de contraste utilizadas

- GameFAQs — Card List v2.1: catálogo 001–125, power/accuracy/CC/descripciones.
- GameFAQs — Guide and Walkthrough: Attack Phase, Defense Phase, Basic, Gather Power, Guard, Movement, posiciones y cartas de soporte por fase.
- GameFAQs — Character Guide v1.2: compatibilidades, categorías Beam/Melee/Support/Guard/Special Defeat y excepciones como Tail, Body Change, BuuBall Slam, Purple Comet y absorciones.
- The Spriters Resource — catálogo de hojas de personajes, Overworld Sprites y Battle Backgrounds.
- Vídeo “Stage Attack Guide — Performing and Correcting Inputs” como referencia audiovisual pendiente de auditoría de ticks.
- Vídeo de combate completo de Legendary Super Warriors como referencia de continuidad visual.

---

## 18. Estado final

Esta V2 es **implementable** como contrato de arquitectura y clasificación de las 125 cartas.  
Lo que queda pendiente para poder llamarla réplica 1:1/frame-perfect no es la taxonomía, sino la medición exacta de:

- orden de frames por variante/personaje;
- ticks por frame;
- offsets/pivotes;
- tamaño/recorrido de VFX;
- hit-stop;
- entrada/salida de fondos;
- timing de audio;
- compatibilidad exacta de ciertas defensas y cartas duales;
- asignación de las cuatro ventanas de Stage Attack a cada combinación espacial.

El agente debe implementar esas piezas como datos editables, no hardcodearlas en la lógica.
