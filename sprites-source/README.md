# sprites-source/ — Paquete canónico de sprites V7 PROJECT_ALIGNED

Fuente de verdad de píxeles para todos los sprites de DBZ LSW Fangame.
Instalado desde `DBZ_LSW_SPRITES_PROJECT_ALIGNED_V7_GH_4b9f383.zip`
(SHA-256 `a65e3c397b6176bbbee3fa172d0be927be83318ac1fec57a2b29edc0e70bf0c5`,
baseline `smouj/dbz-lsw-fangame@4b9f383`).

## Estructura

```
sprites-source/
├── characters/
│   └── <character>/<form>/
│       ├── frames/            ← 1.952 frames canónicos (001.png…NNN.png)
│       └── review/            ← contact_sheet.png por forma (verificación visual)
├── organized/                 ← ESPEJO organizado por poses
│   └── <character>/<form>/<pose>/NNN_<pose>.png
├── source_sheets_png_transparent/   ← 24 hojas ROM transparentes
├── source_gif/                       ← 24 GIFs fuente de las hojas
├── docs/                             ← Reports, policies, alignment, SHA256
│   ├── NAMING_POLICY.md
│   ├── PROJECT_RUNTIME_POSE_CONTRACT.json
│   ├── PROJECT_ALIGNMENT.json        ← Mapa maestro forma→runtime→FIXED
│   ├── manifest.json / manifest.csv  ← Catálogo del paquete
│   ├── SHA256SUMS.txt
│   └── AUDIT_REPORT_V6.txt / AUDIT_REPORT_V7.txt …
└── catalog.json               ← Catálogo maestro (generado): 42 formas, 1.952 frames
                                 con hash MD5, w/h, pose semántica, enlace runtime
```

## Convención de nombres

- **Canonical** (`characters/…/frames/NNN.png`): IDs numéricos de fuente.
  **NO renombrar** — el bridge semántico va por firma de imagen (ver NAMING_POLICY.md).
- **Runtime** (`public/assets/sprites/<dir>/<dir>_<pose>_NN.png`): poses semánticas
  integradas en el juego. Patrón: `<runtime_dir>_<semantic_family>_<NN>.png`.

## catalog.json (generado por scripts)

| Campo | Valor |
|---|---|
| version | V7_PROJECT_ALIGNED |
| formas | 42 |
| frames | 1.952 |
| pose_matching | visible-pixel hash vs runtime + shape vs FIXED |

Cada frame lleva: `id`, `file`, `md5` (12 hex), `w/h`, `pose`, `source`
(`runtime` \| `fixed` \| `null`), y para los mapeados a runtime: `runtime_dir`
+ `runtime_file`.

## Cobertura actual (v1 del catálogo)

| Estado | Frames | % |
|---|---|---|
| Pose determinada | 912 | 46.7% |
| unmapped — combate único (no en runtime ni FIXED) | 501 | 25.7% |
| unmapped — recortes beam (≥50px, proyectiles procedurales) | 321 | 16.4% |
| unmapped — chibi/panel (≤18px, viven en panel_sprites) | 131 | 6.7% |
| unmapped — resto | 87 | 4.5% |

### ⚠️ Hallazgo de fidelidad (deuda documentada)

El paquete V7 contiene **~501 frames de combate que el runtime actual no integra**
(verificado visualmente: poses de ataque/guardia/hurt reales, no beams ni chibis).
El runtime deduplicó y el orden de lectura corregido del V7 añade frames que
FIXED no tiene. **No es un bug del paquete** — es riqueza de animación pendiente
de integrar (poses extendidas / variantes). Tarea futura: decidir qué frames
adicionales incorporar al runtime (respetando el contrato de poses actual).

## Verificación

```bash
# El paquete está verificado por el importer y audits del repo:
npm run audit:sprites   # manifests + poses + cohesión
npm run audit:sheets    # sheets sin fondo cyan
npm run verify:gbc      # invariantes GBC
npm run verify:v8       # catálogo semántico V8 vs código runtime real
```

El catálogo se regenera con el flujo de importación (ver `scripts/import-v6-sprites.py`
y `docs/CANONICAL_SPRITE_SOURCES.md`).

## Capa semántica V8 (catalog-v8/)

`catalog-v8/` es el **catálogo semántico de animación y gameplay** entregado por el
usuario (baseline `349e548`, SHA zip `cc2324b6…`), instalado e integrado:

- `catalog/frame_catalog.csv|json` — 1.952 frames canónicos inventariados uno a uno
  (personaje, forma, old_refs, geometría, SHA, bucket semántico, alias, confianza)
- `catalog/runtime_exact_mapping.csv|json` — **generado contra el repo real** con
  `tools/reconcile_with_repo.py`: 3.259 frames runtime, 1.921 con match EXACTO de
  píxel visible → frame canónico (los 1.338 restantes son poses compuestas que
  reutilizan PNG de poses base: punch_right, knockback_*, evade, gather_power…)
- `semantic_named/` — 1.952 aliases PNG no destructivos
  (`<runtime>/<bucket>/<runtime>__<bucket>__NN__src_NNN.png`)
- `sequences/` — 924 filas matriz forma×pose, 42 perfiles de acción, 24 Stage Attacks,
  21 familias de poses con regla de secuencia (contrato `spriteConfig.ts`)
- `cards/` — 125/125 cartas catalogadas con perfil, pose atacante, reacción rival,
  proyectil/FX y secuencia
- `effects/` — 225 componentes V7 sin old_ref auditados y tipados por función
  (chibi, aura tile, orb, beam, composite… — NO todos llamados effect)
- `visual_review/` — 42 contact sheets de formas + 4 hojas de componentes recuperados
- `integration/spriteSequenceContract.ts` — contrato TS generado (STAGE_INPUT_POSES,
  STAGE_SEQUENCE_POOLS, RUNTIME_POSE_RULES); `verify:v8` lo cross-chequea contra el
  código real (stageInputMap.ts, stageSequences.ts) en cada ejecución
- `tools/reconcile_with_repo.py` — regenera el mapeo exacto runtime→canónico
- `verify:v8` (scripts/verify-v8-catalog.ts, npm run verify:v8): 10 checks de
  regresión (conteos QA, aliases, exact-mapping, pools Stage Attack, input map, SHA)
