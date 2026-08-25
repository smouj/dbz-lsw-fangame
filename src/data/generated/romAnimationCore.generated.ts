// ═══════════════════════════════════════════════════════════════════
// GENERADO — no editar a mano. Fuente: scripts/build-rom-animation-core.ts
// Bank $61 (standing/basic) full structural decode + Goku golden gate.
// ═══════════════════════════════════════════════════════════════════

/** 7 recursos de pie/básica bank $61 (resourceIndex 0..6). */
export const ROM_BANK61_ANIMATION_CORE_RESOURCE_BASES: readonly number[] = [16432,18800,19464,20852,22532,23932,24096];

export interface RomAnimationCoreFrame {
  frameIndex: number;
  visualFrameId: number;
  durationTicks: number;
  offsetX: number;
  offsetY: number;
  frameAddress: number;
}

export interface RomAnimationCoreSequence {
  selector: number;
  frameCount: number;
  sequenceAddress: number;
  frames: RomAnimationCoreFrame[];
}

export interface RomAnimationCoreResource {
  resourceIndex: number;
  resourceBase: number;
  sequenceTable: number;
  sequenceCount: number;
  sequences: RomAnimationCoreSequence[];
}

/** Decodificación estructural completa de bank $61 (7 recursos). */
export const ROM_BANK61_ANIMATION_CORE: readonly RomAnimationCoreResource[] = [
  {
    "resourceIndex": 0,
    "resourceBase": 16432,
    "sequenceTable": 54,
    "sequenceCount": 32,
    "sequences": [
      {
        "selector": 0,
        "frameCount": 1,
        "sequenceAddress": 119,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 0,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 120
          }
        ]
      },
      {
        "selector": 1,
        "frameCount": 1,
        "sequenceAddress": 124,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 125
          }
        ]
      },
      {
        "selector": 2,
        "frameCount": 1,
        "sequenceAddress": 129,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 130
          }
        ]
      },
      {
        "selector": 3,
        "frameCount": 6,
        "sequenceAddress": 134,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 135
          },
          {
            "frameIndex": 1,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 11,
            "frameAddress": 139
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 18,
            "offsetY": 0,
            "offsetX": 13,
            "frameAddress": 143
          },
          {
            "frameIndex": 3,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 12,
            "frameAddress": 147
          },
          {
            "frameIndex": 4,
            "visualFrameId": 0,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 151
          },
          {
            "frameIndex": 5,
            "visualFrameId": 0,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 155
          }
        ]
      },
      {
        "selector": 4,
        "frameCount": 5,
        "sequenceAddress": 159,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": -2,
            "offsetX": 0,
            "frameAddress": 160
          },
          {
            "frameIndex": 1,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -8,
            "offsetX": 0,
            "frameAddress": 164
          },
          {
            "frameIndex": 2,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -14,
            "offsetX": 0,
            "frameAddress": 168
          },
          {
            "frameIndex": 3,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -15,
            "offsetX": 0,
            "frameAddress": 172
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -13,
            "offsetX": 0,
            "frameAddress": 176
          }
        ]
      },
      {
        "selector": 5,
        "frameCount": 5,
        "sequenceAddress": 180,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 181
          },
          {
            "frameIndex": 1,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 185
          },
          {
            "frameIndex": 2,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 189
          },
          {
            "frameIndex": 3,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 193
          },
          {
            "frameIndex": 4,
            "visualFrameId": 4,
            "durationTicks": 16,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 197
          }
        ]
      },
      {
        "selector": 6,
        "frameCount": 3,
        "sequenceAddress": 201,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 16,
            "durationTicks": 21,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 202
          },
          {
            "frameIndex": 1,
            "visualFrameId": 17,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 206
          },
          {
            "frameIndex": 2,
            "visualFrameId": 5,
            "durationTicks": 50,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 210
          }
        ]
      },
      {
        "selector": 7,
        "frameCount": 4,
        "sequenceAddress": 214,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 6,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 215
          },
          {
            "frameIndex": 1,
            "visualFrameId": 6,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 219
          },
          {
            "frameIndex": 2,
            "visualFrameId": 6,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 223
          },
          {
            "frameIndex": 3,
            "visualFrameId": 6,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 227
          }
        ]
      },
      {
        "selector": 8,
        "frameCount": 4,
        "sequenceAddress": 231,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 232
          },
          {
            "frameIndex": 1,
            "visualFrameId": 4,
            "durationTicks": 10,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 236
          },
          {
            "frameIndex": 2,
            "visualFrameId": 6,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -6,
            "frameAddress": 240
          },
          {
            "frameIndex": 3,
            "visualFrameId": 6,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -7,
            "frameAddress": 244
          }
        ]
      },
      {
        "selector": 9,
        "frameCount": 4,
        "sequenceAddress": 248,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 5,
            "durationTicks": 9,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 249
          },
          {
            "frameIndex": 1,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 253
          },
          {
            "frameIndex": 2,
            "visualFrameId": 6,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 257
          },
          {
            "frameIndex": 3,
            "visualFrameId": 6,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 261
          }
        ]
      },
      {
        "selector": 10,
        "frameCount": 6,
        "sequenceAddress": 265,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 7,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 266
          },
          {
            "frameIndex": 1,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 270
          },
          {
            "frameIndex": 2,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 274
          },
          {
            "frameIndex": 3,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 278
          },
          {
            "frameIndex": 4,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 282
          },
          {
            "frameIndex": 5,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 286
          }
        ]
      },
      {
        "selector": 11,
        "frameCount": 8,
        "sequenceAddress": 290,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 8,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 291
          },
          {
            "frameIndex": 1,
            "visualFrameId": 8,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 295
          },
          {
            "frameIndex": 2,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 299
          },
          {
            "frameIndex": 3,
            "visualFrameId": 8,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 303
          },
          {
            "frameIndex": 4,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 307
          },
          {
            "frameIndex": 5,
            "visualFrameId": 8,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 311
          },
          {
            "frameIndex": 6,
            "visualFrameId": 8,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 315
          },
          {
            "frameIndex": 7,
            "visualFrameId": 8,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 319
          }
        ]
      },
      {
        "selector": 12,
        "frameCount": 8,
        "sequenceAddress": 323,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 9,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 324
          },
          {
            "frameIndex": 1,
            "visualFrameId": 9,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -6,
            "frameAddress": 328
          },
          {
            "frameIndex": 2,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -6,
            "frameAddress": 332
          },
          {
            "frameIndex": 3,
            "visualFrameId": 9,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 336
          },
          {
            "frameIndex": 4,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 340
          },
          {
            "frameIndex": 5,
            "visualFrameId": 9,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 344
          },
          {
            "frameIndex": 6,
            "visualFrameId": 9,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 348
          },
          {
            "frameIndex": 7,
            "visualFrameId": 9,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 352
          }
        ]
      },
      {
        "selector": 13,
        "frameCount": 15,
        "sequenceAddress": 356,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 357
          },
          {
            "frameIndex": 1,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 361
          },
          {
            "frameIndex": 2,
            "visualFrameId": 8,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 365
          },
          {
            "frameIndex": 3,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 15,
            "frameAddress": 369
          },
          {
            "frameIndex": 4,
            "visualFrameId": 8,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 23,
            "frameAddress": 373
          },
          {
            "frameIndex": 5,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 31,
            "frameAddress": 377
          },
          {
            "frameIndex": 6,
            "visualFrameId": 8,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 39,
            "frameAddress": 381
          },
          {
            "frameIndex": 7,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 47,
            "frameAddress": 385
          },
          {
            "frameIndex": 8,
            "visualFrameId": 8,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 55,
            "frameAddress": 389
          },
          {
            "frameIndex": 9,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 63,
            "frameAddress": 393
          },
          {
            "frameIndex": 10,
            "visualFrameId": 8,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 71,
            "frameAddress": 397
          },
          {
            "frameIndex": 11,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 79,
            "frameAddress": 401
          },
          {
            "frameIndex": 12,
            "visualFrameId": 8,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 87,
            "frameAddress": 405
          },
          {
            "frameIndex": 13,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 95,
            "frameAddress": 409
          },
          {
            "frameIndex": 14,
            "visualFrameId": 8,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 103,
            "frameAddress": 413
          }
        ]
      },
      {
        "selector": 14,
        "frameCount": 15,
        "sequenceAddress": 417,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 418
          },
          {
            "frameIndex": 1,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 422
          },
          {
            "frameIndex": 2,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -7,
            "frameAddress": 426
          },
          {
            "frameIndex": 3,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 430
          },
          {
            "frameIndex": 4,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -23,
            "frameAddress": 434
          },
          {
            "frameIndex": 5,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -31,
            "frameAddress": 438
          },
          {
            "frameIndex": 6,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -39,
            "frameAddress": 442
          },
          {
            "frameIndex": 7,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -47,
            "frameAddress": 446
          },
          {
            "frameIndex": 8,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -55,
            "frameAddress": 450
          },
          {
            "frameIndex": 9,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -63,
            "frameAddress": 454
          },
          {
            "frameIndex": 10,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -71,
            "frameAddress": 458
          },
          {
            "frameIndex": 11,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -79,
            "frameAddress": 462
          },
          {
            "frameIndex": 12,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -87,
            "frameAddress": 466
          },
          {
            "frameIndex": 13,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -95,
            "frameAddress": 470
          },
          {
            "frameIndex": 14,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -103,
            "frameAddress": 474
          }
        ]
      },
      {
        "selector": 15,
        "frameCount": 8,
        "sequenceAddress": 478,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 8,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 479
          },
          {
            "frameIndex": 1,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 483
          },
          {
            "frameIndex": 2,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": 2,
            "frameAddress": 487
          },
          {
            "frameIndex": 3,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": -12,
            "offsetX": 6,
            "frameAddress": 491
          },
          {
            "frameIndex": 4,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -20,
            "offsetX": 10,
            "frameAddress": 495
          },
          {
            "frameIndex": 5,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": -28,
            "offsetX": 14,
            "frameAddress": 499
          },
          {
            "frameIndex": 6,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -36,
            "offsetX": 18,
            "frameAddress": 503
          },
          {
            "frameIndex": 7,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": -44,
            "offsetX": 22,
            "frameAddress": 507
          }
        ]
      },
      {
        "selector": 16,
        "frameCount": 5,
        "sequenceAddress": 511,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 10,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 512
          },
          {
            "frameIndex": 1,
            "visualFrameId": 10,
            "durationTicks": 1,
            "offsetY": 4,
            "offsetX": 0,
            "frameAddress": 516
          },
          {
            "frameIndex": 2,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": 2,
            "offsetX": 0,
            "frameAddress": 520
          },
          {
            "frameIndex": 3,
            "visualFrameId": 10,
            "durationTicks": 1,
            "offsetY": 10,
            "offsetX": 0,
            "frameAddress": 524
          },
          {
            "frameIndex": 4,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": 18,
            "offsetX": 0,
            "frameAddress": 528
          }
        ]
      },
      {
        "selector": 17,
        "frameCount": 2,
        "sequenceAddress": 532,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 11,
            "durationTicks": 11,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 533
          },
          {
            "frameIndex": 1,
            "visualFrameId": 12,
            "durationTicks": 10,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 537
          }
        ]
      },
      {
        "selector": 18,
        "frameCount": 1,
        "sequenceAddress": 541,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 13,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 542
          }
        ]
      },
      {
        "selector": 19,
        "frameCount": 6,
        "sequenceAddress": 546,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 14,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 547
          },
          {
            "frameIndex": 1,
            "visualFrameId": 14,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 0,
            "frameAddress": 551
          },
          {
            "frameIndex": 2,
            "visualFrameId": 14,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 555
          },
          {
            "frameIndex": 3,
            "visualFrameId": 14,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 0,
            "frameAddress": 559
          },
          {
            "frameIndex": 4,
            "visualFrameId": 14,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 563
          },
          {
            "frameIndex": 5,
            "visualFrameId": 14,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 0,
            "frameAddress": 567
          }
        ]
      },
      {
        "selector": 20,
        "frameCount": 6,
        "sequenceAddress": 571,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 572
          },
          {
            "frameIndex": 1,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 576
          },
          {
            "frameIndex": 2,
            "visualFrameId": 15,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 580
          },
          {
            "frameIndex": 3,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 584
          },
          {
            "frameIndex": 4,
            "visualFrameId": 15,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 588
          },
          {
            "frameIndex": 5,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 592
          }
        ]
      },
      {
        "selector": 21,
        "frameCount": 8,
        "sequenceAddress": 596,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 5,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 597
          },
          {
            "frameIndex": 1,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 12,
            "frameAddress": 601
          },
          {
            "frameIndex": 2,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 15,
            "frameAddress": 605
          },
          {
            "frameIndex": 3,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 16,
            "frameAddress": 609
          },
          {
            "frameIndex": 4,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 14,
            "frameAddress": 613
          },
          {
            "frameIndex": 5,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 16,
            "frameAddress": 617
          },
          {
            "frameIndex": 6,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 15,
            "frameAddress": 621
          },
          {
            "frameIndex": 7,
            "visualFrameId": 5,
            "durationTicks": 30,
            "offsetY": 0,
            "offsetX": 16,
            "frameAddress": 625
          }
        ]
      },
      {
        "selector": 22,
        "frameCount": 12,
        "sequenceAddress": 629,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 17,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 630
          },
          {
            "frameIndex": 1,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 634
          },
          {
            "frameIndex": 2,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 638
          },
          {
            "frameIndex": 3,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 642
          },
          {
            "frameIndex": 4,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 14,
            "frameAddress": 646
          },
          {
            "frameIndex": 5,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 22,
            "frameAddress": 650
          },
          {
            "frameIndex": 6,
            "visualFrameId": 5,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 30,
            "frameAddress": 654
          },
          {
            "frameIndex": 7,
            "visualFrameId": 5,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": 38,
            "frameAddress": 658
          },
          {
            "frameIndex": 8,
            "visualFrameId": 5,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 44,
            "frameAddress": 662
          },
          {
            "frameIndex": 9,
            "visualFrameId": 5,
            "durationTicks": 7,
            "offsetY": 0,
            "offsetX": 48,
            "frameAddress": 666
          },
          {
            "frameIndex": 10,
            "visualFrameId": 5,
            "durationTicks": 8,
            "offsetY": 0,
            "offsetX": 50,
            "frameAddress": 670
          },
          {
            "frameIndex": 11,
            "visualFrameId": 5,
            "durationTicks": 30,
            "offsetY": 0,
            "offsetX": 51,
            "frameAddress": 674
          }
        ]
      },
      {
        "selector": 23,
        "frameCount": 11,
        "sequenceAddress": 678,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 7,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 679
          },
          {
            "frameIndex": 1,
            "visualFrameId": 7,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 683
          },
          {
            "frameIndex": 2,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 687
          },
          {
            "frameIndex": 3,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 16,
            "frameAddress": 691
          },
          {
            "frameIndex": 4,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 12,
            "frameAddress": 695
          },
          {
            "frameIndex": 5,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 16,
            "frameAddress": 699
          },
          {
            "frameIndex": 6,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 18,
            "frameAddress": 703
          },
          {
            "frameIndex": 7,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 17,
            "frameAddress": 707
          },
          {
            "frameIndex": 8,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 19,
            "frameAddress": 711
          },
          {
            "frameIndex": 9,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 18,
            "frameAddress": 715
          },
          {
            "frameIndex": 10,
            "visualFrameId": 7,
            "durationTicks": 30,
            "offsetY": 0,
            "offsetX": 20,
            "frameAddress": 719
          }
        ]
      },
      {
        "selector": 24,
        "frameCount": 18,
        "sequenceAddress": 723,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 8,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 724
          },
          {
            "frameIndex": 1,
            "visualFrameId": 8,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 728
          },
          {
            "frameIndex": 2,
            "visualFrameId": 8,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 732
          },
          {
            "frameIndex": 3,
            "visualFrameId": 8,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 736
          },
          {
            "frameIndex": 4,
            "visualFrameId": 8,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 740
          },
          {
            "frameIndex": 5,
            "visualFrameId": 8,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 744
          },
          {
            "frameIndex": 6,
            "visualFrameId": 8,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 748
          },
          {
            "frameIndex": 7,
            "visualFrameId": 8,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 752
          },
          {
            "frameIndex": 8,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 12,
            "frameAddress": 756
          },
          {
            "frameIndex": 9,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 20,
            "frameAddress": 760
          },
          {
            "frameIndex": 10,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 28,
            "frameAddress": 764
          },
          {
            "frameIndex": 11,
            "visualFrameId": 7,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 34,
            "frameAddress": 768
          },
          {
            "frameIndex": 12,
            "visualFrameId": 7,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 38,
            "frameAddress": 772
          },
          {
            "frameIndex": 13,
            "visualFrameId": 7,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": 42,
            "frameAddress": 776
          },
          {
            "frameIndex": 14,
            "visualFrameId": 7,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 45,
            "frameAddress": 780
          },
          {
            "frameIndex": 15,
            "visualFrameId": 7,
            "durationTicks": 7,
            "offsetY": 0,
            "offsetX": 48,
            "frameAddress": 784
          },
          {
            "frameIndex": 16,
            "visualFrameId": 7,
            "durationTicks": 8,
            "offsetY": 0,
            "offsetX": 50,
            "frameAddress": 788
          },
          {
            "frameIndex": 17,
            "visualFrameId": 7,
            "durationTicks": 30,
            "offsetY": 0,
            "offsetX": 52,
            "frameAddress": 792
          }
        ]
      },
      {
        "selector": 25,
        "frameCount": 12,
        "sequenceAddress": 796,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -32,
            "frameAddress": 797
          },
          {
            "frameIndex": 1,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -24,
            "frameAddress": 801
          },
          {
            "frameIndex": 2,
            "visualFrameId": 8,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 805
          },
          {
            "frameIndex": 3,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -8,
            "frameAddress": 809
          },
          {
            "frameIndex": 4,
            "visualFrameId": 8,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 813
          },
          {
            "frameIndex": 5,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 817
          },
          {
            "frameIndex": 6,
            "visualFrameId": 8,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 821
          },
          {
            "frameIndex": 7,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 825
          },
          {
            "frameIndex": 8,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 829
          },
          {
            "frameIndex": 9,
            "visualFrameId": 8,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 833
          },
          {
            "frameIndex": 10,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 837
          },
          {
            "frameIndex": 11,
            "visualFrameId": 8,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 841
          }
        ]
      },
      {
        "selector": 26,
        "frameCount": 12,
        "sequenceAddress": 845,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 32,
            "frameAddress": 846
          },
          {
            "frameIndex": 1,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 24,
            "frameAddress": 850
          },
          {
            "frameIndex": 2,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 16,
            "frameAddress": 854
          },
          {
            "frameIndex": 3,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 858
          },
          {
            "frameIndex": 4,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 862
          },
          {
            "frameIndex": 5,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 866
          },
          {
            "frameIndex": 6,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 870
          },
          {
            "frameIndex": 7,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 874
          },
          {
            "frameIndex": 8,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 878
          },
          {
            "frameIndex": 9,
            "visualFrameId": 9,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 882
          },
          {
            "frameIndex": 10,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 886
          },
          {
            "frameIndex": 11,
            "visualFrameId": 9,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 890
          }
        ]
      },
      {
        "selector": 27,
        "frameCount": 11,
        "sequenceAddress": 894,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 24,
            "offsetX": -12,
            "frameAddress": 895
          },
          {
            "frameIndex": 1,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 16,
            "offsetX": -8,
            "frameAddress": 899
          },
          {
            "frameIndex": 2,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": 8,
            "offsetX": -4,
            "frameAddress": 903
          },
          {
            "frameIndex": 3,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 4,
            "offsetX": -2,
            "frameAddress": 907
          },
          {
            "frameIndex": 4,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 911
          },
          {
            "frameIndex": 5,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 1,
            "frameAddress": 915
          },
          {
            "frameIndex": 6,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 919
          },
          {
            "frameIndex": 7,
            "visualFrameId": 0,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 1,
            "frameAddress": 923
          },
          {
            "frameIndex": 8,
            "visualFrameId": 0,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 927
          },
          {
            "frameIndex": 9,
            "visualFrameId": 0,
            "durationTicks": 2,
            "offsetY": -1,
            "offsetX": 1,
            "frameAddress": 931
          },
          {
            "frameIndex": 10,
            "visualFrameId": 0,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 935
          }
        ]
      },
      {
        "selector": 28,
        "frameCount": 13,
        "sequenceAddress": 939,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": -40,
            "offsetX": 0,
            "frameAddress": 940
          },
          {
            "frameIndex": 1,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": -32,
            "offsetX": 0,
            "frameAddress": 944
          },
          {
            "frameIndex": 2,
            "visualFrameId": 10,
            "durationTicks": 1,
            "offsetY": -24,
            "offsetX": 0,
            "frameAddress": 948
          },
          {
            "frameIndex": 3,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": -16,
            "offsetX": 0,
            "frameAddress": 952
          },
          {
            "frameIndex": 4,
            "visualFrameId": 10,
            "durationTicks": 1,
            "offsetY": -8,
            "offsetX": 0,
            "frameAddress": 956
          },
          {
            "frameIndex": 5,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 960
          },
          {
            "frameIndex": 6,
            "visualFrameId": 2,
            "durationTicks": 1,
            "offsetY": 2,
            "offsetX": 4,
            "frameAddress": 964
          },
          {
            "frameIndex": 7,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 4,
            "offsetX": 4,
            "frameAddress": 968
          },
          {
            "frameIndex": 8,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 5,
            "offsetX": 4,
            "frameAddress": 972
          },
          {
            "frameIndex": 9,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 4,
            "offsetX": 4,
            "frameAddress": 976
          },
          {
            "frameIndex": 10,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 3,
            "offsetX": 4,
            "frameAddress": 980
          },
          {
            "frameIndex": 11,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 2,
            "offsetX": 4,
            "frameAddress": 984
          },
          {
            "frameIndex": 12,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 1,
            "offsetX": 4,
            "frameAddress": 988
          }
        ]
      },
      {
        "selector": 29,
        "frameCount": 9,
        "sequenceAddress": 992,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 16,
            "durationTicks": 21,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 993
          },
          {
            "frameIndex": 1,
            "visualFrameId": 8,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 997
          },
          {
            "frameIndex": 2,
            "visualFrameId": 8,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 1001
          },
          {
            "frameIndex": 3,
            "visualFrameId": 8,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 1005
          },
          {
            "frameIndex": 4,
            "visualFrameId": 8,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 1009
          },
          {
            "frameIndex": 5,
            "visualFrameId": 16,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 12,
            "frameAddress": 1013
          },
          {
            "frameIndex": 6,
            "visualFrameId": 16,
            "durationTicks": 8,
            "offsetY": 0,
            "offsetX": 14,
            "frameAddress": 1017
          },
          {
            "frameIndex": 7,
            "visualFrameId": 16,
            "durationTicks": 9,
            "offsetY": 0,
            "offsetX": 16,
            "frameAddress": 1021
          },
          {
            "frameIndex": 8,
            "visualFrameId": 16,
            "durationTicks": 30,
            "offsetY": 0,
            "offsetX": 17,
            "frameAddress": 1025
          }
        ]
      },
      {
        "selector": 30,
        "frameCount": 3,
        "sequenceAddress": 1029,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 16,
            "durationTicks": 51,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 1030
          },
          {
            "frameIndex": 1,
            "visualFrameId": 16,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 1034
          },
          {
            "frameIndex": 2,
            "visualFrameId": 5,
            "durationTicks": 30,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 1038
          }
        ]
      },
      {
        "selector": 31,
        "frameCount": 7,
        "sequenceAddress": 1042,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 5,
            "durationTicks": 21,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 1043
          },
          {
            "frameIndex": 1,
            "visualFrameId": 17,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 1047
          },
          {
            "frameIndex": 2,
            "visualFrameId": 16,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 1051
          },
          {
            "frameIndex": 3,
            "visualFrameId": 16,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 1055
          },
          {
            "frameIndex": 4,
            "visualFrameId": 16,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 1059
          },
          {
            "frameIndex": 5,
            "visualFrameId": 16,
            "durationTicks": 60,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 1063
          },
          {
            "frameIndex": 6,
            "visualFrameId": 0,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 1067
          }
        ]
      }
    ]
  },
  {
    "resourceIndex": 1,
    "resourceBase": 18800,
    "sequenceTable": 2422,
    "sequenceCount": 6,
    "sequences": [
      {
        "selector": 0,
        "frameCount": 4,
        "sequenceAddress": 2435,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -8,
            "frameAddress": 2436
          },
          {
            "frameIndex": 1,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -10,
            "frameAddress": 2440
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -11,
            "frameAddress": 2444
          },
          {
            "frameIndex": 3,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -10,
            "frameAddress": 2448
          }
        ]
      },
      {
        "selector": 1,
        "frameCount": 4,
        "sequenceAddress": 2452,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -7,
            "frameAddress": 2453
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -9,
            "frameAddress": 2457
          },
          {
            "frameIndex": 2,
            "visualFrameId": 1,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -10,
            "frameAddress": 2461
          },
          {
            "frameIndex": 3,
            "visualFrameId": 1,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -9,
            "frameAddress": 2465
          }
        ]
      },
      {
        "selector": 2,
        "frameCount": 4,
        "sequenceAddress": 2469,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -7,
            "frameAddress": 2470
          },
          {
            "frameIndex": 1,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -9,
            "frameAddress": 2474
          },
          {
            "frameIndex": 2,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -10,
            "frameAddress": 2478
          },
          {
            "frameIndex": 3,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -9,
            "frameAddress": 2482
          }
        ]
      },
      {
        "selector": 3,
        "frameCount": 4,
        "sequenceAddress": 2486,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 5,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 2487
          },
          {
            "frameIndex": 1,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -7,
            "frameAddress": 2491
          },
          {
            "frameIndex": 2,
            "visualFrameId": 5,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -8,
            "frameAddress": 2495
          },
          {
            "frameIndex": 3,
            "visualFrameId": 5,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -7,
            "frameAddress": 2499
          }
        ]
      },
      {
        "selector": 4,
        "frameCount": 4,
        "sequenceAddress": 2503,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 6,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -9,
            "frameAddress": 2504
          },
          {
            "frameIndex": 1,
            "visualFrameId": 6,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -11,
            "frameAddress": 2508
          },
          {
            "frameIndex": 2,
            "visualFrameId": 6,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -12,
            "frameAddress": 2512
          },
          {
            "frameIndex": 3,
            "visualFrameId": 6,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -11,
            "frameAddress": 2516
          }
        ]
      },
      {
        "selector": 5,
        "frameCount": 4,
        "sequenceAddress": 2520,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 7,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 2521
          },
          {
            "frameIndex": 1,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 2525
          },
          {
            "frameIndex": 2,
            "visualFrameId": 7,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 2529
          },
          {
            "frameIndex": 3,
            "visualFrameId": 7,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 2533
          }
        ]
      }
    ]
  },
  {
    "resourceIndex": 2,
    "resourceBase": 19464,
    "sequenceTable": 3086,
    "sequenceCount": 12,
    "sequences": [
      {
        "selector": 0,
        "frameCount": 6,
        "sequenceAddress": 3111,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 3112
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 3116
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -11,
            "frameAddress": 3120
          },
          {
            "frameIndex": 3,
            "visualFrameId": 2,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": -12,
            "frameAddress": 3124
          },
          {
            "frameIndex": 4,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -11,
            "frameAddress": 3128
          },
          {
            "frameIndex": 5,
            "visualFrameId": 2,
            "durationTicks": 16,
            "offsetY": 0,
            "offsetX": -10,
            "frameAddress": 3132
          }
        ]
      },
      {
        "selector": 1,
        "frameCount": 6,
        "sequenceAddress": 3136,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 3137
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 3141
          },
          {
            "frameIndex": 2,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -10,
            "frameAddress": 3145
          },
          {
            "frameIndex": 3,
            "visualFrameId": 3,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": -11,
            "frameAddress": 3149
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -10,
            "frameAddress": 3153
          },
          {
            "frameIndex": 5,
            "visualFrameId": 3,
            "durationTicks": 16,
            "offsetY": 0,
            "offsetX": -9,
            "frameAddress": 3157
          }
        ]
      },
      {
        "selector": 2,
        "frameCount": 6,
        "sequenceAddress": 3161,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 3162
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 3166
          },
          {
            "frameIndex": 2,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -11,
            "frameAddress": 3170
          },
          {
            "frameIndex": 3,
            "visualFrameId": 4,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": -12,
            "frameAddress": 3174
          },
          {
            "frameIndex": 4,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -11,
            "frameAddress": 3178
          },
          {
            "frameIndex": 5,
            "visualFrameId": 4,
            "durationTicks": 16,
            "offsetY": 0,
            "offsetX": -10,
            "frameAddress": 3182
          }
        ]
      },
      {
        "selector": 3,
        "frameCount": 6,
        "sequenceAddress": 3186,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 3187
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 3191
          },
          {
            "frameIndex": 2,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -11,
            "frameAddress": 3195
          },
          {
            "frameIndex": 3,
            "visualFrameId": 5,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": -12,
            "frameAddress": 3199
          },
          {
            "frameIndex": 4,
            "visualFrameId": 5,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -11,
            "frameAddress": 3203
          },
          {
            "frameIndex": 5,
            "visualFrameId": 5,
            "durationTicks": 16,
            "offsetY": 0,
            "offsetX": -10,
            "frameAddress": 3207
          }
        ]
      },
      {
        "selector": 4,
        "frameCount": 6,
        "sequenceAddress": 3211,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 3212
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 3216
          },
          {
            "frameIndex": 2,
            "visualFrameId": 6,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -14,
            "frameAddress": 3220
          },
          {
            "frameIndex": 3,
            "visualFrameId": 6,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 3224
          },
          {
            "frameIndex": 4,
            "visualFrameId": 6,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 3228
          },
          {
            "frameIndex": 5,
            "visualFrameId": 6,
            "durationTicks": 16,
            "offsetY": 0,
            "offsetX": -14,
            "frameAddress": 3232
          }
        ]
      },
      {
        "selector": 5,
        "frameCount": 6,
        "sequenceAddress": 3236,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 3237
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 3241
          },
          {
            "frameIndex": 2,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 3245
          },
          {
            "frameIndex": 3,
            "visualFrameId": 7,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 3249
          },
          {
            "frameIndex": 4,
            "visualFrameId": 7,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 3253
          },
          {
            "frameIndex": 5,
            "visualFrameId": 7,
            "durationTicks": 16,
            "offsetY": 0,
            "offsetX": -14,
            "frameAddress": 3257
          }
        ]
      },
      {
        "selector": 6,
        "frameCount": 6,
        "sequenceAddress": 3261,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 3262
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 3266
          },
          {
            "frameIndex": 2,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 3270
          },
          {
            "frameIndex": 3,
            "visualFrameId": 8,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 3274
          },
          {
            "frameIndex": 4,
            "visualFrameId": 8,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 3278
          },
          {
            "frameIndex": 5,
            "visualFrameId": 8,
            "durationTicks": 16,
            "offsetY": 0,
            "offsetX": -14,
            "frameAddress": 3282
          }
        ]
      },
      {
        "selector": 7,
        "frameCount": 6,
        "sequenceAddress": 3286,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 3287
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 3291
          },
          {
            "frameIndex": 2,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 3295
          },
          {
            "frameIndex": 3,
            "visualFrameId": 9,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 3299
          },
          {
            "frameIndex": 4,
            "visualFrameId": 9,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 3303
          },
          {
            "frameIndex": 5,
            "visualFrameId": 9,
            "durationTicks": 16,
            "offsetY": 0,
            "offsetX": -14,
            "frameAddress": 3307
          }
        ]
      },
      {
        "selector": 8,
        "frameCount": 6,
        "sequenceAddress": 3311,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 3312
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 3316
          },
          {
            "frameIndex": 2,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -12,
            "frameAddress": 3320
          },
          {
            "frameIndex": 3,
            "visualFrameId": 10,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": -13,
            "frameAddress": 3324
          },
          {
            "frameIndex": 4,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -12,
            "frameAddress": 3328
          },
          {
            "frameIndex": 5,
            "visualFrameId": 10,
            "durationTicks": 16,
            "offsetY": 0,
            "offsetX": -11,
            "frameAddress": 3332
          }
        ]
      },
      {
        "selector": 9,
        "frameCount": 6,
        "sequenceAddress": 3336,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 3337
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 3341
          },
          {
            "frameIndex": 2,
            "visualFrameId": 11,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -11,
            "frameAddress": 3345
          },
          {
            "frameIndex": 3,
            "visualFrameId": 11,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": -12,
            "frameAddress": 3349
          },
          {
            "frameIndex": 4,
            "visualFrameId": 11,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -11,
            "frameAddress": 3353
          },
          {
            "frameIndex": 5,
            "visualFrameId": 11,
            "durationTicks": 16,
            "offsetY": 0,
            "offsetX": -10,
            "frameAddress": 3357
          }
        ]
      },
      {
        "selector": 10,
        "frameCount": 6,
        "sequenceAddress": 3361,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 3362
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 3366
          },
          {
            "frameIndex": 2,
            "visualFrameId": 12,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 3370
          },
          {
            "frameIndex": 3,
            "visualFrameId": 12,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 3374
          },
          {
            "frameIndex": 4,
            "visualFrameId": 12,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 3378
          },
          {
            "frameIndex": 5,
            "visualFrameId": 12,
            "durationTicks": 16,
            "offsetY": 0,
            "offsetX": -14,
            "frameAddress": 3382
          }
        ]
      },
      {
        "selector": 11,
        "frameCount": 6,
        "sequenceAddress": 3386,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 3387
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 3391
          },
          {
            "frameIndex": 2,
            "visualFrameId": 13,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 3395
          },
          {
            "frameIndex": 3,
            "visualFrameId": 13,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 3399
          },
          {
            "frameIndex": 4,
            "visualFrameId": 13,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 3403
          },
          {
            "frameIndex": 5,
            "visualFrameId": 13,
            "durationTicks": 16,
            "offsetY": 0,
            "offsetX": -14,
            "frameAddress": 3407
          }
        ]
      }
    ]
  },
  {
    "resourceIndex": 3,
    "resourceBase": 20852,
    "sequenceTable": 4474,
    "sequenceCount": 14,
    "sequences": [
      {
        "selector": 0,
        "frameCount": 7,
        "sequenceAddress": 4503,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 4504
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 4508
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4512
          },
          {
            "frameIndex": 3,
            "visualFrameId": 2,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -22,
            "frameAddress": 4516
          },
          {
            "frameIndex": 4,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4520
          },
          {
            "frameIndex": 5,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -19,
            "frameAddress": 4524
          },
          {
            "frameIndex": 6,
            "visualFrameId": 2,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4528
          }
        ]
      },
      {
        "selector": 1,
        "frameCount": 7,
        "sequenceAddress": 4532,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 4533
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 4537
          },
          {
            "frameIndex": 2,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 4541
          },
          {
            "frameIndex": 3,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -20,
            "frameAddress": 4545
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 4549
          },
          {
            "frameIndex": 5,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4553
          },
          {
            "frameIndex": 6,
            "visualFrameId": 3,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 4557
          }
        ]
      },
      {
        "selector": 2,
        "frameCount": 7,
        "sequenceAddress": 4561,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 4562
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 4566
          },
          {
            "frameIndex": 2,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 4570
          },
          {
            "frameIndex": 3,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -19,
            "frameAddress": 4574
          },
          {
            "frameIndex": 4,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 4578
          },
          {
            "frameIndex": 5,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 4582
          },
          {
            "frameIndex": 6,
            "visualFrameId": 4,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 4586
          }
        ]
      },
      {
        "selector": 3,
        "frameCount": 7,
        "sequenceAddress": 4590,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 4591
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 4595
          },
          {
            "frameIndex": 2,
            "visualFrameId": 5,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4599
          },
          {
            "frameIndex": 3,
            "visualFrameId": 5,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -21,
            "frameAddress": 4603
          },
          {
            "frameIndex": 4,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4607
          },
          {
            "frameIndex": 5,
            "visualFrameId": 5,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4611
          },
          {
            "frameIndex": 6,
            "visualFrameId": 5,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4615
          }
        ]
      },
      {
        "selector": 4,
        "frameCount": 7,
        "sequenceAddress": 4619,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 4620
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 4624
          },
          {
            "frameIndex": 2,
            "visualFrameId": 6,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4628
          },
          {
            "frameIndex": 3,
            "visualFrameId": 6,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -21,
            "frameAddress": 4632
          },
          {
            "frameIndex": 4,
            "visualFrameId": 6,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4636
          },
          {
            "frameIndex": 5,
            "visualFrameId": 6,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4640
          },
          {
            "frameIndex": 6,
            "visualFrameId": 6,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4644
          }
        ]
      },
      {
        "selector": 5,
        "frameCount": 7,
        "sequenceAddress": 4648,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 4649
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 4653
          },
          {
            "frameIndex": 2,
            "visualFrameId": 7,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 4657
          },
          {
            "frameIndex": 3,
            "visualFrameId": 7,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -20,
            "frameAddress": 4661
          },
          {
            "frameIndex": 4,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 4665
          },
          {
            "frameIndex": 5,
            "visualFrameId": 7,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4669
          },
          {
            "frameIndex": 6,
            "visualFrameId": 7,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 4673
          }
        ]
      },
      {
        "selector": 6,
        "frameCount": 7,
        "sequenceAddress": 4677,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 4678
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 4682
          },
          {
            "frameIndex": 2,
            "visualFrameId": 8,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4686
          },
          {
            "frameIndex": 3,
            "visualFrameId": 8,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -21,
            "frameAddress": 4690
          },
          {
            "frameIndex": 4,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4694
          },
          {
            "frameIndex": 5,
            "visualFrameId": 8,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4698
          },
          {
            "frameIndex": 6,
            "visualFrameId": 8,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4702
          }
        ]
      },
      {
        "selector": 7,
        "frameCount": 7,
        "sequenceAddress": 4706,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 4707
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 4711
          },
          {
            "frameIndex": 2,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4715
          },
          {
            "frameIndex": 3,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -21,
            "frameAddress": 4719
          },
          {
            "frameIndex": 4,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4723
          },
          {
            "frameIndex": 5,
            "visualFrameId": 9,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4727
          },
          {
            "frameIndex": 6,
            "visualFrameId": 9,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4731
          }
        ]
      },
      {
        "selector": 8,
        "frameCount": 7,
        "sequenceAddress": 4735,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 4736
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 4740
          },
          {
            "frameIndex": 2,
            "visualFrameId": 10,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4744
          },
          {
            "frameIndex": 3,
            "visualFrameId": 10,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -22,
            "frameAddress": 4748
          },
          {
            "frameIndex": 4,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4752
          },
          {
            "frameIndex": 5,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -19,
            "frameAddress": 4756
          },
          {
            "frameIndex": 6,
            "visualFrameId": 10,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4760
          }
        ]
      },
      {
        "selector": 9,
        "frameCount": 7,
        "sequenceAddress": 4764,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 4765
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 4769
          },
          {
            "frameIndex": 2,
            "visualFrameId": 11,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4773
          },
          {
            "frameIndex": 3,
            "visualFrameId": 11,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -22,
            "frameAddress": 4777
          },
          {
            "frameIndex": 4,
            "visualFrameId": 11,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4781
          },
          {
            "frameIndex": 5,
            "visualFrameId": 11,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -19,
            "frameAddress": 4785
          },
          {
            "frameIndex": 6,
            "visualFrameId": 11,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4789
          }
        ]
      },
      {
        "selector": 10,
        "frameCount": 7,
        "sequenceAddress": 4793,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 4794
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 4798
          },
          {
            "frameIndex": 2,
            "visualFrameId": 12,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 4802
          },
          {
            "frameIndex": 3,
            "visualFrameId": 12,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -19,
            "frameAddress": 4806
          },
          {
            "frameIndex": 4,
            "visualFrameId": 12,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 4810
          },
          {
            "frameIndex": 5,
            "visualFrameId": 12,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 4814
          },
          {
            "frameIndex": 6,
            "visualFrameId": 12,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 4818
          }
        ]
      },
      {
        "selector": 11,
        "frameCount": 7,
        "sequenceAddress": 4822,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 4823
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 4827
          },
          {
            "frameIndex": 2,
            "visualFrameId": 13,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4831
          },
          {
            "frameIndex": 3,
            "visualFrameId": 13,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -21,
            "frameAddress": 4835
          },
          {
            "frameIndex": 4,
            "visualFrameId": 13,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4839
          },
          {
            "frameIndex": 5,
            "visualFrameId": 13,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4843
          },
          {
            "frameIndex": 6,
            "visualFrameId": 13,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -17,
            "frameAddress": 4847
          }
        ]
      },
      {
        "selector": 12,
        "frameCount": 7,
        "sequenceAddress": 4851,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 4852
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 4856
          },
          {
            "frameIndex": 2,
            "visualFrameId": 14,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4860
          },
          {
            "frameIndex": 3,
            "visualFrameId": 14,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -22,
            "frameAddress": 4864
          },
          {
            "frameIndex": 4,
            "visualFrameId": 14,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4868
          },
          {
            "frameIndex": 5,
            "visualFrameId": 14,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -19,
            "frameAddress": 4872
          },
          {
            "frameIndex": 6,
            "visualFrameId": 14,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4876
          }
        ]
      },
      {
        "selector": 13,
        "frameCount": 7,
        "sequenceAddress": 4880,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 4881
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 4885
          },
          {
            "frameIndex": 2,
            "visualFrameId": 15,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4889
          },
          {
            "frameIndex": 3,
            "visualFrameId": 15,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -22,
            "frameAddress": 4893
          },
          {
            "frameIndex": 4,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4897
          },
          {
            "frameIndex": 5,
            "visualFrameId": 15,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -19,
            "frameAddress": 4901
          },
          {
            "frameIndex": 6,
            "visualFrameId": 15,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -18,
            "frameAddress": 4905
          }
        ]
      }
    ]
  },
  {
    "resourceIndex": 4,
    "resourceBase": 22532,
    "sequenceTable": 6154,
    "sequenceCount": 10,
    "sequences": [
      {
        "selector": 0,
        "frameCount": 7,
        "sequenceAddress": 6175,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 6176
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 6180
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 6184
          },
          {
            "frameIndex": 3,
            "visualFrameId": 2,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -19,
            "frameAddress": 6188
          },
          {
            "frameIndex": 4,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 6192
          },
          {
            "frameIndex": 5,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 6196
          },
          {
            "frameIndex": 6,
            "visualFrameId": 2,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 6200
          }
        ]
      },
      {
        "selector": 1,
        "frameCount": 7,
        "sequenceAddress": 6204,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 6205
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 6209
          },
          {
            "frameIndex": 2,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 6213
          },
          {
            "frameIndex": 3,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -19,
            "frameAddress": 6217
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 6221
          },
          {
            "frameIndex": 5,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -16,
            "frameAddress": 6225
          },
          {
            "frameIndex": 6,
            "visualFrameId": 3,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": -15,
            "frameAddress": 6229
          }
        ]
      },
      {
        "selector": 2,
        "frameCount": 7,
        "sequenceAddress": 6233,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 6234
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 6238
          },
          {
            "frameIndex": 2,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": -6,
            "offsetX": -13,
            "frameAddress": 6242
          },
          {
            "frameIndex": 3,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": -9,
            "offsetX": -16,
            "frameAddress": 6246
          },
          {
            "frameIndex": 4,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": -10,
            "frameAddress": 6250
          },
          {
            "frameIndex": 5,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": -5,
            "offsetX": -11,
            "frameAddress": 6254
          },
          {
            "frameIndex": 6,
            "visualFrameId": 4,
            "durationTicks": 26,
            "offsetY": -4,
            "offsetX": -10,
            "frameAddress": 6258
          }
        ]
      },
      {
        "selector": 3,
        "frameCount": 7,
        "sequenceAddress": 6262,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 6263
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 6267
          },
          {
            "frameIndex": 2,
            "visualFrameId": 5,
            "durationTicks": 1,
            "offsetY": -6,
            "offsetX": -17,
            "frameAddress": 6271
          },
          {
            "frameIndex": 3,
            "visualFrameId": 5,
            "durationTicks": 1,
            "offsetY": -9,
            "offsetX": -20,
            "frameAddress": 6275
          },
          {
            "frameIndex": 4,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": -14,
            "frameAddress": 6279
          },
          {
            "frameIndex": 5,
            "visualFrameId": 5,
            "durationTicks": 4,
            "offsetY": -5,
            "offsetX": -15,
            "frameAddress": 6283
          },
          {
            "frameIndex": 6,
            "visualFrameId": 5,
            "durationTicks": 26,
            "offsetY": -4,
            "offsetX": -14,
            "frameAddress": 6287
          }
        ]
      },
      {
        "selector": 4,
        "frameCount": 7,
        "sequenceAddress": 6291,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 6292
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 6296
          },
          {
            "frameIndex": 2,
            "visualFrameId": 6,
            "durationTicks": 1,
            "offsetY": -6,
            "offsetX": -13,
            "frameAddress": 6300
          },
          {
            "frameIndex": 3,
            "visualFrameId": 6,
            "durationTicks": 1,
            "offsetY": -9,
            "offsetX": -16,
            "frameAddress": 6304
          },
          {
            "frameIndex": 4,
            "visualFrameId": 6,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": -10,
            "frameAddress": 6308
          },
          {
            "frameIndex": 5,
            "visualFrameId": 6,
            "durationTicks": 4,
            "offsetY": -5,
            "offsetX": -11,
            "frameAddress": 6312
          },
          {
            "frameIndex": 6,
            "visualFrameId": 6,
            "durationTicks": 26,
            "offsetY": -4,
            "offsetX": -10,
            "frameAddress": 6316
          }
        ]
      },
      {
        "selector": 5,
        "frameCount": 7,
        "sequenceAddress": 6320,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 6321
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 6325
          },
          {
            "frameIndex": 2,
            "visualFrameId": 7,
            "durationTicks": 1,
            "offsetY": -6,
            "offsetX": -13,
            "frameAddress": 6329
          },
          {
            "frameIndex": 3,
            "visualFrameId": 7,
            "durationTicks": 1,
            "offsetY": -9,
            "offsetX": -16,
            "frameAddress": 6333
          },
          {
            "frameIndex": 4,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": -10,
            "frameAddress": 6337
          },
          {
            "frameIndex": 5,
            "visualFrameId": 7,
            "durationTicks": 4,
            "offsetY": -5,
            "offsetX": -11,
            "frameAddress": 6341
          },
          {
            "frameIndex": 6,
            "visualFrameId": 7,
            "durationTicks": 26,
            "offsetY": -4,
            "offsetX": -10,
            "frameAddress": 6345
          }
        ]
      },
      {
        "selector": 6,
        "frameCount": 7,
        "sequenceAddress": 6349,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 6350
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 6354
          },
          {
            "frameIndex": 2,
            "visualFrameId": 8,
            "durationTicks": 1,
            "offsetY": -5,
            "offsetX": -12,
            "frameAddress": 6358
          },
          {
            "frameIndex": 3,
            "visualFrameId": 8,
            "durationTicks": 1,
            "offsetY": -8,
            "offsetX": -15,
            "frameAddress": 6362
          },
          {
            "frameIndex": 4,
            "visualFrameId": 8,
            "durationTicks": 2,
            "offsetY": -3,
            "offsetX": -9,
            "frameAddress": 6366
          },
          {
            "frameIndex": 5,
            "visualFrameId": 8,
            "durationTicks": 4,
            "offsetY": -4,
            "offsetX": -10,
            "frameAddress": 6370
          },
          {
            "frameIndex": 6,
            "visualFrameId": 8,
            "durationTicks": 26,
            "offsetY": -3,
            "offsetX": -9,
            "frameAddress": 6374
          }
        ]
      },
      {
        "selector": 7,
        "frameCount": 7,
        "sequenceAddress": 6378,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 6379
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 6383
          },
          {
            "frameIndex": 2,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": -4,
            "offsetX": -12,
            "frameAddress": 6387
          },
          {
            "frameIndex": 3,
            "visualFrameId": 9,
            "durationTicks": 1,
            "offsetY": -7,
            "offsetX": -15,
            "frameAddress": 6391
          },
          {
            "frameIndex": 4,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": -9,
            "frameAddress": 6395
          },
          {
            "frameIndex": 5,
            "visualFrameId": 9,
            "durationTicks": 4,
            "offsetY": -3,
            "offsetX": -10,
            "frameAddress": 6399
          },
          {
            "frameIndex": 6,
            "visualFrameId": 9,
            "durationTicks": 26,
            "offsetY": -2,
            "offsetX": -9,
            "frameAddress": 6403
          }
        ]
      },
      {
        "selector": 8,
        "frameCount": 7,
        "sequenceAddress": 6407,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 6408
          },
          {
            "frameIndex": 1,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 6412
          },
          {
            "frameIndex": 2,
            "visualFrameId": 10,
            "durationTicks": 1,
            "offsetY": -4,
            "offsetX": -11,
            "frameAddress": 6416
          },
          {
            "frameIndex": 3,
            "visualFrameId": 10,
            "durationTicks": 1,
            "offsetY": -7,
            "offsetX": -14,
            "frameAddress": 6420
          },
          {
            "frameIndex": 4,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": -8,
            "frameAddress": 6424
          },
          {
            "frameIndex": 5,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": -3,
            "offsetX": -9,
            "frameAddress": 6428
          },
          {
            "frameIndex": 6,
            "visualFrameId": 10,
            "durationTicks": 26,
            "offsetY": -2,
            "offsetX": -8,
            "frameAddress": 6432
          }
        ]
      },
      {
        "selector": 9,
        "frameCount": 9,
        "sequenceAddress": 6436,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 11,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 6437
          },
          {
            "frameIndex": 1,
            "visualFrameId": 11,
            "durationTicks": 2,
            "offsetY": -1,
            "offsetX": 0,
            "frameAddress": 6441
          },
          {
            "frameIndex": 2,
            "visualFrameId": 12,
            "durationTicks": 2,
            "offsetY": -3,
            "offsetX": -1,
            "frameAddress": 6445
          },
          {
            "frameIndex": 3,
            "visualFrameId": 12,
            "durationTicks": 16,
            "offsetY": -4,
            "offsetX": -1,
            "frameAddress": 6449
          },
          {
            "frameIndex": 4,
            "visualFrameId": 13,
            "durationTicks": 2,
            "offsetY": 2,
            "offsetX": -5,
            "frameAddress": 6453
          },
          {
            "frameIndex": 5,
            "visualFrameId": 13,
            "durationTicks": 2,
            "offsetY": 6,
            "offsetX": -5,
            "frameAddress": 6457
          },
          {
            "frameIndex": 6,
            "visualFrameId": 13,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 6461
          },
          {
            "frameIndex": 7,
            "visualFrameId": 13,
            "durationTicks": 4,
            "offsetY": 1,
            "offsetX": -5,
            "frameAddress": 6465
          },
          {
            "frameIndex": 8,
            "visualFrameId": 13,
            "durationTicks": 20,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 6469
          }
        ]
      }
    ]
  },
  {
    "resourceIndex": 5,
    "resourceBase": 23932,
    "sequenceTable": 7554,
    "sequenceCount": 4,
    "sequences": [
      {
        "selector": 0,
        "frameCount": 1,
        "sequenceAddress": 7563,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 0,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7564
          }
        ]
      },
      {
        "selector": 1,
        "frameCount": 2,
        "sequenceAddress": 7568,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7569
          },
          {
            "frameIndex": 1,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7573
          }
        ]
      },
      {
        "selector": 2,
        "frameCount": 2,
        "sequenceAddress": 7577,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 9,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7578
          },
          {
            "frameIndex": 1,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7582
          }
        ]
      },
      {
        "selector": 3,
        "frameCount": 2,
        "sequenceAddress": 7586,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 4,
            "durationTicks": 11,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7587
          },
          {
            "frameIndex": 1,
            "visualFrameId": 5,
            "durationTicks": 10,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7591
          }
        ]
      }
    ]
  },
  {
    "resourceIndex": 6,
    "resourceBase": 24096,
    "sequenceTable": 7718,
    "sequenceCount": 27,
    "sequences": [
      {
        "selector": 0,
        "frameCount": 52,
        "sequenceAddress": 7773,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 7774
          },
          {
            "frameIndex": 1,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 7778
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 7782
          },
          {
            "frameIndex": 3,
            "visualFrameId": 2,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 7786
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7790
          },
          {
            "frameIndex": 5,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 7794
          },
          {
            "frameIndex": 6,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 7798
          },
          {
            "frameIndex": 7,
            "visualFrameId": 3,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 7802
          },
          {
            "frameIndex": 8,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7806
          },
          {
            "frameIndex": 9,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 7810
          },
          {
            "frameIndex": 10,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": -3,
            "offsetX": 3,
            "frameAddress": 7814
          },
          {
            "frameIndex": 11,
            "visualFrameId": 4,
            "durationTicks": 6,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 7818
          },
          {
            "frameIndex": 12,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 7822
          },
          {
            "frameIndex": 13,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 7826
          },
          {
            "frameIndex": 14,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 7830
          },
          {
            "frameIndex": 15,
            "visualFrameId": 2,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 7834
          },
          {
            "frameIndex": 16,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7838
          },
          {
            "frameIndex": 17,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 7842
          },
          {
            "frameIndex": 18,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 7846
          },
          {
            "frameIndex": 19,
            "visualFrameId": 3,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 7850
          },
          {
            "frameIndex": 20,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7854
          },
          {
            "frameIndex": 21,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 7858
          },
          {
            "frameIndex": 22,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": -3,
            "offsetX": 3,
            "frameAddress": 7862
          },
          {
            "frameIndex": 23,
            "visualFrameId": 4,
            "durationTicks": 6,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 7866
          },
          {
            "frameIndex": 24,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 7870
          },
          {
            "frameIndex": 25,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 7874
          },
          {
            "frameIndex": 26,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 7878
          },
          {
            "frameIndex": 27,
            "visualFrameId": 2,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 7882
          },
          {
            "frameIndex": 28,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7886
          },
          {
            "frameIndex": 29,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 7890
          },
          {
            "frameIndex": 30,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 7894
          },
          {
            "frameIndex": 31,
            "visualFrameId": 3,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 7898
          },
          {
            "frameIndex": 32,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7902
          },
          {
            "frameIndex": 33,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 7906
          },
          {
            "frameIndex": 34,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": -3,
            "offsetX": 3,
            "frameAddress": 7910
          },
          {
            "frameIndex": 35,
            "visualFrameId": 4,
            "durationTicks": 6,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 7914
          },
          {
            "frameIndex": 36,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 7918
          },
          {
            "frameIndex": 37,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 7922
          },
          {
            "frameIndex": 38,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 7926
          },
          {
            "frameIndex": 39,
            "visualFrameId": 2,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 7930
          },
          {
            "frameIndex": 40,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7934
          },
          {
            "frameIndex": 41,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 7938
          },
          {
            "frameIndex": 42,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 7942
          },
          {
            "frameIndex": 43,
            "visualFrameId": 3,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 7946
          },
          {
            "frameIndex": 44,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7950
          },
          {
            "frameIndex": 45,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 7954
          },
          {
            "frameIndex": 46,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": -3,
            "offsetX": 3,
            "frameAddress": 7958
          },
          {
            "frameIndex": 47,
            "visualFrameId": 4,
            "durationTicks": 6,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 7962
          },
          {
            "frameIndex": 48,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 7966
          },
          {
            "frameIndex": 49,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 7970
          },
          {
            "frameIndex": 50,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 7974
          },
          {
            "frameIndex": 51,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 7978
          }
        ]
      },
      {
        "selector": 1,
        "frameCount": 51,
        "sequenceAddress": 7982,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 7983
          },
          {
            "frameIndex": 1,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 7987
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 7991
          },
          {
            "frameIndex": 3,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 7995
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 7999
          },
          {
            "frameIndex": 5,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 8003
          },
          {
            "frameIndex": 6,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8007
          },
          {
            "frameIndex": 7,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 8011
          },
          {
            "frameIndex": 8,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -1,
            "offsetX": 1,
            "frameAddress": 8015
          },
          {
            "frameIndex": 9,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8019
          },
          {
            "frameIndex": 10,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8023
          },
          {
            "frameIndex": 11,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 8027
          },
          {
            "frameIndex": 12,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8031
          },
          {
            "frameIndex": 13,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 8035
          },
          {
            "frameIndex": 14,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -1,
            "offsetX": 1,
            "frameAddress": 8039
          },
          {
            "frameIndex": 15,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8043
          },
          {
            "frameIndex": 16,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8047
          },
          {
            "frameIndex": 17,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 8051
          },
          {
            "frameIndex": 18,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8055
          },
          {
            "frameIndex": 19,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 8059
          },
          {
            "frameIndex": 20,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -1,
            "offsetX": 1,
            "frameAddress": 8063
          },
          {
            "frameIndex": 21,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8067
          },
          {
            "frameIndex": 22,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8071
          },
          {
            "frameIndex": 23,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8075
          },
          {
            "frameIndex": 24,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8079
          },
          {
            "frameIndex": 25,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8083
          },
          {
            "frameIndex": 26,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 8087
          },
          {
            "frameIndex": 27,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8091
          },
          {
            "frameIndex": 28,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 8095
          },
          {
            "frameIndex": 29,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -1,
            "offsetX": 1,
            "frameAddress": 8099
          },
          {
            "frameIndex": 30,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8103
          },
          {
            "frameIndex": 31,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8107
          },
          {
            "frameIndex": 32,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8111
          },
          {
            "frameIndex": 33,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8115
          },
          {
            "frameIndex": 34,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8119
          },
          {
            "frameIndex": 35,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 8123
          },
          {
            "frameIndex": 36,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8127
          },
          {
            "frameIndex": 37,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 8131
          },
          {
            "frameIndex": 38,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -1,
            "offsetX": 1,
            "frameAddress": 8135
          },
          {
            "frameIndex": 39,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8139
          },
          {
            "frameIndex": 40,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8143
          },
          {
            "frameIndex": 41,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 8147
          },
          {
            "frameIndex": 42,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8151
          },
          {
            "frameIndex": 43,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8155
          },
          {
            "frameIndex": 44,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8159
          },
          {
            "frameIndex": 45,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8163
          },
          {
            "frameIndex": 46,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 8167
          },
          {
            "frameIndex": 47,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -1,
            "offsetX": 1,
            "frameAddress": 8171
          },
          {
            "frameIndex": 48,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8175
          },
          {
            "frameIndex": 49,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8179
          },
          {
            "frameIndex": 50,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8183
          }
        ]
      },
      {
        "selector": 2,
        "frameCount": 19,
        "sequenceAddress": 8187,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 8188
          },
          {
            "frameIndex": 1,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 8192
          },
          {
            "frameIndex": 2,
            "visualFrameId": 3,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 8196
          },
          {
            "frameIndex": 3,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8200
          },
          {
            "frameIndex": 4,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8204
          },
          {
            "frameIndex": 5,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8208
          },
          {
            "frameIndex": 6,
            "visualFrameId": 2,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8212
          },
          {
            "frameIndex": 7,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8216
          },
          {
            "frameIndex": 8,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8220
          },
          {
            "frameIndex": 9,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8224
          },
          {
            "frameIndex": 10,
            "visualFrameId": 3,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8228
          },
          {
            "frameIndex": 11,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8232
          },
          {
            "frameIndex": 12,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 8236
          },
          {
            "frameIndex": 13,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 8240
          },
          {
            "frameIndex": 14,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 10,
            "frameAddress": 8244
          },
          {
            "frameIndex": 15,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 8248
          },
          {
            "frameIndex": 16,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8252
          },
          {
            "frameIndex": 17,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 8256
          },
          {
            "frameIndex": 18,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8260
          }
        ]
      },
      {
        "selector": 3,
        "frameCount": 50,
        "sequenceAddress": 8264,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8265
          },
          {
            "frameIndex": 1,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8269
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 8273
          },
          {
            "frameIndex": 3,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8277
          },
          {
            "frameIndex": 4,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8281
          },
          {
            "frameIndex": 5,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8285
          },
          {
            "frameIndex": 6,
            "visualFrameId": 4,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8289
          },
          {
            "frameIndex": 7,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8293
          },
          {
            "frameIndex": 8,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 8297
          },
          {
            "frameIndex": 9,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 11,
            "frameAddress": 8301
          },
          {
            "frameIndex": 10,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 9,
            "frameAddress": 8305
          },
          {
            "frameIndex": 11,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 10,
            "frameAddress": 8309
          },
          {
            "frameIndex": 12,
            "visualFrameId": 3,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 9,
            "frameAddress": 8313
          },
          {
            "frameIndex": 13,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8317
          },
          {
            "frameIndex": 14,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8321
          },
          {
            "frameIndex": 15,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8325
          },
          {
            "frameIndex": 16,
            "visualFrameId": 2,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8329
          },
          {
            "frameIndex": 17,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8333
          },
          {
            "frameIndex": 18,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8337
          },
          {
            "frameIndex": 19,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 8341
          },
          {
            "frameIndex": 20,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 8345
          },
          {
            "frameIndex": 21,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8349
          },
          {
            "frameIndex": 22,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8353
          },
          {
            "frameIndex": 23,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8357
          },
          {
            "frameIndex": 24,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8361
          },
          {
            "frameIndex": 25,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 8365
          },
          {
            "frameIndex": 26,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8369
          },
          {
            "frameIndex": 27,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8373
          },
          {
            "frameIndex": 28,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 8377
          },
          {
            "frameIndex": 29,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 8381
          },
          {
            "frameIndex": 30,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8385
          },
          {
            "frameIndex": 31,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8389
          },
          {
            "frameIndex": 32,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8393
          },
          {
            "frameIndex": 33,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8397
          },
          {
            "frameIndex": 34,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 8401
          },
          {
            "frameIndex": 35,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8405
          },
          {
            "frameIndex": 36,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8409
          },
          {
            "frameIndex": 37,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8413
          },
          {
            "frameIndex": 38,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8417
          },
          {
            "frameIndex": 39,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8421
          },
          {
            "frameIndex": 40,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 8425
          },
          {
            "frameIndex": 41,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 8429
          },
          {
            "frameIndex": 42,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8433
          },
          {
            "frameIndex": 43,
            "visualFrameId": 3,
            "durationTicks": 10,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8437
          },
          {
            "frameIndex": 44,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8441
          },
          {
            "frameIndex": 45,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8445
          },
          {
            "frameIndex": 46,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 8449
          },
          {
            "frameIndex": 47,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8453
          },
          {
            "frameIndex": 48,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8457
          },
          {
            "frameIndex": 49,
            "visualFrameId": 2,
            "durationTicks": 20,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8461
          }
        ]
      },
      {
        "selector": 4,
        "frameCount": 30,
        "sequenceAddress": 8465,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8466
          },
          {
            "frameIndex": 1,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8470
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8474
          },
          {
            "frameIndex": 3,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8478
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 8482
          },
          {
            "frameIndex": 5,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 8486
          },
          {
            "frameIndex": 6,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8490
          },
          {
            "frameIndex": 7,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8494
          },
          {
            "frameIndex": 8,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8498
          },
          {
            "frameIndex": 9,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 8502
          },
          {
            "frameIndex": 10,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8506
          },
          {
            "frameIndex": 11,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8510
          },
          {
            "frameIndex": 12,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8514
          },
          {
            "frameIndex": 13,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 8518
          },
          {
            "frameIndex": 14,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 8522
          },
          {
            "frameIndex": 15,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8526
          },
          {
            "frameIndex": 16,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 8530
          },
          {
            "frameIndex": 17,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8534
          },
          {
            "frameIndex": 18,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 10,
            "frameAddress": 8538
          },
          {
            "frameIndex": 19,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 8542
          },
          {
            "frameIndex": 20,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 9,
            "frameAddress": 8546
          },
          {
            "frameIndex": 21,
            "visualFrameId": 3,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 8550
          },
          {
            "frameIndex": 22,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8554
          },
          {
            "frameIndex": 23,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8558
          },
          {
            "frameIndex": 24,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 8562
          },
          {
            "frameIndex": 25,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8566
          },
          {
            "frameIndex": 26,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": 3,
            "frameAddress": 8570
          },
          {
            "frameIndex": 27,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8574
          },
          {
            "frameIndex": 28,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 3,
            "frameAddress": 8578
          },
          {
            "frameIndex": 29,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8582
          }
        ]
      },
      {
        "selector": 5,
        "frameCount": 35,
        "sequenceAddress": 8586,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8587
          },
          {
            "frameIndex": 1,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8591
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8595
          },
          {
            "frameIndex": 3,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8599
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8603
          },
          {
            "frameIndex": 5,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 10,
            "frameAddress": 8607
          },
          {
            "frameIndex": 6,
            "visualFrameId": 3,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 9,
            "frameAddress": 8611
          },
          {
            "frameIndex": 7,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8615
          },
          {
            "frameIndex": 8,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8619
          },
          {
            "frameIndex": 9,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 8623
          },
          {
            "frameIndex": 10,
            "visualFrameId": 2,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 8627
          },
          {
            "frameIndex": 11,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8631
          },
          {
            "frameIndex": 12,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -1,
            "offsetX": 5,
            "frameAddress": 8635
          },
          {
            "frameIndex": 13,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -10,
            "offsetX": 5,
            "frameAddress": 8639
          },
          {
            "frameIndex": 14,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 8643
          },
          {
            "frameIndex": 15,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": -3,
            "offsetX": 5,
            "frameAddress": 8647
          },
          {
            "frameIndex": 16,
            "visualFrameId": 4,
            "durationTicks": 12,
            "offsetY": -2,
            "offsetX": 5,
            "frameAddress": 8651
          },
          {
            "frameIndex": 17,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8655
          },
          {
            "frameIndex": 18,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8659
          },
          {
            "frameIndex": 19,
            "visualFrameId": 2,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8663
          },
          {
            "frameIndex": 20,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8667
          },
          {
            "frameIndex": 21,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8671
          },
          {
            "frameIndex": 22,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 10,
            "frameAddress": 8675
          },
          {
            "frameIndex": 23,
            "visualFrameId": 3,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 9,
            "frameAddress": 8679
          },
          {
            "frameIndex": 24,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8683
          },
          {
            "frameIndex": 25,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8687
          },
          {
            "frameIndex": 26,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 8691
          },
          {
            "frameIndex": 27,
            "visualFrameId": 2,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 8695
          },
          {
            "frameIndex": 28,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8699
          },
          {
            "frameIndex": 29,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -1,
            "offsetX": 5,
            "frameAddress": 8703
          },
          {
            "frameIndex": 30,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -10,
            "offsetX": 5,
            "frameAddress": 8707
          },
          {
            "frameIndex": 31,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 8711
          },
          {
            "frameIndex": 32,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": -3,
            "offsetX": 5,
            "frameAddress": 8715
          },
          {
            "frameIndex": 33,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": -2,
            "offsetX": 5,
            "frameAddress": 8719
          },
          {
            "frameIndex": 34,
            "visualFrameId": 4,
            "durationTicks": 16,
            "offsetY": -3,
            "offsetX": 5,
            "frameAddress": 8723
          }
        ]
      },
      {
        "selector": 6,
        "frameCount": 72,
        "sequenceAddress": 8727,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8728
          },
          {
            "frameIndex": 1,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 8732
          },
          {
            "frameIndex": 2,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8736
          },
          {
            "frameIndex": 3,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8740
          },
          {
            "frameIndex": 4,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 8744
          },
          {
            "frameIndex": 5,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 8748
          },
          {
            "frameIndex": 6,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8752
          },
          {
            "frameIndex": 7,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 8756
          },
          {
            "frameIndex": 8,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8760
          },
          {
            "frameIndex": 9,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8764
          },
          {
            "frameIndex": 10,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 8768
          },
          {
            "frameIndex": 11,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 8772
          },
          {
            "frameIndex": 12,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 8776
          },
          {
            "frameIndex": 13,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8780
          },
          {
            "frameIndex": 14,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8784
          },
          {
            "frameIndex": 15,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 8788
          },
          {
            "frameIndex": 16,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8792
          },
          {
            "frameIndex": 17,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8796
          },
          {
            "frameIndex": 18,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8800
          },
          {
            "frameIndex": 19,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8804
          },
          {
            "frameIndex": 20,
            "visualFrameId": 2,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8808
          },
          {
            "frameIndex": 21,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 8812
          },
          {
            "frameIndex": 22,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 8816
          },
          {
            "frameIndex": 23,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 8820
          },
          {
            "frameIndex": 24,
            "visualFrameId": 4,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 8824
          },
          {
            "frameIndex": 25,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8828
          },
          {
            "frameIndex": 26,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -8,
            "offsetX": 0,
            "frameAddress": 8832
          },
          {
            "frameIndex": 27,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8836
          },
          {
            "frameIndex": 28,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": -2,
            "offsetX": 0,
            "frameAddress": 8840
          },
          {
            "frameIndex": 29,
            "visualFrameId": 4,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8844
          },
          {
            "frameIndex": 30,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8848
          },
          {
            "frameIndex": 31,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8852
          },
          {
            "frameIndex": 32,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8856
          },
          {
            "frameIndex": 33,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8860
          },
          {
            "frameIndex": 34,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8864
          },
          {
            "frameIndex": 35,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8868
          },
          {
            "frameIndex": 36,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8872
          },
          {
            "frameIndex": 37,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 8876
          },
          {
            "frameIndex": 38,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 8880
          },
          {
            "frameIndex": 39,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 8884
          },
          {
            "frameIndex": 40,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 8888
          },
          {
            "frameIndex": 41,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": 2,
            "frameAddress": 8892
          },
          {
            "frameIndex": 42,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": 6,
            "frameAddress": 8896
          },
          {
            "frameIndex": 43,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": 3,
            "frameAddress": 8900
          },
          {
            "frameIndex": 44,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -8,
            "offsetX": 2,
            "frameAddress": 8904
          },
          {
            "frameIndex": 45,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -8,
            "offsetX": 5,
            "frameAddress": 8908
          },
          {
            "frameIndex": 46,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -8,
            "offsetX": 3,
            "frameAddress": 8912
          },
          {
            "frameIndex": 47,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": -12,
            "offsetX": 2,
            "frameAddress": 8916
          },
          {
            "frameIndex": 48,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": -12,
            "offsetX": 6,
            "frameAddress": 8920
          },
          {
            "frameIndex": 49,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": -12,
            "offsetX": 3,
            "frameAddress": 8924
          },
          {
            "frameIndex": 50,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -16,
            "offsetX": 2,
            "frameAddress": 8928
          },
          {
            "frameIndex": 51,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -16,
            "offsetX": 5,
            "frameAddress": 8932
          },
          {
            "frameIndex": 52,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -16,
            "offsetX": 3,
            "frameAddress": 8936
          },
          {
            "frameIndex": 53,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": -20,
            "offsetX": 2,
            "frameAddress": 8940
          },
          {
            "frameIndex": 54,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": -20,
            "offsetX": 6,
            "frameAddress": 8944
          },
          {
            "frameIndex": 55,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": -20,
            "offsetX": 3,
            "frameAddress": 8948
          },
          {
            "frameIndex": 56,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -24,
            "offsetX": 2,
            "frameAddress": 8952
          },
          {
            "frameIndex": 57,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -24,
            "offsetX": 5,
            "frameAddress": 8956
          },
          {
            "frameIndex": 58,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -24,
            "offsetX": 3,
            "frameAddress": 8960
          },
          {
            "frameIndex": 59,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": -28,
            "offsetX": 0,
            "frameAddress": 8964
          },
          {
            "frameIndex": 60,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": -29,
            "offsetX": 0,
            "frameAddress": 8968
          },
          {
            "frameIndex": 61,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": -30,
            "offsetX": 0,
            "frameAddress": 8972
          },
          {
            "frameIndex": 62,
            "visualFrameId": 4,
            "durationTicks": 24,
            "offsetY": -31,
            "offsetX": 0,
            "frameAddress": 8976
          },
          {
            "frameIndex": 63,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -24,
            "offsetX": -3,
            "frameAddress": 8980
          },
          {
            "frameIndex": 64,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -21,
            "offsetX": -3,
            "frameAddress": 8984
          },
          {
            "frameIndex": 65,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -25,
            "offsetX": -3,
            "frameAddress": 8988
          },
          {
            "frameIndex": 66,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -11,
            "offsetX": -3,
            "frameAddress": 8992
          },
          {
            "frameIndex": 67,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -3,
            "offsetX": -3,
            "frameAddress": 8996
          },
          {
            "frameIndex": 68,
            "visualFrameId": 10,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 9000
          },
          {
            "frameIndex": 69,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": -5,
            "offsetX": -4,
            "frameAddress": 9004
          },
          {
            "frameIndex": 70,
            "visualFrameId": 10,
            "durationTicks": 20,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 9008
          },
          {
            "frameIndex": 71,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 9012
          }
        ]
      },
      {
        "selector": 7,
        "frameCount": 35,
        "sequenceAddress": 9016,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 9017
          },
          {
            "frameIndex": 1,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9021
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9025
          },
          {
            "frameIndex": 3,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9029
          },
          {
            "frameIndex": 4,
            "visualFrameId": 2,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9033
          },
          {
            "frameIndex": 5,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 9037
          },
          {
            "frameIndex": 6,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9041
          },
          {
            "frameIndex": 7,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 9045
          },
          {
            "frameIndex": 8,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9049
          },
          {
            "frameIndex": 9,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 9053
          },
          {
            "frameIndex": 10,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 9057
          },
          {
            "frameIndex": 11,
            "visualFrameId": 3,
            "durationTicks": 20,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 9061
          },
          {
            "frameIndex": 12,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9065
          },
          {
            "frameIndex": 13,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 9069
          },
          {
            "frameIndex": 14,
            "visualFrameId": 4,
            "durationTicks": 18,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 9073
          },
          {
            "frameIndex": 15,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": -5,
            "offsetX": -2,
            "frameAddress": 9077
          },
          {
            "frameIndex": 16,
            "visualFrameId": 4,
            "durationTicks": 6,
            "offsetY": -13,
            "offsetX": -3,
            "frameAddress": 9081
          },
          {
            "frameIndex": 17,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": -13,
            "offsetX": -4,
            "frameAddress": 9085
          },
          {
            "frameIndex": 18,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": -13,
            "offsetX": -3,
            "frameAddress": 9089
          },
          {
            "frameIndex": 19,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": -13,
            "offsetX": -3,
            "frameAddress": 9093
          },
          {
            "frameIndex": 20,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": -13,
            "offsetX": -4,
            "frameAddress": 9097
          },
          {
            "frameIndex": 21,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": -13,
            "offsetX": -3,
            "frameAddress": 9101
          },
          {
            "frameIndex": 22,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": -13,
            "offsetX": -3,
            "frameAddress": 9105
          },
          {
            "frameIndex": 23,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": -13,
            "offsetX": -4,
            "frameAddress": 9109
          },
          {
            "frameIndex": 24,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": -13,
            "offsetX": -3,
            "frameAddress": 9113
          },
          {
            "frameIndex": 25,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": -13,
            "offsetX": -3,
            "frameAddress": 9117
          },
          {
            "frameIndex": 26,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": -13,
            "offsetX": -4,
            "frameAddress": 9121
          },
          {
            "frameIndex": 27,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": -13,
            "offsetX": -3,
            "frameAddress": 9125
          },
          {
            "frameIndex": 28,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": -13,
            "offsetX": -3,
            "frameAddress": 9129
          },
          {
            "frameIndex": 29,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": -13,
            "offsetX": -4,
            "frameAddress": 9133
          },
          {
            "frameIndex": 30,
            "visualFrameId": 4,
            "durationTicks": 5,
            "offsetY": -13,
            "offsetX": -3,
            "frameAddress": 9137
          },
          {
            "frameIndex": 31,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": -13,
            "offsetX": -3,
            "frameAddress": 9141
          },
          {
            "frameIndex": 32,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": -11,
            "offsetX": -3,
            "frameAddress": 9145
          },
          {
            "frameIndex": 33,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": -8,
            "offsetX": -2,
            "frameAddress": 9149
          },
          {
            "frameIndex": 34,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": -4,
            "offsetX": -2,
            "frameAddress": 9153
          }
        ]
      },
      {
        "selector": 8,
        "frameCount": 46,
        "sequenceAddress": 9157,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9158
          },
          {
            "frameIndex": 1,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9162
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9166
          },
          {
            "frameIndex": 3,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 9170
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9174
          },
          {
            "frameIndex": 5,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9178
          },
          {
            "frameIndex": 6,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9182
          },
          {
            "frameIndex": 7,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": 2,
            "frameAddress": 9186
          },
          {
            "frameIndex": 8,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 9190
          },
          {
            "frameIndex": 9,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9194
          },
          {
            "frameIndex": 10,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9198
          },
          {
            "frameIndex": 11,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9202
          },
          {
            "frameIndex": 12,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 9206
          },
          {
            "frameIndex": 13,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9210
          },
          {
            "frameIndex": 14,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9214
          },
          {
            "frameIndex": 15,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9218
          },
          {
            "frameIndex": 16,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": 2,
            "frameAddress": 9222
          },
          {
            "frameIndex": 17,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 9226
          },
          {
            "frameIndex": 18,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9230
          },
          {
            "frameIndex": 19,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9234
          },
          {
            "frameIndex": 20,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9238
          },
          {
            "frameIndex": 21,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 9242
          },
          {
            "frameIndex": 22,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9246
          },
          {
            "frameIndex": 23,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9250
          },
          {
            "frameIndex": 24,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9254
          },
          {
            "frameIndex": 25,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": 2,
            "frameAddress": 9258
          },
          {
            "frameIndex": 26,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 9262
          },
          {
            "frameIndex": 27,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9266
          },
          {
            "frameIndex": 28,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9270
          },
          {
            "frameIndex": 29,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9274
          },
          {
            "frameIndex": 30,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 9278
          },
          {
            "frameIndex": 31,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9282
          },
          {
            "frameIndex": 32,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9286
          },
          {
            "frameIndex": 33,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9290
          },
          {
            "frameIndex": 34,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9294
          },
          {
            "frameIndex": 35,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9298
          },
          {
            "frameIndex": 36,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9302
          },
          {
            "frameIndex": 37,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": 2,
            "frameAddress": 9306
          },
          {
            "frameIndex": 38,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 9310
          },
          {
            "frameIndex": 39,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 9314
          },
          {
            "frameIndex": 40,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9318
          },
          {
            "frameIndex": 41,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -6,
            "offsetX": 2,
            "frameAddress": 9322
          },
          {
            "frameIndex": 42,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9326
          },
          {
            "frameIndex": 43,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 9330
          },
          {
            "frameIndex": 44,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9334
          },
          {
            "frameIndex": 45,
            "visualFrameId": 4,
            "durationTicks": 20,
            "offsetY": -1,
            "offsetX": 2,
            "frameAddress": 9338
          }
        ]
      },
      {
        "selector": 9,
        "frameCount": 65,
        "sequenceAddress": 9342,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9343
          },
          {
            "frameIndex": 1,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 9347
          },
          {
            "frameIndex": 2,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9351
          },
          {
            "frameIndex": 3,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9355
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9359
          },
          {
            "frameIndex": 5,
            "visualFrameId": 3,
            "durationTicks": 10,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9363
          },
          {
            "frameIndex": 6,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9367
          },
          {
            "frameIndex": 7,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 9371
          },
          {
            "frameIndex": 8,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 9375
          },
          {
            "frameIndex": 9,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -10,
            "frameAddress": 9379
          },
          {
            "frameIndex": 10,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 9383
          },
          {
            "frameIndex": 11,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -6,
            "frameAddress": 9387
          },
          {
            "frameIndex": 12,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 9391
          },
          {
            "frameIndex": 13,
            "visualFrameId": 4,
            "durationTicks": 10,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 9395
          },
          {
            "frameIndex": 14,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 9399
          },
          {
            "frameIndex": 15,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 9403
          },
          {
            "frameIndex": 16,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9407
          },
          {
            "frameIndex": 17,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 9411
          },
          {
            "frameIndex": 18,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9415
          },
          {
            "frameIndex": 19,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9419
          },
          {
            "frameIndex": 20,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9423
          },
          {
            "frameIndex": 21,
            "visualFrameId": 3,
            "durationTicks": 10,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9427
          },
          {
            "frameIndex": 22,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9431
          },
          {
            "frameIndex": 23,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 9435
          },
          {
            "frameIndex": 24,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 9439
          },
          {
            "frameIndex": 25,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -6,
            "frameAddress": 9443
          },
          {
            "frameIndex": 26,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 9447
          },
          {
            "frameIndex": 27,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 9451
          },
          {
            "frameIndex": 28,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -4,
            "frameAddress": 9455
          },
          {
            "frameIndex": 29,
            "visualFrameId": 4,
            "durationTicks": 10,
            "offsetY": 0,
            "offsetX": -5,
            "frameAddress": 9459
          },
          {
            "frameIndex": 30,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -3,
            "frameAddress": 9463
          },
          {
            "frameIndex": 31,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 9467
          },
          {
            "frameIndex": 32,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9471
          },
          {
            "frameIndex": 33,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 9475
          },
          {
            "frameIndex": 34,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9479
          },
          {
            "frameIndex": 35,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9483
          },
          {
            "frameIndex": 36,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9487
          },
          {
            "frameIndex": 37,
            "visualFrameId": 3,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9491
          },
          {
            "frameIndex": 38,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9495
          },
          {
            "frameIndex": 39,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 9499
          },
          {
            "frameIndex": 40,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 9503
          },
          {
            "frameIndex": 41,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 9507
          },
          {
            "frameIndex": 42,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9511
          },
          {
            "frameIndex": 43,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9515
          },
          {
            "frameIndex": 44,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9519
          },
          {
            "frameIndex": 45,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 9523
          },
          {
            "frameIndex": 46,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 9527
          },
          {
            "frameIndex": 47,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 9531
          },
          {
            "frameIndex": 48,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9535
          },
          {
            "frameIndex": 49,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9539
          },
          {
            "frameIndex": 50,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9543
          },
          {
            "frameIndex": 51,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 9547
          },
          {
            "frameIndex": 52,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 9551
          },
          {
            "frameIndex": 53,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 9555
          },
          {
            "frameIndex": 54,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9559
          },
          {
            "frameIndex": 55,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9563
          },
          {
            "frameIndex": 56,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9567
          },
          {
            "frameIndex": 57,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 9571
          },
          {
            "frameIndex": 58,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -2,
            "frameAddress": 9575
          },
          {
            "frameIndex": 59,
            "visualFrameId": 4,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 9579
          },
          {
            "frameIndex": 60,
            "visualFrameId": 3,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9583
          },
          {
            "frameIndex": 61,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 9587
          },
          {
            "frameIndex": 62,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9591
          },
          {
            "frameIndex": 63,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9595
          },
          {
            "frameIndex": 64,
            "visualFrameId": 3,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9599
          }
        ]
      },
      {
        "selector": 10,
        "frameCount": 59,
        "sequenceAddress": 9603,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9604
          },
          {
            "frameIndex": 1,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 9608
          },
          {
            "frameIndex": 2,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9612
          },
          {
            "frameIndex": 3,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9616
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 16,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9620
          },
          {
            "frameIndex": 5,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 9624
          },
          {
            "frameIndex": 6,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9628
          },
          {
            "frameIndex": 7,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 9632
          },
          {
            "frameIndex": 8,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 9636
          },
          {
            "frameIndex": 9,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 9640
          },
          {
            "frameIndex": 10,
            "visualFrameId": 3,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 9644
          },
          {
            "frameIndex": 11,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 9648
          },
          {
            "frameIndex": 12,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 9652
          },
          {
            "frameIndex": 13,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9656
          },
          {
            "frameIndex": 14,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9660
          },
          {
            "frameIndex": 15,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9664
          },
          {
            "frameIndex": 16,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9668
          },
          {
            "frameIndex": 17,
            "visualFrameId": 3,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9672
          },
          {
            "frameIndex": 18,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 9676
          },
          {
            "frameIndex": 19,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9680
          },
          {
            "frameIndex": 20,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": 7,
            "frameAddress": 9684
          },
          {
            "frameIndex": 21,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9688
          },
          {
            "frameIndex": 22,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": -2,
            "offsetX": 4,
            "frameAddress": 9692
          },
          {
            "frameIndex": 23,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9696
          },
          {
            "frameIndex": 24,
            "visualFrameId": 4,
            "durationTicks": 20,
            "offsetY": -1,
            "offsetX": 3,
            "frameAddress": 9700
          },
          {
            "frameIndex": 25,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 9704
          },
          {
            "frameIndex": 26,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9708
          },
          {
            "frameIndex": 27,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9712
          },
          {
            "frameIndex": 28,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9716
          },
          {
            "frameIndex": 29,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9720
          },
          {
            "frameIndex": 30,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 9724
          },
          {
            "frameIndex": 31,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9728
          },
          {
            "frameIndex": 32,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 9732
          },
          {
            "frameIndex": 33,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": 6,
            "frameAddress": 9736
          },
          {
            "frameIndex": 34,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 9740
          },
          {
            "frameIndex": 35,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9744
          },
          {
            "frameIndex": 36,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9748
          },
          {
            "frameIndex": 37,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9752
          },
          {
            "frameIndex": 38,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9756
          },
          {
            "frameIndex": 39,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 9760
          },
          {
            "frameIndex": 40,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9764
          },
          {
            "frameIndex": 41,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 9768
          },
          {
            "frameIndex": 42,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": 6,
            "frameAddress": 9772
          },
          {
            "frameIndex": 43,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 9776
          },
          {
            "frameIndex": 44,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9780
          },
          {
            "frameIndex": 45,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9784
          },
          {
            "frameIndex": 46,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9788
          },
          {
            "frameIndex": 47,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9792
          },
          {
            "frameIndex": 48,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 9796
          },
          {
            "frameIndex": 49,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9800
          },
          {
            "frameIndex": 50,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 9804
          },
          {
            "frameIndex": 51,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": 6,
            "frameAddress": 9808
          },
          {
            "frameIndex": 52,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 9812
          },
          {
            "frameIndex": 53,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 9816
          },
          {
            "frameIndex": 54,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9820
          },
          {
            "frameIndex": 55,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 9824
          },
          {
            "frameIndex": 56,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9828
          },
          {
            "frameIndex": 57,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 9832
          },
          {
            "frameIndex": 58,
            "visualFrameId": 3,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9836
          }
        ]
      },
      {
        "selector": 11,
        "frameCount": 17,
        "sequenceAddress": 9840,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9841
          },
          {
            "frameIndex": 1,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9845
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9849
          },
          {
            "frameIndex": 3,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9853
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9857
          },
          {
            "frameIndex": 5,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9861
          },
          {
            "frameIndex": 6,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9865
          },
          {
            "frameIndex": 7,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9869
          },
          {
            "frameIndex": 8,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9873
          },
          {
            "frameIndex": 9,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9877
          },
          {
            "frameIndex": 10,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9881
          },
          {
            "frameIndex": 11,
            "visualFrameId": 3,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9885
          },
          {
            "frameIndex": 12,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9889
          },
          {
            "frameIndex": 13,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9893
          },
          {
            "frameIndex": 14,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9897
          },
          {
            "frameIndex": 15,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 9901
          },
          {
            "frameIndex": 16,
            "visualFrameId": 2,
            "durationTicks": 20,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9905
          }
        ]
      },
      {
        "selector": 12,
        "frameCount": 53,
        "sequenceAddress": 9909,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 9910
          },
          {
            "frameIndex": 1,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 9914
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9918
          },
          {
            "frameIndex": 3,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 9922
          },
          {
            "frameIndex": 4,
            "visualFrameId": 2,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 9926
          },
          {
            "frameIndex": 5,
            "visualFrameId": 1,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 9930
          },
          {
            "frameIndex": 6,
            "visualFrameId": 11,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -10,
            "frameAddress": 9934
          },
          {
            "frameIndex": 7,
            "visualFrameId": 11,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -14,
            "frameAddress": 9938
          },
          {
            "frameIndex": 8,
            "visualFrameId": 11,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -11,
            "frameAddress": 9942
          },
          {
            "frameIndex": 9,
            "visualFrameId": 11,
            "durationTicks": 20,
            "offsetY": 0,
            "offsetX": -12,
            "frameAddress": 9946
          },
          {
            "frameIndex": 10,
            "visualFrameId": 14,
            "durationTicks": 2,
            "offsetY": 2,
            "offsetX": -10,
            "frameAddress": 9950
          },
          {
            "frameIndex": 11,
            "visualFrameId": 14,
            "durationTicks": 2,
            "offsetY": 6,
            "offsetX": -10,
            "frameAddress": 9954
          },
          {
            "frameIndex": 12,
            "visualFrameId": 14,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": -10,
            "frameAddress": 9958
          },
          {
            "frameIndex": 13,
            "visualFrameId": 14,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": -10,
            "frameAddress": 9962
          },
          {
            "frameIndex": 14,
            "visualFrameId": 14,
            "durationTicks": 2,
            "offsetY": -38,
            "offsetX": 0,
            "frameAddress": 9966
          },
          {
            "frameIndex": 15,
            "visualFrameId": 14,
            "durationTicks": 2,
            "offsetY": -34,
            "offsetX": 0,
            "frameAddress": 9970
          },
          {
            "frameIndex": 16,
            "visualFrameId": 14,
            "durationTicks": 2,
            "offsetY": -38,
            "offsetX": 0,
            "frameAddress": 9974
          },
          {
            "frameIndex": 17,
            "visualFrameId": 14,
            "durationTicks": 2,
            "offsetY": -34,
            "offsetX": 0,
            "frameAddress": 9978
          },
          {
            "frameIndex": 18,
            "visualFrameId": 14,
            "durationTicks": 2,
            "offsetY": -40,
            "offsetX": 0,
            "frameAddress": 9982
          },
          {
            "frameIndex": 19,
            "visualFrameId": 14,
            "durationTicks": 2,
            "offsetY": -44,
            "offsetX": 0,
            "frameAddress": 9986
          },
          {
            "frameIndex": 20,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": -40,
            "offsetX": -1,
            "frameAddress": 9990
          },
          {
            "frameIndex": 21,
            "visualFrameId": 12,
            "durationTicks": 2,
            "offsetY": -40,
            "offsetX": -8,
            "frameAddress": 9994
          },
          {
            "frameIndex": 22,
            "visualFrameId": 12,
            "durationTicks": 2,
            "offsetY": -40,
            "offsetX": -10,
            "frameAddress": 9998
          },
          {
            "frameIndex": 23,
            "visualFrameId": 12,
            "durationTicks": 2,
            "offsetY": -40,
            "offsetX": -9,
            "frameAddress": 10002
          },
          {
            "frameIndex": 24,
            "visualFrameId": 13,
            "durationTicks": 2,
            "offsetY": -36,
            "offsetX": -8,
            "frameAddress": 10006
          },
          {
            "frameIndex": 25,
            "visualFrameId": 13,
            "durationTicks": 2,
            "offsetY": -36,
            "offsetX": -10,
            "frameAddress": 10010
          },
          {
            "frameIndex": 26,
            "visualFrameId": 13,
            "durationTicks": 2,
            "offsetY": -36,
            "offsetX": -9,
            "frameAddress": 10014
          },
          {
            "frameIndex": 27,
            "visualFrameId": 11,
            "durationTicks": 2,
            "offsetY": -32,
            "offsetX": -8,
            "frameAddress": 10018
          },
          {
            "frameIndex": 28,
            "visualFrameId": 11,
            "durationTicks": 2,
            "offsetY": -32,
            "offsetX": -10,
            "frameAddress": 10022
          },
          {
            "frameIndex": 29,
            "visualFrameId": 11,
            "durationTicks": 2,
            "offsetY": -32,
            "offsetX": -9,
            "frameAddress": 10026
          },
          {
            "frameIndex": 30,
            "visualFrameId": 12,
            "durationTicks": 2,
            "offsetY": -28,
            "offsetX": -8,
            "frameAddress": 10030
          },
          {
            "frameIndex": 31,
            "visualFrameId": 12,
            "durationTicks": 2,
            "offsetY": -28,
            "offsetX": -10,
            "frameAddress": 10034
          },
          {
            "frameIndex": 32,
            "visualFrameId": 12,
            "durationTicks": 2,
            "offsetY": -28,
            "offsetX": -9,
            "frameAddress": 10038
          },
          {
            "frameIndex": 33,
            "visualFrameId": 13,
            "durationTicks": 2,
            "offsetY": -24,
            "offsetX": -8,
            "frameAddress": 10042
          },
          {
            "frameIndex": 34,
            "visualFrameId": 13,
            "durationTicks": 2,
            "offsetY": -24,
            "offsetX": -10,
            "frameAddress": 10046
          },
          {
            "frameIndex": 35,
            "visualFrameId": 13,
            "durationTicks": 2,
            "offsetY": -24,
            "offsetX": -9,
            "frameAddress": 10050
          },
          {
            "frameIndex": 36,
            "visualFrameId": 11,
            "durationTicks": 2,
            "offsetY": -20,
            "offsetX": -8,
            "frameAddress": 10054
          },
          {
            "frameIndex": 37,
            "visualFrameId": 11,
            "durationTicks": 2,
            "offsetY": -20,
            "offsetX": -10,
            "frameAddress": 10058
          },
          {
            "frameIndex": 38,
            "visualFrameId": 11,
            "durationTicks": 2,
            "offsetY": -20,
            "offsetX": -9,
            "frameAddress": 10062
          },
          {
            "frameIndex": 39,
            "visualFrameId": 13,
            "durationTicks": 2,
            "offsetY": -16,
            "offsetX": -8,
            "frameAddress": 10066
          },
          {
            "frameIndex": 40,
            "visualFrameId": 13,
            "durationTicks": 2,
            "offsetY": -16,
            "offsetX": -10,
            "frameAddress": 10070
          },
          {
            "frameIndex": 41,
            "visualFrameId": 13,
            "durationTicks": 2,
            "offsetY": -16,
            "offsetX": -9,
            "frameAddress": 10074
          },
          {
            "frameIndex": 42,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": -12,
            "offsetX": 1,
            "frameAddress": 10078
          },
          {
            "frameIndex": 43,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": -12,
            "offsetX": 4,
            "frameAddress": 10082
          },
          {
            "frameIndex": 44,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": -12,
            "offsetX": 2,
            "frameAddress": 10086
          },
          {
            "frameIndex": 45,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -8,
            "offsetX": 2,
            "frameAddress": 10090
          },
          {
            "frameIndex": 46,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -6,
            "offsetX": 8,
            "frameAddress": 10094
          },
          {
            "frameIndex": 47,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": 2,
            "frameAddress": 10098
          },
          {
            "frameIndex": 48,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 3,
            "frameAddress": 10102
          },
          {
            "frameIndex": 49,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": -2,
            "offsetX": 1,
            "frameAddress": 10106
          },
          {
            "frameIndex": 50,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": -2,
            "offsetX": 3,
            "frameAddress": 10110
          },
          {
            "frameIndex": 51,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": -2,
            "offsetX": 2,
            "frameAddress": 10114
          },
          {
            "frameIndex": 52,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": -2,
            "offsetX": 3,
            "frameAddress": 10118
          }
        ]
      },
      {
        "selector": 13,
        "frameCount": 39,
        "sequenceAddress": 10122,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 2,
            "durationTicks": 8,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10123
          },
          {
            "frameIndex": 1,
            "visualFrameId": 2,
            "durationTicks": 7,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 10127
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 7,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10131
          },
          {
            "frameIndex": 3,
            "visualFrameId": 2,
            "durationTicks": 7,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 10135
          },
          {
            "frameIndex": 4,
            "visualFrameId": 2,
            "durationTicks": 7,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10139
          },
          {
            "frameIndex": 5,
            "visualFrameId": 2,
            "durationTicks": 7,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 10143
          },
          {
            "frameIndex": 6,
            "visualFrameId": 2,
            "durationTicks": 7,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10147
          },
          {
            "frameIndex": 7,
            "visualFrameId": 2,
            "durationTicks": 7,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 10151
          },
          {
            "frameIndex": 8,
            "visualFrameId": 2,
            "durationTicks": 7,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10155
          },
          {
            "frameIndex": 9,
            "visualFrameId": 2,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 10159
          },
          {
            "frameIndex": 10,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10163
          },
          {
            "frameIndex": 11,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 10167
          },
          {
            "frameIndex": 12,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10171
          },
          {
            "frameIndex": 13,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10175
          },
          {
            "frameIndex": 14,
            "visualFrameId": 3,
            "durationTicks": 20,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10179
          },
          {
            "frameIndex": 15,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10183
          },
          {
            "frameIndex": 16,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 10187
          },
          {
            "frameIndex": 17,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10191
          },
          {
            "frameIndex": 18,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10195
          },
          {
            "frameIndex": 19,
            "visualFrameId": 3,
            "durationTicks": 20,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10199
          },
          {
            "frameIndex": 20,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10203
          },
          {
            "frameIndex": 21,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 10207
          },
          {
            "frameIndex": 22,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10211
          },
          {
            "frameIndex": 23,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 9,
            "frameAddress": 10215
          },
          {
            "frameIndex": 24,
            "visualFrameId": 3,
            "durationTicks": 20,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 10219
          },
          {
            "frameIndex": 25,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10223
          },
          {
            "frameIndex": 26,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10227
          },
          {
            "frameIndex": 27,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10231
          },
          {
            "frameIndex": 28,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 10235
          },
          {
            "frameIndex": 29,
            "visualFrameId": 2,
            "durationTicks": 20,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10239
          },
          {
            "frameIndex": 30,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10243
          },
          {
            "frameIndex": 31,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10247
          },
          {
            "frameIndex": 32,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10251
          },
          {
            "frameIndex": 33,
            "visualFrameId": 2,
            "durationTicks": 20,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10255
          },
          {
            "frameIndex": 34,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10259
          },
          {
            "frameIndex": 35,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 6,
            "offsetX": 0,
            "frameAddress": 10263
          },
          {
            "frameIndex": 36,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10267
          },
          {
            "frameIndex": 37,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 2,
            "offsetX": 0,
            "frameAddress": 10271
          },
          {
            "frameIndex": 38,
            "visualFrameId": 3,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10275
          }
        ]
      },
      {
        "selector": 14,
        "frameCount": 50,
        "sequenceAddress": 10279,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 10280
          },
          {
            "frameIndex": 1,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10284
          },
          {
            "frameIndex": 2,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10288
          },
          {
            "frameIndex": 3,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10292
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10296
          },
          {
            "frameIndex": 5,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10300
          },
          {
            "frameIndex": 6,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10304
          },
          {
            "frameIndex": 7,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 10308
          },
          {
            "frameIndex": 8,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10312
          },
          {
            "frameIndex": 9,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10316
          },
          {
            "frameIndex": 10,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10320
          },
          {
            "frameIndex": 11,
            "visualFrameId": 2,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10324
          },
          {
            "frameIndex": 12,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10328
          },
          {
            "frameIndex": 13,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10332
          },
          {
            "frameIndex": 14,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 10336
          },
          {
            "frameIndex": 15,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 10340
          },
          {
            "frameIndex": 16,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 10344
          },
          {
            "frameIndex": 17,
            "visualFrameId": 3,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 10348
          },
          {
            "frameIndex": 18,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10352
          },
          {
            "frameIndex": 19,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10356
          },
          {
            "frameIndex": 20,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10360
          },
          {
            "frameIndex": 21,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10364
          },
          {
            "frameIndex": 22,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 10368
          },
          {
            "frameIndex": 23,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 10372
          },
          {
            "frameIndex": 24,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10376
          },
          {
            "frameIndex": 25,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10380
          },
          {
            "frameIndex": 26,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10384
          },
          {
            "frameIndex": 27,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10388
          },
          {
            "frameIndex": 28,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 10392
          },
          {
            "frameIndex": 29,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 10396
          },
          {
            "frameIndex": 30,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10400
          },
          {
            "frameIndex": 31,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10404
          },
          {
            "frameIndex": 32,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10408
          },
          {
            "frameIndex": 33,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10412
          },
          {
            "frameIndex": 34,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 10416
          },
          {
            "frameIndex": 35,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 10420
          },
          {
            "frameIndex": 36,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10424
          },
          {
            "frameIndex": 37,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10428
          },
          {
            "frameIndex": 38,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10432
          },
          {
            "frameIndex": 39,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10436
          },
          {
            "frameIndex": 40,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 10440
          },
          {
            "frameIndex": 41,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 10444
          },
          {
            "frameIndex": 42,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10448
          },
          {
            "frameIndex": 43,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10452
          },
          {
            "frameIndex": 44,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10456
          },
          {
            "frameIndex": 45,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10460
          },
          {
            "frameIndex": 46,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 10464
          },
          {
            "frameIndex": 47,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 10468
          },
          {
            "frameIndex": 48,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 10472
          },
          {
            "frameIndex": 49,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 10476
          }
        ]
      },
      {
        "selector": 15,
        "frameCount": 19,
        "sequenceAddress": 10480,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 10481
          },
          {
            "frameIndex": 1,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10485
          },
          {
            "frameIndex": 2,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10489
          },
          {
            "frameIndex": 3,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10493
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10497
          },
          {
            "frameIndex": 5,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10501
          },
          {
            "frameIndex": 6,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10505
          },
          {
            "frameIndex": 7,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10509
          },
          {
            "frameIndex": 8,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 10513
          },
          {
            "frameIndex": 9,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10517
          },
          {
            "frameIndex": 10,
            "visualFrameId": 2,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10521
          },
          {
            "frameIndex": 11,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10525
          },
          {
            "frameIndex": 12,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10529
          },
          {
            "frameIndex": 13,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10533
          },
          {
            "frameIndex": 14,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 10,
            "frameAddress": 10537
          },
          {
            "frameIndex": 15,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10541
          },
          {
            "frameIndex": 16,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10545
          },
          {
            "frameIndex": 17,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10549
          },
          {
            "frameIndex": 18,
            "visualFrameId": 3,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10553
          }
        ]
      },
      {
        "selector": 16,
        "frameCount": 45,
        "sequenceAddress": 10557,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10558
          },
          {
            "frameIndex": 1,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 10562
          },
          {
            "frameIndex": 2,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10566
          },
          {
            "frameIndex": 3,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10570
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10574
          },
          {
            "frameIndex": 5,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10578
          },
          {
            "frameIndex": 6,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10582
          },
          {
            "frameIndex": 7,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10586
          },
          {
            "frameIndex": 8,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 10590
          },
          {
            "frameIndex": 9,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 10594
          },
          {
            "frameIndex": 10,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 10598
          },
          {
            "frameIndex": 11,
            "visualFrameId": 2,
            "durationTicks": 26,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 10602
          },
          {
            "frameIndex": 12,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10606
          },
          {
            "frameIndex": 13,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10610
          },
          {
            "frameIndex": 14,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 10614
          },
          {
            "frameIndex": 15,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10618
          },
          {
            "frameIndex": 16,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10622
          },
          {
            "frameIndex": 17,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": 4,
            "frameAddress": 10626
          },
          {
            "frameIndex": 18,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -1,
            "offsetX": 1,
            "frameAddress": 10630
          },
          {
            "frameIndex": 19,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10634
          },
          {
            "frameIndex": 20,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 10638
          },
          {
            "frameIndex": 21,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10642
          },
          {
            "frameIndex": 22,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10646
          },
          {
            "frameIndex": 23,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 10650
          },
          {
            "frameIndex": 24,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10654
          },
          {
            "frameIndex": 25,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10658
          },
          {
            "frameIndex": 26,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": 4,
            "frameAddress": 10662
          },
          {
            "frameIndex": 27,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -1,
            "offsetX": 1,
            "frameAddress": 10666
          },
          {
            "frameIndex": 28,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10670
          },
          {
            "frameIndex": 29,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 10674
          },
          {
            "frameIndex": 30,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10678
          },
          {
            "frameIndex": 31,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10682
          },
          {
            "frameIndex": 32,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 10686
          },
          {
            "frameIndex": 33,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10690
          },
          {
            "frameIndex": 34,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10694
          },
          {
            "frameIndex": 35,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": 4,
            "frameAddress": 10698
          },
          {
            "frameIndex": 36,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -1,
            "offsetX": 1,
            "frameAddress": 10702
          },
          {
            "frameIndex": 37,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10706
          },
          {
            "frameIndex": 38,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 10710
          },
          {
            "frameIndex": 39,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10714
          },
          {
            "frameIndex": 40,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10718
          },
          {
            "frameIndex": 41,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 10722
          },
          {
            "frameIndex": 42,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10726
          },
          {
            "frameIndex": 43,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 10730
          },
          {
            "frameIndex": 44,
            "visualFrameId": 3,
            "durationTicks": 24,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10734
          }
        ]
      },
      {
        "selector": 17,
        "frameCount": 39,
        "sequenceAddress": 10738,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10739
          },
          {
            "frameIndex": 1,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10743
          },
          {
            "frameIndex": 2,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10747
          },
          {
            "frameIndex": 3,
            "visualFrameId": 2,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10751
          },
          {
            "frameIndex": 4,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10755
          },
          {
            "frameIndex": 5,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10759
          },
          {
            "frameIndex": 6,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10763
          },
          {
            "frameIndex": 7,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10767
          },
          {
            "frameIndex": 8,
            "visualFrameId": 2,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 1,
            "frameAddress": 10771
          },
          {
            "frameIndex": 9,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10775
          },
          {
            "frameIndex": 10,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10779
          },
          {
            "frameIndex": 11,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10783
          },
          {
            "frameIndex": 12,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10787
          },
          {
            "frameIndex": 13,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10791
          },
          {
            "frameIndex": 14,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10795
          },
          {
            "frameIndex": 15,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10799
          },
          {
            "frameIndex": 16,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10803
          },
          {
            "frameIndex": 17,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10807
          },
          {
            "frameIndex": 18,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10811
          },
          {
            "frameIndex": 19,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10815
          },
          {
            "frameIndex": 20,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10819
          },
          {
            "frameIndex": 21,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10823
          },
          {
            "frameIndex": 22,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10827
          },
          {
            "frameIndex": 23,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10831
          },
          {
            "frameIndex": 24,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10835
          },
          {
            "frameIndex": 25,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10839
          },
          {
            "frameIndex": 26,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10843
          },
          {
            "frameIndex": 27,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10847
          },
          {
            "frameIndex": 28,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10851
          },
          {
            "frameIndex": 29,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10855
          },
          {
            "frameIndex": 30,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10859
          },
          {
            "frameIndex": 31,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10863
          },
          {
            "frameIndex": 32,
            "visualFrameId": 2,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10867
          },
          {
            "frameIndex": 33,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10871
          },
          {
            "frameIndex": 34,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 10875
          },
          {
            "frameIndex": 35,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10879
          },
          {
            "frameIndex": 36,
            "visualFrameId": 2,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 10883
          },
          {
            "frameIndex": 37,
            "visualFrameId": 2,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 10887
          },
          {
            "frameIndex": 38,
            "visualFrameId": 2,
            "durationTicks": 12,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 10891
          }
        ]
      },
      {
        "selector": 18,
        "frameCount": 66,
        "sequenceAddress": 10895,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10896
          },
          {
            "frameIndex": 1,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 0,
            "frameAddress": 10900
          },
          {
            "frameIndex": 2,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": 2,
            "offsetX": 0,
            "frameAddress": 10904
          },
          {
            "frameIndex": 3,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -8,
            "offsetX": 0,
            "frameAddress": 10908
          },
          {
            "frameIndex": 4,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -16,
            "offsetX": 0,
            "frameAddress": 10912
          },
          {
            "frameIndex": 5,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -24,
            "offsetX": 0,
            "frameAddress": 10916
          },
          {
            "frameIndex": 6,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -32,
            "offsetX": 0,
            "frameAddress": 10920
          },
          {
            "frameIndex": 7,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -40,
            "offsetX": 0,
            "frameAddress": 10924
          },
          {
            "frameIndex": 8,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -46,
            "offsetX": 0,
            "frameAddress": 10928
          },
          {
            "frameIndex": 9,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -48,
            "offsetX": 0,
            "frameAddress": 10932
          },
          {
            "frameIndex": 10,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -49,
            "offsetX": 0,
            "frameAddress": 10936
          },
          {
            "frameIndex": 11,
            "visualFrameId": 4,
            "durationTicks": 2,
            "offsetY": -49,
            "offsetX": 0,
            "frameAddress": 10940
          },
          {
            "frameIndex": 12,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": -49,
            "offsetX": 0,
            "frameAddress": 10944
          },
          {
            "frameIndex": 13,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": -49,
            "offsetX": 0,
            "frameAddress": 10948
          },
          {
            "frameIndex": 14,
            "visualFrameId": 4,
            "durationTicks": 29,
            "offsetY": -49,
            "offsetX": 0,
            "frameAddress": 10952
          },
          {
            "frameIndex": 15,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -40,
            "offsetX": 0,
            "frameAddress": 10956
          },
          {
            "frameIndex": 16,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -30,
            "offsetX": 0,
            "frameAddress": 10960
          },
          {
            "frameIndex": 17,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -20,
            "offsetX": 0,
            "frameAddress": 10964
          },
          {
            "frameIndex": 18,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -10,
            "offsetX": 0,
            "frameAddress": 10968
          },
          {
            "frameIndex": 19,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10972
          },
          {
            "frameIndex": 20,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 10976
          },
          {
            "frameIndex": 21,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 10980
          },
          {
            "frameIndex": 22,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": -2,
            "offsetX": 0,
            "frameAddress": 10984
          },
          {
            "frameIndex": 23,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 10988
          },
          {
            "frameIndex": 24,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 10992
          },
          {
            "frameIndex": 25,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 10996
          },
          {
            "frameIndex": 26,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11000
          },
          {
            "frameIndex": 27,
            "visualFrameId": 10,
            "durationTicks": 20,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11004
          },
          {
            "frameIndex": 28,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11008
          },
          {
            "frameIndex": 29,
            "visualFrameId": 10,
            "durationTicks": 68,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11012
          },
          {
            "frameIndex": 30,
            "visualFrameId": 10,
            "durationTicks": 3,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11016
          },
          {
            "frameIndex": 31,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": 6,
            "offsetX": 1,
            "frameAddress": 11020
          },
          {
            "frameIndex": 32,
            "visualFrameId": 10,
            "durationTicks": 2,
            "offsetY": 6,
            "offsetX": 1,
            "frameAddress": 11024
          },
          {
            "frameIndex": 33,
            "visualFrameId": 10,
            "durationTicks": 40,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11028
          },
          {
            "frameIndex": 34,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11032
          },
          {
            "frameIndex": 35,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 1,
            "frameAddress": 11036
          },
          {
            "frameIndex": 36,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11040
          },
          {
            "frameIndex": 37,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 1,
            "frameAddress": 11044
          },
          {
            "frameIndex": 38,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11048
          },
          {
            "frameIndex": 39,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 1,
            "frameAddress": 11052
          },
          {
            "frameIndex": 40,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11056
          },
          {
            "frameIndex": 41,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 1,
            "frameAddress": 11060
          },
          {
            "frameIndex": 42,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11064
          },
          {
            "frameIndex": 43,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 1,
            "frameAddress": 11068
          },
          {
            "frameIndex": 44,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11072
          },
          {
            "frameIndex": 45,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 1,
            "frameAddress": 11076
          },
          {
            "frameIndex": 46,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11080
          },
          {
            "frameIndex": 47,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 1,
            "frameAddress": 11084
          },
          {
            "frameIndex": 48,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11088
          },
          {
            "frameIndex": 49,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 1,
            "frameAddress": 11092
          },
          {
            "frameIndex": 50,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11096
          },
          {
            "frameIndex": 51,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 1,
            "frameAddress": 11100
          },
          {
            "frameIndex": 52,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11104
          },
          {
            "frameIndex": 53,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 1,
            "frameAddress": 11108
          },
          {
            "frameIndex": 54,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11112
          },
          {
            "frameIndex": 55,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 1,
            "frameAddress": 11116
          },
          {
            "frameIndex": 56,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11120
          },
          {
            "frameIndex": 57,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 1,
            "frameAddress": 11124
          },
          {
            "frameIndex": 58,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11128
          },
          {
            "frameIndex": 59,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 1,
            "frameAddress": 11132
          },
          {
            "frameIndex": 60,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11136
          },
          {
            "frameIndex": 61,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 1,
            "frameAddress": 11140
          },
          {
            "frameIndex": 62,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 0,
            "frameAddress": 11144
          },
          {
            "frameIndex": 63,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 5,
            "offsetX": 1,
            "frameAddress": 11148
          },
          {
            "frameIndex": 64,
            "visualFrameId": 4,
            "durationTicks": 4,
            "offsetY": 1,
            "offsetX": 0,
            "frameAddress": 11152
          },
          {
            "frameIndex": 65,
            "visualFrameId": 4,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 11156
          }
        ]
      },
      {
        "selector": 19,
        "frameCount": 13,
        "sequenceAddress": 11160,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": -1,
            "frameAddress": 11161
          },
          {
            "frameIndex": 1,
            "visualFrameId": 5,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 11165
          },
          {
            "frameIndex": 2,
            "visualFrameId": 5,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 6,
            "frameAddress": 11169
          },
          {
            "frameIndex": 3,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 11173
          },
          {
            "frameIndex": 4,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 10,
            "frameAddress": 11177
          },
          {
            "frameIndex": 5,
            "visualFrameId": 5,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 18,
            "frameAddress": 11181
          },
          {
            "frameIndex": 6,
            "visualFrameId": 5,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 26,
            "frameAddress": 11185
          },
          {
            "frameIndex": 7,
            "visualFrameId": 5,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 34,
            "frameAddress": 11189
          },
          {
            "frameIndex": 8,
            "visualFrameId": 5,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 42,
            "frameAddress": 11193
          },
          {
            "frameIndex": 9,
            "visualFrameId": 5,
            "durationTicks": 6,
            "offsetY": 0,
            "offsetX": 46,
            "frameAddress": 11197
          },
          {
            "frameIndex": 10,
            "visualFrameId": 5,
            "durationTicks": 8,
            "offsetY": 0,
            "offsetX": 48,
            "frameAddress": 11201
          },
          {
            "frameIndex": 11,
            "visualFrameId": 5,
            "durationTicks": 9,
            "offsetY": 0,
            "offsetX": 50,
            "frameAddress": 11205
          },
          {
            "frameIndex": 12,
            "visualFrameId": 5,
            "durationTicks": 30,
            "offsetY": 0,
            "offsetX": 51,
            "frameAddress": 11209
          }
        ]
      },
      {
        "selector": 20,
        "frameCount": 11,
        "sequenceAddress": 11213,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 6,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 5,
            "frameAddress": 11214
          },
          {
            "frameIndex": 1,
            "visualFrameId": 6,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 11218
          },
          {
            "frameIndex": 2,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 4,
            "offsetX": 6,
            "frameAddress": 11222
          },
          {
            "frameIndex": 3,
            "visualFrameId": 6,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 11226
          },
          {
            "frameIndex": 4,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 4,
            "offsetX": 10,
            "frameAddress": 11230
          },
          {
            "frameIndex": 5,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 4,
            "offsetX": 12,
            "frameAddress": 11234
          },
          {
            "frameIndex": 6,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 4,
            "offsetX": 46,
            "frameAddress": 11238
          },
          {
            "frameIndex": 7,
            "visualFrameId": 0,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 46,
            "frameAddress": 11242
          },
          {
            "frameIndex": 8,
            "visualFrameId": 7,
            "durationTicks": 2,
            "offsetY": 4,
            "offsetX": 48,
            "frameAddress": 11246
          },
          {
            "frameIndex": 9,
            "visualFrameId": 1,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 47,
            "frameAddress": 11250
          },
          {
            "frameIndex": 10,
            "visualFrameId": 0,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 48,
            "frameAddress": 11254
          }
        ]
      },
      {
        "selector": 21,
        "frameCount": 19,
        "sequenceAddress": 11258,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 3,
            "durationTicks": 5,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 11259
          },
          {
            "frameIndex": 1,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 11263
          },
          {
            "frameIndex": 2,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 3,
            "frameAddress": 11267
          },
          {
            "frameIndex": 3,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 11271
          },
          {
            "frameIndex": 4,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 9,
            "frameAddress": 11275
          },
          {
            "frameIndex": 5,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 11279
          },
          {
            "frameIndex": 6,
            "visualFrameId": 3,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 11283
          },
          {
            "frameIndex": 7,
            "visualFrameId": 3,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 7,
            "frameAddress": 11287
          },
          {
            "frameIndex": 8,
            "visualFrameId": 3,
            "durationTicks": 4,
            "offsetY": 0,
            "offsetX": 8,
            "frameAddress": 11291
          },
          {
            "frameIndex": 9,
            "visualFrameId": 15,
            "durationTicks": 6,
            "offsetY": -5,
            "offsetX": 8,
            "frameAddress": 11295
          },
          {
            "frameIndex": 10,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -4,
            "offsetX": 9,
            "frameAddress": 11299
          },
          {
            "frameIndex": 11,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -3,
            "offsetX": 8,
            "frameAddress": 11303
          },
          {
            "frameIndex": 12,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -4,
            "offsetX": 7,
            "frameAddress": 11307
          },
          {
            "frameIndex": 13,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -5,
            "offsetX": 8,
            "frameAddress": 11311
          },
          {
            "frameIndex": 14,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -4,
            "offsetX": 8,
            "frameAddress": 11315
          },
          {
            "frameIndex": 15,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -3,
            "offsetX": 8,
            "frameAddress": 11319
          },
          {
            "frameIndex": 16,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -4,
            "offsetX": 8,
            "frameAddress": 11323
          },
          {
            "frameIndex": 17,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -5,
            "offsetX": 8,
            "frameAddress": 11327
          },
          {
            "frameIndex": 18,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -5,
            "offsetX": 7,
            "frameAddress": 11331
          }
        ]
      },
      {
        "selector": 22,
        "frameCount": 24,
        "sequenceAddress": 11335,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 15,
            "durationTicks": 9,
            "offsetY": -5,
            "offsetX": 8,
            "frameAddress": 11336
          },
          {
            "frameIndex": 1,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -4,
            "offsetX": 9,
            "frameAddress": 11340
          },
          {
            "frameIndex": 2,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -3,
            "offsetX": 8,
            "frameAddress": 11344
          },
          {
            "frameIndex": 3,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -4,
            "offsetX": 7,
            "frameAddress": 11348
          },
          {
            "frameIndex": 4,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -5,
            "offsetX": 8,
            "frameAddress": 11352
          },
          {
            "frameIndex": 5,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -4,
            "offsetX": 9,
            "frameAddress": 11356
          },
          {
            "frameIndex": 6,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -3,
            "offsetX": 8,
            "frameAddress": 11360
          },
          {
            "frameIndex": 7,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -4,
            "offsetX": 7,
            "frameAddress": 11364
          },
          {
            "frameIndex": 8,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -5,
            "offsetX": 8,
            "frameAddress": 11368
          },
          {
            "frameIndex": 9,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -4,
            "offsetX": 9,
            "frameAddress": 11372
          },
          {
            "frameIndex": 10,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -3,
            "offsetX": 8,
            "frameAddress": 11376
          },
          {
            "frameIndex": 11,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -4,
            "offsetX": 7,
            "frameAddress": 11380
          },
          {
            "frameIndex": 12,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -5,
            "offsetX": 8,
            "frameAddress": 11384
          },
          {
            "frameIndex": 13,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -4,
            "offsetX": 9,
            "frameAddress": 11388
          },
          {
            "frameIndex": 14,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -3,
            "offsetX": 8,
            "frameAddress": 11392
          },
          {
            "frameIndex": 15,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -4,
            "offsetX": 7,
            "frameAddress": 11396
          },
          {
            "frameIndex": 16,
            "visualFrameId": 15,
            "durationTicks": 8,
            "offsetY": -5,
            "offsetX": 8,
            "frameAddress": 11400
          },
          {
            "frameIndex": 17,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": 8,
            "frameAddress": 11404
          },
          {
            "frameIndex": 18,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": 11,
            "frameAddress": 11408
          },
          {
            "frameIndex": 19,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": 8,
            "frameAddress": 11412
          },
          {
            "frameIndex": 20,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": 16,
            "frameAddress": 11416
          },
          {
            "frameIndex": 21,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": 28,
            "frameAddress": 11420
          },
          {
            "frameIndex": 22,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": 40,
            "frameAddress": 11424
          },
          {
            "frameIndex": 23,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": 52,
            "frameAddress": 11428
          }
        ]
      },
      {
        "selector": 23,
        "frameCount": 21,
        "sequenceAddress": 11432,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 15,
            "durationTicks": 15,
            "offsetY": -5,
            "offsetX": -116,
            "frameAddress": 11433
          },
          {
            "frameIndex": 1,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": -104,
            "frameAddress": 11437
          },
          {
            "frameIndex": 2,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": -92,
            "frameAddress": 11441
          },
          {
            "frameIndex": 3,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": -80,
            "frameAddress": 11445
          },
          {
            "frameIndex": 4,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": -68,
            "frameAddress": 11449
          },
          {
            "frameIndex": 5,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": -56,
            "frameAddress": 11453
          },
          {
            "frameIndex": 6,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": -44,
            "frameAddress": 11457
          },
          {
            "frameIndex": 7,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": -32,
            "frameAddress": 11461
          },
          {
            "frameIndex": 8,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": -20,
            "frameAddress": 11465
          },
          {
            "frameIndex": 9,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": -8,
            "frameAddress": 11469
          },
          {
            "frameIndex": 10,
            "visualFrameId": 15,
            "durationTicks": 3,
            "offsetY": -5,
            "offsetX": 0,
            "frameAddress": 11473
          },
          {
            "frameIndex": 11,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -5,
            "offsetX": -2,
            "frameAddress": 11477
          },
          {
            "frameIndex": 12,
            "visualFrameId": 15,
            "durationTicks": 3,
            "offsetY": -5,
            "offsetX": 0,
            "frameAddress": 11481
          },
          {
            "frameIndex": 13,
            "visualFrameId": 15,
            "durationTicks": 4,
            "offsetY": -5,
            "offsetX": -2,
            "frameAddress": 11485
          },
          {
            "frameIndex": 14,
            "visualFrameId": 15,
            "durationTicks": 5,
            "offsetY": -5,
            "offsetX": 0,
            "frameAddress": 11489
          },
          {
            "frameIndex": 15,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -17,
            "offsetX": -12,
            "frameAddress": 11493
          },
          {
            "frameIndex": 16,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -29,
            "offsetX": -24,
            "frameAddress": 11497
          },
          {
            "frameIndex": 17,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -41,
            "offsetX": -36,
            "frameAddress": 11501
          },
          {
            "frameIndex": 18,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -53,
            "offsetX": -48,
            "frameAddress": 11505
          },
          {
            "frameIndex": 19,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -65,
            "offsetX": -60,
            "frameAddress": 11509
          },
          {
            "frameIndex": 20,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -77,
            "offsetX": -72,
            "frameAddress": 11513
          }
        ]
      },
      {
        "selector": 24,
        "frameCount": 13,
        "sequenceAddress": 11517,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 15,
            "durationTicks": 24,
            "offsetY": 85,
            "offsetX": 87,
            "frameAddress": 11518
          },
          {
            "frameIndex": 1,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": 61,
            "offsetX": 63,
            "frameAddress": 11522
          },
          {
            "frameIndex": 2,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": 49,
            "offsetX": 51,
            "frameAddress": 11526
          },
          {
            "frameIndex": 3,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": 37,
            "offsetX": 39,
            "frameAddress": 11530
          },
          {
            "frameIndex": 4,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": 25,
            "offsetX": 27,
            "frameAddress": 11534
          },
          {
            "frameIndex": 5,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": 13,
            "offsetX": 15,
            "frameAddress": 11538
          },
          {
            "frameIndex": 6,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": 1,
            "offsetX": 3,
            "frameAddress": 11542
          },
          {
            "frameIndex": 7,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -11,
            "offsetX": -9,
            "frameAddress": 11546
          },
          {
            "frameIndex": 8,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -7,
            "offsetX": -9,
            "frameAddress": 11550
          },
          {
            "frameIndex": 9,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": -11,
            "offsetX": -9,
            "frameAddress": 11554
          },
          {
            "frameIndex": 10,
            "visualFrameId": 15,
            "durationTicks": 1,
            "offsetY": 1,
            "offsetX": -9,
            "frameAddress": 11558
          },
          {
            "frameIndex": 11,
            "visualFrameId": 15,
            "durationTicks": 2,
            "offsetY": 13,
            "offsetX": -9,
            "frameAddress": 11562
          },
          {
            "frameIndex": 12,
            "visualFrameId": 15,
            "durationTicks": 1,
            "offsetY": 25,
            "offsetX": -9,
            "frameAddress": 11566
          }
        ]
      },
      {
        "selector": 25,
        "frameCount": 8,
        "sequenceAddress": 11570,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 9,
            "durationTicks": 3,
            "offsetY": -40,
            "offsetX": -16,
            "frameAddress": 11571
          },
          {
            "frameIndex": 1,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -28,
            "offsetX": -16,
            "frameAddress": 11575
          },
          {
            "frameIndex": 2,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -16,
            "offsetX": -16,
            "frameAddress": 11579
          },
          {
            "frameIndex": 3,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": -4,
            "offsetX": -16,
            "frameAddress": 11583
          },
          {
            "frameIndex": 4,
            "visualFrameId": 9,
            "durationTicks": 2,
            "offsetY": 4,
            "offsetX": -16,
            "frameAddress": 11587
          },
          {
            "frameIndex": 5,
            "visualFrameId": 10,
            "durationTicks": 3,
            "offsetY": 5,
            "offsetX": -16,
            "frameAddress": 11591
          },
          {
            "frameIndex": 6,
            "visualFrameId": 10,
            "durationTicks": 4,
            "offsetY": 2,
            "offsetX": -16,
            "frameAddress": 11595
          },
          {
            "frameIndex": 7,
            "visualFrameId": 10,
            "durationTicks": 60,
            "offsetY": 5,
            "offsetX": -16,
            "frameAddress": 11599
          }
        ]
      },
      {
        "selector": 26,
        "frameCount": 16,
        "sequenceAddress": 11603,
        "frames": [
          {
            "frameIndex": 0,
            "visualFrameId": 16,
            "durationTicks": 3,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 11604
          },
          {
            "frameIndex": 1,
            "visualFrameId": 17,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 2,
            "frameAddress": 11608
          },
          {
            "frameIndex": 2,
            "visualFrameId": 17,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 0,
            "frameAddress": 11612
          },
          {
            "frameIndex": 3,
            "visualFrameId": 17,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 4,
            "frameAddress": 11616
          },
          {
            "frameIndex": 4,
            "visualFrameId": 17,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 12,
            "frameAddress": 11620
          },
          {
            "frameIndex": 5,
            "visualFrameId": 17,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 20,
            "frameAddress": 11624
          },
          {
            "frameIndex": 6,
            "visualFrameId": 17,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 28,
            "frameAddress": 11628
          },
          {
            "frameIndex": 7,
            "visualFrameId": 17,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 36,
            "frameAddress": 11632
          },
          {
            "frameIndex": 8,
            "visualFrameId": 17,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 44,
            "frameAddress": 11636
          },
          {
            "frameIndex": 9,
            "visualFrameId": 17,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 52,
            "frameAddress": 11640
          },
          {
            "frameIndex": 10,
            "visualFrameId": 17,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 60,
            "frameAddress": 11644
          },
          {
            "frameIndex": 11,
            "visualFrameId": 17,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 68,
            "frameAddress": 11648
          },
          {
            "frameIndex": 12,
            "visualFrameId": 17,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 76,
            "frameAddress": 11652
          },
          {
            "frameIndex": 13,
            "visualFrameId": 17,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 84,
            "frameAddress": 11656
          },
          {
            "frameIndex": 14,
            "visualFrameId": 17,
            "durationTicks": 1,
            "offsetY": 0,
            "offsetX": 92,
            "frameAddress": 11660
          },
          {
            "frameIndex": 15,
            "visualFrameId": 17,
            "durationTicks": 2,
            "offsetY": 0,
            "offsetX": 100,
            "frameAddress": 11664
          }
        ]
      }
    ]
  }
];

