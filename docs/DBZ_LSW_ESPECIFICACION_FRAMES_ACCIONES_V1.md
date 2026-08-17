# DBZ LSW — Especificación definitiva de frames, animaciones y acciones

Versión 1.0 · 16 de agosto de 2026

## 0. Alcance y criterio de certeza

Este documento define cómo clasificar, nombrar y ejecutar los sprites de combate del remake de *Dragon Ball Z: Legendary Super Warriors* sin confundir datos observados con interpretaciones.

### Niveles de evidencia

| Marca | Significado | Se puede usar como dato canónico |
|---|---|---|
| `CONF-GAME` | Confirmado por el juego, el manual, el catálogo o una guía que reproduce sus reglas | Sí |
| `CONF-ASSET` | Confirmado visualmente en una hoja o recorte, pero todavía sin significado funcional probado | Solo como recurso gráfico |
| `CONF-PROJECT` | Decisión cerrada del remake | Sí, como contrato interno |
| `INFERRED` | Interpretación razonable de una pose o secuencia | No debe presentarse como nombre oficial |
| `PENDING-ROM` | Requiere ROM, vídeo cuadro a cuadro u OAM para verificarse | No |

Regla fundamental: una extracción gráfica no es una decompilación semántica. La ROM no publica nombres como `idle`, `hurt`, `guard` o `kamehameha` para cada recorte. Esos nombres solo son correctos cuando la función del frame ha sido validada dentro de una secuencia.

## 1. Hechos confirmados que condicionan las animaciones

1. El catálogo contiene 125 cartas.
2. Las cartas 001–004 son `3 Stage Attack`, `4 Stage Attack`, `5 Stage Attack` y `6 Stage Attack`.
3. El combate está dividido en `Attack Phase` y `Defense Phase`.
4. En ataque existen `Limit`, `Joint`, `Basic` y, cuando corresponde, `Chara`.
5. `Basic` de ataque contiene Stage Attack y `Gather Power`.
6. `Gather Power` habilita el uso de `Limit` y mantiene un estado temporal de energía.
7. En defensa no se permiten ataques ofensivos normales.
8. En defensa se pueden utilizar cartas de soporte compatibles.
9. `Basic` de defensa contiene `Guard` y `Movement`.
10. El campo tiene cuatro estados lógicos por combatiente: aire/suelo × frente/fondo.
11. Estar delante favorece el ataque; estar detrás favorece la defensa.
12. El aire protege mejor frente a ataques físicos; el suelo protege mejor frente a ataques de energía.
13. El movimiento es una acción defensiva, no una fase obligatoria previa al ataque.

Estados espaciales internos:

```text
air_back
air_front
ground_back
ground_front
```

El remake muestra únicamente dos órdenes de movimiento:

```text
horizontal: back ↔ front
vertical:   ground ↔ air
```

Cada orden cambia un solo eje. No se permite pasar directamente de `air_back` a `ground_front` ni de `ground_back` a `air_front` mediante una única acción.

## 2. Cinco conceptos que nunca deben mezclarse

| Concepto | Definición | Ejemplo |
|---|---|---|
| Frame | Una imagen atómica | `player_guard_front_01.png` |
| Clip | Lista ordenada de frames con duración | `action_guard_front` |
| Acción | Orden de gameplay | `guard`, `move`, `gather_power` |
| Estado | Condición persistente | `powered_up`, `air_front` |
| Efecto | Recurso separado del cuerpo | aura, polvo, haz, proyectil, impacto |

Una técnica o carta no es un banco de frames. Es una línea de tiempo que combina clips de personajes, efectos, fondo, cámara, sonido y eventos mecánicos.

## 3. Separación obligatoria de vistas

### `TACTICAL_FIELD`

- Usa exclusivamente sprites pequeños `overworld`.
- Muestra posición, turno, cartas, estados y relación espacial.
- Usa `overviewBackground`.
- Mantiene los cuatro estados `air/ground × front/back`.

### `ACTION_SOLO`

