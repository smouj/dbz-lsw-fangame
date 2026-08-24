# DBZ LSW ROM Research V5 — Support + Defense Visual Grammar

Canonical ROM SHA-256: `8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee`

## Scope
V5 closes the static visual/execution grammar needed after V4 FX: Support workers, Defense selection, Move, Defense AnimationSlot8 consumption, CA83/CA53 result families, Taiyoken/Sunglasses, Command/Stage suppression, and the fixed BG resources `$19/$1A`.

## 1. Category-scoped handlers
Handler byte values are not globally semantic. Support has its own dispatcher at `Bank00:$3A6C`:

- `$00 -> Bank03:$63BF`
- `$02 -> Bank03:$64D8`
- `$0B -> Bank03:$64E7`
- `$0D -> Bank03:$664E`
- `$0F -> Bank03:$6685`

The same numeric handler may mean something else in the offensive dispatcher. Runtime descriptors must resolve `category + handler`, never handler alone.

## 2. Support is not Beam FX
V4 proved opcode `$0C` is offensive-only. V5 adds that every Support action begins with a **card-ID-indexed visual load** through `Bank00:$2C30`, using banks beginning at `$6B`. This is separate from offensive `FXResource` loader `$2B30`.

Support handlers `$00/$02` then use fixed BG helper `Bank03:$66D1`, which loads `Bank68:$19`. `$0B/$0D/$0F` override the common states before that helper and do not inherit resource `$19`.

## 3. Fixed Support BG resource `$19`
`Bank68:$19` resolves to descriptor `Bank68:$7A0C`:

- 16 physical 8×8 2bpp tiles
- assembled by `Bank03:$6834` as 7 rows × 6 tiles
- BG placement row 4..10, column 7
- assembled physical size 48×56 px
- attributes use VRAM bank1 and BG palette slot5

Those seven helper iterations are **seven rows of one static graphic**, not seven animation frames.

The common Support path holds `CB77` until `$78` = **120 ticks** before its later palette transition.

## 4. Palette `$FF` is category/path scoped
The Support helper copies `CC15` directly into the palette-index routine `$36CA` with no `$FF` sentinel check. Thus `$FF` accesses palette entry 255 at `Bank30:$75F8`.

Do not globally normalize `$FF` to NONE. The earlier `9 non-FF palettes` metric remains valid specifically for normal offensive FX bundles, not as a universal presentation rule.

## 5. Kiai / Paralysis AnimationResources
Kiai `$40` and Paralysis `$29` are loaded into card AnimationSlot6 by common action setup, but static search finds no Support worker nor Support Presentation macro that starts slot6. Their h`$0D` path uses macro `$2B`, which changes an already existing ActionObject animation state; it does not start the card resource.

Status: `PRELOADED_SLOT6_NOT_ACTIONOBJECT_STARTED`. Do not auto-play these resources.

## 6. Defense selection FSM
Defense uses `CA02`, not the offensive `CA06` FSM. At `Bank01:$754C` it reads side-specific `CA55`:

- `CA55=2 -> CA02=$1E` Move
- `CA55=1 -> CA02=$28` Defense card
- otherwise `CA02=$14` Guard

Guard sets `CA82=2`. Move sets `CA82=3`.

## 7. Move: persistent state versus net-zero cinema
The selector at `Bank00:$313C` edits the two-bit tactical position and commits it to `CA57`. Position bits remain:

- bit0: 0 GROUND / 1 AIR
- bit1: 0 FRONT / 1 BACK

The Move execution worker persists that value to FighterState byte0. It then selects macro `$29/$2A` from `(newPosition >> 1)`. At this site bit0 does not select a different macro ID.

Macro `$29` motion: `+2×3t, +1×2t, -1×8t` = **0 net px**.
Macro `$2A` motion: `-2×2t, -1×1t, +1×5t` = **0 net px**.

Therefore tactical relocation is persistent gameplay state while the local action-scene motion returns to its visual anchor. Do not move the large fighter across the tactical field.

## 8. Defense AnimationSlot8 is deferred
Selecting a Defense card at `Bank01:$76CF` resolves its AnimationResource and installs it into **AnimationSlot8**, then Defense selection ends. It does **not** play it there.

Global static search finds exactly two direct slot8 ActionObject start sites:

1. `Bank03:$60B2` — STANDARD_DAMAGE CA83 bit1 route.
2. `Bank03:$59FD` — Beam CA53 special result route.

There are no Presentation macro opcode `$01` starts for slot8.

Known resource execution:

