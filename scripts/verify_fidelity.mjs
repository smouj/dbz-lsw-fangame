// ═══════════════════════════════════════════════════════════
// Tests de temporización GBC (frecuencia de conversión)
// Ejecutar: node scripts/verify_fidelity.mjs
// ═══════════════════════════════════════════════════════════
import assert from 'node:assert/strict';

const GBC_NATIVE_FPS = 59.72750056960583;
const CAPTURE_FPS = 60;

export function captureFrameToGbcFrame(captureFrame) {
  return captureFrame * (GBC_NATIVE_FPS / CAPTURE_FPS);
}

export function gbcFrameToCaptureFrame(gbcFrame) {
  return gbcFrame * (CAPTURE_FPS / GBC_NATIVE_FPS);
}

export function gbcFramesToSeconds(gbcFrames) {
  return gbcFrames / GBC_NATIVE_FPS;
}

// ─── Tests ───
assert.ok(
  Math.abs(captureFrameToGbcFrame(60) - 59.72750056960583) < 1e-9,
  'captureFrame 60 → ~59.7275 GBC frames'
);
assert.ok(
  Math.abs(gbcFrameToCaptureFrame(59.72750056960583) - 60) < 1e-9,
  '59.7275 GBC frames → ~60 capture frames'
);
assert.ok(
  Math.abs(captureFrameToGbcFrame(300) - 298.63750284802915) < 1e-9,
  'captureFrame 300 → ~298.64 GBC frames'
);
assert.ok(
  Math.abs(gbcFrameToCaptureFrame(300) - 301.368713378906) < 1e-9,
  'GBC frame 300 → ~301.37 capture frames'
);
// 5 segundos de vídeo a 60fps = 298.64 GBC frames (ejemplo del usuario)
assert.ok(
  Math.abs(captureFrameToGbcFrame(300) - (5 * GBC_NATIVE_FPS)) < 1e-9,
  '300 capture frames = 5s = 298.64 GBC frames'
);
// 1 GBC frame ≈ 16.74 ms
assert.ok(
  Math.abs(gbcFramesToSeconds(1) - 0.0167427) < 1e-4,
  '1 GBC frame ≈ 16.74 ms'
);

console.log('✅ verify_fidelity: 6 tests PASS');
console.log('   captureFrameToGbcFrame(60)  =', captureFrameToGbcFrame(60).toFixed(6));
console.log('   captureFrameToGbcFrame(300) =', captureFrameToGbcFrame(300).toFixed(6));
console.log('   gbcFrameToCaptureFrame(300) =', gbcFrameToCaptureFrame(300).toFixed(6));
console.log('   gbcFramesToSeconds(1)       =', gbcFramesToSeconds(1).toFixed(6), 's');
