# F-MAP2 — Canonical ↔ Manifest Physical Bridge

**Fecha:** 2026-08-24
**Tool:** `npm run build:canonical-manifest-bridge`
**Gate:** `npm run verify:character-frame-map` → **17 ✓ / 0 ✗**

## Objetivo

Establecer un enlace FÍSICO demostrable entre:

```
ROM physical identity
  ↕
Canonical_Frames_Official (catalog-v9/forms_by_runtime/<form>/atomic/*.png)
  ↕
current manifest.json     (public/assets/sprites/<dir>/<dir>_<pose>_NN.png)
```

**Sin V9 como autoridad y sin matching por parecido visual.**

---

## Matching permitido (orden)

| Tier | Evidencia | Resultado |
|---|---|---|
| 1. `BYTE_EXACT` | SHA256 del PNG crudo idéntico | 117 |
| 2. `PIXEL_EXACT` | RGBA decodificado idéntico (misma W/H + píxeles) | 0 |
| 3. `VISIBLE_PIXEL_EXACT` | RGBA visible idéntico (alpha>0; transparentes ignorados, posición preservada) | 0 |
| 4. `NO_MATCH` | sin evidencia física | 3258 |

**PROHIBIDO como evidencia:** resize, crop, flip, recolor, fuzzy, SSIM,
perceptual similarity, nearest-neighbour. Solo producen CANDIDATES, nunca
`CANONICAL_PHYSICAL`.

---

## Hallazgo honesto (sin forzar)

| Métrica | Valor |
|---|---|
| Canonical frames indexados | 2490 |
| Manifest frames indexados (entries) | 3375 |
| **BYTE_EXACT** | **117** |
| PIXEL_EXACT | 0 |
| VISIBLE_PIXEL_EXACT | 0 |
| **NO_MATCH** | **3258** |

**Los 117 BYTE_EXACT son TODOS FX aura tiles:**
- `aura_support` → 116 frames byte-idénticos.
- `aura_power` → 1 frame byte-idéntico.

**Conclusión crítica:** los frames de CUERPO del fighter
(`idle / attack_fwd / attack_ud / move_front / move_back / guard / hurt /
beam_charge / beam_fire`) fueron **re-croppeados / re-guardados** desde los
sheets canónicos y **NO tienen identidad byte/pixel con los atomic frames de
Canonical_Frames_Official**.

Esto significa que la cadena de identidad física
`ROM → canonical → manifest` está **rota en el paso canonical↔manifest para
el cuerpo del fighter** (96% de los frames). Los FX aura sí son byte-idénticos.

**No es un fallo del bridge — es la verdad del pipeline.** Para cerrar esa
cadena haría falta una reconciliación por **rect del sheet** (x0/y0/width/
height), no por píxeles — y eso está FUERA del matching permitido (crop como
evidencia = prohibido). Se deja como UNRESOLVED visible.

---

## Registro generado

- `src/data/generated/canonicalManifestBridge.generated.ts` — bindings + summary (runtime).
- `docs/sprites/frame-map/canonical-manifest-bindings.json` — bindings completos.
- `docs/sprites/frame-map/unresolved-canonical.json` — los 3258 NO_MATCH visibles.

Cada `CharacterFrameBinding` ahora porta simultáneamente:
```
ROM identity       (rom: resource/seq/frame/durationTicks/offsetX/Y)
canonical identity (canonicalId + canonicalRelation)
manifest identity  (dir / pose / index / file)
semantic usage     (semanticRole / physicalFamily)
classification     (ROM_EXACT · CANONICAL_PHYSICAL · SHARED_PHYSICAL ·
                    COMPOSITE · FALLBACK · REFERENCE_FX · UNRESOLVED)
```

---

## Criterio de cierre (cumplido)

> `FALSE POSITIVES = 0`. No hay objetivo artificial de `CANONICAL_PHYSICAL > N`.
> Cada valor > 0 es demostrablemente correcto (BYTE/PIXEL/VISIBLE_PIXEL_EXACT).
> `UNRESOLVED` > 0 es aceptable y queda visible; falla solo si el runtime lo
> presenta como ROM_EXACT sin evidencia.

---

## Verificación (gate)

- canonical frames indexados > 0 ✅ (2490)
- manifest frames indexados > 0 ✅ (3375)
- 0 refs rotas · 0 CANONICAL_PHYSICAL falsos · 0 promociones fuzzy ✅
- 0 V9 authority (canonicalId solo vía puente de contenido) ✅
- UNRESOLVED visible, no silencioso ✅
