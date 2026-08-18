from pathlib import Path
import sys, copy, csv, json, hashlib
sys.path.insert(0,'/mnt/data')
from gb_trace import GB

ROM=Path('/mnt/data/Dragon Ball Z - Legendary Super Warriors (USA)(1).gbc')
OUT=Path('/mnt/data/DBZ_LSW_GBC_AUDIO_EXTRACTION_V1')
BANK_SE=0x79
FPS=59.7275005696
MAX_FRAMES=600

def call_vblank_audio(g):
    # bank 0 helper at 0x0319 loads C951, switches bank, calls 0x41B0, then restores bank
    g.rombank=1
    g.push(0xC0DE)
    g.PC=0x0319
    st=0
    while g.PC!=0xC0DE and st<500000:
        g.step(); st+=1
    if g.PC!=0xC0DE: raise RuntimeError('audio update did not return')

def main():
    rom=ROM.read_bytes()
    OUT.mkdir(exist_ok=True)
    rawdir=OUT/'raw_sfx_sequences'; rawdir.mkdir(exist_ok=True)
    trdir=OUT/'apu_traces'; trdir.mkdir(exist_ok=True)
    base=BANK_SE*0x4000
    hdr=rom[base+0x1000:base+0x1004]
    if hdr[:2]!=b'SE': raise RuntimeError(f'Unexpected SE header {hdr!r}')
    first_ptr=int.from_bytes(rom[base+0x1004:base+0x1006],'little')
    count=(first_ptr-4)//2
    ptrs=[int.from_bytes(rom[base+0x1004+2*i:base+0x1006+2*i],'little') for i in range(count)]
    assert count==85 and all(ptrs[i]<ptrs[i+1] for i in range(count-1))
    # last entry ends at first F8 command byte after its start, inclusive; then padding zeros.
    last_start=base+0x1000+ptrs[-1]
    f8=rom.find(b'\xF8',last_start,last_start+0x200)
    last_end=f8+1 if f8!=-1 else last_start+0x100
    ends=[base+0x1000+p for p in ptrs[1:]]+[last_end]

    # Boot once through the game's own driver initialization.
    baseg=GB(rom); baseg.run_cycles(70224*10)
    # Engine should have selected driver bank 0x75 and SE idle marker FF.
    rows=[]
    for sid,(p,end) in enumerate(zip(ptrs,ends)):
        start=base+0x1000+p
        data=rom[start:end]
        (rawdir/f'sfx_{sid:03d}.bin').write_bytes(data)
        g=copy.deepcopy(baseg)
        g.apu_log=[]
        g.write(0xC878,sid)  # pending SE request consumed by bank 0x79 routine 0x4120
        frame_events=[]; ended=False; end_frame=None
        for frame in range(MAX_FRAMES):
            before=len(g.apu_log)
            call_vblank_audio(g)
            new=g.apu_log[before:]
            for cyc,bnk,pc,addr,val,stack in new:
                frame_events.append((frame,cyc,bnk,pc,addr,val))
            # C87A == FF is the driver's idle/end marker after a started SE.
            if frame>=1 and g.read(0xC87A)==0xFF:
                ended=True; end_frame=frame+1; break
        if end_frame is None: end_frame=MAX_FRAMES
        # channels inferred from actual APU writes
        addrs={e[4] for e in frame_events}
        chans=[]
        if any(0xFF10<=a<=0xFF14 for a in addrs): chans.append('CH1_PULSE_SWEEP')
        if any(0xFF16<=a<=0xFF19 for a in addrs): chans.append('CH2_PULSE')
        if any((0xFF1A<=a<=0xFF1E) or (0xFF30<=a<=0xFF3F) for a in addrs): chans.append('CH3_WAVE')
        if any(0xFF20<=a<=0xFF23 for a in addrs): chans.append('CH4_NOISE')
        with (trdir/f'sfx_{sid:03d}.csv').open('w',newline='',encoding='utf-8') as f:
            w=csv.writer(f); w.writerow(['frame','gbc_seconds','cpu_cycles','rom_bank','pc','apu_register','value'])
            for fr,cy,bnk,pc,a,v in frame_events:
                w.writerow([fr,f'{fr/FPS:.9f}',cy,f'{bnk:02X}',f'{pc:04X}',f'{a:04X}',f'{v:02X}'])
        rows.append({
            'sfx_id':sid,'id_hex':f'0x{sid:02X}','rom_bank':'0x79',
            'sequence_cpu_address':f'0x{0x5000+p:04X}','sequence_file_offset':f'0x{start:06X}',
            'sequence_bytes':len(data),'sequence_sha256':hashlib.sha256(data).hexdigest(),
            'duration_frames':end_frame,'duration_seconds':round(end_frame/FPS,6),
            'ended_naturally':ended,'looping_or_long':not ended,
            'apu_writes':len(frame_events),'channels':'+'.join(chans) if chans else 'NONE',
            'raw_file':f'raw_sfx_sequences/sfx_{sid:03d}.bin','trace_file':f'apu_traces/sfx_{sid:03d}.csv'
        })
        print(sid, rows[-1]['duration_frames'], rows[-1]['ended_naturally'], rows[-1]['apu_writes'], rows[-1]['channels'])
    with (OUT/'sfx_catalog.csv').open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
    (OUT/'sfx_catalog.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False),encoding='utf-8')
    info={
      'source_rom':ROM.name,'rom_size':len(rom),
      'sha256':hashlib.sha256(rom).hexdigest(),'md5':hashlib.md5(rom).hexdigest(),
      'header_title':rom[0x134:0x144].rstrip(b'\0').decode('latin-1','replace'),
      'cartridge_type':f'0x{rom[0x147]:02X}','cgb_flag':f'0x{rom[0x143]:02X}',
      'audio_driver':{'banks_with_common_driver':['0x75','0x76','0x77','0x78','0x79'],
                      'driver_init':'bank 0x75:0x4015 / 0x4067','frame_update':'banked 0x41B0 via bank0:0x0319',
                      'sfx_bank':'0x79','sfx_header_cpu':'0x5000','sfx_pointer_table_cpu':'0x5004',
                      'sfx_request_ram':'0xC878','sfx_start_routine':'bank 0x79:0x4120','sfx_count':count},
      'gbc_fps_used':FPS,'max_probe_frames_per_sfx':MAX_FRAMES
    }
    (OUT/'rom_audio_info.json').write_text(json.dumps(info,indent=2),encoding='utf-8')

if __name__=='__main__': main()