- Muestra un personaje grande.
- Se usa para Gather Power, transformaciones, curación, objetos y soporte sin blanco corporal.
- Usa el fondo de acción del escenario o un fondo especial autorizado.

### `ACTION_DUEL`

- Muestra atacante y defensor grandes.
- Se usa para golpes, agarres, defensas, controles y contactos directos.

### `PROJECTILE`

- Plano de viaje de proyectil, disco, rayo o efecto autónomo.
- El proyectil es una entidad separada del sprite del emisor.

### `IMPACT`

- Plano o subestado reservado para contacto, bloqueo, evasión, explosión y KO.
- No puede comenzar antes del evento mecánico que confirma el resultado.

Flujo general:

```text
TACTICAL_FIELD
→ ACTION_CONFIRMED
→ ACTION_VIEW_ENTER
→ ACTION_PREPARATION
→ ACTION_EXECUTION
→ HIT | MISS | BLOCK | AVOID
→ RESULT_APPLICATION
→ ACTION_VIEW_EXIT
→ TACTICAL_FIELD
```

## 4. Estructura de carpetas

```text
characters/
  <character_id>/
    <form_id>/
      overworld/
        idle/
        movement/
        gather_power/
        guard/
        hurt/
        unclassified/
      action/
        idle/
        movement/
        guard/
        attack_forward/
        attack_vertical/
        hurt/
        beam/
        special/
        unclassified/
      manifest.json

effects/
  movement/
  aura/
  charge/
  beam/
  projectile/
  impact/
  guard/
  transformation/
  status/
  unclassified/

backgrounds/
  <scenario_id>/
    overview.png
    action.png
  special_action/

cinematics/
  templates/
  cards/
  characters/
```

No se guardan auras, rayos, polvo, impactos ni proyectiles dentro de la carpeta corporal de un personaje, aunque en la hoja original aparezcan pegados a sus poses.

## 5. Convención de nombres

### 5.1 Frame físico

Contrato acordado:

```text
[role]_[action]_[variant]_[frame].png
```

Valores de `role`:

```text
player
enemy
support
effect
projectile
```

Ejemplos válidos:

```text
player_guard_front_01.png
enemy_hurt_heavy_02.png
player_attack_forward_03.png
player_attack_vertical_02.png
player_beam_cast_01.png
support_heal_cast_02.png
effect_beam_charge_03.png
projectile_energy_ball_01.png
```

Los roles son alias de ejecución. Para no duplicar texturas, el atlas puede hacer que `player_*` y `enemy_*` apunten al mismo frame fuente cuando el personaje y la forma sean iguales.

### 5.2 Identificador de clip

```text
[view]_[action]_[variant]
```

Ejemplos:

```text
overworld_idle_ground
overworld_move_horizontal
overworld_move_vertical
battle_overworld_gather_power_pose
battle_overworld_gather_power_aura
action_guard_front
action_attack_forward
action_attack_vertical
action_beam_cast
action_hurt_heavy
```

### 5.3 Identificador de estado

Los estados no usan nombres de animación:

```text
powered_up
guarding
air_back
air_front
ground_back
ground_front
stunned
blinded
paralyzed
knocked_out
```

### 5.4 Frame no identificado

Si la función no está demostrada:

```text
unclassified_sheet_<sheet>_region_<region>_<frame>.png
```

Ejemplo:

```text
unclassified_sheet_23_region_014_01.png
```

No se debe adivinar el nombre por parecido.

## 6. Familias corporales canónicas del proyecto

Estas son las familias mínimas. Una forma puede no tener todas; no se inventan frames para rellenar huecos.

