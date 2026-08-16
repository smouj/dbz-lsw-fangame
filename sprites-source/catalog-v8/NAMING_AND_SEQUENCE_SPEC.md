# Naming & Sequence Spec V8

## Capas
1. **Fuente canónica:** `characters/<character>/<form>/frames/NNN.png`. No se renombra destructivamente.
2. **Alias semántico:** `semantic_named/<runtime>/<bucket>/<runtime>__<bucket>__NN__src_NNN.png`.
3. **Runtime:** `public/assets/sprites/<runtime_dir>/<runtime_dir>_<pose>_NN.png` + `manifest.json`. El manifest decide la secuencia final.

## Estados de evidencia
- `SOURCE_DERIVED/HIGH`: categoría procede de la auditoría semántica V5 enlazada por old_ref.
- `visual_geometry/HIGH|MEDIUM`: componente recuperado sin old_ref; clase definida por inspección/forma (chibi, aura tile, orb, beam).
- `LOW`: componente de referencia sin semántica suficiente; se conserva y no se inventa acción.

## Regla de integración
Nunca asignar una pose de ataque a un frame solo porque "parece" un ataque. El join exacto se hace contra el `manifest.json` real usando `tools/reconcile_with_repo.py`.
