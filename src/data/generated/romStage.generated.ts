// ═══════════════════════════════════════════════════════════════
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

export const ROM_STAGE_SEQUENCES: RomStageSequence[] = [
  {
    "stage": "3_stage",
    "level": 1,
    "variant": 0,
    "count": 3,
    "commands": [
      "A",
      "A",
      "DOWN"
    ]
  },
  {
    "stage": "3_stage",
    "level": 1,
    "variant": 1,
    "count": 3,
    "commands": [
      "A",
      "A",
      "B"
    ]
  },
  {
    "stage": "3_stage",
    "level": 1,
    "variant": 2,
    "count": 3,
    "commands": [
      "A",
      "B",
      "B"
    ]
  },
  {
    "stage": "3_stage",
    "level": 1,
    "variant": 3,
    "count": 3,
    "commands": [
      "A",
      "B",
      "RIGHT"
    ]
  },
  {
    "stage": "3_stage",
    "level": 1,
    "variant": 4,
    "count": 3,
    "commands": [
      "B",
      "A",
      "DOWN"
    ]
  },
  {
    "stage": "3_stage",
    "level": 1,
    "variant": 5,
    "count": 3,
    "commands": [
      "B",
      "B",
      "UP"
    ]
  },
  {
    "stage": "3_stage",
    "level": 1,
    "variant": 6,
    "count": 3,
    "commands": [
      "RIGHT",
      "A",
      "B"
    ]
  },
  {
    "stage": "3_stage",
    "level": 1,
    "variant": 7,
    "count": 3,
    "commands": [
      "A",
      "UP",
      "B"
    ]
  },
  {
    "stage": "4_stage",
    "level": 2,
    "variant": 0,
    "count": 4,
    "commands": [
      "B",
      "A",
      "A",
      "B"
    ]
  },
  {
    "stage": "4_stage",
    "level": 2,
    "variant": 1,
    "count": 4,
    "commands": [
      "A",
      "B",
      "A",
      "UP"
    ]
  },
  {
    "stage": "4_stage",
    "level": 2,
    "variant": 2,
    "count": 4,
    "commands": [
      "A",
      "A",
      "B",
      "DOWN"
    ]
  },
  {
    "stage": "4_stage",
    "level": 2,
    "variant": 3,
    "count": 4,
    "commands": [
      "A",
      "A",
      "RIGHT",
      "B"
    ]
  },
  {
    "stage": "4_stage",
    "level": 2,
    "variant": 4,
    "count": 4,
    "commands": [
      "B",
      "DOWN",
      "A",
      "B"
    ]
  },
  {
    "stage": "4_stage",
    "level": 2,
    "variant": 5,
    "count": 4,
    "commands": [
      "RIGHT",
      "A",
      "A",
      "B"
    ]
  },
  {
    "stage": "4_stage",
    "level": 2,
    "variant": 6,
    "count": 4,
    "commands": [
      "UP",
      "A",
      "A",
      "B"
    ]
  },
  {
    "stage": "4_stage",
    "level": 2,
    "variant": 7,
    "count": 4,
    "commands": [
      "RIGHT",
      "A",
      "B",
      "RIGHT"
    ]
  },
  {
    "stage": "5_stage",
    "level": 3,
    "variant": 0,
    "count": 5,
    "commands": [
      "UP",
      "A",
      "B",
      "B",
      "DOWN"
    ]
  },
  {
    "stage": "5_stage",
    "level": 3,
    "variant": 1,
    "count": 5,
    "commands": [
      "RIGHT",
      "A",
      "B",
      "UP",
      "B"
    ]
  },
  {
    "stage": "5_stage",
    "level": 3,
    "variant": 2,
    "count": 5,
    "commands": [
      "A",
      "UP",
      "B",
      "A",
      "UP"
    ]
  },
  {
    "stage": "5_stage",
    "level": 3,
    "variant": 3,
    "count": 5,
    "commands": [
      "A",
      "B",
      "UP",
      "A",
      "RIGHT"
    ]
  },
  {
    "stage": "5_stage",
    "level": 3,
    "variant": 4,
    "count": 5,
    "commands": [
      "B",
      "A",
      "DOWN",
      "A",
      "B"
    ]
  },
  {
    "stage": "5_stage",
    "level": 3,
    "variant": 5,
    "count": 5,
    "commands": [
      "A",
      "A",
      "A",
      "B",
      "RIGHT"
    ]
  },
  {
    "stage": "5_stage",
    "level": 3,
    "variant": 6,
    "count": 5,
    "commands": [
      "A",
      "B",
      "B",
      "RIGHT",
      "B"
    ]
  },
  {
    "stage": "5_stage",
    "level": 3,
    "variant": 7,
    "count": 5,
    "commands": [
      "B",
      "A",
      "B",
      "UP",
      "B"
    ]
  },
  {
    "stage": "6_stage",
    "level": 4,
    "variant": 0,
    "count": 6,
    "commands": [
      "A",
      "UP",
      "A",
      "B",
      "B",
      "DOWN"
    ]
  },
  {
    "stage": "6_stage",
    "level": 4,
    "variant": 1,
    "count": 6,
    "commands": [
      "B",
      "RIGHT",
      "A",
      "B",
      "UP",
      "B"
    ]
  },
  {
    "stage": "6_stage",
    "level": 4,
    "variant": 2,
    "count": 6,
    "commands": [
      "B",
      "A",
      "UP",
      "A",
      "B",
      "UP"
    ]
  },
  {
    "stage": "6_stage",
    "level": 4,
    "variant": 3,
    "count": 6,
    "commands": [
      "UP",
      "B",
      "B",
      "UP",
      "A",
      "RIGHT"
    ]
  },
  {
    "stage": "6_stage",
    "level": 4,
    "variant": 4,
    "count": 6,
    "commands": [
      "DOWN",
      "B",
      "A",
      "DOWN",
      "A",
      "B"
    ]
  },
  {
    "stage": "6_stage",
    "level": 4,
    "variant": 5,
    "count": 6,
    "commands": [
      "A",
      "RIGHT",
      "A",
      "B",
      "RIGHT",
      "UP"
    ]
  },
  {
    "stage": "6_stage",
    "level": 4,
    "variant": 6,
    "count": 6,
    "commands": [
      "A",
      "B",
      "UP",
      "B",
      "RIGHT",
      "B"
    ]
  },
  {
    "stage": "6_stage",
    "level": 4,
    "variant": 7,
    "count": 6,
    "commands": [
      "RIGHT",
      "B",
      "A",
      "B",
      "UP",
      "B"
    ]
  },
  {
    "stage": "level5_10cmd",
    "level": 5,
    "variant": 0,
    "count": 10,
    "commands": [
      "UP",
      "RIGHT",
      "B",
      "RIGHT",
      "UP",
      "B",
      "DOWN",
      "RIGHT",
      "DOWN",
      "DOWN"
    ]
  },
  {
    "stage": "level5_10cmd",
    "level": 5,
    "variant": 1,
    "count": 10,
    "commands": [
      "A",
      "A",
      "B",
      "UP",
      "B",
      "A",
      "A",
      "A",
      "A",
      "B"
    ]
  },
  {
    "stage": "level5_10cmd",
    "level": 5,
    "variant": 2,
    "count": 10,
    "commands": [
      "UP",
      "A",
      "B",
      "A",
      "RIGHT",
      "B",
      "A",
      "A",
      "B",
      "RIGHT"
    ]
  },
  {
    "stage": "level5_10cmd",
    "level": 5,
    "variant": 3,
    "count": 10,
    "commands": [
      "A",
      "UP",
      "B",
      "A",
      "A",
      "B",
      "UP",
      "A",
      "B",
      "DOWN"
    ]
  },
  {
    "stage": "level5_10cmd",
    "level": 5,
    "variant": 4,
    "count": 10,
    "commands": [
      "A",
      "A",
      "A",
      "A",
      "B",
      "A",
      "A",
      "A",
      "A",
      "B"
    ]
  },
  {
    "stage": "level5_10cmd",
    "level": 5,
    "variant": 5,
    "count": 10,
    "commands": [
      "A",
      "B",
      "UP",
      "A",
      "B",
      "A",
      "UP",
      "B",
      "A",
      "RIGHT"
    ]
  },
  {
    "stage": "level5_10cmd",
    "level": 5,
    "variant": 6,
    "count": 10,
    "commands": [
      "A",
      "B",
      "UP",
      "A",
      "B",
      "A",
      "UP",
      "B",
      "A",
      "RIGHT"
    ]
  },
  {
    "stage": "level5_10cmd",
    "level": 5,
    "variant": 7,
    "count": 10,
    "commands": [
      "A",
      "B",
      "UP",
      "A",
      "B",
      "A",
      "UP",
      "B",
      "A",
      "RIGHT"
    ]
  }
];

