# DBZ LSW ROM Research V3 Ledger

Fecha: 2026-08-23

Fuente: pasada estatica ROM reportada por smouj y empaquetada sin promocionar
claims a dinamico. Las direcciones y estados aqui son canon de investigacion
V3 hasta integracion en los docs principales.

## Estados de evidencia

- `ROM_STATIC_VERIFIED`: demostrado leyendo codigo/datos ROM.
- `ROM_HANDLER_VERIFIED`: consumidor/worker ROM identificado.
- `ROM_SEQUENCE_VERIFIED`: secuencia fisica ROM decodificada.
- `STATICALLY_REACHABLE`: ruta estatica demuestra consumidor.
- `CARD_RESOURCE_LOADED_SLOT6`: el setup carga el recurso, pero no hay start
  estatico observado.
- `NO_STATIC_ACTIONOBJECT_START_FOUND`: no se encontro inicio ActionObject en
  la ruta estatica examinada.
- `PENDING_ROM_TRACE`: requiere ejecucion dinamica para semantica espacial o
  binding final.
- `SUPERSEDED`: conclusion previa reemplazada por V3.

## 1. ActionObject layout

Estado: `ROM_STATIC_VERIFIED` para layout fisico; `PENDING_ROM_TRACE` para
roles espaciales/actorales finales.

```text
+00 controlFlags
+01 AnimationSlot ptr low
+02 AnimationSlot ptr high
+03 sequenceSelector
+04 frameIndex
+05 visualFrameId
+06 frameElapsedTicks
+07 graphicsDoubleBufferToggle

+08/+09 graphicsVramDestinationA
+0A/+0B graphicsVramDestinationB
+0C tileBaseA
+0D tileBaseB

+0E renderAttributesBase
+0F currentDrawY
+10 currentDrawX

+11/+12 graphics-source pointer
```

Flags demostrados:

```text
bit 7 = ACTIVE
bit 6 = LOOP
bit 5 = HOLD_LAST_ON_COMPLETE
bit 4 = COMPLETE/HOLD latch
```

Frame record fisico:

```text
[ visualFrameId, durationTicks, offsetY, offsetX ]
```

Impacto:

- Supersede la afirmacion de que los 19 bytes necesitan necesariamente tracer
  para identificar estructura.
- Corrige el orden previo ambiguo `offsetX/offsetY`.
- Mantiene pendientes `slot0/slot1 semantic role`, `ACTOR_HOME`,
  `TARGET_HOME`, `CONTACT_POINT` y coordenadas universales.

## 2. Cadena carta -> pixel fisico

Estado: `ROM_STATIC_VERIFIED`.

Cadena reconstruida:

```text
Card
-> AnimationResource
-> descriptor exacto
-> sequence exacta
-> frame
-> visualFrameId
-> metasprite
-> graphics blocks
-> tiles 2bpp
-> palette CGB
-> sprite fisico en color
```

`descriptor +4` queda identificado como tabla grafica asociada al frame. Cada
entrada contiene:

```text
graphicsBlockCount
graphicsBlockAddress[graphicsBlockCount]
```

Cada bloque son 32 bytes:

```text
32 bytes = 2 * tile 8x8 2bpp = 1 pieza OBJ 8x16
```

Validaciones:

```text
411/411 visualFrames:
graphicsBlockCount == metasprite.pieceCount

411/411 visualFrames:
metasprite.tileDelta == 2 * pieceIndex
```

Impacto:

- Cada pieza del metasprite corresponde a un bloque grafico exacto de dos
  tiles.
- El render ROM puede construirse sin sprites externos para las formas
  cubiertas.

## 3. Banco grafico por personaje/forma

Estado: `ROM_STATIC_VERIFIED`.

En `Bank00:$367F`:

```text
actor/form
-> actorVisualProfileKey
-> graphicsBank = $31 + actorVisualProfileKey
```

La ROM construye:

```text
[graphicsBank, baseLow, baseHigh]
```

`ActionObject +17/+18` apunta a ese registro. Para luchadores normales:

```text
baseAddress = $0000
```

Impacto:

`actorVisualProfileKey` controla al menos:

```text
1. seleccion de sequence
2. banco grafico fisico
3. perfil de palette
```

## 4. Palette exacta por forma

Estado: `ROM_STATIC_VERIFIED`.

`Bank00:$36A5` usa el mismo profile key:

```text
Bank30:$6E00 + actorVisualProfileKey * 8
```

Copia 8 bytes:

```text
4 colores CGB * 16 bits BGR555
```

Impacto:

