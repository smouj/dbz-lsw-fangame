# Dynamic Film Tracker — por causa raíz (P0.2)

> Archivo GENERADO por `scripts/build-dynamic-film-tracker-doc.ts` sobre datos vivos
> (bindings · profiles · runtime_cutover.json · FX corpus). NO editar a mano.
> Gate: `npm run verify:dynamic-film-tracker` (en verify:ci). Fuente única: `scripts/dynamicFilmTrackerCore.ts`.

HEAD: `596fa97906927bddf8ce422779abea754c8d6f96`

## Invariantes

- Cada **occurrence** (selector track `DYNAMIC_PENDING`) cae EXACTAMENTE en una causa A-G.
- Cada **film** (profile `completion.dynamic === PENDING_ROM_TRACE`) cae EXACTAMENTE en una causa A-G.
- `UNKNOWN_REASON == 0` (cause G): 0 pendientes SIN explicación. Una fila sin evidencia
  clasificatoria sería G genuino — nunca un pendiente genérico sin documentar.
- `UNTRACKED_DYNAMIC_PENDING == 0`: ningún pending vivo sin fila en este tracker, y viceversa.

## Matriz por causa

| Causa | Nombre | Handler/worker implicado | Resource | Sequence | Blocker (qué cierra) | Films | Occurrences |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **A** | Beam/window SCX/SCY + tick timing | $02-$07 beams/proyectiles (B3:$5776/$5B38/$5AC7/$5B9E/$5DFE) | fx windows (tilebank BG $9800) | — | SFX-V4-05 per-scanline (LY 23-95) → cablear scroll | 0 | 38 |
| **B** | Multi-actor ownership/spatial choreography | $0D/$0E MULTI_ACTOR_SCRIPT (B3:$5C04/$5D0C) | fx $01/$04/$27/$6F helper | — | Trace FSM worker $5C04/$5D0C (ownership helper) | 15 | 15 |
| **C** | Contact/anchors rush-impact-defender | $0A standard damage (cerrado P0.1) | — | — | — | 0 | 0 |
| **D** | Dynamic branch runtime (result-branch/FSM + selección de secuencia del actor) | filas actor $00/$07 + films $0B/$08/$0C (B3:$61C5/$5E67/$62D4) | actor $62-$64 ($12/$18/$21/$24/$26/$27/$33...) + fx films | 0-N cerradas | Trace FSM/branch por worker → promover selector | 11 | 16 |
| **E** | Screen path/motion workers ROM | SCREEN_PATH/motion workers | — | — | — | 0 | 0 |
| **F** | Palette/FX timing — dominio FX de soporte/categoría | $00 STAGE_OR_RULE + soportes/items $02-utility (SUPPORT/DEFENSE) | fx $01/$02/$04/$06/$08 no-ofensivos | — | Corpus FX soporte: SEPARATE_DOMAIN/UNRESOLVED | 0 | 37 |
| **G** | Unknown genuine (sin evidencia clasificatoria) | — | — | — | — | 0 | 0 |

**Totales: 106 occurrences · 26 films.**

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
fx row   + card con ROM_FX_WINDOW en runtime_cutover.json → A
actor row (N seqs físicas cerradas, selección por handler) → D
fx row   + fuera del runtime cutover:
    card ∈ films (26) y worker MULTI_ACTOR_SCRIPT $5C04/$5D0C → B
    card ∈ films y worker TAIL $61C5 / SPECIAL $5E67 / BUU_BALL $62D4 → D
    card ∉ films (SUPPORT_OR_FIELD_EFFECT/DEFENSE_RULE/...)     → F
C/E sin occurrences en este slice; G = 0 (todo clasificado con evidencia).
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

## Occurrences (106) — resumen por causa

### A — 38 occurrences

7 Energy Wave (fx) · 8 Energy Bomb (fx) · 10 Masenko (fx) · 12 Kamehameha (fx) · 13 S.Kamehameha (fx) · 14 F.Kamehameha (fx) · 17 S.Beam Can. (fx) · 18 F.Lightbomb (fx) · 20 Misty KiWave (fx) · 21 Destruct-Disk (fx) · 22 S.Destruc-D. (fx) · 24 Spirit Bomb (fx) · 30 Galick-Ho (fx) · 31 Big Bang Atk (fx) · 32 Final Flash (fx) · 35 Burning Atk. (fx) · 36 Fin.Buster (fx) · 38 Kamekameha (fx) · 39 Galactica D. (fx) · 40 S.G.K.Atk. (fx) · 44 Flash.Sword (fx) · 47 KiBlast Bomb (fx) · 48 Lightning C. (fx) · 49 Telekinesis (fx) · 50 M.Soundwave (fx) · 54 Eraser Can. (fx) · 56 Crasher Ball (fx) · 62 Body Change (fx) · 63 Finger Beam (fx) · 64 Super E-Ball (fx) · 65 Grand Wave (fx) · 67 Eye Beam (fx) · 69 Rocket Punch (fx) · 70 Hell Flash (fx) · 72 Energy Slash (fx) · 73 Energy Slice (fx) · 80 Potbelly Atk (fx) · 82 Sweet Beam (fx)

