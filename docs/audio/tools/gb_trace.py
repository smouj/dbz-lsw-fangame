from pathlib import Path
from collections import Counter, deque
import sys, struct

Z,N,H,C = 0x80,0x40,0x20,0x10

class GB:
    def __init__(self, rom):
        self.rom=rom; self.rom_banks=len(rom)//0x4000
        self.ram=bytearray(16*0x2000)
        self.vram=[bytearray(0x2000),bytearray(0x2000)]
        self.wram=[bytearray(0x1000) for _ in range(8)]
        self.oam=bytearray(0xA0); self.hram=bytearray(0x7F); self.io=bytearray(0x80)
        self.rombank=1; self.rambank=0; self.ramen=False; self.vbk=0; self.svbk=1
        self.A=0x11; self.F=0x80; self.B=0; self.C=0; self.D=0xFF; self.E=0x56; self.H=0; self.L=0x0D
        self.SP=0xFFFE; self.PC=0x0100
        self.ime=False; self.ime_delay=0; self.halted=False; self.stopped=False
        self.cycles=0; self.line_cycles=0; self.div_cycles=0; self.tima_cycles=0
        self.double_speed=False; self.key1_prepare=False
        self.joy=0xFF # low 8 bits: 0 pressed? We'll compose separately
        self.buttons={k:False for k in ['right','left','up','down','a','b','select','start']}
        self.apu_log=[]; self.write_log=[]; self.callstack=[]; self.trace_ring=deque(maxlen=128)
        self.io[0x00]=0xCF; self.io[0x05]=0; self.io[0x06]=0; self.io[0x07]=0
        self.io[0x0F]=0xE1; self.io[0x40]=0x91; self.io[0x41]=0x85; self.io[0x44]=0
        self.io[0x47]=0xFC; self.io[0x48]=0xFF; self.io[0x49]=0xFF; self.io[0x4D]=0x7E
        self.io[0x4F]=0xFE; self.io[0x70]=0xF8|1
        self.IE=0
        self.invalid=[]
    def af(self): return (self.A<<8)|self.F
    def bc(self): return (self.B<<8)|self.C
    def de(self): return (self.D<<8)|self.E
    def hl(self): return (self.H<<8)|self.L
    def set_bc(self,v): self.B=(v>>8)&255; self.C=v&255
    def set_de(self,v): self.D=(v>>8)&255; self.E=v&255
    def set_hl(self,v): self.H=(v>>8)&255; self.L=v&255
    def set_af(self,v): self.A=(v>>8)&255; self.F=v&0xF0
    def rp(self,p): return [self.bc(),self.de(),self.hl(),self.SP][p]
    def set_rp(self,p,v):
        v&=0xffff
        if p==0:self.set_bc(v)
        elif p==1:self.set_de(v)
        elif p==2:self.set_hl(v)
        else:self.SP=v
    def rp2(self,p): return [self.bc(),self.de(),self.hl(),self.af()][p]
    def set_rp2(self,p,v):
        if p==0:self.set_bc(v)
        elif p==1:self.set_de(v)
        elif p==2:self.set_hl(v)
        else:self.set_af(v)
    def cur_bank(self):
        return 0 if self.PC<0x4000 else self.rombank if self.PC<0x8000 else -1
    def read(self,a):
        a&=0xffff
        if a<0x4000:return self.rom[a]
        if a<0x8000:
            off=(self.rombank%self.rom_banks)*0x4000+(a-0x4000); return self.rom[off]
        if a<0xA000:return self.vram[self.vbk][a-0x8000]
        if a<0xC000:return self.ram[(self.rambank%16)*0x2000+a-0xA000] if self.ramen else 0xFF
        if a<0xD000:return self.wram[0][a-0xC000]
        if a<0xE000:return self.wram[self.svbk][a-0xD000]
        if a<0xFE00:return self.read(a-0x2000)
        if a<0xFEA0:return self.oam[a-0xFE00]
        if a<0xFF00:return 0xFF
        if a==0xFFFF:return self.IE
        if a>=0xFF80:return self.hram[a-0xFF80]
        r=a&0x7F
        if a==0xFF00:
            sel=self.io[0]
            lo=0x0F
            if not(sel&0x10):
                # directions: right left up down bits0-3 active low
                for bit,k in enumerate(['right','left','up','down']):
                    if self.buttons[k]: lo &= ~(1<<bit)
            if not(sel&0x20):
                for bit,k in enumerate(['a','b','select','start']):
                    if self.buttons[k]: lo &= ~(1<<bit)
            return (sel&0x30)|0xC0|lo
        if a==0xFF4D:return (0x80 if self.double_speed else 0)|(1 if self.key1_prepare else 0)|0x7E
        if a==0xFF4F:return 0xFE|self.vbk
        if a==0xFF70:return 0xF8|self.svbk
        return self.io[r]
    def write(self,a,v):
        a&=0xffff; v&=255
        if a<0x2000:
            self.ramen=((v&0x0F)==0x0A); return
        if a<0x3000:
            self.rombank=(self.rombank&0x100)|v
            if self.rombank>=self.rom_banks:self.rombank%=self.rom_banks
            return
        if a<0x4000:
            self.rombank=((v&1)<<8)|(self.rombank&0xFF)
            if self.rombank>=self.rom_banks:self.rombank%=self.rom_banks
            return
        if a<0x6000:
            self.rambank=v&0x0F; return
        if a<0x8000:return
        if a<0xA000:self.vram[self.vbk][a-0x8000]=v; return
        if a<0xC000:
            if self.ramen:self.ram[(self.rambank%16)*0x2000+a-0xA000]=v
            return
        if a<0xD000:self.wram[0][a-0xC000]=v; return
        if a<0xE000:self.wram[self.svbk][a-0xD000]=v; return
        if a<0xFE00:self.write(a-0x2000,v); return
        if a<0xFEA0:self.oam[a-0xFE00]=v; return
        if a<0xFF00:return
        if a==0xFFFF:self.IE=v; return
        if a>=0xFF80:self.hram[a-0xFF80]=v; return
        r=a&0x7f
        if 0xFF10<=a<=0xFF3F:
            self.apu_log.append((self.cycles,self.cur_bank(),self.PC,a,v,tuple(self.callstack[-8:])))
        self.write_log.append((self.cycles,self.cur_bank(),self.PC,a,v)) if a in (0xFF0F,0xFF40,0xFF41,0xFF46,0xFF4D,0xFF4F,0xFF55,0xFF70) else None
        if a==0xFF04:self.io[r]=0; self.div_cycles=0; return
        if a==0xFF46:
            base=v<<8
            for i in range(0xA0): self.oam[i]=self.read(base+i)
            self.io[r]=v; return
        if a==0xFF4D:self.key1_prepare=bool(v&1); return
        if a==0xFF4F:self.vbk=v&1; self.io[r]=0xFE|self.vbk; return
        if a==0xFF70:self.svbk=v&7 or 1; self.io[r]=0xF8|self.svbk; return
        if a==0xFF55:
            # perform General/HDMA immediately (good enough for logic)
            src=((self.io[0x51]<<8)|(self.io[0x52]&0xF0))&0xFFF0
            dst=0x8000|(((self.io[0x53]&0x1F)<<8)|(self.io[0x54]&0xF0))
            blocks=(v&0x7F)+1
            for i in range(blocks*0x10):
                if 0x8000<=((dst+i)&0xFFFF)<0xA000:self.vram[self.vbk][((dst+i)-0x8000)&0x1FFF]=self.read((src+i)&0xFFFF)
            self.io[0x55]=0xFF; return
        self.io[r]=v
    def fetch8(self):v=self.read(self.PC);self.PC=(self.PC+1)&0xffff;return v
    def fetch16(self):lo=self.fetch8();return lo|(self.fetch8()<<8)
    def push(self,v):
        self.SP=(self.SP-1)&0xffff; self.write(self.SP,(v>>8)&255)
        self.SP=(self.SP-1)&0xffff; self.write(self.SP,v&255)
    def pop(self):
        lo=self.read(self.SP); self.SP=(self.SP+1)&0xffff; hi=self.read(self.SP); self.SP=(self.SP+1)&0xffff; return lo|(hi<<8)
    def r8(self,i):
        if i==0:return self.B
        if i==1:return self.C
        if i==2:return self.D
        if i==3:return self.E
        if i==4:return self.H
        if i==5:return self.L
        if i==6:return self.read(self.hl())
        return self.A
    def set_r8(self,i,v):
        v&=255
        if i==0:self.B=v
        elif i==1:self.C=v
        elif i==2:self.D=v
        elif i==3:self.E=v
        elif i==4:self.H=v
        elif i==5:self.L=v
        elif i==6:self.write(self.hl(),v)
        else:self.A=v
    def cond(self,i):
        return [not(self.F&Z),bool(self.F&Z),not(self.F&C),bool(self.F&C)][i]
    def add8(self,a,b,carry=0):
        r=a+b+carry; self.F=(Z if (r&255)==0 else 0)|(H if ((a&15)+(b&15)+carry)>15 else 0)|(C if r>255 else 0); return r&255
    def sub8(self,a,b,carry=0):
        r=a-b-carry; self.F=N|(Z if (r&255)==0 else 0)|(H if (a&15)<((b&15)+carry) else 0)|(C if a<(b+carry) else 0); return r&255
    def alu(self,y,v):
        if y==0:self.A=self.add8(self.A,v)
        elif y==1:self.A=self.add8(self.A,v,1 if self.F&C else 0)
        elif y==2:self.A=self.sub8(self.A,v)
        elif y==3:self.A=self.sub8(self.A,v,1 if self.F&C else 0)
        elif y==4:self.A&=v; self.F=(Z if self.A==0 else 0)|H
        elif y==5:self.A^=v; self.F=Z if self.A==0 else 0
        elif y==6:self.A|=v; self.F=Z if self.A==0 else 0
        else:
            a=self.A; self.sub8(a,v)
    def daa(self):
        a=self.A; adj=0; carry=bool(self.F&C)
        if not(self.F&N):
            if (self.F&H) or (a&0xF)>9: adj|=0x06
            if carry or a>0x99: adj|=0x60; carry=True
            a=(a+adj)&255
        else:
            if self.F&H:adj|=0x06
            if carry:adj|=0x60
            a=(a-adj)&255
        self.A=a; self.F=(self.F&N)|(C if carry else 0)|(Z if a==0 else 0)
    def cb(self,op):
        x=op>>6;y=(op>>3)&7;z=op&7;v=self.r8(z); cyc=16 if z==6 else 8
        if x==0:
            c=0
            if y==0:c=(v>>7)&1; v=((v<<1)|c)&255
            elif y==1:c=v&1; v=((c<<7)|(v>>1))&255
            elif y==2:
                oldc=1 if self.F&C else 0;c=(v>>7)&1;v=((v<<1)|oldc)&255
            elif y==3:
                oldc=1 if self.F&C else 0;c=v&1;v=((oldc<<7)|(v>>1))&255
            elif y==4:c=(v>>7)&1;v=(v<<1)&255
            elif y==5:c=v&1;v=((v&0x80)|(v>>1))&255
            elif y==6:v=((v<<4)|(v>>4))&255;c=0
            else:c=v&1;v=(v>>1)&255
            self.set_r8(z,v); self.F=(Z if v==0 else 0)|(C if c else 0); return cyc
        if x==1:
            self.F=(self.F&C)|H|(Z if not(v&(1<<y)) else 0); return 12 if z==6 else 8
        if x==2:v &= ~(1<<y)
        else:v |= 1<<y
        self.set_r8(z,v); return cyc
    def step(self):
        # interrupt dispatch
        pending=self.IE & self.io[0x0F] & 0x1F
        if self.halted and pending:self.halted=False
        if self.ime and pending:
            bit=(pending & -pending).bit_length()-1
            self.ime=False; self.io[0x0F]&=~(1<<bit); self.push(self.PC); self.PC=[0x40,0x48,0x50,0x58,0x60][bit]
            self.tick(20); return 20
        if self.halted:
            self.tick(4); return 4
        pc0=self.PC; bank0=self.cur_bank(); op=self.fetch8(); self.trace_ring.append((self.cycles,bank0,pc0,op,self.A,self.F,self.bc(),self.de(),self.hl(),self.SP,self.rombank))
        x=op>>6;y=(op>>3)&7;z=op&7;p=y>>1;q=y&1;cy=4
        if x==0:
            if z==0:
                if y==0:cy=4
                elif y==1:
                    a=self.fetch16(); self.write(a,self.SP&255);self.write((a+1)&0xffff,self.SP>>8);cy=20
                elif y==2:
                    _=self.fetch8();
                    if self.key1_prepare:self.double_speed=not self.double_speed;self.key1_prepare=False
                    cy=4
                elif y==3:
                    d=self.fetch8(); d=d-256 if d&128 else d; self.PC=(self.PC+d)&0xffff;cy=12
                else:
                    d=self.fetch8(); d=d-256 if d&128 else d
                    if self.cond(y-4):self.PC=(self.PC+d)&0xffff;cy=12
                    else:cy=8
            elif z==1:
                if q==0:self.set_rp(p,self.fetch16());cy=12
                else:
                    a=self.hl();b=self.rp(p);r=a+b; f=self.F&Z; f|=H if ((a&0xFFF)+(b&0xFFF))>0xFFF else 0; f|=C if r>0xFFFF else 0;self.F=f;self.set_hl(r);cy=8
            elif z==2:
                addr=[self.bc(),self.de(),self.hl(),self.hl()][p]
                if q==0:self.write(addr,self.A)
                else:self.A=self.read(addr)
                if p==2:self.set_hl((self.hl()+1)&0xffff)
                elif p==3:self.set_hl((self.hl()-1)&0xffff)
                cy=8
            elif z==3:
                self.set_rp(p,(self.rp(p)+(1 if q==0 else -1))&0xffff);cy=8
            elif z==4:
                v=self.r8(y);r=(v+1)&255; self.F=(self.F&C)|(Z if r==0 else 0)|(H if (v&15)==15 else 0);self.set_r8(y,r);cy=12 if y==6 else 4
            elif z==5:
                v=self.r8(y);r=(v-1)&255; self.F=(self.F&C)|N|(Z if r==0 else 0)|(H if (v&15)==0 else 0);self.set_r8(y,r);cy=12 if y==6 else 4
            elif z==6:
                self.set_r8(y,self.fetch8());cy=12 if y==6 else 8
            else:
                if y==0:
                    c=(self.A>>7)&1;self.A=((self.A<<1)|c)&255;self.F=C if c else 0
                elif y==1:
                    c=self.A&1;self.A=((c<<7)|(self.A>>1))&255;self.F=C if c else 0
                elif y==2:
                    old=1 if self.F&C else 0;c=(self.A>>7)&1;self.A=((self.A<<1)|old)&255;self.F=C if c else 0
                elif y==3:
                    old=1 if self.F&C else 0;c=self.A&1;self.A=((old<<7)|(self.A>>1))&255;self.F=C if c else 0
                elif y==4:self.daa()
                elif y==5:self.A^=255;self.F=(self.F&(Z|C))|N|H
                elif y==6:self.F=(self.F&Z)|C
                else:self.F=(self.F&Z)|(0 if self.F&C else C)
                cy=4
        elif x==1:
            if y==6 and z==6:self.halted=True;cy=4
            else:self.set_r8(y,self.r8(z));cy=8 if (y==6 or z==6) else 4
        elif x==2:
            self.alu(y,self.r8(z));cy=8 if z==6 else 4
        else:
            if z==0:
                if y<4:
                    if self.cond(y): self.PC=self.pop(); cy=20
                    else:cy=8
                elif y==4:self.write(0xFF00+self.fetch8(),self.A);cy=12
                elif y==5:
                    d=self.fetch8();d=d-256 if d&128 else d;sp=self.SP;r=(sp+d)&0xffff;self.F=(H if ((sp&15)+(d&15))>15 else 0)|(C if ((sp&255)+(d&255))>255 else 0);self.SP=r;cy=16
                elif y==6:self.A=self.read(0xFF00+self.fetch8());cy=12
                else:
                    d=self.fetch8();d=d-256 if d&128 else d;sp=self.SP;r=(sp+d)&0xffff;self.F=(H if ((sp&15)+(d&15))>15 else 0)|(C if ((sp&255)+(d&255))>255 else 0);self.set_hl(r);cy=12
            elif z==1:
                if q==0:self.set_rp2(p,self.pop());cy=12
                else:
                    if p==0:self.PC=self.pop();cy=16
                    elif p==1:self.PC=self.pop();self.ime=True;cy=16
                    elif p==2:self.PC=self.hl();cy=4
                    else:self.SP=self.hl();cy=8
            elif z==2:
                if y<4:
                    a=self.fetch16();
                    if self.cond(y):self.PC=a;cy=16
                    else:cy=12
                elif y==4:self.write(0xFF00+self.C,self.A);cy=8
                elif y==5:self.write(self.fetch16(),self.A);cy=16
                elif y==6:self.A=self.read(0xFF00+self.C);cy=8
                else:self.A=self.read(self.fetch16());cy=16
            elif z==3:
                if y==0:self.PC=self.fetch16();cy=16
                elif y==1:cy=self.cb(self.fetch8())
                elif y==6:self.ime=False;cy=4
                elif y==7:self.ime_delay=2;cy=4
                else:
                    self.invalid.append((bank0,pc0,op));cy=4
            elif z==4:
                if y<4:
                    a=self.fetch16()
                    if self.cond(y):self.push(self.PC);self.callstack.append((bank0,pc0,self.PC));self.PC=a;cy=24
                    else:cy=12
                else:self.invalid.append((bank0,pc0,op));cy=4
            elif z==5:
                if q==0:self.push(self.rp2(p));cy=16
                elif p==0:
                    a=self.fetch16();self.push(self.PC);self.callstack.append((bank0,pc0,self.PC));self.PC=a;cy=24
                else:self.invalid.append((bank0,pc0,op));cy=4
            elif z==6:self.alu(y,self.fetch8());cy=8
            else:
                self.push(self.PC);self.callstack.append((bank0,pc0,self.PC));self.PC=y*8;cy=16
        # crude return stack maintenance when executing RET handled by detecting opcodes after execution
        if op in (0xC9,0xD9) or (op in (0xC0,0xC8,0xD0,0xD8) and self.PC!=((pc0+1)&0xffff)):
            if self.callstack:self.callstack.pop()
        if self.ime_delay:
            self.ime_delay-=1
            if self.ime_delay==0:self.ime=True
        self.tick(cy);return cy
    def tick(self,cy):
        self.cycles+=cy
        # DIV/TIMA CPU clock; in double speed PPU effectively half relative CPU, but ignore for now
        self.div_cycles+=cy
        while self.div_cycles>=256:self.div_cycles-=256;self.io[0x04]=(self.io[0x04]+1)&255
        tac=self.io[0x07]
        if tac&4:
            period=[1024,16,64,256][tac&3];self.tima_cycles+=cy
            while self.tima_cycles>=period:
                self.tima_cycles-=period
                if self.io[0x05]==0xFF:self.io[0x05]=self.io[0x06];self.io[0x0F]|=4
                else:self.io[0x05]=(self.io[0x05]+1)&255
        # PPU line timing
        if self.io[0x40]&0x80:
            self.line_cycles+=cy if not self.double_speed else cy//2
            while self.line_cycles>=456:
                self.line_cycles-=456; old=self.io[0x44]; ly=(old+1)%154; self.io[0x44]=ly
                if ly==144:self.io[0x0F]|=1
                # LYC coincidence / STAT IRQ rough
                if ly==self.io[0x45]:
                    self.io[0x41]|=4
                    if self.io[0x41]&0x40:self.io[0x0F]|=2
                else:self.io[0x41]&=~4
        else:self.io[0x44]=0;self.line_cycles=0
    def run_cycles(self,n,max_steps=100000000):
        target=self.cycles+n;steps=0
        while self.cycles<target and steps<max_steps:
            self.step();steps+=1
        return steps
    def press(self,k,frames=1):
        self.buttons[k]=True; self.io[0x0F]|=0x10
        self.run_cycles(70224*frames)
        self.buttons[k]=False; self.run_cycles(70224)

