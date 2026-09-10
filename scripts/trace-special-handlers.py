#!/usr/bin/env python3
"""trace-special-handlers.py — extract static FSM structure from ROM.

For each special handler ($08, $0B, $0C, $0D, $0E) and the missing specials
($0F Big Bang, $12 Destructo Disk, $16 S.Beam Cannon, $22 Spirit Bomb),
extract:
  - Handler entry address
  - $CA06 sub-type dispatch values and targets
  - Scene/camera/visibility operations

This is STATIC evidence only — not dynamic traces. Dynamic traces require
BizHawk/Lua execution and are BLOCKED pending emulator access.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from z80dis import Dis

ROM = '/home/local-user/.openclaw/workspace/dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc'
BANK = 3

def load_bank(bank):
    data = open(ROM, 'rb').read()
    return data[bank * 0x4000:(bank + 1) * 0x4000]

SLICE = load_bank(BANK)
BASE = 0x4000  # Bank03 window start

# Known handler addresses from romDescriptors
KNOWN_HANDLERS = {
    0x02: 0x5776,  # Beam base
    0x08: 0x5E67,  # Generic special
    0x0B: 0x61C5,  # Tail
    0x0C: 0x62D4,  # Buu Ball
    0x0D: 0x5C04,  # Purple Comet
    0x0E: 0x5D0C,  # Purple Comet Z
}

def dis_at(addr, count=0x60):
    """Disassemble at address (within Bank03 window)."""
    off = addr - BASE
    if off < 0 or off >= len(SLICE):
        return []
    d = Dis(SLICE[off:off+count], addr)
    return list(d.dis(count * 2))

def extract_ca06_dispatches(addr, max_bytes=0x200):
    """Extract all LD ($CA06),A values from a handler."""
    insns = dis_at(addr, max_bytes)
    values = []
    for i, (a, m) in enumerate(insns):
        if m == 'LD ($CA06),A':
            # Find the LD A,xx before it
            for j in range(i-1, max(i-5, 0), -1):
                _, prev = insns[j]
                if prev.startswith('LD A,$'):
                    val = int(prev.split('$')[1], 16)
                    values.append((a, val))
                    break
                elif prev.startswith('LD A,(') or prev.startswith('LD A,'):
                    if not prev.startswith('LD A,$'):
                        break
    return values

def extract_cp_dispatches(addr, max_bytes=0x200):
    """Extract CP $xx / JP Z $yyyy dispatch table."""
    insns = dis_at(addr, max_bytes)
    dispatches = []
    i = 0
    while i < len(insns):
        a, m = insns[i]
        if m.startswith('CP $'):
            val = int(m.split('$')[1], 16)
            if i + 1 < len(insns):
                a2, m2 = insns[i + 1]
                if m2.startswith('JR Z '):
                    delta = int(m2.split(' ')[-1])
                    dest = a2 + 2 + delta
                    dispatches.append((val, dest, 'JR'))
                    i += 1
                elif m2.startswith('JP Z $'):
                    dest = int(m2.split('$')[1], 16)
                    dispatches.append((val, dest, 'JP'))
                    i += 1
        i += 1
    return dispatches

# ── Main extraction ──

print('╔══════════════════════════════════════════════════════════════╗')
print('║  P0.5B — SPECIAL HANDLER STATIC FSM EXTRACTION              ║')
print('║  Evidence: ROM static disassembly (NOT dynamic traces)      ║')
print('╚══════════════════════════════════════════════════════════════╝')
print()

# 1. Extract $CA06 dispatch values from each known handler
print('── 1. $CA06 sub-type values per handler ──')
for subtype, addr in sorted(KNOWN_HANDLERS.items()):
    values = extract_ca06_dispatches(addr)
    label = {0x02: 'Beam base', 0x08: 'Generic special', 0x0B: 'Tail',
             0x0C: 'Buu Ball', 0x0D: 'Purple Comet', 0x0E: 'Purple Comet Z'}.get(subtype, '?')
    print(f'  Handler ${subtype:02X} (${label}) @ ${addr:04X}: {len(values)} $CA06 writes')
    for a, val in values[:10]:
        print(f'    ${a:04X}: LD A,${val:02X} → LD ($CA06),A')

# 2. Extract CP $xx / JP Z dispatch from handler $08 (generic special)
print()
print('── 2. Handler $08 (generic special) dispatch table ──')
dispatches_08 = extract_cp_dispatches(0x5E67, 0x180)
for val, dest, kind in dispatches_08:
    print(f'  ${val:02X} ({val:3}) → {kind} ${dest:04X}')

# 3. Find missing special handler addresses by scanning card data
# Card records are in banks 0E-0F. Each card has a type byte at offset 0x0A.
# Let's scan for handler types $0F, $12, $16, $22 in card data
print()
print('── 3. Card handler type scan (banks 0E-0F) ──')
MISSING = {0x0F: 'Big Bang Attack', 0x12: 'Destructo Disk', 0x16: 'S.Beam Cannon', 0x22: 'Spirit Bomb'}
for bank_num in [0x0E, 0x0F]:
    bank_data = load_bank(bank_num)
    # Each card record is 0x29 bytes (§1)
    # Handler type byte is at offset 0x05 within the card record
    CARD_LEN = 0x29
    for i in range(0, len(bank_data) - CARD_LEN, CARD_LEN):
        handler_type = bank_data[i + 5]
        if handler_type in MISSING:
            card_id = i // CARD_LEN
            print(f'  Card #{card_id:3d}: handler ${handler_type:02X} ({MISSING[handler_type]})')

# 4. Extract handler addresses for missing specials from the card action dispatch
# The dispatch at $4598 routes by $CA03 (card action handler type)
# Types: $00=?, $01=?, $02=beam, $08=special, $09=stage, $0A=?
# We need to find where $0F, $12, $16, $22 dispatch
print()
print('── 4. Main action dispatch ($4598 area) ──')
dispatches_main = extract_cp_dispatches(0x4598, 0x100)
for val, dest, kind in dispatches_main:
    label = {0x00: 'phase0', 0x01: 'phase1', 0x02: 'beam', 0x08: 'special',
             0x09: 'stage?', 0x0A: 'stage'}.get(val, '')
    print(f'  $CA03=${val:02X} ({val:3}) → {kind} ${dest:04X} {label}')

# 5. Summary: what we have vs what we need
print()
print('── 5. STATIC EVIDENCE SUMMARY ──')
print()
print('KNOWN (ROM_STATIC_VERIFIED):')
for subtype, addr in sorted(KNOWN_HANDLERS.items()):
    label = {0x02: 'Beam base', 0x08: 'Generic special', 0x0B: 'Tail',
             0x0C: 'Buu Ball', 0x0D: 'Purple Comet', 0x0E: 'Purple Comet Z'}.get(subtype, '?')
    print(f'  Handler ${subtype:02X} ({label}) @ Bank03:${addr:04X}')
print()
print('MISSING (need dynamic ROM trace):')
for subtype, label in MISSING.items():
    print(f'  Handler ${subtype:02X} ({label}) — ADDRESS UNKNOWN')
print()
print('BLOCKED: P0.5B+D requires dynamic ROM trace capture (BizHawk/Lua)')
print('Static disassembly can extract dispatch tables and $CA06 values,')
print('but cannot determine scene/camera/visibility choreography per phase.')
print()
print('Required captures per missing handler:')
print('  - Handler entry address (findable by card data scan)')
print('  - FSM phase transitions ($CA03 values and targets)')
print('  - Scene/camera/visibility operations per phase (DYNAMIC)')
print('  - ActionObject state changes per phase (DYNAMIC)')
print('  - SCX/SCY per scanline for beam handlers (DYNAMIC)')