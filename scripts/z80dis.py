#!/usr/bin/env python3
"""z80dis.py — mini-desensamblador Z80 (Game Boy) suficiente para trazar handlers.

Cubre el subconjunto de opcodes que usa el código compilado del juego:
LD/JP/JR/CALL/RET/CP/AND/OR/XOR/INC/DEC/ADD/SUB/PUSH/POP/BIT/SET/RES/
RST/DI/EI/HALT/NOP/STOP/DAA/CPL/SCF/CCF/RLCA/etc. Suficiente para seguir
flujo de handlers (saltos/llamadas/lecturas de memoria).

Uso: python3 z80dis.py <bank_slice.bin> <start_offset> <bytes> [base_addr]
"""
import sys

def s8(v):
    return v - 256 if v >= 128 else v

REG = {0:'B',1:'C',2:'D',3:'E',4:'H',5:'L',6:'(HL)',7:'A'}

class Dis:
    def __init__(self, data, base=0):
        self.d = data
        self.base = base
        self.pc = 0

    def rb(self):
        v = self.d[self.pc]; self.pc += 1; return v

    def rw(self):
        lo = self.rb(); hi = self.rb(); return hi << 8 | lo

    def addr(self, off):
        return self.base + off

    def dis(self, n=1):
        out = []
        for _ in range(n):
            start = self.pc
            try:
                op = self.rb()
                m = self.decode(op)
            except IndexError:
                m = '...EOF...'
            out.append((self.addr(start), m))
            if m == '...EOF...':
                break
        return out

    def decode(self, op):
        # ── 1 byte ──
        if op == 0x00: return 'NOP'
        if op == 0x76: return 'HALT'
        if op == 0x10: return 'STOP'
        if op == 0xF3: return 'DI'
        if op == 0xFB: return 'EI'
        if op == 0x27: return 'DAA'
        if op == 0x2F: return 'CPL'
        if op == 0x37: return 'SCF'
        if op == 0x3F: return 'CCF'
        if op == 0x07: return 'RLCA'
        if op == 0x0F: return 'RRCA'
        if op == 0x17: return 'RLA'
        if op == 0x1F: return 'RRA'
        if op == 0xC9: return 'RET'
        if op == 0xD9: return 'RETI'
        # ── JR ──
        if op == 0x18: return f'JR {s8(self.rb()):+d}'
        if op == 0x20: return f'JR NZ {s8(self.rb()):+d}'
        if op == 0x28: return f'JR Z {s8(self.rb()):+d}'
        if op == 0x30: return f'JR NC {s8(self.rb()):+d}'
        if op == 0x38: return f'JR C {s8(self.rb()):+d}'
        # ── LD r,r / HALT ──
        if 0x40 <= op <= 0x7F:
            d, s = (op >> 3) & 7, op & 7
            return f'LD {REG[d]},{REG[s]}'
        # ── ALU r ──
        if 0x80 <= op <= 0xBF:
            a, r = (op >> 3) & 7, op & 7
            opn = ['ADD','ADC','SUB','SBC','AND','XOR','OR','CP'][a]
            return f'{opn} {REG[r]}'
        # ── LD inmediatos ──
        if op == 0x01: return f'LD BC,${self.rw():04X}'
        if op == 0x11: return f'LD DE,${self.rw():04X}'
        if op == 0x21: return f'LD HL,${self.rw():04X}'
        if op == 0x31: return f'LD SP,${self.rw():04X}'
        if op == 0x06: return f'LD B,${self.rb():02X}'
        if op == 0x0E: return f'LD C,${self.rb():02X}'
        if op == 0x16: return f'LD D,${self.rb():02X}'
        if op == 0x1E: return f'LD E,${self.rb():02X}'
        if op == 0x26: return f'LD H,${self.rb():02X}'
        if op == 0x2E: return f'LD L,${self.rb():02X}'
        if op == 0x36: return f'LD (HL),${self.rb():02X}'
        if op == 0x3E: return f'LD A,${self.rb():02X}'
        # ── LD indirectos ──
        if op == 0x02: return 'LD (BC),A'
        if op == 0x12: return 'LD (DE),A'
        if op == 0x22: return 'LD (HL+),A'
        if op == 0x32: return 'LD (HL-),A'
        if op == 0x0A: return 'LD A,(BC)'
        if op == 0x1A: return 'LD A,(DE)'
        if op == 0x2A: return 'LD A,(HL+)'
        if op == 0x3A: return 'LD A,(HL-)'
        if op == 0x08: return f'LD (${self.rw():04X}),SP'
        # ── INC/DEC ──
        if op in (0x03,0x13,0x23,0x33): return f'INC {["BC","DE","HL","SP"][(op>>4)&3]}'
        if op in (0x0B,0x1B,0x2B,0x3B): return f'DEC {["BC","DE","HL","SP"][(op>>4)&3]}'
        if op in (0x04,0x0C,0x14,0x1C,0x24,0x2C,0x34,0x3C):
            r = REG[(op>>3)&7]; return f'INC {r}'
        if op in (0x05,0x0D,0x15,0x1D,0x25,0x2D,0x35,0x3D):
            r = REG[(op>>3)&7]; return f'DEC {r}'
        # ── ADD HL,rr ──
        if op in (0x09,0x19,0x29,0x39):
            return f'ADD HL,{["BC","DE","HL","SP"][(op>>4)&3]}'
        # ── 0xC0-0xFF ──
        if 0xC0 <= op <= 0xFF:
            # exactos
            if op == 0xC3: return f'JP ${self.rw():04X}'
            if op == 0xCD: return f'CALL ${self.rw():04X}'
            if op == 0xEA: return f'LD (${self.rw():04X}),A'
            if op == 0xFA: return f'LD A,(${self.rw():04X})'
            if op == 0xE2: return 'LDH (C),A'
            if op == 0xF2: return 'LDH A,(C)'
            if op == 0xE8: return f'ADD SP,{s8(self.rb()):+d}'
            if op == 0xF8: return f'LD HL,SP{s8(self.rb()):+d}'
            if op == 0xE9: return 'JP (HL)'
            if op == 0xF9: return 'LD SP,HL'
            if op == 0xE6: return f'AND ${self.rb():02X}'
            if op == 0xEE: return f'XOR ${self.rb():02X}'
            if op == 0xF6: return f'OR ${self.rb():02X}'
            if op == 0xFE: return f'CP ${self.rb():02X}'
            if op == 0xC6: return f'ADD A,${self.rb():02X}'
            if op == 0xCE: return f'ADC A,${self.rb():02X}'
            if op == 0xD6: return f'SUB ${self.rb():02X}'
            if op == 0xDE: return f'SBC A,${self.rb():02X}'
            # condicionales
            cc = ['NZ','Z','NC','C'][(op >> 3) & 3]
            kind = op & 0xC7
            if kind == 0xC0: return f'RET {cc}'
            if kind == 0xC2: return f'JP {cc} ${self.rw():04X}'
            if kind == 0xC4: return f'CALL {cc} ${self.rw():04X}'
            # POP/PUSH
            if op in (0xC1,0xD1,0xE1,0xF1): return f'POP {["BC","DE","HL","AF"][(op>>4)&3]}'
            if op in (0xC5,0xD5,0xE5,0xF5): return f'PUSH {["BC","DE","HL","AF"][(op>>4)&3]}'
            # LDH
            if 0xE0 <= op <= 0xE7 and op not in (0xE2,0xE6,0xE7):
                return f'LDH (${self.rb():02X}),A'
            if 0xF0 <= op <= 0xF7 and op not in (0xF2,0xF6,0xF7):
                return f'LDH A,(${self.rb():02X})'
            # RST
            if op in (0xC7,0xCF,0xD7,0xDF,0xE7,0xEF,0xF7,0xFF):
                return f'RST ${op & 0x38:02X}'
        # ── CB prefix ──
        if op == 0xCB:
            cb = self.rb()
            bit = (cb >> 3) & 7
            reg = cb & 7
            opc = (cb >> 6) & 3
            rn = REG[reg]
            if opc == 0: return f'RLC {rn}'
            if opc == 1: return f'RRC {rn}'
            if opc == 2: return f'RL {rn}'
            if opc == 3: return f'RR {rn}'
            if 0x40 <= cb <= 0x7F: return f'BIT {bit},{rn}'
            if 0x80 <= cb <= 0xBF: return f'RES {bit},{rn}'
            if 0xC0 <= cb <= 0xFF: return f'SET {bit},{rn}'
            return f'CB ${cb:02X}'
        return f'DB ${op:02X}'

def main():
    path, start, count = sys.argv[1], int(sys.argv[2], 16), int(sys.argv[3], 16)
    base = int(sys.argv[4], 16) if len(sys.argv) > 4 else start
    data = open(path, 'rb').read()
    d = Dis(data[start:start + count], base)
    out = d.dis(count * 2)
    for addr, m in out:
        print(f'${addr:04X}: {m}')

if __name__ == '__main__':
    main()