def main():
    rom=Path(sys.argv[1]).read_bytes(); g=GB(rom)
    frames=int(sys.argv[2]) if len(sys.argv)>2 else 300
    try:
        for f in range(frames):
            g.run_cycles(70224)
            if f%60==0: print('frame',f,'pc',hex(g.PC),'bank',g.rombank,'apu',len(g.apu_log),'invalid',len(g.invalid),'LY',g.io[0x44], 'IE',hex(g.IE),'IF',hex(g.io[0x0F]))
    except Exception as e:
        print('EXC',repr(e))
        for t in list(g.trace_ring)[-30:]:print(t)
        raise
    print('done cycles',g.cycles,'apu writes',len(g.apu_log),'invalid',Counter(x[2] for x in g.invalid))
    ctr=Counter((b,pc,a) for _,b,pc,a,v,cs in g.apu_log)
    print('top apu PCs')
    for x,n in ctr.most_common(40):print(n,x)
    print('last trace')
    for t in list(g.trace_ring)[-10:]:print(t)
    # dump compact log
    out=Path('/mnt/data/apu_trace.tsv')
    with out.open('w') as f:
        f.write('cycles\tbank\tpc\taddr\tvalue\tstack\n')
        for cyc,b,pc,a,v,cs in g.apu_log:
            f.write(f'{cyc}\t{b}\t{pc:04X}\t{a:04X}\t{v:02X}\t{cs}\n')
if __name__=='__main__':main()
