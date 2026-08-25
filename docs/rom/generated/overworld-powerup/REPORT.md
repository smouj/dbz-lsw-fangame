# S-OW1 — POWER-UP / GATHER SPRITE SEQUENCE (ROM-first)

**Estado**: S-OW1A CERRADO (2026-08-24 15:00) · S-OW1B EN PROGRESO (renderer TACTICAL localizado parcialmente)
**Fecha**: 2026-08-24
**Objetivo**: Cerrar ROM-first la identidad visual y la secuencia REAL de Power-Up/Gather
que deben consumir `CharacterRoll` y el combate, SIN fabricar frames/timings/poses ni
relaciones entre recursos.

---

## 0. Regla de oro (guardrails)

- NO se toca la lógica ROM de `powerWindowCounter`, CHARA ni el BattleEngine (contrato cerrado).
- NO se asume que el chibi/overworld Power-Up y el Gather del plano ACTION comparten recurso.
- NO se asume que `gather_power_pose` es una animación completa.
- NO se asume que el aura forma parte del sprite del actor.
- `UNKNOWN` / `UNRESOLVED` son respuestas válidas. `CANONICAL_EQUIVALENT_VISUAL`
  nunca se etiqueta como `ROM_EXACT`.

---

## 1. SEPARACIÓN DE DOMINIOS (hallazgo inicial)

Existen **tres dominios visuales distintos** + un FX, y el código del remake los
mezclaba. Evidencia:

### A. TACTICAL / OVERWORLD (chibi de menú/mapa)
- Fuente actual: `public/assets/overworld/panel_sprites/*_ow.png` (48 formas).
- Provenance: **OFICIAL GBC** — "paquete FIXED (QA 3189/3189)", sprites chibi 12–16 px
  (`src/data/overworld.ts` header).
- Naturaleza: PNGs **estáticos únicos** (idle). NO hay frame animation en disco.
- `overworldUrl(formId)` → `OVERWORLD_FILES[formId]` (mapeo 48 → archivo, con aliases:
  `piccolo_kami`/`piccolo_evil` → `piccolo_base_ow.png`, etc.).

### B. "BATTLE OVERWORLD" (capa actualmente usada por el roll)
- Fuente: `public/assets/overworld/battle/` (44 dirs) + `manifest.json`.
- **PROJECT_DERIVED (V9)** — NO es ROM. El `manifest.json` declara `sheet: "goku.png"`
  con rects `x0/y0/width/height` → son **recortes de las hojas de arte redibujado V9**,
  no extracción de la ROM.
  - `actor/idle` → copia byte-idéntica de `panel_sprites` (ya eliminada como duplicidad).
  - `actor/001_gather_power_pose` → brazos arriba (V9).
  - `effects/000_gather_power_aura` → destello de energía (V9).
- Formas con stub 1×1 (ej. `goku.ssj2` → `idle` = rect `0,0,1,1`): placeholder, no hay dato real.
- Comentario explícito en `battleOverworld.ts`: *"las 20 formas … tienen battle
  overworld **generado desde el V9** (power pose + aura)"*.

### C. ACTION / FIGHTER (sprite grande de combate)
- Fuente: `spriteManifest` + `combat` poses (`src/data/spriteManifest.ts`,
  `src/battle/spriteConfig.ts` COMBAT_POSE_ORDER).
- Los renders físicos S-MAP2 viven en `docs/rom/generated/fighters/resource_XX/`.

### D. GATHER FX (recurso aparte)
- ROM: **Bank $68** → copiado a VRAM `$8800` (ver §2). Paleta `$33` (Gather) / `$31` (CHARA).
- Es **FX**, no sprite de actor.

### Conclusión de dominio
```
POWER_UP_VISUAL_DOMAIN:
  TACTICAL_ACTOR   ← panel_sprites (idle-only en assets actuales)
  ACTION_ACTOR     ← spriteManifest/fighters (pose grande)
  BG_FX            ← Bank $68 → VRAM $8800 (Gather/CHARA)
  PROJECT_DERIVED  ← battle/ (V9) — gather_power_pose + aura (REMAKE_PRESENTATION)
```
La mezcla detectada: `CharacterRoll` usa `battleOverworldActorUrl(formId, 'gather_power_pose')`
+ aura V9 sobre el **chibi** → cruza el FX/pose del dominio ACTION/V9 con el dominio TACTICAL.
Eso es exactamente la deuda a eliminar.

---

## 2. RUTA ROM REAL DE GATHER POWER (ACTION)

Consolidada de `COMBAT_MECHANICS_ROM_CONFIRMED.md` (Lotes 5–8) + verificación en
descompilación mgbdis (`dbz-lsw-decomp/build/mgbdis/`).

### 2.1 Cadena de control (lógica — YA cerrada, no tocar)
```
Comando Gather (CA36==4 → CA55=4, CA57=0)
→ ActionExecution (cinematografía propia, presentation $0E lado1 / $18 lado2)
→ termina → C0A0=$02 → Bank01:$4B21 → post-action maintenance ($4B66)
→ fighterState+4 = 5  (escritura en Bank01:$7A18)
```

### 2.2 Presentación (cinemática)
- Macros de presentación: Bank30:$5D00 (tabla de punteros + comandos 5B).
- CHARA usa $27 (CHARA_EXIT) / $28 (CHARA_ENTRY) — **Gather NO hace swap de miembro**.
- Interpolador de paletas CGB: `Call_000_07f4` / `Call_000_080c` (RGB15, buffers $C600/$C680).

### 2.3 FX real (evidencia en bank_003.asm)
Dos loaders de FX en `bank_003.asm` (~líneas 6410–6560):

