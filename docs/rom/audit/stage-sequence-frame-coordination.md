# Stage / Sequence / Frame Coordination Map

Fecha: 2026-08-30

Este documento separa lo confirmado de lo inferido para coordinar el cierre
de secuencias, frames físicos y rutas de producción.

## Hechos confirmados

- `verify:rom-stage-fidelity` pasa `72/72`.
- Stage usa Bank `$61`, separado del catálogo de técnicas `$62/$63/$64`.
- `$C3C7` es el selector físico de secuencia; el consumidor es `Call_000_0b16`.
- Stage QTE acepta solo `RIGHT|UP|DOWN|A|B` (`$3D`); `LEFT` no participa.
- Stage tiene 32 secuencias QTE: 8 variantes por nivel ROM 1..4.
- Los niveles visibles `3/4/5/6 Stage` tienen 3/4/5/6 comandos respectivamente.
- Stage VM tiene 10 programas: 5 comandos por 2 participantes.
- La VM no es de longitud fija:
  - actor0 programs `0..4`: 3 instrucciones.
  - actor1 A/B programs `5..6`: 5 instrucciones.
  - actor1 direccionales `7..9`: 4 instrucciones.
- La espera de sincronía usa opcode `$06`, acoplado a `ActionObject+4`, no timers aproximados.

## Stage: comando -> programa -> recurso -> secuencia/frame

| Comando | Actor programa/pose | Actor Bank/res | Actor secuencia | Actor frames/ticks | Target programa/pose | Target res/secuencia | Target wait frame | Target frames/ticks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | `0` / `5` | `$61` / `1` | `actorVisualProfileKey` | `4 / 13t` | `5` / `10` | `0 / $0A` | `2` | `6 / 13t` |
| B | `1` / `8` | `$61` / `2` | `actorVisualProfileKey` | `6 / 32t` | `6` / `11` | `0 / $0B` | `3` | `8 / 27t` |
| RIGHT | `2` / `11` | `$61` / `3` | `actorVisualProfileKey` | `7 / 41t` | `7` / `13` | `0 / $0D` | `4` | `15 / 23t` |
| UP | `3` / `6` | `$61` / `4` | `actorVisualProfileKey` | `7 / 41t` | `8` / `15` | `0 / $0F` | `4` | `8 / 15t` |
| DOWN | `4` / `9` | `$61` / `4` | `9` | `9 / 53t` | `9` / `16` | `0 / $10` | `5` | `5 / 9t` |

Caso especial confirmado:

- Si `B` es último comando: target usa secuencia `$17`, `54t`, aplica frame delta y restaura target seq0.
- Subventana A/B: `30t`, acepta solo `A/B`, thresholds `10/25/30`; nombre semántico humano sigue `PENDING_CONTEXT_LINK`.

## Stage: lo que falta coordinar

### Hecho confirmado

- `stageInputMap.ts` todavía traduce `A/B/UP/DOWN/RIGHT` a poses semánticas para UI/fallback.
- `romStageProgramPairForCommand()` ya expone el par de microprogramas ROM por comando.

### Inferencia razonable

- El siguiente corte correcto es sustituir el consumo de `stageInputMap.ts` en producción por cues derivados de `ROM_STAGE_COMMAND_PROGRAMS` y `ROM_STAGE_PHYSICAL_COMMANDS`.
- El bridge debe emitir por comando:
  - `ACTION_OBJECT_BIND` por slot.
  - `ANIMATION_START` con slot/recurso/secuencia.
  - `WAIT_ANIMATION_FRAME` cuando aplique `$06`.
  - `ROM_PHYSICAL_FRAME` por frame físico real.
  - `ACTION_OBJECT_FRAME_OFFSET` / `APPLY_FRAME_DELTA` cuando el programa lo pide.

### Pendiente / no verificado

- Paridad visual Stage browser/Pixi frame-perfect para los 5 comandos y el caso `B` final.
- Reemplazar la pose semántica de Stage sin romper HUD/QTE.
- Confirmar en runtime que `ActionObject+4` gobierna el mismo frame counter que consume Pixi.

## Cartas: estado de coordinación por causa

Resumen actual de `verify:card-physical-coverage`:

| Estado físico | Cartas |
| --- | ---: |
| `NO_ROM_ANIMATION` | 55 |
| `RESOURCE_DECODED_COMPLETE` | 6 |
| `RESOURCE_DECODED_ROM_PHYSICAL` | 2 |
| `RESOURCE_DECODED_PARTIAL` | 10 |
| `RESOURCE_PARTIAL` | 46 |
| `RESOURCE_SPECIAL` | 6 |

Resumen runtime actual:

| Estado runtime | Cartas |
| --- | ---: |
| `ROM_FULL` | 0 |
| `ROM_MIXED` | 84 |
| `LEGACY` | 36 |
| `PENDING_DYNAMIC` | 0 |
| `NOT_APPLICABLE` | 5 |

