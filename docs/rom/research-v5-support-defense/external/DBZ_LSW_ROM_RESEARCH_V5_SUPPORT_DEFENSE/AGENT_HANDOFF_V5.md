# Agent Handoff V5 — Support + Defense

Use this after V4. Canonical ROM: `8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee`.

## Mandatory integration changes

### A. Worker identity
Change any descriptor/compiler key that assumes handler is globally unique. Resolve as `category + handler`. Support `$0D` is not offensive `$0D`.

### B. Support
- Do not route Support FX tokens through Beam `ROM_FX_WINDOW`.
- All Support paths have the card-indexed load through `$2C30` (Bank `$6B+`, indexed by card ID). Preserve as literal low-level presentation until semantic asset mapping is complete.
- h`$00/$02`: add fixed BG resource `$19` assembly + palette slot5 + 120-tick hold path.
- h`$0B/$0D/$0F`: do **not** inherit resource `$19`; use their literal macros/branches.
- Kiai `$40` / Paralysis `$29`: mark `PRELOADED_NOT_STARTED`; never auto-play from card metadata.
- Palette `$FF` is not universal NONE: in common Support it is passed as physical palette index255.

### C. Defense selection
Model selection boundary exactly:
`CA55 default/0=Guard, 1=Defense card, 2=Move`.

Defense card selection: load AnimationSlot8 if resource exists, then stop. The incoming attack presentation decides consumption.

### D. Move
Persist FighterState position from the selected 2-bit value. Presentation macro choice at this site uses bit1 (`$29/$2A`). Preserve both macros as discrete tick motion; both net to zero visual dx. Do not derive tactical position from Presenter movement.

### E. Defense card result families
Carry `romCA83` and `romCA53` through descriptors/timeline diagnostics. Do not map numeric results to one human enum prematurely. In particular CA53=2 is also Endurance/partial.

### F. Slot8 exact consumers
- STANDARD_DAMAGE `$60B2`: Taiyoken branch; Shockwave card `$7C` skips slot8 and uses macro `$38`.
- Beam `$59FD`: CA53=3/4 routes (Barrier/Breath nullify, Energy Absorb).
- Teleport and Time Freeze are preload-only on their defining routes.

### G. CA83=$40
For Time Freeze / Telepathy / Foresight, represent the proven gameplay fact: clear Stage/Command success buffer `CA6A..CA73` before downstream resolution. No invented slot8 animation.

### H. Sunglasses/Taiyoken
Implement/protect exact rule: Sunglasses status bit `$08` causes Taiyoken `CA83=$81`; STANDARD_DAMAGE then bypasses Taiyoken cancellation and continues.

## Tests required
- category+handler dispatcher uniqueness
- Support h00/h02 uses BG19; h0B/h0D/h0F does not
- Support `$FF` palette not normalized to NONE
- Kiai/Paralysis no card-resource start
- Move changes BattleState position, presenter motion net=0
- Defense selection preloads but does not start slot8
- Taiyoken starts slot8; Shockwave does not
- Barrier/Breath/EnergyAbsorb start slot8 on Beam special branch
- Teleport/TimeFreeze do not start slot8 on defining branch
- CA53=2 test includes Endurance/partial case
- CA83=40 zeroes Stage success flags
- Sunglasses counter path marks Taiyoken `$81` and attack continues
- Engine/EventLog/RNG unchanged by presentation cutover

## Do not invent
`ACTOR_HOME`, `TARGET_HOME`, `CONTACT_POINT`, semantic ActionObject binding, or universal absolute coordinates remain outside V5.
