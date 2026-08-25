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
