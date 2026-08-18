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
| **MENU** | Pantalla principal: `.menu-bg` (arte + Ken Burns), 3 rayos eléctricos SVG pixelados animados, logo, título VT323 dorado, continuar (progreso), 6 items de navegación (1 seleccionado) y footer — reutiliza el markup real del juego, compacto en px para el preview | `menu-screen` `menu-bg` `menu-bolts` `menu-content` `menu-logo-mark` `menu-title` `menu-subtitle` `menu-continue-card` `menu-nav` `menu-item` `menu-footer` |
| **INTRO** | VS full-screen SIN texto: los 2 sprites entran DESDE FUERA (±42vw) hasta su posición (entrada cinematográfica ÚNICA), VS VT323 pixel pop central + glow, flash blanco 1.5s, banda de energía. NO hay READY/FIGHT/nombres/formas. `hud-in` del hud-top desactivado durante la intro (intro-active) — una sola animación de entrada | `battle-intro` `intro-fighter` `intro-portrait` `intro-vs` `intro-flash` |

## Invariantes clave (no romper)

1. **Caja de diálogo GBC**: 80px de alto, fondo `#f8f4e4`, borde negro 3px + outline, speaker fuera con margen lateral 88px.
2. **Cartas**: 96×80 (48×40 ×2 entero); el frame es MÁSCARA (`::after` z-3 sobre el arte z-1); sin línea de color superior en mano/STAGE.
3. **Botones GBC**: 96×80, sprite ×2 entero, sin texto superpuesto (todo en tooltip), hover canónico `translateY(-2px) + brightness(1.15)`.
4. **Tooltips**: estructura canónica `tipBlock`/`tipCard` (título negro carbón `#1a1a1a`, tipo coloreado `CARD_COLORS_ON_LIGHT`, stats/desc negro, compat verde). Cero azules `#005a8c`.
5. **Chips STAGE**: 52×52 oscuros `#141414`, done ✓ verde, current borde DORADO `#f0d060` sin escala (sin azul), prompt 76×76 (cabe en 80px).
6. **Ventana del preview**: estable en TODAS las vistas (1056×570, ratio ≈1.85) — la fila de controles tiene `min-height: 96px`.
7. **INTRO**: SIN texto (no ROUND/READY/FIGHT/nombres/formas — spec 2026-08-18), entrada única: sprites desde ±42vw + VS pop + flash. Duración **3s** (la última animación acaba a los 1.9s → 1.1s de respiro → arranca el combate; sin diálogo GBC de presentación — era invisible). `hud-in` desactivado durante la intro.
8. **Colores del texto**: por defecto negro carbón; rojo solo como acento puntual (actor diálogo, timer QTE). Sin azules en tooltips/diálogo — tampoco en fondos/bordes de cajas o elementos (el chip 'input actual' del STAGE usa borde DORADO #f0d060, no azul).
9. **GAP UNIFICADO 10px**: separación equidistante entre TODOS los botones/cartas de los paneles (command-strip, mano, basic-menu, move-axis, limit-cards-row, chips STAGE, prompt→tiempo). La única excepción es el ancla del STAGE (secuencia→prompt anclado a la derecha).
10. **Barras HP estilo lucha**: 24px de alto, relleno anclado al lado CENTRO (drena hacia dentro), hueco central `clamp(84-150px)`, sin número dentro (tooltip HP).
11. **Badge central**: VS (VT323 38-44px) + ROUND debajo — SIN caja, SIN líneas, SIN badge ATK (la fase ATTACK/DEFEND vive bajo la barra HP).
12. **Chip CC GBC**: esquina inferior derecha de los paneles con cartas — negro carbón `#1a1a1a`, número blanco VT323 19px, tooltip CC x/y. OCULTO cuando hay diálogo GBC activo o en STAGE (igual que el chip FASE).
13. **Fase ATTACK/DEFEND**: inline en la fila de info, SIEMPRE en el lado INTERIOR (junto al VS) — los badges de estado quedan en el borde EXTERIOR (fase `[ATTACK]` izquierda → x≈406, `[DEFEND]` derecha → x≈628). La reserva del 2º miembro del equipo vive en la FILA DEL NOMBRE (hud-top de 3 filas: nombre+reserva · HP · info).
14. **Info de fase en chip estilo CC**: `FASE n/2` (exchange del turno) vive como chip GBC (negro carbón `#1a1a1a` + VT323 blanco 19px + outline `#d8d0b8`, MISMO lenguaje que el chip 06 de CC) en la ESQUINA INFERIOR IZQUIERDA del panel con cartas — espejo del cc-panel a la derecha. OCULTO con diálogo GBC activo y en STAGE/DIÁLOGO/RESULTADO/INTRO/MENÚ. NO hay fase-bar, ni `TURN n` (ROUND central), ni `X STRIKES FIRST` (la fase bajo HP ya indica quién ataca).
15. **Elementos eliminados del HUD (no duplicar)**: phase-bar (fila sobre los controles), battle-log (barra de mensajes — `addLog` sigue vivo porque dispara `showGbc`), cc-dock (P/E — el CC vive en el chip del panel), fila de stats del hud-top (STR/KI/SPD/CC bajo la HP — la fase + badges viven en `.hud-info-row`), `CCDisplay` y su CSS (muerto).

## Verificación de paridad

```bash
# Clases compartidas studio ↔ juego (deben mantenerse altas — 90)
comm -12 <(grep -oE 'className="[a-z-]+' src/devtools/hud.tsx | sort -u) \
         <(grep -oE 'className="[a-z-]+' src/main.tsx | sort -u) | wc -l

npm run verify:hud-layout   # 10/10 invariantes
npm run verify:battle       # 71/71 lógica
```

## Historial de canonización

- **2026-08-18**: auditoría completa — alineados MANO (huecos `no_card_red.png`),
  MOVE (3 botones, sin texto), STAGE (chips + layout estable 3-6), INTRO
  (full-screen GBC, sprites desde ±42vw + VS, sin texto), tooltips
  estructurados (`tipBlock`/`tipCard`), hovers únicos, ventana estable.
- **2026-08-18 (2ª)**: canónica de POSICIONES y FONDOS — `ACTION_CENTER_ANCHOR`
  (50,68) como constante única; Position Lab con 4 planos tácticos + plano
  ACTION; fondos por situación (OVERVIEW→`NN_world`, ACTION→`NN_action`,
  SPECIAL_ACTION→`special_action`); anchors simétricos documentados.

## Canónica de POSICIONES y FONDOS (planos)

### Anclas tácticas (OVERVIEW — los 4 planos por combatiente)
- **Fuente única**: `anchorFor(pos, side)` en `src/data/positions.ts` (editables desde el Position Lab `#dev/positions`, persisten en localStorage `dbzlsw:position-anchors`).
- Defaults simétricos (L x=16/32 · R x=84/68, espejo 100−x):

| Posición | LEFT | RIGHT |
|---|---|---|
| UP_BACK (aire/lejos) | 16, 26 | 84, 26 |
| UP_FRONT (aire/cerca) | 32, 26 | 68, 26 |
| DOWN_BACK (suelo/lejos) | 16, 72 | 84, 72 |
| DOWN_FRONT (suelo/cerca) | 32, 72 | 68, 72 |

- Regla de colocación: los PIES del sprite tocan el anchor exacto (`translate(-50%,-100%)`); chibi overworld 16×16 a **×3 = 48px en el preview** (12.2% del campo de 392px ≈ ratio GBC 11.1% del 144 — antes 80px era el doble) y `clamp(48px, 9vmin, 96px)` en el juego (×3 en ventanas pequeñas → ×6 en grandes); Position Lab a ×2 = 32px; facing con `scaleX(±1)` aplicado DESPUÉS del translate (nunca transform inline que pise el anclaje).
- Position Lab muestra los 4 planos + **plano ACTION** (quinto): el actor centrado con los pies en `ACTION_CENTER_ANCHOR` (50, 68) sobre el fondo `_action`.

### Plano ACTION (cinemático / QTE / animaciones)
- **ESCENARIO (`NN_action.png`)**: actor CENTRADO — `ACTION_CENTER_ANCHOR = {x: 50, y: 68}` (constante única en positions.ts) — composición de primer plano, sprite 192px, pies anclados igual que los chibis.
- **ESPECIAL/transición (`special_action.png` — blanco con bandas azules)**: actor en ESPEJO según quién ejecuta — `actionAnchorFor(side, special)`: JUGADOR a la IZQUIERDA (x 20) mirando a la derecha · ENEMIGO a la DERECHA (x 80 = 100−20) mirando a la izquierda · y 70 (2px más abajo) · 190px (2px menor, CSS `.special-actor`). El fondo especial se escala `auto 100%` + `repeat-x` (bandas siempre visibles, sin recorte ni líneas negras) con atmósfera al 25%.
- El QTE del juego (stageInput) ejecuta la secuencia con el luchador en SU anchor táctico (no en el centro): el contenedor usa `anchorFor` siempre; `.field-action` funde los fighters salvo `qte-active`.

### Fondos por situación (fuente: `src/data/scenarios.ts` + `src/data/battleBackgrounds.ts`)
| Situación | Fondo |
|---|---|
| OVERVIEW (táctico, selección) | `NN_world.png` del escenario |
| ACTION (QTE, ataque/beam/support) | `NN_action.png` del escenario |
| SPECIAL_ACTION (transformaciones, Beam Ultimate — plano de TRANSICIÓN: fondo blanco con bandas azules) | `special_action.png` |
- 13 escenarios en el catálogo; el selector `FONDO [SC NN] [OVERVIEW|ACTION]` del studio previsualiza ambos modos en vivo + fila `PLANO [ESCENARIO|ESPECIAL]` en ACTION (el especial = transición).
- **MODO HISTORIA**: el escenario se elige POR CAPÍTULO según la clasificación del paquete `DBZ_LSW_BATTLE_BACKGROUNDS_GBC_STORY_CLASSIFIED_V2` (`battleBackgrounds.ts`: Saiyan → Namek → Androides/Cell → Trunks → Entrenamiento → Buu). Versus = aleatorio.
- El fondo RELLENA la escena (cover + pixelated, como el GBC que ocupa todo el ancho del campo).
