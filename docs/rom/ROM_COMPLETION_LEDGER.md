# ROM COMPLETION LEDGER — append-only

Cada entrada: hallazgo con dirección/bytes/prueba y nivel de evidencia.
Nunca se toca Engine/Presentation por una hipótesis; solo tras demostración.

---

## 2026-08-24 — R0: gap matrix generado

- **Entregable**: `docs/rom/ROM_COMPLETION_MATRIX.md` + `.json`
  (herramienta: `tools/rom-research/scripts/completion-audit.mjs`, npm
  `rom:completion-audit`).
- Escaneo HEAD: 283 archivos, 1046 hits de tokens deuda
  (PENDING_ROM_TRACE/ROM_PENDING/UNRESOLVED/UNLINKED/PARTIAL/INFERRED/
  FUTURE/LEGACY/UNKNOWN). Dominios: Data 211 · Other 490 (docs de
  investigación histórica) · Engine 68 · Handler 68 · FighterPhysical 68 ·
  Display 14 · ActionObject 15 · Macros 21 · AI 17.
- Matriz canónica de deuda de combate: 20 items con evidencia actual,
  hueco exacto, método e impacto. Clases: DYNAMIC (anchors, handlers, FSM,
  cadence) · RUNTIME_DEBT (DEFENSE_LIMIT_LEGACY) · STATIC (macros
  semánticos) · NON_BLOCKING (AI original, audio, story, display residues).

## 2026-08-24 — R1: extractor físico parcial (metadata real)

- **Herramienta**: `tools/rom-research/scripts/extract-fighter-physical.mjs`
  + `scripts/dump-animation-catalog.ts` (npm `rom:extract-fighter`,
  `rom:dump-anim-catalog`).
- Salida: `docs/rom/generated/fighters/resource_XX/{metadata.json, frames/*.json}`
  (regenerable; actualmente resource 0x03).
- **Evidencia ROM_STATIC_VERIFIED**: resource $03 (Kamehameha) = bank 98
  localId 3 · 6 secuencias × 8 frames × 75t = 48 frames / 450t total.
  Frames: [visualFrameId, durationTicks, offsetY, offsetX] + raw + addr de
  secuencia. Paletas físicas BGR555→RGB (40 keys).
- **Bloqueo honesto (PENDING_REEXTRACT)**: la TABLA DE METASPRITES (piezas
  x/y/tile) no está persistida en el repo; research-v3 §2 la demostró en
  sesión con scripts ad-hoc (411/411 graphicsBlockCount == pieceCount;
  bloque 32B = 2 tiles 8×8 = pieza OBJ 8×16). El render físico del sprite
  necesita reencontrar la tabla (descriptor del resource +4 → tabla
  gráfica). NUNCA se inventa un metasprite.
- **Siguiente (R2)**: reencontrar la tabla de metasprites en bancos $62-$64
  → render real → reconciliar con Canonical_Frames_Official.

## 2026-08-24 — R2: re-derivación del descriptor (hallazgos parciales verificados)

Herramienta: `tools/rom-research/scripts/explore-resource-descriptor.ts`
(`npx tsx tools/rom-research/scripts/explore-resource-descriptor.ts <resourceId>`).

**1. Tabla global de recursos (RE-DERIVADA)** — bancos $62/$63/$64:
`u16 count` + pares `[offset u16, size u16]` acumulativos. Resource 3 →
bank $62, descriptor en $005E, size 197.

**2. Descriptor resource $03 (bytes crudos, bank $62:$005E)**:
`c3 00 17 0b 87 00 9e 0b 70 00 0e 0c 79 00 06 00 43 00 da 00 02 04 00 1f 00 07 00 03 00 00 00 02 00`
u16s: +0=$00C3 +2=$0B17 +4=$0087 +6=$0B9E +8=$0070 +10=$0C0E +12=$0079
+14=$0006 +16=$0043 +18=$00DA +20=$0402 +22=$1F00 +24=$0700 +26=$0300
+28=$0000 +30=$0200. Punteros que RESUELVEN a metasprites (patrón de piezas
verificado): $0B17 $0B9E $0C0E $00C3 $00DA $0402 $0700 $0200.

