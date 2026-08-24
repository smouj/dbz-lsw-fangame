# DBZ LSW ROM Research V4 FX Ledger

Fecha: 2026-08-23

Fuente: reporte V4 de smouj + ZIP externo importado y verificado localmente.

## Estados de evidencia

- `ROM_STATIC_VERIFIED`: demostrado por codigo/datos ROM.
- `ROM_FX_FORMAT_VERIFIED`: formato de bundle/tiles/tilemap verificado para
  los casos indicados.
- `ROM_OPCODE_VERIFIED`: semantica de opcode o callsite ROM identificada.
- `EXTERNAL_ARTIFACT_IMPORTED`: artefacto generado copiado al repo y validado.
- `PENDING_ROM_TRACE`: sigue requiriendo ejecucion dinamica.

## 1. Loader exacto de FXResource

Estado: `ROM_STATIC_VERIFIED`.

`Bank00:$2B30` demuestra:

```text
fxBank = $65 + floor(FXResource / $1E)
fxLocal = FXResource % $1E
palette = card.byte8
```

Metricas corregidas:

```text
32 valores FX contando $FF -> 31 IDs fisicos no-FF
10 valores palette contando $FF -> 9 palettes fisicas no-FF
```

Palettes fisicas:

```text
$2C $2D $2E $2F $30 $31 $32 $33 $35
```

## 2. Bundles FX ofensivos

Estado: `ROM_FX_FORMAT_VERIFIED`.

De 31 IDs fisicos:

```text
28 = NORMAL_OFFENSIVE_BUNDLE
3 = category-specific/reused token: $01, $04, $06
```

Un bundle ofensivo normal:

```text
base + 0 -> graphics
base + 1 -> tilemap SIDE 1
base + 2 -> tilemap SIDE 2
```

Impacto:

`$01`, `$04` y `$06` no deben parsearse con el formato Beam ofensivo normal sin
contexto de categoria/familia.

## 3. Beam FX es BG tilemap, no OBJ sprite

Estado: `ROM_STATIC_VERIFIED`.

La ROM carga:

```text
FX graphics -> VRAM bank 1 -> $8800
palette Bank30:$6E00 + palette * 8 -> BG palette slot 4
```

Separacion grafica:

```text
Fighter -> OBJ / Fighter animation domain
Beam FX -> BG tilemap domain
```

Impacto runtime:

No modelar Kamehameha fiel como `FighterActor + ProjectileSprite` si el objetivo
es conservar la logica fisica del cartucho.

## 4. Tilemaps laterales 20x32

Estado: `ROM_FX_FORMAT_VERIFIED`.

Para 56 side maps de 28 bundles:

```text
20 rows * 32 columns = 640 bytes
row 0 = blank
row 9 = blank
row 10 = blank
row 19 = blank
```

Validacion:

```text
todos los tile IDs pertenecen al graphics payload del mismo FX
0 referencias fuera de rango
```

## 5. Opcode $0C

Estado: `ROM_OPCODE_VERIFIED`.

`Bank7E:$71CA`, opcode `$0C`, no reproduce animacion. Hace copia inmediata de
una ventana del tilemap:

```text
destino BG map $9800
row = 4
column = 0
height = 8 tiles
width = 32 tiles
```

El operand se incrementa internamente antes de leer:

```text
operand $00 -> source rows 1-8
operand $02 -> source rows 3-10
operand $0A -> source rows 11-18
```

Modelo correcto:

```text
ROM_FX_WINDOW {
  resource
  palette
  side
  sourceRows
}
```

La pelicula la determinan waits y screen motion del handler.

## 6. Trece callsites opcode $0C

Estado: `ROM_OPCODE_VERIFIED`.

Hay exactamente 13 llamadas y todas estan en `Bank03`, ofensiva /
STANDARD_ATTACK. No aparecen en Support/Defense.

Beam core:

```text
Bank03:$586C operand $00 -> rows 1-8
```

Resultados Beam:

```text
$5924 operand $0A -> rows 11-18
$5969 operand $0A -> rows 11-18
$59A1 operand $0A -> rows 11-18
$59D8 operand $0A -> rows 11-18
```

Overrides:

```text
$03 -> $5AB7 -> $00
$04 -> $5B28 -> $00
$05 -> $5B84 -> $00
$06 -> $5BEA -> $00
$0D -> $5CB8 -> $00
$0E -> $5DAB -> $00
```

## 7. Handler $07 usa rows 3-10

Estado: `ROM_OPCODE_VERIFIED`.

```text
Bank03:$5E47 LD E,$02
CALL $3EE1

Bank03:$5E4C
CALL $3F24
```

`$3EE1 -> $72DF` lee `E` sin destruirlo y los wrappers de banks no modifican
`DE`.

Por tanto:

```text
handler $07 -> opcode $0C operand $02 -> rows 3-10
```

Acciones afectadas:

```text
Destruct-Disk
S.Destruc-D.
Spirit Bomb
Galactica D.
Crasher Ball
Super E-Ball
Energy Slice
```

Impacto:

Un `BEAM_BASE` visual universal pierde geometria ROM real.

## 8. Kamehameha FX $05 palette $2C

Estado: `EXTERNAL_ARTIFACT_IMPORTED`.

Datos reportados:

