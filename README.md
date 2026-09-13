<div align="center">

# DBZ LSW — Fangame

**High-fidelity desktop fan project based on _Dragon Ball Z: Legendary Super Warriors_ (Game Boy Color, 2002)**

[![verify](https://github.com/smouj/dbz-lsw-fangame/actions/workflows/verify.yml/badge.svg)](https://github.com/smouj/dbz-lsw-fangame/actions/workflows/verify.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![PixiJS](https://img.shields.io/badge/PixiJS-8-e91e63?logo=pixijs&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-2-24c8db?logo=tauri&logoColor=white)

Card combat · 4 tactical positions · Stage Attack QTEs · **26 characters / 48 forms** · **125 cards**

</div>

---

## Project status — read this first

The current product is a **remake runtime**, not an emulator frontend. It uses mechanics, data, timings, animation evidence and visual contracts recovered from the original ROM, but **the shipped application does not execute a Game Boy Color ROM today**.

| Area | Current state |
|---|---|
| Product runtime | **Implemented** — React/Pixi + `BattleEngine` / `BattleRuntime` |
| Desktop/offline shell | **Implemented** — Tauri 2, Windows/NSIS, static bundled frontend |
| ROM research tooling | **Implemented, outside the product** — `tools/rom-trace/`, libmgba, captures and traces |
| ROM-derived decoder/adapters | **Implemented and verified from captured evidence** — `decodeRomFeed`, scene/layout/Pixi adapters |
| GBC core embedded in the app | **Not implemented yet** |
| ROM distributed with the project | **No** |

The architecture baseline A–F was closed at **`d1e2db18`** with the full `verify:ci` gate green (`RC=0`). The embedded-core work is a **separate milestone** and must not be confused with the existing ROM research tooling.

> Authoritative execution-mode definition: [`docs/architecture/ROM_EXECUTION_MODES.md`](docs/architecture/ROM_EXECUTION_MODES.md)

---

## What this project is

DBZ LSW Fangame recreates the original battle system and presentation with a modern desktop stack while treating the ROM as the primary source of evidence.

The current game includes the card-based combat loop, four tactical positions, CC economy, Stage Attack QTEs, beams, support/defense behavior, deterministic GBC-tick presentation, 1v1/2v2 battle support, the playable roster and the project tooling used to verify those systems.

```text
Player / AI
   ↓
BattleCommand
   ↓
BattleEngine / BattleRuntime
   ↓
state + event log + ROM-derived presentation data
   ↓
Presentation / timeline
   ↓
PixiJS
```

ROM research is deliberately a separate pipeline:

```text
original ROM
   ↓
tools/rom-trace + libmgba
   ↓
traces / screenshots / RAM evidence / fixtures
   ↓
decoders + ROM-derived contracts + verifiers
   ↓
product data and presentation behavior
```

There is **no dependency from the product frontend to `tools/rom-trace/`**. Shared TypeScript contracts live under `src/battle/romTrace/`; tooling may depend on those contracts, never the other way around. `verify:desktop-offline` enforces that boundary.

---

## Desktop-first, offline-first

The intended shipped product is a desktop application that can run the base game without Internet, a backend, localhost, Node.js or mGBA installed on the player's machine.

| Concern | Current contract |
|---|---|
| Shell | Tauri 2 (`src-tauri/`) |
| Windows packaging | NSIS |
| Frontend | static Vite build bundled from `dist/` |
| Runtime network requirement | none for the base game |
| `localhost:5178` | development only |
| Online services | future optional layer; never required to start the base game |

```bash
npm run desktop:dev
npm run desktop:build
```

See [`DESKTOP_OFFLINE_ARCHITECTURE.md`](docs/architecture/DESKTOP_OFFLINE_ARCHITECTURE.md), [`ENVIRONMENTS.md`](docs/development/ENVIRONMENTS.md) and [`DESKTOP_OFFLINE_SMOKE.md`](docs/qa/DESKTOP_OFFLINE_SMOKE.md).

---

## ROM execution modes

The repository contains three different concepts. Their names are intentionally explicit because mixing them produces incorrect status reports.

### A. ROM research tooling — exists, outside the product

`tools/rom-trace/` uses libmgba/headless tooling for reverse engineering, frame captures, traces, RAM reads, savestates and evidence generation. It is development/research infrastructure and is not bundled into Tauri.

### B. Remake runtime — exists, current product

React + PixiJS + `BattleEngine` / `BattleRuntime` execute the game. ROM-derived constants, state rules, animation resources and captured evidence are consumed by this runtime, but the runtime itself does not boot or execute a ROM.

### C. Future embedded ROM mode — designed, not embedded

The planned architecture is:

```text
Tauri
  ↓
embedded GBC core
  ↓
ROM execution
  ↓
framebuffer + memory state
  ↓
decodeRomFeed
  ↓
modern frontend / Pixi
```

The decoder side already exists and has been exercised against captured ROM evidence. The missing boundary is the **embedded GBC core running inside the desktop application**. Selection between SameBoy/libmgba (or another suitable core) remains a separate implementation decision.

`verify:rom-mode` therefore verifies the feed/scene/layout/adapter contract. It must **not** be read as proof that production currently embeds or runs an emulator.

---

## Verification

The repository currently exposes **140 `verify:*` scripts**. The full `verify:ci` chain executes **117 commands/steps**; those are different metrics and should not be conflated.

The A–F desktop/offline baseline (`d1e2db18`) passed the complete gate with zero failures. Relevant focused gates include:

```bash
npm run verify:ci
npm run verify:desktop-offline    # 16 checks: desktop/offline and boundary contract
npm run verify:rom-mode           # 44 checks: captured ROM feed → scene/layout/adapter contract
npm run verify:rom-trace          # 21/0 on the A–F closure
npm run verify:rom-campaign       # 10/0 on the A–F closure
npm run typecheck
npm run build
```

`verify:ci` remains the definition of done for code changes. A local green run on an uncommitted tree is not equivalent to `main` being green.

---

## Getting started

### Requirements

- **Node 22** is the repository authority (`.nvmrc`) and the release-CI baseline.
- npm from the selected Node installation.
- Rust/Tauri prerequisites only when building or running the desktop shell.
- ROM research dependencies only when working under `tools/rom-trace/`; they are not required for normal frontend development.

```bash
nvm use
npm ci
npm run dev          # development server: http://localhost:5178
npm run typecheck
npm run build
npm run verify:ci
```

For the actual desktop product path:

```bash
npm run desktop:dev
npm run desktop:build
```

Environment authority and known toolchain divergences are documented in [`docs/development/ENVIRONMENTS.md`](docs/development/ENVIRONMENTS.md).

---

## Gameplay and data scope

The current repository models the original GBC battle grammar rather than inventing a separate combat system:

| System | Current implementation |
|---|---|
| Battle flow | turn/exchange model with player/enemy roles |
| Tactical space | AIR/GROUND × FRONT/BACK |
| Resources | CC, Ki, Gather/Power windows and card costs |
| Stage Attack | deterministic input sequences, timing windows, fail/counter behavior |
| Presentation | GBC-tick timeline, ACTION/FIELD transitions, physical frame mapping, FX and camera cues |
| Teams | 1v1 and 2v2, including character changes and reserve entry |
| Content inventory | 26 characters, 48 forms, 125 cards |
| Localization inventory | 10 locale files: `ar bn en es fr hi ja pt ru zh` |

The ROM and captured evidence are the authority for fidelity claims. When a behavior is not proven, it should be documented as pending rather than presented as canonical.

---

## Stack

- **TypeScript 5 + React 19 + Vite 6**
- **PixiJS 8** for battle presentation
- **Tauri 2** for the desktop shell
- deterministic GBC-rate timing for battle presentation
- ROM-derived data, sprite/animation provenance and automated fidelity gates
- local persistence for player-facing state
- internal Development Studio for inspection and validation

---

## Repository map

```text
dbz-lsw-fangame/
├── src/
│   ├── battle/
│   │   ├── engine/            # pure battle rules/state transitions
│   │   ├── runtime/           # runtime orchestration
│   │   ├── presentation/      # battle presentation contracts
│   │   ├── romMode/           # decoder/scene/layout adapter pieces; NOT an embedded emulator
│   │   └── romTrace/          # shared trace contracts owned by product-side code
│   ├── data/                  # roster, cards and ROM-derived/static game data
│   ├── renderer/pixi/         # PixiJS renderer/presenter
│   ├── components/            # player-facing UI
│   └── devtools/              # internal Development Studio
├── src-tauri/                 # Tauri desktop shell and packaging config
├── tools/
│   └── rom-trace/             # research/evidence tooling; outside the product bundle
├── scripts/                   # verification, generation and audit commands
├── public/                    # packaged static assets
├── docs/                      # architecture, ROM research, QA, audits and design docs
└── .github/workflows/         # CI and desktop release workflows
```

For a curated documentation map, start at [`docs/README.md`](docs/README.md) rather than browsing the large `docs/` directory blindly.

---

## Screenshots

The PNG files under `docs/screenshots/` are **historical captures from the 2026-08-31 build**. The UI has changed materially since then, so they are no longer embedded here as if they represented the current product.

They are retained for historical/reference purposes until a new release-like capture set is produced. See [`docs/screenshots/README.md`](docs/screenshots/README.md).

---

## Development Studio

The internal Development Studio is exposed in development at `http://localhost:5178/?dev=1` and `#dev/<module>`. It contains the project-specific inspectors used for characters, cards, sprites, animation, battle presentation, ROM evidence and validation.

It is a development surface, not a substitute for testing the actual Tauri release build.

---

## A–F desktop/offline milestone

| Block | Result | Commit |
|---|---|---|
| A | architecture/environment execution-mode documentation | `53c5df97` |
| B | `verify:desktop-offline`, CI enforcement and version authority | `8b38ea56` |
| C/D | desktop/offline QA smoke contract | `d1e2db18` |
| E | full HEAD CI | `RC=0` |
| F | synchronization/clean-tree closure | `d1e2db18` baseline |

A real boundary violation was found during this work: `src/devtools/timeline.tsx` depended on `tools/rom-trace/`. The shared contracts were moved into `src/battle/romTrace/`, leaving the dependency direction as **tools → src**. The new gate prevents that regression.

### Next milestone: G–J

G–J are intentionally separate from A–F. The first embedded-core spike is defined as: **load a ROM, run frames, read WRAM and feed that state into `decodeRomFeed` without modifying `BattleEngine`**. No README wording should describe that milestone as completed until the app actually embeds and executes the core.

---

## Known environment/reproducibility debt

The repository deliberately documents the remaining differences instead of hiding them:

- `.nvmrc` pins **Node 22**, which is the release authority. A WSL workspace has been observed running Node 24; that is local drift, not the repository baseline.
- `package.json` deliberately has **no `packageManager` field** yet. npm should be aligned together with the Node policy rather than independently forcing npm 11 into Node 22 CI.
- `src-tauri/Cargo.lock` is currently absent. It should be generated and committed from a Rust-capable Windows/CI environment for reproducible Tauri dependency resolution; it must not be fabricated from a WSL environment without Cargo.
- Rust is currently `stable` in release CI; a repository-level Rust toolchain pin remains a separate reproducibility decision.

---

## Documentation

Use [`docs/README.md`](docs/README.md) as the documentation index. The most important source-of-truth documents are:

- [`docs/architecture/DESKTOP_OFFLINE_ARCHITECTURE.md`](docs/architecture/DESKTOP_OFFLINE_ARCHITECTURE.md)
- [`docs/architecture/ROM_EXECUTION_MODES.md`](docs/architecture/ROM_EXECUTION_MODES.md)
- [`docs/development/ENVIRONMENTS.md`](docs/development/ENVIRONMENTS.md)
- [`docs/qa/DESKTOP_OFFLINE_SMOKE.md`](docs/qa/DESKTOP_OFFLINE_SMOKE.md)
- [`docs/BATTLE_ENGINE_SPEC.md`](docs/BATTLE_ENGINE_SPEC.md)
- [`docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md`](docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md)

---

## Legal

This is an educational, non-profit fan project. Dragon Ball Z and its characters are properties of their respective rights holders. The original ROM is **not distributed or included in any build**. ROM research and extracted evidence are used to study and reproduce behavior; users are responsible for using legally obtained material in their own research environment.
