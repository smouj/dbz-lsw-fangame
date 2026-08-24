// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ROM ACTION EXECUTION DESCRIPTORS
// ═══════════════════════════════════════════════════════════════════════
// 125/125 action descriptors derived from the ROM card row and the current
// canonical resource catalogs. This module does not duplicate physical frame
// streams and does not invent presentation semantics, anchors or coordinates.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS, type CardDef } from '../data/cards';
import { romCardData, type RomCardData } from '../data/romCardData';
import { animationResourceById, type AnimationResourceCatalogEntry } from './animationResources';
import { animationTaxonomyForCard, type ExecutionFamily, type TaxonomyEvidence } from './animationTaxonomy';
import { cardPhysicalCoverageForCard, type CardPhysicalCoverageStatus } from './cardPhysicalCoverage';
import { physicalResourceById, type PhysicalMappingSummary, type StaticResourceGapCause } from './physicalFrameReconciliation';
import {
  DEFENSE_ROM_RULES,
  PHYSICAL_RESOLUTION_MACROS,
  SPECIAL_HANDLER_DESCRIPTORS,
  STANDARD_ATTACK_HANDLERS,
  specialHandlerForCard,
  standardAttackProfileFor,
  type RomActionHandlerDescriptor,
  type RomDefenseResult,
  type RomStandardAttackProfile,
} from './engine/rom/romDescriptors';

const NONE = 0xff;

export type RomActionExecutionEvidence =
  | 'ROM_STATIC_VERIFIED'
  | 'ROM_SEQUENCE_VERIFIED'
  | 'ROM_HANDLER_VERIFIED'
  | 'ROM_DEFENSE_RULE_VERIFIED'
  | 'PENDING_STATIC_DECODE'
  | 'PENDING_ROM_TRACE';

export type RomActionResultFamily =
  | 'NO_RESULT_BRANCH'
  | 'STANDARD_ATTACK'
  | 'ROM_DEFENSE'
  | 'SPECIAL_HANDLER'
  | 'HANDLER_UNPROVEN';

export type RomActionResultBranchFamily =
  | 'HIT'
  | 'MISS'
  | 'HIGH_POWER_HIT'
  | 'HIGH_POWER_MISS'
  | 'SPECIAL_DEFENSE'
  | 'DEFENSE_RESULT';

export interface RomActionResultBranch {
  family: RomActionResultBranchFamily;
  condition: string;
  macroId: number | null;
  macroHex: string | null;
  result: RomDefenseResult | null;
  evidence: RomActionExecutionEvidence;
  source: string;
}

export interface RomActionExecutionStep {
  id: string;
  label: string;
  evidence: RomActionExecutionEvidence;
  source: string;
}

export interface RomActionExecutionDescriptor {
  cardId: number;
  cardName: string;
  cardType: CardDef['type'];
  rom: RomCardData;
  execution: {
    handler: number;
    handlerHex: string;
    family: ExecutionFamily;
    workerAddress: string | null;
    workerFamily: RomActionHandlerDescriptor['family'] | 'STANDARD_ATTACK' | 'NO_ACTION_HANDLER' | 'UNKNOWN_HANDLER';
    variant: string | null;
    evidence: TaxonomyEvidence;
  };
  actorAnimation: {
    resource: number | null;
    resourceHex: string | null;
    resourceStatus: AnimationResourceCatalogEntry['status'] | 'NO_ROM_ANIMATION' | 'MISSING';
    completion: AnimationResourceCatalogEntry['completion'] | null;
    sequenceSource: {
      module: 'animationResources.ts';
      resourceId: number | null;
      sequenceCount: number;
      physicalFrameCount: number;
      totalTicks: number;
      sourceTechnique: string | null;
    } | null;
    physicalMapping: {
      status: CardPhysicalCoverageStatus;
      gapCause: StaticResourceGapCause | 'NO_ROM_ANIMATION';
      summary: PhysicalMappingSummary | null;
    };
    evidence: RomActionExecutionEvidence;
  };
  visualEffect: {
    resource: number | null;
    resourceHex: string | null;
    palette: number | null;
    paletteHex: string | null;
    evidence: RomActionExecutionEvidence;
  };
  result: {
    family: RomActionResultFamily;
    branches: RomActionResultBranch[];
    pending: string[];
    evidence: RomActionExecutionEvidence;
  };
  handlerScript: {
    source: string;
    steps: RomActionExecutionStep[];
  };
  evidence: string[];
}

export interface RomActionExecutionSummary {
  cards: number;
  withActorAnimation: number;
  withFx: number;
  withPalette: number;
  standardAttackProfiles: number;
  defenseRules: number;
  specialHandlers: number;
  descriptorsWithBranches: number;
  pendingStaticDecode: number;
  needsDynamicTrace: number;
  missingResources: number;
  byResultFamily: Record<RomActionResultFamily, number>;
}

