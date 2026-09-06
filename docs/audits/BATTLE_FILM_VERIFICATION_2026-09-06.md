# BATTLE FILM — VERIFICACIÓN VISIBLE EN BROWSER REAL · 2026-09-06

> Diagnóstico (sin fixes, sin commits). Rama `main`, HEAD `62001cc1` (== origin).
> Re-verificación del frente de presentación tras la integración desktop `55d5c6f1..62001cc1`
> (RomPresentationPlayer con reloj del BattleRuntime · STANDARD_DAMAGE con completion ownership
> ROM declarado · Stage continúa desde el timeline del runtime). El informe previo
> `BATTLE_VISUAL_FIDELITY_DIAGNOSIS_2026-09-05.md` (HEAD 251eee81) queda obsoleto como ground
> truth; este slice lo sustituye con evidencia nueva EN BROWSER.
>
> Evidencia cruda: `.openclaw/tmp/battle-film-audit-20260906/` (898 PNG por beat + 13 JSONL
> con 5.173 samples + `movies-summary.json` + `fine-segments.json` + `summary.json`).
> CERO cambios en `src/`; `git status --short` solo muestra este informe (ver §9).

---

## 1. Método y cómo reproducir

1. Servir el build: `npm run build` (dist HEAD 62001cc1) y `node scripts/serve.mjs` en `:5178`.
   RAM ~4.8G: nada en paralelo; verifies solo secuenciales.
2. Chromium headless de `~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`
   (viewport 1280×720) vía el probe `probe-film.mjs dom|rom [run]` de
   `.openclaw/tmp/battle-film-audit-20260906/` (reutiliza y extiende los probes del slice previo).
3. Seed de localStorage con la clave REAL `'***'` (UNLOCK_KEY literal,
   `src/data/unlocks.ts`) + `dbzlsw_unlocks` + `dbzlsw_story_progress='1'`
   `{starterDeck:'damage', characters:['gohan_kid','piccolo'], cards:[1,2,3,5,6,7,8,11,29,41,43,88,97,117,119,121,124,125], pendingReward:null}`.
4. URL `?debugCinematics=1&debugState=1` (+ `&pixiField=1` para la ruta ROM).
5. Navegación: `nav[aria-label="Main menu"]` → STORY → `.cdp-start` → loop de viñetas
   (`.story-scene-screen`, ~18 paneles) hasta `.battle-screen`. **HEAD marca el intro con las
   clases `intro-active`/`presentation-locked` en `.battle-screen`** (ya no `.battle-intro`):
   hay que esperar a que monten los controles (`.command-strip .cmd-j`, overlay, discard,
   defense o stage-hud). El HUD inferior (commit 66b6baf4/82dea99b) monta async ~2 s tras el
   intro; los selectores `.cmd-j/.cmd-b` del command strip siguen siendo válidos.
6. Partidas reales jugadas (RNG seed 4242 → determinista por run): round-robin de acciones
   (JOINT/BASIC/defensa GUARD, QTE con Q/E/WASD) con preferencias por familia; el probe
   muestrea cada ~38 ms overlay DOM + `.state-debug-overlay` + bridge
   `window.__ROM_TICKS_BRIDGE__` (`getRomAdapter().snapshot`, `getPresentation().debugState()`
   con actor/target {pose,frame,x,visible}, camera {screenMotionActive, screenPathActive,
   cinematicViewportEnabled, romScreenOffset*}, `getCompletionOwner()`, `getRuntime().state.tick`)
   y captura PNG por beat (clip del `.battle-screen`).

**Runs válidos** (los r1–r5 dom iniciales se descartaron por lógica de selectores obsoleta
frente al HUD nuevo — ver §7 pitfall):
- DOM (producción, sin flag): `dom-r6`, `dom-r8`, `dom-r9` → 32 películas completas.
- Pixi (`?pixiField=1`): `rom-r1`, `rom-r2`, `rom-r3`, `rom-r4` (r4 con `PROBE_TARGET=damage`)
  → 71 películas completas, de ellas 60 con adapter `source=ROM` y 11 con ruta
  `LEGACY(null)` (Sonic Kick del rival).

