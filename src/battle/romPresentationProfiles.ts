// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ROM-DERIVED PRESENTATION PROFILES
// ═══════════════════════════════════════════════════════════════════════
// Literal presentation grammar derived from RomActionExecutionDescriptor.
// This layer keeps ROM operations as macros, waits, motions, resources and
// branches. It does not translate them into semantic Pixi poses/timelines.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS, type CardDef } from '../data/cards';
import {
  ROM_ACTION_EXECUTION_DESCRIPTORS,
  romActionExecutionDescriptorForCard,
  type RomActionExecutionDescriptor,
  type RomActionExecutionEvidence,
  type RomActionResultBranch,
} from './romActionExecutionDescriptors';
import {
  PHYSICAL_RESOLUTION_MACROS,
  ROM_BEAM_SETUP_MOTION,
  ROM_RUSH_MOTION,
  beamLaunchProfileForHandler,
  standardAttackProfileFor,
  type RomDiscreteMotion,
} from './engine/rom/romDescriptors';

export type RomPresentationProfileKind =
  | 'NONE'
  | 'STANDARD_DAMAGE'
  | 'BEAM_BASE'
  | 'BEAM_VARIANT'
  | 'PROJECTILE_SCROLL'
  | 'SUPPORT_OR_FIELD_EFFECT'
  | 'DEFENSE_RULE'
  | 'SPECIAL_HANDLER'
  | 'UNKNOWN_HANDLER';

export type RomPresentationStepKind =
  | 'NONE'
  | 'SCENE_LOAD'
  | 'PRESENTATION_MACRO'
  | 'ROM_MOTION'
  | 'START_ANIMATION'
  | 'WAIT'
  | 'WAIT_ANIMATION_FRAME'
  | 'SPAWN_FX'
  | 'AUDIO_SCRIPT'
  | 'SCREEN_MOTION'
  | 'BRANCH_RESULT'
  | 'PENDING_STATIC_DECODE'
  | 'PENDING_ROM_TRACE';

export type RomPresentationCompletionStatic = 'COMPLETE' | 'PARTIAL';
export type RomPresentationCompletionDynamic = 'NOT_REQUIRED' | 'PENDING_ROM_TRACE';

export interface RomAddress {
  bank: number;
  address: number;
  label: string;
}

export interface RomPresentationMotionRef {
  macroId: number;
  macroHex: string;
  kind: 'RUSH' | 'BEAM_SETUP' | 'SCREEN_MOTION';
  motion: RomDiscreteMotion;
}

export interface RomPresentationStep {
  id: string;
  kind: RomPresentationStepKind;
  tick: number | null;
  durationTicks: number | null;
  macroId: number | null;
  macroHex: string | null;
  resource: number | null;
  resourceHex: string | null;
  fxResource: number | null;
  fxResourceHex: string | null;
  palette: number | null;
  paletteHex: string | null;
  frame: number | null;
  sequence?: number;
  slot?: 0 | 1;
  motion: RomPresentationMotionRef | null;
  branchFamily: string | null;
  label: string;
  evidence: RomActionExecutionEvidence;
  source: string;
}

export interface RomPresentationProfile {
  cardId: number;
  cardName: string;
  kind: RomPresentationProfileKind;
  execution: {
    handler: number;
    handlerHex: string;
    worker: RomAddress | null;
    family: RomActionExecutionDescriptor['execution']['workerFamily'];
  };
  dependencies: {
    animationResource: number | null;
    animationResourceHex: string | null;
    fxResource: number | null;
    fxResourceHex: string | null;
    palette: number | null;
    paletteHex: string | null;
  };
  program: RomPresentationStep[];
  resultBranches: RomActionResultBranch[];
  completion: {
    static: RomPresentationCompletionStatic;
    dynamic: RomPresentationCompletionDynamic;
    pending: string[];
  };
  sourceDescriptor: {
    cardId: number;
    handler: number;
    actorResource: number | null;
    fxResource: number | null;
    palette: number | null;
  };
}

export interface RomPresentationProfileSummary {
  cards: number;
  completeStatic: number;
  partialStatic: number;
  dynamicPending: number;
  none: number;
  standardDamage: number;
  beamBase: number;
  beamVariant: number;
  projectileScroll: number;
  supportOrFieldEffect: number;
  defenseRule: number;
  specialHandler: number;
  unknownHandler: number;
  profilesWithBranches: number;
  profilesWithMotion: number;
  byKind: Record<RomPresentationProfileKind, number>;
}

