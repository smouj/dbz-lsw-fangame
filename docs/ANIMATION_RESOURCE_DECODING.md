# DBZ LSW — Animation Resource Decoding

> **V3 SUPERSEDES (2026-08-23)**: ver
> `docs/rom/research-v3/LEDGER.md`. La tabla generada de este documento queda
> por regenerar con V3: Lightning C. `$06`, Kiai `$40`, Paralysis `$29`,
> STANDARD_DAMAGE `$2C-$3E`, Tail `$3F`, V-ball `$41` y Defense `$24-$2A`
> tienen correcciones de reachability/descriptor/slot documentadas en el
> ledger. No usar estados antiguos `POINTER_TABLE_UNRESOLVED` o
> `NEEDS_DYNAMIC_TRACE` de esas filas sin contrastar V3.

Estado: `ANIMATION RESOURCE DECODING ACTIVE` · `TRACE DYNAMIC PARKED`.

La unidad de progreso de este bloque es `AnimationResource`, no carta. El catálogo conserva la separación:

- `EXECUTION`: handler/familia ROM.
- `ACTOR ANIMATION`: AnimationResource, secuencias y frames físicos.
- `VISUAL EFFECT`: FXResource, paleta, aura y visual runtime.

No se inventan anchors, BASE_X/BASE_Y, slot binding ni coordenadas absolutas en este documento.

## Summary

- AnimationResources inventariados: 66
- Referenciados por cartas: 65
- DECODED: 12
- PARTIAL: 48
- SPECIAL: 5
- UNKNOWN: 1
- STATICALLY_CLOSED: 12
- STATICALLY_CLOSABLE: 48
- STATIC_LIMIT_REACHED: 1
- NEEDS_DYNAMIC_TRACE: 5
- Cartas cubiertas por recursos decodificados: 16
- Completion causes: NONE=12 · POINTER_TABLE_UNRESOLVED=5 · HANDLER_SELECTED_SEQUENCE=23 · UNREFERENCED_RESOURCE=1 · SEQUENCE_COUNT_UNRESOLVED=6 · FRAME_STREAM_PARTIAL=19

## Catalog

