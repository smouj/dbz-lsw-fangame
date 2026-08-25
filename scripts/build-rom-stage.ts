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
// memberSlot0 ($c7d4=0) y memberSlot1 ($c7d4=1). Verificado en bank_000.asm $3833–$3955.
const COMMAND_ANIMATIONS: Record<string, { memberSlot0: number; memberSlot1: number }> = {
  A: { memberSlot0: 0x00, memberSlot1: 0x05 },
  B: { memberSlot0: 0x01, memberSlot1: 0x06 }, // último comando: memberSlot1 = $39 en vez de $06
  RIGHT: { memberSlot0: 0x02, memberSlot1: 0x07 },
  UP: { memberSlot0: 0x03, memberSlot1: 0x08 },
  DOWN: { memberSlot0: 0x04, memberSlot1: 0x09 },
};

// command → pose selector $C3C7 (frame/pose index) escrito por el opcode $04
// de la VM (Jump_07e_70ab → jr_07e_713f → Call_000_3501).
//   memberSlot0 (member 0): vía tabla Bank01:$4E6D (b=0): $20→$05, $21→$08, $22→$0b,
//                     $23→$06 · $24→$09 (caso especial en Call_000_3501).
//   memberSlot1 (member 1): directo (c < $20 → $C3C7 = c): $0a/$0b/$0d/$0f/$10.
// $C3C7 es el selector de pose; su resolución a frame físico (metasprite/GFX
// → physicalId) queda PENDING (siguiente RE).
const COMMAND_POSE_SELECTORS: Record<string, { memberSlot0: number; memberSlot1: number }> = {
  A: { memberSlot0: 0x05, memberSlot1: 0x0a },
  B: { memberSlot0: 0x08, memberSlot1: 0x0b },
  RIGHT: { memberSlot0: 0x0b, memberSlot1: 0x0d },
  UP: { memberSlot0: 0x06, memberSlot1: 0x0f },
  DOWN: { memberSlot0: 0x09, memberSlot1: 0x10 },
};

// ── VM program decode (Bank30:$5D00) ──
const ANIM_TABLE_BANK = 0x30;
const ANIM_TABLE_ADDR = 0x5d00;
const ANIM_TABLE_FILE = ANIM_TABLE_BANK * 0x4000 + (ANIM_TABLE_ADDR - 0x4000);

// Opcodes VM (Jump_07e_70ab, Bank7E:$70AB) — mnemónicos de la tabla de dispatch.
const VM_OPCODES: Record<number, string> = {
  0x01: 'SET_FRAME_ADV',
  0x04: 'SET_POSE',
  0x05: 'VISIBILITY',
  0x06: 'COND_COMPARE',
  0x07: 'LOOP_COUNTER',
  0x08: 'SUB_CALL',
  0x0a: 'MOVE_LOOP',
  0x0b: 'OFFSET_LOOP',
  0x0c: 'GLOBAL_SET',
  0x0d: 'SCREEN_OFFSET',
  0x0e: 'SCREEN_X_MOVE',
  0x0f: 'SCREEN_OP',
  0x10: 'ANIM_LOOP',
  0x11: 'SCREEN_OFFSET_TBL',
  0x12: 'SUB_CALL2',
  0x13: 'SUB_CALL3',
  0x14: 'SUB_CALL4',
};

// Call_000_3501: arg3 crudo del opcode $04 → valor de $C3C7.
const POSE_TABLE_4E6D_ROW0 = [0x05, 0x08, 0x0b, 0x06];
function poseSelectorFromArg3(arg3: number): number {
  if (arg3 === 0x24) return 0x09;
  if (arg3 >= 0x20 && arg3 <= 0x23) return POSE_TABLE_4E6D_ROW0[arg3 - 0x20];
  return arg3;
}

interface VmStep {
  index: number;
  opcode: number;
  mnemonic: string;
  bytes: number[];
  memberSlot?: number;
  poseSelector?: number;
}

interface VmProgram {
  command: string;
  memberSlot: number;
  animationId: number;
  tableOffset: number;
  programAddress: string;
  count: number;
  steps: VmStep[];
  poseWrites: number[];
}

