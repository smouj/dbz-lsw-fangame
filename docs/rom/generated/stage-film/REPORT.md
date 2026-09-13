# Stage Attack — film ROM (2026-09-13)

Captura headless real del **Stage Attack** (carta 3 `3 Stage Atk`, `COMMAND_STAGE`)
desde el savestate en combate. Corpus físico mínimo para el side-by-side.

## Procedencia

| Campo | Valor |
| --- | --- |
| ROM | USA `8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee` |
| Emulador | mGBA 0.10.2 headless (`tools/rom-trace/rom-driver`) |
| Savestate | `tools/rom-trace/r31a/offense-base.ss0` |
| Save | `dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa-100pct.sav` (100%) |
| Trigger | menú ofensivo: `RIGHT` (cursor `CA36` 0→1) y `A` |
| QTE | `A` alimentada 5 frames / 2 sueltos por ciclo (`input = joypad & $3D`) |

## Máquina de estados observada

```text
CA03: 04 (menú) → 15 (acción activa) → 5C (commit) → 00 → 01 → 02 → 06 (mantenimiento)
CA55 = 01  (Stage)
CA40 = 00  (powerWindowCounter — sin Gather)
CA6A..CA73 → 00  (success flags del QTE)
```

## Frames

23 capturas cada 4 frames mientras `A` va pulsada; **14 visualmente únicas**.

| Frame | Contenido |
| --- | --- |
| `f01` | menú: carta `3 Stage Atk` `Pow --/Comm` · `START` · `CC: 0/13` |
| `f12` | escena de acción: actor a pantalla completa, HUD oculto |
| `f20` | `Cell's Attack` → `3 Stage Atk` |

## Gotchas de la captura

- El **primer `shot` tras `loadstate` sale negro** → dejar correr ~12 frames.
- Una pantalla **sin input no avanza** (los menús esperan botón).
- El QTE **no reinicia** la ventana: cada input solo registra success/failure y avanza índice.

Manifiesto con hashes y tick por frame: `manifest.json`.
