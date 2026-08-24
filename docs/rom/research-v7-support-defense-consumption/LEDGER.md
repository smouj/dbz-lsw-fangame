# DBZ LSW ROM Research V7 Ledger

Estado: `V7_OPEN — V7.1 parcial, V7.2-V7.4 cerrados`.

## V7.0 — V6 congelado

V6 queda `CLOSED / STATIC_PHYSICAL_VERIFIED` (ver
`docs/rom/research-v6-support-physicals/`). Tres residuos trasladados, no
ocultados: composición display $0B/$0D/$0F, semántica humana de macros
(UNRESOLVED donde no se demuestre), card.byte8→CC15 (UNLINKED).

## V7.1 — Workers $0B/$0D/$0F: FSM y staging (ROM_STATIC_VERIFIED)

### Worker $0B (Bank03:$64E7) — familia Direct/KnockDown

Dispatcher por CA06: $0B,$0C,$0D,$14,$15,$16,$17,$1E,$1F,$20,$21,$22;
default → salta al worker $00 (C3 BF 63) — **el visual card-indexed se carga
siempre al inicio vía worker $00 state $01 ($2C30 → VRAM $8800)**.

Estados demostrados:

```text
$0B: CALL $080C; C=$01,DE=$0100; CALL $3764; reset $C7D4; $3E7F;
     macro $1A (SET_ANIMATION_STATE slot1); $3E8B; ++CA06
$0C: $07F4 palette transition (A=$00,BC=$0340,E=$10,D=$02); loop
$0D: CA53 gate:
       CA53 == 0 -> state $1E
       CA53 != 0 -> state $14
     (¡el resultado numérico CA53 decide la rama visual del worker!)
$14: reset; $3E7F; B=$00; CALL $3F60; macro $2C; $3E8B; loop
$15: $3E5E poll; daño/KnockDown: $CA5A->$CA0A; $2FD5; lectura pos
     (AND $02); chequeos $5E/$62; $CA7F -= $0A si >= $0F
$16: reset $CA81; $CA5A->$CA0A; $34B8; $3239; loop
$17: $3239; BC=$0003; $2FCE (espera); $34C7; CA06=0 (fin)
$1E: reset $CA7F/$C7D4; $3E7F; macro $34; $3E8B; loop
$1F: reset $C7D4; $3E5E poll; loop
$20: $3281; BC=$0003; $2FCE; escribe $CAA2..$CAA5 ($C3/$81/$28); loop
$21: $3B3A; BC=$0003; $2FCE; reset; $3E7F; macro $35; SFX $3C ($3F18); $3E8B; loop
$22: reset; $3E5E poll; CA06=$15
```

### Worker $0D (Bank03:$664E) — familia KnockDown/Kiai

```text
$14: reset; $3E7F; macro $2B; $3E8B; SFX $42 (C=$42,B=$05, $1CC6); ++CA06
$15: reset; $3E5E poll; CA06=0 (fin)
```

### Worker $0F (Bank03:$6685) — estados tardíos

```text
$17: $3239; BC=$0003; $2FCE; $34C7; ++CA06
$18: CA81=$01; $CA59->$CA0A; $34B8; $3239; loop
$19: $3239; BC=$0003; $2FCE; $34C7; CA06=0 (fin)
```

### Staging y helpers (Bank00)

```text
$2C30: layout -> WRAM $C600/$C680 (doble buffer, toggle $C417,
       copia vía $073B/$073F/$0763 -> $0FE8/$1032);
       tileCount -> $C216; graphics 2bpp -> VRAM $8800 (job $10B0 + $10CF)
$10B0: registra job de transferencia VRAM (escribe $C211+)
$3E7F: init VM de presentación (bank $7E -> $7271)
$3E8B: marca presentación busy=1
$3E5E: poll busy (A=0 -> listo)
$3E92: ejecutor de macro (punteros relativos $5D00)
$3F18/$3F60: helpers bank $7E (SFX/estado)
$39CF: secuencia de audio indexada (Bank30:$6600), no display
```

### V7.1 pendiente (residuo legítimo)

La rutina exacta que consume el layout WRAM y compone el tilemap BG ($9800)
para el card-indexed visual (147 sitios de `LD HL,$9800` son dibujado genérico;
identificar el compose específico del staging Support requiere seguir el job
$C211+ y el VBlank). No inventado.

## V7.2 — Support common profiles (CLOSED)

`supportCommonProfile(cardId)` en `src/battle/romSupportPresentationProfile.ts`:

```ts
{ family: 'SUPPORT_COMMON', cardVisual, fixedBg: {resource: 0x19, ...},
  holdTicks: 120, palette: {cardPaletteByte, effective, cardByte8Link},
  macro[], provenance: 'ROM_PRESENTATION' }
```

NO es una película semántica (no "aura_support").

## V7.3 — Support compiler (CLOSED)

