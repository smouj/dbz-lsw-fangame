from pathlib import Path
import csv,json
P=Path('/mnt/data/dbz_lsw_rom_taxonomy/card_animation_taxonomy_125.csv')
D=Path('/mnt/data/DBZ_LSW_ROM_RESEARCH_V4_FX/data')
geom={int(r['fxResource'],16):r for r in json.load(open(D/'fx_bundle_geometry_v4.json'))}
rows=[]
for c in csv.DictReader(open(P,encoding='utf-8')):
    cat=c['categoryName'];h=int(c['handler']);fx=int(c['fxResource']);pal=int(c['palette'])
    if cat not in ('BEAM','DAMAGE') or fx==0xFF: continue
    if h==0x07:
        preop=2; preaddr='Bank03:$5E4C'; note='handler $07 preserves E=2 across WAIT_FRAME builder; opcode $0C source rows 3-10'
    elif h==0x03: preop=0;preaddr='Bank03:$5AB7';note='state14 override'
    elif h==0x04: preop=0;preaddr='Bank03:$5B28';note='state14 override'
    elif h==0x05: preop=0;preaddr='Bank03:$5B84';note='state14 override / shared by Damage handler $05'
    elif h==0x06: preop=0;preaddr='Bank03:$5BEA';note='state14 override / shared by Damage handler $06'
    elif h==0x0D: preop=0;preaddr='Bank03:$5CB8';note='Purple Comet custom state14'
    elif h==0x0E: preop=0;preaddr='Bank03:$5DAB';note='P.Comet Z custom state14'
    elif h==0x0C: preop=0;preaddr='Bank03:$5B84 via fallback';note='V-ball falls into handler $05 for prefix; custom result at $630B'
    else: preop=0;preaddr='Bank03:$586C';note='shared Beam core $02'
    g=geom.get(fx,{})
    rows.append({
      'cardId':int(c['cardId']),'name':c['name'],'category':cat,'handler':f'0x{h:02X}','fxResource':f'0x{fx:02X}','palette':f'0x{pal:02X}',
      'prefixOperand':f'0x{preop:02X}','prefixSourceRows':f'{preop+1}-{preop+8}','prefixCall':preaddr,
      'resultOperand':'0x0A','resultSourceRows':'11-18','resultCall':'shared result states $5912/$5957/$598F/$59C6; V-ball $62F9',
      'bundleRelation':g.get('prefixRelation'),'mapDeltaXIfPure':g.get('mapDeltaX',''),'note':note
    })
(D/'offensive_fx_execution_v4.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
with (D/'offensive_fx_execution_v4.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
print('offensive cards with FX',len(rows))
from collections import Counter
print('prefix operands',Counter(r['prefixOperand'] for r in rows))
