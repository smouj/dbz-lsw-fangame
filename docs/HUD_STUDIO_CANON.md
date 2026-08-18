# HUD STUDIO — CANON VISUAL (fuente de verdad)

> **Principio**: Todo lo que se ve en `http://localhost:5178/?dev=1#dev/hud` es
> CÓMO DEBE VERSE en el juego real. El studio y el juego consumen las **mismas
> clases CSS** (`src/styles.css`) y los **mismos datos** (`hudTheme`,
> `positions`, `cards`, `cardVisuals`, `hudAssets`). Si algo cambia aquí, cambia
> en el juego — y viceversa.
>
> Última canonización: **2026-08-18** (auditoría de paridad studio↔juego).

## Regla de oro

- El preview del HUD Studio es la **baseline visual congelada**.
- `BattleEngine` = lógica · `HUD Studio` = visual. No cambiar de dirección visual
  sin pasar por el studio.
- **Elementos dev-only** (ayudas del studio, NO son del juego):
  - Cruces de ancla `P · x,y` / `E · x,y` + zonas `ANIM` (overview)
  - Selector `FONDO` / `OVERVIEW|ACTION` / `ACTÚA` / `INPUTS 3-6`
  - Los contenedores `dev-*` (controles del studio, geometría, etc.)

## Vistas canonizadas (2026-08-18)

| Vista | Estructura canónica | Clases compartidas |
|---|---|---|
| **COMMAND** | Command strip: `[LIMIT] [JOINT] [BASIC]` (+CHARA con aliado) — sprites 48×40 ×2 = 96×80, hover lift −2px + brightness | `command-select` `command-strip` `cmd-limit/j/b/c` |
| **MANO** | Mano con cartas GBC (frame máscara + arte) + huecos vacíos con `no_card_red.png` (sprite real del juego) | `hand-area` `hand-cards` `card` `CardArtHole` `hand-empty-slot` `hand-no-card` |
| **BASIC** | `[STAGE ATTACK (carta real)] [GATHER POWER] [BACK]` — pulso canónico 3D en stage | `basic-menu` `basic-stage-card` `basic-gather` `basic-back` |
| **MOVE** | `[LEFT/RIGHT] [UP/DOWN] [EXIT]` — 3 botones 96×80 en UNA fila, sin texto (tooltip) | `move-axis-pad` `move-axis-btn axis-h/v` `basic-back` |
| **STAGE** | Diálogo GBC con CHIPS oscuros por input: `[✓][Q][E][↑][→]` + prompt relleno + tiempo a la derecha. Layout ESTABLE con 3-6 inputs (flex-shrink 0, prompt anclado) | `gbc-dialogue` `stage-inline` `stage-sequence` `stage-seq-item` `stage-inline-prompt` `stage-inline-time` |
| **LIMIT** | Cartas LIMITED en UNA línea + hueco candado (no obtenida) + BACK | `limit-cards-row` `limit-card` `limit-slot` |
| **DIALOGO** | Caja GBC blanca `#f8f4e4` + speaker FUERA (57×80, marco negro) + texto negro + actor rojo `#b03030` | `gbc-dialogue` `gbc-dialogue-speaker` `gbc-dialogue-actor` `gbc-dialogue-text` |
| **DISCARD** | HAND CHECK — panel con discard-grid de cartas (frame + arte + nombre) para elegir descarte | `discard-panel` `discard-grid` `discard-card` `discard-frame` `discard-art` `discard-name` |
| **DEFENSA** | Fuentes de defensa: `[LIMITED] [JOINT] [BASIC DEFENSE]` (botones basic-btn src-*) | `defense-sources` `src-limit` `src-joint` `src-basic` |
| **RESULTADO** | Pantalla final: VICTORY (LV/EXP/HP) o DEFEAT (TURN/HP) + botón NEW BATTLE/RETRY (toggle) — panel GBC horizontal compacto (no altera la altura) | `result-screen` `result-title` `result-info` `btn-primary` |
| **MENU** | Pantalla principal: logo, título, continuar (progreso), 6 items de navegación (1 seleccionado) y footer — escalado al preview | `menu-content` `menu-logo-mark` `menu-title` `menu-subtitle` `menu-continue-card` `menu-nav` `menu-item` `menu-footer` |
| **INTRO** | VS full-screen: retratos de batalla 160×120 (32×24 ×5) centrados vertical/horizontal, VS VT323 pixel con glow, FIGHT Bangers. Entrada: slide → pop → flash → FIGHT | `battle-intro` `intro-fighter` `intro-portrait` `intro-name` `intro-sub` `intro-vs` `intro-fight` |

