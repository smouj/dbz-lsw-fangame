# DBZ LSW ROM Research V4 - Physical FX, Beam and Cinematic Scroll

Estado: `V4_FX_STATIC_PACKAGE_COMPLETE` - `EXTERNAL_ASSET_ZIP_IMPORTED`.

Este paquete registra la pasada V4 de reverse engineering centrada en
`FXResource`, Beam fisico y scroll cinematografico. El ZIP original reportado
por smouj (`DBZ_LSW_ROM_RESEARCH_V4_FX.zip`, SHA-256
`03cb152ad05a6f9aa50a4d236a73ed3392a29a9db292b179cbb2049d4c34d055`) fue
importado y verificado localmente.

Nota de sincronizacion: el siguiente frente que V4 dejaba abierto
(`SUPPORT / DEFENSE VISUAL GRAMMAR`) queda cubierto por V5 en
`docs/rom/research-v5-support-defense/`. V4 sigue siendo la fuente actual para
FX ofensivo, Beam, opcode `$0C` y scroll cinematografico.

## Resultado principal

V4 permite reconstruir fisicamente:

```text
CARD
-> FXResource + palette
-> descriptor ROM
-> tiles 2bpp
-> tilemap SIDE 1 / SIDE 2
-> atributos CGB
-> ventana FX seleccionada por handler
-> scroll SCX/SCY
-> efecto fisico
```

## Cambios clave para runtime

- Beam FX no es OBJ sprite: es BG tilemap domain.
- `FXResource` tiene loader exacto en `Bank00:$2B30`.
- Hay 28 offensive bundles normales; `$01`, `$04` y `$06` son tokens
  category-specific/reused y no deben parsearse como beam normal.
- Cada bundle ofensivo real tiene graphics + tilemap side1 + tilemap side2.
- Opcode VM `$0C` copia una ventana inmediata del tilemap a BG map `$9800`,
  no reproduce una animacion.
- Beam base usa prefix rows 1-8; resultados usan rows 11-18.
- Handler `$07` usa una geometria distinta: prefix rows 3-10.
- `selector row[2]/row[3]` ya son offsets fisicos de pantalla/camara via
  `C2D0/C2D1 -> opcode $0D -> C405/C406 -> SCY/SCX`.
- Estos offsets de camara no son `ACTOR_HOME`, `TARGET_HOME` ni
  `CONTACT_POINT`.
- Support/Defense no deben heredar automaticamente la logica Beam aunque
  tengan `FXResource`.

## Archivos del paquete local

- `LEDGER.md`: hallazgos V4, evidencia e impacto.
- `AGENT_HANDOFF_V4.md`: contrato directo para integrar Beam/FX en runtime.
- `OPEN_ITEMS_V4.md`: siguiente investigacion recomendada.
- `PACKAGE_MANIFEST.json`: manifest local y referencia al ZIP externo.
- `SHA256SUMS.txt`: checksums del paquete local.

## Artefactos externos importados

El paquete externo verificado quedo en:

```text
docs/rom/packages/DBZ_LSW_ROM_RESEARCH_V4_FX.zip
docs/rom/research-v4-fx/external/DBZ_LSW_ROM_RESEARCH_V4_FX/
```

Contiene 254 archivos, incluidos:

```text
data/fx_resources_exact_v4.csv/json
data/fx_card_matrix_v4.csv/json
data/fx_bundle_geometry_v4.csv/json
data/fx_opcode0c_call_sites_v4.csv/json
data/offensive_fx_execution_v4.csv/json
data/beam_actor_screen_offsets_v4.csv/json
data/fx_global_attribute_strips_v4.csv/json
data/fx_palettes_exact_v4.json
generated_fx_assets/manifest.json
generated_fx_assets/*.png
```

Verificacion local:

```text
sha256sum docs/rom/packages/DBZ_LSW_ROM_RESEARCH_V4_FX.zip
-> 03cb152ad05a6f9aa50a4d236a73ed3392a29a9db292b179cbb2049d4c34d055

unzip -t docs/rom/packages/DBZ_LSW_ROM_RESEARCH_V4_FX.zip
sha256sum -c docs/rom/research-v4-fx/external/DBZ_LSW_ROM_RESEARCH_V4_FX/SHA256SUMS.txt
```

Los datos generados para runtime deben importarse desde `data/*.json`, no desde
los PNG de inspeccion.