```asm
; loader 1 — via $ca04 (Gather)
jr_003_6711:
    ld b, $68          ; banco 0x68
    ld de, $0019       ; recurso offset/length 0x19
    ld a, b
    call Call_000_1266 ; seleccionar banco + setup
    ld c, $01
    ld hl, $8800       ; destino VRAM
    call Call_000_051d ; copiar tiles a VRAM
    ...

; loader 2 — via $ca03 (CHARA)
jr_003_67a3:
    ld b, $68
    ld de, $001a       ; recurso 0x1a
    ...
    ld hl, $8800
    call Call_000_051d
```
- Ambos copian a VRAM `$8800` desde **Bank $68** → confirma el hallazgo Lot 5
  ("FX compartido Gather/CHARA: Bank68 → VRAM $8800").
- Tablas de parámetros: base `$6834` (stride 13B) y `$688f` (stride 17B), indexadas
  por `$ca04-9` / `$ca03-9`.
- Core FX ≈ 90 ticks (≈1.5s) — el FX anima, no el actor.

### 2.4 RESULTADO DEFINITIVO (S-OW1A cerrado)

| Componente | Resultado |
|---|---|
| Fighter AO started | **YES** (`Call_001_7422`, slots 0/1, VRAM `$8E00`) |
| ActionObject index | slot 0 (actor) / slot 1 (target) |
| AnimationSlot | slot 0 |
| AnimationResource | **N/A** — el actor queda en estado NEUTRO |
| selector | Macro `$19` = `SET_ANIMATION_STATE slot=0 variant=0` |
| visualFrameIds | **N/A** (sin secuencia multi-frame del actor) |
| ticks | FX core 90 ticks (`$5A`) |
| loop | no (efecto de duración fija `CB77++ < $5A`) |
| hold-last | N/A (actor estático) |
| actor coordinates | sin movimiento |
| FX resource | **`$1A`** (Bank $68, índice 26) |
| FX palette | **`$33`** (Gather) / `$31` (CHARA) |
| FX duration | 90 ticks core + setup/transiciones (~160 ticks mín) |
| cleanup | `Call_001_7993` estado 6 → `$ca01=0` |

**Conclusión** → `GATHER_ACTION_ACTOR = STATIC` · `GATHER_VISUAL = BG_FX + PALETTE`.
El actor NO hace una pose "brazos arriba" animada. La pose `gather_power_pose` del
asset actual es un redraw V9 (PROJECT_DERIVED), no una secuencia ROM.

---

## 3. POWER-UP TACTICAL / CHIBI (S-OW1B)

- En los assets actuales el chibi es **idle-only** (PNGs estáticos).
- **Corrección de hipótesis**: el `gather_power_pose`/aura actuales son V9 (no ROM).
- **PREGUNTA DECISIVA CERRADA (15:20)**: `powerWindowCounter` (fighterState+4 = `$CA40`/`$CA48`)
  es consumido SOLO por GAMEPLAY (maintenance/LIMIT/CHARA/GATHER) y ACTION_PRESENTATION
  (presentation VM). **NINGÚN consumidor FIELD** → `TACTICAL_POWER_STATE_VISUAL = NONE`.
  Detalle en `TACTICAL_RENDERER_REPORT.md`, `power-window-consumers.json`, `bank7e-ca48-consumers.json`.
- **Pipeline físico localizado**: shadow OAM `$C300` · DMA `bank_000 ~$0C33` · sprite append
  `Call_000_087c`. Callers examinados = FX/partículas UI, no el fighter FIELD.
- **OPEN**: writer del fighter pequeño FIELD + tile ID → graphics source + form selector
  + frame selector (gramática `TACTICAL_FRAME_STATE_*`). No solo power-up: reconstruir
  idle/movement mediante consumidores.
- **S-OW1C (15:45) — nivel PACKAGE confirmado**: el sheet `overworld-sprites.png` (rip
  Spriters Resource) tiene ~8-19 frames por chibi (idle + marcha 4-direccional ×2 + poses
  especiales). Los 43 `_ow.png` del proyecto son SOLO el frame idle → la gramática de marcha
  NO está en el proyecto. Detalle en `tactical-frame-grammar.json`.
- **Aclaración de dominio**: el chibi "táctico" = OVERWORLD (mapa/menú), NO el battle field
  (que usa ACTION fighter). El motor del mapa overworld (frame selector) sigue PENDIENTE en
  el desensamblado (mgbdis labels genéricos; posible ruta BizHawk si el estático no resuelve).

---

## 4. SIGUIENTES PASOS (mapa a las secciones del plan)

1. **§2 (completar)** — AnimationResource/sequenceSelector del ActionObject del Gather.
2. **§3** — localizar motor overworld/mapa → frames reales del chibi (idle/walk/power?).
3. **§4** — extraer frames físicos (pixel-exact) de lo que se demuestre.
4. **§5** — `overworld-powerup-bindings.json` para 48/48 (con `SHARED_PHYSICAL`,
   `SEMANTIC_ALIAS`, `FALLBACK` explícitos).
5. **§6** — `CharacterRoll`: `powerUpBindingFor(formId)` en vez de `gather_power_pose`
   hardcodeado; el jitter de `CHARGE` queda marcado `REMAKE_PRESENTATION`.
6. **§8** — Dev Studio: vista "POWER-UP SOURCE" (tactical vs action vs aura, por separado).
7. **§9** — `verify:overworld-powerup` (gate de 48/48, 0 sin marcar, 0 FX como actor, etc.).

---

## 5. ARTEFACTOS
- `gather-action-path.json` — ruta ACTION consolidada con evidencia (este dir).
- (pendiente) `tactical-powerup-path.json`, `overworld-powerup-bindings.json`,
  `physical-frames.json`, `unresolved.json`.
