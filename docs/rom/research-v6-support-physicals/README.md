# DBZ LSW ROM Research V6 - Support Physical Visuals Plan

Estado: `V6_CLOSED / STATIC_PHYSICAL_VERIFIED` (runtime cutover = V7; handoff en AGENT_HANDOFF_V7.md).

V5 queda congelado como baseline para Support/Defense visual grammar. V6 no
reabre esos cierres; se centra en terminar la ruta fisica que V5 dejo como
frente P0:

```text
SUPPORT CARD
-> card ID
-> Bank00:$2C30
-> bank/local index
-> descriptor fisico
-> graphics payload
-> tile/tilemap u otra composicion
-> VRAM/BG destination
-> palette path
-> presentacion visible
```

## V5 baseline congelado

No reabrir sin contradiccion ROM nueva:

- `category + handler`.
- Support separado del FX ofensivo `$2B30` / opcode `$0C`.
- Support BG `$19`.
- BG `$1A = CHARA/Gather`.
- Support palette `$FF` path-scoped.
- `HOLD120`.
- Move persistent tactical position.
- Move cinematic net0.
- Defense slot8 preload boundary.
- CA83 card mapping.
- Sunglasses counter Taiyoken.
- CA83 `$40` Stage success suppression.

Siguen fuera del carril estatico:

```text
ACTOR_HOME
TARGET_HOME
CONTACT_POINT
semantic ActionObject slot binding
multi-actor absolute binding
```

## Objetivo P0: desmontar `$2C30`

Demostrar byte a byte:

- Que argumento recibe `$2C30`. ✅
- Como convierte `cardId -> bank`. ✅
- Como obtiene descriptor. ✅
- Cuantas entradas Support se recorren. ✅ 48/48
- Longitud de cada entrada. ✅ 498 bytes payload + padding
- Aliases entre cartas. ✅ payload/graphics: ninguno; layout: 2 pares
- Que parte es graphics. ✅ 30 tiles / 480 bytes
- Que parte es layout/composicion.
- Que VRAM/BG utiliza.
- Que palette consume.
- Que estado se conserva hasta el worker.

Resultado inicial V6: no hay que asumir 48 graficos distintos; la matriz
derivada de ROM demuestra 48 payloads fisicos unicos y 48 graphics hashes
unicos para las 48 Support. Si aparecen aliases visuales humanos despues,
deben demostrarse por render/composicion, no por hash de payload bruto.

Artefactos actuales:

```text
data/support_physical_visual_matrix_v6.csv
data/support_physical_visual_matrix_v6.json
data/support_physical_visual_summary_v6.json
proof/loader_2c30_decoding_v6.txt
scripts/extract_v6_support_physicals.py
```

## `$2C30` / `$1266` decodificado

La ruta Support state `$01` hace:

```text
XOR A
CALL $39B3
LD ($CC01),A
C = $6B
B = $03
DE = $8800
CALL $2C30
```

`$39B3` devuelve el card id seleccionado para el lado activo. `CC01` queda como
id de carta 1-based: `Call_2A77` demuestra que `CC01=1` apunta a
`Bank11:$4320`, el primer registro normal de carta.

`$2C30` calcula:

```text
loaderBank = $6B + floor(CC01 / $20)
localIndex = CC01 % $20
```

`$1266` resuelve el descriptor:

```text
entryWord = word[$4008 + localIndex * 4]
descriptor = $4000 + entryWord * 4
```

Formato observado en 48/48 Support:

```text
byte 0                 layoutChunkCount = 2
next 2 * 8 bytes       layout/control bytes
next byte              tileCount = $1E
next 30 * 16 bytes     graphics payload 2bpp
```

Cada payload ocupa:

```text
1 + 16 + 1 + 480 = 498 bytes
```

Los descriptores quedan alineados con 2 bytes de padding.

Resumen de hashes:

```text
Support rows      48
Unique payloads   48
Unique graphics   48
Unique layouts    46
```

Layout aliases fisicos:

```text
Tien #85     <-> Yajirobe #86
Dende #88    <-> Guru #89
```

No hay aliases de payload completo ni de graphics payload en esta pasada.

## Matriz fisica Support 48/48

V6 debe producir una matriz autoritativa:

```text
Card
Card ID
Handler
$2C30 bank
$2C30 local index
Descriptor address
Payload address
Payload size
Physical hash
Shared-with
Palette index/path
BG $19 used?
Macro path
HOLD / waits
AnimationSlot6
Final static classification
Evidence
```

Mantener separadas cuatro pistas:

```text
card visual $2C30
card AnimationResource
BG $19
presentation macro
```

## Clasificacion fisica antes que semantica humana

Agrupar primero por hashes/estructura:

```text
SUPPORT_VISUAL_A -> cards [...]
SUPPORT_VISUAL_B -> cards [...]
SUPPORT_VISUAL_C -> cards [...]
```

Solo despues intentar etiquetas humanas si imagen fisica y consumidor lo
demuestran. No clasificar por nombre de carta.

## Macros `$2B/$2C/$34/$35`

Prioridad secundaria. Documentarlas literalmente antes de asignar significado:

```text
macro
-> opcode
-> ActionObject index
-> animation state
-> WAIT_FRAME / WAIT_COMPLETE
-> frame delta
-> motion
-> screen operation
-> SFX/audio
-> cleanup
```

El significado viene del programa literal y contexto de uso, no del numero de
macro aislado.

## Teleport `$28` / Time Freeze `$2A`

Auditoria negativa global:

- direct slot8 starts
- indirect wrappers
- category dispatchers
- macros
- special handlers
- CHARA
- Command/Stage
- Support
- Defense

Si no aparecen consumidores adicionales:

```text
Teleport $28 -> PRELOADED_NOT_STARTED
Time Freeze $2A -> PRELOADED_NOT_STARTED
```

pasa a conclusion estatica global fuerte.

## `romCA53` contract

Preservar:

```ts
{
  romCA53: 2,
  semanticOutcome: 'NATURAL_MISS' | 'ENDURANCE_PARTIAL' | ...
}
```

`semanticOutcome` procede de contexto + EventLog, nunca de `switch(romCA53)`.

## Gate de cierre V6

No cerrar V6 hasta cumplir:

```text
✓ $2C30 completamente decodificado
✓ 48/48 Support recorren el loader
✓ 48/48 tienen descriptor fisico o razon explicita
✓ aliases fisicos identificados
✓ graphics/layout separados
□ palette path final separada por ruta
✓ $00/$02 -> BG19 confirmado
✓ $0B/$0D/$0F -> sin BG19 confirmado
□ macros $2B/$2C/$34/$35 literales decodificadas
□ Teleport/TimeFreeze audit global
✓ romCA53 nunca convertido a semantica sin contexto
✓ 0 anchors inventados
✓ 0 slot bindings inventados
```
