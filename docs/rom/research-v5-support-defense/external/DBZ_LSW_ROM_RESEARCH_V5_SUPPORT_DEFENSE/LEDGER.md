# V5 research ledger

## V5-F001 — DISPATCH
**ROM_HANDLER_VERIFIED** — Handler bytes are category-scoped; Support dispatches $00/$02/$0B/$0D/$0F via Bank00:$3A6C independently of offensive handler meanings.

ROM: 00:$3A6C-$3AA4

## V5-F002 — SUPPORT
**ROM_HANDLER_VERIFIED** — Support handlers $00/$02 share a fixed BG resource $19 visual path; $0B/$0D/$0F override states before that helper and do not inherit it.

ROM: 03:$63BF-$66D0, 03:$66D1-$674F

## V5-F003 — SUPPORT_BG
**ROM_ASSET_VERIFIED** — Bank68:$19 is 16 tiles assembled as 7 rows × 6 tiles at BG row4/col7, palette slot5; it is one static 48×56 BG graphic, not seven animation frames.

ROM: 03:$66D1-$674F, 03:$6834-$688E, 68:$7A0C

## V5-F004 — SUPPORT_PALETTE
**ROM_HANDLER_VERIFIED** — Common Support passes card CC15 directly as palette index; palette $FF is physically consumed as index255 and is not universally NONE.

ROM: 03:$6731-$674F, 30:$75F8

## V5-F005 — SUPPORT_ANIMATION
**ROM_HANDLER_VERIFIED** — Kiai $40 and Paralysis $29 are loaded into card AnimationSlot6 but no Support worker or Support macro starts that slot.

ROM: 03:$63BF-$66D0, 30:$60E9-$610D

## V5-F006 — DEFENSE_FSM
**ROM_HANDLER_VERIFIED** — Defense selection is a CA02 FSM; CA55=0/default Guard, 1 Defense card, 2 Move.

ROM: 01:$7497-$76F0, 00:$3128-$31F0

## V5-F007 — MOVE
**ROM_HANDLER_VERIFIED** — Move commits a 2-bit FighterState tactical position, while ROM macros $29/$2A perform local net-zero cinematic movement.

ROM: 00:$313C-$31F0, 01:$759D-$75F8, 30:$609C-$60E8

## V5-F008 — DEFENSE_ANIMATION
**ROM_HANDLER_VERIFIED** — Defense selection preloads AnimationSlot8; only two global ActionObject start sites consume slot8: STANDARD_DAMAGE $60B2 and Beam $59FD.

ROM: 01:$76CF-$76F0, 03:$60B2, 03:$59FD

## V5-F009 — DEFENSE_FLAGS
**ROM_HANDLER_VERIFIED** — Defense card IDs map exactly to CA83 flags: Taiyoken 01/81, Teleport 02, Barrier/Breath 04, TimeFreeze/Telepathy/Foresight 40, EnergyAbsorb 08, Endurance 10, Shockwave 01, Avoiding 02.

ROM: 7E:$56AA-$597B

## V5-F010 — DEFENSE_RESULT
**ROM_HANDLER_VERIFIED** — CA83 result flags produce distinct numeric CA53 states; CA53=2 is Endurance/partial and is not universally MISS.

ROM: 7E:$5032-$5129

## V5-F011 — TAIYOKEN
**ROM_HANDLER_VERIFIED** — Sunglasses sets fighter status+7 bit08; Taiyoken checks that bit and writes CA83=$81 when countered; STANDARD_DAMAGE then bypasses Taiyoken cancellation and continues.

ROM: 7E:$5519-$5527, 7E:$5931-$5953, 03:$60B5-$60FD

## V5-F012 — COMMAND_DEFENSE
**ROM_HANDLER_VERIFIED** — CA83 bit40 clears the ten-byte Stage/Command success buffer CA6A..CA73 before non-Damage/non-Beam resolution.

ROM: 7E:$4EE5-$4EF5, 01:$6A16-$6A20, 01:$6AD3-$6ADB, 00:$3822-$3832

## V5-F013 — SHOCKWAVE
**ROM_HANDLER_VERIFIED** — On STANDARD_DAMAGE CA83&1 route, selected card $7C Shockwave skips slot8 and queues macro $38; Taiyoken uses slot8.

ROM: 03:$607D-$60D5, 30:$6259-$625E

## V5-F014 — BEAM_DEFENSE
**ROM_HANDLER_VERIFIED** — Beam CA53=3/4 result route starts slot8; CA53=1 Avoid and CA53=2 Endurance do not.

ROM: 03:$59C6-$5A3F

## V5-F015 — DEFENSE_RESOURCE
**ROM_HANDLER_VERIFIED** — Taiyoken/Barrier/Breath/EnergyAbsorb resources are started on known attack routes; Teleport/TimeFreeze resources are preloaded but not statically started on their defining routes.

ROM: 01:$76CF-$76F0, 03:$60B2, 03:$59FD

## V5-F016 — AUX_BG
**ROM_HANDLER_VERIFIED** — Bank68:$1A is shared by CHARA with palette $31 and Gather Power with palette $33; common Support uses $19 instead.

ROM: 01:$736C-$7383, 01:$7B80-$7B95, 03:$6750-$6833, 68:$7B10

## V5-F017 — SUPPORT_CARD_VISUAL
**ROM_HANDLER_VERIFIED** — All Support paths perform an initial card-indexed load through $2C30 using banks beginning at $6B; this path is indexed by card ID and is separate from offensive FXResource loader $2B30.

ROM: 03:$63FA-$640B, 00:$2C30-$2C65
