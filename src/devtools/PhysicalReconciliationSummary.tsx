import { romPresentationCompilerSummary } from '../battle/romPresentationCompiler';
import { romPresentationProfileSummary } from '../battle/romPresentationProfiles';
import { romFxWindowRuntimeSummary } from '../battle/romFxWindow';
import { getBindingSummary } from '../data/romActionSequenceBinding';
import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../data/generated/romPhysicalCorpus.generated';
import { romSequenceRegistrySummary } from '../data/romSequenceRegistry';

function hex2(value: number): string {
  return `$${value.toString(16).padStart(2, '0').toUpperCase()}`;
}

/** Current ROM truth only; historical milestones live in memory/docs. */
export function PhysicalReconciliationSummary() {
  const registry = romSequenceRegistrySummary();
  const bindings = getBindingSummary();
  const corpus = ROM_PHYSICAL_CORPUS_SUMMARY.totals;
  const presentation = romPresentationProfileSummary();
  const compiler = romPresentationCompilerSummary();
  const fxWindow = romFxWindowRuntimeSummary();
  const registryClosed = registry.physicalResourceFullyClosed === 62
    && registry.emptyResourceSlots === 4
    && registry.frameStreamClosed === 0;
  const corpusReady = corpus.formsIndexed === 48
    && corpus.formsPaletteBlocked === 0
    && corpus.formsResourceBlocked === 0;

  return (
    <section className="dev-physical-summary" aria-label="Current ROM truth summary">
      <div className="dev-physical-summary-main">
        <strong>ROM Truth — Current State</strong>
        <span>
          One live chain: RomSequenceRegistry → card/action binding → physical corpus → production film.
          A missing actor track is valid when ROM card byte[6] is $FF; it is not a missing decode.
        </span>
      </div>

      <div className="dev-truth-lanes">
        <div className="dev-truth-lane">
          <span className="dev-truth-kicker">PHYSICAL STRUCTURE</span>
          <strong>{registry.physicalResourceFullyClosed}/{registry.total} closed</strong>
          <small>{registry.emptyResourceSlots} empty ROM slots: {registry.emptyResourceIds.map(hex2).join(' · ')}</small>
          <div className="dev-physical-summary-chips">
            <span className={`dev-tag ${registryClosed ? 'ok' : 'bad'}`}>62 physical resources closed</span>
            <span className="dev-tag ok">{registry.totalFrameInstances} frame records</span>
            <span className="dev-tag">selection semantics are separate</span>
          </div>
        </div>

        <div className="dev-truth-lane">
          <span className="dev-truth-kicker">PHYSICAL CORPUS</span>
          <strong>{corpus.physicalIdentities.toLocaleString()} physical IDs</strong>
          <small>{corpus.frameInstances.toLocaleString()} occurrences across {corpus.formsIndexed}/48 forms</small>
          <div className="dev-physical-summary-chips">
            <span className={`dev-tag ${corpusReady ? 'ok' : 'bad'}`}>Fighter rendered {corpus.resourcesRendered}/{corpus.resourcesReachable}</span>
            <span className="dev-tag warn">Fighter renderer pending {corpus.resourcesRendererPending}</span>
            <span className="dev-tag ok">Stage Bank $61 rendered {corpus.stageResourcesRendered} · {corpus.stagePhysicalIdentities.toLocaleString()} IDs</span>
            <span className="dev-tag">$62–$64 Fighter: {corpus.fighterPhysicalIdentities.toLocaleString()} IDs</span>
          </div>
        </div>

        <div className="dev-truth-lane">
          <span className="dev-truth-kicker">ACTION BINDING</span>
          <strong>{bindings.totalBindings}/125 cards mapped</strong>
          <small>{bindings.withActorResource} actor resources · {bindings.withFxResource} FX/display tracks</small>
          <div className="dev-physical-summary-chips">
            <span className="dev-tag ok">physical sequence known</span>
            <span className="dev-tag">selector may be profile / result / handler</span>
            <span className="dev-tag">$FF actor = NONE by ROM</span>
          </div>
        </div>

        <div className="dev-truth-lane">
          <span className="dev-truth-kicker">PRODUCTION</span>
          <strong>{compiler.compilable}/125 films compilable</strong>
          <small>{presentation.completeStatic} static complete · {presentation.dynamicPending} dynamic pending</small>
          <div className="dev-physical-summary-chips">
            <span className={`dev-tag ${compiler.semanticCueLeaks === 0 ? 'ok' : 'bad'}`}>0 semantic cue leaks</span>
            <span className="dev-tag">{compiler.pendingCues} explicit pending cues</span>
            <span className="dev-tag">FX windows {fxWindow.staticComplete}/28 static · {fxWindow.complete}/28 dynamic</span>
          </div>
        </div>
      </div>
    </section>
  );
}