export const ROM_STAGE_LEVEL_LABEL: Record<number, string> = {
  "1": "3_stage",
  "2": "4_stage",
  "3": "5_stage",
  "4": "6_stage",
  "5": "level5_10cmd"
};

/** command → animation IDs cargados por Call_000_3833 (Bank00:$3833).
 *  memberSlot0 = $c7d4=0 (member 0, $C700) · memberSlot1 = $c7d4=1 (member 1, $C703).
 *  Cada ID indexa la tabla de programas de animación @ $5D00 (Bank30). */
export const ROM_STAGE_COMMAND_ANIMATIONS: Record<
  RomStageCommand,
  { memberSlot0: number; memberSlot1: number; lastMemberSlot1?: number }
> = {
  "A": {
    "memberSlot0": 0,
    "memberSlot1": 5
  },
  "B": {
    "memberSlot0": 1,
    "memberSlot1": 6
  },
  "RIGHT": {
    "memberSlot0": 2,
    "memberSlot1": 7
  },
  "UP": {
    "memberSlot0": 3,
    "memberSlot1": 8
  },
  "DOWN": {
    "memberSlot0": 4,
    "memberSlot1": 9
  }
};

/** command → pose selector $C3C7 (VM opcode $04 → Call_000_3501).
 *  memberSlot0 vía Bank01:$4E6D (b=0) + $24→$09 · memberSlot1 directo. VERIFICADO.
 *  $C3C7 → frame físico (metasprite/GFX → physicalId) queda PENDING. */