| Familia | Uso | Loop | Evento mecánico propio |
|---|---|---:|---|
| `idle` | Espera y pose neutral | Sí | No |
| `movement` | Desplazamiento y aproximación | Normalmente no | `movement_commit` si cambia posición |
| `guard` | Guardia, barrera corporal o resistencia | Según carta | `guard_active` |
| `attack_forward` | Ataques físicos de avance horizontal | No | `contact` |
| `attack_vertical` | Golpes ascendentes, descendentes o cambios verticales | No | `contact` |
| `hurt` | Reacción a cuerpo, rayo, corte, explosión o caída | No | No aplica daño por sí sola |
| `beam` | Pose, carga y liberación de energía | Parcial | `charge_start`, `projectile_spawn` |
| `special` | Transformación, agarre, control o técnica exclusiva validada | Depende | Declarado por perfil |
| `unclassified` | Material sin función probada | No ejecutable | Ninguno |
| `fixed` | Recurso corregido respecto al recorte original | Hereda | Hereda |

`fixed` no es una animación. Es una marca de procedencia/QA y debe registrarse en metadatos, no utilizarse como acción de gameplay.

## 7. Subclips y nombres exactos recomendados

### 7.1 Overworld

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
battle_overworld_gather_power_aura
overworld_guard
overworld_hurt
overworld_ko
```

La pose con las manos levantadas o el cuerpo tenso y el haz/aura alrededor debe clasificarse así:

```text
acción: gather_power
pose corporal: battle_overworld_gather_power_pose
efecto separado: battle_overworld_gather_power_aura
estado resultante: powered_up
```

No debe llamarse simplemente `power`, `charge`, `power_up_frame` o `idle_power`. Tampoco debe confundirse con la carga de un rayo.

### 7.2 Acción grande

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

Un mismo PNG puede participar en varios clips mediante referencia; no se copia ni se renombra de dos maneras diferentes.

## 8. Metadatos obligatorios de cada frame

Cada entrada del manifiesto debe contener:

```json
{
  "id": "player_guard_front_01",
  "file": "action/guard/player_guard_front_01.png",
  "sourceSheet": "goku_super_saiyan",
  "sourceRegion": "region_014",
  "evidence": "CONF-ASSET",
  "semanticStatus": "validated",
  "durationTicks": 4,
  "pivot": { "x": 16, "y": 31 },
  "hurtbox": { "x": 7, "y": 3, "w": 18, "h": 28 },
  "hitbox": null,
  "attachPoints": {
    "hand_left": null,
    "hand_right": null,
    "mouth": null,
    "center": { "x": 16, "y": 16 }
  },
  "events": [],
  "flipSafe": true,
  "paletteId": "battle_default",
  "notes": ""
}
```

Campos imprescindibles:

- `sourceSheet` y `sourceRegion`: permiten volver al origen.
- `evidence`: evita convertir inferencias en hechos.
- `durationTicks`: duración dentro del clip, no velocidad global.
- `pivot`: mantiene los pies o el centro corporal sin saltos.
- `hurtbox` y `hitbox`: independientes de la transparencia del PNG.
- `attachPoints`: origen de aura, mano, boca, rayo o proyectil.
- `events`: eventos semánticos que ocurren en ese frame.
- `flipSafe`: indica si se puede reflejar horizontalmente.

## 9. Reloj y duración

La autoridad temporal única es:

```text
GBC_NATIVE_FPS = 59.7275005696
```

El motor no debe mezclar `setInterval`, `setTimeout`, CSS animation y relojes independientes. Todo se obtiene de `battleTick`.

```text
frameIndex = clip.frameAt(battleTick - clipStartTick)
```

Las duraciones exactas de cada frame del original permanecen `PENDING-ROM` hasta medir metraje o traza. Ningún valor orientativo debe presentarse como duración canónica.

## 10. Eventos de la línea de tiempo

Eventos mínimos:

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
hit_stop_start
hit_stop_end
resolve
ko_confirmed
cleanup
return_to_field
```

Reglas:

1. `contact` sincroniza pose, VFX, SFX y reacción; no aplica automáticamente el resultado.
2. `resolve` aplica HP, CC, estados y descarte.
3. `ko_confirmed` solo se emite después de `resolve` si la vida final es cero.
4. `projectile_spawn` crea una entidad separada anclada al punto correcto.
5. `movement_commit` es el único evento que cambia una posición táctica.
6. `cleanup` elimina efectos temporales, pero no estados persistentes.

