# Auditoría visual — Menú principal y sus páginas (2026-09-05)

**Alcance**: Main menu + Story (select), Versus/Battle (team setup), Deck, Cards, Characters, Settings.
**Estado auditado**: build de producción `dist/` servido en :5178 — HEAD `251eee81` (incluye el pase visual de menú del desktop).
**Método**: sonda Playwright (`.tmp/audit-menu3.mjs`) — métricas DOM por página (recortes vs `.game-viewport`, scroll interno, alturas de fila, `img` duplicadas, errores de consola) a 1280×720 y 800×600 + screenshots recortados al viewport 16:9 analizados con visión.
**Evidencia cruda**: `.tmp/audit-main-menu/` (PNGs por página/tamaño + metrics-v3.json).

## ✅ Positivo (verificado)
- **0 errores de consola** en las 7 páginas × 2 tamaños (pageerror + console.error vacíos).
- Todas las páginas con indicador consistente `ESC · BACK`.
- Deck/Cards: cuadrículas sin cortes en el pliegue visible; filtros alineados; cartas "unknown" bien diseñadas (negro + "NOT OBTAINED").
- Characters: celdas bloqueadas claras (candado); panel de detalle con sprites diferenciados.
- Accesible names del nav principal correctos (aria snapshot: cada item con su nombre completo).

---

# TODO

## P0 — Bugs de layout confirmados (DOM + visión)

### 1. Versus/BATTLE — rail de selección de luchador se sale por el borde derecho
- **Evidencia DOM**: `button.setup-roll-item` R=1284 > viewport 1280 (y R=803 > 800 en pequeño). **Visión**: sprite de Krillin recortado por el borde derecho + texto truncado ("Krill"), chevron `>` pegado al borde.
- **Causa probable**: contenedor del roll sin contención horizontal (overflow visible) o padding-right insuficiente; el item "peek" de scroll mal calculado.
- **Dónde**: `src/components/setup/setup-polish.css` (setup-roll/rail) — también referencia en `game-pages.css`/`styles.css`.
- **Cómo lo haría**: medir `rail.scrollWidth/clientWidth` y el último item; aplicar `overflow-x` contenido + `scroll-padding-right` o redimensionar el item en cqh para que el último + chevron queden dentro del viewport del juego. Verificar: R(item último) ≤ R(viewport).

### 2. Versus/BATTLE — caja inferior izquierda (team summary LIMITS/DECK) tocando el borde inferior
- **Evidencia visión**: la caja "Gohan Kid – Kid · LIMITS 1/3 · DECK 20/20" aparece cortada por el borde inferior; línea amarilla horizontal que parece contenedor mal cerrado.
- **Nota honesta**: el DOM no la marcó como overflow en 1280×720 (bottom ≤ 720) → clasificar como "verificar en la corrección": si el borde amarillo coincide con el borde del viewport es intención de panel; si corta texto/padding, falta margen inferior.
- **Dónde**: estilos del setup (`setup-polish.css`) — clases del bloque de equipo (`team-summary/loadout`).