export const ROM_STAGE_COMMAND_POSE: Record<
  RomStageCommand,
  { memberSlot0: number; memberSlot1: number }
> = {
  "A": {
    "memberSlot0": 5,
    "memberSlot1": 10
  },
  "B": {
    "memberSlot0": 8,
    "memberSlot1": 11
  },
  "RIGHT": {
    "memberSlot0": 11,
    "memberSlot1": 13
  },
  "UP": {
    "memberSlot0": 6,
    "memberSlot1": 15
  },
  "DOWN": {
    "memberSlot0": 9,
    "memberSlot1": 16
  }
};

export interface RomStageVmStep {
  index: number;
  opcode: number;
  mnemonic: string;
  bytes: number[];
  memberSlot?: number;
  poseSelector?: number;
  waitFrameCounter?: number;
  syncEvent?: { arg1: number; arg2: number };
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

export const ROM_STAGE_VM_CONTRACT = {
  evidence: 'ROM_STATIC_VERIFIED',
  source: 'Bank30:$5D00 programs interpreted by Jump_07e_70ab; command dispatch via Bank00:$3833.',
  programFormat: '[count][5-byte instruction × count]',
  commandToProgramId: {
    A: { actor0: 0, actor1: 5 },
    B: { actor0: 1, actor1: 6 },
    RIGHT: { actor0: 2, actor1: 7 },
    UP: { actor0: 3, actor1: 8 },
    DOWN: { actor0: 4, actor1: 9 },
  },
  programLengths: {
    actor0: { programIds: [0, 1, 2, 3, 4], instructionCount: 3 },
    actor1AtoB: { programIds: [5, 6], instructionCount: 5 },
    actor1Directional: { programIds: [7, 8, 9], instructionCount: 4 },
  },
  queues: {
    count: 2,
    model: 'independent per participant',
    implication: 'Do not mirror/reuse one animation timeline for both ActionObjects.',
  },
  gameplayClock: {
    waitAnimationOpcode: 0x05,
    waitFrameCounterOpcode: 0x06,
    frameCounterField: 'ActionObject+4',
    syncEventOpcode: 0x13,
    implication: 'Stage input timing is coupled to the physical frame program, not to setTimeout or fixed pose durations.',
  },
} as const;

export const ROM_STAGE_PHYSICAL_COMMANDS = {
  evidence: 'ROM_STATIC_VERIFIED',
  source: 'USA ROM canonical with Spain contrast; Bank61 Stage resources and Bank30:$5D00 programs.',
  actor: {
    A: { bank: 0x61, resourceIndex: 1, sequence: 'actorVisualProfileKey', frameInstances: 4, totalTicks: 13 },
    B: { bank: 0x61, resourceIndex: 2, sequence: 'actorVisualProfileKey', frameInstances: 6, totalTicks: 32 },
    RIGHT: { bank: 0x61, resourceIndex: 3, sequence: 'actorVisualProfileKey', frameInstances: 7, totalTicks: 41 },
    UP: { bank: 0x61, resourceIndex: 4, sequence: 'actorVisualProfileKey', frameInstances: 7, totalTicks: 41 },
    DOWN: { bank: 0x61, resourceIndex: 4, sequence: 9, frameInstances: 9, totalTicks: 53 },
  },
  target: {
    resourceIndex: 0,
    A: { waitActorFrame: 2, sequence: 0x0a, frameInstances: 6, totalTicks: 13 },
    B: { waitActorFrame: 3, sequence: 0x0b, frameInstances: 8, totalTicks: 27 },
    RIGHT: { waitActorFrame: 4, sequence: 0x0d, frameInstances: 15, totalTicks: 23 },
    UP: { waitActorFrame: 4, sequence: 0x0f, frameInstances: 8, totalTicks: 15 },
    DOWN: { waitActorFrame: 5, sequence: 0x10, frameInstances: 5, totalTicks: 9 },
  },
  lastCommandB: {
    waitActorFrame: 3,
    waitTicksBeforeTarget: 1,
    targetSequence: 0x17,
    frameInstances: 11,
    totalTicks: 54,
    emitsSfx: true,
    applyFrameDelta: true,
    restoreTargetSequence: 0,
  },
} as const;

export const ROM_STAGE_QTE_RUNTIME = {
  evidence: 'ROM_STATIC_VERIFIED',
  commandCount: 0xca5e,
  commandIndex: 0xca5f,
  expectedCommands: 0xca60,
  resultPerCommand: 0xca6a,
  temporalCounter: 0xcb77,
  acceptedMask: 0x3d,
  acceptedInputs: ['RIGHT', 'UP', 'DOWN', 'A', 'B'],
  wrongInputAdvancesIndex: true,
} as const;

export const ROM_STAGE_AB_WINDOW = {
  evidence: 'ROM_STATIC_VERIFIED',
  durationTicks: 30,
  acceptedInputs: ['A', 'B'],
  recordsPressedButton: true,
  recordsPressedTick: true,
  thresholds: [10, 25, 30],
  semanticName: 'PENDING_CONTEXT_LINK',
} as const;

/** Programas VM completos (10 combos command×memberSlot), opcodes en orden.
 *  Fuente: Bank30:$5D00 (programas de animación). Interpreter Jump_07e_70ab.
 *  Cada input Stage despacha un microprograma distinto por participante. */
export const ROM_STAGE_COMMAND_PROGRAMS: RomStageVmProgram[] = [
  {
    "command": "A",
    "memberSlot": 0,
    "animationId": 0,
    "tableOffset": 124,
    "programAddress": "Bank30:$5D7C (file 0xc1d7c)",
    "count": 3,
    "steps": [
      {
        "index": 0,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          0,
          0,
          32,
          160
        ],
        "memberSlot": 0,
        "poseSelector": 5
      },
      {
        "index": 1,
        "opcode": 5,
        "mnemonic": "WAIT_ACTION_OBJECT_ANIMATION",
        "bytes": [
          5,
          0,
          0,
          0,
          0
        ]
      },
      {
        "index": 2,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          0,
          0,
          0,
          160
        ],
        "memberSlot": 0,
        "poseSelector": 0
      }
    ],
    "poseWrites": [
      5,
      0
    ]
  },
  {
    "command": "B",
    "memberSlot": 0,
    "animationId": 1,
    "tableOffset": 140,
    "programAddress": "Bank30:$5D8C (file 0xc1d8c)",
    "count": 3,
    "steps": [
      {
        "index": 0,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          0,
          0,
          33,
          160
        ],
        "memberSlot": 0,
        "poseSelector": 8
      },
      {
        "index": 1,
        "opcode": 5,
        "mnemonic": "WAIT_ACTION_OBJECT_ANIMATION",
        "bytes": [
          5,
          0,
          0,
          0,
          0
        ]
      },
      {
        "index": 2,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          0,
          0,
          0,
          160
        ],
        "memberSlot": 0,
        "poseSelector": 0
      }
    ],
    "poseWrites": [
      8,
      0
    ]
  },
  {
    "command": "RIGHT",
    "memberSlot": 0,
    "animationId": 2,
    "tableOffset": 156,
    "programAddress": "Bank30:$5D9C (file 0xc1d9c)",
    "count": 3,
    "steps": [
      {
        "index": 0,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          0,
          0,
          34,
          160
        ],
        "memberSlot": 0,
        "poseSelector": 11
      },
      {
        "index": 1,
        "opcode": 5,
        "mnemonic": "WAIT_ACTION_OBJECT_ANIMATION",
        "bytes": [
          5,
          0,
          0,
          0,
          0
        ]
      },
      {
        "index": 2,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          0,
          0,
          0,
          160
        ],
        "memberSlot": 0,
        "poseSelector": 0
      }
    ],
    "poseWrites": [
      11,
      0
    ]
  },
  {
    "command": "UP",
    "memberSlot": 0,
    "animationId": 3,
    "tableOffset": 172,
    "programAddress": "Bank30:$5DAC (file 0xc1dac)",
    "count": 3,
    "steps": [
      {
        "index": 0,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          0,
          0,
          35,
          160
        ],
        "memberSlot": 0,
        "poseSelector": 6
      },
      {
        "index": 1,
        "opcode": 5,
        "mnemonic": "WAIT_ACTION_OBJECT_ANIMATION",
        "bytes": [
          5,
          0,
          0,
          0,
          0
        ]
      },
      {
        "index": 2,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          0,
          0,
          0,
          160
        ],
        "memberSlot": 0,
        "poseSelector": 0
      }
    ],
    "poseWrites": [
      6,
      0
    ]
  },
  {
    "command": "DOWN",
    "memberSlot": 0,
    "animationId": 4,
    "tableOffset": 188,
    "programAddress": "Bank30:$5DBC (file 0xc1dbc)",
    "count": 3,
    "steps": [
      {
        "index": 0,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          0,
          0,
          36,
          160
        ],
        "memberSlot": 0,
        "poseSelector": 9
      },
      {
        "index": 1,
        "opcode": 5,
        "mnemonic": "WAIT_ACTION_OBJECT_ANIMATION",
        "bytes": [
          5,
          0,
          0,
          0,
          0
        ]
      },
      {
        "index": 2,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          0,
          0,
          0,
          160
        ],
        "memberSlot": 0,
        "poseSelector": 0
      }
    ],
    "poseWrites": [
      9,
      0
    ]
  },
  {
    "command": "A",
    "memberSlot": 1,
    "animationId": 5,
    "tableOffset": 204,
    "programAddress": "Bank30:$5DCC (file 0xc1dcc)",
    "count": 5,
    "steps": [
      {
        "index": 0,
        "opcode": 6,
        "mnemonic": "WAIT_ACTION_OBJECT_FRAME_COUNTER",
        "bytes": [
          6,
          0,
          2,
          0,
          0
        ],
        "waitFrameCounter": 2
      },
      {
        "index": 1,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          1,
          0,
          10,
          160
        ],
        "memberSlot": 1,
        "poseSelector": 10
      },
      {
        "index": 2,
        "opcode": 19,
        "mnemonic": "EMIT_SYNC_EVENT",
        "bytes": [
          19,
          4,
          3,
          0,
          0
        ],
        "syncEvent": {
          "arg1": 4,
          "arg2": 3
        }
      },
      {
        "index": 3,
        "opcode": 5,
        "mnemonic": "WAIT_ACTION_OBJECT_ANIMATION",
        "bytes": [
          5,
          1,
          0,
          0,
          0
        ]
      },
      {
        "index": 4,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          1,
          0,
          0,
          160
        ],
        "memberSlot": 1,
        "poseSelector": 0
      }
    ],
    "poseWrites": [
      10,
      0
    ]
  },
  {
    "command": "B",
    "memberSlot": 1,
    "animationId": 6,
    "tableOffset": 230,
    "programAddress": "Bank30:$5DE6 (file 0xc1de6)",
    "count": 5,
    "steps": [
      {
        "index": 0,
        "opcode": 6,
        "mnemonic": "WAIT_ACTION_OBJECT_FRAME_COUNTER",
        "bytes": [
          6,
          0,
          3,
          0,
          0
        ],
        "waitFrameCounter": 3
      },
      {
        "index": 1,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          1,
          0,
          11,
          160
        ],
        "memberSlot": 1,
        "poseSelector": 11
      },
      {
        "index": 2,
        "opcode": 19,
        "mnemonic": "EMIT_SYNC_EVENT",
        "bytes": [
          19,
          22,
          4,
          0,
          0
        ],
        "syncEvent": {
          "arg1": 22,
          "arg2": 4
        }
      },
      {
        "index": 3,
        "opcode": 5,
        "mnemonic": "WAIT_ACTION_OBJECT_ANIMATION",
        "bytes": [
          5,
          1,
          0,
          0,
          0
        ]
      },
      {
        "index": 4,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          1,
          0,
          0,
          160
        ],
        "memberSlot": 1,
        "poseSelector": 0
      }
    ],
    "poseWrites": [
      11,
      0
    ]
  },
  {
    "command": "RIGHT",
    "memberSlot": 1,
    "animationId": 7,
    "tableOffset": 256,
    "programAddress": "Bank30:$5E00 (file 0xc1e00)",
    "count": 4,
    "steps": [
      {
        "index": 0,
        "opcode": 6,
        "mnemonic": "WAIT_ACTION_OBJECT_FRAME_COUNTER",
        "bytes": [
          6,
          0,
          4,
          0,
          0
        ],
        "waitFrameCounter": 4
      },
      {
        "index": 1,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          1,
          0,
          13,
          128
        ],
        "memberSlot": 1,
        "poseSelector": 13
      },
      {
        "index": 2,
        "opcode": 19,
        "mnemonic": "EMIT_SYNC_EVENT",
        "bytes": [
          19,
          6,
          1,
          0,
          0
        ],
        "syncEvent": {
          "arg1": 6,
          "arg2": 1
        }
      },
      {
        "index": 3,
        "opcode": 5,
        "mnemonic": "WAIT_ACTION_OBJECT_ANIMATION",
        "bytes": [
          5,
          1,
          0,
          0,
          0
        ]
      }
    ],
    "poseWrites": [
      13
    ]
  },
  {
    "command": "UP",
    "memberSlot": 1,
    "animationId": 8,
    "tableOffset": 277,
    "programAddress": "Bank30:$5E15 (file 0xc1e15)",
    "count": 4,
    "steps": [
      {
        "index": 0,
        "opcode": 6,
        "mnemonic": "WAIT_ACTION_OBJECT_FRAME_COUNTER",
        "bytes": [
          6,
          0,
          4,
          0,
          0
        ],
        "waitFrameCounter": 4
      },
      {
        "index": 1,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          1,
          0,
          15,
          128
        ],
        "memberSlot": 1,
        "poseSelector": 15
      },
      {
        "index": 2,
        "opcode": 19,
        "mnemonic": "EMIT_SYNC_EVENT",
        "bytes": [
          19,
          6,
          1,
          0,
          0
        ],
        "syncEvent": {
          "arg1": 6,
          "arg2": 1
        }
      },
      {
        "index": 3,
        "opcode": 5,
        "mnemonic": "WAIT_ACTION_OBJECT_ANIMATION",
        "bytes": [
          5,
          1,
          0,
          0,
          0
        ]
      }
    ],
    "poseWrites": [
      15
    ]
  },
  {
    "command": "DOWN",
    "memberSlot": 1,
    "animationId": 9,
    "tableOffset": 298,
    "programAddress": "Bank30:$5E2A (file 0xc1e2a)",
    "count": 4,
    "steps": [
      {
        "index": 0,
        "opcode": 6,
        "mnemonic": "WAIT_ACTION_OBJECT_FRAME_COUNTER",
        "bytes": [
          6,
          0,
          5,
          0,
          0
        ],
        "waitFrameCounter": 5
      },
      {
        "index": 1,
        "opcode": 4,
        "mnemonic": "START_ACTION_OBJECT_ANIMATION",
        "bytes": [
          4,
          1,
          0,
          16,
          128
        ],
        "memberSlot": 1,
        "poseSelector": 16
      },
      {
        "index": 2,
        "opcode": 19,
        "mnemonic": "EMIT_SYNC_EVENT",
        "bytes": [
          19,
          6,
          1,
          0,
          0
        ],
        "syncEvent": {
          "arg1": 6,
          "arg2": 1
        }
      },
      {
        "index": 3,
        "opcode": 5,
        "mnemonic": "WAIT_ACTION_OBJECT_ANIMATION",
        "bytes": [
          5,
          1,
          0,
          0,
          0
        ]
      }
    ],
    "poseWrites": [
      16
    ]
  }
];

