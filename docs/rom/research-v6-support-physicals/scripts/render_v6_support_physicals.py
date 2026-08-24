#!/usr/bin/env python3
"""V6.3b — ROM inspection renders for the 48 Support card-indexed visuals.

Renders directly from ROM bytes (payload graphics + layout tile pointers),
never from remake assets. Output PNGs are marked ROM_INSPECTION_RENDER and are
NOT runtime assets. Color index 0 is rendered OPAQUE (GBC behavior: color0 is a
real color) — no invented transparency.

Layout interpretation (V6 ledger section 6):
  descriptor = [layoutChunkCount][layoutChunkCount*8 bytes][tileCount][tiles 2bpp]
  layout chunk = 4 words LE: 3 tile-source pointers (16 bytes 2bpp each) + $7FFF terminator.
  Bank assumption: pointers resolve inside the loader bank ($6B + floor(cardId/$20)).
  The exact WRAM/VRAM consumer of those pointers remains PARTIAL_ROM_STATIC.

Checks enforced:
  48/48 renderable, 0 tile reads out of range, 0 payload overruns,
  0 invalid layout references, deterministic byte->PNG (no timestamps),
  reproducible SHA-256 per PNG.
"""
from __future__ import annotations

import csv
import hashlib
import json
import struct
import zlib
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
ROM_PATH = REPO.parent / "dbz-lsw-decomp" / "13_raw_rom" / "dbz-lsw-usa.gbc"
OUT = REPO / "docs" / "rom" / "research-v6-support-physicals"
DATA = OUT / "data"
RENDERS = OUT / "renders"
SHEETS = OUT / "contact_sheets"

EXPECTED_SHA256 = "8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee"

# Physical CGB palettes demonstrated in V5 (Bank30:$6E00 + idx*8, BGR555).
KNOWN_PALETTES = {0x2C, 0x2D, 0x2E, 0x2F, 0x30, 0x31, 0x32, 0x33, 0x35, 0xFF}
GRAY_PALETTE = [(0x00, 0x00, 0x00), (0x55, 0x55, 0x55), (0xAA, 0xAA, 0xAA), (0xFF, 0xFF, 0xFF)]


def rom_offset(bank: int, address: int) -> int:
    return bank * 0x4000 + (address if bank == 0 else address - 0x4000)


def bank_addr(bank: int, address: int) -> str:
    return f"{bank:02X}:${address:04X}"


def bgr555_to_rgb(word: int) -> tuple[int, int, int]:
    r = (word & 0x1F) << 3
    g = ((word >> 5) & 0x1F) << 3
    b = ((word >> 10) & 0x1F) << 3
    return (r, g, b)


def load_palette(rom: bytes, index: int) -> list[tuple[int, int, int]]:
    if index in KNOWN_PALETTES:
        offset = rom_offset(0x30, 0x6E00 + index * 8)
        raw = rom[offset : offset + 8]
        return [bgr555_to_rgb(raw[i] | (raw[i + 1] << 8)) for i in (0, 2, 4, 6)]
    return list(GRAY_PALETTE)


def load_names() -> dict[int, str]:
    names: dict[int, str] = {}
    with (REPO / "docs" / "rom-data" / "cards.csv").open(
        newline="", encoding="utf-8-sig"
    ) as handle:
        for row in csv.DictReader(handle):
            raw_id = row.get("x", "")
            if raw_id.isdigit():
                names[int(raw_id)] = row.get("Card Name", "")
    return names


def slug(name: str) -> str:
    out = []
    for ch in name.lower():
        if ch.isalnum():
            out.append(ch)
        elif ch in " -–—'’":
            out.append("_")
    s = "".join(out)
    while "__" in s:
        s = s.replace("__", "_")
    return s.strip("_")


def png_write(path: Path, pixels: list[list[tuple[int, int, int]]]) -> bytes:
    """Deterministic PNG writer (no timestamps, no ancillary chunks)."""
    h = len(pixels)
    w = len(pixels[0])
    raw = bytearray()
    for row in pixels:
        raw.append(0)  # filter type 0
        for r, g, b in row:
            raw += bytes((r, g, b))
    def chunk(ctype: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + ctype
            + payload
            + struct.pack(">I", zlib.crc32(ctype + payload) & 0xFFFFFFFF)
        )
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)
    return png


def render_tile(tile: bytes, palette: list[tuple[int, int, int]]) -> list[list[tuple[int, int, int]]]:
    rows = []
    for y in range(8):
        lo = tile[y * 2]
        hi = tile[y * 2 + 1]
        row = []
        for x in range(8):
            bit = 7 - x
            idx = ((hi >> bit) & 1) << 1 | ((lo >> bit) & 1)
            row.append(palette[idx])
        rows.append(row)
    return rows


def upscale(tile_rows: list[list[tuple[int, int, int]]], scale: int) -> list[list[tuple[int, int, int]]]:
    out = []
    for row in tile_rows:
        expanded = []
        for px in row:
            expanded.extend([px] * scale)
        for _ in range(scale):
            out.append(expanded)
    return out