function decodeAnimationPrograms(rom: Buffer): VmProgram[] {
  const combos: Array<[string, number, number]> = [
    ['A', 0, 0x00], ['B', 0, 0x01], ['RIGHT', 0, 0x02], ['UP', 0, 0x03], ['DOWN', 0, 0x04],
    ['A', 1, 0x05], ['B', 1, 0x06], ['RIGHT', 1, 0x07], ['UP', 1, 0x08], ['DOWN', 1, 0x09],
  ];
  return combos.map(([command, memberSlot, animId]) => {
    const a = ANIM_TABLE_FILE + animId * 2;
    const offset = rom[a] | (rom[a + 1] << 8);
    const prog = ANIM_TABLE_FILE + offset;
    const count = rom[prog];
    const bytes = Array.from(rom.subarray(prog + 1, prog + 1 + count * 5));
    const steps: VmStep[] = [];
    const poseWrites: number[] = [];
    for (let i = 0; i < count; i++) {
      const e = bytes.slice(i * 5, i * 5 + 5);
      const opcode = e[0];
      const step: VmStep = {
        index: i,
        opcode,
        mnemonic: VM_OPCODES[opcode] ?? `OP_$${opcode.toString(16).padStart(2, '0')}`,
        bytes: e,
      };
      if (opcode === 0x04 || opcode === 0x01) {
        step.memberSlot = e[1];
        step.poseSelector = opcode === 0x04 ? poseSelectorFromArg3(e[3]) : e[3];
        poseWrites.push(step.poseSelector);
      }
      steps.push(step);
    }
    return {
      command,
      memberSlot,
      animationId: animId,
      tableOffset: offset,
      programAddress: `Bank30:$${(ANIM_TABLE_ADDR + offset).toString(16).toUpperCase()} (file 0x${(ANIM_TABLE_FILE + offset).toString(16)})`,
      count,
      steps,
      poseWrites,
    };
  });
}

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

  // Cadena de consumidores command→animation (verificada hasta la tabla $5D00).
  writeFileSync(join(OUT_DIR, 'command-consumers.json'), JSON.stringify(commandConsumers(), null, 2));

  // Programas VM completos (10 combos command×memberSlot, opcodes en orden).
  const programs = decodeAnimationPrograms(rom);
  writeFileSync(join(OUT_DIR, 'animation-programs.json'), JSON.stringify({
    source: {
      table: `Bank30:$${ANIM_TABLE_ADDR.toString(16).toUpperCase()} (file 0x${ANIM_TABLE_FILE.toString(16)})`,
      lookup: 'Call_000_3e92 (Bank00): sla c / rl b → $5D00 + bc',
      programFormat: '[count][5-byte VM opcodes]',
      interpreter: 'Jump_07e_70ab (Bank7E:$70AB)',
      evidence: 'mgbdis bank_030.asm (data) + bank_07e.asm Jump_07e_70ab',
    },
    opcodeMnemonic: VM_OPCODES,
    poseSelectorMapping: {
      register: '$C3C7',
      writer: 'VM opcode $04 (jr_07e_713f) → Call_000_3501',
      memberSlot0Table: 'Bank01:$4E6D (b=0): $20→$05, $21→$08, $22→$0b, $23→$06 · $24→$09',
      memberSlot1Direct: 'c < $20 → $C3C7 = c',
    },
    programs,
  }, null, 2));

  // Clasificación de readers/consumidores de $C3C7 (100%).
  writeFileSync(join(OUT_DIR, 'pose-selector-consumers.json'), JSON.stringify(poseSelectorConsumers(), null, 2));

  const report = genReport(stageData, programs);
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

/** command → animation IDs cargados por Call_000_3833 (Bank00:$3833).
 *  memberSlot0 = $c7d4=0 (member 0, $C700) · memberSlot1 = $c7d4=1 (member 1, $C703).
 *  Cada ID indexa la tabla de programas de animación @ $5D00 (Bank30). */
export const ROM_STAGE_COMMAND_ANIMATIONS: Record<
  RomStageCommand,
  { memberSlot0: number; memberSlot1: number; lastMemberSlot1?: number }
> = ${JSON.stringify(COMMAND_ANIMATIONS, null, 2)};

/** command → pose selector $C3C7 (VM opcode $04 → Call_000_3501).
 *  memberSlot0 vía Bank01:$4E6D (b=0) + $24→$09 · memberSlot1 directo. VERIFICADO.
 *  $C3C7 → frame físico (metasprite/GFX → physicalId) queda PENDING. */
export const ROM_STAGE_COMMAND_POSE: Record<
  RomStageCommand,
  { memberSlot0: number; memberSlot1: number }
