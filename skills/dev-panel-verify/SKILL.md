---
name: dev-panel-verify
description: Validate a DBZ LSW Development Studio panel against the current source and local runtime.
---

# Development Studio panel verification

Use this workflow when changing a Development Studio route, panel or shared developer tooling.

## Workflow

1. Start from a clean checkout of the branch under review and install dependencies with npm ci.
2. Run the relevant typecheck, focused verification scripts and production build.
3. Start the development app with npm run dev.
4. Open the target route at http://localhost:5178/#dev/<module>. Wait for the panel to finish loading before inspecting it.
5. Check the browser console and network panel for errors. Verify the visible state, keyboard and pointer interactions, and any loading or empty states.
6. Confirm that ROM-dependent data is present before interpreting a missing panel or renderer result. Local generated ROM assets are ignored and are not part of a normal clone.
7. Record the source revision, route, checks and any environmental limitation with the result.

Do not treat a loading placeholder as a successful verification. Do not present a ROM-dependent view as complete when its local inputs are unavailable.