## 11. Ejecución correcta de cada acción básica

### 11.1 `idle`

```text
enter → idle_loop → exit
```

- Se usa en la espera táctica y en pausas legibles de ACTION.
- No contiene hitbox ni modifica estado.
- No debe reproducirse mientras existe un frame de contacto bloqueado por hit-stop.

### 11.2 `movement_horizontal`

```text
overworld_move_horizontal_start
→ travel
→ movement_commit(back↔front)
→ end
→ overworld_idle
```

- Solo cambia `back/front`.
- Si el actor ya está en `front` y avanza, se aplica la regla de empuje/reposicionamiento del rival definida por gameplay; no se teletransporta a otra altura.
- El polvo o las líneas de velocidad pertenecen a `effects/movement`.

### 11.3 `movement_vertical`

```text
overworld_move_vertical_start
→ ascent/descent
→ movement_commit(ground↔air)
→ end
→ overworld_idle
```

- Solo cambia `ground/air`.
- Ascenso y descenso pueden compartir frames reflejando el orden únicamente si la observación lo valida.
- No debe usar `attack_vertical` salvo que la acción produzca contacto real.

### 11.4 `gather_power`

```text
card/basic confirm
→ battle_overworld_gather_power_pose
→ charge_start
→ battle_overworld_gather_power_aura loop
→ resolve(powered_up)
→ aura end
→ overworld_idle
```

- Es una acción de `Basic` durante ataque.
- No es un ataque y no crea proyectil.
- La pose corporal y el aura son recursos distintos.
- La carga de un Kamehameha nunca reutiliza este identificador, aunque visualmente haya energía.

### 11.5 `guard`

```text
action_guard_start
→ guard_active
→ action_guard_hold
→ guard_contact
→ action_guard_hit
→ resolve
→ action_guard_end
```

- Si no llega un ataque, se omiten `guard_contact` y `guard_hit`.
- El impacto se ancla delante del defensor.
- `BLOCK` usa efecto de bloqueo; no usa reacción corporal de `HIT`.

### 11.6 `attack_forward`

```text
action_ready
→ action_move_entry
→ action_attack_forward_start
→ contact
→ target reaction
→ action_attack_forward_recover
→ action_move_exit
```

- Para puñetazos, patadas, codazos y embestidas horizontales.
- La hitbox solo está activa alrededor de `contact`.
- El desplazamiento visual no altera `front/back` salvo `movement_commit` explícito.

### 11.7 `attack_vertical`

```text
action_ready
→ vertical approach
→ action_attack_vertical_start
→ contact
→ launch/slam reaction
→ recovery/landing
```

- Para Rising Kick, golpes descendentes, elevaciones y remates al suelo.
- No equivale a Movement vertical: esta familia produce contacto.
- La posición táctica solo cambia si la carta define derribo, lanzamiento o reposicionamiento.

### 11.8 `hurt`

```text
contact
→ hit_stop
→ hurt variant
→ knockback/fall opcional
→ recover o ko
```

Variantes válidas únicamente cuando se han observado:

```text
light
heavy
beam
cut
explosion
knockback
fall
ko
```

El clip `hurt` nunca decide el daño. Solo representa un resultado ya resuelto o en proceso de resolución.

### 11.9 `beam`

```text
action_beam_pose
→ charge_start
→ action_beam_charge
→ action_beam_release
→ projectile_spawn o beam_start
→ PROJECTILE
→ HIT | MISS | BLOCK | AVOID
→ resolve
→ action_beam_recover
```

- `beam` es la familia genérica.
- El frame se llama `kamehameha`, `masenko`, `galick_gun`, etc. solo dentro de un perfil de técnica validado.
- Haz, bola, disco y explosión son entidades de efectos separadas.
- Un `MISS` no reproduce `hurt` ni explosión corporal.
- Un `AVOID` mantiene la trayectoria hasta salir o disiparse.