## Invariantes clave (no romper)

1. **Caja de diálogo GBC**: 80px de alto, fondo `#f8f4e4`, borde negro 3px + outline, speaker fuera con margen lateral 88px.
2. **Cartas**: 96×80 (48×40 ×2 entero); el frame es MÁSCARA (`::after` z-3 sobre el arte z-1); sin línea de color superior en mano/STAGE.
3. **Botones GBC**: 96×80, sprite ×2 entero, sin texto superpuesto (todo en tooltip), hover canónico `translateY(-2px) + brightness(1.15)`.
4. **Tooltips**: estructura canónica `tipBlock`/`tipCard` (título negro carbón `#1a1a1a`, tipo coloreado `CARD_COLORS_ON_LIGHT`, stats/desc negro, compat verde). Cero azules `#005a8c`.
5. **Chips STAGE**: 52×52 oscuros `#141414`, done ✓ verde, current borde `#1f6fa3` sin escala, prompt 76×76 (cabe en 80px).
6. **Ventana del preview**: estable en TODAS las vistas (1056×570, ratio ≈1.85) — la fila de controles tiene `min-height: 96px`.
7. **INTRO**: sin ROUND/READY (spec 2026-08-18), retratos centrados exactos (0px desvío), VS pixel art.
8. **Colores del texto**: por defecto negro carbón; rojo solo como acento puntual (actor diálogo, timer QTE). Sin azules en tooltips/diálogo.
9. **GAP UNIFICADO 10px**: separación equidistante entre TODOS los botones/cartas de los paneles (command-strip, mano, basic-menu, move-axis, limit-cards-row, chips STAGE, prompt→tiempo). La única excepción es el ancla del STAGE (secuencia→prompt anclado a la derecha).
10. **Barras HP estilo lucha**: 24px de alto, relleno anclado al lado CENTRO (drena hacia dentro), hueco central `clamp(84-150px)`, sin número dentro (tooltip HP).
11. **Badge central**: VS (VT323 38-44px) + ROUND debajo — SIN caja, SIN líneas, SIN badge ATK (la fase ATTACK/DEFEND vive bajo la barra HP).
12. **Chip CC GBC**: esquina inferior derecha de los paneles con cartas — negro carbón `#1a1a1a`, número blanco VT323 19px, tooltip CC x/y.
13. **Fase ATTACK/DEFEND**: INLINE en la fila de info (entre nada y los badges — sin fila propia), alineada al centro vertical de los badges.

## Verificación de paridad

```bash
# Clases compartidas studio ↔ juego (deben mantenerse altas, ~69)
comm -12 <(grep -oE 'className="[a-z-]+' src/devtools/hud.tsx | sort -u) \
         <(grep -oE 'className="[a-z-]+' src/main.tsx | sort -u) | wc -l

npm run verify:hud-layout   # 10/10 invariantes
npm run verify:battle       # 71/71 lógica
```

## Historial de canonización

- **2026-08-18**: auditoría completa — alineados MANO (huecos `no_card_red.png`),
  MOVE (3 botones, sin texto), STAGE (chips + layout estable 3-6), INTRO
  (full-screen GBC, retratos 160×120 centrados, VS pixel), tooltips
  estructurados (`tipBlock`/`tipCard`), hovers únicos, ventana estable.
