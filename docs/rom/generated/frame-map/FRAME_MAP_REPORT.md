# F-MAP — CHARACTER FRAME & VISUAL RUNTIME CANON

**Fecha:** 2026-08-24
**Gate:** `npm run verify:character-frame-map` → **15 ✓ / 0 ✗** (PASS)

## Objetivo

Trazar el camino completo para que cada frame que el runtime dibuja sepa
**exactamente de dónde procede, por qué se usa, cuánto dura, cómo se posiciona
y con qué evidencia**:

```
FORM → ROM physical frame → canonical asset → manifest → semantic usage
     → physical sequence → durationTicks/offsets → classification
```

Sin inventar sprites, sin usar V9 como autoridad física, sin confundir
**frame físico** con **rol semántico** con **FX**.

---

## Qué se ha construido

### 1. `src/battle/characterFrameMap.ts` (registro único, puro/headless)

- `CharacterFrameBinding` — unidad de binding por aparición física de un frame.
- Taxonomía de clasificación de 7 valores:
  `ROM_EXACT · CANONICAL_PHYSICAL · SHARED_PHYSICAL · COMPOSITE · FALLBACK · REFERENCE_FX · UNRESOLVED`.
- `physicalFamilyFromFile()` — extrae la familia física real del stem
  `<dir>_<family>_NN.png` (separando **physical** de **semantic**).
- `FX_ROLES` / `COMPOSITE_ROLES` — separación FX / Fighter / compuesto.
- `resolveCharacterVisualSequence({formId, semanticRole, animationResource?})`
  → `frames[]`, `durationTicks[]`, `offsets[]`, `source`, `classification`, `evidence`.
  **Datos, no switch.**
- `frameMapMatrix()` — matriz FORM × SEMANTIC ROLE (1008 celdas).
- `frameMapSummary()` / `listUnresolved()` — métricas agregadas + lista exacta.

### 2. `scripts/verify-character-frame-map.ts` (gate)

Mide: 48/48 formas · frames indexados · unknown source=0 · silent fallback=0 ·
PNG válidos · FX≠Fighter · V9≠autoridad · RUNTIME_SHARED≠ROM_EXACT · ROM_EXACT
con timings completos · determinismo · resolver sin switch. Escribe
`docs/rom/generated/frame-map/FRAME_MAP_MATRIX.json`.

### 3. Deuda corregida

- `characterAssets.ts`: sección `SHEET V9` reetiquetada como **referencia
  histórica, no autoridad física**; `resolveBundlePoses()` ya devuelve
  `frameCount` REAL (antes hardcodeaba `1`).
- `spriteManifest.ts`: `resolvePoseInfo()` ahora devuelve `frameCount` real de
  la pose resuelta (secuencia completa, no solo frame 0).

---

## Hallazgos honestos (no forzados)

| Métrica | Valor | Lectura |
|---|---|---|
| Formas | **48/48** | sin missing |
| Dirs de manifest | 44 | 3 dirs compartidos |
| Bindings físicos | 3677 | por aparición física |
| **ROM_EXACT** | **2** | solo 2 frames beam confirmados byte-exact |
| CANONICAL_PHYSICAL | 0 | sin puente canonical↔manifest (honesto) |
| **SHARED_PHYSICAL** | 1157 | compartidos (dir o archivo) |
| **COMPOSITE** | 2032 | pose semántica reutiliza otra familia |
| REFERENCE_FX | 288 | aura / beam_ray correctamente separados |
| UNRESOLVED | 198 | frames físicos sin ROM ni canonical |

**Dirs compartidos (RUNTIME_SHARED, nunca ROM_EXACT):**
- `vegeta_ssj` → vegeta_ssj + vegeta_majin
- `gohan_adult_ssj` → gohan_adult_ssj + gohan_adult_ssj2
- `piccolo_base` → piccolo_base + piccolo_kami + piccolo_evil

**Casos incorrectos conocidos — estado:**
- `gather_power` → **COMPOSITE** (reutiliza `beam_charge`/`beam_fire`; el
  Gather ROM real es actor NEUTRAL + FX $1A + palette $33, sin pose de fighter).
- `aura_power` / `aura_support` → **REFERENCE_FX** (no Fighter; tiles 64×56).
- `beam_ray` / `beam_ray_tip` → **REFERENCE_FX** (no Fighter).
- `stage_ready_open/close` → **COMPOSITE/INFERRED** (asset provisional
  gather_power/beam_charge, marcado como tal, no confundido con frame Stage).

---

## Criterio de cierre (cumplido)

> **NO** es "todas las poses resuelven". **SÍ** es: cada frame que el runtime
> dibuja sabe de dónde procede, por qué, cuánto dura, cómo se posiciona y con
> qué evidencia. `UNRESOLVED` puede existir y queda visible — falla solo si el
> runtime lo presenta como ROM exacto sin evidencia.

---

## Pendiente (siguientes franjas, NO hecho aquí)

1. **Character Studio** — vista de todos los frames físicos + ROM visualFrameId
   + resource/sequence + duration + dx/dy + classification + semantic consumers.
2. **Animation Studio** — reproducir secuencia física por ticks GBC, con
   comparación ROM vs runtime lado a lado.
3. **Combat Lab** — durante una acción mostrar: requested semantic role →
   resolved physical sequence → actual frame → ROM frame → classification →
   fallback reason.
4. **Golden visual set** (8 formas × 10 acciones) con verificación visual.
5. **Sweep 48/48** completo una vez limpio el golden set.
6. Puente canonical↔manifest (para que `CANONICAL_PHYSICAL` deje de ser 0) —
   requiere la tabla explícita Canonical_Frames_Official → manifest, **sin V9
   como autoridad**.
