# GBC Action Fidelity Pass — Fichas forenses de acciones

Cada acción del combate se documenta en FRAMES (no ms). Conversión runtime:
`seconds = frames / 60` (ORIGINAL_TARGET_FPS del GBC).

Niveles de fidelidad:
- `PLACEHOLDER` — provisional sin datos del original
- `INFERRED` — deducido de manuales/guías/comunidad (no frame-exacto)
- `VERIFIED` — confirmado por captura (tolerancia amplia)
- `FRAME_VERIFIED` — medido frame a frame contra el original

Campos con `UNKNOWN` = sin medir todavía. **Ninguna acción es CANONICAL
hasta tener todos los campos del criterio de aceptación.**

---

## Plantilla CANONICAL (criterio de aceptación)

Una acción es CANONICAL solo cuando se conoce: fondo ✓, sprites/poses ✓,
orden exacto de poses ✓, momento de aparición del HUD ✓, inputs ✓, ventanas
temporales ✓, movimiento del atacante ✓, reacción del defensor ✓, frame de
impacto ✓, momento de modificación de HP ✓, CC obtenido/gastado ✓, sonido ✓,
VFX ✓, duración final ✓, comportamiento ante fallo ✓, ante defensa ✓, y
forma de regreso a la vista táctica ✓.

---

## 1. 3 Stage Attack

```yaml
action: 3_stage_attack
fidelity: INFERRED          # → objetivo: FRAME_VERIFIED (primer caso a medir)

entry:
  source_view: tactical
  transition: cut           # CONFIRMED (fondo cambia: overview → action)
  destination_view: action

background:
  type: scenario_action     # battle_action del MISMO escenario

attacker:
  start_pose: idle          # INFERRED (la pose exacta depende de la captura)
  start_x: UNKNOWN
  start_y: UNKNOWN

qte:
  input_count: 3            # CONFIRMED_MANUAL
  prompt_delay_frames: UNKNOWN
  max_time_frames: UNKNOWN  # depende de distancia (CONFIRMED: la ventana
                            # varía con la distancia entre combatientes)
  timeout_behavior: PARTIAL # CONFIRMED (conserva CC de etapas completadas)
  wrong_input_behavior: RECOVERY  # CONFIRMED (B=reparar, A=abandonar)
  recovery_behavior: "B → continuar cadena · A → abandonar conservando CC"
  cc_per_input: 1           # CONFIRMED_MANUAL (+1 CC por input)

sequence:
  - frame: 0
    event: action_start
  - frame: UNKNOWN
    event: push_visible     # etiqueta PUSH (CONFIRMED en comercial)
  - frame: UNKNOWN
    event: first_input_enabled
  - input: success
    animation: avance/pose del atacante   # INFERRED
    cc_gain: 1

impact:
  hit_frame: UNKNOWN
  hitstop_frames: UNKNOWN
  defender_reaction: UNKNOWN

exit:
  duration_frames: UNKNOWN
  transition: cut           # CONFIRMED (action → overview)
  restore_tactical_position: true   # CONFIRMED (posición lógica independiente)
```

**Notas**: el prototipo vs comercial añade sonido de movimiento durante el
Stage Attack y temporizador usado/máximo (Hidden Palace). Pendiente captura.

---

## 2. 4 Stage Attack

```yaml
action: 4_stage_attack
fidelity: INFERRED
qte:
  input_count: 4            # CONFIRMED_MANUAL
  # El BASIC 4 Stage solo disponible con Gather Power (CONFIRMED_MANUAL)
# Resto de campos: igual estructura que 3_stage_attack, UNKNOWN pendiente
```

## 3. 5 Stage Attack

```yaml
action: 5_stage_attack
fidelity: INFERRED
qte:
  input_count: 5            # CONFIRMED_MANUAL
```

## 4. 6 Stage Attack

```yaml
action: 6_stage_attack
fidelity: INFERRED
qte:
  input_count: 6            # CONFIRMED_MANUAL
  # Se desbloquea al completar Story Mode (CONFIRMED_MANUAL)
```

## 5. Damage físico

```yaml
action: damage
fidelity: INFERRED
entry:
  source_view: tactical
  transition: cut
  destination_view: action
background:
  type: scenario_action
sequence:
  - selección → pagar CC → ACTION_VIEW → sprite grande atacante
  - aproximación (lunge) → animación específica → contacto
  - reacción del defensor: hit/guard/avoid
damage_formula: "(power + move) × posMult × block"   # COMMUNITY_TESTED
  power: STR para Damage                             # CONFIRMED_MANUAL
  pos_mult: front+vulnerable 0.8, resto 0.5          # COMMUNITY_TESTED
  block_defend: 0.5                                  # COMMUNITY_TESTED
  guard_card: 0.7                                    # COMMUNITY_TESTED
frames: UNKNOWN (startup/active/recovery/hitstop)
```

