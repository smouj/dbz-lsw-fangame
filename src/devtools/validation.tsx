// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Validation
// Chequeos de integridad de datos: cobertura, ids rotos, referencias.
//
// V2 — clasificación por SEVERIDAD (no "ok: true" para métricas informativas):
//   PASS  = invariante real que se cumple
//   FAIL  = invariante real roto (bloqueante)
//   WARN  = divergencia de producción (no bloquea build, pero es P0/P1)
//   INFO  = métrica informativa (no es un invariante validable)
// Por defecto se muestran FAIL + WARN. PASS e INFO quedan colapsados.
// ─────────────────────────────────────────────────────────────
// La separación clave (auditoría runtime 2026-08-24):
//   ROM compiler coverage  ≠  production visual coverage
// "$02 handler 38" no significa "38 beams": 16 son BEAM_BASE reales y
// 22 support reutilizan el handler. Ambos números se muestran por separado.
// ═══════════════════════════════════════════════════════════
import { useMemo, useEffect, useState } from 'react';
import { FORMS, CHARACTERS, LIMIT_DEFAULTS } from '../data/roster';
import { CARDS } from '../data/cards';
import { STORY_ENEMY_DECKS, TEAM_BATTLES } from '../data/enemy_decks';
import { spriteDirFor } from '../data/spriteManifest';
import { COMBAT_REQUIRED_POSES, resolveCombatPose } from '../battle/spriteConfig';
import { cardUsableBy } from '../battle/cardPoses';
import { getDevProjectSnapshot } from './devSnapshot';
import { activeAttacker, activeDefender, initiativeSide } from '../battle/engine/state/battleStateSelectors';
import { ANIMATION_RESOURCE_CATALOG, animationResourceSummary } from '../battle/animationResources';
import { cardPhysicalCoverageSummary } from '../battle/cardPhysicalCoverage';
import { PHYSICAL_FRAME_RECONCILIATION, physicalFrameReconciliationSummary } from '../battle/physicalFrameReconciliation';
import { romActionExecutionSummary } from '../battle/romActionExecutionDescriptors';
import { romPresentationCompilerSummary } from '../battle/romPresentationCompiler';
import { romPresentationProfileSummary } from '../battle/romPresentationProfiles';
import { beamBaseRuntimeCutoverSummary } from '../battle/beamBaseRomCutover';
import { standardDamageRuntimeCutoverSummary } from '../battle/standardDamageRomCutover';
import { romSequenceRegistrySummary } from '../data/romSequenceRegistry';

type Severity = 'PASS' | 'FAIL' | 'WARN' | 'INFO';
interface Check { name: string; severity: Severity; detail: string; }

type ManifestState =
  | { status: 'checking'; bad: string[]; withRay: number; total: number }
  | { status: 'done'; bad: string[]; withRay: number; total: number };

