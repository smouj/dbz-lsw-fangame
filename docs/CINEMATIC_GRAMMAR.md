# GBC Cinematic Grammar — DBZ Legendary Super Warriors

> Gramática cinematográfica del combate original (USA GBC), reconstruida de
> capturas archivadas, guías contemporáneas, hojas de sprites/fondos y los
> vídeos "Special Attack Showcase" + longplay 6h23m. **Compañero de
> `ACTION_FIDELITY.md`** (que documenta cada acción frame a frame). Este
> documento fija la ESTRUCTURA (planos, master shot, máquina de estados) y
> separa lo CONFIRMADO de lo PENDIENTE de medir.

Niveles de fidelidad (compartidos con `ACTION_FIDELITY.md`):
`PLACEHOLDER` → `INFERRED` → `VERIFIED` → `FRAME_VERIFIED`.

---

## 1. La idea fundamental: DOS representaciones del combate

El combate **no es una escena continua de luchadores grandes**. Es un montaje
cinematográfico con dos representaciones que se alternan:

```text
              COMBATE
                 │
       ┌─────────┴─────────┐
       │                   │
 VISTA TÁCTICA       VISTA DE ACCIÓN
 sprites pequeños    sprites grandes
 posición lógica     animación detallada
 elegir acciones     ataque/defensa/VFX
 HUD / cartas        beam/golpes
       │                   │
       └─────────┬─────────┘
                 │
          vuelve al plano táctico
```

Las hojas conservadas separan explícitamente **Overworld Sprites** de las hojas
completas de personaje, y existe una hoja independiente de **Battle
Backgrounds** (The Spriters Resource: 42 hojas de personajes + 8 grupos
misceláneos, incl. `Overworld Sprites` y `Battle Backgrounds`).

**Consecuencia para el remake**: el combate NO debe tratarse como un fighter
lateral continuo. Es:

```text
TÁCTICA → selección → CORTE → ACCIÓN → resolución → CORTE → TÁCTICA
```

---

## 2. Estructura permanente de la pantalla (GBC 160×144)

El GBC divide el espacio agresivamente:

```text
┌───────────────────────────────────────┐
│ GOKU            VEGETA               │   ← HUD FIJO (nombres + HP + fase)
│ █████████  HP   HP  █████████        │
│ ★ ATTACK        ▼ DEFENSE            │
├───────────────────────────────────────┤
│                                       │
│          VENTANA DE ESCENA            │   ← esto es lo que se transforma
│                                       │
├───────────────────────────────────────┤
│ LIMIT │ L │ J │ B │ C │   panel/mensajes│  ← PANEL DE COMANDOS
└───────────────────────────────────────┘
```

**El HUD no desaparece durante una acción especial** (p. ej. Kaioken: sprite
grande + aura en la ventana central, pero el encabezado HP/ATTACK-DEFENSE sigue
arriba). Lo que se transforma cinematográficamente es la **ventana central**.

```text
HUD FIJO · VENTANA DE ESCENA · PANEL DE COMANDOS/MENSAJES
```

---

## 3. Flujo de arranque

```text
STORY / BATTLE MODE
      ↓
PRE-BATTLE          (fighter jugador + inicial enemigo + composición equipo + confirmación)
      ↓
BATTLE INTRO
      ↓
TACTICAL_FIELD
```

PENDIENTE (medir en ROM): el tipo exacto de transición `PRE-BATTLE → TACTICAL`
(corte puro / wipe / flash / barrido / negro). **No añadir un efecto moderno
arbitrario hasta medirlo.**

---

## 4. `TACTICAL_FIELD` = el "master shot"

Plano base al que TODO vuelve. **No es decorativo**: representa físicamente

```text
AIR / GROUND  ×  FRONT / BACK
```

y la distancia entre ambos afecta incluso al tiempo disponible para los Stage
Attacks (el movimiento se ejecuta durante la fase defensiva).

```text
┌── Stage Attack ──┐
├── Damage ────────┤
TACTICAL ──┼── Beam ────────┼──→ TACTICAL
├── Support ───────┤
├── Gather ────────┤
└── Limit ─────────┘
```

LSW no mueve una cámara compleja: **corta entre composiciones preparadas**.

---

## 5. Quién empieza + arranque

- SPD determina quién obtiene primero la fase ofensiva (Gohan más rápido → empieza).
- Al convertirse en atacante: **+3 CC**.
- Arranque estable: `TACTICAL_FIELD → resolver SPD → marcar ATTACK → habilitar comandos`.
- **Empieza en el plano táctico**, no con una animación de puñetazos.

---

## 6. Selección de acción NO dispara la película

Comandos básicos: `L` (Limited) · `J` (Joint/cards) · `B` (Basic) · `C` (Change).
El Basic cambia por fase: ataque → `Gather Power` o Stage Attack; defensa →
`Move` o `Defend`.

