---
name: battle-visual-audit
description: Review the current game battle UI and presentation with reproducible screenshots and focused checks.
---

# Battle visual audit

Use this workflow when changing game setup, battle layout, animation presentation or the Pixi renderer.

## Workflow

1. Record the branch and source revision being reviewed.
2. Run the relevant typecheck, focused battle verifiers and build.
3. Start the development app and capture a consistent viewport from the current revision.
4. Inspect the game menu, team setup and battle flow affected by the change. Exercise the main interaction path rather than judging a static loading frame.
5. Check browser console/network errors and inspect missing sprite or effect data separately from layout defects.
6. Compare screenshots only with captures from a known source revision and equivalent state. Keep historical screenshots labeled as historical.
7. Summarize the observed behavior, reproduction steps, evidence and any ROM-dependent limitations.

Do not infer ROM fidelity from visual similarity alone. Link ROM-confirmed claims to the corresponding project evidence and label unresolved findings as pending.
