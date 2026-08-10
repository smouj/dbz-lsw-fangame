#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "public" / "assets" / "sprites"
SPRITES.mkdir(parents=True, exist_ok=True)

TRANSPARENT = (0, 0, 0, 0)

PALETTES = {
    "goku": {
        "outline": (21, 24, 37, 255),
        "skin": (238, 183, 122, 255),
        "skin_dark": (159, 96, 67, 255),
        "hair": (28, 25, 20, 255),
        "gi": (224, 98, 25, 255),
        "gi_dark": (121, 51, 23, 255),
        "boots": (32, 43, 95, 255),
        "aura": (79, 183, 238, 170),
    },
    "vegeta": {
        "outline": (20, 22, 34, 255),
        "skin": (232, 174, 114, 255),
        "skin_dark": (150, 86, 64, 255),
        "hair": (23, 23, 25, 255),
        "gi": (38, 79, 168, 255),
        "gi_dark": (21, 39, 95, 255),
        "boots": (220, 226, 232, 255),
        "aura": (117, 135, 255, 160),
    },
}


def rect(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], color: tuple[int, int, int, int]) -> None:
    draw.rectangle(box, fill=color)


def poly(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]], color: tuple[int, int, int, int]) -> None:
    draw.polygon(points, fill=color)


def draw_fighter(character: str, pose: str) -> Image.Image:
    p = PALETTES[character]
    img = Image.new("RGBA", (96, 96), TRANSPARENT)
    d = ImageDraw.Draw(img)

    if pose in {"power", "beam"}:
        for inset, alpha in [(12, 72), (18, 96), (25, 120)]:
            color = (*p["aura"][:3], alpha)
            d.ellipse((inset, 18, 96 - inset, 91), outline=color, width=2)

    lean = -4 if pose == "beam" else 3 if pose == "hurt" else 0
    crouch = 3 if pose == "guard" else 0

    # Shadow and boots
    d.ellipse((28, 84, 72, 92), fill=(0, 0, 0, 76))
    rect(d, (35 + lean, 72 + crouch, 44 + lean, 85 + crouch), p["outline"])
    rect(d, (54 + lean, 72 + crouch, 64 + lean, 85 + crouch), p["outline"])
    rect(d, (33 + lean, 82 + crouch, 47 + lean, 89 + crouch), p["boots"])
    rect(d, (52 + lean, 82 + crouch, 68 + lean, 89 + crouch), p["boots"])

    # Legs and torso
    rect(d, (34 + lean, 50 + crouch, 46 + lean, 75 + crouch), p["outline"])
    rect(d, (52 + lean, 50 + crouch, 65 + lean, 75 + crouch), p["outline"])
    rect(d, (37 + lean, 52 + crouch, 45 + lean, 74 + crouch), p["gi"])
    rect(d, (54 + lean, 52 + crouch, 62 + lean, 74 + crouch), p["gi_dark"])
    rect(d, (34 + lean, 35 + crouch, 65 + lean, 58 + crouch), p["outline"])
    rect(d, (37 + lean, 37 + crouch, 62 + lean, 55 + crouch), p["gi"])
    poly(d, [(45 + lean, 37 + crouch), (55 + lean, 37 + crouch), (50 + lean, 48 + crouch)], p["skin"])
    rect(d, (36 + lean, 55 + crouch, 63 + lean, 60 + crouch), p["gi_dark"])

    # Arms by pose
    if pose == "beam":
        rect(d, (61 + lean, 40, 84 + lean, 48), p["outline"])
        rect(d, (63 + lean, 42, 83 + lean, 45), p["skin"])
        rect(d, (77 + lean, 38, 88 + lean, 51), p["skin"])
        rect(d, (24 + lean, 46, 38 + lean, 55), p["outline"])
        rect(d, (27 + lean, 48, 38 + lean, 52), p["skin_dark"])
    elif pose == "guard":
        rect(d, (26 + lean, 35 + crouch, 42 + lean, 48 + crouch), p["outline"])
        rect(d, (29 + lean, 37 + crouch, 41 + lean, 45 + crouch), p["skin"])
        rect(d, (56 + lean, 34 + crouch, 69 + lean, 51 + crouch), p["outline"])
        rect(d, (58 + lean, 36 + crouch, 66 + lean, 49 + crouch), p["skin_dark"])
    elif pose == "hurt":
        rect(d, (20 + lean, 42 + crouch, 38 + lean, 50 + crouch), p["outline"])
        rect(d, (23 + lean, 44 + crouch, 38 + lean, 47 + crouch), p["skin"])
        rect(d, (62 + lean, 51 + crouch, 78 + lean, 59 + crouch), p["outline"])
        rect(d, (63 + lean, 53 + crouch, 75 + lean, 56 + crouch), p["skin_dark"])
    else:
        rect(d, (25 + lean, 42 + crouch, 40 + lean, 55 + crouch), p["outline"])
        rect(d, (28 + lean, 44 + crouch, 38 + lean, 53 + crouch), p["skin"])
        rect(d, (60 + lean, 42 + crouch, 75 + lean, 55 + crouch), p["outline"])
        rect(d, (62 + lean, 44 + crouch, 72 + lean, 53 + crouch), p["skin_dark"])

    # Head and hair
    rect(d, (39 + lean, 20 + crouch, 60 + lean, 39 + crouch), p["outline"])
    rect(d, (42 + lean, 23 + crouch, 58 + lean, 37 + crouch), p["skin"])
    if character == "goku":
        hair = [
            (36 + lean, 22 + crouch), (42 + lean, 10 + crouch), (46 + lean, 21 + crouch),
            (51 + lean, 6 + crouch), (53 + lean, 22 + crouch), (62 + lean, 12 + crouch),
            (60 + lean, 29 + crouch), (50 + lean, 20 + crouch), (40 + lean, 30 + crouch),
        ]
    else:
        hair = [
            (38 + lean, 23 + crouch), (41 + lean, 9 + crouch), (46 + lean, 20 + crouch),
            (50 + lean, 5 + crouch), (54 + lean, 21 + crouch), (59 + lean, 10 + crouch),
            (62 + lean, 25 + crouch), (52 + lean, 18 + crouch), (43 + lean, 28 + crouch),
        ]
    poly(d, hair, p["hair"])
    rect(d, (53 + lean, 29 + crouch, 56 + lean, 32 + crouch), p["outline"])

    if pose == "hurt":
        rect(d, (63 + lean, 26 + crouch, 69 + lean, 31 + crouch), (255, 255, 255, 220))
        rect(d, (66 + lean, 23 + crouch, 71 + lean, 36 + crouch), (255, 255, 255, 180))

    return img


