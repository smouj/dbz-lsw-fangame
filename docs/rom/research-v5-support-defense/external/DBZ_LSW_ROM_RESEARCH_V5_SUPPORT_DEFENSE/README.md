# DBZ LSW ROM Research V5 — Support + Defense

Static reverse-engineering handoff for the canonical USA ROM.

Read in order:
1. `REPORT.md`
2. `LEDGER.md`
3. `AGENT_HANDOFF_V5.md`
4. `OPEN_ITEMS_V5.md`
5. `data/` and `proof/`

This package does not contain the ROM. `scripts/extract_v5_support_defense.py` expects the canonical ROM supplied separately and checks its SHA-256.

V5 supersedes older global assumptions about handler identity, palette `$FF`, CA53=2, Defense resource playback, and unresolved Bank68:$1A.