```text
FXResource $05
palette $2C
Bank65 local5
31 tiles
496 bytes graphics
SIDE1 -> local6
SIDE2 -> local7
```

Ventanas:

```text
State14 / prefix: operand $00 -> rows 1-8 -> haz largo
Result:           operand $0A -> rows 11-18 -> forma circular compacta
```

Proviene de:

```text
ROM tiles + ROM tilemap + ROM palette + ROM CGB attributes
```

No de reconstruccion visual manual.

## 9. Catalogo fisico de 28 FX ofensivos

Estado: `EXTERNAL_ARTIFACT_IMPORTED`.

El paquete externo contiene catalogo fisico y 152 renders para 38 pares unicos
`FXResource + palette`:

```text
38 pairs * SIDE1/SIDE2 * PREFIX/RESULT = 152 PNG
```

Cada entrada del manifest externo conserva:

```text
FXResource
palette
side
phase
operand
source rows
bbox
SHA256
consumer cards
```

Precaucion:

Los PNG de inspeccion usan `palette index 0 -> alpha 0`, solo para revisar. Eso
no es comportamiento GBC: estos FX son BG tiles y color0 fisico de las nueve
palettes es blanco.

## 10. Prefix/result: traslacion vs cambio fisico

Estado: `ROM_FX_FORMAT_VERIFIED`.

Comparacion de 28 bundles:

```text
18 -> mismo bitmap exacto, distinta posicion en BG map
10 -> bitmap de resultado cambia fisicamente
```

Ejemplo:

```text
Energy Bomb prefix -> bola
Energy Bomb result -> misma bola desplazada +80 px en map-space
```

Desplazamientos detectados:

```text
+16 +24 +32 +40 +48 +56 +64 +80 px
```

Nota:

Es `map-space`, no coordenada absoluta de pantalla, porque interviene `SCX`.

## 11. Mirroring y anomalia Kamehameha

Estado: `ROM_FX_FORMAT_VERIFIED`.

```text
28 FX * 2 windows = 56 pares SIDE1/SIDE2
55/56 -> espejo horizontal pixel-exacto
1/56  -> excepcion: FX $05 Kamehameha result window
```

La excepcion difiere en 1 pixel respecto al espejo matematico. No corregirla
para pixel-perfect: forma parte del dato fisico.

## 12. Mirroring por atributos CGB

Estado: `ROM_STATIC_VERIFIED`.

SIDE 1:

```text
$0C = palette4 + VRAM bank1
$4C = palette4 + VRAM bank1 + Y FLIP
```

SIDE 2:

```text
$2C = palette4 + VRAM bank1 + X FLIP
$6C = palette4 + VRAM bank1 + X FLIP + Y FLIP
```

Impacto:

La ROM usa side-specific tilemap + XFLIP/YFLIP CGB, no segundo set duplicado de
graficos.

## 13. Selector row[2]/row[3] -> scroll cinematografico

Estado: `ROM_STATIC_VERIFIED`.

`$3966`:

```text
row[2] -> C2D0
row[3] -> C2D1
```

Luego Beam:

```text
C2D0/C2D1 -> opcode $0D
VM -> C405/C406
Bank00:$0DA2:
  SCY = C407 + C405
  SCX = C409 + C406
```

Por tanto:

```text
row[2] = presentation screen-Y offset
row[3] = presentation screen-X offset source, transformado segun side
```

La matriz externa reportada cubre 240 combinaciones Beam <-> forma:

```text
card
actorVisualProfile
sequence
screen Y byte
screen X side1
screen X side2
```

Guardrail:

No convertir estos offsets de camara en `ACTOR_HOME`, `TARGET_HOME` o
`CONTACT_POINT`.

## 14. Support/Defense no heredan Beam FX

Estado: `ROM_STATIC_VERIFIED`.

Las 13 llamadas a opcode `$0C` son ofensivas. Support y Defense no deben hacer:

```text
si tiene FXResource -> reproduce BeamFxResource()
```

Esto explica por que FX `$01`, `$04`, `$06` no encajan como bundles ofensivos
normales.

## 15. Kiai/Paralysis refuerzo V3

Estado: `ROM_STATIC_VERIFIED`.

Support `$0D`:

```text
Bank03:$664E
state $14 -> macro $2B
macro $2B: 0 opcode $01
```

No hay start `AnimationSlot6`. Busqueda global de starts no encuentra ruta
Support que arranque el recurso de carta cargado.

Conclusiones:

```text
Kiai AnimationResource $40
Paralysis AnimationResource $29

RESOURCE LOADED
NO STATIC SUPPORT ACTIONOBJECT START
```

No reproducirlos automaticamente por `card.byte6 != $FF`.

## 16. Paquete externo V4

Estado: `EXTERNAL_ARTIFACT_IMPORTED`.

Artefacto:

```text
path: docs/rom/packages/DBZ_LSW_ROM_RESEARCH_V4_FX.zip
extract: docs/rom/research-v4-fx/external/DBZ_LSW_ROM_RESEARCH_V4_FX/
sha256: 03cb152ad05a6f9aa50a4d236a73ed3392a29a9db292b179cbb2049d4c34d055
files: 254
generated FX PNG: 152
verification: sha256sum -c SHA256SUMS.txt OK, unzip -t OK, zip SHA OK
```