**3. Formato de pieza del METASPRITE (RE-DERIVADO, banco $62)**:
piezas de 4 bytes `[y s8, x u8, tileDelta u8, attr u8]`. Validación
estructural: `tileDelta == 2 × pieceIndex` observado en $0B17 (12+ piezas:
tileDelta 0,2,4,6,8,0A,0C,0E,10,12,14,16…), $0B9E, $0C0E, $00DA, $0200…
attr observados: $D8/$0C/$00 (flags OBJ). Ejemplo $0B17 piezas 0-1:
`[f8 14 00 d8] [f0 16 00 0c]`.

**4. Descarte (hipótesis refutada con evidencia)**: `+4=$0087` NO es una
tabla gráfica simple `[count, addr[]]`; el candidato `$0043` como tabla
`[lo, hi, size, 00]` apunta a `$07A9`, cuyo contenido es OTRA tabla de
punteros u16 + una paleta gradiente (pares BGR555 0x4860,0x4840,0x4820,
0x4800,0x4460…). La estructura del descriptor es más rica que las hipótesis
lineales: los punteros alternan metasprites con tablas mixtas (secuencias/
gráficos/paletas) cuyo rol exacto NO se asigna sin desensamblar la rutina.

**5. Bloqueo exacto (siguiente sub-paso de R2)**: desensamblar la rutina del
reproductor de animación (`~$0A01/$096A/$0B16` — doc §250; `$0B4D/$0A60`
metasprite/OAM builder citados en el research previo) para asignar el rol de
cada puntero del descriptor (+0..+30) y el formato exacto de la tabla de
graphics blocks. Después: renderer OBJ → PNG raw/trimmed → reconciliación.
NUNCA se inventa el rol de un puntero.

## 2026-08-24 — R2.2: DESCRIPTOR CONSUMER DISASSEMBLY (mgbdis, Bank 00)

Herramienta: mgbdis v3.0 sobre dbz-lsw-usa.gbc → /tmp/mgbdis-out/bank_000.asm.

### REINTERPRETACIÓN CLAVE (corrige el modelo mental anterior)
Las rutinas del Bank 00 NO leen el descriptor estático del resource (bank
$62) directamente: leen el **ActionObject de WRAM** ($C3A0, stride $13).
El descriptor estático se copia al ActionObject en el INIT (siguiente paso).

### Consumer map (VERIFIED por código, no por apariencia)

| Dirección | Rol | Evidencia |
|---|---|---|
| `$0B07` | HL = ActionObject activo: `ld hl,$C3A0; ld bc,$13; [$C3C6]+1 → add hl,bc` | VERIFIED |
| `$0A60` | OAM builder: +0 flags `and $80` (gate visible) · +1/+2 → $C3CC/$C3CD (slot ptr) · call $0B8D (resuelve slot) · slot+2 → $C3D0 · slot+3 → DE (piezas) · $0B4D + escritura OAM | VERIFIED |
| `$096A` | Lee +3 → $C3C7 (sequenceSelector) · +4 → $C3D0 · +5.. +9 flags $40/$20 → $C0F9/$C0FA (offsets con signo) | VERIFIED |
| `$09B7` | ActionObject +4 → byte (frameIndex) | VERIFIED |
| `$09C0/$09CD` | +$0E (currentDrawY) `and $F8 \| e` | VERIFIED |
| `$09DA` | tras $096A: escribe X/Y resultantes en ActionObject +$0F/+$0E | VERIFIED |
| `$0B16` | `[$C3CE]` como base de tabla · índice $C3C7*2 → [off] → + $C3D0*4 → HL = frame record | VERIFIED |
| `$0A7A+` | construcción OAM por pieza: `[$C0FA] and $40` → flipX (`cpl; inc; sub $10`) · `and $20` → flipY (`sub $08`) · buffer OAM en `$C3D4*4` | VERIFIED |

