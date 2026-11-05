# BATTLE VISUAL FIDELITY — DIAGNOSIS 2026-09-05

> Diagnóstico (sin fixes, sin commit). Rama `main`, HEAD `251eee81` (runtime sole card authority).
> El usuario reporta que la batalla real en browser se ve "dispar" frente a la coreografía GBC:
> no se ve el robo de carta, los cambios de plano/cámara no se ven, la sincronización de
> acciones/actores está desfasada.
>
> Evidencia cruda: `.tmp/battle-visual-audit/` (capturas + `*-samples.jsonl` + `*-summary.json`).
> Nada de producción fue modificado; los probes viven en `.tmp/`.

---

## 1. Método y cómo reproducir

1. Servir el build: `node scripts/serve.mjs` en `:5178` (dist HEAD `251eee81`, verificada).
2. Sembrar progreso en localStorage del perfil (claves REALES usadas por la app):
   - `***` (la app usa `UNLOCK_KEY = '***'` literal, `src/data/unlocks.ts:9`, desde el commit inicial)
     con `{starterDeck:'damage', characters:['gohan_kid','piccolo'], cards:[1,2,3,5,6,7,8,11,29,41,43,88,97,117,119,121,124,125], pendingReward:null}`
   - `dbzlsw_story_progress = '1'`
