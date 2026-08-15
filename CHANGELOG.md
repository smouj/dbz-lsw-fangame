# Changelog

Todos los cambios notables en `dbz-lsw-fangame`. Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).

## [Unreleased]

### Fix: cartas `compatible` auditadas contra CSV Users + matriz de mazos (2026-08-15)
- 21 cartas corregidas (separación Gohan/Trunks + preexistentes sobredimensionadas).
  Fuente de verdad: columna `Users` del CSV (conteo de FORMAS por id, leído con parser
  CSV real — el split por coma rompe con `Effect: "Heal 25%, ½ in defense"`) y la
  matriz `enemy_gid_1696533224.csv`. Ver docs/CARD_SYSTEM.md.
- `LIMIT_DEFAULTS` (roster) re-sincronizados: cell/android_16/17/18/19/20/goten
  apuntaban a cartas que ya no eran suyas tras la auditoría (p.ej. cell tenía
  Lightning C./Crazy Rush/Eraser Can. que son de Nappa/17/Recoome).

### Feat: rayos de beam reales (beam_ray/beam_ray_tip) en las 48 formas
- Todos los manifests de combate expusieron `beam_ray` (haz horizontal real del V6,
  ancho>95px) y 44/48 `beam_ray_tip` (cabezas de rayo filtradas por color azul —
  las auras naranja/rojo de power-up se descartaron). Solo Trunks SSJ los tenía.
- Render: el rayo se EXTENDE desde el personaje hacia el rival (stretch por progress,
  posición fija en el actor) — estilo GBC. Antes viajaba como objeto a escala 1×
  (diminuto) o 3× (fuera de canvas).

### Fix: Pixi Sequence Lab — secuencia completa melee/beam
- El lab saltaba directo al golpe y hacía avance/rush incluso en beams. Ahora dos
  flujos: MELEE (FIELD → guard → avance → ACTION_DUEL → rush → HIT) y BEAM
  (FIELD → guard → PROJECTILE sin avance → charge → fire → el rayo viaja → impacto
  genérico). Selectores: 48 formas × 2, acciones genéricas + 12 perfiles firma,
  14 escenarios, velocidad 0.5×-4×, slider de seek por tick GBC.
- `BattleTimeline.speed` (multiplicador del reloj) y `BattleRenderer.destroy`
  con `removeView:false` (el canvas React persistía al recrear el renderer).

### Feat: sprites corregidos (Trunks Futuro SSJ, Vegito, Gohan/Trunks separados)
- `future_trunks_super_saiyan` usaba frames del normal (pelo morado): mapeados los
  49 frames reales del V6 canónico (silueta IoU 1.0 contra el normal validado).
- Vegito solo SSJ (recolor artificial eliminado); Gohan Kid/Adult y Trunks Kid/Futuro
  separados como personajes distintos (roster + cartas + retratos battle).

### Feat: motor gráfico PixiJS 8 para el combate (React se queda en UI/mentores)
- **Renderizador Pixi autocontenido** (`src/renderer/pixi/`): `BattleRenderer`
  (WebGL, `antialias:false`, `resolution:1`, `autoDensity:false`), `AtlasLoader`
  (manifests + frames PNG con nearest-neighbour y cache por forma), `SpriteAnimator`
  (frame = f(ticks GBC) puro), `FighterActor` (ancla `(0.5,1)`, respeta `facingFlip`
  y `move_left` espejo).
- **Capa de presentación desacoplada**: contrato `BattlePresentation` + `PixiBattlePresentation`
  + `CinematicAdapter` (eventos timeline → métodos Pixi). Reloj ÚNICO GBC: la animación
  de sprites y los eventos avanzan por el MISMO tick; `BattleTimeline` emite el tick 0
  (`tickCursor=-1`). Rush = `f(tick − rushStartTick)` con `easeOutCubic`, determinista.
- **Dev Studio**: módulos `Pixi Lab` (verificación del render) y `Pixi Seq`
  (replay live + `checkDeterminism()` con 100 runs → FRAME-DETERMINISTICO).

