# S-MAP2 — ROM PHYSICAL PROVENANCE (REPORT)

Generado: 2026-08-24T11:00:11.433Z · HEAD local.

## Principio

```text
CANONICAL_PHYSICAL ≠ ROM_EXACT
SHARED_RUNTIME_DIR ≠ ROM_PHYSICAL_SHARED
comparación SOLO por hash físico exacto (R2.4 grammar) — sin fuzzy/resize/remap/flip/pose-name/V9
```

## Cobertura

| Métrica | Valor |
| --- | --- |
| Formas ROM reales (1-48) con perfil | 48/48 (100%) |
| Keys de perfil únicas | 44 |
| Keys sin paleta en \$6E00 | 10 (gohan_young, gohan_young_ssj, krillin_base, goten_ssj, trunks_kid, trunks_kid_ssj, buu_base, buu_super, buu_gotenks, buu_gohan) |
| Identidades ROM renderizadas (occs) | 750 |
| Identidades ROM únicas | 143 |
| ROM_EXACT únicas | 0 |
| ROM_SHARED únicas | 0 |
| ROM_UNRESOLVED únicas | 143 |
| Relaciones exactas (ROM↔canonical) | 0 |
| Canonical files indexados | 3677 |

> ROM_UNRESOLVED es válido y NO hace fallar el gate (el piloto R2.4 dio 15/15 UNRESOLVED).

## Notas

- Las keys sin paleta (Gohan Kid 0/1, Krillin 4, etc.) no se renderizan: su provenance
  queda ROM_UNRESOLVED hasta localizar la fuente de paleta (posible vía transición CGB \$07F4).
- Mapping formId↔formID 42-48 marcado como uncertain (bits 42-47 del corpus = "Buu/ginyu/rango").
- El mapping erróneo de un nombre NUNCA inventa ROM_EXACT: reduce matches (→ ROM_UNRESOLVED).