def draw_effect(name: str) -> Image.Image:
    img = Image.new("RGBA", (192, 64), TRANSPARENT)
    d = ImageDraw.Draw(img)
    if name == "beam":
        for y, color in [(24, (64, 155, 255, 180)), (28, (190, 238, 255, 255)), (33, (255, 255, 255, 255)), (38, (64, 155, 255, 180))]:
            rect(d, (10, y, 170, y + 4), color)
        d.ellipse((156, 18, 190, 48), fill=(255, 255, 255, 210), outline=(82, 178, 255, 255), width=3)
    elif name == "impact":
        for box, color in [
            ((30, 10, 98, 56), (255, 255, 255, 230)),
            ((42, 18, 84, 48), (245, 203, 87, 230)),
            ((52, 25, 75, 41), (226, 82, 56, 230)),
        ]:
            d.ellipse(box, fill=color)
    return img


def main() -> None:
    for character in PALETTES:
        for pose in ["idle", "power", "beam", "hurt", "guard"]:
            out = SPRITES / f"{character}_{pose}.png"
            draw_fighter(character, pose).save(out)
            print(f"sprite {out.relative_to(ROOT)}")

    for effect in ["beam", "impact"]:
        out = SPRITES / f"fx_{effect}.png"
        draw_effect(effect).save(out)
        print(f"sprite {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
