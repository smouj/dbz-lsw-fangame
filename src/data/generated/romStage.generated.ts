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
        "mnemonic": "SET_POSE",
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
        "mnemonic": "VISIBILITY",
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
        "mnemonic": "SET_POSE",
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
        "mnemonic": "SET_POSE",
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
        "mnemonic": "VISIBILITY",
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
        "mnemonic": "SET_POSE",
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
        "mnemonic": "SET_POSE",
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
        "mnemonic": "VISIBILITY",
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
        "mnemonic": "SET_POSE",
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
        "mnemonic": "SET_POSE",
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
        "mnemonic": "VISIBILITY",
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
        "mnemonic": "SET_POSE",
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
        "mnemonic": "SET_POSE",
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
        "mnemonic": "VISIBILITY",
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
        "mnemonic": "SET_POSE",
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
        "mnemonic": "COND_COMPARE",
        "bytes": [
          6,
          0,
          2,
          0,
          0
        ]
      },
      {
        "index": 1,
        "opcode": 4,
        "mnemonic": "SET_POSE",
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
        "mnemonic": "SUB_CALL3",
        "bytes": [
          19,
          4,
          3,
          0,
          0
        ]
      },
      {
        "index": 3,
        "opcode": 5,
        "mnemonic": "VISIBILITY",
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
        "mnemonic": "SET_POSE",
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
        "mnemonic": "COND_COMPARE",
        "bytes": [
          6,
          0,
          3,
          0,
          0
        ]
      },
      {
        "index": 1,
        "opcode": 4,
        "mnemonic": "SET_POSE",
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
        "mnemonic": "SUB_CALL3",
        "bytes": [
          19,
          22,
          4,
          0,
          0
        ]
      },
      {
        "index": 3,
        "opcode": 5,
        "mnemonic": "VISIBILITY",
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
        "mnemonic": "SET_POSE",
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
        "mnemonic": "COND_COMPARE",
        "bytes": [
          6,
          0,
          4,
          0,
          0
        ]
      },
      {
        "index": 1,
        "opcode": 4,
        "mnemonic": "SET_POSE",
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
        "mnemonic": "SUB_CALL3",
        "bytes": [
          19,
          6,
          1,
          0,
          0
        ]
      },
      {
        "index": 3,
        "opcode": 5,
        "mnemonic": "VISIBILITY",
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
        "mnemonic": "COND_COMPARE",
        "bytes": [
          6,
          0,
          4,
          0,
          0
        ]
      },
      {
        "index": 1,
        "opcode": 4,
        "mnemonic": "SET_POSE",
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
        "mnemonic": "SUB_CALL3",
        "bytes": [
          19,
          6,
          1,
          0,
          0
        ]
      },
      {
        "index": 3,
        "opcode": 5,
        "mnemonic": "VISIBILITY",
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
        "mnemonic": "COND_COMPARE",
        "bytes": [
          6,
          0,
          5,
          0,
          0
        ]
      },
      {
        "index": 1,
        "opcode": 4,
        "mnemonic": "SET_POSE",
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
        "mnemonic": "SUB_CALL3",
        "bytes": [
          19,
          6,
          1,
          0,
          0
        ]
      },
      {
        "index": 3,
        "opcode": 5,
        "mnemonic": "VISIBILITY",
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
