# DBZ LSW ROM Research V4 Open Items

Estado: `OPEN_ITEMS_AFTER_V4`.

## Importacion local

El ZIP externo ya esta importado:

```text
docs/rom/packages/DBZ_LSW_ROM_RESEARCH_V4_FX.zip
docs/rom/research-v4-fx/external/DBZ_LSW_ROM_RESEARCH_V4_FX/
```

Verificado:

```text
zip sha256 = 03cb152ad05a6f9aa50a4d236a73ed3392a29a9db292b179cbb2049d4c34d055
unzip -t OK
sha256sum -c external/.../SHA256SUMS.txt OK
254 files
152 generated FX PNG
```

Sigue pendiente generar/importar tipos runtime estables, por ejemplo
`src/data/generated/romFxData.generated.ts`.

## Pendiente de implementacion Beam

- Nuevo cue `ROM_FX_WINDOW`.
- Nuevo render domain `BG_TILEMAP`.
- Import typed de `fx_resources_exact_v4`, `fx_card_matrix_v4`,
  `fx_bundle_geometry_v4`, `offensive_fx_execution_v4`,
  `beam_actor_screen_offsets_v4`, `fx_global_attribute_strips_v4` y
  `fx_palettes_exact_v4`.
- Beam base/variant deben seleccionar ventana por handler:

```text
normal prefix -> rows 1-8
handler $07 prefix -> rows 3-10
result -> rows 11-18
```

- No usar PNG alpha de inspeccion como canon.

## Siguiente investigacion recomendada

Mayor retorno ahora:

```text
SUPPORT / DEFENSE VISUAL GRAMMAR
```

Estado 2026-08-23: este frente fue ejecutado en V5 y queda registrado en:

```text
docs/rom/research-v5-support-defense/
```

V4 mantiene su valor para Beam/FX ofensivo. Para Support/Defense, usar V5 como
fuente actual.

Workers Support a bajar:

```text
$63BF
$64D8
$64E7
$664E
$6685
```

Preguntas:

```text
que carga grafica cada familia Support
que macros usa
que palette utiliza
si el efecto es BG / OBJ / field
que fighter pose cambia
que waits exactos tiene
como vuelve al plano tactico
```

Defense despues:

```text
Avoid
Nullification
Endurance
Absorb
Taiyoken
Teleport
Barrier
Breath
Time Freeze
Shockwave
Foresight/Telepathy
```

Objetivo historico V4:

Separarlas definitivamente sin convertirlas en skins genericas de Guard.

Estado V5: objetivo cerrado para la gramatica visual estatica principal.

## Guardrails persistentes

- `Support/Defense` no heredan `BeamFxResource`.
- `FXResource` cargado no implica reproduccion automatica.
- `AnimationResource` cargado no implica start ActionObject.
- `screenOffsetX/Y` no son anchors.
- `map-space translation` no es coordenada absoluta de pantalla.
- `handler` siempre se resuelve como `category/family + handler`.
