#!/usr/bin/env python3
"""M8.F0 — frame-index: muestrea el longplay en intervalos para LOCALIZAR
intercambios de combate sin descargar 6 horas.

Uso:
  python3 tools/gbc-cinematic/frame-index.py <source_id> [--interval 90] [--height 144] [--limit 40]

Salida:
  frames/<source_id>/samples/frame_<HHMMSS>.jpg   (1 frame cada N segundos)
  frames/<source_id>/samples/index.json            (tabla sample → timestamp)

Sirve para construir el mapa del longplay (dónde hay batallas) y después
extraer clips precisos con extract-clip.py.
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SOURCES = json.load(open(os.path.join(ROOT, 'sources.json')))['sources']
FRAMES = os.path.join(ROOT, 'frames')

def hms_to_s(hms: str) -> float:
    p = hms.split(':')
    if len(p) == 3:
        return int(p[0]) * 3600 + int(p[1]) * 60 + float(p[2])
    if len(p) == 2:
        return int(p[0]) * 60 + float(p[1])
    return float(p[0])

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    source_id = sys.argv[1]
    interval = 90
    height = 144
    limit = 40
    if '--interval' in sys.argv:
        interval = int(sys.argv[sys.argv.index('--interval') + 1])
    if '--height' in sys.argv:
        height = int(sys.argv[sys.argv.index('--height') + 1])
    if '--limit' in sys.argv:
        limit = int(sys.argv[sys.argv.index('--limit') + 1])

    src = SOURCES.get(source_id)
    if not src:
        print(f'❌ fuente desconocida: {source_id}')
        sys.exit(1)

    out_dir = os.path.join(FRAMES, source_id, 'samples')
    os.makedirs(out_dir, exist_ok=True)

    # Descargar el vídeo a baja resolución (o usar cache si ya existe)
    vid = os.path.join(FRAMES, source_id, f'{source_id}_low.mp4')
    if not os.path.exists(vid):
        print(f'→ descargando {source_id} a baja resolución…')
        r = subprocess.run([
            'python3', '-m', 'yt_dlp', '--js-runtimes', 'node',
            '-f', '18',
            '-o', vid,
            src['url'],
        ], capture_output=True, text=True)
        if r.returncode != 0:
            print('❌ yt-dlp falló:', r.stderr[-2000:])
            sys.exit(1)

    # Muestreo: 1 frame cada `interval` s
    probe = subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
                            '-of', 'json', vid], capture_output=True, text=True)
    dur_s = float(json.loads(probe.stdout)['format']['duration'])
    step = max(1, int(interval))
    times = list(range(0, int(dur_s), step))[:limit]
    print(f'→ muestreando {len(times)} puntos (1/{interval}s) de {dur_s:.0f}s…')

    index = []
    for t in times:
        hh = t // 3600; mm = (t % 3600) // 60; ss = t % 60
        name = f'frame_{hh:02d}{mm:02d}{ss:02d}.jpg'
        out = os.path.join(out_dir, name)
        if not os.path.exists(out):
            r = subprocess.run([
                'ffmpeg', '-y', '-ss', str(t), '-i', vid,
                '-frames:v', '1', '-vf', f'scale=-2:{height}', '-q:v', '5', out,
            ], capture_output=True, text=True)
            if r.returncode != 0:
                print(f'  ⚠ frame {t}s falló')
                continue
        index.append({'sample': name, 'timestamp_s': t, 'hms': f'{hh:02d}:{mm:02d}:{ss:02d}'})

    json.dump({'source_id': source_id, 'interval_s': interval, 'samples': index},
              open(os.path.join(out_dir, 'index.json'), 'w'), indent=1)
    print(f'✓ {len(index)} muestras → frames/{source_id}/samples/')
    print('  Revisa las muestras para localizar batallas → después extract-clip.py')

if __name__ == '__main__':
    main()