### FORMATO DE PIEZA DEL METASPRITE — VERIFIED POR CONSUMIDOR
`[y s8, x u8, tileDelta u8, attr u8]`, con attr `$40` = flip X y `$20` =
flip Y (la rutina $0A7A+ aplica cpl/inc/sub exactamente para ambos). La
derivación por contenido de la pasada anterior queda ahora cerrada por
código.

### BACKLOG AVANZADO (residuos V7 que ganan rol)
- `$C3CE/$C3CF`: puntero base de la tabla de secuencias/metasprites del
  slot actual (leído por $0B16). Rol PARCIAL (falta el writer).
- `$C3D0`: índice de frame/selector (escrito desde slot+2 y +4). PARCIAL.

### Graphics root — siguiente sub-paso
`Call_000_0909` escribe **ActionObject +$11** (graphics source, del v3)
desde E: `call $0B07; l=$11; ld [hl+], e`. Falta el CALLER de $0909 y el
escritor de +$12 para remontar el valor hasta el descriptor estático.
Cadena objetivo: `ActionObject +11/+12 → writer → 32-byte graphics copy →
source lookup → descriptor field`.

### Estado del gate R2 (renderer)
- frame → visualFrameId: VERIFIED ($0B16 → frame record)
- visualFrameId → metasprite: PARCIAL (slot+3 → piezas; falta el init que
  enlaza visualFrameId con el puntero de piezas)
- metasprite piece format: VERIFIED ([y,x,tileDelta,attr] + flips)
- visualFrameId → graphics blocks: PENDING (graphics root)
- graphics bank/base: PENDING
- block → 2bpp OBJ tiles: PENDING (fórmula del v3: 32B = 2 tiles 8×8)
- profile → palette: VERIFIED (Bank30:$6E00 + key×8, ya extraída)

Hipótesis refutada en esta pasada: el descriptor estático (bank $62 $005E)
NO es leído directamente por las rutinas del Bank 00 — SUPERSEDED como
modelo de acceso (los datos se copian al ActionObject en init).

## 2026-08-24 — R2.2b: CADENA FÍSICA COMPLETA VERIFIED (mgbdis Bank 00)

### AnimationSlot = registro de 3 bytes [bank, baseLo, baseHi]
- `$2FE7`: HL = `$CA0D + slot×3` (stride 3 — zona de AnimationSlots).
- `$3702` = `call $2FE7; call $08DD` → `$08DD` escribe `[B, E, D]` en el
  slot C (los callers: `ld b,$61; ld de,$0005; ld c,$04; call $3702` →
  slot 4 = [$61, $05, $00]).
- `$2FF8`: HL = `$CA28 + slot×3` (registro graphics-source por slot).

### actorVisualProfileKey (VERIFIED — Bank11 byte+1, re-derivado)
`$2B65`: `ld a,$11; call $0F9B` (banco $11) · `ld [$CC02], $69` ·
`call $2A77` → HL · `inc hl` · `ld e,[hl]` → **E = key** (record del
personaje, byte +1).

### graphicsBank = $31 + key (VERIFIED por código)
`$367F`: `call $2B65` → E=key → `ld a,e; add $31; ld b,a` (B = $31+key) ·
C = [$C3C6] (slot) · `call $2FF8` → HL=$CA28+slot×3 · `call $08E3` → DE ·
`call $0909` → **ActionObject +11/+12 = graphicsSourcePtr** (registro
[bank, baseLo, baseHi]).

### ActionObject +11/+12 writer (VERIFIED)
`$0909`: `call $0B07` (HL=ActionObject) · `l=$11` · `ld [hl+],e` ·
`ld [hl],d` → **DE → +11/+12 LE**. Caller único: `$369B` (dentro de $367F).

### palette = $6E00 + key×8 (VERIFIED por código, re-derivada)
`$36A5`: `call $2B65` → E=key · `add hl,hl ×3` (×8) · `ld de,$6E00;
add hl,de` → HL = $6E00 + key×8 (4 colores BGR555 — coincide con la tabla
extraída romFighterPalettes.generated.ts).

