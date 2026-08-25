import { ANIMATION_RESOURCE_CATALOG, animationResourceSummary } from '../battle/animationResources';
import { cardPhysicalCoverageSummary } from '../battle/cardPhysicalCoverage';
import { PHYSICAL_FRAME_RECONCILIATION, physicalFrameReconciliationSummary } from '../battle/physicalFrameReconciliation';
import { romActionExecutionSummary } from '../battle/romActionExecutionDescriptors';
import { romPresentationCompilerSummary } from '../battle/romPresentationCompiler';
import { romPresentationProfileSummary } from '../battle/romPresentationProfiles';
import { beamBaseRuntimeCutoverSummary } from '../battle/beamBaseRomCutover';
import { standardDamageRuntimeCutoverSummary } from '../battle/standardDamageRomCutover';

const ROM_RESEARCH_SYNC = {
  v3VisualFrames: 411,
  v3VisualFramesVerified: 411,
  v4OffensiveFxBundles: 28,
  v4FxRenders: 152,
  v4FxDataTables: 15,
  v5Files: 59,
  v5SupportPalettes: 7,
  v5DefenseCards: 11,
  v6SupportRows: 48,
  v6UniquePayloads: 48,
  v6UniqueGraphics: 48,
  v6UniqueLayouts: 46,
  v6Renders: 48,
  v6RendersPng: 96,
  v6LayoutAliasGroups: 2,
  v6Slot8LoaderSites: 1,
  v6Slot8StartSites: 2,
};

