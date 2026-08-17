# DBZ LSW — Cumplimiento de la Especificación de Frames y Acciones V1

_Informe de contraste: `docs/DBZ_LSW_ESPECIFICACION_FRAMES_ACCIONES_V1.md` vs estado actual del código (2026-08-17)._

## Resumen

| Área | Estado |
|---|---|
| Reloj GBC único | ✅ Implementado |
| Vistas TACTICAL_FIELD / ACTION_SOLO / DUEL / PROJECTILE / IMPACT | ✅ Implementado |
| Naming Gather Power (pose/aura separados) | ✅ Implementado |
| Estados espaciales air/ground × front/back | ✅ Implementado (aliasing) |
| Eventos de timeline semánticos | ✅ Implementado (aliasing) |
| Stage Attack ventanas 1.2/1.7/2.4/2.9 s | ✅ Implementado (ticks 72/102/143/173) |
| CinematicProfile + tracks | ✅ Implementado |
| Metadata por frame (pivot/hitbox/attachPoints/evidence) | ⚠️ Parcial (gaps) |
| Plantillas cinematográficas T01–T12 | ⚠️ Parcial (equivalente funcional, sin IDs) |
| Estados `powered_up`, `guarding`, etc. | ⚠️ Parcial |
| Estructura de carpetas spec | ℹ️ Diferente (equivalente funcional) |

## Detalle

### ✅ 1. Reloj único — GBC_NATIVE_FPS
`src/battle/timeline.ts:22` → `GBC_FPS = 59.72750056960583`. Único reloj: `BattleTimeline` con `requestAnimationFrame` + `battleTick`. Coincide con la spec (59.7275005696). No se usan `setInterval`/CSS animation para la lógica.

### ✅ 2. Vistas separadas
`src/renderer/pixi/presentation/BattlePresentation.ts` define `BattleScene`:
`ACTION_SOLO` (un personaje grande: Gather/support) · `ACTION_DUEL` (ambos: melee/guard/stage) · `PROJECTILE` (beam: release→travel→contact) · `IMPACT` (golpe/explosión/block).
`SceneDirector.ts` coordina FIELD ↔ ACTION. Flujo TACTICAL_FIELD → ACTION → HIT|MISS|BLOCK|AVOID → FIELD_RETURN implementado.

### ✅ 3. Gather Power — naming canónico
El runtime separa estrictamente pose corporal y efecto (spec §7.1):
- `actor/001_gather_power_pose.png` → `battle_overworld_gather_power_pose` (brazos arriba)
- `effects/000_gather_power_aura.png` → `battle_overworld_gather_power_aura` (FX, NO actor)
`src/data/battleOverworld.ts` + `src/main.tsx` (fases A/B/C: pose → pose+aura parpadeante).
**No** se llama `power`/`charge`/`power_up_frame` ✓ (la pose de combate `power_up` es otra cosa: transformación con aura en el catálogo V9).

### ✅ 4. Estados espaciales
`BattlePosition` (enum en `src/battle/`): 4 estados = air/ground × front/back.
⚠️ Nombres del proyecto: `UP_BACK/UP_FRONT/DOWN_BACK/DOWN_FRONT` (spec: `air_back/air_front/ground_back/ground_front`) — mismo conjunto, aliasing documentado en `docs/` (combat-mechanics). Movimiento por un solo eje (horizontal/vertical) implementado en `stageInputMap.ts`.

### ✅ 5. Eventos de timeline
`src/battle/timeline.ts` — `CinematicEventType`:
`SHOT` (cambio de plano) · `ACTOR_POSE`/`TARGET_POSE` · `RUSH` · `PROJECTILE` (spawn/avanzar/desvanecer) · `HIT_FRAME` (contacto exacto) · `APPLY_DAMAGE` (resolve) · `SFX` · `CAMERA` · `MESSAGE` · `FIELD_RETURN` (return_to_field) · `COMPLETE`.

Correspondencia con la spec §10:

| Spec | Código |
|---|---|
| `contact` / `guard_contact` | `HIT_FRAME` |
| `projectile_spawn` | `PROJECTILE` (crear) |
| `resolve` | `APPLY_DAMAGE` |
| `return_to_field` | `FIELD_RETURN` |
| `charge_start` | `ACTOR_POSE` (pose charge) + `PROJECTILE` |
| `ko_confirmed` | tras `APPLY_DAMAGE` + `COMPLETE` (no evento dedicado) |

