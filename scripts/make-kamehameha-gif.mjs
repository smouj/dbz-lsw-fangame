#!/usr/bin/env node
/**
 * Generate an animated GIF of Goku's Kamehameha using ROM-extracted sprites.
 * Composes: idle → beam_charge → beam_fire + ray FX on a 160×144 GBC canvas.
 * Outputs scaled 4x for readability.
 */
import { createCanvas, loadImage } from 'canvas';
import { createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.metaUrl));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public', 'assets');

const GBC_W = 160;
const GBC_H = 144;
const SCALE = 4;
const OUT_W = GBC_W * SCALE;
const OUT_H = GBC_H * SCALE;

// GBC color palette (approximate battle background)
const BG_COLOR = '#383858'; // dark blue-gray battle BG
const GROUND_COLOR = '#585878';

// Goku position (facing right, roughly center-left)
const GOKU_X = 24;
const GOKU_Y = 72;

// Frame timing in ms (GBC 59.7fps ≈ 16.7ms per frame, but we slow down for readability)
const FRAME_MS = 120; // ~8fps for clear visibility

async function main() {
  const canvas = createCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false; // pixel-perfect scaling

  // Load sprites
  const idle = await loadImage(join(PUBLIC, 'sprites', 'goku_base', 'goku_base_idle_00.png'));
  const bc0 = await loadImage(join(PUBLIC, 'sprites', 'goku_base', 'goku_base_beam_charge_00.png'));
  const bc1 = await loadImage(join(PUBLIC, 'sprites', 'goku_base', 'goku_base_beam_charge_01.png'));
  const bc2 = await loadImage(join(PUBLIC, 'sprites', 'goku_base', 'goku_base_beam_charge_02.png'));
  const bf0 = await loadImage(join(PUBLIC, 'sprites', 'goku_base', 'goku_base_beam_fire_00.png'));

  // Load beam FX (kamehameha = fx-05, palette 2c)
  const fxPrefix1 = await loadImage(join(PUBLIC, 'rom-fx', 'fx-05', 'palette-2c', 'side-1-prefix.png'));
  const fxPrefix2 = await loadImage(join(PUBLIC, 'rom-fx', 'fx-05', 'palette-2c', 'side-2-prefix.png'));
  const fxResult1 = await loadImage(join(PUBLIC, 'rom-fx', 'fx-05', 'palette-2c', 'side-1-result.png'));
  const fxResult2 = await loadImage(join(PUBLIC, 'rom-fx', 'fx-05', 'palette-2c', 'side-2-result.png'));

  // Build frame sequence
  const frames = [];

  function drawBG() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    // Ground line
    ctx.fillStyle = GROUND_COLOR;
    ctx.fillRect(0, 120 * SCALE, OUT_W, 24 * SCALE);
  }

  function drawSprite(img, x, y) {
    ctx.drawImage(img, x * SCALE, y * SCALE, img.width * SCALE, img.height * SCALE);
  }

  function drawBeamFX(fxImg, x, y) {
    ctx.drawImage(fxImg, x * SCALE, y * SCALE, fxImg.width * SCALE, fxImg.height * SCALE);
  }

  function captureFrame() {
    frames.push(canvas.toBuffer('image/png'));
  }

  // Phase 1: Idle (3 frames)
  drawBG();
  drawSprite(idle, GOKU_X, GOKU_Y);
  captureFrame();
  captureFrame();
  captureFrame();

  // Phase 2: Beam charge (frames cycle through charge poses)
  drawBG();
  drawSprite(bc0, GOKU_X, GOKU_Y);
  captureFrame();

  drawBG();
  drawSprite(bc1, GOKU_X, GOKU_Y);
  captureFrame();

  drawBG();
  drawSprite(bc2, GOKU_X, GOKU_Y);
  captureFrame();
  captureFrame();

  // Phase 3: Beam fire + FX prefix (charge glow expanding)
  for (let i = 0; i < 3; i++) {
    drawBG();
    drawSprite(bf0, GOKU_X, GOKU_Y);
    // Prefix FX starts small from Goku's hands
    const prefixW = Math.min(64 * (i + 1), 256);
    ctx.drawImage(fxPrefix1, 0, 0, prefixW, 64,
      (GOKU_X + 28) * SCALE, (GOKU_Y + 8) * SCALE, prefixW * SCALE, 64 * SCALE);
    captureFrame();
  }

  // Phase 4: Full beam (result FX across screen)
  for (let i = 0; i < 6; i++) {
    drawBG();
    drawSprite(bf0, GOKU_X, GOKU_Y);
    // Full beam ray across the screen
    drawBeamFX(fxResult1, GOKU_X + 28, GOKU_Y + 8);
    captureFrame();
  }

  // Phase 5: Beam fading (2 frames)
  drawBG();
  drawSprite(bc2, GOKU_X, GOKU_Y);
  drawBeamFX(fxPrefix1, GOKU_X + 28, GOKU_Y + 8);
  captureFrame();

  drawBG();
  drawSprite(bc1, GOKU_X, GOKU_Y);
  captureFrame();

  // Phase 6: Back to idle (2 frames)
  drawBG();
  drawSprite(idle, GOKU_X, GOKU_Y);
  captureFrame();
  captureFrame();

  // Write frames as numbered PNGs for ffmpeg
  const TMP = join(ROOT, '.tmp', 'gif-frames');
  const { mkdirSync, writeFileSync } = await import('fs');
  mkdirSync(TMP, { recursive: true });

  for (let i = 0; i < frames.length; i++) {
    writeFileSync(join(TMP, `frame_${String(i).padStart(3, '0')}.png`), frames[i]);
  }

  console.log(`Wrote ${frames.length} frames to ${TMP}`);
  console.log(`Frame size: ${OUT_W}x${OUT_H}`);
  console.log(`Now run: ffmpeg -y -f image2 -framerate ${1000/FRAME_MS} -i ${TMP}/frame_%03d.png -vf "palettegen=max_colors=256:stats_mode=diff" ${TMP}/palette.png && ffmpeg -y -f image2 -framerate ${1000/FRAME_MS} -i ${TMP}/frame_%03d.png -i ${TMP}/palette.png -lavfi "paletteuse=dither=bayer:bayer_scale=5" -loop 0 ${ROOT}/media/kamehameha.gif`);
}

main().catch(console.error);
