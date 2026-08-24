# DBZ LSW ROM Research V3 Open Items

Estado: `OPEN_ITEMS_AFTER_V3`.

## Resuelto por V3, no reabrir sin evidencia nueva

- `AnimationResource` pointers principales de esta pasada.
- `sequenceCount`, frame boundaries, durations y offsets fisicos donde V3 los
  cierra.
- Metasprite -> graphics blocks -> tiles 2bpp.
- Graphics bank por `actorVisualProfileKey`.
- Character/form palettes CGB por `actorVisualProfileKey`.
- ActionObject physical fields listados en V3.
- STANDARD_DAMAGE seq1 reachability.
- Tail seq1 reachability.
- V-ball seq1/seq2/seq3 reachability.
- Defense slot8 architecture.

## Pendiente estatico concreto

- Lightning C. `$06 seq1` reachability desde cualquier ruta no localizada.
- Kiai `$40` y Paralysis `$29`: proposito del recurso cargado en slot6 si no
  existe start ActionObject observado. V5 mantiene la clasificacion como
  `PRELOADED_SLOT6_NOT_ACTIONOBJECT_STARTED`.
- FXResource ofensivo: cubierto por V4; queda pendiente su cutover runtime typed.
- Detalles Support/Defense Presentation por worker: cubiertos en V5 para la
  gramatica visual estatica principal; queda pendiente clasificar los recursos
  Support card-indexed de banks `$6B+`.

## Pendiente dinamico real

- Absolute anchors.
- Binding semantico final de slot0/slot1.
- Multi-actor binding especial.
- Coordenadas semanticas universales:

```text
ACTOR_HOME
TARGET_HOME
CONTACT_POINT
```

## Guardrails de implementacion

- No reproducir actor animation solo porque una carta tenga
  `AnimationResource`.
- No resolver `handler` sin `category/family`.
- No usar `CA53=2` como `MISS` universal.
- No convertir descriptor fisico compartido en accion logica compartida.
- No inventar anchors desde posicion visual final.
- No marcar Kiai/Paralysis como `unused`; usar estado cargado-pero-sin-start.
- No marcar Lightning C. `$06 seq1` como `unused`; usar
  `UNOBSERVED_STATIC_FROM_LIGHTNING_C_PATH`.

## Audit items para cutovers actuales

### STANDARD_DAMAGE `$0A`

Verificar antes de llamarlo fidelidad cerrada:

```text
slot6 card resource + slot7 generic sequence
RESULT_2/CA53=2 no tratado como MISS puro
```

### Beam

Siguiente frente visible:

```text
FXResource -> physical graphics/program exacto
```

Necesario para renderizar haz/bola/disco/proyectil ROM, no solo actor
correcto.

Estado 2026-08-23: cubierto por V4 para FX ofensivo fisico; sigue pendiente el
cutover runtime `ROM_FX_WINDOW`.
