// ═══════════════════════════════════════════════════════════
// DEV STUDIO — devSnapshot: FUENTE COMÚN de métricas de producción.
// DEV-SYNC — Dashboard · Validation · GameConfig · Characters
// consumen ESTE agregado. Es imposible que una página diga 42 formas
// y otra 48: todas derivan de los mismos registros.
// 0 gameplay · 0 estado de batalla · solo lectura de registros reales.
// ═══════════════════════════════════════════════════════════
import { FORMS, CHARACTERS } from '../data/roster';
import { CARDS } from '../data/cards';
import { STORY_ENEMY_DECKS, TEAM_BATTLES } from '../data/enemy_decks';
import { SCENARIOS } from '../data/scenarios';
import { spriteDirFor } from '../data/spriteManifest';
import { SPRITE_COUNTS, SPRITE_TOTAL_FRAMES } from '../data/generated/spriteCounts.generated';
import { SFX_CATALOG } from '../data/generated/sfxCatalog.generated';
import { ACTION_FIDELITY_REGISTRY, FidelityLevel } from '../data/actionFidelity';
import { GBC_CINEMATIC_CANON, GBC_CINEMATIC_FAMILIES, isGbcCanon } from '../battle/cinematic/GbcCinematicCanon';
import { listActionProfiles } from '../battle/actionProfiles';
import { listAnimationCanon } from '../battle/animationCanon';
import { COMBAT_POSE_ORDER } from '../battle/spriteConfig';
import { MUSIC_TRACK_LIST } from '../audio/music';
import { resolveSpeakerPortrait } from '../data/speakerPortraits';
import { romPresentationProfileForCard } from '../battle/romPresentationProfiles';
import { romPresentationTimelineForCard } from '../battle/romPresentationForCard';
import { ProductionRomPresentationAdapter } from '../renderer/pixi/presentation/ProductionRomPresentationAdapter';
import type { BattlePresentation, BattleScene } from '../renderer/pixi/presentation/BattlePresentation';
import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../data/generated/romPhysicalCorpus.generated';
import { ROM_FX_CORPUS_SUMMARY } from '../data/generated/romFxCorpus.generated';
import { productionFrameResolverSummary } from '../battle/productionFrameResolver';
import { romFxWindowRuntimeSummary } from '../battle/romFxWindow';
import runtimeCutover from '../../generated/rom-fx/runtime_cutover.json';

export interface DevSnapshot {
  roster: { forms: number; formsTotal: number; characters: number; withSpriteDir: number; withoutSpriteDir: string[] };
  cards: { count: number; total: number; byType: Record<string, number>; stageLevels: number[] };
  sprites: { canonFrames: number; byStatus: Record<string, number>; unknown: number; runtimePoseCount: number; poseOrder: number };
  cinematics: {
    gbcFamilies: number; gbcVerified: number; gbcInferred: number;
    actionProfiles: number; animationCanonFamilies: number;
    fidelityByLevel: { level: string; count: number }[]; fidelityTotal: number;
  };
  story: { chapters: number; teamBattles: number; portraitsResolved: number };
  audio: { musicTracks: number; sfx: number };
  scenarios: number;
  /** C1.0 §8 — producción real: ¿los cues ROM gobiernan Pixi o cae a LEGACY? */
  production: {
    romDataAvailable: number;
    romCuesGenerated: number;
    romCuesConsumed: number;
    romVisible: number;
    legacyVisible: number;
    romBackedStrict: number;
    romPhysicalFrames: number;
    romPhysicalRendered: number;
    manifestFallbackRendered: number;
    unresolvedRendered: number;
    mixed: number;
  };
  physicalCorpus: {
    phase: string;
    schemaVersion: number;
    offsetEncoding: string;
    source: string;
    formsRendered: number;
    formsIndexed: number;
    formsPaletteBlocked: number;
    formsResourceBlocked: number;
    resourcesTotal: number;
    resourcesReachable: number;
    resourcesRendered: number;
    resourcesRendererPending: number;
    resourcesFrameStreamOnly: number;
    resourcesHandlerDependent: number;
    resourcesDynamicPending: number;
    resourcesUnreferenced: number;
    physicalIdentities: number;
    frameInstances: number;
    transparentFrameRecords: number;
    transparentPhysicalIds: number;
    signedNegativeInstances: number;
    resourceProfileBlockedPairs: number;
    maxWidth: number;
    maxHeight: number;
    staleUnsigned: number;
    productionManifestCutover: boolean;
  };
  fxCorpus: {
    phase: string;
    source: string;
    fxResourcesTotalNonFF: number;
    offensiveFxResources: number;
    normalOffensiveBundles: number;
    paletteBundles: number;
    sideMapsByResource: number;
    sidePhaseRenders: number;
    consumingCards: number;
    errors: number;
    supportOrCategorySpecificResources: number;
    runtimeCutover: string;
    runtimeCards: number;
    runtimeWindowCues: number;
    runtimeDistributionErrors: number;
    runtimeSideSelectionComplete: number;
    runtimeSideSelectionPending: number;
    runtimeStaticComplete: number;
    runtimeDynamicComplete: number;
    runtimeWindowComplete: number;
    runtimeWindowPartial: number;
    runtimeSilentFallback: number;
    supportVisuals: string;
    supportAuraBlue: string;
    gatherPowerAuraOrange: string;
  };
  physicalMapping: ReturnType<typeof productionFrameResolverSummary>;
}