## 6. Beam

```yaml
action: beam
fidelity: INFERRED
sequence:
  - ACTION_VIEW → pose de carga → VFX energía → pose disparo
  - proyectil/beam → defensa → impact/avoid/absorb → HP → return
power: KI                                               # CONFIRMED_MANUAL
# división charge/fire de los frames del sheet: 50/50 (HYPOTHESIS)
frames: UNKNOWN
```

## 7. Gather Power

```yaml
action: gather_power
fidelity: INFERRED
effects:
  powered: true             # CONFIRMED_MANUAL (habilita Limits, 2 turnos)
  basic_3_stage_to_4: true  # CONFIRMED_MANUAL
  str_bonus: 4              # COMMUNITY_TESTED
  ki_bonus: 4               # COMMUNITY_TESTED
sequence:
  - ACTION_VIEW → sprite grande → pose carga → aura/VFX → powered=true → return
frames: UNKNOWN (duración de la pose, decremento de powered)
```

## 8. Guard

```yaml
action: guard
fidelity: INFERRED
behavior:
  defense_mode: GUARD (temporal, se resetea tras la acción enemiga)
  outcomes: HIT | BLOCK | AVOID
  block_damage: 0.25        # COMMUNITY_TESTED
  avoid_chance: "0.05 + (SPD−25)×0.004 + (100−ACC)×0.002"  # HYPOTHESIS
frames: UNKNOWN
```

## 9. Move

```yaml
action: move
fidelity: INFERRED
positions: front/back + ground/air    # CONFIRMED_MANUAL
effect: cambia la posición lógica (persiste entre vistas)
# multiplicadores de posición: HYPOTHESIS (0.8/0.5 COMMUNITY_TESTED)
frames: UNKNOWN
```

## 10. Avoid / esquiva

```yaml
action: avoid
fidelity: INFERRED
cards: Afterimage (+30% evasión 2 turnos)   # HYPOTHESIS (efecto CONFIRMED)
outcome: AVOID (0 daño)
frames: UNKNOWN
```

## 11. Support

```yaml
action: support
fidelity: INFERRED
usable: "Ataque y Defensa"    # CONFIRMED_MANUAL
effects: curación, buffs/debuffs ±8, escudos, etc.  # CONFIRMED_MANUAL
frames: UNKNOWN
```

## 12. Limit

```yaml
action: limit
fidelity: INFERRED
rules:
  max_per_character: 3       # CONFIRMED_MANUAL (2 para androides 19/20)
  reusable: true (con CC suficiente)
  requires_powered: true     # CONFIRMED_MANUAL (tras Gather Power)
frames: UNKNOWN
```

## 13. KO

```yaml
action: ko
fidelity: INFERRED
behavior:
  hp_0: victoria/derrota
  2v2: relevo automático (reserva entra con HP completo)  # HYPOTHESIS timing
frames: UNKNOWN
```

## 14. Change Character

```yaml
action: change_character
fidelity: INFERRED
behavior:
  command: CHARA (solo en combates de equipo)   # CONFIRMED_MANUAL
  consumes_action: true                          # CONFIRMED_MANUAL
frames: UNKNOWN
```

## 15. Cambio ATTACK → DEFENSE

```yaml
action: phase_attack_defense
fidelity: PLACEHOLDER
# El comercial tiene presentación de Turn change con sonido propio (Hidden
# Palace). Pendiente: transición explícita de fase.
frames: UNKNOWN
```

## 16. Cambio DEFENSE → ATTACK

```yaml
action: phase_defense_attack
fidelity: PLACEHOLDER
# Idem: sonido distinto al entrar en fases Attack/Defense (Hidden Palace).
frames: UNKNOWN
```

---

## Registro de fidelidad (runtime)

`src/data/actionFidelity.ts` exporta `ACTION_FIDELITY_REGISTRY` con el estado
de las 16 acciones y el enum `FidelityLevel`.

## Pipeline de captura (siguiente paso)

1. Emular el GBC (mGBA/gambatte) con la ROM USA (CRC32 025AA88A)
2. Grabar en frames (60 fps) cada acción: 3 Stage, 6 Stage, Damage, Beam,
   Gather, Avoid, Move, Limit
3. Extraer: fondo usado, poses exactas (del sheet), frame de impacto,
   ventanas de input, HUD, sonidos
