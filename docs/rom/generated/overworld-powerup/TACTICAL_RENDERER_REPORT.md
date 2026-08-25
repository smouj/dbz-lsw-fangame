# TACTICAL RENDERER REPORT (S-OW1B)

**Fecha**: 2026-08-24 · **Estado**: pregunta decisiva CERRADA · gramática de frames PENDIENTE

## 1. Pregunta decisiva — RESPUESTA

**¿`powerWindowCounter` (fighterState+4) afecta el render FIELD/táctico?**

**NO — `TACTICAL_POWER_STATE_VISUAL = NONE`** (alta confianza).

El contador (`$CA40` P1 / `$CA48` P2) es consumido SOLO por:
- **GAMEPLAY** (bank_001): maintenance decrement, LIMIT gate, CHARA finalize (=2), GATHER finalize (=5), helpers.
- **ACTION_PRESENTATION** (bank_07e presentation VM): lecturas boolean/`cp $01`/`cp $02`/`cp $03` + 2 clears (=0).

NINGÚN consumidor escribe OAM/tile de sprite pequeño (FIELD). Catálogo exhaustivo en `power-window-consumers.json` (15 consumidores indirectos) + `bank7e-ca48-consumers.json` (9 lecturas directas).

## 2. Micro-audit `$CA48` (Bank7E)

9 lecturas directas, todas READ-only, todas en el presentation VM (plano ACTION):

| línea | label | check | clasificación |
|---|---|---|---|
| 7158 | `jr_07e_686a` | `and a / jr nz` | ACTION_PRESENTATION |
| 7281 | `jr_07e_6921` | `and a / jr z` | ACTION_PRESENTATION |
| 7335 | `Jump_07e_6971` | `cp $01 / jr z` | ACTION_PRESENTATION |
| 7572 | `Jump_07e_6abe` | `cp $02 / jr nz` (+`$CA46 cp $14`) | ACTION_PRESENTATION |
| 7807 | `jr_07e_6c08` | `and a / jr z` | ACTION_PRESENTATION |
| 7951 | `Call_07e_6cf7` | `and a / ret z` | ACTION_PRESENTATION |
| 8086 | (anónimo) | `and a / jr z` | ACTION_PRESENTATION |
| 8222 | `Call_07e_6e88` | `and a / jr z` | ACTION_PRESENTATION |
| 8451 | `Jump_07e_6ff6` | `and a / jr z` (+`$CA55 cp $04`=GATHER) | ACTION_PRESENTATION |

**Veredicto**: `BANK7E_CA48_FIELD_RENDER_CONSUMER = NONE_FOUND`. Bank7E no debe seguir persiguiéndose para FIELD.

## 3. Pipeline físico OAM — localizado parcialmente

```text
shadow OAM          = $C300 (160 bytes = 40 sprites x 4B)
DMA routine         = bank_000 ~$0C33: ld a,$c3 / ldh [rDMA],a / ld a,$28 / wait
sprite append       = Call_000_087c / Call_000_0880 (escribe 4B desde $C0F9-$C0FC en $C300 + ($C3D4<<2))
flush               = Call_000_089b (cero los sprites restantes)
reset               = Call_000_08bb (limpia ActionObjects $C3A0 + $C3D4=0)
ActionObjects       = $C3A0 (stride $13=19, slot1 $C3B3, active/index $C3C6) — justo tras el shadow OAM
```

Callers de `Call_000_087c` (productores de sprite) encontrados: bank_000:10003/10011, bank_003:7012/7019, bank_07e:2646/4447/4451. Los examinados (bank_07e) son **FX/partículas UI** (`add $38`/`add $48` coords fijas; punteros `$5A58`/`$5A60`), NO el fighter FIELD.

## 4. fighterState (field map parcial)

| offset | P1 | P2 | significado |
|---|---|---|---|
| +0 | $CA3C | $CA44 | position flags (bit0=vertical, bit1=BACK) |
| +1 | $CA3D | $CA45 | (3 refs P1) — pendiente |
| +2 | $CA3E | $CA46 | ¿coordenada? (P2 leído `cp $14`) — pendiente |
| +3 | $CA3F | $CA47 | sin acceso directo |
| +4 | $CA40 | $CA48 | **powerWindowCounter** |
| +5..+7 | — | — | sin acceso directo |

Asimetría: P2 (+2/+4) se lee directo; P1 (+2/+4) solo indirecto (Call_000_2fd5). Consistente con "actor activo vía puntero + target vía dirección directa".

## 5. PENDIENTE (gramática de frames FIELD)

- Writer del fighter pequeño FIELD (quién produce Y/X/tile/attr del chibi táctico en shadow OAM).
- tile ID → graphics source (banco/VRAM) del chibi.
- selector form/profile → tile ID (gráficos pequeños; S-MAP2 ya cerró el ACTION, falta el SMALL/táctico).
- frame selector (idle / movement) — qué estado controla el frame del chibi.
- Taxonomía `TACTICAL_FRAME_STATE_*` mediante consumidores (nunca al revés).
- Comparación FIELD normal vs FIELD tras Gather (redundante dado el cierre: se espera idéntico).

## 6. Guardrail (no confundir dominios)

Todo render object se clasifica como: `TACTICAL_SMALL_ACTOR` · `ACTION_FIGHTER_OBJ` · `ACTION_FX_BG` · `UI_OBJECT` · `UNKNOWN`.

## 7. Consecuencia para CharacterRoll

Con S-OW1A + S-OW1B:
```text
GBC TACTICAL        idle / movement · SIN power-up visual persistente
GBC ACTION GATHER   fighter NEUTRO + FX $1A + paleta $33
REMAKE CHARACTER ROLL = animación de selección/power-up INSPIRADA en Gather = REMAKE_PRESENTATION
```
El selector distintivo se puede hacer sin fingir fidelidad ROM inexistente.
