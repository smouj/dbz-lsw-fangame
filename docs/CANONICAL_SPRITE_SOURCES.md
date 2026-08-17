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

## Variante SUPPORT BLUE del aura de ACCIÓN (2026-08-17)

Las auras del **battle overworld** (24x16) NO se tocan. Esta sección cubre la
animación del aura de las **ACCIONES**: los frames 64x56 donde el personaje
aparece rodeado por el aura naranja de Power/Power Up, con el ciclo de paleta
A→B→C del GBC (23 tiles 2bpp, una geometría, paleta rotada por píxel).

- **Dónde viven**: bucket `orbs_rings_bursts` (y `projectiles_beams` para
goku_base) — 3 frames 64x56 por forma con la MISMA geometría y los 3 colores
de la paleta rotando por píxel.
- **Bucket generado**: `aura_support` — 3 frames por forma (44 formas = 132
frames; las 2 FIXED-only goku_ssj2/ginyu_gokus_body usan el ciclo de su forma
fuente, arte compartido legítimo).
- **Método (pixel-perfect, sin global color replace)**: la máscara del aura
se deriva del CICLO: un píxel es AURA si sus 3 colores en las 3 fases son
naranjas distintos (rota con la paleta). El personaje es estático → NUNCA se
toca, aunque comparta RGB con el aura. Los píxeles del aura se sustituyen por
su azul exacto: #F0A050→#50A8F0, #F0C8A0→#A0C0F8, #F88000→#0090F0 (variantes
ROM F7/FF mapeadas por proximidad al canónico).
- **Ciclo preservado**: cada frame support rota los 3 azules igual que el
frame power rota los 3 naranjas (A→B→C). El personaje queda binariamente
idéntico (verificado píxel a píxel).
- **Scripts**: `scripts/build-aura-variants.py --apply` (idempotente; escribe
en paquete tmp V9 + repo catalog-v9: atomic, named/aura_support, catalog,
by_bucket, atomic_sheet rebuild) y `scripts/audit-aura-variants.py`
(auditoría pixel-perfect: tamaño, alpha, personaje intacto, paleta azul
exacta, 0 naranjas residuales, ciclo preservado).
- **verify:v9**: conteos actualizados (atomic 2098, named 2490, spritesheets
612, transparency 2098) + checks `v9:aura_support_132` y
`v9:aura_support_palette`.
- **Runtime**: NO se ha cambiado gameplay. Los assets están preparados con
metadata (`palette: support_blue_2026-08-17`, `support_variant_of: <src>`) para
que el BattleCinematicDirector pueda solicitar AURA_POWER / AURA_SUPPORT sin
volver a procesar nada.
- Excepción documentada: kid_buu fase 2 (63x56) tiene micro-variación de
geometría (el GBC mueve las llamas 1px) — cubierta por la pasada 2 del
script (convierte cualquier píxel con color de la paleta del aura).

### Corrección de numeración canónica + export al runtime (2026-08-17)

- **nappa_base y gotenks_super_saiyan_3 renumerados** (estilo goku, como
  trunks_base): OW idle → 027, battle_aura_tile → 028, composite → 029; los
  frames de combate desplazados (027-037/044 → 030-040/047) PRESERVANDO el
  vínculo source→V9 por contenido (canonical_path al archivo real del
  source). `scripts/renumber-ow-canonical.py` documenta y aplica en ambos
  paquetes (tmp + repo).
- **Aura exportada al runtime** (`scripts/export-aura-to-runtime.py`):
  poses `aura_power` y `aura_support` (3 frames c/u, fps 10 loop — mismos
  valores que power_up) añadidas a los 44 manifests con sus PNG
  `<dir>_aura_power_0N.png` / `<dir>_aura_support_0N.png`. SIN cambio de
  gameplay (nadie las consume todavía).
- **Sheets de personaje actualizados**: los 48 `public/assets/sheets/*.png`
  re-copiados desde el atomic_sheet V9 (ahora incluyen los frames del aura
  naranja y azul; verificado 48/48 hash idénticos). Las 2 FIXED-only
  (goku-super-saiyan-2, ginyu-gokus-body) reconstruidas con layout
  reproducible: fixed_only + 6 frames de aura.
- Los composites sueltos (android_16 045, frieza 047, ginyu 053, buu_gohan
  057) NO se recolocan: su posición canónica (tras el tile) está ocupada por
  frames de combate del V7 — documentado, se mantienen al final.

## Verificación

```bash
npm run audit:sprites   # manifests + poses + cohesión + física
npm run audit:sheets    # sheets sin fondo cyan
npm run verify:gbc      # invariantes GBC + transformaciones
npm run verify:profiles # 42 perfiles firma
npm run typecheck       # TypeScript
```

Ejecuta las 5 antes de cada commit que toque assets.
