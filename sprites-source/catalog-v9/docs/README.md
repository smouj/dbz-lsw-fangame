# DBZ LSW Sprites Packaged V9 — Right Canonical

Paquete estructurado para el proyecto **dbz-lsw-fangame**.

## Objetivo
- Reunir los frames canónicos limpios en un ZIP utilizable.
- Mantener **orientación canónica hacia la derecha**: no se exportan variantes espejadas.
- Garantizar transparencia limpia: todos los PNG se normalizan a **RGBA(0,0,0,0)** cuando alpha=0.
- Añadir **spritesheets** propios por forma runtime y por categoría semántica.
- Mantener catálogos y contratos de secuencia para acciones, cartas y Stage Attacks.

## Estructura
- `forms_by_runtime/<runtime_dir>/atomic/` → frames canónicos numerados.
- `forms_by_runtime/<runtime_dir>/named/<bucket>/` → mismos frames con alias semántico.
- `forms_by_runtime/<runtime_dir>/spritesheets/` → spritesheets transparentes + JSON atlas.
- `forms_by_runtime/<runtime_dir>/runtime_pose_contract.*` → contrato runtime de poses.
- `cards/` → secuencias de cartas, perfiles de acción y Stage Attacks.
- `effects/` → catálogos de FX.
- `runtime_metadata/` → alignment del proyecto, aliases runtime y manifiestos fuente.
- `catalog/` → resumen global, auditoría de transparencia y overview.
- `docs/` → README y QA.

## Ampliación canónica (integración 2026-08-17)

El runtime usa 392 frames adicionales del **bridge FIXED** (fallback del import
original) para completar poses que el V7 no incluye (hurt/beam_charge/
attack_fwd/beam_fire/...). Para que el V9 cubra el **100% de los frames que el
runtime reproduce** (canonización total), se exportaron como:

- `forms_by_runtime/<form>/fixed_only/<NNN>_<pose>.png` — frames FIXED normalizados (0 RGB residual)
- `forms_by_runtime/<form>/named/fixed_only_<pose>/` — aliases semánticos
- `catalog/fixed_only_frames.csv` — catálogo separado (392 filas; frame_catalog.csv se mantiene en 1.952 = canónico V7)

Nota: `ginyu_gokus_body` y `goku_super_saiyan_2` son las 2 formas FIXED-only
(sin atomic V7): sus 64 frames viven solo en fixed_only/.

Cobertura verificada por `npm run verify:v9` (check `full_coverage`):
**1.482/1.482 frames runtime con fuente V9** (atomic o fixed_only).

## Resumen
- formas runtime exportadas: 42
- frames exportados: 1952
- cartas catalogadas: 125
- registros FX: 225
- formas con política right-facing aplicada: 42
- píxeles con RGB oculto bajo alpha=0 tras exportación: 0

## Nota sobre aliases runtime sin forma canónica propia
El proyecto documenta además entradas runtime derivadas o alias (`runtime_metadata/runtime_aliases.csv`).
Algunas no tienen hoja canónica propia dentro del set V7/V8 y se documentan como alias/derivadas en vez de duplicar sprites sin evidencia.
