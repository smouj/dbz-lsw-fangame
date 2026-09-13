<div align="center">

# 🐉 DBZ LSW — Fangame

**A byte-faithful remake of *Dragon Ball Z: Legendary Super Warriors* (Game Boy Color, 2002)**

[![verify](https://github.com/smouj/dbz-lsw-fangame/actions/workflows/verify.yml/badge.svg)](https://github.com/smouj/dbz-lsw-fangame/actions/workflows/verify.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![PixiJS](https://img.shields.io/badge/PixiJS-8-e91e63?logo=pixijs&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-2-24c8db?logo=tauri&logoColor=white)
![License](https://img.shields.io/badge/license-Fan%20Project-8b0000)

Card-based turn combat · 4 tactical positions · Stage Attack QTEs · **48 forms** · **125 cards** · ROM-exact sprites

</div>

---

## ✨ What is this?

A high-fidelity remake of the GBC classic: turn-based card combat with 4 tactical
positions (AIR/GROUND × FRONT/BACK), a full CC (Combo Count) economy, Stage
Attack QTEs with canonical deterministic sequences, beams, Gather Power and
**48 playable forms** — rendered with **sprites extracted from the ROM** and the
original's combat rhythm.

The **ROM and its local decompilation** are the source of truth. Nothing here is
re-imagined as a new game: mechanics, timings, sequences and identities are
verified against the original binary, and the project ships **140 automated
verification suites** that fail when that stops being true.

```text
Card-based combat · 4 positions · QTE Stage · CC economy
48 forms · 26 characters · 125 cards · 10 languages
Desktop-first · Offline-first (Tauri 2) · no backend required
```

---

## 🖥️ Desktop-first, offline-first

The shipped product is a **desktop application**, and the base game runs with
**no server, no Internet and no dev tooling**:

| | |
|---|---|
| Shell | **Tauri 2** (`src-tauri/`) |
| Installer | **NSIS** (Windows) |
| Frontend | static build bundled (`frontendDist: ../dist`) |
| Network in runtime | **none** — every request is same-origin (`/assets/…`) |
| Dev server (`:5178`) | development only, never part of the product |

```bash
npm run desktop:dev      # tauri dev
npm run desktop:build    # verify:release-content && tauri build --bundles nsis
```

> Contract and boundaries: `docs/architecture/DESKTOP_OFFLINE_ARCHITECTURE.md` ·
> environments: `docs/development/ENVIRONMENTS.md` ·
> release smoke: `docs/qa/DESKTOP_OFFLINE_SMOKE.md`

---

## 🔬 ROM-driven engine

The ROM is treated as an **executable specification**, not just a research
target. The pipeline is one direction, and each link is verified:

```text
BattleCommand → ROM rule → BattleState → event
→ ROM Action Descriptor → AnimationResource → ROM sequence
→ ROM physical frames → ROM FX → ROM ticks → Pixi
```

New content reuses the same grammar with new data — never hand-written
exceptions in React/Pixi.

### ROM Mode (emulator-backed)

A working chain that lets the remake **represent the ROM live** instead of
reimplementing it:

```text
ROM → core → WRAM/OAM/VRAM → decodeRomFeed → NormalizedBattleFeed
    → feedToScene → romModePixiLayout → romModePixiAdapter → Pixi
```

Verified on real captures across the **5 action families** (Damage · Beam ·
Stage · Support · Defense). Measured on a real frame: the orientation (the two
fighters face each other), the per-side CGB palettes and the geometry all come
**from the ROM**, not from our code.

> Design note: the **PPU is not reimplemented**. Decoding the BG from VRAM and
> comparing it pixel-by-pixel with the emulator's framebuffer matched only
> 14.4% — a battle screen is BG + WINDOW + OBJ + priority. The split is:
> **video = emulator framebuffer**, **semantics = our decoder**.
> See `docs/architecture/ROM_EXECUTION_MODES.md`.

---

## 📸 Screenshots

> Captured from the **2026-08-31** build. The UI has evolved since; refresh
> pending (the repository has no browser-automation step in CI).

| Main Menu | Story Map | Battle Setup |
|:---:|:---:|:---:|
| ![Menu](docs/screenshots/menu.png) | ![Story](docs/screenshots/story.png) | ![Versus](docs/screenshots/versus.png) |

| Battle | Characters | Deck Builder |
|:---:|:---:|:---:|
| ![Battle](docs/screenshots/battle.png) | ![Characters](docs/screenshots/characters.png) | ![Deck](docs/screenshots/deck.png) |

| Card Collection | Settings |
|:---:|:---:|
| ![Cards](docs/screenshots/cards.png) | ![Settings](docs/screenshots/settings.png) |

---

## 🚀 Getting Started

```bash
npm install
npm run dev          # dev server → http://localhost:5178
npm run typecheck    # TypeScript (tsc --noEmit)
npm run build        # production build
npm run verify:ci    # the full gate (117 steps) — this is "done"
```

`verify:ci` is the project's definition of done: typecheck, tests, build and the
whole verifier chain. Nothing is claimed as finished without it green.

---

## ✅ Verification

**140 `verify:*` suites** (5 `audit:*`), chained into `verify:ci`. Highlights:

```bash
npm run verify:ci                 # the full gate (117 steps)
npm run verify:golden-stage       # Stage/QTE: success · wrong · B-repair · A · timeout · stop
npm run verify:canon              # animation canon + cue distribution
npm run verify:rom-tick-parity    # every sequence has duration ticks
npm run verify:rom-mode           # ROM feed → scene → layout → adapter, 5 action families + beats
npm run verify:desktop-offline    # desktop/offline contract (Tauri, NSIS, no external network)
npm run verify:profiles           # every combat card has its own animation
npm run audit:sprites             # 48 forms / manifests / beam-ray integrity
npm run verify:rom-physical-corpus
```

Run `npm run` and filter by `verify:` for the complete list.

---

## 🎮 Canonical gameplay (GBC)

| System | Implementation |
|---|---|
| **Turn** | TURN → 2 EXCHANGES (inverted roles), order by effective SPD |
| **Positions** | 4 tactical: AIR/GROUND × FRONT/BACK; Beam vulnerable vs AIR, Damage vs GROUND |
| **CC (Combo Count)** | +3 on attack · +1 per QTE input · +1/+2 when hit · +1 for position vulnerability · basics free |
| **Defense** | Defender chooses BEFORE resolution: BASIC (Defense/Move, 2 axes + push) / JOINT / LIMIT |
| **Stage Attack** | QTE with **canonical deterministic sequences** (fixed pool, round-robin): 3S=6 A/B variants, 4/5/6S add directions |
| **Gather Power** | +4 STR/KI, unlocks Limit Deck, turns Basic 3 Stage → 4 Stage |
| **Enemy AI** | GBC rhythm: regular attack ×2 → Gather Power → 5 Stage → Beam/Damage → repeat |

**Orchestration**: a single timeline clocked at **59.7275 fps (GBC native)** —
deterministic accumulator, events emitted on the exact tick. Card cinematic:
`FIELD → ACTION_SOLO → PROJECTILE/ACTION_DUEL → IMPACT → FIELD_RETURN` with
phase pauses and synchronized FX/SFX.

---

## 🧱 Stack

- **Vite 6 + React 19 + TypeScript 5** (~62k lines TS/TSX in `src/`, excluding generated data)
- **PixiJS 8** for cinematic battle presentation
- **Tauri 2** desktop shell (Windows/NSIS)
- Sprites, portraits and icons extracted from the ROM
- GBC audio synthesized with the Web Audio API (no external files)
- Local persistence: decks, story progress, language (`localStorage`)

---

## 📁 Repository structure

```text
dbz-lsw-fangame/
├── src/
│   ├── data/                 # ROM-derived data: cards, roster, manifests, enemy decks, positions
│   ├── battle/               # Battle engine, action profiles, stage sequences, GBC clock
│   │   └── romMode/          # ROM Mode: decodeRomFeed → feedToScene → layout → Pixi adapter
│   ├── renderer/pixi/        # PixiJS presentation (battle, projectiles, actors)
│   ├── components/           # UI: menu, story, setup, characters, deck, cards, settings
│   ├── devtools/             # Internal Development Studio
│   └── page-layout-system.css
├── src-tauri/                # Desktop shell (Tauri 2): tauri.conf.json, capabilities, icons
├── docs/
│   ├── architecture/         # Desktop/offline contract · ROM execution modes
│   ├── development/          # Environment SSOT
│   ├── qa/                   # Release smoke contracts
│   ├── rom/                  # ROM research + generated evidence (films, traces, families)
│   ├── design/               # Game design documents
│   └── screenshots/
├── scripts/                  # Verification suites & build pipelines (verify:*, audit:*)
├── tools/rom-trace/          # ROM research tooling: headless mGBA driver, captures, traces
├── public/                   # Static assets (sprites, sheets, audio, menu art)
└── skills/                   # Agent skills for project workflows
```

### Key modules

| Path | Content |
|---|---|
| `src/data/cards.ts` | **125** real ROM cards (names, stats, types, verified compatibility) |
| `src/data/roster.ts` | **26 characters / 48 forms** with authentic sheets + growth curves |
| `src/data/enemy_decks.ts` | Real decks per chapter + AI boosts + 2v2 battles |
| `src/data/positions.ts` | 4 tactical positions + facing + vulnerabilities |
| `src/battle/stageSequences.ts` | Canonical Stage Attack sequences (fixed pool, deterministic rotation) |
| `src/battle/engine/` | Battle engine: commands, reducers, power window, position rules |
| `src/battle/romMode/` | ROM Mode chain (decoder, scene, layout, Pixi adapter) |
| `tools/rom-trace/` | Headless mGBA driver: `trace`, `shot`, RAM reads, savestates |
| `docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md` | 310+ ROM-confirmed combat findings |

---

## 📚 Documentation

| Document | Content |
|---|---|
| `docs/architecture/DESKTOP_OFFLINE_ARCHITECTURE.md` | Product contract: desktop-first, offline-first, no backend |
| `docs/architecture/ROM_EXECUTION_MODES.md` | Research tooling vs remake runtime vs embedded ROM Mode |
| `docs/development/ENVIRONMENTS.md` | Environment SSOT (Windows / WSL / CI / mGBA) |
| `docs/qa/DESKTOP_OFFLINE_SMOKE.md` | Offline release smoke (16 steps) |
| `docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md` | 310+ ROM-confirmed combat findings |
| `docs/CINEMATIC_GRAMMAR.md` · `docs/BATTLE_ENGINE_SPEC.md` · `docs/CARD_SYSTEM.md` | Specs |

---

## 🛠️ Development Studio (internal)

Embedded production tool at `http://localhost:5178/?dev=1` (+ `#dev/<module>`).
Not part of the public flow.

- **Dashboard** — live counters (48 forms / 26 characters / 125 cards)
- **Character Studio** · **Card Database** · **Sprite Inspector** · **Position Lab**
- **Story Studio** · **Animation Studio** · **Battle Lab** · **Pixi Seq** · **Validation · Research**

### 🔬 Combat debug modes

| Param | Function |
|---|---|
| `?debugCinematics=1` | Cinematic debugger: shot/pose/projectile + next event. `Space` play/pause · `←/→` ±1 tick · `Shift+←/→` ±10 · `R` reset |
| `?debugState=1` | Internal state inspector + QTE Debugger. `F` freeze · `.` +1 frame · `Shift+.` +10 |
| `?pixiField=1` | Pixi field/action renderer |

---

## 🌍 Languages (10)

English · Español · Français · Português · Русский · 中文 · 日本語 · العربية · हिन्दी · বাংলা

Switch in **Settings → Language** (persisted as `dbzlsw_lang`).

---

## 🗺️ Development status

### ✅ Completed
- Main menu, Story (chapters across 4 sagas + manga vignettes), Versus Battle
- **Canonical GBC combat**: TURN → 2 EXCHANGES, SPD order, 4 positions, full CC, defense before resolution
- **Canonical Stage Attacks**: predetermined sequences, QTE with per-key poses, A/B counter windows
- **48 forms**, all with their poses and manifests with verified physical dimensions
- **ROM physical canon**: identity 48/48, physical corpus, profile-specific structured bridge
- **ROM Mode chain**: `decodeRomFeed → feedToScene → layout → Pixi adapter`, verified over 5 action families
- **Desktop shell (Tauri 2)** with NSIS installer and **no runtime network dependency**
- Persistent deck, collection, EXP/levels with ROM curves · GBC-synthesized audio · 10 languages
- **140 verification suites** in CI, including timing/beat parity against real ROM captures

### ⏳ Pending
- Embedded GBC core inside the desktop app (the "Future Embedded ROM Mode", currently **design approved, not embedded**)
- Canonical per-family durations (the family traces were driven with generic inputs)
- Real BGM (GBS tracks → audio)
- Visual refresh of the README screenshots

---

## ⚖️ Legal

**Educational, non-profit fan remake.** Dragon Ball Z and its characters are
© Bird Studio / Shueisha / Toei Animation. Sprites come from personally owned
ROMs and public reference archives for research purposes. **Code and mechanics
are original; the ROM is not distributed or included in any build.**
