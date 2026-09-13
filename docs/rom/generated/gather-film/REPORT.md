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

## Hallazgo principal — `GATHER_STATE`

```text
CA40 (powerWindowCounter) durante la ejecución real:
  0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 2 6 6 6
                                            └─ el contador de Gather se escribe
CA36 = 01 (cursor en la entrada de Gather)
CA03 = 04 (menú) durante todo el film
CA55 = 00 (no se observó 4; el commit de CA55 no cae en esta ventana)
```

`CA40` es el **gate exclusivo de Gather** según la doc: pasa de 0 a no-cero en una
ejecución real. Eso cierra **GATHER_STATE**.

> Nota: la doc (§32–36) dice que la acción escribe `fighterState+4 = 5`. Aquí se
> observa la secuencia `1 → 2 → 6`. El valor final difiere del "5" documentado;
> anotado como diferencia **no resuelta**, no como certeza.

## Pantallas capturadas

| Frame | Contenido |
| --- | --- |
| pre | menú ofensivo, panel `POWER` con `Gather Power`, `CC: 0/99` |
| acción | escena ACTION: Gohan centrado en el campo, HUD inferior colapsado |
| rótulo | `Gohan's Attack` / `Gather Power` |

27 capturas, **14 visualmente únicas**.

## Pendiente

**`GATHER_POSITION_RULE`** — la semántica está confirmada en la doc
(`bit0: 0=GROUND / 1=AIR · bit1: 0=FRONT / 1=BACK`; `RIGHT → |= $02`,
`UP → |= $01`, `DOWN` limpia vertical; sólo si `powerWindowCounter != 0` y
`CA82 != 1`), pero **falta la dirección RAM de `position`** para medirla.

Vía más corta para cerrarla: diff de RAM durante un `MOVE` (menú defensivo
`CA36 != 0` → `CA55=2`), que reposiciona y expone el byte.

Manifiesto con hashes por frame: `manifest.json`.
