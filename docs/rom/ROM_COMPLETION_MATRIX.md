# ROM COMPLETION MATRIX — R0 (generado desde el HEAD, no conteos históricos)

Generado: 2026-08-24T09:58:15.501Z · archivos escaneados: 468 · hits de tokens: 1127

## Deuda canónica de combate (matriz)

| Domain | Item | Current evidence | Missing | Method | Runtime impact | Class |
| --- | --- | --- | --- | --- | --- | --- |
| ActionObject | slot semantic binding (slot0/slot1 role) | layout 19B estático decodificado (research-v3) | identidad actor/target por rol | TRACE | High | DYNAMIC |
| ActionObject | ACTOR_HOME / TARGET_HOME | sin coordenadas universales (v3 PENDING) | coordenadas absolutas de anclaje | TRACE | High | DYNAMIC |
| ActionObject | CONTACT_POINT | sin punto de contacto universal demostrado | geometría de contacto | TRACE | High | DYNAMIC |
| ActionObject | left/right mirroring | flip documentado, sin dump de confirmación | inversión LEFT↔RIGHT observada | TRACE | Medium | DYNAMIC |
| ActionObject | multi-actor binding ($0D/$0E) | MULTI_ACTOR_SCRIPT estático | binding semántico por slot | TRACE | High | DYNAMIC |
| FighterPhysical | fighter sprite re-extraction | cadena 411/411 ROM_STATIC_VERIFIED (v3) | direcciones de tabla de metasprites no persistidas + extractor | REEXTRACT | High | DYNAMIC |
| Handler | Tail $0B FSM | static partial (worker $61C5) | FSM observada (hit/miss, L/R) | TRACE | Medium | DYNAMIC |
| Handler | Purple Comet $0D / P.Comet Z $0E | MULTI_ACTOR_SCRIPT estático | actividad por slot + cleanup | TRACE | Medium | DYNAMIC |
| Handler | Suicide $08 / V-ball Crash $0C | worker $5E67/$62D4 estático | FSM observada | TRACE | Medium | DYNAMIC |
| Handler | Rocket Punch $05 / Potbelly Atk $06 | launch profiles estáticos | FSM completa | TRACE | Low | DYNAMIC |
| DefenseLIMIT | DEFENSE_LIMIT_LEGACY (runtime debt) | defendLimit → resolveDefenseCard legacy (PA11) | contrato ROM real del LIMIT defensivo (CA55/CA02/slot8/CA83) | STATIC+TRACE | Medium | RUNTIME_DEBT |
| Cinematic | TACTICAL ↔ ACTION cadence | $07F4/$080C palette interpolation CGB | timing exacto: palette/tilemap/visibility/worker start | TRACE | Medium | DYNAMIC |
| Macros | semantic macro meaning $2B/$2C/$34/$35 | programas literales COMPLETE | significado humano (requiere binding actor/objeto) | STATIC | Low | STATIC |
| AI | ROM CPU decision model | EnemyController Alpha (PA11) | policy original (elección/pesos/RNG/CC) | STATIC+TRACE | Medium | NON_BLOCKING |
| Audio | SFX/BGM map completo | opcodes $13/$14 + IDs parciales | mapa acción→sonido + BGM por contexto | STATIC | Medium | NON_BLOCKING |
| Display | $0B07 exact internal format | parcial (composición tilemap) | contrato interno exacto | STATIC | Low | NON_BLOCKING |
| Display | $C3CE/$C3CF/$C3D0 | en backlog deliberado (V7) | significado | STATIC | Low | NON_BLOCKING |
| Display | direct BG vs shadow $9800/$DD00-$DE00 | ambas rutas vistas | cuándo usa cada una | TRACE | Low | NON_BLOCKING |
| Story | Story ROM map (order/battles/dialogue) | excluida del remake (RPG layer) | mapeo orden/battle configs/portraits/unlocks | STATIC | Low | NON_BLOCKING |
| Presentation | UNLINKED_CARD_BYTE8 → CC15 | card.byte8 UNLINKED (V7 backlog) | enlace byte8→CC15 | STATIC | Low | NON_BLOCKING |