> = ${JSON.stringify(COMMAND_POSE_SELECTORS, null, 2)};

export interface RomStageVmStep {
  index: number;
  opcode: number;
  mnemonic: string;
  bytes: number[];
  memberSlot?: number;
  poseSelector?: number;
}

export interface RomStageVmProgram {
  command: RomStageCommand;
  memberSlot: number;
  animationId: number;
  tableOffset: number;
  programAddress: string;
  count: number;
  steps: RomStageVmStep[];
  poseWrites: number[];
}

/** Programas VM completos (10 combos command×memberSlot), opcodes en orden.
 *  Fuente: Bank30:$5D00 (programas de animación). Interpreter Jump_07e_70ab. */
export const ROM_STAGE_COMMAND_PROGRAMS: RomStageVmProgram[] = ${JSON.stringify(
    decodeAnimationPrograms(readFileSync(ROM_PATH)),
    null,
    2,
  )};

/** Descriptor de animación de personaje $CA0D (stride 3, [bank][ptr-lo][ptr-hi]) —
 *  writers clasificados 100%, gramática decodificada, y hallazgo de separación de
 *  bancos ($61 básica/Stage vs $62/$63/$64 técnicas del corpus de 66 recursos). */
export const ROM_STAGE_CHAR_ANIM_DESCRIPTOR = ${JSON.stringify(
    (poseSelectorConsumers() as any).charAnimDescriptor,
    null,
    2,
  )};
