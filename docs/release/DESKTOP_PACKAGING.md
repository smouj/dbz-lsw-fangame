# Desktop packaging

DBZ LSW keeps its React, PixiJS and ROM-derived presentation runtime unchanged. Tauri 2 wraps the Vite release bundle for Windows; it does not run Vite or Node on the player's computer.

## Supported artifacts

- Windows x64 NSIS installer (`Setup.exe`) is the primary desktop package.
- Windows portable ZIP contains the standalone executable.
- The static Vite release remains the browser build.

Linux and macOS packaging are intentionally deferred. Code signing and automatic updates require release credentials and are not enabled with placeholder keys. Save migration to the platform data directory is also a separate runtime change; the first shell deliberately preserves the existing storage behavior.

## Local commands

```text
npm run desktop:dev
npm run verify:release-content
npm run desktop:build
```

The desktop build requires the current stable Rust toolchain and the Windows WebView2 build prerequisites. `desktop:build` creates an NSIS bundle from `dist/`.

## Release contract

Pushing a version tag such as `v0.10.0-alpha.1` starts `.github/workflows/release-desktop.yml`. The workflow runs the complete portable CI suite, audits the release bundle, builds Windows artifacts and opens a draft prerelease.

The release gate fails when:

- a `.gb`, `.gbc`, `.sav` or `.srm` file enters `dist/`;
- Dev Studio routes or development write endpoints enter the release bundle;
- package, game and desktop versions differ;
- a suspicious file larger than 100 MiB enters the web bundle.

The public package must never contain the original ROM. ROM files remain local research inputs and are already excluded by `.gitignore`.

## Version policy

`package.json` is the release version source. Keep `src/config/game.config.ts`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` synchronized with it. Stable identifiers such as `com.dbzlsw.fangame` must not change after the first public release because they identify installation and user-data ownership.
