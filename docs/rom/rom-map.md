# ROM Map — Dragon Ball Z: Legendary Super Warriors

> **Fuente de verdad**: la ROM pasa a ser la referencia principal del proyecto.
> La documentación anterior (Kanzenshuu/GameFAQs/vídeos) queda como hipótesis
> y diseño del remake, marcada explícitamente cuando no está confirmada.
>
> **Marcadores**:
> - ✅ **ROM_CONFIRMED** — extraído directamente de la ROM
> - 🟡 **ROM_INFERRED** — deducido de datos ROM sin trazar la rutina
> - 🔵 **REMAKE_CANON** — decisión de diseño del remake (no del juego)
> - ❌ **OBSOLETE** — contradicho por la ROM

## ROMs (referencia, no versionadas — `*.gbc` en .gitignore)

| ROM | SHA-256 | Header | Tamaño |
|---|---|---|---|
| USA (`dbz-lsw-usa.gbc`) | `8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee` | `I-DBZ-US` / `BBZE` | 2 MiB |
| Spain (`dbz-lsw-spain.gbc`) | `bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804` | `DRAGONBALL:BBZS` | 2 MiB |

Plataforma: **Game Boy Color exclusivo** · Mapper **MBC5 + RAM + Battery** ·
128 bancos ROM de 16 KiB · 8 KiB RAM externa · checksums de cabecera y global OK.

Ubicación: `dbz-lsw-decomp/13_raw_rom/` (bancos separados en `banks/bank_XX.bin`).

---

## 📊 CARD TABLE — ✅ ROM_CONFIRMED

- **Banco**: `$11` · **Rango**: `RO11:$4320–$4AEF` · **125 registros × 16 bytes**
- Físico: `0x44000 + 0x320` (la ventana conmutable 0x4000–0x7FFF mapea al
  offset `banco*0x4000`; dirección de ventana `$4320` → `+0x320`).
- Termina con 16 bytes `00` en `RO11:$4AF0` (firma del fin de tabla).

### Estructura del registro (16 bytes)

| Byte | Campo | Ejemplo Cont.Punch (`02 0A 64 33 0A 0A 2C FF…`) |
|---|---|---|
| 0 | Categoría | `02` = DAMAGE |
| 1 | Power | `0A` = 10 |
| 2 | Accuracy | `64` = 100 |
| 3 | ID interna | `33` = 51 (= índice + 46) |
| 4 | CC Cost | `0A` = 10 |
| 5 | **Selector de ejecución** | `0A` = melee |
| 6 | Flags (por trazar) | `2C` |
| 7–8 | Flags de carta (por trazar) | `FF FF` |
| 9–14 | **Máscara compatibilidad 48-bit** (6 bytes) | `FF FF FF FF FF FF` = universal |
| 15 | Terminador/flag | `00` |

### Categorías — ✅ ROM_CONFIRMED

| Valor | Categoría | Cantidad |
|---:|---|---:|
| `01` | Command / Stage | 4 |
| `02` | Damage | 24 |
| `03` | Beam | 38 |
| `04` | Support / Item | 48 |
| `05` | Defense | 11 |
| | **TOTAL** | **125** |

### Verificación contra el catálogo del remake

`scripts/compare-cards.ts` → **0/125 discrepancias** en type/atk/acc/cc.
El catálogo de `src/data/cards.ts` coincide exactamente con la ROM.

### Selector de ejecución (byte 5) — ✅ ROM_CONFIRMED (taxonomía interna)

La ROM agrupa las técnicas por **rutina de ejecución**, no por categoría visible:

