# Dynamic Film Tracker — por causa raíz (P0.2)

> Archivo GENERADO por `scripts/build-dynamic-film-tracker-doc.ts` sobre datos vivos
> (bindings · profiles · runtime_cutover.json · FX corpus). NO editar a mano.
> Gate: `npm run verify:dynamic-film-tracker` (en verify:ci). Fuente única: `scripts/dynamicFilmTrackerCore.ts`.

## Invariantes

- Cada **occurrence** (selector de actor o ventana FX realmente pendiente) cae EXACTAMENTE en una causa A-G.
- Las pistas `NON_SEQUENCE_DISPLAY` no cuentan como selección dinámica: pertenecen a la gramática de display/FX.
- Cada **film** (profile `completion.dynamic === PENDING_ROM_TRACE`) cae EXACTAMENTE en una causa A-G.
- `UNKNOWN_REASON == 0` (cause G): 0 pendientes SIN explicación. Una fila sin evidencia
  clasificatoria sería G genuino — nunca un pendiente genérico sin documentar.
- `UNTRACKED_DYNAMIC_PENDING == 0`: ningún pending vivo sin fila en este tracker, y viceversa.

## Matriz por causa

| Causa | Nombre | Handler/worker implicado | Resource | Sequence | Blocker (qué cierra) | Films | Occurrences |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **A** | Beam/window SCX/SCY + tick timing | $02-$07 beams/proyectiles (B3:$5776/$5B38/$5AC7/$5B9E/$5DFE) | fx windows (tilebank BG $9800) | — | SFX-V4-05 per-scanline (LY 23-95) → cablear scroll | 0 | 38 |
| **B** | Multi-actor ownership/spatial choreography | $0D/$0E MULTI_ACTOR_SCRIPT (B3:$5C04/$5D0C) | fx $01/$04/$27/$6F helper | — | Trace FSM worker $5C04/$5D0C (ownership helper) | 15 | 0 |
| **C** | Contact/anchors rush-impact-defender | $0A standard damage (cerrado P0.1) | — | — | — | 0 | 0 |
| **D** | Dynamic branch runtime (result-branch/FSM + selección de secuencia del actor) | filas actor Defense $00 + films $0B/$08/$0C (B3:$61C5/$5E67/$62D4) | actor slot8 $24/$26/$27 + fx films | 0-N cerradas | Trace FSM/branch por worker → promover selector | 11 | 1 |
| **E** | Screen path/motion workers ROM | SCREEN_PATH/motion workers | — | — | — | 0 | 0 |
| **F** | Palette/FX timing — dominio FX de soporte/categoría | $00 STAGE_OR_RULE + soportes/items $02-utility (SUPPORT/DEFENSE) | fx $01/$02/$04/$06/$08 no-ofensivos | — | Corpus FX soporte: SEPARATE_DOMAIN/UNRESOLVED | 0 | 0 |
| **G** | Unknown genuine (sin evidencia clasificatoria) | — | — | — | — | 0 | 0 |

**Totales: 39 occurrences · 26 films.**

## Causas — descripción y provenance de evidencia

### A — Beam/window SCX/SCY + tick timing

ROM_FX_WINDOW de beams/proyectiles ya emitido (static complete) pero scroll base SCX/SCY ($C407/$C409 + C405/C406) y tick timing/cleanup siguen PENDING_ROM_TRACE.

- Evidence provenance: generated/rom-fx/runtime_cutover.json → rows[cardId].playerWindows[].scroll/timing.status === PENDING_ROM_TRACE (evidencia SFX-V4-05).

### B — Multi-actor ownership/spatial choreography

Films SPECIAL_HANDLER con worker MULTI_ACTOR_SCRIPT (Bank3:$5C04/$5D0C, handlers $0D/$0E): el FX/actor helper no tiene dueño ni ancla espacial trazado frente al target.

- Evidence provenance: RomActionExecutionDescriptor.execution.workerFamily === MULTI_ACTOR_SCRIPT; profile kind SPECIAL_HANDLER; pending "special handler result branch ... inter-phase state transitions".

### C — Contact/anchors rush-impact-defender

Contacto/anclas del rush-impact contra el defensor (familia STANDARD_DAMAGE/contacto). Sin occurrences abiertas en este slice: familia selector-closed en P0.1.

- Evidence provenance: —

### D — Dynamic branch runtime (result-branch/FSM + selección de secuencia del actor)

Result-branch HIT/MISS/GUARD + transiciones inter-fase del FSM del special handler, o selección runtime de secuencia entre N cerradas del actor.

- Evidence provenance: profile completion.pending "special handler result branch (HIT/MISS/GUARD) and inter-phase state transitions remain dynamic trace territory"; selector evidence "N physical sequences are closed; handler $XX selection semantics are not promoted".

