// ═══════════════════════════════════════════════════════════
// DBZ LSW — Motor de música (BSO original del juego)
// Fuente: rip Zophar's Domain "Dragon Ball Z - Legendary Super
// Warriors (MP3)" → 20 pistas identificadas por huella espectral
// contra la tracklist de khinsider (ver docs/AUDIO_BSO.md).
// Recodificadas a MP3 mono 22.05kHz 64kbps (chiptune GBC: sin
// pérdida perceptible; 113MB → 21.5MB).
// ═══════════════════════════════════════════════════════════

export type MusicTrackId =
  | 'title'
  | 'prologue'
  | 'menu'
  | 'battle'
  | 'epic_battle'
  | 'game_over'
  | 'victory'
  | 'peace'
  | 'friendship'
  | 'legendary'
  | 'exploration'
  | 'mystery'
  | 'conflict'
  | 'solemn_moment'
  | 'awakening'
  | 'fighting_spirit'
  | 'credits'
  | 'jingle_story_card'
  | 'jingle_battle_card'
  | 'jingle_extra';

export interface MusicTrack {
  id: MusicTrackId;
  file: string;
  label: string;
  category: 'bgm' | 'jingle';
  /** Loop: BGM sí, jingles no. */
  loop: boolean;
}

export const MUSIC_TRACKS: Record<MusicTrackId, MusicTrack> = {
  title:            { id: 'title',            file: 'audio/music/title.mp3',            label: 'Title',              category: 'bgm',    loop: true },
  prologue:         { id: 'prologue',         file: 'audio/music/prologue.mp3',         label: 'Prologue',           category: 'bgm',    loop: true },
  menu:             { id: 'menu',             file: 'audio/music/menu.mp3',             label: 'Menu',               category: 'bgm',    loop: true },
  battle:           { id: 'battle',           file: 'audio/music/battle.mp3',           label: 'Battle Theme',       category: 'bgm',    loop: true },
  epic_battle:      { id: 'epic_battle',      file: 'audio/music/epic_battle.mp3',      label: 'Epic Battle Theme',  category: 'bgm',    loop: true },
  game_over:        { id: 'game_over',        file: 'audio/music/game_over.mp3',        label: 'Game Over',          category: 'bgm',    loop: true },
  victory:          { id: 'victory',          file: 'audio/music/jingle_victory.mp3',   label: 'Victory (jingle)',   category: 'jingle', loop: false },
  peace:            { id: 'peace',            file: 'audio/music/peace.mp3',            label: 'Peace',              category: 'bgm',    loop: true },
  friendship:       { id: 'friendship',       file: 'audio/music/friendship.mp3',       label: 'Friendship',         category: 'bgm',    loop: true },
  legendary:        { id: 'legendary',        file: 'audio/music/legendary.mp3',        label: 'Legendary',          category: 'bgm',    loop: true },
  exploration:      { id: 'exploration',      file: 'audio/music/exploration.mp3',      label: 'Exploration',        category: 'bgm',    loop: true },
  mystery:          { id: 'mystery',          file: 'audio/music/mystery.mp3',          label: 'Mystery',            category: 'bgm',    loop: true },
  conflict:         { id: 'conflict',         file: 'audio/music/conflict.mp3',         label: 'Conflict',           category: 'bgm',    loop: true },
  solemn_moment:    { id: 'solemn_moment',    file: 'audio/music/solemn_moment.mp3',    label: 'Solemn Moment',      category: 'bgm',    loop: true },
  awakening:        { id: 'awakening',        file: 'audio/music/awakening.mp3',        label: 'Awakening',          category: 'bgm',    loop: true },
  fighting_spirit:  { id: 'fighting_spirit',  file: 'audio/music/fighting_spirit.mp3',  label: 'Fighting Spirit',    category: 'bgm',    loop: true },
  credits:          { id: 'credits',          file: 'audio/music/credits.mp3',          label: 'Credits',            category: 'bgm',    loop: true },
  jingle_story_card:{ id: 'jingle_story_card',file: 'audio/music/jingle_story_card.mp3',label: 'Story Card (jingle)',category: 'jingle', loop: false },
  jingle_battle_card:{ id: 'jingle_battle_card', file: 'audio/music/jingle_battle_card.mp3', label: 'Battle Card (jingle)', category: 'jingle', loop: false },
  jingle_extra:     { id: 'jingle_extra',     file: 'audio/music/jingle_extra.mp3',     label: 'Jingle extra',       category: 'jingle', loop: false },
};

