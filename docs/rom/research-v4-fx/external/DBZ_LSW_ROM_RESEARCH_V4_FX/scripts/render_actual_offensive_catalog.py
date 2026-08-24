from pathlib import Path
import csv,json,sys
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).parent))
from render_fx_resource import render
D=Path('/mnt/data/DBZ_LSW_ROM_RESEARCH_V4_FX/data'); OUT=Path('/mnt/data/DBZ_LSW_ROM_RESEARCH_V4_FX/samples')
execrows=list(csv.DictReader(open(D/'offensive_fx_execution_v4.csv',encoding='utf-8')))
# one representative card per FX; prefer lowest card ID
by={}
for r in execrows:
 fx=int(r['fxResource'],16)
 if fx not in by or int(r['cardId'])<int(by[fx]['cardId']):by[fx]=r
items=[]
for fx,r in sorted(by.items()):
 pal=int(r['palette'],16); op=int(r['prefixOperand'],16)
 a,_=render(fx,pal,1,op,1,True);z,_=render(fx,pal,1,10,1,True)
 for im,name in [(a,'PREFIX'),(z,'RESULT')]:
  bb=im.getbbox();im=im.crop(bb) if bb else im
  items.append((fx,pal,op,r['name'],name,im))
cols=4;cw=360;ch=128;rows=(len(items)+cols-1)//cols
s=Image.new('RGBA',(cols*cw,rows*ch),(22,22,22,255));d=ImageDraw.Draw(s)
for i,(fx,pal,op,name,phase,im) in enumerate(items):
 x=(i%cols)*cw;y=(i//cols)*ch
 label=f'FX {fx:02X} PAL {pal:02X} {phase} op={op if phase=="PREFIX" else 10:02X} | {name}'
 d.text((x+4,y+4),label,fill='white')
 sc=max(1,min(3,344//max(1,im.width),90//max(1,im.height)))
 rim=im.resize((im.width*sc,im.height*sc),Image.Resampling.NEAREST)
 s.alpha_composite(rim,(x+8,y+30))
s.save(OUT/'fx_catalog_actual_offensive_prefix_result.png')
print('resources',len(by))
