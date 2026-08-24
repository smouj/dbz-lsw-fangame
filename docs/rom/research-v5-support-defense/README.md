# DBZ LSW ROM Research V5 - Support and Defense Visual Grammar

Estado: `V5_SUPPORT_DEFENSE_STATIC_PACKAGE_COMPLETE` - `EXTERNAL_ASSET_ZIP_IMPORTED`.

Baseline: `FROZEN`. V5 queda cerrado como referencia estable para
Support/Defense Visual Grammar. La investigacion siguiente esta registrada como
V6 en `docs/rom/research-v6-support-physicals/` y se limita a los recursos
fisicos card-indexed de Support (`Bank00:$2C30 -> banks $6B+`) y auditorias
derivadas; no reabre los cierres de V5 sin evidencia ROM nueva.

Este paquete registra la pasada V5 de reverse engineering centrada en la
gramatica visual fisica de Support, Defense y Move. El ZIP original reportado
por smouj (`DBZ_LSW_ROM_RESEARCH_V5_SUPPORT_DEFENSE.zip`, SHA-256
`df5cf69521ca449d1083fd3b8327c0b4f7da5f5e71ce6492fd9e9564ae5091b1`) fue
importado y verificado localmente.

## Resultado principal

V5 demuestra que Support y Defense no heredan la logica Beam de V4:

```text
SUPPORT
-> card-indexed visual load via Bank00:$2C30 / banks $6B+
-> category-scoped worker
-> optional BG resource $19/$1A path
-> palette slot5 / path-scoped palette semantics
-> waits/macros ROM

DEFENSE
-> CA02 FSM
-> GUARD / MOVE / DEFENSE_CARD selection
-> Defense AnimationResource preload in slot8
-> incoming attack decides if slot8 starts
```

## Cambios clave para runtime

- Worker identity is `category + handler`, never handler alone.
- Support uses loader `$2C30`, not offensive FX loader `$2B30`.
- Support common `$00/$02` uses `Bank68:$19`, assembled as one static
  48x56 BG graphic, not seven animation frames.
- Support hold is ROM exact: `CB77` until `$78` = 120 ticks.
- Palette `$FF` is not universally NONE; common Support passes it as physical
  palette index 255.
- Kiai `$40` and Paralysis `$29` are
  `PRELOADED_SLOT6_NOT_ACTIONOBJECT_STARTED`.
- Defense selection preloads `AnimationSlot8`; it does not play the resource.
- Slot8 starts are limited to STANDARD_DAMAGE Taiyoken and Beam CA53=3/4
  defense-result routes.
- Move persists the tactical two-bit position while local presentation motion
  nets to 0 px.
- `CA53=2` must remain a numeric ROM result because it can mean
  Endurance/partial, not just MISS.
- `CA83=$40` clears the Stage/Command success buffer for Time Freeze,
  Telepathy and Foresight.
- Sunglasses counter Taiyoken is ROM-proven via status bit `$08` and
  Taiyoken `CA83=$81`.
- Shockwave is not a Taiyoken skin; it skips slot8 and uses macro `$38`.
- `Bank68:$1A` is CHARA/Gather auxiliary BG; common Support uses `$19`.

## Archivos del paquete local

- `LEDGER.md`: hallazgos V5, evidencia e impacto.
- `OPEN_ITEMS_V5.md`: deuda real que queda despues de V5.
- `PACKAGE_MANIFEST.json`: manifest local y referencia al ZIP externo.
- `SHA256SUMS.txt`: checksums del paquete local.

## Artefactos externos importados

El paquete externo verificado quedo en:

```text
docs/rom/packages/DBZ_LSW_ROM_RESEARCH_V5_SUPPORT_DEFENSE.zip
docs/rom/research-v5-support-defense/external/DBZ_LSW_ROM_RESEARCH_V5_SUPPORT_DEFENSE/
```

Contiene 59 archivos, incluidos:

```text
data/support_workers_v5.json
data/support_fsm_v5.csv/json
data/support_card_visual_matrix_v5.csv/json
data/support_common_palettes_v5.json
data/defense_fsm_v5.csv/json
data/defense_card_flags_v5.csv/json
data/defense_slot8_consumers_v5.csv/json
data/move_position_contract_v5.json
data/ca83_resolution_and_stage_suppression_v5.json
data/presentation_macros_v5.json
data/aux_bg_resources_v5.json
data/sunglasses_taiyoken_v5.json
data/supersedes_v5.json
samples/*.png
proof/*.txt
```

Verificacion local:

```text
sha256sum docs/rom/packages/DBZ_LSW_ROM_RESEARCH_V5_SUPPORT_DEFENSE.zip
-> df5cf69521ca449d1083fd3b8327c0b4f7da5f5e71ce6492fd9e9564ae5091b1

unzip -t docs/rom/packages/DBZ_LSW_ROM_RESEARCH_V5_SUPPORT_DEFENSE.zip
sha256sum -c docs/rom/research-v5-support-defense/external/DBZ_LSW_ROM_RESEARCH_V5_SUPPORT_DEFENSE/SHA256SUMS.txt
```

Los PNG de inspeccion no definen transparencia canon GBC. Los datos para
runtime deben importarse desde `data/*.json` y conservar su provenance.
