#!/usr/bin/env python3
"""
Generate Kamehameha GIF — ROM-accurate, V14 (FINAL).

Key fix: Use ffmpeg with a global palette built from ALL frames,
then force paletteuse with that palette. Write frames as PNGs,
generate palette from a mosaic that has ALL frame types present.

Physical frames: ROM resource $03 seq 0 (goku_base)
  vfid 1: rom-p05-g36-r03-vf01-ms46655521-gfx59124315.png (charge pose)
  vfid 2: rom-p05-g36-r03-vf02-ms4d2c5584-gfx3db79d06.png (fire pose)
Sequence: 8 frames, 75 ticks total, dx offsets from ROM.
Beam: GBC palette $2C, drawn as layered rectangles.
"""
from PIL import Image, ImageDraw
import os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, 'public', 'assets')

GBC_W, GBC_H = 160, 144
SCALE = 4
OUT_W, OUT_H = GBC_W * SCALE, GBC_H * SCALE
FRAME_MS = 80

BEAM_CORE = (255, 255, 255)
BEAM_BRIGHT = (188, 220, 255)
BEAM_MID = (84, 136, 255)
BEAM_DARK = (32, 52, 160)
BEAM_GLOW = (16, 28, 96)

SKY = (16, 16, 40)
GROUND = (32, 40, 64)
GND_LINE = (48, 56, 80)
MOUNTAIN = (28, 36, 56)
HP_GREEN = (80, 200, 80)
HP_BG = (24, 24, 24)

GOKU_X, GOKU_Y = 40, 72

def load(path):
    return Image.open(path).convert('RGBA')

