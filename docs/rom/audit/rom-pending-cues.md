# ROM pending cue closure audit

Generated deterministically from `romPresentationTimelineForCard(card, player, null)` and the ROM execution descriptors. This report is an evidence inventory, not a second runtime authority.

- Cards in SSOT: **125**
- Pending cue occurrences: **139** (134 static · 5 dynamic)
- Cards with at least one pending cue: **77**

> A cue occurrence is not a card count: one card can contribute several pending cues at different ticks or phases. No pending row is promoted to a sequence, pose, resource, or frame by this audit.

## Current groups

| Cause | Status | Total | Static | Dynamic | Cards | Handlers |
| --- | --- | ---: | ---: | ---: | --- | --- |
| ACTOR_SELECTOR_UNPROVEN — Actor sequence selector not proven | STATIC_CLOSURE_CANDIDATE | 102 | 102 | 0 | 1 3 stage atk.; 2 4 stage atk.; 3 5 stage atk.; 4 6 stage atk.; 5 Cont.Punch; 6 Cont.Kick; 7 Energy Wave; 8 Energy Bomb; 10 Masenko; 11 Dunk Shot; 12 Kamehameha; 13 S.Kamehameha; 14 F.Kamehameha; 15 Sonic Kick; 17 S.Beam Can.; 18 F.Lightbomb; 20 Misty KiWave; 21 Destruct-Disk; 22 S.Destruc-D.; 24 Spirit Bomb; 25 Solid Shot; 29 Tail; 30 Galick-Ho; 31 Big Bang Atk; 32 Final Flash; 33 Suicide; 34 Rising Kick; 35 Burning Atk.; 36 Fin.Buster; 37 Flash Punch; 38 Kamekameha; 39 Galactica D.; 40 S.G.K.Atk.; 41 V-ball Crash; 43 Atomic Break; 44 Flash.Sword; 46 N.Slasher; 47 KiBlast Bomb; 48 Lightning C.; 49 Telekinesis; 50 M.Soundwave; 54 Eraser Can.; 55 R.F.B.Atk.; 56 Crasher Ball; 57 Purple Comet; 58 P.Comet Z; 60 Mach Attack; 61 Dynami.Punch; 62 Body Change; 63 Finger Beam; 64 Super E-Ball; 65 Grand Wave; 66 S.Dash Elbow; 67 Eye Beam; 69 Rocket Punch; 70 Hell Flash; 71 Crazy Rush; 72 Energy Slash; 73 Energy Slice; 74 Attack No. 18; 75 Life Absorb; 77 Cell Combo; 78 Step Up Atk.; 80 Potbelly Atk; 81 Crasher Buu; 82 Sweet Beam | 0x00, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e |
| STAGE_PHYSICAL_TEXTURE_BINDING — Stage Bank $61 physical texture binding incomplete | STATIC_CLOSURE_CANDIDATE | 21 | 21 | 0 | 1 3 stage atk.; 2 4 stage atk.; 3 5 stage atk.; 4 6 stage atk. | 0x00 |
| SUPPORT_KNOCKDOWN_PAYLOAD — Support worker $0B payload grammar incomplete | STATIC_CLOSURE_CANDIDATE | 8 | 8 | 0 | 85 Tien; 86 Yajirobe; 90 Hercule; 94 Dabura; 98 Stop Device; 110 Gamebomb; 112 H's Choco.; 116 Naughty Book | 0x0b |
| SPECIAL_RESULT_BRANCH_DYNAMIC — Special handler result branch remains dynamic | PENDING_ROM_TRACE | 5 | 0 | 5 | 29 Tail; 33 Suicide; 41 V-ball Crash; 57 Purple Comet; 58 P.Comet Z | 0x08, 0x0b, 0x0c, 0x0d, 0x0e |
| PRELOADED_NOT_STARTED_GLOBAL — AnimationSlot8 is preloaded but has no global start evidence | STATIC_CLOSURE_CANDIDATE | 2 | 2 | 0 | 26 Teleport.; 52 Time Freeze | 0x00 |
| SUPPORT_FSM_DETAIL — Support worker $0F FSM detail incomplete | STATIC_CLOSURE_CANDIDATE | 1 | 1 | 0 | 102 Ene.Absorber | 0x0f |

## Closure rules

- `STATIC_CLOSURE_CANDIDATE` means the compiler has enough structure to name a concrete static blocker, but it still requires canonical ROM evidence before promotion.
- `PENDING_ROM_TRACE` means a runtime branch, result, or inter-phase transition is not statically observable and must remain pending until a native ROM trace exists.
- Sequence `0`, semantic poses, card-name conditionals, manual PNGs, and procedural substitutes are never valid closure evidence.
- The existing physical corpus, selector tables, dynamic film tracker, and scene cue registry remain the authorities; this report only cross-references their live compiler output.

