from pathlib import Path
import csv,json
SRC=Path('/mnt/data/v2unpack/DBZ_LSW_ROM_STATIC_PRIORITY_FINDINGS_V2/beam_actor_sequence_map_v2.csv')
D=Path('/mnt/data/DBZ_LSW_ROM_RESEARCH_V4_FX/data')
def sb(x): return x-256 if x>=128 else x
out=[]
for r in csv.DictReader(open(SRC,encoding='utf-8')):
    py=int(r['param2'],16); px=int(r['param3'],16)
    # exact arithmetic from Bank00:$3992-$39AC
    x1=(px+0x80)&0xff
    x2=(((-px)&0xff)+0x80)&0xff
    out.append({
      'cardId':int(r['cardId']),'cardName':r['cardName'],'handler':r['handler'],'animationResource':r['animationResource'],
      'actorRecordId':int(r['actorRecordId']),'visualProfileKey':r['visualProfileKey'],'sequence':r['selectorEffective'],
      'selectorRowParam2':r['param2'],'selectorRowParam2Signed':sb(py),'selectorRowParam3':r['param3'],'selectorRowParam3Signed':sb(px),
      'C405_screenYDeltaByte':f'0x{py:02X}','C405_screenYDeltaSigned':sb(py),
      'C406_side1_screenXDeltaByte':f'0x{x1:02X}','C406_side2_screenXDeltaByte':f'0x{x2:02X}',
      'evidence':'Bank00:$3966 + Bank7E opcode0D + Bank00:$0DA2'
    })
(D/'beam_actor_screen_offsets_v4.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
with (D/'beam_actor_screen_offsets_v4.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f,fieldnames=out[0].keys());w.writeheader();w.writerows(out)
print('rows',len(out),'unique screen tuples',len({(x['C405_screenYDeltaByte'],x['C406_side1_screenXDeltaByte'],x['C406_side2_screenXDeltaByte']) for x in out}))
print('y signed range',min(x['C405_screenYDeltaSigned'] for x in out),max(x['C405_screenYDeltaSigned'] for x in out))