### B — 15 occurrences

42 Kiai (fx) · 51 Paralysis (fx) · 57 Purple Comet (fx) · 58 P.Comet Z (fx) · 83 Bulma (fx) · 84 Chaiotzu (fx) · 87 Kaio (fx) · 91 Supreme Kai (fx) · 93 Babidi (fx) · 95 Yakon (fx) · 96 Scouter (fx) · 101 Gravity Dev. (fx) · 103 Sealed Ball (fx) · 113 Heart Virus (fx) · 115 Sandglass (fx)

### D — 16 occurrences

19 Taiyoken (actor) · 21 Destruct-Disk (actor) · 22 S.Destruc-D. (actor) · 39 Galactica D. (actor) · 41 V-ball Crash (fx) · 45 Barrier (actor) · 53 Breath (actor) · 64 Super E-Ball (actor) · 85 Tien (fx) · 86 Yajirobe (fx) · 90 Hercule (fx) · 94 Dabura (fx) · 98 Stop Device (fx) · 110 Gamebomb (fx) · 112 H's Choco. (fx) · 116 Naughty Book (fx)

### F — 37 occurrences

16 Resurrection (fx) · 19 Taiyoken (fx) · 23 Kaio Ken (fx) · 26 Teleport. (fx) · 27 Sup.Saiyan-2 (fx) · 28 Sup.Saiyan-3 (fx) · 45 Barrier (fx) · 52 Time Freeze (fx) · 53 Breath (fx) · 59 Speed Up (fx) · 68 Lock On (fx) · 76 Energy Absorb (fx) · 79 Flesh Guard (fx) · 88 Dende (fx) · 89 Guru (fx) · 92 Kibito (fx) · 97 Caps. Fridge (fx) · 99 Life Preser. (fx) · 100 Medical Mac. (fx) · 102 Ene.Absorber (fx) · 104 Trunks Sword (fx) · 105 Dabura Spear (fx) · 106 Light Vest (fx) · 107 Btl. Jacket (fx) · 108 New-B Jacket (fx) · 109 Sunglasses (fx) · 111 Champ.Belt (fx) · 114 Heart Medi. (fx) · 117 Full Spirit (fx) · 118 Afterimage (fx) · 119 Reading Ki (fx) · 120 Feint (fx) · 121 Endurance (fx) · 122 Telepathy (fx) · 123 Foresight (fx) · 124 Shockwave (fx) · 125 Avoiding (fx)

Detalle fila a fila (cardId · handler · resource · sequence · reasonCode · evidenceStatus · blocker · evidence):
ver `dynamic-film-tracker.csv` (106 filas occurrence + 26 filas film) — columnas como exige el gate.

## Hallazgo causa A (SFX-V4-05 → siguiente paso SFX-V4-06)

El mecanismo NO es cerrable en este slice con la infra actual: la prueba per-scanline
(LY 23-95) no está capturada y la fórmula SCY=low($C407)+C405 / SCX=low($C409)+C406 no
está demostrada en vivo (el muestreo 1/frame del trace existente no alcanza: SCX/SCY a
frame-boundary = 0; el delta vive solo dentro de la ventana HBlank).

- Ya trazado (kame-trace-01.json, commit aab761e5): card 12 Kamehameha LEFT — C405=0xFC (-4),
  C406=0x57 (+87) escritos en vivo (t389) coinciden con la fila del selector (7811a8ea).
- Siguiente paso concreto: captura per-scanline LY 23-95 (SCY=low($C407)+C405,
  SCX=low($C409)+C406), RIGHT/side2 (C406=0xA9 -87), handler $07 rows 3-10 LEFT/RIGHT,
  FIRST/LAST_SCROLL_CHANGE + RESTORE_TICK → entonces conectar
  `loadBeamBgOffsets`/`getBeamFrameDeltas` a consumidores y retirar las 38 occurrences A.
