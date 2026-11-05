# Contributing

Thanks for helping improve DBZ LSW Fangame. Contributions of code, documentation, research tooling and reproducible bug reports are welcome.

## Before you start

- Read the [project overview](README.md), [documentation index](docs/README.md) and the relevant architecture or research notes.
- Search existing issues and pull requests before starting a large change.
- For substantial work, open an issue first so the scope and intended behavior can be discussed.
- Keep changes focused and explain the player or developer problem they solve.

## Local setup

Use Node.js 22 or newer, below 25, and npm 10 or newer.

~~~bash
nvm use
npm ci
npm run dev
~~~

Useful checks:

~~~bash
npm run typecheck
npm run build
npm test
npm run verify:ci
~~~

Research and ROM-derived asset generation may need additional local tools and inputs. Those requirements are documented alongside the relevant pipeline. A ROM file, save, credential, private account data or machine-specific state must never be committed.

## Branches and pull requests

The canonical branch is main. Fork it, create a short-lived topic branch, and open a pull request back to main. Do not push feature work directly to the canonical branch.

Pull requests should:

1. Explain the change, its motivation and any user-visible effect.
2. Link a related issue or design note when available.
3. List the verification commands run and their results.
4. Include before/after screenshots for visible UI changes.
5. Identify data, asset or compatibility changes explicitly.

Small, reviewable pull requests are easier to validate. Avoid mixing unrelated cleanup and feature work.

## Game fidelity and research

- Keep ROM-confirmed facts, inferences and unresolved questions clearly distinguished.
- Preserve source attribution and evidence links for research findings.
- Do not describe the application as an emulator or claim that it executes the original ROM.
- Treat checked-in fixtures as evidence; do not regenerate and compare them against a modified working tree.
- Keep research tools out of the production runtime dependency path.

## Assets and provenance

Do not submit a ROM, BIOS, save state, private capture, account credential, or newly extracted game asset without a clear right to redistribute it. For any new third-party material, document its source, license and required attribution before opening a pull request. Generated local outputs belong in ignored build directories unless a project maintainer has reviewed their provenance and approved a portable fixture.

See [ASSET_RIGHTS.md](ASSET_RIGHTS.md) for the scope of the repository's code license and existing third-party materials.

## Review expectations

Reviewers may request a narrower change, clearer evidence, more tests, or a different approach when it improves correctness or maintainability. Be respectful and assume good intent; see the [Code of Conduct](CODE_OF_CONDUCT.md).
