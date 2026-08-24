from pathlib import Path
import csv,json
sites=[
 ('Bank03:$586C','BEAM_CORE_STATE14','0x00','rows 1-8','shared handler $02 prefix'),
 ('Bank03:$5924','BEAM_RESULT_STATE32','0x0A','rows 11-18','RESULT_0 branch'),
 ('Bank03:$5969','BEAM_RESULT_STATE3C','0x0A','rows 11-18','RESULT_1 branch'),
 ('Bank03:$59A1','BEAM_RESULT_STATE46','0x0A','rows 11-18','RESULT_2 branch'),
 ('Bank03:$59D8','BEAM_RESULT_STATE50','0x0A','rows 11-18','RESULT_OTHER/3/4 branch'),
 ('Bank03:$5AB7','HANDLER03_STATE14','0x00','rows 1-8','handler $03 override'),
 ('Bank03:$5B28','HANDLER04_STATE14','0x00','rows 1-8','handler $04 override'),
 ('Bank03:$5B84','HANDLER05_STATE14','0x00','rows 1-8','handler $05 override; V-ball fallback prefix'),
 ('Bank03:$5BEA','HANDLER06_STATE14','0x00','rows 1-8','handler $06 override'),
 ('Bank03:$5CB8','HANDLER0D_STATE14','0x00','rows 1-8','Purple Comet'),
 ('Bank03:$5DAB','HANDLER0E_STATE14','0x00','rows 1-8','P.Comet Z'),
 ('Bank03:$5E4C','HANDLER07_STATE14','0x02','rows 3-10','E=2 is preserved by $3EE1/$72DF and bank-switch wrappers'),
 ('Bank03:$630B','VBALL_RESULT_STATE32','0x0A','rows 11-18','V-ball custom result'),
]
out=[{'address':a,'context':c,'operand':o,'effectiveSourceWindow':w,'note':n} for a,c,o,w,n in sites]
D=Path('/mnt/data/DBZ_LSW_ROM_RESEARCH_V4_FX/data');(D/'fx_opcode0c_call_sites_v4.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
with (D/'fx_opcode0c_call_sites_v4.csv').open('w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=out[0].keys());w.writeheader();w.writerows(out)
print('sites',len(out))
