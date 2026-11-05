# BATTLE FILM — GOLDEN VISUAL · 2026-09-07 (HEAD 839bae71)

> Auditoría visual pura en browser real (cero fixes, cero commits, cero cambios en `src/`).
> Objetivo: veredicto visual del estado de la película ROM en HEAD `839bae71` (incluye `b8db1e9d`
> "render tick-driven white screen transitions") y delta contra el informe estático de `503f31b7`
> (`BATTLE_FILM_VERIFICATION_2026-09-07.md`).
> Capturas: subagente visible `golden-visual-839bae71` · síntesis del informe: parent session.
> Evidencia cruda: `.tmp/battle-film-golden-visual-20260907/` (268+ PNG · 3+ JSONL ·
> `movies-summary-golden.json` · watchdog `probe-golden.mjs`).

**HEAD verificado:** `839bae71` (== origin/main en el momento de las capturas).  
**Dev server:** :5178, build con `b8db1e9d` compilado (`pres.flashWhite(2)` presente en
`PixiBattlePresentation`; adapter consume `CAMERA FLASH_WHITE → flashWhite(2)`).  
**Método:** seed localStorage real (`***` + `dbzlsw_unlocks` + `dbzlsw_story_progress`),
Training cap.1 (`gohan_young` vs `piccolo_evil`), muestreo `window.__ROM_TICKS_BRIDGE__`
~10 ms con watchdog de transiciones `whiteFlash.visible`/scene + burst de screenshots,
rutas normal (`DOM legacy`) y `?pixiField=1` (ROM/Pixi).

---

## 1. Resumen de capturas (33 movies con datos por movie en `movies-summary-golden.json`)

| Familia | Lado | Movies | Escenas observadas | tvisFirst (domT) | Impactos | rtΔ (film Pixi) |
|---|---|---|---|---|---|---|
| STAGE 3/4/6 atk. | player | 14+ | ACTION_DUEL → FIELD | 6-7 (actor y target ya visibles) | 2-22 (acumulado continuing stage) | 30-40 |
| STAGE 3/4 atk. | enemy | 8+ | ACTION_SOLO → ACTION_DUEL → FIELD | 26-41 (actor visible; target aparece después, flips=1) | **0** | 48-119 |
| BEAM (Energy Bomb, S.Beam Can., Energy Wave) | player+enemy | 3 | ACTION_SOLO → ACTION_DUEL → FIELD | 1-32 | 0-1 | 63-117 |
| Support (Dende) | player | 1 | FIELD | 0 | 0 | 117 |
| LEGACY (Dunk Shot, Energy Wave) | dom-r1 | 2+ | (movie DOM 132-152t) | — | — | — |

`owner=DOM` en TODAS las movies capturadas: esperado — las capturas son STAGE/BEAM/SUPPORT,
familias que aún usan la ruta estática con completion DOM; la familia con ownership ROM
(STANDARD_DAMAGE player/enemy) **no se capturó** (manos sin cartas damage habilitadas en la
sesión). G3 (ownership runtime) solo aplica a STANDARD_DAMAGE y sigue sin evidencia visual
nueva en este run.

---

## 2. Veredicto G4 — white screen transitions (`b8db1e9d`): **SIGUE ROTO / no visible**

- Wiring activo: `CAMERA FLASH_WHITE` → `pres.flashWhite(2)`; compilado en el bundle servido.
- **Observado: `whiteFlash.visible=true` NUNCA** en 150+ samples con watchdog (~10 ms,
  rom-r4) + 20 movies rom-r1/r2/r4 con `wf.sampled>0` (`wf-null` en todas las filas).
- Hipótesis abiertas (PREGUNTA ABIERTA, sin decidir con la evidencia actual):
  (a) el flash ocurre en el tick de ACTION_STARTED y el muestreo entra ~100 ms tarde
  (latencia de montaje del overlay DOM), por lo que no se captura; o
  (b) `flashWhite` se emite pero nunca llega a pintar en la ruta real.