| Resource | Bank | Local | Cards Using It | Handlers | Sequences | Physical Frames | Timing | Status | Completion | Cause | Evidence | Source Technique |
|---|---|---:|---:|---|---:|---:|---:|---|---|---|---|---|
| 0x00 | 0x62 | 0 | 1 | 0x02 | 2 | 14 | 30 | DECODED | STATICALLY_CLOSED | NONE | ROM_SEQUENCE_VERIFIED | Energy Wave |
| 0x01 | 0x62 | 1 | 1 | 0x02 | 2 | 12 | 26 | DECODED | STATICALLY_CLOSED | NONE | ROM_SEQUENCE_VERIFIED | Finger Beam |
| 0x02 | 0x62 | 2 | 1 | 0x02 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | POINTER_TABLE_UNRESOLVED | ROM_STATIC_VERIFIED | — |
| 0x03 | 0x62 | 3 | 4 | 0x02 | 6 | 48 | 450 | DECODED | STATICALLY_CLOSED | NONE | ROM_SEQUENCE_VERIFIED | Kamehameha |
| 0x04 | 0x62 | 4 | 1 | 0x02 | 2 | 14 | 148 | DECODED | STATICALLY_CLOSED | NONE | ROM_SEQUENCE_VERIFIED | Masenko |
| 0x05 | 0x62 | 5 | 1 | 0x02 | 2 | 16 | 152 | DECODED | STATICALLY_CLOSED | NONE | ROM_SEQUENCE_VERIFIED | Galick-Ho |
| 0x06 | 0x62 | 6 | 1 | 0x02 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | POINTER_TABLE_UNRESOLVED | ROM_STATIC_VERIFIED | — |
| 0x07 | 0x62 | 7 | 1 | 0x04 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x08 | 0x62 | 8 | 1 | 0x02 | 1 | 8 | 77 | DECODED | STATICALLY_CLOSED | NONE | ROM_SEQUENCE_VERIFIED | Misty KiWave |
| 0x09 | 0x62 | 9 | 1 | 0x02 | 2 | 16 | 156 | DECODED | STATICALLY_CLOSED | NONE | ROM_SEQUENCE_VERIFIED | Final Flash |
| 0x0a | 0x62 | 10 | 1 | 0x03 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x0b | 0x62 | 11 | 1 | 0x02 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | POINTER_TABLE_UNRESOLVED | ROM_STATIC_VERIFIED | — |
| 0x0c | 0x62 | 12 | 1 | 0x05 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x0d | 0x62 | 13 | 0 | — | 0 | 0 | 0 | UNKNOWN | STATIC_LIMIT_REACHED | UNREFERENCED_RESOURCE | PENDING_ROM_TRACE | — |
| 0x0e | 0x62 | 14 | 1 | 0x05 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x0f | 0x62 | 15 | 1 | 0x05 | 2 | 16 | 150 | DECODED | STATICALLY_CLOSED | NONE | ROM_SEQUENCE_VERIFIED | Big Bang Attack |
| 0x10 | 0x62 | 16 | 1 | 0x05 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x11 | 0x62 | 17 | 1 | 0x05 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x12 | 0x62 | 18 | 2 | 0x07 | 4 | 36 | 316 | DECODED | STATICALLY_CLOSED | NONE | ROM_SEQUENCE_VERIFIED | Destructo Disk |
| 0x13 | 0x62 | 19 | 1 | 0x07 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x14 | 0x62 | 20 | 1 | 0x05 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x15 | 0x62 | 21 | 1 | 0x05 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x16 | 0x62 | 22 | 1 | 0x02 | 2 | 16 | 156 | DECODED | STATICALLY_CLOSED | NONE | ROM_SEQUENCE_VERIFIED | Special Beam Cannon |
| 0x17 | 0x62 | 23 | 1 | 0x05 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x18 | 0x62 | 24 | 1 | 0x07 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x19 | 0x63 | 0 | 1 | 0x02 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | POINTER_TABLE_UNRESOLVED | ROM_STATIC_VERIFIED | — |
| 0x1a | 0x63 | 1 | 1 | 0x03 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x1b | 0x63 | 2 | 1 | 0x07 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x1c | 0x63 | 3 | 2 | 0x0d, 0x0e | 0 | 0 | 0 | SPECIAL | NEEDS_DYNAMIC_TRACE | HANDLER_SELECTED_SEQUENCE | ROM_HANDLER_VERIFIED | — |
| 0x1d | 0x63 | 4 | 1 | 0x05 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x1e | 0x63 | 5 | 1 | 0x02 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | POINTER_TABLE_UNRESOLVED | ROM_STATIC_VERIFIED | — |
| 0x1f | 0x63 | 6 | 1 | 0x06 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x20 | 0x63 | 7 | 1 | 0x03 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x21 | 0x63 | 8 | 1 | 0x07 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x22 | 0x63 | 9 | 1 | 0x07 | 1 | 10 | 85 | DECODED | STATICALLY_CLOSED | NONE | ROM_SEQUENCE_VERIFIED | Spirit Bomb |
| 0x23 | 0x63 | 10 | 1 | 0x05 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | HANDLER_SELECTED_SEQUENCE | ROM_STATIC_VERIFIED | — |
| 0x24 | 0x63 | 11 | 1 | 0x00 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | SEQUENCE_COUNT_UNRESOLVED | ROM_STATIC_VERIFIED | — |
| 0x25 | 0x63 | 12 | 1 | 0x00 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | SEQUENCE_COUNT_UNRESOLVED | ROM_STATIC_VERIFIED | — |
| 0x26 | 0x63 | 13 | 1 | 0x00 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | SEQUENCE_COUNT_UNRESOLVED | ROM_STATIC_VERIFIED | — |
| 0x27 | 0x63 | 14 | 1 | 0x00 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | SEQUENCE_COUNT_UNRESOLVED | ROM_STATIC_VERIFIED | — |
| 0x28 | 0x63 | 15 | 1 | 0x00 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | SEQUENCE_COUNT_UNRESOLVED | ROM_STATIC_VERIFIED | — |
| 0x29 | 0x63 | 16 | 1 | 0x0d | 0 | 0 | 0 | SPECIAL | NEEDS_DYNAMIC_TRACE | HANDLER_SELECTED_SEQUENCE | ROM_HANDLER_VERIFIED | — |
| 0x2a | 0x63 | 17 | 1 | 0x00 | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | SEQUENCE_COUNT_UNRESOLVED | ROM_STATIC_VERIFIED | — |
| 0x2b | 0x63 | 18 | 1 | 0x08 | 0 | 0 | 0 | SPECIAL | NEEDS_DYNAMIC_TRACE | HANDLER_SELECTED_SEQUENCE | ROM_HANDLER_VERIFIED | — |
| 0x2c | 0x63 | 19 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x2d | 0x63 | 20 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x2e | 0x63 | 21 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x2f | 0x63 | 22 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x30 | 0x63 | 23 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x31 | 0x63 | 24 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x32 | 0x64 | 0 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x33 | 0x64 | 1 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x34 | 0x64 | 2 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x35 | 0x64 | 3 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x36 | 0x64 | 4 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x37 | 0x64 | 5 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x38 | 0x64 | 6 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x39 | 0x64 | 7 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x3a | 0x64 | 8 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x3b | 0x64 | 9 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x3c | 0x64 | 10 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x3d | 0x64 | 11 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x3e | 0x64 | 12 | 1 | 0x0a | 0 | 0 | 0 | PARTIAL | STATICALLY_CLOSABLE | FRAME_STREAM_PARTIAL | ROM_STATIC_VERIFIED | — |
| 0x3f | 0x64 | 13 | 1 | 0x0b | 2 | 26 | 256 | DECODED | STATICALLY_CLOSED | NONE | ROM_SEQUENCE_VERIFIED | Tail |
| 0x40 | 0x64 | 14 | 1 | 0x0d | 0 | 0 | 0 | SPECIAL | NEEDS_DYNAMIC_TRACE | HANDLER_SELECTED_SEQUENCE | ROM_HANDLER_VERIFIED | — |
| 0x41 | 0x64 | 15 | 1 | 0x0c | 0 | 0 | 0 | SPECIAL | NEEDS_DYNAMIC_TRACE | HANDLER_SELECTED_SEQUENCE | ROM_HANDLER_VERIFIED | — |