## 12. Stage Attack 3/4/5/6

Las cuatro cartas están confirmadas como Command/Stage Attack y conceden 3, 4, 5 o 6 CC respectivamente.

La animación no es un banco propio. Compone:

```text
idle/ready
movement o rush
attack_forward/attack_vertical
hurt
impact
recovery
```

Contrato del remake:

1. La ventana es global para toda la secuencia; no se reinicia con cada entrada.
2. El actor permanece en pose neutral/preparada mientras se introducen comandos.
3. Cada acierto avanza el índice de entrada.
4. La secuencia puede contener 3, 4, 5 o 6 entradas según la carta.
5. Los controles espaciales muestran dos ejes lógicos, horizontal o vertical; no cuatro destinos absolutos.
6. Al completar la secuencia comienza la cadena física visible.
7. Un fallo no se representa como daño parcial automático ni como simple `MISS` decorativo.

Ventanas aceptadas en el proyecto, pendientes de asociar a las combinaciones exactas de posición mediante captura cuadro a cuadro:

```text
1.2 s
1.7 s
2.4 s
2.9 s
```

No deben codificarse como “tiempo por botón”.

Flujo de fallo aceptado:

```text
qte_failed
→ cortar ofensiva
→ counterattack_enter
→ Enter Command A/B
```

- A: defender/banco, conservar CC y entrar en la respuesta defensiva.
- B: continuar, aceptando el riesgo del contraataque.

La asociación exacta de A/B, textos, daños y frames del original permanece `PENDING-ROM` hasta validar el tutorial/metraje de Stage Attack. El motor debe permitir configurar esta rama sin reescribir la animación.

## 13. Plantillas cinematográficas por familia

| ID | Familia | Línea temporal |
|---|---|---|
| `T01` | Carta/UI | revelar → confirmar → coste/condición → commit |
| `T02` | Entrada/salida | campo → corte → ACTION → corte → campo |
| `T03` | Melee simple | aproximación → ataque → contacto → reacción → retorno |
| `T04` | Combo/Stage | QTE → rush → N contactos → remate → retorno |
| `T05` | Rayo | pose → carga → emisión → viaje → resultado → disipación |
| `T06` | Proyectil | creación → lanzamiento → vuelo → resultado → explosión/salida |
| `T07` | Disco/corte | creación → giro/estela → corte → salida |
| `T08` | Aura/transformación | pose → pulsos → cambio → estado persistente |
| `T09` | Control | gesto → efecto sobre blanco → estado → liberación |
| `T10` | Apoyo | entrada/retrato → efecto → resultado → retirada |
| `T11` | Objeto/HUD | icono → activación → barra/estado → consumo/persistencia |
| `T12` | Defensa | trigger → guardia/evasión/onda → resultado → retorno |

Las 125 cartas se construyen mediante estas plantillas y perfiles específicos. No deben existir 125 máquinas de estados independientes.

## 14. Resultados y reacciones

### `HIT`

- `contact` visible.
- Hit-stop.
- VFX de impacto.
- Variante `hurt` adecuada.
- `resolve`.

### `MISS`

- La trayectoria termina sin contacto.
- No hay `hurt`.
- No hay flash corporal.
- El atacante completa recuperación.

### `BLOCK`

- Contacto con guardia/barrera.
- VFX anclado a la defensa.
- Reacción corporal reducida o inexistente.
- `resolve` aplica la reducción o negación correcta.

### `AVOID`

- El defensor abandona la línea o usa afterimage.
- El ataque continúa o se disipa fuera.
- No hay impacto falso.

### `KO`

- Se calcula después de `resolve`.
- Solo entonces se emite `ko_confirmed`.
- Se reproduce `action_ko` o `overworld_ko` según la vista.

## 15. Perfiles de técnicas específicas

Una técnica validada añade nombres propios al perfil, no a frames genéricos sin verificar:

