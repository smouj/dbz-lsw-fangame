// ═══════════════════════════════════════════════════════════════
// DBZ LSW — Secuencias Stage Attack (ROM-backed)
// ═══════════════════════════════════════════════════════════════
// P0.4S — SUSTITUYE el pool manual (24 secuencias hand-authored + round-robin)
// por la tabla extraída del ROM (Bank01:$7C47):
//   variant = ($C231 sample) & $07
//   index   = (level - 1) * 8 + variant
// donde level = hit count − 2 (3/4/5/6 Stage → ROM level 1/2/3/4).
//
// El ROM NO sortea la secuencia: mantiene un contador cíclico 0..99
// ($C231), lo copia a $CA5D al aceptar la acción y usa $CA5D & $07.
// Un input Stage NO posee una pose semántica directa: posee un comando ROM
// ($01/$04/$08/$10/$20) que el consumer Bank00:$3833 traduce a animación.
//
// LEFT ($02) NO forma parte del conjunto Stage activo ($3D).
// ═══════════════════════════════════════════════════════════════

import {
  ROM_STAGE_COMMAND_ANIMATIONS,
  ROM_STAGE_COMMAND_PROGRAMS,
  ROM_STAGE_PHYSICAL_COMMANDS,
  ROM_STAGE_QTE_RUNTIME,
  ROM_STAGE_AB_WINDOW,
  ROM_STAGE_SEQUENCES,
  ROM_STAGE_VM_CONTRACT,
  type RomStageCommand,
  type RomStageVmProgram,
} from '../data/generated/romStage.generated';
import type { StageKey } from './stageInputMap';

export type StageLevel = 3 | 4 | 5 | 6;

/** Nivel ROM (1..4) correspondiente a un hit count (3/4/5/6). */
function romLevelFor(stageLevel: StageLevel): number {
  return stageLevel - 2;
}

/** Variante Stage desde el contador cíclico $C231 muestreado ($CA5D & $07).
 *  `tick` = tick GBC en que se confirma la acción. Proxy fiel: $C231 es un
 *  contador 0..99 que avanza una vez por frame, en fase con el tick. */
export function stageVariantFromTick(tick: number): number {
  return (tick % 100) & 7;
}

/** Secuencia ROM para un hit count (3/4/5/6) + variante (0..7). */
export function romStageSequenceFor(stageLevel: StageLevel, variant: number): StageKey[] {
  const romLevel = romLevelFor(stageLevel);
  const v = variant & 7;
  const seq = ROM_STAGE_SEQUENCES.find((s) => s.level === romLevel && s.variant === v);
  return (seq?.commands ?? (['A', 'B', 'A'] as RomStageCommand[])) as StageKey[];
}

/** Comandos ROM (5 válidos) para un nivel — para debug/UI. */
export function romStageCommandsFor(stageLevel: StageLevel): StageKey[][] {
  const romLevel = romLevelFor(stageLevel);
  return ROM_STAGE_SEQUENCES
    .filter((s) => s.level === romLevel)
    .map((s) => [...s.commands] as StageKey[]);
}

// ═══ legacy (main.tsx shadow slice) — contador determinista 0..99 ═══
// El slice legacy no tiene tick del Engine; modela $C231 con un contador
// de módulo 0..99 (misma cadencia). No es round-robin sobre un pool.
const legacyRollCounter: Record<StageLevel, number> = { 3: 0, 4: 0, 5: 0, 6: 0 };

export function nextStageSequence(level: StageLevel): StageKey[] {
  const roll = legacyRollCounter[level];
  legacyRollCounter[level] = (roll + 1) % 100;
  return romStageSequenceFor(level, roll & 7);
}

export function resetStageRotation(level?: StageLevel): void {
  if (level) legacyRollCounter[level] = 0;
  else for (const k of Object.keys(legacyRollCounter) as unknown as StageLevel[]) legacyRollCounter[k] = 0;
}

/** Pool completo de un nivel (8 variantes ROM) para debugging/UI. */
export function stageSequencePoolFor(level: StageLevel): StageKey[][] {
  return romStageCommandsFor(level);
}

export {
  ROM_STAGE_VM_CONTRACT,
  ROM_STAGE_COMMAND_PROGRAMS,
  ROM_STAGE_PHYSICAL_COMMANDS,
  ROM_STAGE_QTE_RUNTIME,
  ROM_STAGE_AB_WINDOW,
};

export interface RomStageProgramPair {
  command: StageKey;
  actor0ProgramId: number;
  actor1ProgramId: number;
  actor0: RomStageVmProgram;
  actor1: RomStageVmProgram;
}

/** Microprogramas ROM que debe ejecutar una tecla Stage para ambos participantes. */
export function romStageProgramPairForCommand(command: StageKey): RomStageProgramPair {
  const ids = ROM_STAGE_COMMAND_ANIMATIONS[command];
  const actor0 = ROM_STAGE_COMMAND_PROGRAMS.find((p) => p.animationId === ids.memberSlot0);
  const actor1 = ROM_STAGE_COMMAND_PROGRAMS.find((p) => p.animationId === ids.memberSlot1);
  if (!actor0 || !actor1) throw new Error(`Missing ROM Stage VM program for ${command}`);
  return {
    command,
    actor0ProgramId: ids.memberSlot0,
    actor1ProgramId: ids.memberSlot1,
    actor0,
    actor1,
  };
}
