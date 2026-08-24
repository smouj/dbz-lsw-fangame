# ROM Presentation Compiler

> **V4 SUPERSEDES (2026-08-23)**: ver
> `docs/rom/research-v4-fx/AGENT_HANDOFF_V4.md`. El compiler debe representar
> opcode `$0C` como `ROM_FX_WINDOW` (copia inmediata de ventana BG tilemap) y
> opcode `$0D` como offsets de pantalla/camara, sin convertirlos en anchors.
> `FX_LOAD` solo ya no basta para Beam fisico.

Estado: infraestructura inicial cerrada.

Esta capa compila perfiles ROM literales hacia una timeline de `PresentationCue` sin resolver semantica visual:

```text
RomPresentationProfile
-> compileRomPresentationProfile()
-> ROM-level PresentationCue[]
-> BattleTimeline
```

Fuente programatica: `src/battle/romPresentationCompiler.ts`.

## Guardrails

- 125/125 perfiles son compilables.
- El compilador deriva solo de `romPresentationProfiles.ts`.
- No importa `cards`, `cardsCinematic` ni `actionProfiles`.
- No introduce `BASE_X`, `BASE_Y`, anchors, coordenadas absolutas ni slot bindings.
- No emite poses semanticas (`beam_charge`, `attack_fwd`, `idle`, `hurt`, etc.).
- No transforma movimientos ROM en lerp/easing.
- Los movimientos discretos conservan `segments`.
- FX y palette salen de las dependencias del profile.
- Las ramas salen de `resultBranches`, no de un switch por carta.
- `PENDING_STATIC_DECODE` y `PENDING_ROM_TRACE` se conservan como `ROM_PENDING`.

## Cues ROM

El compiler usa los cues ROM existentes y los amplia solo donde hacia falta:

```text
SCENE_LOAD
ROM_MACRO
ROM_WAIT
FIGHTER_MOTION     (con segments discretos)
ANIMATION_START
WAIT_ANIMATION_FRAME
FX_LOAD            (resource + palette)
ROM_AUDIO_SCRIPT
SCREEN_MOTION
ROM_RESULT_BRANCH
ROM_PENDING
```

Esto no es todavia Pixi ni cinematica semantica. Es el puente auditable entre la gramatica ROM y la futura adopcion del runtime.

## Estado actual

El verificador reporta:

```text
cards=125
compilable=125
semanticCueLeaks=0
```

Los valores de `complete`, `partial`, `dynamicPending`, `totalCues`, `timelinesWithMotion`, `timelinesWithBranches` y `pendingCues` se derivan en runtime desde `romPresentationCompilerSummary()`.

## Verificador

```bash
npm run verify:rom-presentation-compiler
```

Comprueba determinismo, ticks enteros, orden estable, motion discreto, ausencia de semantica visual inventada, ausencia de anchors/coordenadas, derivacion de resources/FX/palette/branches desde los profiles y que los huecos sigan visibles.

## Proximo carril

```text
ROM Presentation Compiler
-> STANDARD_DAMAGE runtime cutover
-> BEAM_BASE / BEAM_VARIANT cutover
-> PROJECTILE_SCROLL
-> DEFENSE_RULE / SUPPORT_OR_FIELD_EFFECT
-> SPECIAL_HANDLER partials
```

`BASE_X/Y`, anchors, slot binding, coordenadas absolutas y cierres FSM especiales siguen `PENDING_ROM_TRACE`.