```text
actorVisualProfileKey -> 4 colores fisicos exactos -> RGB
```

El pipeline `metasprite + tiles Bank31+ + palette Bank30` renderiza multiples
personajes/formas con colores correspondientes, validando la cadena completa.

## 5. Double buffering grafico de luchadores

Estado: `ROM_STATIC_VERIFIED`.

```text
ActionObject 0:
buffer A = VRAM $8000
buffer B = VRAM $8180
tile base A = $00
tile base B = $18

ActionObject 1:
buffer A = VRAM $8300
buffer B = VRAM $8380
tile base A = $30
tile base B = $38
```

Capacidad:

```text
$8180 - $8000 = $180 = 384 bytes
12 piezas maximas * 32 bytes = 384 bytes
```

Impacto:

El engine hace double buffering de tiles de los luchadores mientras avanza la
animacion.

## 6. Reachability por Presentation VM

Estado: `ROM_HANDLER_VERIFIED`.

El analisis V2 seguia selecciones directas de `C3C7`, pero faltaban selecciones
producidas por Presentation VM. Opcode `$01` hace:

```text
object
AnimationSlot
sequenceSelector
flags
-> start
```

Impacto:

Los consumidores de secuencias deben incluir macros Presentation, no solo
starts directos.

## 7. STANDARD_DAMAGE $2C-$3E

Estado: `STATICALLY_REACHABLE`.

Las 19 cartas `$0A` tienen `seq0 + seq1`.

```text
seq0 -> tramo principal
seq1 -> macros de resultado $2F/$30/$31
        start AnimationSlot 6 sequence 1
```

Impacto:

Las 19 `seq1` de STANDARD_DAMAGE son alcanzables y se ejecutan. El cutover
`$0A` debe verificar doble track fisico:

```text
slot6 card resource + slot7 generic sequence
```

## 8. Tail $3F

Estado anterior: `UNOBSERVED_STATIC_FROM_TAIL_CARD_PATH`.

Estado V3: `SUPERSEDED` -> `ROM_HANDLER_VERIFIED`.

Macro `$36` contiene:

```text
opcode $01
object 0
AnimationSlot 6
sequence 1
flags $80
```

Tail la ejecuta en `Bank03:$62BB`.

Impacto:

```text
Tail $3F seq0 -> usada
Tail $3F seq1 -> usada
```

No necesita tracer para resolver esta duda.

## 9. V-ball Crash $41

Estado: `ROM_HANDLER_VERIFIED`.

`AnimationResource $41` contiene `seq0..seq3`. Worker `$0C`:

```text
seq0 -> camino base/fallback
seq1 -> macro $3B
seq2 -> macro $3C
seq3 -> macro $3D
```

Macros:

```text
$3B -> slot6 seq1
$3C -> slot6 seq2
$3D -> slot6 seq3
```

Impacto:

Las cuatro secuencias tienen consumidor estatico.

## 10. Lightning C. $06

Estado:

```text
$06 seq0 -> STATICALLY_REACHABLE
$06 seq1 -> UNOBSERVED_STATIC_FROM_LIGHTNING_C_PATH
```

`AnimationResource $06`:

```text
seq0 -> 7 frames / 73 ticks
seq1 -> 7 frames / 73 ticks
```

Diferencia fisica:

```text
seq0 ultimo visualFrameId = 3
seq1 ultimo visualFrameId = 4
```

Selector table:

```text
actorVisualProfileKey $16 -> sequence 0
```

Impacto:

`seq1` no se etiqueta `UNUSED`; queda no observada desde la ruta Lightning C.

## 11. Kiai $40 y V-ball $41 comparten descriptor

Estado: `ROM_STATIC_VERIFIED`.

Ambos resuelven a:

```text
Bank64:$7994
seq0 8 frames / 81 ticks
seq1 17 frames / 221 ticks
seq2 21 frames / 112 ticks
seq3 15 frames / 88 ticks
```

Tambien comparten selector table:

```text
Bank30:$6D28
```

Impacto:

Mismo descriptor fisico no implica misma accion logica ni misma reproduccion.
La diferencia esta en el dispatcher/worker.

## 12. Handlers por categoria/familia

Estado: `ROM_HANDLER_VERIFIED`.

No existe semantica global de handler. Ejemplo:

```text
offensive handler $0D -> Purple Comet -> Bank03:$5C04
Support handler $0D -> Bank03:$664E
```

Dispatcher Support `Bank00:$3A6C`:

