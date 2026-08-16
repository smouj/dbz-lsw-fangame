# SPRITE TAXONOMY — Diccionario canónico de sprites (DBZ LSW Fangame)

> Regla estricta del proyecto (2026-08-15, a partir de auditoría de las sheets
> originales GBC: Goku SSJ/SSJ3, Piccolo, Vegeta, etc.)

## 1. Cuatro conceptos separados (NUNCA mezclar)

| Concepto | Qué es | Ejemplos |
|----------|--------|----------|
| **ACCIÓN** | Lo que hace el jugador | `gather_power`, `guard`, `move`, `stage_attack`, `kamehameha`, `atomic_break` |
| **ESTADO** | Condición lógica | `idle`, `powered_up`, `guarding`, `hurt`, `stunned`, `knocked_down` |
| **FRAME** | Una imagen concreta | `gather_power_pose`, `hurt_knockback`, `beam_cast_release` |
| **EFECTO (FX)** | Algo que NO forma parte anatómica del personaje | `gather_power_aura`, `speed_lines_horizontal`, `beam_projectile`, `hit_spark`, `explosion` |

Regla: **cada PNG responde a una sola pregunta: "¿qué gráfico es físicamente?"**.
Los nombres semánticos de acciones van en el `animations.json`, NO en el PNG.

## 2. Familias de frames (de las sheets originales)

| Sheet original | ID interno |
|----------------|------------|
| Idle | `idle` |
| Moving | `movement` |
| Guard | `guard` |
| Hitting forwards | `melee_forward` |
| Hitting up/down | `melee_vertical` |
| Hurt | `hurt` |
| Beams | `beam_cast` |
| Battle Overworld | `battle_overworld` |
| Unused | `_unused` |

Estas son **familias de frames**, no animaciones finales.

## 3. Battle Overworld — estructura correcta

**NO** es un único sprite: es un grupo de 3 gráficos:
1. `actor/000_idle.png` — pose normal de pie
2. `actor/001_gather_power_pose.png` — brazos levantados, cuerpo tenso (la acción `Gather Power`)
3. `effects/000_gather_power_aura.png` — destello/aura de energía grande (FX, no frame del actor)

```
battle_overworld/
  actor/
   000_idle.png
   001_gather_power_pose.png
  effects/
   000_gather_power_aura.png
```

La animación `battle_overworld_gather_power` combina:

```
TACTICAL_IDLE
  actor: battle_overworld_idle
    ↓  input: GATHER POWER
  actor: battle_overworld_gather_power_pose
    ↓
  actor: battle_overworld_gather_power_pose
  fx:    battle_overworld_gather_power_aura
    ↓
  POWERED_UP = true
    ↓
TACTICAL_IDLE
```

⚠️ El aura NO es otro frame del personaje: es una **capa FX** sobre la pose.

## 4. Vocabulario de frames comunes

### Tactical / Battle Overworld
- `battle_overworld_idle`
- `battle_overworld_gather_power_pose`
- FX: `battle_overworld_gather_power_aura`

### Detailed Battle Actor
- `idle_neutral`
- `movement_00...`
- `guard_00...`
- `melee_forward_00...`
- `melee_vertical_00...`
- `hurt_00...`
- `beam_cast_00...`

### Common FX
- `speed_lines_horizontal`, `speed_lines_vertical`
- `gather_power_aura`
- `melee_hit_spark`
- `ki_charge`, `ki_muzzle`, `ki_projectile`, `beam`, `beam_impact`, `energy_explosion`
- `barrier`, `teleport`, `shockwave`, `screen_flash`

## 5. Nomenclatura de archivos (por nivel de certeza)

| Nivel | Qué sabemos | Nombre |
|-------|-------------|--------|
| 1. Sheet | "Hitting forwards" es inequívoco | `003_melee_forward.png` |
| 2. Visual | "frame 4 parece una patada" | `003_melee_forward.png` + `{"semantic": "kick_forward"}` |
| 3. Ejecución | "frame 4 = 2º impacto del Stage Attack" | `003_melee_forward.png` + `{"semantic": "kick_forward", "verifiedUsage": ["stage_attack"]}` |

⚠️ **No renombrar el PNG con semántica no verificada.** Si Goku usa `beam_cast_02..04`
para Kamehameha, NO copiar a `kamehameha_01.png`; el timeline lo referencia:

```json
{
  "id": "kamehameha",
  "actor": ["beam_cast_02", "beam_cast_03", "beam_cast_04"]
}
```

Así Super Kamehameha reutiliza poses sin duplicar PNGs.

## 6. `gather_power` ≠ `powered_up`

```
ACTION:  GATHER_POWER
   ↓
ANIMATION: battle_overworld_gather_power
   ↓
STATE:   POWERED_UP
```

- `gather_power` = acción/animación
- `powered_up` = estado resultante
- Si el juego mantiene al personaje normal tras cargar: `powered_up=true, actor=battle_overworld_idle`

## 7. Nombres de animaciones (timelines, sí semánticos)

