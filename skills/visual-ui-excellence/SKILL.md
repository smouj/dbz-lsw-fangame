---
name: "visual-ui-excellence"
description: "UI se ve mal, arregla diseño/jerarquía/posicionamiento: estándar visual del proyecto (fidelidad GBC, anti-duplicados) con diagnóstico DOM+visión."
---

# Visual UI Excellence (DBZ LSW)

Estándar de calidad visual y frontend del remake: la UI debe verse diseñada por una persona con intención — fiel al GBC, jerárquica, sin elementos flotantes, cortados o duplicados sin causa. Es la skill hermana de `game-ui-layout` (esa diagnostica dimensiones en cqh; esta gobierna el criterio de diseño).

## Cuándo
- "Se ve mal", "arregla la UI", "mejora el diseño/visual", "la página parece un mock".
- El usuario marca regiones grandes o páginas completas en screenshots.
- Crear o rediseñar cualquier pantalla/componente del juego.
- Revisar jerarquía, posicionamiento, espaciado o duplicación de elementos.

## Principios (no negociables)

1. **Fidelidad GBC > decoración moderna.** Marcos fuertes, bloques, pixel art ROM. Nada de glassmorphism, sombras difusas grandes ni gradientes decorativos sin propósito.
2. **Jerarquía por tamaño y contraste**, no por color chillón. Título → panel → lista → footer. Si dos elementos compiten, uno está mal.
3. **Nada flota.** Todo elemento ancla a algo: rejilla, borde, alineación con su grupo. Un elemento "suelto" es un bug de diseño.
4. **Un elemento de contenido = una aparición por contexto.** Si un personaje/sprite se ve 2 veces en la misma pantalla, es bug de composición (transparencia o duplicación) hasta demostrar lo contrario.
5. **Posicionamiento con lógica.** Agrupar por función, espaciar por relación (lo relacionado más cerca), alinear a rejilla. Pregunta por cada elemento: ¿por qué está aquí y no en otro sitio?
6. **Scope del usuario manda.** Si dice "las páginas del menú", trabaja solo en menú + sus páginas (story/characters/deck/cards/settings). No entres al HUD de batalla ni TeamSetup sin que lo pida.

## Pasos

1. **Mide el DOM antes de opinar.** `getBoundingClientRect` del viewport del juego (`.game-viewport`, 16:9, NO la ventana) y de cada bloque. Reglas: `bottom <= viewport.bottom` (nada recortado), sin solapes entre bloques adyacentes, misma columna/gap para elementos del mismo grupo.
2. **Ante "sprites duplicados/fantasma", verifica el arte fuente primero.** Abre el PNG (p.ej. `public/menu-art-desktop.png`) con un modelo de visión y cuenta apariciones. Si el arte NO tiene duplicados, el fantasma es el arte transparentándose bajo un panel semi-transparente → corrige la OPACIDAD del panel (degradado izquierdo ~.97 hasta ~40%), nunca el arte. Confirma con DOM: contar `img.src` duplicados.
3. **Captura y recorta al viewport antes de validar.** El screenshot del browser captura toda la ventana con letterbox. Recorta a 16:9 con PIL (`top=(h-int(w*9/16))//2`) y analiza con un modelo de visión. Sin recorte, el análisis mezcla letterbox con layout real.
4. **Corrige por causa raíz, no por parche.** Transparencia → opacidad. Recorte → dimensionar en cqh (ver `game-ui-layout`). Solape → reordenar/posicionar. Redundancia → eliminar la copia (p.ej. rail con thumbnails duplicando el carousel → dots de navegación puros).
5. **Verifica antes de afirmar.** Re-mide (bottom ≤ viewport, 0 solapes, 0 duplicados de src), re-captura recortada y pide veredicto al modelo de visión. Solo "LISTO" + `verify:ci` exit 0 = hecho.

## Trampas

- El modelo de visión confunde el dot de navegación activo (6px naranja) con un sprite duplicado — el DOM manda: cuenta `img` reales.
- Los personajes del arte tocan el borde de la ilustración fuente (diseño del PNG, no bug). Fúndelos con una viñeta (`.menu-bg::after` degradado derecho) en vez de "arreglar" el arte.
- Los media queries de ventana (`@media max-height`) NO gobiernan el viewport del juego encajado 16:9.
- No uses `!important` sobre el bloque CASCADE LOCK salvo que la regla anterior también lo sea.
- Un elemento que "cabe" por 1-2px no está bien: el contenedor scrolleable necesita `scroll-padding-bottom` para que el contenido no quede oculto tras barras sticky.

## Criterio de done

- Todo `bottom <= viewport.bottom`, 0 solapes, 0 `img.src` duplicados en pantallas de selección.
- Veredicto del modelo de visión sobre screenshot recortado: LISTO.
- `verify:ci` exit 0 y worktree limpio, con commit en main.
