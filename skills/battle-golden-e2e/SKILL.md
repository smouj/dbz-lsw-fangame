---
name: "battle-golden-e2e"
description: "User sets battle-mechanic gates (Stage/QTE, Beam) — encode as headless BattleRuntime E2E verifies; engine semantics often already exist."
---

# Battle Golden E2E Verify (DBZ LSW)

When the user defines gates for a battle mechanic ("success/wrong/B repair/A cash-out/timeout → always FIELD → DEFENSE_CHOICE → STOP"), the deliverable is a headless verify that drives the REAL BattleRuntime (dispatch + advance) and asserts those gates. The verify script is the proof (definition-of-done: green verify or it didn't happen).

Canonical example: `scripts/verify-golden-stage.ts` (Stage/QTE P0.3 gate, commit 6901f3a2).

## Steps

1. **Recon before writing engine code.** Run the mechanic's existing verifies first (`verify:rom-stage-fidelity`, `verify:rom-stage-damage`, `verify:stage-production-route`, …). ROM semantics are usually already implemented in `src/battle/engine/` (clock, reduceAcceptedCommand, canExecute, damageReducer); the missing piece is normally the E2E gate, not new engine logic. Read those files before touching anything.

2. **Drive BattleRuntime, never raw reducers.** `rt.dispatch(command)` + `rt.advance(ticks)`; assert on `rt.state` and `rt.log.entries` (event types) so EventLog, timeline and control boundaries are exercised. Build states with `createInitialBattleState(cfg)`; make decks deterministic with `createBattleDeck(ids, { seed })` and `cfg.seed`.

3. **Open timed windows deterministically.** A Stage QTE starts `PREPARING`; only the clock opens `INPUT_WINDOW` at `inputOpenTick` — call `rt.advance(q.inputOpenTick - rt.state.tick + 1)`, then assert `QTE_STARTED` was logged. Wrong input = a key different from `q.seq[q.idx]`.

4. **Assert each user path** with state + EventLog markers:
   - success: `COMPLETED`/`FULL_SUCCESS`, damage applied, +1 CC per correct input, never `COUNTER_WINDOW`;
   - wrong: index ADVANCES (never "ignore and retry"), `COUNTER_WINDOW`, counter resolves exactly once via clock;
   - B repair (≤10t): `QTE_COUNTER_CONTINUE` → `INPUT_WINDOW` with the SAME `deadlineTick` (ROM §7 single global timer never resets);
   - A cash-out (≤25t): `QTE_COUNTER_DEFEND` → guard + partial damage from resolved count, no counter damage, CC kept;
   - timeout: clock expiry → `QTE_TIMEOUT` → counter damage once.

5. **Prove STOP — the user contract.** After each terminal, mirror the orchestrator: if `activeAttacker(state) === 'player'`, dispatch `END_EXCHANGE`, then set `phase: 'defend'`, `defenseState: 'AWAITING_CHOICE'`, `defenseChoice: null`. Assert `getControlBoundary(state) === 'PLAYER_DEFENSE_CHOICE'`, then `rt.advance(10000)` adds 0 log entries and phase + stageQte stay identical (no auto enemy action, no timer drift, deterministic).

6. **Engine-authority sub-windows.** Advance past the tick limit (e.g. +11 for a 10t repair window, +26 for a 25t abort window) and assert `dispatch` returns `ok === false` (`QTE_COUNTER_WINDOW_EXPIRED`); just inside the window it is accepted.

7. **Determinism check.** Run the identical scenario twice from the same seed; the JSON of EventLog entries (type + sequence) must be equal.

8. **Register + gate.** Add npm script `verify:<name>` next to the other mechanic verifies in package.json; append it to the single-line `verify:ci` chain right before `verify:portrait-domains`; run the FULL `verify:ci` (exit 0 required — it includes a build); commit.

## Pitfalls

- Don't assert only reducer state — go through dispatch/advance so clock deadlines fire (QTE_STARTED/QTE_TIMEOUT/counter) exactly once.
- Don't reset the QTE deadline in a repair test — the ROM global timer must stay intact; assert `deadlineTick` unchanged.
- No `Math.random`: seeds go in cfg and createBattleDeck only.
- Terminal assertions use `stageQte.state`, `getControlBoundary`, and EventLog markers — never UI/React state.
- Re-run the complete `verify:ci`, not just the new script: the chain is the gate the user checks.