```text
$00 -> Bank03:$63BF
$02 -> Bank03:$64D8
$0B -> Bank03:$64E7
$0D -> Bank03:$664E
$0F -> Bank03:$6685
```

Modelo correcto:

```text
category/family + handler -> worker
```

Impacto:

Descriptors/compiler deben blindar handler por familia, no por valor global.

## 13. Kiai y Paralysis

Estado:

```text
CARD_RESOURCE_LOADED_SLOT6
NO_STATIC_ACTIONOBJECT_START_FOUND
```

Solo dos Support tienen AnimationResource:

```text
#42 Kiai -> $40
#51 Paralysis -> $29
```

El setup Support carga el recurso en `AnimationSlot 6`, pero las rutas
examinadas no hacen start slot6:

```text
Support $00
Support $02
Support $0B
Support $0D
Support $0F
```

Las Presentation macros usadas tampoco contienen opcode `$01` sobre slot6.

Impacto:

No reproducir automaticamente una animacion de actor porque la tabla Support
tenga `AnimationResource`.

## 14. Defense slot8

Estado: `ROM_STATIC_VERIFIED`.

`Bank01:$76DC` carga Defense en slot distinto:

```text
card AnimationResource
-> resolve descriptor
-> AnimationSlot 8

C = $08
CALL $3702
```

Arquitectura fisica:

```text
Offensive card animation -> slot6
generic secondary track -> slot7
Defense card animation -> slot8
```

## 15. Seis Defense fisicas

Estado: `ROM_SEQUENCE_VERIFIED` para recursos y descriptor compartido.

```text
Taiyoken       $26 -> 3 * 49f / 183t
Teleport       $28 -> 1 * 40f / 162t
Barrier        $24 -> 3 * 47f / 183t
Time Freeze    $2A -> 1 * 40f / 162t
Breath         $27 -> 2 * 50f / 183t
Energy Absorb  $25 -> 1 * 47f / 183t
```

Descriptor compartido:

```text
Teleport $28
Time Freeze $2A
Paralysis $29
Suicide $2B
-> Bank63:$680C
-> 40 frames / 162 ticks
```

Impacto:

Mismo descriptor fisico no implica misma accion logica.

## 16. Starts reales de slot8

Estado: `ROM_HANDLER_VERIFIED`.

Busquedas globales:

```text
loader AnimationSlot8 -> 1 sitio
direct ActionObject start slot8 -> 2 sitios
Presentation opcode01 slot8 -> 0
```

### STANDARD_DAMAGE

`Bank03:$60B2` exige:

```text
CA83 & $01
```

Defensas conocidas con ese bit:

```text
Taiyoken
Shockwave
```

Shockwave no tiene AnimationResource y es caso especial. Por tanto:

```text
Taiyoken $26 -> AnimationSlot8 -> sequence por actorVisualProfileKey
```

### Beam

`Bank03:$59FD`:

```text
CA53 != 0
CA53 != 1
CA53 != 2
-> state $50
```

Familias:

```text
Barrier/Breath CA53=3 -> slot8 physical animation
Energy Absorb CA53=4 -> slot8 physical animation -> continua $51/$52/$53
Teleport CA53=1 -> state $3C -> pelicula generica Avoid -> NO start slot8
```

Impacto:

`Teleport $28` tiene AnimationResource, pero Beam no reproduce ese recurso en
la ruta Avoid.

## 17. CA53

Estado: `ROM_STATIC_VERIFIED`.

Escrituras ROM en `Bank7E:$5032+`:

```text
CA83 & $08 -> CA53 = 4 -> CA7F = incoming power
CA83 & $04 -> CA53 = 3 -> damage/result = 0
CA83 & $02 -> CA53 = 1 -> damage/result = 0
CA83 & $10 -> CA53 = 2
```

Correccion:

```text
NO: CA53=2 = MISS universal
SI: CA53=2 puede representar Endurance / resultado atenuado
```

Contrato:

```text
capa ROM -> RESULT_0, RESULT_1, RESULT_2, RESULT_3, RESULT_4
capa gameplay/EventLog -> natural hit, natural miss, avoid, endurance,
                           nullification, absorption, ...
```

Impacto STANDARD_DAMAGE:

```text
A. dual physical track: slot6 card resource + slot7 generic sequence
B. result branch: no tratar CA53=2 como MISS puro
```

## 18. Proximo frente

Mayor valor para el siguiente cutover visible:

```text
FXResource -> descriptor -> graphics -> palette -> movement/lifetime
```

Objetivo: reconstruir Beam con el luchador correcto y tambien con el
haz/bola/disco/proyectil fisico correcto de la ROM.
