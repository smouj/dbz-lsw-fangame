# DBZ LSW — CANON DE ANIMACIÓN (BattleEvent → poses de los sheets perfectos)

**Fecha**: 2026-08-18 · **Fuente**: `src/battle/animationCanon.ts` (dato) + `src/battle/actionProfiles.ts` (perfiles firma) + runtime pose contract (V9).

## Propósito

Cada hecho del Engine (M4) resuelve AQUÍ qué animación canónica reproduce,
usando las poses reales de los sheets perfectos por personaje. La presentación
no inventa animaciones: recibe un `BattleEvent` y consulta el canon.

```text
BattleEvent (M4)
   │  canonForAction / canonForEvent
   ▼
ActionAnimationCanon (poses canónicas por familia)
   │  manifest de la forma + POSE_FALLBACKS (spriteConfig)
   ▼
frames reales del sheet perfecto (public/assets/sprites/<form>/)
```

## Familias canónicas

| Familia (kind) | Visual | Actor (frames GBC) | Target | Aura | Contacto |
|---|---|---|---|---|---|
| `command` (Stage) | rush | idle → attack_fwd(12) → idle(26) → attack_fwd(38) → strike(94) → idle(106) | knockback_back(94) | — | 94 |
| `damage` (melee) | rush | idle → attack_fwd(12) → strike(38) → strike(94) → idle(106) | knockback_back(94) | — | 94 |
| `beam` | ray/wave/ball/disk/sword/special | idle → gather_power(12) → beam_charge(28) → beam_fire(54) | hurt(108) | power | 108 |
| `support` | power | power_up(0) | — | power | — |
| `support` | item | power_up(0) | — | **support (azul)** | — |
| `gather` | power | gather_power(0) → power_up(30) loop | — | power | — |
| `guard` | — | guard(0) | — | — | — |
| `move` | rush | move_front/move_back(0) → idle(12) | — | — | — |

Los timings son los del perfil firma (INFERRED hasta la pasada forense
FRAME_VERIFIED sobre la ROM — editar `T` en `actionProfiles.ts`).

## Hechos que disparan animación

| Evento | Canon |
|---|---|
| `ACTION_STARTED` / `ACTION_RESOLVED` | `canonForAction(descriptor)` por kind×visual |
| `GATHER_STARTED` | gather (aura power) |
| `GUARD_STARTED` | guard |
| `POSITION_CHANGED` | move (frente/atrás según axis+dirección) |
| `DAMAGE_APPLIED` | reacción del objetivo (hurt / knockback_back; COUNTER → hurt) |
| `QTE_STARTED` | actor mantiene idle (el QTE es UI/entrada) |
| resto (CC_SPENT, CARD_PLAYED…) | `null` — son datos, no animación |

## Reglas

1. Los eventos NUNCA contienen instrucciones de animación (`PLAY_POSE`, `SHAKE`…).
   El canon las deriva del hecho.
2. El canon usa nombres de FAMILIA del pose contract (`beam_charge`, `attack_fwd`,
   `knockback_back`…). Los frames reales los resuelve el manifest de la forma
   con los fallbacks de `spriteConfig.resolveCombatPose` (p. ej. formas sin
   `beam_fire` físico → `beam_charge`).
3. Las cartas con perfil firma (kamehameha, masenko, stage_3… en
   `actionProfiles.ts`) usan SU spec; el canon cubre la familia genérica y las
   acciones básicas.
4. Aura: `power` = dorada (ki), `support` = azul (objetos/tecnología) — coincide
   con las variantes V9 `aura_power` / `aura_support` del sheet.

## Verificación

`npm run verify:battle-engine` incluye los checks CANON (beam, stage, damage,
eventos, aura, cobertura de familias). 110 checks en total.