export function PhysicalReconciliationSummary() {
  const summary = physicalFrameReconciliationSummary();
  const cards = cardPhysicalCoverageSummary();
  const resources = animationResourceSummary();
  const execution = romActionExecutionSummary();
  const presentation = romPresentationProfileSummary();
  const compiler = romPresentationCompilerSummary();
  const standardDamageCutover = standardDamageRuntimeCutoverSummary();
  const beamBaseCutover = beamBaseRuntimeCutoverSummary();
  const decoded = ANIMATION_RESOURCE_CATALOG.filter(resource => resource.status === 'DECODED').length;
  const referenced = ANIMATION_RESOURCE_CATALOG.filter(resource => resource.cards.length > 0).length;
  const complete = PHYSICAL_FRAME_RECONCILIATION.filter(resource => resource.summary.romFrames > 0 && resource.summary.unresolved === 0).length;
  const tail = PHYSICAL_FRAME_RECONCILIATION.find(resource => resource.resourceId === 0x3f);

  return (
    <div className="dev-physical-summary" aria-label="Physical frame reconciliation summary">
      <div className="dev-physical-summary-main">
        <strong>Physical Frame Reconciliation</strong>
        <span>
          Runtime mapping snapshot + ROM research sync. V3/V4/V5 supersede the old unknowns for
          ActionObject layout, graphics blocks, palettes, offensive Beam FX, Support/Defense grammar and V6 Support descriptor matrix.
        </span>
      </div>
      <div className="dev-physical-summary-chips">
        <span className="dev-tag ok">V3 ActionObject layout static</span>
        <span className="dev-tag ok">V3 visualFrames {ROM_RESEARCH_SYNC.v3VisualFramesVerified}/{ROM_RESEARCH_SYNC.v3VisualFrames}</span>
        <span className="dev-tag ok">V3 gfxBlock == pieceCount 411/411</span>
        <span className="dev-tag ok">V3 Tail seq1 ROM_HANDLER_VERIFIED</span>
        <span className="dev-tag ok">V3 Defense slot8 mapped</span>
        <span className="dev-tag ok">V4 FX bundles {ROM_RESEARCH_SYNC.v4OffensiveFxBundles}</span>
        <span className="dev-tag ok">V4 BG_TILEMAP · {ROM_RESEARCH_SYNC.v4FxRenders} renders</span>
        <span className="dev-tag">V4 data tables {ROM_RESEARCH_SYNC.v4FxDataTables}</span>
        <span className="dev-tag">ROM_FX_WINDOW runtime cutover pending</span>
        <span className="dev-tag ok">V5 Support/Defense grammar static</span>
        <span className="dev-tag ok">V5 Defense cards {ROM_RESEARCH_SYNC.v5DefenseCards}</span>
        <span className="dev-tag ok">V5 Support palettes {ROM_RESEARCH_SYNC.v5SupportPalettes}</span>
        <span className="dev-tag">V5 files {ROM_RESEARCH_SYNC.v5Files}</span>
        <span className="dev-tag">V5 baseline frozen</span>
        <span className="dev-tag ok">V6 CLOSED · STATIC_PHYSICAL_VERIFIED</span>
        <span className="dev-tag ok">V6 Support matrix {ROM_RESEARCH_SYNC.v6SupportRows}/48</span>
        <span className="dev-tag ok">V6 payloads {ROM_RESEARCH_SYNC.v6UniquePayloads} unique</span>
        <span className="dev-tag ok">V6 graphics {ROM_RESEARCH_SYNC.v6UniqueGraphics} unique</span>
        <span className="dev-tag">V6 layouts {ROM_RESEARCH_SYNC.v6UniqueLayouts} unique</span>
        <span className="dev-tag ok">V6 layout aliases {ROM_RESEARCH_SYNC.v6LayoutAliasGroups} (SAME_LAYOUT, no shared visual)</span>
        <span className="dev-tag ok">V6 renders {ROM_RESEARCH_SYNC.v6Renders}/48 · {ROM_RESEARCH_SYNC.v6RendersPng} PNG</span>
        <span className="dev-tag ok">V6 slot8 audit: {ROM_RESEARCH_SYNC.v6Slot8LoaderSites} loader · {ROM_RESEARCH_SYNC.v6Slot8StartSites} starts · 0 macros</span>
        <span className="dev-tag ok">V6 macros $2B/$2C/$34/$35 literal ROM-verified</span>
        <span className="dev-tag ok">V6 romCA53 contract: contextual, nunca switch directo</span>
        <span className="dev-tag ok">V7 OPEN · compiler $00/$02 determinista (BG19+HOLD120, 0 muta Engine)</span>
        <span className="dev-tag">ROM_BG_ASSEMBLY runtime cutover pending</span>
        <span className="dev-tag ok">{decoded}/{referenced} referenced resources DECODED</span>
        <span className="dev-tag">{summary.romFrames} ROM frames</span>
        <span className="dev-tag ok">{summary.exact} EXACT</span>
        <span className="dev-tag ok">{summary.shared} SHARED</span>
        <span className="dev-tag">{summary.composite} COMPOSITE</span>
        <span className={`dev-tag ${summary.unresolved === 0 ? 'ok' : ''}`}>{summary.unresolved} UNRESOLVED</span>
        {tail && <span className="dev-tag">Legacy Tail manifest snapshot: {tail.status} · {tail.summary.unresolved}/{tail.summary.romFrames} unresolved</span>}
        <span className="dev-tag">Dynamic trace reserved for spatial semantics</span>
        <span className="dev-tag">verify:physical-animation-mapping</span>
        <span className="dev-tag">{cards.complete} cards complete</span>
        <span className="dev-tag">{cards.partial} cards partial</span>
        <span className="dev-tag">{cards.pendingStatic} cards pending static decode</span>
        <span className="dev-tag">{resources.staticallyClosable} resources statically closable</span>
        <span className="dev-tag">{resources.needsDynamicTrace} resources need justified trace</span>
        <span className="dev-tag">{complete}/{PHYSICAL_FRAME_RECONCILIATION.length} decoded resources fully mapped</span>
        <span className={`dev-tag ${execution.cards === 125 && execution.missingResources === 0 ? 'ok' : 'bad'}`}>
          action descriptors {execution.cards}/125
        </span>
        <span className="dev-tag">{execution.descriptorsWithBranches} descriptors with proven result branches</span>
        <span className="dev-tag">verify:rom-action-execution</span>
        <span className={`dev-tag ${presentation.cards === 125 ? 'ok' : 'bad'}`}>
          ROM presentation profiles {presentation.cards}/125
        </span>
        <span className="dev-tag">{presentation.standardDamage} STANDARD_DAMAGE profiles</span>
        <span className="dev-tag">{presentation.profilesWithMotion} profiles with ROM motion</span>
        <span className="dev-tag">{presentation.dynamicPending} profiles pending trace</span>
        <span className="dev-tag">verify:rom-presentation-profiles</span>
        <span className={`dev-tag ${compiler.compilable === 125 && compiler.semanticCueLeaks === 0 ? 'ok' : 'bad'}`}>
          ROM compiler {compiler.compilable}/125
        </span>
        <span className="dev-tag">{compiler.totalCues} ROM cues</span>
        <span className="dev-tag">{compiler.pendingCues} compiler pending cues</span>
        <span className="dev-tag">verify:rom-presentation-compiler</span>
        <span className={`dev-tag ${standardDamageCutover.romBacked === 19 && standardDamageCutover.nonStandardDamageBacked === 0 ? 'ok' : 'bad'}`}>
          STANDARD_DAMAGE runtime {standardDamageCutover.romBacked}/19 ROM-backed
        </span>
        <span className="dev-tag">HIT/MISS/SPECIAL_DEFENSE event-driven</span>
        <span className="dev-tag">verify:standard-damage-rom-cutover</span>
        <span className={`dev-tag ${beamBaseCutover.romBacked === 16 && beamBaseCutover.handlerShared === 38 && beamBaseCutover.nonBeamBaseBacked === 0 && beamBaseCutover.beamVariantsBacked === 0 ? 'ok' : 'bad'}`}>
          BEAM_BASE runtime {beamBaseCutover.romBacked}/16 · $02 shared {beamBaseCutover.handlerShared}
        </span>
        <span className="dev-tag">$1E -27px/17t mirrored · FX/palette preserved</span>
        <span className="dev-tag">verify:beam-base-rom-cutover</span>
      </div>
    </div>
  );
}