export function ValidationModule() {
  const checks = useMemo<Check[]>(() => {
    const out: Check[] = [];
    const pass = (name: string, ok: boolean, detail: string): void => {
      out.push({ name, severity: ok ? 'PASS' : 'FAIL', detail });
    };
    const info = (name: string, detail: string): void => {
      out.push({ name, severity: 'INFO', detail });
    };
    const warn = (name: string, detail: string): void => {
      out.push({ name, severity: 'WARN', detail });
    };
    const forms = Object.values(FORMS);

    // 1. Formas vs ROM
    pass('Formas (ROM = 48)', forms.length === 48, `${forms.length}/48 formas registradas`);

    // 2. Ids de forma únicos
    const ids = Object.keys(FORMS);
    pass('Ids de forma únicos', new Set(ids).size === ids.length, `${ids.length} ids`);

    // 3. Personajes referencian formas existentes
    const orphanChars = CHARACTERS.filter(c => c.forms.some(f => !FORMS[f]));
    pass('Personajes → formas válidas', orphanChars.length === 0, orphanChars.length === 0 ? 'todos resuelven' : `huérfanos: ${orphanChars.map(c => c.id).join(', ')}`);

    // 4. Cartas: ids únicos + stats en rango
    const cardIds = CARDS.map(c => c.id);
    pass('Cartas: ids únicos', new Set(cardIds).size === cardIds.length, `${cardIds.length} cartas`);
    const badStats = CARDS.filter(c => c.cc < 0 || c.cc > 40 || c.atk < 0 || c.atk > 70 || c.acc < 0 || c.acc > 100);
    pass('Cartas: stats en rango', badStats.length === 0, badStats.length === 0 ? 'todas OK' : `${badStats.length} fuera de rango`);

    // 5. Mazos de jefes: cartas existen + compatibles con el personaje
    const cardMap = new Map(CARDS.map(c => [c.id, c]));
    let missingInDecks = 0;
    for (const deck of Object.values(STORY_ENEMY_DECKS)) {
      for (const cid of deck) if (!cardMap.has(cid)) missingInDecks++;
    }
    pass('Mazos de jefes: cartas existen', missingInDecks === 0, missingInDecks === 0 ? `${Object.keys(STORY_ENEMY_DECKS).length} mazos OK` : `${missingInDecks} cartas rotas`);

    // 6. Sprites: cada forma con dir o fallback
    const noSprite = forms.filter(f => !spriteDirFor(f.id) && !f.sheet);
    pass('Sprites: cobertura de formas', noSprite.length === 0, noSprite.length === 0 ? 'todas con sprite' : `sin sprite: ${noSprite.map(f => f.id).join(', ')}`);

    // 7. Capítulos vs mazos (los 32 capítulos tienen mazo de jefe)
    pass('Capítulos con mazo de jefe', Object.keys(STORY_ENEMY_DECKS).length === 32, `${Object.keys(STORY_ENEMY_DECKS).length}/32 capítulos con mazo`);

    // 8. Cobertura de sprites de combate (formas con dir animado)
    const withDir = forms.filter(f => spriteDirFor(f.id)).length;
    pass('Sprites de combate (dir animado)', withDir === forms.length, `${withDir}/${forms.length} formas con dir animado`);

    // 9. Combates de equipo
    pass('Combates 2v2', Object.keys(TEAM_BATTLES).length > 0, `${Object.keys(TEAM_BATTLES).length} capítulos con equipo`);

    // 10. Compatibilidad de cartas: ids de personaje válidos
    const charIds = new Set(CHARACTERS.map(c => c.id));
    const badCompat: string[] = [];
    for (const c of CARDS) {
      if (c.compatible) for (const cid of c.compatible) if (!charIds.has(cid)) badCompat.push(`${c.id}:${cid}`);
      if (c.notCompatible) for (const cid of c.notCompatible) if (!charIds.has(cid)) badCompat.push(`${c.id}:!${cid}`);
    }
    pass('Compatibilidad de cartas → personajes', badCompat.length === 0, badCompat.length === 0 ? 'todas válidas' : `rotas: ${badCompat.slice(0, 5).join(', ')}`);

    // 11. LIMIT_DEFAULTS: los ids existen y son usables por el personaje
    const limitBad: string[] = [];
    for (const [charId, cids] of Object.entries(LIMIT_DEFAULTS)) {
      for (const cid of cids) {
        const card = cardMap.get(cid);
        if (!card) { limitBad.push(`${charId}:${cid} no existe`); continue; }
        if (!cardUsableBy(card, charId)) limitBad.push(`${charId}:${cid} no usable`);
      }
    }
    pass('Limits por defecto → cartas usables', limitBad.length === 0, limitBad.length === 0 ? 'todos coherentes' : `incoherentes: ${limitBad.slice(0, 5).join(', ')}`);

    // ═══ DEV-SYNC: invariantes OUT_frames y del modelo de turnos ═══
    const snap = getDevProjectSnapshot();
    info('Sprites OUT_frames: frames por forma (coherente con Dashboard)', Object.entries(snap.sprites.byStatus).map(([k, v]) => `${k} ${v}`).join(' · '));
    pass('Sprites OUT_frames: total de frames coherente', snap.sprites.canonFrames >= 3000, `${snap.sprites.canonFrames} frames totales en manifests (fuente OUT_frames)`);
    const corpus = snap.physicalCorpus;
    const sequenceRegistry = romSequenceRegistrySummary();
    pass('P0.3B ROM physical corpus: contrato signed vigente', corpus.schemaVersion === 2 && corpus.offsetEncoding === 's8' && corpus.source === 'ROM_PHYSICAL_FIGHTERS', `${corpus.source} · schema ${corpus.schemaVersion} · ${corpus.offsetEncoding}`);
    pass('P0.3B ROM physical corpus: formas contabilizadas sin falsificar', corpus.formsRendered + corpus.formsPaletteBlocked + corpus.formsResourceBlocked === corpus.formsIndexed && corpus.formsIndexed === 48, `${corpus.formsRendered} rendered · ${corpus.formsPaletteBlocked} palette-blocked · ${corpus.formsResourceBlocked} resource-blocked`);
    pass('P0.3B ROM physical corpus: outputs signed y sanos', corpus.staleUnsigned === 0 && corpus.maxWidth <= 128 && corpus.maxHeight <= 128 && corpus.signedNegativeInstances > 0, `${corpus.physicalIdentities} IDs · ${corpus.frameInstances} instances · ${corpus.signedNegativeInstances} signed-negative · max ${corpus.maxWidth}×${corpus.maxHeight}`);
    pass(
      'P0 Fighter physical corpus: 48-form sweep cerrado',
      corpus.formsRendered === 48
        && corpus.formsPaletteBlocked === 0
        && corpus.formsResourceBlocked === 0
        && corpus.physicalIdentities > 0
        && corpus.frameInstances >= corpus.physicalIdentities
        && corpus.transparentFrameRecords >= corpus.transparentPhysicalIds,
      `${corpus.formsRendered}/48 forms · ${corpus.physicalIdentities} promoted IDs · ${corpus.frameInstances} instances · ${corpus.transparentFrameRecords} EMPTY_NOT_PROMOTED records/${corpus.transparentPhysicalIds} IDs`,
    );
    pass(
      'P0.5 resource expansion: universo físico reconciliado',
      corpus.resourcesTotal === sequenceRegistry.total
        && corpus.resourcesRendered + corpus.resourcesRendererPending + sequenceRegistry.emptyResourceSlots === corpus.resourcesTotal,
      `${corpus.resourcesRendered} Fighter rendered · ${corpus.resourcesRendererPending} renderer pending · ${sequenceRegistry.emptyResourceSlots} empty = ${corpus.resourcesTotal}`,
    );
    info('P0.5 resource expansion: no confundir decoded con renderable', `${corpus.resourcesFrameStreamOnly} frame-stream-only · ${corpus.resourcesRendererPending} renderer-pending decoded · ${corpus.resourcesHandlerDependent} handler-dependent · ${corpus.resourcesDynamicPending} dynamic · ${corpus.resourcesUnreferenced} unreferenced`);
    const fxCorpus = snap.fxCorpus;
    pass(
      'P0.1A Offensive FX physical corpus',
      fxCorpus.offensiveFxResources === 28
        && fxCorpus.normalOffensiveBundles === 28
        && fxCorpus.paletteBundles === 38
        && fxCorpus.sideMapsByResource === 56
        && fxCorpus.sidePhaseRenders === 152
        && fxCorpus.errors === 0,
      `${fxCorpus.offensiveFxResources}/28 FXResource · ${fxCorpus.paletteBundles} FX/palette · ${fxCorpus.sideMapsByResource}/56 SIDE maps · ${fxCorpus.sidePhaseRenders} renders · errors ${fxCorpus.errors}`,
    );
    pass('P0.1A FX: Support/category-specific resources excluded from offensive promotion', fxCorpus.supportOrCategorySpecificResources === 3 && fxCorpus.supportVisuals === 'SEPARATE_DOMAIN', `${fxCorpus.supportOrCategorySpecificResources} separate · ${fxCorpus.supportVisuals}`);
    pass(
      'P0.1B ROM FX window contract is static-complete (dynamic still pending)',
      fxCorpus.runtimeStaticComplete === 28
        && fxCorpus.runtimeDynamicComplete === 0
        && fxCorpus.runtimeWindowComplete === 0
        && fxCorpus.runtimeWindowPartial === 0
        && fxCorpus.runtimeWindowCues === 39
        && fxCorpus.runtimeCards === 38
        && fxCorpus.runtimeDistributionErrors === 0
        && fxCorpus.runtimeSideSelectionComplete === 76
        && fxCorpus.runtimeSideSelectionPending === 0
        && fxCorpus.runtimeSilentFallback === 0,
      `STATIC_COMPLETE ${fxCorpus.runtimeStaticComplete}/28 · COMPLETE ${fxCorpus.runtimeWindowComplete}/28 · ${fxCorpus.runtimeWindowCues} windows/${fxCorpus.runtimeCards} cards · distribution errors ${fxCorpus.runtimeDistributionErrors} · side selection ${fxCorpus.runtimeSideSelectionComplete}/${fxCorpus.runtimeSideSelectionPending} static · silent fallback ${fxCorpus.runtimeSilentFallback}`,
    );
    info('P0.1C-E Support/Aura state', `support visuals ${fxCorpus.supportVisuals} · support aura ${fxCorpus.supportAuraBlue} · gather aura ${fxCorpus.gatherPowerAuraOrange}`);
    const physicalMapping = snap.physicalMapping;
    pass('P0.3C ProductionFrameResolver: physical mapping explícito', physicalMapping.physicalMapping.romInstancesMapped === physicalMapping.physicalMapping.romInstancesTotal && physicalMapping.physicalMapping.unresolved === 0, `${physicalMapping.physicalMapping.romInstancesMapped}/${physicalMapping.physicalMapping.romInstancesTotal} mapped · unresolved ${physicalMapping.physicalMapping.unresolved}`);
    pass('P0.3C ProductionFrameResolver: clasificación completa sin MIXED', physicalMapping.cards.romPresentationProduction + physicalMapping.cards.legacy === CARDS.length && physicalMapping.cards.mixed === 0, `${physicalMapping.cards.romPresentationProduction}/125 ROM_PHYSICAL · ${physicalMapping.cards.legacy} LEGACY/PENDING · MIXED ${physicalMapping.cards.mixed}`);
    // Los frames sin evidencia NO se asignan por aproximación — quedan desconocidos.
    if (snap.sprites.unknown === 0) {
      info('Sprites OUT_frames: 0 frames sin evidencia (UNCLASSIFIED honestos)', 'los frames sin evidencia NO se asignan por aproximación — quedan desconocidos hasta nueva evidencia');
    } else {
      warn('Sprites OUT_frames: frames UNRESOLVED en reconciliación física', `${snap.sprites.unknown} frames físicos sin evidencia (UNCLASSIFIED honestos — no se asignan por aproximación)`);
    }
    pass('Stage 3/4/5/6 cubiertos', snap.cards.stageLevels.length === 4 && snap.cards.stageLevels.join() === '3,4,5,6', `niveles: ${snap.cards.stageLevels.join(', ')}`);
    info('Cartas por tipo (coherente con Dashboard)', Object.entries(snap.cards.byType).map(([k, v]) => `${k} ${v}`).join(' · '));

    const physical = physicalFrameReconciliationSummary();
    const resourceCompletion = animationResourceSummary();
    const decodedResources = ANIMATION_RESOURCE_CATALOG.filter(resource => resource.status === 'DECODED').length;
    pass('AnimationResources decodificados → reconciliación física', PHYSICAL_FRAME_RECONCILIATION.length === decodedResources, `${PHYSICAL_FRAME_RECONCILIATION.length}/${decodedResources} recursos DECODED · ${physical.romFrames} frames ROM`);
    info('Legacy manifest pose map (diagnóstico, no autoridad física)', `${physical.exact} EXACT · ${physical.shared} SHARED · ${physical.composite} COMPOSITE · ${physical.unresolved} UNRESOLVED; la autoridad actual es RomSequenceRegistry + corpus físico`);
    const cardCoverage = cardPhysicalCoverageSummary();
    pass('Cards → physical coverage 125/125', cardCoverage.cards === CARDS.length && cardCoverage.missingResource === 0, `${cardCoverage.complete} complete · ${cardCoverage.partial} partial · ${cardCoverage.unresolvedDecoded} decoded unresolved · ${cardCoverage.pendingStatic} pending static`);
    info('Legacy AnimationResource completion taxonomy (diagnóstico)', `${resourceCompletion.decoded} decoded · ${resourceCompletion.partial} partial · ${resourceCompletion.special} special · ${resourceCompletion.unknown} unknown; no sustituye los 62/66 recursos físicos cerrados del registro`);
    const actionExecution = romActionExecutionSummary();
    pass('ROM Action Execution descriptors 125/125', actionExecution.cards === CARDS.length && actionExecution.missingResources === 0, `${actionExecution.cards}/${CARDS.length} descriptors · ${actionExecution.withActorAnimation} actor resources · ${actionExecution.withFx} FX · ${actionExecution.withPalette} palettes`);
    pass('ROM Action Execution: result branches solo con evidencia', actionExecution.descriptorsWithBranches === actionExecution.standardAttackProfiles + actionExecution.defenseRules, `${actionExecution.descriptorsWithBranches} proven branch descriptors · ${actionExecution.pendingStaticDecode} pending static · ${actionExecution.needsDynamicTrace} dynamic boundary`);
    const romPresentation = romPresentationProfileSummary();
    pass('ROM-derived Presentation Profiles 125/125', romPresentation.cards === CARDS.length && romPresentation.none > 0, `${romPresentation.cards}/${CARDS.length} profiles · ${romPresentation.completeStatic} static complete · ${romPresentation.partialStatic} static partial · ${romPresentation.dynamicPending} dynamic pending`);
    pass('ROM Presentation: STANDARD_DAMAGE y motion discreto', romPresentation.standardDamage === 19 && romPresentation.profilesWithMotion > 0, `${romPresentation.standardDamage} STANDARD_DAMAGE · ${romPresentation.profilesWithMotion} profiles with ROM motion · ${romPresentation.profilesWithBranches} with branches`);
    const romCompiler = romPresentationCompilerSummary();
    pass('ROM Presentation Compiler 125/125', romCompiler.compilable === CARDS.length && romCompiler.semanticCueLeaks === 0, `${romCompiler.compilable}/${CARDS.length} compilables · ${romCompiler.totalCues} ROM cues · ${romCompiler.pendingCues} pending`);
    pass('ROM Compiler: sin semántica visual inventada', romCompiler.timelinesWithMotion > 0 && romCompiler.timelinesWithBranches > 0 && romCompiler.semanticCueLeaks === 0, `${romCompiler.timelinesWithMotion} timelines with ROM motion · ${romCompiler.timelinesWithBranches} with branches · ${romCompiler.semanticCueLeaks} semantic leaks`);

    // ── ROM COMPILER coverage (descriptor/compiler/cutover) ──
    const standardDamageCutover = standardDamageRuntimeCutoverSummary();
    pass('STANDARD_DAMAGE ROM compiler coverage', standardDamageCutover.romBacked === 19 && standardDamageCutover.nonStandardDamageBacked === 0, `${standardDamageCutover.romBacked}/19 ROM-backed (handler $0A) · ${standardDamageCutover.nonStandardDamageBacked} non-$0A diverted`);
    const beamBaseCutover = beamBaseRuntimeCutoverSummary();
    pass('BEAM_BASE ROM compiler coverage', beamBaseCutover.romBacked === 16 && beamBaseCutover.handlerShared === 38 && beamBaseCutover.nonBeamBaseBacked === 0 && beamBaseCutover.beamVariantsBacked === 0, `${beamBaseCutover.romBacked}/16 beams ROM-backed · ${beamBaseCutover.handlerShared} handler $02 shared · 22 support excluded`);

    // ── PRODUCTION visual coverage (verdad runtime — NO es compiler) ──
    const prod = snap.production;
    if (prod.romBackedStrict === 0) {
      warn('PRODUCTION: 0 cartas consumen cues ROM en Pixi', 'el puente ROM no consume cues en producción — todo cae a LEGACY (playCardCinematic)');
    } else {
      pass('ROM ADAPTER CAPABLE: cartas con cues consumibles', prod.romBackedStrict > 0, `${prod.romBackedStrict}/125 consumibles por el adapter · ${prod.legacyVisible} rutas legacy · ${prod.romVisible} ROM visible en sonda`);
    }
    // LEGACY/PENDING como path principal es esperado durante la migración progresiva del bridge ROM.
    // Solo advierte si 0 cartas se benefician del path ROM-backed.
    if (prod.romBackedStrict === 0) {
      warn('PRODUCTION: LEGACY gobierna TODAS las cartas — ningún path ROM consumido', `${prod.legacyVisible}/125 LEGACY · 0 ROM-backed`);
    } else {
      info('ROM ROUTE / ADAPTER: migración progresiva', `${prod.legacyVisible}/125 LEGACY · ${prod.romBackedStrict} adapter-capable · ${prod.romCuesGenerated} generan cues · ${prod.romCuesConsumed} consumidos en sonda · Fighter ROM_PHYSICAL: ${physicalMapping.cards.romPresentationProduction}/125`);
    }
    if (prod.romCuesGenerated !== prod.romCuesConsumed) {
      warn('PRODUCTION: cues ROM generados ≠ consumidos', `${prod.romCuesGenerated} generados vs ${prod.romCuesConsumed} consumidos — hay cues que producción no consume`);
    }
    pass('PRODUCTION: physical provenance registrada', prod.romPhysicalFrames > 0 && prod.unresolvedRendered === 0 && prod.mixed === 0, `${prod.romPhysicalFrames} ROM_PHYSICAL_FRAME · unresolved ${prod.unresolvedRendered} · MIXED ${prod.mixed}`);
    const deployment = snap.presentationDeployment;
    warn('DEFAULT PLAYER VISIBLE: DOM LEGACY', `Pixi no está activo por defecto; deployment declarado: ${deployment.defaultRenderer}.`);
    warn('PIXI CONSUMPTION: solo flag Dev', `${deployment.pixiActivation} · activar con ?${deployment.pixiQuery}; capacidad del adapter no equivale a wiring visible por defecto.`);
    warn('ACTION COMPLETION OWNER: legacy DOM activo', 'BattleScreen mantiene el DOM legacy como propietario de onDone mientras Pixi ROM corre en paralelo bajo flag.');
    // bridge elegible vs estricto: es esperado que no coincidan — el bridge
    // enruta progresivamente más tipos, no solo BEAM_BASE+STANDARD_DAMAGE.
    // Solo advierte si 0 cartas bridge se consumen habiendo perfiles elegibles.
    const eligibleBridgeProfiles = romPresentation.byKind.BEAM_BASE + romPresentation.byKind.STANDARD_DAMAGE;
    if (prod.romBackedStrict === 0 && eligibleBridgeProfiles > 0) {
      warn('PRODUCTION: bridge tiene perfiles elegibles pero 0 se consumen', `elegible ${eligibleBridgeProfiles} (BEAM_BASE+STANDARD_DAMAGE) vs 0 consumidos`);
    } else {
      info('PRODUCTION: bridge ROM elegible vs consumido', `elegible ${eligibleBridgeProfiles} (BEAM_BASE+STANDARD_DAMAGE) · consumido ${prod.romBackedStrict} · delta esperado durante migración`);
    }

    // Fase ≠ lado atacante: la iniciativa + exchange derivan el atacante.
    const t0 = { activeSide: 'enemy' as const, exchange: 0 as const };
    const t1 = { activeSide: 'enemy' as const, exchange: 1 as const };
    pass('Modelo de turnos: attacker deriva de iniciativa+exchange (no de phase)', activeAttacker(t0 as never) === 'enemy' && activeAttacker(t1 as never) === 'player'
      && activeDefender(t0 as never) === 'player' && initiativeSide(t0 as never) === 'enemy', 'exchange 0 → iniciativa · exchange 1 → opuesto (contrato M8.C2a-L)');

    return out;
  }, []);

  // 12. Manifests de combate (async): poses base + beam_ray en todas las formas
  const [manifestState, setManifestState] = useState<ManifestState>({ status: 'checking', bad: [], withRay: 0, total: 0 });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bad: string[] = [];
      let withRay = 0;
      let total = 0;
      for (const f of Object.values(FORMS)) {
        const dir = spriteDirFor(f.id);
        if (!dir) continue;
        total++;
        try {
          const r = await fetch(`/assets/sprites/${dir}/manifest.json`);
          if (!r.ok) { bad.push(`${f.id}: fetch`); continue; }
          const m = await r.json() as Record<string, { frames?: unknown[] }>;
          for (const p of COMBAT_REQUIRED_POSES) {
            const resolved = resolveCombatPose(p, pp => !!(m[pp]?.frames?.length));
            if (!resolved) bad.push(`${f.id}:${p}`);
          }
          if (m.beam_ray?.frames?.length) withRay++;
        } catch {
          bad.push(`${f.id}: fetch`);
        }
      }
      if (!cancelled) setManifestState({ status: 'done', bad, withRay, total });
    })();
    return () => { cancelled = true; };
  }, []);

  const [filter, setFilter] = useState<Set<Severity>>(new Set<Severity>(['FAIL', 'WARN']));
  const toggleFilter = (s: Severity) => {
    setFilter(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const visibleChecks = checks.filter(c => filter.has(c.severity));
  const countBy = (s: Severity) => checks.filter(c => c.severity === s).length;
  const failCount = countBy('FAIL');
  const warnCount = countBy('WARN');
  const passCount = countBy('PASS');
  const infoCount = countBy('INFO');

  const manifestSeverity: Severity = manifestState.status === 'checking' ? 'INFO' : manifestState.bad.length === 0 && manifestState.total > 0 ? 'PASS' : 'FAIL';

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Validation</h1>
        <p className="dev-sub">
          <strong>{failCount}</strong> FAIL · <strong>{warnCount}</strong> WARN · <strong>{passCount}</strong> PASS · <strong>{infoCount}</strong> INFO
          — cobertura de compilador ≠ cobertura visual de producción.
        </p>
      </header>

      <div className="dev-validation-filters" role="toolbar" aria-label="Filtro por severidad">
        {(['FAIL', 'WARN', 'PASS', 'INFO'] as Severity[]).map(s => (
          <button
            key={s}
            className={`dev-filter-chip ${filter.has(s) ? `sev-${s.toLowerCase()}` : 'off'}`}
            onClick={() => toggleFilter(s)}
            aria-pressed={filter.has(s)}
          >
            {s} {countBy(s)}
          </button>
        ))}
      </div>

      <div className="dev-checks" role="list">
        {visibleChecks.map(c => (
          <div key={c.name} className={`dev-check-row sev-${c.severity.toLowerCase()}`} role="listitem" aria-label={`${c.severity}: ${c.name}: ${c.detail}`}>
            <span className="dev-check-icon">{c.severity}</span>
            <div>
              <div className="dev-check-name">{c.name}</div>
              <div className="dev-check-detail">{c.detail}</div>
            </div>
          </div>
        ))}
        {filter.has(manifestSeverity) && (
          <div className={`dev-check-row sev-${manifestSeverity.toLowerCase()}`} role="listitem" aria-label={`Manifests de combate: ${manifestSeverity}`}>
            <span className="dev-check-icon">{manifestState.status === 'checking' ? 'INFO' : manifestSeverity}</span>
            <div>
              <div className="dev-check-name">Manifests de combate (poses base + rayo)</div>
              <div className="dev-check-detail">
                {manifestState.status === 'checking'
                  ? 'verificando...'
                  : `${manifestState.total} manifests · ${manifestState.withRay} con beam_ray` +
                    (manifestState.bad.length ? ` · faltan: ${manifestState.bad.slice(0, 8).join(', ')}` : ' · todos completos')}
              </div>
            </div>
          </div>
        )}
        {visibleChecks.length === 0 && !filter.has(manifestSeverity) && (
          <div className="dev-empty" role="listitem">Sin checks en las severidades seleccionadas.</div>
        )}
      </div>
    </div>
  );
}