/** Descriptor de animación de personaje $CA0D (stride 3, [bank][ptr-lo][ptr-hi]) —
 *  writers clasificados 100%, gramática decodificada, y hallazgo de separación de
 *  bancos ($61 básica/Stage vs $62/$63/$64 técnicas del corpus de 66 recursos). */
export const ROM_STAGE_CHAR_ANIM_DESCRIPTOR = {
  "table": "$CA0D (stride 3, [bank][ptr-lo][ptr-hi])",
  "index": "c devuelto por Call_000_3501 (arg3: $20-$23→c=1..4, $24→c=4, <$20→c=0)",
  "loader": "Call_000_2fe7 (Bank00): hl = $CA0D + c*3",
  "consumer": "Call_000_0914 → $C3CC/$C3CD → Call_000_0b8d → $C3CE/$C3CF",
  "grammar": {
    "byte0": "bank (bankswitch vía Call_000_0f9b → $2000)",
    "byte1": "ptr-lo → $C3CE",
    "byte2": "ptr-hi → $C3CF",
    "pointee": "resource base con 3 raíces relativas: +0 tabla de secuencias (u16), +2 tabla de metasprites (u16), +4 tabla de frame-graphics (u16) — idéntico a render-fighter-physical.ts"
  },
  "writersClassified": "COMPLETE (0 desconocidos)",
  "writers": [
    {
      "address": "Bank00:$08DD (Call_000_08dd)",
      "role": "escribe [b][e][d] = [bank][ptr-lo][ptr-hi]",
      "evidence": "mgbdis bank_000.asm Call_000_08dd"
    },
    {
      "address": "Bank00:$08E3 (Call_000_08e3)",
      "role": "escribe [b][e][d] (variante de puntero, tabla $CA28)",
      "evidence": "mgbdis bank_000.asm Call_000_08e3"
    },
    {
      "address": "Bank00:$3702 (Call_000_3702)",
      "role": "orquestador: Call_000_2fe7 (hl=$CA0D+c*3) + Call_000_08dd",
      "evidence": "mgbdis bank_000.asm Call_000_3702"
    },
    {
      "address": "Bank00:$3685 (Call_000_3685)",
      "role": "orquestador: Call_000_2ff8 (hl=$CA28+c*3) + Call_000_08e3",
      "evidence": "mgbdis bank_000.asm Call_000_3685"
    }
  ],
  "descriptorOrigin": {
    "resolver": "Call_000_1266 (Bank00:$1266): bankswitch a bank A, lee u16 en $4008 + index*4, devuelve de = $4000 + value*4",
    "standingBank": "Call_000_35ca (Bank00:$35CA, llamado desde Bank01:$4A45) escribe $CA0D[0..7] con bank $61 (animación de pie/básica)",
    "techniqueBank": "Call_000_2afe (Bank00:$2AFE) lee Bank11 char_data+6 → bank = $62 + (id/25), localId = id%25 (bancos $62/$63/$64 = técnicas)",
    "charData": "Bank11 (Call_000_2a77 + offset 6) = animation resource id por personaje"
  },
  "bankSeparation": {
    "finding": "CRITICAL — bank $61 (animación de pie/básica) es SEPARADO de banks $62/$63/$64 (66 recursos de técnicas del catálogo).",
    "stageAttacks": "Los comandos Stage (A/B/RIGHT/UP/DOWN) usan $CA0D[1..4] → bank $61, que NO está en el corpus físico de 66 recursos.",
    "physicalCorpusCoverage": "El corpus físico (552 promovidos / 2371 instancias) cubre banks $62/$63/$64 (técnicas); NO cubre bank $61 (básica/Stage).",
    "implication": "Cerrar $CA0D → physicalId para Stage requiere EXTENDER el corpus a bank $61 (y los bancos de pie por personaje), no solo mapear a los 66 recursos existentes."
  },
  "toPhysical": "VERIFIED hasta resource base (3 raíces) + gramática + writers. JOIN físico PENDIENTE: bank $61 (Stage/básica) está fuera del corpus de 66 recursos → requiere extensión de corpus."
};

