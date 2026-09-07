# Dev HUD ↔ BattleScreen ACTION parity — diagnóstico (2026-09-08)

HEAD: `905e3b76` · CI verde · Árbol limpio · CERO cambios de código (solo diagnóstico)

## Las tres capas del triángulo de paridad

```
(A) runtimeActionPreview(kind)   ← Dev HUD (hud.tsx view BEAM/DAMAGE)
        │  derivado 1:1 de ↓
(B) traceActionPresentation(id)  ← actionPresentationTrace.ts (P0.4)
        │  consume el MISMO BattleRuntime/compilador/resolvers que producción
(C) BattleScreen film real       ← runGoldenAction → EventLog → buildTimeline → Pixi
```

## Hallazgos (con evidencia)

1. **Gate de paridad existe y pasa: 214/214 OK** (`verify:action-preview-runtime-parity`,
   añadido en `0b6c741a`). Comprueba preview↔trace beat a beat (tick/formId/file/resource/
   sequence/frameIndex/visualFrameId, ticks monotónicos, duración > 0) para DAMAGE
   (`standard_damage`) y BEAM (`kamehameha`).

2. **El gate NO está en `verify:ci`** — es un script suelto en package.json. Una regresión
   del contrato preview↔runtime no la detectaría CI. → *Fix recomendado: cablearlo a la
   cadena verify:ci.*

3. **La paridad es solo del lado ACTOR (player)**:
   - `runtimeActionPreview()` documenta: "Returns the exact **physical actor track**".
   - `hud.tsx`: cuando `actor === 'enemy'`, el preview NO usa `runtimePreview.beats` — cae a
     `actionFrameFiles` (resolver semántico LEGACY). El stream físico del target
     (secuencias Bank61 del splice, slot 1) no se expone vía `trace.romFrames`.
   - Coincide con la familia de gaps de los golden audits (rutas estáticas/rival owner=DOM).

4. **Cobertura: solo 2 golden actions** (DAMAGE, BEAM). Las vistas MOVE_ACTION/GATHER_ACTION/
   STAGE_ACTION del HUD siguen en resolver semántico legado (`framesFor`) — corresponde a los
   items 5-8 del frente P0 (Stage player/enemy, SCX/SCY, cleanup+segunda acción, Card Draw).

5. **Timing del preview en el HUD**: el timer usa `durationTicks * (1000/60)` (asume 60 FPS
   fijos). La alineación tick→ms del film real (Pixi 1 tick/RAF) es el área abierta G2/G4 del
   golden visual audit (rtΔ DOM vs runtime) — display-only, no bloquea la paridad de datos.

## Veredicto

- **Paridad de datos preview↔runtime: SÍ, por construcción** (mismo BattleRuntime) y
  gateada (214/214) para player-side DAMAGE/BEAM.
- **Huecos reales**: (a) gate fuera de verify:ci; (b) lado enemy sin stream físico en el
  trace (requiere exponer la track target — secuencias Bank61 del splice); (c) familias
  stage/move/gather sin cubrir (items posteriores del P0).

## Recomendación (orden)

1. Cablear `verify:action-preview-runtime-parity` a `verify:ci` (fix de 1 línea, cierra el
   hueco de regresión).
2. Extender `traceActionPresentation` con la track física del TARGET (slot 1, Bank61) y
   cubrir el lado enemy del preview con ella — esto es parte real del item 1.
3. Stage/move/gather → cuando toque (items 5-8 P0).
