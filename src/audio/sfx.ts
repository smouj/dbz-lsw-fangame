// ═══════════════════════════════════════════════════════════
// DBZ LSW — Audio engine (Web Audio, estilo GBC)
// SFX sintetizados que imitan el chip de sonido Game Boy
// (pulso, onda cuadrada, ruido). Cuando una acción tiene mapeo
// semántico HYPOTHESIS en sfxRegistry, se reproduce el WAV REAL
// extraído de la ROM (banco 0x79) con fallback al sintetizado.
// ═══════════════════════════════════════════════════════════

import { SFX_SEMANTICS_BY_ACTION, sfxUrl } from './sfxRegistry';
import { AUDIO_CONFIG } from '../config/audio.config';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxEnabled = true;
let volume = AUDIO_CONFIG.sfx;

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  try {
    ctx = new AudioContext({ latencyHint: AUDIO_CONFIG.latencyHint });
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

export function setSfxEnabled(v: boolean) { sfxEnabled = v; }
export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v > 1 ? v / 100 : v));
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

/** Reproduce el WAV real de una acción (si tiene mapeo semántico). */
const wavCache = new Map<string, AudioBuffer>();
async function playSfxAsset(action: string): Promise<boolean> {
  if (!ctx || !masterGain || !sfxEnabled) return false;
  const sem = SFX_SEMANTICS_BY_ACTION[action];
  const url = sem?.key ? sfxUrl(sem.key) : undefined;
  if (!url) return false;
  try {
    let buf = wavCache.get(url);
    if (!buf) {
      const res = await fetch(url);
      if (!res.ok) return false;
      buf = await ctx.decodeAudioData(await res.arrayBuffer());
      wavCache.set(url, buf);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(masterGain);
    src.start();
    return true;
  } catch {
    return false; // fallback al sintetizado
  }
}

/** Ejecuta una acción con WAV real si existe; si no, el fallback. */
async function sfxAction(action: string, fallback: () => void): Promise<void> {
  const played = await playSfxAsset(action);
  if (!played) fallback();
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
  cursor: () => sfxAction('cursor', () => beep(880, 0.06, 'square', 0.15)),
  confirm: () => sfxAction('confirm', () => { beep(660, 0.08, 'square', 0.2); setTimeout(() => beep(990, 0.1, 'square', 0.2), 80); }),
  cancel: () => sfxAction('cancel', () => beep(440, 0.1, 'square', 0.15, 220)),
  select: () => sfxAction('select', () => beep(1320, 0.07, 'square', 0.18)),
  cardPlay: () => sfxAction('cardPlay', () => { beep(520, 0.08, 'square', 0.2); setTimeout(() => beep(780, 0.12, 'square', 0.2), 90); }),
  // Robo de carta: fricción de mazo (ruido corto) + tono agudo de carta al aterrizar
  draw: () => sfxAction('draw', () => { noise(0.1, 0.35, 3000); setTimeout(() => beep(1560, 0.09, 'square', 0.2), 120); }),
  punch: () => sfxAction('punch', () => noise(0.12, 0.4, 800)),
  kick: () => sfxAction('kick', () => noise(0.15, 0.35, 600)),
  beam: () => sfxAction('beam', () => { beep(200, 0.4, 'sawtooth', 0.25, 1200); noise(0.3, 0.2, 2000); }),
  beamCharge: () => sfxAction('beamCharge', () => beep(300, 0.5, 'sawtooth', 0.2, 900)),
  explosion: () => sfxAction('explosion', () => { noise(0.4, 0.5, 400); beep(100, 0.3, 'triangle', 0.3, 50); }),
  hit: () => sfxAction('hit', () => { noise(0.1, 0.45, 1200); beep(200, 0.08, 'square', 0.25, 100); }),
  guard: () => sfxAction('guard', () => beep(700, 0.12, 'square', 0.2, 350)),
  dodge: () => sfxAction('dodge', () => beep(1200, 0.1, 'sine', 0.2, 600)),
  powerUp: () => sfxAction('powerUp', () => { beep(400, 0.15, 'square', 0.2, 800); setTimeout(() => beep(800, 0.2, 'square', 0.2, 1600), 150); }),
  victory: () => sfxAction('victory', () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => beep(n, 0.15, 'square', 0.22), i * 130));
  }),
  defeat: () => sfxAction('defeat', () => {
    const notes = [392, 330, 262, 196];
    notes.forEach((n, i) => setTimeout(() => beep(n, 0.2, 'triangle', 0.22), i * 150));
  }),
  transform: () => sfxAction('transform', () => {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => beep(200 + i * 150, 0.08, 'sawtooth', 0.2, 400 + i * 200), i * 70);
    }
  }),
  position: () => sfxAction('position', () => beep(660, 0.06, 'square', 0.15)),
  // Cambio de turno: campanilla corta de dos tonos (inicio de round)
  turnChange: () => sfxAction('turnChange', () => { beep(880, 0.07, 'square', 0.18); setTimeout(() => beep(1175, 0.09, 'square', 0.18), 90); }),
  // Feedback QTE A/B: acierto = blip agudo corto · fallo = buzz grave
  qteCorrect: () => sfxAction('qteCorrect', () => beep(1560, 0.06, 'square', 0.2)),
  qteFail: () => sfxAction('qteFail', () => { beep(220, 0.16, 'square', 0.22, 110); noise(0.08, 0.2, 600); }),
  // Estrella HUD (Gather FULL POWER): chispa ascendente
  star: () => sfxAction('star', () => { beep(1760, 0.05, 'square', 0.18); setTimeout(() => beep(2200, 0.07, 'square', 0.16), 60); }),
  // Movimiento defensivo (MOVE): whoosh de dash + paso
  move: () => sfxAction('move', () => { noise(0.14, 0.25, 2200); setTimeout(() => beep(500, 0.1, 'square', 0.16, 750), 40); }),
};