### 3. Versus/BATTLE — borde amarillo de ASSIGNED DECK corta la última carta visible a la derecha
- **Evidencia visión**: recorte leve de la última carta contra el borde amarillo del panel.
- **Dónde**: `setup-polish.css` (assigned deck). Verificar con DOM antes de tocar (posible hermano del #1).

## P1 — Pulido visual (visión; requiere confirmación DOM previa, skill anti-ruido)

### 4. Main — la franja de SETTINGS rompe el ritmo del grid 2×2
- La tarjeta 06 ocupa una barra inferior de ancho completo bajo las tarjetas 03/05 con fondo más claro: se percibe "pegada". Decidir si es footer intencional (entonces unificar gap/borde con la columna del grid) o debe integrarse al grid.
- **Dónde**: layout del main (`page-layout-system.css` / `styles.css`, `.menu-*`).

### 5. Main — borde amarillo grueso del panel STORY inconsistente en su esquina inferior derecha (encuentro con CONTINUE).
- **Dónde**: estilos de la card STORY/CONTINUE (main). Revisar radio/borde compartido.

### 6. Main — chevrons `>` de las minicards DECK/CARDS desalineados 1-2px respecto al texto.
- Confirmar por DOM (misma línea base) antes de tocar; ajuste de alineación flex.

### 7. Settings — botones de idioma con anchos desiguales (Español/Português/Русский más anchos).
- **Dónde**: grid de idiomas (`page-layout-system.css` / `styles.css`). Fijar columnas uniformes (grid `1fr` o `min-width` + `text-overflow`).

### 8. Settings — slider de BGM VOLUME desproporcionado en ancho frente al resto de filas.
- Acotar el ancho del slider o alinear el valor a la derecha como los toggles.

## P2 — Verificaciones pendientes (no confirmar como bug sin mirar arte/DOM)

### 9. Story — `img` repetidas: piccolo_base_ow ×3 y young_gohan_base_ow ×3 en el listado de capítulos
- DOM: 6 `<img>` con esos src. Visión: solo la fila 1 muestra retratos (Training); filas 2-3 bloqueadas con candado.
- **Qué verificar**: si cada fila (incluidas bloqueadas) renderiza 2 retratos (rival/entorno) ocultos tras el candado → limpiar (no cargar/ocultar imgs de filas bloqueadas) y decidir si mostrar el retrato del rival ANTES de desbloquear es spoiler deseado. Si las 3 filas usan Piccolo/Gohan como "default", revisar semántica.

### 10. Characters — gohan_young.png ×2 (celda del grid + "BATTLE PORTRAIT" del panel de detalle)
- Patrón de selección (preview del seleccionado) probablemente intencional → confirmar criterio anti-duplicación del proyecto (se aplica a contenido duplicado sin causa, no a preview de selección).

### 11. Story — gran espacio negro vertical antes del encabezado "SAIYAN ROUTE"
- Con solo 3 capítulos la lista queda corta; decidir si rellenar/centrar o es aceptable.

### 12. Cards — scroll de la cuadrícula (4398px) sin affordance visible
- No hay scrollbar ni pista; verificar que rueda/teclado funcionan y valorar un degradado/hint de scroll o paginación visible.

## P3 — Mejoras de UX/consistencia (propuestas, no bugs)

### 13. Flujo de primer arranque (perfil nuevo)
- StarterScreen ("CHOOSE STARTER DECK"): los paneles son clicables pero sin affordance de botón/foco/teclado evidente; después hay una pantalla intermedia de perfil/historia antes del menú. Revisar foco + teclado (flechas/Enter) y claridad de los 2 pasos.

### 14. Consistencia de estados bloqueados
- Story usa candado + "Not unlocked yet"; Characters usa candado sin texto; Cards usa "NOT OBTAINED". Unificar lenguaje visual de "bloqueado" entre páginas (decisión de diseño, no bug).

### 15. A11y
- El nav principal tiene buenos accessible names; extender la revisión a los roll items del setup, toggles de settings y grid de idiomas (roles/estados).

---

## Orden de ejecución recomendado
1. **#1-#3** (Versus/BATTLE, bugs reales) con verificación DOM `bottom ≤ viewport` y `R ≤ viewport` → `verify:ci`.
2. **#4-#8** pulido (confirmar cada uno por DOM antes de tocar CSS — máximo 1-2 reales por página, el resto ruido del modelo).
3. **#9-#12** verificaciones (DOM/arte) y decidir.
4. **#13-#15** mejoras si el usuario las aprueba.

Regla del proyecto: corregir por causa raíz (contención/scroll-padding, no parches), respetar CASCADE LOCK/orden de carga CSS (styles.css gana a page-layout-system.css a igual especificidad), dimensionar en cqh dentro del viewport del juego, y cerrar cada fix con `verify:ci` EXIT 0.
