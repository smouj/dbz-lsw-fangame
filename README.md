# DBZ LSW Fangame 🐉

[![verify](https://github.com/smouj/dbz-lsw-fangame/actions/workflows/verify.yml/badge.svg)](https://github.com/smouj/dbz-lsw-fangame/actions/workflows/verify.yml)

Remake web fiel de **Dragon Ball Z: Legendary Super Warriors** (Game Boy Color) — sistema de combate por cartas con sprites auténticos extraídos de la ROM USA (CRC32 `025AA88A`), estilo magazine GBC.

> **Repo privado** · Proyecto de desarrollo en curso · 540+ commits · motor verificado con 70+ suites de checks automatizados (`npm run verify:*`).

---

## ✨ Descripción

DBZ LSW Fangame es un **remake de alta fidelidad** del clásico de GBC: combate por turnos con cartas, 4 posiciones tácticas (aire/tierra × frente/atrás), economía de CC (Combo Count), Stage Attacks con QTE, beams, Gather Power y 48 formas jugables — todo con los **sprites auténticos de la ROM** y el ritmo de combate del original.

La **ROM y la documentación local** (`dbz-lsw-decomp/`) son la fuente de verdad: nada se reinterpreta como juego nuevo.

---

## 🚀 Cómo ejecutar

```bash
npm install
npm run dev          # dev server → http://localhost:5178
npm run build        # build de producción
npm run typecheck    # TypeScript (tsc --noEmit)
```

### ✅ Suites de verificación (CI local)

El proyecto expone **70+ verificadores** (`npm run verify:*`). Los grupos principales:

```bash
npm run verify:profiles       # 42 perfiles firma: toda carta de combate tiene animación propia
npm run audit:sprites         # 48 formas / manifests / beam-ray: integridad + dimensiones físicas
npm run verify:gbc            # invariantes GBC: posiciones, mazo, secuencias canónicas, cobertura

# ROM canon (P0 / P0.1B / P0.4R) — identidad física + corpus + puente estructurado
npm run verify:rom-fighter-identity     # identidad de forma 48/48
npm run verify:rom-physical-corpus      # 552 físicos / 2371 instancias
npm run verify:rom-fx-film-contract     # FX ofensivos 28/28 STATIC_COMPLETE
npm run verify:rom-physical-key-bridge  # puente estructurado profile-specific (16 ✓)
npm run verify:character-frame-map      # F-MAP honesto (22 ✓)
```

Para ver la lista completa: `npm run` y filtrar por `verify:`. Ver `docs/` para las
especificaciones. GitHub Actions ejecuta typecheck + build + un subconjunto de suites
en cada push a `main` (`.github/workflows/verify.yml`).

---

## 🎮 Gameplay canonizado (GBC)

| Sistema | Implementación |
|---|---|
| **Turno** | TURN → 2 EXCHANGES (roles invertidos), orden por SPD efectiva |
| **Posiciones** | 4 tácticas: AIR/GROUND × FRONT/BACK; Beam vulnerable vs AIR, Damage vs GROUND |
| **CC (Combo Count)** | +3 al atacar · +1 por input QTE · +1/+2 al recibir daño · +1 por vulnerabilidad de posición · básicas gratis |
| **Defensa** | El defensor elige ANTES de resolver: BASIC (Defense/Move 2 ejes + empuje) / JOINT / LIMIT |
| **Stage Attack** | QTE con secuencias **canónicas deterministas** (pool fijo, rotación round-robin): 3S=6 variantes A/B, 4/5/6S añaden direcciones |
| **IA enemiga** | Ritmo GBC: ataque regular ×2 → Gather Power → 5 Stage → Beam/Damage → repite |
| **Gather Power** | +4 STR/KI, habilita Limit Deck, convierte Basic 3 Stage → 4 Stage |

**Orquestación**: timeline único con reloj a **59.7275 fps GBC** (acumulador determinista, eventos emitidos en tick exacto). Cinemática de carta: `FIELD → ACTION_SOLO → PROJECTILE/ACTION_DUEL → IMPACT → FIELD_RETURN` con pausas de fase, FX y SFX sincronizados.

---

## 🛠️ Development Studio (interno)

Herramienta de producción embebida: `http://localhost:5178/?dev=1` (+ `#dev/<módulo>`). NO forma parte del flujo público.

- **Dashboard** — contadores reales (48 formas / 24 personajes / 125 cartas / 32 mazos / 42 perfiles)
- **Character Studio** — formas + stats a cualquier nivel (curvas ROM)
- **Card Database** — las 125 cartas con filtros y ficha
- **Sprite Inspector** — frame real con bbox y % de transparencia
- **Position Lab** — 4 posiciones y reglas de MOVE (2 ejes)
- **Story Studio** — mazos de jefes, AI boosts, 2v2 y viñetas
- **Animation Studio** — timeline real (play/step/fps/loop) desde el manifest
- **Battle Lab** — combate instantáneo real (Versus o capítulo de historia)
- **Pixi Seq** — laboratorio determinista `BattleTimeline → Pixi` con matriz visual de proyectiles
- **Validation** — checks de integridad reales · **Research** — fuentes y nivel de verificación

### 🔬 Modos de depuración en combate

| Parámetro | Función |
|---|---|
| `?debugCinematics=1` | Depurador cinematográfico: shot/pose/proyectil + próximo evento. `Space` play/pausa · `←/→` ±1 tick · `Shift+←/→` ±10 · `R` reset |
| `?debugState=1` | Inspector de estado interno + QTE Debugger. `F` congelar · `.` +1 frame · `Shift+.` +10 |
| `?pixiField=1` | Renderer Pixi del campo/acción (evita sprites duplicados con el fallback DOM) |

---

## 🧱 Stack

- **Vite 6 + React 19 + TypeScript** (17.3k líneas TS/TSX)
- **PixiJS** para la presentación cinematográfica del combate
- Sprites/retratos/iconos extraídos de la ROM USA (`dbz-lsw-decomp/`)
- Audio GBC sintetizado con Web Audio API (sin archivos externos)
- Persistencia local: mazos, progreso de historia, idioma (`localStorage`)

## 📁 Estructura

| Ruta | Contenido |
|---|---|
| `src/data/cards.ts` | 125 cartas reales de la ROM (nombres, stats, tipos, compatibilidad verificados) |
| `src/data/roster.ts` | 24 personajes / 48 formas con sheets auténticos + curvas de crecimiento |
| `src/data/spriteManifest.ts` | 48 mapeos forma → sprites de combate animados (ZIP V5 atómico) |
| `src/data/enemy_decks.ts` | Mazos reales de los 32 capítulos + AI boosts + combates 2v2 |
| `src/data/positions.ts` | 4 posiciones tácticas + facing + vulnerabilidades |
| `src/battle/actionProfiles.ts` | 42 perfiles firma por carta: timeline declarativo + resolver |
| `src/battle/stageSequences.ts` | Secuencias canónicas del Stage Attack (pool fijo, rotación determinista) |
| `src/battle/stageInputMap.ts` | Mapeo input del QTE → pose del luchador (A/B/↑/↓/←/→) |
| `src/battle/spriteConfig.ts` | Contrato compartido de poses, fallbacks y metadatos |
| `src/battle/timeline.ts` | Reloj GBC único (59.7275 fps) con seek determinista |
| `src/devtools/` | Development Studio interno (dashboard, labs, validación) |
| `src/renderer/pixi/` | Renderer Pixi: presentación de batalla, proyectiles, actores |
| `scripts/` | Suites de verificación: `verify-action-profiles`, `audit-combat-sprites`, `verify-gbc-canon` |
| `public/assets/` | Sheets, retratos, iconos, fondos, sprites de combate, botones GBC |
| `docs/` | 14+ especificaciones: motor, cartas, HUD, pipeline, fidelidad, gramática |

## 📚 Documentación

| Documento | Contenido |
|---|---|
| `docs/FRAMES_ACTIONS_SPEC.md` | Spec V1: vistas canónicas, naming `[role]_[action]_[variant]_[frame]`, criterio frame-perfect |
| `docs/COMBAT_ACTION_PIPELINE.md` | Pipeline de acciones: perfiles firma → timeline → presentación |
| `docs/BATTLE_ENGINE_SPEC.md` | Especificación del motor de combate |
| `docs/CINEMATIC_GRAMMAR.md` | Gramática de planos y orquestación de la cinemática |
| `docs/SPRITE_TAXONOMY.md` | Taxonomía canónica de sprites |
| `docs/CARD_SYSTEM.md` · `docs/HUD_BUTTONS.md` · `docs/GAMEPLAY_SYSTEM.md` | Cartas, HUD y sistemas |

## 🌍 Idiomas soportados (10)

English · Español · Français · Deutsch · Português · Italiano · 中文 · 日本語 · 한국어 · Русский

Se cambia en **Settings → Language** y se guarda en `localStorage` (`dbzlsw_lang`).

---

## 🗺️ Estado del desarrollo

### ✅ Completado
- Menú principal (7 opciones), Story con 32 capítulos en 4 sagas y viñetas manga
- Battle Mode (Versus) con 24 personajes seleccionables (incl. Vegito)
- **Combate GBC canonizado**: TURN → 2 EXCHANGES, orden por SPD, 4 posiciones, CC real completo, defensa antes de resolver
- **Stage Attacks canónicos**: secuencias predeterminadas (no aleatorias), QTE con poses por tecla, contraataque con ventanas A/B
- **42 perfiles firma** — las 66 cartas de combate tienen animación propia (verify:profiles exige cobertura total)
- Cinemática de acción orquestada por **timeline único** (59.7275 fps GBC): attacker → travel → target → return con FX/CSS sincronizados
- **48 formas** = ROM exacto, todas con 21 poses (idle..power_up) y manifests con dimensiones físicas verificadas
- **ROM canon físico (P0)**: identidad 48/48, corpus físico 552/2371, puente estructurado profile-specific (`rom-p...` content-addressed)
- Cartas de objeto con **aura azul** (fx-item) vs buffs de ki con aura dorada; FX Afterimage con estelas de teletransporte
- Sprites de combate animados con facing por silueta; beams procedurales (sin estiramiento ni duplicados)
- Sheets de personajes byte-idénticos a la ROM (48/48 verificados)
- Mazo persistente (20 cartas), colección, EXP/niveles con curvas ROM
- Audio GBC sintetizado + i18n en 10 idiomas
- **3 suites de verificación** (verify:profiles / audit:sprites / verify:gbc) + typecheck + build
- **Rendimiento**: sprites memoizados (62 FPS en QTE), caché de manifests, timeline sin timers sueltos

### ⏳ Pendiente
- Captura forense de ROM para reemplazar valores HYPOTHESIS (ventanas contraataque A≈0.4s/B≈0.15s, fórmulas BLOCK/AVOID, speed tie) → fidelidad frame-exacta
- Verificación visual del mapeo retratos/iconos (contact sheets)
- Transformaciones animadas (aura + flash + palette swap) — base lista (fx-aura)
- BGM real (GBS 20 pistas → WAV/MP3)
- Más personajes con `battleId` de animación completa (solo goku/vegeta)
- Fondo de batalla/menú con temática Dragon Ball más profesional

## 🔑 localStorage keys

| Key | Uso |
|---|---|
| `dbzlsw_deck` | Mazo de 20 cartas |
| `dbzlsw_story_progress` | Capítulo desbloqueado más alto |
| `dbzlsw_lang` | Idioma seleccionado |
| `dbzlsw_progress` | EXP/niveles por forma |

## ⚖️ Legal

Proyecto **fan remake educativo sin ánimo de lucro**. Dragon Ball Z y sus personajes son © Bird Studio / Shueisha / Toei Animation. Los sprites provienen de ROMs propias y de archivos públicos de referencia (Sprite Database / Spriters Resource) para investigación. El código y las mecánicas son originales; no se distribuye la ROM.
