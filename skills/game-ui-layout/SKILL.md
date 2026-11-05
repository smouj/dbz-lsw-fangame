---
name: "game-ui-layout"
description: "Layout del menú/páginas en el viewport contenedor 16:9 del juego: diagnóstico por métricas DOM y dimensionado cqh sin screenshots."
---

# Game UI Layout (viewport contenedor 16:9)

Diagnosticar y corregir el layout del menú principal y páginas internas del juego (DBZ LSW Fangame) cuando el modelo no puede ver screenshots.

## Cuándo
- El usuario reporta que la UI "se ve mal", desposicionada, mal espaciada, con mala jerarquía.
- Ajustes de CSS de menú/páginas que desbordan, se solapan o se recortan.
- Trabajo visual donde el modelo no soporta imágenes (screenshots inutilizables).

## Pasos

1. **Mide el viewport del JUEGO, no la ventana.** El juego vive en `.game-viewport` (`container-type: size`, container-name `game`), encajado 16:9 con letterbox. Una ventana de 968×974 produce un viewport de juego de 968×545 (top≈215). Los media queries de ventana (`@media (max-height: 560px)`) NO gobiernan este rectángulo — no se disparan y el layout grande desborda.

2. **Diagnostica por métricas DOM** (evaluate con `getBoundingClientRect`): viewport del juego, footer, nav, items, continue-card. Detecta:
   - recorte: `lastItem.bottom > viewport.bottom`
   - solape: `footer.top < lastItem.bottom` o `footer.top` dentro del rango de items
   - Confirmación de unidad: `getComputedStyle(item).minHeight` y `cqhTest` (elemento con `height:10cqh` → 10cqh ≈ 10% del alto del contenedor).

3. **Dimensiona verticalmente con `cqh`** (1cqh = 1% del alto del viewport del juego), nunca con vh ni con media queries de ventana. Aplica al final del CSS (CASCADE LOCK): `min-height: clamp(30px, 6.6cqh, 52px)`, gaps en cqh, logo/footer/continue-card en cqh. Verifica en browser que el computed style resuelve contra el contenedor (p.ej. 5.4cqh → ≈29px en viewport de 545px, no ≈52px de la ventana de 974px).

4. **Refuerza contra desborde residual**: `.menu-nav { overflow-y: auto; min-height: 0; flex: 0 1 auto; }` y `.menu-content { overflow: hidden; }` para ventanas muy bajas.

5. **Verifica antes de afirmar**: re-mide y confirma `lastItem.bottom <= viewport.bottom` y `footer.bottom <= viewport.bottom` sin solapes. Solo entonces el layout está corregido.

## Trampas
- Un `cqhTest` colgado de `document.body` resuelve contra la ventana (974px), no contra el contenedor — prueba dentro de `.menu-content` o lee el computed style de un elemento real del menú.
- Los items pueden medir 44px aunque `min-height` sea menor: el contenido (grid + padding + line-height) fuerza la altura — revisa padding/gaps antes de subir min-height.
- No uses `!important` sobre el bloque CASCADE LOCK salvo que la regla anterior sea también `!important`.

## Validación visual (screenshots + modelo de visión)

Cuando el usuario adjunta marcados que el modelo no puede ver, o el problema es composición/estética, valida con capturas propias analizadas por un modelo con visión (p.ej. `view_image` con `xai/grok-4.3`):

1. **Recorta el screenshot al viewport del juego antes de analizar.** El screenshot del browser tool captura TODA la ventana (p.ej. 800×457) con el juego centrado en letterbox — el modelo ve barras negras y "espacio muerto" que no existen en el juego. Recorta a 16:9 con PIL: `crop = im.crop((0, top, w, top + int(w*9/16)))` con `top = (h - vh)//2`. Sin recorte, el análisis mezcla letterbox con layout real.
2. **Ante "sprites duplicados/fantasma", verifica primero el arte fuente.** Abre el PNG del fondo (p.ej. `public/menu-art-desktop.png`) con el modelo de visión y pregunta cuántas veces aparece cada personaje. Si el arte NO tiene duplicados, el efecto fantasma es el arte transparentándose bajo un panel semi-transparente (el mismo personaje se ve en su posición real Y a través del degradado) — se corrige la OPACIDAD del panel (`.menu-bg` degradado izquierdo ~.97 hasta ~40%, `.menu-screen::before` reforzado), nunca el arte. Confirmar con DOM: contar `img.src` duplicados en la página.
3. **Scope: cuando el usuario marca "las páginas del menú", trabaja solo en el menú principal y sus páginas** (story/characters/deck/cards/settings). No entres al HUD de batalla ni al TeamSetup salvo que lo pida explícitamente — el usuario corrigió esto dos veces en una sesión.
4. **No confundas un dot de navegación activo con un sprite duplicado.** Tras convertir un rail de thumbnails en dots, el modelo de visión puede reportar el dot resaltado como "sprite repetido" — el DOM manda: cuenta `img` reales y duplicados de `src`.

