#!/usr/bin/env python3
"""M8.F0 — extract-clip: extrae UN clip de evidencia desde una fuente.

Flujo forense:
  LONGPLAY → CLIP DE EVIDENCIA → FRAMES → OBSERVATION JSON → GbcCinematicSequence

Dos modos:
  A) online:  yt-dlp descarga la sección desde YouTube (requiere cookies/
              PO token; puede dar 403 en datacenters — usa el navegador real).
  B) local:   recorta de un archivo de vídeo ya descargado (recomendado:
              descarga el longplay con TU navegador → pásalo con --video).

Uso:
  python3 tools/gbc-cinematic/extract-clip.py <source_id> <clip_id> <t_start> <t_end> [--video /path/al.mp4]

Ejemplos:
  # online (puede fallar por 403)
  python3 tools/gbc-cinematic/extract-clip.py gbc_longplay_xbuster6 exchange_001 01:23:41.300 01:23:45.700

  # local (recomendado)
  python3 tools/gbc-cinematic/extract-clip.py gbc_longplay_xbuster6 exchange_001 01:23:41.300 01:23:45.700 --video /tmp/dbzlsw_longplay.mp4

Salida:
  clips/<clip_id>.mp4      — clip recortado (copy, sin re-encode)
  clips/<clip_id>.json     — metadatos de trazabilidad (source/timestamps)
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SOURCES = json.load(open(os.path.join(ROOT, 'sources.json')))['sources']
CLIPS = os.path.join(ROOT, 'clips')
os.makedirs(CLIPS, exist_ok=True)

def parse_hms(s: str) -> float:
    p = s.split(':')
    if len(p) == 3: return int(p[0]) * 3600 + int(p[1]) * 60 + float(p[2])
    if len(p) == 2: return int(p[0]) * 60 + float(p[1])
    return float(p[0])

def main():
    if len(sys.argv) < 5:
        print(__doc__); sys.exit(1)
    source_id, clip_id, t_start, t_end = sys.argv[1:5]
    local_video = None
    if '--video' in sys.argv:
        local_video = sys.argv[sys.argv.index('--video') + 1]

    src = SOURCES.get(source_id)
    if not src:
        print(f'❌ fuente desconocida: {source_id} (revisa sources.json)'); sys.exit(1)

    out_mp4 = os.path.join(CLIPS, f'{clip_id}.mp4')

    # ── Modo LOCAL: recorte directo del archivo (copy, exacto) ──
    if local_video:
        if not os.path.exists(local_video):
            print(f'❌ vídeo local no existe: {local_video}'); sys.exit(1)
        print(f'→ recortando {t_start}–{t_end} de {local_video}…')
        r = subprocess.run([
            'ffmpeg', '-y', '-ss', t_start, '-to', t_end, '-i', local_video,
            '-c', 'copy', '-movflags', '+faststart', out_mp4,
        ], capture_output=True, text=True)
        if r.returncode != 0:
            print('❌ ffmpeg falló:', r.stderr[-1500:]); sys.exit(1)

    # ── Modo ONLINE: yt-dlp con cookies del navegador + sección ──
    else:
        print(f'→ descargando sección {t_start}–{t_end} de {source_id}…')
        command = ['python3', '-m', 'yt_dlp', '--js-runtimes', 'node']
        cookies_browser = os.environ.get('DBZ_LSW_YTDLP_COOKIES_FROM_BROWSER')
        if cookies_browser:
            command.extend(['--cookies-from-browser', cookies_browser])
        command.extend([
            '-f', '18', '--no-playlist',
            '--download-sections', f'*{t_start}-{t_end}',
            '-o', os.path.join(CLIPS, f'{clip_id}.%(ext)s'),
            src['url'],
        ])
        r = subprocess.run(command, capture_output=True, text=True)
        if r.returncode != 0:
            print('❌ yt-dlp falló:', r.stderr[-2000:])
            print('   → usa --video /ruta/al.mp4 con el longplay descargado desde tu navegador')
            sys.exit(1)
        # normalizar extensión si no es .mp4
        tmp = [f for f in os.listdir(CLIPS) if f.startswith(clip_id) and not f.endswith('.json')]
        if tmp and not os.path.exists(out_mp4):
            raw = os.path.join(CLIPS, tmp[0])
            r2 = subprocess.run(['ffmpeg', '-y', '-i', raw, '-c', 'copy', out_mp4],
                                capture_output=True, text=True)
            if r2.returncode != 0:
                print('❌ remux falló:', r2.stderr[-1000:]); sys.exit(1)
            os.remove(raw)

    # ── Metadatos de trazabilidad ──
    meta = {
        'clip_id': clip_id,
        'source_id': source_id,
        'source_url': src['url'],
        'source_kind': src['kind'],
        'timestamp_start': t_start,
        'timestamp_end': t_end,
        'local_video': local_video,
        'duration_s': round(parse_hms(t_end) - parse_hms(t_start), 3),
        'extracted_at': __import__('datetime').datetime.now().isoformat(timespec='seconds'),
        'tracability': f"{src['url']}#t={t_start},{t_end}",
    }
    json.dump(meta, open(os.path.join(CLIPS, f'{clip_id}.json'), 'w'), indent=1)
    print(f'✓ clip {clip_id}: {t_start} → {t_end} ({src["url"]})')
    print(f'  → {os.path.relpath(out_mp4, ROOT)}')

if __name__ == '__main__':
    main()
