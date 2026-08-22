#!/usr/bin/env python3
"""extract-pyinstaller.py — extrae el CArchive de un exe PyInstaller.

Formato CArchive:
  magic: MEI\\014\\013\\012\\000 (8 bytes)
  luego en big-endian: 4B length_of_package, 4B TOC position, 4B TOC length,
  4B pyvers, 4B pylib position.
  TOC: entradas de 64 bytes: 16B nombre, 4B pos, 4B len, 4B uncompressed len,
  1B comp_level, 1B type, 3B padding.
Uso: python3 extract-pyinstaller.py <exe> <outdir>
"""
import struct, sys, os, zlib

MAGICS = [b'MEI\014\013\012\000', b'MEI\014\013\012\013\016\000']
TYPES = {b'm': 'module', b'M': 'package', b's': 'source', b'S': 'source_pyz',
         b'z': 'pyz', b'Z': 'pyz', b'x': 'data', b'b': 'binary', b'a': 'archive'}

def main():
    exe = sys.argv[1]
    out = sys.argv[2]
    data = open(exe, 'rb').read()
    magic = None
    i = -1
    for m in MAGICS:
        j = data.find(m)
        if j >= 0:
            magic, i = m, j
            break
    if magic is None:
        print('MAGIC MEI no encontrado')
        return
    pos = i + len(magic)
    length_pkg, toc_pos, toc_len, pyvers, pylib_pos = struct.unpack('>IIIII', data[pos:pos + 20])
    print(f'CArchive en 0x{i:X}: package={length_pkg} toc@0x{toc_pos:X} len={toc_len} pyvers={pyvers}')
    os.makedirs(out, exist_ok=True)
    toc = data[toc_pos:toc_pos + toc_len]
    n = 0
    for off in range(0, len(toc), 64):
        entry = toc[off:off + 64]
        if len(entry) < 64:
            break
        name = entry[:16].split(b'\0')[0].decode('latin1')
        epos, elen, ulen, clevel, etype = struct.unpack('>IIIIB', entry[16:29])
        etype = entry[28:29] if False else chr(entry[28]).encode()
        tname = TYPES.get(entry[28:29], entry[28:29].hex())
        payload = data[epos:epos + elen]
        if entry[28] == 0x7A or entry[28] == 0x5A:  # zlib compressed (z/Z)
            try:
                payload = zlib.decompress(payload)
            except Exception as e:
                payload = b'(decompress fail)'
        safe = name.replace('/', '__').replace('\\', '__')
        with open(os.path.join(out, safe), 'wb') as f:
            f.write(payload)
        if name in ('PYZ.pyz', 'pyimod01_os_path.pyc', 'pyimod02_archive.pyc'):
            print(f'  {name:32} {tname:8} {elen:8}B -> {len(payload):8}B')
        n += 1
    print(f'Extraídos {n} entries -> {out}')

if __name__ == '__main__':
    main()
