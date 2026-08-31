// AUTO-GENERATED TARGET CONTRACT — DO NOT HAND-CLAIM ROM TEXT HERE.
//
// The Story VM, Story directory and $10 PRINT_LITERAL_TEXT opcode are already
// statically verified in storyRom.ts. What is not yet persisted in the repo is
// the full per-Story literal-text stream with PC/speaker/portrait/scene bindings.
// A future extractor writes this module. Runtime code may consume entries only
// when evidence === 'ROM_LITERAL_TEXT'.

export interface RomStoryDialogueBeat {
  romStoryId: number;
  beatIndex: number;
  /** Bank-local program counter of the $10 text opcode / owning beat. */
  pc: number;
  speakerId: number | null;
  portraitId: number | null;
  sceneResource: { bank: number; index: number } | null;
  textBytes: readonly number[];
  text: string;
  evidence: 'ROM_LITERAL_TEXT';
}

/** Keyed by physical ROM Story id (1..30, 33, 34). */
export const ROM_STORY_DIALOGUE: Readonly<Record<number, readonly RomStoryDialogueBeat[]>> = Object.freeze({});

export const ROM_STORY_DIALOGUE_GENERATION = {
  status: 'PENDING_LITERAL_CORPUS',
  authority: 'storyRom.ts / $10 PRINT_LITERAL_TEXT',
  requiredFields: ['romStoryId', 'pc', 'speakerId', 'portraitId', 'sceneResource', 'textBytes', 'text'] as const,
  mapRuntimeIncluded: false,
} as const;