3. URL: `http://127.0.0.1:5178/?debugCinematics=1&debugState=1` (y `&pixiField=1` para la ruta ROM).
4. Flujo: MAIN → STORY → capítulo 1 (Evil Mentor! Gohans' Training, Gohan Kid vs Piccolo) → intro
   (18 viñetas, click) → batalla. Jugar varios exchanges reales clicando cartas de ataque,
   defendiendo GUARD (BASIC→DEFEND) y un Stage Attack propio (QTE con Q/E/WASD).
5. Probes usados (en `.tmp/battle-visual-audit/`): `probe.mjs dom|rom` (juega y muestrea
   overlay por beat + screenshots), `dbg-domlayer.mjs` (métricas DOM por capa durante una acción),
   `classify-route.ts` (clasificación estática de las 125 cartas, `npx tsx`).

**Limitaciones honestas del método**: el flujo automatizado sufrió crashes intermitentes
(React error minificado #520, ver §7) y el beat intermedio del robo de carta (frame en vuelo) no
pudo capturarse en PNG pese a varios intentos; el robo se evidencia por código + CSS + logs de
runtime (§4b). Con `pixiField=1` solo se observaron acciones Stage en esta sesión; el resto de
familias se clasificó estáticamente (§5).

---

## 2. Causa raíz general (resumen)

| # | Hallazgo | Evidencia | Causa raíz | Dónde se arreglaría (sin tocar) |
|---|---|---|---|---|
| G1 | **La presentación ROM (adapter/player/Pixi) NO está montada en la batalla de producción.** Todo lo que se ve por defecto es la película DOM legacy (`CinematicProfile`). | `main.tsx:99-100` code-split: `BattlePixiStage` solo se importa con `?pixiField=1`; `main.tsx:1436-1447`: `romRoute = pixiPres ? romPresentationTimelineForCard(...) : null` → sin Pixi, `useRomPixi=false` → `presentationSourceRef='LEGACY'` para TODA acción. | Arquitectura: el puente ROM es "canary" gated tras un flag de dev; la experiencia real es DOM-only. | `src/main.tsx` (montaje/gating del field Pixi, líneas ~2874/3187-3200) + `playCardCinematic` (1436-1447). Decisión de producto: montar Pixi en producción o portar los beats al DOM. |
| G2 | **Incluso con la ruta ROM activa (`?pixiField=1`), la presentación Pixi se corta ANTES que la secuencia física real.** | Rom run: Stage 3 del jugador → `debugState.scene` pasa a `FIELD` en TICK ~79-82 del overlay DOM y `visibleEffects` queda congelado en 35, mientras la película DOM (perfil legacy) sigue hasta TICK 132. Estático: `endTick` por carta = Cont.Punch 45t · Energy Wave 18t · Energy Bomb 23t · 3-Stage 79t (vs canon: melee 100t, beam 152t, stage 80t; el movie DOM: 132-152t; decode Cont.Punch ≈206t). | El `RomPresentationPlayer` termina en `timeline.endTick` y llama `returnToField()` (`RomPresentationPlayer.ts:76-87`), pero los compilers ROM emiten la secuencia inicial y convierten los waits reales en trazas (`WAIT_ANIMATION_FRAME`, `ROM_WAIT` en `TRACE_CUES`, sin efecto), de modo que `endTick` ≪ duración real de la animación. Consumido ≠ visible y además corto. | Compilers (`compileRomPresentationProfile`, `compile*RomCutover`) + `WAIT_ANIMATION_FRAME` sin extender `endTick` + `RomPresentationPlayer.ts` (fin por reloj propio). |
| G3 | **Dos relojes paralelos**: la película DOM legacy (132-152t) y la ruta ROM/Pixi (18-113t) corren a la vez desde el mismo `playCardCinematic`, con totales distintos y `onDone` DOM mandando. | Samples del run rom: overlay DOM `TICK 82…132 / 132` con Pixi ya en `FIELD` (`dom-`/`rom-samples.jsonl`). | `playCardCinematic` inicia ROM player + legacy timeline sin reloj único de presentación. | `src/main.tsx` `playCardCinematic`; single tick authority. |
| G4 | **En el DOM (producción) los beats de plano/cámara no tienen efecto visible**: los eventos `SHOT` se consumen como no-op y `CAMERA` solo produce shake CSS; no hay blanco/corte de entrada ni SCREEN_MOTION. | `main.tsx` `applyEvent` case `'SHOT'`: comentario + sin acción (`~1515`); case `'CAMERA'` → `hitImpact()` = shake CSS 0.3s; capturas DOM en SOLO/DUEL/IMPACT muestran sprites ~100px + labels/fx, sin flash ni corte (`dom-act-01-*.png`). | El DOM no implementa las transiciones que declara; el perfil legacy usa `SHOT` solo informativo. | `src/main.tsx` + `styles.css` (flash/corte real) o migrar a la vía runtime (`buildTimeline` ya emite `CAMERA FLASH_WHITE/CUT/TRACK`… pero nadie los pinta). |
| G5 | **El defensor nunca se hace visible en la ruta ROM/Pixi** (y en DOM aparece de golpe con zoom, sin beat de entrada). | Run rom: `debugState.target.visible=false` TODO el 3-Stage (0→132), incluso en IMPACT; pose del target `idle`/frames slot-1 que avanzan pero invisibles. DOM: defensor aparece en el paso `travel` con `fx-zoom-in .4s` CSS (`styles.css:4705-4708`). | `FIGHTER_VISIBILITY` está en `TRACE_CUES` del adapter → consumido sin efecto (`ProductionRomPresentationAdapter.ts`); los compilers por carta no emiten el cue de entrada del defensor (`canon.defenderIn`: melee 40, stage 34, beam 70 de 80-152t). | Adapter: sacar `FIGHTER_VISIBILITY` de TRACE y aplicarlo; compilers por carta: emitirlo en `defenderIn`. |
| G6 | **La coreografía Stage NO depende del nivel de stage**: 3 y 4 Stage se ven como la MISMA película de 1 golpe (132t), sin la cadena de golpes por comando del GBC. | Samples DOM: `4 stage atk.` con beats idénticos a `3 stage atk.` (SOLO→DUEL@50→IMPACT@97, un único `punch_right`); capturas `dom-act-01-*` (3_Stage vs 4_stage indistinguibles). ROM §164-170: playback `$6BC1` consolida `resolvedCommandCount` por comando; cierre `WAIT 30 → resultado → WAIT 60`. | `profileRush` reutilizado para todo `kind:'command'` (`profiles.ts`), con el mismo timing fijo; el resultado real del QTE no altera la película. | `src/battle/profiles.ts` (perfiles por nº de stage) + sincronizar con `resolvedCommandCount`. |

---

## 3. Tabla por beat auditado

Columnas: **Beat** · **ESPERADO (evidencia)** · **REAL (evidencia)** · **CAUSA RAIZ** · **DÓNDE**.

| Beat | ESPERADO (evidencia) | REAL (evidencia) | Causa raíz | Dónde |
|---|---|---|---|---|
| **Entrada de acción — atacante solo / defensor invisible** | Melee/Stage/Beam: atacante SOLO al inicio, defensor entra en `defenderIn` (melee 40/100, stage 34/80, beam 70/152; `animationCanon.ts`). Doc M8.F0 → INFERRED (canon GBC vacío, ver §7). | DOM: al pulsar la carta, `.card-fx` monta SOLO con actor + vignette; el defensor aparece en `travel` vía CSS `fx-zoom-in .4s` (`dom-act-01-4-3_Stage_Atk_.png` solo atacante). ROM/Pixi: defensor `visible=false` en TODOS los samples del Stage (0→132), incluso IMPACT (`rom-samples.jsonl`). | `FIGHTER_VISIBILITY` = traza no aplicada (adapter); compilers por carta no emiten entrada del target; DOM: sin beat de entrada (zoom CSS). | Adapter `TRACE_CUES`; compilers; `styles.css`. |
| **Robo de carta (draw de Attack Phase)** | +1 carta del mazo al entrar en Attack Phase, 6 transitorio/5 persistente (manual GBC 2026-08-12, `docs/ACTION_FIDELITY.md` §Robo; ROM §48-49: draw 3 inicio, +1 por Attack Phase, mano 5→6 con DISCARD). | Player SÍ: `drawFx` DOM (`draw-card-fly 0.46s`, carta desde −46vw al centro) + SFX `Sfx.draw`; detectado en runtime con la carta real (`aria 'drawing card'`, p.ej. `Endurance 7CC`, logs `dom-samples.jsonl`). Captura mid-flight no lograda (crash de automatización). Enemy: roba `drawOne(eDeckRef)` SIN ninguna animación ni indicador (`main.tsx:2581`). | Implementado solo para el jugador y coincidente con el phase cue ATTACK; el rival roba de forma invisible (su mano no se renderiza). | `main.tsx` `drawJointForAttack` (1247-1263) / `prepareEnemyIncomingAttack` (2579-2600). |
| **Robo de carta del RIVAL al ganar un intercambio** | **PREGUNTA ABIERTA**: sin evidencia en ROM doc (§48-49 solo mano propia), ni en code, ni en memory. La interpretación "ganas → te llevas carta rival" NO está soportada por evidencia del repo; requiere trace/video GBC. | No existe ningún evento/visual de robo sobre la mano rival en la batalla real. | — (sin evidencia) | — |
| **Cambio de plano SOLO → DUEL → PROJECTILE → IMPACT** | GBC: planos explícitos por macro (`$0D` scene config; macros ofensivas contienen `$0D/$0E/$0F/$11`; §234 "SceneDirector debe consumir comandos explícitos; NO `card.type===beam → ACTION` implícito"). | DOM: solo cambia el *label* de la capa `.card-fx` (ACTION→SKILL→IMPACT) + fondo; el plano es siempre el mismo layout de sprites ~100px a los lados (muestras `dom-layer` metrics: `fxFighter` ~105-116×92-102px; capturas `dom-act-01-801` DUEL = misma composición que SOLO salvo label y target). ROM/Pixi: `sceneChanges=1` por acción (solo ACTION_SOLO→FIELD); nunca ACTION_DUEL/IMPACT como escena. | DOM: `viewMode` binario OVERVIEW/ACTION + fx-steps; SHOT del perfil = no-op. ROM: compilers por carta no emiten SCENE intermedios (solo `SCENE_LOAD`). | `main.tsx` (viewMode/shots), compilers. |
| **Cámara — entrada FLASH_WHITE / CUT** | Canon por familia: `entrance: 'FLASH_WHITE'` para melee/stage/beam (blanco GBC, no fade negro) — `animationCanon.ts` (M8.F0, fidelity en disputa, §7). | DOM: sin flash blanco ni corte (solo vignette + fade `fx-scene-in .3s`); capturas de entrada no muestran blanco. ROM/Pixi: el cue `CAMERA` no existe en los timelines compilados por carta; en el adapter genérico `CAMERA FLASH_WHITE → camera(0.15)` = shake casi imperceptible, NO blanco (`ProductionRomPresentationAdapter.ts` case CAMERA). | CAMERA→shake en lugar de flash; ninguna ruta emite un flash real. | Adapter case `CAMERA`; DOM `applyEvent` case `CAMERA`/`SHOT`. |
| **Cámara — SCREEN_MOTION/RESTORE/PATH ($0E/$0F/$11)** | ROM §15/232: `$0E` desplaza pantalla (p.ej. −6×16t en hit beam Kamehameha, §227; `-6 × N ticks` = movimiento de PANTALLA, no del fighter), `$0F` restaura, `$11` path único (Bank7E:$73C5). | 0 emisiones en TODOS los samples (DOM y ROM): `screenMotions=0, screenRestores=0` en el snapshot del adapter en cada beat del Stage; ningún path se ejecuta en la batalla real observada. | La infraestructura existe (`CameraPresenter` completo, cases `SCREEN_MOTION/RESTORE/PATH` en adapter) pero los timelines por carta no emiten estos cues (y buildTimeline runtime tampoco los emite para cards). | Compilers por carta + `buildTimeline.ts`. |
| **Rush físico ($1C) / approach** | ROM §17: `+4px×24t + 2px×1t` = +98px lógicos en 25t con mirror; el approach real corre al plano rival (M8.F1). | DOM: la "carrera" es la animación CSS `fx-rush-body-* .7s steps(9)` del sprite (movimiento de caja, no 25t discretos). ROM/Pixi: `FIGHTER_MOTION` SÍ consumido (`motions=1` en Cont.Punch estático; moveActorByRomMotion con segmentos) — esta parte está implementada y activa en la ruta ROM. | — (ROM ok por diseño; DOM aproxima con CSS). Diferencia de timing CSS vs 25t GBC. | DOM `styles.css` fx-rush (timing). |
| **Preparación Beam ($1E pre-shift −27px/17t)** | ROM §18/233: beam pre-shift −27px en 17t. | Timeline compilado de Energy Wave: `ROM_MACRO:1` (el $1E) como **traza** + `FX_LOAD`; no se aplica desplazamiento: en el adapter `ROM_MACRO`/`FX_LOAD` = registro (`traceCues++`), sin efecto en el actor. | Macros ROM consumidas como trazabilidad, no ejecutadas. | Adapter/compiler (`FX_LOAD`, `ROM_MACRO`), `FIGHTER_MOTION` con el shift del $1E. |
| **Contacto físico — macro $2F (dos WAIT 30)** | ROM §19/215: HIT = 13 comandos con dos pausas explícitas de 30t (~0.502s c/u); la "pausa" está programada. | DOM: un único beat IMPACT con hold breve; muestras DOM muestran `IMPACT` ~tick 97→132 (35t totales de resolución, una sola reacción del defensor `knockback_back`, sin doble hold). | Perfil legacy genérico (1 impacto) vs macro $2F real. | `profiles.ts`/perfiles firma; compilers ROM (que sí declaran `ROM_MACRO $2F` como traza). |
| **HIT vs MISS vs SPECIAL DEFENSE ($2F/$30/$31) distintos** | ROM §19-21/216-217: tres resoluciones físicas con coreografías distintas (variant $13 miss / $14 special). | En la película DOM el resultado no cambia la secuencia visual (el daño sí); no se observó ninguna variante de pose de miss/special en los exchanges jugados. Compilers ROM: `ROM_RESULT_BRANCH` → `impact()` genérico (mismo impacto para toda rama). | `ROM_RESULT_BRANCH` no distingue resultado (sin outcome plumbing — pendiente declarado en `romPresentationForCard.ts` header). | `ROM_RESULT_BRANCH` + outcome del Engine. |
| **Sincronía actor/tick — frames del recurso** | Frame ROM = f(tick) discreto (los FighterActor de Pixi avanzan frame por frame ROM, sync por tick; contrato `BattlePresentation.sync`). | DOM: durante el travel de Energy Bomb el sprite del atacante queda **congelado** en `beam_fire_00` desde TICK 53 hasta 133 (~1.34s; muestras `dbg-domlayer` con mismo `src` en 53/77/106), mientras el proyectil avanza; el defensor guard avanza 00→02 lentamente. | El DOM no avanza frames por tick GBC (pose estática + CSS); los sprites de acción no consumen la secuencia física. | `FighterSprite`/card-fx DOM (frame por tick), o migrar a Pixi. |
| **Dos relojes (ROM vs DOM) en la misma acción** | Un único reloj GBC (contrato M8: "el frame mostrado es f(tick GBC)"). | Con `pixiField`: Pixi vuelve a FIELD en TICK ~79 mientras el overlay DOM (legacy) sigue hasta 132 (`rom-samples.jsonl` líneas 82→132 con `scene=FIELD`). | Dos schedulers con `endTick` distintos (G2/G3). | `playCardCinematic` + `RomPresentationPlayer`. |
| **QTE Stage — ventana/preparación/inputs** | ROM §6-7/§164: ventana global única 50/80/120/150t; prep WAIT20+30. | Funciona: panel `StageHudPanel` canónico con portrait+track+timer, estados PREPARING/INPUT_WINDOW; capturas `ev-qte-preparing.png`, `ev-qte-input-0/1.png`; teclado Q/E/WASD responde (3 inputs correctos completan el 3-Stage en `dom-samples.jsonl`). | — (beat OK). Nota: el fighter visible durante el QTE es el sprite táctico con lunge CSS, no la vista de acción. | — |
| **Stage playback multi-golpe (post-QTE)** | ROM §164-170: playback `$6BC1` = ejecución de los N comandos aceptados (cada uno consolida `resolvedCommandCount`), cierre `WAIT 30 → resultado → WAIT 60`. | 3-Stage y 4-Stage = misma película de 132t con UN golpe (`punch_right`) e IMPACT único (samples + PNGs). El nº de aciertos del QTE no cambia la coreografía visible. | `profileRush` para todo `command`; resultado no plumbed a la presentación. | `profiles.ts`; `resolveStageResult`/`romStagePresentation` (la ruta STAGE_COMMAND sí codifica los comandos en físicos — pero solo visible bajo Pixi y truncada, G2). |
| **Rival con Stage — ¿QTE/counter para el jugador?** | **PREGUNTA ABIERTA** (ver §7): en el GBC no hay evidencia en el repo de qué ve el defensor ante un Stage rival. | En web: el Stage del rival se resuelve solo (AI) y se presenta como película normal; el jugador solo elige defensa (GUARD) antes (`input defense GUARD` en samples). Sin panel ni ventana A/B para el jugador. | — | — |
| **Retorno al campo** | `ACTION_RETURN`: cleanup + paleta + restore TACTICAL (ROM §205). | DOM: `FIELD RETURN` caption + fade `.26s`; la mano/enemigo vuelven. Pixi: `returnToField` ejecuta reset de pose/posición. OK en ambos — pero el retorno Pixi llega antes de tiempo (G2). | — | — |
| **Número de daño / HUD vs impacto** | HUD anclado al contacto (buildTimeline: DAMAGE_APPLIED → `HUD damage_number` en `contactTick`/anchor+26). | DOM: el número sale en `APPLY_DAMAGE` (tick ~100+ en Cont.Punch); el `-11` de Energy Bomb aparece en la captura IMPACT (`dom-layer-005`); sincronizado con la película legacy. | — (la vía legacy usa su propio anclaje; la vía runtime aún no consume el DOM). | — |

---

## 4. Inventario por acción observada — fuente ROM | LEGACY

**Producción por defecto (sin flag)**: `LEGACY` 100 % — no existe renderer ROM montado (G1).

**Run con `?pixiField=1` (misma batalla, mismas acciones)**: 43/43 samples con overlay =
`src=ROM` (adapter presente). Acciones observadas: `3 Stage Atk.` (jugador, tras QTE),
`3 stage atk.`/`4 stage atk.` (rival). 0 acciones LEGACY observadas en el run Pixi
(porque con Pixi la mano del jugador acabó jugando Stage/BASIC — sesgo de la muestra).

**Clasificación estática de las 125 cartas (probe `classify-route.ts`, `npx tsx`)**:

| Ruta ROM (con Pixi) | nº cartas |
|---|---|
| STAGE_COMMAND | 4 |
| STANDARD_DAMAGE | 19 |
| BEAM_BASE | 16 |
| PROJECTILE_SCROLL | 18 |
| BEAM_VARIANT | 4 |
| SPECIAL_HANDLER | 1 |
| SUPPORT_SPECIAL | 22 |
| SUPPORT_FIELD_EFFECT | 25 |
| DEFENSE_RULE | 11 |
| **LEGACY (sin ruta)** | **5**: #9 Special Card · #29 Tail · #41 V-ball Crash · #57 Purple Comet · #58 P.Comet Z |

De la starter deck damage (17 ids únicos), **2 caen LEGACY incluso con Pixi**: Tail (#29) y
V-ball Crash (#41) → ~11.8 % de los picks de mazo inicial seguirían el fallback legacy.
En la batalla real observada, Tail apareció en mano deshabilitado para Gohan (compat) — la
probabilidad real de LEGACY depende de la mano.

En la producción sin flag, la distribución efectiva por acción es la del perfil legacy
(`profileFor(kind, name)` → perfiles firma o genéricos) para el 100 % de las acciones.

---

## 5. Beats que el GBC muestra y NO están implementados (evidencia)

1. **Screen displacement real** (`$0E` −6×16t/-6×19t en hit beam, `$0F` restore, `$11` path)
   — §232/§227/§224-225. Cero emisiones en rutas por carta (adapter: `screenMotions=0` en todo sample).
2. **Transición de entrada FLASH_WHITE (o CUT) visible** — canon `entrance` melee/stage/beam
   (`animationCanon.ts`); DOM: no-op; adapter: shake 0.15.
3. **Entrada del defensor en `defenderIn`** — melee 40, stage 34, beam 70: no aplicada en ninguna ruta.
4. **Playback Stage multi-golpe** (1 golpe por comando aceptado, `$6BC1`, §164-170): 3/4/5/6 Stage
   comparten una película de un golpe.
5. **Holds de 30t de la macro `$2F`** (dos pausas ≈0.502s c/u, §19/215) y **resoluciones físicas
   distintas HIT/MISS/SPECIAL** (`$2F/$30/$31`, variants `$13/$14/$17/$18/$19`, §19-21/215-217/227-230).
6. **Pre-shift beam `$1E` (−27px/17t)** (§18/233): registrado como macro, no aplicado.
7. **Robo visual del ENEMIGO** (ver §4b/§7 — el rival roba carta sin animación; apertura GBC).
8. En la vista DOM además: **frames de pose congelados durante travel** (beam_fire_00 1.34s) —
   el DOM no consume secuencias físicas por tick.

## 6. Beats OK / sin divergencia observada

- QTE del jugador: panel canónico, ventana, teclado, COMPLETED → acción (ev-qte-*).
- Rush ROM `$1C` con segmentos discretos vía `FIGHTER_MOTION` (ruta Pixi) — implementado.
- Damage numbers/HUD con la película legacy.
- Retorno a campo y hand discard (6→5) presentes.

---

## 7. Preguntas abiertas y observaciones

**PREGUNTAS ABIERTAS (sin evidencia en el repo; requieren trace GBC o video):**
1. **¿"Robo de carta del rival" al ganar un intercambio?** Ninguna evidencia: `docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md`
   §48-49 describe solo mano propia (draw 3 + 1 por Attack Phase, 5↔6, DISCARD); `docs/ACTION_FIDELITY.md` "Robo de carta"
   cita el LP ("you draw one in every Attack Phase"); grep de código sin ninguna mecánica de robar cartas ajenas.
   No inventar: queda como beat candidato hasta trace/video.
2. **¿El rival muestra visualmente su robo / su mano en el GBC?** (web: invisible).
3. **Canon M8.F0** (`docs/M8_F0_CINEMATIC_GROUND_TRUTH.md`): el canon GBC está **VACÍO** y marca
   `defenderIn`, `FLASH_WHITE`, entrada, etc. como INFERRED ("canon vacío hasta verificar vídeo"),
   mientras `animationCanon.ts`/`buildTimeline.ts` comentan "gramática VIDEO_VERIFIED (Purple Comet…)"
   sin que exista el registro de verificación → **conflicto interno de fidelidad** a resolver antes
   de dar por buena cualquier coreografía de entrada.
4. **Coreografía exacta del Stage (nº de golpes/poses por stage y por acierto)** en video GBC.
5. **Comportamiento del defensor ante Stage rival** (¿ventana A/B de counter en el GBC?).

**Observaciones incidentales (con evidencia, sin diagnóstico visual):**
- `src/data/unlocks.ts:9` exporta `UNLOCK_KEY = '***'` literal (presente desde el commit inicial
  `ac6f23ab`, 2026-08-10, y en HEAD): todo el progreso/desbloqueos persiste bajo la clave literal
  `***`. Funciona, pero rompe seeds externos y es frágil ante limpiezas de localStorage.
- Crashes intermitentes bajo automatización: `Minified React error #520` en
  `assets/main-DPYeeZWh.js:49:67001` (componente `Yb`), ~4 de 8 sesiones de probe, en distintos
  puntos (boot/story/combate), sin repro manual; no identificado el componente (build minificado,
  sin sourcemap consultado). No se atribuye a los cambios de HEAD.

---

## 8. Archivos de evidencia

`docs/audits/BATTLE_VISUAL_FIDELITY_DIAGNOSIS_2026-09-05.md` (este informe) + capturas/logs en
`.tmp/battle-visual-audit/`:

**DOM (producción, `?debugCinematics=1&debugState=1`):**
- `dom-02-battle-ready.png` — campo táctico inicial (OVERVIEW, tick 0).
- `dom-act-01-4-3_Stage_Atk_.png` · `dom-act-01-801-3_Stage_Atk_.png` · `dom-act-01-1631-3_Stage_Atk_.png`
  — Stage 3 del jugador: SOLO (tick 7) → DUEL (~53) → IMPACT (~97/132).
- `dom-act-01-362-4_stage_atk_.png` · `dom-act-01-1104-4_stage_atk_.png` — Stage 4 del rival con GUARD.
- `dom-layer-000…006.png` — Energy Bomb del jugador: SOLO beam_charge / PROJECTILE travel / IMPACT / FIELD RETURN.
- `dom-draw-01-60741.png` — instante con `.draw-fx` activo (aria `drawing card`; frame en vuelo no capturado).
- `dom-samples.jsonl` — muestras overlay por beat (action/shot/tick/poses/next event + state overlay).

**ROM/Pixi (`&pixiField=1`):**
- `rom-act-01-3-3_Stage_Atk_.png` · `rom-act-01-453-3_Stage_Atk_.png` — fighter grande Pixi en ACTION_SOLO.
- `rom-act-01-1268-3_Stage_Atk_.png` · `rom-98-end.png` — vuelta a FIELD (~tick 79-84) antes del fin del movie DOM.
- `rom-samples.jsonl` — 43 samples con `bridge` (adapter source/counters + `debugState`: scene, poses,
  visibilidad, frames, cámara) — fuente del hallazgo del defensor invisible y del retorno prematuro.

**QTE:** `ev-qte-preparing.png`, `ev-qte-input-0.png`, `ev-qte-input-1.png`.

**Probes:** `probe.mjs` (dom|rom), `dbg-domlayer.mjs`, `dbg-evidence.mjs`, `dbg-draw.mjs`,
`classify-route.ts` (clasificación 125 cartas).
