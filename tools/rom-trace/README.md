# Campaña de captura ROM — procedimiento operativo

> **Regla**: sin traces reales no hay promoción. Este paquete está listo para
> ingerir los dumps; los `trace.json` canónicos los produce el emulador.

## Estado actual (2026-08-22)

- El pipeline de captura/ingest está probado extremo a extremo con una captura
  sanity real: batch en una sola sesión, 19B ×2 por frame + registros,
  `INGEST_OK trace-983ab168 frames=10`, schema válido y SHA de ROM verificado.
- Esa captura demuestra transporte, parseo, validación y resumen, pero no cuenta
  como captura de campaña: el juego estaba en menú/reset (`C0A0 = 0`, estado
  de combate a cero), no dentro de una acción real.
- Las ROM/saves están verificados. La ROM USA canónica es:
  `8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee`.
- La frontera pendiente no es el tracer. Es llegar de forma reproducible a un
  combate real con Gohan Kid, seleccionar **Tail**, lanzar la acción y capturarla
  con pre-roll.

## Siguiente bloque: navegación hasta combate real

Este bloque es nuevo y debe tratarse como automatización operativa, no como
promoción ROM. Objetivo mínimo: obtener `tail_left_hit` desde una sesión real
en combate.

Entradas:

- ROM USA verificada y save 100% instalado.
- Backend de captura funcional (`trace-action.lua` en BizHawk o
  `mgba-batch.ts`/`mgba-driver-pty.ts` en mGBA).
- Capacidad de inyectar joypad con la API del emulador. Hallazgo local:
  `w/1 0xff00` en el debugger CLI de mGBA **no basta para pulsar botones**;
  solo conserva la selección de fila (`0x10 → 0xDF`, `0x20 → 0xEF`) y los bits
  bajos se recalculan. Para automatizar menú hace falta `joypad.set`/input API
  equivalente, o un savestate ya en combate.

Trabajo esperado:

1. Mapear el flujo desde menú/reset (`C0A0 = 0`) hasta un combate real.
2. Registrar cada intento como script de inputs: frame, botón, duración y estado
   observado (`C0A0`, `CA06`, `CA01..CA04`, pantalla si aplica).
3. Detectar entrada a combate antes de iniciar campaña: `C0A0` deja de ser menú
   y aparecen registros/ActionObjects no triviales.
4. Seleccionar una situación con Gohan Kid y carta **Tail #29 / $0B**.
5. Lanzar el tracer antes de confirmar Tail y capturar con pre-roll.
6. Ingerir el dump y exigir milestones observacionales útiles; si
   `FIRST_CA06_MOVE` sale en `t000`, repetir con más pre-roll.

Condiciones de parada:

- No tocar `src/battle/engine/rom/romDescriptors.ts`, anchors, layout ni FSM
  canónicos durante este bloque.
- No editar traces a mano.
- Si varios scripts de menú no cambian el estado observado, conservar el último
  script + registros y pausar: ahí conviene un savestate ya en combate.

## Qué necesitas

- **BizHawk** (Windows) con la ROM **USA** `dbz-lsw-usa.gbc`
  (SHA-256 `8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee`).
- El script `tools/rom-trace/trace-action.lua` (API `emu:read8` de BizHawk).
- Directorio de salida, p. ej. `C:\traces`.

## Orden de captura (obligatorio)

1. **Tail #29 / $0B / Bank03:$61C5** — primero, es el más simple.
2. **Purple Comet #57 / $0D / Bank03:$5C04** — después.
3. **P.Comet Z #58 / $0E / Bank03:$5D0C** — comparativo contra #57.
4. **$08 SPECIAL** y **$0C BUU_BALL** — al final (cardId por resolver; usar `traceBySubtype`).

## Cómo capturar (BizHawk)

1. Carga la ROM y entra en la batalla.
2. **Lanza el tracer ANTES de confirmar la acción** (pre-roll): el objetivo es
   capturar estado previo estable → aceptación → inicialización de los
   ActionObjects → worker → resolución → cleanup → estado posterior. Si el
   trace empieza demasiado tarde se pierde precisamente la información de
   init/posición inicial que buscamos.
3. Abre Tools → Lua Console → Script → ejecuta:

```text
trace-action.lua C:\traces tail_left_hit 600 LEFT NORMAL_HIT
```

4. El script captura 600 frames (raw + metadata) mientras la acción ocurre.
5. Repite para cada captura de la matriz:

```text
Tail:   tail_left_hit · tail_right_hit · tail_left_miss · tail_right_miss
        (+ tail_left_special_defense / tail_right_special_defense si es reproducible)
P.Comet: purple_comet_left_hit · purple_comet_right_hit
         purple_comet_left_miss · purple_comet_right_miss   (si MISS es legal — si no, registrar como tal, NO fabricar)
P.Comet Z: pcomet_z_left_hit · pcomet_z_right_hit
           pcomet_z_left_miss · pcomet_z_right_miss
```

6. **Rellena `metadata.json`** de cada captura: cardId, subtype, workerBank,
   workerAddress, attackerForm, defenderForm (y SHA si difiere).

## Verificación del pre-roll

El `summary.md` de cada captura incluye los **milestones observacionales**:

```text
- Milestones (observacionales — campaña pre-roll):
  - t012 FIRST_CA06_MOVE
  - t014 OBJECT0_ACTIVE
  - t020 OBJECT1_ACTIVE
  - t033 DRAW_STATE_CHANGED
  - t210 LAST_ACTIVITY
  - t213 CLEANUP_COMPLETE
```

Si el milestone `FIRST_CA06_MOVE` aparece en el primer frame (t000), el trace
empezó tarde: relanzar con más pre-roll. Si no aparece ningún milestone,
revisar que la acción realmente ocurrió durante la captura.

## Ingestión

```bash
# desde dbz-lsw-fangame/
npx tsx tools/rom-trace/ingest.ts <raw.json> <metadata.json> docs/rom/traces/<name>
```

O copia `capture.raw.json` + `metadata.json` a `docs/rom/traces/<name>/` y
ejecuta el runner:

```bash
npm run verify:rom-campaign   # valida TODO y reporta el criterio L10
```

## Criterio para abrir el Lote 10

Con esto basta (textual del lote 9):

```text
✓ Tail LEFT HIT · RIGHT HIT · LEFT MISS · RIGHT MISS
✓ Purple Comet ≥2 traces comparables · P.Comet Z ≥2 comparables
✓ todos validan schema · raw checksums correctos · diff regenerable
✓ CA06 FSM extraíble · ambos ActionObjects 19B completos
✓ decoder produce candidatos · ninguna promoción automática errónea
```

El runner (`tools/rom-trace/campaign.ts`) lo comprueba solo: cuando
`readyForL10 === true`, el Lote 10 se escribe sobre datos reales.

## Artefactos por captura (generados · inmutables · §301)

```text
docs/rom/traces/<name>/
├─ trace.full.json      → evidencia (todos los ticks, 19B crudos ×2)
├─ trace.changes.json   → diff (inspección humana)
├─ summary.md           → FSM CA06 + condiciones
└─ (capture.raw.json + metadata.json → fuente, no editar)
```

## Prohibido

- ❌ Editar un `trace.json` a mano para que "encaje".
- ❌ Promocionar `BASE_X/BASE_Y/ACTOR_HOME` sin cross-trace.
- ❌ Bautizar bindings PRIMARY/SUPPORT por intuición visual.
- ❌ Describir `$0E` como "$0D + daño" antes de la comparativa.
- ❌ Abrir el Lote 10 con canon especulativo: primero los dumps.
