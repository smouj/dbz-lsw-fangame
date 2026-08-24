# DBZ LSW ROM Research V5 Support/Defense Ledger

Fecha: 2026-08-23

Fuente: reporte V5 de smouj + ZIP externo importado y verificado localmente.

## Estados de evidencia

- `ROM_STATIC_VERIFIED`: demostrado por codigo/datos ROM.
- `ROM_BG_FORMAT_VERIFIED`: formato grafico BG/tiles/palette demostrado.
- `ROM_FSM_VERIFIED`: maquina de estados o rama de dispatcher identificada.
- `EXTERNAL_ARTIFACT_IMPORTED`: artefacto generado copiado al repo y validado.
- `SUPERSEDES`: conclusion previa reemplazada por V5.
- `PENDING_ROM_TRACE`: sigue requiriendo ejecucion dinamica.

## 1. Handler category scoped

Estado: `ROM_STATIC_VERIFIED`.

Support usa dispatcher propio:

```text
Bank00:$3A6C

$00 -> Bank03:$63BF
$02 -> Bank03:$64D8
$0B -> Bank03:$64E7
$0D -> Bank03:$664E
$0F -> Bank03:$6685
```

Impacto:

```text
category + handler -> worker
```

No resolver `handler` como clave universal.

## 2. Support visual loader

Estado: `ROM_STATIC_VERIFIED`.

Todas las Support comienzan con una carga indexada por card ID:

```text
Support card -> Bank03:$63FA -> Bank00:$2C30 -> banks $6B+
```

Este loader no es el offensive FX loader V4 `$2B30`. Los tokens Support
`$01/$02/$04/$08` no deben parsearse como Beam bundles.

## 3. Support common BG `$19`

Estado: `ROM_BG_FORMAT_VERIFIED`.

`Bank68:$19`:

```text
descriptor Bank68:$7A0C
16 tiles fisicos
256 bytes 2bpp
helper Bank03:$66D1 / $6834
7 rows x 6 tiles = 48x56 px
BG rows 4-10, column 7
VRAM bank1, BG palette slot5
```

Las siete iteraciones son filas de un unico grafico BG, no siete frames.

Hold comun:

```text
CB77++ until $78 = 120 ticks
```

## 4. Palette `$FF`

Estado: `SUPERSEDES`.

En common Support, `CC15` se pasa directamente a `$36CA`; no existe sentinel
local `if $FF then none`.

```text
palette $FF -> physical palette index 255 -> Bank30:$75F8
```

Impacto: los sentinels son `category/path scoped`.

## 5. Kiai/Paralysis

Estado: `ROM_STATIC_VERIFIED`.

Kiai `$40` y Paralysis `$29` se precargan en AnimationSlot6 por setup comun,
pero no hay worker Support ni macro usada por esa familia que arranque slot6.

Clasificacion:

```text
PRELOADED_SLOT6_NOT_ACTIONOBJECT_STARTED
```

## 6. Defense CA02 FSM

Estado: `ROM_FSM_VERIFIED`.

Defense usa `CA02`, separado de `CA06` ofensivo:

```text
CA55=2 -> MOVE -> CA02=$1E
CA55=1 -> DEFENSE_CARD -> CA02=$28
other/0 -> GUARD -> CA02=$14
```

## 7. Move state versus local cinema

Estado: `ROM_STATIC_VERIFIED`.

Position bits:

```text
bit0: 0 GROUND / 1 AIR
bit1: 0 FRONT / 1 BACK
```

El selector persiste `CAA6 -> CA57 -> FighterState.position`. La pelicula usa
`newPosition >> 1` para elegir macro `$29/$2A`; en ese punto AIR/GROUND no
elige macro distinta.

Macros:

```text
$29: WAIT40, +2px*3t, +1px*2t, -1px*8t -> net 0px
$2A: WAIT40, -2px*2t, -1px*1t, +1px*5t -> net 0px
```

Impacto: tactica persistente, movimiento cinematografico local.

