# DBZ LSW ROM Research V5 Open Items

Estado: `OPEN_ITEMS_AFTER_V5`.

Baseline V5: `FROZEN`. El siguiente frente esta planificado como V6:

```text
docs/rom/research-v6-support-physicals/
```

V6 debe cerrar fisicamente la ruta `Bank00:$2C30 -> banks $6B+` para Support,
sin reabrir los cierres de gramatica visual V5.

## Cerrado por V5, no reabrir sin evidencia nueva

- Support dispatcher `category + handler`.
- Support card-indexed visual loader `$2C30` como ruta separada de Beam FX.
- Common Support BG `$19`, formato 48x56, palette slot5 y hold 120 ticks.
- Palette `$FF` como indice fisico en common Support.
- Kiai/Paralysis como `PRELOADED_SLOT6_NOT_ACTIONOBJECT_STARTED`.
- Defense FSM separada via `CA02`.
- Move tactico persistente separado de pelicula local net0.
- Defense card selection como preload de slot8, no playback.
- Slot8 starts exactos en STANDARD_DAMAGE y Beam CA53=3/4.
- Defense CA83 mapping de las 11 cartas.
- CA53 numeric result, especialmente `CA53=2` Endurance/partial.
- Time Freeze/Telepathy/Foresight limpiando `CA6A..CA73`.
- Sunglasses counter Taiyoken.
- Shockwave separado de Taiyoken.
- Bank68 `$1A` asignado a CHARA/Gather.

## Pendiente estatico de alto valor

- Clasificar semanticamente los recursos visuales card-indexed de Support en
  banks `$6B+` sin deducir por nombre de carta.
- Completar macros Support `$2B/$2C/$34/$35` solo donde binding fisico de
  actor/objeto pueda probarse.
- Integrar Beam/Defense result macros con `romCA53` numerico + outcome EventLog
  separado.
- Generar imports typed de V5 (`support_workers`, `support_fsm`,
  `defense_fsm`, `defense_card_flags`, `slot8_consumers`, `move_contract`,
  `aux_bg_resources`, `presentation_macros`) si se decide hacer cutover.
- Definir cue bajo nivel para BG assemblies (`ROM_BG_ASSEMBLY` o equivalente)
  antes de representar `$19/$1A` en runtime.

## Gate V6 minimo

No cerrar V6 hasta cumplir:

```text
$2C30 completamente decodificado
48/48 Support recorren el loader
48/48 tienen descriptor fisico o razon explicita
aliases fisicos identificados
graphics/layout/palette separados
$00/$02 -> BG19 confirmado
$0B/$0D/$0F -> sin BG19 confirmado
macros $2B/$2C/$34/$35 literales decodificadas
Teleport/TimeFreeze audit global
romCA53 nunca convertido a semantica sin contexto
0 anchors inventados
0 slot bindings inventados
```

## Pendiente dinamico real

- Semantic ActionObject slot binding.
- `ACTOR_HOME`.
- `TARGET_HOME`.
- `CONTACT_POINT`.
- Handler-specific absolute actor anchors.
- Special multi-actor binding.

## Guardrails de implementacion

- No resolver `handler` sin `category/family`.
- No mandar Support por `ROM_FX_WINDOW` de V4.
- No normalizar `$FF` a NONE fuera de una ruta que lo demuestre.
- No reproducir `AnimationResource`/`FXResource` solo porque el campo exista.
- No reproducir Defense slot8 al seleccionar la defensa.
- No traducir `CA53=2` a MISS universal.
- No derivar posicion tactica desde motion del Presenter.
- No tratar Teleport/Time Freeze como resources started en sus rutas definidas.
- No convertir Shockwave en skin de Taiyoken.
- No inventar anchors desde scroll, row offsets o motion net0.