## Bolsas de trabajo

### 1. Stage command cards

Cartas: `#1 3 stage atk.`, `#2 4 stage atk.`, `#3 5 stage atk.`, `#4 6 stage atk.`

Estado:

- QTE sequence pool: confirmado.
- VM command programs: confirmado.
- actor/target physical resources, sequences, wait frames: confirmado.
- producción: sigue `NOT_APPLICABLE`/legacy porque no hay ruta ROM Stage en `romPresentationTimelineForCard`.

Próximo cierre:

- Crear ruta/compilador Stage que consuma `ROM_STAGE_PHYSICAL_COMMANDS`.
- Emitir frames por comando real en vez de pose semántica.

### 2. Special handlers ofensivos

Cartas: `#29 Tail`, `#33 Suicide`, `#41 V-ball Crash`, `#57 Purple Comet`, `#58 P.Comet Z`.

Estado:

- Todas están en `ROM_MIXED`, ya no `PENDING_DYNAMIC`.
- Tail `$3F` ya produce frames físicos (`RESOURCE_DECODED_ROM_PHYSICAL`).
- V-Ball `$41`, Purple/P.Comet `$1C` y Suicide `$2B` siguen como `RESOURCE_SPECIAL` o pendientes de frame físico/trace.

Próximo cierre:

- Renderizar/promover recursos físicos `$41`, `$1C`, `$2B` si la evidencia estática alcanza.
- Mantener resultado/ramas como `PENDING_ROM_TRACE` hasta trace dinámico real.

### 3. Standard damage frame streams parciales

Cartas: `#6`, `#11`, `#15`, `#25`, `#34`, `#37`, `#43`, `#46`, `#55`, `#60`, `#61`, `#66`, `#71`, `#74`, `#75`, `#77`, `#78`, `#81`.

Causa: `FRAME_STREAM_PARTIAL / STATICALLY_CLOSABLE`.

Próximo cierre:

- Extraer frame streams restantes de recursos `$2D..$3E`.
- Pasar de `RESOURCE_PARTIAL` a `DECODED` y luego a `ROM_PHYSICAL` donde el corpus lo permita.

### 4. Projectile / beam variant selector paths

Cartas: `#8`, `#18`, `#35`, `#36`, `#39`, `#40`, `#47`, `#49`, `#50`, `#54`, `#56`, `#62`, `#64`, `#65`, `#69`, `#72`, `#73`, `#80`.

Causa: `HANDLER_SELECTED_SEQUENCE / STATICALLY_CLOSABLE`.

Próximo cierre:

- Mapear selector estático handler-specific antes de declarar frame extraction completa.

### 5. Pointer-table unresolved beams/support-like resources

Cartas: `#44 Flash.Sword`, `#48 Lightning C.`, `#67 Eye Beam`, `#82 Sweet Beam`.

Causa: `POINTER_TABLE_UNRESOLVED / STATICALLY_CLOSABLE`.

Próximo cierre:

- Resolver entradas de pointer table para recursos `$02`, `$06`, `$19`, `$1E`.

### 6. Defense/support actor resources

Cartas: `#19 Taiyoken`, `#26 Teleport.`, `#45 Barrier`, `#52 Time Freeze`, `#53 Breath`, `#76 Energy Absorb`.

Causa: `SEQUENCE_COUNT_UNRESOLVED / STATICALLY_CLOSABLE`.

Próximo cierre:

- Resolver sequence count/boundaries de recursos `$24..$28/$2A`.
- Mantener claro que su autoridad gameplay ya está en reglas defense, no en animación.

### 7. Legacy support/defense visual routes

Cartas `LEGACY`: 36 en total.

Principalmente:

- support `SUPPORT_OR_FIELD_EFFECT` no elegibles por bridge actual.
- defense `DEFENSE_RULE` no rutadas por `romPresentationTimelineForCard`.
- command Stage `#1..#4` todavía sin ruta ROM de producción.

Próximo cierre:

- Stage primero, porque ya tiene VM/recurso/secuencia/frame contract.
- Después defense/support display routes, cuidando no mezclar soporte `$0B/$0D` con specials ofensivos.

## Orden recomendado

1. Stage runtime route: comandos `#1..#4` desde VM+physical contract.
2. Stage Pixi frame-perfect: `ActionObject+4` -> frame real -> offset/slot.
3. Special resources `$41/$1C/$2B`: frames físicos o pending explícito por recurso.
4. Standard damage `$2D..$3E`: completar frame streams.
5. Projectile/beam variants: cerrar selector handler-specific.
6. Pointer-table unresolved resources `$02/$06/$19/$1E`.
7. Defense/support rutas visuales no ofensivas.