## Resource Notes

### 0x00

- Bank/local: 0x62/0
- Cards: Energy Wave
- Handlers: 0x02
- Status: DECODED · KNOWN_FORMAT · ROM_SEQUENCE_VERIFIED
- Completion: STATICALLY_CLOSED · NONE
- Completion detail: Frame stream, sequence boundaries, timings, offsets and raw bytes are decoded from the static ROM extraction.
- Dynamic dependencies: —
- Sequences: 2 · physical frames: 14 · total ticks: 30
- Source technique: Energy Wave
- Notes: Frame records decoded from rom-anim-sequences.json.

### 0x01

- Bank/local: 0x62/1
- Cards: Finger Beam
- Handlers: 0x02
- Status: DECODED · KNOWN_FORMAT · ROM_SEQUENCE_VERIFIED
- Completion: STATICALLY_CLOSED · NONE
- Completion detail: Frame stream, sequence boundaries, timings, offsets and raw bytes are decoded from the static ROM extraction.
- Dynamic dependencies: —
- Sequences: 2 · physical frames: 12 · total ticks: 26
- Source technique: Finger Beam
- Notes: Frame records decoded from rom-anim-sequences.json.

### 0x02

- Bank/local: 0x62/2
- Cards: Eye Beam
- Handlers: 0x02
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · POINTER_TABLE_UNRESOLVED
- Completion detail: Base beam/support handler uses the known resource id, but the resource pointer table entry has not been resolved to complete sequences yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x03

