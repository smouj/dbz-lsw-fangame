from pathlib import Path
import csv,json,sys,hashlib
sys.path.insert(0,str(Path(__file__).parent))
from render_fx_resource import render
D=Path('/mnt/data/DBZ_LSW_ROM_RESEARCH_V4_FX/data')
ROOT=Path('/mnt/data/DBZ_LSW_ROM_RESEARCH_V4_FX/generated_fx_assets');ROOT.mkdir(parents=True,exist_ok=True)
rows=list(csv.DictReader(open(D/'offensive_fx_execution_v4.csv',encoding='utf-8')))
by={}
for r in rows:
 key=(int(r['fxResource'],16),int(r['palette'],16))
 by.setdefault(key,[]).append(r)
manifest=[]
for (fx,pal),users in sorted(by.items()):
 ops={int(u['prefixOperand'],16) for u in users}; assert len(ops)==1,(fx,pal,ops)
 preop=next(iter(ops)); folder=ROOT/f'fx_{fx:02X}'/f'palette_{pal:02X}';folder.mkdir(parents=True,exist_ok=True)
 rec={'fxResource':fx,'fxHex':f'0x{fx:02X}','palette':pal,'paletteHex':f'0x{pal:02X}','prefixOperand':preop,'prefixRows':[preop+1,preop+8],'resultOperand':10,'resultRows':[11,18],
      'cards':[{'cardId':int(u['cardId']),'name':u['name'],'category':u['category'],'handler':u['handler']} for u in users],'images':[]}
 for side in (1,2):
  for phase,op in [('prefix',preop),('result',10)]:
   im,meta=render(fx,pal,side,op,1,True)
   fn=f'side{side}_{phase}_map256x64.png';path=folder/fn;im.save(path)
   bb=im.getbbox();raw=path.read_bytes()
   rec['images'].append({'side':side,'phase':phase,'file':str(path.relative_to(ROOT)),'bbox':list(bb) if bb else None,'sha256':hashlib.sha256(raw).hexdigest(),'sourceRows':[op+1,op+8],'mapSize':[256,64]})
 manifest.append(rec)
(ROOT/'manifest.json').write_text(json.dumps({'sourceRomSha256':'8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee','assetSemantics':'BG_TILEMAP_WINDOW_RENDER_WITH_COLOR0_TRANSPARENT_FOR_REVIEW','pairs':manifest},indent=2),encoding='utf-8')
print('pairs',len(manifest),'pngs',sum(len(x['images']) for x in manifest))