/** Agregado único de métricas (DEV-SYNC) — todas las páginas lo consumen. */
export function getDevProjectSnapshot(): DevSnapshot {
  // C1.0 §8 — producción real: el MISMO ProductionRomPresentationAdapter que
  // main.tsx usa en Pixi, ejecutado headless sobre cada carta (proxy de
  // "¿esta carta gobierna Pixi por ROM o cae a LEGACY?").
  const production = computeProductionMetrics();

  const forms = Object.values(FORMS);
  const withSpriteDir = forms.filter(f => spriteDirFor(f.id)).length;

  // Sprites: contar los frames REALES de los manifests en disco (fuente:
  // public/assets/sprites/<dir>/manifest.json — oxigenado desde OUT_frames).
  const canonFrames = SPRITE_TOTAL_FRAMES;
  const byStatus: Record<string, number> = {};
  for (const f of forms) {
    const dir = spriteDirFor(f.id);
    if (!dir || !SPRITE_COUNTS[dir]) continue;
    byStatus[dir] = SPRITE_COUNTS[dir].frames;
  }

  const byType: Record<string, number> = {};
  for (const c of CARDS) byType[c.type] = (byType[c.type] ?? 0) + 1;
  const stageLevels = [...new Set(
    CARDS.filter(c => c.type === 'command' && /stage/i.test(c.name))
      .map(c => (c.name.match(/(\d)\s*Stage/i)?.[1] ? Number(c.name.match(/(\d)\s*Stage/i)![1]) : 0))
      .filter(n => n >= 3 && n <= 6),
  )].sort();

  const gbcSequences = GBC_CINEMATIC_CANON.filter(s => isGbcCanon(s.evidence.fidelity));
  const fidelityByLevel = Object.values(FidelityLevel).map(level => ({
    level,
    count: Object.values(ACTION_FIDELITY_REGISTRY).filter(a => a.fidelity === level).length,
  }));

  return {
    roster: {
      forms: forms.length, formsTotal: 48, characters: CHARACTERS.length,
      withSpriteDir,
      withoutSpriteDir: forms.filter(f => !spriteDirFor(f.id)).map(f => f.id),
    },
    cards: { count: CARDS.length, total: 125, byType, stageLevels },
    sprites: {
      canonFrames,
      byStatus,
      unknown: 0,
      runtimePoseCount: Object.keys(byStatus).length,
      poseOrder: COMBAT_POSE_ORDER.length,
    },
    cinematics: {
      gbcFamilies: GBC_CINEMATIC_FAMILIES.length,
      gbcVerified: gbcSequences.length,
      gbcInferred: GBC_CINEMATIC_CANON.length - gbcSequences.length,
      actionProfiles: listActionProfiles().length,
      animationCanonFamilies: listAnimationCanon().length,
      fidelityByLevel,
      fidelityTotal: Math.max(1, Object.keys(ACTION_FIDELITY_REGISTRY).length),
    },
    story: {
      chapters: Object.keys(STORY_ENEMY_DECKS).length,
      teamBattles: Object.keys(TEAM_BATTLES).length,
      portraitsResolved: CHARACTERS.filter(c => resolveSpeakerPortrait(c.id)).length,
    },
    audio: { musicTracks: MUSIC_TRACK_LIST.length, sfx: SFX_CATALOG.length },
    scenarios: SCENARIOS.length,
    production,
    physicalCorpus: computePhysicalCorpusMetrics(),
    fxCorpus: computeFxCorpusMetrics(),
    physicalMapping: productionFrameResolverSummary(),
  };
}