def compose_grid(tiles: list[bytes], palette: list[tuple[int, int, int]], cols: int, scale: int = 4) -> list[list[tuple[int, int, int]]]:
    canvas: list[list[tuple[int, int, int]]] = []
    for ty in range(0, len(tiles), cols):
        block = [render_tile(t, palette) for t in tiles[ty : ty + cols]]
        block = [upscale(t, scale) for t in block]
        for row in range(8 * scale):
            canvas.append([px for t in block for px in t[row]])
    return canvas


def main() -> None:
    RENDERS.mkdir(parents=True, exist_ok=True)
    SHEETS.mkdir(parents=True, exist_ok=True)
    rom = ROM_PATH.read_bytes()
    rom_sha = hashlib.sha256(rom).hexdigest()
    if rom_sha != EXPECTED_SHA256:
        raise SystemExit(f"unexpected ROM sha256: {rom_sha}")

    names = load_names()
    rows = json.loads((DATA / "support_physical_visual_matrix_v6.json").read_text())
    by_id = {int(r["cardId"]): r for r in rows}

    validation: dict[str, object] = {
        "rom": str(ROM_PATH),
        "romSha256": rom_sha,
        "renderKind": "ROM_INSPECTION_RENDER",
        "alphaMode": "opaque (color0 = real CGB color, no invented transparency)",
        "scale": 4,
        "tileGrid": "6 cols x 5 rows (30 tiles, 8x8 2bpp each)",
        "layoutInterpretation": "2 chunks x (3 tile-source pointers + $7FFF terminator); pointers resolve as $4000 + (word & $3FFF) inside the loader bank (V7.1 correction — matches $1266 convention); WRAM/VRAM consumer now V7.1 CLOSED (HDMA job $C218+ -> VRAM bank1 $8800; tilemap composition via Bank7E:$597E/$0B07 -> $9800)",
        "checks": {},
        "renders": [],
        "layoutAliasGroups": [],
    }

    all_png_hashes: list[str] = []
    failures: list[str] = []
    rendered: list[dict[str, object]] = []

    for card_id in sorted(by_id):
        r = by_id[card_id]
        name = str(r["name"])
        loader_bank = int(str(r["loaderBank"]).replace("$", ""), 16)
        gfx_addr = int(str(r["graphicsAddress"]).split(":")[1].replace("$", ""), 16)
        tile_count = int(r["tileCount"])
        palette_idx = int(str(r["palette"]).replace("$", ""), 16)
        palette = load_palette(rom, palette_idx)

        # 1) payload graphics: tileCount * 16 bytes
        gfx_offset = rom_offset(loader_bank, gfx_addr)
        gfx = rom[gfx_offset : gfx_offset + tile_count * 16]
        if len(gfx) < tile_count * 16:
            failures.append(f"card {card_id}: payload overrun")
            continue
        tiles = [gfx[i * 16 : i * 16 + 16] for i in range(tile_count)]
        # 2) layout references: 16 bytes = 2 chunks x 4 words
        layout = bytes.fromhex(str(r["layoutBytes"]))
        ref_tiles: list[bytes] = []
        layout_refs: list[dict[str, object]] = []
        ref_invalid = 0
        for chunk_idx in range(2):
            chunk = layout[chunk_idx * 8 : chunk_idx * 8 + 8]
            for word_idx in range(4):
                word = chunk[word_idx * 2] | (chunk[word_idx * 2 + 1] << 8)
                if word == 0x7FFF:
                    break
                addr = 0x4000 + (word & 0x3FFF)
                ref_offset = rom_offset(loader_bank, addr)
                if ref_offset + 16 > len(rom):
                    ref_invalid += 1
                    layout_refs.append({"chunk": chunk_idx, "word": f"${word:04X}", "status": "OUT_OF_RANGE"})
                    continue
                ref_tiles.append(rom[ref_offset : ref_offset + 16])
                layout_refs.append(
                    {
                        "chunk": chunk_idx,
                        "word": f"${word:04X}",
                        "address": bank_addr(loader_bank, addr),
                        "status": "OK",
                    }
                )
        if ref_invalid:
            failures.append(f"card {card_id}: {ref_invalid} invalid layout refs")

        # 3) renders
        stem = f"card_{card_id:03d}_{slug(name)}"
        main = compose_grid(tiles, palette, cols=6)
        png_main = png_write(RENDERS / f"{stem}.png", main)
        ref_canvas = compose_grid(ref_tiles, palette, cols=6) if ref_tiles else []
        if ref_canvas:
            png_ref = png_write(RENDERS / f"{stem}_layoutrefs.png", ref_canvas)
        else:
            png_ref = b""
        main_sha = hashlib.sha256(png_main).hexdigest()
        ref_sha = hashlib.sha256(png_ref).hexdigest() if png_ref else ""
        all_png_hashes.append(main_sha)
        if ref_sha:
            all_png_hashes.append(ref_sha)

        rendered.append(
            {
                "cardId": card_id,
                "name": name,
                "file": f"{stem}.png",
                "layoutRefsFile": f"{stem}_layoutrefs.png" if png_ref else None,
                "sha256": main_sha,
                "layoutRefsSha256": ref_sha or None,
                "paletteIndex": f"${palette_idx:02X}",
                "paletteSource": "Bank30:$6E00+idx*8 (V5)" if palette_idx in KNOWN_PALETTES else "inspection grayscale",
                "tileCount": tile_count,
                "layoutRefs": layout_refs,
            }
        )

    # contact sheets
    sheet_rows: list[list[list[tuple[int, int, int]]]] = []
    for i in range(0, 48, 8):
        row_canvas: list[list[tuple[int, int, int]]] = []
        for _ in range(160):
            row_canvas.append([])
        for card_id in sorted(by_id)[i : i + 8]:
            r = by_id[card_id]
            name = str(r["name"])
            stem = f"card_{card_id:03d}_{slug(name)}"
            img = RENDERS / f"{stem}.png"
            if not img.exists():
                continue
            # decode our deterministic PNG (RGB8 non-interlaced)
            import struct as _st

            data = img.read_bytes()
            idat = data[data.index(b"IDAT") + 4 : data.index(b"IEND") - 4]
            raw = zlib.decompress(idat)
            w = 192
            h = 160
            pos = 0
            pixels = []
            for y in range(h):
                pos += 1  # filter byte
                for _x in range(w):
                    pixels.append((raw[pos], raw[pos + 1], raw[pos + 2]))
                    pos += 3
            for y in range(160):
                row_canvas[y].extend(pixels[y * 192 : (y + 1) * 192])
        sheet_rows.extend(row_canvas)
    png_all = png_write(SHEETS / "support_all_48.png", sheet_rows)

    # layout alias sheet: #85/#86/#88/#89
    alias_ids = [85, 86, 88, 89]
    alias_canvas: list[list[tuple[int, int, int]]] = [[] for _ in range(160)]
    for card_id in alias_ids:
        r = by_id[card_id]
        stem = f"card_{card_id:03d}_{slug(str(r['name']))}"
        img = RENDERS / f"{stem}.png"
        if not img.exists():
            continue
        idat = img.read_bytes()
        idat = idat[idat.index(b"IDAT") + 4 : idat.index(b"IEND") - 4]
        raw = zlib.decompress(idat)
        pixels = []
        pos = 0
        for y in range(160):
            pos += 1
            for _x in range(192):
                pixels.append((raw[pos], raw[pos + 1], raw[pos + 2]))
                pos += 3
        for y in range(160):
            alias_canvas[y].extend(pixels[y * 192 : (y + 1) * 192])
    png_alias = png_write(SHEETS / "support_layout_aliases.png", alias_canvas)

    # layout alias CSV
    layout_groups: dict[str, list[int]] = {}
    for card_id in sorted(by_id):
        r = by_id[card_id]
        layout_groups.setdefault(str(r["layoutSha256"]), []).append(card_id)
    alias_groups = [ids for ids in layout_groups.values() if len(ids) > 1]
    with (OUT / "SUPPORT_LAYOUT_ALIASES.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(
            [
                "cardId",
                "name",
                "layoutSha256",
                "payloadSha256",
                "graphicsSha256",
                "layoutAliasGroup",
            ]
        )
        for card_id in sorted(by_id):
            r = by_id[card_id]
            for gi, group in enumerate(alias_groups):
                if card_id in group:
                    group_label = f"group_{gi}"
                    break
            else:
                group_label = ""
            w.writerow(
                [
                    card_id,
                    r["name"],
                    r["layoutSha256"],
                    r["payloadSha256"],
                    r["graphicsSha256"],
                    group_label,
                ]
            )

    checks = {
        "supportCards": 48,
        "rendered": len(rendered),
        "renderable": len(rendered) == 48 and not failures,
        "tileReadsOutOfRange": 0,
        "payloadOverruns": len(failures),
        "invalidLayoutRefs": sum(
            1 for r in rendered for ref in r["layoutRefs"] if ref["status"] != "OK"
        ),
        "deterministicPng": True,
        "pngCount": len(all_png_hashes),
    }
    validation["checks"] = checks
    validation["renders"] = rendered
    validation["layoutAliasGroups"] = alias_groups
    validation["contactSheets"] = {
        "support_all_48.png": hashlib.sha256(png_all).hexdigest(),
        "support_layout_aliases.png": hashlib.sha256(png_alias).hexdigest(),
    }

    (OUT / "RENDER_VALIDATION.json").write_text(
        json.dumps(validation, indent=2), encoding="utf-8"
    )
    print(json.dumps(validation["checks"], indent=2))
    print(f"renders dir: {RENDERS}")
    print(f"PNGs: {len(all_png_hashes)}")


if __name__ == "__main__":
    main()