function hex(value: number | null): string | null {
  return value == null ? null : `0x${value.toString(16).padStart(2, '0')}`;
}

function macroHex(value: number): string {
  return `$${value.toString(16).padStart(2, '0').toUpperCase()}`;
}

function workerAddress(workerAddress: string | null): RomAddress | null {
  if (!workerAddress) return null;
  const match = /^Bank([0-9A-Fa-f]+):0x([0-9A-Fa-f]+)$/.exec(workerAddress);
  if (!match) return null;
  return {
    bank: Number.parseInt(match[1], 16),
    address: Number.parseInt(match[2], 16),
    label: workerAddress,
  };
}

function step(input: Omit<RomPresentationStep, 'macroHex' | 'resourceHex' | 'fxResourceHex' | 'paletteHex'>): RomPresentationStep {
  return {
    ...input,
    macroHex: hex(input.macroId),
    resourceHex: hex(input.resource),
    fxResourceHex: hex(input.fxResource),
    paletteHex: hex(input.palette),
  };
}

function sceneLoad(evidence: RomActionExecutionEvidence = 'ROM_HANDLER_VERIFIED'): RomPresentationStep {
  return step({
    id: 'SCENE_LOAD_ACTION',
    kind: 'SCENE_LOAD',
    tick: 0,
    durationTicks: null,
    macroId: null,
    resource: null,
    fxResource: null,
    palette: null,
    frame: null,
    motion: null,
    branchFamily: null,
    label: 'TACTICAL_TO_ACTION scene load / ACTION resources prepared',
    evidence,
    source: 'ActionSceneLoad',
  });
}

function waitStep(id: string, durationTicks: number, label: string, source: string): RomPresentationStep {
  return step({
    id,
    kind: 'WAIT',
    tick: null,
    durationTicks,
    macroId: null,
    resource: null,
    fxResource: null,
    palette: null,
    frame: null,
    motion: null,
    branchFamily: null,
    label,
    evidence: 'ROM_HANDLER_VERIFIED',
    source,
  });
}

function macroStep(id: string, macroId: number, label: string, evidence: RomActionExecutionEvidence = 'ROM_HANDLER_VERIFIED'): RomPresentationStep {
  return step({
    id,
    kind: 'PRESENTATION_MACRO',
    tick: null,
    durationTicks: null,
    macroId,
    resource: null,
    fxResource: null,
    palette: null,
    frame: null,
    motion: null,
    branchFamily: null,
    label: `${macroHex(macroId)} ${label}`,
    evidence,
    source: 'ROM presentation macro',
  });
}

function motionStep(id: string, macroId: number, kind: RomPresentationMotionRef['kind'], motion: RomDiscreteMotion, label: string): RomPresentationStep {
  const durationTicks = motion.segments.reduce((sum, segment) => sum + segment.ticks, 0);
  return step({
    id,
    kind: 'ROM_MOTION',
    tick: null,
    durationTicks,
    macroId,
    resource: null,
    fxResource: null,
    palette: null,
    frame: null,
    motion: { macroId, macroHex: macroHex(macroId), kind, motion },
    branchFamily: null,
    label,
    evidence: 'ROM_HANDLER_VERIFIED',
    source: 'romDescriptors.ts motion constants',
  });
}

function startAnimation(
  descriptor: RomActionExecutionDescriptor,
  sequence?: number,
  slot?: 0 | 1,
): RomPresentationStep | null {
  if (descriptor.actorAnimation.resource == null) return null;
  return step({
    id: 'START_ACTOR_ANIMATION',
    kind: 'START_ANIMATION',
    tick: null,
    durationTicks: null,
    macroId: null,
    resource: descriptor.actorAnimation.resource,
    fxResource: null,
    palette: null,
    frame: null,
    sequence,
    slot,
    motion: null,
    branchFamily: null,
    label: `Start AnimationResource ${descriptor.actorAnimation.resourceHex}${sequence != null ? ` seq ${sequence}` : ''}${slot != null ? ` slot ${slot}` : ''}`,
    evidence: descriptor.actorAnimation.evidence,
    source: 'RomActionExecutionDescriptor.actorAnimation',
  });
}

