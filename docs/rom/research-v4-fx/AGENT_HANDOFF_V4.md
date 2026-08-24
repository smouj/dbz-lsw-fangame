# Agent Handoff V4 - Physical FX Runtime Contract

Este archivo es el punto de entrada para implementar Beam/FX tras V4.

## No volver a hacer

- No investigar Beam por nombre visible de carta.
- No renderizar Beam como `ProjectileSprite` si el objetivo es fidelidad ROM.
- No asumir que `FXResource` implica Beam ofensivo.
- No usar FX `$01`, `$04` o `$06` como bundles ofensivos normales.
- No heredar logica Beam en Support/Defense.
- No convertir `screenOffsetX/Y` en anchors de actor/target.
- No usar alpha de PNG de inspeccion como canon GBC.

## Nuevo modelo de datos recomendado

```ts
interface RomFxWindow {
  resourceId: number;
  paletteId: number;
  side: 'SIDE1' | 'SIDE2';
  renderDomain: 'BG_TILEMAP';
  windowOperand: 0x00 | 0x02 | 0x0a;
  sourceRows: readonly [number, number];
  screenOffsetY: number;
  screenOffsetX: number;
  provenance: 'ROM_STATIC_VERIFIED' | 'ROM_FX_FORMAT_VERIFIED';
}
```

## Pipeline Beam recomendado

```text
AnimationResource
-> actor physical sequence
-> WAIT_FRAME
-> FX WINDOW PREFIX
-> WAIT60
-> resolution
-> FX WINDOW RESULT
-> screen motion
-> result macro
-> cleanup
```

## Seleccion de ventana

```text
handler $07:
  PREFIX operand $02 -> rows 3-10

resto normal:
  PREFIX operand $00 -> rows 1-8

results:
  RESULT operand $0A -> rows 11-18
```

## Render domain

```text
Fighter:
  OBJ / Fighter animation domain

Beam FX:
  BG tilemap domain
  VRAM bank 1
  $8800
  BG palette slot 4
```

## Palettes

FX palette viene de `card.byte8`.

Palettes fisicas:

```text
$2C $2D $2E $2F $30 $31 $32 $33 $35
```

Cada una:

```text
Bank30:$6E00 + palette * 8
4 colors CGB BGR555
```

## Side/mirroring

Aplicar side-specific tilemap + atributos CGB:

```text
SIDE1 attrs: $0C, $4C
SIDE2 attrs: $2C, $6C
```

Mantener la anomalia fisica de Kamehameha result window: no normalizar el pixel
que rompe el espejo perfecto.

## Camara/scroll

`selector row[2]/row[3]` ya son offsets de presentacion:

```text
row[2] -> screen Y offset
row[3] -> screen X offset source, transformado por side
```

No son anchors. El runtime puede conservarlos como:

```ts
interface RomBeamScreenOffset {
  cardId: number;
  actorVisualProfileKey: number;
  sequence: number;
  screenY: number;
  screenXSide1: number;
  screenXSide2: number;
}
```

## Integration order

1. Importar y verificar ZIP externo V4 si se adjunta al repo.
2. Generar datos typed desde `data/*.json`, no desde PNG.
3. Crear `ROM_FX_WINDOW`/`RomFxWindow` en PresentationCue.
4. Cambiar Beam runtime para dibujar FX como BG tilemap/window.
5. Mantener `ProjectileSprite` solo como fallback legacy/no-ROM.
6. Actualizar `verify:beam-base-rom-cutover` para exigir renderDomain
   `BG_TILEMAP`.
7. Extender `ROM_PRESENTATION_COMPILER` para opcode `$0C` y `$0D` screen
   offsets sin inventar anchors.

## Minimum acceptance checks

```text
38 unique FXResource+palette pairs imported
152 physical windows addressable
28 offensive bundles normal
$01/$04/$06 excluded from normal bundle parser
13 opcode $0C callsites represented
handler $07 prefix rows3-10
normal prefix rows1-8
result rows11-18
BG_TILEMAP render domain
palette index 0 remains physical color, not canonical alpha
Support/Defense do not auto-play Beam FX
```