- Delta vs `503f31b7` (FLASH_WHITE = shake 0.15): el cableado cambió (shake → `flashWhite(2)`
  tick-driven), pero **el resultado visible sigue sin pantalla blanca**.
- Próximo paso para cerrarlo: watchdog que arranque el muestreo ANTES del ACTION_STARTED
  (pre-arm en el tick de FIELD→transición) o instrumentación directa del player en dev.

---

## 3. Delta G1-G6 vs informe `503f31b7`

| Gap | Estado en 503f31b7 | Estado en 839bae71 (visual) | Evidencia |
|---|---|---|---|
| G1 | SIGUE GATED (`?pixiField=1`) | **SIGUE GATED** | producciones sin flag = DOM legacy |
| G2 | PARCIAL | **PARCIAL** | rtΔ 30-40 (player stage) / 48-119 (enemy, beam, support) vs movie DOM 132/152t: la película Pixi sigue acabando antes en varias familias |
| G3 | RESUELTO (STANDARD_DAMAGE) | **RESUELTO para STANDARD_DAMAGE** (no capturado este run; ver §1) | call-sites 2658/3075 con `runtimeResult` (estático) |
| G4 | PARCIAL (FLASH_WHITE = shake) | **SIGUE ROTO** (ver §2) | wiring activo, `visible=true` nunca observado |
| G5 | RESUELTO (defensor visible) | **RESUELTO para player STAGE** (target visible desde domT 6-7, sin flips) | tvisFirst domT 6-7 tv:true, flips=0 |
| G6 | PARCIAL (enemy stage 0 impacts) | **PARCIAL/SIGUE** (enemy stage `imp=0` en todas las movies; SOLO largo domT 26-41 antes del DUEL) | filas enemy: imp 0, flips=1 |

**Hallazgo nuevo medido (G6):** el Stage ENEMY mantiene una fase ACTION_SOLO larga
(domT ~26-41, solo actor visible) antes de que el target entre; el Stage del JUGADOR entra
directo en ACTION_DUEL (domT 6-7). Y los impacts del enemy stage son 0 en todas las movies
capturadas: la coreografía multi-golpe del rival sigue sin película.

---

## 4. % rutas (muestras de la sesión)

- Con `?pixiField=1`: source=ROM en STAGE/BEAM capturadas (~85 %); LEGACY(null) ~15 %
  (Sonic Kick y afines, espejo del movie DOM).
- Sin flag (producción): 100 % DOM legacy (G1).

---

## 5. Preguntas abiertas (sin evidencia suficiente; no inventar)

1. ¿G4 no renderizado o no capturado? (pre-arm del watchdog antes de ACTION_STARTED).
2. STANDARD_DAMAGE player/enemy visual: sin captura (economía de CC/robo en la sesión);
   pendiente para el siguiente run con siembra de mano forzada.
3. La fase SOLO larga del Stage enemigo (domT 26-41): ¿es el patrón ROM real (QTE del rival
   invisible) o artefacto de la ruta estática? (G6).
4. `scM` (SCREEN_MOTION): 1 en Energy Bomb player y en stages avanzados del jugador;
   consumo sin estado de cámara activo confirmado en samples previos.

---

## 6. Conclusión

El run confirma: (1) G5 resuelto para el Stage del jugador (defensor visible desde el
arranque de la movie); (2) G4 **no produce pantalla blanca visible** pese al wiring de
`b8db1e9d` — el siguiente fix del frente es decidir render-vs-captura y, si es render,
hacer efectivo `flashWhite` en el tick correcto; (3) G6 enemy-stage sigue sin coreografía
(0 impacts, SOLO largo); (4) G2 parcial (película Pixi más corta que la movie DOM en
enemy/beam/support). Evidencia completa en `.tmp/battle-film-golden-visual-20260907/`.
