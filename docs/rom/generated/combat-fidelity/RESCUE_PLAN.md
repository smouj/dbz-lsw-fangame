# COMBAT FIDELITY RESCUE — Audit & Cutover Plan

**Fecha**: 2026-08-24 · **Estado**: P0 en curso · **Verifier**: `npm run verify:combat-fidelity`

## 0. ⚠️ CORRECCIÓN CRÍTICA (audit runtime real — 2026-08-24)

El audit previo asumía que `buildTimeline.ts → BattlePresenter → RomDisplayPresenter`
era el renderer de producción de acciones. **NO es cierto.**

**El renderer de producción de ACCIONES es LEGACY:**
```
main.tsx playCardCinematic(card, side, onDone)
  → kind = beam | damage | command | support_offensive | support
  → profile = profileFor(kind, card.name)        // battle/timeline.ts (LEGACY)
  → applyEvent(e) → applyCinematicEvent(pixiPres, e)  // CinematicAdapter
  → PixiBattlePresentation (Graphics procedurales + easeOutCubic)
```

**El pipeline ROM (`buildPresentationTimeline → presenter.consume`) en producción SOLO
consume cues `POSITION_CHANGED` / `GUARD_STARTED` (MOVE/GUARD, M8.C1).**
El `presenter` de `main.tsx` (~línea 836) ignora todos los cues de acción.
`RomDisplayPresenter`/`RomDisplayLayer` existen dentro de `PixiBattlePresentation`,
pero **nadie llama `romDisplayPresenter.consume()` en producción** — solo Dev Studio
(`devtools/romdisplay2`, `runtimePlayground`).

**Consecuencia:** los cutovers "cableados" $0A/$02 en `buildTimeline.ts` producen cues
que la producción IGNORA (cero efecto visual). Cablear `supportRomCutover` en
`buildTimeline.ts` NO cambiaría nada visible.

**C1.1 real = enrutar la presentación de acciones de producción por el camino ROM.**
Dos opciones (decisión pendiente):
- (a) `playCardCinematic` → sustituir `profileFor(kind, name)` (LEGACY) por datos
  ROM-derived, renderizando cues ROM en Pixi.
- (b) Extender `PixiBattlePresentation` para consumir cues ROM
  (`romDisplayPresenter.consume`) y enrutar `BattleRuntime.timeline` COMPLETO
  (no solo MOVE/GUARD) al presenter de producción.

Esto es un lift arquitectónico mayor que "wire support cutover".

## 1. El problema (dos sistemas de presentación en paralelo)

El proyecto tiene DOS pipelines de presentación de combate coexistiendo:

### A. LEGACY (inventada/inferida)
```
cards.ts → cardPoses.ts (tipo→pose genérica)
        → actionProfiles.ts (timings INFERRED: charge 54 / spawn 48 / contact 108)
        → cardsCinematic.ts (plantillas T01–T12, referencia semántica)
        → timeline.ts (CinematicTrack: SHOT/ACTOR_POSE/PROJECTILE/…)
        → PixiBattlePresentation (proyectiles Graphics procedurales, rush easeOutCubic)
```

### B. ROM (evidencia real, parcialmente cableada)
```
romCardData → romActionExecutionDescriptors (handler $00–$0F)
           → romPresentationProfiles (kind/resultBranches/completion)
           → romPresentationCompiler → PresentationCue[] (ANIMATION_START, ACTION_OBJECT_FRAME, …)
           → createCuePresenter → RomDisplayPresenter / RomDisplayLayer (V7.8)
```

**El runtime (`buildTimeline.ts`) SOLO cablea la ruta ROM para 2 handlers:**
- `$0A` → `compileStandardDamageRuntimeCutover` (STANDARD_DAMAGE)
- `$02` → `compileBeamBaseRuntimeCutover` (BEAM_BASE)

Todo lo demás cae al camino LEGACY, aunque el descriptor ROM exista.

## 2. Baseline medido (verify:combat-fidelity)

```
cards = 125
ROM_STANDARD_DAMAGE = 19   (handler $0A)
ROM_BEAM_BASE       = 38   (handler $02)
ROM_BACKED_TOTAL    = 57
LEGACY              = 68   ← 54% sigue por camino inferido
proceduralFallback  = 22   ← beams LEGACY dibujados con Graphics
```