- Bank/local: 0x62/3
- Cards: Kamehameha, S.Kamehameha, F.Kamehameha, Kamekameha
- Handlers: 0x02
- Status: DECODED · KNOWN_FORMAT · ROM_SEQUENCE_VERIFIED
- Completion: STATICALLY_CLOSED · NONE
- Completion detail: Frame stream, sequence boundaries, timings, offsets and raw bytes are decoded from the static ROM extraction.
- Dynamic dependencies: —
- Sequences: 6 · physical frames: 48 · total ticks: 450
- Source technique: Kamehameha
- Notes: Frame records decoded from rom-anim-sequences.json.

### 0x04

- Bank/local: 0x62/4
- Cards: Masenko
- Handlers: 0x02
- Status: DECODED · KNOWN_FORMAT · ROM_SEQUENCE_VERIFIED
- Completion: STATICALLY_CLOSED · NONE
- Completion detail: Frame stream, sequence boundaries, timings, offsets and raw bytes are decoded from the static ROM extraction.
- Dynamic dependencies: —
- Sequences: 2 · physical frames: 14 · total ticks: 148
- Source technique: Masenko
- Notes: Frame records decoded from rom-anim-sequences.json.

### 0x05

- Bank/local: 0x62/5
- Cards: Galick-Ho
- Handlers: 0x02
- Status: DECODED · KNOWN_FORMAT · ROM_SEQUENCE_VERIFIED
- Completion: STATICALLY_CLOSED · NONE
- Completion detail: Frame stream, sequence boundaries, timings, offsets and raw bytes are decoded from the static ROM extraction.
- Dynamic dependencies: —
- Sequences: 2 · physical frames: 16 · total ticks: 152
- Source technique: Galick-Ho
- Notes: Frame records decoded from rom-anim-sequences.json.

### 0x06

- Bank/local: 0x62/6
- Cards: Lightning C.
- Handlers: 0x02
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · POINTER_TABLE_UNRESOLVED
- Completion detail: Base beam/support handler uses the known resource id, but the resource pointer table entry has not been resolved to complete sequences yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x07

- Bank/local: 0x62/7
- Cards: Burning Atk.
- Handlers: 0x04
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x08

- Bank/local: 0x62/8
- Cards: Misty KiWave
- Handlers: 0x02
- Status: DECODED · KNOWN_FORMAT · ROM_SEQUENCE_VERIFIED
- Completion: STATICALLY_CLOSED · NONE
- Completion detail: Frame stream, sequence boundaries, timings, offsets and raw bytes are decoded from the static ROM extraction.
- Dynamic dependencies: —
- Sequences: 1 · physical frames: 8 · total ticks: 77
- Source technique: Misty KiWave
- Notes: Frame records decoded from rom-anim-sequences.json.

### 0x09

- Bank/local: 0x62/9
- Cards: Final Flash
- Handlers: 0x02
- Status: DECODED · KNOWN_FORMAT · ROM_SEQUENCE_VERIFIED
- Completion: STATICALLY_CLOSED · NONE
- Completion detail: Frame stream, sequence boundaries, timings, offsets and raw bytes are decoded from the static ROM extraction.
- Dynamic dependencies: —
- Sequences: 2 · physical frames: 16 · total ticks: 156
- Source technique: Final Flash
- Notes: Frame records decoded from rom-anim-sequences.json.

### 0x0a

- Bank/local: 0x62/10
- Cards: Eraser Can.
- Handlers: 0x03
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x0b

- Bank/local: 0x62/11
- Cards: Hell Flash
- Handlers: 0x02
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · POINTER_TABLE_UNRESOLVED
- Completion detail: Base beam/support handler uses the known resource id, but the resource pointer table entry has not been resolved to complete sequences yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x0c

- Bank/local: 0x62/12
- Cards: Energy Bomb
- Handlers: 0x05
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x0e

- Bank/local: 0x62/14
- Cards: KiBlast Bomb
- Handlers: 0x05
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x0f

