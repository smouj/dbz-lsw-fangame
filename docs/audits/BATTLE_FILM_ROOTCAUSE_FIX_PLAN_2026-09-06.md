# BATTLE FILM — ROOT CAUSE → FIX SISTÉMICO → VERIFIER · 2026-09-06

> Conversión directa de `BATTLE_FILM_VERIFICATION_2026-09-06.md` (ground truth browser en
> HEAD `62001cc1`, 898 PNG + 13 JSONL/5173 samples) en tabla de ejecución. Sin nuevo roadmap:
> cada root se arregla UNA vez en su autoridad y se cierra con su verifier/golden. HEAD
> baseline: typecheck PASS · combat-fidelity PASS (1 LEGACY #9) · combat-camera-film 21/21 PASS.

## Taxonomía (clasificar cada fallo antes de tocar)

```text
ROM DATA INCORRECTO                     (evidencia ROM refutada — casi no aparece)
ROM DATA CORRECTO PERO NO CONSUMIDO     (compiler no emite el cue: FIGHTER_VISIBILITY, $0E/$0F/$11)
CUE CONSUMIDO PERO MAL INTERPRETADO     (adapter: FLASH_WHITE → shake; impacto genérico)
RENDER PIXI INCORRECTO                  (presenter/actor)
REACT/DOM TODAVÍA INTERFIERE            (movie DOM paralelo, completionOwner DOM, schedulers)
EVIDENCIA ROM TODAVÍA INCOMPLETA        (rival ante Stage, CHARA 1v1, nº golpes Stage exacto)
```

## Tabla causa raíz → archivos → fix sistémico → verifier

| Root | Síntoma (evidencia informe §3) | Clasificación | Archivos responsables | Fix sistémico | Verifier/golden que impide regresión |
|---|---|---|---|---|---|
| **C — COMPLETION OWNERSHIP** | completionOwner='DOM' en 60/60 movies ROM; movie DOM corre en paralelo hasta 132/152t y es quien dispara onDone; retorno Pixi adelantado (G2/G3) | REACT/DOM INTERFIERE + NO CONSUMIDO (rama `romOwnsCompletion` existe pero ningún caller la activa) | `src/main.tsx` `playCardCinematic` (~1406-1560; `runtimeStandardDamage`/`romOwnsCompletion` ~1495-1502; `finishRomCinematic`) + call-sites ~2333/2612/2785/2864/2889 (todos ≤4 args, nunca pasan el 5º `runtimeResult`) | Pasar `runtimeResult` (resultado del dispatch del runtime) en los call-sites de jugador/rival con ruta ROM; cuando `romOwnsCompletion`, el scheduler DOM legacy NO corre en paralelo (ni su onDone manda): un solo reloj y un solo completion, tick = `BattleRuntime.state.tick` | Extender `verify:golden-combat` (escenario STANDARD_DAMAGE exige completion ROM y retorno al tick ROM) + check browser `getCompletionOwner()==='ROM'` en movie real + `verify:combat-authority` (UI sin reloj propio) |
| **A — VISIBILITY / SCENE (rutas estáticas)** | melee $0A, beam $02 y rival-stage: `target.visible=false` 100 % samples incluso en IMPACT DOM (G5); imp=0 en Pixi (G6 rival) | ROM DATA CORRECTO PERO NO CONSUMIDO (canon `defenderIn` melee 40/100, beam 70/152, stage 34/80 existe en `animationCanon.ts`; `buildTimeline` runtime SÍ emite `FIGHTER_VISIBILITY` y el adapter lo aplica — Stage jugador RESUELTO) | Compilers estáticos por carta (`standardDamageRomCutover.ts`, compilers BEAM/STAGE) + `ProductionRomPresentationAdapter.ts` (case visible ya existe) + espejo `combatObservability.classifyRomCue` | Emitir `FIGHTER_VISIBILITY` de entrada del defensor en `defenderIn` desde TODOS los compilers con target-cut (mismo patrón que `buildTimeline`); derivar escena SOLO→DUEL con target visible desde el cue, no de `card.type` | Extender `verify:combat-camera-film` a melee/beam estáticos (target visible en `defenderIn`; escena DUEL) + `verify:combat-observability` (cue VISIBLE, no DISPLAY) + browser por familia |
| **B — POSITION / SCENE DIRECTOR** | Stage jugador runtime: sin SCREEN_MOTION por golpe (1 sola emisión r4, sin estado de cámara activo en samples); melee/beam: 0 emisiones $0E/$0F/$11 | ROM DATA CORRECTO PERO NO CONSUMIDO (ROM §§227/232: `$0E` −6×16t etc.; el adapter ya mueve: Energy Bomb offset −18→−72 real) | `src/battle/engine/presentation/buildTimeline.ts` (stage sequences) + compilers por carta (emisión `$0E/$0F`) | Emitir SCREEN_MOTION/RESTORE por golpe/familia desde los timelines (nunca setView React); verificar con el stage debugger `?debugState=1` freeze/step la pregunta abierta §8.2 | `verify:combat-camera-film` por familia (SCREEN_MOTION emitida Y viewport activo AND restore exacto) |
| **D — IMPACTO / OUTCOME ($2F/$30/$31)** | Pixi imp=0 en melee/beam/rival-stage aunque el overlay DOM marque IMPACT; FLASH_WHITE = shake 0.15 (no blanco) | CUE CONSUMIDO PERO MAL INTERPRETADO (adapter `ROM_RESULT_BRANCH` → `impact()` genérico, sin outcome; `CAMERA FLASH_WHITE → camera(0.15)`) | `ProductionRomPresentationAdapter.ts` (cases ROM_RESULT_BRANCH / CAMERA) + compilers (emisión del branch con outcome) | Plumb del outcome del Engine (llega vía `runtimeResult`, root C) a la rama ROM_RESULT_BRANCH → variantes HIT/MISS/SPECIAL ($2F/$30/$31, doble WAIT 30); FLASH_WHITE real (blanco 1-2 ticks, no shake) | Golden por familia: impacto en el tick de contacto con pose de reacción correcta + flash blanco presente; espejos classifyRomCue |
| **E — DURACIÓN / endTick** | Beam 32t ≪ movie DOM 152t → Pixi en FIELD desde domT≈36; melee estático 237t ≫ 132t; retorno nunca coincide (G2) | ROM DATA CORRECTO PERO NO CONSUMIDO + REACT/DOM INTERFIERE (endTick compilados por familia; pero el movie DOM legacy es el que el jugador ve) | Compilers (duraciones) + `RomPresentationPlayer` (fin por reloj runtime) + `playCardCinematic` | Tras root C (un solo reloj), las duraciones compiladas SON la película: corregir endTick por familia con evidencia ROM y eliminar la película DOM paralela en rutas ROM; verificación tick triplete LOGICAL/ROM TIMELINE/PIXI por acción | `verify:full-battle-e2e` + golden film set (P0.9): tick/cue/actor/target/frame/xy/camera por acción; browser: sin movie DOM paralela en rutas ROM |
| **F — MONTAJE PRODUCCIÓN (?pixiField=1)** | Producción por defecto 100 % DOM legacy; ROM/Pixi solo con `?pixiField=1` (G1) | REACT/DOM INTERFIERE (canary `flag.ts`: `defaultRenderer:'DOM_LEGACY'`, `pixiActivation:'DEV_QUERY_FLAG'`) | `src/renderer/pixi/flag.ts` + `src/main.tsx` (montaje `BattlePixiStage` ~3309, `pixiPresentationActive` ~2995) | DECISIÓN EXPLÍCITA (no automática): NO flip hasta que C+A+D+E dejen las rutas ROM visualmente ≥ legacy en canary (hoy las rutas ROM estáticas son las MÁS pobres: sin target ni impacto, y LEGACY(null) espejo DOM muestra más). Cutover = último paso del epic: producción normal → misma ruta validada, sin flag, sin DOM audiovisual paralelo, sin completion legacy | `verify:game-shell` + golden film set en producción SIN flag + E2E 1v1/2v2 (P0.10/P0.11) |
| **G — EVIDENCIA ROM** | Rival ante Stage (¿ventana A/B?), CHARA en 1v1, nº golpes Stage vs comandos, FLASH_WHITE canon (M8.F0 vacío) | EVIDENCIA ROM INCOMPLETA | — (no código) | NO inventar: beats marcados PREGUNTA ABIERTA hasta trace/video GBC; CHARA se audita en partida por equipos (2v2/reserva, botón `cmd-c` con `player2`) | — |

## Tripleta de tick que todo fix debe respetar (por acción, en el golden)

```text
LOGICAL TICK          = BattleRuntime.state.tick        (única autoridad temporal)
ROM TIMELINE TICK     = tick relativo del timeline ROM   (selección de cues)
PIXI FILM TICK        = tick que el renderer dibuja       (= logical, nunca un contador local)
```

Regresión = cualquier contador local (RAF propio, setTimeout, CSS, Pixi ticker) que adelante
pose/movimiento/fin/cambio de escena, aunque el golden visual concreto parezca correcto.

## Orden propuesto (cada root cierra con verify:ci EXIT 0)

1. **C** (wiring, enabler: sin completion ROM los demás se ven bajo doble película)
2. **A** (visibilidad rutas estáticas — mayor gap visual por nº de beats: 8/9/12/13 de la checklist)
3. **D** (impacto/outcome + FLASH_WHITE)
4. **B** (SCREEN_MOTION por familia) — puede ir con D en el mismo compiler
5. **E** (duraciones/endTick con reloj único)
6. **F** (cutover producción, decisión explícita del usuario al final)
7. **G** (evidencia: preguntas abiertas en paralelo, sin bloquear)