4. Completar las fichas → FRAME_VERIFIED
5. El 3 Stage Attack es el patrón inicial (reconstrucción completa
   principio a fin) y sirve de plantilla para 4/5/6 Stage

---

## ⚠️ CORRECCIÓN DE TEMPORIZACIÓN (importante)

El GBC **NO refresca a 60 Hz exactos**: `4.194.304 Hz / 70.224 dots = 59.72750056960583 Hz`.

```ts
GBC_NATIVE_FPS = 59.72750056960583;  // frames nativos del GBC
CAPTURE_FPS    = 60;                  // solo para vídeo de captura
```

- Los datos canónicos se almacenan en **frames GBC** (`FrameTiming { gbcFrames }`), nunca en segundos como unidad principal.
- `gbcFramesToSeconds(frames) = frames / GBC_NATIVE_FPS` (solo runtime/presentación).
- **GBC FRAME ≠ VIDEO CAPTURE FRAME**: al capturar a 60fps hay deriva (~0.45% — importante en secuencias de 100-300 frames).
- Conversión captura→nativo: `gbcFrame = captureFrame * (60 / 59.7275)`.

---

## Objetivo exclusivo actual: 3 Stage Attack FRAME_VERIFIED

**No avanzar a 4/5/6 Stage ni a Beam/Damage/Limit hasta completar este caso.**

### Registro canónico objetivo

```yaml
action: 3_stage_attack
fidelity: FRAME_VERIFIED

capture:
  gbc_native_hz: 59.72750056960583
  capture_fps: 60
  emulator: ...
  rom:
    region: USA
    crc32: 025AA88A

entry:
  tactical_last_frame: 0
  action_background_first_frame: 1

hud:
  push_first_visible_frame: ...
  timer_first_visible_frame: ...
  prompt_first_visible_frame: ...

attacker:
  initial_pose: ...
  initial_x: ...
  initial_y: ...

qte:
  input_count: 3

  input_1:
    enabled_frame: ...
    success_frame: ...
    pose_after_success: ...
    cc_after_success: ...

  input_2:
    enabled_frame: ...
    success_frame: ...
    pose_after_success: ...
    cc_after_success: ...

  input_3:
    enabled_frame: ...
    success_frame: ...
    pose_after_success: ...
    cc_after_success: ...

impact:
  contact_frame: ...
  defender_reaction_frame: ...
  hp_change_frame: ...
  hitstop_frames: ...

exit:
  action_last_frame: ...
  tactical_first_frame: ...
```

### Capturas necesarias (12 ejecuciones)

| # | Escenario | Objetivo |
|---|---|---|
| 1 | Éxito perfecto | frames de referencia de la secuencia completa |
| 2 | Fallo en input 1 | ventana, pausa de fallo, recovery |
| 3 | Fallo en input 2 | idem en etapa intermedia |
| 4 | Fallo en input 3 | idem en etapa final |
| 5 | Recuperación tras fallo (B) | ventana de recovery, continuación |
| 6 | Abandono tras fallo (A) | conservación de CC parcial |
| 7 | Distancia corta | ventana de input máxima |
| 8 | Distancia larga | ventana de input mínima |
| 9 | Defensor en suelo | variantes de posición |
| 10 | Defensor en aire | variantes de posición |
| 11 | Defensa normal | resultado BLOCK/HIT |
| 12 | Defensa que interrumpe/esquiva | Foresight/Avoid si aplica |

### Tres timelines simultáneos (no medir solo la animación)

```
VISUAL:   sprite, fondo, HUD, VFX
GAMEPLAY: CC, HP, posición, estado, resultado
AUDIO:    SFX inicio, impacto, transición

Ejemplo real posible:
  frame 83 → contacto visual
  frame 84 → SFX impacto
  frame 87 → HP actualizado
```

### Evidencia trazable

Cada número canónico lleva `FidelityEvidence`:
```ts
{ status: 'CONFIRMED', captureId: '3stage_success_close_01', gbcFrameRange: [126, 129] }
```
`FRAME_VERIFIED` = cada valor rastreable a una captura concreta.

### Variables a descubrir (patrón de implementación)

Durante la captura probablemente aparecerán variables no previstas en
`ActionDefinition`, por ejemplo:
`prePromptFrames, inputGraceFrames, failurePauseFrames, recoveryWindowFrames,
postSuccessFrames, attackerStepFrames, cameraHoldFrames, resultHoldFrames`.

**Regla**: descubrirlas con UNA acción completamente estudiada, y solo
entonces extender las 16 definiciones.