- Bank/local: 0x62/15
- Cards: Big Bang Atk
- Handlers: 0x05
- Status: DECODED · KNOWN_FORMAT · ROM_SEQUENCE_VERIFIED
- Completion: STATICALLY_CLOSED · NONE
- Completion detail: Frame stream, sequence boundaries, timings, offsets and raw bytes are decoded from the static ROM extraction.
- Dynamic dependencies: —
- Sequences: 2 · physical frames: 16 · total ticks: 150
- Source technique: Big Bang Attack
- Notes: Frame records decoded from rom-anim-sequences.json.

### 0x10

- Bank/local: 0x62/16
- Cards: Fin.Buster
- Handlers: 0x05
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x11

- Bank/local: 0x62/17
- Cards: F.Lightbomb
- Handlers: 0x05
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x12

- Bank/local: 0x62/18
- Cards: Destruct-Disk, S.Destruc-D.
- Handlers: 0x07
- Status: DECODED · KNOWN_FORMAT · ROM_SEQUENCE_VERIFIED
- Completion: STATICALLY_CLOSED · NONE
- Completion detail: Frame stream, sequence boundaries, timings, offsets and raw bytes are decoded from the static ROM extraction.
- Dynamic dependencies: —
- Sequences: 4 · physical frames: 36 · total ticks: 316
- Source technique: Destructo Disk
- Notes: Frame records decoded from rom-anim-sequences.json.

### 0x13

- Bank/local: 0x62/19
- Cards: Energy Slice
- Handlers: 0x07
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x14

- Bank/local: 0x62/20
- Cards: Grand Wave
- Handlers: 0x05
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x15

- Bank/local: 0x62/21
- Cards: Energy Slash
- Handlers: 0x05
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x16

- Bank/local: 0x62/22
- Cards: S.Beam Can.
- Handlers: 0x02
- Status: DECODED · KNOWN_FORMAT · ROM_SEQUENCE_VERIFIED
- Completion: STATICALLY_CLOSED · NONE
- Completion detail: Frame stream, sequence boundaries, timings, offsets and raw bytes are decoded from the static ROM extraction.
- Dynamic dependencies: —
- Sequences: 2 · physical frames: 16 · total ticks: 156
- Source technique: Special Beam Cannon
- Notes: Frame records decoded from rom-anim-sequences.json.

### 0x17

- Bank/local: 0x62/23
- Cards: M.Soundwave
- Handlers: 0x05
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x18

- Bank/local: 0x62/24
- Cards: Galactica D.
- Handlers: 0x07
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x19

- Bank/local: 0x63/0
- Cards: Flash.Sword
- Handlers: 0x02
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · POINTER_TABLE_UNRESOLVED
- Completion detail: Base beam/support handler uses the known resource id, but the resource pointer table entry has not been resolved to complete sequences yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x1a

- Bank/local: 0x63/1
- Cards: Telekinesis
- Handlers: 0x03
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x1b

- Bank/local: 0x63/2
- Cards: Crasher Ball
- Handlers: 0x07
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x1c

- Bank/local: 0x63/3
- Cards: Purple Comet, P.Comet Z
- Handlers: 0x0d, 0x0e
- Status: SPECIAL · SPECIAL · ROM_HANDLER_VERIFIED
- Completion: NEEDS_DYNAMIC_TRACE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Special/multi-actor handler owns sequence and slot selection at runtime; static card fields preserve the resource id but cannot close actor binding alone.
- Dynamic dependencies: handler FSM, slot binding, runtime actor selection
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Special/multi-actor handler: keep static resource id, defer FSM/slot closure to dynamic traces.

### 0x1d

- Bank/local: 0x63/4
- Cards: Rocket Punch
- Handlers: 0x05
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x1e

- Bank/local: 0x63/5
- Cards: Sweet Beam
- Handlers: 0x02
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · POINTER_TABLE_UNRESOLVED
- Completion detail: Base beam/support handler uses the known resource id, but the resource pointer table entry has not been resolved to complete sequences yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x1f