### Feat: perfiles cinematográficos declarativos por acción
- `src/battle/actionProfiles.ts`: formato `ActionProfileSpec` + compilador →
  `CinematicTrack[]` + `resolveActionProfile(cardName)` + 12 perfiles firma
  (`kamehameha`, `masenko`, `special_beam_cannon`, `spirit_bomb`, `final_flash`,
  `cont_punch`, `cont_kick`, `rising_kick`, `sonic_kick`, `dunk_shot`, `crazy_rush`,
  `kaio_ken`) con fidelidad `INFERRED` (timings NO canon). `profileFor(kind, cardName)`
  resuelve firma primero y cae al fallback por kind. Script `npm run verify:profiles`.

### Feat: integración BattleScreen → Pixi (gated detrás de `?pixiField=1`)
- **Slice 1 — master shot táctico**: `BattlePixiStage` monta `BattleRenderer` +
  `PixiBattlePresentation` con datos REALES (escenario + formas + `BattlePosition`)
  y renderiza el plano FIELD (fondo overview + overworld). `object-fit: contain`
  evita la distorsión del canvas 2:1. Cero regresión al camino DOM por defecto.
- **Slice 2 — plano de ACCIÓN**: `BattlePixiStage` publica su presentación vía prop
  `presentationRef`; `playCardCinematic` hace `pres.reset()` + `pres.setAttacker(side)`
  y enruta cada evento con `applyCinematicEvent(pres, e)` + `onTick(tick) → pres.sync(tick)`
  en paralelo al DOM. El HUD React permanece fijo; solo se transforma la ventana central.
- **Fix**: `BattleRenderer.destroy()` ya no destruye las TextureSource de `Assets`
  (cache stale → luchadores en blanco en la 2ª batalla); ahora `texture:false/textureSource:false`.

### Docs: gramática cinematográfica LSW (master shot táctico + action burst)
- `docs/CINEMATIC_GRAMMAR.md`: plano táctico = estado real del combate; el plano de
  acción es la dramatización temporal; siempre se regresa al táctico. HUD fijo, cortes
  discretos (no tweens), `outcome` (HIT/BLOCK/AVOID/…) influye en el perfil, MOVE es
  táctico (no cinemática). Tabla CONFIRMADO vs PENDIENTE (forense FRAME_VERIFIED).
- `MOVE` eliminado como kind cinematográfico (era `move→profileDefense`, incorrecto).

### Feat: editor de sprites y animaciones en el Dev Studio
- **Animation Studio** ahora es un editor completo: reordenar (`◂ ▸`), quitar (`✕`)
  y añadir frames (copiar un frame existente o por nombre de archivo), añadir/quitar
  poses, y editar fps/loop directamente sobre el manifest de trabajo.
- **Pixel Art Editor** (módulo nuevo): pinta/borra/corrige píxeles con pincel,
  borrador y cuentagotas; paleta + selector de color, zoom, rejilla, undo/redo
  (60 pasos). Pintura pixel-perfect con Canvas 2D (sin dependencias).
- **Persistencia**: los cambios de manifest se guardan en localStorage (overrides)
  y se pueden exportar como JSON o guardar al proyecto. Nuevo middleware de Vite
  (`/__dev/write`) escribe manifests y PNGs directamente en `public/assets` con
  guardas contra path traversal y extensiones no permitidas.
- Flujo: crea un frame nuevo en Pixel Art (píntalo y guárdalo), luego añádelo a
  una pose en Animation Studio por nombre de archivo, y guarda el manifest.

### Feat: HUD Studio — visualizador del gameplay + editor del tema HUD
- Módulo nuevo en el Dev Studio que muestra un **mockup completo del gameplay**
  (HUD superior con ambos luchadores, barra de HP, stats, badge central VS, campo
  de batalla con los sprites reales y menú de comandos) y permite **editar en vivo
  el tema HUD**: colores (acento dorado, HP, KI, tipos de carta), escala de sprites
  y cartas, y tamaños tipográficos.
- Los cambios se previsualizan al instante; **Aplicar al juego** los inyecta como
  variables CSS en `document.documentElement` (afecta a todo el juego de inmediato)
  y los persiste en localStorage. Se reaplican al arrancar (`applyHudTheme`).
  Reset restaura los valores de `:root` y permite exportar el tema como JSON.

