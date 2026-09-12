# B7A — Auditoría: `DEFENDER_ACTION` como autoridad visual

> Conducido por el runtime real (`scripts/audit-defender-action.ts`). Reproducible:
> `npx tsx scripts/audit-defender-action.ts`

## Conclusión estructural

**`DEFENDER_ACTION` no gobierna ninguna ruta ROM.** En las 7 rutas auditadas:
`DEFENDER_ACTION como autoridad: no`.

Las rutas ROM usan el contrato B5/B6:

```
TACTICAL_TO_ACTION → ACTION_READY → RESTORE_TACTICAL
```

`DEFENDER_ACTION` vive **solo** en el path LEGACY (`buildTimeline.ts` +
`ActionScene.applySceneVisibility()`). Es decir: el "plano del defensor" ROM ya
**no** se decide por una escena especial — emerge de las cues de visibilidad y
del programa de ActionObjects.

## Datos por ruta

| ruta | escenas | visibilidad | primer físico | ticks |
|---|---|---|---|---|
| hit normal / STANDARD_DAMAGE (`5`) | TACTICAL_TO_ACTION · ACTION_READY · RESTORE_TACTICAL | `player:on, enemy:off, enemy:on` | 45t slot0, 89 frames | 0–302 |
| MISS / AVOID (`5`, seed 1) | idem | idem | 45t slot0, 73 frames | 0–300 |
| Beam Energy Wave (`7`) | TACTICAL_TO_ACTION · ACTION_READY | idem | 17t slot0, 7 frames | 0–70 |
| Beam Energy Bomb (`8`) | TACTICAL_TO_ACTION · ACTION_READY · RESTORE_TACTICAL | idem | 0t slot0, 7 frames | 0–88 |
| Stage 3 etapas (`1`) | — | `player:on, enemy:off` | — | 0–48 |
| Stage 6 etapas (`4`) | — | `player:on, enemy:off` | — | 0–48 |
| Special (`23`) | — | — | — | 0–250 (BG `$19`, pal t4/t8/t57/t250) |

Eventos de combate observados: `ACTION_STARTED`, `ATTACK_HIT`/`ATTACK_MISSED`,
`DAMAGE_APPLIED`, `POSITION_CHANGED`, `ACTION_RESOLVED`. Stage emite
`STAGE_PREP_STARTED` + `PHASE_CHANGED` (sin escena de acción).

## Contexto ROM de slots (ya verificado)

`src/battle/romActionObject.ts` (ROM_STATIC_VERIFIED) — la convención **no** es
`slot0 = player`:

```
£6708 OFFENSE          slot0 = ACTOR_ATTACKER    slot1 = TARGET_DEFENDER
£6750 DEFENSE_REACTION slot0 = DEFENDER          slot1 = ATTACKER
```

## Huecos detectados (entrada de B7B)

1. **`ACTION_OBJECT_BIND` no se emite.** En las 7 rutas: `slots (bind): —`. La
   convención OFFENSE/DEFENSE_REACTION está verificada en el SSOT pero **no se
   declara como cue ni se consume** en la presentación. La visibilidad que sí
   llega es por **lado** (`player`/`enemy`), no por slot.
2. **Draw order fijo.** Todas las rutas emiten `SLOT_0_THEN_1`. Hay que
   demostrar que es orden de pintado ROM y **no** una suposición de ownership.
3. **La visibilidad del defensor no depende del binding.** El patrón
   `enemy:off → enemy:on` viene de cues `FIGHTER_VISIBILITY` por lado; la
   reacción defensiva (DEFENSE_REACTION) no participa en esa decisión.
4. **LEGACY sigue siendo autoridad.** `ActionScene.applySceneVisibility()` y
   `PixiBattlePresentation` ramifican por `scene === 'DEFENDER_ACTION'`; eso es
   lo que B7B elimina como fuente de verdad.

## Objetivo de B7B (derivado)

Que la composición del plano defensivo salga de:

```
binding ROM (OFFENSE/DEFENSE_REACTION) → slot
  → visibilidad (por slot, no por lado)
  → physicalId
  → posición / draw order
  → BG/display + palette
  → entry/exit boundary (B5/B6)
```

sin que ninguna rama `scene === 'DEFENDER_ACTION'` decida nada.
