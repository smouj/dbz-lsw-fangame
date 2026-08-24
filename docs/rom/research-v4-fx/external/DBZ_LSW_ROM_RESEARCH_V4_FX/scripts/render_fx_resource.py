from pathlib import Path
import argparse, json
from PIL import Image, ImageDraw
ROM=Path('/mnt/data/Dragon Ball Z - Legendary Super Warriors (USA)(2).gbc').read_bytes()

def off(b,a): return b*0x4000+(a if b==0 else a-0x4000)
def u16(b,a): o=off(b,a);return ROM[o]|ROM[o+1]<<8
def resolve(b,i): return 0x4000+u16(b,0x4008+i*4)*4
def fxbl(fid): return 0x65+fid//30,fid%30

def palette(pid):
    a=0x6E00+pid*8;o=off(0x30,a); raw=ROM[o:o+8];out=[]
    for i in range(0,8,2):
        v=raw[i]|raw[i+1]<<8;r=v&31;g=(v>>5)&31;b=(v>>10)&31
        out.append((round(r*255/31),round(g*255/31),round(b*255/31),255))
    return out

def tile_pixels(data):
    px=[[0]*8 for _ in range(8)]
    for y in range(8):
        lo=data[y*2]; hi=data[y*2+1]
        for x in range(8):
            bit=7-x
            px[y][x]=((hi>>bit)&1)*2+((lo>>bit)&1)
    return px

def render(fid,pid,side,operand,scale=2,transparent0=False):
    bank,local=fxbl(fid)
    base=resolve(bank,local)
    if bank==0x65:
        is_bundle=(local>=2 and (local-2)%3==0)
    else:
        is_bundle=(local%3==0)
    if not is_bundle:
        raise ValueError(f'FX {fid:02X} is not a normal 3-descriptor bundle base (bank {bank:02X} local {local})')
    mapd=resolve(bank,local+(1 if side==1 else 2))
    attrd=resolve(0x65,0 if side==1 else 1)
    bo=off(bank,base); count=ROM[bo]; gfx=ROM[bo+1:bo+1+count*16]
    pal=palette(pid)
    startrow=operand+1
    W,H=32*8,8*8
    im=Image.new('RGBA',(W,H),(0,0,0,0) if transparent0 else pal[0])
    for yy in range(8):
        sr=startrow+yy
        for xx in range(32):
            tileid=ROM[off(bank,mapd)+sr*32+xx]
            attr=ROM[off(0x65,attrd)+sr*32+xx]
            # signed tile addressing: 0x80 is first tile loaded at $8800.
            ti=(tileid-0x80)&0xFF
            if ti>=count:
                # data outside this resource's loaded range: leave diagnostic magenta
                if not transparent0:
                    for py in range(8):
                        for px in range(8): im.putpixel((xx*8+px,yy*8+py),(255,0,255,255))
                continue
            pxs=tile_pixels(gfx[ti*16:(ti+1)*16])
            xf=bool(attr&0x20); yf=bool(attr&0x40)
            for py in range(8):
                for px in range(8):
                    sx=7-px if xf else px; sy=7-py if yf else py
                    ci=pxs[sy][sx]
                    rgba=pal[ci]
                    if transparent0 and ci==0: rgba=(0,0,0,0)
                    im.putpixel((xx*8+px,yy*8+py),rgba)
    if scale!=1: im=im.resize((W*scale,H*scale),Image.Resampling.NEAREST)
    return im,{'bank':bank,'local':local,'base':base,'map':mapd,'attr':attrd,'tileCount':count,'startRow':startrow,'endRow':startrow+7,'palette':pid,'side':side,'operand':operand}

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--fx',type=lambda x:int(x,0),required=True);ap.add_argument('--palette',type=lambda x:int(x,0),required=True);ap.add_argument('--side',type=int,choices=[1,2],required=True);ap.add_argument('--operand',type=lambda x:int(x,0),required=True);ap.add_argument('--out',required=True);ap.add_argument('--scale',type=int,default=2);ap.add_argument('--opaque0',action='store_true')
    a=ap.parse_args();im,meta=render(a.fx,a.palette,a.side,a.operand,a.scale,not a.opaque0);im.save(a.out);print(json.dumps(meta,indent=2))