/** STATIC ENUMERATION: bancos/orígenes que alimentan $CA0D[c*3].bank.
 *  Stage QTE básico → bank $61 (slots 1..4). Técnicas → $62/$63/$64 (slots 6,8). */
export const ROM_STAGE_CHAR_ANIM_BANKS = {
  "descriptorTable": "$CA0D (stride 3, [bank][ptr-lo][ptr-hi])",
  "uniqueWriter": "Call_000_3702 (= Call_000_2fe7 → hl=$CA0D+c*3 + Call_000_08dd → [b][e][d]) — único escritor de $CA0D (9 call sites totales)",
  "bankResolver": "Call_000_1266 (a=bank, de=index): de = $4000 + u16($4008 + index*4)*4",
  "slots": [
    {
      "slot": 0,
      "animationBank": 97,
      "resourceIndex": 0,
      "resourceBase": 16432,
      "sequenceCount": 32,
      "loader": "Call_000_35ca (Bank00:$35CA, desde Bank01:$4A45 estado de pie)",
      "meaning": "idle/neutral"
    },
    {
      "slot": 1,
      "animationBank": 97,
      "resourceIndex": 1,
      "resourceBase": 18800,
      "sequenceCount": 6,
      "loader": "Call_000_35ca",
      "meaning": "A (pose $05)"
    },
    {
      "slot": 2,
      "animationBank": 97,
      "resourceIndex": 2,
      "resourceBase": 19464,
      "sequenceCount": 12,
      "loader": "Call_000_35ca",
      "meaning": "B (pose $08)"
    },
    {
      "slot": 3,
      "animationBank": 97,
      "resourceIndex": 3,
      "resourceBase": 20852,
      "sequenceCount": 14,
      "loader": "Call_000_35ca",
      "meaning": "RIGHT (pose $0B)"
    },
    {
      "slot": 4,
      "animationBank": 97,
      "resourceIndex": 4,
      "resourceBase": 22532,
      "sequenceCount": 10,
      "loader": "Call_000_35ca",
      "meaning": "UP (pose $06) / DOWN (pose $09)"
    },
    {
      "slot": 5,
      "animationBank": 97,
      "resourceIndex": 5,
      "resourceBase": 23932,
      "sequenceCount": 4,
      "loader": "Call_000_35ca",
      "meaning": "básica 5 (no usada por QTE A/B/RIGHT/UP/DOWN)"
    },
    {
      "slot": 6,
      "animationBank": "var $62/$63/$64",
      "resourceIndex": "localId = id % 25",
      "resourceBase": "var",
      "sequenceCount": null,
      "loader": "Bank01:$7000s (Call_000_2afe + Call_000_1266 + Call_000_3702 c=$06)",
      "meaning": "técnica (no Stage QTE básico)"
    },
    {
      "slot": 7,
      "animationBank": 97,
      "resourceIndex": 6,
      "resourceBase": 24096,
      "sequenceCount": 27,
      "loader": "Call_000_35ca",
      "meaning": "básica 6 (no usada por QTE A/B/RIGHT/UP/DOWN)"
    },
    {
      "slot": 8,
      "animationBank": "var $62/$63/$64",
      "resourceIndex": "localId = id % 25",
      "resourceBase": "var",
      "sequenceCount": null,
      "loader": "Bank01:$76A6 (Call_000_2afe + Call_000_1266 + Call_000_3702 c=$08)",
      "meaning": "técnica (no Stage QTE básico)"
    }
  ],
  "stageAttacks": {
    "commands": [
      "A",
      "B",
      "RIGHT",
      "UP",
      "DOWN"
    ],
    "poseSelectorsMemberSlot0": {
      "A": 5,
      "B": 8,
      "RIGHT": 11,
      "UP": 6,
      "DOWN": 9
    },
    "frameGroups": {
      "A": 1,
      "B": 2,
      "RIGHT": 3,
      "UP": 4,
      "DOWN": 4
    },
    "slotsUsed": [
      1,
      2,
      3,
      4
    ],
    "animationBank": 97,
    "note": "Stage QTE básico resuelve SIEMPRE a bank $61 (slots 1..4). Los slots 6 y 8 (técnicas $62-$64) NO participan en el QTE de Stage."
  },
  "animationBanksObserved": [
    97,
    98,
    99,
    100
  ],
  "noOtherBanks": "NO hay $6B/$69/$65/$75 en $CA0D. Esos bancos alimentan OTRAS estructuras: $6B→$cc02 (char data auxiliar), $69→Call_000_2b65/2b7a (char_data+1/+2), $65→Call_000_2b30 (char_data+7/+8), y $CA28 vía Call_000_3685 (bank $31+char_data+1 = graphics bank). Ninguno escribe $CA0D.",
  "bank61": {
    "resourceCount": 7,
    "resources": [
      {
        "resourceIndex": 0,
        "resourceBase": 16432,
        "sequenceCount": 32
      },
      {
        "resourceIndex": 1,
        "resourceBase": 18800,
        "sequenceCount": 6
      },
      {
        "resourceIndex": 2,
        "resourceBase": 19464,
        "sequenceCount": 12
      },
      {
        "resourceIndex": 3,
        "resourceBase": 20852,
        "sequenceCount": 14
      },
      {
        "resourceIndex": 4,
        "resourceBase": 22532,
        "sequenceCount": 10
      },
      {
        "resourceIndex": 5,
        "resourceBase": 23932,
        "sequenceCount": 4
      },
      {
        "resourceIndex": 6,
        "resourceBase": 24096,
        "sequenceCount": 27
      }
    ]
  },
  "techniqueBanks": [
    {
      "bank": 98,
      "localIdRange": [
        0,
        24
      ],
      "resourceBases": [
        16492,
        16796,
        17172,
        17556,
        18632,
        19092,
        19640,
        20100,
        20980,
        21336,
        21804,
        22400,
        22908,
        23212,
        23796,
        24228,
        24628,
        25248,
        25612,
        26168,
        26528,
        26960,
        27740,
        28280,
        28728
      ]
    },
    {
      "bank": 99,
      "localIdRange": [
        0,
        24
      ],
      "resourceBases": [
        16492,
        16840,
        17356,
        17944,
        19892,
        20244,
        20592,
        21120,
        21624,
        22240,
        22604,
        23044,
        24092,
        24680,
        25752,
        26636,
        26636,
        26636,
        26636,
        27196,
        27848,
        28504,
        29428,
        30532,
        31636
      ]
    },
    {
      "bank": 100,
      "localIdRange": [
        0,
        24
      ],
      "resourceBases": [
        16456,
        17840,
        18964,
        20076,
        21196,
        22552,
        23288,
        24460,
        25596,
        26640,
        27572,
        28500,
        29352,
        30536,
        31124,
        31124,
        16408,
        20460,
        60416,
        18436,
        18436,
        18444,
        18444,
        18444,
        18448
      ]
    }
  ],
  "evidence": "mgbdis bank_000.asm Call_000_35ca/$3702/$1266 + bank_001.asm $8384/$9477 + dump $4008 (Call_000_1266)"
};