### E — Screen path/motion workers ROM

Workers de screen path / ROM motion sin cablear. Sin occurrences abiertas en este slice (SCREEN_PATH_TABLE estático; FIGHTER_MOTION cerrado).

- Evidence provenance: —

### F — Palette/FX timing — dominio FX de soporte/categoría

FX visuals fuera del corpus ofensivo (sin bundle (fx,palette) en el runtime cutover): auras/soportes/efectos de cartas SUPPORT/DEFENSE/regla. El corpus lo declara abierto.

- Evidence provenance: ROM_FX_CORPUS_SUMMARY.statuses: supportVisuals SEPARATE_DOMAIN · supportAuraBlue/gatherPowerAuraOrange UNRESOLVED; ausencia de bundle en runtime_cutover.json.

### G — Unknown genuine (sin evidencia clasificatoria)

Solo si una fila no se puede clasificar con evidencia. HOY: 0 — toda fila traza a ROM o a un archivo generado verificado.

- Evidence provenance: —

## Regla de clasificación (determinista, en el core)

```
ROM_FX_WINDOW con scroll/timing PENDING_ROM_TRACE          → A
actor row (N seqs físicas cerradas, selección por handler) → D
films SPECIAL_HANDLER: MULTI_ACTOR_SCRIPT → B; restantes → D
Las pistas FX/display no son selectores de secuencia y no crean occurrences.
C/E/F sin occurrences en este slice; G = 0 (todo clasificado con evidencia).
```

## Films dinámicos (26)

| Card | Name | Handler | Worker | Family | Causa | reasonCode |
| --- | --- | --- | --- | --- | --- | --- |
| 29 | Tail | $0b | Bank3:$61C5 | TAIL | **D** | `SPECIAL_RESULT_BRANCH_FSM_OPEN` |
| 33 | Suicide | $08 | Bank3:$5E67 | SPECIAL | **D** | `SPECIAL_RESULT_BRANCH_FSM_OPEN` |
| 41 | V-ball Crash | $0c | Bank3:$62D4 | BUU_BALL | **D** | `SPECIAL_RESULT_BRANCH_FSM_OPEN` |
| 42 | Kiai | $0d | Bank3:$5C04 | MULTI_ACTOR_SCRIPT | **B** | `MULTI_ACTOR_HELPER_OWNERSHIP_OPEN` |
| 51 | Paralysis | $0d | Bank3:$5C04 | MULTI_ACTOR_SCRIPT | **B** | `MULTI_ACTOR_HELPER_OWNERSHIP_OPEN` |
| 57 | Purple Comet | $0d | Bank3:$5C04 | MULTI_ACTOR_SCRIPT | **B** | `MULTI_ACTOR_HELPER_OWNERSHIP_OPEN` |
| 58 | P.Comet Z | $0e | Bank3:$5D0C | MULTI_ACTOR_SCRIPT | **B** | `MULTI_ACTOR_HELPER_OWNERSHIP_OPEN` |
| 83 | Bulma | $0d | Bank3:$5C04 | MULTI_ACTOR_SCRIPT | **B** | `MULTI_ACTOR_HELPER_OWNERSHIP_OPEN` |
| 84 | Chaiotzu | $0d | Bank3:$5C04 | MULTI_ACTOR_SCRIPT | **B** | `MULTI_ACTOR_HELPER_OWNERSHIP_OPEN` |
| 85 | Tien | $0b | Bank3:$61C5 | TAIL | **D** | `SPECIAL_RESULT_BRANCH_FSM_OPEN` |
| 86 | Yajirobe | $0b | Bank3:$61C5 | TAIL | **D** | `SPECIAL_RESULT_BRANCH_FSM_OPEN` |
| 87 | Kaio | $0d | Bank3:$5C04 | MULTI_ACTOR_SCRIPT | **B** | `MULTI_ACTOR_HELPER_OWNERSHIP_OPEN` |
| 90 | Hercule | $0b | Bank3:$61C5 | TAIL | **D** | `SPECIAL_RESULT_BRANCH_FSM_OPEN` |
| 91 | Supreme Kai | $0d | Bank3:$5C04 | MULTI_ACTOR_SCRIPT | **B** | `MULTI_ACTOR_HELPER_OWNERSHIP_OPEN` |
| 93 | Babidi | $0d | Bank3:$5C04 | MULTI_ACTOR_SCRIPT | **B** | `MULTI_ACTOR_HELPER_OWNERSHIP_OPEN` |
| 94 | Dabura | $0b | Bank3:$61C5 | TAIL | **D** | `SPECIAL_RESULT_BRANCH_FSM_OPEN` |
| 95 | Yakon | $0d | Bank3:$5C04 | MULTI_ACTOR_SCRIPT | **B** | `MULTI_ACTOR_HELPER_OWNERSHIP_OPEN` |
| 96 | Scouter | $0d | Bank3:$5C04 | MULTI_ACTOR_SCRIPT | **B** | `MULTI_ACTOR_HELPER_OWNERSHIP_OPEN` |
| 98 | Stop Device | $0b | Bank3:$61C5 | TAIL | **D** | `SPECIAL_RESULT_BRANCH_FSM_OPEN` |
| 101 | Gravity Dev. | $0d | Bank3:$5C04 | MULTI_ACTOR_SCRIPT | **B** | `MULTI_ACTOR_HELPER_OWNERSHIP_OPEN` |
| 103 | Sealed Ball | $0d | Bank3:$5C04 | MULTI_ACTOR_SCRIPT | **B** | `MULTI_ACTOR_HELPER_OWNERSHIP_OPEN` |
| 110 | Gamebomb | $0b | Bank3:$61C5 | TAIL | **D** | `SPECIAL_RESULT_BRANCH_FSM_OPEN` |
| 112 | H's Choco. | $0b | Bank3:$61C5 | TAIL | **D** | `SPECIAL_RESULT_BRANCH_FSM_OPEN` |
| 113 | Heart Virus | $0d | Bank3:$5C04 | MULTI_ACTOR_SCRIPT | **B** | `MULTI_ACTOR_HELPER_OWNERSHIP_OPEN` |
| 115 | Sandglass | $0d | Bank3:$5C04 | MULTI_ACTOR_SCRIPT | **B** | `MULTI_ACTOR_HELPER_OWNERSHIP_OPEN` |
| 116 | Naughty Book | $0b | Bank3:$61C5 | TAIL | **D** | `SPECIAL_RESULT_BRANCH_FSM_OPEN` |

