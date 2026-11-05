# Documentation index

Status: **2026-11-05**.

This directory contains both normative project documentation and historical/research evidence. They are not interchangeable. Use this index to identify which document is authoritative for a given question.

## Authority rules

```text
current code + enforced gates
        ↓
architecture / environment / QA contracts
        ↓
current specs and ROM-confirmed research
        ↓
audits, snapshots and historical reports
```

When two documents disagree, do not silently merge the claims. Check the current code/gates and update the stale document.

## Product architecture and execution modes

| Document | Authority |
|---|---|
| [`architecture/DESKTOP_OFFLINE_ARCHITECTURE.md`](architecture/DESKTOP_OFFLINE_ARCHITECTURE.md) | desktop-first/offline-first product boundary |
| [`architecture/ROM_EXECUTION_MODES.md`](architecture/ROM_EXECUTION_MODES.md) | authoritative distinction between ROM research tooling, current remake runtime and future embedded ROM mode |
| [`development/ENVIRONMENTS.md`](development/ENVIRONMENTS.md) | environment/version source of truth |
| [`qa/DESKTOP_OFFLINE_SMOKE.md`](qa/DESKTOP_OFFLINE_SMOKE.md) | desktop/offline release-smoke contract |
| [`DEV_ENGINE_EDITOR.md`](DEV_ENGINE_EDITOR.md) | Dev Engine interno: renderer Pixi real, jerarquía, Inspector y orientación |

Critical rule: **`tools/rom-trace` existing does not mean the application executes a ROM.** The current product is the remake runtime. The embedded GBC core remains a separate future milestone.

## Battle/runtime specifications

| Document | Scope |
|---|---|
| [`BATTLE_ENGINE_SPEC.md`](BATTLE_ENGINE_SPEC.md) | battle-engine behavior and contracts |
| [`BATTLE_ENGINE_MIGRATION.md`](BATTLE_ENGINE_MIGRATION.md) | migration history and architecture evolution |
| [`CINEMATIC_GRAMMAR.md`](CINEMATIC_GRAMMAR.md) | presentation/cinematic grammar |
| [`CARD_SYSTEM.md`](CARD_SYSTEM.md) | card-system model |
| [`ACTION_FIDELITY.md`](ACTION_FIDELITY.md) | action fidelity and presentation expectations |
| [`ANIMATION_CANON.md`](ANIMATION_CANON.md) | animation canon |
| [`ANIMATION_RESOURCE_DECODING.md`](ANIMATION_RESOURCE_DECODING.md) | resource decoding research |
| [`ANIMATION_TAXONOMY_CANON.md`](ANIMATION_TAXONOMY_CANON.md) | animation taxonomy |

## ROM research and evidence

The `rom/` subtree and ROM-oriented root documents contain reverse-engineering results, captured evidence, generated matrices and mechanical findings. These files can describe facts learned from the original game without implying that production executes the ROM.

Start with:

- [`rom/COMBAT_MECHANICS_ROM_CONFIRMED.md`](rom/COMBAT_MECHANICS_ROM_CONFIRMED.md)
- [`CANONICAL_SPRITE_SOURCES.md`](CANONICAL_SPRITE_SOURCES.md)
- [`CARD_PHYSICAL_ANIMATION_COVERAGE.md`](CARD_PHYSICAL_ANIMATION_COVERAGE.md)

Research tooling itself lives under `tools/`, especially `tools/rom-trace/`, outside the packaged product boundary.

## Contributing and rights

- Start with the root [README](../README.md) for project status and setup.
- Follow [CONTRIBUTING.md](../CONTRIBUTING.md) for branch, verification and review expectations.
- Read [ASSET_RIGHTS.md](../ASSET_RIGHTS.md) for third-party asset and license scope.
- Read [SECURITY.md](../SECURITY.md) for private vulnerability reporting.

## QA, audits and snapshots

- `qa/` contains release/QA contracts.
- `audits/` contains point-in-time audits and generated status evidence. Treat dates/commit SHAs as part of the meaning of an audit.
- Generated matrices and coverage reports describe the commit that produced them; they are not timeless project status.

For current project status, prefer the root [`README.md`](../README.md), current CI and the architecture/environment documents above.

## Visual references

The current set is embedded in the root [README](../README.md): game menu, team/deck setup, in-game battle and Development Studio workspace. See [screenshots/README.md](screenshots/README.md) for the capture index. Older August 2026 captures are archived under [screenshots/archive/2026-08-31](screenshots/archive/2026-08-31/) and should only be used as historical references.

## Documentation maintenance rules

1. Do not call a captured-evidence adapter an embedded emulator/core.
2. Do not present a historical screenshot as current without regenerating the complete set.
3. Put environment/version authority in `development/ENVIRONMENTS.md` and keep README summaries consistent with it.
4. Put product-boundary decisions in `architecture/`; do not duplicate contradictory architecture in audit snapshots.
5. Keep exact verifier counts qualified: repository inventory (`verify:*`) and the `verify:ci` chain length are different metrics.
6. If a claim depends on a commit, include the commit SHA or date.
