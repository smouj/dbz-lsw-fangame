from pathlib import Path
import csv,json,sys
from PIL import Image,ImageChops
sys.path.insert(0,str(Path(__file__).parent))
from render_fx_resource import render
D=Path('/mnt/data/DBZ_LSW_ROM_RESEARCH_V4_FX/data')
fxs=json.load(open(D/'fx_resources_exact_v4.json'))
rows=[]
for r in fxs:
    b,l=r['bank'],r['localIndex']; normal=(l>=2 and (l-2)%3==0) if b==0x65 else (l%3==0)
    kind='NORMAL_OFFENSIVE_BUNDLE' if normal else 'GENERIC_OR_CATEGORY_SPECIFIC_TOKEN'
    if not normal:
        rows.append({'fxResource':r['fxHex'],'kind':kind,'prefixRelation':'N/A','mapDeltaX':'','mirrorPrefix':'','mirrorResult':'','mirrorResultDiffPixels':'','tileCount':r['graphicsTileCount']})
        continue
    p=r['paletteIds'][0]
    ims={}
    for side in (1,2):
        for op,name in ((0,'prefix'),(10,'result')):
            im,_=render(r['fxResource'],p,side,op,1,True);ims[(side,name)]=im
    a=ims[(1,'prefix')];z=ims[(1,'result')]
    ba=a.getbbox();bz=z.getbbox();ca=a.crop(ba);cz=z.crop(bz)
    same=ca.size==cz.size and ca.tobytes()==cz.tobytes()
    dx=(bz[0]-ba[0]) if same else None
    mirrors=[];diffs=[]
    for name in ('prefix','result'):
        s1=ims[(1,name)].crop(ims[(1,name)].getbbox());s2=ims[(2,name)].crop(ims[(2,name)].getbbox())
        hf=s1.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        exact=hf.size==s2.size and hf.tobytes()==s2.tobytes();mirrors.append(exact)
        if hf.size==s2.size:
            d=ImageChops.difference(hf,s2)
            # number of pixels with any channel difference
            diff=sum(1 for px in d.getdata() if any(px))
        else: diff=-1
        diffs.append(diff)
    rows.append({
      'fxResource':r['fxHex'],'kind':kind,'prefixRelation':'PURE_MAP_TRANSLATION' if same else 'DISTINCT_RESULT_GRAPHIC',
      'mapDeltaX':dx if dx is not None else '', 'mirrorPrefix':mirrors[0], 'mirrorResult':mirrors[1], 'mirrorResultDiffPixels':diffs[1],
      'tileCount':r['graphicsTileCount'], 'prefixBBox':str(ba), 'resultBBox':str(bz), 'firstPalette':f'0x{p:02X}'
    })
(D/'fx_bundle_geometry_v4.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
with (D/'fx_bundle_geometry_v4.csv').open('w',newline='',encoding='utf-8') as f:
    cols=sorted({k for r in rows for k in r});w=csv.DictWriter(f,fieldnames=cols);w.writeheader();w.writerows(rows)
print('normal bundles',sum(r['kind']=='NORMAL_OFFENSIVE_BUNDLE' for r in rows))
print('pure translation',sum(r.get('prefixRelation')=='PURE_MAP_TRANSLATION' for r in rows))
print('distinct result graphic',sum(r.get('prefixRelation')=='DISTINCT_RESULT_GRAPHIC' for r in rows))
print('mirror anomalies',[(r['fxResource'],r['mirrorPrefix'],r['mirrorResult'],r['mirrorResultDiffPixels']) for r in rows if r.get('kind')=='NORMAL_OFFENSIVE_BUNDLE' and (not r['mirrorPrefix'] or not r['mirrorResult'])])
