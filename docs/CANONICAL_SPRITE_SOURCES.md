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
| **Battle overworld pose gather** (brazos arriba) | `public/assets/overworld/battle/<char>/<form>/actor/001_gather_power_pose.png` | `battleOverworldActorUrl(form, 'gather_power_pose')` | Solo lo EXCLUSIVO del power-up |
| **Battle overworld aura** (FX energía) | `public/assets/overworld/battle/<char>/<form>/effects/000_gather_power_aura.png` | `battleOverworldAuraUrl` | Auras 24×16 validadas (planas = sprite de personaje, descartadas) |
| **Sheets ROM** (referencia de personaje) | `public/assets/sheets/<form.sheet>` | `sheetUrl` | 42 sheets de roster + card-icons + mini-portraits |
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
3. **`sheets/` solo contiene sheets de roster + card-icons + mini-portraits** —
   los sheets base del pipeline (battle-backgrounds, story-*, menu-portraits,
   overworld-sprites) se movieron a `.openclaw/tmp/overworld-dupes/` (no usados
   por runtime; material fuente de recorte).
4. **`overworld/` solo tiene `battle/` + `panel_sprites/` + manifest** — las
   carpetas `named/` (285) y `aux/` (43) y los `cell_*.png` sueltos (216)
   eran copias duplicadas, movidas a trash.
5. **Cada PNG debe tener RGB=(0,0,0,0) bajo alpha=0** (sin RGB residual que
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