## 8. Defense slot8 preload/start boundary

Estado: `ROM_STATIC_VERIFIED`.

Defense card selection:

```text
Bank01:$76CF -> card AnimationResource -> AnimationSlot8 preload -> stop
```

Global starts de AnimationSlot8:

```text
Bank03:$60B2 -> STANDARD_DAMAGE
Bank03:$59FD -> BEAM
Presentation macro opcode01 slot8 -> 0
```

Clasificacion:

```text
Taiyoken $26 -> STARTED
Barrier $24 -> STARTED
Breath $27 -> STARTED
Energy Absorb $25 -> STARTED
Teleport $28 -> PRELOADED_NOT_STARTED
Time Freeze $2A -> PRELOADED_NOT_STARTED
```

## 9. Defense flags CA83

Estado: `ROM_STATIC_VERIFIED`.

`Bank7E:$56AA` mapea IDs de carta a flags:

```text
Taiyoken #19 -> $01/$81
Teleport #26 -> $02
Barrier #45 -> $04
Time Freeze #52 -> $40
Breath #53 -> $04
Energy Absorb #76 -> $08
Endurance #121 -> $10
Telepathy #122 -> $40
Foresight #123 -> $40
Shockwave #124 -> $01
Avoiding #125 -> $02
```

## 10. CA53 numeric ROM result

Estado: `SUPERSEDES`.

```text
CA83&$08 -> CA53=4 -> Energy Absorb
CA83&$04 -> CA53=3 -> Nullification
CA83&$02 -> CA53=1 -> Avoid
CA83&$10 -> CA53=2 -> Endurance/partial
```

No compilar `CA53=2` como MISS universal. Mantener resultado numerico ROM y
semantica EventLog separada.

## 11. Command/Stage suppression

Estado: `ROM_STATIC_VERIFIED`.

`CA83=$40` para Time Freeze / Telepathy / Foresight limpia `CA6A..CA73`, el
buffer de aciertos Stage/Command, antes de la resolucion posterior.

## 12. Sunglasses/Taiyoken

Estado: `ROM_STATIC_VERIFIED`.

Sunglasses #109:

```text
Bank7E:$5519 -> fighter status+7 OR $08
```

Taiyoken #19:

```text
Bank7E:$5931 -> status+7 & $08
absent -> CA83=$01
present -> CA83=$81
```

STANDARD_DAMAGE detecta `CA83&$80` y salta la cancelacion Taiyoken, continuando
el ataque normal.

## 13. Shockwave

Estado: `ROM_STATIC_VERIFIED`.

Aunque comparte `CA83&$01`, Shockwave #124 (`$7C`) salta slot8 y usa macro
`$38`:

```text
04 01 00 1F A0
ActionObject1 -> animation state $1F
```

No compartir implementacion visual con Taiyoken.

## 14. Bank68 `$1A`

Estado: `ROM_BG_FORMAT_VERIFIED`.

`Bank68:$1A` / descriptor `$7B10`:

```text
23 tiles
7 x 8 tiles = 64x56 px
BG palette slot5
```

Consumidores:

```text
CHARA -> CC15=$31 -> Bank68:$1A
Gather Power -> CC15=$33 -> Bank68:$1A
```

Common Support usa `$19`, no `$1A`.

## Artefacto externo

Estado: `EXTERNAL_ARTIFACT_IMPORTED`.

```text
path: docs/rom/packages/DBZ_LSW_ROM_RESEARCH_V5_SUPPORT_DEFENSE.zip
sha256: df5cf69521ca449d1083fd3b8327c0b4f7da5f5e71ce6492fd9e9564ae5091b1
extract: docs/rom/research-v5-support-defense/external/DBZ_LSW_ROM_RESEARCH_V5_SUPPORT_DEFENSE/
files: 59
sha256sum -c: OK
unzip -t: OK
```

## Persisten como dinamicos

```text
ACTOR_HOME
TARGET_HOME
CONTACT_POINT
semantic ActionObject slot binding
multi-actor absolute binding
```