```
battle_overworld_idle
battle_overworld_gather_power

battle_idle
battle_move
battle_guard

stage_attack
continuous_punch
continuous_kick

energy_wave
energy_bomb

kamehameha
super_kamehameha
masenko
galick_gun
final_flash
special_beam_cannon
...
```

Estos nombres pertenecen al **timeline**, no al PNG.

## 8. Modelo completo

```
CARD / BASIC ACTION
  │
  ▼
ACTION TIMELINE
  ├── actor frames
  ├── enemy frames
  ├── FX
  ├── movement
  ├── background/camera
  └── timing
```

Ejemplo `GATHER POWER`:
```
Scene:   tactical
Actor:   battle_overworld_idle → battle_overworld_gather_power_pose
FX:      gather_power_aura
Result:  powered_up = true
```

## 9. Clips funcionales comunes (9 familias mínimas)

### Vista táctica
1. `battle_overworld_idle`
2. `battle_overworld_gather_power`

### Vista de acción
3. `idle`
4. `movement`
5. `guard`
6. `melee_forward`
7. `melee_vertical`
8. `hurt`
9. `beam_cast`

+ FX: `speed_lines_horizontal`, `speed_lines_vertical`, `gather_power_aura`

## 9b. Poses del manifest de combate (implementación actual)

Cada forma del proyecto (`public/assets/sprites/<dir>/manifest.json`) expone
estas poses consumidas por FighterActor/AtlasLoader:

| Pose | Contenido | Frames típicos |
|------|-----------|----------------|
| `idle` | pose neutral | 1 |
| `move_front` / `move_back` | andar (back = espejo en runtime) | 2 |
| `guard` | bloqueando/parando | 3 |
| `attack_fwd` | golpe frontal | 8 |
| `attack_ud` | golpe vertical | 4 |
| `hurt` | recibiendo daño | 6 |
| `beam_charge` | cargando ki | 4 |
| `beam_fire` | disparando | 5 |
| `beam_ray` | **RAYO real (V6): haz horizontal que se extiende** | 1-3 |
| `beam_ray_tip` | cabeza del rayo (energía azul; opcional) | 1-2 |
| `gather_power` | preparación común antes de acción | opcional |
| `power_up` | aura / transformación / buff | opcional |

`beam_ray`/`beam_ray_tip` se añadieron en 2026-08-15 (48/48 formas con rayo,
44/48 con tip — goten/nappa/recoome no tienen cabeza separable). El renderer
los usa en modo stretch GBC: el rayo se extiende desde el personaje hacia el
rival (ancho = f(progress), posición fija en el actor).

La tabla de poses y fallbacks vive en `src/battle/spriteConfig.ts`. Runtime
React, runtime Pixi y Dev Studio deben importar `resolveCombatPose()` en vez de
mantener listas locales duplicadas.

## 10. Excepciones por personaje (técnicas específicas)

Todos cumplen el contrato base; las técnicas únicas se mapean individualmente:

- Goku: `spirit_bomb`
- Kid Gohan: `tail` / `oozaru`
- Ginyu: `body_change`
- Guldo: `time_freeze`, `telekinesis`
- Android 16: `rocket_punch`, `hell_flash`
- Android 17: `barrier`
- Cell: `resurrection`
- Buu: `sweet_beam`, `flesh_guard`
- Vegito: `atomic_break`, `flash_sword`

## 11. Estructura de directorios objetivo

```
characters/
└── goku/
    └── super_saiyan/
        ├── battle_overworld/
        │   ├── actor/
        │   │   ├── 000_idle.png
        │   │   └── 001_gather_power_pose.png
        │   └── effects/
        │       └── 000_gather_power_aura.png
        ├── battle/
        │   ├── idle/        (000_idle_neutral.png)
        │   ├── movement/    (000..002)
        │   ├── guard/       (000..002)
        │   ├── melee_forward/
        │   ├── melee_vertical/
        │   ├── hurt/
        │   └── beam_cast/
        ├── effects/
        │   ├── speed_lines_horizontal.png
        │   └── speed_lines_vertical.png
        └── animations.json
```

## 12. `animations.json` (timelines, sin tiempos inventados)

```json
{
  "battle_overworld_idle": {
    "scene": "tactical",
    "actor": ["battle_overworld/actor/000_idle.png"],
    "loop": true
  },
  "battle_overworld_gather_power": {
    "scene": "tactical",
    "sequence": [
      { "actor": "battle_overworld/actor/000_idle.png" },
      { "actor": "battle_overworld/actor/001_gather_power_pose.png" },
      { "actor": "battle_overworld/actor/001_gather_power_pose.png",
        "fx": "battle_overworld/effects/000_gather_power_aura.png" }
    ],
    "resultState": "powered_up"
  }
}
```

Los tiempos se medirán contra gameplay/ROM, no inventados.

---

*Fuentes: RPGClassics (Battle System — action "Gather Power"),
GameFAQs (Character Guide — técnicas por personaje), auditoría visual de las
sheets originales GBC (Goku SSJ/SSJ3, Piccolo, Vegeta).*