## Group blockers and next evidence

### ACTOR_SELECTOR_UNPROVEN

**Blocker:** The compiler has the ROM resource but cannot select a physical actor sequence without the actor form/profile key or a proven selector row.

**Remediation:** Extend the shared ROM selector table or capture the missing form/state branch, then let ProductionFrameResolver consume the demonstrated sequence.

Reasons: `START_ACTOR_ANIMATION: ProductionFrameResolver blocked because actorFormId/sequenceSelector is not proven`; `START_ACTOR_ANIMATION_SEQ_0: ProductionFrameResolver blocked because actorFormId/sequenceSelector is not proven`; `START_ACTOR_ANIMATION_SEQ_1: ProductionFrameResolver blocked because actorFormId/sequenceSelector is not proven`; `START_ACTOR_ANIMATION_SEQ_2: ProductionFrameResolver blocked because actorFormId/sequenceSelector is not proven`; `START_ACTOR_ANIMATION_SEQ_3: ProductionFrameResolver blocked because actorFormId/sequenceSelector is not proven`; `Stage 1/3 A actor: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`; `Stage 1/4 B actor: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`; `Stage 1/5 UP actor: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`; `Stage 1/6 A actor: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`; `Stage 2/3 A actor: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`; `Stage 2/4 A actor: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`; `Stage 2/5 A actor: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`; `Stage 2/6 UP actor: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`; `Stage 3/4 A actor: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`; `Stage 3/5 B actor: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`; `Stage 3/6 A actor: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`; `Stage 4/4 B actor: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`; `Stage 4/5 B actor: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`; `Stage 4/6 B actor: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`; `Stage 5/6 B actor: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`

### STAGE_PHYSICAL_TEXTURE_BINDING

**Blocker:** The Bank $61 timing and visualFrameId are known, but the selected physical texture is not fully present in ROM_PHYSICAL_CORPUS for every form.

**Remediation:** Complete the canonical Bank $61 physical corpus mapping from ROM evidence; do not substitute a semantic pose or a guessed PNG.

Reasons: `Stage 1/3 A target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 1/4 B target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 1/5 UP target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 1/6 A target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 2/3 A target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 2/4 A target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 2/5 A target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 2/6 UP target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 3/3 DOWN actor: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 3/3 DOWN target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 3/4 A target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 3/5 B target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 3/6 A target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 4/4 B target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 4/5 B target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 4/6 B target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 5/5 DOWN actor: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 5/5 DOWN target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 5/6 B target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 6/6 DOWN actor: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`; `Stage 6/6 DOWN target: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`

### SUPPORT_KNOCKDOWN_PAYLOAD

**Blocker:** The worker states and CA53/CAA2 payload are identified, but the exact presentation grammar for the result states is not yet decoded.

**Remediation:** Decode the worker result payload and prove its resource/sequence/STOP transitions before promoting the cues.

Reasons: `worker $0B states $15/$16/$17/$20/$22 (KnockDown result, $CAA2 payload) — gramática de detalle pendiente`

### SPECIAL_RESULT_BRANCH_DYNAMIC

**Blocker:** The special handler dispatch is known, but HIT/MISS/GUARD and inter-phase transitions depend on runtime state not available to the static compiler.

**Remediation:** Capture the handler in a native ROM trace, record branch state/resource/sequence/ticks/STOP, and promote only the observed branch.

Reasons: `special handler result branch (HIT/MISS/GUARD) and inter-phase state transitions remain dynamic trace territory`

### PRELOADED_NOT_STARTED_GLOBAL

**Blocker:** The ROM marks the slot as preloaded, but this route has no demonstrated global animation start that Production can safely consume.

**Remediation:** Trace the global start/stop owner. Until then keep the slot visible as an explicit pending cue rather than inventing a pose.

Reasons: `slot8 PRELOADED_NOT_STARTED_GLOBAL_STATIC: sin arranque global (V6.5)`

### SUPPORT_FSM_DETAIL

**Blocker:** The worker transition addresses are known, but their resource and sequence choreography has not been completely decoded.

**Remediation:** Resolve the $3239/$2FCE/$34C7 branch grammar from ROM or a focused trace and wire it through the existing support compiler.

Reasons: `worker $0F states $17/$18/$19: transiciones $3239/$2FCE/$34C7, sin macros — gramática de detalle pendiente`

## Row-level evidence

The machine-readable CSV/JSON files beside this document preserve each card, handler, family, tick, boundary, compiler reason, source event, and profile provenance.