| Sel | Familia | Nº | Cartas |
|---|---|---|---|
| `00` | Sin ejecución (command/defensa/soporte pasivo) | 19 | 3-6 stage, Special Card, Resurrection, Taiyoken, Teleport., Barrier, Time Freeze… |
| `02` | **RAY/BEAM** (proyectil ki) | 38 | Energy Wave, Masenko, Kamehameha, S./F.Kamehameha, S.Beam Can., Galick-Ho, Final Flash, Flash.Sword, Lightning C., Finger/Eye Beam, Hell Flash… |
| `03` | Beam especial | 3 | Telekinesis, Eraser Can., Body Change |
| `04` | Beam único | 1 | Burning Atk. |
| `05` | **BOMB/BALL** | 10 | Energy Bomb, F.Lightbomb, Big Bang Atk, Fin.Buster, S.G.K.Atk., KiBlast Bomb, M.Soundwave, Grand Wave, Rocket Punch, Energy Slash |
| `06` | Damage único | 1 | Potbelly Atk |
| `07` | **DISC/ORB** | 7 | Destruct-Disk, S.Destruc-D., Spirit Bomb, Galactica D., Crasher Ball, Super E-Ball, Energy Slice |
| `08` | Beam único | 1 | Suicide |
| `0A` | **MELEE físico** | 19 | Cont.Punch, Cont.Kick, Dunk Shot, Sonic Kick, Solid Shot, Rising Kick, Flash Punch, Atomic Break, N.Slasher, R.F.B.Atk., Mach Attack, Dynami.Punch, S.Dash Elbow, Crazy Rush, Attack No. 18, Life Absorb, Cell Combo, Step Up Atk., Crasher Buu |
| `0B` | **SUMMON/ITEM** | 9 | Tail, Tien, Yajirobe, Hercule, Dabura, Stop Device, Gamebomb, H's Choco., Naughty Book |
| `0C` | Damage único | 1 | V-ball Crash |
| `0D` | **SUPPORT/CALL** | 14 | Kiai, Paralysis, Purple Comet, Bulma, Chaiotzu, Kaio, Supreme Kai, Babidi, Yakon, Scouter, Gravity Dev., Sealed Ball, Heart Virus, Sandglass |
| `0E` | Damage único | 1 | P.Comet Z |
| `0F` | Support único | 1 | Ene.Absorber |

**Implicación para el remake**: nuestros `ActionProfile` deben modelar estas
familias (`RAY`, `BALL`, `DISC`, `MELEE`, `SUPPORT`, `SUMMON`, `SPECIAL`) en vez
de inventar taxonomías propias.

### Máscara de compatibilidad (bytes 9–14) — ✅ ROM_CONFIRMED

48 bits = **48 formas jugables** (personaje + transformación). Ejemplos:

| Carta | Máscara (6 bytes) | Wiki |
|---|---|---|
| Cont.Punch (universal) | `FF FF FF FF FF FF` | todos |
| Kamehameha | `C7 C7 81 03 C0 7F` | goku, cell, buu, goten… |
| F.Kamehameha | `07 00 00 00 00 00` | goku |
| Masenko | `3F C0 07 00 00 00` | gohan_kid, gohan_adult, piccolo, trunks_future |
| Tail | `07 00 00 00 00 00` | gohan_kid |

**Anclas resueltas** (cartas exclusivas de 1 personaje → bit directo):

| Bit | Personaje | Evidencia |
|---|---|---|
| 0–2 | Gohan Kid | Tail `07` |
| 3–5 | Piccolo | Sonic Kick `38`, F.Lightbomb `28` |
| 6 | Krillin | Misty KiWave `40`, S.Destruc-D. `40` |
| 7–10 | Goku | Kaio Ken `80`, Spirit Bomb/Solid Shot `8007` |
| 11–13 | Vegeta | Galick-Ho `3800`, Final Flash `3000`, Suicide `2000` |
| 14–16 | (gohan_adult/rango) | intersección gohan_kid+adult |
| 17–18 | Trunks Future | Rising Kick `60000`, Fin.Buster `400000` |
| 19–20 | Goten | Kamekameha `300000` |
| 21–22 | Trunks Kid | Flash Punch `200000` |
| 23–24 | Buu | V-ball Crash `1000000`, S.G.K.Atk. |
| 25 | Vegito **o** Trunks | ⚠️ **conflicto** — Atomic Break `2000000` vs Flash.Sword `2000000` |
| 26 | Nappa | N.Slasher/KiBlast/Lightning `4000000` |
| 27 | Guldo | Telekinesis/Soundwave/Paralysis/TimeFreeze `8000000` |
| 28 | Recoome | Eraser Can./R.F.B.Atk. `10000000` |
| 29–30 | Jeice | Crasher Ball `20000000`, Speed Up/Mach `40000000` |
| 31 | Ginyu | Body Change `80000000` |
| 32 | Freeza | Grand Wave `100000000` |
| 33 | Androide 16 | Rocket Punch/Hell Flash `200000000` |
| 34 | Androide 17 | Crazy Rush `400000000` |
| 35 | Androide 18 | Energy Slice/Attack No.18 `800000000` |
| 36–37 | (androides) | rango 18+ |
| 38–40 | Cell | Cell Combo `7000000000` |
| 41 | Cell Jr. | Step Up Atk. |
| 42–47 | Buu/ginyu/rango | Flesh Guard/Potbelly `40000000000` |

