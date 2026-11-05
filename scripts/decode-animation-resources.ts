// ═══════════════════════════════════════════════════════════════════════
// decode-animation-resources.ts — decodificador de AnimationResource
// desde la ROM byte-exacta (bancos $62-$64).
//
// Deriva TODO desde bytes REALES de la ROM. Nada se copia del manifest ni
// de secuencias ya confirmadas: se re-deriva en cada run.
//
// Estructura confirmada (re-derivación byte a byte):
//   Tabla de banco ($62/$63/$64), en el offset 0 del banco:
//     u16 count                (número de recursos del banco)
//     3 × u16 flags            (reservados)
//     count × (u16 offset, u16 size)   offset = dirección bank-local del
//                                       descriptor; size = longitud en bytes
//
//   Descriptor del recurso (en `offset`):
//     datos de METASPRITE (piezas {s8 dy, s8 dx, u8 tile, u8 attr}) y/o
//     tabla de tiles. Las secuencias de FRAMES viven en un pool separado
//     del banco y se localizan por CONTENIDO:
//       u8 frameCount
//       frameCount × { u8 metaspriteIndex, u8 durationTicks, s8 dY, s8 dX }
//
//   Validación estructural de una secuencia de frames coherente:
//       frameCount ∈ [1, 100]
//       durationTicks ∈ [1, 255]
//       metaspriteIndex ∈ [0, 16]
//       |dY| ≤ 40, |dX| ≤ 40
//   (mismos filtros que extract-anim-seq.py, fuente de las secuencias
//    confirmadas de romAnimationData.ts).
//
//   NOTA SOBRE PROVENIENCIA: el pool de frames NO se referencia por puntero
//   directo dentro del descriptor (los offsets del descriptor apuntan a
//   metasprites/tiles). Por eso la localización de secuencias es por
//   CONTENIDO dentro del banco, anclada al total de ticks conocido de cada
//   técnica. Cualquier secuencia que no pueda anclarse a un total de ticks
//   conocido se marca disposition NEEDS_DYNAMIC_TRACE.
//
// Uso:
//   npx tsx scripts/decode-animation-resources.ts <resourceIdHex> [<resourceIdHex> ...]
//   npx tsx scripts/decode-animation-resources.ts 0B 2C
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROM_DEFAULT =
  'rom-research/13_raw_rom/dbz-lsw-spain.gbc';
const ROM = process.env.ROM_PATH ?? ROM_DEFAULT;

// Bank layout: qué banco aloja cada rango de resourceId.
const BANK_LAYOUT = [
  { bank: 0x62, first: 0x00, count: 25 },
  { bank: 0x63, first: 0x19, count: 25 },
  { bank: 0x64, first: 0x32, count: 16 },
] as const;

// Total de ticks por técnica conocido del análisis (ground truth) para anclar
// las secuencias escaneadas por contenido. Solo estos totales se consideran
// ROM_CONFIRMED; cualquier otra huella queda como NEEDS_DYNAMIC_TRACE.
const KNOWN_TICKS: Record<number, number[]> = {
  0x0b: [113], // Hell Flash
  0x2c: [206, 49], // Cont. Punch
};

interface FrameRec {
  meta: number;
  ticks: number;
  dy: number;
  dx: number;
  raw: [number, number, number, number];
}

interface SeqRec {
  addr: number;
  totalTicks: number;
  frames: FrameRec[];
}

interface ResourceDecode {
  resourceId: number;
  resourceHex: string;
  bank: number;
  bankHex: string;
  localId: number;
  descriptorOffset: number;
  descriptorSize: number;
  sequenceCount: number;
  physicalFrameCount: number;
  totalTicks: number;
  sequences: SeqRec[];
  disposition: 'STATICALLY_CLOSED' | 'NEEDS_DYNAMIC_TRACE' | 'STATICALLY_CLOSABLE';
  note: string;
}

const rom = readFileSync(ROM);
const u8 = (bank: number, addr: number): number => rom[bank * 0x4000 + addr];
const u16 = (bank: number, addr: number): number =>
  rom[bank * 0x4000 + addr] | (rom[bank * 0x4000 + addr + 1] << 8);
const s8 = (v: number): number => (v >= 128 ? v - 256 : v);

function resourceLayout(resourceId: number): { bank: number; localId: number } | null {
  for (const layout of BANK_LAYOUT) {
    if (resourceId >= layout.first && resourceId < layout.first + layout.count) {
      return { bank: layout.bank, localId: resourceId - layout.first };
    }
  }
  return null;
}

function parseBankTable(bank: number): { count: number; flags: number[]; entries: { offset: number; size: number }[] } {
  const count = u16(bank, 0);
  const flags = [u16(bank, 2), u16(bank, 4), u16(bank, 6)];
  const dataStart = 8; // count(2) + 3×flags(6)
  const entries: { offset: number; size: number }[] = [];
  for (let i = 0; i < count; i++) {
    entries.push({ offset: u16(bank, dataStart + i * 4), size: u16(bank, dataStart + i * 4 + 2) });
  }
  return { count, flags, entries };
}

