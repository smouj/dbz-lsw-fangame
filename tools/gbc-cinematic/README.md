# tools/gbc-cinematic — Harness forense M8.F0

Herramienta reproducible de extracción de evidencia cinematográfica del GBC.

```
tools/gbc-cinematic/
├── sources.json          ← 6 fuentes (longplay + 5 showcases) con trazabilidad
├── extract-clip.py       ← clip de evidencia desde una fuente (sección temporal)
├── extract-frames.py     ← frames del clip (numeración = frame de vídeo)
├── frame-index.py        ← muestreo del longplay para localizar batallas
├── observations/         ← observations JSON (respuestas a F0.1 con evidencia)
├── clips/                ← clips recortados (gitignored)
└── frames/               ← frames + índices (gitignored)
```

## Flujo forense (NUNCA "mirar a ojo → escribir canon")

```
LONGPLAY (sources.json)
   ↓ extract-clip.py
CLIP DE EVIDENCIA (clips/<id>.mp4 + <id>.json)
   ↓ extract-frames.py
FRAMES (frames/<clip>/frame_%06d.png + index.json)
   ↓ observación humana/IA
OBSERVATION JSON (observations/obs_XXX.json — responde F0.1 con evidencia)
   ↓
GbcCinematicSequence (src/battle/cinematic/GbcCinematicCanon.ts)
```

## Uso

```bash
# 1. Localizar batallas en el longplay (muestreo 1 frame / 90s)
python3 tools/gbc-cinematic/frame-index.py gbc_longplay_xbuster6 --interval 90

# 2. Extraer un clip de evidencia (ej: intercambio melee→guard)
python3 tools/gbc-cinematic/extract-clip.py \
  gbc_longplay_xbuster6 exchange_melee_guard_001 01:23:41.300 01:23:45.700

# 3. Extraer frames del clip (30fps → frame_000000.png …)
python3 tools/gbc-cinematic/extract-frames.py exchange_melee_guard_001 --fps 30

# 4. Rellenar observations/obs_XXX.json (copia de _template.json)
```

## Dos numeraciones (contrato F0)

| Campo | Significado |
|---|---|
| `sourceFrame` | nº de frame del VÍDEO (0-based) |
| `sourceTimestampMs` | ms absolutos dentro del clip |
| `gbcTickOffset` | tick lógico reconstruido del GBC (~59.7275 fps) |

`index.json` de cada clip mapea los tres. Nunca borrar la referencia original.

## Reglas

- Cada clip guarda `<id>.json` con URL + timestamps → trazabilidad completa.
- Las observaciones registran lo OBSERVABLE (background/visibilidad/focus/
  transition) — no los nombres de nuestra abstracción (DEFENDER_ACTION, etc.).
- Fidelidad: solo FRAME_VERIFIED/VIDEO_VERIFIED pueden llamarse CANON.
- `clips/` y `frames/` no se versionan (grandes); observations/ y sources.json sí.

## Primer corpus (F0-A)

Antes de tocar `GBC_CINEMATIC_CANON`:
- 3 × intercambio completo (melee→Guard, melee/beam→Move, acción→carta defensiva)
- 3 × melee HIT · 2 × melee MISS · 2 × Guard · 2 × Move · 2 × Beam
- 1 × Gather · 2 × Stage completos · 1 × Stage failure/counter · 1 × KO

Después: V9 identifica cada pose (fingerprint → canonicalId/family/role/
variant/sequenceIndex) y solo entonces `GBC_CINEMATIC_CANON` deja de estar vacío.

## ⚠ Bloqueo de descarga detectado (2026-08-19)

En este entorno (WSL, IP de datacenter, navegador headless):
- `yt-dlp` da **HTTP 403** en TODOS los formatos de vídeo (falta GVS PO token;
  la metadata sí funciona con cookies del navegador).
- El navegador headless **no reproduce** YouTube (autoplay policy bloquea
  play() programático; los eventos sintéticos no cuentan como gesto real).

**Solución práctica**: descarga el vídeo desde TU navegador real (donde la
sesión sí descarga) y pasa el archivo al harness:

```bash
# 1. En tu navegador: abre el longplay y descárgalo (o usa un descargador
#    con tu sesión). Guarda el .mp4, p.ej. en:
#    ~/.openclaw/workspace/dbz-lsw-fangame/tools/gbc-cinematic/videos/gbc_longplay_xbuster6.mp4

# 2. Extraer clips desde el archivo local:
python3 tools/gbc-cinematic/extract-clip.py \
  gbc_longplay_xbuster6 exchange_melee_guard_001 01:23:41.300 01:23:45.700 \
  --video tools/gbc-cinematic/videos/gbc_longplay_xbuster6.mp4

# 3. Frames del clip:
python3 tools/gbc-cinematic/extract-frames.py exchange_melee_guard_001 --fps 30
```

Los showcases (247-300s) son la vía rápida para beams/limits: descarga
`special_showcase_01..05` y recorta con el mismo flujo.

## Estado F0-A (2026-08-19) — PRIMERAS SECUENCIAS VIDEO_VERIFIED

Vídeos locales importados (carpeta videos/):
- gbc_longplay_xbuster6.mp4 (6:23:10) · special_showcase_01..05.mp4

Observaciones registradas (observations/):
- obs_001_vball_crash.json — V-ball Crash (Gotenks SSJ): esfera azul en
  manos del atacante · impacto = líneas de energía · mismo fondo todo el rato
- obs_002_purple_comet.json — Purple Comet (Jeice): transición BLANCO
  TOTAL → atacante SOLO → defensor aparece al viajar → defensor SOLO en
  guardia ('Squared off')
- obs_003_dunk_shot.json — Dunk Shot (Gohan SSJ): atacante sube VERTICAL →
  proyectil pequeño → impacto CAMBIA el fondo (plano de impacto)

Secuencias en GBC_CINEMATIC_CANON (src/battle/cinematic/):
- special_vball_crash_01 · special_purple_comet_01 · special_dunk_shot_01
  (las 3 VIDEO_VERIFIED con trazabilidad clip+timestamps)

GRAMÁTICA GBC OBSERVADA (contradice la plantilla INFERRED actual):
- transición = BLANCO total (flash_white) o corte, NO fade negro
- atacante SOLO primero · defensor aparece cuando el ataque viaja
- caja inferior: "X's Attack / [nombre]" → "Y's Guard / Squared off"
- el proyectil viaja en el MISMO plano (sin cambio de fondo hasta impacto)
- Dunk Shot: el impacto cambia el fondo

Próximo: continuar showcases 3-5 (beams ray/ball), luego longplay para el
exchange completo (ataque→retorno→defensa→contraataque).
