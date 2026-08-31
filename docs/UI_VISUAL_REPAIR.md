# Revisión visual del juego y Dev Studio — 2026-08-31

Implementación en `codex/ui-visual-polish`, sobre `571ee20`. Primera entrega: `42d8246`, pusheada antes del segundo pulido solicitado.

## Segundo pulido: únicamente fondos

Según la aclaración del usuario, se conservan la composición, tamaños, posiciones y tipografías de los botones, el arte de Continuar y el fondo de puntillismo del menú. Se retiran los dos retratos recortados y se usan viñetas de Story como fondos decorativos, con una mezcla monocroma que mantiene los tonos actuales y un degradado que protege la lectura:

- Battle: Goku contra Vegeta Ozaru, naranja.
- Deck: esferas de Namek, verde.
- Characters: familia y amigos del epílogo, azul.
- Cards: espada Z, violeta.
- Settings: Kame House, crema.

Story, Battle Mode (preparación), Deck, Characters, Cards y Settings comparten el mismo patrón de puntos de 6×6 del menú. Los paneles dejan ver suavemente la textura. No se sustituyen los fondos de las escenas narrativas ni del campo de batalla.

Comprobación de esta segunda entrega: seis botones con posición y tamaño de layout idénticos al primer commit; fondos del menú y Continuar sin cambios; seis interiores sin imágenes faltantes ni desbordamiento horizontal; consola del navegador sin errores. TypeScript, 221 pruebas, contratos de viewport/HUD/Dev y build vuelven a pasar. Se reutilizan cinco PNG ya versionados, sin generar ni duplicar imágenes.

## Tercer pulido: iconos y selección de Battle

- Deck y Cards vuelven a usar el icono Lucide común de 24×24, a 18 px de la esquina superior derecha. No se cambia la geometría, el contenido ni los fondos de los botones.
- Selector de cinco personajes, con identidades estables al desplazarse, nombres completos y una sola marca de selección. Se retiran cajas, brillos y jitter superpuestos. Escalas enteras de los gráficos OW: 2×/3×/4×, sin deformar el actor.
- Entrada de presentación: desplazamiento/asentado de 300 ms, pose de carga durante 240 ms y poder sostenido. El aura se dibuja detrás del personaje. La baldosa OW extraída es una imagen única: el bucle alterna su orientación y opacidad por pasos; no se presenta como una secuencia de fotogramas ni un timing GBC verificados.
- Precarga compartida de imágenes, límite de espera y cancelación de cargas/timers obsoletos al cambiar personaje, forma o salir. Un recurso ausente conserva el idle/pose válido, sin iconos de imagen rota. Movimiento reducido evita entrada y parpadeo del aura.
- Tipografía, contraste y espaciado coherentes en equipo, formas, estadísticas, límites y mazo. La progresión de niveles se puede desplegar; READY permanece fuera del scroll. El selector compartido de Dev Team Builder conserva el mismo comportamiento y presentación.

Validación de esta entrega: TypeScript PASS; 227 pruebas (seis nuevas para secuencia, carga lenta, cancelación, fallos, timeout y movimiento reducido); viewport 27/27; HUD 10/10; rutas Dev 12/12; Dev Studio 58/58; build PASS, incluido un segundo build tras el ajuste de compatibilidad con Dev. Revisión en navegador de iconos, cambios rápidos, vuelta del último al primer personaje, capas y escalas de los sprites, nombres sin recortes, progresión desplegable, mazo sin desbordamientos y READY visible. La preferencia de movimiento reducido del navegador estaba activa; la secuencia temporal normal se verifica con reloj controlado en las pruebas. El motor, la ROM y los recursos gráficos no se modifican.

## Cambios