> ⚠️ **Conflicto pendiente de resolver**: bit 25 lo reclaman Atomic Break
> (wiki: Vegito) y Flash.Sword (wiki: Trunks Future). La tabla de formas
> definitiva (siguiente tarea) dirá quién es. Si la wiki se equivocó, corregir.

`scripts/solve-compat.ts` resuelve el mapeo por restricciones.
`scripts/decode-compat.ts` lista cartas restringidas vs universales.

---

## 📊 CHARACTER / FORM TABLE — 🟡 ROM_INFERRED (en curso)

- Tabla de offsets de 16 bits en `RO11:$4B00` (49 entradas, idéntica USA/Spain
  → estructural). Los offsets (0x62…0x16B) apuntan a nombres cortos.
- Listas de IDs de forma 0x00-terminadas en `RO11:$4B62+` (idénticas entre
  ROMs → estructura): son el **roster del modo historia** — cada batalla
  lista las formas disponibles (IDs 0x01–0x30 = 48 formas). Los IDs
  coinciden con los bits de la máscara de compatibilidad (bit N = forma N).
  Ejemplos: `01,02,03,0F,10,11,2E` ×3 (batallas del capítulo), `04,05,06,2D,2E` ×3…
- El inicio del banco 11 contiene registros de 16 bytes por forma (level-ups).
- `RO11:$4D00+`: tiles de la fuente del juego (por eso los nombres no son
  buscables en ASCII — el charset es de tiles).

**Pendiente**: mapear la fuente de tiles → nombres, confirmar el orden de las
48 formas y resolver el conflicto del bit 25.

## 📊 ANIMATION RESOURCES — ✅ ROM_CONFIRMED (12 técnicas extraídas)

- Bancos $62/$63/$64: tabla global de recursos (u16 count + pares offset/size acumulativos).
- Formato de frame del reproductor GBC (confirmado byte a byte):
  `[u8 metaspriteIndex, u8 durationTicks, s8 deltaY, s8 deltaX]`
- `scripts/extract-anim-seq.py` escanea secuencias y cruza contra ground truth;
  `src/data/romAnimationData.ts` (generado) expone `ROM_TECHNIQUES`.

### Técnicas ROM_CONFIRMED (ticks por secuencia)

| Técnica | Handler | Anim res | FX res | Pal | Secuencias (ticks) |
|---|---:|---:|---:|---:|---|
| Kamehameha | 02 | 03 | 05 | 2C | 75×6 (hold 60t en frame 3) |
| Masenko | 02 | — | — | — | 74×2 |
| Galick-Ho | 02 | — | — | — | 76×2 |
| Final Flash | 02 | — | — | — | 78×2 |
| Energy Wave | 02 | — | — | — | 15×2 |
| Finger Beam | 02 | — | — | — | 13×2 |
| Big Bang Attack | 05 | — | — | — | 75×2 |
| Destructo Disk | 07 | — | — | — | 79×4 |
| Special Beam Cannon | 02 | — | — | — | 78×2 |
| Misty KiWave | 07 | — | — | — | 77 |
| Spirit Bomb | 07 | — | — | — | 85 |
| Tail | 0B | — | — | — | 31/225 |