### Handlers sin cablear (todos tienen descriptor + perfil ROM)
| handler | cards | familia | acción |
|---------|-------|---------|--------|
| $03     | 3     | BEAM_VARIANT (release frame 5) | extender beam cutover |
| $04     | 1     | BEAM_VARIANT (release frame 17) | extender beam cutover |
| $05     | 10    | PROJECTILE_SCROLL (screen -6×19t + flag) | extender beam cutover |
| $06     | 1     | PROJECTILE_SCROLL (screen -6×16t + flag) | extender beam cutover |
| $07     | 7     | PROJECTILE_SCROLL (path) | extender beam cutover |
| $08     | 1     | SPECIAL_HANDLER (Suicide) | especial |
| $0B     | 9     | SPECIAL_HANDLER (summon) | support cutover |
| $0C     | 1     | SPECIAL_HANDLER (V-ball) | especial |
| $0D     | 14    | SPECIAL_HANDLER (support) | support cutover |
| $0E     | 1     | SPECIAL_HANDLER (P.Comet Z) | multi-actor |
| $0F     | 1     | SPECIAL_HANDLER (Ene.Absorber) | especial |
| $00     | 19    | command/defense/no-handler | stage + defense cutover |

## 3. Archivos legacy a marcar (no borrar aún)

| archivo | marca |
|---------|-------|
| `src/battle/actionProfiles.ts` | `LEGACY_INFERRED_PRESENTATION` |
| `src/battle/cardPoses.ts` | `LEGACY_SEMANTIC_FALLBACK` |
| `src/data/cardsCinematic.ts` | `LEGACY_SEMANTIC_REFERENCE` |
| `src/renderer/pixi/presentation/PixiBattlePresentation.ts` (proyectiles Graphics + easeOutCubic) | `LEGACY_RENDERER` |

Regla: si existe descriptor ROM → la ruta ROM es obligatoria. Fallback `REMAKE_FALLBACK` solo donde ROM esté realmente pendiente.

## 4. Orden de cutover (próximos pasos)

> ⚠️ **Reordenado tras el audit runtime (§0).** Antes de cablear handlers al
> timeline ROM hay que enrutar el RENDERER de producción por ese timeline.
> Sin eso, cualquier cutover en `buildTimeline.ts` es invisible.

0. **Enrutar el renderer de producción por ROM** (opción (a) o (b) de §0):
   `playCardCinematic` deja de construir el `CinematicProfile` LEGACY y consume
   `BattleRuntime.timeline` (ROM cues) → `PixiBattlePresentation`.
1. **Extender beam cutover** de $02 a $03–$07 (mismo motor $5776, perfiles LaunchProfile distintos). Cablea +22 beams. → objetivo: 0 beams procedurales.
2. **Cablear support cutover** (`supportRomCutover.ts` ya existe, sin cablear): handlers $0B/$0D/$0F.
3. **Defense cutover**: handler $00 + DEFENSE_RULE (11 cartas).
4. **Stage/command cutover**: handler $00 + stage QTE (4 cartas).
5. **Special handlers** $08/$0C/$0E.
6. **Retirar proyecto procedural** (Graphics + easeOutCubic) cuando no quede beam sin FX ROM.
7. **Renderer único Pixi**: cerrar duplicidad DOM/CSS.

## 5. Golden Combat Set (antes del sweep 125/125)

3 Stage · Cont.Punch · Cont.Kick · Kamehameha · Energy Bomb · Destruct-Disk ·
Gather Power · Guard · Move H · Move V · CHARA · Support · Defense Card · LIMIT · KO.

## 6. Artefactos

- `scripts/verify-combat-fidelity.ts` — matriz + gate.
- `docs/rom/generated/combat-fidelity/fidelity-matrix.json` — baseline regenerado.

## 7. S-OW1 canonizado

- S-OW1A ACTION Gather: CLOSED (actor STATIC + FX $1A + paleta $33).
- S-OW1B power visual: CLOSED (`TACTICAL_POWER_STATE_VISUAL = NONE`).
- S-OW1C overworld grammar: PACKAGE_VERIFIED (chibi tiene marcha 4-dir ×2 + idle).
- OW ROM exact engine: **DEFERRED** (no desbloquea jugabilidad ahora).