```text
TACTICAL → abrir comando → opciones PANEL INFERIOR → navegar → confirmar
        → resolver defensa/objetivo → ACTION CINEMATIC
```

No cambiar de escena antes de terminar la selección necesaria.

---

## 7. Confirmación → "película"

El gameplay calcula **ANTES** (hit/miss/block/etc.) y la cinemática solo lo
dramatiza. Compatible con `BattleTimeline`:

```text
INPUT/DECISION → CONFIRM → (gameplay resuelve) → CINEMATIC PRESENTATION → RESULT
```

---

## 8. Cambio TACTICAL → ACTION (el truco visual)

Corte entre composiciones, NO zoom tween 3D. En material extraído ya tenemos la
separación overview/action por escenario.

```text
FRAME N  TACTICAL          →  FRAME N+1  CORTE  →  ACTION (sprite grande)
```

**NO** `zoom 100% → 125% → 150% → 200%`. Eso rompería la gramática del original.

---

## 9. Stage Attack (patrón maestro)

N inputs según nivel (3/4/5/6 Stage); cada input correcto = +1 CC; el tiempo
disponible depende de la distancia entre luchadores.

```text
TACTICAL → ACTION ENTRY → QTE/COMMAND INPUT
   ├── SUCCESS → ATTACK EXECUTION → IMPACT
   └── FAIL → COUNTER WINDOW
```

**El sprite debe mantenerse en pose neutral de espera durante el QTE** y no
reproducir la película de golpes hasta validar la secuencia. Evitar mezclar
`QTE + animación final` como un solo proceso.

### Fail del Stage (no un toast)

```text
WRONG INPUT / TIMEOUT → INTERRUPT CINEMATIC → ENTER COMMAND (A/B)
   A = ABANDON (conservar CC conseguido) · B = REPAIR (ventana corta)
```

Merece **un estado cinematográfico propio**, no un simple toast.

---

## 10. Ataques físicos `Damage`

```text
TACTICAL → ACTION_DUEL → pose inicial → wind-up → aproximación/rush
        → pose ataque → CONTACT → HIT/GUARD/AVOID defensor → impacto → HP → recovery → TACTICAL
```

**No** `generic_melee_animation` para todo. Cada carta con perfil propio
(`ContPunchProfile`, `ContKickProfile`, `SonicKickProfile`, `DunkShotProfile`,
`CrazyRushProfile`, …). La variedad/detalle de animaciones era uno de los
puntos fuertes que reseñaban los jugadores.

---

## 11. Impacto = evento discreto

```text
actor pose → actor travel → ║ HIT FRAME ║
   ├── target hurt
   ├── SFX
   ├── impacto gráfico
   ├── posible shake
   └── (posteriormente) HP
```

No asumir que `visual hit = sound = HP reduction` ocurren en el mismo frame.
El timeline ya separa `HIT_FRAME` / `APPLY_DAMAGE` (diseño correcto).

---

## 12. Beam / Kamehameha / energía

```text
TACTICAL → ACTION → atacante grande → POSE CHARGE → VFX carga → POSE FIRE
        → crear proyectil/beam → TRAVEL → objetivo → HIT/GUARD/AVOID/ABSORB
        → IMPACT/EXPLOSION → HP → TACTICAL
```

El proyectil forma parte de la secuencia (`BODY/HEAD/TRAIL/CONTACT/EXPLOSION`)
sincronizada con la pose de disparo. **No** una barra azul CSS atravesando.

Cámara de beam = cambios de composición (`SHOT_ATTACKER → PROJECTILE_SHOT →
SHOT_TARGET → IMPACT_SHOT → FIELD`), no `cameraTween(x,y,zoom,850ms)`.

---

## 13. Defensa / resultados

La defensa se decide **antes** de resolver visualmente el ataque. La película
representa el resultado posterior:

```text
HIT · BLOCK · AVOID · ABSORB · NULLIFY · …
```

- `Defend` (guard normal): sin cinematográfica independiente enorme; su valor se
  manifiesta al recibir el ataque enemigo (guard pose / block result).
- `Avoid` / `Absorb` / defensas especiales: **cambian la película del ataque**
  (evadir → MISS/pass; absorber → sin impacto convencional), no solo el cálculo.
  ⇒ `outcome` debe influir en el perfil cinematográfico.

---

## 14. Move (espacio táctico, NO escena de ataque)

```text
TACTICAL → DEFENSE → BASIC → MOVE → elegir eje → sprite OVERWORLD se desplaza
        → nueva posición → TACTICAL
```

Se mantiene el sprite pequeño: lo que se modifica es la **posición estratégica
del tablero** (air/ground × front/back).

---

