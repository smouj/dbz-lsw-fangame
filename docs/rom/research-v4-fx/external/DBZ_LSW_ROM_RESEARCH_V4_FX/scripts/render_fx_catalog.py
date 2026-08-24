from pathlib import Path
import json, sys
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).parent))
from render_fx_resource import render
DATA=Path('/mnt/data/DBZ_LSW_ROM_RESEARCH_V4_FX/data')
OUT=Path('/mnt/data/DBZ_LSW_ROM_RESEARCH_V4_FX/samples/catalog');OUT.mkdir(parents=True,exist_ok=True)
fxs=json.load(open(DATA/'fx_resources_exact_v4.json'))
items=[]
for r in fxs:
    b=r['bank'];l=r['localIndex']
    normal=(l>=2 and (l-2)%3==0) if b==0x65 else (l%3==0)
    if not normal: continue
    if not r['paletteIds']: continue
    p=r['paletteIds'][0]
    for op,label in [(0,'prefix'),(10,'result')]:
        try:
            im,meta=render(r['fxResource'],p,1,op,1,True)
        except Exception as e:
            print('ERR',r['fxHex'],e);continue
        # crop alpha bbox but preserve a bit
        bb=im.getbbox()
        if bb: im=im.crop(bb)
        path=OUT/f"fx{r['fxResource']:02X}_pal{p:02X}_{label}.png";im.save(path)
        items.append((r,op,label,p,im,path))
# sheet 4 columns. each cell 360x125
cols=4;cw=360;ch=125
rows=(len(items)+cols-1)//cols
sheet=Image.new('RGBA',(cols*cw,rows*ch),(24,24,24,255));d=ImageDraw.Draw(sheet)
for i,(r,op,label,p,im,path) in enumerate(items):
    x=(i%cols)*cw;y=(i//cols)*ch
    names=', '.join(c['name'] for c in r['cards'][:2])
    d.text((x+4,y+4),f"FX {r['fxHex']} pal {p:02X} {label} | {names}",fill='white')
    # fit nearest scaling max 344x88
    maxw,maxh=344,88
    sc=max(1,min(3,maxw//max(1,im.width),maxh//max(1,im.height)))
    rim=im.resize((im.width*sc,im.height*sc),Image.Resampling.NEAREST)
    sheet.alpha_composite(rim,(x+8,y+28))
sheet.save('/mnt/data/DBZ_LSW_ROM_RESEARCH_V4_FX/samples/fx_catalog_side1_prefix_result.png')
print('items',len(items),'resources',len(items)//2)