- Bank/local: 0x63/6
- Cards: Potbelly Atk
- Handlers: 0x06
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x20

- Bank/local: 0x63/7
- Cards: Body Change
- Handlers: 0x03
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x21

- Bank/local: 0x63/8
- Cards: Super E-Ball
- Handlers: 0x07
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x22

- Bank/local: 0x63/9
- Cards: Spirit Bomb
- Handlers: 0x07
- Status: DECODED · KNOWN_FORMAT · ROM_SEQUENCE_VERIFIED
- Completion: STATICALLY_CLOSED · NONE
- Completion detail: Frame stream, sequence boundaries, timings, offsets and raw bytes are decoded from the static ROM extraction.
- Dynamic dependencies: —
- Sequences: 1 · physical frames: 10 · total ticks: 85
- Source technique: Spirit Bomb
- Notes: Frame records decoded from rom-anim-sequences.json.

### 0x23

- Bank/local: 0x63/10
- Cards: S.G.K.Atk.
- Handlers: 0x05
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x24

- Bank/local: 0x63/11
- Cards: Barrier
- Handlers: 0x00
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · SEQUENCE_COUNT_UNRESOLVED
- Completion detail: Support/defense card references an actor resource without a standard attack handler; the static pass must resolve sequence count/boundaries from the resource table.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x25

- Bank/local: 0x63/12
- Cards: Energy Absorb
- Handlers: 0x00
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · SEQUENCE_COUNT_UNRESOLVED
- Completion detail: Support/defense card references an actor resource without a standard attack handler; the static pass must resolve sequence count/boundaries from the resource table.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x26

- Bank/local: 0x63/13
- Cards: Taiyoken
- Handlers: 0x00
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · SEQUENCE_COUNT_UNRESOLVED
- Completion detail: Support/defense card references an actor resource without a standard attack handler; the static pass must resolve sequence count/boundaries from the resource table.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x27

- Bank/local: 0x63/14
- Cards: Breath
- Handlers: 0x00
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · SEQUENCE_COUNT_UNRESOLVED
- Completion detail: Support/defense card references an actor resource without a standard attack handler; the static pass must resolve sequence count/boundaries from the resource table.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x28

- Bank/local: 0x63/15
- Cards: Teleport.
- Handlers: 0x00
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · SEQUENCE_COUNT_UNRESOLVED
- Completion detail: Support/defense card references an actor resource without a standard attack handler; the static pass must resolve sequence count/boundaries from the resource table.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x29

- Bank/local: 0x63/16
- Cards: Paralysis
- Handlers: 0x0d
- Status: SPECIAL · SPECIAL · ROM_HANDLER_VERIFIED
- Completion: NEEDS_DYNAMIC_TRACE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Special/multi-actor handler owns sequence and slot selection at runtime; static card fields preserve the resource id but cannot close actor binding alone.
- Dynamic dependencies: handler FSM, slot binding, runtime actor selection
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Special/multi-actor handler: keep static resource id, defer FSM/slot closure to dynamic traces.

### 0x2a

- Bank/local: 0x63/17
- Cards: Time Freeze
- Handlers: 0x00
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · SEQUENCE_COUNT_UNRESOLVED
- Completion detail: Support/defense card references an actor resource without a standard attack handler; the static pass must resolve sequence count/boundaries from the resource table.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x2b

- Bank/local: 0x63/18
- Cards: Suicide
- Handlers: 0x08
- Status: SPECIAL · SPECIAL · ROM_HANDLER_VERIFIED
- Completion: NEEDS_DYNAMIC_TRACE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Special handler owns the sequence branch at runtime; static card fields preserve the resource id but do not prove the selected sequence.
- Dynamic dependencies: handler FSM, runtime branch selection
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Special/multi-actor handler: keep static resource id, defer FSM/slot closure to dynamic traces.

### 0x2c

- Bank/local: 0x63/19
- Cards: Cont.Punch
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x2d