function hex(value: number | null): string | null {
  return value == null ? null : `0x${value.toString(16).padStart(2, '0')}`;
}

function bankAddress(bank: number, address: number): string {
  return `Bank${bank}:0x${address.toString(16).toUpperCase()}`;
}

function resourceId(value: number): number | null {
  return value === NONE ? null : value;
}

function standardWorker(handler: number): string | null {
  const address = STANDARD_ATTACK_HANDLERS[handler];
  return address == null ? null : bankAddress(3, address);
}

function workerFamily(handler: number, special: RomActionHandlerDescriptor | null): RomActionExecutionDescriptor['execution']['workerFamily'] {
  if (special) return special.family;
  if (handler === 0x00) return 'NO_ACTION_HANDLER';
  if (STANDARD_ATTACK_HANDLERS[handler] != null) return 'STANDARD_ATTACK';
  return 'UNKNOWN_HANDLER';
}

function branch(
  family: RomActionResultBranchFamily,
  condition: string,
  macroId: number | null,
  source: string,
  result: RomDefenseResult | null = null,
): RomActionResultBranch {
  return {
    family,
    condition,
    macroId,
    macroHex: hex(macroId),
    result,
    evidence: result ? 'ROM_DEFENSE_RULE_VERIFIED' : 'ROM_HANDLER_VERIFIED',
    source,
  };
}

function resultBranches(
  card: CardDef,
  standard: RomStandardAttackProfile | null,
): RomActionExecutionDescriptor['result'] {
  const defense = DEFENSE_ROM_RULES[card.id];
  if (defense) {
    return {
      family: 'ROM_DEFENSE',
      branches: [branch('DEFENSE_RESULT', `CA83=${hex(defense.ca83)} -> CA53=${defense.resultFamily}`, null, 'DEFENSE_ROM_RULES', defense.result)],
      pending: [],
      evidence: 'ROM_DEFENSE_RULE_VERIFIED',
    };
  }

  if (standard) {
    const branches: RomActionResultBranch[] = [];
    if (standard.resolution.normalHitMacro != null) {
      branches.push(branch('HIT', 'normal power hit result', standard.resolution.normalHitMacro, 'standardAttackProfileFor'));
    }
    if (standard.resolution.normalMissMacro != null) {
      branches.push(branch('MISS', 'normal power miss result', standard.resolution.normalMissMacro, 'standardAttackProfileFor'));
    }
    if (standard.resolution.highPowerHitMacro != null) {
      branches.push(branch('HIGH_POWER_HIT', 'CA54 high-power hit result', standard.resolution.highPowerHitMacro, 'standardAttackProfileFor'));
    }
    if (standard.resolution.highPowerMissMacro != null) {
      branches.push(branch('HIGH_POWER_MISS', 'CA54 high-power miss result', standard.resolution.highPowerMissMacro, 'standardAttackProfileFor'));
    }
    if (standard.resolution.specialDefenseMacro != null) {
      branches.push(branch('SPECIAL_DEFENSE', 'special defense result', standard.resolution.specialDefenseMacro, 'standardAttackProfileFor'));
    }
    return {
      family: 'STANDARD_ATTACK',
      branches,
      pending: branches.length === 0 ? ['result branch macros not promoted for this standard attack profile'] : [],
      evidence: 'ROM_HANDLER_VERIFIED',
    };
  }

  const special = specialHandlerForCard(card);
  if (special) {
    return {
      family: 'SPECIAL_HANDLER',
      branches: [],
      pending: ['handler-specific result branch requires runtime/FSM evidence'],
      evidence: 'PENDING_ROM_TRACE',
    };
  }

  if (card.type === 'damage' || card.type === 'beam') {
    return {
      family: 'HANDLER_UNPROVEN',
      branches: [],
      pending: ['per-card standard result macros not promoted yet'],
      evidence: 'PENDING_STATIC_DECODE',
    };
  }

  return {
    family: 'NO_RESULT_BRANCH',
    branches: [],
    pending: [],
    evidence: 'ROM_STATIC_VERIFIED',
  };
}

