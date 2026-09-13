# Desktop Offline — Smoke de release

Estado: **CONTRATO** (no se ejecuta en cada commit; sí antes de releases).
Fecha: 2026-09-13.

El objetivo es una sola pregunta: **¿el instalador arranca y se juega sin nada
más funcionando?** Vale más que veinte comprobaciones unitarias.

---

## Preparación

```bash
npm run desktop:build
```

Eso ejecuta `verify:release-content && tauri build --bundles nsis` y produce un
instalador NSIS (`src-tauri/target/release/bundle/nsis/*.exe`).

---

## Procedimiento (OFFLINE DESKTOP GOLDEN SMOKE)

Antes de abrir la aplicación, **apagar todo lo que no sea el producto**:

```text
1.  cerrar Vite            (npm run dev)
2.  cerrar Node / terminales de desarrollo
3.  cerrar mGBA
4.  desconectar Internet
```

Después, sobre la aplicación **instalada**:

```text
5.  instalar el .exe (NSIS)
6.  abrir la aplicación
7.  Main Menu
8.  Characters
9.  Cards / Deck
10. Battle Setup
11. jugar una batalla (hasta Results)
12. Results
13. Rematch
14. Settings
15. cerrar la aplicación
16. volver a abrirla  → debe arrancar igual
```

**Criterio de paso**: los 16 puntos funcionan con Internet desconectado, sin
Vite, sin Node y sin mGBA instalado por el jugador.

---

## Qué se está probando de verdad

| Punto | Contrato que valida |
| --- | --- |
| 4 + 6 | el producto **no** requiere Internet |
| 1–3 + 6 | el producto **no** requiere el servidor de desarrollo ni herramientas |
| 11–12 | la batalla la resuelve nuestro motor (no una ROM, no un emulador) |
| 16 | los saves/ajustes persisten entre ejecuciones |

---

## Lo que este smoke NO prueba (y no debe confundirse)

```text
Browser dev        ≠  Desktop release
ROM trace          ≠  Embedded ROM Mode
```

- Que funcione en el navegador **no** lo sustituye.
- El ROM Mode embebido **no** existe todavía (`ROM_EXECUTION_MODES.md`, modo C);
  hoy la app no ejecuta ninguna ROM.

---

## Automatización existente

| Qué | Dónde |
| --- | --- |
| Contrato arquitectónico (offline, Tauri, NSIS, sin red externa) | `npm run verify:desktop-offline` (en `verify:ci`) |
| Contenido del release | `npm run verify:release-content` |
| Build + publicación del instalador | `.github/workflows/release-desktop.yml` (tag `v*`, Windows, NSIS, draft) |

La parte que **sigue siendo manual** es el recorrido de los 16 puntos sobre el
instalador real: no se automatiza aquí, pero debe hacerse antes de cada release
importante.
