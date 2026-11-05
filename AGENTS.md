# Contributor and coding-agent guide

## Project scope

DBZ LSW Fangame is an unofficial desktop-first fan project inspired by Dragon Ball Z: Legendary Super Warriors for Game Boy Color. The current product is a remake runtime; it does not boot or execute a Game Boy Color ROM.

## Start here

- Project overview and setup: README.md
- Documentation map: docs/README.md
- Architecture and execution modes: docs/architecture/ROM_EXECUTION_MODES.md
- Development environment: docs/development/ENVIRONMENTS.md
- Asset and rights scope: ASSET_RIGHTS.md

## Source of truth

- Battle rules and state transitions: src/battle/engine/
- Battle runtime orchestration: src/battle/runtime/
- Renderer and presentation: src/renderer/pixi/
- Roster, cards and game data: src/data/
- Technical findings and evidence: the relevant documents under docs/rom/

Keep verified ROM facts, inferences and unresolved research separate. A research trace or tooling surface does not mean the product embeds or executes a ROM.

## Change guidelines

- Build on main through focused branches and pull requests.
- Keep research tools outside the production runtime dependency path.
- Preserve fixture provenance. Compare regenerated output with the committed fixture from the base revision, not another generated working-tree result.
- Avoid broad rewrites of battle architecture when a narrow change addresses the issue.
- Never commit ROMs, saves, credentials, personal notes, local assistant memory or machine-specific paths.
- Do not add third-party assets unless their source, license and redistribution rights are clear.

## Useful commands

~~~bash
npm ci
npm run dev
npm run typecheck
npm run build
npm test
npm run verify:ci
~~~

Some ROM-derived physical sprite and effects outputs are generated locally and intentionally ignored. Their absence can leave ROM-backed inspection tools incomplete. Follow the relevant pipeline documentation when working on those systems.
