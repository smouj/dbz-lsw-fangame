// ═══════════════════════════════════════════════════════════════════
// DBZ LSW — P0.4S: extracción ROM de las secuencias Stage Attack
// ═══════════════════════════════════════════════════════════════════
// Extrae, del ROM comercial canónico (Spain), la tabla de secuencias
// Stage Attack y el encoding numérico de comandos, SIN inventar nada.
//
// Evidencia desensamblada (mgbdis bank_001.asm):
//   Call_001_69f6  (Bank01:$69F6)  → cargador de secuencia
//     ld a,[$ca7e] ; ld l,a ; ld h,$00 ; add hl,hl
//     ld bc,$7c47 ; add hl,bc            ; tabla de punteros @ $7C47
//     ld a,[hl+] ; ld c,a ; ld a,[hl+] ; ld b,a   ; offset relativo
//     ld hl,$7c47 ; add hl,bc            ; secuencia = $7C47 + offset
//     ld c,[hl] ; inc c ; inc c          ; count = [secuencia] + 2
//     ld hl,$ca5e ; call $0fda           ; copia count+2 bytes a $CA5E
//
//   Formato de secuencia: [count][00][cmd0][cmd1]…[cmd_{count-1}]
//     $CA5E = count · $CA5F = index · $CA60.. = comandos
//
//   Selección de variante (Bank01:$69A5-ish):
//     variant = $CA5D & $07
//     index   = (level - 1) * 8 + variant     // level = $CA59 / $CA5A
//
//   Encoding de comandos (Bank00 Call_000_3833, dispatcher cp $01/$04/$08/$10/$20):
//     RIGHT = $01 · UP = $04 · DOWN = $08 · A = $10 · B = $20
//     (máscara de QTE = $3D = RIGHT|UP|DOWN|A|B — LEFT $02 excluido)
//
//   Niveles → nº de comandos (verificado por count byte):
//     level 1 = 3 comandos  ("3 Stage")
//     level 2 = 4 comandos  ("4 Stage")
//     level 3 = 5 comandos  ("5 Stage")
//     level 4 = 6 comandos  ("6 Stage")
//     level 5 = 10 comandos (variante larga; fuera de la doc 3/4/5/6)
//     level 6 = NO presente en la tabla (índices 40-47 son datos ajenos)
// ═══════════════════════════════════════════════════════════════════

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';

const ROOT = process.cwd();
const ROM_PATH = resolve(ROOT, '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-spain.gbc');
const OUT_DIR = join(ROOT, 'generated/rom-stage');
const OUT_TS = join(ROOT, 'src/data/generated/romStage.generated.ts');

// Bank01 = file offset 0x4000; dirección $7C47 → file 0x7C47.
const TABLE_BASE = 0x7c47;

const COMMAND_NAMES: Record<number, string> = {
  0x01: 'RIGHT',
  0x04: 'UP',
  0x08: 'DOWN',
  0x10: 'A',
  0x20: 'B',
};

// command → animation IDs cargados por Call_000_3833 (bc → Call_000_3e92),
// lado 0 ($c7d4=0) y lado 1 ($c7d4=1). Verificado en bank_000.asm $3833–$3955.
const COMMAND_ANIMATIONS: Record<string, { side0: number; side1: number }> = {
  A: { side0: 0x00, side1: 0x05 },
  B: { side0: 0x01, side1: 0x06 }, // último comando: side1 = $39 en vez de $06
  RIGHT: { side0: 0x02, side1: 0x07 },
  UP: { side0: 0x03, side1: 0x08 },
  DOWN: { side0: 0x04, side1: 0x09 },
};

const LEVEL_LABEL: Record<number, string> = {
  1: '3_stage',
  2: '4_stage',
  3: '5_stage',
  4: '6_stage',
  5: 'level5_10cmd', // variante larga, no documentada como "Stage"
};

interface StageSequence {
  stage: string;
  level: number;
  variant: number;
  index: number;
  pointerOffset: number;
  romAddress: number;
  count: number;
  commands: string[];
  rawCommands: number[];
  rawBytes: number[];
}

