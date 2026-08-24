from pathlib import Path
import csv,json,hashlib,shutil,subprocess,struct,os
from collections import defaultdict

ROOT=Path('/mnt/data')
ROM=ROOT/'Dragon Ball Z - Legendary Super Warriors (USA)(2).gbc'
OUT=ROOT/'DBZ_LSW_ROM_RESEARCH_V5_SUPPORT_DEFENSE'
if OUT.exists(): shutil.rmtree(OUT)
for d in ['data','proof','samples','scripts']:(OUT/d).mkdir(parents=True,exist_ok=True)
rom=ROM.read_bytes()
SHA=hashlib.sha256(rom).hexdigest()
assert SHA=='8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee'

def off(bank,addr): return bank*0x4000+(addr-(0 if bank==0 else 0x4000))
def hx(v): return f'${v:02X}'

def card_record(cid):
    p=off(0x11,0x4320)+(cid-1)*16
    b=rom[p:p+16]
    return dict(cardId=cid,category=b[0],power=b[1],accuracy=b[2],internalId=b[3],ccCost=b[4],handler=b[5],animationResource=b[6],fxResource=b[7],palette=b[8],raw=' '.join(f'{x:02X}' for x in b))

# names from direct taxonomy file when available
names={}
tax=ROOT/'dbz_lsw_rom_taxonomy/card_animation_taxonomy_125.csv'
if tax.exists():
    with tax.open(newline='',encoding='utf8') as f:
        for r in csv.DictReader(f): names[int(r['cardId'])]=r['name']

SUPPORT_IDS=[i for i in range(1,126) if card_record(i)['category']==4]
DEFENSE_IDS=[i for i in range(1,126) if card_record(i)['category']==5]

support_worker={0x00:'Bank03:$63BF',0x02:'Bank03:$64D8',0x0B:'Bank03:$64E7',0x0D:'Bank03:$664E',0x0F:'Bank03:$6685'}
worker_family={
0x00:'SUPPORT_COMMON_FULL',0x02:'SUPPORT_COMMON_EARLY_EXIT',0x0B:'SUPPORT_BRANCHING',0x0D:'SUPPORT_STATE17_VARIANT',0x0F:'SUPPORT_BRANCHING_LATE_VARIANT'}
# h00/h02 reach the common CA06 state0C helper; h0B/d/f override 0B-0D and skip it.
support_rows=[]
for cid in SUPPORT_IDS:
    r=card_record(cid); h=r['handler']
    common_bg=h in (0x00,0x02)
    anim_exec='NONE'
    if r['animationResource']!=0xFF:
        anim_exec='PRELOADED_SLOT6_NOT_ACTIONOBJECT_STARTED'
    support_rows.append({
        'cardId':cid,'name':names.get(cid,''),'handler':hx(h),'worker':support_worker.get(h,'UNKNOWN'),
        'family':worker_family.get(h,'UNKNOWN'),'animationResource':hx(r['animationResource']),
        'fxToken':hx(r['fxResource']),'palette':hx(r['palette']),
        'usesFixedBgResource19':common_bg,
        'cardAnimationExecution':anim_exec,
        'usesOpcode0C':False,
    })

with (OUT/'data/support_card_visual_matrix_v5.csv').open('w',newline='',encoding='utf8') as f:
    w=csv.DictWriter(f,fieldnames=support_rows[0].keys());w.writeheader();w.writerows(support_rows)
(OUT/'data/support_card_visual_matrix_v5.json').write_text(json.dumps(support_rows,indent=2),encoding='utf8')

support_workers=[]
for h,waddr in support_worker.items():
    cards=[r for r in support_rows if r['handler']==hx(h)]
    support_workers.append({
        'handler':hx(h),'worker':waddr,'cardCount':len(cards),'cardIds':[r['cardId'] for r in cards],
        'usesCommonResource19':h in (0x00,0x02),
        'startsCardAnimationSlot6':False,
        'notes':{
          0x00:'Full common Support FSM.',
          0x02:'Uses common visual FSM including resource $19; resets at CA06=$10.',
          0x0B:'Overrides common states $0B/$0C/$0D and branches via CA53; does not use resource $19.',
          0x0D:'Inherits $0B family; state $14 queues macro $2B; no card AnimationSlot6 start.',
          0x0F:'Inherits $0B family with custom late states $17/$18/$19.'
        }[h]
    })
(OUT/'data/support_workers_v5.json').write_text(json.dumps(support_workers,indent=2),encoding='utf8')

