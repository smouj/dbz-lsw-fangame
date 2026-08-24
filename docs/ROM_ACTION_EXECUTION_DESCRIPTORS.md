# ROM Action Execution Descriptors

> **V4 SUPERSEDES (2026-08-23)**: ver
> `docs/rom/research-v4-fx/LEDGER.md`. `visualEffect.resource/palette` debe
> enlazarse despues a datos FX fisicos: loader `Bank00:$2B30`, bundles
> ofensivos normales, palettes CGB y render domain `BG_TILEMAP`. FX `$01`,
> `$04` y `$06` son category-specific/reused tokens, no bundles Beam normales.

Estado: CLOSED como infraestructura derivada inicial.

Este bloque integra por carta lo que ya esta cerrado en las capas canonicas:

```text
ROM card record
-> execution handler
-> AnimationResource catalog/completion
-> physical reconciliation summary
-> FX resource / palette
-> demonstrated result branches
```

La fuente programatica es `src/battle/romActionExecutionDescriptors.ts`.

## Guardrails

- 125/125 cartas tienen descriptor.
- `handler`, `actorAnim`, `fxGraphics` y `fxPalette` salen de `romCardData.ts`.
- `AnimationResource` referencia `animationResources.ts`; no copia secuencias ni raw frame streams.
- La reconciliacion fisica se resume desde `physicalFrameReconciliation.ts`; no se asignan poses por parecido visual.
- Las ramas de resultado solo se declaran cuando hay evidencia en `standardAttackProfileFor` o `DEFENSE_ROM_RULES`.
- No contiene anchors, `BASE_X/BASE_Y`, slot binding ni coordenadas absolutas.

## Estado actual

```text
cards                     125
withActorAnimation         70
withFx                     99
withPalette                84
standardAttackProfiles      1
defenseRules               11
specialHandlers             3
descriptorsWithBranches    12
pendingStaticDecode        64
needsDynamicTrace          26
missingResources            0
```

Familias de resultado:

```text
NO_RESULT_BRANCH      52
STANDARD_ATTACK        1
ROM_DEFENSE           11
SPECIAL_HANDLER        3
HANDLER_UNPROVEN      58
```

## Verificador

```bash
npm run verify:rom-action-execution
```

Comprueba:

- 125/125 descriptors y ids unicos.
- Descriptor `handler === romCardData.exec`.
- Descriptor `actorAnimation.resource === romCardData.actorAnim`.
- Descriptor `visualEffect.resource === romCardData.fxGraphics`.
- Descriptor `visualEffect.palette === romCardData.fxPalette`.
- Ninguna carta con `actorAnim = 0xff` recibe resource artificial.
- Cero resources missing.
- Las ramas de resultado tienen fuente/evidencia.
- No hay anchors/coordenadas dinamicas.
- No se copian `frames`, `raw`, `durationTicks`, `offsetX` ni `offsetY` dentro del descriptor.

## Frontera dinamica

Sigue fuera de este carril:

```text
BASE_X / BASE_Y
absolute coordinates
ActionObject binding
multi-actor runtime behavior
special FSM closure
```

Esas piezas siguen siendo `PENDING_ROM_TRACE`.