- Bank/local: 0x63/20
- Cards: Cont.Kick
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x2e

- Bank/local: 0x63/21
- Cards: Dunk Shot
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x2f

- Bank/local: 0x63/22
- Cards: Solid Shot
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x30

- Bank/local: 0x63/23
- Cards: Rising Kick
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x31

- Bank/local: 0x63/24
- Cards: Flash Punch
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x32

- Bank/local: 0x64/0
- Cards: Atomic Break
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x33

- Bank/local: 0x64/1
- Cards: N.Slasher
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x34

- Bank/local: 0x64/2
- Cards: R.F.B.Atk.
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x35

- Bank/local: 0x64/3
- Cards: Mach Attack
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x36

- Bank/local: 0x64/4
- Cards: Dynami.Punch
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x37

- Bank/local: 0x64/5
- Cards: S.Dash Elbow
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x38

- Bank/local: 0x64/6
- Cards: Crazy Rush
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x39

- Bank/local: 0x64/7
- Cards: Attack No. 18
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x3a

- Bank/local: 0x64/8
- Cards: Cell Combo
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x3b

- Bank/local: 0x64/9
- Cards: Step Up Atk.
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x3c

- Bank/local: 0x64/10
- Cards: Crasher Buu
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x3d

- Bank/local: 0x64/11
- Cards: Sonic Kick
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x3e

- Bank/local: 0x64/12
- Cards: Life Absorb
- Handlers: 0x0a
- Status: PARTIAL · KNOWN_FORMAT · ROM_STATIC_VERIFIED
- Completion: STATICALLY_CLOSABLE · FRAME_STREAM_PARTIAL
- Completion detail: Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.
- Dynamic dependencies: —
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Resource is referenced by ROM card data but its physical sequence section is not decoded yet.

### 0x3f

- Bank/local: 0x64/13
- Cards: Tail
- Handlers: 0x0b
- Status: DECODED · KNOWN_FORMAT · ROM_SEQUENCE_VERIFIED
- Completion: STATICALLY_CLOSED · NONE
- Completion detail: Frame stream, sequence boundaries, timings, offsets and raw bytes are decoded from the static ROM extraction.
- Dynamic dependencies: —
- Sequences: 2 · physical frames: 26 · total ticks: 256
- Source technique: Tail
- Notes: Frame records decoded from rom-anim-sequences.json.

### 0x40

- Bank/local: 0x64/14
- Cards: Kiai
- Handlers: 0x0d
- Status: SPECIAL · SPECIAL · ROM_HANDLER_VERIFIED
- Completion: NEEDS_DYNAMIC_TRACE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Special/multi-actor handler owns sequence and slot selection at runtime; static card fields preserve the resource id but cannot close actor binding alone.
- Dynamic dependencies: handler FSM, slot binding, runtime actor selection
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Special/multi-actor handler: keep static resource id, defer FSM/slot closure to dynamic traces.

### 0x41

- Bank/local: 0x64/15
- Cards: V-ball Crash
- Handlers: 0x0c
- Status: SPECIAL · SPECIAL · ROM_HANDLER_VERIFIED
- Completion: NEEDS_DYNAMIC_TRACE · HANDLER_SELECTED_SEQUENCE
- Completion detail: Special handler owns the sequence branch at runtime; static card fields preserve the resource id but do not prove the selected sequence.
- Dynamic dependencies: handler FSM, runtime branch selection
- Sequences: 0 · physical frames: 0 · total ticks: 0
- Source technique: —
- Notes: Special/multi-actor handler: keep static resource id, defer FSM/slot closure to dynamic traces.

## Byte Contract

Los frames físicos decodificados preservan el registro crudo ROM como `[metasprite, durationTicks, deltaY_u8, deltaX_u8]`.
El runtime canónico expone esos bytes como `visualFrameId`, `durationTicks`, `offsetY = signed(deltaY_u8)` y `offsetX = signed(deltaX_u8)`.

Verificadores: `npm run verify:animation-resources` · `npm run verify:animation-resource-completion`.
