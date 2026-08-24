from pathlib import Path
import csv, json, hashlib

ROM_PATH=Path('/mnt/data/Dragon Ball Z - Legendary Super Warriors (USA)(2).gbc')
CARD_PATH=Path('/mnt/data/dbz_lsw_rom_taxonomy/card_animation_taxonomy_125.csv')
OUT=Path('/mnt/data/DBZ_LSW_ROM_RESEARCH_V4_FX/data')
rom=ROM_PATH.read_bytes()

def off(bank,addr):
    return bank*0x4000 + (addr if bank==0 else addr-0x4000)

def u16(bank,addr):
    o=off(bank,addr); return rom[o] | (rom[o+1]<<8)

def resolve(bank,idx):
    ent=0x4008+idx*4
    q=u16(bank,ent)
    return 0x4000+q*4

def fx_bank_local(fid):
    return 0x65 + fid//0x1E, fid%0x1E

def pal_bgr555(pid):
    addr=0x6E00+pid*8
    o=off(0x30,addr)
    raw=rom[o:o+8]
    cols=[]
    for i in range(0,8,2):
        v=raw[i]|raw[i+1]<<8
        r=v&31; g=(v>>5)&31; b=(v>>10)&31
        cols.append({'bgr555':f'0x{v:04X}','r5':r,'g5':g,'b5':b,
                     'rgb8':[round(r*255/31),round(g*255/31),round(b*255/31)]})
    return addr,raw.hex(),cols

cards=[]
with CARD_PATH.open(encoding='utf-8') as f:
    for row in csv.DictReader(f):
        row['cardId']=int(row['cardId']); row['handler']=int(row['handler']); row['animationResource']=int(row['animationResource']); row['fxResource']=int(row['fxResource']); row['palette']=int(row['palette']); row['power']=int(row['power'])
        cards.append(row)

fxids=sorted({c['fxResource'] for c in cards if c['fxResource']!=0xFF})
pals=sorted({c['palette'] for c in cards if c['palette']!=0xFF})

# descriptor address inventory for 30 slots per FX bank to estimate local span safely
bank_desc={}
for bank in range(0x65,0x69):
    arr=[]
    for idx in range(30):
        try:
            d=resolve(bank,idx)
        except Exception:
            continue
        if 0x4000<=d<0x8000:
            arr.append((idx,d))
    bank_desc[bank]=arr

results=[]
for fid in fxids:
    bank,local=fx_bank_local(fid)
    base=resolve(bank,local)
    side1=resolve(bank,local+1) if local+1<30 else None
    side2=resolve(bank,local+2) if local+2<30 else None
    bo=off(bank,base)
    tile_count=rom[bo]
    gfx_bytes=tile_count*16
    raw=rom[bo+1:bo+1+gfx_bytes]
    users=[c for c in cards if c['fxResource']==fid]
    pal_ids=sorted({c['palette'] for c in users if c['palette']!=0xFF})
    # bundle-map diagnostics: source descriptors should support at least 20*32 bytes if they are map strips.
    maps=[]
    for label,d in [('side1',side1),('side2',side2)]:
        if d is None:
            maps.append({'side':label,'descriptor':None,'first640Sha256':None,'firstBytes':None})
            continue
        o=off(bank,d); data=rom[o:o+640]
        maps.append({'side':label,'descriptor':f'0x{d:04X}','first640Sha256':hashlib.sha256(data).hexdigest(),'firstBytes':data[:32].hex()})
    results.append({
        'fxResource':fid,'fxHex':f'0x{fid:02X}','bank':bank,'bankHex':f'0x{bank:02X}','localIndex':local,
        'baseDescriptor':base,'baseDescriptorHex':f'0x{base:04X}','graphicsTileCount':tile_count,'graphicsBytes':gfx_bytes,
        'graphicsSha256':hashlib.sha256(raw).hexdigest(),'side1Descriptor':side1,'side1DescriptorHex':f'0x{side1:04X}' if side1 else None,
        'side2Descriptor':side2,'side2DescriptorHex':f'0x{side2:04X}' if side2 else None,
        'paletteIds':pal_ids,'cardCount':len(users),'cards':[{'cardId':c['cardId'],'name':c['name'],'category':c['categoryName'],'handler':c['handler'],'palette':c['palette']} for c in users],
        'maps':maps
    })

# palettes
palette_data=[]
for p in pals:
    a,raw,cols=pal_bgr555(p)
    palette_data.append({'paletteId':p,'paletteHex':f'0x{p:02X}','bank':'0x30','address':f'0x{a:04X}','raw':raw,'colors':cols})

# Per-card matrix, preserving category-dependent handler semantics.
card_matrix=[]
for c in cards:
    if c['fxResource']==0xFF: continue
    bank,local=fx_bank_local(c['fxResource'])
    rec=next(x for x in results if x['fxResource']==c['fxResource'])
    card_matrix.append({
        'cardId':c['cardId'],'name':c['name'],'category':c['categoryName'],'handler':c['handler'],'handlerHex':f"0x{c['handler']:02X}",
        'fxResource':c['fxResource'],'fxHex':f"0x{c['fxResource']:02X}",'fxBank':f'0x{bank:02X}','fxLocalIndex':local,
        'graphicsDescriptor':rec['baseDescriptorHex'],'graphicsTileCount':rec['graphicsTileCount'],
        'side1MapDescriptor':rec['side1DescriptorHex'],'side2MapDescriptor':rec['side2DescriptorHex'],
        'palette':c['palette'],'paletteHex':f"0x{c['palette']:02X}",'power':c['power']
    })

OUT.mkdir(parents=True,exist_ok=True)
(OUT/'fx_resources_exact_v4.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
(OUT/'fx_palettes_exact_v4.json').write_text(json.dumps(palette_data,indent=2),encoding='utf-8')
(OUT/'fx_card_matrix_v4.json').write_text(json.dumps(card_matrix,indent=2),encoding='utf-8')
with (OUT/'fx_resources_exact_v4.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.writer(f); w.writerow(['fxResource','fxHex','bank','localIndex','baseDescriptor','graphicsTileCount','graphicsBytes','side1Descriptor','side2Descriptor','paletteIds','cardCount','cards'])
    for x in results:
        w.writerow([x['fxResource'],x['fxHex'],x['bankHex'],x['localIndex'],x['baseDescriptorHex'],x['graphicsTileCount'],x['graphicsBytes'],x['side1DescriptorHex'],x['side2DescriptorHex'],' '.join(f'{p:02X}' for p in x['paletteIds']),x['cardCount'],'; '.join(f"#{c['cardId']} {c['name']}" for c in x['cards'])])
with (OUT/'fx_card_matrix_v4.csv').open('w',newline='',encoding='utf-8') as f:
    cols=list(card_matrix[0].keys()); w=csv.DictWriter(f,fieldnames=cols); w.writeheader();w.writerows(card_matrix)
print('non-FF FX resources',len(fxids),[f'{x:02X}' for x in fxids])
print('cards with FX',len(card_matrix))
print('non-FF palettes',len(pals),[f'{x:02X}' for x in pals])
for x in results:
    print(x['fxHex'],x['bankHex'],x['localIndex'],x['baseDescriptorHex'],'tiles',x['graphicsTileCount'],'maps',x['side1DescriptorHex'],x['side2DescriptorHex'],'cards',x['cardCount'])
