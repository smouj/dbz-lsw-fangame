# Instrument self-audit — ROM Visual Master pipeline

Date: 2026-09-16 · Scope: the Kamehameha-LEFT visual-master tooling and its gate
Map only — repairs are grouped by cause, not applied one by one.

Six self-inflicted instrument artifacts preceded this audit (form-id binding,
range-derived phase label, mapping anchor, `SCREEN_RESTORE` label bucket,
actor/beam bbox attribution, `actionUnder_input` flag semantics). This is the
systematic enumeration of every place the pipeline asserts something it does
not measure.

Classes: **C1** flag/label from a proxy, not the transition it names ·
**C2** denominator without a value · **C3** label from a numeric range, not ROM
semantics · **C4** measure over composite content · **C5** claim that passes
with the underlying signal absent.

| # | Place | file:line | Class | Status |
|---|-------|-----------|-------|--------|
| 1 | `actionUnder_input_60_1_8` flagged "was probed", not "an action started" | artifact v3 `savestateRebindProbe` | C1 | **(a) fixed** `beab3f8b` |
| 2 | `phaseFor()` derives `ACTOR_BEAM_WINDOW`/`PROJECTILE_TRAVEL`/… from frame numbers | `scripts/build-rom-visual-master.ts:76` (fn `:71-79`) | C3 | **(b) live** — triggers whenever a range boundary is treated as semantic; this class invented the phantom projectile beat |
| 3 | `counterpart: 'ANCHORED'/'DERIVED'/'OTHER_ROUTE'` | `scripts/capture-pixi-visual-master.mjs:60-70` | C1 | **(b) live** — asserts a route relationship nothing verifies; editing a mapping silently re-labels |
| 4 | "gameplay payload preservation explicit" asserts a *string* contains `byte-identical` | `scripts/verify-golden-visual-gate.ts:54` | C5 | **(b) live** — a doc string satisfies it regardless of the payload |
| 5 | "every mapped frame was verified" — `undefined === undefined` passes | `scripts/verify-golden-visual-gate.ts:109` | C5 | **(b) live** — a manifest lacking both fields passes |
| 6 | "ROM→remake tick mapping is explicit" — any non-empty anchors | `scripts/verify-golden-visual-gate.ts:113` | C5 | **(b) live** — a wrong mapping with one anchor passes |
| 7 | "no frame failed to capture" — `(capture?.failures ?? [])` | `scripts/verify-golden-visual-gate.ts:114` | C5 | **(b) live** — an absent `failures` array reads as zero failures |
| 8 | "cause group X has frame ranges" — `count===0 \|\| ranges>0` | `scripts/verify-golden-visual-gate.ts:169` | C5 | **(c) benign** — deliberately vacuous for empty groups |
| 9 | `WorldDiff.bbox` computed over ALL mismatch content (actor+beam+plane) | `scripts/lib/visual-master-diff.ts:255` (type `:128`, `:336`) | C4 | **(b) live** — quoting `bbox` re-introduces the `dX1=-96` conflation; the group *attribution* is fixed, the field is not |
| 10 | `regions` halves/quadrants are content-agnostic | `scripts/lib/visual-master-diff.ts` regions block | C4 | **(c) benign** read as spread, **(b)** read as cause |
| 11 | `Math.max(1, …)` denominator guard yields 0% instead of undefined | lib `:269`, gate `:208`, analyzer `:135` | C2 | **(c) benign** — region is never 0 in this set, but it masks an undefined ratio |
| 12 | `frameViews.length * 12800` hardcoded compare size | `scripts/verify-golden-visual-gate.ts:218,220` | C2 | **(b) live** — a contract size change silently breaks the split assertion |
| 13 | `meanMismatchPercent` divides by `frames.length` unguarded | `scripts/analyze-rom-visual-master.ts:109` | C2 | **(b) live** — NaN on zero captures |

## Counts

- **13 sites** across **5 classes**: C1 flag-from-proxy 2 · C2 denominator-without-value 3 ·
  C3 label-from-range 1 · C4 measure-over-composite 2 · C5 claim-passes-without-signal 5.
- Status: **1 (a) fixed**, **9 (b) live risk**, **3 (c) benign**.

## Pattern

C5 is both the largest class (5 sites) and the only one where a defect produces a
**green gate instead of a wrong number**: every other class cannot hide, because a
wrong figure is visible in the output. C5 is therefore the class to repair first.

Already fixed earlier in the campaign, so not listed as live risk: the form-id
binding (capture harness), the `SEGMENTS` anchor, the `SCREEN_RESTORE` label
bucket, and the actor/beam split in group attribution.