`src/battle/romSupportPresentationCompiler.ts`:
`compileRomSupportPresentation(profile, opts)` → BattleTimeline con entries
ROM-backed (fidelity ROM_STATIC_VERIFIED, romSource ROM_PRESENTATION).
`compileAllRomSupportPresentations()` + `romSupportCompilerSummary()`.

## V7.4 — cutover $00/$02 (CLOSED, verify:rom-support-presentation-compiler)

```text
PASS determinismo: misma carta -> mismo timeline (3 compilaciones)
PASS SUPPORT_COMMON profile $00 (Resurrection #16)
PASS fixedBg 0x19 · holdTicks 120 · palette $FF conservado (nunca NONE)
PASS macro semantic UNRESOLVED
PASS 26 cartas $00/$02 · 26/26 BG_ASSEMBLY $19 · 26/26 HOLD120
PASS 48/48 SUPPORT_VISUAL_LOAD card-indexed
PASS 0 cues que muten Engine/HP/CC/Ki/RNG
PASS endTick >= 120 para $00/$02
```

Engine/EventLog intactos; sin anchors, sin slot bindings, sin nombres humanos
no demostrados.

## Pendiente V7

```text
V7.1 close: composición display exacta $0B/$0D/$0F (WRAM -> VRAM/BG -> cleanup)
V7.5 runtime cutover $0B/$0D/$0F
V7.6 Defense profiles/cutover (base: slot8 preload, 1 loader / 2 starts)
V7.7 romCA53 contextual propagation a Presentation (semanticOutcomeForCA53)
V7.8 Presenter/display validation (Pixi recibe datos, no reconstruye ROM)
```

## V7.1 CLOSED (nivel estructural) — pipeline display Support completo

Seguido el job `$C211+` hasta el consumidor VBlank y el BG tilemap final.

### Cola de jobs HDMA ($C218+)

```text
$10B0 encola job de 6 bytes en $C218 + idx*6:
  [0] VBK ($4F)           B ($01 -> VRAM bank 1)
  [1..2] src              $C214/$C215 (offset en staging $D800)
  [3..4] dst              DE ($8800; D&$1F -> $08)
  [5] length (en tiles)   += tileCount ($10CF: ADD A,(HL))
$114B: HL = $C218 + C*6 (slot pointer)
```

### Consumidor VBlank

```text
vector $0040 -> CALL $0292 -> $029F -> CALL $1080 (HDMA consumer)
$1080: por job: VBK->$4F; src=$D800+... -> $51/$52 (HDMA1/2);
       dst -> $53/$54 (HDMA3/4); len-1 -> $55 (HDMA5 trigger)
       -> tiles 2bpp a VRAM bank 1 $8800 (BG tiles)
fin: reset $C213..$C215
```

### Staging

```text
$2C30: layout (16B) -> WRAM $C600/$C680 (doble buffer, toggle $C417,
       copia $073B/$073F/$0763 -> $0FE8/$1032; granularidad word)
       tileCount -> $C216; graphics -> staging $D800 ($10CF/$0FFB);
       src $C214/$C215 avanza tileCount*16; job[5] += tileCount
```

### Composición del tilemap BG

```text
$3764(C,DE) -> Bank7E:$597E:
  selecciona $CA59 (C==1) o $CA5A (C!=1); índice tabla $5A68+E*2;
  DE = puntero a secuencia de composición
  -> $0943: escribe DE en la tabla de ActionObjects activos ($C3C8+,
     stride por $C3C6)
$0B07 (intérprete): HL = ActionObject activo ($C3A0 + idx*19, stride $13);
  calcula posición del tilemap vía puntero $C3CE/$C3CF y $C3D0;
  alimenta $C0F9/$C0FA (posición) -> $0685 (HL=$9800 + offset)
Escritura tilemap: directa a $9800 (vía $0685) o shadow $DD00/$DE00
  (tile/attr) con jobs de transferencia $C459+ ($11B3/$11D2, flags
  $C45C/$C45D, contador $C459)
```

Secuencias de composición (Bank7E:$5A68+, p.ej. $5A78):
`08 00 18 0A | 08 08 1A 0A | 08 10 1C 0A | 08 18 1E 0A | 18 00 20 0A | 18 08 22 0A`
= records de 4 bytes [pos, tile, attr] (tiles pares consecutivos = marco).

### Corrección V6.3b (errata, dato nuevo de V7.1)

Los words del layout NO son direcciones absolutas: son **offsets relativos a
$4000 del banco** (`addr = $4000 + (word & $3FFF)`), la misma convención de
$1266. La versión anterior restaba $4000 para words < $4000 y leía el banco
anterior (basura). Renderer corregido y renders layoutrefs regenerados
(96 PNG, RENDER_VALIDATION actualizado, SHA256SUMS V6 regenerado).

### Residuos finos (no bloquean cutover)

```text
1. formato exacto de records de secuencia de composición ($0B07) y su
   relación con el layout WRAM ($C600) para el card-indexed visual
2. campos exactos del ActionObject de composición ($C3CE/$C3CF/$C3D0)
3. si el tilemap se escribe directo a $9800 o vía shadow $DD00/$DE00
   depende del job $C459+ (ambos caminos existen)
```

