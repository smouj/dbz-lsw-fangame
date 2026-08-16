# DBZ LSW SPRITES CATALOGUED V8

Baseline del contrato del proyecto: `349e54824d397a47df4fa7d615cde1ef5a8e2241`.

Este paquete NO vuelve a cometer el error de llamar a todos los PNG `effect` ni de renombrar a ojo los frames de combate. Separa tres niveles:

1. `catalog/frame_catalog.*`: los **1.952 frames fuente**, uno por uno, con old_refs, SHA de blob, geometría, evidencia V5, bucket semántico, alias y confianza.
2. `semantic_named/`: los mismos 1.952 PNG en una vista renombrada **no destructiva**.
3. `sequences/`: contrato runtime de 44 directorios, 21 familias/poses de referencia, 42 perfiles firma y los Stage Attacks.
4. `cards/`: **125/125 cartas** con perfil/acción/efecto visual y secuencia.
5. `effects/`: componentes recovered por separado y catálogo global de frames FX/referencia.
6. `visual_review/`: 42 contact sheets (una por forma) + 4 hojas de componentes recuperados para auditoría humana rápida.
7. `tools/reconcile_with_repo.py`: al ejecutarlo dentro del checkout actual del repo genera el mapeo exacto `runtime pose frame -> canonical source frame` por firma de píxel visible, usando los manifests reales.

## Por qué hay nombres como `movement_or_attack_pose`
Porque en el material fuente ese frame no trae una etiqueta fiable de `punch_right`/`attack_fwd`. Inventarla sería volver a introducir errores. La etiqueta de pose exacta vive en `public/assets/sprites/<form>/manifest.json`; el reconciliador la une al PNG canónico sin adivinar.

## QA
- 1.952/1.952 frames inventariados y copiados como alias.
- 42/42 formas fuente.
- 44/44 directorios runtime contemplados (42 V7 + 2 FIXED-only).
- 125/125 cartas.
- 66/66 cartas de combate command/damage/beam con perfil resuelto.
- 42/42 ActionProfile signature groups.
- 24 patrones Stage Attack (6 por nivel) + input->pose actual.
