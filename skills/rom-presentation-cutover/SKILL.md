---
name: rom-presentation-cutover
description: Move a ROM-backed presentation behavior into the production runtime with evidence, one clear owner and reproducible verification.
---

# ROM presentation cutover

Use this workflow when changing a ROM-derived animation, effect, camera cue or battle scene transition.

## Required sequence

1. Identify the exact behavior and its source evidence. Label each claim as ROM-confirmed, inferred or pending.
2. Find the shared runtime contract and existing presentation owner before changing code. Avoid adding a second scheduler or parallel source of truth.
3. Add or update the smallest reproducible fixture and verifier that represents the evidence.
4. Implement the production path and define cleanup at scene or action boundaries. Ensure legacy fallback behavior remains explicit.
5. Run focused verification, typecheck and the full CI verification command.
6. Update the relevant architecture or research note with evidence, behavior, known gaps and verification results.

## Review rules

- Preserve exact timing and source identities when the evidence provides them.
- Keep gameplay state separate from presentation-only position, camera and animation state.
- Do not claim byte-exact behavior from visual similarity alone.
- Do not describe research-tool output as a production embedded-ROM feature.
- Keep generated ROM assets local unless their source, rights and reproducible provenance have been reviewed.

## Completion record

Record the changed runtime owner, evidence source, tests or verification commands, expected fallback behavior and remaining uncertainty in the pull request.
