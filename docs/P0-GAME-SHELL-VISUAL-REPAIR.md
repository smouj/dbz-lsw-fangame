# P0 — GAME SHELL VISUAL REPAIR

## SCOPE

B0/B1 DE COMBATE ESTÁN CERRADOS.

**NO TOCAR:** BattleEngine, BattleRuntime, BattleState, Battle Presentation, Battle HUD, cinematografía de cartas, ROM, sprites Fighters, Dev Studio, Story content.

**EXCLUSIVAMENTE:** MAIN MENU + PÁGINAS DEL GAME SHELL.

**OBJETIVO:** Que toda la interfaz externa al combate se vea terminada, coherente, nítida, bien jerarquizada y propia de DBZ LSW Fangame. No rediseño conceptual. No nuevas pantallas. No cambiar rutas funcionales. Arreglar y perfeccionar lo que YA existe.

---

## 1. AUTORIDAD VISUAL

Mantener GameViewport: 320×180 logical, 16:9, integer/pixel scaling, nearest-neighbor, letterbox.

Todo el Game Shell dentro de esa geometría lógica. Debe mantener composición idéntica a 320×180, 640×360, 1280×720, 1920×1080 (solo cambia escala física).

## 2. PRIMERO — AUDITORÍA VISUAL REAL

Antes de editar, abrir/renderizar: MAIN MENU, VERSUS, CHARACTERS, DECK, CARDS, SETTINGS, STORY, RESULTS. Capturar cada pantalla completa.

Crear lista corta de defectos por pantalla organizados en: LAYOUT (overlap, clipping, gaps, alignment, panel proportions, dead space, safe areas), TEXT (truncation, wrapping, texto tocando marcos, jerarquía, contraste, captions), ART (deformación, crop, sprite tamaño, pixel blur, posición, fondo), INTERACTION (hover mueve layout, focus poco visible, área clicable, selected state).

Usar esta auditoría para aplicar inmediatamente correcciones. No crear documento largo.

## 3. MAIN MENU — DIRECCIÓN CANÓNICA

MAIN MENU = COMIC / MANGA SPLASH PAGE. No lista vertical, dashboard, grid, glassmorphism, material design, launcher moderno.

Jerarquía: A) Hero (Continue/Story) B) Principales (Battle/Versus, Characters, Cards) C) Secundarias (Deck, Settings). La hero debe dominar sin comerse navegación.

## 4. DEFECTOS P0 CONOCIDOS DEL MAIN MENU

Comprobar y corregir: DECK truncation, hero visual balance, right-side/header spacing, gear/settings safe-area, overlap, clipping, texto cortado, caption tocando borde, overflow accidental, panel gaps, diagonales, z-index, art crops, panel borders, focus state.

No solucionar truncado reduciendo fuente. Primero corregir geometría.

## 5. GEOMETRÍA DE LAS VIÑETAS

0 gaps accidentales, 0 paneles superpuestos, 0 diagonales sin continuidad, 0 seams de 1px por rounding, 0 overflow que corte arte.

Cada viñeta: geometry, clip, content safe area, caption area, art anchor, focus outline, z-index. No contenido importante pegado a diagonales.

## 6. MARCOS

Bordes negros sólidos, cortes diagonales controlados, asimetría, pequeña variación editorial. No border-radius web, sombras flotantes, blur, glass, gradientes SaaS. Bordes compartidos = página compuesta.

## 7. FONDO

Papel/editorial, trama manga, halftone, speed lines, dither, manchas gráficas muy suaves. Extremadamente controlado. No ruido detrás de texto pequeño. Prioridad: 1 hero, 2 navegación, 3 arte, 4 fondo.

## 8. ARTE INTERNO

No object-fit genérico, stretch, perspective sobre pixel art, scale fraccional destructivo. Cada panel con art anchor explícito. Pixel-art nítido, ningún personaje deformado.

## 9. TYPOGRAPHY SYSTEM

Jerarquía compartida: EYEBROW (muy pequeño), PAGE TITLE (principal), PANEL TITLE (acción), PANEL SUBTITLE (contexto), META (progreso/chapter/deck count), HELP (input hints). No tamaños arbitrarios por pantalla. No texto condensado excesivo, tracking excesivo, ALL CAPS en párrafos, subtítulos demasiado pequeños. Espacio razonable para cadenas localizadas.

## 10. ESTADOS INTERACTIVOS

NORMAL, HOVER, FOCUS, PRESSED, SELECTED, DISABLED. HOVER: NO mover layout; puede elevar contraste, cambiar trama, añadir línea cinética, accent, mover arte 1-2 logical px. FOCUS: inequívoco para teclado/gamepad, no solo color. PRESSED: respuesta corta sólida. DISABLED: deliberadamente deshabilitado.

## 11. TRANSICIONES

Solo gramática consistente. SELECT PANEL → accent → resto pierde protagonismo → entrada destino. Story: hero expansion. Battle: split/versus. Characters: character-focused. Cards/Deck: card wipe/fan sencillo. Settings: limpia. No 3D, blur, motion excesivo.

## 12. PÁGINAS INTERNAS — SISTEMA COMÚN