### ARQUITECTURA FÍSICA REAL (modelo del usuario CONFIRMADO)
```
AnimationResource (bancos $62-$64, descriptor estático)
  ↓ $3702 (install: [bank, baseLo, baseHi] → $CA0D + slot×3)
AnimationSlot (registro 3B)
  ↓ ActionObject +1/+2 (ptr al slot)
ActionObject (WRAM $C3A0 + idx×$13)
  ├─ +3 → $C3C7 (sequenceSelector)
  ├─ +4 → $C3D0 (frameIndex)
  ├─ +5/+6 → $C0F9/$C0FA (offsets frame: +5→drawY, +6→drawX)
  ├─ +11/+12 = graphicsSourcePtr ($0909, desde $367F)
  └─ +$0E/+$0F = currentDrawY/X

ActorVisualProfile ($2B65: Bank11 byte+1)
  ├─ graphicsBank = $31 + key ($367F)
  └─ palette = $6E00 + key×8 ($36A5)

ActionObject update: $0B16 ([$C3CE]+$C3C7×2+$C3D0×4 → frame record) →
metasprite pieces (slot+3) → OAM ($0A60/$0A7A+: flips $40/$20, buffer
$C3D4×4)
```
**Los píxeles dependen del ACTOR (graphics source), la estructura
(secuencias/metasprites) del RESOURCE — la separación que el usuario
predijo queda confirmada.**

### Corrección histórica — frame record byte2/byte3 (SUPERSEDES)
El consumer `$096A` lleva ActionObject +5 → `$C0F9` → `$09DA` lo escribe en
+$0F (currentDrawY) y +6 → $C0FA → +$10 (currentDrawX). Por tanto el frame
record es **[visualFrameId, durationTicks, offsetY, offsetX]** (byte2=Y,
byte3=X). `docs/rom/rom-map.md` (que decía offsetX primero) queda
SUPERSEDED; el catálogo (offsetY=dy=byte2, offsetX=dx=byte3) está
CORRECTO.

### Gate R2.2 actualizado
- resource → AnimationSlot: VERIFIED ($3702/$2FE7/$08DD, registro 3B)
- slot layout mínimo: VERIFIED ([bank, baseLo, baseHi])
- actor profile → graphics source: VERIFIED ($2B65→$367F→$0909)
- slot → sequence/frame root: VERIFIED ($0B16 + $C3CE/$C3CF/$C3C7/$C3D0;
  falta solo el WRITER de $C3CE/$C3CF)
- slot → metasprite root: PARCIAL (slot+3 → piezas en $0A60; falta el
  enlace init visualFrameId→puntero de piezas)
- graphics source → 32-byte blocks: PENDING (rutina de copia a VRAM)
- frame→visualFrameId, piece format, profile→palette: VERIFIED (pasadas
  anteriores)

## 2026-08-24 — R2.2c: GRAPHICS COPY + METASPRITE LOOKUP CLOSED (mgbdis Bank 00)

### El patrón de resolución (VERIFIED, compartido por los 3 roots)
`$0B16` (secuencia), `$0B4D` (metasprite) y `$0B6D` (gráficos) comparten
exactamente el mismo patrón de indexado sobre la base resuelta
($C3CE/$C3CF = resolved resource base, escrita por $0B8D):

```text
HL = base
[base+N] u16 → + base → tabla del dominio
[visualFrameId o selector] ×2 → + tabla → [u16] → + base → puntero final
```

### RESOURCE DESCRIPTOR ROOTS — VERIFIED por consumidores (los 3 primeros)
- `+0` = SEQUENCE TABLE ROOT ($0B16: +0 → tabla → selector($C3C7)×2 → u16 →
  frame($C3D0)×4 → frame record [visualFrameId, ticks, offsetY, offsetX])
- `+2` = METASPRITE TABLE ROOT ($0B4D: +2 → tabla → visualFrameId×2 → u16 →
  → puntero a las PIEZAS [y, x, tileDelta, attr])
- `+4` = FRAME GRAPHICS LAYOUT ROOT ($0B6D: +4 → tabla → visualFrameId×2 →
  u16 → entrada [blockCount, offset0 u16, offset1 u16, …])