function waitFrame(frame: number, source: string): RomPresentationStep {
  return step({
    id: `WAIT_ACTOR_FRAME_${frame}`,
    kind: 'WAIT_ANIMATION_FRAME',
    tick: null,
    durationTicks: null,
    macroId: null,
    resource: null,
    fxResource: null,
    palette: null,
    frame,
    motion: null,
    branchFamily: null,
    label: `Wait actor animation frame ${frame}`,
    evidence: 'ROM_HANDLER_VERIFIED',
    source,
  });
}

function spawnFx(descriptor: RomActionExecutionDescriptor): RomPresentationStep | null {
  if (descriptor.visualEffect.resource == null && descriptor.visualEffect.palette == null) return null;
  return step({
    id: 'SPAWN_FX',
    kind: 'SPAWN_FX',
    tick: null,
    durationTicks: null,
    macroId: null,
    resource: null,
    fxResource: descriptor.visualEffect.resource,
    palette: descriptor.visualEffect.palette,
    frame: null,
    motion: null,
    branchFamily: null,
    label: `FX ${descriptor.visualEffect.resourceHex ?? 'none'} / palette ${descriptor.visualEffect.paletteHex ?? 'none'}`,
    evidence: descriptor.visualEffect.evidence,
    source: 'RomActionExecutionDescriptor.visualEffect',
  });
}

function audioScript(scriptId: number | null | undefined): RomPresentationStep | null {
  if (scriptId == null) return null;
  return step({
    id: 'AUDIO_SCRIPT',
    kind: 'AUDIO_SCRIPT',
    tick: null,
    durationTicks: null,
    macroId: null,
    resource: null,
    fxResource: null,
    palette: null,
    frame: null,
    motion: null,
    branchFamily: null,
    label: `ROM audio script ${hex(scriptId)}`,
    evidence: 'ROM_HANDLER_VERIFIED',
    source: 'RomStandardAttackProfile.audioScriptId',
  });
}

function screenMotionStep(id: string, ticks: number, dxPerTick: number, restore: boolean): RomPresentationStep {
  return step({
    id,
    kind: 'SCREEN_MOTION',
    tick: null,
    durationTicks: ticks,
    macroId: null,
    resource: null,
    fxResource: null,
    palette: null,
    frame: null,
    motion: null,
    branchFamily: null,
    label: `SCREEN_MOTION dx/tick=${dxPerTick} ticks=${ticks} restore=${restore}`,
    evidence: 'ROM_HANDLER_VERIFIED',
    source: 'romDescriptors.ts screen motion constants',
  });
}

function branchStep(branchFamily: string, evidence: RomActionExecutionEvidence = 'ROM_HANDLER_VERIFIED'): RomPresentationStep {
  return step({
    id: 'BRANCH_RESULT',
    kind: 'BRANCH_RESULT',
    tick: null,
    durationTicks: null,
    macroId: null,
    resource: null,
    fxResource: null,
    palette: null,
    frame: null,
    motion: null,
    branchFamily,
    label: `Branch result: ${branchFamily}`,
    evidence,
    source: 'ROM result family',
  });
}

function pendingStep(id: string, kind: 'PENDING_STATIC_DECODE' | 'PENDING_ROM_TRACE', label: string, source: string): RomPresentationStep {
  return step({
    id,
    kind,
    tick: null,
    durationTicks: null,
    macroId: null,
    resource: null,
    fxResource: null,
    palette: null,
    frame: null,
    motion: null,
    branchFamily: null,
    label,
    evidence: kind,
    source,
  });
}