### Feat: pose `move` dividida en `move_right` + `move_left` (dash direccional GBC)
- La pose de movimiento del GBC es un dash horizontal: solo hay 2 direcciones
  (derecha/izquierda), no 4 — el desplazamiento arriba/abajo se visualiza también
  como dash horizontal. Los 44 manifests ahora tienen `move_right` y `move_left`
  (mismo ciclo de caminar; `move_left` se espeja en render con `scaleX(-1)`).
- El juego selecciona la pose según la profundidad resultante del MOVE: FRONT →
  `move_right` (mira al rival) · BACK → `move_left` (da la espalda). El importador
  (`import-fixed-sprites.mjs`) se actualizó para regenerar esta estructura.

### Fix: Development Studio — scroll vertical + sprites de cartas + orden HUD
- **Scroll del panel**: el `.devstudio` ahora es un shell fijo (`height: 100vh;
  overflow: hidden`) y `.dev-main` hace scroll vertical interno. Antes el contenido
  que excedía la altura quedaba cortado sin scroll (los `html/body/#root` tienen
  `overflow: hidden` para el juego).
- **Sprites de cartas visibles**: el Card Database muestra ahora el icono real de
  cada carta (32×24, de `cardIconUrl`) en cada fila y un sprite grande (3×) en la
  ficha de detalle. 125/125 renderizan sin imágenes rotas.
- **Orden HUD unificado**: menú de DEFENSA reordenado a LIMIT · JOINT · BASIC,
  igual que el menú de ataque (que ya estaba LIMIT · JOINT · BASIC · CHARA).

### Fix: Development Studio — manifest.json como imagen rota + banner desactualizado
- **Sprite Inspector** y **Character Studio** cargaban `manifest.json` (un JSON
  de poses/frames) como `<img>`, mostrando una imagen rota en las miniaturas de
  assets. Ahora renderizan un enlace `manifest.json ↗` que abre el JSON real en
  una pestaña nueva.
- **Battle Lab**: el banner seguía diciendo que el *Internal State Inspector* y
  el *QTE Debugger* estaban "en desarrollo", cuando ya están implementados.
  Actualizado con las teclas de ambos depuradores (`?debugState=1` y
  `?debugCinematics=1`).
- Verificado en navegador: 0 imágenes rotas en los 10 módulos, Battle Lab lanza
  el BattleScreen real, sin overflow horizontal y consola limpia en carga nueva.

### Fix: animaciones de combate — alineación, timing y windup
- **Frame jitter eliminado**: los frames del zip FIXED están recortados a su
  bounding box (w/h variables por frame), así que `FighterSprite` "respiraba"
  al animar. Ahora `useSpriteAnim` devuelve `maxW/maxH` de la forma y cada frame
  se ancla abajo-centrado dentro de un canvas fijo (ground line estable).
  Verificado: contenedor constante 79×84 en batalla (antes saltaba por frame).
- **Timing del rush (melee) corregido**: la fase travel duraba 6 ticks (a−6 → a)
  y cortaba el lunge CSS `fx-rush-body` (0.7s) + swing. El `HIT_FRAME` ahora cae
  al final del travel (a+t), dando al lunge su duración real (~44 ticks).
- **Windup del puño corregido**: los golpes físicos (damage/command) mostraban
  `power_up`, que cae a `beam_charge` (manos juntas cargando ki, impropio de un
  puñetazo). Ahora usan `idle` en la aproximación y `attack_fwd` en el lunge.
- **FPS de ataque 7→5**: a 7fps el puñetazo llegaba al frame de recuperación en
  el momento del impacto; a 5fps el contacto cae en el frame de extensión
  (3-4), como debe ser. El import script queda coherente.
- **Animation Studio alineado**: el canvas es fijo (max W/H de la forma) con el
  frame anclado abajo-centrado, igual que en batalla.

### Fix: sprites de combate regenerados desde la fuente correcta
- El rebuild anterior (`rebuild-sprites-v6.mjs`) usó la clasificación de *review*
  del zip ATOMIC V5 (`idle_or_stance`/`downed_or_hurt`/`move_or_attack`…), más
  gruesa: dejaba `hurt` reducido al frame de derrotado, perdía `guard` y
  `attack_ud`, y no cubría `goku_ssj2`/`ginyu_goku`.
