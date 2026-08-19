#!/usr/bin/env python3
"""M8.F0 — extract-frames: extrae frames de un clip de evidencia.

Uso:
  python3 tools/gbc-cinematic/extract-frames.py <clip_id> [--fps 30]

Salida:
  frames/<clip_id>/frame_000000.png … frame_NNNNNN.png   (numeración = frame de vídeo)
  frames/<clip_id>/index.json   — tabla frame → timestamp(ms) → gbcTickOffset

Dos numeraciones (contrato F0):
  sourceFrame       = nº de frame del vídeo (0-based)
  sourceTimestampMs = ms absolutos DENTRO del clip
  gbcTickOffset     = tick lógico reconstruido del GBC (reloj ~59.7275 fps)
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
CLIPS = os.path.join(ROOT, 'clips')
FRAMES = os.path.join(ROOT, 'frames')

GBC_FPS = 59.7275  # reloj nativo del proyecto (M6)

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    clip_id = sys.argv[1]
    fps = 30
    if '--fps' in sys.argv:
        fps = int(sys.argv[sys.argv.index('--fps') + 1])

    clip = os.path.join(CLIPS, f'{clip_id}.mp4')
    if not os.path.exists(clip):
        print(f'❌ clip no encontrado: {clip} (ejecuta extract-clip.py primero)')
        sys.exit(1)

    out_dir = os.path.join(FRAMES, clip_id)
    os.makedirs(out_dir, exist_ok=True)

    # 1) duración real del clip (para la tabla)
    probe = subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
                            '-of', 'json', clip], capture_output=True, text=True)
    dur_s = float(json.loads(probe.stdout)['format']['duration'])

    # 2) frames: nombre = número de frame de vídeo (0-based) → trazable
    pattern = os.path.join(out_dir, 'frame_%06d.png')
    r = subprocess.run([
        'ffmpeg', '-y', '-i', clip, '-vf', f'fps={fps}', '-frame_pts', '1',
        pattern,
    ], capture_output=True, text=True)
    if r.returncode != 0:
        print('❌ ffmpeg falló:', r.stderr[-1500:])
        sys.exit(1)

    # 3) tabla frame → timestamp → gbcTick
    n = len([f for f in os.listdir(out_dir) if f.endswith('.png')])
    index = []
    for i in range(n):
        ts_ms = round(i * 1000 / fps)
        gbc_tick = round(i / fps * GBC_FPS)
        index.append({
            'sourceFrame': i,
            'sourceTimestampMs': ts_ms,
            'gbcTickOffset': gbc_tick,
        })
    json.dump({
        'clip_id': clip_id,
        'fps_extracted': fps,
        'frames_total': n,
        'clip_duration_s': round(dur_s, 3),
        'gbc_fps': GBC_FPS,
        'frames': index,
    }, open(os.path.join(out_dir, 'index.json'), 'w'), indent=1)
    print(f'✓ {n} frames de {clip_id} @ {fps}fps → frames/{clip_id}/')
    print(f'  index.json: sourceFrame → sourceTimestampMs → gbcTickOffset')

if __name__ == '__main__':
    main()
