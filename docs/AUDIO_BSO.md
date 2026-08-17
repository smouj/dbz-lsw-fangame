# AUDIO BSO — Dragon Ball Z: Legendary Super Warriors

## Fuente

Rip **Zophar's Domain** — `Dragon Ball Z - Legendary Super Warriors (MP3).zophar.zip`
(20 pistas: 16 BGM + 4 jingles; el zip original pesa ~103MB).

Los MP3 del rip vienen con nombres genéricos (`BGM #01`, `Jingle #01`…). Para
identificarlas se cruzó la **tracklist oficial con nombres** del gamerip khinsider
(19 pistas: Title, Prologue, Menu, Fighting Spirit, Peace, Friendship, Legendary,
Exploration, Mystery, Conflict, Battle Theme, Epic Battle Theme, Game Over,
Solemn Moment, Awakening, Credits + jingles Story/Battle Card y Victory) y se
emparejaron por **huella espectral** (FFT promedio por segmentos, bins log de
40–5000Hz, correlación coseno).

## Mapeo (score de correlación)

| Zophar | Pista (canon) | Score |
|---|---|---|
| 01 BGM #01 | `prologue` (Prologue) | 0.894 |
| 02 BGM #02 | `credits` (Credits) | 0.980 |
| 03 BGM #03 | `title` (Title) | 0.914 |
| 04 Jingle #01 | `jingle_story_card` (Story Card) | 0.825 |
| 05 Jingle #02 | `jingle_victory` (Victory) | 0.592 |
| 06 BGM #04 | `game_over` (Game Over) | 0.906 |
| 07 Jingle #03 | `jingle_battle_card` (Battle Card) | 0.725 |
| 08 Jingle #04 | `jingle_extra` (sin mapeo firme) | 0.514 |
| 09 BGM #05 | `battle` (Battle Theme) | 0.863 |
| 10 BGM #06 | `epic_battle` (Epic Battle Theme) | 0.896 |
| 11 BGM #07 | `menu` (Menu) | 0.956 |
| 12 BGM #08 | `peace` (Peace) | 0.911 |
| 13 BGM #09 | `solemn_moment` (Solemn Moment) | 0.936 |
| 14 BGM #10 | `friendship` (Friendship) | 0.922 |
| 15 BGM #11 | `conflict` (Conflict) | 0.791 |
| 16 BGM #12 | `awakening` (Awakening) | 0.913 |
| 17 BGM #13 | `exploration` (Exploration) | 0.930 |
| 18 BGM #14 | `legendary` (Legendary) | 0.925 |
| 19 BGM #15 | `fighting_spirit` (Fighting Spirit) | 0.911 |
| 20 BGM #16 | `mystery` (Mystery) | 0.903 |

Nota: los jingles cortos (≤8s) tienen fingerprints más débiles; los tres con
duración exacta coincidente (Story Card 0:08 / Victory 0:03 / Battle Card 0:04)
están confirmados por duración + score. `jingle_extra` (0:05) queda sin mapeo
firme.

## Assets

`public/audio/music/*.mp3` — 20 pistas recodificadas a **MP3 mono 22.05kHz
64kbps** (la BSO es chiptune GBC: sin pérdida perceptible). Total: **21.5MB**
(original: 113MB).

## Integración

- `src/audio/music.ts` — motor (`playMusic`/`stopMusic`/`setMusicVolume`/
  `setMusicEnabled`), catálogo `MUSIC_TRACKS`, `musicForScreen(screen)`.
- `src/main.tsx` — hook global: la música sigue la pantalla (main→title,
  story→prologue, battle→battle, versus→battle, deck/cards/characters/settings
  →menu); fases win/lose → jingles victory/game_over; jefes (capítulo ≥15,
  sagas Android/Buu) → epic_battle. Primer gesto del usuario desbloquea el
  autoplay (pointerdown → initAudio + playMusic). Slider de BGM controla SFX y
  música; toggle Música (persistido en localStorage `dbzlsw.music`).
- Dev Studio → página **Música** (player de las 20 pistas + mapeo de contexto).
- Fix incluido: el slider de volumen de Settings tenía una recursión
  (`const setVolume` sombreaba al import de sfx) — resuelto con alias.

## Regeneración

Script de identificación (huella espectral) en `/tmp/lsw_rip/` del flujo de
trabajo (no versionado). Re-export: ffmpeg `-ac 1 -ar 22050 -b:a 64k` por pista.