function damageBranches(): RomActionResultBranch[] {
  return [
    {
      family: 'HIT',
      condition: 'CA53=0',
      macroId: PHYSICAL_RESOLUTION_MACROS.hit,
      macroHex: hex(PHYSICAL_RESOLUTION_MACROS.hit),
      result: null,
      evidence: 'ROM_HANDLER_VERIFIED',
      source: 'PHYSICAL_RESOLUTION_MACROS',
    },
    {
      family: 'SPECIAL_DEFENSE',
      condition: 'CA53=1',
      macroId: PHYSICAL_RESOLUTION_MACROS.specialDefense,
      macroHex: hex(PHYSICAL_RESOLUTION_MACROS.specialDefense),
      result: null,
      evidence: 'ROM_HANDLER_VERIFIED',
      source: 'PHYSICAL_RESOLUTION_MACROS',
    },
    {
      family: 'MISS',
      condition: 'CA53=2',
      macroId: PHYSICAL_RESOLUTION_MACROS.miss,
      macroHex: hex(PHYSICAL_RESOLUTION_MACROS.miss),
      result: null,
      evidence: 'ROM_HANDLER_VERIFIED',
      source: 'PHYSICAL_RESOLUTION_MACROS',
    },
  ];
}

function completionFor(descriptor: RomActionExecutionDescriptor, program: RomPresentationStep[], branches: RomActionResultBranch[]): RomPresentationProfile['completion'] {
  const pending = [
    ...program.filter(item => item.kind === 'PENDING_STATIC_DECODE' || item.kind === 'PENDING_ROM_TRACE').map(item => item.label),
    ...descriptor.result.pending,
  ];
  const dynamic = program.some(item => item.kind === 'PENDING_ROM_TRACE')
    || descriptor.actorAnimation.completion?.disposition === 'NEEDS_DYNAMIC_TRACE'
    || descriptor.result.evidence === 'PENDING_ROM_TRACE';
  const staticPartial = program.some(item => item.kind === 'PENDING_STATIC_DECODE')
    || descriptor.actorAnimation.evidence === 'PENDING_STATIC_DECODE'
    || descriptor.result.evidence === 'PENDING_STATIC_DECODE'
    || branches.some(branch => branch.evidence === 'PENDING_STATIC_DECODE');
  return {
    static: staticPartial ? 'PARTIAL' : 'COMPLETE',
    dynamic: dynamic ? 'PENDING_ROM_TRACE' : 'NOT_REQUIRED',
    pending,
  };
}

function profileKind(descriptor: RomActionExecutionDescriptor, card: CardDef): RomPresentationProfileKind {
  const handler = descriptor.execution.handler;
  const hasNoPresentationResource = descriptor.actorAnimation.resource == null
    && descriptor.visualEffect.resource == null
    && descriptor.visualEffect.palette == null
    && descriptor.result.family === 'NO_RESULT_BRANCH';
  if (handler === 0x00 && hasNoPresentationResource) return 'NONE';
  if (handler === 0x0a) return 'STANDARD_DAMAGE';
  // GUARDRAIL — support cards may SHARE ROM handler $02/$03/$04 (buff/heal/
  // shield presentation reuse) but are NOT beams. Never route them through the
  // beam bridge: a support card playing a beam movie is a production bug.
  if (handler === 0x02) return card.type === 'support' ? 'SUPPORT_OR_FIELD_EFFECT' : 'BEAM_BASE';
  if ([0x03, 0x04].includes(handler)) return card.type === 'support' ? 'SUPPORT_OR_FIELD_EFFECT' : 'BEAM_VARIANT';
  if ([0x05, 0x06, 0x07].includes(handler)) return 'PROJECTILE_SCROLL';
  if (descriptor.result.family === 'ROM_DEFENSE') return 'DEFENSE_RULE';
  if (descriptor.execution.workerFamily === 'SPECIAL' || descriptor.execution.workerFamily === 'TAIL' || descriptor.execution.workerFamily === 'BUU_BALL' || descriptor.execution.workerFamily === 'MULTI_ACTOR_SCRIPT') return 'SPECIAL_HANDLER';
  if (handler === 0x00 || descriptor.visualEffect.resource != null || descriptor.visualEffect.palette != null) return 'SUPPORT_OR_FIELD_EFFECT';
  if (descriptor.execution.workerFamily === 'UNKNOWN_HANDLER') return 'UNKNOWN_HANDLER';
  return 'NONE';
}