### REHABILITACIÓN de `descriptor +4` CON PRUEBA DIRECTA
La pasada anterior refutó +4 como tabla `[count, addr[]]` ABSOLUTA. La
evidencia nueva ($0B6D + $0BA4 + $0C01) lo REHABILITA con el formato real:
la entrada del frame contiene `blockCount` + OFFSETS u16 RELATIVOS al
GraphicsSource (bank/base del ACTOR), no direcciones absolutas del banco.
SUPERSEDED de la refutación anterior (nueva prueba directa).

### GRAPHICS COPY LOOP — VERIFIED ($0BA4 → $0C01-$0C30)
```text
ActionObject +11/+12 → GraphicsSourceDescriptor
  +0 → $C3D1 (bank) · +1/+2 → $C3D2/$C3D3 (baseLo/baseHi)   [$0BA4]
frame record → +5 → visualFrameId → $C3D0                     [$0BA4]
$0B6D → entrada del frame [count, offsets…]
loop por bloque ($C3D0 = restante):
  bank switch ($C3D1) · DE = base + offset                      [$0C01]
  $0FE8: copia 4B × c=8 = 32 BYTES → destino VRAM               [$0FE8]
  siguiente offset (DE avanza 2) · dec count
fin: [BC] xor $01 → TOGGLE DOUBLE BUFFER (+07)                  [$0C2C]
```
**VERIFIED: block = 32 bytes = 2 tiles 8×8 2bpp = pieza OBJ 8×16.**

### GATE R2.2 — TODOS LOS ESLABONES CERRADOS
1. resource → AnimationSlot ✓ · 2. slot layout [bank,baseLo,baseHi] ✓
3. ActionObject → slot ✓ · 4. actor → graphics source ✓ · 5. actor →
palette ✓ · 6. sequence/frame resolution ($0B16) ✓ · 7. frame →
visualFrameId ✓ · 8. piece format/flips ✓ · 9. visualFrameId → metasprite
pointer ($0B4D) ✓ · 10. visualFrameId → graphics blocks ($0B6D) ✓ ·
11. block → graphics source ($0C01) ✓ · 12. 32B copy ($0FE8) ✓ ·
13. double buffer toggle ✓ · 14. $C3CE/$C3CF = resolved resource base
(escrito por $0B8D desde el slot) ✓

### Renderer R2.3 — DESBLOQUEADO (sin incógnitas físicas relevantes)
```
resource + sequence + frame
→ frame record (via +0)
→ visualFrameId
→ metasprite pieces (via +2)          → geometría
→ frame graphics entry (via +4)       → offsets
→ GraphicsSource [bank,base] (actor)  → tiles
→ 32B por bloque → 2 tiles 8×8 → pieza 8×16 → composición + paleta ($6E00+key×8)
```
El extractor offline no necesita emular VRAM/toggle (metadata romVram opcional).

## 2026-08-24 — R2.3: PHYSICAL OBJ RENDERER CLOSED

- Herramientas: tools/rom-research/scripts/render-fighter-physical.ts
  (npm rom:render-fighter) + verify-fighter-physical.ts (npm
  verify:rom-fighter-physical).
- Base del resource $03 resuelta: **$0494** (bank $62) — validada por
  resolución cruzada contra las 6 secuencias del catálogo ($4A7..$54C).
  Frame record S0F0 en $4A8 = [1,3,0,2] (vfid=1, 3t, dy=0, dx=2) —
  coincide con el catálogo.
- Resolvers puros (reproducen la aritmética ROM): frame record (+0),
  metasprite (+2 → piezas [y,x,tileDelta,attr]), frame graphics (+4 →
  [blockCount, offsets]), graphics source [bank $31+key, base $0000],
  palette ($6E00+key×8 BGR555→RGB).
- Render: 32B/bloque → 2 tiles 8×8 2bpp → pieza 8×16 → composición con
  flips $40/$20 → raw_canvas (256×256, origen técnico 128,128) +
  trimmed (bounding box) + metadata.json (provenance completa + hashes
  sha256).