- Taiyoken `$26` — started on STANDARD_DAMAGE defense route.
- Barrier `$24` — started on Beam nullification route.
- Breath `$27` — started on Beam nullification route.
- Energy Absorb `$25` — started on Beam absorption route.
- Teleport `$28` — preloaded; defining Avoid route does not start slot8.
- Time Freeze `$2A` — preloaded; Command/Stage suppression route does not start slot8.

## 9. Exact CA83 card mapping
The card-ID dispatcher at `Bank7E:$56AA` proves:

| Card | CA83 | Static family |
|---|---:|---|
| Taiyoken #19 | `$01` or `$81` | Damage cancellation; `$80` means countered |
| Teleport #26 | `$02` | Beam Avoid |
| Barrier #45 | `$04` | Beam nullification |
| Time Freeze #52 | `$40` | Command/Stage success clear |
| Breath #53 | `$04` | Beam nullification |
| Energy Absorb #76 | `$08` | Beam absorption |
| Endurance #121 | `$10` | Partial |
| Telepathy #122 | `$40` | Command/Stage success clear |
| Foresight #123 | `$40` | Command/Stage success clear |
| Shockwave #124 | `$01` | Damage cancellation macro path |
| Avoiding #125 | `$02` | Beam Avoid |

## 10. CA53 is a numeric ROM result, not a single human enum
The resolver demonstrates:

- `CA83&$08 -> CA53=4` Energy Absorb; `CA7F=incoming power`
- `CA83&$04 -> CA53=3` nullification; `CA7F=0`
- `CA83&$02 -> CA53=1` Avoid; `CA7F=0`
- `CA83&$10 -> CA53=2` Endurance/partial

Therefore `CA53=2 == MISS` is false as a universal statement. Presentation/compiler should preserve numeric ROM result and attach semantic EventLog outcome separately.

## 11. Time Freeze / Telepathy / Foresight suppress Stage success buffer
`CA6A..CA73` is the Stage input-success buffer:

- initialized to zero at `Bank01:$6A16`
- correct input writes `1` at `CA6A[currentIndex]` at `$6AD3`
- `Bank00:$3822` reads command + success from `CA60[]` / `CA6A[]`

For non-Damage/non-Beam action resolution, `Bank7E:$4EE5` detects `CA83&$40` and zeros all ten bytes. Thus Time Freeze, Telepathy and Foresight explicitly clear the Command/Stage success record before downstream resolution.

## 12. Sunglasses counters Taiyoken — fully proven
Card #109 Sunglasses executes `fighter.status+7 |= $08` at `Bank7E:$5519`. Taiyoken tests exactly that bit at `$5931`:

- absent -> `CA83=$01`
- present -> `CA83=$81`

STANDARD_DAMAGE state5 starts Taiyoken's slot8 visual, then tests `CA83&$80`. If clear, it follows the cancellation/reaction tail. If set, it bypasses that cancellation tail and resumes the normal attack sequence from `$60F7`.

This is a direct ROM proof that Sunglasses counter Taiyoken.

## 13. Shockwave is not Taiyoken-without-a-resource
On the same `CA83&1` STANDARD_DAMAGE route, the worker checks the selected Defense card ID. If it is `$7C` (#124 Shockwave), it skips slot8 and queues macro `$38` instead.

Macro `$38` is one literal command:
`04 01 00 1F A0` — ActionObject1 animation-state variant `$1F`.

Taiyoken instead starts AnimationSlot8 and then shares macros `$1C/$37` around the route.

## 14. Shared `$1A` auxiliary BG is CHARA + Gather, not Support-common
`Bank68:$1A` / descriptor `$7B10` is 23 tiles assembled as 7×8 tiles = 64×56 px by helper `$6750`. Static callers prove:

- CHARA path sets `CC15=$31` before helper `$3ABD`.
- Gather Power path sets `CC15=$33` before the same helper.
- Gather later writes FighterState+4 = 5.

Common Support instead uses `$19`.

## Runtime consequences
1. Resolve worker from **category + handler**, not handler alone.
2. Support must not use V4 `ROM_FX_WINDOW`; opcode `$0C` is not in Support/Defense.
3. Add a literal `ROM_BG_ASSEMBLY`/equivalent for resources `$19/$1A`, or preserve it as low-level ROM presentation data until Presenter support exists.
4. Defense selection must only preload slot8. Do not play the Defense resource at selection time.
5. Move commits tactical state separately from local net-zero presentation motion.
6. Preserve `romCA53` / numeric result. Do not compile CA53=2 to MISS unconditionally.
7. Implement Taiyoken, Shockwave, Avoid, Nullify, Endurance, Absorb and Command-suppression as distinct ROM families.