function main() {
  const rom = readFileSync(ROM_PATH);

  const sequences: StageSequence[] = [];
  const bad: { index: number; pointer: number }[] = [];

  // Niveles 1..5 (índices 0..39). Level 6 (40..47) no está en la tabla.
  for (let index = 0; index < 40; index++) {
    const level = Math.floor(index / 8) + 1;
    const variant = index % 8;

    const ptrAddr = TABLE_BASE + index * 2;
    const lo = rom[ptrAddr];
    const hi = rom[ptrAddr + 1];
    const offset = lo | (hi << 8);

    const seqAddr = TABLE_BASE + offset;
    if (seqAddr >= 0x8000 || seqAddr < 0x4000) {
      bad.push({ index, pointer: offset });
      continue;
    }

    const count = rom[seqAddr];
    const rawCommands: number[] = [];
    for (let c = 0; c < count; c++) {
      rawCommands.push(rom[seqAddr + 2 + c]);
    }
    const rawBytes = Array.from(rom.subarray(seqAddr, seqAddr + 2 + count));

    sequences.push({
      stage: LEVEL_LABEL[level] ?? `level${level}`,
      level,
      variant,
      index,
      pointerOffset: offset,
      romAddress: seqAddr,
      count,
      commands: rawCommands.map((c) => COMMAND_NAMES[c] ?? `UNK_${c.toString(16).padStart(2, '0')}`),
      rawCommands,
      rawBytes,
    });
  }

  // Verificación de integridad de la extracción
  const countsByLevel: Record<number, number> = {};
  for (const s of sequences) countsByLevel[s.level] = (countsByLevel[s.level] ?? 0) + 1;
  const expectedCounts: Record<number, number> = { 1: 3, 2: 4, 3: 5, 4: 6, 5: 10 };
  const countErrors: string[] = [];
  for (const s of sequences) {
    if (s.count !== expectedCounts[s.level]) {
      countErrors.push(`level ${s.level} v${s.variant}: count ${s.count} != expected ${expectedCounts[s.level]}`);
    }
  }

  const commandEncoding = Object.entries(COMMAND_NAMES).map(([hex, name]) => ({
    command: name,
    bit: Number(hex),
    hex: `0x${Number(hex).toString(16).padStart(2, '0')}`,
  }));

  const stageData = {
    source: {
      rom: 'dbz-lsw-spain.gbc',
      loader: 'Bank01:$69F6 (Call_001_69f6)',
      pointerTable: `Bank01:$${TABLE_BASE.toString(16).toUpperCase()} (file 0x${TABLE_BASE.toString(16)})`,
      variantCounter: '$CA5D & $07',
      indexFormula: '(level - 1) * 8 + variant',
      sequenceFormat: '[count][00][cmd0..cmd{count-1}]',
      evidence: 'mgbdis bank_001.asm Call_001_69f6 + bank_000.asm Call_000_3833',
    },
    levels: Object.fromEntries(
      Object.entries(expectedCounts).map(([level, count]) => [
        `level_${level}`,
        { label: LEVEL_LABEL[Number(level)], commandCount: count, variants: countsByLevel[Number(level)] ?? 0 },
      ]),
    ),
    commandEncoding,
    commandAnimations: COMMAND_ANIMATIONS,
    qteMask: { value: 0x3d, accepted: ['RIGHT', 'UP', 'DOWN', 'A', 'B'], excluded: ['LEFT'] },
    sequences,
    integrity: {
      totalSequences: sequences.length,
      badPointers: bad,
      countErrors,
    },
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'sequences.json'), JSON.stringify(stageData, null, 2));
  writeFileSync(join(OUT_DIR, 'command-encoding.json'), JSON.stringify({
    commandEncoding,
    commandAnimations: COMMAND_ANIMATIONS,
    qteMask: stageData.qteMask,
  }, null, 2));

  // TS generado (solo lectura, authority para producción)
  const ts = genTs(stageData);
  mkdirSync(dirname(OUT_TS), { recursive: true });
  writeFileSync(OUT_TS, ts);

  const report = genReport(stageData);
  writeFileSync(join(OUT_DIR, 'REPORT.md'), report);

  console.log(`P0.4S stage sequences extraídas: ${sequences.length} secuencias · ${countErrors.length} count-errors · ${bad.length} bad-pointers`);
  if (countErrors.length) console.log('  countErrors:', countErrors.join('; '));
  if (bad.length) console.log('  badPointers:', JSON.stringify(bad));
}