```json
{
  "id": "card_012_kamehameha",
  "template": "T05",
  "actorClip": "action_beam_cast",
  "profileVariant": "kamehameha",
  "projectile": "beam_kamehameha",
  "impact": "impact_beam_large",
  "reaction": "action_hurt_beam",
  "evidence": "PENDING-ROM"
}
```

Hasta completar la validación, el perfil puede existir, pero los campos no confirmados conservan `PENDING-ROM` y no justifican renombrar los PNG fuente.

## 16. Pivotes, volteo y composición

1. Todos los frames corporales deben compartir un pivote lógico estable.
2. En suelo, el pivote preferente es el punto de apoyo de los pies.
3. En aire, el pivote es el centro corporal estable definido por la secuencia.
4. Los frames no se alinean por el centro del rectángulo recortado.
5. `flipX` se decide en runtime.
6. Un frame con mano dominante, texto, símbolo asimétrico o composición especial puede ser `flipSafe: false`.
7. Los efectos se anclan a `attachPoints`, nunca a coordenadas mágicas de pantalla.
8. La caja de colisión no se deduce automáticamente del alfa del sprite.

## 17. Fondos y lados

Cada escenario mantiene una pareja:

```text
<scenario_id>.overviewBackground
<scenario_id>.actionBackground
```

`specialActionBackground` es independiente y solo se usa cuando la técnica lo exige.

Reglas:

- El campo táctico permanece montado debajo de ACTION para evitar flashes de carga.
- La entrada conserva el eje atacante/defensor.
- El atacante ocupa el lado desde el que comenzó la acción salvo una técnica de teletransporte validada.
- El fondo no cambia por el mero hecho de usar un proyectil.
- La salida restaura la posición lógica, no la última coordenada visual del sprite grande.

## 18. Validación de una animación antes de marcarla como canónica

Una animación solo pasa a `validated` cuando se comprueba:

1. Personaje y forma correctos.
2. Hoja y región fuente.
3. Orden de frames.
4. Duración de cada frame.
5. Frames repetidos deliberadamente.
6. Pivot y offsets X/Y.
7. Paleta correcta.
8. Volteo y lado.
9. Z-order/OAM.
10. Punto de spawn del efecto.
11. Frame exacto de contacto.
12. Hit-stop.
13. Reacción HIT/MISS/BLOCK/AVOID.
14. Momento de `resolve`.
15. Limpieza y retorno.

Si falta uno de los puntos 3, 4, 6, 10 u 11, la secuencia no puede declararse réplica frame-perfect.

## 19. Errores prohibidos

- Nombrar una pose por parecido sin verla ejecutándose.
- Agrupar dos poses distintas dentro del mismo PNG.
- Guardar aura o proyectil pegado al cuerpo si es una entidad independiente.
- Usar sprites grandes en `TACTICAL_FIELD`.
- Usar sprites overworld para representar una técnica completa en ACTION.
- Aplicar daño al inicio de la animación.
- Iniciar KO antes de `resolve`.
- Reiniciar el reloj del Stage Attack tras cada entrada.
- Mostrar cuatro botones de movimiento que permiten saltos diagonales entre estados.
- Cambiar ambos ejes con una única acción Movement.
- Llamar `gather_power` a la carga de un rayo.
- Llamar `beam` a un panel, etiqueta o efecto que no sea una secuencia corporal validada.
- Usar `fixed` como nombre de acción.
- Convertir los índices visuales `001`, `002`, etc. en significado semántico.
- Sincronizar VFX, cámara, sprites y daño con temporizadores independientes.

## 20. Contrato mínimo de datos