## Hits de tokens por dominio

| Domain | `PENDING_ROM_TRACE` | `ROM_PENDING` | `UNRESOLVED` | `UNLINKED` | `PARTIAL` | `INFERRED` | `FUTURE` | `LEGACY` | `UNKNOWN` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AI | 2 | 1 | 5 | 2 | 1 | 2 | 2 | 2 | 4 |
| ActionObject | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Audio | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| Cinematic | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| Data | 0 | 0 | 21 | 49 | 0 | 17 | 0 | 0 | 124 |
| DefenseLIMIT | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| Display | 1 | 2 | 10 | 0 | 1 | 0 | 0 | 0 | 0 |
| Engine | 0 | 2 | 4 | 0 | 12 | 44 | 0 | 0 | 6 |
| FighterPhysical | 0 | 2 | 52 | 6 | 21 | 0 | 0 | 0 | 9 |
| Handler | 15 | 0 | 0 | 0 | 10 | 26 | 0 | 1 | 17 |
| Macros | 3 | 3 | 14 | 1 | 0 | 0 | 0 | 1 | 0 |
| Other | 59 | 17 | 51 | 12 | 89 | 236 | 7 | 6 | 60 |
| Presentation | 16 | 13 | 3 | 5 | 16 | 0 | 0 | 0 | 1 |
| Tracer | 5 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 13 |

## Muestra de hits (primeros 40)

