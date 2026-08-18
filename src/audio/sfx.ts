// ═══════════════════════════════════════════════════════════
// DBZ LSW — Audio engine (Web Audio, estilo GBC)
// SFX sintetizados que imitan el chip de sonido Game Boy
// (pulso, onda cuadrada, ruido) — sin archivos externos
// ═══════════════════════════════════════════════════════════

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxEnabled = true;
let volume = 0.7;

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

export function setSfxEnabled(v: boolean) { sfxEnabled = v; }
export function setVolume(v: number) {
  volume = v / 100;
  if (masterGain) masterGain.gain.value = volume;
}

/** Tone básico estilo GBC (onda cuadrada) */
function beep(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.3, slideTo?: number) {
  if (!ctx || !masterGain || !sfxEnabled) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

/** Ruido estilo GBC (buffer) */
function noise(dur: number, vol = 0.3, freq = 1000) {
  if (!ctx || !masterGain || !sfxEnabled) return;
  const bufferSize = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  src.start();
}

// ─── SFX del juego ─────────────────────────────────────────

export const Sfx = {
  cursor: () => beep(880, 0.06, 'square', 0.15),
  confirm: () => { beep(660, 0.08, 'square', 0.2); setTimeout(() => beep(990, 0.1, 'square', 0.2), 80); },
  cancel: () => beep(440, 0.1, 'square', 0.15, 220),
  select: () => beep(1320, 0.07, 'square', 0.18),
  cardPlay: () => { beep(520, 0.08, 'square', 0.2); setTimeout(() => beep(780, 0.12, 'square', 0.2), 90); },
  // Robo de carta: fricción de mazo (ruido corto) + tono agudo de carta al aterrizar
  draw: () => { noise(0.1, 0.35, 3000); setTimeout(() => beep(1560, 0.09, 'square', 0.2), 120); },
  punch: () => noise(0.12, 0.4, 800),
  kick: () => noise(0.15, 0.35, 600),
  beam: () => { beep(200, 0.4, 'sawtooth', 0.25, 1200); noise(0.3, 0.2, 2000); },
  beamCharge: () => beep(300, 0.5, 'sawtooth', 0.2, 900),
  explosion: () => { noise(0.4, 0.5, 400); beep(100, 0.3, 'triangle', 0.3, 50); },
  hit: () => { noise(0.1, 0.45, 1200); beep(200, 0.08, 'square', 0.25, 100); },
  guard: () => beep(700, 0.12, 'square', 0.2, 350),
  dodge: () => beep(1200, 0.1, 'sine', 0.2, 600),
  powerUp: () => { beep(400, 0.15, 'square', 0.2, 800); setTimeout(() => beep(800, 0.2, 'square', 0.2, 1600), 150); },
  victory: () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => beep(n, 0.15, 'square', 0.22), i * 130));
  },
  defeat: () => {
    const notes = [392, 330, 262, 196];
    notes.forEach((n, i) => setTimeout(() => beep(n, 0.2, 'triangle', 0.22), i * 150));
  },
  transform: () => {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => beep(200 + i * 150, 0.08, 'sawtooth', 0.2, 400 + i * 200), i * 70);
    }
  },
  position: () => beep(660, 0.06, 'square', 0.15),
  // Cambio de turno: campanilla corta de dos tonos (inicio de round)
  turnChange: () => { beep(880, 0.07, 'square', 0.18); setTimeout(() => beep(1175, 0.09, 'square', 0.18), 90); },
  // Feedback QTE A/B: acierto = blip agudo corto · fallo = buzz grave
  qteCorrect: () => beep(1560, 0.06, 'square', 0.2),
  qteFail: () => { beep(220, 0.16, 'square', 0.22, 110); noise(0.08, 0.2, 600); },
  // Estrella HUD (Gather FULL POWER): chispa ascendente
  star: () => { beep(1760, 0.05, 'square', 0.18); setTimeout(() => beep(2200, 0.07, 'square', 0.16), 60); },
  // Movimiento defensivo (MOVE): whoosh de dash + paso
  move: () => { noise(0.14, 0.25, 2200); setTimeout(() => beep(500, 0.1, 'square', 0.16, 750), 40); },
};