Game Page Chrome compartido: page header, back affordance, title hierarchy, content safe-area, panel vocabulary, focus vocabulary, footer/input hints. VERSUS, CHARACTERS, DECK, CARDS, SETTINGS, STORY, RESULTS. No idénticas, pero del mismo juego.

## 13. VERSUS

Setup de combate. PLAYER / VS / OPPONENT. Luego deck, difficulty (si existe), FIGHT. No formularios web, dropdowns, cards sin jerarquía. Conservar rollers existentes. FIGHT dominante cuando setup válido.

## 14. CHARACTERS

Conservar character roller. No grid genérico. Corregir espacios muertos, proporción selector/info, nombre, forma, stats, arte OW, power-up selected state, navigation arrows, safe areas.

## 15. DECK

Prioridad: deck actual, count, card browser, selection, filters/search, confirm/back. Resolver DECK labels truncados. Count claramente visible (17/20). Estados VALID/INCOMPLETE/INVALID visibles pero no alerts web.

## 16. CARDS

Colección de cartas del juego. Prioridades: card art, name, type, power/cost, compatibility, description. No tabla administrativa. Filtros compactos. Selección: realce visual, detalle asociado, sin reorganizar pantalla.

## 17. SETTINGS

Más funcional pero estética del shell. Filas claras: LANGUAGE, MUSIC, SFX, VOLUME, TEXT SPEED, FULLSCREEN. Solo opciones con comportamiento real. Controles grandes y legibles.

## 18. STORY / CHAPTER SELECT

No tocar contenido, solo UI. Jerarquía: saga, chapter, title, progress, selected, continue/start. Lenguaje manga/comic. No sobrecargar texto.

## 19. RESULTS

Cierre de batalla, no modal React. VICTORY/DEFEAT, fighter art, datos esenciales, REMATCH dominante, MAIN MENU secundario. No estadísticas inexistentes.

## 20. PAGE HEADER ÚNICO

Consolidar: GamePageHeader (Back, Eyebrow, Title, contextual meta, optional action). No altura/border/margin/back distintos por página.

## 21. CSS

No migración total como P0. Primero arreglar visualmente. Luego extraer/consolidar Game Shell: game-shell.css, main-menu.css, game-pages.css. Consolidar .page-header, .menu-content, comic panel, game page layout, focus states. Eliminar solo reglas superseded.

## 22. RESPONSIVE / SCALE

GameViewport gobierna. Misma escena × escala. En extremas: letterbox. No reflow web.

## 23. INPUT

Mouse, keyboard, gamepad (si integrado). D-pad/arrows=mover, A/Enter=seleccionar, B/Esc=volver, LB/RB o Q/E=tabs. Focus graph = composición visual.

## 24. VERIFIER

Crear `npm run verify:game-shell`. Comprobar: rutas conectadas, 0 rutas accidentales, 1 acción por panel, focus graph completo, back correcto, GameViewport intacto, 0 overflow estructural, 0 panel overlap, 0 missing interactive target, 0 duplicate shell action. Proteger estructura, no megasuite visual.

## 25. SMOKE VISUAL OBLIGATORIO

Capturar AFTER de las 8 pantallas. Comprobar: LAYOUT (0 overlap, 0 gaps, 0 arte deformado, 0 overflow clipping, 0 fuera de safe-area), TEXT (0 truncation, 0 overlap, 0 captions tocando marcos, 0 heading roto), INTERACTION (hover estable, focus visible, click target completo, back correcto, keyboard correcto), RENDERING (pixel art nítido, 0 fractional blur, 0 z-index roto, 0 overlay interceptando clicks).

## 26. ORDEN DE EJECUCIÓN

1. Capturas baseline 8 pantallas
2. Inventario corto de defectos reales
3. Corregir Main Menu completo (batch)
4. Screenshot Main Menu
5. Corregir regresiones
6. Establecer Game Page Chrome común
7-13. Corregir Versus, Characters, Deck, Cards, Settings, Story, Results
14. Navegar todo con teclado
15. Navegar todo con mouse
16. Comprobar escalas
17. Typecheck
18. verify:game-shell
19. Build
20. Capturas AFTER

No build tras cada propiedad CSS. Agrupar cambios visuales.

## 27. GATE FINAL

**MAIN MENU:** hero balanceada ✓, Deck no truncado ✓, spacing correcto ✓, gear safe-area ✓, 0 overlap ✓, 0 clipping ✓, jerarquía comic clara ✓

**PAGES:** mismo Game Page Chrome ✓, misma tipografía ✓, mismos márgenes ✓, mismos paneles ✓, mismo focus ✓, back consistente ✓

**ART:** pixel perfect ✓, 0 deformación ✓, 0 blur ✓, crops deliberados ✓

**INPUT:** mouse ✓, keyboard ✓, gamepad si existe ✓

**TECH:** GameViewport intacto ✓, Battle intacto ✓, rutas intactas ✓, typecheck PASS ✓, verify:game-shell PASS ✓, build PASS ✓

**ENTREGA:** Antes/Después por pantalla. Lista de root causes. Archivos tocados. Capturas finales. No declarar terminado porque compile — declarar terminado cuando las ocho pantallas se vean como partes coherentes del mismo juego.