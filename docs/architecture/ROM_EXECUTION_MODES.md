# Modos de ejecución ROM — frontera explícita

Estado de cada modo: **verificado contra el repo**. Fecha: 2026-09-13.

Este documento existe para que nadie confunda tres cosas que hoy se confunden
con facilidad:

```text
"tenemos tooling ROM"   ≠   "la aplicación ejecuta una ROM"
```

---

## A. ROM RESEARCH TOOLING — **EXISTE, fuera del producto**

```text
tools/rom-trace/
  rom-driver(.c)     → driver headless sobre libmgba
  r31a/*.ss0         → savestates de referencia
```

Uso:

- investigación y reverse engineering
- traces por frame (`trace`), capturas (`shot` → PNG 160×144)
- lectura de RAM (WRAM/OAM/VRAM/registros)
- evidencia y fixtures (films, ladders, matrices)
- generación de corpus

**NO forma parte del producto final.** No se importa desde `src/` ni se empaqueta
en el bundle Tauri. `verify:desktop-offline` lo comprueba.

Herramientas asociadas: `libmgba`, Node/native tooling, `python3` (análisis).

---

## B. REMAKE RUNTIME — **EXISTE, es el producto actual**

```text
Tauri v2
  React
  Pixi
  BattleRuntime / BattleEngine
  Presentation
```

Es la aplicación que el jugador instala y ejecuta. **No ejecuta una ROM**: la
batalla la resuelve nuestro motor, alimentado por los datos y las constantes
extraídos de la ROM y verificados (ventanas Stage, power window, posiciones…).

---

## C. FUTURE EMBEDDED ROM MODE — **DISEÑO APROBADO, SIN EMBEBER**

```text
Tauri
  ↓
core GBC embebido
  ↓
ejecución de la ROM
  ↓
framebuffer + estado de memoria
  ↓
decodeRomFeed
  ↓
Pixi / frontend moderno
```

Estado:

```text
DESIGN APPROVED
IMPLEMENTATION NOT YET EMBEDDED
```

Lo que **ya existe** de esta cadena es la mitad superior, en tooling:

| Pieza | Estado |
| --- | --- |
| `decodeRomFeed` (WRAM/OAM → `NormalizedBattleFeed`) | ✅ implementado y verificado |
| `feedToScene` / `romModePixiLayout` / `romModePixiAdapter` | ✅ implementado y verificado |
| Barrido de las 5 familias sobre capturas reales | ✅ |
| Core GBC **embebido en la app** | ❌ pendiente |

Reparto acordado (tras medirlo — reconstruir el PPU dio 14.4% de coincidencia):

| Capa | Fuente |
| --- | --- |
| **Vídeo** (píxeles) | framebuffer del core — exacto por construcción |
| **Semántica** (posiciones, estados) | nuestro `decodeRomFeed` |

> No se reimplementa el PPU: el core ya renderiza la ROM perfectamente.

Decisión de core (SameBoy vs libmgba) **aún no tomada**; se evaluará por
integración Tauri/Rust, acceso a WRAM/VRAM/OAM, save states, licencia, tamaño y
build de Windows. El tooling actual usa libmgba, lo que **no obliga** a que el
core embebido sea el mismo.
