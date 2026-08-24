# R3.1A — Tail Capture Bootstrap (2026-08-24): resultados de sesión

> Estado: milestone 1 ALCANZADO (primer trace Tail completo + GATE PASS del decoder físico).
> HIT variant: BLOQUEADA por defensa enemiga determinista (Guard) — hallazgo documentado.
> Artefactos: `tools/rom-trace/r31a/artifacts/` (checksums SHA256).

## 1. Battle card blocks localizados y demostrados dinámicamente

- **PLAYER_BATTLE_BLOCK_BASE = 0xCB1A** (Gohan Kid, form ID 0x01)
- **ENEMY_BATTLE_BLOCK_BASE = 0xCB47** (Piccolo, form ID 0x05)
- Layout 45B (verificado con el corpus):
  - `+00..02` roster: `[01 00 00]` / `[05 00 00]` (form IDs 1-based)
  - `+03..17` Limits (5×3): player `[0D 00 00 ...]` (limit[0]=13 S.Kamehameha en la batalla Cell; `[01 ...]` en la de Gohan)
  - `+18..37` Joint Deck (20): barajado en batalla; copia display-order en 0xCDDF
  - `+38` drawIndex (0xCB40): 3 al inicio → 4 en fase ofensiva (+1 draw ✓)
  - `+39..44` hand (0xCB41..46): `[01 53 0C 00 00 00]` (3 Stage Atk, Bulma, Kamehameha)
- Método: **snapshot A/B (WRAM 0xC000-0xDFFF) + regiones new-in-B + parcheo UI-verificado**, NO inferencia.
- Verificación visual del encoding: `0xCB41=0x01` ↔ "3 Stage Atk" observado; `0xCB41=0x1D` ↔ **"Tail"** observado (JOIN picker). **Encoding directo 1-based, demostrado por comparación.**

## 2. Test definitivo de la spec (pausa → patch → resume → verificar)

- Pausa (driver C, entre comandos) → `write 0xCB41 29` → resume → RIGHT (JOIN) → A → el picker muestra **"Tail / Pow. 35/Dame / CC:26/13"** → restore `0xCB41=01` → readback OK.
- CC: **0xCA3E = 10 → 13** por diferencial (fase ofensiva +3 ✓). Coste Tail = 26 (tabla ROM: cc=0x1A).

## 3. Primer trace Tail completo — GATE PASS

- `tail_left_base.ss0`: picker JOIN abierto en Tail, pre-confirm (C0A0=5).
- `tail-trace-01.json` (620 frames, keyspec `60:1:8`): pre-roll (0-67, C0A0=5) → confirm (68-74, 8) → init (75-78, 9) → rush (79-97, 0x1E) → result (98-619, 0xB).
- **validate-trace.ts: 639/639 objetos activos resueltos, 0 UNKNOWN_ACTIVE_PHYSICAL_FRAME** (GATE PASS).
  - resource 66 (bank 0x61, base 0x30, 32 seqs): Gohan character resource — 483 frames
  - resource 68 (bank 0x61, base 0x1D7C, 4 seqs): resource de acción (slot5) — 156 frames
  - resource 67 (bank 0x61, base 0x970, 6 seqs): Piccolo — 349 frames
- Extensión del decoder: `bank61-resources.json` (bases registradas directas, no escaneadas) + `physical-decode.ts` indexa bank 0x61 + resolver escanea desde 0x20.
- Trace con binding de slot REAL: AO +1/+2 = puntero al AnimationSlot (0xCA0D+slot×3, slots 0-7 capturados; 0xCA1C = slot5); graphics source 0xCA28+slot×3.

## 4. Outcome del primer trace: variante DEFENDIDA (MISS)

- Resultado: "Gohan's Attack / □Tail" → "Piccolo's Guard / Squared off" → **CA53=1 (ZERO_AVOID), CA7F=3, daño 0** (Piccolo CurLife 768→768, battleStat 0xC18D).
- El Guard enemigo es determinista y **el roll NO lo afecta**: confirmDelayFrames 0-270 (roll = (delay+33) mod 100, barridos 0-99) → siempre CA53=1.
- CA82=2 (BASIC_GUARD) en todos los intentos. Parchear CA56=1/2 (CARD/MOVE), mano enemiga con defensas (124 Shockwave×4, 125 Avoiding), y buffer AI ($D20C/D+$D20E=$B0) → todos revierten a Guard.
- **Conclusión honesta**: con este savestate (Piccolo sin cartas de defensa en mano y AI que elige Guard vs DAMAGE), el Tail NO conecta nunca. La variante HIT requiere o bien un savestate donde el AI enemigo elija CARD (política AI + mano), o cerrar la ruta de selección de carta defensiva (CA82=1 / Jump_07e_57e0) a nivel de código. Esto NO se resuelve con "same savestate + delay" — hallazgo ROM genuino.