### ✅ 6. Stage Attack — ventanas
`src/data/actionFidelity.ts:91`: `BACK_BACK=72 · BACK_FRONT=102 · FRONT_BACK=143 · FRONT_FRONT=173` ticks.
72/59.7275 = 1.205 s · 102 = 1.708 s · 143 = 2.394 s · 173 = 2.896 s → **coinciden con 1.2 / 1.7 / 2.4 / 2.9 s** de la spec §12. Ventana global (no por botón), pose neutral durante inputs, secuencia de N entradas: implementado (`stageInputMap.ts`, `stageSequences.ts`, `actionProfiles.ts` Stage Attack QTE).

### ✅ 7. CinematicProfile
`src/battle/timeline.ts` → `CinematicProfile` + `CinematicTrack` + `CinematicEvent` (más detallado que la spec: presentation + tracks). `src/battle/profiles.ts` construye perfiles por carta (`profileBeam`, `profileRush`, `profileSupport`, `profileGather`...). `actionProfiles.ts` define timings por kind (stage/melee/beam/support) heredados de templates — equivalente al concepto "no 125 máquinas de estado".

### ⚠️ 8. Metadata por frame (GAP principal)
La spec §8 exige por frame: `pivot`, `hurtbox`, `hitbox`, `attachPoints`, `events`, `evidence`, `durationTicks`, `flipSafe`, `paletteId`.
Estado actual:
- Manifests runtime: `{name, file, w, h}` — sin pivot/hitboxes/attachPoints/evidence.
- `spriteSemantics.ts`: `{semantic, ticks, pose}` — cubre `events`/duración a nivel de secuencia.
- Catálogo V9: `confidence`, `evidence`, `semantic_bucket` — cobertura de procedencia, sin geometría.
- `spriteConfig.ts`: pivots implícitos (alineación por pies vía bbox), sin cajas declaradas.

**Propuesta**: extender el manifest con un bloque opcional por frame (`pivot`, `attachPoints`) + `evidence` a nivel de pose; mantener hitboxes en perfiles (donde ya viven por carta), no en cada PNG.

### ⚠️ 9. Plantillas T01–T12 (parcial)
No existen IDs `T01`–`T12` literales. El equivalente funcional:
- `src/battle/actionProfiles.ts` → familias por kind (stage/melee/beam/support) = T04/T03/T05/T10.
- `src/renderer/pixi/director/` → orquestación por escena (SOLO/DUEL/PROJECTILE/IMPACT).
- `src/battle/profiles.ts` → perfiles por carta sobre esos templates.

Las 12 plantillas de la spec se pueden mapear (T01 carta/UI → MESSAGE+SHOT; T08 aura/transformación → ACTION_SOLO; T12 defensa → guard+IMPACT...) sin reescribir el motor. **Propuesta**: documentar el mapeo template→kind en `docs/` (no cambiar IDs de código).

### ⚠️ 10. Estados persistentes
`powered_up` / `guarding` / `stunned`... no existen como estado tipado (el runtime usa `isGather` local en main.tsx). **Propuesta**: añadir `powered_up` a los estados de la ficha de combate cuando se implemente el sistema de estados persistente (Limit cards).

### ℹ️ 11. Estructura de carpetas
La spec propone `characters/<char>/<form>/{overworld,action}/`; el proyecto usa `public/assets/overworld/...` + `public/assets/sprites/<form>/manifest.json` + catálogo V9 en `sprites-source/catalog-v9/`. Funcionalmente equivalente (separación overworld/acción/efectos ✓ — los efectos NO viven en carpetas corporales; el catálogo V9 separa por buckets `battle_aura_*`, `orbs_rings_bursts`, etc.).

### ✅ 12. Errores prohibidos
Verificado que el proyecto NO comete los errores de la spec §19:
- No se nombra por parecido sin evidencia (catálogo con `evidence`/`confidence`).
- Aura/proyectil no pegados al cuerpo en el runtime (separados por archivo/bucket).
- Sin sprites grandes en TACTICAL_FIELD (overworld usa chibis).
- Daño no al inicio: `APPLY_DAMAGE` tras `HIT_FRAME`; KO tras resolve.
- `gather_power` ≠ carga de beam (poses separadas: gather vs beam_charge).
- `fixed` no es acción (marca de procedencia en el catálogo).

## Acciones recomendadas (prioridad)

1. **Documentar el mapeo de plantillas** (T01–T12 ↔ kinds/escenas actuales) — sin tocar código. → `docs/CINEMATIC_GRAMMAR.md` (ya existe, ampliar).
2. **Añadir `powered_up` como estado** cuando se implemente el sistema de estados de Limit.
3. **Extender metadata de manifest** con `pivot`/`attachPoints` opcionales por frame (preparado para hurtbox/hitbox en perfiles).
4. **Aliasing de nombres de estado** (`air_back` ↔ `UP_BACK`): añadir un type alias en `src/battle/positions.ts` para interop con la spec.

## Verificación

```bash
npm run typecheck && npm run audit:sprites && npm run verify:v9 && npm run build
```
