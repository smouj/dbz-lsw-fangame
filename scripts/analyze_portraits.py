#!/usr/bin/env python3
"""
Analyze portrait cells by dominant colors to guess character identity.
DBZ characters have distinctive palettes:
  - Goku/Gohan/Krillin: orange gi, black hair
  - Vegeta: dark blue/white armor
  - SSJ forms: yellow hair
  - Piccolo: green skin, white cape
  - Frieza: white/purple
  - Cell: green with black spots
  - Buu: pink
  - Androids: dark blue/teal
  - Ginyu Force: purple/red armor
  - Nappa: brown/white armor, bald
  - Trunks: purple hair, dark blue jacket
  - Goten: orange gi, black hair (kid)
  - Gotenks: orange vest
  - Cell Jr: green
"""
import sys
import json
from pathlib import Path
from collections import Counter

from PIL import Image
import numpy as np

PORTRAITS_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("public/assets/portraits/menu")
OUT = PORTRAITS_DIR / "color_analysis.json"


def dominant_colors(img, n=8, bg_threshold=40):
    """Most common non-background colors."""
    arr = np.array(img.convert("RGBA"))
    if arr.shape[2] == 4:
        mask = arr[:, :, 3] > 30
    else:
        mask = np.ones(arr.shape[:2], dtype=bool)
    pixels = arr[mask][:, :3]
    if len(pixels) == 0:
        return []
    q = (pixels // 24 * 24)
    counts = Counter(map(tuple, q))
    top = counts.most_common(n)
    return [{"rgb": list(map(int, c[0])), "count": c[1], "pct": round(c[1] / len(pixels) * 100, 1)} for c in top]


def classify(colors):
    """Guess character from dominant colors."""
    sig = set()
    for c in colors:
        r, g, b = c["rgb"]
        if r > 170 and 90 < g < 190 and b < 100:
            sig.add("orange")
        elif r > 190 and g > 170 and b < 130:
            sig.add("yellow")
        elif r < 70 and g < 70 and b < 70:
            sig.add("black")
        elif r < 90 and g < 100 and b > 130:
            sig.add("blue")
        elif r < 100 and g > 100 and b < 100:
            sig.add("green")
        elif r > 170 and g < 150 and b > 140:
            sig.add("pink")
        elif r > 130 and g < 90 and b < 110:
            sig.add("red")
        elif r > 110 and g < 90 and b > 110:
            sig.add("purple")
        elif r > 200 and g > 200 and b > 200:
            sig.add("white")
        elif r > 150 and g > 110 and b < 90:
            sig.add("brown")
        elif r > 170 and 110 < g < 180 and 90 < b < 170:
            sig.add("skin")
        elif 90 < r < 170 and g > 140 and b > 140:
            sig.add("teal")
    return sig


def main():
    results = {}
    for png in sorted(PORTRAITS_DIR.glob("cell_*.png")):
        img = Image.open(png).convert("RGBA")
        if img.width < 10 or img.height < 10:
            continue
        colors = dominant_colors(img)
        sig = classify(colors)
        results[png.name] = {
            "size": [img.width, img.height],
            "colors": colors[:5],
            "signature": sorted(sig),
        }

    with open(OUT, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Analyzed {len(results)} portraits → {OUT}")
    print(f"\n{'File':<18} {'Sig':<8} {'Top colors'}")
    print("-" * 70)
    for name, info in results.items():
        sig = ', '.join(info['signature'])
        top = ' '.join(f"#{c['rgb'][0]:02x}{c['rgb'][1]:02x}{c['rgb'][2]:02x}" for c in info['colors'][:3])
        print(f"{name:<18} {sig:<8} {top}")


if __name__ == "__main__":
    main()