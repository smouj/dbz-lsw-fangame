# S-MAP1 — ROM-FIRST SPRITE MAPPING (REPORT)

Generado: 2026-08-24T10:37:04.478Z · HEAD local (origin/main puede estar atrasado).

## Principio

```text
RUNTIME_RESOLVED ≠ PHYSICAL
ROM_PHYSICAL ≠ CANONICAL_PHYSICAL ≠ MANIFEST_POSE ≠ COMPOSITE ≠ FALLBACK ≠ FX
```

## Cobertura

| Métrica | Valor |
| --- | --- |
| Formas indexadas (SPRITE_DIRS) | 48 / 48 (100%) |
| Directorios físicos | 44 |
| Bindings form×pose | 1008 |
| Runtime coverage (presentes / total) | 100.0 % |
| Physical coverage (CANONICAL+SHARED+ROM) | 405 bindings (40.2 %) |
| Composite coverage | 459 |
| FX coverage | 96 |
| Alias coverage | 48 |
| Fallback coverage | 0 |
| Missing | 0 |
| Unresolved | 0 |

> **Physical coverage NO tiene obligación de ser 100 %.** Toda clasificación física
> exige provenance; si no existe → UNRESOLVED.

## Clasificaciones por estado

| Estado | Count |
| --- | --- |
| CANONICAL_PHYSICAL | 332 |
| SHARED_PHYSICAL | 73 |
| COMPOSITE | 459 |
| SEMANTIC_ALIAS | 48 |
| REFERENCE_FX | 96 |

## Decisiones clave

- `beam_ray`, `beam_ray_tip`, `aura_power`, `aura_support` → **REFERENCE_FX** (dominio BG/FX: FXResource → VRAM $8800 → BG $9800 → SCX/SCY). Fuera de FIGHTER PHYSICAL POSES.
- `punch_right/left`, `kick_right`, `knockback_*`, `beam_guard`, `evade` → **COMPOSITE** (secuencias de idle/attack_fwd/attack_ud/hurt/guard/move_back). No incrementan PHYSICAL_POSE_COUNT.
- `power_up` → **SEMANTIC_ALIAS** de `gather_power` (mismo PNG; la ROM debe demostrar identidad física independiente).
- `move_back` → **SHARED_PHYSICAL** de `move_front` (reutilización física, función distinta).
- Form sharing (`vegeta_majin→vegeta_ssj`, `piccolo_kami/evil→piccolo_base`, `gohan_adult_ssj2→gohan_adult_ssj`) = **SHARED_RUNTIME_DIR**: runtime válido, identidad física ROM NO demostrada.
- Destruct-Disk / S.Destruc-D. = familia Beam handler $07 (lanzamiento/waits/FX/screen path propios). **Ningún asset de disco es guard** (REFUTED si algún manifest histórico lo decía).
- Movement stripes = `move_horizontal_fx` / `move_vertical_fx` → **Movement FX Registry** (Basic > Move), NUNCA la carta Avoiding.
- V9 (`spriteCanon.generated.ts`, `build-sprite-canon.py`, `import-canonical-frames.py`) = **LEGACY_SEMANTIC_REFERENCE**: prohibido como upstream del canon físico. El mapping usa manifests runtime + Canonical_Frames_Official.
- `vegito_base` = SOURCE_ONLY/PROJECT_DERIVED (HEAD solo tiene vegito_ssj).
- Cell custom standing pose / Piccolo unused: NO presentes en HEAD (histórico).

## Salidas

```text
physical-actor-index.json
canonical-source-index.json
runtime-pose-bindings.json
runtime-composites.json
fx-reference-index.json
form-sharing.json
source-only.json
unresolved.json
REPORT.md
```

## Verificación

```bash
npm run verify:sprite-mapping
```