def main():
    sp = os.path.join(PUBLIC, 'sprites', 'goku_base')
    phys = os.path.join(sp, 'physical')
    
    vfid1 = load(os.path.join(phys, 'rom-p05-g36-r03-vf01-ms46655521-gfx59124315.png'))
    vfid2 = load(os.path.join(phys, 'rom-p05-g36-r03-vf02-ms4d2c5584-gfx3db79d06.png'))
    idle = load(os.path.join(sp, 'goku_base_idle_00.png'))
    
    print(f"Physical frames: vfid1={vfid1.size}, vfid2={vfid2.size}, idle={idle.size}")
    
    def make_bg():
        bg = Image.new('RGB', (GBC_W, GBC_H), SKY)
        draw = ImageDraw.Draw(bg)
        draw.rectangle([0, 112, GBC_W, GBC_H], fill=GROUND)
        draw.rectangle([0, 112, GBC_W, 113], fill=GND_LINE)
        for x in range(0, GBC_W, 8):
            h = 20 + (x * 7 % 15)
            draw.rectangle([x, 112-h, x+8, 112], fill=MOUNTAIN)
        draw.rectangle([GOKU_X, GOKU_Y-6, GOKU_X+28, GOKU_Y-4], fill=HP_BG)
        draw.rectangle([GOKU_X, GOKU_Y-6, GOKU_X+28, GOKU_Y-4], fill=HP_GREEN)
        return bg
    
    def draw_beam(draw, sx, ex, cy, w=5):
        if ex <= sx: return
        draw.rectangle([sx, cy-w-4, ex, cy+w+4], fill=BEAM_GLOW)
        draw.rectangle([sx, cy-w-2, ex, cy+w+2], fill=BEAM_DARK)
        draw.rectangle([sx, cy-w, ex, cy+w], fill=BEAM_MID)
        hw = max(1, w-2)
        draw.rectangle([sx, cy-hw, ex, cy+hw], fill=BEAM_BRIGHT)
        draw.rectangle([sx, cy-1, ex, cy+1], fill=BEAM_CORE)
    
    def draw_ball(draw, cx, cy, r):
        if r < 1: return
        draw.ellipse([cx-r-4, cy-r-4, cx+r+4, cy+r+4], fill=BEAM_GLOW)
        draw.ellipse([cx-r-2, cy-r-2, cx+r+2, cy+r+2], fill=BEAM_DARK)
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=BEAM_MID)
        r2 = max(1, r//2)
        draw.ellipse([cx-r2, cy-r2, cx+r2, cy+r2], fill=BEAM_CORE)
    
    def compose(sprite, dx, charge_r=0, beam_prog=0.0, flash=False):
        bg = make_bg()
        draw = ImageDraw.Draw(bg)
        gx = GOKU_X + dx
        beam_sx = gx + sprite.size[0] - 4
        beam_ex = GBC_W - 8
        beam_y = GOKU_Y + sprite.size[1] // 2 - 4
        
        if flash:
            draw.rectangle([0, 0, GBC_W, beam_y-8], fill=BEAM_CORE)
            draw.rectangle([0, beam_y+8, GBC_W, GBC_H], fill=BEAM_CORE)
        
        if beam_prog > 0:
            ex = int(beam_sx + (beam_ex - beam_sx) * beam_prog)
            draw_beam(draw, beam_sx, ex, beam_y)
        
        if charge_r > 0:
            draw_ball(draw, beam_sx, beam_y, charge_r)
        
        bg_rgba = bg.convert('RGBA')
        bg_rgba.paste(sprite, (gx, GOKU_Y), sprite)
        return bg_rgba.resize((OUT_W, OUT_H), Image.NEAREST).convert('RGB')
    
    frames = []
    
    # Idle (3)
    for _ in range(3): frames.append(compose(idle, 0))
    # fi=0: vfid=1, dx=+2
    frames.append(compose(vfid1, 2))
    # fi=1: vfid=1, dx=+3, charge starts
    frames.append(compose(vfid1, 3, charge_r=3))
    # fi=2: vfid=1, dx=+3, HOLD (8 frames)
    for i in range(8):
        r = 3 + i
        frames.append(compose(vfid1, 3, charge_r=r))
    # fi=3: vfid=1, dx=+2, full charge
    frames.append(compose(vfid1, 2, charge_r=10))
    # fi=4: vfid=2, dx=-2, FIRE!
    frames.append(compose(vfid2, -2, beam_prog=0.3, flash=True))
    # fi=5: vfid=2, dx=-4
    frames.append(compose(vfid2, -4, beam_prog=0.7))
    # fi=6: vfid=2, dx=-5
    frames.append(compose(vfid2, -5, beam_prog=1.0))
    # fi=7: vfid=2, dx=-4
    frames.append(compose(vfid2, -4, beam_prog=1.0))
    # Sustained beam (6)
    for _ in range(6): frames.append(compose(vfid2, -4, beam_prog=1.0))
    # Beam fade (4)
    frames.append(compose(vfid2, -3, beam_prog=0.5))
    frames.append(compose(vfid1, -1, charge_r=4))
    frames.append(compose(vfid1, 0))
    frames.append(compose(idle, 0))
    # Return idle (2)
    for _ in range(2): frames.append(compose(idle, 0))
    
    # ─── Write frames and generate GIF with ffmpeg ───
    # Key: use stats_mode=full on a MOSAIC of ALL frames to ensure
    # beam colors are in the palette
    tmp = os.path.join(ROOT, '.tmp', 'gif-frames')
    os.makedirs(tmp, exist_ok=True)
    for i, frame in enumerate(frames):
        frame.save(os.path.join(tmp, f'frame_{i:03d}.png'))
    
    # Create mosaic of ALL frames for palette generation
    # Stack horizontally so all frame types are represented
    mosaic_w = OUT_W * len(frames)
    mosaic = Image.new('RGB', (mosaic_w, OUT_H))
    for i, frame in enumerate(frames):
        mosaic.paste(frame, (i * OUT_W, 0))
    mosaic_path = os.path.join(tmp, 'mosaic.png')
    mosaic.save(mosaic_path)
    
    out = os.path.join(ROOT, 'media', 'kamehameha.gif')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    
    # Step 1: Generate palette from frames (diff mode catches beam colors)
    pal_path = os.path.join(tmp, 'palette.png')
    fps = str(1000 // FRAME_MS)
    subprocess.run([
        'ffmpeg', '-y', '-f', 'image2',
        '-framerate', fps,
        '-i', os.path.join(tmp, 'frame_%03d.png'),
        '-vf', 'palettegen=max_colors=256:stats_mode=diff',
        pal_path
    ], capture_output=True, check=True)
    
    # Step 2: Generate GIF
    r = subprocess.run([
        'ffmpeg', '-y', '-f', 'image2',
        '-framerate', fps,
        '-i', os.path.join(tmp, 'frame_%03d.png'),
        '-i', pal_path,
        '-lavfi', 'paletteuse=dither=sierra2_4a:diff_mode=rectangle',
        '-loop', '0', out
    ], capture_output=True, text=True)
    
    if r.returncode != 0:
        print(f"ffmpeg error: {r.stderr[:500]}")
        return
    
    sz = os.path.getsize(out) / 1024
    print(f"\n✅ {out}")
    print(f"   {len(frames)} frames, {OUT_W}×{OUT_H}px, {sz:.0f}KB")
    
    # Verify
    from PIL import Image as PILImage
    gif = PILImage.open(out)
    beam_frames = 0
    charge_frames = 0
    idle_frames = 0
    for i in range(gif.n_frames):
        gif.seek(i)
        f = gif.convert('RGB')
        bg = f.getpixel((10, 10))
        beam = f.getpixel((400, 340))
        goku = f.getpixel((200, 340))
        is_beam = beam[2] > 100 or (beam[0] > 200 and beam[1] > 200)
        is_charge = goku[2] > 100
        if is_beam: beam_frames += 1
        elif is_charge: charge_frames += 1
        else: idle_frames += 1
    print(f"   Beam: {beam_frames}, Charge: {charge_frames}, Idle: {idle_frames} / {gif.n_frames} total")
    
    # Print key frames
    for i in [0, 4, 12, 15, 20, 25, 28]:
        if i >= gif.n_frames: break
        gif.seek(i)
        f = gif.convert('RGB')
        bg = f.getpixel((10, 10))
        beam = f.getpixel((400, 340))
        goku = f.getpixel((200, 340))
        print(f"  Frame {i:2d}: bg={bg} goku={goku} beam={beam}")

if __name__ == '__main__':
    main()