- Nuevo `scripts/import-fixed-sprites.mjs` importa desde la fuente autoritativa
  `DBZ_LSW_COMPLETE_CHARACTER_SPRITES_FIXED.zip` (`00_manifest/animations.json` +
  `corrections.json`, 171 fixes). Mapeo: idle/move/guard/attack_fwd/attack_ud/
  hurt (recoil completo, 6-7 frames). Las 42 formas + `goku_ssj2` y
  `ginyu_gokus_body` quedan correctas.
- **beam partido en carga y disparo**: la categoría `beam` del zip FIXED tiene
  dos filas en la hoja original (carga arriba, disparo abajo). El importador
  detecta el salto de `source_y` y genera `beam_charge` (fila superior) +
  `beam_fire` (fila inferior) en vez de colapsar todo en `beam_charge`. La
  dirección se verificó visualmente (carga = manos juntas, disparo = brazos
  extendidos). Las formas con beam de una sola fila (p.ej. Piccolo, Goku SSJ,
  Goten) siguen usando solo `beam_charge` y el juego hace fallback en `beam_fire`.
- `power_up` sigue sin categoría propia (el zip FIXED no la trae); el juego hace
  fallback a `beam_charge` vía `POSE_FALLBACKS`. El proyectil del beam es el
  efecto `linked_beam`.
- `vegito_base` reutiliza `goku_super_saiyan` y `future_trunks_super_saiyan`
  reutiliza `future_trunks_base` (no están en el zip FIXED).
- Dev Studio: la lista de poses del Sprite Inspector refleja las 8 poses reales
  (incluye `beam_fire`).

### Inspector de estado + QTE Debugger (`?debugState=1`)
- **Internal State Inspector**: overlay fijo (esquina superior derecha) con el
  estado interno de `BattleScreen` en tiempo real — fase, ronda/exchange/owner,
  HP/CC/posición/pose de cada luchador, stages (STR/KI/SPD/GRD), POWER/GATHER/
  BUFF/LOCK/ACC/EVA, tamaño de mano y carta seleccionada.
- **QTE Debugger**: congela/avanza el reloj del Stage Attack (frames GBC).
  Teclas: `F` congelar/descongelar · `.` +1 frame · `Shift+.` +10 frames. El
  reloj real se ignora al congelar y los pasos se inyectan frame a frame (con
  limpieza de pasos residuales entre QTEs).
- Nuevo módulo `src/battle/debugState.ts` (`isDebugState` / `bindQteDebugControls`
  / `renderStateOverlay`).