## 15. Gather Power (importancia cinematográfica)

```text
TACTICAL → GATHER → presentación power-up → activar POWERED → TACTICAL POWERED
```

**Los sprites cambian en el overview tras Gather** (no es solo `powered=true`).
El plano táctico DEBE reflejar el estado `POWERED` visualmente, y éste persiste.
Gather habilita Limiteds y convierte Basic 3 Stage → 4 Stage.

---

## 16. Buffs / Supports

- **Buff sobre uno mismo**: `TACTICAL → ACTION_SOLO → fighter grande → pose/aura → TACTICAL` (Kaioken = este patrón).
- **Debuff/support sobre oponente**: `TACTICAL → presentación → target status → TACTICAL` (no todos necesitan animación de lucha).

---

## 17. Limited Attacks

Máxima personalidad por personaje. No `Limit = BeamProfile + otro color`.

```text
LIMIT SELECT → ACTION ENTRY → pose única → anticipación única → ataque único
            → proyectil/movimiento único → impacto único → resultado → FIELD
```

Perfiles propios: `kamehameha_goku`, `masenko_gohan`, `special_beam_cannon_piccolo`,
`spirit_bomb`, `final_flash`, … Los 5 vídeos "Special Attack Showcase" muestran
cuántas variantes merece documentar individualmente.

---

## 18. Cambio ATTACK ↔ DEFENSE

Tras la acción se regresa al master shot y cambia la fase (no se reinicia el
combate). El indicador `ATTACK/DEFENSE` del encabezado comunica la fase (no una
pantalla moderna "YOUR DEFENSE TURN!").

---

## 19. Ritmo cinematográfico real

```text
TACTICAL (pensar/seleccionar/posicionar)
   ↓
ACTION BURST (1–3 s, acción concentrada)
   ↓
TACTICAL
```

> **calma táctica → explosión breve de animación → calma táctica.**

---

## 20. HP / KO / Victoria

- `CONTACT_FRAME` (sprite hurt + VFX + SFX + hitstop) ≠ `DAMAGE_FRAME` (HP bar).
  No `HP -= damage` al empezar la animación.
- KO: terminar la película de la acción antes de resolver el flujo exterior.
  En equipo, si queda aliado entra automáticamente; `C` permite cambios manuales.
  PENDIENTE: pose/duración/fade/desaparición/timing de entrada del compañero.
- Victoria (Story): recompensa de cartas (elegir 1 de 3) — no aparecer antes de
  que concluya la película del último ataque.

---

## 21. Máquina de estados canónica

```text
PRE_BATTLE
   ↓
BATTLE_ENTRY
   ↓
TACTICAL_IDLE
   ├──────────────────────────────┐
   ▼                              ▼
COMMAND_SELECT                DEFENSE_SELECT
   └──────────────┬───────────────┘
                  ▼
             ACTION_ENTRY
   ┌──────────────┼────────────────┐
   ▼              ▼                ▼
QTE_STAGE     ACTION_SOLO      ACTION_DUEL
   │              │                │
   │              │          ┌─────┴─────┐
   │              │          ▼           ▼
   │              │        MELEE      PROJECTILE
   └──────────────┴──────────┴─────┬─────┘
                                   ▼
                                IMPACT
                                   ▼
                              RESOLUTION
                        ┌──────────┴──────────┐
                        ▼                     ▼
                   FIELD_RETURN               KO
                        │                     │
                        ▼                     ▼
                  TACTICAL_IDLE        TEAM_SWAP / END
```

---

## 22. Capas de Pixi

```text
BattleRenderer
├── HUD Layer
├── TacticalScene   (scenarioOverview · playerOverworld · enemyOverworld · tacticalStatusFX)
├── ActionScene     (scenarioAction · actor · target · projectile · aura · impact)
├── SpecialActionScene
├── TransitionLayer
└── QteLayer
```

Todo cuelga del MISMO `BattleTimeline` a **59.72750056960583 Hz** (no timers
independientes).

---

## 23. Corrección sobre los perfiles provisionales

Los números actuales (`beam: attacker 54f / travel 54f / target 44f`,
`damage: attacker 50f / travel 44f / target 38f`) **sirvieron para estructurar
el motor, pero NO son canon**. El runtime ya usa perfiles declarativos por carta
en `src/battle/actionProfiles.ts`; cualquier medición forense nueva debe entrar
ahí como datos del perfil, no como ramas especiales en el renderer. El formato
final debe seguir siendo por-acción:

```yaml
action: cont_punch
entry: { source: TACTICAL, destination: ACTION_DUEL }
actor:  { frame_0: idle, frame_?: anticipation, frame_?: rush, frame_?: punch_1, frame_?: punch_2, frame_?: punch_3 }
target: { frame_0: idle, frame_?: hurt_1, frame_?: hurt_2 }
impact: { contact_frame: ?, sfx_frame: ?, hp_frame: ?, hitstop: ? }
return: { recovery_frame: ?, tactical_frame: ? }
```

