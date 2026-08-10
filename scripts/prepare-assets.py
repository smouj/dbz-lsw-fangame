#!/usr/bin/env python3
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SHEETS = ROOT / "public" / "assets" / "sheets"
SPRITES = ROOT / "public" / "assets" / "sprites"
SHEETS.mkdir(parents=True, exist_ok=True)
SPRITES.mkdir(parents=True, exist_ok=True)

SOURCES = {
    "goku": "https://www.spriters-resource.com/media/assets/18/18963.png?updated=1755472527",
    "vegeta": "https://www.spriters-resource.com/media/assets/18/18967.png?updated=1755472527",
}

FRAMES = {
    "goku_idle": ("goku", (70, 6, 102, 58)),
    "goku_beam": ("goku", (70, 316, 108, 372)),
    "goku_hurt": ("goku", (72, 252, 108, 306)),
    "vegeta_idle": ("vegeta", (70, 6, 104, 60)),
    "vegeta_guard": ("vegeta", (72, 92, 108, 148)),
    "vegeta_hurt": ("vegeta", (72, 252, 110, 308)),
}


def download(name: str, url: str) -> Path:
    out = SHEETS / f"{name}.png"
    if not out.exists() or out.stat().st_size == 0:
        print(f"download {name}")
        request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(request, timeout=30) as response:
            out.write_bytes(response.read())
    return out


def make_transparent(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            is_cyan_bg = r < 24 and 135 <= g <= 230 and b >= 170
            is_sheet_label = r > 230 and g > 20 and b > 20
            if is_cyan_bg or is_sheet_label:
                pixels[x, y] = (0, 0, 0, 0)
    bbox = rgba.getbbox()
    return rgba.crop(bbox) if bbox else rgba


def frame_to_canvas(frame: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    scale = 1
    if frame.width > 60 or frame.height > 62:
        scale = min(60 / frame.width, 62 / frame.height)
    if scale != 1:
        frame = frame.resize((max(1, int(frame.width * scale)), max(1, int(frame.height * scale))), Image.Resampling.NEAREST)
    x = (64 - frame.width) // 2
    y = 64 - frame.height
    canvas.alpha_composite(frame, (x, y))
    return canvas


def main() -> None:
    sheets = {name: Image.open(download(name, url)) for name, url in SOURCES.items()}
    for frame_name, (sheet_name, box) in FRAMES.items():
        crop = sheets[sheet_name].crop(box)
        clean = frame_to_canvas(make_transparent(crop))
        out = SPRITES / f"{frame_name}.png"
        clean.save(out)
        print(f"sprite {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