/** Goku Base (key $05) golden gate: command → pose selector → sequence → frames. */
export interface RomGoldenGateCommand {
  command: string;
  memberSlot: number;
  poseSelector: number;
  descriptorSlot: number;
  animationBank: number;
  resourceBase: number;
  sequence: number;
  fallbackApplied: boolean;
  frameCount: number;
  frames: (RomAnimationCoreFrame & { metaspritePieceCount: number; graphicsBlockCount: number })[];
}

export const GOKU_GOLDEN_GATE_COMMANDS: readonly RomGoldenGateCommand[] = [
  {
    "command": "A",
    "memberSlot": 0,
    "poseSelector": 5,
    "descriptorSlot": 1,
    "animationBank": 97,
    "resourceBase": 18800,
    "sequence": 5,
    "fallbackApplied": false,
    "frameCount": 4,
    "frames": [
      {
        "frameIndex": 0,
        "visualFrameId": 7,
        "durationTicks": 3,
        "offsetY": 0,
        "offsetX": -2,
        "frameAddress": 2521,
        "metaspritePieceCount": 11,
        "graphicsBlockCount": 11
      },
      {
        "frameIndex": 1,
        "visualFrameId": 7,
        "durationTicks": 2,
        "offsetY": 0,
        "offsetX": -4,
        "frameAddress": 2525,
        "metaspritePieceCount": 11,
        "graphicsBlockCount": 11
      },
      {
        "frameIndex": 2,
        "visualFrameId": 7,
        "durationTicks": 4,
        "offsetY": 0,
        "offsetX": -5,
        "frameAddress": 2529,
        "metaspritePieceCount": 11,
        "graphicsBlockCount": 11
      },
      {
        "frameIndex": 3,
        "visualFrameId": 7,
        "durationTicks": 4,
        "offsetY": 0,
        "offsetX": -4,
        "frameAddress": 2533,
        "metaspritePieceCount": 11,
        "graphicsBlockCount": 11
      }
    ]
  },
  {
    "command": "B",
    "memberSlot": 0,
    "poseSelector": 8,
    "descriptorSlot": 2,
    "animationBank": 97,
    "resourceBase": 19464,
    "sequence": 8,
    "fallbackApplied": false,
    "frameCount": 6,
    "frames": [
      {
        "frameIndex": 0,
        "visualFrameId": 1,
        "durationTicks": 2,
        "offsetY": 0,
        "offsetX": -2,
        "frameAddress": 3312,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 1,
        "visualFrameId": 1,
        "durationTicks": 2,
        "offsetY": 0,
        "offsetX": -4,
        "frameAddress": 3316,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 2,
        "visualFrameId": 10,
        "durationTicks": 2,
        "offsetY": 0,
        "offsetX": -12,
        "frameAddress": 3320,
        "metaspritePieceCount": 11,
        "graphicsBlockCount": 11
      },
      {
        "frameIndex": 3,
        "visualFrameId": 10,
        "durationTicks": 6,
        "offsetY": 0,
        "offsetX": -13,
        "frameAddress": 3324,
        "metaspritePieceCount": 11,
        "graphicsBlockCount": 11
      },
      {
        "frameIndex": 4,
        "visualFrameId": 10,
        "durationTicks": 4,
        "offsetY": 0,
        "offsetX": -12,
        "frameAddress": 3328,
        "metaspritePieceCount": 11,
        "graphicsBlockCount": 11
      },
      {
        "frameIndex": 5,
        "visualFrameId": 10,
        "durationTicks": 16,
        "offsetY": 0,
        "offsetX": -11,
        "frameAddress": 3332,
        "metaspritePieceCount": 11,
        "graphicsBlockCount": 11
      }
    ]
  },
  {
    "command": "RIGHT",
    "memberSlot": 0,
    "poseSelector": 11,
    "descriptorSlot": 3,
    "animationBank": 97,
    "resourceBase": 20852,
    "sequence": 11,
    "fallbackApplied": false,
    "frameCount": 7,
    "frames": [
      {
        "frameIndex": 0,
        "visualFrameId": 1,
        "durationTicks": 5,
        "offsetY": 0,
        "offsetX": -3,
        "frameAddress": 4823,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 1,
        "visualFrameId": 1,
        "durationTicks": 2,
        "offsetY": 0,
        "offsetX": -5,
        "frameAddress": 4827,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 2,
        "visualFrameId": 13,
        "durationTicks": 1,
        "offsetY": 0,
        "offsetX": -17,
        "frameAddress": 4831,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 3,
        "visualFrameId": 13,
        "durationTicks": 1,
        "offsetY": 0,
        "offsetX": -21,
        "frameAddress": 4835,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 4,
        "visualFrameId": 13,
        "durationTicks": 2,
        "offsetY": 0,
        "offsetX": -17,
        "frameAddress": 4839,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 5,
        "visualFrameId": 13,
        "durationTicks": 4,
        "offsetY": 0,
        "offsetX": -18,
        "frameAddress": 4843,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 6,
        "visualFrameId": 13,
        "durationTicks": 26,
        "offsetY": 0,
        "offsetX": -17,
        "frameAddress": 4847,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      }
    ]
  },
  {
    "command": "UP",
    "memberSlot": 0,
    "poseSelector": 6,
    "descriptorSlot": 4,
    "animationBank": 97,
    "resourceBase": 22532,
    "sequence": 6,
    "fallbackApplied": false,
    "frameCount": 7,
    "frames": [
      {
        "frameIndex": 0,
        "visualFrameId": 1,
        "durationTicks": 5,
        "offsetY": 0,
        "offsetX": -3,
        "frameAddress": 6350,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 1,
        "visualFrameId": 1,
        "durationTicks": 2,
        "offsetY": 0,
        "offsetX": -5,
        "frameAddress": 6354,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 2,
        "visualFrameId": 8,
        "durationTicks": 1,
        "offsetY": -5,
        "offsetX": -12,
        "frameAddress": 6358,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 3,
        "visualFrameId": 8,
        "durationTicks": 1,
        "offsetY": -8,
        "offsetX": -15,
        "frameAddress": 6362,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 4,
        "visualFrameId": 8,
        "durationTicks": 2,
        "offsetY": -3,
        "offsetX": -9,
        "frameAddress": 6366,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 5,
        "visualFrameId": 8,
        "durationTicks": 4,
        "offsetY": -4,
        "offsetX": -10,
        "frameAddress": 6370,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 6,
        "visualFrameId": 8,
        "durationTicks": 26,
        "offsetY": -3,
        "offsetX": -9,
        "frameAddress": 6374,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      }
    ]
  },
  {
    "command": "DOWN",
    "memberSlot": 0,
    "poseSelector": 9,
    "descriptorSlot": 4,
    "animationBank": 97,
    "resourceBase": 22532,
    "sequence": 9,
    "fallbackApplied": false,
    "frameCount": 9,
    "frames": [
      {
        "frameIndex": 0,
        "visualFrameId": 11,
        "durationTicks": 3,
        "offsetY": 0,
        "offsetX": 0,
        "frameAddress": 6437,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 1,
        "visualFrameId": 11,
        "durationTicks": 2,
        "offsetY": -1,
        "offsetX": 0,
        "frameAddress": 6441,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 2,
        "visualFrameId": 12,
        "durationTicks": 2,
        "offsetY": -3,
        "offsetX": -1,
        "frameAddress": 6445,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 3,
        "visualFrameId": 12,
        "durationTicks": 16,
        "offsetY": -4,
        "offsetX": -1,
        "frameAddress": 6449,
        "metaspritePieceCount": 12,
        "graphicsBlockCount": 12
      },
      {
        "frameIndex": 4,
        "visualFrameId": 13,
        "durationTicks": 2,
        "offsetY": 2,
        "offsetX": -5,
        "frameAddress": 6453,
        "metaspritePieceCount": 10,
        "graphicsBlockCount": 10
      },
      {
        "frameIndex": 5,
        "visualFrameId": 13,
        "durationTicks": 2,
        "offsetY": 6,
        "offsetX": -5,
        "frameAddress": 6457,
        "metaspritePieceCount": 10,
        "graphicsBlockCount": 10
      },
      {
        "frameIndex": 6,
        "visualFrameId": 13,
        "durationTicks": 2,
        "offsetY": 0,
        "offsetX": -5,
        "frameAddress": 6461,
        "metaspritePieceCount": 10,
        "graphicsBlockCount": 10
      },
      {
        "frameIndex": 7,
        "visualFrameId": 13,
        "durationTicks": 4,
        "offsetY": 1,
        "offsetX": -5,
        "frameAddress": 6465,
        "metaspritePieceCount": 10,
        "graphicsBlockCount": 10
      },
      {
        "frameIndex": 8,
        "visualFrameId": 13,
        "durationTicks": 20,
        "offsetY": 0,
        "offsetX": -5,
        "frameAddress": 6469,
        "metaspritePieceCount": 10,
        "graphicsBlockCount": 10
      }
    ]
  }
];