- Menú de seis paneles con composición de cómic, tipografía legible, progreso real de historia y foco visible. Continuar abre Story. Enter y Espacio activan el botón enfocado; las flechas siguen la disposición visual.
- Superficie de diseño de 1280×720 que se escala uniformemente dentro del viewport 16:9 existente. El modo vertical conserva bandas y la composición del juego. No se modifica el viewport ni el renderer de batalla.
- Cabecera compartida, márgenes, contraste y scroll local en Story, Characters, Deck, Cards y Settings. Seis columnas de cartas con imágenes proporcionadas. Ficha de personaje con barras visibles y acción de combate independiente del scroll.
- Versus mantiene READY visible fuera del taller desplazable. El carrusel amplía los sprites sin deformarlos y solo captura las flechas cuando tiene el foco.
- Starter y escenas de historia usan la misma superficie. Se mantienen los gráficos ROM existentes.
- Dev Studio conserva sus 22 módulos, con barra lateral desplazable en escritorio y navegación desplegable con etiquetas en pantallas estrechas. Workspace evita el solapamiento entre editor y paneles.
- Ajustes funcionales relacionados con la UI: volumen inicial de 70%, velocidad de texto persistente y aplicada, estado real de pantalla completa y salida correcta desde `?dev=1`.
- El inspector de Characters acepta la identidad directa banco/base de los fotogramas Bank $61, cuyo `resourceId` es nulo. Evita la pantalla en blanco sin alterar los datos ni el motor.
- Se elimina la carga duplicada de dos hojas CSS antiguas desde `index.html` y se corrige un comentario CSS mal formado.

## Validación reproducible

Validación de las primeras entregas: TypeScript PASS; Vitest 221/221; `verify:viewport` 27/27; `verify:hud-layout` 10/10; `verify:dev-routes` 12/12; `verify:dev-studio` 58/58; build PASS. Navegador: 70 comprobaciones de shell, 44 visitas Dev y tres tamaños de batalla, sin excepciones JavaScript. `verify:playable-alpha-loop` finaliza con código 0 y 117 intercambios por escenario, pero alcanza el límite de 4000 pasos sin KO; no se utiliza como evidencia de victoria o derrota completas.

Con dependencias y recursos locales disponibles:

```sh
npm run dev -- --host 127.0.0.1
# En otra terminal:
npm run verify:game-shell
npm run typecheck
npm test
npm run build
```

`verify:game-shell` usa Playwright. En Windows utiliza Edge; en otros sistemas, instalar Chromium con `npx playwright install chromium`. También admite `PLAYWRIGHT_CHROMIUM_EXECUTABLE` y `UI_BASE_URL`.

La prueba navega por la SPA real, sin inventar rutas: Starter, seis páginas del menú, Story Scene, entrada a batalla y todos los módulos Dev. Comprueba el layout a 320×180, 640×360, 1280×720, 1920×1080, 2560×1440, 844×390 y 390×844; diez idiomas, teclado, acciones visibles y persistencia de ajustes. Dev se revisa a 1280 y 390 px. La batalla se captura a 1280, 640 y 390 px.

Capturas y resultado: `.tmp/ui-audit/verified/`. Evidencia anterior y posterior: `.tmp/ui-audit/before/` y `.tmp/ui-audit/after/`. Estos archivos permanecen locales e ignorados por Git.

## Recursos y límites

El checkout se preparó en `D:\CodexProjects\dbz-lsw-fangame` por falta de espacio en C:. Se regeneraron localmente los recursos existentes de 48 formas usando la ROM local cuya identidad se verificó. No se distribuye la ROM. Los cambios de metadatos producidos por la regeneración se retiraron del diff de UI; las copias de seguridad están en `.tmp/ui-audit/generated-tracked-backup/`.

Un checkout nuevo necesita los recursos generados habituales del proyecto para las vistas físicas de Dev (`gen:rom-runtime-assets`; véanse los requisitos ROM del repositorio). Los scripts antiguos de verificación que usan sintaxis POSIX requieren una shell compatible; el nuevo `verify:game-shell` funciona también en Windows.

La revisión no certifica todos los fotogramas, cartas o desenlaces del motor. Los pendientes de fidelidad ROM que muestra Dev siguen siendo información real y no se ocultan. La compilación conserva el aviso de bundles grandes; no se eleva el umbral para silenciarlo. La entrega se hace en `origin/codex/ui-visual-polish`, sin fusionar en `main` ni desplegar.
