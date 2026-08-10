#!/usr/bin/env python3
"""
DBZ LSW Sheet Extractor — auto cell detection
Detects grid cells by background separator lines, crops them, trims
transparency, and emits a JSON mapping. Works for:
  - character-portraits.png  (retratos)
  - battle-backgrounds.png   (fondos de batalla)
  - overworld-sprites.png    (sprites de overworld)

Usage:
    python3 extract_sheets.py <sheet.png> <output_dir> [--min-size WxH]
"""

import sys
import os
import json
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
except ImportError:
    print("ERROR: need PIL + numpy")
    sys.exit(1)


def detect_background(img_arr):
    """Background = most common color at the image borders."""
    h, w = img_arr.shape[:2]
    border_pixels = []
    border_pixels.extend(img_arr[0, :, :3].tolist())
    border_pixels.extend(img_arr[-1, :, :3].tolist())
    border_pixels.extend(img_arr[:, 0, :3].tolist())
    border_pixels.extend(img_arr[:, -1, :3].tolist())

    from collections import Counter
    counts = Counter(tuple(p) for p in border_pixels)
    return counts.most_common(1)[0][0]


def find_separators(arr, bg, axis=0, tolerance=14):
    """Find full rows (axis=0) or cols (axis=1) that are background color."""
    h, w = arr.shape[:2]
    bg = np.array(bg, dtype=int)
    seps = []
    length = h if axis == 0 else w
    for i in range(length):
        if axis == 0:
            line = arr[i, :, :3].astype(int)
        else:
            line = arr[:, i, :3].astype(int)
        dist = np.abs(line - bg).sum(axis=1)
        near = (dist <= tolerance * 3).mean()
        if near > 0.9:
            seps.append(i)
    return seps


def group_runs(indices):
    """Group consecutive indices into (start, end) inclusive runs."""
    if not indices:
        return []
    runs = []
    start = prev = indices[0]
    for i in indices[1:]:
        if i == prev + 1:
            prev = i
        else:
            runs.append((start, prev))
            start = prev = i
    runs.append((start, prev))
    return runs


def extract_cells(img, min_w=8, min_h=8):
    """Split image into cells using bg separator lines."""
    arr = np.array(img.convert("RGBA"))
    bg = detect_background(arr)

    row_seps = find_separators(arr, bg, axis=0)
    col_seps = find_separators(arr, bg, axis=1)

    row_runs = group_runs(row_seps)
    col_runs = group_runs(col_seps)

    # Cell boundaries: gaps between separator runs
    rows = []
    prev_end = -1
    for start, end in row_runs:
        if start > prev_end + 1:
            rows.append((prev_end + 1, start - 1))
        prev_end = end
    if prev_end < arr.shape[0] - 1:
        rows.append((prev_end + 1, arr.shape[0] - 1))

    cols = []
    prev_end = -1
    for start, end in col_runs:
        if start > prev_end + 1:
            cols.append((prev_end + 1, start - 1))
        prev_end = end
    if prev_end < arr.shape[1] - 1:
        cols.append((prev_end + 1, arr.shape[1] - 1))

    cells = []
    for ry, (y0, y1) in enumerate(rows):
        for cx, (x0, x1) in enumerate(cols):
            if x1 - x0 + 1 < min_w or y1 - y0 + 1 < min_h:
                continue
            cell = img.crop((x0, y0, x1 + 1, y1 + 1))
            cells.append({"row": ry, "col": cx, "x": x0, "y": y0, "w": x1 - x0 + 1, "h": y1 - y0 + 1, "img": cell})
    return cells


def trim_transparency(img, bg=None, tolerance=14):
    """Remove background-colored pixels and transparent margins."""
    arr = np.array(img.convert("RGBA"))
    if bg is not None:
        bg_arr = np.array(bg, dtype=int)
        dist = np.abs(arr[:, :, :3].astype(int) - bg_arr).sum(axis=2)
        arr[dist <= tolerance * 3, 3] = 0
    img2 = Image.fromarray(arr)
    bbox = img2.getbbox()
    if bbox:
        return img2.crop(bbox)
    return img2


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    sheet_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    min_w, min_h = 8, 8
    for arg in sys.argv[3:]:
        if arg.startswith("--min-size"):
            w, h = arg.split("=")[1].split("x")
            min_w, min_h = int(w), int(h)

    img = Image.open(sheet_path).convert("RGBA")
    print(f"Sheet: {sheet_path.name} ({img.width}x{img.height})")

    bg = detect_background(np.array(img))
    print(f"Background: {bg}")

    cells = extract_cells(img, min_w, min_h)
    print(f"Cells detected: {len(cells)}")

    manifest = {"sheet": sheet_path.name, "background": list(bg), "cells": []}
    saved = 0

    for cell in cells:
        trimmed = trim_transparency(cell["img"], bg)
        if trimmed.width < min_w or trimmed.height < min_h:
            continue
        if trimmed.getbbox() is None:
            continue

        name = f"cell_{cell['row']:02d}_{cell['col']:02d}"
        fname = f"{name}.png"
        trimmed.save(out_dir / fname, "PNG")
        manifest["cells"].append({
            "file": fname,
            "row": cell["row"], "col": cell["col"],
            "src_x": cell["x"], "src_y": cell["y"],
            "src_w": cell["w"], "src_h": cell["h"],
            "w": trimmed.width, "h": trimmed.height,
        })
        saved += 1

    with open(out_dir / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"Saved {saved} cells → {out_dir}")
    print(f"Manifest → {out_dir / 'manifest.json'}")


if __name__ == "__main__":
    main()