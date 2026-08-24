# DBZ LSW ROM Research V3

Estado: `V3_STATIC_PACKAGE_COMPLETE` - `TRACE_DYNAMIC_REDUCED_SCOPE`.

Este paquete conserva la pasada V3 de investigacion estatica ROM. Su objetivo
es separar lo que ya quedo demostrado por ROM estatica de lo que sigue
necesitando tracer dinamico.

## Resumen ejecutivo

V3 cambia el eje de la deuda tecnica:

- `ActionObject` ya tiene layout fisico byte-a-byte suficientemente
  demostrado por analisis estatico.
- La cadena `Card -> AnimationResource -> descriptor -> sequence -> frame ->
  metasprite -> graphics blocks -> tiles 2bpp -> CGB palette -> sprite fisico`
  queda reconstruida y validada en 411/411 visualFrames.
- `actorVisualProfileKey` deja de ser una clave contextual abstracta: controla
  seleccion de secuencia, banco grafico fisico y perfil de palette.
- El double buffering de tiles de luchadores queda demostrado por offsets VRAM
  y capacidad exacta de 12 piezas * 32 bytes.
- La reachability estatica mejora: STANDARD_DAMAGE seq1, Tail seq1 y las
  cuatro secuencias de V-ball Crash tienen consumidor ROM.
- Los handlers no tienen semantica global: `category/family + handler ->
  worker`.
- Support y Defense demuestran que `AnimationResource` cargado no implica
  reproduccion automatica del actor animation.
- Defense usa arquitectura fisica propia via `AnimationSlot 8`.
- `CA53=2` no debe modelarse como `MISS` universal; conservar `RESULT_0..4`
  en capa ROM y mapear semantica de gameplay despues.

## Archivos del paquete

- `LEDGER.md`: hallazgos, evidencia, impacto y supersedes.
- `OPEN_ITEMS.md`: deuda real que queda despues de V3.
- `PACKAGE_MANIFEST.json`: manifest reproducible del paquete.
- `SHA256SUMS.txt`: checksums de los archivos fuente del paquete.

## Documentos fuente relacionados

Estos documentos del repo son los contextos a actualizar/integrar tras V3:

- `docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md`
- `docs/ANIMATION_RESOURCE_DECODING.md`
- `docs/CARD_PHYSICAL_ANIMATION_COVERAGE.md`
- `docs/ROM_DERIVED_PRESENTATION_PROFILES.md`
- `docs/ROM_PRESENTATION_COMPILER.md`
- `docs/STANDARD_DAMAGE_RUNTIME_CUTOVER.md`
- `docs/BEAM_BASE_RUNTIME_CUTOVER.md`

## Regla de integracion

No promover a `ROM_DYNAMIC_VERIFIED` nada de este paquete. V3 reduce la necesidad
de tracer para layout fisico, reachability estatica y pipeline grafico, pero
mantiene como dinamicos los anchors absolutos, bindings semanticos de slots y
relaciones espaciales universales.