**Crash intermitente bajo automatización**: `Cannot read properties of undefined (reading
'key')` en `assets/main-BqcxQ5ox.js:204:8505` al montar story/battle (~1/3 de boots, sin clicks
previos, sin repro manual). Artefacto de probe ya conocido (React #520 del slice previo) — NO
reportado como bug de producto; el probe reintenta el boot hasta 5 veces.

---

## 2. Resumen ejecutivo (delta visible vs 251eee81)

| # | Hallazgo 251eee81 | Estado en 62001cc1 | Evidencia nueva |
|---|---|---|---|
| G1 | Presentación ROM/Pixi NO montada en producción (`?pixiField=1` gate) | **SIGUE GATED (por diseño canary)** | `src/renderer/pixi/flag.ts` `BATTLE_PRESENTATION_DEPLOYMENT = {defaultRenderer:'DOM_LEGACY', pixiActivation:'DEV_QUERY_FLAG'}`; `main.tsx:3309` `{isPixiField() && <BattlePixiStage/>}`; `main.tsx:2995`. Run DOM: 32/32 movies sin bridge → producción 100 % LEGACY. |
| G2 | Pixi corto: termina en `endTick` ≪ película física; retorno prematuro | **PARCIAL — por familia, ya con reloj del runtime** | Los `endTick` compilados ahora son por familia: Cont.Punch/Cont.Kick 300/237t, Energy Wave 32t, Energy Bomb 103t, 3-Stage 79t, 4-Stage 119t (probe `classify-head.ts`, forms reales). En vivo (rtΔ = ticks de BattleRuntime avanzados por el RomPresentationPlayer): player-Stage 33t → FIELD mientras la película DOM sigue a 132t; rival-Stage 85–89t; beam player 32t → FIELD en domT≈36 de 152; bomb 103t; melee rival 112t+ (LARGA: se extiende más allá del movie DOM 132). El retorno Pixi sigue sin coincidir con el final del movie DOM (doble película visible, ver G3). |
| G3 | Dos relojes paralelos (DOM 132–152t y ROM/Pixi) | **PARCIAL — un solo reloj DENTRO de Pixi; la película DOM legacy sigue con su propio scheduler** | `RomPresentationPlayer` ya no corre un reloj propio: `advanceAuthoritativeBattleTick(clock)` avanza `BattleRuntime.advance(1)` (rom-r1 Stage: rt 93→126, Δ33 = duración film). PERO `playCardCinematic` sigue lanzando SIEMPRE el `BattleTimeline` DOM en paralelo (su `onTick` solo omite `pixiPres.sync` cuando `useRomPixi`; el scheduler DOM corre igual hasta 132/152t). `completionOwner = 'DOM'` en las 60 movies ROM medidas: la rama `romOwnsCompletion` de 62001cc1 exige `runtimeResult`, y **ningún call-site pasa el 5º argumento a `playCardCinematic` (2333/2612/2785/2864/2889, todos ≤4 args)** → el ownership ROM declarado por el commit NO se activa en la batalla real. |
| G4 | Beats SHOT/CAMERA sin efecto visible en DOM; SCREEN_MOTION consumida sin efecto | **PARCIAL — el adapter YA mueve la cámara cuando el cue existe; casi ningún timeline lo emite** | `ProductionRomPresentationAdapter` consume `SCREEN_MOTION/$0E` → `applyScreenMotion` (CameraPresenter: `romScreenOffsetX`). Evidencia viva: Energy Bomb del jugador (rom-r4): `screenMotions=1`, offset **−18→−36→−54→−72** en 4 samples (~240 ms) y restore a 0 — primer movimiento de pantalla real visto en producción. PERO solo 4 de 60 movies ROM tuvieron scM>0 (Energy Bomb + 3 Stage tardíos r4); melee/beam/rival-stages: 0 emisiones. `CAMERA FLASH_WHITE` sigue mapeando a `camera(0.15)` = shake, no blanco (adapter case CAMERA). En DOM los cases `SHOT`/`CAMERA` de `applyEvent` siguen siendo no-op/shake (`main.tsx` ~1600-1660). |
| G5 | Defensor nunca visible en ruta ROM/Pixi | **RESUELTO en Stage del jugador (ruta runtime); SIGUE ROTO en rutas estáticas** | `buildTimeline` emite `FIGHTER_VISIBILITY` en `canon.defenderIn`/approach y el adapter lo aplica (case visible, ya NO en TRACE_CUES). 25/25 movies de Stage del JUGADOR con `target.visible=true` desde el primer sample + pose `knockback_back` en el impacto (~domT 25–27). En las 35 movies restantes con source ROM (15 rival-Stage, 12 melee rival, 16 beam, bomb): `target.visible=false` en el 100 % de los samples, incluso en el beat IMPACT del overlay DOM (rom-r1 Cont.Kick: DOM IMPACT @97–132 sin target pixi; captura `rom-r1-act03-t97` muestra solo al atacante grande). |
| G6 | Stage multi-golpe no depende del nº de comandos (3 y 4 Stage = misma película de 1 golpe) | **PARCIAL** | Stage del jugador post-QTE: film runtime con `ACTION_DUEL` desde el inicio, poses `attack_fwd`, impacto con knockback y 2–3 `impacts` por movie (rom-r1 3-Stage imp 0→2 en ventana; rom-r2 3-Stage Δ2–3 por movie) → la cadena de golpes YA aparece en Pixi. Rival 4-Stage (ruta estática STAGE_COMMAND): **0 impacts en las 15 movies** (imp=0 siempre), target invisible, una sola película → sigue sin coreografía multi-golpe y sin resultado del QTE del rival. El DOM overlay de ambos es la película fija 132t con UN impacto a ~97. |

**Nuevo hallazgo (no estaba en G1–G6)**: en modo pixi las cartas sin ruta estática
(`LEGACY(null)`, p.ej. Sonic Kick del rival) **SÍ espejan el movie DOM en Pixi vía
`applyCinematicEvent`** (escenas SOLO→DUEL→IMPACT→FIELD y `target.visible` pasa a true en el
DUEL ~domT 50) — o sea, la película LEGACY muestra al defensor donde las rutas ROM estáticas
no lo muestran. La ruta ROM “más madura” (melee/beam estáticos) es visualmente la MÁS pobre.

---

## 3. Tabla por acción × beat (ESPERADO vs REAL)

Referencias ROM: `docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md` §§15–21/215–234; macros
$1C rush / $1E pre-shift beam / $2F impacto / $30-$31; `animationCanon.defenderIn`
(melee 40/100, stage 34/80, beam 70/152). Beats sin evidencia ROM → INFERRED/PREGUNTA ABIERTA.

### 3.1 STANDARD DAMAGE / melee ($0A)
Movies reales: DOM `dom-r6 Cont.Punch` (player, 13 samples) · `dom-r8 Dunk Shot` (player) ·
`dom-r9 Tail` (player) · `dom-r8/r9 Cont.Kick/Sonic Kick` (rival) · ROM `rom-r1 Cont.Kick`
(rival, source ROM, 30 samples) · `rom-r1/r4 Sonic Kick` (rival, LEGACY(null), espejo DOM).

| Beat | ESPERADO (ROM) | REAL — DOM (producción) | REAL — ROM/Pixi (`?pixiField=1`) | Causa raíz | Dónde (sin tocar) |
|---|---|---|---|---|---|
| 1 plano inicial | actor SOLO al abrir la acción | `SHOT ACTION_SOLO` caption + `.card-fx`; sprites DOM tácticos ~100px | Pixi `scene=ACTION_SOLO`, actor grande x176→126 (approach) | — | — |
| 2 salida de FIELD | momento exacto del corte a acción | transición por clases CSS `.field-action`/card-fx (sin corte duro) | Pixi cambia a ACTION_SOLO al primer cue SCENE_LOAD | — | — |
| 3 actor visible | sí | sí (DOM) | sí: `actor.visible=true` 100 % samples | — | — |
| 4 posición X/Y | canon $1C rush +98px/25t (ROM §17) | CSS rush animado (steps 9) | x del actor 176→126 en domT 31–47 (FIGHTER_MOTION consumido, mot=1) | movimiento OK en Pixi | — |
| 5 secuencia física | poses por frame ROM | poses DOM por perfil legacy (attack_fwd→punch_right en SOLO/DUEL) | Pixi consume 50 `ROM_PHYSICAL_FRAME` (rom-r1 Cont.Kick) pero el actor queda `pose=idle` con frames internos; las poses semanticas no cambian | FIGHTER_POSE ausente en el timeline estático de la familia; físicos resuelven frames internos | compilers $0A (estático) |
| 6 frames y duración | melee 100t canon (contacto 40) | movie DOM 132t fijos; contacto DOM ~107 | film pixi ~237t compilado (rtΔ 112 en ventana muestreada) — más largo que el movie DOM | endTick 237 del compile estático vs 132 del perfil legacy | compilers / `RomPresentationPlayer` |
| 7 movimiento | $1C discreto 25t | CSS | x decrece en ~5 tramos; luego estático | OK | — |
| 8 aparición target | defenderIn melee 40/100 | DOM: defensor visible desde el travel (zoom CSS) | **NUNCA visible** (`target.visible=false` 0→132) | rutas estáticas no emiten FIGHTER_VISIBILITY de entrada; sceneDirector no lo deriva | compilers $0A + scene visibility |
| 9 posición target | plano rival | derecha/izquierda según lado | invisible (idle x96 sin pintar) | ídem | ídem |
| 10 BG/FX | fondo acción | fondo acción DOM | escena SOLO sin target; sin FX extra | — | — |
| 11 cámara/scroll ($0E/$0F/$11) | desplazamientos por macro | 0 emisiones | 0 `SCREEN_MOTION`/`PATH` en melee | compilers no emiten $0E/$0F/$11 para $0A | compilers |
| 12 impacto ($2F) | macro 13 cmds, doble WAIT 30 (ROM §19/215) | DOM `IMPACT` @~97–114 + flash blanco + daño (8 dmg) | **imp=0 en Pixi**: sin impacto, sin flash, aunque el overlay DOM marque IMPACT | timeline estático sin IMPACT/ROM_RESULT_BRANCH ejecutado (la rama HIT no se materializa sin outcome) | compiler + plumb del outcome |
| 13 reacción target | poses HIT/variants $2F/$30/$31 | DOM knockback_back/down/up según carta (Tail ↑, Dunk Shot ↓) @107–132 | sin target → sin reacción en Pixi | ídem 8/12 | ídem |
| 14 recovery | poses de recuperación | DOM vuelve idle al final | — (no llega: overlay acaba antes) | — | — |
| 15 cleanup | cleanup al final del film | DOM: FIELD RETURN + fade `.26s` | adapter resetea con la siguiente acción | — | — |
| 16 retorno exacto a FIELD | al final real del film | DOM 132t | Pixi sigue en ACTION_SOLO al terminar el muestreo (film 237t sin FIELD en ventana; LEGACY(null) rival SÍ vuelve a FIELD al final del movie DOM) | dos schedulers con totales distintos (G3) | `playCardCinematic` |

### 3.2 BEAM / KAMEHAMEHA ($02 BEAM_BASE)
Movies reales: DOM `dom-r9 Energy Wave` (player, 22 samples 0→152; y rival) · `dom-r6 Energy
Bomb` · ROM `rom-r2/r4 Energy Wave` (player y rival, source ROM).

| Beat | ESPERADO (ROM) | REAL — DOM | REAL — ROM/Pixi | Causa raíz | Dónde |
|---|---|---|---|---|---|
| 1–4 entrada/actor | beam_charge + pre-shift $1E (−27px/17t, ROM §18/233) | SOLO @0–47, `beam_charge` hasta ~39 | Pixi ACTION_SOLO @0–32 con phys=7 consumidos y actor x96→69→96 (retroceso pequeño), sin pre-shift −27 visible | $1E registrado como ROM_MACRO traza + FX_LOAD traza; motion solo el rush | adapter/compiler ($1E no aplicado como motion) |
| 5–7 secuencia/frames | frames beam | DOM `beam_charge`→`beam_fire` @~80 | Pixi actor idle fr0 en SOLO casi todo el film; físicos 7 | timeline beam sin poses/frames de ataque para el actor en acción | compiler BEAM_BASE |
| 8–9 target | defenderIn beam 70/152 | DOM: defensor `hurt` desde IMPACT | **target.visible=false 100 %** (0→152) | ídem G5 estático | compilers |
| 10 BG/FX | FX $05 Kamehameha | DOM proyectil CSS + flash | FX_LOAD/fxWindow=1 registrado; destello blanco visible en capturas del bomb (rom-r4-act06) | FX vía RomDisplayPresenter parcial | adapter FX |
| 11 cámara | $0E −6×16t etc. en hit beam (ROM §227) | 0 | 0 en Energy Wave; **Energy Bomb SÍ: romScreenOffsetX −18→−72 + restore** (rom-r4, 4 ticks) | solo el compile de bomb emite SCREEN_MOTION; beam no | compilers por carta |
| 12 impacto | $2F | DOM IMPACT @~111–121 + 13 dmg | imp=0 en Pixi; scene FIELD desde domT≈36: el film pixi ya terminó (32t) antes del travel/impacto DOM | endTick 32 ≪ movie 152 (G2 beam) | compiler + duración |
| 13 reacción | hurt target | DOM defender `hurt` | sin target | ídem | ídem |
| 14–16 recovery/cleanup/retorno | — | DOM hasta 152 + FIELD RETURN | Pixi idle en FIELD desde domT 36 (captura rom-r2-act08-t48: sprites tácticos pequeños, sin close-up) | dos schedulers (G3) | `playCardCinematic` |

### 3.3 STAGE (jugador con QTE y rival)
Movies reales: DOM `dom-r6/r9 3 Stage Atk.` (player) + rival stages · ROM `rom-r1/r2 3 Stage
Atk.` (player, ruta runtime continuingStage) + rival `4 stage atk.` (ruta estática).

| Beat | ESPERADO (ROM §164–170/§6-7) | REAL — DOM | REAL — ROM/Pixi | Causa raíz | Dónde |
|---|---|---|---|---|---|
| 1–3 QTE + plano | ventana global 50/80/120/150t; prep WAIT 20+30 | panel StageHudPanel canónico; QTE completo jugado (Q/E/WASD) → movie | **QTE y prep idénticos**; tras el último input la película pixi arranca DESDE el timeline acumulado del runtime (no reinicia) | — (beat OK, mejora real del HEAD) | — |
| 4–5 secuencia | N comandos → N golpes | DOM: movie 132t fija, UN `punch_right`, IMPACT único @~97 | Pixi: poses attack_fwd y **2–3 impacts reales por movie del jugador** (imp Δ por movie; knockback del target @domT≈25–27) | runtime stage sí encadena; DOM legacy no | —/profiles legacy |
| 6 duración | stage 34/80 canon | DOM 132t | film pixi jugador ~33 rt-tick → FIELD domT≈45–46; movie DOM sigue a 132 | endTick runtime vs movie legacy (G3) | `playCardCinematic` |
| 7–9 target | defenderIn stage 34/80 | DOM aparece en travel | **target visible TODO el film del jugador** (v=true desde sample 0, incl. knockback) — RESUELTO | buildTimeline FIGHTER_VISIBILITY + adapter case | — |
| 11 cámara | scroll por golpe | 0 | 1 SCREEN_MOTION consumida en total (r4 tardío) sin estado de cámara activo en samples; resto 0 | stage runtime apenas emite $0E | buildTimeline/stageSequences |
| 12–13 impacto/reacción | golpe por comando | IMPACT único @97 | impacto pixi @~25–27 con knockback del defensor; DOM overlay vuelve a marcar IMPACT @97 (doble) | dos películas (G3) | — |
| 16 retorno FIELD | — | 132t | pixi FIELD @~45 con runtime congelado (rt 126 fijo) mientras DOM corre a 132 | ídem | ídem |

Rival Stage (ruta estática, 15 movies): actor con 51 físicos, scene SOLO→FIELD (sin DUEL),
target invisible, **imp=0 siempre** → el Stage del RIVAL no tiene coreografía visible bajo Pixi
(es la película DOM la que se ve; y sin QTE/counter para el jugador: PREGUNTA ABIERTA, §7).

### 3.4 CHARA (switch)
**NO ALCANZABLE en Training cap.1** (ver §6).

---

## 4. Clasificación por ruta (ROM | LEGACY) de lo realmente jugado

**Producción por defecto (sin flag)**: 32/32 movies con overlay DOM y **sin adapter** →
LEGACY 100 % (G1: no hay renderer ROM montado).

**Con `?pixiField=1` (runs rom-r1..r4, 71 movies ≥3 samples)**:

| Fuente real | Movies | % | Familias |
|---|---|---|---|
| `source=ROM` (adapter) | 60 | 84,5 % | Stage 39 (24 player-runtime / 15 rival-estático) · BEAM 16 · melee 1 (Cont.Kick rival) · OTHER 4 (Full Spirit/Dende, display) |
| `LEGACY(null)` (sin ruta; movie DOM + espejo Pixi vía applyCinematicEvent) | 11 | 15,5 % | DAMAGE 11 — todas Sonic Kick del rival |

**Clasificación estática de las 125 cartas a HEAD (probe `classify-head.ts`, `npx tsx`)**
con las forms REALES de la batalla (el slice previo usó `gohan_kid` — no es formId):
- `gohan_young` (Gohan Kid cap.1): STAGE_COMMAND 4 · STANDARD_DAMAGE 2 (Cont.Punch #5,
  Cont.Kick #6) · BEAM_BASE 16 · PROJECTILE_SCROLL 18 · BEAM_VARIANT 4 · SPECIAL_HANDLER 2 ·
  SUPPORT_SPECIAL 22 · SUPPORT_FIELD_EFFECT 25 · DEFENSE_RULE 11 · **LEGACY(null) 21 (16,8 %)**
  — entre ellas las damage del mazo inicial Dunk Shot #11, V-ball Crash #41, Atomic Break #43.
- `piccolo_evil` (Piccolo cap.1): **LEGACY(null) 23 (18,4 %)** (+Tail #29, F.Lightbomb #18).
- En juego real el % LEGACY depende de la mano: Sonic Kick del rival fue la única LEGACY
  observada en modo pixi; Cont.Punch/Cont.Kick (rival y las 2 únicas $0A con ruta estática)
  jugaron ROM.

Ojo de interpretación: el router estático ya no clasifica el grueso de la familia $0A como
STANDARD_DAMAGE (Cont.Punch estático = null en `classify-head` si se compila SIN log de
runtime): la ruta real de la familia depende de `latestStandardDamageRuntimeCutover` en vivo,
que exige el `runtimeResult` que ningún caller pasa (ver G3) → en browser la familia $0A que
SÍ se ve ROM es solo la estática (Cont.Punch/Cont.Kick con físicos UNRESOLVED para otras
forms/cartas). Dunk Shot/V-ball/Atomic Break permanecen LEGACY en producción y bajo pixi.

---

## 5. Estado de montaje en producción

**Sigue gated por `?pixiField=1`** (canary de dev; el desktop NO lo montó por defecto):
- `src/renderer/pixi/flag.ts`: `BATTLE_PRESENTATION_DEPLOYMENT.defaultRenderer = 'DOM_LEGACY'`,
  `pixiActivation = 'DEV_QUERY_FLAG'`, `pixiQuery = 'pixiField=1'`,
  `completionOwnership = 'ROUTE_SCOPED'`, `romCompletionRoutes = ['PLAYER_STANDARD_DAMAGE']`,
  `timelineLiveSurface = 'RUNTIME_SANDBOX'` (coherente con lo observado: el reloj que avanza el
  RomPresentationPlayer es el del runtime de la batalla).
- `main.tsx:3309`: `{isPixiField() && <Suspense><BattlePixiStage …/></Suspense>}`;
  `main.tsx:2995`: `pixiPresentationActive = isPixiField() && pixiPresentationReady`.

---

## 6. Beats no alcanzables en esta sesión y cómo alcanzarlos

**CHARA (switch)** — no alcanzable en Training cap.1 (1v1 Gohan Kid vs Piccolo):
- Requisito: `player2` (reserva) no nula; el botón `cmd-c` solo se renderiza con
  `{player2 && <button className="cmd-c has-ally">}` (`main.tsx:3481-3490`,
  `selectCommand('C')` → si `!player2` → log `noAlly`). En el GBC no existe CHARA en combates
  individuales (FAQ interna: “en individuales no existe”).
- Cómo alcanzarlo: partida por equipos — Versus 2v2 o capítulo de historia con 2 luchadores
  (Gohan + reserva) donde el jugador tenga 2 forms elegidas; el Engine resuelve el swap con
  `CHARACTER_ACTION` + commit diferido T+63 (ROM §116–126) y la presentación lo mostraría como
  film (el botón usa `startPlayerSwitch`). No se forzó con hacks por mandato del slice.
- **STANDARD_DAMAGE del JUGADOR bajo pixi**: no se capturó movie propia (CC/mano deterministas
  del seed 4242 + preferencias del probe); la familia quedó cubierta por el lado RIVAL
  (Cont.Kick, source ROM) que usa el mismo pipeline estático. Para capturarla: subir CC con
  QTE y jugar Cont.Punch #5 (10CC) en JOINT con `PROBE_TARGET=damage` (los runs r1/r4 lo
  tuvieron habilitado en mano pero la ventana no coincidió con un ataque del jugador).

---

## 7. Pitfalls del método (HEAD vs slice previo)

1. **El intro de HEAD usa `intro-active`/`presentation-locked`** en `.battle-screen` (no
   `.battle-intro`): sin esperar su fin los controles no montan y el probe “stallea” en PHASE
   COMMAND con CC fijo — causa de los dom-r1..r5 vacíos.
2. **`.command-select` existe en phase command Y cardSelect** (el select `attackCmd` antiguo
   era inútil); el back real es `.basic-btn.basic-back`.
3. **Contadores de familias por label colisionan** cuando rival y jugador juegan la misma carta
   (mismo nombre) — se corrigió segmentando movies por corridas contiguas de samples `ov`
   (`movies.mjs`), no por label.
4. Crash intermitente `reading 'key'` en story/battle mount (ver §1) — reintento de boot.
5. Los `endTick`/rtΔ NO son ticks del overlay DOM: el overlay (legacy) marca 132/152t con su
   propio scheduler; el film pixi avanza el BattleRuntime a ~1 tick/RAF. Comparar siempre
   domT del overlay CON rtTick del bridge, no entre sí directamente.

---

## 8. Preguntas abiertas (sin evidencia en el repo; no inventar)

1. **Cuantía exacta de golpes del Stage del jugador vs nº de comandos**: el runtime film del
   jugador muestra 2–3 impacts por movie (rom-r1 3-Stage imp 0→2; rom-r2/r4 Δ2–3) y el primer
   impacto puede caer antes del primer sample (el QTE se resuelve en el dispatch). Sin trace
   fino del tick del primer comando no se puede afirmar “1 impacto por input” con evidencia.
2. **SCREEN_MOTION del stage (r4, 1 emisión total)**: consumida (scM=1) pero sin estado de
   cámara activo en ningún sample — ¿cue al final del film (cleared al returnToField) o
   duración menor que el gap de muestreo? Queda como verificación pendiente con el stage
   debugger (`?debugState=1` freeze/step).
3. **Defensor ante Stage del rival**: en web el rival se resuelve solo y el jugador solo elige
   defensa antes (GUARD) — sin ventana A/B. Sin evidencia GBC en el repo (misma pregunta
   abierta del slice previo).
4. **FLASH_WHITE**: `CAMERA FLASH_WHITE → camera(0.15)` sigue siendo shake (adapter), no
   blanco; ninguna ruta emite un flash real. Canon `entrance` (melee/stage/beam) sigue
   INFERRED (M8.F0 canon vacío, mismo conflicto interno del slice previo).
5. **Wiring `runtimeResult`**: la rama de completion ownership ROM (62001cc1) está muerta en
   vivo porque ningún call-site pasa el 5º arg a `playCardCinematic` — intención del commit vs
   integración pendiente (PREGUNTA de diseño, no de ROM).

---

## 9. Verificación de entregable

- `git status --short` en HEAD 62001cc1: sin cambios en `src/` (solo este informe nuevo).
- Evidencia en `.openclaw/tmp/battle-film-audit-20260906/`: 898 PNG por beat
  (`dom-r6/r8/r9-act*`, `rom-r1..r4-act*`, nombres `actNN-t{domT}-{offMs}-{acción}.png`),
  13 JSONL (`dom-r*/rom-r*-samples.jsonl`), `movies-summary.json` (segmentación por movie),
  `fine-segments.json` (detalle por tick de las representativas), `summary.json`,
  probes (`probe-film.mjs`, `classify-head.ts`, `segment.mjs`, `movies.mjs`, `fine-seg.mjs`).
- Referencias de capturas clave citadas en el texto: `rom-r1-act01-t27` (Stage pixi DUEL con
  target), `rom-r1-act03-t97` (melee pixi sin target en IMPACT DOM), `rom-r2-act08-t48` (beam
  pixi ya en FIELD), `rom-r4-act06-t20` (Energy Bomb: desplazamiento de pantalla + FX),
  `dom-r6-act03-t107`, `dom-r9-act02-t121` (melee/beam DOM con reacción del defensor).
- Servidor `:5178` cerrado al terminar la sesión (§10).

## 10. Estado del entorno al cierre
- Build `dist/` HEAD 62001cc1 (BUILD_EXIT=0) · servidor :5178 en marcha durante las capturas,
  se cierra al finalizar la sesión · probes todos terminados (sin procesos colgados) · sin
  verifies lanzados en paralelo (RAM).