function handlerSteps(
  rom: RomCardData,
  resource: AnimationResourceCatalogEntry | undefined,
  standard: RomStandardAttackProfile | null,
  special: RomActionHandlerDescriptor | null,
): RomActionExecutionStep[] {
  const steps: RomActionExecutionStep[] = [
    {
      id: 'ROM_CARD_RECORD',
      label: `handler ${hex(rom.exec)} · actor ${hex(resourceId(rom.actorAnim)) ?? 'none'} · FX ${hex(resourceId(rom.fxGraphics)) ?? 'none'} · palette ${hex(resourceId(rom.fxPalette)) ?? 'none'}`,
      evidence: 'ROM_STATIC_VERIFIED',
      source: 'romCardData.ts',
    },
  ];

  if (resource) {
    steps.push({
      id: 'LOAD_ACTOR_RESOURCE',
      label: `${resource.resourceHex} ${resource.status} · ${resource.completion.disposition}`,
      evidence: resource.status === 'DECODED' ? 'ROM_SEQUENCE_VERIFIED' : resource.status === 'SPECIAL' ? 'PENDING_ROM_TRACE' : 'PENDING_STATIC_DECODE',
      source: 'animationResources.ts',
    });
  } else if (rom.actorAnim !== NONE) {
    steps.push({
      id: 'LOAD_ACTOR_RESOURCE_MISSING',
      label: `${hex(rom.actorAnim)} missing from animation resource catalog`,
      evidence: 'PENDING_STATIC_DECODE',
      source: 'animationResources.ts',
    });
  }

  if (rom.fxGraphics !== NONE || rom.fxPalette !== NONE) {
    steps.push({
      id: 'LOAD_VISUAL_EFFECT',
      label: `FX ${hex(resourceId(rom.fxGraphics)) ?? 'none'} · palette ${hex(resourceId(rom.fxPalette)) ?? 'none'}`,
      evidence: 'ROM_STATIC_VERIFIED',
      source: 'romCardData.ts',
    });
  }

  if (standard) {
    steps.push({
      id: 'STANDARD_ATTACK_PROFILE',
      label: `syncFrame ${standard.launch?.syncFrame ?? 'none'} · physical hit/miss macros ${hex(PHYSICAL_RESOLUTION_MACROS.hit)}/${hex(PHYSICAL_RESOLUTION_MACROS.miss)}`,
      evidence: 'ROM_HANDLER_VERIFIED',
      source: 'standardAttackProfileFor',
    });
  } else if (STANDARD_ATTACK_HANDLERS[rom.exec] != null) {
    steps.push({
      id: 'STANDARD_ATTACK_HANDLER',
      label: `${standardWorker(rom.exec)} · per-card profile not promoted yet`,
      evidence: 'PENDING_STATIC_DECODE',
      source: 'STANDARD_ATTACK_HANDLERS',
    });
  }

  if (special) {
    steps.push({
      id: 'SPECIAL_HANDLER_BOUNDARY',
      label: `${special.family}${special.variant ? `/${special.variant}` : ''} · ${bankAddress(special.worker.bank, special.worker.address)}`,
      evidence: 'PENDING_ROM_TRACE',
      source: 'SPECIAL_HANDLER_DESCRIPTORS',
    });
  }

  if (resource?.completion.dynamicDependencies.length) {
    steps.push({
      id: 'DYNAMIC_DEPENDENCIES',
      label: resource.completion.dynamicDependencies.join(' · '),
      evidence: 'PENDING_ROM_TRACE',
      source: 'animationResources.ts completion',
    });
  }

  return steps;
}