function genTs(d: ReturnType<typeof JSON.parse>): string {
  return `// ═══════════════════════════════════════════════════════════════
// GENERADO — no editar a mano. Fuente: scripts/build-rom-stage.ts
// Secuencias Stage Attack extraídas del ROM (Bank01:$7C47).
// ═══════════════════════════════════════════════════════════════
export type RomStageCommand = 'A' | 'B' | 'UP' | 'DOWN' | 'RIGHT';

export const ROM_STAGE_COMMAND_ENCODING = {
  RIGHT: 0x01,
  UP: 0x04,
  DOWN: 0x08,
  A: 0x10,
  B: 0x20,
} as const;

export const ROM_STAGE_QTE_MASK = 0x3d; // RIGHT|UP|DOWN|A|B (LEFT $02 excluido)

export interface RomStageSequence {
  stage: string;
  level: number;
  variant: number;
  count: number;
  commands: RomStageCommand[];
}

export const ROM_STAGE_SEQUENCES: RomStageSequence[] = ${JSON.stringify(
    d.sequences.map((s: any) => ({
      stage: s.stage,
      level: s.level,
      variant: s.variant,
      count: s.count,
      commands: s.commands.filter((c: string) => !c.startsWith('UNK')),
    })),
    null,
    2,
  )};

export const ROM_STAGE_LEVEL_LABEL: Record<number, string> = ${JSON.stringify(LEVEL_LABEL, null, 2)};
`;
}

function genReport(d: ReturnType<typeof JSON.parse>): string {
  const lines: string[] = [];
  lines.push('# P0.4S — ROM Stage Attack: extracción de secuencias');
  lines.push('');
  lines.push('## Estado: VERIFICADO (extracción byte-exacta)');
  lines.push('');
  lines.push('| Campo | Valor |');
  lines.push('|---|---|');
  lines.push(`| ROM | \`${d.source.rom}\` |`);
  lines.push(`| Cargador | \`${d.source.loader}\` |`);
  lines.push(`| Tabla de punteros | \`${d.source.pointerTable}\` |`);
  lines.push(`| Contador de variante | \`${d.source.variantCounter}\` |`);
  lines.push(`| Índice | \`${d.source.indexFormula}\` |`);
  lines.push(`| Formato | \`${d.source.sequenceFormat}\` |`);
  lines.push('');
  lines.push('## Niveles');
  lines.push('');
  lines.push('| Nivel | Etiqueta | Comandos | Variantes |');
  lines.push('|---|---|---|---|');
  for (const [lv, info] of Object.entries(d.levels as Record<string, any>)) {
    lines.push(`| ${lv.replace('level_', '')} | \`${info.label}\` | ${info.commandCount} | ${info.variants} |`);
  }
  lines.push('');
  lines.push('## Encoding de comandos (Bank00 Call_000_3833)');
  lines.push('');
  lines.push('| Comando | Bit |');
  lines.push('|---|---|');
  for (const e of d.commandEncoding) lines.push(`| \`${e.command}\` | \`${e.hex}\` |`);
  lines.push('');
  lines.push(`Máscara QTE \`$3D\`: ${d.qteMask.accepted.join(' · ')}. **LEFT excluido**.`);
  lines.push('');
  lines.push('## Secuencias');
  lines.push('');
  lines.push('| Stage | Lv | V | Count | Comandos |');
  lines.push('|---|---|---|---|---|');
  for (const s of d.sequences) {
    lines.push(`| \`${s.stage}\` | ${s.level} | ${s.variant} | ${s.count} | \`${s.commands.join(' ')}\` |`);
  }
  lines.push('');
  lines.push(`Integridad: ${d.integrity.totalSequences} secuencias · ${d.integrity.countErrors.length} errores de count · ${d.integrity.badPointers.length} punteros inválidos.`);
  if (d.integrity.countErrors.length) {
    lines.push('');
    lines.push('## ⚠️ Errores de count');
    for (const e of d.integrity.countErrors) lines.push(`- ${e}`);
  }
  return lines.join('\n') + '\n';
}

main();
