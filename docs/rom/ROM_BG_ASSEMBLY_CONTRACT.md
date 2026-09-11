# ROM BG ASSEMBLY — contrato `$19` / `$1A`

Estado: **ROM_BG_FORMAT_VERIFIED** (research V5) + reproducido píxel-exacto por el
decoder TS contra los samples ROM oficiales.

Fuente: `docs/rom/research-v5-support-defense/` (ROM USA,
sha256 `8dab48cc…`). Re-validado sobre la ROM **Spain** del runtime
(sha256 `bd1df5d6…`): descriptores y row tables **byte-idénticos**, y
`verify:rom-bg-assembly` reproduce 16/16 samples.

Artefactos:
- Decoder SSOT puro: `src/battle/romDisplay/romBgAssemblyDecode.ts`
- SSOT runtime generada: `src/data/generated/romBgAssembly.generated.ts`
- Build: `npm run build:rom-bg-assembly`
- Gate: `npm run verify:rom-bg-assembly` (en `verify:rom-local`)

## Qué es exactamente `$19` / `$1A`

No son fondos de escenario ni `cell_XX_YY.png`. Son **composiciones BG fijas**
(overlays) que la ROM ensambla en una región del BG map.

| | `$19` | `$1A` |
|---|---|---|
| descriptor | `Bank68:$7A0C` | `Bank68:$7B10` |
| tiles | 16 (256 bytes, 2bpp) | 23 (368 bytes, 2bpp) |
| row table | `Bank03:$6834` | `Bank03:$688F` |
| helper ROM | `Bank03:$66D1` | `Bank03:$6750` |
| rejilla | 7 rows × 6 cols | 7 rows × 8 cols |
| tamaño | **48×56 px** | **64×56 px** |
| BG start | row 4, col 7 | row 4, col 6 |
| palette slot | 5 | 5 |
| VRAM | bank 1 (attr bit3) | bank 1 (attr bit3) |
| consumidores | Support handlers `$00`/`$02` | CHARA (`CC15=$31`) · Gather (`CC15=$33`) |
| hold | `CB77++` hasta `$78` = **120 ticks** | — |

Las **7 iteraciones son filas de UN gráfico**, no 7 frames.

## Algoritmo de decode (determinista)

```
romOffset(bank, addr) = bank*0x4000 + (addr - (bank == 0 ? 0 : 0x4000))

paleta   = romOffset($30, $6E00) + paletteIndex*8   → 4 words BGR555 (16 bit)
tile     = 16 bytes → 8×8 índices 2bpp (lo/hi interleaved por fila)
rowTable = romOffset($03, rowAddr) + row*(1 + cols*2)
             byte 0            = count (== cols)
             por columna i:     attr, tileId
             tileIndex         = (tileId - $80) mod tileCount   (los < $80 reutilizan tiles)
             flipX             = attr & $20
             flipY             = attr & $40
             VRAM bank         = attr & $08  (bank 1, ROM_VERIFIED)
```

Paletas usadas (derivadas del **card table** `Bank11:$4320`, category+handler —
nunca del nombre de carta):

- `$19` Support común (`category 4`, handler `$00`/`$02`): `$2D $30 $31 $32 $33 $35 $FF`
- `$1A`: `$31` (CHARA), `$33` (Gather) — las escribe la ROM, no vienen de carta

La derivación del card table coincide **exactamente** con el set de samples del
research — validación cruzada.

## Runtime

Pipeline: `BG_ASSEMBLY` cue → `ProductionRomPresentationAdapter` (DISPLAY_CUES)
→ `RomDisplayPresenter.consume` → resuelve PNG por `(recurso, paletteIndex)`
→ `RomDisplayLayer` monta el sprite en `(col*8, row*8)`.

- Sin `cardName`, sin heurísticas de presentación.
- Si `(recurso, paleta)` no tiene imagen demostrada → `UNRESOLVED_PALETTE`
  explícito (contorno rojo) + `pendingReason`. **Nunca** fallback a
  `overview`/`action`/`special_action`.
- `DISPLAY_CLEAR` y `reset()` limpian `bgAssembly`; `returnToField()` llama
  `romDisplayLayer.clear()` → sin tiles residuales.

## PENDING_ROM_TRACE (no rellenado por intuición)

- Bits 0-2 del attr (palette index) no afectan al render en el modelo del
  research — los samples reproducen ignorándolos. Pendiente demostrar si tienen
  efecto en hardware.
- El "hold 120 ticks" (`CB77` hasta `$78`) es estático-verificado pero no se ha
  trazado dinámicamente aquí.
- La tabla de escenarios global (13 fondos) **no es ROM**: artefacto visual
  externo (ver `docs/battle-backgrounds-v2/`).