### Fix: keys React únicas (monotónico, no `Date.now()`)
- `damageNums` / `phaseCue` / `drawFx` / `battleTransform` / `transformFx` usaban
  `Date.now()` como key: varios eventos en el mismo ms colisionaban ("two children
  with the same key" → números de daño duplicados/omitidos). Sustituido por
  `nextUid()` (contador monotónico) en todo `main.tsx`.

## [2026-08-13] — Development Studio (#dev) + retrato CONTINUAR + HUD fijo

### Development Studio (herramienta interna, `76142fa`)
- Nueva ruta `#dev` (o `?dev=1`) embebida en el proyecto (sin router extra).
- Shell con sidebar de 10 módulos en `src/devtools/`.
- **Dashboard**: contadores reales computados de los datos (48 formas, 24 personajes,
  125 cartas, 32 mazos de jefes, 13 escenarios).
- **Character Studio**: personaje→formas→stats a nivel con `statAtLevel()` + assets
  (retrato/overworld/idle/sheet/poses).
- **Card Database**: 125 cartas con filtros por tipo/CC/búsqueda + ficha + JSON crudo.
- **Sprite Inspector**: canvas zoom nearest-neighbor (1/2/4/8x) + bounding box del
  contenido opaco + % de transparencia.
- **Position Lab**: tablero 2×2 con el enum real `BattlePosition` + MOVE de 2 ejes
  + vulnerabilidades/distancias.
- **Story Studio**: 32 capítulos con mazo del jefe, AI boost, 2v2 y viñetas.
- **Validation**: 11 chequeos de integridad. **Research**: fuentes + nivel de verificación.
- **Animation Studio**: timeline real (play/pause/step/fps/loop nativos del
  manifest.json GBC) con playhead sobre la tira de thumbnails y comparativa de
  renderizado nearest (GBC) vs bilinear (`8574916`).
- **Battle Lab**: lanza combates reales (Versus o capítulo de historia) eligiendo
  formas + capítulo; cablea `onLaunchBattle` a `AppInner` (`8574916`).
  El Internal State Inspector y QTE Debugger siguen como siguiente fase.

### Retrato oficial en la tarjeta CONTINUAR (`eb13363`)
- El personaje activo del menú usa el retrato oficial del GBC (40×56 recortado a
  fondo transparente, `public/assets/portraits/menu_cut/`), no el chibi overworld.

### HUD inferior fijo + QTE overlay (`1e4452b`)
- `.battle-screen` con fila de controles de altura FIJA (`--controls-h` clamp) para
  que el campo de batalla NO refluya entre fases.
- El QTE de Stage ahora es un overlay flotante sobre el campo (no empuja la rejilla)
  y usa el luchador del campo como protagonista (no sprite duplicado).

## [2026-08-13] — Movement de 2 ejes + robo de carta animado + director cinematográfico

### Movement canónico (manual GBC §9)
- **MOVE con SOLO 2 ejes** (`e969041` + `44e3dcc`): desaparecen los 4 botones
  de posición directa. Ahora hay HORIZONTAL ↔ (FRONT/BACK) y VERTICAL ↕
  (AIR/GROUND); cada uno transforma UN eje y conserva el otro. Imposible
  teletransporte diagonal (Air/Back → Ground/Front requiere 2 acciones).
- `moveHorizontal()` / `moveVertical()` / `applyMoveAxis()` en `positions.ts`.
- **Preview CURRENT → RESULT** al pasar el cursor sobre cada eje (sin confirmar):
  `GROUND / BACK ↔ GROUND / FRONT`. Hover solo con puntero (sin layout shift).
- **Empuje Front/Back SOLO en eje horizontal** (manual §9): al avanzar a FRONT
  con rival en BACK, el rival pasa a FRONT. Vertical jamás toca Front/Back.
- i18n: 3 keys nuevas (`battle.chooseAxis` / `axisHorizontal` / `axisVertical`)
  en los 10 idiomas.

### Robo de carta animado (manual GBC)
- **+1 carta al entrar en Attack Phase** (confirmado por LP del GBC original:
  "draw one in every Attack Phase"). Máx 6 transitorio / 5 persistente.
- **Animación de robo**: la carta sale del mazo (fuera de pantalla, borde
  inferior-izquierdo) y se desliza con flip 3D hasta la mano (~460ms),
  con SFX propio (`Sfx.draw`: fricción de mazo + tono al aterrizar).
  La carta se añade a la mano SOLO al terminar la animación.
- Solo cartas compatibles con el personaje activo (`cardUsableBy`).

### Director cinematográfico
- `src/battle/timeline.ts` + `profiles.ts` + `spriteSemantics.ts` +
  `debugCinematics.ts`: reloj ÚNICO determinista en frames GBC; cada carta
  declara su cinematografía (beam 54+54+44, rush 50+44+38, support 118);
  `playCardCinematic` migrado al timeline (sin setTimeout como autoridad).
- Fix: `PROJECTILE action:'rush'` y `HIT_FRAME` ahora avanzan el step CSS
  (attacker→travel→target).

## [2026-08-12] — Pulido de combate, HUD GBC auténtico y datos ROM

### Fixes
- **Orden de defensa GBC** (`011a7a1`): el defensor elige su defensa ANTES de que
  se anime el ataque. Antes el enemigo animaba y luego se pedía defensa.
- **Timing de cinemática** (`b0a273d`): los pasos GBC ahora cubren las animaciones
  CSS completas (damage attacker 44→50f, travel 32→44f, beam travel 50→54f) — las
  animaciones ya no se cortan a mitad (efecto "brusco").
- **Compatibilidad de cartas aplicada** (`257cc25`): la IA excluía TODAS las cartas
  de personaje del pool de ataque (`!c.compatible`) — los jefes nunca usaban sus
  cartas firma. Ahora filtran por el personaje enemigo.
- **IDs de androides normalizados** (`abb3dc3`): `no16..no20`/`celljr` → `android_16..20`/
  `cell_jr` (rompía getCharacter, compatibilidad de IA y carga de límites).
- **Mazos iniciales** (`abb3dc3`): reconstruidos solo con cartas genéricas (Users=48)
  — antes quedaban 9-14/20 usables tras el filtro de compatibilidad.
- **Facing Trunks Kid SSJ** (`abb3dc3`): `kid_trunks_super_saiwan` golpea a la
  izquierda (verificado visualmente) y necesitaba flip.
- **BaseFormId** (`abb3dc3`): mapa explícito (antes devolvía ids inexistentes como
  `frieza_base`).
- **Botones GBC** (`0d86fe8`): fix de especificidad CSS — `.command-strip button`
  (0,1,1) pisaba `--btn-frame` de las variantes (0,1,0); ahora `button.cmd-limit`
  etc. (0,2,1). Texto oscuro sobre interior claro (antes blanco sobre blanco).
- **Tooltip** (`0d86fe8`): migrado a portal React (`createPortal` al body,
  `position:fixed`, z-index 10000) — ya no se corta por overflow ni se esconde
  bajo otros elementos; se adapta arriba/abajo según el espacio.

### Features
- **Estados de batalla en HUD** (`ed596ff`): fila `.hud-status` con chips de
  buff/debuff/guard/power/acc/eva/lock para ambos luchadores; SPD con stages.
- **Tooltips de carta** (`ed596ff`): efecto + compatibilidad en `data-tip`.
- **Variantes ofensivas** (`011a7a1`): Tail pierce ignora Avoid, Body Change ≈50%
  HP rival, Suicide deja a 1 HP, team attacks −40% sin compañero.
- **Botones GBC con nombre** (`cc5d8ba`): btn_basic/joint/limit/chara/guard/move/
  power (48×40 de la ROM, nombre dentro del sprite) en command-strip, defensa y
  submenús.
- **Datos ROM completos** (`257cc25`): 48 formas = ROM (Gohan Super2, Trunks Ksuper,
  Piccolo Evil añadidos; frieza_100 duplicado eliminado); Vegito en CHARACTERS;
  sprites goku_ssj2 → `goku_super_saiyan_2`, ginyu_goku → `ginyu_gokus_body`.
- **Cinemática lateral** (`205ef45`): el sprite grande entra centrado y se coloca
  a su lado antes del lanzamiento/rush.
- **Motion feel** (`c40b54d`): paso FIELD RETURN, tiempos de presentación más
  largos, easing stepped GBC, sin escalado de sprites.

### Docs
- `docs/GAMEPLAY_HUD_AND_START_FLOW.md` — contrato de HUD/flujo actualizado
  (botones GBC, tooltips, estados, timing de cinemática).
- `docs/BATTLE_ENGINE_SPEC.md` — orden de defensa GBC + tabla de timing ACTION.
- `docs/CARD_SYSTEM.md` — compatibilidad por personaje (3 fuentes) y variantes
  ofensivas.
- `docs/HUD_BUTTONS.md` — nueva referencia de los sprites de botones.
- `README.md` — estado real (24 personajes, 48 formas, 32 capítulos).

## [2026-08-11] — Estabilización de flujo inicial

- `c83fb99` — HUD v3, CC dock abajo-derecha, flujo inicial Gohan vs Piccolo,
  Battle Mode abre con Piccolo.
- `53f7f3e` — paneles de Deck/Cards estabilizados.
- `63b174f` / `83395a9` — handoff visual y vulnerabilidad por posición.
- `e559b7f` — facing por spriteDir (NATIVE_STRIKE_DIR).
- `a8bf3d2` — coreografía de cartas estilo GBC (attacker → travel → target).
- `5f562ac` — sprites de combate V5 atómicos (43 dirs + manifest).
- `858c427` / `08eae86` / `d896c87` / `2685703` / `e121c36` / `6271bc9` — hover
  estable, diseño tokenizado, menú principal rediseñado.