function standardDamageProgram(descriptor: RomActionExecutionDescriptor): RomPresentationStep[] {
  const program = [
    sceneLoad(),
    waitStep('WAIT_PREPARE_20T', 20, 'STANDARD_DAMAGE prepare wait', 'STANDARD_DAMAGE handler grammar'),
    macroStep('MACRO_RUSH_1C', 0x1c, 'physical rush setup'),
    motionStep('ROM_RUSH_MOTION', 0x1c, 'RUSH', ROM_RUSH_MOTION, 'RUSH +98px / 25 ticks, mirrored by side'),
  ];
  const actor = startAnimation(descriptor);
  if (actor) program.push(actor);
  program.push(waitFrame(2, 'STANDARD_DAMAGE handler grammar'));
  const fx = spawnFx(descriptor);
  if (fx) program.push(fx);
  program.push(macroStep('MACRO_RESULT_PREP_2E', 0x2e, 'prepare physical resolution branch'));
  program.push(branchStep('CA53 -> HIT/MISS/SPECIAL_DEFENSE'));
  if (descriptor.actorAnimation.evidence === 'PENDING_STATIC_DECODE') {
    program.push(pendingStep('PENDING_ACTOR_FRAME_STREAM', 'PENDING_STATIC_DECODE', 'actor AnimationResource frame stream still statically closable', 'animationResources.ts'));
  }
  return program;
}

function beamProgram(card: CardDef, descriptor: RomActionExecutionDescriptor): RomPresentationStep[] {
  const standard = standardAttackProfileFor(card);
  // §218-224: $02-$07 comparten el motor Beam ($5776); cada handler promueve
  // su propio LaunchProfile (syncFrame / screen motion / path).
  const launch = beamLaunchProfileForHandler(descriptor.execution.handler);
  const program = [
    sceneLoad(),
    macroStep('MACRO_BEAM_SETUP_1E', 0x1e, 'beam setup pre-adjustment'),
    motionStep('ROM_BEAM_SETUP_MOTION', 0x1e, 'BEAM_SETUP', ROM_BEAM_SETUP_MOTION, 'BEAM_SETUP -27px / 17 ticks, mirrored by side'),
  ];
  const actor = startAnimation(descriptor);
  if (actor) program.push(actor);
  const syncFrame = standard?.launch?.syncFrame ?? launch?.releaseSyncFrame ?? null;
  if (syncFrame != null) {
    program.push(waitFrame(syncFrame, launch ? `BeamLaunchProfile $${descriptor.execution.handlerHex} releaseSyncFrame` : 'RomStandardAttackProfile.launch.syncFrame'));
  } else {
    program.push(pendingStep('PENDING_RELEASE_FRAME', 'PENDING_STATIC_DECODE', 'release/sync frame is not promoted for this beam handler yet', 'standardAttackProfileFor'));
  }
  const fx = spawnFx(descriptor);
  if (fx) program.push(fx);
  const audio = audioScript(standard?.audioScriptId);
  if (audio) program.push(audio);
  if (standard) program.push(waitStep('WAIT_BEAM_HOLD_60T', 60, 'BEAM hold after FX spawn', 'RomStandardAttackProfile'));
  if (descriptor.result.branches.length > 0) program.push(branchStep('STANDARD_ATTACK result'));
  if (descriptor.actorAnimation.evidence === 'PENDING_STATIC_DECODE') {
    program.push(pendingStep('PENDING_BEAM_RESOURCE_DECODE', 'PENDING_STATIC_DECODE', 'beam AnimationResource sequence remains statically closable', 'animationResources.ts'));
  }
  return program;
}

function projectileProgram(descriptor: RomActionExecutionDescriptor): RomPresentationStep[] {
  const program = [sceneLoad()];
  const actor = startAnimation(descriptor);
  if (actor) program.push(actor);
  // §222-224: launch screen-motion / path por handler ($05 screen -6×19t,
  // $06 screen -6×16t, $07 WAIT2→FX→WAIT4→SCREEN_PATH).
  const launch = beamLaunchProfileForHandler(descriptor.execution.handler);
  if (launch?.screenMotion) {
    program.push(screenMotionStep(
      `SCREEN_MOTION_${launch.screenMotion.ticks}T`,
      launch.screenMotion.ticks,
      launch.screenMotion.dxPerTick,
      launch.screenMotion.restore,
    ));
  }
  const fx = spawnFx(descriptor);
  if (fx) program.push(fx);
  if (descriptor.execution.handler === 0x07) {
    program.push(waitStep('WAIT_SPECIAL_PATH_2T', 2, 'SPECIAL_PROJECTILE_PATH wait before FX/path', 'STANDARD_ATTACK_HANDLERS $07'));
    program.push(waitStep('WAIT_SPECIAL_PATH_4T', 4, 'SPECIAL_PROJECTILE_PATH wait after FX', 'STANDARD_ATTACK_HANDLERS $07'));
  }
  program.push(pendingStep('PENDING_PROJECTILE_SEQUENCE_SELECTION', 'PENDING_STATIC_DECODE', 'projectile handler sequence/order is still statically closable', 'animationResources.ts'));
  return program;
}