> **El hold de carga (60 ticks) está programado en la ROM** — respalda no interpolar
> constantemente al personaje. Kamehameha: meta1 dx +2/+3/+3/+2, meta2 dx -2/-4/-5/-4.

### Estructura del AnimationResource (análisis, por confirmar fina)

- 3 punteros relativos → Sequence Section / Metasprite Section / Tile Mapping.
- Metasprites GBC: u8 pieceCount + piezas `[ΔY, ΔX, tile, attr]` (ej. 0C = 12 piezas OAM).
- Tile mapping: tabla paralela `[tile, attr]` por pieza (pendiente semántica fina).

## 📊 OTRAS TABLAS LOCALIZADAS

- `RO11:$4AF0` — 16×`00` (firma fin de card table)
- `RO11:$4B00` — tabla offsets formas (49×2 bytes)
- `RO11:$4B62` — roster modo historia (listas 0x00-terminadas de formas)
- `RO11:$4D00` — tiles de fuente (charset)

---

## Estado del remake vs ROM

> Tabla de detalle completa: `docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md`
> (lote 2 §1–46 + lote 3 §47–84 + lote 4 §85–131, 2026-08-22).

| Área | Estado | Marca |
|---|---|---|
| Stats de cartas (125) | idénticas a la ROM | ✅ ROM_CONFIRMED |
| Taxonomía de técnicas | familias reales extraídas | ✅ ROM_CONFIRMED |
| Compatibilidad cartas | 90% anclas resueltas, 1 conflicto | 🟡 ROM_INFERRED |
| Timings cinematográficos | traza de handlers/macros/opcodes | ✅ ROM_CONFIRMED |
| Stage QTE | ventana única + matriz FRONT/BACK + A/B recovery + fórmula cerrada + CC + reposition | ✅ ROM_CONFIRMED |
| Gather Power | contador 5, FX Bank68:$1A, paleta $33, core 90 ticks | ✅ ROM_CONFIRMED |
| Power window (fighterState+4) | powerWindowCounter: Gather=5 · CHARA=2 · LIMIT gate · Stage 3→4 · +4 offense | ✅ ROM_CONFIRMED |
| Tirada de impacto | contador cíclico 0–99 ($C231→$CA5D), sin PRNG | ✅ ROM_CONFIRMED |
| FRONT/BACK | bit1: 0=FRONT, 1=BACK; ±8 posicional; afecta Stage (tiempo y daño) | ✅ ROM_CONFIRMED |
| Battle block / deck 20 / mano 6 / CC | roster, limits loadout, draw index, descarte 6→5, 10 CC + draw 3, +3 CC + draw 1 | ✅ ROM_CONFIRMED |
| LIMIT / CHARA | LIMIT: reusable, consume CC, gate powerWindow, ataque+defensa · CHARA: commit en cinematografía, fuerza BACK, counter=2 | ✅ ROM_CONFIRMED |
| Stats de combate | Max/Current Life, Str/Ki/Speed, buffs/debuffs bitfield, HP→CC 8 tramos | ✅ ROM_CONFIRMED |
| Resolución | CA53: FULL/ZERO_AVOID/PARTIAL/SPECIAL_NULLIFY/ENERGY_ABSORB; Basic Guard +4 | ✅ ROM_CONFIRMED |
| Defense bitfield (CA83) | 11 Defense Cards = reglas distintas; Energy Absorb cura; command suppression | ✅ ROM_CONFIRMED |
| Support | tabla de efectos numéricos localizada (29 cartas) | 🟢 avanzado |
| Fórmula Damage/Beam | estructura real (Kaio Ken ×2, ±8/tier), excepciones/orden pendientes | 🟡 ROM_INFERRED |
| Fórmula final Stage / battleStat +11/+12 / LIMIT·CHARA | ✅ cerrado (Stage $6Cxx–$6Fxx 🟢) · +11/+12 reserved · LIMIT/CHARA ✅ | ✅/🟡 |
| AI / KO / deck lifecycle | KO + auto replacement ✅ · AI 🟡 | 🟡/✅ |