## Occurrences (39) — resumen por causa

### A — 38 occurrences

7 Energy Wave (fx-window) · 8 Energy Bomb (fx-window) · 10 Masenko (fx-window) · 12 Kamehameha (fx-window) · 13 S.Kamehameha (fx-window) · 14 F.Kamehameha (fx-window) · 17 S.Beam Can. (fx-window) · 18 F.Lightbomb (fx-window) · 20 Misty KiWave (fx-window) · 21 Destruct-Disk (fx-window) · 22 S.Destruc-D. (fx-window) · 24 Spirit Bomb (fx-window) · 30 Galick-Ho (fx-window) · 31 Big Bang Atk (fx-window) · 32 Final Flash (fx-window) · 35 Burning Atk. (fx-window) · 36 Fin.Buster (fx-window) · 38 Kamekameha (fx-window) · 39 Galactica D. (fx-window) · 40 S.G.K.Atk. (fx-window) · 44 Flash.Sword (fx-window) · 47 KiBlast Bomb (fx-window) · 48 Lightning C. (fx-window) · 49 Telekinesis (fx-window) · 50 M.Soundwave (fx-window) · 54 Eraser Can. (fx-window) · 56 Crasher Ball (fx-window) · 62 Body Change (fx-window) · 63 Finger Beam (fx-window) · 64 Super E-Ball (fx-window) · 65 Grand Wave (fx-window) · 67 Eye Beam (fx-window) · 69 Rocket Punch (fx-window) · 70 Hell Flash (fx-window) · 72 Energy Slash (fx-window) · 73 Energy Slice (fx-window) · 80 Potbelly Atk (fx-window) · 82 Sweet Beam (fx-window)

### D — 1 occurrences

19 Taiyoken (actor)

Detalle fila a fila (cardId · handler · resource · sequence · reasonCode · evidenceStatus · blocker · evidence):
ver `dynamic-film-tracker.csv` (39 filas occurrence + 26 filas film) — columnas como exige el gate.

## Hallazgo causa A (SFX-V4-05 → siguiente paso SFX-V4-06)

La infraestructura nativa Windows ya captura cada cambio de LY durante ejecución real
de la ROM España. Esto demuestra los deltas que viven dentro de HBlank aunque SCX/SCY
vuelvan a cero en el boundary del frame. La familia sigue abierta por cobertura, no por tooling.

- Handler $02: Kamehameha LEFT y S.Beam Can. RIGHT demuestran ventanas raster 80f,
  travel 16f con dirección por lado y restore explícito.
- Handler $05 LEFT: Energy Bomb demuestra 2f de preparación, screen motion -6×19,
  restore y travel 16f. Fixture y hash del raw quedan fijados por el gate.
- Siguiente paso: escenario legal same-card LEFT/RIGHT y representantes $03/$04/$06/$07;
  solo entonces generalizar familias y retirar las occurrences que cubra la evidencia.