function supportOrFieldProgram(descriptor: RomActionExecutionDescriptor): RomPresentationStep[] {
  const program: RomPresentationStep[] = [];
  const actor = startAnimation(descriptor);
  if (actor) program.push(actor);
  const fx = spawnFx(descriptor);
  if (fx) program.push(fx);
  if (program.length === 0) {
    program.push(step({
      id: 'NO_ROM_PRESENTATION_PROGRAM',
      kind: 'NONE',
      tick: null,
      durationTicks: null,
      macroId: null,
      resource: null,
      fxResource: null,
      palette: null,
      frame: null,
      motion: null,
      branchFamily: null,
      label: 'No actor/FX presentation resource in the ROM card row',
      evidence: 'ROM_STATIC_VERIFIED',
      source: 'romCardData.ts',
    }));
  }
  if (descriptor.actorAnimation.evidence === 'PENDING_STATIC_DECODE') {
    program.push(pendingStep('PENDING_SUPPORT_SEQUENCE', 'PENDING_STATIC_DECODE', 'support/field actor sequence count or boundaries remain static work', 'animationResources.ts'));
  }
  return program;
}

function defenseProgram(descriptor: RomActionExecutionDescriptor): RomPresentationStep[] {
  const program = supportOrFieldProgram(descriptor).filter(item => item.kind !== 'NONE');
  program.push(branchStep('DEFENSE_ROM_RULE', 'ROM_DEFENSE_RULE_VERIFIED'));
  return program;
}

function specialProgram(descriptor: RomActionExecutionDescriptor): RomPresentationStep[] {
  const program: RomPresentationStep[] = [sceneLoad('ROM_HANDLER_VERIFIED')];
  const binding = descriptor.actorAnimation.sequenceBinding;
  if (binding && binding.phases.length > 0) {
    // Fases físicas demostradas por la SSOT: una START_ANIMATION por fase con
    // su selector de secuencia y slot físicos. NO fabricamos WAITs entre fases:
    // la transición exacta entre estados la gobierna el FSM del handler y
    // sigue siendo territorio dinámico (se refleja en el pending final).
    for (const phase of binding.phases) {
      const anim = startAnimation(descriptor, phase.sequence, phase.slot);
      if (anim) program.push(anim);
    }
  } else {
    const actor = startAnimation(descriptor);
    if (actor) program.push(actor);
  }
  const fx = spawnFx(descriptor);
  if (fx) program.push(fx);
  program.push(pendingStep(
    'PENDING_SPECIAL_RESULT_BRANCH',
    'PENDING_ROM_TRACE',
    'special handler result branch (HIT/MISS/GUARD) and inter-phase state transitions remain dynamic trace territory',
    'SPECIAL_HANDLER_DESCRIPTORS',
  ));
  return program;
}

function unknownProgram(descriptor: RomActionExecutionDescriptor): RomPresentationStep[] {
  return [
    pendingStep(
      'PENDING_HANDLER_GRAMMAR',
      descriptor.execution.workerFamily === 'UNKNOWN_HANDLER' ? 'PENDING_STATIC_DECODE' : 'PENDING_ROM_TRACE',
      'handler presentation grammar is not promoted yet',
      'RomActionExecutionDescriptor',
    ),
  ];
}