export const MUSIC_TRACK_LIST: MusicTrack[] = Object.values(MUSIC_TRACKS);

/** Mapeo pantalla → pista (fuente ÚNICA — musicForScreen y el Dev Studio
 *  lo visualizan; nunca tablas paralelas). */
export const SCREEN_MUSIC: Record<string, MusicTrackId> = {
  main: 'title',
  story: 'prologue',
  storyScene: 'prologue',
  battle: 'battle',
  versus: 'battle',
  deck: 'menu',
  cards: 'menu',
  characters: 'menu',
  settings: 'menu',
};

/** Pista por pantalla del juego (mapeo de contexto — registry único). */
export function musicForScreen(screen: string): MusicTrackId {
  return SCREEN_MUSIC[screen] ?? 'menu';
}

// ── Estado interno ──────────────────────────────────────────

let audio: HTMLAudioElement | null = null;
let currentId: MusicTrackId | null = null;
let musicEnabled = true;
let musicVolume = 0.5; // la música va por debajo de los SFX
let fadeTimer: ReturnType<typeof setTimeout> | null = null;

function ensureAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.volume = musicVolume;
  }
  return audio;
}

export function setMusicEnabled(v: boolean) {
  musicEnabled = v;
  try { localStorage.setItem('dbzlsw.music', v ? 'on' : 'off'); } catch { /* noop */ }
  if (!v) {
    if (audio) { audio.pause(); }
    currentId = null;
  }
}
export function isMusicEnabled() { return musicEnabled; }

export function setMusicVolume(v: number) {
  musicVolume = Math.min(1, Math.max(0, v));
  try { localStorage.setItem('dbzlsw.volume', String(Math.round(musicVolume * 100))); } catch { /* noop */ }
  if (audio) audio.volume = musicVolume;
}
export function getMusicVolume() { return musicVolume; }

export function currentMusic(): MusicTrackId | null { return currentId; }

/**
 * Reproduce una pista (con fade-out/fade-in de 300ms si hay cambio).
 * Los jingles suenan una vez; los BGM hacen loop.
 */
export function playMusic(id: MusicTrackId, opts?: { force?: boolean }): void {
  if (!musicEnabled) return;
  if (currentId === id && !opts?.force && audio && !audio.paused) return;
  const track = MUSIC_TRACKS[id];
  const el = ensureAudio();
  if (!el) return;

  const start = () => {
    el.src = track.file;
    el.loop = track.loop;
    el.volume = 0;
    el.play().catch(() => { /* autoplay bloqueado: se reintenta en la próxima interacción */ });
    // fade-in
    const t0 = performance.now();
    const dur = 300;
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / dur);
      if (audio) audio.volume = musicVolume * t;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    currentId = id;
  };

  if (audio && !audio.paused && currentId !== id) {
    // fade-out del actual, luego cambio
    const t0 = performance.now();
    const dur = 250;
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / dur);
      if (audio) audio.volume = musicVolume * (1 - t);
      if (t < 1) requestAnimationFrame(step);
      else start();
    };
    requestAnimationFrame(step);
  } else {
    start();
  }
}

export function stopMusic(): void {
  if (fadeTimer) clearTimeout(fadeTimer);
  if (audio) { audio.pause(); audio.src = ''; }
  currentId = null;
}

/**
 * Jingle de una sola reproducción que DEVUELVE a la pista de fondo al
 * terminar (p.ej. Story Card sobre el Prologue de las viñetas).
 */
export function playMusicOnce(id: MusicTrackId, returnTo?: MusicTrackId): void {
  if (!musicEnabled) return;
  const track = MUSIC_TRACKS[id];
  const el = ensureAudio();
  if (!el) return;
  const was = currentId;
  const start = () => {
    el.src = track.file;
    el.loop = false;
    el.volume = musicVolume;
    el.play().catch(() => { /* autoplay */ });
    currentId = id;
    el.onended = () => {
      if (returnTo && returnTo !== id) playMusic(returnTo);
    };
  };
  if (audio && !audio.paused && currentId !== id) start();
  else start();
  void was;
}
