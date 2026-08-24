# ROM-derived Presentation Profiles

> **V3 SUPERSEDES (2026-08-23)**: ver
> `docs/rom/research-v3/LEDGER.md`. Presentation debe derivar starts tambien
> desde opcode `$01` de la Presentation VM; `handler` se resuelve por
> `category/family + handler`, no como rutina global; `AnimationResource`
> cargado no implica reproduccion automatica. Las ramas `CA53` deben conservar
> `RESULT_0..RESULT_4` en capa ROM.
>
> **V4 SUPERSEDES (2026-08-23)**: ver
> `docs/rom/research-v4-fx/AGENT_HANDOFF_V4.md`. Beam FX ya no debe expresarse
> solo como `FX_LOAD`; debe compilarse a ventana fisica `ROM_FX_WINDOW` con
> `resourceId`, `paletteId`, `side`, `windowOperand`, `sourceRows`,
> `screenOffsetX/Y` y render domain `BG_TILEMAP`.

Estado: infraestructura inicial cerrada.

Esta capa convierte `RomActionExecutionDescriptor` en una gramatica literal de presentacion ROM:

```text
RomActionExecutionDescriptor
-> RomPresentationProfile
-> program: ROM macro / wait / motion / animation resource / FX / branch
```

La fuente programatica es `src/battle/romPresentationProfiles.ts`.

## Guardrails

- 125/125 cartas tienen profile o `NONE` explicito.
- El profile deriva de `RomActionExecutionDescriptor`.
- `handler`, `AnimationResource`, `FXResource` y `palette` no divergen del descriptor.
- No copia secuencias fisicas, raw bytes, frame streams ni offsets.
- Waits y movimientos conservan ticks enteros.
- Movimientos ROM conservan segmentos discretos (`RUSH`, `BEAM_SETUP`, `SCREEN_MOTION`).
- No introduce `BASE_X/Y`, anchors, slot binding ni coordenadas absolutas.
- No usa `cardsCinematic` ni `actionProfiles` como autoridad ROM.
- `PENDING_STATIC_DECODE` y `PENDING_ROM_TRACE` permanecen visibles.

## Estado actual

```text
cards                 125
completeStatic         39
partialStatic          86
dynamicPending         26
profilesWithBranches   31
profilesWithMotion     72
```

Familias:

```text
NONE                    5
STANDARD_DAMAGE        19
BEAM_BASE              38
BEAM_VARIANT            4
PROJECTILE_SCROLL      18
SUPPORT_OR_FIELD_EFFECT 4
DEFENSE_RULE           11
SPECIAL_HANDLER        26
UNKNOWN_HANDLER         0
```

## STANDARD_DAMAGE

La primera familia piloto queda expresada como gramatica ROM literal:

```text
SCENE_LOAD_ACTION
WAIT_PREPARE_20T
MACRO_RUSH_1C
ROM_RUSH_MOTION (+98px / 25 ticks, mirrored by side)
START_ACTOR_ANIMATION
WAIT_ACTOR_FRAME_2
SPAWN_FX cuando exista
MACRO_RESULT_PREP_2E
BRANCH_RESULT CA53
```

Ramas:

```text
CA53=0 -> $2F HIT
CA53=1 -> $31 SPECIAL_DEFENSE
CA53=2 -> $30 MISS
```

## BEAM_BASE

La familia base conserva la preparacion ROM:

```text
SCENE_LOAD_ACTION
MACRO_BEAM_SETUP_1E
ROM_BEAM_SETUP_MOTION (-27px / 17 ticks, mirrored by side)
START_ACTOR_ANIMATION
WAIT_ACTOR_FRAME cuando este promovido
SPAWN_FX
AUDIO_SCRIPT cuando exista
WAIT_BEAM_HOLD_60T cuando existe perfil estandar promovido
BRANCH_RESULT cuando existe evidencia
```

## Verificador

```bash
npm run verify:rom-presentation-profiles
```

Comprueba 125/125, derivacion desde descriptors, ticks enteros, motion discreto, ramas demostradas, ausencia de anchors/coordenadas, y que no entre semantica legacy inferida.