- **Fixture $03 × 3 profiles (keys 0x02/0x08/0x0D): 144 renders físicos**
  (6 seq × 8 frames × 3). Renders VISIBLEMENTE distintos por perfil
  (misma estructura 12 piezas, distintos banks/paletas): key 02 → 1 color
  (#002100), key 08 → 2 colores (blancos/rosados), key 0D → 3 colores
  (morados/azules). La separación arquitectónica resource→estructura /
  actor→píxeles queda DEMOSTRADA visualmente.
- verify:rom-fighter-physical FULL PASS: 144 frames, 0 mismatches
  pieces==blocks, 0 lecturas fuera de ROM, determinismo (mismo input →
  mismo hash), paletas BGR555, fallback selector 99 → sequence 0, 0
  dependencia de assets externos (Canonical/manifest/V9/poses).
- Gate R2.3 CLOSED. Siguiente: R2.4 — Physical Frame Reconciliation
  (ROM PHYSICAL ↔ Canonical_Frames_Official, EXACT/SHARED/COMPOSITE/
  UNRESOLVED por hash).

## 2026-08-24 — R2.4: PHYSICAL FRAME RECONCILIATION (piloto $03) CLOSED

- Herramientas: tools/rom-research/scripts/reconcile-physical.ts (npm
  rom:reconcile) + verify-reconciliation.ts (npm
  verify:physical-reconciliation).
- Normalizador ÚNICO (ROM + Canonical, no semántico): RGBA → alpha==0 →
  RGB=0 → alpha bbox → crop exacto → hash(width,height,RGBA) +
  opaqueMaskHash (geometría alpha, solo diagnóstico). Prohibido resize/
  flip/remap/fuzzy para EXACT.
- Canonical_Frames_Official indexado: 2195 PNGs (IDs físicos por archivo,
  sin renombrar) → canonical-physical-index.json.
- ROM: 15 identidades físicas únicas (key+resource+vfid, dedup de 144
  occurrences) → rom-physical-index.json.
- **Resultado piloto $03 (keys 02/08/0D): EXACT=0 · SHARED=0 ·
  COMPOSITE=0 · UNRESOLVED=15** (diagnósticos: 15 NO_PHYSICAL_MATCH, 0
  SAME_ALPHA_GEOMETRY).
- **Hallazgo objetivo**: los frames físicos del resource $03 (beam charge
  Kamehameha) NO existen en Canonical_Frames_Official — ni pixel-idénticos
  ni con la misma silueta alpha. El canon actual no contiene esos sprites
  (o los compone distinto). Es la primera medición honesta de cobertura:
  el gate NO exige UNRESOLVED=0.
- Salidas: docs/rom/generated/reconciliation/{canonical-physical-index,
  rom-physical-index, physical-reconciliation(.json/.csv), REPORT.md}.
- verify:physical-reconciliation FULL PASS: EXACT⇒hash idéntico (0
  excepciones, vacuo con 0 EXACT), SHARED≥2, COMPOSITE con componentes,
  sin fuzzy/resize/V9/poses, 0 canonicalId inexistentes, hashes ROM
  deterministas, UNRESOLVED permitido.
- **R2 COMPLETO CLOSED** (R2.2 consumer map → R2.3 renderer → R2.4
  reconciliation). Siguiente: R3 — Dynamic Spatial Semantics (tracer con
  el sprite físico R2 disponible por tick).

## 2026-08-24 — R3: infraestructura DYNAMIC SPATIAL SEMANTICS lista (captura PENDING)

- **tools/rom-trace/physical-decode.ts**: ActionObject 19B → decoded físico
  (active/flags/slotPtr/selector/frameIndex/vfid/frameElapsed/drawY/X/
  renderAttrs/graphicsSource). key = graphicsBank - $31 (nunca por
  apariencia). resourceId por índice inverso (bank,base)→resource (resolver
  R2.3). identity física (key:res:vfid) + trimmedPixelHash CACHEADO de los
  renders R2.3 (no PNG por tick).
- **verify:rom-spatial-semantics (FULL PASS, npm)**: decoder 19B → campos
  (layout VERIFIED R2.2), key=bank-$31 (0x39→0x08), resourceId→$03,
  identity+hash cacheado (8:3:5), 0 promociones semánticas (decoder solo
  emite datos físicos; nunca ACTOR/TARGET/anchors), campaña Tail definida
  (cardId 29, 4 traces) con captura PENDING reportada sin fallar.
- **Captura Tail PENDING**: mGBA disponible (/usr/games/mgba) + sav USA
  (dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.sav). docs/rom/traces vacío
  (campaignReady:false). El siguiente bloque: localizar el battle block
  (deck del player en WRAM) para inyectar Tail/CC, entrar en BATTLE con
  pre-roll y capturar tail_left_hit / tail_right_hit / tail_left_miss /
  tail_right_miss → después LEFT↔RIGHT (mirroring K), HIT↔MISS (common
  prefix/branch), object0↔object1 (binding), anchors (ACTOR_HOME/
  TARGET_HOME/CONTACT_POINT solo con evidencia operacional).

## 2026-08-24 — R3.1A bootstrap + reclasificación estática (lote 10.1)

- **R3.1A (dinámico)**: battle blocks localizados por evidencia dinámica
  (PLAYER 0xCB1A, ENEMY 0xCB47; roster/limits/deck/drawIndex/hand layout
  verificado con patch UI-verificado). Tail byte = 0x1D (directo 1-based,
  demostrado). CC = 0xCA3E (10→13 diferencial). Test definitivo spec PASS
  (hand[0]=29 → UI "Tail" → restore). Primer trace Tail completo
  (tail-trace-01.json, 620f) + GATE PASS decoder físico (0 UNKNOWN,
  639/639 resueltos; resources bank 0x61: 66 Gohan 0x30, 67 Piccolo 0x970,
  68 acción 0x1D7C). Outcome = DEFENDED_GUARD (CA53=1, daño 0).
- **Hallazgo**: la variante HIT de Tail está bloqueada por el Guard
  determinista del enemigo (roll irrelevante; parches CA56/CA58/mano/buffer
  AI revierten a CA82=2). Requiere cerrar la selección de carta defensiva
  del AI o un savestate con enemigo que elija CARD.
- **Reclasificación estática (lote 10.1)**: Tail seq0/1 reachability,
  V-ball 4/4, Suicide $08 anim/timing/routing, Defense slot8/CA83/CA53,
  TACTICAL→ACTION structure, Purple Comet identidad, Kiai/Paralysis
  PRELOADED_SLOT6, Lightning C. no bloqueante — todo STATIC VERIFIED.
  Siguen OPEN: R3 semantic binding, R4 (Rocket/Potbelly FSMs, Tail/V-ball/
  Suicide/PComet dinámico), R5 DEFENSE_LIMIT_LEGACY, R6 cadencia.
- Artefactos: tools/rom-trace/r31a/artifacts/ (checksums SHA256),
  docs/rom/traces/manifest.json (tail_left_defended_01),
  docs/rom/R31A_TAIL_BOOTSTRAP.md.

## 2026-08-24 — S-MAP1: ROM-FIRST SPRITE MAPPING CONSOLIDATION (12:32-12:40)

- **S-MAP1 CERRADO** (bloque nuevo del usuario): taxonomía canónica 10 estados
  (ROM_PHYSICAL/CANONICAL_PHYSICAL/SHARED_PHYSICAL/COMPOSITE/FALLBACK/
  REFERENCE_FX/SEMANTIC_ALIAS/SOURCE_ONLY/MISSING/UNRESOLVED) + regla
  RUNTIME_RESOLVED ≠ PHYSICAL.
- Herramientas: tools/sprite-mapping/{taxonomy,classify,build}.ts +
  scripts/verify-sprite-mapping.ts + npm run build:sprite-mapping /
  verify:sprite-mapping. spriteManifest.ts: +spriteDirs() export.
- 9 salidas en docs/rom/generated/sprite-mapping/ (physical-actor-index,
  canonical-source-index, runtime-pose-bindings, runtime-composites,
  fx-reference-index, form-sharing, source-only, unresolved, REPORT).
- Resultado: 48 formas × 21 poses = 1008 bindings, 0 unmarked. física=405
  (40.2%) · composite=459 · fx=96 · alias=48 · fallback=0 · missing=0.
  Runtime coverage 100%. Physical coverage NO obligada a 100%.
- Reclasificaciones aplicadas: beam_ray/beam_ray_tip/aura_* → REFERENCE_FX;
  punch_*/kick/knockback_*/beam_guard/evade/guard/beam_fire (secuencias
  mezcladas) → COMPOSITE (con core físico propio cuando existe); power_up →
  SEMANTIC_ALIAS de gather_power; move_back → SHARED_PHYSICAL de move_front.
- Gates PASS: V9 roles 0, FX nunca físicos, composites/fallbacks nunca
  físicos, Destruct-Disk nunca guard, Move FX separado de Avoiding,
  vegito_base/cell-custom/piccolo-unused 0, 0 refs/archivos faltantes,
  física sin provenance 0. V9 (spriteCanon/build-sprite-canon/
  import-canonical-frames) = LEGACY_SEMANTIC_REFERENCE, no upstream físico.
- Hallazgos de la auditoría: los manifests son en sí secuencias compuestas
  (guard = idle+move_front+guard_02; beam_fire = beam_fire+beam_charge) →
  el registro distingue core físico (frames con prefijo de la pose) de la
  secuencia. 0 huérfanos en todos los dirs.
- typecheck + verify:gbc + verify:canon verdes (spriteManifest.ts cambio
  no-rompedor: export spriteDirs()).

## 2026-08-24 — S-MAP2: ROM PHYSICAL PROVENANCE BRIDGE (12:40-13:05)

- **S-MAP2 CERRADO** (extensión de S-MAP1): S-MAP1 binding + R2.3 renderer +
  R2.4 normalizador → provenance ROM por frame físico (EXACT por hash, nunca
  fuzzy/resize/remap/flip/pose-name/V9).
- Formas: tabla de registros Bank11 decodificada (base $4000 + page×0x100 +
  form×0x10; byte+1 = actorVisualProfileKey; graphicsBank = $31+key; paleta
  Bank30:$6E00+key×8). **48/48 perfiles** (44 keys únicas).
- Hallazgo: los dirs compartidos de S-MAP1 SÍ comparten perfil ROM
  (piccolo 3/3/3 · vegeta 10/10 · gohan_adult 12/12) → ROM profile shared
  (graphics bank + paleta idénticos), aún sin identidad de frames.
- Renders: 9 resources con secuencias decodificadas (01,03,04,05,08,09,12,
  16,3F) × keys con paleta = 2400 frames, 143 identidades ROM únicas.
  Resources 15/34 = base no resoluble (limitación del resolver). 54
  resources con 0 secuencias decodificadas en el catálogo (STATIC LIMIT).
  10 keys sin paleta (Gohan Kid 0/1, Krillin 4, etc.) → no renderizadas.
- Resultado: **ROM_EXACT=0 · ROM_SHARED=0 · ROM_UNRESOLVED=143** — consistente
  con el piloto R2.4 (15/15 UNRESOLVED): el arte canónico ≠ píxeles ROM
  exactos (redraws de la comunidad). ROM_UNRESOLVED válido, no falla.
- Salidas: rom-form-profiles.json · rom-physical-identities.json ·
  rom-canonical-provenance.json · rom-unresolved-physical.json ·
  ROM_PROVENANCE_REPORT.md (en docs/rom/generated/sprite-mapping/).
- npm: build:sprite-rom-provenance + verify:sprite-rom-provenance (tsx, no
  esbuild — pngjs no bundlea). OJO: CLI del renderer parsea --resource en
  HEX (--resource f = 15). Bug del builder: u8 con &0xffff destruía el
  offset de banco (corregido).
- **Ciclo de sprites CERRADO** (S-MAP1 + S-MAP2). Próximo: $05/$06/Defense
  LIMIT/TACTICAL↔ACTION + Purple Comet dinámico.
