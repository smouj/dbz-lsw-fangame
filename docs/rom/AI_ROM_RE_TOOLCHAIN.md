# AI ROM Reverse-Engineering Toolchain

This project treats the USA ROM as the physical authority. Tool output may help
inspection, but it must not override bytes decoded from the ROM or generated
provenance.

## Current Reproducible Chain

- ROM header and hashes: local scripts, pinned SHA256.
- Runtime action tables: `docs/rom/generated/animation-resources.json` and
  project decoders.
- Fighter physical PNGs: `npm run build:rom-physical-corpus`.
- Verification: `npm run verify:rom-physical-corpus`.
- Dynamic/runtime traces: mGBA-based tools in `tools/rom-trace/`.

## Attached Utility Audit, 2026-08-24

The attached ZIP files were inspected statically only. No Windows executable was
run, installed, or added to the build chain.

| Archive | SHA256 | Contents | Decision |
| --- | --- | --- | --- |
| `GameBoy_Assembler_Plus---87af4840-0e86-4432-8dec-b1cc34fa44a5.zip` | `b4431b6e52d84210abd20118eb6542dc21cf11bbd50bd44f4fa09e74096d9f73` | Windows `.exe`, `.dll`, readme | Reference only. Not used by the reproducible pipeline. |
| `PalEditor---c9173079-4e47-4102-acfd-3f9670169b91.zip` | `cf77983c7054cddf63114d117c1efe8c6e816138645e8ee09ddda0091ad6f002` | Windows `.exe`, sample `.pal`, readme | Reference only. Palette extraction remains ROM/provenance driven. |
| `GameboyRomAnalyzerInclSrc---33734d43-e6be-444b-9f84-34aafa525ac9.zip` | `999ebaef161fb878f7ab213eed4e55c6a044a52f7ec13348f888ec016256bf65` | Windows `.exe` plus C# source | Source is useful as a header/checksum reference; executable is not used. |

Static checks performed:

- ZIP listings checked for path traversal or unexpected absolute paths.
- Readmes and available source were read without executing binaries.
- Basic string scan found no obvious network/autostart indicators in the release
  binaries; this is not a malware guarantee.

## Preferred Open Tools

- `mgbdis`: preferred future full-ROM disassembly path because it emits ASM text
  the agent can search and diff.
- Ghidra + GhidraBoy: useful for deeper function archaeology, but too heavy to
  make a repo runtime dependency.
- `gbparse`-style header parsing: useful conceptually; the project can do the
  required header reads directly in local scripts.

## Rules

- Never promote a GUI tool export to canon without a matching ROM byte path.
- Do not commit extracted third-party executables.
- Keep generated disassembly outside production assets unless a script turns a
  specific result into documented JSON/provenance.
- Prefer targeted `rg` over loading whole ASM files into model context.
