# DBZ LSW Fangame

Remake web fiel de *Dragon Ball Z: Legendary Super Warriors* (GBC) — sistema de combate por cartas, sprites auténticos extraídos de la ROM USA (CRC32 `025AA88A`), estilo magazine GBC.

**Repo privado** · Proyecto de desarrollo en curso.

## 🚀 Cómo ejecutar

```bash
npm install
npm run dev        # dev server en http://localhost:5178
npm run build      # build de producción
npm run typecheck  # chequeo de tipos TypeScript
```

### 🛠️ Development Studio (interno)

Herramienta de producción embebida en el mismo proyecto. Accede desde el navegador con la URL `http://localhost:5178/#dev` (o `?dev=1`). NO forma parte del flujo público.

- **Dashboard** — contadores reales (48 formas / 24 personajes / 125 cartas / 32 mazos)
- **Character Studio** — formas + stats a cualquier nivel (curvas ROM)
- **Card Database** — las 125 cartas con filtros y ficha
- **Sprite Inspector** — frame real con bbox y % de transparencia
- **Position Lab** — las 4 posiciones y reglas de MOVE (2 ejes)
- **Story Studio** — mazos de jefes, AI boosts, 2v2 y viñetas
- **Animation Studio** — timeline real (play/step/fps/loop) desde el manifest
- **Battle Lab** — combate instantáneo real (Versus o capítulo de historia)
- **Validation** — 11 chequeos de integridad · **Research** — fuentes y nivel de verificación

### 🔬 Modos de depuración en combate

Parámetros de URL que activan overlays de diagnóstico (solo desarrollo):

- `?debugCinematics=1` — depurador cinematográfico: `ACTION/SHOT/TICK` + pose del
  atacante/defensor + proyectil + próximo evento. Teclas: `Space` play/pausa ·
  `←/→` ±1 tick · `Shift+←/→` ±10 · `R` reiniciar.
- `?debugState=1` — Inspector de estado interno (fase, CC, posiciones, stages,
  POWER/GATHER/etc.) + QTE Debugger. Teclas: `F` congelar/descongelar el reloj del
  Stage Attack · `.` +1 frame · `Shift+.` +10 frames.

## 🧱 Stack

- **Vite 6 + React 19 + TypeScript**
- Sprites/retratos/iconos extraídos de la ROM (ver `dbz-lsw-decomp/`)
- Audio GBC sintetizado con Web Audio API (sin archivos externos)
- Persistencia local: mazos, progreso de historia e idioma

## 📁 Estructura

| Ruta | Contenido |
|---|---|
| `src/data/cards.ts` | 125 cartas reales de la ROM (nombres, stats, tipos, compatibilidad verificados) |
| `src/data/roster.ts` | 24 personajes / 48 formas con sheets auténticos + curvas de crecimiento |
| `src/data/spriteManifest.ts` | 48 mapeos forma → sprites de combate animados (ZIP V5 atómico) |
| `src/data/enemy_decks.ts` | Mazos reales de los 32 capítulos + AI boosts + combates 2v2 |
| `src/data/positions.ts` | 4 posiciones tácticas (aire/tierra × frente/atrás) + facing |
| `src/devtools/` | Development Studio interno (acceso `#dev`): dashboard, characters, cards, sprites, positions, story, validation, research |
| `src/data/icons.ts` | Mapeo iconos de carta + retratos de menú/mini |
| `src/i18n/` | Traducciones (10 idiomas) + contexto de idioma |
| `src/audio/sfx.ts` | SFX sintetizados estilo chip GBC |
| `public/assets/` | Sheets, retratos, iconos, fondos, sprites de combate, botones GBC |
| `docs/` | Spec del motor, cartas, HUD, fidelidad de acciones, walkthrough |

## 🌍 Idiomas soportados (10)

English · Español · Français · Deutsch · Português · Italiano · 中文 · 日本語 · 한국어 · Русский

El idioma se cambia en **Settings → Language** y se guarda en `localStorage` (`dbzlsw_lang`).

## 🗺️ Estado del desarrollo

### ✅ Completado
- Menú principal (7 opciones), Story con 32 capítulos en 4 sagas y viñetas manga
- Battle Mode (Versus) con 24 personajes seleccionables (incl. Vegito)
- Combate por turnos GBC: TURN → 2 EXCHANGES, orden por SPD, 4 posiciones tácticas,
  comandos LIMIT/J/B/C, CC real (+3 al atacar, +1 por input QTE, +1/+2 por daño)
- **Orden de defensa GBC**: el defensor elige su defensa ANTES de la animación del ataque
- Cinemática de acción de 4 pasos (attacker → travel → target → return) con tiempos
  alineados a las animaciones CSS (sin cortes)
- 125 cartas reales de la ROM con **compatibilidad por personaje** aplicada en combate
  (mano, robo e IA filtran por el luchador activo)
- **48 formas** = ROM exacto (Gohan Super2, Trunks Ksuper, Piccolo Evil añadidos;
  frieza_100 duplicado eliminado); Vegito en CHARACTERS
- Sprites de combate animados (43+ dirs V5 atómicos con manifest.json) + facing por silueta
- Botones del HUD con **sprites GBC auténticos** (nombre incluido) + tooltips en portal
- Estados de batalla visibles en el HUD (chips buff/debuff/guard/power)
- Sheets de personajes byte-idénticos a la ROM (48/48 verificados)
- Mazo persistente (20 cartas, solo genéricas por defecto para 20/20 usables), colección
- EXP/niveles con curvas de crecimiento por forma (persistencia `dbzlsw_progress`)
- Audio GBC sintetizado + settings de volumen/SFX
- i18n completo en 10 idiomas con selector en Settings
- Repo GitHub privado creado (main, pushes regulares)
- **Development Studio** interno (`#dev`): dashboard de producción, character/card/sprites
  inspectors, position lab, story studio, validación e investigación

### ⏳ Pendiente
- Captura forense de ROM para reemplazar valores HYPOTHESIS (STAGE_TIMING_TABLE,
  recovery frames, probabilidades Guard, fórmulas de daño, speed tie)
- Verificación visual del mapeo retratos/iconos (contact sheets)
- Transformaciones animadas (aura + flash + palette swap) — base lista (fx-aura)
- Pantalla de resultado de expedición pulida y repaso final del modo historia
- BGM real (GBS 20 pistas → WAV/MP3)
- Más personajes con animación completa (solo goku/vegeta con `battleId`)
- Fondo de batalla/menú más profesional con temática Dragon Ball
- Verificación visual del estilo magazine por el usuario

## 🔑 localStorage keys

| Key | Uso |
|---|---|
| `dbzlsw_deck` | Mazo de 20 cartas |
| `dbzlsw_story_progress` | Capítulo desbloqueado más alto |
| `dbzlsw_lang` | Idioma seleccionado |

## ⚖️ Legal

Este proyecto es un **fan remake educativo sin ánimo de lucro**. Dragon Ball Z y sus personajes son © Bird Studio / Shueisha / Toei Animation. Los sprites provienen de ROMs propias y de archivos públicos de referencia (Sprite Database / Spriters Resource) para investigación. El código y las mecánicas son originales; no se distribuye la ROM.
