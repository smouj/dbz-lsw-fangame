# PRODUCTION VISUAL MATRIX (P0.4R-B8)

**GENERADO — no editar a mano.** Regenerar con `npm run gen:production-visual-matrix`.

Cadena auditada: `ROM evidence → compiler/timeline → adapter → ActionObjects /
Display / FX / palette / camera → Pixi Production → cleanup FIELD`.

## Estados

| Estado | Significado | Filas |
| --- | --- | ---: |
| VERIFIED | evidencia ROM + cadena de producción observada | 6 |
| PENDING | la cadena existe pero falta cerrar evidencia | 1 |
| DEFERRED_TO_TRACE | sin driver determinista; requiere traza dinámica | 7 |

La ausencia de evidencia se clasifica explícitamente. Nunca se degrada a
«fallo visual genérico».

## Cobertura de familias representativas

Familias exigidas: **14** · cubiertas: **14**

## Matriz

| Familia | Carta | Handler | Entry | Binding | Slots | 1er physicalId | Visibilidad | Draw order | BG | Palette | FX | Camera | Impact | Exit | Residual | Fidelidad |
| --- | ---: | --- | ---: | --- | --- | ---: | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| STANDARD_DAMAGE hit | 5 | $0A STANDARD_DAMAGE | 0 | OFFENSE | 0:ATTACKER/PLAYER · 1:DEFENDER/ENEMY | 44 | player:on → enemy:off → enemy:on | — | none | programa + ticks | — | — | — | — | 0 | VERIFIED |
| STANDARD_DAMAGE miss/avoid | 5 | $0A STANDARD_DAMAGE | 0 | OFFENSE | 0:ATTACKER/PLAYER · 1:DEFENDER/ENEMY | 44 | player:on → enemy:off → enemy:on | — | none | programa + ticks | — | — | — | — | 0 | VERIFIED |
| Beam $02 | 7 | $02 BEAM | 0 | OFFENSE | 0:ATTACKER/PLAYER · 1:DEFENDER/ENEMY | 0 | player:on → enemy:off → enemy:on | SLOT_0_THEN_1 | none | programa + ticks | 1 FX_LOAD | — | — | — | 0 | VERIFIED |
| Defense reaction | 45 | $CA83 DEFENSE_RULE | 0 | DEFENSE_REACTION | 0:DEFENDER/PLAYER · 1:ATTACKER/ENEMY | — | — | — | none | — | DEFENSE_FX 1 | — | — | — | 0 | VERIFIED |
| Stage success | 1 | $STAGE PREP | — | — | — | — | — | — | — | — | — | — | — | — | 0 | VERIFIED |
| Support $00/$02 | 16 | $00/$02 SUPPORT | — | — | — | — | — | — | — | — | — | — | — | — | 0 | VERIFIED |
| Gather $1A | — | $1A GATHER | — | — | — | — | — | — | — | — | — | — | — | — | 0 | PENDING |
| Energy Bomb $05 | — | $05 BEAM_BOMB | — | — | — | — | — | — | — | — | — | — | — | — | 0 | DEFERRED_TO_TRACE |
| Stage failure / counterattack | — | $STAGE COUNTER | — | — | — | — | — | — | — | — | — | — | — | — | 0 | DEFERRED_TO_TRACE |
| Beam nullify | — | $CA53 NULLIFY | — | — | — | — | — | — | — | — | — | — | — | — | 0 | DEFERRED_TO_TRACE |
| Energy Absorb | — | $CA53 ABSORB | — | — | — | — | — | — | — | — | — | — | — | — | 0 | DEFERRED_TO_TRACE |
| Endurance | — | $0F ENDURANCE | — | — | — | — | — | — | — | — | — | — | — | — | 0 | DEFERRED_TO_TRACE |
| CHARA $1A | — | $1A CHARA | — | — | — | — | — | — | — | — | — | — | — | — | 0 | DEFERRED_TO_TRACE |
| Special multi-actor | — | $SPECIAL | — | — | — | — | — | — | — | — | — | — | — | — | 0 | DEFERRED_TO_TRACE |

### Notas por familia

- **STANDARD_DAMAGE hit** — slot0=ATTACKER ligado al atacante real
- **STANDARD_DAMAGE miss/avoid** — seed alterno → rama MISS/AVOID
- **Beam $02** — film de beam con binding OFFENSE
- **Defense reaction** — DEFENSE_REACTION: slot0=DEFENDER, slot1=ATTACKER
- **Stage success** — romFamily=NONE · control=PLAYER_ATTACK_CHOICE
- **Support $00/$02** — romFamily=SUPPORT_OR_FIELD_EFFECT · control=PLAYER_ATTACK_CHOICE
- **Gather $1A** — romFamily=NONE · control=PLAYER_ATTACK_CHOICE
- **Energy Bomb $05** — sin carta/driver golden con handler $05; requiere traza dinámica
- **Stage failure / counterattack** — la rama de contraataque no tiene driver determinista aún
- **Beam nullify** — requiere traza dinámica del nullify
- **Energy Absorb** — requiere traza dinámica del absorb
- **Endurance** — sin driver ROM confirmado
- **CHARA $1A** — requiere traza dinámica CHARA
- **Special multi-actor** — speciales multi-actor pendientes de traza (ACTOR_HOME/TARGET_HOME/CONTACT_POINT)

## Consumidores de Production

La matriz no se mantiene a mano. La consume el gate
`verify:production-visual-matrix` y el **Dev ROM Asset Explorer**
(sección dentro de ROM Display Lab 2.0), para no crear una fuente de verdad paralela.
