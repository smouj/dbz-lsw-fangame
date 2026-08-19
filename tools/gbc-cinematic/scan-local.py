#!/usr/bin/env python3
"""Escanea un vídeo local y detecta cambios de plano (diff entre frames).

Uso: python3 scan-local.py <video> [--interval N] [--height H] [--start S] [--end E]
Salida: tabla t(s) → diff + stats de color (para localizar ataques/transiciones).
"""
import subprocess, sys, json, os

def grab(video, t, height=90):
    """Extrae un frame en t y devuelve (w,h,data RGBA promediado 128x72)."""
    w = 128
    out = subprocess.run([
        'ffmpeg', '-v', 'quiet', '-ss', str(t), '-i', video,
        '-frames:v', '1', '-vf', f'scale={w}:{height}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'
    ], capture_output=True).stdout
    if len(out) < w*height*3: return None
    return out

def diff(a, b):
    n = min(len(a), len(b))
    d = 0
    for i in range(0, n, 3):
        d += abs(a[i]-b[i]) + abs(a[i+1]-b[i+1]) + abs(a[i+2]-b[i+2])
    return d / (n//3)

def stats(d):
    n = len(d)//3
    r=g=b=sat=0
    for i in range(0, len(d), 3):
        r+=d[i]; g+=d[i+1]; b+=d[i+2]
        mx=max(d[i],d[i+1],d[i+2]); mn=min(d[i],d[i+1],d[i+2]); sat+=mx-mn
    return {'r': round(r/n), 'g': round(g/n), 'b': round(b/n), 'sat': round(sat/n)}

def main():
    video = sys.argv[1]
    interval = int(sys.argv[sys.argv.index('--interval')+1]) if '--interval' in sys.argv else 5
    start = int(sys.argv[sys.argv.index('--start')+1]) if '--start' in sys.argv else 0
    end = int(sys.argv[sys.argv.index('--end')+1]) if '--end' in sys.argv else 10**9
    probe = subprocess.run(['ffprobe','-v','quiet','-show_entries','format=duration','-of','json',video], capture_output=True, text=True)
    dur = int(float(json.loads(probe.stdout)['format']['duration']))
    end = min(end, dur)
    prev = None
    rows = []
    for t in range(start, end, interval):
        cur = grab(video, t)
        if cur is None: continue
        s = stats(cur)
        d = 0 if prev is None else diff(prev, cur)
        rows.append({'t': t, 'diff': round(d), **s})
        prev = cur
    for r in rows:
        flag = '◉' if r['diff'] > 30 else ('○' if r['diff'] > 15 else ' ')
        print(f"{flag} t={r['t']:>5}s diff={r['diff']:>3} rgb=({r['r']},{r['g']},{r['b']}) sat={r['sat']}")

if __name__ == '__main__':
    main()