```yaml
action: kamehameha
actor:      { charge_start: ?, charge_pose_frames: [...], release_frame: ? }
projectile: { spawn_frame: ?, start_x: ?, end_x: ?, contact_frame: ? }
target:     { react_frame: ? }
impact:     { explosion_frames: [...] }
damage:     { hp_frame: ? }
return:     { tactical_frame: ? }
```

Contrato actual:

- `ACTION_PROFILE_REGISTRY` resuelve perfiles firma por slug de carta.
- `compileActionProfile()` convierte specs a eventos de `BattleTimeline`.
- `profileFor(kind, cardName)` usa el perfil firma si existe y solo cae al
  fallback genérico para acciones todavía no perfiladas.
- `actionSemanticsForCard()` conecta la carta con su animación (`stage`, `melee`,
  `beam`, `support`) y visual (`ray`, `wave`, `ball`, `disk`, `sword`, `special`).
- `npm run verify:profiles` falla si hay ids/slugs duplicados o si una carta BEAM
  real no tiene perfil firma explícito.

Ver también `docs/COMBAT_ACTION_PIPELINE.md`.

---

## 24. CONFIRMADO vs PENDIENTE

| Elemento | Estado |
|---|---|
| Vista táctica con sprites pequeños | **CONFIRMADO** |
| HUD HP/nombres ATTACK-DEFENSE | **CONFIRMADO** |
| Pantalla de luchadores previa | **CONFIRMADO** |
| Selección de cartas/comandos | **CONFIRMADO** |
| Sprites grandes durante acciones | **CONFIRMADO** |
| Animaciones específicas por ataque | **CONFIRMADO** |
| Táctica → acción → táctica | **CONFIRMADO** (estructural) |
| Stage 3/4/5/6 inputs | **CONFIRMADO** |
| Tiempo Stage dependiente de distancia | **CONFIRMADO** |
| Stage fail A/B | **CONFIRMADO** |
| Gather cambia estado visual del overview | **CONFIRMADO** |
| Move pertenece a defensa | **CONFIRMADO** |
| Defensa se decide antes de resolución | **CONFIRMADO** |
| Frame exacto de entrada de batalla | **PENDIENTE** |
| Tipo exacto de wipe/cut inicial | **PENDIENTE** |
| Frame exacto de cada pose | **PENDIENTE** |
| Frame del SFX de impacto | **PENDIENTE** |
| Frame exacto de HP | **PENDIENTE** |
| Hitstop exacto | **PENDIENTE** |
| Timing exacto de FIELD_RETURN | **PENDIENTE** |
| KO/team swap frame exacto | **PENDIENTE** |

---

## 25. Lo que NO hacer en el remake

No convertir LSW en animaciones modernas continuas. Evitar gratis: zoom 3D
constante, camera pan continuo, motion blur, sprites interpolados, tweens entre
todos los planos, fondos deformados, partículas por todas partes, slow motion
moderno constante.

La adaptación moderna debe mejorar: presentación 16:9, composición, limpieza,
parallax MUY sutil, impacto, shake, flash, transiciones, audio, VFX. Pero
conservar: CUTS, sprites GBC, frames GBC, poses, timing, master shot táctico,
action shots, hitstop, return to field.

---

## 26. La regla definitiva

> **El plano táctico muestra el estado real del combate; el plano de acción
> muestra temporalmente la dramatización de la acción elegida; ninguna
> cinematográfica sustituye el estado táctico y siempre se regresa a él después
> de resolver la acción.**

```text
GAME STATE ──verdad──▶ TACTICAL SCENE ──acción──▶ CINEMATIC PROJECTION
     ▲                                              │ resultado
     └──────────────── TACTICAL SCENE ◀─────────────┘
```

**`ActionScene` no es el combate: es la película temporal de algo que ocurre
dentro del combate.**

---

## Siguiente paso para el "exactamente" literal

Segunda pasada forense sobre la ROM USA de referencia, grabando una batalla
completa sin cortes y midiendo: PRE-BATTLE → primer frame Tactical → aparición
ATTACK → abrir B → 3 Stage → primer frame Action → primer frame PUSH → QTE →
último input → primer movimiento → cada pose → contact → SFX → HP → recovery →
Tactical → cambio Defense → Guard → ataque enemigo → Tactical → siguiente
Attack → KO → Result. Luego repetir con Cont. Punch / Beam / Gather / Move /
Guard / Avoid / Support / Limit / transformación / KO / team swap. Con el
`BattleTimeline` + Pixi ya construidos, esos datos se convierten directamente
en ticks GBC.