# Structured support states: literal, not invented semantic names
support_fsm=[
 {'handler':'$00/$02 common','ca06':'$01','address':'03:$63FA','ops':['select card/context','CC01=card','CALL $2C30 with C=$6B B=$03 DE=$8800'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$00/$02 common','ca06':'$02','address':'03:$640D','ops':['poll $2CDE(C=1)','trigger $1CC4(C=$28)'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$00/$02 common','ca06':'$03','address':'03:$641A','ops':['CALL $3269','WAIT helper BC=3','set CA06=$0A'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$00/$02 common','ca06':'$0A','address':'03:$642A','ops':['palette transition start $07F4 A=1 BC=$0038 E=$20 D=1'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$00/$02 common','ca06':'$0B','address':'03:$643B','ops':['poll $080C','scene $3764 C=0 DE=0','macro $19'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$00/$02 common','ca06':'$0C','address':'03:$6459','ops':['CALL fixed BG helper $66D1 -> Bank68:$19','when helper complete start palette transition $07F4 A=0 BC=$0360 E=$20 D=1','trigger $39CF DE=$0080'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$00/$02 common','ca06':'$0D','address':'03:$6477','ops':['delay helper $0821 DE=$28','poll palette transition','CB77=0'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$00/$02 common','ca06':'$0E','address':'03:$6487','ops':['delay helper','CB77++ until $78 (120 ticks)','palette transition start $07F4 A=1 BC=$0020 E=$10 D=2'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$00/$02 common','ca06':'$0F','address':'03:$64A3','ops':['delay helper','poll palette transition'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$00 common','ca06':'$10-$12','address':'03:$64AF-$64D7','ops':['gameplay maintenance/tail','reset CA06 at $12'],'evidence':'ROM_STATIC_VERIFIED'},
 {'handler':'$02','ca06':'$10','address':'03:$64D8','ops':['reset CA06 immediately instead of common tail'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$0B','ca06':'$0B','address':'03:$6526','ops':['poll palette transition','scene $3764 C=1 DE=1','macro $1A'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$0B','ca06':'$0C','address':'03:$6547','ops':['palette transition start $07F4 A=0 BC=$0340 E=$10 D=2'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$0B','ca06':'$0D','address':'03:$6555','ops':['branch CA53: 0->$14; nonzero->$1E'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$0B','ca06':'$14','address':'03:$656C','ops':['aux FX wrapper $3F60 B=0','macro $2C'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$0B','ca06':'$1E','address':'03:$65DF','ops':['CA7F=0','macro $34'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$0B','ca06':'$21','address':'03:$661E','ops':['macro $35','ROM_WAIT 60'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$0D','ca06':'$14','address':'03:$665C','ops':['macro $2B','trigger $1CC6 C=$42 B=$05'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$0D','ca06':'$15','address':'03:$6678','ops':['wait macro','reset CA06'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'handler':'$0F','ca06':'$17-$19','address':'03:$669A-$66D0','ops':['custom late maintenance states; otherwise inherit handler $0B'],'evidence':'ROM_HANDLER_VERIFIED'},
]
(OUT/'data/support_fsm_v5.json').write_text(json.dumps(support_fsm,indent=2),encoding='utf8')
with (OUT/'data/support_fsm_v5.csv').open('w',newline='',encoding='utf8') as f:
    fields=['handler','ca06','address','ops','evidence'];w=csv.DictWriter(f,fieldnames=fields);w.writeheader();
    for r in support_fsm:w.writerow({**r,'ops':' | '.join(r['ops'])})

# Defense cards exact CA83 mapping
flagmap={19:('$01/$81','TAIYOKEN_DAMAGE_CANCEL_OR_COUNTERED'),26:('$02','BEAM_AVOID'),45:('$04','BEAM_NULLIFY'),52:('$40','COMMAND_STAGE_SUCCESS_CLEAR'),53:('$04','BEAM_NULLIFY'),76:('$08','BEAM_ENERGY_ABSORB'),121:('$10','ENDURANCE_PARTIAL'),122:('$40','COMMAND_STAGE_SUCCESS_CLEAR'),123:('$40','COMMAND_STAGE_SUCCESS_CLEAR'),124:('$01','DAMAGE_CANCEL_SHOCKWAVE'),125:('$02','BEAM_AVOID')}
started={19:'STARTED_VS_STANDARD_DAMAGE',45:'STARTED_VS_BEAM_CA53_3',53:'STARTED_VS_BEAM_CA53_3',76:'STARTED_VS_BEAM_CA53_4'}
preload_only={26:'PRELOADED_NOT_STARTED_ON_AVOID_ROUTE',52:'PRELOADED_NOT_STARTED_ON_COMMAND_SUPPRESSION_ROUTE'}
def_rows=[]
for cid in DEFENSE_IDS:
    r=card_record(cid); flag,fam=flagmap[cid]
    if cid in started: execs=started[cid]
    elif cid in preload_only: execs=preload_only[cid]
    elif r['animationResource']==0xFF: execs='NO_ANIMATION_RESOURCE'
    else: execs='PRELOAD_STATUS_UNKNOWN'
    def_rows.append({
      'cardId':cid,'name':names.get(cid,''),'handler':hx(r['handler']),'animationResource':hx(r['animationResource']),
      'fxToken':hx(r['fxResource']),'palette':hx(r['palette']),'ca83':flag,'resolutionFamily':fam,
      'slot8Execution':execs})
with (OUT/'data/defense_card_flags_v5.csv').open('w',newline='',encoding='utf8') as f:
    w=csv.DictWriter(f,fieldnames=def_rows[0].keys());w.writeheader();w.writerows(def_rows)
(OUT/'data/defense_card_flags_v5.json').write_text(json.dumps(def_rows,indent=2),encoding='utf8')

# slot8 global consumers
slot8=[
 {'site':'01:$76E8','kind':'LOAD','condition':'Defense card selected and AnimationResource != $FF','action':'resolve card AnimationResource and install AnimationSlot8','evidence':'ROM_HANDLER_VERIFIED'},
 {'site':'03:$60B2','kind':'START','condition':'STANDARD_DAMAGE route CA83&$01 and selected Defense card != $7C Shockwave','action':'start ActionObject with AnimationSlot8','evidence':'ROM_HANDLER_VERIFIED'},
 {'site':'03:$59FD','kind':'START','condition':'BEAM result branch CA53 not 0/1/2 (known CA53=3 nullification or 4 absorption)','action':'start ActionObject with AnimationSlot8','evidence':'ROM_HANDLER_VERIFIED'},
]
(OUT/'data/defense_slot8_consumers_v5.json').write_text(json.dumps(slot8,indent=2),encoding='utf8')
with (OUT/'data/defense_slot8_consumers_v5.csv').open('w',newline='',encoding='utf8') as f:
    w=csv.DictWriter(f,fieldnames=slot8[0].keys());w.writeheader();w.writerows(slot8)

# Defense selection FSM
def_fsm=[
 {'ca02':'$00','address':'01:$74FA','ops':['CALL $3408','increment'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'ca02':'$01','address':'01:$74FF','ops':['wait $0E4D','increment'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'ca02':'$02','address':'01:$7505','ops':['CA82=0','CA83=0','scene $3764 C=1 DE=1','macro $1A'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'ca02':'$03-$04','address':'01:$7526-$754B','ops':['wait/setup input panel'],'evidence':'ROM_STATIC_VERIFIED'},
 {'ca02':'$05','address':'01:$754C','ops':['read side-specific CA55','CA55=2 -> $1E Move','CA55=1 -> $28 Defense card','else -> $14 Guard'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'ca02':'$14','address':'01:$7577','ops':['CA82=2','emit CAA2 payload [CA5A,$BC,$84,$78]'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'ca02':'$1E','address':'01:$759D','ops':['CA82=3','persist selected CA57/58 to FighterState position','select macro $29/$2A from newPosition>>1','queue WAIT10'],'evidence':'ROM_HANDLER_VERIFIED'},
 {'ca02':'$28-$32','address':'01:$760E-$76F0','ops':['record selected Defense card','run result/maintenance','state $32 resolves AnimationResource and installs AnimationSlot8 only; then reset'],'evidence':'ROM_HANDLER_VERIFIED'},
]
(OUT/'data/defense_fsm_v5.json').write_text(json.dumps(def_fsm,indent=2),encoding='utf8')
with (OUT/'data/defense_fsm_v5.csv').open('w',newline='',encoding='utf8') as f:
    w=csv.DictWriter(f,fieldnames=['ca02','address','ops','evidence']);w.writeheader();
    for r in def_fsm:w.writerow({**r,'ops':' | '.join(r['ops'])})

# Macro decoder from Bank30 table
macro_base=off(0x30,0x5D00)
def macro(mid):
    rel=int.from_bytes(rom[macro_base+mid*2:macro_base+mid*2+2],'little')
    addr=0x5D00+rel; p=off(0x30,addr); n=rom[p]
    cmds=[list(rom[p+1+i*5:p+1+(i+1)*5]) for i in range(n)]
    return {'macroId':hx(mid),'bank':'$30','address':f'${addr:04X}','count':n,'commands':[{'opcode':hx(c[0]),'bytes':' '.join(f'{x:02X}' for x in c),'operands':[hx(x) for x in c[1:]]} for c in cmds]}
macros=[macro(i) for i in [0x19,0x1A,0x29,0x2A,0x2B,0x2C,0x34,0x35,0x37,0x38]]
(OUT/'data/presentation_macros_v5.json').write_text(json.dumps(macros,indent=2),encoding='utf8')

# Move exact contract
move={
 'positionBits':{'bit0':'0=GROUND, 1=AIR','bit1':'0=FRONT, 1=BACK'},
 'selector':{'address':'Bank00:$313C','workingByte':'$CAA6','confirm':'$C012 == $10','committedByte':'$CA57'},
 'defenseChoice':{'CA55':{'0':'Guard/default','1':'Defense card','2':'Move'}},
 'execution':{'address':'Bank01:$759D','persist':'CA57/58 -> FighterState byte0','macroSelection':'(newPosition >> 1): 0 -> $29, 1 -> $2A','note':'bit0 does not select a different macro ID at this site'},
 'macro29':{'address':'Bank30:$609C','waitTicks':40,'motion':[{'dxPerTick':2,'ticks':3},{'dxPerTick':1,'ticks':2},{'dxPerTick':-1,'ticks':8}],'netDx':0},
 'macro2A':{'address':'Bank30:$60C5','waitTicks':40,'motion':[{'dxPerTick':-2,'ticks':2},{'dxPerTick':-1,'ticks':1},{'dxPerTick':1,'ticks':5}],'netDx':0},
 'evidence':'ROM_HANDLER_VERIFIED'
}
(OUT/'data/move_position_contract_v5.json').write_text(json.dumps(move,indent=2),encoding='utf8')

# CA83 numeric result semantics and Stage buffer
ca83={
 'cardIdDispatcher':'Bank7E:$56AA-$597B',
 'resultResolver':{
  'bit08':{'CA53':4,'meaning':'ENERGY_ABSORB','effect':'CA7F = incoming card power'},
  'bit04':{'CA53':3,'meaning':'NULLIFICATION','effect':'CA7F = 0'},
  'bit02':{'CA53':1,'meaning':'AVOID','effect':'CA7F = 0'},
  'bit10':{'CA53':2,'meaning':'ENDURANCE_PARTIAL','effect':'partial branch; CA53=2 is not universally MISS'},
  'bit40':{'meaning':'COMMAND_STAGE_SUCCESS_BUFFER_CLEAR','effect':'for non-Damage/non-Beam resolution, zero 10 bytes $CA6A..$CA73 before downstream command/Stage processing'}
 },
 'stageSuccessBuffer':{
  'address':'$CA6A..$CA73','length':10,
  'proof':['Bank01:$6A16 initializes 10 bytes to zero','Bank01:$6AD3 writes 1 at CA6A[currentIndex] for a correct Stage input','Bank00:$3822 reads CA60[currentIndex] and CA6A[currentIndex] as command + success','Bank7E:$4EEC clears the same 10 bytes when CA83&$40']
 },
 'evidence':'ROM_HANDLER_VERIFIED'
}
(OUT/'data/ca83_resolution_and_stage_suppression_v5.json').write_text(json.dumps(ca83,indent=2),encoding='utf8')

# Sunglasses/Taiyoken exact chain
sung={
 'sunglasses':{'cardId':109,'applySite':'Bank7E:$5519','effect':'fighter status byte +7 |= $08'},
 'taiyoken':{'cardId':19,'site':'Bank7E:$5931','test':'fighter status byte +7 & $08','ifClear':'CA83=$01','ifSet':'CA83=$81'},
 'standardDamage':{'site':'Bank03:$60B5','test':'CA83 & $80','ifClear':'queues cancellation/reaction path including macros $1C+$37 and terminates defense sequence','ifSet':'bypasses that cancellation tail and resumes normal attack execution from $60F7'},
 'conclusion':'Sunglasses is a ROM-proven counter to Taiyoken. Taiyoken with status bit $08 set is marked $81 and the standard-damage attack continues.',
 'evidence':'ROM_HANDLER_VERIFIED'
}
(OUT/'data/sunglasses_taiyoken_v5.json').write_text(json.dumps(sung,indent=2),encoding='utf8')

# Support aux BG resources 19/1A
aux={
 '$19':{'bank':'$68','descriptor':'$7A0C','tileCount':16,'tileBytes':256,'rowTable':'Bank03:$6834','rows':7,'tilesPerRow':6,'assembledSizePx':[48,56],'bgStart':{'row':4,'col':7},'paletteSlot':5,'consumer':'Support handlers $00/$02 common visual path','helper':'Bank03:$66D1'},
 '$1A':{'bank':'$68','descriptor':'$7B10','tileCount':23,'tileBytes':368,'rowTable':'Bank03:$688F','rows':7,'tilesPerRow':8,'assembledSizePx':[64,56],'bgStart':{'row':4,'col':6},'paletteSlot':5,'consumers':['CHARA visual helper with CC15=$31','Gather Power visual helper with CC15=$33'],'helper':'Bank03:$6750','note':'not the common Support resource'}
}
(OUT/'data/aux_bg_resources_v5.json').write_text(json.dumps(aux,indent=2),encoding='utf8')

# Palette helpers and render BG resources
try:
 from PIL import Image,ImageOps,ImageDraw
 def cgb_palette(pid):
    p=off(0x30,0x6E00)+pid*8
    vals=[int.from_bytes(rom[p+i*2:p+i*2+2],'little') for i in range(4)]
    out=[]
    for v in vals:
      r=(v&31)*255//31; g=((v>>5)&31)*255//31; b=((v>>10)&31)*255//31
      out.append((r,g,b,255))
    return out,vals
 def decode_tile(raw):
    px=[[0]*8 for _ in range(8)]
    for y in range(8):
      lo=raw[y*2]; hi=raw[y*2+1]
      for x in range(8):
        bit=7-x; px[y][x]=((hi>>bit)&1)*2+((lo>>bit)&1)
    return px
 def render_aux(desc_addr,row_addr,rows,cols,pal,transparent=False):
    p=off(0x68,desc_addr); n=rom[p]; tilebytes=rom[p+1:p+1+n*16]
    tiles=[decode_tile(tilebytes[i*16:(i+1)*16]) for i in range(n)]
    palette,_=cgb_palette(pal)
    if transparent: palette[0]=(*palette[0][:3],0)
    im=Image.new('RGBA',(cols*8,rows*8),(0,0,0,0))
    rowlen=1+cols*2
    for ry in range(rows):
      q=off(0x03,row_addr)+ry*rowlen
      cnt=rom[q]; assert cnt==cols
      for cx in range(cols):
        attr=rom[q+1+cx*2]; tid=rom[q+2+cx*2]
        ti=tid-0x80
        tile=tiles[ti]
        for yy in range(8):
          for xx in range(8):
            sx=7-xx if attr&0x20 else xx
            sy=7-yy if attr&0x40 else yy
            im.putpixel((cx*8+xx,ry*8+yy),palette[tile[sy][sx]])
    return im
 # actual common Support palettes h00/h02
 common_pals=sorted(set(card_record(cid)['palette'] for cid in SUPPORT_IDS if card_record(cid)['handler'] in (0,2)))
 palinfo=[]
 for pid in common_pals:
    pal,vals=cgb_palette(pid)
    palinfo.append({'palette':hx(pid),'raw16':[f'${v:04X}' for v in vals],'rgb':[list(x[:3]) for x in pal]})
    render_aux(0x7A0C,0x6834,7,6,pid,False).save(OUT/f'samples/support_bg19_palette_{pid:02X}_opaque.png')
    render_aux(0x7A0C,0x6834,7,6,pid,True).save(OUT/f'samples/support_bg19_palette_{pid:02X}_transparent_inspection.png')
 # resource1A verified CHARA/Gather palettes
 for pid,label in [(0x31,'chara'),(0x33,'gather')]:
    render_aux(0x7B10,0x688F,7,8,pid,False).save(OUT/f'samples/aux_bg1A_{label}_palette_{pid:02X}_opaque.png')
    render_aux(0x7B10,0x688F,7,8,pid,True).save(OUT/f'samples/aux_bg1A_{label}_palette_{pid:02X}_transparent_inspection.png')
 (OUT/'data/support_common_palettes_v5.json').write_text(json.dumps(palinfo,indent=2),encoding='utf8')
except Exception as e:
 (OUT/'samples/RENDER_ERROR.txt').write_text(str(e))

# Supersedes matrix
supersedes=[
 {'old':'Palette $FF universally means NONE','new':'Category/path-scoped. Common Support helper passes CC15 directly to palette index; $FF indexes Bank30:$75F8 and is physically consumed.','status':'SUPERSEDES'},
 {'old':'CA53=2 universally means MISS','new':'CA53=2 is also explicitly assigned by CA83&$10 Endurance/partial; keep numeric ROM result separate from human outcome.','status':'SUPERSEDES'},
 {'old':'Defense card AnimationResource means play it when selected','new':'Selection only preloads AnimationSlot8. Incoming attack worker decides whether slot8 is started.','status':'SUPERSEDES'},
 {'old':'Teleport/Time Freeze physical resource necessarily plays','new':'Both are preloaded, but no static slot8 start occurs on their Avoid/Command-suppression routes.','status':'SUPERSEDES'},
 {'old':'Bank68:$1A is unresolved auxiliary Support visual','new':'Bank68:$1A is statically tied to CHARA (palette $31) and Gather Power (palette $33); common Support uses $19.','status':'SUPERSEDES'},
 {'old':'Move cinematic position equals tactical relocation','new':'Tactical position is persisted separately; macros $29/$2A have net local dx=0.','status':'SUPERSEDES'},
]
(OUT/'data/supersedes_v5.json').write_text(json.dumps(supersedes,indent=2),encoding='utf8')

# Literal research ledger for handoff package
findings=[]
def add(fid,domain,claim,evidence,addresses,details=None,sup=None):
 findings.append({'id':fid,'domain':domain,'status':'CONFIRMED','evidenceLevel':evidence,'claim':claim,'romAddresses':addresses,'details':details or {},'supersedes':sup or []})
add('V5-F001','DISPATCH','Handler bytes are category-scoped; Support dispatches $00/$02/$0B/$0D/$0F via Bank00:$3A6C independently of offensive handler meanings.','ROM_HANDLER_VERIFIED',['00:$3A6C-$3AA4'])
add('V5-F002','SUPPORT','Support handlers $00/$02 share a fixed BG resource $19 visual path; $0B/$0D/$0F override states before that helper and do not inherit it.','ROM_HANDLER_VERIFIED',['03:$63BF-$66D0','03:$66D1-$674F'])
add('V5-F003','SUPPORT_BG','Bank68:$19 is 16 tiles assembled as 7 rows × 6 tiles at BG row4/col7, palette slot5; it is one static 48×56 BG graphic, not seven animation frames.','ROM_ASSET_VERIFIED',['03:$66D1-$674F','03:$6834-$688E','68:$7A0C'])
add('V5-F004','SUPPORT_PALETTE','Common Support passes card CC15 directly as palette index; palette $FF is physically consumed as index255 and is not universally NONE.','ROM_HANDLER_VERIFIED',['03:$6731-$674F','30:$75F8'])
add('V5-F005','SUPPORT_ANIMATION','Kiai $40 and Paralysis $29 are loaded into card AnimationSlot6 but no Support worker or Support macro starts that slot.','ROM_HANDLER_VERIFIED',['03:$63BF-$66D0','30:$60E9-$610D'])
add('V5-F006','DEFENSE_FSM','Defense selection is a CA02 FSM; CA55=0/default Guard, 1 Defense card, 2 Move.','ROM_HANDLER_VERIFIED',['01:$7497-$76F0','00:$3128-$31F0'])
add('V5-F007','MOVE','Move commits a 2-bit FighterState tactical position, while ROM macros $29/$2A perform local net-zero cinematic movement.','ROM_HANDLER_VERIFIED',['00:$313C-$31F0','01:$759D-$75F8','30:$609C-$60E8'])
add('V5-F008','DEFENSE_ANIMATION','Defense selection preloads AnimationSlot8; only two global ActionObject start sites consume slot8: STANDARD_DAMAGE $60B2 and Beam $59FD.','ROM_HANDLER_VERIFIED',['01:$76CF-$76F0','03:$60B2','03:$59FD'])
add('V5-F009','DEFENSE_FLAGS','Defense card IDs map exactly to CA83 flags: Taiyoken 01/81, Teleport 02, Barrier/Breath 04, TimeFreeze/Telepathy/Foresight 40, EnergyAbsorb 08, Endurance 10, Shockwave 01, Avoiding 02.','ROM_HANDLER_VERIFIED',['7E:$56AA-$597B'])
add('V5-F010','DEFENSE_RESULT','CA83 result flags produce distinct numeric CA53 states; CA53=2 is Endurance/partial and is not universally MISS.','ROM_HANDLER_VERIFIED',['7E:$5032-$5129'])
add('V5-F011','TAIYOKEN','Sunglasses sets fighter status+7 bit08; Taiyoken checks that bit and writes CA83=$81 when countered; STANDARD_DAMAGE then bypasses Taiyoken cancellation and continues.','ROM_HANDLER_VERIFIED',['7E:$5519-$5527','7E:$5931-$5953','03:$60B5-$60FD'])
add('V5-F012','COMMAND_DEFENSE','CA83 bit40 clears the ten-byte Stage/Command success buffer CA6A..CA73 before non-Damage/non-Beam resolution.','ROM_HANDLER_VERIFIED',['7E:$4EE5-$4EF5','01:$6A16-$6A20','01:$6AD3-$6ADB','00:$3822-$3832'])
add('V5-F013','SHOCKWAVE','On STANDARD_DAMAGE CA83&1 route, selected card $7C Shockwave skips slot8 and queues macro $38; Taiyoken uses slot8.','ROM_HANDLER_VERIFIED',['03:$607D-$60D5','30:$6259-$625E'])
add('V5-F014','BEAM_DEFENSE','Beam CA53=3/4 result route starts slot8; CA53=1 Avoid and CA53=2 Endurance do not.','ROM_HANDLER_VERIFIED',['03:$59C6-$5A3F'])
add('V5-F015','DEFENSE_RESOURCE','Taiyoken/Barrier/Breath/EnergyAbsorb resources are started on known attack routes; Teleport/TimeFreeze resources are preloaded but not statically started on their defining routes.','ROM_HANDLER_VERIFIED',['01:$76CF-$76F0','03:$60B2','03:$59FD'])
add('V5-F016','AUX_BG','Bank68:$1A is shared by CHARA with palette $31 and Gather Power with palette $33; common Support uses $19 instead.','ROM_HANDLER_VERIFIED',['01:$736C-$7383','01:$7B80-$7B95','03:$6750-$6833','68:$7B10'])
add('V5-F017','SUPPORT_CARD_VISUAL','All Support paths perform an initial card-indexed load through $2C30 using banks beginning at $6B; this path is indexed by card ID and is separate from offensive FXResource loader $2B30.','ROM_HANDLER_VERIFIED',['03:$63FA-$640B','00:$2C30-$2C65'])
(OUT/'LEDGER.md').write_text('# V5 research ledger\n\n'+ '\n'.join(f"## {x['id']} — {x['domain']}\n**{x['evidenceLevel']}** — {x['claim']}\n\nROM: {', '.join(x['romAddresses'])}\n" for x in findings),encoding='utf8')
(OUT/'data/findings_v5.json').write_text(json.dumps(findings,indent=2),encoding='utf8')

# Proof disassembly via gbdis helper
gbdis=ROOT/'gbdis.py'
def dump(name,bank,start,end):
    txt=subprocess.check_output(['python',str(gbdis),hex(bank),hex(start),hex(end)],text=True)
    (OUT/'proof'/name).write_text(txt,encoding='utf8')
for args in [
 ('support_workers_63BF_66D1.txt',0x03,0x63BF,0x66D1),
 ('support_bg_helpers_66D1_6834.txt',0x03,0x66D1,0x6834),
 ('defense_worker_7497_7700.txt',0x01,0x7497,0x7700),
 ('move_selector_3128_31F1.txt',0x00,0x3128,0x31F1),
 ('standard_damage_defense_6063_60E3.txt',0x03,0x6063,0x60E3),
 ('beam_defense_59C6_5A40.txt',0x03,0x59C6,0x5A40),
 ('defense_flag_dispatch_56AA_597B.txt',0x7E,0x56AA,0x597B),
 ('command_stage_suppression_4E9C_4F4B.txt',0x7E,0x4E9C,0x4F4B),
 ('stage_success_buffer_69F6_6B25.txt',0x01,0x69F6,0x6B25),
 ('sunglasses_setter_5519_552A.txt',0x7E,0x5519,0x552A),
 ('chara_resource1A_7293_7390.txt',0x01,0x7293,0x7390),
 ('gather_resource1A_7993_7B96.txt',0x01,0x7993,0x7B96),
 ('card_indexed_visual_loader_2C30_2C66.txt',0x00,0x2C30,0x2C66),
]: dump(*args)
(OUT/'proof/CANONICAL_ROM_SHA256.txt').write_text(f'{SHA}  Dragon Ball Z - Legendary Super Warriors (USA)(2).gbc\n',encoding='utf8')

# Write extraction script into package (this build script minus package documentation generation is acceptable reproducibility artifact)
shutil.copy2(Path(__file__),OUT/'scripts/extract_v5_support_defense.py')

# human docs
report=f'''# DBZ LSW ROM Research V5 — Support + Defense Visual Grammar\n\nCanonical ROM SHA-256: `{SHA}`\n\n## Scope\nV5 closes the static visual/execution grammar needed after V4 FX: Support workers, Defense selection, Move, Defense AnimationSlot8 consumption, CA83/CA53 result families, Taiyoken/Sunglasses, Command/Stage suppression, and the fixed BG resources `$19/$1A`.\n\n## 1. Category-scoped handlers\nHandler byte values are not globally semantic. Support has its own dispatcher at `Bank00:$3A6C`:\n\n- `$00 -> Bank03:$63BF`\n- `$02 -> Bank03:$64D8`\n- `$0B -> Bank03:$64E7`\n- `$0D -> Bank03:$664E`\n- `$0F -> Bank03:$6685`\n\nThe same numeric handler may mean something else in the offensive dispatcher. Runtime descriptors must resolve `category + handler`, never handler alone.\n\n## 2. Support is not Beam FX\nV4 proved opcode `$0C` is offensive-only. V5 adds that every Support action begins with a **card-ID-indexed visual load** through `Bank00:$2C30`, using banks beginning at `$6B`. This is separate from offensive `FXResource` loader `$2B30`.\n\nSupport handlers `$00/$02` then use fixed BG helper `Bank03:$66D1`, which loads `Bank68:$19`. `$0B/$0D/$0F` override the common states before that helper and do not inherit resource `$19`.\n\n## 3. Fixed Support BG resource `$19`\n`Bank68:$19` resolves to descriptor `Bank68:$7A0C`:\n\n- 16 physical 8×8 2bpp tiles\n- assembled by `Bank03:$6834` as 7 rows × 6 tiles\n- BG placement row 4..10, column 7\n- assembled physical size 48×56 px\n- attributes use VRAM bank1 and BG palette slot5\n\nThose seven helper iterations are **seven rows of one static graphic**, not seven animation frames.\n\nThe common Support path holds `CB77` until `$78` = **120 ticks** before its later palette transition.\n\n## 4. Palette `$FF` is category/path scoped\nThe Support helper copies `CC15` directly into the palette-index routine `$36CA` with no `$FF` sentinel check. Thus `$FF` accesses palette entry 255 at `Bank30:$75F8`.\n\nDo not globally normalize `$FF` to NONE. The earlier `9 non-FF palettes` metric remains valid specifically for normal offensive FX bundles, not as a universal presentation rule.\n\n## 5. Kiai / Paralysis AnimationResources\nKiai `$40` and Paralysis `$29` are loaded into card AnimationSlot6 by common action setup, but static search finds no Support worker nor Support Presentation macro that starts slot6. Their h`$0D` path uses macro `$2B`, which changes an already existing ActionObject animation state; it does not start the card resource.\n\nStatus: `PRELOADED_SLOT6_NOT_ACTIONOBJECT_STARTED`. Do not auto-play these resources.\n\n## 6. Defense selection FSM\nDefense uses `CA02`, not the offensive `CA06` FSM. At `Bank01:$754C` it reads side-specific `CA55`:\n\n- `CA55=2 -> CA02=$1E` Move\n- `CA55=1 -> CA02=$28` Defense card\n- otherwise `CA02=$14` Guard\n\nGuard sets `CA82=2`. Move sets `CA82=3`.\n\n## 7. Move: persistent state versus net-zero cinema\nThe selector at `Bank00:$313C` edits the two-bit tactical position and commits it to `CA57`. Position bits remain:\n\n- bit0: 0 GROUND / 1 AIR\n- bit1: 0 FRONT / 1 BACK\n\nThe Move execution worker persists that value to FighterState byte0. It then selects macro `$29/$2A` from `(newPosition >> 1)`. At this site bit0 does not select a different macro ID.\n\nMacro `$29` motion: `+2×3t, +1×2t, -1×8t` = **0 net px**.\nMacro `$2A` motion: `-2×2t, -1×1t, +1×5t` = **0 net px**.\n\nTherefore tactical relocation is persistent gameplay state while the local action-scene motion returns to its visual anchor. Do not move the large fighter across the tactical field.\n\n## 8. Defense AnimationSlot8 is deferred\nSelecting a Defense card at `Bank01:$76CF` resolves its AnimationResource and installs it into **AnimationSlot8**, then Defense selection ends. It does **not** play it there.\n\nGlobal static search finds exactly two direct slot8 ActionObject start sites:\n\n1. `Bank03:$60B2` — STANDARD_DAMAGE CA83 bit1 route.\n2. `Bank03:$59FD` — Beam CA53 special result route.\n\nThere are no Presentation macro opcode `$01` starts for slot8.\n\nKnown resource execution:\n\n- Taiyoken `$26` — started on STANDARD_DAMAGE defense route.\n- Barrier `$24` — started on Beam nullification route.\n- Breath `$27` — started on Beam nullification route.\n- Energy Absorb `$25` — started on Beam absorption route.\n- Teleport `$28` — preloaded; defining Avoid route does not start slot8.\n- Time Freeze `$2A` — preloaded; Command/Stage suppression route does not start slot8.\n\n## 9. Exact CA83 card mapping\nThe card-ID dispatcher at `Bank7E:$56AA` proves:\n\n| Card | CA83 | Static family |\n|---|---:|---|\n| Taiyoken #19 | `$01` or `$81` | Damage cancellation; `$80` means countered |\n| Teleport #26 | `$02` | Beam Avoid |\n| Barrier #45 | `$04` | Beam nullification |\n| Time Freeze #52 | `$40` | Command/Stage success clear |\n| Breath #53 | `$04` | Beam nullification |\n| Energy Absorb #76 | `$08` | Beam absorption |\n| Endurance #121 | `$10` | Partial |\n| Telepathy #122 | `$40` | Command/Stage success clear |\n| Foresight #123 | `$40` | Command/Stage success clear |\n| Shockwave #124 | `$01` | Damage cancellation macro path |\n| Avoiding #125 | `$02` | Beam Avoid |\n\n## 10. CA53 is a numeric ROM result, not a single human enum\nThe resolver demonstrates:\n\n- `CA83&$08 -> CA53=4` Energy Absorb; `CA7F=incoming power`\n- `CA83&$04 -> CA53=3` nullification; `CA7F=0`\n- `CA83&$02 -> CA53=1` Avoid; `CA7F=0`\n- `CA83&$10 -> CA53=2` Endurance/partial\n\nTherefore `CA53=2 == MISS` is false as a universal statement. Presentation/compiler should preserve numeric ROM result and attach semantic EventLog outcome separately.\n\n## 11. Time Freeze / Telepathy / Foresight suppress Stage success buffer\n`CA6A..CA73` is the Stage input-success buffer:\n\n- initialized to zero at `Bank01:$6A16`\n- correct input writes `1` at `CA6A[currentIndex]` at `$6AD3`\n- `Bank00:$3822` reads command + success from `CA60[]` / `CA6A[]`\n\nFor non-Damage/non-Beam action resolution, `Bank7E:$4EE5` detects `CA83&$40` and zeros all ten bytes. Thus Time Freeze, Telepathy and Foresight explicitly clear the Command/Stage success record before downstream resolution.\n\n## 12. Sunglasses counters Taiyoken — fully proven\nCard #109 Sunglasses executes `fighter.status+7 |= $08` at `Bank7E:$5519`. Taiyoken tests exactly that bit at `$5931`:\n\n- absent -> `CA83=$01`\n- present -> `CA83=$81`\n\nSTANDARD_DAMAGE state5 starts Taiyoken's slot8 visual, then tests `CA83&$80`. If clear, it follows the cancellation/reaction tail. If set, it bypasses that cancellation tail and resumes the normal attack sequence from `$60F7`.\n\nThis is a direct ROM proof that Sunglasses counter Taiyoken.\n\n## 13. Shockwave is not Taiyoken-without-a-resource\nOn the same `CA83&1` STANDARD_DAMAGE route, the worker checks the selected Defense card ID. If it is `$7C` (#124 Shockwave), it skips slot8 and queues macro `$38` instead.\n\nMacro `$38` is one literal command:\n`04 01 00 1F A0` — ActionObject1 animation-state variant `$1F`.\n\nTaiyoken instead starts AnimationSlot8 and then shares macros `$1C/$37` around the route.\n\n## 14. Shared `$1A` auxiliary BG is CHARA + Gather, not Support-common\n`Bank68:$1A` / descriptor `$7B10` is 23 tiles assembled as 7×8 tiles = 64×56 px by helper `$6750`. Static callers prove:\n\n- CHARA path sets `CC15=$31` before helper `$3ABD`.\n- Gather Power path sets `CC15=$33` before the same helper.\n- Gather later writes FighterState+4 = 5.\n\nCommon Support instead uses `$19`.\n\n## Runtime consequences\n1. Resolve worker from **category + handler**, not handler alone.\n2. Support must not use V4 `ROM_FX_WINDOW`; opcode `$0C` is not in Support/Defense.\n3. Add a literal `ROM_BG_ASSEMBLY`/equivalent for resources `$19/$1A`, or preserve it as low-level ROM presentation data until Presenter support exists.\n4. Defense selection must only preload slot8. Do not play the Defense resource at selection time.\n5. Move commits tactical state separately from local net-zero presentation motion.\n6. Preserve `romCA53` / numeric result. Do not compile CA53=2 to MISS unconditionally.\n7. Implement Taiyoken, Shockwave, Avoid, Nullify, Endurance, Absorb and Command-suppression as distinct ROM families.\n'''
(OUT/'REPORT.md').write_text(report,encoding='utf8')

handoff=f'''# Agent Handoff V5 — Support + Defense\n\nUse this after V4. Canonical ROM: `{SHA}`.\n\n## Mandatory integration changes\n\n### A. Worker identity\nChange any descriptor/compiler key that assumes handler is globally unique. Resolve as `category + handler`. Support `$0D` is not offensive `$0D`.\n\n### B. Support\n- Do not route Support FX tokens through Beam `ROM_FX_WINDOW`.\n- All Support paths have the card-indexed load through `$2C30` (Bank `$6B+`, indexed by card ID). Preserve as literal low-level presentation until semantic asset mapping is complete.\n- h`$00/$02`: add fixed BG resource `$19` assembly + palette slot5 + 120-tick hold path.\n- h`$0B/$0D/$0F`: do **not** inherit resource `$19`; use their literal macros/branches.\n- Kiai `$40` / Paralysis `$29`: mark `PRELOADED_NOT_STARTED`; never auto-play from card metadata.\n- Palette `$FF` is not universal NONE: in common Support it is passed as physical palette index255.\n\n### C. Defense selection\nModel selection boundary exactly:\n`CA55 default/0=Guard, 1=Defense card, 2=Move`.\n\nDefense card selection: load AnimationSlot8 if resource exists, then stop. The incoming attack presentation decides consumption.\n\n### D. Move\nPersist FighterState position from the selected 2-bit value. Presentation macro choice at this site uses bit1 (`$29/$2A`). Preserve both macros as discrete tick motion; both net to zero visual dx. Do not derive tactical position from Presenter movement.\n\n### E. Defense card result families\nCarry `romCA83` and `romCA53` through descriptors/timeline diagnostics. Do not map numeric results to one human enum prematurely. In particular CA53=2 is also Endurance/partial.\n\n### F. Slot8 exact consumers\n- STANDARD_DAMAGE `$60B2`: Taiyoken branch; Shockwave card `$7C` skips slot8 and uses macro `$38`.\n- Beam `$59FD`: CA53=3/4 routes (Barrier/Breath nullify, Energy Absorb).\n- Teleport and Time Freeze are preload-only on their defining routes.\n\n### G. CA83=$40\nFor Time Freeze / Telepathy / Foresight, represent the proven gameplay fact: clear Stage/Command success buffer `CA6A..CA73` before downstream resolution. No invented slot8 animation.\n\n### H. Sunglasses/Taiyoken\nImplement/protect exact rule: Sunglasses status bit `$08` causes Taiyoken `CA83=$81`; STANDARD_DAMAGE then bypasses Taiyoken cancellation and continues.\n\n## Tests required\n- category+handler dispatcher uniqueness\n- Support h00/h02 uses BG19; h0B/h0D/h0F does not\n- Support `$FF` palette not normalized to NONE\n- Kiai/Paralysis no card-resource start\n- Move changes BattleState position, presenter motion net=0\n- Defense selection preloads but does not start slot8\n- Taiyoken starts slot8; Shockwave does not\n- Barrier/Breath/EnergyAbsorb start slot8 on Beam special branch\n- Teleport/TimeFreeze do not start slot8 on defining branch\n- CA53=2 test includes Endurance/partial case\n- CA83=40 zeroes Stage success flags\n- Sunglasses counter path marks Taiyoken `$81` and attack continues\n- Engine/EventLog/RNG unchanged by presentation cutover\n\n## Do not invent\n`ACTOR_HOME`, `TARGET_HOME`, `CONTACT_POINT`, semantic ActionObject binding, or universal absolute coordinates remain outside V5.\n'''
(OUT/'AGENT_HANDOFF_V5.md').write_text(handoff,encoding='utf8')

open_items='''# Open Items after V5\n\n## Static, high-value\n1. Finish semantic classification of the card-ID-indexed Support load from `Bank00:$2C30` / Banks `$6B+` without guessing.\n2. Decode remaining exact human visual meaning of Support macros `$2B/$2C/$34/$35` only where physical actor/object binding can be proven.\n3. Audit whether any additional category-specific path consumes the preloaded Teleport `$28` or Time Freeze `$2A` resources outside the defining Defense routes; current global slot8-start search says no.\n4. Finish Beam/Defense result macro integration using numeric `romCA53` plus EventLog semantic outcome.\n5. Import V4/V5 generated ROM-derived assets into repo only if provenance/checksum policy permits; never treat inspection alpha as GBC transparency.\n\n## Dynamic only\n- semantic ActionObject slot binding\n- ACTOR_HOME / TARGET_HOME / CONTACT_POINT\n- handler-specific absolute actor anchors where static evidence remains insufficient\n- multi-actor special binding\n\n## Closed by V5\n- Support dispatcher and visual-family split\n- common Support BG `$19` format\n- `$FF` Support palette behavior\n- Move state/presentation separation\n- Defense slot8 preload/start boundary\n- exact Defense card CA83 mapping\n- Sunglasses ↔ Taiyoken counter\n- CA83 `$40` Stage-success suppression\n- Bank68 `$1A` assignment to CHARA/Gather\n'''
(OUT/'OPEN_ITEMS_V5.md').write_text(open_items,encoding='utf8')

readme='''# DBZ LSW ROM Research V5 — Support + Defense\n\nStatic reverse-engineering handoff for the canonical USA ROM.\n\nRead in order:\n1. `REPORT.md`\n2. `LEDGER.md`\n3. `AGENT_HANDOFF_V5.md`\n4. `OPEN_ITEMS_V5.md`\n5. `data/` and `proof/`\n\nThis package does not contain the ROM. `scripts/extract_v5_support_defense.py` expects the canonical ROM supplied separately and checks its SHA-256.\n\nV5 supersedes older global assumptions about handler identity, palette `$FF`, CA53=2, Defense resource playback, and unresolved Bank68:$1A.\n'''
(OUT/'README.md').write_text(readme,encoding='utf8')

# package manifest
manifest={'package':'DBZ_LSW_ROM_RESEARCH_V5_SUPPORT_DEFENSE','version':'V5','date':'2026-08-23','romSha256':SHA,'scope':['Support visual FSM','Defense visual FSM','Move','AnimationSlot8','CA83/CA53','Taiyoken/Sunglasses','Stage suppression','Bank68 aux BG'], 'fileCountBeforeChecksums':sum(1 for p in OUT.rglob('*') if p.is_file())}
(OUT/'PACKAGE_MANIFEST.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')

# checksums of package contents except checksum itself
files=sorted(p for p in OUT.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt')
lines=[]
for p in files:
 lines.append(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(OUT).as_posix()}")
(OUT/'SHA256SUMS.txt').write_text('\n'.join(lines)+'\n',encoding='utf8')
print('built',OUT,'files',sum(1 for p in OUT.rglob('*') if p.is_file()))