- `PENDING_ROM_TRACE` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:6 (Other) — > `PENDING_ROM_TRACE` los anchors absolutos y bindings semanticos. Tambien
- `INFERRED` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:22 (Other) — > Marcadores: ✅ ROM_CONFIRMED · 🟡 ROM_INFERRED · 🔵 REMAKE_CANON · ❌ OBSOLETE
- `PARTIAL` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:407 (Other) — simplificado. Taxonomía correcta en §59: 0=FULL, 1=ZERO_AVOID, 2=PARTIAL
- `PARTIAL` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:474 (Other) — Nota: "miss" aquí = branch de resolución no plena (ver §59: CA53=2 es PARTIAL,
- `PARTIAL` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:915 (Other) — CA53 = 2 → PARTIAL / ATTENUATED RESOLUTION  si había efecto preliminar:
- `PARTIAL` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:924 (Other) — CA53 = 2 → PARTIAL / ATTENUATED RESOLUTION
- `PARTIAL` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:1173 (Handler) — | "FULL" | "ZERO_AVOID" | "PARTIAL" | "SPECIAL_NULLIFY" | "ENERGY_ABSORB";
- `PARTIAL` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:1181 (Other) — | CA53=2 → MISS | CA53=2 → PARTIAL / ATTENUATED |
- `PARTIAL` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:1199 (Other) — | FULL/ZERO/PARTIAL | ✅ mucho mejor |
- `PARTIAL` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:2428 (Other) — `CA83 = $10` → `CA53 = 2`, `CA7F = incomingCard.ccCost`. Familia `PARTIAL`: `damage = CC cost`. No es `damage / 2`.
- `INFERRED` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:2567 (Other) — > **Cuatro SUPERSEDES expresos** (§241–244). Retira las timelines INFERRED
- `INFERRED` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:2945 (Other) — ## 238. Perfiles INFERRED pasan a fallback
- `INFERRED` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:2949 (Handler) — ROM handler unknown  → perfil INFERRED queda como fallback
- `INFERRED` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:2987 (Other) — SUPERSEDES #2 — Beam genérico INFERRED (gather_power@12 … return@152)
- `INFERRED` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:2988 (Handler) — → perfil INFERRED antiguo; con descriptor ROM gana handler+macros
- `INFERRED` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3155 (Other) — evidence: 'ROM_STATIC_VERIFIED' | 'FRAME_VERIFIED' | 'INFERRED';
- `PENDING_ROM_TRACE` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3235 (Macros) — release frame / movimiento / macros / target reaction / holds = PENDING_ROM_TRACE
- `PARTIAL` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3295 (Other) — ## 265. SET_OBJECT_POSITION sigue PARTIAL
- `PARTIAL` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3298 (Other) — campo PARTIAL hasta terminar decodificación:
- `UNRESOLVED` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3305 (Other) — semantics: 'ABSOLUTE_OR_BASE_POSITION_UNRESOLVED';
- `PENDING_ROM_TRACE` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3314 (ActionObject) — PENDING_ROM_TRACE: ACTOR_HOME X/Y · TARGET_HOME X/Y · CONTACT_POINT X/Y
- `PENDING_ROM_TRACE` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3357 (Handler) — evidence: 'ROM_HANDLER_VERIFIED' | 'ROM_SEQUENCE_VERIFIED' | 'PENDING_ROM_TRACE';
- `PENDING_ROM_TRACE` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3384 (Handler) — sequenceEvidence: 'ROM_HANDLER_VERIFIED' | 'ROM_SEQUENCE_VERIFIED' | 'PENDING_ROM_TRACE';
- `PENDING_ROM_TRACE` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3401 (Other) — VARIANT · SEQUENCE (PENDING_ROM_TRACE) — **no mostrar timeline inventada**.
- `PENDING_ROM_TRACE` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3440 (ActionObject) — SÍ: $0A manipula posición/offset del ActionObject; los anchors siguen PENDING_ROM_TRACE
- `PENDING_ROM_TRACE` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3453 (Other) — PENDING_ROM_TRACE
- `INFERRED` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3470 (Other) — > **Tres SUPERSEDES** (§309). Regla de oro: el tracer no elimina INFERRED;
- `PENDING_ROM_TRACE` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3482 (Other) — | 'PENDING_ROM_TRACE';
- `UNKNOWN` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3564 (Other) — | 'BASE_X' | 'BASE_Y' | 'FLAGS' | 'UNKNOWN';
- `UNKNOWN` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3607 (Other) — screenXDependency: 'NONE' | 'SCX' | 'UNKNOWN';
- `UNKNOWN` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3608 (Other) — screenYDependency: 'NONE' | 'SCY' | 'UNKNOWN';
- `UNKNOWN` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3613 (Other) — Hasta resolverlo, `UNKNOWN` es resultado válido.
- `UNKNOWN` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3680 (Other) — binding: 'PRIMARY' | 'SUPPORT' | 'TARGET' | 'UNKNOWN';
- `PENDING_ROM_TRACE` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3711 (Other) — PENDING_ROM_TRACE → TRACE_CAPTURED → FIELD_CANDIDATE
- `PARTIAL` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3727 (Other) — evidence: 'PARTIAL_ROM_DYNAMIC_VERIFIED' | 'ROM_DYNAMIC_VERIFIED';
- `UNKNOWN` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3729 (Other) — // 12 bytes conocidos + 7 UNKNOWN es mejor que bautizar 19/19 falsamente
- `PENDING_ROM_TRACE` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3737 (ActionObject) — CONTACT_POINT → PENDING_ROM_TRACE
- `PENDING_ROM_TRACE` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3747 (ActionObject) — - Anchors: mostrar `PENDING_ROM_TRACE`, no `ACTOR_HOME = —`; o `x=N y=M
- `UNKNOWN` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3760 (Other) — DECODER: ningún byte UNKNOWN se promociona solo · CANDIDATE ≠
- `INFERRED` docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md:3803 (Other) — > **Lote 9 no elimina los INFERRED por añadir el tracer: los elimina

## Gate de cierre

```text
combat PENDING_ROM_TRACE = 0 · combat ROM_PENDING = 0 · combat UNRESOLVED = 0
(excepto lo documentado explícitamente como irrelevante para el remake)
```