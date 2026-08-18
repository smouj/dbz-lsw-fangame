from pathlib import Path
import csv, math, wave, struct, json
import numpy as np

ROOT=Path('/mnt/data/DBZ_LSW_GBC_AUDIO_EXTRACTION_V1')
FPS=59.7275005696
SR=44100
OUT=ROOT/'wav_sfx_44100_mono'; OUT.mkdir(exist_ok=True)

class Pulse2:
    def __init__(self):
        self.nr21=0; self.nr22=0; self.nr23=0; self.nr24=0
        self.enabled=False; self.phase=0.0; self.env_vol=0; self.env_acc=0.0
        self.length=0.0
    @property
    def duty(self): return [0.125,0.25,0.5,0.75][(self.nr21>>6)&3]
    @property
    def freq(self):
        x=((self.nr24&7)<<8)|self.nr23
        return 131072.0/max(1,2048-x)
    def write(self,a,v):
        if a==0xFF16: self.nr21=v
        elif a==0xFF17:
            self.nr22=v
            if (v&0xF8)==0:self.enabled=False
        elif a==0xFF18:self.nr23=v
        elif a==0xFF19:
            self.nr24=v
            if v&0x80:self.trigger()
    def trigger(self):
        if (self.nr22&0xF8)==0:self.enabled=False;return
        self.enabled=True;self.env_vol=(self.nr22>>4)&15;self.env_acc=0.0
        if self.length<=0:self.length=float(64-(self.nr21&0x3F) or 64)
        self.phase=0.0
    def tick_control(self,dt):
        if not self.enabled:return
        # envelope clock 64 Hz; period 0 behaves as 8 for timing
        per=self.nr22&7
        if per:
            self.env_acc+=dt
            step=per/64.0
            while self.env_acc>=step:
                self.env_acc-=step
                if self.nr22&8:
                    if self.env_vol<15:self.env_vol+=1
                else:
                    if self.env_vol>0:self.env_vol-=1
        if self.nr24&0x40:
            self.length-=256.0*dt
            if self.length<=0:self.enabled=False
    def render(self,n):
        if not self.enabled or self.env_vol<=0:return np.zeros(n,dtype=np.float32)
        f=min(self.freq,SR/2-1)
        inc=f/SR
        phases=(self.phase+inc*np.arange(n,dtype=np.float64))%1.0
        y=np.where(phases<self.duty,1.0,-1.0).astype(np.float32)*(self.env_vol/15.0)
        self.phase=(self.phase+inc*n)%1.0
        return y

class Noise4:
    def __init__(self):
        self.nr41=0;self.nr42=0;self.nr43=0;self.nr44=0
        self.enabled=False;self.env_vol=0;self.env_acc=0.0;self.length=0.0
        self.lfsr=0x7FFF;self.noise_phase=0.0
    @property
    def freq(self):
        r=self.nr43&7; s=(self.nr43>>4)&15
        div=0.5 if r==0 else float(r)
        return 262144.0/(div*(2**s))
    def write(self,a,v):
        if a==0xFF20:self.nr41=v
        elif a==0xFF21:
            self.nr42=v
            if (v&0xF8)==0:self.enabled=False
        elif a==0xFF22:self.nr43=v
        elif a==0xFF23:
            self.nr44=v
            if v&0x80:self.trigger()
    def trigger(self):
        if (self.nr42&0xF8)==0:self.enabled=False;return
        self.enabled=True;self.env_vol=(self.nr42>>4)&15;self.env_acc=0.0;self.lfsr=0x7FFF;self.noise_phase=0.0
        if self.length<=0:self.length=float(64-(self.nr41&0x3F) or 64)
    def tick_control(self,dt):
        if not self.enabled:return
        per=self.nr42&7
        if per:
            self.env_acc+=dt;step=per/64.0
            while self.env_acc>=step:
                self.env_acc-=step
                if self.nr42&8:
                    if self.env_vol<15:self.env_vol+=1
                else:
                    if self.env_vol>0:self.env_vol-=1
        if self.nr44&0x40:
            self.length-=256.0*dt
            if self.length<=0:self.enabled=False
    def render(self,n):
        y=np.zeros(n,dtype=np.float32)
        if not self.enabled or self.env_vol<=0:return y
        # We sample the LFSR at audio rate. Very high hardware clocks are clamped to Nyquist;
        # this preserves the noise character without pretending to be an analog reconstruction.
        freq=min(self.freq,SR/2-1); inc=freq/SR; amp=self.env_vol/15.0
        width7=bool(self.nr43&8)
        ph=self.noise_phase;l=self.lfsr
        for i in range(n):
            ph+=inc
            if ph>=1.0:
                ph-=1.0
                bit=(l&1)^((l>>1)&1)
                l=(l>>1)|(bit<<14)
                if width7:l=(l&~0x40)|(bit<<6)
            y[i]=(1.0 if (l&1)==0 else -1.0)*amp
        self.noise_phase=ph;self.lfsr=l
        return y

def load_events(path):
    ev={}
    with path.open(newline='',encoding='utf-8') as f:
        for r in csv.DictReader(f):
            fr=int(r['frame']);ev.setdefault(fr,[]).append((int(r['apu_register'],16),int(r['value'],16)))
    return ev

def render_one(row):
    sid=int(row['sfx_id']);frames=int(row['duration_frames']);ev=load_events(ROOT/row['trace_file'])
    p=Pulse2();n=Noise4(); parts=[]
    sample_acc=0.0; produced=0
    for fr in range(frames+3):
        for a,v in ev.get(fr,[]):
            p.write(a,v); n.write(a,v)
        sample_acc += SR/FPS
        target=int(round(sample_acc)); ns=target-produced; produced=target
        yp=p.render(ns); yn=n.render(ns)
        y=(yp+yn)*0.45
        parts.append(y)
        dt=ns/SR;p.tick_control(dt);n.tick_control(dt)
    audio=np.concatenate(parts) if parts else np.zeros(1,dtype=np.float32)
    peak=float(np.max(np.abs(audio))) if len(audio) else 0.0
    if peak>0:audio=audio*(0.88/peak)
    pcm=np.clip(audio,-1,1);pcm=(pcm*32767).astype('<i2')
    path=OUT/f'sfx_{sid:03d}.wav'
    with wave.open(str(path),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
    return path,len(pcm)/SR,peak,float(np.sqrt(np.mean(audio.astype(np.float64)**2)))

def main():
    rows=list(csv.DictReader((ROOT/'sfx_catalog.csv').open(encoding='utf-8')))
    results=[]
    for r in rows:
        path,dur,peak,rms=render_one(r)
        results.append({'sfx_id':int(r['sfx_id']),'wav':path.name,'duration_seconds':round(dur,6),'pre_normalize_peak':peak,'post_normalize_rms':rms})
        print(r['sfx_id'],path.name,round(dur,3),round(rms,4))
    (ROOT/'wav_render_report.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
if __name__=='__main__':main()
