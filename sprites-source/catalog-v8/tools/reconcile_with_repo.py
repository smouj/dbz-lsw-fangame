#!/usr/bin/env python3
"""Materializa el mapeo exacto runtime->fuente V8 leyendo el repo real.
Uso: python tools/reconcile_with_repo.py /ruta/dbz-lsw-fangame /ruta/DBZ_LSW_SPRITES_CATALOGUED_V8_GH_349e548
No inventa etiquetas: el manifest del repo es la verdad semántica y el PNG canónico la verdad de píxeles.
"""
from pathlib import Path
from PIL import Image
import csv,json,hashlib,sys
repo=Path(sys.argv[1]); pkg=Path(sys.argv[2])
rows=list(csv.DictReader(open(pkg/'catalog/frame_catalog.csv',encoding='utf-8')))
by_runtime={}
for r in rows:
    if r['runtime_dir']: by_runtime.setdefault(r['runtime_dir'],[]).append(r)
def vis_sig(p):
    im=Image.open(p).convert('RGBA'); pts=[]
    for y in range(im.height):
      for x in range(im.width):
        q=im.getpixel((x,y))
        if q[3]: pts.append((x,y,q[0],q[1],q[2],q[3]))
    if not pts:return ()
    minx=min(x[0] for x in pts); miny=min(x[1] for x in pts)
    return tuple((x-minx,y-miny,r,g,b,a) for x,y,r,g,b,a in pts)
out=[]
for d,srcs in by_runtime.items():
    md=repo/'public/assets/sprites'/d/'manifest.json'
    if not md.exists(): continue
    man=json.loads(md.read_text())
    index={}
    for s in srcs:
      p=pkg/s['canonical_path']; index.setdefault(vis_sig(p),[]).append(s)
    for pose,spec in man.items():
      for pos,frame in enumerate(spec.get('frames',[])):
        rp=repo/'public/assets/sprites'/d/frame['file']
        sig=vis_sig(rp) if rp.exists() else None
        matches=index.get(sig,[]) if sig is not None else []
        out.append({'runtime_dir':d,'pose':pose,'sequence_index':pos,'runtime_file':frame['file'],
                    'canonical_matches':'|'.join(x['canonical_id'] for x in matches),
                    'match_count':len(matches),'status':'EXACT_VISIBLE_PIXEL_MATCH' if matches else 'FIXED_ONLY_OR_DERIVED'})
with open(pkg/'catalog/runtime_exact_mapping.csv','w',newline='',encoding='utf-8') as f:
  w=csv.DictWriter(f,fieldnames=list(out[0]));w.writeheader();w.writerows(out)
(pkg/'catalog/runtime_exact_mapping.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print('rows',len(out),'matched',sum(1 for r in out if r['match_count']))