export function romActionExecutionDescriptorForCard(card: CardDef): RomActionExecutionDescriptor {
  const rom = romCardData(card.name);
  if (!rom) throw new Error(`Missing ROM card data for ${card.id}:${card.name}`);

  const taxonomy = animationTaxonomyForCard(card);
  const actorResourceId = resourceId(rom.actorAnim);
  const fxResourceId = resourceId(rom.fxGraphics);
  const paletteId = resourceId(rom.fxPalette);
  const resource = actorResourceId == null ? undefined : animationResourceById(actorResourceId);
  const physical = actorResourceId == null ? undefined : physicalResourceById(actorResourceId);
  const coverage = cardPhysicalCoverageForCard(card);
  const standard = standardAttackProfileFor(card);
  const special = specialHandlerForCard(card) ?? SPECIAL_HANDLER_DESCRIPTORS[rom.exec] ?? null;
  const result = resultBranches(card, standard);

  return {
    cardId: card.id,
    cardName: card.name,
    cardType: card.type,
    rom,
    execution: {
      handler: rom.exec,
      handlerHex: hex(rom.exec) ?? '0x00',
      family: taxonomy.execution.family,
      workerAddress: special ? bankAddress(special.worker.bank, special.worker.address) : standardWorker(rom.exec),
      workerFamily: workerFamily(rom.exec, special),
      variant: special?.variant ?? taxonomy.execution.variant,
      evidence: special ? 'ROM_HANDLER_VERIFIED' : taxonomy.execution.evidence,
    },
    actorAnimation: {
      resource: actorResourceId,
      resourceHex: hex(actorResourceId),
      resourceStatus: resource?.status ?? (actorResourceId == null ? 'NO_ROM_ANIMATION' : 'MISSING'),
      completion: resource?.completion ?? null,
      sequenceSource: resource
        ? {
          module: 'animationResources.ts',
          resourceId: resource.resourceId,
          sequenceCount: resource.sequenceCount,
          physicalFrameCount: resource.physicalFrameCount,
          totalTicks: resource.totalTicks,
          sourceTechnique: resource.sourceTechnique,
        }
        : null,
      physicalMapping: {
        status: coverage.physicalStatus,
        gapCause: coverage.gapCause,
        summary: physical?.summary ?? null,
      },
      evidence: resource?.status === 'DECODED'
        ? 'ROM_SEQUENCE_VERIFIED'
        : resource?.status === 'SPECIAL'
          ? 'PENDING_ROM_TRACE'
          : actorResourceId == null
            ? 'ROM_STATIC_VERIFIED'
            : 'PENDING_STATIC_DECODE',
    },
    visualEffect: {
      resource: fxResourceId,
      resourceHex: hex(fxResourceId),
      palette: paletteId,
      paletteHex: hex(paletteId),
      evidence: fxResourceId == null && paletteId == null ? 'ROM_STATIC_VERIFIED' : 'ROM_STATIC_VERIFIED',
    },
    result,
    handlerScript: {
      source: 'romCardData + romDescriptors + animationResources',
      steps: handlerSteps(rom, resource, standard, special),
    },
    evidence: [
      'romCardData.ts',
      'animationResources.ts',
      'physicalFrameReconciliation.ts',
      standard ? 'standardAttackProfileFor' : '',
      special ? 'SPECIAL_HANDLER_DESCRIPTORS' : '',
      DEFENSE_ROM_RULES[card.id] ? 'DEFENSE_ROM_RULES' : '',
    ].filter(Boolean),
  };
}

export const ROM_ACTION_EXECUTION_DESCRIPTORS: RomActionExecutionDescriptor[] =
  CARDS.map(romActionExecutionDescriptorForCard);

export function romActionExecutionDescriptorByCardId(cardId: number): RomActionExecutionDescriptor | undefined {
  return ROM_ACTION_EXECUTION_DESCRIPTORS.find(descriptor => descriptor.cardId === cardId);
}

export function romActionExecutionSummary(): RomActionExecutionSummary {
  const byResultFamily: Record<RomActionResultFamily, number> = {
    NO_RESULT_BRANCH: 0,
    STANDARD_ATTACK: 0,
    ROM_DEFENSE: 0,
    SPECIAL_HANDLER: 0,
    HANDLER_UNPROVEN: 0,
  };

  let withActorAnimation = 0;
  let withFx = 0;
  let withPalette = 0;
  let standardAttackProfiles = 0;
  let defenseRules = 0;
  let specialHandlers = 0;
  let descriptorsWithBranches = 0;
  let pendingStaticDecode = 0;
  let needsDynamicTrace = 0;
  let missingResources = 0;

  for (const descriptor of ROM_ACTION_EXECUTION_DESCRIPTORS) {
    byResultFamily[descriptor.result.family]++;
    if (descriptor.actorAnimation.resource != null) withActorAnimation++;
    if (descriptor.visualEffect.resource != null) withFx++;
    if (descriptor.visualEffect.palette != null) withPalette++;
    if (descriptor.result.family === 'STANDARD_ATTACK') standardAttackProfiles++;
    if (descriptor.result.family === 'ROM_DEFENSE') defenseRules++;
    if (descriptor.result.family === 'SPECIAL_HANDLER') specialHandlers++;
    if (descriptor.result.branches.length > 0) descriptorsWithBranches++;
    if (descriptor.actorAnimation.evidence === 'PENDING_STATIC_DECODE' || descriptor.result.evidence === 'PENDING_STATIC_DECODE') pendingStaticDecode++;
    if (
      descriptor.actorAnimation.evidence === 'PENDING_ROM_TRACE'
      || descriptor.result.evidence === 'PENDING_ROM_TRACE'
      || descriptor.handlerScript.steps.some(step => step.evidence === 'PENDING_ROM_TRACE')
    ) needsDynamicTrace++;
    if (descriptor.actorAnimation.resourceStatus === 'MISSING') missingResources++;
  }

  return {
    cards: ROM_ACTION_EXECUTION_DESCRIPTORS.length,
    withActorAnimation,
    withFx,
    withPalette,
    standardAttackProfiles,
    defenseRules,
    specialHandlers,
    descriptorsWithBranches,
    pendingStaticDecode,
    needsDynamicTrace,
    missingResources,
    byResultFamily,
  };
}
