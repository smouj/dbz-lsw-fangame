# BEAM_BASE Runtime Cutover

> **V4 SUPERSEDES (2026-08-23)**: ver
> `docs/rom/research-v4-fx/AGENT_HANDOFF_V4.md`. El cutover actual conserva
> `FXResource` y `palette`, pero V4 demuestra que Beam FX debe renderizarse como
> BG tilemap/window (`ROM_FX_WINDOW`, VRAM bank1 `$8800`, BG palette slot 4), no
> como projectile sprite generico. Handler `$07` usa prefix rows 3-10; el resto
> usa prefix rows 1-8 y result rows 11-18.

Estado: CLOSED.

Este bloque corta exactamente la familia ROM `BEAM_BASE` (`handler $02`) hacia el carril runtime:

```text
BattleEventLog
-> RomActionExecutionDescriptor
-> RomPresentationProfile
-> compileRomPresentationProfile()
-> BattleTimeline
```

## Scope

```text
BEAM_BASE $02                 38/38 ROM-backed
BEAM_VARIANT                  0 desviadas
SPECIAL_HANDLER               0 desviadas
cardId switches               0
dynamic tracer                no tocado
```

El gate vive en `src/battle/beamBaseRomCutover.ts` y se activa por handler/familia, no por nombre ni id de carta.

## Preservado

- Branch seleccionada desde `BattleEventLog`, no desde Presentation.
- Engine mantiene autoridad sobre HP, hit/miss, damage, CC, cartas, fase y RNG.
- Macro `$1E` llega al runtime como motion discreto:

```text
player side:
-1px x 2t
-2px x 10t
-1px x 5t
= -27px / 17t

enemy side:
+1px x 2t
+2px x 10t
+1px x 5t
= +27px / 17t
```

- `AnimationResource`, `FXResource` y `palette` se conservan como cues ROM:

```text
Kamehameha
handler $02
actor AnimationResource $03
FXResource $05
palette $2C
```

## No Promocionado

El cutover no inventa:

- `BASE_X` / `BASE_Y`
- anchors absolutos
- slot bindings ROM
- poses semanticas como `beam_charge` o `beam_fire`
- proyectiles elegidos por nombre visible de carta
- defensa completa `DEFENSE_RULE`

Cuando un Beam termina en defensa especial, el resultado se conserva como branch ROM/event-driven. La pelicula defensiva completa sigue siendo el bloque posterior `DEFENSE_RULE runtime cutover`.

## Verificador

```bash
npm run verify:beam-base-rom-cutover
```

Checks principales:

- `38/38` `BEAM_BASE` ROM-backed.
- `0` `BEAM_VARIANT` desviadas.
- `0` `SPECIAL_HANDLER` desviados.
- `$1E` conserva `17 ticks`, `27px` y segmentos discretos.
- Mirroring conserva magnitud y distribucion.
- `AnimationResource`, `FXResource` y `palette` preservados.
- Branch desde `EventLog`.
- Engine/EventLog/RNG no mutan por construir timeline.
- Sin anchors, `BASE_X/Y`, slot bindings ni semantica visual inventada.

## Siguiente Bloque

```text
BEAM_VARIANT runtime cutover
```

Mantener `PROJECTILE_SCROLL`, `DEFENSE_RULE`, `SUPPORT_OR_FIELD_EFFECT`, `SPECIAL_HANDLER` y tracer fuera de este bloque.
