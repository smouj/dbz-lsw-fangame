#!/usr/bin/env python3
"""trace-handler02.py — traza el dispatcher del handler $02 (Bank03:$5776).

El handler lee el sub-tipo de $CA06 y despacha (JP Z) a subrutinas por
técnica. Este script:
  1. Desensambla el dispatcher y extrae los pares (valor, destino).
  2. Desensambla cada destino (los primeros N bytes) para ver la estructura.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from z80dis import Dis

ROM = '/home/local-user/.openclaw/workspace/dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc'
BANK = 3
SLICE = open(ROM, 'rb').read()[BANK * 0x4000:(BANK + 1) * 0x4000]
BASE = 0x4000  # dirección del banco dentro de la ventana (Bank03 → 0x4000-0x7FFF)

def window_addr(offset):
    """offset dentro del slice → dirección de ventana (0x4000+offset)."""
    return BASE + offset

def dis_at(offset, count, label):
    print(f'─── {label} @Bank03:${window_addr(offset):04X} ───')
    d = Dis(SLICE[offset:offset + count], window_addr(offset))
    for addr, m in d.dis(count * 2):
        print(f'  ${addr:04X}: {m}')

def main():
    # 1) Dispatcher: desde $5776 (offset 0x1776)
    off = 0x1776
    d = Dis(SLICE[off:off + 0x90], window_addr(off))
    insns = d.dis(0x90 * 2)
    # extraer pares (valor → destino JP Z)
    jumps = []
    i = 0
    while i < len(insns):
        addr, m = insns[i]
        if m.startswith('CP $'):
            val = int(m.split('$')[1], 16)
            # mirar siguiente: JR Z +d o JP Z $xxxx
            if i + 1 < len(insns):
                a2, m2 = insns[i + 1]
                if m2.startswith('JR Z '):
                    delta = int(m2.split(' ')[-1])
                    dest = a2 + 2 + delta
                    jumps.append((val, dest, 'JR'))
                    i += 1
                elif m2.startswith('JP Z $'):
                    dest = int(m2.split('$')[1], 16)
                    jumps.append((val, dest, 'JP'))
                    i += 1
        i += 1
    print(f'═══ Dispatcher handler $02 (Bank03:$5776) — {len(jumps)} sub-tipos ═══')
    for val, dest, kind in jumps:
        print(f'  ${val:02X} ({val:3}) → {kind} ${dest:04X}')

    # 2) Desensamblar los destinos (primeros bytes)
    print()
    for val, dest, kind in jumps[:14]:
        off = dest - BASE
        dis_at(off, 0x30, f'sub-tipo ${val:02X}')

if __name__ == '__main__':
    main()
