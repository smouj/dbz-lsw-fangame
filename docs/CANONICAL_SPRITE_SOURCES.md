# Canonical Sprite Sources

Contrato de **fuente única** para cada sprite del proyecto. Ningún sprite tiene
copias duplicadas en uso: cada tipo vive en UNA carpeta canónica y los
resolvers apuntan SOLO ahí. Verificado por `audit:sprites`, `audit:sheets` y
`verify:gbc`.

## Mapa canónico (resolver → carpeta)

| Tipo de sprite | Carpeta canónica | Resolver | Notas |
|---|---|---|---|
| **Sprites de combate** (poses idle/move/attack/hurt/beam...) | `public/assets/sprites/<form_dir>/` | `spriteDirFor` / `spriteFrameUrl` | 44 formas × 19 poses, manifest.json por forma |
| **Chibi overworld táctico** (idle del campo) | `public/assets/overworld/panel_sprites/` | `overworldUrl` | 48 formas `*_ow.png` — ES el idle del battle overworld también |
| **Battle overworld pose gather** (brazos arriba) | `public/assets/overworld/battle/<char>/<form>/actor/001_gather_power_pose.png` | `battleOverworldActorUrl(form, 'gather_power_pose')` | 44/44 formas — generado desde V9 (power pose = 2º frame OW) |
| **Battle overworld aura** (FX energía) | `public/assets/overworld/battle/<char>/<form>/effects/000_gather_power_aura.png` | `battleOverworldAuraUrl` | 44/44 formas — aura tile V9 (o genérica para FIXED-only) |
| **Sheets ROM** (referencia de personaje) | `public/assets/sheets/<form.sheet>` | `sheetUrl` | 44 sheets = atomic_sheet V9 por forma (42 atómicas + 2 builds fixed_only) |
| **Retratos** | `public/assets/portraits/` | `portraitFor` / `BATTLE_PORTRAITS` | 476 PNG recortados |
| **Iconos de carta** | `public/assets/cards/` | `cardIconUrl` | 246 PNG |
| **Efectos recovered** (beams/impactos/auras) | `public/assets/sprites/effects/<dir>/` | (catálogo Dev Studio) | 189 frames — SIN chibis (los chibis viven en panel_sprites) |

## Reglas (no romper)

1. **`panel_sprites/` es la ÚNICA fuente del chibi idle** — `battle/000_idle.png`
   fue eliminado (21/24 eran copias byte-idénticas; los 3 restantes redundantes).
   El battle overworld idle resuelve a `panel_sprites/<formId>_ow.png`.
2. **`effects/` NO contiene chibis** — los 28 frames que eran copias de
   `panel_sprites/*_ow.png` fueron eliminados (81 tenían tamaño chibi, 28 eran
   duplicados exactos). Los effects restantes son FX reales (beams, auras).
3. **Power_up canónico (2026-08-17)** — la pose `power_up`/`gather_power` de
   cada forma usa el frame de PERSONAJE-con-aura del propio sheet V9
   (bucket `character_plus_effect`/`character_plus_aura_or_burst` con
   overlap de piernas ≥0.30 vs idle = personaje real, no anillo de aura).
   Fallback a `beam_charge` solo cuando el sheet no tiene pose de aura
   separada (contrato V9: ginyu_gokus_body, gohan_ultimate, goku_ssj2,
   goten_base, gotenks_ssj, nappa — sus únicos frames libres son auras puras).
4. **Facing overworld (2026-08-17)** — 43 chibis panel + 44 battle overworld
   (actor+aura) verificados mirando a la DERECHA (idénticos o composición
   de frames V9 RIGHTCANONICAL; los 9 restantes espejados con
   `check-overworld-facing.py --apply`). Los idles de combate == V9 001.
5. **`sheets/` solo contiene los 44 sheets de roster** — cada `<form.sheet>` es el
   `atomic_sheet.png` del V9 (`forms_by_runtime/<form>/spritesheets/`), con
   `goku-super-saiyan-2.png`/`ginyu-gokus-body.png` construidos desde
   `fixed_only/` (formas FIXED-only sin atomic sheet). Los viejos
   snake_case + card-icons + mini-portraits se movieron a trash
   (`.openclaw/tmp/sheet-trash-20260817`).
6. **Completitud canónica V9 (2026-08-17)** — 14 frames añadidos a
   `forms_by_runtime/` (en tmp y en `sprites-source/catalog-v9/`) para que
   TODAS las formas tengan el patrón OW/aura como las bien configuradas:
   `overworld_actor_or_pose` (chibi idle+walk), `battle_aura_tile`,
   `battle_aura_actor_composite`. trunks_base 027-030 (desde
   kid_trunks_super_saiyan 024-027, mismo arte kid trunks — renumerado de
   035-038 a las posiciones canónicas 027-030 el 2026-08-17; los frames
   027-034 existentes pasaron a 031-038 preservando su canonical_path de
   source), nappa_base 038-040 y gotenks_ssj3 045-047 (desde chibis runtime +
   aura), composites generados para android_16 045 / frieza 047 / ginyu 053 /
   buu_gohan 057 (éste con el composite REAL de majin_buu.png 307,820), y
   re-clasificados tiles en buu_gohan 028/029 y young_gohan_ssj 029.
   `scripts/add-canonical-ow-frames.py` regenera todo (idempotente) y
   `scripts/renumber-trunks-ow.py` documenta la renumeración.
   Conteos verify:v9 actualizados (atomic 1966, named 2358, spritesheets 570).
7. **`overworld/` solo tiene `battle/` + `panel_sprites/` + manifest** — las
   carpetas `named/` (285) y `aux/` (43) y los `cell_*.png` sueltos (216)
   eran copias duplicadas, movidas a trash.
8. **Cada PNG debe tener RGB=(0,0,0,0) bajo alpha=0** (sin RGB residual que
   reaparezca como halo al escalar/comprimir). Verificado: 0 PNG con residual.

## Verificación

```bash
npm run audit:sprites   # manifests + poses + cohesión + física
npm run audit:sheets    # sheets sin fondo cyan
npm run verify:gbc      # invariantes GBC + transformaciones
npm run verify:profiles # 42 perfiles firma
npm run typecheck       # TypeScript
```

Ejecuta las 5 antes de cada commit que toque assets.