export function romPresentationProfileForCard(card: CardDef): RomPresentationProfile {
  const descriptor = romActionExecutionDescriptorForCard(card);
  const kind = profileKind(descriptor, card);
  let program: RomPresentationStep[];
  let branches = descriptor.result.branches;

  switch (kind) {
    case 'STANDARD_DAMAGE':
      program = standardDamageProgram(descriptor);
      branches = damageBranches();
      break;
    case 'BEAM_BASE':
    case 'BEAM_VARIANT':
      program = beamProgram(card, descriptor);
      break;
    case 'PROJECTILE_SCROLL':
      program = projectileProgram(descriptor);
      break;
    case 'DEFENSE_RULE':
      program = defenseProgram(descriptor);
      break;
    case 'SPECIAL_HANDLER':
      program = specialProgram(descriptor);
      break;
    case 'SUPPORT_OR_FIELD_EFFECT':
    case 'NONE':
      program = supportOrFieldProgram(descriptor);
      break;
    case 'UNKNOWN_HANDLER':
    default:
      program = unknownProgram(descriptor);
      break;
  }

  const completion = completionFor(descriptor, program, branches);
  return {
    cardId: descriptor.cardId,
    cardName: descriptor.cardName,
    kind,
    execution: {
      handler: descriptor.execution.handler,
      handlerHex: descriptor.execution.handlerHex,
      worker: workerAddress(descriptor.execution.workerAddress),
      family: descriptor.execution.workerFamily,
    },
    dependencies: {
      animationResource: descriptor.actorAnimation.resource,
      animationResourceHex: descriptor.actorAnimation.resourceHex,
      fxResource: descriptor.visualEffect.resource,
      fxResourceHex: descriptor.visualEffect.resourceHex,
      palette: descriptor.visualEffect.palette,
      paletteHex: descriptor.visualEffect.paletteHex,
    },
    program,
    resultBranches: branches,
    completion,
    sourceDescriptor: {
      cardId: descriptor.cardId,
      handler: descriptor.execution.handler,
      actorResource: descriptor.actorAnimation.resource,
      fxResource: descriptor.visualEffect.resource,
      palette: descriptor.visualEffect.palette,
    },
  };
}

export const ROM_PRESENTATION_PROFILES: RomPresentationProfile[] =
  CARDS.map(romPresentationProfileForCard);

export function romPresentationProfileByCardId(cardId: number): RomPresentationProfile | undefined {
  return ROM_PRESENTATION_PROFILES.find(profile => profile.cardId === cardId);
}

export function romPresentationProfileSummary(): RomPresentationProfileSummary {
  const byKind: Record<RomPresentationProfileKind, number> = {
    NONE: 0,
    STANDARD_DAMAGE: 0,
    BEAM_BASE: 0,
    BEAM_VARIANT: 0,
    PROJECTILE_SCROLL: 0,
    SUPPORT_OR_FIELD_EFFECT: 0,
    DEFENSE_RULE: 0,
    SPECIAL_HANDLER: 0,
    UNKNOWN_HANDLER: 0,
  };
  for (const profile of ROM_PRESENTATION_PROFILES) byKind[profile.kind]++;

  return {
    cards: ROM_PRESENTATION_PROFILES.length,
    completeStatic: ROM_PRESENTATION_PROFILES.filter(profile => profile.completion.static === 'COMPLETE').length,
    partialStatic: ROM_PRESENTATION_PROFILES.filter(profile => profile.completion.static === 'PARTIAL').length,
    dynamicPending: ROM_PRESENTATION_PROFILES.filter(profile => profile.completion.dynamic === 'PENDING_ROM_TRACE').length,
    none: byKind.NONE,
    standardDamage: byKind.STANDARD_DAMAGE,
    beamBase: byKind.BEAM_BASE,
    beamVariant: byKind.BEAM_VARIANT,
    projectileScroll: byKind.PROJECTILE_SCROLL,
    supportOrFieldEffect: byKind.SUPPORT_OR_FIELD_EFFECT,
    defenseRule: byKind.DEFENSE_RULE,
    specialHandler: byKind.SPECIAL_HANDLER,
    unknownHandler: byKind.UNKNOWN_HANDLER,
    profilesWithBranches: ROM_PRESENTATION_PROFILES.filter(profile => profile.resultBranches.length > 0).length,
    profilesWithMotion: ROM_PRESENTATION_PROFILES.filter(profile => profile.program.some(step => step.kind === 'ROM_MOTION' || step.kind === 'SCREEN_MOTION')).length,
    byKind,
  };
}

export const _romPresentationProfileInternals = {
  damageBranches,
  profileKind,
  completionFor,
  actionDescriptorCount: ROM_ACTION_EXECUTION_DESCRIPTORS.length,
};