5. **Fallback sin visión y sin browser tool: sonda Playwright contra el dev server.** Cuando el browser tool no alcanza el dev server (navegación bloqueada por política/sandbox) y no hay modelo de visión disponible, valida con un script node + playwright contra `http://127.0.0.1:5178/` desde el workspace: `chromium.launch` con `executablePath` del chromium cacheado (`~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome`), viewport 1280×720, recolecta `pageerror`/console errors y dumpea métricas `getBoundingClientRect` de los selectores objetivo (p.ej. `shell-brand`, `starter-bg`, `.setting-row`). Trampas: `waitUntil: 'networkidle'` y `'load'` agotan el timeout en Vite (websocket HMR + assets grandes) — usa `domcontentloaded` + `waitForSelector` explícito. `verify:game-shell` requiere dev server arriba + `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, y su primera corrida justo tras arrancar Vite puede dar flake (timeout esperando `.page-header` en la primera pantalla por compilación en frío) — reintenta una vez antes de investigar.
6. **Las reglas de DATOS por personaje se validan con unit verifies, no clicando el roll.** El CharacterRoll del setup solo renderiza una ventana de items — no se puede clicar un personaje arbitrario (p.ej. Android 19) para inspeccionar sus slots. Si el cambio es una regla de datos (capacidad, compatibilidad, loadout), valida con el unit verify que la fija (`npm run verify:loadout` imprime el mapa capacidad por personaje y falla si la regla se rompe); la sonda DOM queda para métricas de layout (posiciones, tamaños, overflow).

## Auditar TODAS las páginas del menú con una sonda (flujo de arranque)

Para un barrido completo (menú + sus 6 páginas, varios viewports) la sonda debe superar el arranque real de la app:

1. **El juego NO abre en el menú para perfiles nuevos**: arranca en la StarterScreen ("CHOOSE STARTER DECK") y luego una pantalla de perfil/historia. En una sonda con contexto limpio, siembra progreso ANTES del goto: `context.addInitScript(() => localStorage.setItem('dbzlsw_unlocks', JSON.stringify({ starterDeck: 'damage', characters: ['goku_base'], cards: [] })))` — con eso salta el starter. Un perfil con progreso (browser tool con datos) abre directo en el menú.
2. **Detecta el menú principal por presencia de `nav[aria-label="Main menu"]`, NUNCA por heurística de texto.** Trampa real: el texto hoja "CONTINUE" vive DENTRO del item 01 STORY del menú — clicarlo navega a la pantalla de historia y parece un boot fallido (la sonda "se queda atascada" sin estarlo). Mismo cuidado con cualquier leaf del menú: clica los BOTONES del nav, no hojas de texto.
3. **Camina las páginas** clicando los botones de `nav[aria-label="Main menu"]` por texto (STORY/BATTLE/DECK/CHARACTERS/CARDS/SETTINGS); tras medir, vuelve con el control de back (aria-label/title back|menu, `✕/←/‹`, Escape) y si no hay, `goto('/')` + rebotar con el seed.
4. **Screenshot recortado directo**: en vez de recortar con PIL después, usa `page.screenshot({ clip: rectDel('.game-viewport') })` (x/y/w/h del rect) — sale ya recortado al viewport del juego.
5. **Métricas por página** (además de las del paso 2): elementos cuyo rect sale del rect del juego (ignorando fixed/full-window layers y scroll interno: `scrollHeight > clientHeight` con el contenedor dentro del viewport es scroll legítimo, no recorte), alturas de fila uniformes por grupo, `img.src` duplicadas y errores de consola. Guarda métricas JSON + PNGs por página en `.tmp/audit-*/`.
6. **Duplicados de `img` NO son bug automático**: el DECK muestra copias legítimas (el mazo lleva cartas repetidas: 3× Cont.Punch…); en Story/Characters decide por diseño (filas bloqueadas con retrato oculto, preview del seleccionado en el panel de detalle) — marca "verificar", no "bug". El modelo de visión no distingue estas capas: el DOM manda.