function computePhysicalCorpusMetrics(): DevSnapshot['physicalCorpus'] {
  const totals = ROM_PHYSICAL_CORPUS_SUMMARY.totals;
  return {
    phase: ROM_PHYSICAL_CORPUS_SUMMARY.phase,
    schemaVersion: ROM_PHYSICAL_CORPUS_SUMMARY.schemaVersion,
    offsetEncoding: ROM_PHYSICAL_CORPUS_SUMMARY.offsetEncoding,
    source: ROM_PHYSICAL_CORPUS_SUMMARY.source,
    formsRendered: totals.forms,
    formsIndexed: totals.formsIndexed,
    formsPaletteBlocked: totals.formsPaletteBlocked,
    formsResourceBlocked: totals.formsResourceBlocked,
    resourcesTotal: ROM_PHYSICAL_CORPUS_SUMMARY.resourceCompletionTotals.resources,
    resourcesReachable: totals.resourcesReachable,
    resourcesRendered: totals.resourcesRendered,
    resourcesRendererPending: totals.resourcesRendererPending,
    resourcesFrameStreamOnly: ROM_PHYSICAL_CORPUS_SUMMARY.resourceCompletionTotals.frameStreamOnly,
    resourcesHandlerDependent: ROM_PHYSICAL_CORPUS_SUMMARY.resourceCompletionTotals.handlerDependent,
    resourcesDynamicPending: ROM_PHYSICAL_CORPUS_SUMMARY.resourceCompletionTotals.dynamicPending,
    resourcesUnreferenced: ROM_PHYSICAL_CORPUS_SUMMARY.resourceCompletionTotals.unreferenced,
    physicalIdentities: totals.physicalIdentities,
    frameInstances: totals.frameInstances,
    transparentFrameRecords: totals.transparentFrameRecords ?? 0,
    transparentPhysicalIds: totals.transparentPhysicalIds ?? 0,
    signedNegativeInstances: totals.signedNegativeInstances,
    resourceProfileBlockedPairs: totals.resourceProfileBlockedPairs,
    maxWidth: totals.maxWidth,
    maxHeight: totals.maxHeight,
    staleUnsigned: 0,
    productionManifestCutover: false,
  };
}