## V7.1 estado

`V7.1 CLOSED (nivel estructural) — residuos finos documentados.`

## V7.5 — Support $0B/$0D/$0F runtime cutover (CLOSED)

`src/battle/supportRomCutover.ts` + `verify:support-rom-cutover`:

```text
PASS 22 cartas Support especiales ($0B=8, $0D=13, $0F=1)
PASS 22/22 ROM-backed, 0 legacy
PASS $0B romCA53=0 -> rama $1E; romCA53=2 -> $14 (numérico, no semántico)
PASS $0B timeline branch seleccionada en ROM_RESULT_BRANCH
PASS $0D -> macro $2B literal COMPLETE_ROM_VERIFIED + semantic UNRESOLVED
PASS $0F: 0 macros (FSM propia) + ROM_PENDING explícito
PASS 0 cues que muten Engine/HP/CC/Ki/RNG
PASS 0 ANIMATION_START (no auto-reproducir AnimationResource)
PASS golden timeline determinista
```

La rama $0B state $0D se conserva EXACTAMENTE como condición numérica
`romCA53 == 0 / != 0`; semanticOutcome es capa aparte (V7.7).

## V7.6 — Defense ROM Presentation (CLOSED)

`src/battle/romDefensePresentationProfile.ts` + `verify:rom-defense-presentation`:

```text
PASS 11 defensas con profile ROM
PASS Taiyoken CA83 $01 -> slot8 CONSUMED (03:60AE); +Sunglasses $81 -> NO_SLOT8
PASS Barrier/Breath CA53=3 -> slot8 03:59F9; Energy Absorb CA53=4 -> 03:59F9
PASS Avoiding CA53=1 / Endurance CA53=2 -> NO_SLOT8 (1/2 nunca implican slot8)
PASS Shockwave -> NO_SLOT8 + macro $38 literal
PASS Teleport / Time Freeze -> PRELOADED_NOT_STARTED_GLOBAL_STATIC
PASS semanticOutcome contextual (romCA53 + defenseCardId)
PASS 0 ANIMATION_START (sin playDefenseAnimation genérico)
```

## V7.7 — romCA53 consolidación (CLOSED)

`verify:rom-ca53-consolidation`: escanea src/ (sin comentarios) y exige:

```text
0 switch(romCA53) -> MISS en código
semanticOutcomeForCA53 como único traductor semántico
romCA53=2 -> NATURAL_MISS (ATTACK_MISSED) vs ENDURANCE_PARTIAL (#121)
supportRomCutover branch por romCA53 numérico, nunca semanticOutcome
```

## V7.8 — Presenter (en curso)

`BattlePresenter.ts`: los cues nuevos (SUPPORT_VISUAL_LOAD, BG_ASSEMBLY,
SUPPORT_MACRO, DISPLAY_COMPOSE, DISPLAY_CLEAR, PALETTE_LOAD) se enrutan a
`onRomCue` — el Presenter ejecuta primitivas, no conoce bancos ROM/WRAM.
Pendiente: render Pixi real de las primitivas + comparación
ROM_INSPECTION_RENDER ↔ RUNTIME_RENDER con diagnóstico
(GRAPHICS/LAYOUT/PALETTE/ORIENTATION/VISIBLE REGION/LAYERING).


## V7.8 — RomDisplayPresenter + ROM Display Lab (CLOSED)

`src/battle/romDisplay/RomDisplayPresenter.ts`: capa de display separada de
Fighter/Projectile/HUD. Consume los 6 cues ROM display y produce eventos
observables (VISUAL_LOADED / PALETTE_APPLIED / BG_ASSEMBLED / COMPOSED /
MACRO_RUN / CLEARED / PENDING). NUNCA no-op silencioso: cues no reconocidos →
PENDING explícito. No conoce bancos ROM/WRAM/direcciones.

`src/devtools/romDisplayLab.tsx` (Dev Studio #dev/romdisplay "ROM Display"):
comparación ROM_INSPECTION_RENDER ↔ RUNTIME COMPOSITE con selector Support
1/48 (‹ Prev / Next ›), canvas 192x160 dibujado por RomDisplayPresenter
(palette aplicada, compose, macro runs, clear) y validación GRAPHICS / LAYOUT /
PALETTE / ORIENTATION / VISIBLE AREA / LAYERING. Dev-only (imágenes servidas
desde docs/ por Vite).

`verify:v7-presenter-display` (PASS):

```text
PASS los 6 cues cubiertos por RomDisplayPresenter
PASS 0 cues silenciosos (48 Support: 306 cues -> evento siempre)
PASS PENDING explícito donde falta evidencia (90)
PASS 0 cues silenciosos (11 defensas: 18 cues)
PASS presenter sin acceso a BattleState (no muta Engine)
```

V7 CLOSED. Residuos -> backlog (no V8):
$0B07 records finos, $C3CE/$C3CF/$C3D0, $9800 directo vs shadow,
semántica humana de macros, anchors, semantic ActionObject binding.