## 5. Otros hallazgos

- Menú de batalla: comandos **LIMIT → JOIN → BASIC** (RIGHT cicla; LEFT no desde LIMIT). JOIN = picker de mano (cicla con RIGHT). BASIC → GUARD/MOVE (toggle RIGHT/LEFT), A confirma.
- Exit del SYSTEM menu pregunta **"Save? Yes/No"** (RIGHT para No). El "Yes" accidental guardó el equipo Gohan en el save de batería (backup: `dbz-lsw-usa.sav.bak-gohan-20260824`; se conservó el 100%).
- 0xCC01 = byte de carta seleccionada en el picker (0x01 mano[0], 0x0D limit[0], 0x1D Tail).
- battleStat: Gohan @ 0xC180 (768/525 — HP persistente del save), Piccolo @ 0xC18D (768/768).

## 6. Siguiente (handoff)

1. HIT: localizar la selección de carta defensiva del AI (CA82=1 path, Jump_07e_57e0; consumidor de $D20C/D) o preparar un savestate donde el enemigo elija CARD.
2. Tras HIT+MISS → matriz 2×2 LEFT/RIGHT (RIGHT = lado enemigo, requiere setup de batalla con atacante a la derecha).
3. Purple Comet ($0D) y P.Comet Z ($0E) con el mismo protocolo.
4. NO re-investigar: layout ActionObject, AnimationSlot, graphics renderer, reachability de secuencias Tail/V-ball (STATIC VERIFIED).

---

## 7. Purple Comet $0D — setup completado, confirm BLOQUEADO (2026-08-24)

### Setup logrado
- Equipo Jeice (form 0x1E) vía TEAM menu → batalla ✓ (roster [1E 00 00]).
- Picker JOIN muestra Purple Comet (select byte 0x39) ✓.
- Validador $7B96 PASA (C2D0=0, C2D1=0x1C=28 coste, C2D2=0x39) ✓.
- Mask/CC/battleStat parcheados sin efecto. **El confirm ofensivo NO dispara** (C0A0 se queda en 5).

### Mecánica de confirm DESCUBIERTA (importante)
- **El CC real = 0xCA3E** y el confirm exige `CC >= coste de la carta`:
  - stage1 (cost 4): confirma con CC=13 natural.
  - Tail (cost 26): rechaza con CC=13, CONFIRMA con CC=30 (el trace original de Tail fue con CA3E=30).
  - Masenko (18) y Kamehameha (16): rechazan con CC=13, confirman con CC=30.
  - Purple Comet (28): con CC=30 en la batalla Gohan → rechazo por compatibilidad (esperado).
- C2D0 = 0 para todos (el validador no es el bloqueo). CA40/CA48/mask-FF/battleStat+2 = sin efecto.
- El picker JOIN confirma con A; el select LIMIT no confirma con A/START (display-only).

### Bloqueo específico de la batalla Jeice
- En la batalla con Jeice, NINGUNA carta confirma (ni Shockwave 124, su propia carta, con CC=30).
- Diferencia de estado observada: battleStat+2 ($CA3C+2) = 0x1E (30) en Jeice vs 0x0D (13) en Gohan
  (y 0x10/0x11 en el bloque enemigo). No es el CC ni la forma. PENDIENTE de resolver
  (candidato: carga de datos de personaje del equipo cambiado; probar forma 0x1D de Jeice,
  o el setup vía CHARA select completo con popup de forma).
- El save de batería se restauró al backup Gohan tras las pruebas.

### Siguiente para PC
1. Resolver el confirm de la batalla Jeice (probar forma 0x1D, o validar el popup de forma
   en el CHARA select — el flujo actual selecciona sin popup).
2. Con el confirm OK: crear pc_left_base → trace multi-actor → validar decoder (AMBOS AOs
   activos simultáneamente — el objetivo multi-object de $0D).
3. Repetir para P.Comet Z ($0E) con el mismo setup.