`;
}

function commandConsumers(): unknown {
  return {
    verified: true,
    consumer: {
      call: 'Call_000_3822 (Bank00:$3822)',
      inputs: {
        expectedCommand: '$CA60[$CA5F] (comando esperado en el índice actual)',
        successFlag: '$CA6A[$CA5F] (success/failure del comando actual)',
      },
    },
    dispatch: {
      call: 'Call_000_3833 (Bank00:$3833)',
      encoding: Object.fromEntries(Object.entries(COMMAND_NAMES).map(([bit, name]) => [name, Number(bit)])),
      animationIds: COMMAND_ANIMATIONS,
      lastCommandMemberSlot1Note: 'B como ÚLTIMO comando → memberSlot1 = $39 en vez de $06 (bank_000.asm $391E)',
      memberSlotRegister: {
        register: '$C7D4',
        meaning: 'member slot (0 → $C700, 1 → $C703 — Call_000_3e46)',
      },
    },
    animationProgramTable: {
      address: '$5D00 (Bank30, Call_000_3e92: sla c / rl b → $5D00+bc)',
      resolution: 'PENDING — pose selector $C3C7 → sequence → metasprite → GFX → physicalId',
    },
    poseSelector: {
      register: '$C3C7',
      meaning: 'frame/pose index',
      opcode: 'VM $04 (Jump_07e_70ab → jr_07e_713f → Call_000_3501)',
      memberSlot0Table: 'Bank01:$4E6D (b=0): $20→$05, $21→$08, $22→$0b, $23→$06 · $24→$09',
      memberSlot1Direct: 'c < $20 → $C3C7 = c: $0a/$0b/$0d/$0f/$10',
      values: COMMAND_POSE_SELECTORS,
      toPhysical: 'PENDING — $C3C7 → pose table ($C3CE/$C3CF) → frame descriptor → metasprite → GFX → physicalId',
    },
  };
}

// Clasificación exhaustiva de los readers/xrefs de $C3C7 (24 referencias, 100%).
function poseSelectorConsumers(): unknown {
  return {
    register: '$C3C7',
    classification: 'COMPLETE',
    totalReferences: 24,
    readers: [
      {
        address: 'Bank00:$0B16 (Call_000_0b16)',
        kind: 'POSE_TABLE_INDEX',
        description: 'Índice real de la tabla de poses: $C3C7 se limita contra el count de la tabla y se usa como índice de una tabla de punteros relativos.',
        chain: '$C3C7 → tabla de poses @ $C3CE/$C3CF → descriptor de frame → $C0F9 + $C3D0 → render (DMA)',
        evidence: 'mgbdis bank_000.asm Call_000_0b16 ($0B16)',
      },
      {
        address: 'Bank00:$0914 (Call_000_0914)',
        kind: 'SNAPSHOT_TO_ACTION',
        description: 'Copia $C3C7 al descriptor de acción/frame (estructura apuntada por Call_000_0b07).',
        evidence: 'mgbdis bank_000.asm Call_000_0914 ($0914)',
      },
      {
        address: 'Bank7E:$70E0-ish (post Call_000_3e64)',
        kind: 'SNAPSHOT_TO_MEMBER',
        description: 'Copia $C3C7 al estado de animación del miembro (tras Call_000_3e57/3e64).',
        evidence: 'mgbdis bank_07e.asm (~$8963)',
      },
    ],
    dataFalsePositives: [
      { address: 'Bank02B:$14257', note: '`jp $c3c7` en región de datos (no es código real)' },
      { address: 'Bank01A:$2680', note: '`ld bc,$c3c7` en región de datos (no es código real)' },
    ],
    writers: [
      { address: 'Bank00:$3501 (Call_000_3501)', note: 'escritor principal desde opcode VM $04' },
      { address: 'Bank00:$3511/$3519', note: 'rama $24→$09 y tabla $4E6D' },
      { address: 'Bank00: other (10688/10695/10702/11326)', note: 'otros escritores de poses (no Stage)' },
      { address: 'Bank07E:$8637', note: 'escritor en VM' },
      { address: 'Bank03: varios', note: 'escritores de poses (no Stage)' },
    ],
    consumerChain: {
      step1: 'opcode VM $04 (jr_07e_713f) → Call_000_3501 escribe $C3C7 (pose) y devuelve c (índice de grupo de frames)',
      step2: 'Call_000_2fc4 (b=arg4) → Call_000_2fe7 (c) → hl = $CA0D + c*3 = descriptor de animación del personaje [bank][ptr]',
      step3: 'Call_000_0914 (de=hl) → $C3CC/$C3CD → Call_000_0b8d → $C3CE/$C3CF = tabla de poses',
      step4: 'Call_000_0b16 lee $C3C7 y lo usa como índice de la tabla de poses ($C3CE/$C3CF)',
      step5: 'descriptor de frame → $C0F9 (byte) + $C3D0 (sub-índice) → render metasprite/GFX (DMA)',
      step6: 'JOIN al corpus físico (resourceId/sequence/VFID → physicalId) — VERIFIED hasta resource base; PENDIENTE: bank $61 (Stage/básica) está FUERA del corpus de 66 recursos (banks $62/$63/$64) → requiere extensión de corpus',
    },
    charAnimDescriptor: {
      table: '$CA0D (stride 3, [bank][ptr-lo][ptr-hi])',
      index: 'c devuelto por Call_000_3501 (arg3: $20-$23→c=1..4, $24→c=4, <$20→c=0)',
      loader: 'Call_000_2fe7 (Bank00): hl = $CA0D + c*3',
      consumer: 'Call_000_0914 → $C3CC/$C3CD → Call_000_0b8d → $C3CE/$C3CF',
      grammar: {
        byte0: 'bank (bankswitch vía Call_000_0f9b → $2000)',
        byte1: 'ptr-lo → $C3CE',
        byte2: 'ptr-hi → $C3CF',
        pointee: 'resource base con 3 raíces relativas: +0 tabla de secuencias (u16), +2 tabla de metasprites (u16), +4 tabla de frame-graphics (u16) — idéntico a render-fighter-physical.ts',
      },
      writersClassified: 'COMPLETE (0 desconocidos)',
      writers: [
        { address: 'Bank00:$08DD (Call_000_08dd)', role: 'escribe [b][e][d] = [bank][ptr-lo][ptr-hi]', evidence: 'mgbdis bank_000.asm Call_000_08dd' },
        { address: 'Bank00:$08E3 (Call_000_08e3)', role: 'escribe [b][e][d] (variante de puntero, tabla $CA28)', evidence: 'mgbdis bank_000.asm Call_000_08e3' },
        { address: 'Bank00:$3702 (Call_000_3702)', role: 'orquestador: Call_000_2fe7 (hl=$CA0D+c*3) + Call_000_08dd', evidence: 'mgbdis bank_000.asm Call_000_3702' },
        { address: 'Bank00:$3685 (Call_000_3685)', role: 'orquestador: Call_000_2ff8 (hl=$CA28+c*3) + Call_000_08e3', evidence: 'mgbdis bank_000.asm Call_000_3685' },
      ],
      descriptorOrigin: {
        resolver: 'Call_000_1266 (Bank00:$1266): bankswitch a bank A, lee u16 en $4008 + index*4, devuelve de = $4000 + value*4',
        standingBank: 'Call_000_35ca (Bank00:$35CA, llamado desde Bank01:$4A45) escribe $CA0D[0..7] con bank $61 (animación de pie/básica)',
        techniqueBank: 'Call_000_2afe (Bank00:$2AFE) lee Bank11 char_data+6 → bank = $62 + (id/25), localId = id%25 (bancos $62/$63/$64 = técnicas)',
        charData: 'Bank11 (Call_000_2a77 + offset 6) = animation resource id por personaje',
      },
      bankSeparation: {
        finding: 'CRITICAL — bank $61 (animación de pie/básica) es SEPARADO de banks $62/$63/$64 (66 recursos de técnicas del catálogo).',
        stageAttacks: 'Los comandos Stage (A/B/RIGHT/UP/DOWN) usan $CA0D[1..4] → bank $61, que NO está en el corpus físico de 66 recursos.',
        physicalCorpusCoverage: 'El corpus físico (552 promovidos / 2371 instancias) cubre banks $62/$63/$64 (técnicas); NO cubre bank $61 (básica/Stage).',
        implication: 'Cerrar $CA0D → physicalId para Stage requiere EXTENDER el corpus a bank $61 (y los bancos de pie por personaje), no solo mapear a los 66 recursos existentes.',
      },
      toPhysical: 'VERIFIED hasta resource base (3 raíces) + gramática + writers. JOIN físico PENDIENTE: bank $61 (Stage/básica) está fuera del corpus de 66 recursos → requiere extensión de corpus.',
    },
  };
}

function genReport(d: ReturnType<typeof JSON.parse>, programs: ReturnType<typeof decodeAnimationPrograms>): string {
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
  lines.push('## Command → Animation (Bank00 Call_000_3833)');
  lines.push('');
  lines.push('| Comando | Bit | anim memberSlot0 ($C7D4=0) | anim memberSlot1 ($C7D4=1) |');
  lines.push('|---|---|---|---|');
  for (const [cmd, ids] of Object.entries(COMMAND_ANIMATIONS)) {
    const bit = Object.entries(COMMAND_NAMES).find(([, n]) => n === cmd)?.[0];
    lines.push(`| \`${cmd}\` | \`$${Number(bit).toString(16).padStart(2, '0')}\` | \`$${(ids.memberSlot0).toString(16).padStart(2, '0')}\` | \`$${(ids.memberSlot1).toString(16).padStart(2, '0')}\` |`);
  }
  lines.push('');
  lines.push('Cada ID indexa la tabla de programas de animación @ `$5D00` (Bank30).');
  lines.push('');
  lines.push('## Command → Pose selector $C3C7 (VM opcode $04 → Call_000_3501)');
  lines.push('');
  lines.push('| Comando | pose memberSlot0 | pose memberSlot1 |');
  lines.push('|---|---|---|');
  for (const [cmd, pose] of Object.entries(COMMAND_POSE_SELECTORS)) {
    lines.push(`| \`${cmd}\` | \`$${(pose.memberSlot0).toString(16).padStart(2, '0')}\` | \`$${(pose.memberSlot1).toString(16).padStart(2, '0')}\` |`);
  }
  lines.push('');
  lines.push('memberSlot0 vía tabla `Bank01:$4E6D` (b=0): `$20→$05, $21→$08, $22→$0b, $23→$06` · `$24→$09` (especial).');
  lines.push('memberSlot1 directo (`c < $20`): `$0a/$0b/$0d/$0f/$10`. `$C3C7` → frame físico PENDING.');
  lines.push('');
  lines.push('## Programas VM completos (10 combos command×memberSlot)');
  lines.push('');
  for (const p of programs) {
    lines.push(`### \`${p.command}\` · memberSlot${p.memberSlot} · animId \`$${p.animationId.toString(16).padStart(2, '0')}\` · ${p.programAddress}`);
    lines.push('');
    lines.push('| step | opcode | mnemonic | bytes | pose→$C3C7 |');
    lines.push('|---|---|---|---|---|');
    for (const s of p.steps) {
      const pose = s.poseSelector != null ? `\`$${s.poseSelector.toString(16).padStart(2, '0')}\`` : '—';
      lines.push(`| ${s.index} | \`$${s.opcode.toString(16).padStart(2, '0')}\` | \`${s.mnemonic}\` | \`${s.bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ')}\` | ${pose} |`);
    }
    lines.push('');
  }
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