function computeFxCorpusMetrics(): DevSnapshot['fxCorpus'] {
  const totals = ROM_FX_CORPUS_SUMMARY.totals;
  const runtime = romFxWindowRuntimeSummary();
  return {
    phase: ROM_FX_CORPUS_SUMMARY.phase,
    source: ROM_FX_CORPUS_SUMMARY.source,
    fxResourcesTotalNonFF: totals.fxResourcesTotalNonFF,
    offensiveFxResources: totals.offensiveFxResources,
    normalOffensiveBundles: totals.normalOffensiveBundles,
    paletteBundles: totals.paletteBundles,
    sideMapsByResource: totals.sideMapsByResource,
    sidePhaseRenders: totals.sidePhaseRenders,
    consumingCards: totals.consumingCards,
    errors: totals.errors,
    supportOrCategorySpecificResources: totals.supportOrCategorySpecificResources,
    runtimeCutover: ROM_FX_CORPUS_SUMMARY.statuses.runtimeCutover,
    runtimeCards: runtimeCutover.totals.runtimeCards,
    runtimeWindowCues: runtimeCutover.totals.windowCues,
    runtimeDistributionErrors: runtimeCutover.totals.distributionErrors,
    runtimeSideSelectionComplete: runtimeCutover.totals.sideSelectionComplete,
    runtimeSideSelectionPending: runtimeCutover.totals.sideSelectionPending,
    runtimeStaticComplete: runtime.staticComplete,
    runtimeDynamicComplete: runtime.dynamicComplete,
    runtimeWindowComplete: runtime.complete,
    runtimeWindowPartial: runtime.partial,
    runtimeSilentFallback: runtime.silentFallback,
    supportVisuals: ROM_FX_CORPUS_SUMMARY.statuses.supportVisuals,
    supportAuraBlue: ROM_FX_CORPUS_SUMMARY.statuses.supportAuraBlue,
    gatherPowerAuraOrange: ROM_FX_CORPUS_SUMMARY.statuses.gatherPowerAuraOrange,
  };
}

// ── C1.0 §8 — sonda de producción (headless) ───────────────────────────
class ProductionProbe implements BattlePresentation {
  scenes = 0; moves = 0; projectiles = 0; impacts = 0; cameras = 0; fieldReturns = 0;
  setScene(_s: BattleScene): void { this.scenes++; }
  setActorPose(_p: string): void {}
  setTargetPose(_p: string): void {}
  moveActor(): void { this.moves++; }
  spawnProjectile(): void { this.projectiles++; }
  setProjectileProgress(): void {}
  impact(): void { this.impacts++; }
  camera(): void { this.cameras++; }
  returnToField(): void { this.fieldReturns++; }
  sync(): void {}
}

function computeProductionMetrics(): DevSnapshot['production'] {
  let romDataAvailable = 0;
  let romCuesGenerated = 0;
  let romCuesConsumed = 0;
  let romVisible = 0;
  let legacyVisible = 0;
  let romBackedStrict = 0;
  let romPhysicalFrames = 0;
  let romPhysicalRendered = 0;
  let manifestFallbackRendered = 0;
  let unresolvedRendered = 0;
  let mixed = 0;
  for (const card of CARDS) {
    const profile = romPresentationProfileForCard(card);
    if (profile.kind !== 'NONE' && profile.kind !== 'UNKNOWN_HANDLER') romDataAvailable++;
    const route = romPresentationTimelineForCard(card, 'player', 'goku_base');
    if (!route) { legacyVisible++; continue; }
    const probe = new ProductionProbe();
    const adapter = new ProductionRomPresentationAdapter(probe);
    adapter.reset('ROM');
    for (const en of route.timeline.entries) adapter.consume(en.cue);
    const s = adapter.snapshot;
    const generated = route.timeline.entries.filter(en => en.cue.type !== 'ROM_PENDING').length;
    if (generated > 0) romCuesGenerated++;
    if (s.cuesConsumed > 0) romCuesConsumed++;
    if (s.visibleEffects > 0) romVisible++;
    if (generated > 0 && s.cuesConsumed > 0) romBackedStrict++;
    romPhysicalFrames += s.physicalFrames;
    if ((s.physicalFrameSources.ROM_PHYSICAL ?? 0) > 0) romPhysicalRendered++;
    if ((s.physicalFrameSources.MANIFEST_FALLBACK ?? 0) > 0) manifestFallbackRendered++;
    if ((s.physicalFrameSources.UNRESOLVED ?? 0) > 0) unresolvedRendered++;
    if (Object.keys(s.physicalFrameSources).filter(key => (s.physicalFrameSources[key] ?? 0) > 0).length > 1) mixed++;
  }
  return {
    romDataAvailable,
    romCuesGenerated,
    romCuesConsumed,
    romVisible,
    legacyVisible,
    romBackedStrict,
    romPhysicalFrames,
    romPhysicalRendered,
    manifestFallbackRendered,
    unresolvedRendered,
    mixed,
  };
}
