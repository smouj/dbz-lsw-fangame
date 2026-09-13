# Gather Power — film ROM (2026-09-13)

Captura headless real del **comando Gather Power** (no es una carta: es un comando
ofensivo), desde un savestate del usuario en la propia pantalla de selección.

## Procedencia

| Campo | Valor |
| --- | --- |
| ROM | USA `8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee` |
| Emulador | mGBA 0.10.2 headless (`tools/rom-trace/rom-driver`) |
| Savestate | `source-user-gather.ss1` — guardado por el usuario en `Gather Power` (Gohan vs Ginyu) |
| CC | `CA3E = 99` (cheat `01633ECA` activo; el HUD mostraba `CC: 0/99`) |
| Trigger | `A` sobre el panel `POWER` / `Gather Power` |

## GATHER_STATE — cerrado con los valores formales

```text
inicial              CA7F=05   CA55=02   CA03=1F
tras Gather (120f)   CA7F=05   CA55=04            <- GATHER (0x04 = GATHER_POWER)
tras commit          CA55=04   CA7F=00            <- contador consumido (§132)
```

- **`CA55 = 4`** — commit formal de **GATHER** (`| 4; // GATHER_POWER`). §114–115:
  `Ofensivo: CA36 == 1 → GATHER (CA55=4, CA57=0)`.
- **`CA7F = 5`** — el `fighterState + 4 = 5` de §32–36. **El contador real del
  gather es `CA7F`, no `CA40`.**

> **CORRECCIÓN registrada.** En la primera pasada anoté una "diferencia no
> resuelta" (`1 → 2 → 6` frente al `5` documentado). Venía de leer `CA40`, que
> es otra dirección. Con `CA7F` el valor **sí es 5** y la discrepancia
> desaparece. `CA40` se mueve durante el film (0→1→2→6) pero no es el contador
> del gather.

## Escalera de estados observada (film por `frames`)

```text
CA40: 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 2 6 6 6
CA36 = 01 (cursor en la entrada de Gather)
CA03 = 04 (menú) durante la mayoría del film
```

## Pantallas capturadas

| Frame | Contenido |
| --- | --- |
| pre | menú ofensivo, panel `POWER` con `Gather Power`, `CC: 0/99` |
| acción | escena ACTION: Gohan centrado en el campo, HUD inferior colapsado |
| rótulo | `Gohan's Attack` / `Gather Power` |

27 capturas, **14 visualmente únicas**.

## Pendiente (no cerrado)

**`GATHER_POSITION_RULE`** — la semántica está confirmada en la doc
(`bit0: 0=GROUND / 1=AIR · bit1: 0=FRONT / 1=BACK`; `RIGHT → |= $02`,
`UP → |= $01`, `DOWN` limpia vertical; sólo si el contador `!= 0` y `CA82 != 1`),
pero **no se ha identificado la dirección RAM de `position`**.

`CA5A/CA5B/CA5D` (bit1 encendido) **no son esa prueba**: venían del commit de la
acción, no de los direccionales. Los tests con el gate **forzado a mano**
(`write CA40=5`) están marcados como **inválidos** en
`docs/rom/generated/action-trace/REPORT.md`.

Vía pendiente: repetir el test **con el contador real** (`CA7F != 0` tras un
Gather auténtico) y direcciones dentro de la ventana de QTE, usando `trace`.

Manifiesto con hashes por frame: `manifest.json`.
