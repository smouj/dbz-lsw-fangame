from pathlib import Path
import json,csv
ROM=Path('/mnt/data/Dragon Ball Z - Legendary Super Warriors (USA)(2).gbc').read_bytes()
def off(b,a):return b*0x4000+(a-0x4000 if b else a)
def u16(b,a):o=off(b,a);return ROM[o]|ROM[o+1]<<8
def res(b,i):return 0x4000+u16(b,0x4008+i*4)*4
D=Path('/mnt/data/DBZ_LSW_ROM_RESEARCH_V4_FX/data')
out=[]
for side,idx in [(1,0),(2,1)]:
 d=res(0x65,idx);raw=ROM[off(0x65,d):off(0x65,d)+640]
 for r in range(20):
  row=raw[r*32:(r+1)*32];vals=sorted(set(row));assert len(vals)==1
  v=vals[0]
  out.append({'side':side,'descriptor':f'Bank65:${d:04X}','row':r,'attribute':f'0x{v:02X}','bgPalette':v&7,'vramBank':(v>>3)&1,'xFlip':bool(v&0x20),'yFlip':bool(v&0x40),'priority':bool(v&0x80)})
(D/'fx_global_attribute_strips_v4.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
with (D/'fx_global_attribute_strips_v4.csv').open('w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=out[0].keys());w.writeheader();w.writerows(out)
print('rows',len(out))
