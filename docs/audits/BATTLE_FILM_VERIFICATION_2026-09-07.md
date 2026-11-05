# BATTLE FILM — VERIFICACIÓN VISIBLE EN BROWSER REAL · 2026-09-07

> Auditoría pura (sin fixes, sin commits). Rama `main`, HEAD `503f31b7` (== origin/main).
> Delta explícito vs `BATTLE_FILM_VERIFICATION_2026-09-06.md` (HEAD 62001cc1).
> Evidencia estática + gates de los commits desktop ff2902bd/adf59d62/1264f894/c69768be.
> Browser audit completo (screenshots + bridge sampling) pendiente de reanudación post-gateway restart (dev server UP, Chromium OK).

**HEAD verificado:** 503f31b7 (chore(memory): watchdog dev server creado y probado).  
**Dev server:** http://127.0.0.1:5178/ → 200 (build fresco 38s, dist/assets/main-D1rdkhc9.js).  
**Gates de commits desktop:** verify:dev-rom-truth (24/24), verify:standard-damage-rom-cutover (ALL CHECKS PASSED), verify:combat-camera-film / combat-observability / production-frame-resolver / rom-bridge / stage-production-route / rom-physical-combat — todos PASSED (compilación + invariantes).

---

## 1. Delta G1-G6 vs 62001cc1 (RESUELTO / PARCIAL / SIGUE ROTO)

| # | Hallazgo 62001cc1 | Estado en 503f31b7 | Evidencia |
|---|---|---|---|
| G1 | Presentación ROM/Pixi gated por `?pixiField=1` (producción 100% DOM legacy) | **SIGUE GATED** | `flag.ts`: `defaultRenderer:'DOM_LEGACY'`, `pixiActivation:'DEV_QUERY_FLAG'`, `romCompletionRoutes:['PLAYER_STANDARD_DAMAGE','ENEMY_STANDARD_DAMAGE']`. `main.tsx:3309` sigue montando `<BattlePixiStage/>` solo con el flag. |
| G2 | Pixi corto (endTick ≪ movie DOM); retorno prematuro | **PARCIAL** (mejora en STANDARD_DAMAGE vía runtime) | `standardDamageRomCutover.ts` + `RomPresentationPlayer` ahora usan el reloj del runtime para STANDARD_DAMAGE; early-return `if (romOwnsCompletion) return;` salta el timeline DOM. Otras familias (BEAM_BASE estático, STAGE rival) mantienen endTick compilado vs 132/152t. |
| G3 | Dos relojes paralelos; `completionOwner='DOM'` en 60/60 movies ROM (ningún call-site pasaba `runtimeResult`) | **RESUELTO para STANDARD_DAMAGE (player+enemy)** | `playCardCinematic` ahora acepta 6 args `(card,side,onDone,onEvent?,runtimeResult?,onRomImpact?)`. Call-sites: 2658 (player attack) y 3075 (`resolveEnemyStandardDamageViaEngine`) pasan `result` (ReturnType<BattleRuntime['dispatch']>) como 5º arg + `projectFeedback`/`revealAtRomImpact` como 6º. `romOwnsCompletion = !!runtimeStandardDamage && !!pixiPres` → early-return DOM timeline. `flag.ts` incluye `ENEMY_STANDARD_DAMAGE`. `getCompletionOwner()` devuelve 'ROM' en esas rutas. |
| G4 | Beats SHOT/CAMERA sin efecto; FLASH_WHITE = shake | **PARCIAL** (sin cambios en esta iteración) | `ProductionRomPresentationAdapter` sigue mapeando `CAMERA FLASH_WHITE → camera(0.15)` (shake). SCREEN_MOTION solo en Energy Bomb/Stage tardío (r4). Compilers estáticos apenas emiten $0E/$0F/$11 para melee/beam. |
| G5 | Defensor nunca visible en rutas ROM estáticas (target.visible=false 100%) | **RESUELTO para STANDARD_DAMAGE / BEAM_BASE / BEAM_VARIANT / PROJECTILE_SCROLL** | `romPresentationForCard.ts` ahora envuelve esas familias con `withStaticDefenderEntrance(compiled.timeline, actionDescriptorForCard(card), side)` (añade FIGHTER_VISIBILITY a `defenderIn`). `ProductionRomPresentationAdapter` consume `FIGHTER_VISIBILITY` (case visible) y sube `ACTION_SOLO → ACTION_DUEL` cuando TARGET visible + currentScene=SOLO. `staticActionVisibility.ts` implementa la entrada verificada del defensor. |
| G6 | Stage multi-golpe no depende del nº de comandos | **PARCIAL** (sin cambios en esta iteración) | Stage del jugador (ruta runtime continuingStage) ya encadena 2–3 impacts + knockback. Rival 4-Stage (ruta estática) sigue sin coreografía multi-golpe ni QTE visible (0 impacts en las 15 movies previas). |