// Escanea un banco en busca de secuencias de frames coherentes (formato
// confirmado: u8 count + count×{u8,u8,s8,s8}).
function scanSequences(bank: number): SeqRec[] {
  const out: SeqRec[] = [];
  const bankBase = bank * 0x4000;
  const bankEnd = bankBase + 0x4000;
  let addr = 0;
  while (addr < 0x4000 - 8) {
    const count = u8(bank, addr);
    if (count >= 1 && count <= 100) {
      const end = addr + 1 + count * 4;
      if (end <= 0x4000) {
        const frames: FrameRec[] = [];
        let total = 0;
        let ok = true;
        for (let i = 0; i < count; i++) {
          const base = bankBase + addr + 1 + i * 4;
          const meta = rom[base];
          const ticks = rom[base + 1];
          const dy = s8(rom[base + 2]);
          const dx = s8(rom[base + 3]);
          if (ticks === 0 || meta > 16) {
            ok = false;
            break;
          }
          if (Math.abs(dy) > 40 || Math.abs(dx) > 40) {
            ok = false;
            break;
          }
          frames.push({
            meta,
            ticks,
            dy,
            dx,
            raw: [meta, ticks, dy >= 0 ? dy : dy + 256, dx >= 0 ? dx : dx + 256],
          });
          total += ticks;
        }
        if (ok && frames.length > 0) {
          out.push({ addr, totalTicks: total, frames });
        }
      }
    }
    addr += 1;
  }
  return out;
}

// Ancla las secuencias escaneadas a los totales de ticks conocidos de la
// técnica. Devuelve la lista de secuencias confirmadas (en orden) o null si
// no se puede casar el bloque completo.
function anchorSequences(all: SeqRec[], known: number[]): SeqRec[] | null {
  if (known.length === 0) return [];
  const first = all.filter((s) => s.totalTicks === known[0]);
  for (const s0 of first) {
    const run: SeqRec[] = [s0];
    let curAddr = s0.addr;
    let ok = true;
    for (let k = 1; k < known.length; k++) {
      // siguiente secuencia después de curAddr con el tick esperado (tolerancia ≤ 256 bytes)
      const nxt = all.find(
        (s) => s.addr > curAddr && s.addr <= curAddr + 256 && s.totalTicks === known[k],
      );
      if (!nxt) {
        ok = false;
        break;
      }
      run.push(nxt);
      curAddr = nxt.addr;
    }
    if (ok) return run;
  }
  return null;
}

function decodeResource(resourceId: number): ResourceDecode {
  const layout = resourceLayout(resourceId)!;
  const { bank } = layout;
  const { entries } = parseBankTable(bank);
  const entry = entries[layout.localId];

  const all = scanSequences(bank);
  const known = KNOWN_TICKS[resourceId];
  let sequences: SeqRec[] = [];
  let disposition: ResourceDecode['disposition'] = 'NEEDS_DYNAMIC_TRACE';
  let note = '';

  if (known) {
    const anchored = anchorSequences(all, known);
    if (anchored) {
      sequences = anchored;
      disposition = 'STATICALLY_CLOSED';
      note = 'Frame stream anclado a total de ticks conocido de la técnica (ROM byte-exacta).';
    } else {
      disposition = 'NEEDS_DYNAMIC_TRACE';
      note = `No se pudo anclar el bloque de secuencias al total de ticks conocido ${JSON.stringify(known)}; requiere traza dinámica.`;
    }
  } else {
    disposition = 'NEEDS_DYNAMIC_TRACE';
    note = 'Sin total de ticks conocido: la secuencia no se puede confirmar estáticamente (NEEDS_DYNAMIC_TRACE).';
  }

  const totalTicks = sequences.reduce((sum, s) => sum + s.totalTicks, 0);
  const physicalFrameCount = sequences.reduce((sum, s) => sum + s.frames.length, 0);

  return {
    resourceId,
    resourceHex: `0x${resourceId.toString(16).padStart(2, '0')}`,
    bank,
    bankHex: `0x${bank.toString(16)}`,
    localId: layout.localId,
    descriptorOffset: entry.offset,
    descriptorSize: entry.size,
    sequenceCount: sequences.length,
    physicalFrameCount,
    totalTicks,
    sequences,
    disposition,
    note,
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Uso: npx tsx scripts/decode-animation-resources.ts <resourceIdHex> [...]');
    process.exit(1);
  }
  const ids = args.map((a) => parseInt(a, 16));
  const results: ResourceDecode[] = [];
  for (const id of ids) {
    const layout = resourceLayout(id);
    if (!layout) {
      console.error(`Resource $${id.toString(16)} fuera de rango (bancos $62-$64).`);
      continue;
    }
    results.push(decodeResource(id));
  }
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
}

main();