```ts
type Evidence =
  | "CONF_GAME"
  | "CONF_ASSET"
  | "CONF_PROJECT"
  | "INFERRED"
  | "PENDING_ROM";

type BattlePosition =
  | "air_back"
  | "air_front"
  | "ground_back"
  | "ground_front";

interface AnimationFrame {
  id: string;
  textureId: string;
  durationTicks: number;
  pivot: { x: number; y: number };
  hitbox?: Rect;
  hurtbox?: Rect;
  attachPoints: Record<string, Point>;
  events: string[];
  evidence: Evidence;
}

interface AnimationClip {
  id: string;
  view: "TACTICAL_FIELD" | "ACTION_SOLO" | "ACTION_DUEL";
  loop: boolean;
  frames: AnimationFrame[];
}

interface CinematicProfile {
  id: string;
  template: string;
  actorClip: string;
  targetReaction?: string;
  projectile?: string;
  impact?: string;
  profileVariant?: string;
  evidence: Evidence;
}
```

## 21. Estado real de confirmación

### Confirmado

- Estructura Attack/Defense.
- Opciones generales de ambas fases.
- Guard y Movement en defensa.
- Support Cards durante defensa cuando son compatibles.
- Cuatro posiciones Air/Ground × Front/Back.
- Stage Attack 3/4/5/6.
- Separación del proyecto entre overworld y acción.
- Necesidad de timeline determinista y eventos semánticos.
- Acción, estado, clip y efecto como entidades distintas.
- Gather Power como acción diferente de cargar un ataque Beam.

### Confirmado como contrato del remake, no como etiqueta oficial de ROM

- Los identificadores ingleses definidos en este documento.
- Patrón `[role]_[action]_[variant]_[frame]`.
- Dos botones/ejes de Movement.
- Vistas `TACTICAL_FIELD`, `ACTION_SOLO`, `ACTION_DUEL`, `PROJECTILE`, `IMPACT`.
- Eventos `contact`, `resolve`, `cleanup`, etc.
- Reloj único a 59.7275005696 Hz.

### Pendiente de validar cuadro a cuadro

- Nombre semántico de cada uno de los 1.952 recortes.
- Orden exacto de cada secuencia por personaje y forma.
- Duración exacta por frame.
- OAM, pivotes, offsets y paletas originales.
- Asociación exacta de las ventanas 1.2/1.7/2.4/2.9 con posiciones.
- Coreografía exacta del fallo y corrección de Stage Attack.
- Variantes específicas de técnicas y usuarios.
- Reglas exactas de los 13 pares de fondos durante cada técnica.

## 22. Fuentes de contraste

- Manual norteamericano escaneado: [Nintendo Game Boy Color Manuals — Dragon Ball Z: Legendary Super Warriors](https://archive.org/details/NintendoGameBoyColorManuals)
- Mecánicas Attack/Defense, Guard, Movement y posiciones: [GameFAQs — Guide and Walkthrough](https://gamefaqs.gamespot.com/gbc/563077-dragon-ball-z-legendary-super-warriors/faqs/21080)
- Cartas 001–125 y descripciones: [GameFAQs — Card List](https://gamefaqs.gamespot.com/gbc/563077-dragon-ball-z-legendary-super-warriors/faqs/21714)
- Catálogo de hojas: [The Spriters Resource — Legendary Super Warriors](https://www.spriters-resource.com/game_boy_gbc/dbzlegend/)
- Hoja Overworld: [The Spriters Resource — Overworld Sprites](https://www.spriters-resource.com/game_boy_gbc/dbzlegend/asset/54982/)
- Guía audiovisual de Stage Attack: [Stage Attack Guide — Performing and Correcting Inputs](https://www.youtube.com/watch?v=uHHVI_3FL7E)
- Combate completo de referencia: [Legendary Super Warriors Walkthrough — Full Battle](https://www.youtube.com/watch?v=Kf-e_4gK8KE)

## 23. Regla de cierre

El nombre correcto no es el más descriptivo: es el nombre más específico que la evidencia permite.

```text
Si se ve el gráfico pero no se conoce su función → unclassified.
Si se conoce la función genérica → familia semántica genérica.
Si se confirma personaje, carta y secuencia → variante específica.
Si se confirma orden, timing, pivote y eventos → validated/frame-perfect.
```

Esta jerarquía impide que el motor dependa de nombres falsos y permite perfeccionar la fidelidad sin romper las cartas ni las líneas de tiempo ya implementadas.