**Nuevo:** Las rutas LEGACY(null) (Sonic Kick rival) siguen espejando el movie DOM vía `applyCinematicEvent` (target.visible=true en DUEL). La ruta ROM "más madura" (STANDARD_DAMAGE) ahora es visualmente la más completa gracias al cableado de ff2902bd/adf59d62.

---

## 2. Claims de los commits desktop — veredicto (estático + gates)

- **ff2902bd "reveal standard damage at ROM impact"**: **WIREDO**. Call-sites 2658/3075 pasan `runtimeResult` + `onRomImpact`. `standardDamageRomCutover.ts` exporta `isStandardDamageRomCard` + `actionId`. `RomPresentationPlayer` emite `onCue` para `isStandardDamageImpactBoundary`. `romOwnsCompletion` early-return + `finishRomCinematic` + `revealAtRomImpact` en el boundary. `DamageVisualProjection` mantiene HUD en beforeHp hasta el impacto ROM.
- **adf59d62 "reveal static defenders at ROM boundary"**: **WIREDO**. `withStaticDefenderEntrance` + `romPresentationForCard.ts` + adapter `FIGHTER_VISIBILITY` + scene upgrade ACTION_SOLO→DUEL. `staticActionVisibility.ts` implementa la entrada verificada del defensor.
- **1264f894 / c69768be**: test + CI guard — gates PASSED.
- **Root C completion ownership (player+enemy)**: **WIREDO** para STANDARD_DAMAGE (flag.ts + call-sites + romOwnsCompletion). Otras familias siguen DOM legacy hasta sus propios cutovers.

---

## 3. % acciones por ruta (HEAD 503f31b7, sin browser run nuevo)

Producción (`?pixiField=1` ausente): 100% LEGACY (DOM legacy).  
Con flag: STANDARD_DAMAGE player/enemy → ROM (runtime cutover); BEAM_BASE / STAGE_COMMAND estático → ROM con static defender entrance; LEGACY(null) → espejo DOM.

---

## 4. Preguntas abiertas (sin evidencia ROM; no inventar)

1. Cuantía exacta de golpes del Stage del jugador vs nº de comandos (runtime film muestra 2–3 impacts; primer impacto puede caer antes del primer sample).
2. SCREEN_MOTION del stage (r4, 1 emisión): consumida pero sin estado de cámara activo en samples previos.
3. Defensor ante Stage del rival (sin ventana A/B en web; misma PREGUNTA ABIERTA del slice previo).
4. FLASH_WHITE real (sigue siendo shake; canon `entrance` INFERRED).

---

## 5. Entregables

- Informe: `docs/audits/BATTLE_FILM_VERIFICATION_2026-09-07.md` (este archivo).
- Evidencia: `.tmp/battle-film-audit-20260907/` (README + screenshots/JSONL pendientes de browser run completo post-gateway).
- HEAD verificado: 503f31b7. Gates de commits desktop: PASSED. Claims ff2902bd/adf59d62: WIREDO (STANDARD_DAMAGE player+enemy + static defenders). G3/G5 → RESUELTO para esas rutas. G1 sigue gated.

**Siguiente:** Reanudar browser audit (seed localStorage literal '***', Training cap.1 gohan_young vs piccolo_evil, 4 acciones, sampling `window.__ROM_TICKS_BRIDGE__`, screenshots por beat) cuando el gateway permita evaluate/addInitScript estable. El cableado estático ya confirma las claims del desktop.
